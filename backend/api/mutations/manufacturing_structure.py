import json
import strawberry
from typing import Optional
from strawberry.types import Info
from api.permissions import ensure_access
from api.types.manufacturing import (
    MutationError,
    CompanyNode, CompanyPayload, CompanyInput,
    PlantNode, PlantPayload, PlantInput,
    ProductionLineNode, ProductionLinePayload, ProductionLineInput,
    DepartmentNode, DepartmentPayload, DepartmentInput,
    ResourceGroupNode, ResourceGroupPayload, ResourceGroupInput,
    ResourceNode, ResourcePayload, ResourceInput,
    MaterialBinNode, MaterialBinPayload, MaterialBinInput,
    ProductionLineDepartmentAssignmentNode, AssignmentPayload,
    AssignDepartmentInput, AssignDepartmentToLinesInput,
    DeletePayload,
    WarehouseNode, WarehouseInput, WarehousePayload,
)
from manufacturing.models import Company, ProductionLine, ResourceGroup, ReferenceValue
from manufacturing.domain.structure_service import StructureService, StructureServiceError
from manufacturing.domain.department_service import DepartmentService, DepartmentServiceError
from manufacturing.domain.material_bin_service import MaterialBinService, MaterialBinServiceError
from manufacturing.domain.plant_structure_rules import validate_plant_input


def _user(info):
    return info.context.user


def _resolve_ref(model, ref_id):
    if not ref_id:
        return None
    try:
        return model.objects.get(id=ref_id)
    except model.DoesNotExist:
        return None


def _structure_error_payload(exc):
    return [MutationError(field=exc.field, code=exc.code, message=exc.message)]


def _set_line_refs(line, input):
    ref_fields = (
        ("status_id", "status_id"), ("line_type_id", "line_type_id"),
        ("shift_pattern_id", "shift_pattern_id"), ("default_calendar_id", "default_calendar_id"),
        ("week_start_day_id", "week_start_day_id"), ("timezone_id", "timezone_id"),
        ("capacity_uom_id", "capacity_uom_id"),
    )
    for input_field, model_field in ref_fields:
        if getattr(input, input_field) is not None:
            value = getattr(input, input_field)
            setattr(line, model_field, _resolve_ref(ReferenceValue, value) if value else None)
    if input.bottleneck_resource_group_id is not None:
        line.bottleneck_resource_group = _resolve_ref(ResourceGroup, input.bottleneck_resource_group_id)


def _sync_line_product_scope(line, input):
    from manufacturing.models import ProductionLineProductFamily, ProductionLineProductModel
    if not input.product_family_id:
        raise ValueError("Product family is required")
    family = ReferenceValue.objects.filter(id=input.product_family_id, category__code="production_family").first()
    if not family:
        raise ValueError("Product family is invalid")
    model_ids = input.product_model_ids or []
    if (input.status or line.status or "").upper() == "ACTIVE" and not model_ids:
        raise ValueError("At least one product model is required before activation")
    if input.primary_product_model_id and input.primary_product_model_id not in model_ids:
        raise ValueError("Primary model must be one of the selected models")
    models = list(ReferenceValue.objects.filter(id__in=model_ids, category__code="product_model"))
    ProductionLineProductFamily.objects.filter(production_line=line).exclude(product_family=family).delete()
    ProductionLineProductFamily.objects.update_or_create(
        production_line=line, product_family=family,
        defaults={"is_primary": True, "status": "ACTIVE"},
    )
    ProductionLineProductModel.objects.filter(production_line=line).exclude(product_model_id__in=model_ids).delete()
    for model in models:
        ProductionLineProductModel.objects.update_or_create(
            production_line=line, product_model=model,
            defaults={"product_family": family, "is_primary": str(model.id) == str(input.primary_product_model_id), "status": "ACTIVE"},
        )
    if input.primary_product_model_id:
        ProductionLineProductModel.objects.filter(production_line=line).exclude(product_model_id=input.primary_product_model_id).update(is_primary=False)


def _set_company_refs(company, input):
    _REF_TEXT_MAP = {
        "status_id": "status", "industry_type_id": "industry_type",
        "default_timezone_id": "default_timezone", "default_language_id": "default_language",
        "default_shift_model_id": "default_shift_model", "country_id": "country",
        "default_calendar_id": "default_calendar", "week_start_day_id": "week_start_day",
    }
    for ref_field, text_field in _REF_TEXT_MAP.items():
        v = getattr(input, ref_field, None)
        if v is not None:
            ref = _resolve_ref(ReferenceValue, v)
            setattr(company, ref_field, ref)
            if ref and text_field:
                setattr(company, text_field, ref.name)
    if input.product_line_ids is not None:
        refs = ReferenceValue.objects.filter(id__in=input.product_line_ids)
        company.product_line_refs.set(refs)
    if input.lean_methodology_ids is not None:
        refs = ReferenceValue.objects.filter(id__in=input.lean_methodology_ids)
        company.lean_methodology_refs.set(refs)


@strawberry.type
class ManufacturingStructureMutation:
    @strawberry.mutation
    def create_company(self, input: CompanyInput) -> CompanyPayload:
        try:
            company = StructureService.create_company(input)
            return CompanyPayload(ok=True, company=CompanyNode.from_db(company))
        except StructureServiceError as exc:
            return CompanyPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def update_company(self, input: CompanyInput) -> CompanyPayload:
        try:
            company = StructureService.update_primary_company(input)
            return CompanyPayload(ok=True, company=CompanyNode.from_db(company))
        except StructureServiceError as exc:
            return CompanyPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def delete_company(self) -> CompanyPayload:
        try:
            StructureService.delete_primary_company()
            return CompanyPayload(ok=True)
        except StructureServiceError as exc:
            return CompanyPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def create_plant(self, input: PlantInput, company_id: Optional[str] = strawberry.UNSET) -> PlantPayload:
        domain_errors = validate_plant_input(input.code or "", input.name or "")
        if domain_errors:
            return PlantPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message) for e in domain_errors])
        try:
            company = None if company_id is strawberry.UNSET else company_id
            plant = StructureService.create_plant(input, company or str(Company.objects.first().id) if Company.objects.exists() else None)
            return PlantPayload(ok=True, plant=PlantNode.from_db(plant))
        except StructureServiceError as exc:
            return PlantPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def update_plant(self, id: str, input: PlantInput, company_id: Optional[str] = strawberry.UNSET) -> PlantPayload:
        try:
            plant = StructureService.update_plant(id, input, None if company_id is strawberry.UNSET else company_id)
            return PlantPayload(ok=True, plant=PlantNode.from_db(plant))
        except StructureServiceError as exc:
            return PlantPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def archive_plant(self, id: str) -> PlantPayload:
        try:
            plant = StructureService.archive_plant(id)
            return PlantPayload(ok=True, plant=PlantNode.from_db(plant))
        except StructureServiceError as exc:
            return PlantPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def create_production_line(self, input: ProductionLineInput) -> ProductionLinePayload:
        try:
            line = StructureService.create_production_line(input)
            _sync_line_product_scope(line, input)
            return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))
        except StructureServiceError as exc:
            return ProductionLinePayload(ok=False, errors=_structure_error_payload(exc))
        except ValueError as exc:
            return ProductionLinePayload(ok=False, errors=[MutationError(field="productModels", code="VALIDATION", message=str(exc))])


    @strawberry.mutation
    def update_production_line(self, id: str, input: ProductionLineInput) -> ProductionLinePayload:
        try:
            line = StructureService.update_production_line(id, input)
            _sync_line_product_scope(line, input)
            return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))
        except StructureServiceError as exc:
            return ProductionLinePayload(ok=False, errors=_structure_error_payload(exc))
        except ValueError as exc:
            return ProductionLinePayload(ok=False, errors=[MutationError(field="productModels", code="VALIDATION", message=str(exc))])


    @strawberry.mutation
    def archive_production_line(self, id: str) -> ProductionLinePayload:
        try:
            line = StructureService.archive_production_line(id)
            return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))
        except StructureServiceError as exc:
            return ProductionLinePayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def delete_production_line(self, id: str) -> ProductionLinePayload:
        try:
            line = StructureService.delete_production_line(id)
            return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))
        except StructureServiceError as exc:
            return ProductionLinePayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def create_department(self, input: DepartmentInput) -> DepartmentPayload:
        try:
            dept = DepartmentService.create(input)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except DepartmentServiceError as exc:
            return DepartmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])


    @strawberry.mutation
    def update_department(self, id: str, input: DepartmentInput) -> DepartmentPayload:
        try:
            dept = DepartmentService.update(id, input)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except DepartmentServiceError as exc:
            return DepartmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])


    @strawberry.mutation
    def archive_department(self, id: str) -> DepartmentPayload:
        try:
            dept = StructureService.archive_department(id)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except StructureServiceError as exc:
            return DepartmentPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def delete_department(self, id: str) -> DeletePayload:
        try:
            DepartmentService.delete(id)
            return DeletePayload(success=True, in_use=False, message="Department deleted.")
        except DepartmentServiceError as exc:
            return DeletePayload(
                success=False,
                in_use=exc.code.startswith("IN_USE"),
                message=exc.message,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )


    @strawberry.mutation
    def assign_department_to_production_lines(self, input: AssignDepartmentToLinesInput) -> DepartmentPayload:
        try:
            dept = DepartmentService.assign_to_lines(str(input.department_id), input.production_line_ids)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except DepartmentServiceError as exc:
            return DepartmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])


    @strawberry.mutation
    def assign_department_to_production_line(self, input: AssignDepartmentInput) -> AssignmentPayload:
        try:
            a = StructureService.assign_department_to_production_line(
                str(input.production_line_id),
                str(input.department_id),
                input.sequence or 0,
                input.status or "ACTIVE",
            )
        except StructureServiceError as exc:
            return AssignmentPayload(ok=False, errors=_structure_error_payload(exc))
        return AssignmentPayload(ok=True, assignment=ProductionLineDepartmentAssignmentNode.from_db(a))


    @strawberry.mutation
    def remove_department_from_production_line(self, production_line_id: str, department_id: str) -> AssignmentPayload:
        deleted = StructureService.remove_department_from_production_line(production_line_id, department_id)
        return AssignmentPayload(ok=deleted)


    @strawberry.mutation
    def create_resource_group(self, input: ResourceGroupInput) -> ResourceGroupPayload:
        try:
            rg = StructureService.create_resource_group(input)
            return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))
        except StructureServiceError as exc:
            return ResourceGroupPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def update_resource_group(self, id: str, input: ResourceGroupInput) -> ResourceGroupPayload:
        try:
            rg = StructureService.update_resource_group(id, input)
            return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))
        except StructureServiceError as exc:
            return ResourceGroupPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def archive_resource_group(self, id: str) -> ResourceGroupPayload:
        try:
            rg = StructureService.archive_resource_group(id)
            return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))
        except StructureServiceError as exc:
            return ResourceGroupPayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def create_resource(self, input: ResourceInput) -> ResourcePayload:
        try:
            res = StructureService.create_resource(input)
            return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))
        except StructureServiceError as exc:
            return ResourcePayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def update_resource(self, id: str, input: ResourceInput) -> ResourcePayload:
        try:
            res = StructureService.update_resource(id, input)
            return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))
        except StructureServiceError as exc:
            return ResourcePayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def archive_resource(self, id: str) -> ResourcePayload:
        try:
            res = StructureService.archive_resource(id)
            return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))
        except StructureServiceError as exc:
            return ResourcePayload(ok=False, errors=_structure_error_payload(exc))


    @strawberry.mutation
    def create_material_bin(self, input: MaterialBinInput) -> MaterialBinPayload:
        try:
            bin_obj = MaterialBinService.create_bin({
                "plant_id": input.plant_id,
                "production_line_id": input.production_line_id,
                "resource_group_id": input.resource_group_id,
                "code": input.code,
                "name": input.name,
                "description": input.description,
                "bin_type": input.bin_type,
                "material_id": input.material_id,
                "material_group": input.material_group,
                "capacity": input.capacity,
                "uom_id": input.uom_id,
                "replenishment_mode": input.replenishment_mode,
                "fifo_enabled": input.fifo_enabled,
                "supermarket_enabled": input.supermarket_enabled,
                "location_code": input.location_code,
                "location_reference": input.location_reference,
                "warehouse_code": input.warehouse_code,
                "is_active": input.is_active,
            })
            return MaterialBinPayload(ok=True, material_bin=MaterialBinNode.from_db(bin_obj))
        except MaterialBinServiceError as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message, details=json.dumps(exc.details) if exc.details else None)])
        except Exception as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


    @strawberry.mutation
    def update_material_bin(self, id: str, input: MaterialBinInput) -> MaterialBinPayload:
        try:
            bin_obj = MaterialBinService.update_bin(id, {
                "plant_id": input.plant_id,
                "production_line_id": input.production_line_id,
                "resource_group_id": input.resource_group_id,
                "code": input.code,
                "name": input.name,
                "description": input.description,
                "bin_type": input.bin_type,
                "material_id": input.material_id,
                "material_group": input.material_group,
                "capacity": input.capacity,
                "uom_id": input.uom_id,
                "replenishment_mode": input.replenishment_mode,
                "fifo_enabled": input.fifo_enabled,
                "supermarket_enabled": input.supermarket_enabled,
                "location_code": input.location_code,
                "location_reference": input.location_reference,
                "warehouse_code": input.warehouse_code,
                "is_active": input.is_active,
            })
            return MaterialBinPayload(ok=True, material_bin=MaterialBinNode.from_db(bin_obj))
        except MaterialBinServiceError as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message, details=json.dumps(exc.details) if exc.details else None)])
        except Exception as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


    @strawberry.mutation
    def archive_material_bin(self, id: str) -> MaterialBinPayload:
        try:
            bin_obj = MaterialBinService.archive_bin(id)
            return MaterialBinPayload(ok=True, material_bin=MaterialBinNode.from_db(bin_obj))
        except MaterialBinServiceError as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message, details=json.dumps(exc.details) if exc.details else None)])


    @strawberry.mutation
    def create_warehouse(self, info: Info, input: WarehouseInput) -> WarehousePayload:
        ensure_access(user=_user(info), action="manage_warehouses")
        from manufacturing.models import Warehouse
        try:
            warehouse = Warehouse.objects.create(
                plant_id=input.plant_id,
                code=input.code,
                name=input.name,
                warehouse_type=input.warehouse_type or "GENERAL",
                location=input.location or "",
                is_active=input.is_active if input.is_active is not None else True,
            )
            return WarehousePayload(ok=True, warehouse=WarehouseNode.from_db(warehouse))
        except Exception as exc:
            return WarehousePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


    @strawberry.mutation
    def update_warehouse(self, info: Info, id: str, input: WarehouseInput) -> WarehousePayload:
        ensure_access(user=_user(info), action="manage_warehouses")
        from manufacturing.models import Warehouse
        try:
            warehouse = Warehouse.objects.get(id=id)
        except Warehouse.DoesNotExist:
            return WarehousePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Warehouse not found")])
        try:
            warehouse.plant_id = input.plant_id
            warehouse.code = input.code
            warehouse.name = input.name
            if input.warehouse_type is not None:
                warehouse.warehouse_type = input.warehouse_type
            if input.location is not None:
                warehouse.location = input.location
            if input.is_active is not None:
                warehouse.is_active = input.is_active
            warehouse.save()
            return WarehousePayload(ok=True, warehouse=WarehouseNode.from_db(warehouse))
        except Exception as exc:
            return WarehousePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


    @strawberry.mutation
    def archive_warehouse(self, info: Info, id: str) -> WarehousePayload:
        ensure_access(user=_user(info), action="manage_warehouses")
        from manufacturing.models import Warehouse
        try:
            warehouse = Warehouse.objects.get(id=id)
        except Warehouse.DoesNotExist:
            return WarehousePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Warehouse not found")])
        try:
            warehouse.is_active = False
            warehouse.save()
            return WarehousePayload(ok=True, warehouse=WarehouseNode.from_db(warehouse))
        except Exception as exc:
            return WarehousePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


