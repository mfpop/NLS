import strawberry
import typing
from strawberry.types import Info
from django.db import transaction
from api.permissions import ensure_access
from api.types.manufacturing import (
    AuditNode, AuditPayload, AuditInput, AuditUpdateInput,
    AuditChecklistItemNode, AuditChecklistItemPayload, AuditChecklistItemInput, AuditChecklistItemUpdateInput,
    AuditFindingNode, AuditFindingPayload, AuditFindingInput, AuditFindingUpdateInput,
    AuditAnswerNode, AuditAnswerPayload,
    AuditTemplateNode, AuditInstallTemplatesPayload, AuditTemplatePayload,
    AuditTemplateCreateInput, AuditTemplateUpdateInput,
    AuditTemplateCategoryInput, AuditTemplateCategoryUpdateInput,
    AuditTemplateQuestionInput, AuditTemplateQuestionUpdateInput,
    CreateAuditFromTemplateInput, SaveAuditAnswerInput, SaveAuditAnswersBulkInput, SaveAuditAnswersBulkPayload,
    CreateAuditFindingFromAnswerInput,
    MutationError,
)


def _user(info):
    return info.context.user


@strawberry.type
class ManufacturingAuditMutation:

    @strawberry.mutation(name="createAudit")
    def create_audit(self, info: Info, input: "AuditInput") -> "AuditPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            audit = AuditService.create_audit(
                control_area=input.control_area,
                audit_type=input.audit_type,
                target_type=input.target_type,
                target_id=input.target_id,
                title=input.title,
                auditor=input.auditor or "",
                audit_date=input.audit_date,
                notes=input.notes or "",
            )
            return AuditPayload(ok=True, audit=AuditNode.from_db(audit))
        except AuditServiceError as e:
            return AuditPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="createAuditFromTemplate")
    def create_audit_from_template(self, info: Info, input: "CreateAuditFromTemplateInput") -> "AuditPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            audit = AuditService.create_audit_from_template(
                template_id=input.template_id,
                target_type=input.target_type,
                target_id=input.target_id,
                title=input.title,
                auditor=input.auditor or "",
                audit_date=input.audit_date,
                notes=input.notes or "",
                control_area=input.control_area or "PRODUCTION",
            )
            from manufacturing.models.audit import AuditAnswer
            answers = list(AuditAnswer.objects.filter(audit=audit).select_related("template_question").order_by("template_question__sequence"))
            return AuditPayload(ok=True, audit=AuditNode.from_db(audit, answers=answers))
        except AuditServiceError as e:
            return AuditPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="completeAudit")
    def complete_audit(self, info: Info, id: str) -> "AuditPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            audit = AuditService.complete_audit(audit_id=int(id))
            items = list(audit.checklist_items.all())
            findings = list(audit.findings.all())
            from manufacturing.models.audit import AuditAnswer
            answers = list(AuditAnswer.objects.filter(audit=audit).select_related("template_question").order_by("template_question__sequence"))
            return AuditPayload(ok=True, audit=AuditNode.from_db(audit, checklist=items, findings=findings, answers=answers))
        except AuditServiceError as e:
            return AuditPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="saveAuditAnswer")
    def save_audit_answer(self, info: Info, input: SaveAuditAnswerInput) -> "AuditAnswerPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            answer = AuditService.save_answer(
                audit_id=input.audit_id,
                question_id=input.question_id,
                answer_value=input.answer_value,
                comment=input.comment,
                evidence_url=input.evidence_url or "",
            )
            return AuditAnswerPayload(ok=True, answer=AuditAnswerNode.from_db(answer))
        except AuditServiceError as e:
            return AuditAnswerPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="saveAuditAnswersBulk")
    def save_audit_answers_bulk(self, info: Info, input: "SaveAuditAnswersBulkInput") -> "SaveAuditAnswersBulkPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        from manufacturing.models.audit import AuditAnswer
        try:
            audit = AuditService.save_answers_bulk(
                audit_id=input.audit_id,
                answers=[{"question_id": a.question_id, "answer_value": a.answer_value, "comment": a.comment} for a in input.answers],
            )
            answers = list(AuditAnswer.objects.filter(audit=audit).select_related("template_question").order_by("template_question__sequence"))
            items = list(audit.checklist_items.all())
            findings = list(audit.findings.all())
            return SaveAuditAnswersBulkPayload(ok=True, audit=AuditNode.from_db(audit, checklist=items, findings=findings, answers=answers))
        except AuditServiceError as e:
            return SaveAuditAnswersBulkPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="createAuditFindingFromAnswer")
    def create_audit_finding_from_answer(self, info: Info, input: CreateAuditFindingFromAnswerInput) -> "AuditFindingPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            finding = AuditService.create_finding_from_answer(
                audit_id=input.audit_id,
                answer_id=input.answer_id,
                description=input.description,
                severity=input.severity,
                owner=input.owner,
                due_date=input.due_date,
            )
            return AuditFindingPayload(ok=True, finding=AuditFindingNode.from_db(finding))
        except AuditServiceError as e:
            return AuditFindingPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    # --- Audit Template CRUD ---

    @strawberry.mutation(name="createAuditTemplate")
    def create_audit_template(self, info: Info, input: "AuditTemplateCreateInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import (
            AuditTemplate, TemplateStatus, ModuleScope,
        )
        try:
            existing = AuditTemplate.objects.filter(code=input.code).first()
            if existing:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="code", code="DUPLICATE", message=f"Template with code '{input.code}' already exists")])
            template = AuditTemplate.objects.create(
                code=input.code,
                name=input.name,
                audit_type=input.audit_type,
                module_scope=input.module_scope or ModuleScope.PRODUCTION_CONTROL,
                target_types=input.target_types or [],
                version=1,
                status=TemplateStatus.DRAFT,
                is_default=False,
            )
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="updateAuditTemplate")
    def update_audit_template(self, info: Info, id: str, input: "AuditTemplateUpdateInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService, AuditServiceError
        try:
            template = AuditTemplateService.update_template_metadata(
                template_id=int(id), name=input.name,
                module_scope=input.module_scope, target_types=input.target_types,
            )
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except AuditServiceError as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="addAuditTemplateCategory")
    def add_audit_template_category(self, info: Info, template_id: str, input: "AuditTemplateCategoryInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplate, AuditTemplateCategory
        try:
            template = AuditTemplate.objects.filter(id=int(template_id)).first()
            if not template:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="templateId", code="NOT_FOUND", message="Template not found")])
            AuditTemplateCategory.objects.create(
                template=template, code=input.code, name=input.name,
                sequence=input.sequence or 0,
                is_required=input.is_required if input.is_required is not None else True,
            )
            cats = list(AuditTemplateCategory.objects.filter(template=template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="updateAuditTemplateCategory")
    def update_audit_template_category(self, info: Info, id: str, input: "AuditTemplateCategoryUpdateInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateCategory
        try:
            category = AuditTemplateCategory.objects.select_related("template").filter(id=int(id)).first()
            if not category:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Category not found")])
            if input.code is not None: category.code = input.code
            if input.name is not None: category.name = input.name
            if input.sequence is not None: category.sequence = input.sequence
            if input.is_required is not None: category.is_required = input.is_required
            category.save()
            cats = list(AuditTemplateCategory.objects.filter(template=category.template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(category.template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="removeAuditTemplateCategory")
    def remove_audit_template_category(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateCategory
        try:
            category = AuditTemplateCategory.objects.select_related("template").filter(id=int(id)).first()
            if not category:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Category not found")])
            template = category.template
            category.delete()
            cats = list(AuditTemplateCategory.objects.filter(template=template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="addAuditTemplateQuestion")
    def add_audit_template_question(self, info: Info, category_id: str, input: "AuditTemplateQuestionInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateCategory, AuditTemplateQuestion
        try:
            category = AuditTemplateCategory.objects.select_related("template").filter(id=int(category_id)).first()
            if not category:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="categoryId", code="NOT_FOUND", message="Category not found")])
            AuditTemplateQuestion.objects.create(
                category=category, code=input.code, question=input.question,
                response_type=input.response_type,
                is_required=input.is_required if input.is_required is not None else True,
                help_text=input.help_text or "",
                sequence=input.sequence or 0,
            )
            cats = list(AuditTemplateCategory.objects.filter(template=category.template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(category.template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="updateAuditTemplateQuestion")
    def update_audit_template_question(self, info: Info, id: str, input: "AuditTemplateQuestionUpdateInput") -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateQuestion
        try:
            question = AuditTemplateQuestion.objects.select_related("category__template").filter(id=int(id)).first()
            if not question:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Question not found")])
            if input.code is not None: question.code = input.code
            if input.question is not None: question.question = input.question
            if input.response_type is not None: question.response_type = input.response_type
            if input.is_required is not None: question.is_required = input.is_required
            if input.help_text is not None: question.help_text = input.help_text
            if input.sequence is not None: question.sequence = input.sequence
            question.save()
            template = question.category.template
            cats = list(AuditTemplateCategory.objects.filter(template=template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="removeAuditTemplateQuestion")
    def remove_audit_template_question(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.models.audit import AuditTemplateQuestion
        try:
            question = AuditTemplateQuestion.objects.select_related("category__template").filter(id=int(id)).first()
            if not question:
                return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Question not found")])
            template = question.category.template
            question.delete()
            cats = list(AuditTemplateCategory.objects.filter(template=template).prefetch_related("questions").order_by("sequence"))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template, categories=cats))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation(name="installDefaultProductionControlAuditTemplates")
    def install_default_production_control_audit_templates(self, info: Info) -> "AuditInstallTemplatesPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService
        try:
            templates = AuditTemplateService.install_default_production_control_templates()
            return AuditInstallTemplatesPayload(ok=True, message=f"Installed {len(templates)} Production Control templates.")
        except Exception as e:
            return AuditInstallTemplatesPayload(ok=False, message=str(e))

    @strawberry.mutation(name="installDefaultSafetyControlAuditTemplates")
    def install_default_safety_control_audit_templates(self, info: Info) -> "AuditInstallTemplatesPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService
        try:
            templates = AuditTemplateService.install_default_safety_control_templates()
            return AuditInstallTemplatesPayload(ok=True, message=f"Installed {len(templates)} Safety Control templates.")
        except Exception as e:
            return AuditInstallTemplatesPayload(ok=False, message=str(e))

    @strawberry.mutation(name="installDefaultMaterialControlAuditTemplates")
    def install_default_material_control_audit_templates(self, info: Info) -> "AuditInstallTemplatesPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService
        try:
            templates = AuditTemplateService.install_default_material_control_templates()
            return AuditInstallTemplatesPayload(ok=True, message=f"Installed {len(templates)} Material Control templates.")
        except Exception as e:
            return AuditInstallTemplatesPayload(ok=False, message=str(e))

    @strawberry.mutation(name="installDefaultQualityControlAuditTemplates")
    def install_default_quality_control_audit_templates(self, info: Info) -> "AuditInstallTemplatesPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService
        try:
            templates = AuditTemplateService.install_default_quality_control_templates()
            return AuditInstallTemplatesPayload(ok=True, message=f"Installed {len(templates)} Quality Control templates.")
        except Exception as e:
            return AuditInstallTemplatesPayload(ok=False, message=str(e))

    @strawberry.mutation(name="activateAuditTemplate")
    def activate_audit_template(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService, AuditServiceError
        try:
            template = AuditTemplateService.activate_template(template_id=int(id))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except AuditServiceError as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="archiveAuditTemplate")
    def archive_audit_template(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService, AuditServiceError
        try:
            template = AuditTemplateService.archive_template(template_id=int(id))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except AuditServiceError as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="cloneAuditTemplateVersion")
    def clone_audit_template_version(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService, AuditServiceError
        try:
            template = AuditTemplateService.clone_version(template_id=int(id))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except AuditServiceError as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="updateAudit")
    def update_audit(self, info: Info, id: str, input: "AuditUpdateInput") -> "AuditPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            audit = AuditService.update_audit(
                audit_id=int(id),
                title=input.title,
                auditor=input.auditor,
                audit_date=input.audit_date,
                notes=input.notes,
                status=input.status,
            )
            return AuditPayload(ok=True, audit=AuditNode.from_db(audit))
        except AuditServiceError as e:
            return AuditPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="deleteAudit")
    def delete_audit(self, info: Info, id: str) -> "AuditPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            AuditService.delete_audit(audit_id=int(id))
            return AuditPayload(ok=True)
        except AuditServiceError as e:
            return AuditPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="addAuditChecklistItem")
    def add_audit_checklist_item(self, info: Info, audit_id: str, input: "AuditChecklistItemInput") -> "AuditChecklistItemPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            item = AuditService.add_checklist_item(
                audit_id=int(audit_id),
                question=input.question,
                result=input.result,
                comment=input.comment or "",
            )
            return AuditChecklistItemPayload(ok=True, item=AuditChecklistItemNode.from_db(item))
        except AuditServiceError as e:
            return AuditChecklistItemPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="updateAuditChecklistItem")
    def update_audit_checklist_item(self, info: Info, id: str, input: "AuditChecklistItemUpdateInput") -> "AuditChecklistItemPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            item = AuditService.update_checklist_item(
                item_id=int(id),
                question=input.question,
                result=input.result,
                comment=input.comment,
            )
            return AuditChecklistItemPayload(ok=True, item=AuditChecklistItemNode.from_db(item))
        except AuditServiceError as e:
            return AuditChecklistItemPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="addAuditFinding")
    def add_audit_finding(self, info: Info, audit_id: str, input: "AuditFindingInput") -> "AuditFindingPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            finding = AuditService.add_finding(
                audit_id=int(audit_id),
                description=input.description,
                severity=input.severity,
                owner=input.owner or "",
                due_date=input.due_date,
            )
            return AuditFindingPayload(ok=True, finding=AuditFindingNode.from_db(finding))
        except AuditServiceError as e:
            return AuditFindingPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="updateAuditFinding")
    def update_audit_finding(self, info: Info, id: str, input: "AuditFindingUpdateInput") -> "AuditFindingPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            finding = AuditService.update_finding(
                finding_id=int(id),
                description=input.description,
                severity=input.severity,
                status=input.status,
                owner=input.owner,
                due_date=input.due_date,
            )
            return AuditFindingPayload(ok=True, finding=AuditFindingNode.from_db(finding))
        except AuditServiceError as e:
            return AuditFindingPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="closeAuditFinding")
    def close_audit_finding(self, info: Info, id: str) -> "AuditFindingPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            finding = AuditService.close_finding(finding_id=int(id))
            return AuditFindingPayload(ok=True, finding=AuditFindingNode.from_db(finding))
        except AuditServiceError as e:
            return AuditFindingPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])
