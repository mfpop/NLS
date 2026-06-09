"""GraphQL inputs for material and inventory entities.

MaterialBin, Warehouse, and related inputs.
"""

import typing
import strawberry


@strawberry.input
class MaterialBinInput:
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    production_line_id: typing.Optional[str] = strawberry.field(name="productionLineId", default=None)
    resource_group_id: typing.Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    code: str
    name: str
    description: typing.Optional[str] = ""
    bin_type: str = strawberry.field(name="binType")
    material_id: typing.Optional[str] = strawberry.field(name="materialId", default=None)
    material_group: typing.Optional[str] = strawberry.field(name="materialGroup", default="")
    capacity: typing.Optional[float] = 0
    uom_id: typing.Optional[str] = strawberry.field(name="uomId", default=None)
    replenishment_mode: typing.Optional[str] = strawberry.field(name="replenishmentMode", default=None)
    fifo_enabled: typing.Optional[bool] = strawberry.field(name="fifoEnabled", default=False)
    supermarket_enabled: typing.Optional[bool] = strawberry.field(name="supermarketEnabled", default=False)
    location_code: typing.Optional[str] = strawberry.field(name="locationCode", default="")
    location_reference: typing.Optional[str] = strawberry.field(name="locationReference", default="")
    warehouse_code: typing.Optional[str] = strawberry.field(name="warehouseCode", default="")
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)


@strawberry.input
class WarehouseInput:
    plant_id: str = strawberry.field(name="plantId")
    code: str
    name: str
    warehouse_type: typing.Optional[str] = strawberry.field(name="warehouseType", default="GENERAL")
    location: typing.Optional[str] = ""
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)
