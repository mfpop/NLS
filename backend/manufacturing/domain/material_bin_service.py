import json

from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError

from manufacturing.models import (
    Material,
    MaterialBin,
    MaterialBinType,
    MaterialMovementRule,
    OperationInput,
    OperationOutput,
    ProductionLine,
    ResourceGroup,
    ReplenishmentMode,
    RoutingStatus,
    Warehouse,
)


class MaterialBinServiceError(Exception):
    def __init__(self, field: str, code: str, message: str, details: dict | None = None):
        self.field = field
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class MaterialBinService:
    @staticmethod
    def _resolve_plant(plant_id):
        if not plant_id:
            return None
        from manufacturing.models import Plant
        try:
            return Plant.objects.get(id=plant_id)
        except Plant.DoesNotExist:
            raise MaterialBinServiceError("plantId", "NOT_FOUND", "Plant not found")

    @staticmethod
    def _resolve_resource_group(resource_group_id):
        if not resource_group_id:
            return None
        try:
            return ResourceGroup.objects.select_related("department", "department__plant").get(id=resource_group_id)
        except ResourceGroup.DoesNotExist:
            raise MaterialBinServiceError("resourceGroupId", "NOT_FOUND", "Resource group not found")

    @staticmethod
    def _resolve_production_line(production_line_id):
        if not production_line_id:
            return None
        try:
            return ProductionLine.objects.select_related("plant").get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            raise MaterialBinServiceError("productionLineId", "NOT_FOUND", "Production line not found")

    @staticmethod
    def _resolve_material(material_id):
        if not material_id:
            return None
        try:
            return Material.objects.get(id=material_id)
        except Material.DoesNotExist:
            raise MaterialBinServiceError("materialId", "NOT_FOUND", "Material not found")

    @staticmethod
    def _resolve_warehouse(warehouse_code: str, plant) -> Warehouse | None:
        """Resolve a warehouse by code within the given plant. Returns None if code is empty."""
        code = (warehouse_code or "").strip()
        if not code or not plant:
            return None
        try:
            return Warehouse.objects.get(plant=plant, code__iexact=code)
        except Warehouse.DoesNotExist:
            raise MaterialBinServiceError(
                "warehouseCode",
                "WAREHOUSE_NOT_FOUND",
                f"Warehouse with code '{code}' not found in plant '{plant.code or plant.id}'.",
            )

    @classmethod
    def validate_same_plant(cls, plant_id, resource_group=None, production_line=None, warehouse=None):
        if resource_group and str(resource_group.department.plant_id) != str(plant_id):
            raise MaterialBinServiceError(
                "resourceGroupId",
                "CROSS_PLANT_BIN",
                "Material bin and resource group must belong to the same plant.",
            )
        if production_line and str(production_line.plant_id) != str(plant_id):
            raise MaterialBinServiceError(
                "productionLineId",
                "CROSS_PLANT_BIN",
                "Material bin and production line must belong to the same plant.",
            )
        if warehouse and str(warehouse.plant_id) != str(plant_id):
            raise MaterialBinServiceError(
                "warehouseCode",
                "CROSS_PLANT_WAREHOUSE",
                "Material bin and warehouse must belong to the same plant.",
            )

    @classmethod
    def validate_bin(cls, input_data):
        bin_type = input_data.get("bin_type", "")
        resource_group_id = input_data.get("resource_group_id")
        production_line_id = input_data.get("production_line_id")
        warehouse_id = input_data.get("warehouse_id")

        if bin_type in (MaterialBinType.RM, MaterialBinType.FG, MaterialBinType.SCRAP, MaterialBinType.QUARANTINE) and not warehouse_id:
            raise MaterialBinServiceError(
                "warehouseCode",
                "WAREHOUSE_REQUIRED",
                f"{MaterialBinType(bin_type).label} bins should reference a warehouse.",
            )
        if bin_type in (MaterialBinType.INPUT, MaterialBinType.OUTPUT, MaterialBinType.WIP, MaterialBinType.LINE_SIDE) and not resource_group_id and not production_line_id:
            raise MaterialBinServiceError(
                "resourceGroupId",
                "PROCESS_OWNER_REQUIRED",
                f"{MaterialBinType(bin_type).label} bins should belong to a resource group or production flow.",
            )

    @classmethod
    def validate_material_flow(cls, source_bin_id, destination_bin_id):
        if not source_bin_id or not destination_bin_id:
            return
        try:
            source = MaterialBin.objects.get(id=source_bin_id)
            dest = MaterialBin.objects.get(id=destination_bin_id)
        except MaterialBin.DoesNotExist:
            raise MaterialBinServiceError("binId", "NOT_FOUND", "Material bin not found")
        if str(source.plant_id) != str(dest.plant_id):
            raise MaterialBinServiceError(
                "destinationBinId",
                "CROSS_PLANT_FLOW",
                "Material flow across different plants is forbidden. Model the transfer explicitly.",
            )

    @classmethod
    @transaction.atomic
    def create_bin(cls, input_data) -> MaterialBin:
        try:
            plant = cls._resolve_plant(input_data.get("plant_id"))
            if not plant:
                raise MaterialBinServiceError("plantId", "REQUIRED", "Plant is required")

            resource_group = cls._resolve_resource_group(input_data.get("resource_group_id"))
            production_line = cls._resolve_production_line(input_data.get("production_line_id"))
            warehouse = cls._resolve_warehouse(input_data.get("warehouse_code", ""), plant)

            cls.validate_same_plant(
                str(plant.id),
                resource_group=resource_group,
                production_line=production_line,
                warehouse=warehouse,
            )
            cls.validate_bin({
                **input_data,
                "warehouse_id": warehouse.id if warehouse else None,
            })

            material = cls._resolve_material(input_data.get("material_id"))

            bin_obj = MaterialBin(
                plant=plant,
                resource_group=resource_group,
                production_line=production_line,
                warehouse=warehouse,
                code=(input_data.get("code") or "").strip(),
                name=(input_data.get("name") or "").strip(),
                description=(input_data.get("description") or "").strip(),
                bin_type=input_data.get("bin_type") or MaterialBinType.INPUT,
                material=material,
                material_group=(input_data.get("material_group") or "").strip(),
                capacity=input_data.get("capacity") or 0,
                uom_id=input_data.get("uom_id") or None,
                replenishment_mode=input_data.get("replenishment_mode") or None,
                fifo_enabled=bool(input_data.get("fifo_enabled", False)),
                supermarket_enabled=bool(input_data.get("supermarket_enabled", False)),
                location_code=(input_data.get("location_code") or "").strip(),
                location_reference=(input_data.get("location_reference") or "").strip(),
                is_active=input_data.get("is_active", True),
            )
            bin_obj.save()
            return bin_obj
        except (IntegrityError, ValidationError) as exc:
            raise _wrap_db_error(exc)

    @classmethod
    @transaction.atomic
    def update_bin(cls, bin_id: str, input_data) -> MaterialBin:
        try:
            bin_obj = MaterialBin.objects.select_for_update().get(id=bin_id)
        except MaterialBin.DoesNotExist:
            raise MaterialBinServiceError("id", "NOT_FOUND", "Material bin not found")

        try:
            if "plant_id" in input_data and input_data.get("plant_id"):
                plant = cls._resolve_plant(input_data["plant_id"])
                if plant:
                    bin_obj.plant = plant

            if "resource_group_id" in input_data:
                bin_obj.resource_group = cls._resolve_resource_group(input_data.get("resource_group_id"))
            if "production_line_id" in input_data:
                bin_obj.production_line = cls._resolve_production_line(input_data.get("production_line_id"))
            if "warehouse_code" in input_data:
                plant = bin_obj.plant
                bin_obj.warehouse = cls._resolve_warehouse(input_data["warehouse_code"], plant)

            cls.validate_same_plant(
                str(bin_obj.plant_id),
                resource_group=bin_obj.resource_group,
                production_line=bin_obj.production_line,
                warehouse=bin_obj.warehouse,
            )

            # Build merged input for validate_bin
            merged = {
                "bin_type": input_data.get("bin_type", bin_obj.bin_type),
                "resource_group_id": str(bin_obj.resource_group_id) if bin_obj.resource_group_id else None,
                "production_line_id": str(bin_obj.production_line_id) if bin_obj.production_line_id else None,
                "warehouse_id": bin_obj.warehouse_id,
            }
            cls.validate_bin(merged)

            if "material_id" in input_data:
                bin_obj.material = cls._resolve_material(input_data.get("material_id"))

            for attr, key in (
                ("code", "code"),
                ("name", "name"),
                ("description", "description"),
                ("bin_type", "bin_type"),
                ("material_group", "material_group"),
                ("capacity", "capacity"),
                ("uom_id", "uom_id"),
                ("replenishment_mode", "replenishment_mode"),
                ("fifo_enabled", "fifo_enabled"),
                ("supermarket_enabled", "supermarket_enabled"),
                ("location_code", "location_code"),
                ("location_reference", "location_reference"),
                ("is_active", "is_active"),
            ):
                if key in input_data:
                    setattr(bin_obj, attr, input_data[key])

            bin_obj.save()
            return bin_obj
        except (IntegrityError, ValidationError) as exc:
            raise _wrap_db_error(exc)

    @staticmethod
    @transaction.atomic
    def archive_bin(bin_id: str) -> MaterialBin:
        try:
            bin_obj = MaterialBin.objects.select_for_update().get(id=bin_id)
        except MaterialBin.DoesNotExist:
            raise MaterialBinServiceError("id", "NOT_FOUND", "Material bin not found")

        # Check for active routing/flow references that would block archiving
        references = []

        # Active routing statuses that count as "in use": DRAFT and ACTIVE
        # ARCHIVED routings do not block archiving
        active_statuses = [RoutingStatus.DRAFT, RoutingStatus.ACTIVE]

        # MaterialMovementRule as source_bin
        active_mmr_sources = MaterialMovementRule.objects.filter(
            source_bin=bin_obj,
            routing_step__routing__status__in=active_statuses,
        ).select_related("routing_step__routing")
        for mmr in active_mmr_sources:
            references.append({
                "type": "material_movement_rule",
                "role": "source_bin",
                "id": str(mmr.id),
                "routing_id": str(mmr.routing_step.routing_id),
                "routing_version": mmr.routing_step.routing.version,
                "routing_status": mmr.routing_step.routing.status,
            })

        # MaterialMovementRule as destination_bin
        active_mmr_dests = MaterialMovementRule.objects.filter(
            destination_bin=bin_obj,
            routing_step__routing__status__in=active_statuses,
        ).select_related("routing_step__routing")
        for mmr in active_mmr_dests:
            references.append({
                "type": "material_movement_rule",
                "role": "destination_bin",
                "id": str(mmr.id),
                "routing_id": str(mmr.routing_step.routing_id),
                "routing_version": mmr.routing_step.routing.version,
                "routing_status": mmr.routing_step.routing.status,
            })

        # OperationInput as source_bin
        active_oi = OperationInput.objects.filter(
            source_bin=bin_obj,
            routing_step__routing__status__in=active_statuses,
        ).select_related("routing_step__routing")
        for oi in active_oi:
            references.append({
                "type": "operation_input",
                "role": "source_bin",
                "id": str(oi.id),
                "routing_id": str(oi.routing_step.routing_id),
                "routing_version": oi.routing_step.routing.version,
                "routing_status": oi.routing_step.routing.status,
            })

        # OperationOutput as destination_bin
        active_oo = OperationOutput.objects.filter(
            destination_bin=bin_obj,
            routing_step__routing__status__in=active_statuses,
        ).select_related("routing_step__routing")
        for oo in active_oo:
            references.append({
                "type": "operation_output",
                "role": "destination_bin",
                "id": str(oo.id),
                "routing_id": str(oo.routing_step.routing_id),
                "routing_version": oo.routing_step.routing.version,
                "routing_status": oo.routing_step.routing.status,
            })

        if references:
            raise MaterialBinServiceError(
                "binId",
                "BIN_IN_ACTIVE_FLOW",
                "Cannot archive bin that is referenced by active routing steps.",
                details={"references": references},
            )

        bin_obj.is_active = False
        bin_obj.save(update_fields=["is_active", "updated_at"])
        return bin_obj

    @classmethod
    @transaction.atomic
    def assign_to_resource_group(cls, bin_id: str, resource_group_id: str) -> MaterialBin:
        try:
            bin_obj = MaterialBin.objects.select_for_update().get(id=bin_id)
        except MaterialBin.DoesNotExist:
            raise MaterialBinServiceError("id", "NOT_FOUND", "Material bin not found")
        rg = cls._resolve_resource_group(resource_group_id)
        cls.validate_same_plant(str(bin_obj.plant_id), resource_group=rg)
        bin_obj.resource_group = rg
        bin_obj.save()
        return bin_obj

    @classmethod
    @transaction.atomic
    def assign_to_warehouse(cls, bin_id: str, warehouse_code: str) -> MaterialBin:
        try:
            bin_obj = MaterialBin.objects.select_for_update().get(id=bin_id)
        except MaterialBin.DoesNotExist:
            raise MaterialBinServiceError("id", "NOT_FOUND", "Material bin not found")
        warehouse = cls._resolve_warehouse(warehouse_code, bin_obj.plant)
        cls.validate_same_plant(str(bin_obj.plant_id), warehouse=warehouse)
        bin_obj.warehouse = warehouse
        bin_obj.save(update_fields=["warehouse", "updated_at"])
        return bin_obj


def _wrap_db_error(exc: Exception) -> MaterialBinServiceError:
    """Wrap Django IntegrityError or ValidationError into a MaterialBinServiceError."""
    if isinstance(exc, IntegrityError):
        msg = str(exc)
        if "uq_material_bin_plant_code" in msg:
            return MaterialBinServiceError(
                "code",
                "DUPLICATE_PLANT_CODE",
                "A material bin with this code already exists in the same plant.",
            )
        if "ck_material_bin_capacity_gte_0" in msg:
            return MaterialBinServiceError(
                "capacity",
                "INVALID_CAPACITY",
                "Material bin capacity cannot be negative.",
            )
        return MaterialBinServiceError(
            "_db",
            "INTEGRITY_ERROR",
            f"Database integrity error: {msg}",
        )
    if isinstance(exc, ValidationError):
        messages = exc.messages if hasattr(exc, 'messages') else [str(exc)]
        message_str = "; ".join(messages)
        # Check for unique constraint violations from validate_unique()
        if any(x in message_str.lower() for x in ["already exists", "unique constraint", "uq_material_bin_plant_code"]):
            return MaterialBinServiceError(
                "code",
                "DUPLICATE_PLANT_CODE",
                "A material bin with this code already exists in the same plant.",
            )
        return MaterialBinServiceError(
            "_form",
            "VALIDATION_ERROR",
            message_str,
        )
    # Fallback — re-raise unexpected types
    raise exc
