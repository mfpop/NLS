from django.db import transaction

from manufacturing.models import Material, MaterialBin, ResourceGroup


class MaterialBinServiceError(Exception):
    def __init__(self, field: str, code: str, message: str):
        self.field = field
        self.code = code
        self.message = message
        super().__init__(message)


class MaterialBinService:
    @staticmethod
    def _resolve_resource_group(resource_group_id):
        if not resource_group_id:
            return None
        try:
            return ResourceGroup.objects.select_related("department", "department__plant").get(id=resource_group_id)
        except ResourceGroup.DoesNotExist:
            raise MaterialBinServiceError("resourceGroupId", "NOT_FOUND", "Resource group not found")

    @staticmethod
    def _resolve_material(material_id):
        if not material_id:
            return None
        try:
            return Material.objects.get(id=material_id)
        except Material.DoesNotExist:
            raise MaterialBinServiceError("materialId", "NOT_FOUND", "Material not found")

    @classmethod
    def _validate_scope(cls, plant_id, resource_group):
        if resource_group and str(resource_group.department.plant_id) != str(plant_id):
            raise MaterialBinServiceError(
                "resourceGroupId",
                "CROSS_PLANT_BIN",
                "Material bin and resource group must belong to the same plant.",
            )

    @classmethod
    @transaction.atomic
    def create(cls, input_data) -> MaterialBin:
        resource_group = cls._resolve_resource_group(input_data.get("resource_group_id"))
        plant_id = input_data.get("plant_id") or (str(resource_group.department.plant_id) if resource_group else None)
        if not plant_id:
            raise MaterialBinServiceError("plantId", "REQUIRED", "Plant is required")
        cls._validate_scope(plant_id, resource_group)
        material = cls._resolve_material(input_data.get("material_id"))
        bin_obj = MaterialBin(
            plant_id=plant_id,
            resource_group=resource_group,
            code=(input_data.get("code") or "").strip(),
            name=(input_data.get("name") or "").strip(),
            bin_type=input_data.get("bin_type") or "INPUT",
            material=material,
            capacity=input_data.get("capacity") or 0,
            uom_id=input_data.get("uom_id") or None,
            location_code=input_data.get("location_code") or "",
            is_active=input_data.get("is_active", True),
        )
        bin_obj.save()
        return bin_obj

    @classmethod
    @transaction.atomic
    def update(cls, bin_id: str, input_data) -> MaterialBin:
        try:
            bin_obj = MaterialBin.objects.select_for_update().get(id=bin_id)
        except MaterialBin.DoesNotExist:
            raise MaterialBinServiceError("id", "NOT_FOUND", "Material bin not found")
        resource_group = cls._resolve_resource_group(input_data.get("resource_group_id")) if "resource_group_id" in input_data else bin_obj.resource_group
        plant_id = input_data.get("plant_id") or str(bin_obj.plant_id)
        cls._validate_scope(plant_id, resource_group)
        if "plant_id" in input_data and input_data.get("plant_id"):
            bin_obj.plant_id = input_data["plant_id"]
        if "resource_group_id" in input_data:
            bin_obj.resource_group = resource_group
        if "material_id" in input_data:
            bin_obj.material = cls._resolve_material(input_data.get("material_id"))
        for attr, key in (
            ("code", "code"),
            ("name", "name"),
            ("bin_type", "bin_type"),
            ("capacity", "capacity"),
            ("uom_id", "uom_id"),
            ("location_code", "location_code"),
            ("is_active", "is_active"),
        ):
            if key in input_data:
                setattr(bin_obj, attr, input_data[key])
        bin_obj.save()
        return bin_obj

    @staticmethod
    @transaction.atomic
    def archive(bin_id: str) -> MaterialBin:
        try:
            bin_obj = MaterialBin.objects.select_for_update().get(id=bin_id)
        except MaterialBin.DoesNotExist:
            raise MaterialBinServiceError("id", "NOT_FOUND", "Material bin not found")
        bin_obj.is_active = False
        bin_obj.save(update_fields=["is_active", "updated_at"])
        return bin_obj
