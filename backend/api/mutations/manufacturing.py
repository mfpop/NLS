import strawberry
from typing import Optional
from django.contrib.auth import authenticate
from api.types.manufacturing import (
    PlantNode, PlantPayload, PlantInput,
    ProductionLineNode, ProductionLinePayload, ProductionLineInput,
    DepartmentNode, DepartmentPayload, DepartmentInput,
    ResourceGroupNode, ResourceGroupPayload, ResourceGroupInput,
    ResourceNode, ResourcePayload, ResourceInput,
    ProductionLineDepartmentAssignmentNode, AssignmentPayload, AssignDepartmentInput,
    ScheduleNode, SchedulePayload, ScheduleInput,
    ScheduleAssignmentNode, ScheduleAssignmentPayload, ScheduleAssignmentInput,
)
from api.types.auth import LoginInput, AuthPayload, UserNode
from api.auth_utils import encode_jwt
from manufacturing.models import (
    Plant, Department, ProductionLine, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment, Schedule, ScheduleAssignment,
)
from manufacturing.domain.plant_structure_rules import validate_plant_input


@strawberry.type
class ManufacturingMutation:
    @strawberry.mutation
    def login(self, input: LoginInput) -> Optional[AuthPayload]:
        user = authenticate(username=input.username, password=input.password)
        if user is None:
            return None
        try:
            role = user.role_profile.role
        except Exception:
            role = "guest"
        return AuthPayload(
            token=encode_jwt(user.id, role),
            user=UserNode(
                id=str(user.id), username=user.username, email=user.email or "",
                role=role, plant=getattr(user.role_profile, "plant", "") or "",
                department=getattr(user.role_profile, "department", "") or "",
            ),
        )
    @strawberry.mutation
    def create_plant(self, input: PlantInput) -> PlantPayload:
        errors = validate_plant_input(input)
        if errors:
            return PlantPayload(ok=False, errors=errors)
        plant = Plant.objects.create(
            code=input.code, name=input.name, description=input.description or "",
            status=input.status or "ACTIVE", building=input.building or "",
            address=input.address or "", city=input.city or "",
            state=input.state or "", country=input.country or "",
            zipcode=input.zipcode or "", timezone=input.timezone or "",
            latitude=input.latitude or "", longitude=input.longitude or "",
            plant_type=input.plant_type or "", operating_since=input.operating_since or "",
            manager_name=input.manager_name or "", manager_email=input.manager_email or "",
            manager_phone=input.manager_phone or "",
            default_calendar=input.default_calendar or "",
            default_shift_model=input.default_shift_model or "",
            week_start_day=input.week_start_day or "",
            default_schedule=input.default_schedule or "",
            manufacturing_focus=input.manufacturing_focus or "",
        )
        return PlantPayload(ok=True, plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def update_plant(self, id: str, input: PlantInput) -> PlantPayload:
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return PlantPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Plant not found"}])
        for f in ("code", "name", "description", "status", "building", "address", "city", "state", "country", "zipcode", "timezone", "latitude", "longitude", "plant_type", "operating_since", "manager_name", "manager_email", "manager_phone", "default_calendar", "default_shift_model", "week_start_day", "default_schedule", "manufacturing_focus"):
            v = getattr(input, f)
            if v is not None:
                setattr(plant, f, v)
        plant.save()
        return PlantPayload(ok=True, plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def archive_plant(self, id: str) -> PlantPayload:
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return PlantPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Plant not found"}])
        plant.status = "ARCHIVED"
        plant.save()
        return PlantPayload(ok=True, plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def create_production_line(self, input: ProductionLineInput) -> ProductionLinePayload:
        line = ProductionLine.objects.create(
            plant_id=input.plant_id, code=input.code, name=input.name,
            description=input.description or "", status=input.status or "ACTIVE",
            shift_pattern=input.shift_pattern or "", is_constraint=input.is_constraint or False,
        )
        return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))

    @strawberry.mutation
    def update_production_line(self, id: str, input: ProductionLineInput) -> ProductionLinePayload:
        try:
            line = ProductionLine.objects.get(id=id)
        except ProductionLine.DoesNotExist:
            return ProductionLinePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Production line not found"}])
        for f in ("plant_id", "code", "name", "description", "status", "shift_pattern", "is_constraint"):
            v = getattr(input, f)
            if v is not None:
                setattr(line, f, v)
        line.save()
        return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))

    @strawberry.mutation
    def archive_production_line(self, id: str) -> ProductionLinePayload:
        try:
            line = ProductionLine.objects.get(id=id)
        except ProductionLine.DoesNotExist:
            return ProductionLinePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Production line not found"}])
        line.status = "ARCHIVED"
        line.save()
        return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))

    @strawberry.mutation
    def create_department(self, input: DepartmentInput) -> DepartmentPayload:
        dept = Department.objects.create(
            code=input.code, name=input.name, description=input.description or "",
            status=input.status or "ACTIVE", manager=input.manager or "", employees=input.employees or 0,
        )
        return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))

    @strawberry.mutation
    def update_department(self, id: str, input: DepartmentInput) -> DepartmentPayload:
        try:
            dept = Department.objects.get(id=id)
        except Department.DoesNotExist:
            return DepartmentPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Department not found"}])
        for f in ("code", "name", "description", "status", "manager", "employees"):
            v = getattr(input, f)
            if v is not None:
                setattr(dept, f, v)
        dept.save()
        return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))

    @strawberry.mutation
    def archive_department(self, id: str) -> DepartmentPayload:
        try:
            dept = Department.objects.get(id=id)
        except Department.DoesNotExist:
            return DepartmentPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Department not found"}])
        dept.status = "ARCHIVED"
        dept.save()
        return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))

    @strawberry.mutation
    def assign_department_to_production_line(self, input: AssignDepartmentInput) -> AssignmentPayload:
        a, _ = ProductionLineDepartmentAssignment.objects.update_or_create(
            production_line_id=input.production_line_id, department_id=input.department_id,
            defaults={"sequence": input.sequence or 0, "status": input.status or "ACTIVE"},
        )
        return AssignmentPayload(ok=True, assignment=ProductionLineDepartmentAssignmentNode.from_db(a))

    @strawberry.mutation
    def remove_department_from_production_line(self, production_line_id: str, department_id: str) -> AssignmentPayload:
        deleted, _ = ProductionLineDepartmentAssignment.objects.filter(
            production_line_id=production_line_id, department_id=department_id,
        ).delete()
        return AssignmentPayload(ok=deleted > 0)

    @strawberry.mutation
    def create_resource_group(self, input: ResourceGroupInput) -> ResourceGroupPayload:
        rg = ResourceGroup.objects.create(
            department_id=input.department_id, code=input.code or "", name=input.name,
            description=input.description or "", status=input.status or "ACTIVE",
            members=input.members or 0, leader=input.leader or "",
        )
        return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))

    @strawberry.mutation
    def update_resource_group(self, id: str, input: ResourceGroupInput) -> ResourceGroupPayload:
        try:
            rg = ResourceGroup.objects.get(id=id)
        except ResourceGroup.DoesNotExist:
            return ResourceGroupPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Resource group not found"}])
        for f in ("department_id", "code", "name", "description", "status", "members", "leader"):
            v = getattr(input, f)
            if v is not None:
                setattr(rg, f, v)
        rg.save()
        return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))

    @strawberry.mutation
    def archive_resource_group(self, id: str) -> ResourceGroupPayload:
        try:
            rg = ResourceGroup.objects.get(id=id)
        except ResourceGroup.DoesNotExist:
            return ResourceGroupPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Resource group not found"}])
        rg.status = "ARCHIVED"
        rg.save()
        return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))

    @strawberry.mutation
    def create_resource(self, input: ResourceInput) -> ResourcePayload:
        res = Resource.objects.create(
            resource_group_id=input.resource_group_id, code=input.code, name=input.name,
            description=input.description or "", status=input.status or "ACTIVE",
        )
        return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))

    @strawberry.mutation
    def update_resource(self, id: str, input: ResourceInput) -> ResourcePayload:
        try:
            res = Resource.objects.get(id=id)
        except Resource.DoesNotExist:
            return ResourcePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Resource not found"}])
        for f in ("resource_group_id", "code", "name", "description", "status"):
            v = getattr(input, f)
            if v is not None:
                setattr(res, f, v)
        res.save()
        return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))

    @strawberry.mutation
    def archive_resource(self, id: str) -> ResourcePayload:
        try:
            res = Resource.objects.get(id=id)
        except Resource.DoesNotExist:
            return ResourcePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Resource not found"}])
        res.status = "ARCHIVED"
        res.save()
        return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))

    @strawberry.mutation
    def create_schedule(self, input: ScheduleInput) -> SchedulePayload:
        s = Schedule.objects.create(
            code=input.code, name=input.name, description=input.description or "",
            status=input.status or "ACTIVE",
        )
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))

    @strawberry.mutation
    def update_schedule(self, id: str, input: ScheduleInput) -> SchedulePayload:
        try:
            s = Schedule.objects.get(id=id)
        except Schedule.DoesNotExist:
            return SchedulePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Schedule not found"}])
        for f in ("code", "name", "description", "status"):
            v = getattr(input, f)
            if v is not None:
                setattr(s, f, v)
        s.save()
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))

    @strawberry.mutation
    def archive_schedule(self, id: str) -> SchedulePayload:
        try:
            s = Schedule.objects.get(id=id)
        except Schedule.DoesNotExist:
            return SchedulePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Schedule not found"}])
        s.status = "ARCHIVED"
        s.save()
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))

    @strawberry.mutation
    def assign_schedule(self, input: ScheduleAssignmentInput) -> ScheduleAssignmentPayload:
        a = ScheduleAssignment.objects.create(
            entity_type=input.entity_type, entity_id=input.entity_id,
            schedule_id=input.schedule_id, inheritance_mode=input.inheritance_mode or "NONE",
            valid_from=input.valid_from, valid_to=input.valid_to,
        )
        return ScheduleAssignmentPayload(ok=True, assignment=ScheduleAssignmentNode.from_db(a))

    @strawberry.mutation
    def remove_schedule_assignment(self, id: str) -> ScheduleAssignmentPayload:
        deleted, _ = ScheduleAssignment.objects.filter(id=id).delete()
        return ScheduleAssignmentPayload(ok=deleted > 0)
