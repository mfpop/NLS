from dataclasses import dataclass

from django.db import IntegrityError, transaction

from manufacturing.models import (
    Company,
    Department,
    Plant,
    ProductionLine,
    ProductionLineDepartmentAssignment,
    ReferenceValue,
    Resource,
    ResourceGroup,
    RoutingStep,
)


@dataclass
class StructureServiceError(Exception):
    field: str | None
    code: str
    message: str


class StructureService:
    @staticmethod
    def _resolve_ref(ref_id: str | None):
        if not ref_id:
            return None
        return ReferenceValue.objects.filter(id=ref_id).first()

    @staticmethod
    def _required(value: str | None, field: str, label: str) -> str:
        normalized = (value or "").strip()
        if not normalized:
            raise StructureServiceError(field, "REQUIRED", f"{label} is required")
        return normalized

    @classmethod
    def _company(cls, company_id: str | None) -> Company:
        value = cls._required(company_id, "companyId", "Company")
        try:
            return Company.objects.get(id=value)
        except Company.DoesNotExist as exc:
            raise StructureServiceError("companyId", "NOT_FOUND", "Company not found") from exc

    @classmethod
    def _plant(cls, plant_id: str | None, for_update: bool = False) -> Plant:
        value = cls._required(plant_id, "plantId", "Plant")
        qs = Plant.objects
        if for_update:
            qs = qs.select_for_update()
        try:
            return qs.get(id=value)
        except Plant.DoesNotExist as exc:
            raise StructureServiceError("plantId", "NOT_FOUND", "Plant not found") from exc

    @classmethod
    def _department(cls, department_id: str | None, for_update: bool = False) -> Department:
        value = cls._required(department_id, "departmentId", "Department")
        qs = Department.objects
        if for_update:
            qs = qs.select_for_update()
        try:
            return qs.get(id=value)
        except Department.DoesNotExist as exc:
            raise StructureServiceError("departmentId", "NOT_FOUND", "Department not found") from exc

    @classmethod
    def _resource_group(cls, resource_group_id: str | None, for_update: bool = False) -> ResourceGroup:
        value = cls._required(resource_group_id, "resourceGroupId", "Resource group")
        qs = ResourceGroup.objects.select_related("department__plant")
        if for_update:
            qs = qs.select_for_update()
        try:
            return qs.get(id=value)
        except ResourceGroup.DoesNotExist as exc:
            raise StructureServiceError("resourceGroupId", "NOT_FOUND", "Resource group not found") from exc

    @classmethod
    def _validate_unique(cls, model, filters: dict, exclude_id: str | None, field: str, message: str):
        qs = model.objects.filter(**filters)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        if qs.exists():
            raise StructureServiceError(field, "DUPLICATE", message)

    @classmethod
    @transaction.atomic
    def create_company(cls, input_data) -> Company:
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(Company, {"code__iexact": code}, None, "code", "Company code must be unique")
        cls._validate_unique(Company, {"name__iexact": name}, None, "name", "Company name must be unique")
        company = Company.objects.create(
            code=code,
            name=name,
            legal_name=input_data.legal_name or "",
            description=input_data.description or "",
            industry_type=input_data.industry_type or "",
            status=input_data.status or "ACTIVE",
            address=input_data.address or "",
            city=input_data.city or "",
            state=input_data.state or "",
            country=input_data.country or "",
            phone=input_data.phone or "",
            email=input_data.email or "",
            website=input_data.website or "",
            operating_since=input_data.operating_since or "",
            manufacturing_focus=input_data.manufacturing_focus or "",
            product_lines=input_data.product_lines or "",
            lean_methodology=input_data.lean_methodology or "",
            default_timezone=input_data.default_timezone or "",
            default_language=input_data.default_language or "",
            default_calendar=input_data.default_calendar or "",
            default_shift_model=input_data.default_shift_model or "",
            week_start_day=input_data.week_start_day or "",
            admin_name=input_data.admin_name or "",
            admin_role=input_data.admin_role or "",
            zipcode=input_data.zipcode or "",
        )
        cls._set_company_refs(company, input_data)
        company.save()
        return company

    @classmethod
    @transaction.atomic
    def update_company(cls, company_id: str, input_data) -> Company:
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist as exc:
            raise StructureServiceError("id", "NOT_FOUND", "Company not found") from exc
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(Company, {"code__iexact": code}, company_id, "code", "Company code must be unique")
        cls._validate_unique(Company, {"name__iexact": name}, company_id, "name", "Company name must be unique")
        company.code = code
        company.name = name
        for field in (
            "legal_name", "description", "industry_type", "status", "address", "city", "state",
            "country", "phone", "email", "website", "operating_since", "manufacturing_focus",
            "product_lines", "lean_methodology", "default_timezone", "default_language",
            "default_calendar", "default_shift_model", "week_start_day", "admin_name",
            "admin_role", "zipcode",
        ):
            value = getattr(input_data, field, None)
            if value is not None:
                setattr(company, field, value)
        cls._set_company_refs(company, input_data)
        company.save()
        return company

    @classmethod
    @transaction.atomic
    def update_primary_company(cls, input_data) -> Company:
        company = Company.objects.order_by("id").first()
        if company is None:
            raise StructureServiceError("id", "NOT_FOUND", "Company not found")
        return cls.update_company(str(company.id), input_data)

    @classmethod
    def _set_company_refs(cls, company: Company, input_data):
        for input_field, model_field, text_field in (
            ("status_id", "status_id", "status"),
            ("industry_type_id", "industry_type_id", "industry_type"),
            ("default_timezone_id", "default_timezone_id", "default_timezone"),
            ("default_language_id", "default_language_id", "default_language"),
            ("default_shift_model_id", "default_shift_model_id", "default_shift_model"),
            ("country_id", "country_id", "country"),
            ("default_calendar_id", "default_calendar_id", "default_calendar"),
            ("week_start_day_id", "week_start_day_id", "week_start_day"),
        ):
            if getattr(input_data, input_field) is not None:
                ref = cls._resolve_ref(getattr(input_data, input_field))
                setattr(company, model_field, ref)
                if ref and text_field:
                    setattr(company, text_field, ref.name)
        if input_data.product_line_ids is not None:
            company.product_line_refs.set(ReferenceValue.objects.filter(id__in=input_data.product_line_ids))
        if input_data.lean_methodology_ids is not None:
            company.lean_methodology_refs.set(ReferenceValue.objects.filter(id__in=input_data.lean_methodology_ids))

    @classmethod
    @transaction.atomic
    def delete_company(cls, company_id: str) -> Company:
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist as exc:
            raise StructureServiceError("id", "NOT_FOUND", "Company not found") from exc
        if company.plants.exists():
            raise StructureServiceError("id", "IN_USE_PLANTS", "Cannot delete company while Plants exist")
        company.delete()
        return company

    @classmethod
    @transaction.atomic
    def delete_primary_company(cls) -> Company:
        company = Company.objects.order_by("id").first()
        if company is None:
            raise StructureServiceError("id", "NOT_FOUND", "Company not found")
        return cls.delete_company(str(company.id))

    @classmethod
    @transaction.atomic
    def archive_plant(cls, plant_id: str) -> Plant:
        plant = cls._plant(plant_id)
        plant.status = "ARCHIVED"
        plant.save(update_fields=["status", "updated_at"])
        return plant

    @classmethod
    @transaction.atomic
    def archive_production_line(cls, line_id: str) -> ProductionLine:
        try:
            line = ProductionLine.objects.get(id=line_id)
        except ProductionLine.DoesNotExist as exc:
            raise StructureServiceError("id", "NOT_FOUND", "Production line not found") from exc
        line.status = "ARCHIVED"
        line.save(update_fields=["status", "updated_at"])
        return line

    @classmethod
    @transaction.atomic
    def archive_resource_group(cls, group_id: str) -> ResourceGroup:
        group = cls._resource_group(group_id, for_update=True)
        group.status = "ARCHIVED"
        group.save(update_fields=["status", "updated_at"])
        return group

    @classmethod
    @transaction.atomic
    def archive_resource(cls, resource_id: str) -> Resource:
        try:
            resource = Resource.objects.select_for_update().get(id=resource_id)
        except Resource.DoesNotExist as exc:
            raise StructureServiceError("id", "NOT_FOUND", "Resource not found") from exc
        resource.status = "ARCHIVED"
        resource.save(update_fields=["status", "updated_at"])
        return resource

    @classmethod
    @transaction.atomic
    def archive_department(cls, department_id: str) -> Department:
        dept = cls._department(department_id)
        dept.status = "ARCHIVED"
        dept.save(update_fields=["status", "updated_at"])
        return dept

    @classmethod
    @transaction.atomic
    def create_plant(cls, input_data, company_id: str | None = None) -> Plant:
        company = Company.objects.select_for_update().get(id=company_id)
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(Plant, {"company": company, "code__iexact": code}, None, "code", "Plant code must be unique inside Company")
        plant = Plant.objects.create(
            company=company,
            code=code,
            name=name,
            description=input_data.description or "",
            status=input_data.status or "ACTIVE",
            building=input_data.building or "",
            address=input_data.address or "",
            city=input_data.city or "",
            state=input_data.state or "",
            country=input_data.country or "",
            zipcode=input_data.zipcode or "",
            timezone=input_data.timezone or "",
            latitude=input_data.latitude or "",
            longitude=input_data.longitude or "",
            plant_type=input_data.plant_type or "",
            operating_since=input_data.operating_since or "",
            manager_name=input_data.manager_name or "",
            manager_email=input_data.manager_email or "",
            manager_phone=input_data.manager_phone or "",
            default_calendar=input_data.default_calendar or "",
            default_shift_model=input_data.default_shift_model or "",
            week_start_day=input_data.week_start_day or "",
            default_schedule=input_data.default_schedule or "",
            manufacturing_focus=input_data.manufacturing_focus or "",
        )
        cls._set_plant_refs(plant, input_data)
        plant.save()
        return plant

    @classmethod
    @transaction.atomic
    def update_plant(cls, plant_id: str, input_data, company_id: str | None = None) -> Plant:
        try:
            plant = Plant.objects.get(id=plant_id)
        except Plant.DoesNotExist as exc:
            raise StructureServiceError("id", "NOT_FOUND", "Plant not found") from exc
        company = cls._company(company_id) if company_id is not None else plant.company
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(Plant, {"company": company, "code__iexact": code}, plant_id, "code", "Plant code must be unique inside Company")
        plant.company = company
        plant.code = code
        plant.name = name
        for field in (
            "description", "status", "building", "address", "city", "state", "country", "zipcode",
            "timezone", "latitude", "longitude", "plant_type", "operating_since", "manager_name",
            "manager_email", "manager_phone", "default_calendar", "default_shift_model", "week_start_day",
            "default_schedule", "manufacturing_focus",
        ):
            value = getattr(input_data, field, None)
            if value is not None:
                setattr(plant, field, value)
        cls._set_plant_refs(plant, input_data)
        plant.save()
        return plant

    @classmethod
    def _set_plant_refs(cls, plant: Plant, input_data):
        for input_field, model_field in (
            ("status_id", "status_id"),
            ("country_id", "country_id"),
            ("timezone_id", "timezone_id"),
            ("plant_type_id", "plant_type_id"),
            ("default_calendar_id", "default_calendar_id"),
            ("default_shift_model_id", "default_shift_model_id"),
            ("week_start_day_id", "week_start_day_id"),
            ("default_schedule_id", "default_schedule_id"),
        ):
            if getattr(input_data, input_field) is not None:
                setattr(plant, model_field, cls._resolve_ref(getattr(input_data, input_field)))
        if input_data.manufacturing_focus_ids is not None:
            plant.manufacturing_focus_refs.set(ReferenceValue.objects.filter(id__in=input_data.manufacturing_focus_ids))

    @classmethod
    def _set_line_refs(cls, line: ProductionLine, input_data):
        for input_field, model_field in (
            ("status_id", "status_id"),
            ("line_type_id", "line_type_id"),
            ("shift_pattern_id", "shift_pattern_id"),
            ("default_calendar_id", "default_calendar_id"),
            ("week_start_day_id", "week_start_day_id"),
            ("timezone_id", "timezone_id"),
            ("capacity_uom_id", "capacity_uom_id"),
        ):
            if getattr(input_data, input_field) is not None:
                setattr(line, model_field, cls._resolve_ref(getattr(input_data, input_field)))
        if input_data.bottleneck_resource_group_id is not None:
            group = cls._resource_group(input_data.bottleneck_resource_group_id) if input_data.bottleneck_resource_group_id else None
            if group and group.department.plant_id != line.plant_id:
                raise StructureServiceError("bottleneckResourceGroupId", "INVALID_PLANT", "Bottleneck resource group must belong to the production line Plant")
            line.bottleneck_resource_group = group

    @classmethod
    @transaction.atomic
    def create_production_line(cls, input_data) -> ProductionLine:
        plant = cls._plant(input_data.plant_id, for_update=True)
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(ProductionLine, {"plant": plant, "code__iexact": code}, None, "code", "Production line code must be unique inside Plant")
        line = ProductionLine.objects.create(
            plant=plant,
            code=code,
            name=name,
            description=input_data.description or "",
            status=input_data.status or "ACTIVE",
            shift_pattern=input_data.shift_pattern or "",
            capacity_basis=input_data.capacity_basis or "",
            is_constraint=input_data.is_constraint or False,
        )
        cls._set_line_refs(line, input_data)
        line.save()
        return line

    @classmethod
    @transaction.atomic
    def update_production_line(cls, line_id: str, input_data) -> ProductionLine:
        try:
            line = ProductionLine.objects.select_for_update().get(id=line_id)
        except ProductionLine.DoesNotExist as exc:
            raise StructureServiceError("id", "NOT_FOUND", "Production line not found") from exc
        plant = cls._plant(input_data.plant_id, for_update=True)
        if line.plant_id != plant.id and line.department_assignments.exists():
            raise StructureServiceError("plantId", "INVALID", "Cannot change Plant while departments are assigned")
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(ProductionLine, {"plant": plant, "code__iexact": code}, line_id, "code", "Production line code must be unique inside Plant")
        line.plant = plant
        line.code = code
        line.name = name
        for field in ("description", "status", "shift_pattern", "capacity_basis", "is_constraint"):
            value = getattr(input_data, field, None)
            if value is not None:
                setattr(line, field, value)
        cls._set_line_refs(line, input_data)
        line.save()
        return line

    @classmethod
    @transaction.atomic
    def assign_department_to_production_line(cls, production_line_id: str, department_id: str, sequence: int = 0, status: str = "ACTIVE"):
        try:
            line = ProductionLine.objects.select_for_update().get(id=production_line_id)
            dept = Department.objects.select_for_update().get(id=department_id)
        except ProductionLine.DoesNotExist as exc:
            raise StructureServiceError("productionLineId", "NOT_FOUND", "Production line not found") from exc
        except Department.DoesNotExist as exc:
            raise StructureServiceError("departmentId", "NOT_FOUND", "Department not found") from exc
        if line.plant_id != dept.plant_id:
            raise StructureServiceError("productionLineId", "INVALID_PLANT", "Department and Production Line must belong to the same Plant.")
        assignment, _ = ProductionLineDepartmentAssignment.objects.update_or_create(
            production_line=line,
            department=dept,
            defaults={"plant": line.plant, "sequence": sequence or 0, "status": status or "ACTIVE"},
        )
        return assignment

    @classmethod
    @transaction.atomic
    def remove_department_from_production_line(cls, production_line_id: str, department_id: str) -> bool:
        deleted, _ = ProductionLineDepartmentAssignment.objects.filter(
            production_line_id=production_line_id,
            department_id=department_id,
        ).delete()
        return deleted > 0

    @classmethod
    @transaction.atomic
    def create_resource_group(cls, input_data) -> ResourceGroup:
        dept = cls._department(str(input_data.department_id), for_update=True)
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(ResourceGroup, {"department": dept, "code__iexact": code}, None, "code", "Resource group code must be unique inside Department")
        group = ResourceGroup.objects.create(
            department=dept,
            code=code,
            name=name,
            description=input_data.description or "",
            status=input_data.status or "ACTIVE",
            members=input_data.members or 0,
            leader=input_data.leader or "",
            supervisor=input_data.supervisor or "",
            status_id=cls._resolve_ref(input_data.status_id),
            group_type_id=cls._resolve_ref(input_data.group_type_id),
            capability_type=getattr(input_data, "capability_type", "SHARED") or "SHARED",
            shift_pattern_id=cls._resolve_ref(getattr(input_data, "shift_pattern_id", None)),
            capacity_model=getattr(input_data, "capacity_model", "") or "",
            oee_target=getattr(input_data, "oee_target", None),
            is_bottleneck=getattr(input_data, "is_bottleneck", False) or False,
            is_constraint=getattr(input_data, "is_constraint", False) or False,
        )
        return group

    @classmethod
    @transaction.atomic
    def update_resource_group(cls, group_id: str, input_data) -> ResourceGroup:
        try:
            group = ResourceGroup.objects.select_for_update().get(id=group_id)
        except ResourceGroup.DoesNotExist as exc:
            raise StructureServiceError("id", "NOT_FOUND", "Resource group not found") from exc
        dept = cls._department(str(input_data.department_id), for_update=True)
        if group.department_id != dept.id and (group.resources.exists() or RoutingStep.objects.filter(resource_group_id=group_id).exists()):
            raise StructureServiceError("departmentId", "INVALID",
                                        "Cannot change Department while resources or routing steps exist")
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(ResourceGroup, {"department": dept, "code__iexact": code}, group_id, "code",
                             "Resource group code must be unique inside Department")
        group.department = dept
        group.code = code
        group.name = name
        group.description = input_data.description or ""
        group.status = input_data.status or group.status
        group.members = input_data.members or 0
        group.leader = input_data.leader or ""
        group.supervisor = getattr(input_data, "supervisor", None) or group.supervisor
        if input_data.status_id is not None:
            group.status_id = cls._resolve_ref(input_data.status_id)
        if input_data.group_type_id is not None:
            group.group_type_id = cls._resolve_ref(input_data.group_type_id)
        if getattr(input_data, "capability_type", None) is not None:
            group.capability_type = input_data.capability_type or "SHARED"
        if getattr(input_data, "shift_pattern_id", None) is not None:
            group.shift_pattern_id = cls._resolve_ref(input_data.shift_pattern_id)
        if getattr(input_data, "capacity_model", None) is not None:
            group.capacity_model = input_data.capacity_model or ""
        if getattr(input_data, "oee_target", None) is not None:
            group.oee_target = input_data.oee_target
        if getattr(input_data, "is_bottleneck", None) is not None:
            group.is_bottleneck = input_data.is_bottleneck
        if getattr(input_data, "is_constraint", None) is not None:
            group.is_constraint = input_data.is_constraint
        group.save()
        return group

    @classmethod
    @transaction.atomic
    def create_resource(cls, input_data) -> Resource:
        group = cls._resource_group(str(input_data.resource_group_id))
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(Resource, {"resource_group": group, "code__iexact": code}, None, "code", "Resource code must be unique inside Resource Group")
        resource = Resource.objects.create(
            resource_group=group,
            code=code,
            name=name,
            description=input_data.description or "",
            status=input_data.status or "ACTIVE",
            status_id=cls._resolve_ref(input_data.status_id),
            resource_type_id=cls._resolve_ref(input_data.resource_type_id),
        )
        if input_data.capability_ids is not None:
            resource.capabilities.set(ReferenceValue.objects.filter(id__in=input_data.capability_ids))
        return resource

    @classmethod
    @transaction.atomic
    def update_resource(cls, resource_id: str, input_data) -> Resource:
        try:
            resource = Resource.objects.get(id=resource_id)
        except Resource.DoesNotExist as exc:
            raise StructureServiceError("id", "NOT_FOUND", "Resource not found") from exc
        group = cls._resource_group(str(input_data.resource_group_id))
        code = cls._required(input_data.code, "code", "Code").upper()
        name = cls._required(input_data.name, "name", "Name")
        cls._validate_unique(Resource, {"resource_group": group, "code__iexact": code}, resource_id, "code", "Resource code must be unique inside Resource Group")
        resource.resource_group = group
        resource.code = code
        resource.name = name
        resource.description = input_data.description or ""
        resource.status = input_data.status or resource.status
        if input_data.status_id is not None:
            resource.status_id = cls._resolve_ref(input_data.status_id)
        if input_data.resource_type_id is not None:
            resource.resource_type_id = cls._resolve_ref(input_data.resource_type_id)
        if input_data.capability_ids is not None:
            resource.capabilities.set(ReferenceValue.objects.filter(id__in=input_data.capability_ids))
        resource.save()
        return resource
from manufacturing.models import Plant, ProductionLine, Department, ResourceGroup, Resource
from django.core.cache import cache


COUNTS_CACHE_KEY = "manufacturing:structure_counts:v1"
HEALTH_CACHE_KEY = "manufacturing:system_health:v1"
CACHE_TTL_SECONDS = 30


def get_structure_counts():
    """Get counts for all entity types."""
    cached = cache.get(COUNTS_CACHE_KEY)
    if cached is not None:
        return cached

    result = {
        "plants": Plant.objects.count(),
        "lines": ProductionLine.objects.count(),
        "depts": Department.objects.count(),
        "groups": ResourceGroup.objects.count(),
        "resources": Resource.objects.count(),
        "active_lines": ProductionLine.objects.filter(status="ACTIVE").count(),
    }

    cache.set(COUNTS_CACHE_KEY, result, CACHE_TTL_SECONDS)
    return result


def get_system_health():
    """Get system health indicators."""
    cached = cache.get(HEALTH_CACHE_KEY)
    if cached is not None:
        return cached

    result = {
        "running_lines": ProductionLine.objects.filter(status="ACTIVE").count(),
        "resources_down": 0,
        "high_utilization_resources": 0,
    }

    cache.set(HEALTH_CACHE_KEY, result, CACHE_TTL_SECONDS)
    return result
