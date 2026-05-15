from dataclasses import dataclass

from django.db import transaction
from django.db.models import Count, Q
from django.contrib.auth.models import User

from manufacturing.models import (
    Department,
    Plant,
    ProductionLine,
    ProductionLineDepartmentAssignment,
    ReferenceValue,
    ResourceGroup,
    RoutingStep,
)


@dataclass
class DepartmentServiceError(Exception):
    field: str | None
    code: str
    message: str


class DepartmentService:
    @staticmethod
    def queryset():
        return Department.objects.prefetch_related(
            "line_assignments__production_line__plant",
            "resource_groups__resources",
        ).select_related(
            "plant",
        ).annotate(
            production_line_count=Count("line_assignments", distinct=True),
            resource_group_count=Count("resource_groups", distinct=True),
            resource_count=Count("resource_groups__resources", distinct=True),
        )

    @classmethod
    def list(cls, status: str | None = None, search: str | None = None, production_line_id: str | None = None):
        qs = cls.queryset()
        if production_line_id:
            qs = qs.filter(line_assignments__production_line_id=production_line_id)
        if status and status != "all":
            qs = qs.filter(status__iexact=status)
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(code__icontains=search)
                | Q(manager__icontains=search)
                | Q(plant__name__icontains=search)
                | Q(plant__code__icontains=search)
            )
        return qs.distinct()

    @classmethod
    def get(cls, department_id: str) -> Department:
        try:
            return cls.queryset().get(id=department_id)
        except Department.DoesNotExist as exc:
            raise DepartmentServiceError("id", "NOT_FOUND", "Department not found") from exc

    @staticmethod
    def _resolve_ref(ref_id: str | None):
        if not ref_id:
            return None
        try:
            return ReferenceValue.objects.get(id=ref_id)
        except ReferenceValue.DoesNotExist:
            return None

    @staticmethod
    def _validate_person_ref(ref_id: str | None, field: str) -> str:
        value = (ref_id or "").strip()
        if not value:
            return ""
        if not value.isdigit():
            return value
        if User.objects.filter(id=value).exists():
            return value
        if ReferenceValue.objects.filter(
            id=value,
            category__code__in=("staff", "employee", "user", "manager", "supervisor"),
            is_active=True,
        ).exists():
            return value
        raise DepartmentServiceError(field, "INVALID", f"{field.title()} must be a valid staff or user reference")

    @classmethod
    def _resolve_plant(cls, plant_id: str | None) -> Plant:
        value = (plant_id or "").strip()
        if not value:
            raise DepartmentServiceError("plantId", "REQUIRED", "Plant required")
        try:
            return Plant.objects.get(id=value)
        except Plant.DoesNotExist as exc:
            raise DepartmentServiceError("plantId", "NOT_FOUND", "Plant not found") from exc

    @classmethod
    def _validate_unique_code(cls, code: str, plant: Plant, department_id: str | None = None):
        qs = Department.objects.filter(plant=plant, code__iexact=code)
        if department_id:
            qs = qs.exclude(id=department_id)
        if qs.exists():
            raise DepartmentServiceError("code", "DUPLICATE", "Department code must be unique inside Plant")

    @classmethod
    @transaction.atomic
    def create(cls, input_data) -> Department:
        code = (input_data.code or "").strip().upper()
        name = (input_data.name or "").strip()
        if not name:
            raise DepartmentServiceError("name", "REQUIRED", "Name is required")
        if not code:
            raise DepartmentServiceError("code", "REQUIRED", "Code is required")
        plant = cls._resolve_plant(input_data.plant_id)
        cls._validate_unique_code(code, plant)
        manager = cls._validate_person_ref(input_data.manager, "manager")
        supervisor = cls._validate_person_ref(input_data.supervisor, "supervisor")

        dept = Department.objects.create(
            plant=plant,
            code=code,
            name=name,
            description=input_data.description or "",
            status=(input_data.status or "ACTIVE").upper(),
            manager=manager,
            supervisor=supervisor,
            status_id=cls._resolve_ref(input_data.status_id),
            department_type_id=cls._resolve_ref(input_data.department_type_id),
        )
        return cls.get(str(dept.id))

    @classmethod
    @transaction.atomic
    def update(cls, department_id: str, input_data) -> Department:
        dept = cls.get(department_id)
        code = (input_data.code or "").strip().upper()
        name = (input_data.name or "").strip()
        if not name:
            raise DepartmentServiceError("name", "REQUIRED", "Name is required")
        if not code:
            raise DepartmentServiceError("code", "REQUIRED", "Code is required")
        plant = cls._resolve_plant(input_data.plant_id)
        if str(dept.plant_id) != str(plant.id) and (
            dept.line_assignments.exists() or dept.resource_groups.exists()
        ):
            raise DepartmentServiceError(
                "plantId",
                "INVALID",
                "Cannot change Plant while linked production lines/resource groups exist.",
            )
        cls._validate_unique_code(code, plant, department_id)
        manager = cls._validate_person_ref(input_data.manager, "manager")
        supervisor = cls._validate_person_ref(input_data.supervisor, "supervisor")

        dept.code = code
        dept.plant = plant
        dept.name = name
        dept.description = input_data.description or ""
        dept.status = (input_data.status or "ACTIVE").upper()
        dept.manager = manager
        dept.supervisor = supervisor
        if input_data.status_id is not None:
            dept.status_id = cls._resolve_ref(input_data.status_id)
        if input_data.department_type_id is not None:
            dept.department_type_id = cls._resolve_ref(input_data.department_type_id)
        dept.save()
        return cls.get(department_id)

    @classmethod
    @transaction.atomic
    def delete(cls, department_id: str) -> Department:
        dept = cls.get(department_id)
        if ResourceGroup.objects.filter(department_id=department_id).exists():
            raise DepartmentServiceError(
                "id",
                "IN_USE_RESOURCE_GROUPS",
                "Cannot delete department while linked resource groups exist. Remove or reassign them first.",
            )
        if RoutingStep.objects.filter(department_id=department_id).exists():
            raise DepartmentServiceError(
                "id",
                "IN_USE_ROUTING",
                "Cannot delete department while active routing steps reference it.",
            )
        dept.delete()
        return dept

    @classmethod
    @transaction.atomic
    def assign_to_lines(cls, department_id: str, production_line_ids: list[str]):
        dept = cls.get(department_id)
        lines = list(ProductionLine.objects.filter(id__in=production_line_ids))
        found_ids = {str(line.id) for line in lines}
        missing = [line_id for line_id in production_line_ids if line_id not in found_ids]
        if missing:
            raise DepartmentServiceError("productionLineIds", "NOT_FOUND", "One or more production lines were not found")
        if any(line.plant_id != dept.plant_id for line in lines):
            raise DepartmentServiceError(
                "productionLineIds",
                "INVALID_PLANT",
                "Department and Production Line must belong to the same Plant.",
            )

        ProductionLineDepartmentAssignment.objects.filter(department=dept).exclude(production_line_id__in=found_ids).delete()
        for index, line in enumerate(lines, start=1):
            ProductionLineDepartmentAssignment.objects.update_or_create(
                production_line=line,
                department=dept,
                defaults={"plant": dept.plant, "sequence": index, "status": "ACTIVE"},
            )
        return cls.get(department_id)

    @classmethod
    @transaction.atomic
    def remove_from_line(cls, department_id: str, production_line_id: str) -> Department:
        dept = cls.get(department_id)
        ProductionLineDepartmentAssignment.objects.filter(
            department_id=department_id,
            production_line_id=production_line_id,
        ).delete()
        return cls.get(str(dept.id))
