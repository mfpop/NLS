import strawberry
from typing import Optional
from django.db.models import Q

from manufacturing.models import (
    Material, InventoryLocation, MaterialBin,
)
from api.types.manufacturing import (
    MaterialNode, MaterialBinNode, InventoryLocationNode, WarehouseNode,
)


@strawberry.type
class MaterialQuery:

        @strawberry.field
        def materials(self, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[MaterialNode]:
            qs = Material.objects.all()
            if status and status != "all":
                qs = qs.filter(status=status)
            if limit:
                qs = qs[offset:offset + limit] if offset else qs[:limit]
            return [MaterialNode.from_db(material) for material in qs]
    
        @strawberry.field
        def inventory_locations(self, plant_id: Optional[str] = None, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[InventoryLocationNode]:
            qs = InventoryLocation.objects.select_related("plant").all()
            if plant_id:
                qs = qs.filter(plant_id=plant_id)
            if status and status != "all":
                qs = qs.filter(status=status)
            if limit:
                qs = qs[offset:offset + limit] if offset else qs[:limit]
            return [InventoryLocationNode.from_db(location) for location in qs]
    
        @strawberry.field
        def warehouses(
            self,
            plant_id: Optional[str] = None,
            is_active: Optional[bool] = None,
            limit: Optional[int] = None,
            offset: Optional[int] = None,
        ) -> list["WarehouseNode"]:
            from manufacturing.models import Warehouse
            qs = Warehouse.objects.select_related("plant").all()
            if plant_id:
                qs = qs.filter(plant_id=plant_id)
            if is_active is not None:
                qs = qs.filter(is_active=is_active)
            if limit:
                qs = qs[offset:offset + limit] if offset else qs[:limit]
            return [WarehouseNode.from_db(w) for w in qs]
    
        @strawberry.field
        def warehouse(self, id: str) -> Optional["WarehouseNode"]:
            from manufacturing.models import Warehouse
            try:
                return WarehouseNode.from_db(Warehouse.objects.select_related("plant").get(id=id))
            except Warehouse.DoesNotExist:
                return None
    
        @strawberry.field
        def material_bins(
            self,
            plant_id: Optional[str] = None,
            warehouse_code: Optional[str] = None,
            production_line_id: Optional[str] = None,
            resource_group_id: Optional[str] = None,
            bin_type: Optional[str] = None,
            replenishment_mode: Optional[str] = None,
            is_active: Optional[bool] = None,
            search: Optional[str] = None,
            limit: Optional[int] = None,
            offset: Optional[int] = None,
        ) -> list[MaterialBinNode]:
            qs = MaterialBin.objects.select_related("plant", "production_line", "resource_group", "material", "uom").all()
            if plant_id:
                qs = qs.filter(plant_id=plant_id)
            if warehouse_code:
                qs = qs.filter(warehouse_code=warehouse_code)
            if production_line_id:
                qs = qs.filter(production_line_id=production_line_id)
            if resource_group_id:
                qs = qs.filter(resource_group_id=resource_group_id)
            if bin_type:
                qs = qs.filter(bin_type=bin_type)
            if replenishment_mode:
                qs = qs.filter(replenishment_mode=replenishment_mode)
            if is_active is not None:
                qs = qs.filter(is_active=is_active)
            if search:
                qs = qs.filter(Q(code__icontains=search) | Q(name__icontains=search))
            if limit:
                qs = qs[offset:offset + limit] if offset else qs[:limit]
            return [MaterialBinNode.from_db(bin_obj) for bin_obj in qs]
    
        @strawberry.field
        def material_bin(self, id: str) -> Optional[MaterialBinNode]:
            try:
                return MaterialBinNode.from_db(
                    MaterialBin.objects.select_related("plant", "production_line", "resource_group", "material", "uom").get(id=id)
                )
            except MaterialBin.DoesNotExist:
                return None
    
        @strawberry.field(name="materialBinsByPlant")
        def material_bins_by_plant(self, plant_id: str) -> list[MaterialBinNode]:
            return [
                MaterialBinNode.from_db(bin_obj)
                for bin_obj in MaterialBin.objects.select_related("plant", "production_line", "resource_group", "material", "uom").filter(plant_id=plant_id)
            ]
    
        @strawberry.field(name="materialBinsByWarehouse")
        def material_bins_by_warehouse(self, warehouse_code: str) -> list[MaterialBinNode]:
            return [
                MaterialBinNode.from_db(bin_obj)
                for bin_obj in MaterialBin.objects.select_related("plant", "production_line", "resource_group", "material", "uom").filter(warehouse_code=warehouse_code)
            ]
    
        # ── Document / Standard Framework ──
    
        @strawberry.field(name="materialBinsByResourceGroup")
        def material_bins_by_resource_group(self, resource_group_id: str) -> list[MaterialBinNode]:
            return [
                MaterialBinNode.from_db(bin_obj)
                for bin_obj in MaterialBin.objects.select_related("plant", "production_line", "resource_group", "material", "uom").filter(resource_group_id=resource_group_id)
            ]