from datetime import date
from typing import Optional
from django.db import transaction
from django.db.models import F

from manufacturing.models import (
    Routing, RoutingStep, RoutingStatus,
    ProductionLine, Department, ResourceGroup, Resource,
    ReferenceValue, ProductModel, ProcessFlow,
    BOM, InventoryLocation, Material, MaterialBin, OperationInput, OperationOutput, MaterialMovementRule,
    PartNumber, ProductFamily,
    MaterialState, MaterialMovementRuleType,
)


class RoutingValidationError(Exception):
    def __init__(self, message: str, field: str = "_form"):
        self.message = message
        self.field = field
        super().__init__(message)


def _error(field: str, code: str, message: str) -> dict:
    return {"field": field, "code": code, "message": message}


def _resolve_ref(model_class, ref_id: Optional[str]):
    if not ref_id:
        return None
    try:
        return model_class.objects.get(id=ref_id)
    except model_class.DoesNotExist:
        raise RoutingValidationError(f"{model_class.__name__} with id {ref_id} not found", ref_id)


def _resolve_product_model(ref_id: Optional[str]) -> Optional[ProductModel]:
    if not ref_id:
        return None
    try:
        return ProductModel.objects.get(id=ref_id)
    except ProductModel.DoesNotExist:
        pass
    try:
        ref = ReferenceValue.objects.get(id=ref_id, category__code="product_model")
    except ReferenceValue.DoesNotExist:
        raise RoutingValidationError(f"Product model with id {ref_id} not found", "productModelId")

    family = None
    family_code = (ref.metadata or {}).get("family") if isinstance(ref.metadata, dict) else None
    if family_code:
        family_ref = ReferenceValue.objects.filter(category__code="production_family", code=family_code).first()
        family, _ = ProductFamily.objects.get_or_create(
            code=family_ref.code if family_ref else family_code,
            defaults={
                "name": family_ref.name if family_ref else family_code,
                "description": family_ref.description if family_ref else "",
                "status": "ACTIVE" if not family_ref or family_ref.is_active else "INACTIVE",
                "is_active": True if not family_ref else family_ref.is_active,
            },
        )

    model, _ = ProductModel.objects.get_or_create(
        code=ref.code,
        defaults={
            "family": family,
            "name": ref.name,
            "description": ref.description or "",
            "status": "ACTIVE" if ref.is_active else "INACTIVE",
        },
    )
    updated = False
    if family and model.family_id != family.id:
        model.family = family
        updated = True
    if model.name != ref.name:
        model.name = ref.name
        updated = True
    if ref.description and model.description != ref.description:
        model.description = ref.description
        updated = True
    if updated:
        model.save()
    return model


def _resolve_part_number(part_id: Optional[str]) -> Optional[PartNumber]:
    if not part_id:
        return None
    try:
        return PartNumber.objects.select_related("family", "model", "variant").get(id=part_id)
    except PartNumber.DoesNotExist:
        raise RoutingValidationError(f"Part number with id {part_id} not found", "partNumberId")


def _resolve_optional_process_flow(ref_id: Optional[str]) -> Optional[ProcessFlow]:
    if not ref_id:
        return None
    try:
        return ProcessFlow.objects.get(id=ref_id)
    except ProcessFlow.DoesNotExist:
        return None


def _parse_date(val: Optional[str]) -> Optional[date]:
    if not val:
        return None
    try:
        return date.fromisoformat(val)
    except (ValueError, TypeError):
        raise RoutingValidationError(f"Invalid date format: {val}")


class RoutingService:
    @staticmethod
    def _routing_scope_filter(routing: Routing) -> dict:
        if routing.part_number_id:
            return {
                "production_line_id": routing.production_line_id,
                "part_number_id": routing.part_number_id,
            }
        return {
            "production_line_id": routing.production_line_id,
            "part_number__isnull": True,
            "product_model_id": routing.product_model_id,
        }

    @staticmethod
    def _lock_routing_siblings(production_line_id: str, product_model_id, part_number_id=None):
        qs = Routing.objects.select_for_update().filter(production_line_id=production_line_id)
        qs = qs.filter(part_number_id=part_number_id) if part_number_id else qs.filter(part_number__isnull=True, product_model_id=product_model_id)
        return list(qs)

    @staticmethod
    def _enforce_single_active_routing(routing: Routing, *, deactivate_siblings: bool = True) -> None:
        if routing.status != RoutingStatus.ACTIVE:
            return
        RoutingService._lock_routing_siblings(routing.production_line_id, routing.product_model_id, routing.part_number_id)
        siblings = Routing.objects.filter(**RoutingService._routing_scope_filter(routing)).exclude(id=routing.id)
        active_siblings = siblings.filter(status=RoutingStatus.ACTIVE)
        if deactivate_siblings:
            active_siblings.update(status=RoutingStatus.DRAFT)
            return
        if active_siblings.exists():
            raise RoutingValidationError(
                "An active routing already exists for this production line and product model.",
                "status",
            )

    @staticmethod
    def _bom_scope_filter(bom: BOM) -> dict:
        if bom.part_number_id:
            return {"part_number_id": bom.part_number_id}
        return {"product_model_id": bom.product_model_id}

    @staticmethod
    def _lock_bom_siblings(product_model_id: str, part_number_id=None):
        qs = BOM.objects.select_for_update()
        return list(qs.filter(part_number_id=part_number_id) if part_number_id else qs.filter(part_number__isnull=True, product_model_id=product_model_id))

    @staticmethod
    def _enforce_single_active_bom(bom: BOM, *, deactivate_siblings: bool = True) -> None:
        if bom.status != RoutingStatus.ACTIVE:
            return
        RoutingService._lock_bom_siblings(bom.product_model_id, bom.part_number_id)
        siblings = BOM.objects.filter(**RoutingService._bom_scope_filter(bom)).exclude(id=bom.id)
        active_siblings = siblings.filter(status=RoutingStatus.ACTIVE)
        if deactivate_siblings:
            active_siblings.update(status=RoutingStatus.DRAFT)
            return
        if active_siblings.exists():
            raise RoutingValidationError(
                "An active BOM already exists for this product model.",
                "status",
            )

    @staticmethod
    @transaction.atomic
    def create_bom(input_data: dict) -> BOM:
        part_number = _resolve_part_number(input_data.get("part_number_id"))
        product_model = part_number.model if part_number else _resolve_product_model(input_data.get("product_model_id"))
        if product_model is None:
            raise RoutingValidationError("Product model is required", "productModelId")
        RoutingService._lock_bom_siblings(str(product_model.id), part_number.id if part_number else None)
        bom = BOM(
            product_model=product_model,
            part_number=part_number,
            version=input_data.get("version", "1.0"),
            status=input_data.get("status", RoutingStatus.DRAFT),
            notes=input_data.get("notes", ""),
        )
        RoutingService._enforce_single_active_bom(bom)
        bom.save()
        return bom

    @staticmethod
    @transaction.atomic
    def update_bom(bom_id: str, input_data: dict) -> BOM:
        try:
            bom = BOM.objects.select_for_update().get(id=bom_id)
        except BOM.DoesNotExist:
            raise RoutingValidationError("BOM not found", "id")
        if "product_model_id" in input_data:
            product_model = _resolve_product_model(input_data.get("product_model_id"))
            if product_model is None:
                raise RoutingValidationError("Product model is required", "productModelId")
            bom.product_model = product_model
        if "part_number_id" in input_data:
            bom.part_number = _resolve_part_number(input_data.get("part_number_id"))
            if bom.part_number_id:
                bom.product_model = bom.part_number.model
        if "version" in input_data:
            bom.version = input_data["version"]
        if "status" in input_data:
            bom.status = input_data["status"]
        if "notes" in input_data:
            bom.notes = input_data["notes"]
        RoutingService._enforce_single_active_bom(bom)
        bom.save()
        return bom

    @staticmethod
    @transaction.atomic
    def activate_bom(bom_id: str) -> BOM:
        try:
            bom = BOM.objects.select_for_update().get(id=bom_id)
        except BOM.DoesNotExist:
            raise RoutingValidationError("BOM not found", "id")
        bom.status = RoutingStatus.ACTIVE
        RoutingService._enforce_single_active_bom(bom)
        bom.save(update_fields=["status", "updated_at"])
        return bom

    # ── Routing CRUD ──

    @staticmethod
    @transaction.atomic
    def create_routing(input_data: dict) -> Routing:
        pl_id = input_data.get("production_line_id")
        if not pl_id:
            raise RoutingValidationError("Production line is required", "productionLineId")
        try:
            ProductionLine.objects.select_for_update().get(id=pl_id)
        except ProductionLine.DoesNotExist:
            raise RoutingValidationError("Production line not found", "productionLineId")

        pf_id = input_data.get("product_family_id")
        pf = _resolve_ref(ReferenceValue, pf_id) if pf_id else None
        part_number = _resolve_part_number(input_data.get("part_number_id"))
        pm_id = input_data.get("product_model_id")
        pm = part_number.model if part_number else _resolve_product_model(pm_id)
        RoutingService._lock_routing_siblings(pl_id, pm.id if pm else None, part_number.id if part_number else None)

        routing = Routing(
            production_line_id=pl_id,
            product_family=pf,
            product_model=pm,
            part_number=part_number,
            version=input_data.get("version", "1.0"),
            status=input_data.get("status", RoutingStatus.DRAFT),
            effective_from=_parse_date(input_data.get("effective_from")),
            effective_to=_parse_date(input_data.get("effective_to")),
            notes=input_data.get("notes", ""),
        )
        RoutingService._enforce_single_active_routing(routing)
        routing.save()
        return routing

    @staticmethod
    @transaction.atomic
    def update_routing(routing_id: str, input_data: dict) -> Routing:
        try:
            routing = Routing.objects.select_for_update().get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "id")

        if "production_line_id" in input_data and input_data["production_line_id"]:
            try:
                ProductionLine.objects.get(id=input_data["production_line_id"])
            except ProductionLine.DoesNotExist:
                raise RoutingValidationError("Production line not found", "productionLineId")
            routing.production_line_id = input_data["production_line_id"]

        if "product_family_id" in input_data:
            pf_id = input_data["product_family_id"]
            routing.product_family = _resolve_ref(ReferenceValue, pf_id) if pf_id else None
        if "product_model_id" in input_data:
            pm_id = input_data["product_model_id"]
            routing.product_model = _resolve_product_model(pm_id)
        if "part_number_id" in input_data:
            routing.part_number = _resolve_part_number(input_data.get("part_number_id"))
            if routing.part_number_id:
                routing.product_model = routing.part_number.model
        if "version" in input_data:
            routing.version = input_data["version"]
        if "effective_from" in input_data:
            routing.effective_from = _parse_date(input_data["effective_from"])
        if "effective_to" in input_data:
            routing.effective_to = _parse_date(input_data["effective_to"])
        if "notes" in input_data:
            routing.notes = input_data["notes"]
        if "status" in input_data:
            routing.status = input_data["status"]

        RoutingService._enforce_single_active_routing(routing)
        routing.save()
        return routing

    @staticmethod
    @transaction.atomic
    def activate_routing(routing_id: str) -> Routing:
        try:
            routing = Routing.objects.select_for_update().get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "id")

        errors = RoutingService.validate_routing(routing_id)
        if errors:
            msg = "; ".join(e["message"] for e in errors)
            raise RoutingValidationError(f"Cannot activate: {msg}", "_form")

        routing.status = RoutingStatus.ACTIVE
        RoutingService._enforce_single_active_routing(routing)
        routing.save()
        return routing

    @staticmethod
    @transaction.atomic
    def archive_routing(routing_id: str) -> Routing:
        try:
            routing = Routing.objects.get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "id")
        routing.status = RoutingStatus.ARCHIVED
        routing.save()
        return routing

    # ── Step CRUD ──

    @staticmethod
    @transaction.atomic
    def add_step(routing_id: str, input_data: dict) -> RoutingStep:
        try:
            routing = Routing.objects.get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "routingId")

        if routing.status == RoutingStatus.ARCHIVED:
            raise RoutingValidationError("Cannot modify archived routing", "_form")

        sequence = input_data.get("sequence", 1)
        if RoutingStep.objects.filter(routing=routing, sequence=sequence).exists():
            # Shift existing steps up
            RoutingStep.objects.filter(routing=routing, sequence__gte=sequence).update(
                sequence=F("sequence") + 1
            )

        dept_id = input_data.get("department_id")
        rg_id = input_data.get("resource_group_id")
        res_id = input_data.get("resource_id")
        sw_id = input_data.get("standard_work_id")

        dept = _resolve_ref(Department, dept_id) if dept_id else None
        rg = None
        if rg_id:
            rg = _resolve_ref(ResourceGroup, rg_id)
            if dept and rg.department_id != dept.id:
                raise RoutingValidationError(
                    "Resource group does not belong to selected department", "resourceGroupId"
                )
        res = None
        if res_id:
            res = _resolve_ref(Resource, res_id)
            if rg and res.resource_group_id != rg.id:
                raise RoutingValidationError(
                    "Resource does not belong to selected resource group", "resourceId"
                )
        sw = _resolve_optional_process_flow(sw_id)

        step = RoutingStep.objects.create(
            routing=routing,
            sequence=sequence,
            department=dept,
            resource_group=rg,
            resource=res,
            standard_work=sw,
            cycle_time_sec=input_data.get("cycle_time_sec", 0),
            setup_time_sec=input_data.get("setup_time_sec", 0),
            changeover_time_sec=input_data.get("changeover_time_sec", 0),
            required_operators=input_data.get("required_operators", 1),
            schedule_source=input_data.get("schedule_source", "LINE"),
            buffer_type=input_data.get("buffer_type"),
            wip_min=input_data.get("wip_min"),
            wip_max=input_data.get("wip_max"),
            quality_checkpoint=input_data.get("quality_checkpoint", False),
            rework_allowed=input_data.get("rework_allowed", False),
            notes=input_data.get("notes", ""),
        )
        return step

    @staticmethod
    @transaction.atomic
    def update_step(step_id: str, input_data: dict) -> RoutingStep:
        try:
            step = RoutingStep.objects.select_related("routing").get(id=step_id)
        except RoutingStep.DoesNotExist:
            raise RoutingValidationError("Step not found", "id")

        if step.routing.status == RoutingStatus.ARCHIVED:
            raise RoutingValidationError("Cannot modify archived routing", "_form")

        if "sequence" in input_data:
            step.sequence = input_data["sequence"]
        if "department_id" in input_data:
            dept_id = input_data["department_id"]
            step.department = _resolve_ref(Department, dept_id) if dept_id else None
        if "resource_group_id" in input_data:
            rg_id = input_data["resource_group_id"]
            step.resource_group = _resolve_ref(ResourceGroup, rg_id) if rg_id else None
            if step.department and step.resource_group and step.resource_group.department_id != step.department.id:
                raise RoutingValidationError(
                    "Resource group does not belong to selected department", "resourceGroupId"
                )
        if "resource_id" in input_data:
            res_id = input_data["resource_id"]
            step.resource = _resolve_ref(Resource, res_id) if res_id else None
            if step.resource_group and step.resource and step.resource.resource_group_id != step.resource_group.id:
                raise RoutingValidationError(
                    "Resource does not belong to selected resource group", "resourceId"
                )
        if "standard_work_id" in input_data:
            sw_id = input_data["standard_work_id"]
            step.standard_work = _resolve_optional_process_flow(sw_id)
        if "cycle_time_sec" in input_data:
            step.cycle_time_sec = input_data["cycle_time_sec"]
        if "setup_time_sec" in input_data:
            step.setup_time_sec = input_data["setup_time_sec"]
        if "changeover_time_sec" in input_data:
            step.changeover_time_sec = input_data["changeover_time_sec"]
        if "required_operators" in input_data:
            step.required_operators = input_data["required_operators"]
        if "schedule_source" in input_data:
            step.schedule_source = input_data["schedule_source"]
        if "buffer_type" in input_data:
            step.buffer_type = input_data["buffer_type"]
        if "wip_min" in input_data:
            step.wip_min = input_data["wip_min"]
        if "wip_max" in input_data:
            step.wip_max = input_data["wip_max"]
        if "quality_checkpoint" in input_data:
            step.quality_checkpoint = input_data["quality_checkpoint"]
        if "rework_allowed" in input_data:
            step.rework_allowed = input_data["rework_allowed"]
        if "notes" in input_data:
            step.notes = input_data["notes"]

        step.save()
        return step

    @staticmethod
    @transaction.atomic
    def save_routing(input_data: dict) -> Routing:
        routing_id = input_data.get("routing_id")
        if routing_id:
            routing = RoutingService.update_routing(routing_id, input_data)
        else:
            routing = RoutingService.create_routing(input_data)

        if routing.status == RoutingStatus.ARCHIVED:
            raise RoutingValidationError("Cannot modify archived routing", "_form")

        submitted_steps = input_data.get("steps") or []
        existing_steps = {
            str(step.id): step
            for step in RoutingStep.objects.filter(routing=routing).select_related("routing")
        }
        kept_step_ids: set[str] = set()

        for index, step_data in enumerate(submitted_steps, start=1):
            normalized = dict(step_data)
            normalized["sequence"] = index
            step_id = str(normalized.get("id") or "")
            if step_id and not step_id.startswith("new-"):
                step = existing_steps.get(step_id)
                if not step:
                    raise RoutingValidationError(f"Step {index} no longer exists", "steps")
                RoutingService.update_step(step_id, normalized)
                kept_step_ids.add(step_id)
            else:
                step = RoutingService.add_step(str(routing.id), normalized)
                kept_step_ids.add(str(step.id))
            RoutingService._save_step_material_flow(step, normalized)

        for step_id, step in existing_steps.items():
            if step_id not in kept_step_ids:
                step.delete()

        remaining = RoutingStep.objects.filter(routing=routing).order_by("sequence", "id")
        for index, step in enumerate(remaining, start=1):
            if step.sequence != index:
                step.sequence = index
                step.save()

        return Routing.objects.select_related(
            "production_line", "product_model", "product_family"
        ).prefetch_related(
            "steps__department", "steps__resource_group", "steps__resource", "steps__standard_work",
            "steps__material_inputs__material", "steps__material_inputs__source_location", "steps__material_inputs__source_bin",
            "steps__material_outputs__material", "steps__material_outputs__target_location", "steps__material_outputs__destination_bin",
            "steps__material_movement_rule__source_location", "steps__material_movement_rule__destination_location",
            "steps__material_movement_rule__source_bin", "steps__material_movement_rule__destination_bin",
        ).get(id=routing.id)

    @staticmethod
    def _save_step_material_flow(step: RoutingStep, step_data: dict) -> None:
        def resolve_material(material_id: Optional[str]) -> Material:
            material = _resolve_ref(Material, material_id)
            if material.status != "ACTIVE":
                raise RoutingValidationError("Material is inactive", "materialId")
            return material

        def resolve_location(location_id: Optional[str], field: str) -> InventoryLocation:
            location = _resolve_ref(InventoryLocation, location_id)
            if location.status != "ACTIVE":
                raise RoutingValidationError("Inventory location is inactive", field)
            if location.plant_id != step.routing.production_line.plant_id:
                raise RoutingValidationError("Inventory location must belong to the routing plant", field)
            return location

        def resolve_bin(bin_id: Optional[str], field: str, allowed_types: set[str]) -> MaterialBin:
            bin_obj = _resolve_ref(MaterialBin, bin_id)
            if not bin_obj.is_active:
                raise RoutingValidationError("Material bin is inactive", field)
            if bin_obj.plant_id != step.routing.production_line.plant_id:
                raise RoutingValidationError("Material bin must belong to the routing plant", field)
            if step.resource_group_id and bin_obj.resource_group_id and bin_obj.resource_group_id != step.resource_group_id:
                raise RoutingValidationError("Material bin must belong to the step resource group", field)
            if bin_obj.bin_type not in allowed_types:
                raise RoutingValidationError("Material bin type is not valid for this movement", field)
            return bin_obj

        OperationInput.objects.filter(routing_step=step).delete()
        for item in step_data.get("material_inputs") or []:
            material = resolve_material(item.get("material_id"))
            location = resolve_location(item.get("location_id"), "sourceLocationId") if item.get("location_id") else None
            source_bin = resolve_bin(item.get("bin_id"), "sourceBinId", {"RM", "INPUT", "WIP", "SUPERMARKET", "FIFO"})
            OperationInput.objects.create(
                routing_step=step,
                material=material,
                quantity=item.get("quantity") or 1,
                material_state=item.get("material_state") or MaterialState.RAW_MATERIAL,
                source_location=location,
                source_bin=source_bin,
            )

        OperationOutput.objects.filter(routing_step=step).delete()
        for item in step_data.get("material_outputs") or []:
            material = resolve_material(item.get("material_id"))
            location = resolve_location(item.get("location_id"), "destinationLocationId") if item.get("location_id") else None
            destination_bin = resolve_bin(item.get("bin_id"), "destinationBinId", {"OUTPUT", "WIP", "SUPERMARKET", "FIFO", "FG", "SCRAP", "QUARANTINE"})
            OperationOutput.objects.create(
                routing_step=step,
                material=material,
                quantity=item.get("quantity") or 1,
                material_state=item.get("material_state") or MaterialState.WIP,
                target_location=location,
                destination_bin=destination_bin,
            )

        rule_data = step_data.get("movement_rule") or {}
        if rule_data:
            source_location = resolve_location(rule_data.get("source_location_id"), "sourceLocationId") if rule_data.get("source_location_id") else None
            destination_location = resolve_location(rule_data.get("destination_location_id"), "destinationLocationId") if rule_data.get("destination_location_id") else None
            source_bin = resolve_bin(rule_data.get("source_bin_id"), "sourceBinId", {"RM", "INPUT", "WIP", "SUPERMARKET", "FIFO"})
            destination_bin = resolve_bin(rule_data.get("destination_bin_id"), "destinationBinId", {"OUTPUT", "WIP", "SUPERMARKET", "FIFO", "FG", "SCRAP", "QUARANTINE"})
            if source_bin.plant_id != destination_bin.plant_id:
                raise RoutingValidationError("Cross-plant material movement is not allowed", "destinationBinId")
            MaterialMovementRule.objects.update_or_create(
                routing_step=step,
                defaults={
                    "rule_type": rule_data.get("rule_type") or MaterialMovementRuleType.NEXT_OPERATION,
                    "source_location": source_location,
                    "destination_location": destination_location,
                    "source_bin": source_bin,
                    "destination_bin": destination_bin,
                    "notes": rule_data.get("notes") or "",
                },
            )
        else:
            MaterialMovementRule.objects.filter(routing_step=step).delete()

    @staticmethod
    @transaction.atomic
    def delete_step(step_id: str) -> None:
        try:
            step = RoutingStep.objects.select_related("routing").get(id=step_id)
        except RoutingStep.DoesNotExist:
            raise RoutingValidationError("Step not found", "id")

        if step.routing.status == RoutingStatus.ARCHIVED:
            raise RoutingValidationError("Cannot modify archived routing", "_form")

        routing_id = step.routing_id
        deleted_seq = step.sequence
        step.delete()

        # Re-sequence remaining steps
        remaining = RoutingStep.objects.filter(routing_id=routing_id).order_by("sequence")
        for idx, s in enumerate(remaining, start=1):
            if s.sequence != idx:
                s.sequence = idx
                s.save()

    @staticmethod
    @transaction.atomic
    def reorder_steps(routing_id: str, ordered_step_ids: list[str]) -> list[RoutingStep]:
        try:
            Routing.objects.get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "routingId")

        steps = list(RoutingStep.objects.filter(routing_id=routing_id, id__in=ordered_step_ids))
        if len(steps) != len(ordered_step_ids):
            raise RoutingValidationError("Some step IDs are invalid", "orderedStepIds")

        step_map = {str(s.id): s for s in steps}
        for idx, step_id in enumerate(ordered_step_ids, start=1):
            step = step_map.get(step_id)
            if step:
                step.sequence = idx
                step.save()

        return list(RoutingStep.objects.filter(routing_id=routing_id).order_by("sequence"))

    # ── Validation ──

    @staticmethod
    def validate_routing(routing_id: str) -> list[dict]:
        errors = []
        try:
            routing = Routing.objects.prefetch_related("steps").get(id=routing_id)
        except Routing.DoesNotExist:
            return [_error("id", "NOT_FOUND", "Routing not found")]

        steps = list(routing.steps.all().order_by("sequence"))

        if not steps:
            errors.append(_error("steps", "NO_STEPS", "Routing has no steps"))
            return errors

        if len(steps) < 2:
            errors.append(_error("steps", "MIN_STEPS", "Routing must have at least 2 steps"))

        # Check sequence gaps/duplicates
        seqs = [s.sequence for s in steps]
        if sorted(seqs) != list(range(1, len(steps) + 1)):
            errors.append(_error("steps", "INVALID_SEQUENCE", "Step sequences must start at 1 and be continuous"))

        # Check missing department
        for s in steps:
            if not s.department:
                errors.append(_error(f"step_{s.sequence}", "MISSING_DEPT", f"Step {s.sequence} has no department"))
            if not s.resource_group:
                errors.append(_error(f"step_{s.sequence}", "MISSING_RESOURCE_GROUP", f"Step {s.sequence} has no resource group"))
            if s.cycle_time_sec <= 0:
                errors.append(_error(f"step_{s.sequence}", "INVALID_CT", f"Step {s.sequence} cycle time must be > 0"))
            if s.resource_group and s.resource_group.status != "ACTIVE":
                errors.append(_error(f"step_{s.sequence}", "INACTIVE_RESOURCE_GROUP", f"Step {s.sequence} uses inactive resource group"))
            if s.resource and s.resource.status != "ACTIVE":
                errors.append(_error(f"step_{s.sequence}", "INACTIVE_RESOURCE", f"Step {s.sequence} uses inactive resource"))
            inputs = list(s.material_inputs.select_related("material", "source_location", "source_bin"))
            outputs = list(s.material_outputs.select_related("material", "target_location", "destination_bin"))
            if not inputs:
                errors.append(_error(f"step_{s.sequence}", "MISSING_INPUT_MATERIAL", f"Step {s.sequence} has no input material"))
            if not outputs:
                errors.append(_error(f"step_{s.sequence}", "MISSING_OUTPUT_MATERIAL", f"Step {s.sequence} has no output material/state"))
            for item in inputs:
                if item.material.status != "ACTIVE":
                    errors.append(_error(f"step_{s.sequence}", "INACTIVE_MATERIAL", f"Step {s.sequence} input material is inactive"))
                if not item.source_bin or not item.source_bin.is_active:
                    errors.append(_error(f"step_{s.sequence}", "MISSING_SOURCE_BIN", f"Step {s.sequence} has missing/inactive source bin"))
                elif item.source_bin.plant_id != routing.production_line.plant_id:
                    errors.append(_error(f"step_{s.sequence}", "CROSS_PLANT_SOURCE_BIN", f"Step {s.sequence} source bin belongs to another plant"))
                elif s.resource_group_id and item.source_bin.resource_group_id and item.source_bin.resource_group_id != s.resource_group_id:
                    errors.append(_error(f"step_{s.sequence}", "INVALID_SOURCE_BIN", f"Step {s.sequence} source bin belongs to another resource group"))
            for item in outputs:
                if item.material.status != "ACTIVE":
                    errors.append(_error(f"step_{s.sequence}", "INACTIVE_MATERIAL", f"Step {s.sequence} output material is inactive"))
                if not item.material_state:
                    errors.append(_error(f"step_{s.sequence}", "MISSING_OUTPUT_STATE", f"Step {s.sequence} has missing output material state"))
                if not item.destination_bin or not item.destination_bin.is_active:
                    errors.append(_error(f"step_{s.sequence}", "MISSING_DESTINATION_BIN", f"Step {s.sequence} has missing/inactive destination bin"))
                elif item.destination_bin.plant_id != routing.production_line.plant_id:
                    errors.append(_error(f"step_{s.sequence}", "CROSS_PLANT_DESTINATION_BIN", f"Step {s.sequence} destination bin belongs to another plant"))
                elif s.resource_group_id and item.destination_bin.resource_group_id and item.destination_bin.resource_group_id != s.resource_group_id:
                    errors.append(_error(f"step_{s.sequence}", "INVALID_DESTINATION_BIN", f"Step {s.sequence} destination bin belongs to another resource group"))
            try:
                rule = s.material_movement_rule
            except MaterialMovementRule.DoesNotExist:
                rule = None
            if not rule or not rule.source_bin_id or not rule.destination_bin_id:
                errors.append(_error(f"step_{s.sequence}", "MISSING_MOVEMENT_BINS", f"Step {s.sequence} movement requires source and destination bins"))
            elif rule.source_bin.plant_id != rule.destination_bin.plant_id:
                errors.append(_error(f"step_{s.sequence}", "CROSS_PLANT_MOVEMENT", f"Step {s.sequence} moves material across plants"))

        # Check resource group belongs to department
        for s in steps:
            if s.department and s.resource_group and s.resource_group.department_id != s.department.id:
                errors.append(_error(
                    f"step_{s.sequence}", "INVALID_RG",
                    f"Step {s.sequence}: resource group does not belong to department"
                ))
            if s.resource_group and s.resource and s.resource.resource_group_id != s.resource_group.id:
                errors.append(_error(
                    f"step_{s.sequence}", "INVALID_RES",
                    f"Step {s.sequence}: resource does not belong to resource group"
                ))

        # Check active routing conflict (one active route per line)
        if routing.status == RoutingStatus.ACTIVE:
            if Routing.objects.filter(
                production_line=routing.production_line,
                status=RoutingStatus.ACTIVE,
            ).exclude(id=routing.id).exists():
                errors.append(_error("status", "CONFLICT", "An active routing already exists for this line"))

        return errors

    @staticmethod
    def validate_line_flow_context(production_line_id: str, product_model_id: Optional[str] = None) -> list[dict]:
        try:
            production_line = ProductionLine.objects.get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            return [_error("productionLineId", "NOT_FOUND", "Production line not found")]

        errors = []
        model = _resolve_product_model(product_model_id) if product_model_id else None
        routing_qs = Routing.objects.filter(production_line=production_line)
        if model:
            routing_qs = routing_qs.filter(product_model=model)
        routing = routing_qs.prefetch_related(
            "steps__resource_group", "steps__material_inputs", "steps__material_outputs"
        ).order_by("-status", "-updated_at").first()

        if model and not BOM.objects.filter(product_model=model, status=RoutingStatus.ACTIVE).exists():
            errors.append(_error("bom", "MISSING_BOM", "Selected product model has no active BOM"))
        if not routing:
            errors.append(_error("routing", "MISSING_ROUTING", "Selected line/model has no routing"))
        else:
            errors.extend(RoutingService.validate_routing(str(routing.id)))
            steps = list(routing.steps.all().order_by("sequence"))
            for step in steps:
                if step.resource_group and step.resource_group.status != "ACTIVE":
                    errors.append(_error(f"step_{step.sequence}", "INACTIVE_RESOURCE_GROUP", f"Step {step.sequence} uses inactive resource group"))
                for op_input in step.material_inputs.all():
                    if not op_input.source_location:
                        errors.append(_error(f"step_{step.sequence}", "MISSING_INVENTORY_LOCATION", f"Step {step.sequence} input has no source inventory location"))
                for op_output in step.material_outputs.all():
                    if not op_output.target_location:
                        errors.append(_error(f"step_{step.sequence}", "MISSING_INVENTORY_LOCATION", f"Step {step.sequence} output has no target inventory location"))
                if step.material_inputs.exists() and not step.material_outputs.exists():
                    errors.append(_error(f"step_{step.sequence}", "BROKEN_MATERIAL_TRANSFORMATION", f"Step {step.sequence} consumes material but has no output"))

        if not InventoryLocation.objects.filter(plant=production_line.plant, status="ACTIVE").exists():
            errors.append(_error("inventoryLocation", "MISSING_INVENTORY_LOCATION", "Plant has no active inventory locations"))
        return errors

    @staticmethod
    def get_line_flow_context(production_line_id: str, product_model_id: Optional[str] = None) -> dict:
        try:
            production_line = ProductionLine.objects.get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            return {"ok": False, "message": "Production line not found"}

        model = _resolve_product_model(product_model_id) if product_model_id else None
        routing_qs = Routing.objects.filter(production_line=production_line)
        if model:
            routing_qs = routing_qs.filter(product_model=model)
        routing = routing_qs.select_related("product_model").prefetch_related(
            "steps__department",
            "steps__resource_group",
            "steps__material_inputs__material",
            "steps__material_inputs__source_location",
            "steps__material_outputs__material",
            "steps__material_outputs__target_location",
        ).order_by("-status", "-updated_at").first()

        bom = None
        if model:
            bom = BOM.objects.filter(product_model=model).prefetch_related("items__material").order_by("-status", "-updated_at").first()

        locations = InventoryLocation.objects.filter(plant=production_line.plant).order_by("location_type", "name")
        validations = RoutingService.validate_line_flow_context(production_line_id, product_model_id)
        blocking_codes = {"MISSING_BOM", "MISSING_ROUTING", "INVALID_SEQUENCE", "INACTIVE_RESOURCE_GROUP", "MISSING_INVENTORY_LOCATION", "BROKEN_MATERIAL_TRANSFORMATION"}
        return {
            "ok": True,
            "production_line": production_line,
            "product_model": model,
            "routing": routing,
            "bom": bom,
            "inventory_locations": list(locations),
            "validations": validations,
            "is_blocked": any(error["code"] in blocking_codes for error in validations),
        }

    # ── Summary ──

    @staticmethod
    def get_routing_summary(production_line_id: str) -> dict:
        try:
            pl = ProductionLine.objects.get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            return {
                "routing_id": None,
                "status": "MISSING",
                "version": None,
                "routing_scope": None,
                "message": "No routing steps configured.",
                "sequence_count": 0,
                "first_department_name": None,
                "last_department_name": None,
                "bottleneck_step_name": None,
                "bottleneck_resource_group_name": None,
                "constraint_status": None,
                "updated_at": None,
            }

        active = Routing.objects.filter(
            production_line=pl, status=RoutingStatus.ACTIVE
        ).prefetch_related("steps__department", "steps__resource_group").first()

        if not active:
            # Check if any routing exists
            latest = Routing.objects.filter(production_line=pl).prefetch_related(
                "steps__department", "steps__resource_group"
            ).order_by("-created_at").first()
            if not latest:
                return {
                    "routing_id": None,
                    "status": "MISSING",
                    "version": None,
                    "routing_scope": None,
                    "message": "No routing steps configured.",
                    "sequence_count": 0,
                    "first_department_name": None,
                    "last_department_name": None,
                    "bottleneck_step_name": None,
                    "bottleneck_resource_group_name": None,
                    "constraint_status": None,
                    "updated_at": None,
                }

            routing = latest
        else:
            routing = active

        steps = list(routing.steps.all().order_by("sequence"))
        seq_count = len(steps)

        if seq_count == 0:
            return {
                "routing_id": str(routing.id) if routing else None,
                "status": "MISSING",
                "version": routing.version if routing else None,
                "routing_scope": routing.product_model.name if routing and routing.product_model else "All Models",
                "message": "No routing steps configured.",
                "sequence_count": 0,
                "first_department_name": None,
                "last_department_name": None,
                "bottleneck_step_name": None,
                "bottleneck_resource_group_name": None,
                "constraint_status": None,
                "updated_at": routing.updated_at.isoformat() if routing and routing.updated_at else None,
            }
        elif seq_count < 2:
            status = "INVALID"
        elif RoutingService.validate_routing(str(routing.id)):
            status = "INVALID"
        else:
            status = "CONFIGURED" if active else "DRAFT"
        message = "Routing configured." if status in ("CONFIGURED", "DRAFT") else "Routing has validation errors."

        first_dept = steps[0].department.name if steps and steps[0].department else None
        last_dept = steps[-1].department.name if steps and steps[-1].department else None

        # Bottleneck calculation
        bottleneck = RoutingService.calculate_bottleneck(steps)
        bottleneck_step_name = bottleneck.get("step_name") if bottleneck else None
        bottleneck_rg_name = bottleneck.get("resource_group_name") if bottleneck else None

        # Constraint classification
        constraint = RoutingService.classify_constraint(steps, bottleneck)
        constraint_status = constraint.get("status") if constraint else None

        return {
            "routing_id": str(routing.id) if routing else None,
            "status": status,
            "version": routing.version if routing else None,
            "routing_scope": routing.product_model.name if routing and routing.product_model else "All Models",
            "message": message,
            "sequence_count": seq_count,
            "first_department_name": first_dept,
            "last_department_name": last_dept,
            "bottleneck_step_name": bottleneck_step_name,
            "bottleneck_resource_group_name": bottleneck_rg_name,
            "constraint_status": constraint_status,
            "updated_at": routing.updated_at.isoformat() if routing and routing.updated_at else None,
        }

    # ── Capacity / Bottleneck ──

    @staticmethod
    def calculate_step_capacity(step: RoutingStep, demand: int = 1000, available_hours: float = 8.0) -> dict:
        available_sec = available_hours * 3600
        ct_sec = step.cycle_time_sec or 1
        takt = available_sec / max(demand, 1)
        capacity = available_sec / ct_sec
        load_pct = (demand / max(capacity, 0.01)) * 100
        gap = demand - capacity

        return {
            "sequence": step.sequence,
            "department_name": step.department.name if step.department else None,
            "cycle_time_sec": ct_sec,
            "available_time_sec": available_sec,
            "demand_units": demand,
            "takt_time_sec": round(takt, 2),
            "capacity_units": round(capacity, 1),
            "load_percent": round(load_pct, 1),
            "capacity_gap_units": round(gap, 1),
            "is_bottleneck": False,
        }

    @staticmethod
    def calculate_bottleneck(steps: list, demand: int = 1000, available_hours: float = 8.0) -> Optional[dict]:
        if not steps:
            return None

        capacities = [
            RoutingService.calculate_step_capacity(s, demand, available_hours) for s in steps
        ]
        worst = max(capacities, key=lambda c: c["load_percent"])
        worst["is_bottleneck"] = True

        step = steps[capacities.index(worst)]
        return {
            "step_name": step.department.name if step.department else f"Step {step.sequence}",
            "resource_group_name": step.resource_group.name if step.resource_group else None,
            "load_percent": worst["load_percent"],
            "capacity_gap": worst["capacity_gap_units"],
        }

    @staticmethod
    def classify_constraint(steps: list, bottleneck: Optional[dict] = None) -> dict:
        if not steps or len(steps) < 2:
            return {"status": "NOT_APPLICABLE", "reason": "Insufficient steps"}

        if bottleneck and bottleneck.get("load_percent", 0) > 100:
            return {"status": "CONSTRAINT", "reason": f"Load {bottleneck['load_percent']}% exceeds capacity"}

        for s in steps:
            if s.cycle_time_sec <= 0:
                continue
        return {"status": "NONE", "reason": "Within capacity"}



