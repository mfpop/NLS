import json
import strawberry
import typing
from typing import Optional
from strawberry.types import Info
from django.db import transaction
from django.core.exceptions import ValidationError

from api.permissions import ensure_access
from api.common.errors import MutationError
from api.types.manufacturing import (
    ProductFamilyAssignmentNode, ProductModelAssignmentNode,
    ProductFamilyAssignmentPayload, ProductModelAssignmentPayload,
    ProductFamilyInput, ProductFamilyNode, ProductFamilyPayload,
    ProductModelInput, ProductModelNode, ProductModelPayload,
    ProductVariantInput, ProductVariantNode, ProductVariantPayload,
    PartNumberInput, PartNumberNode, PartNumberPayload,
    BomInput, BOMNode, BomPayload,
    RoutingNode, RoutingPayload, RoutingStepNode, RoutingStepPayload,
    RoutingListPayload, RoutingInput, RoutingStepInput,
    ReorderStepsInput, SaveRoutingInput,
    MutationError,
)
from manufacturing.domain.routing_service import RoutingService, RoutingValidationError
from manufacturing.domain.product_identity_service import ProductIdentityError, ProductIdentityService
from manufacturing.models import ProductionLine, ProductionLineProductFamily, ProductionLineProductModel


def _user(info: Info):
    return info.context.user


def _parse_dt(value: Optional[str]):
    if not value:
        return None
    from datetime import datetime
    return datetime.fromisoformat(value)


def _product_identity_error(payload_cls, exc: ProductIdentityError):
    return payload_cls(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])


@strawberry.type
class ProductMasterMutation:
    @strawberry.mutation
    def create_product_family(self, input: ProductFamilyInput) -> ProductFamilyPayload:
        try:
            family = ProductIdentityService.create_family(input.__dict__)
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductFamilyPayload, exc)

    @strawberry.mutation
    def update_product_family(self, id: str, input: ProductFamilyInput) -> ProductFamilyPayload:
        try:
            family = ProductIdentityService.update_family(id, input.__dict__)
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductFamilyPayload, exc)

    @strawberry.mutation
    def archive_product_family(self, id: str) -> ProductFamilyPayload:
        try:
            family = ProductIdentityService.archive_family(id)
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductFamilyPayload, exc)

    @strawberry.mutation
    def create_product_model(self, input: ProductModelInput) -> ProductModelPayload:
        try:
            model = ProductIdentityService.create_model(input.__dict__)
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductModelPayload, exc)

    @strawberry.mutation
    def update_product_model(self, id: str, input: ProductModelInput) -> ProductModelPayload:
        try:
            model = ProductIdentityService.update_model(id, input.__dict__)
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductModelPayload, exc)

    @strawberry.mutation
    def archive_product_model(self, id: str) -> ProductModelPayload:
        try:
            model = ProductIdentityService.archive_model(id)
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductModelPayload, exc)

    @strawberry.mutation
    def create_product_variant(self, input: ProductVariantInput) -> ProductVariantPayload:
        try:
            variant = ProductIdentityService.create_variant(input.__dict__)
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductVariantPayload, exc)

    @strawberry.mutation
    def update_product_variant(self, id: str, input: ProductVariantInput) -> ProductVariantPayload:
        try:
            variant = ProductIdentityService.update_variant(id, input.__dict__)
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductVariantPayload, exc)

    @strawberry.mutation
    def archive_product_variant(self, id: str) -> ProductVariantPayload:
        try:
            variant = ProductIdentityService.archive_variant(id)
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductVariantPayload, exc)

    @strawberry.mutation
    def create_part_number(self, input: PartNumberInput) -> PartNumberPayload:
        try:
            part = ProductIdentityService.create_part_number(input.__dict__)
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(part))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    @strawberry.mutation
    def update_part_number(self, id: str, input: PartNumberInput) -> PartNumberPayload:
        try:
            part = ProductIdentityService.update_part_number(id, input.__dict__)
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(part))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    @strawberry.mutation
    def archive_part_number(self, id: str) -> PartNumberPayload:
        try:
            part = ProductIdentityService.archive_part_number(id)
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(part))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    @strawberry.mutation
    def create_bom(self, input: BomInput) -> BomPayload:
        try:
            bom = RoutingService.create_bom(input.__dict__)
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except RoutingValidationError as exc:
            return BomPayload(ok=False, errors=[MutationError(field=exc.field, code="VALIDATION", message=exc.message)])

    @strawberry.mutation
    def update_bom(self, id: str, input: BomInput) -> BomPayload:
        try:
            bom = RoutingService.update_bom(id, input.__dict__)
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except RoutingValidationError as exc:
            return BomPayload(ok=False, errors=[MutationError(field=exc.field, code="VALIDATION", message=exc.message)])

    @strawberry.mutation
    def archive_bom(self, id: str) -> BomPayload:
        try:
            bom = RoutingService.update_bom(id, {"status": "ARCHIVED"})
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except RoutingValidationError as exc:
            return BomPayload(ok=False, errors=[MutationError(field=exc.field, code="VALIDATION", message=exc.message)])

    @strawberry.mutation
    def create_routing(self, input: RoutingInput) -> RoutingPayload:
        try:
            routing = RoutingService.create_routing({
                "production_line_id": input.production_line_id,
                "product_family_id": input.product_family_id,
                "product_model_id": input.product_model_id,
                "part_number_id": input.part_number_id,
                "product_variant_id": input.product_variant_id,
                "version": input.version or "1.0",
                "status": input.status or "DRAFT",
                "effective_from": input.effective_from,
                "effective_to": input.effective_to,
                "notes": input.notes or "",
            })
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def update_routing(self, id: str, input: RoutingInput) -> RoutingPayload:
        try:
            data = {
                "production_line_id": input.production_line_id,
                "product_family_id": input.product_family_id,
                "product_model_id": input.product_model_id,
                "part_number_id": input.part_number_id,
                "product_variant_id": input.product_variant_id,
                "version": input.version,
                "effective_from": input.effective_from,
                "effective_to": input.effective_to,
                "notes": input.notes,
            }
            if input.status:
                data["status"] = input.status
            routing = RoutingService.update_routing(id, data)
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def activate_routing(self, id: str) -> RoutingPayload:
        try:
            routing = RoutingService.activate_routing(id)
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def archive_routing(self, id: str) -> RoutingPayload:
        try:
            routing = RoutingService.archive_routing(id)
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def save_routing(self, input: SaveRoutingInput) -> RoutingPayload:
        try:
            routing = RoutingService.save_routing({
                "routing_id": input.routing_id,
                "production_line_id": input.production_line_id,
                "product_family_id": input.product_family_id,
                "product_model_id": input.product_model_id,
                "part_number_id": input.part_number_id,
                "product_variant_id": input.product_variant_id,
                "version": input.version or "1.0",
                "notes": input.notes or "",
                "steps": [
                    {
                        "id": step.id,
                        "sequence": step.sequence,
                        "department_id": step.department_id,
                        "resource_group_id": step.resource_group_id,
                        "resource_id": step.resource_id,
                        "standard_work_id": step.standard_work_id,
                        "cycle_time_sec": step.cycle_time_sec,
                        "setup_time_sec": step.setup_time_sec,
                        "changeover_time_sec": step.changeover_time_sec,
                        "required_operators": step.required_operators,
                        "schedule_source": step.schedule_source or "LINE",
                        "buffer_type": step.buffer_type,
                        "wip_min": step.wip_min,
                        "wip_max": step.wip_max,
                        "quality_checkpoint": step.quality_checkpoint or False,
                        "rework_allowed": step.rework_allowed or False,
                        "notes": step.notes or "",
                        "material_inputs": [
                            {
                                "id": item.id,
                                "material_id": item.material_id,
                                "quantity": item.quantity,
                                "material_state": item.material_state,
                                "location_id": item.location_id,
                                "bin_id": item.bin_id,
                            }
                            for item in step.material_inputs
                        ],
                        "material_outputs": [
                            {
                                "id": item.id,
                                "material_id": item.material_id,
                                "quantity": item.quantity,
                                "material_state": item.material_state,
                                "location_id": item.location_id,
                                "bin_id": item.bin_id,
                            }
                            for item in step.material_outputs
                        ],
                        "movement_rule": {
                            "rule_type": step.movement_rule.rule_type,
                            "source_location_id": step.movement_rule.source_location_id,
                            "destination_location_id": step.movement_rule.destination_location_id,
                            "source_bin_id": step.movement_rule.source_bin_id,
                            "destination_bin_id": step.movement_rule.destination_bin_id,
                            "notes": step.movement_rule.notes or "",
                        } if step.movement_rule else None,
                    }
                    for step in input.steps
                ],
            })
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def create_routing_step(self, input: RoutingStepInput) -> RoutingStepPayload:
        try:
            step = RoutingService.add_step(input.routing_id, {
                "sequence": input.sequence,
                "department_id": input.department_id,
                "resource_group_id": input.resource_group_id,
                "resource_id": input.resource_id,
                "standard_work_id": input.standard_work_id,
                "cycle_time_sec": input.cycle_time_sec,
                "setup_time_sec": input.setup_time_sec,
                "changeover_time_sec": input.changeover_time_sec,
                "required_operators": input.required_operators,
                "schedule_source": input.schedule_source or "LINE",
                "buffer_type": input.buffer_type,
                "wip_min": input.wip_min,
                "wip_max": input.wip_max,
                "quality_checkpoint": input.quality_checkpoint or False,
                "rework_allowed": input.rework_allowed or False,
                "notes": input.notes or "",
            })
            return RoutingStepPayload(ok=True, step=RoutingStepNode.from_db(step))
        except RoutingValidationError as e:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def update_routing_step(self, id: str, input: RoutingStepInput) -> RoutingStepPayload:
        try:
            data = {
                "sequence": input.sequence,
                "department_id": input.department_id,
                "resource_group_id": input.resource_group_id,
                "resource_id": input.resource_id,
                "standard_work_id": input.standard_work_id,
                "cycle_time_sec": input.cycle_time_sec,
                "setup_time_sec": input.setup_time_sec,
                "changeover_time_sec": input.changeover_time_sec,
                "required_operators": input.required_operators,
                "schedule_source": input.schedule_source,
                "buffer_type": input.buffer_type,
                "wip_min": input.wip_min,
                "wip_max": input.wip_max,
                "quality_checkpoint": input.quality_checkpoint,
                "rework_allowed": input.rework_allowed,
                "notes": input.notes,
            }
            step = RoutingService.update_step(id, data)
            return RoutingStepPayload(ok=True, step=RoutingStepNode.from_db(step))
        except RoutingValidationError as e:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def delete_routing_step(self, id: str) -> RoutingStepPayload:
        try:
            RoutingService.delete_step(id)
            return RoutingStepPayload(ok=True)
        except RoutingValidationError as e:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def reorder_routing_steps(self, input: ReorderStepsInput) -> RoutingStepPayload:
        try:
            RoutingService.reorder_steps(input.routing_id, input.ordered_step_ids)
            return RoutingStepPayload(ok=True)
        except RoutingValidationError as e:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    # ── Capacity Planning ──

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
            # Remove unselected
            for fam_id, assignment in list(existing.items()):
                if fam_id not in new_ids:
                    ProductionLineProductModel.objects.filter(production_line=line, product_family_id=fam_id).delete()
                    assignment.delete()
            # Add new
            for fam_id in family_ids:
                if fam_id not in existing:
                    ProductionLineProductFamily.objects.create(
                        production_line=line,
                        product_family_id=fam_id,
                        is_primary=(fam_id == primary_family_id),
                    )
                elif fam_id == primary_family_id:
                    existing[fam_id].is_primary = True
                    existing[fam_id].save()
            # Ensure only one primary
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
                        production_line=line,
                        product_model_id=model_id,
                        product_family_id=family_id,
                        is_primary=False,
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

    # ── New Work Schedule & Capacity Profile Mutations ──
