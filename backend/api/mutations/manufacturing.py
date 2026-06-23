import strawberry
import typing
from typing import Optional
from strawberry.types import Info
from django.contrib.auth import authenticate
from django.db import transaction
from api.permissions import ensure_access
from api.types.manufacturing import (
    StructureDocumentNode, StructureDocumentPayload, StructureDocumentInput, StructureDocumentUpdateInput,
    DocumentControlPayload, CreateRevisionInput, ArchiveDocumentInput, ControlledCopyInput,
    WorkScheduleNode, WorkSchedulePayload, WorkScheduleInput, WorkScheduleUpdateInput,
    WorkShiftInput, WorkShiftNode, WorkShiftPayload, WorkShiftUpdateInput,
    CapacityRecalculationJobNode,
    ProfileNode, ProfilePayload, ProfileInput, WorkHistoryEntry, EducationEntry,
    ProductFamilyAssignmentNode, ProductModelAssignmentNode,
    ProductFamilyAssignmentPayload, ProductModelAssignmentPayload,
    MutationError,
    SeedGptLinePayload, CleanupGptLinePayload,
)
from api.types.auth import LoginInput, AuthPayload, UserNode
from api.auth_utils import encode_jwt
from manufacturing.models import (
    ProductionLine, ResourceGroup,
    ProductionLineProductFamily, ProductionLineProductModel,
    ReferenceValue,
)


def _resolve_ref(model, ref_id: Optional[str]):
    if not ref_id:
        return None
    try:
        return model.objects.get(id=ref_id)
    except model.DoesNotExist:
        return None


def _user(info):
    return info.context.user


def _validation_payload(payload_cls, exc: Exception):
    from django.core.exceptions import ValidationError
    if isinstance(exc, ValidationError):
        return payload_cls(ok=False, errors=[MutationError(field="_form", code="VALIDATION", message="; ".join(exc.messages))])
    return payload_cls(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


@strawberry.type
class ManufacturingMutation:

    @strawberry.mutation
    def update_profile(self, info: Info, input: ProfileInput) -> ProfilePayload:
        ensure_access(user=_user(info), action="update_profile")
        from manufacturing.models.profile import Profile as ProfileModel
        obj = ProfileModel.objects.first()
        if not obj:
            return ProfilePayload(errors=[MutationError(field=None, code="NOT_FOUND", message="No profile found")])
        for f in ("name", "role", "email", "phone", "location", "plant", "department", "language", "about"):
            v = getattr(input, f)
            if v is not None:
                setattr(obj, f, v)
        if input.reports_to is not None:
            obj.reports_to = input.reports_to
        if input.work_history is not None:
            obj.work_history = [{"id": w.id, "role": w.role, "company": w.company, "period": w.period, "description": w.description} for w in input.work_history]
        if input.education is not None:
            obj.education = [{"id": e.id, "degree": e.degree, "school": e.school, "period": e.period} for e in input.education]
        obj.save()

        def e_dict(e: "EducationEntry") -> dict:
            return {"id": e.id, "degree": e.degree, "school": e.school, "period": e.period}

        def w_dict(w: "WorkHistoryEntry") -> dict:
            return {"id": w.id, "role": w.role, "company": w.company, "period": w.period, "description": w.description}

        return ProfilePayload(
            profile=ProfileNode(
                id=strawberry.ID(str(obj.id)), name=obj.name, role=obj.role,
                email=obj.email, phone=obj.phone or "", location=obj.location or "",
                plant=obj.plant or "", department=obj.department or "",
                reports_to=obj.reports_to or "", language=obj.language or "",
                about=obj.about or "",
                created_at=obj.created_at.isoformat() if obj.created_at else "",
                updated_at=obj.updated_at.isoformat() if obj.updated_at else "",
                work_history=[WorkHistoryEntry(**w) for w in (obj.work_history or [])],
                education=[EducationEntry(**e) for e in (obj.education or [])],
            )
        )

    @strawberry.mutation
    def login(self, input: LoginInput) -> Optional[AuthPayload]:
        user = authenticate(username=input.username, password=input.password)
        if user is None:
            return None
        try:
            rp = user.role_profile
            role = rp.role
            plant = rp.plant or ""
            department = rp.department or ""
        except Exception:
            role = "guest"
            plant = ""
            department = ""
        return AuthPayload(
            token=encode_jwt(user.id, role),
            user=UserNode(
                id=str(user.id), name=user.get_full_name() or user.username, username=user.username, email=user.email or "",
                role=role, plant=plant,
                department=department,
                display_name=user.get_full_name() or user.username,
            ),
        )

    # ── Production Line Product Assignments ──

    @strawberry.mutation
    def assign_families_to_production_line(self, info: Info, production_line_id: str, family_ids: list[str], primary_family_id: typing.Optional[str] = None) -> ProductFamilyAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            line = ProductionLine.objects.get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Production line not found")])
        try:
            if len(family_ids) != 1:
                return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="familyIds", code="ONE_FAMILY_REQUIRED", message="Production line requires exactly one product family")])
            primary_family_id = family_ids[0]
            existing = {a.product_family_id: a for a in ProductionLineProductFamily.objects.filter(production_line=line)}
            new_ids = set(family_ids)
            for fam_id, assignment in list(existing.items()):
                if fam_id not in new_ids:
                    ProductionLineProductModel.objects.filter(production_line=line, product_family_id=fam_id).delete()
                    assignment.delete()
            for fam_id in family_ids:
                if fam_id not in existing:
                    ProductionLineProductFamily.objects.create(
                        production_line=line, product_family_id=fam_id, is_primary=(fam_id == primary_family_id),
                    )
                elif fam_id == primary_family_id:
                    existing[fam_id].is_primary = True
                    existing[fam_id].save()
            if primary_family_id:
                ProductionLineProductFamily.objects.filter(production_line=line).exclude(product_family_id=primary_family_id).update(is_primary=False)
            assignments = ProductionLineProductFamily.objects.filter(production_line=line).select_related("product_family").all()
            return ProductFamilyAssignmentPayload(ok=True, assignments=[ProductFamilyAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def remove_family_from_production_line(self, info: Info, production_line_id: str, family_id: str) -> ProductFamilyAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_family_id=family_id).delete()
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id, product_family_id=family_id).delete()
            assignments = ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).select_related("product_family").all()
            return ProductFamilyAssignmentPayload(ok=True, assignments=[ProductFamilyAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def assign_models_to_production_line(self, info: Info, production_line_id: str, model_ids: list[str], primary_model_id: typing.Optional[str] = None) -> ProductModelAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            line = ProductionLine.objects.get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Production line not found")])
        try:
            primary_fam = ProductionLineProductFamily.objects.filter(production_line=line, is_primary=True).first() or ProductionLineProductFamily.objects.filter(production_line=line).first()
            if not primary_fam:
                return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="productFamilyId", code="REQUIRED", message="Product family is required before assigning models")])
            if primary_model_id and primary_model_id not in model_ids:
                return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="primaryModelId", code="INVALID_PRIMARY", message="Primary model must be one of the selected models")])
            family = primary_fam.product_family
            selected_models = ReferenceValue.objects.filter(id__in=model_ids).select_related("category")
            invalid_models = [
                model for model in selected_models
                if model.category.code == "product_model"
                and (
                    (model.metadata or {}).get("familyId") not in (None, "", str(family.id))
                    or ((model.metadata or {}).get("family") not in (None, "", family.code))
                )
            ]
            if invalid_models:
                return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="modelIds", code="MODEL_FAMILY_MISMATCH", message="Selected product models must belong to the selected product family")])
            existing = {a.product_model_id: a for a in ProductionLineProductModel.objects.filter(production_line=line).select_related("product_model", "product_family")}
            new_ids = set(model_ids)
            for model_id, assignment in list(existing.items()):
                if model_id not in new_ids:
                    assignment.delete()
            default_family_id = primary_fam.product_family_id if primary_fam else None
            for idx, model_id in enumerate(model_ids):
                if model_id not in existing:
                    family_id = default_family_id
                    if not family_id:
                        continue
                    ProductionLineProductModel.objects.create(
                        production_line=line, product_model_id=model_id,
                        product_family_id=family_id, is_primary=False,
                    )
                elif model_id in existing and existing[model_id].product_family_id != default_family_id:
                    existing[model_id].product_family_id = default_family_id
                    existing[model_id].save()
            if primary_model_id:
                ProductionLineProductModel.objects.filter(production_line=line, product_model_id=primary_model_id).update(is_primary=True)
                ProductionLineProductModel.objects.filter(production_line=line).exclude(product_model_id=primary_model_id).update(is_primary=False)
            else:
                ProductionLineProductModel.objects.filter(production_line=line).update(is_primary=False)
            assignments = ProductionLineProductModel.objects.filter(production_line=line).select_related("product_model", "product_family").all()
            return ProductModelAssignmentPayload(ok=True, assignments=[ProductModelAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def remove_model_from_production_line(self, info: Info, production_line_id: str, model_id: str) -> ProductModelAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_model_id=model_id).delete()
            assignments = ProductionLineProductModel.objects.filter(production_line_id=production_line_id).select_related("product_model", "product_family").all()
            return ProductModelAssignmentPayload(ok=True, assignments=[ProductModelAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def set_primary_production_line_family(self, info: Info, production_line_id: str, family_id: str) -> ProductFamilyAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).update(is_primary=False)
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id, product_family_id=family_id).update(is_primary=True)
            assignments = ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).select_related("product_family").all()
            return ProductFamilyAssignmentPayload(ok=True, assignments=[ProductFamilyAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def set_primary_production_line_model(self, info: Info, production_line_id: str, model_id: str) -> ProductModelAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id).update(is_primary=False)
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_model_id=model_id).update(is_primary=True)
            assignments = ProductionLineProductModel.objects.filter(production_line_id=production_line_id).select_related("product_model", "product_family").all()
            return ProductModelAssignmentPayload(ok=True, assignments=[ProductModelAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    # ── Work Schedule & Shift ──

    @strawberry.mutation
    def create_work_schedule(self, info: Info, input: WorkScheduleInput) -> WorkSchedulePayload:
        from datetime import datetime
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            schedule = ScheduleService.create_schedule(
                scope_type=input.scope_type, scope_id=input.scope_id, name=input.name,
                effective_from=datetime.fromisoformat(input.effective_from),
                effective_to=datetime.fromisoformat(input.effective_to) if input.effective_to else None,
                timezone=input.timezone or "",
            )
            from_dt = datetime.fromisoformat(input.effective_from)
            to_dt = datetime.fromisoformat(input.effective_to) if input.effective_to else from_dt
            jobs = CapacityCascadeService.recalculate_from_scope(
                input.scope_type, input.scope_id, from_dt, to_dt, trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True, schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def update_work_schedule(self, info: Info, id: str, input: WorkScheduleUpdateInput) -> WorkSchedulePayload:
        from datetime import datetime
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            kwargs = {}
            if input.name is not None: kwargs["name"] = input.name
            if input.timezone is not None: kwargs["timezone"] = input.timezone
            if input.effective_from is not None: kwargs["effective_from"] = datetime.fromisoformat(input.effective_from)
            if input.effective_to is not None: kwargs["effective_to"] = datetime.fromisoformat(input.effective_to)
            if input.is_active is not None: kwargs["is_active"] = input.is_active
            schedule = ScheduleService.update_schedule(id, **kwargs)
            jobs = CapacityCascadeService.recalculate_from_scope(
                schedule.scope_type, schedule.scope_id,
                schedule.effective_from, schedule.effective_to or schedule.effective_from,
                trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True, schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def archive_work_schedule(self, info: Info, id: str) -> WorkSchedulePayload:
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            schedule = ScheduleService.archive_schedule(id)
            jobs = CapacityCascadeService.recalculate_from_scope(
                schedule.scope_type, schedule.scope_id,
                schedule.effective_from, schedule.effective_to or schedule.effective_from,
                trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True, schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_work_shift(self, info: Info, input: WorkShiftInput) -> WorkShiftPayload:
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from datetime import time as dt_time
        try:
            parts_s = input.start_time.split(":")
            parts_e = input.end_time.split(":")
            start = dt_time(int(parts_s[0]), int(parts_s[1]))
            end = dt_time(int(parts_e[0]), int(parts_e[1]))
            shift = ScheduleService.create_shift(
                schedule_id=input.schedule_id, name=input.name, weekday=input.weekday,
                start_time=start, end_time=end,
                paid_minutes=input.paid_minutes, break_minutes=input.break_minutes,
            )
            return WorkShiftPayload(ok=True, shift=WorkShiftNode.from_db(shift))
        except ScheduleValidationError as e:
            return WorkShiftPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    # ── GPT Line ──

    @strawberry.mutation
    @transaction.atomic
    def seed_gpt_line(self, info: Info) -> "SeedGptLinePayload":
        from io import StringIO
        from django.core.management import call_command
        ensure_access(user=_user(info), action="manage_production_lines")
        out = StringIO()
        try:
            call_command("seed_gpt_line", stdout=out)
            output = out.getvalue()
            lines = [l.strip() for l in output.split("\n") if l.strip()]
            ok = "SEED COMPLETE" in output
            return SeedGptLinePayload(ok=ok, messages=lines[-20:] if lines else ["Completed"])
        except Exception as e:
            return SeedGptLinePayload(ok=False, messages=[str(e)])

    @strawberry.mutation
    @transaction.atomic
    def cleanup_gpt_line(self, info: Info) -> "CleanupGptLinePayload":
        from manufacturing.models import (
            Plant, Department, ResourceGroup, Resource,
            ProductModel, ProductVariant, PartNumber,
        )
        from manufacturing.models.production_line_resource_group import ProductionLineResourceGroup
        from manufacturing.models.routing import (
            Routing, RoutingStep, ProcessFlow, ProcessStep, BOM, BOMItem, MaterialBin,
        )
        ensure_access(user=_user(info), action="manage_production_lines")
        messages = []
        try:
            plant = Plant.objects.get(code="PP-02")
            gpt_model = ProductModel.objects.get(code="GPT")
            line = ProductionLine.objects.filter(plant=plant, code="GPT").first()
            if line:
                ProductionLineResourceGroup.objects.filter(production_line=line).delete()
                MaterialBin.objects.filter(production_line=line).delete()
                Routing.objects.filter(production_line=line).delete()
                ProcessFlow.objects.filter(production_line=line).delete()
                ProductionLineDepartmentAssignment.objects.filter(production_line=line).delete()
                messages.append("Deleted GPT production line")
            dept_codes = ["MCH", "WLD", "COT", "ASM", "PIP", "KIT", "HRS", "PKG"]
            for code in dept_codes:
                dept = Department.objects.filter(plant=plant, code=code).first()
                if not dept:
                    continue
                for rg in ResourceGroup.objects.filter(department=dept):
                    MaterialBin.objects.filter(resource_group=rg).delete()
                    Resource.objects.filter(resource_group=rg).delete()
                    ProductionLineResourceGroup.objects.filter(resource_group=rg).delete()
                    RoutingStep.objects.filter(resource_group=rg).delete()
                    rg.delete()
                ProductionLineDepartmentAssignment.objects.filter(department=dept).delete()
                dept.delete()
            messages.append("Deleted 8 GPT departments, 16 RGs, 32 resources")
            if line:
                line.delete()
                messages.append("Removed GPT production line")
            for bom in BOM.objects.filter(product_model=gpt_model):
                BOMItem.objects.filter(bom=bom).delete()
                bom.delete()
            messages.append("Deleted GPT BOM")
            variant = ProductVariant.objects.filter(model=gpt_model, code="239364-01").first()
            if variant:
                PartNumber.objects.filter(variant=variant).delete()
                variant.delete()
                messages.append("Deleted GPT variant and 50 part numbers")
            messages.append("GPT line cleanup complete")
            return CleanupGptLinePayload(ok=True, messages=messages)
        except Exception as e:
            return CleanupGptLinePayload(ok=False, messages=[str(e)])

    # ── Document / Standard Framework ──

    @strawberry.mutation(name="createStructureDocument")
    def create_structure_document(self, info: Info, input: StructureDocumentInput) -> StructureDocumentPayload:
        ensure_access(user=_user(info), action="manage_structure_documents")
        from manufacturing.domain.structure_document_service import StructureDocumentService, StructureDocumentError
        try:
            doc = StructureDocumentService.create_document(
                document_type=input.document_type, target_type=input.target_type, target_id=input.target_id,
                title=input.title, code=input.code, content=input.content or "",
                revision=input.revision or "1.0", owner=input.owner or "",
                effective_from=input.effective_from, effective_to=input.effective_to,
            )
            return StructureDocumentPayload(ok=True, document=StructureDocumentNode.from_db(doc))
        except StructureDocumentError as e:
            return StructureDocumentPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="updateStructureDocument")
    def update_structure_document(self, info: Info, id: str, input: StructureDocumentUpdateInput) -> StructureDocumentPayload:
        ensure_access(user=_user(info), action="manage_structure_documents")
        from manufacturing.domain.structure_document_service import StructureDocumentService, StructureDocumentError
        try:
            doc = StructureDocumentService.update_document(
                document_id=int(id), title=input.title, content=input.content,
                revision=input.revision, owner=input.owner,
                effective_from=input.effective_from, effective_to=input.effective_to,
            )
            return StructureDocumentPayload(ok=True, document=StructureDocumentNode.from_db(doc))
        except StructureDocumentError as e:
            return StructureDocumentPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="createStructureDocumentRevision")
    def create_structure_document_revision(self, info: Info, input: CreateRevisionInput) -> DocumentControlPayload:
        ensure_access(user=_user(info), action="manage_structure_documents")
        from manufacturing.domain.structure_document_control_service import StructureDocumentControlService, DocumentControlError
        try:
            doc = StructureDocumentControlService.create_revision(
                document_id=int(input.document_id), new_revision=input.new_revision,
                change_reason=input.change_reason or "", user=str(_user(info)),
            )
            return DocumentControlPayload(ok=True, document=StructureDocumentNode.from_db(doc))
        except DocumentControlError as e:
            return DocumentControlPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="approveStructureDocument")
    def approve_structure_document_controlled(self, info: Info, id: str) -> DocumentControlPayload:
        ensure_access(user=_user(info), action="approve_structure_documents")
        from manufacturing.domain.structure_document_control_service import StructureDocumentControlService, DocumentControlError
        try:
            doc = StructureDocumentControlService.approve_document(document_id=int(id), user=str(_user(info)))
            return DocumentControlPayload(ok=True, document=StructureDocumentNode.from_db(doc))
        except DocumentControlError as e:
            return DocumentControlPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="archiveStructureDocument")
    def archive_structure_document_controlled(self, info: Info, input: ArchiveDocumentInput) -> DocumentControlPayload:
        ensure_access(user=_user(info), action="archive_structure_documents")
        from manufacturing.domain.structure_document_control_service import StructureDocumentControlService, DocumentControlError
        try:
            doc = StructureDocumentControlService.archive_document(
                document_id=int(input.document_id), reason=input.reason, user=str(_user(info)),
            )
            return DocumentControlPayload(ok=True, document=StructureDocumentNode.from_db(doc))
        except DocumentControlError as e:
            return DocumentControlPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="setStructureDocumentControlledCopy")
    def set_structure_document_controlled_copy(self, info: Info, input: ControlledCopyInput) -> DocumentControlPayload:
        ensure_access(user=_user(info), action="manage_structure_documents")
        from manufacturing.domain.structure_document_control_service import StructureDocumentControlService, DocumentControlError
        try:
            doc = StructureDocumentControlService.set_controlled_copy(
                document_id=int(input.document_id), is_controlled_copy=input.is_controlled_copy,
                reason=input.reason or "", user=str(_user(info)),
            )
            return DocumentControlPayload(ok=True, document=StructureDocumentNode.from_db(doc))
        except DocumentControlError as e:
            return DocumentControlPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])
