import strawberry
from typing import Optional

from api.permissions import ensure_access
from api.validators import require_non_empty
from api.types.manufacturing import (
    PlantInput, PlantNode, PlantMutationResult,
    DeletePlantResult, FieldError, DepartmentNode, DepartmentInput,
    DepartmentMutationResult, DeleteDepartmentResult,
    ResourceGroupInput, DeleteResourceGroupResult,
    ProductionLineNode, ResourceGroupNode, ResourceNode, ReferenceTableNode,
    ReferenceTableInput, ReferenceTableMutationResult, DeleteReferenceTableResult,
    ReferenceItemNode, ReferenceItemInput, ReferenceItemMutationResult,
    ProfileNode, ProfileInput, ProfileMutationResult,
    CompanyNode, CompanyInput, CompanyMutationResult,
)
from api.types.auth import LoginInput, AuthPayload, UserNode
from api.auth_utils import encode_jwt
from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable, Profile, Company,
    ReferenceItem,
)
from django.contrib.auth import authenticate


def _user(info):
    return info.context.user


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
        token = encode_jwt(user.id, role)
        return AuthPayload(token=token, user=UserNode.from_user(user))

    @strawberry.mutation
    def create_plant(self, info: strawberry.types.Info, input: PlantInput) -> PlantMutationResult:
        ensure_access(user=_user(info), action="create_plant")
        errors = []

        if not input.name.strip():
            errors.append(FieldError(field="name", message="Plant name is required"))
        if not input.code.strip():
            errors.append(FieldError(field="code", message="Plant code is required"))
        if Plant.objects.filter(code=input.code.strip()).exists():
            errors.append(FieldError(field="code", message=f'Code "{input.code}" is already in use'))

        if errors:
            return PlantMutationResult(errors=errors)

        plant = Plant.objects.create(
            code=input.code.strip(),
            name=input.name.strip(),
            status=input.status or "active",
            building=input.building or "",
            address=input.address or "",
            timezone=input.timezone or "",
            default_calendar_id=input.default_calendar_id,
            default_schedule_id=input.default_schedule_id,
            manager_name=input.manager_name or "",
            manager_email=input.manager_email or "",
            description=input.description or "",
        )
        return PlantMutationResult(plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def update_plant(self, info: strawberry.types.Info, id: str, input: PlantInput) -> PlantMutationResult:
        ensure_access(user=_user(info), action="update_plant")
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return PlantMutationResult(errors=[FieldError(field="id", message="Plant not found")])

        errors = []
        if not input.name.strip():
            errors.append(FieldError(field="name", message="Plant name is required"))
        if not input.code.strip():
            errors.append(FieldError(field="code", message="Plant code is required"))
        if Plant.objects.filter(code=input.code.strip()).exclude(id=id).exists():
            errors.append(FieldError(field="code", message=f'Code "{input.code}" is already in use'))

        if errors:
            return PlantMutationResult(errors=errors)

        plant.code = input.code.strip()
        plant.name = input.name.strip()
        plant.status = input.status or plant.status
        plant.building = input.building or ""
        plant.address = input.address or ""
        plant.timezone = input.timezone or ""
        if input.default_calendar_id is not None:
            plant.default_calendar_id = input.default_calendar_id
        if input.default_schedule_id is not None:
            plant.default_schedule_id = input.default_schedule_id
        plant.manager_name = input.manager_name or ""
        plant.manager_email = input.manager_email or ""
        plant.description = input.description or ""
        plant.save()

        return PlantMutationResult(plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def toggle_plant_status(self, info: strawberry.types.Info, id: str) -> PlantMutationResult:
        ensure_access(user=_user(info), action="toggle_plant_status")
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return PlantMutationResult(errors=[FieldError(field="id", message="Plant not found")])

        plant.status = "inactive" if plant.status == "active" else "active"
        plant.save()
        return PlantMutationResult(plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def delete_plant(self, info: strawberry.types.Info, id: str) -> DeletePlantResult:
        ensure_access(user=_user(info), action="delete_plant")
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return DeletePlantResult(
                success=False, in_use=False,
                message="Plant not found",
                errors=[FieldError(field="id", message="Plant not found")]
            )

        if plant.department_count > 0 or plant.line_count > 0 or plant.group_count > 0 or plant.resource_count > 0:
            return DeletePlantResult(
                success=False, in_use=True,
                message="Plant is in use. Disable instead."
            )

        plant.delete()
        return DeletePlantResult(success=True, in_use=False, message="Plant deleted.")

    @strawberry.mutation
    def rename_plant(self, info: strawberry.types.Info, plant_code: str, name: str) -> str:
        ensure_access(user=_user(info), action="rename_plant")
        cleaned_name = require_non_empty(name, "name")
        return f"Plant {plant_code} renamed to {cleaned_name}"

    # ── Production Line Mutations ──

        # ── Production Line Mutations ──

    @strawberry.mutation
    def create_production_line(self, info: strawberry.types.Info, name: str, code: str, plant_id: str,
                                status: str = "active",
                                models_produced: str = "", shift_pattern: str = "",
                                is_constraint: bool = False) -> ProductionLineNode:
        ensure_access(user=_user(info), action="create_production_line")
        plant = Plant.objects.get(id=plant_id)
        line = ProductionLine.objects.create(
            code=code,
            name=name,
            status=status,
            plant=plant,
            models_produced=models_produced,
            shift_pattern=shift_pattern,
            is_constraint=is_constraint,
        )
        # Update plant line count
        plant.line_count = plant.production_lines.count()
        plant.save()
        return ProductionLineNode.from_db(line)

    @strawberry.mutation
    def update_production_line(self, info: strawberry.types.Info, id: str, name: str, code: str, plant_id: str,
                                status: str = "active", models_produced: str = "",
                                shift_pattern: str = "", is_constraint: bool = False) -> ProductionLineNode:
        ensure_access(user=_user(info), action="update_production_line")
        line = ProductionLine.objects.get(id=id)
        plant = Plant.objects.get(id=plant_id)
        old_plant_id = line.plant_id

        line.code = code
        line.name = name
        line.status = status
        line.plant = plant
        line.models_produced = models_produced
        line.shift_pattern = shift_pattern
        line.is_constraint = is_constraint
        line.save()

        # Update counts on both old and new plants
        if old_plant_id and str(old_plant_id) != str(plant.id):
            old_plant = Plant.objects.get(id=old_plant_id)
            old_plant.line_count = old_plant.production_lines.count()
            old_plant.save()
        plant.line_count = plant.production_lines.count()
        plant.save()

        return ProductionLineNode.from_db(line)

    @strawberry.mutation
    def delete_production_line(self, info: strawberry.types.Info, id: str) -> DeletePlantResult:
        ensure_access(user=_user(info), action="delete_production_line")
        try:
            line = ProductionLine.objects.get(id=id)
        except ProductionLine.DoesNotExist:
            return DeletePlantResult(
                success=False, in_use=False,
                message="Production line not found",
                errors=[FieldError(field="id", message="Not found")]
            )

        plant_id = line.plant_id
        line.delete()

        # Update plant line count
        if plant_id:
            plant = Plant.objects.get(id=plant_id)
            plant.line_count = plant.production_lines.count()
            plant.save()

        return DeletePlantResult(success=True, in_use=False, message="Production line deleted.")

    @strawberry.mutation
    def toggle_production_line_status(self, info: strawberry.types.Info, id: str) -> ProductionLineNode:
        ensure_access(user=_user(info), action="toggle_production_line_status")
        line = ProductionLine.objects.get(id=id)
        line.status = "inactive" if line.status == "active" else "active"
        line.save()
        return ProductionLineNode.from_db(line)

    @strawberry.mutation
    def update_profile(self, info: strawberry.types.Info, input: ProfileInput) -> ProfileMutationResult:
        ensure_access(user=_user(info), action="update_profile")
        profile = Profile.objects.first()
        if not profile:
            profile = Profile.objects.create(name="", role="", email="")

        errors = []
        if not input.name.strip():
            errors.append(FieldError(field="name", message="Name is required"))
        if not input.role.strip():
            errors.append(FieldError(field="role", message="Role is required"))
        if not input.email.strip():
            errors.append(FieldError(field="email", message="Email is required"))
        elif "@" not in input.email:
            errors.append(FieldError(field="email", message="Invalid email format"))
        if input.about and len(input.about) > 500:
            errors.append(FieldError(field="about", message="About text must be 500 characters or less"))
        if errors:
            return ProfileMutationResult(errors=errors)

        profile.name = input.name.strip()
        profile.role = input.role.strip()
        profile.email = input.email.strip()
        profile.phone = (input.phone or "").strip()
        profile.location = (input.location or "").strip()
        profile.plant = (input.plant or "").strip()
        profile.department = (input.department or "").strip()
        profile.reports_to = (input.reports_to or "").strip()
        profile.language = (input.language or "").strip()
        profile.about = (input.about or "").strip()

        if input.work_history is not None:
            profile.work_history = [
                {"id": w.id, "role": w.role, "company": w.company, "period": w.period, "description": w.description}
                for w in input.work_history if w.role.strip() and w.company.strip()
            ]
        if input.education is not None:
            profile.education = [
                {"id": e.id, "degree": e.degree, "school": e.school, "period": e.period}
                for e in input.education if e.degree.strip() and e.school.strip()
            ]

        profile.save()
        return ProfileMutationResult(profile=ProfileNode.from_db(profile))

    @strawberry.mutation
    def create_department(self, info: strawberry.types.Info, input: DepartmentInput) -> DepartmentMutationResult:
        ensure_access(user=_user(info), action="create_department")
        errors = []
        if not input.name.strip():
            errors.append(FieldError(field="name", message="Department name is required"))
        if not input.code.strip():
            errors.append(FieldError(field="code", message="Department code is required"))
        if errors:
            return DepartmentMutationResult(errors=errors)
        dept = Department.objects.create(
            name=input.name.strip(),
            code=input.code.strip(),
            status=input.status,
            manager=(input.manager or "").strip(),
            employees=input.employees or 0,
        )
        return DepartmentMutationResult(department=DepartmentNode.from_db(dept))

    @strawberry.mutation
    def update_department(self, info: strawberry.types.Info, id: str, input: DepartmentInput) -> DepartmentMutationResult:
        ensure_access(user=_user(info), action="update_department")
        try:
            dept = Department.objects.get(id=id)
        except Department.DoesNotExist:
            return DepartmentMutationResult(errors=[FieldError(field="id", message="Department not found")])
        errors = []
        if not input.name.strip():
            errors.append(FieldError(field="name", message="Department name is required"))
        if not input.code.strip():
            errors.append(FieldError(field="code", message="Department code is required"))
        if errors:
            return DepartmentMutationResult(errors=errors)
        dept.name = input.name.strip()
        dept.code = input.code.strip()
        dept.status = input.status
        dept.manager = (input.manager or "").strip()
        dept.employees = input.employees or 0
        dept.save()
        return DepartmentMutationResult(department=DepartmentNode.from_db(dept))

    @strawberry.mutation
    def delete_department(self, info: strawberry.types.Info, id: str) -> DeleteDepartmentResult:
        ensure_access(user=_user(info), action="delete_department")
        try:
            dept = Department.objects.get(id=id)
        except Department.DoesNotExist:
            return DeleteDepartmentResult(success=False, in_use=False, message="Department not found")
        if dept.group_count > 0 or dept.resource_count > 0:
            return DeleteDepartmentResult(success=False, in_use=True, message="Department is in use. Disable instead.")
        dept.delete()
        return DeleteDepartmentResult(success=True, in_use=False, message="Department deleted.")

    @strawberry.mutation
    def create_resource_group(self, info: strawberry.types.Info, name: str, department_id: str,
                              code: str = "", status: str = "active",
                              group_type: Optional[str] = None,
                              members: Optional[int] = None,
                              leader: Optional[str] = None) -> ResourceGroupNode:
        ensure_access(user=_user(info), action="create_department")
        dept = Department.objects.get(id=department_id)
        rg = ResourceGroup.objects.create(
            name=name.strip(),
            code=code.strip() or name.strip()[:4].upper(),
            status=status,
            group_type=group_type or "Production",
            members=members or 0,
            leader=leader or "",
            department=dept,
        )
        return ResourceGroupNode.from_db(rg)

    @strawberry.mutation
    def update_resource_group(self, info: strawberry.types.Info, id: str, input: ResourceGroupInput) -> ResourceGroupNode:
        ensure_access(user=_user(info), action="create_department")
        rg = ResourceGroup.objects.get(id=id)
        rg.name = input.name.strip()
        rg.code = input.code.strip() or input.name.strip()[:4].upper()
        rg.status = input.status
        if input.group_type is not None:
            rg.group_type = input.group_type
        if input.members is not None:
            rg.members = input.members
        if input.leader is not None:
            rg.leader = input.leader
        rg.save()
        return ResourceGroupNode.from_db(rg)

    @strawberry.mutation
    def delete_resource_group(self, info: strawberry.types.Info, id: str) -> DeleteResourceGroupResult:
        ensure_access(user=_user(info), action="create_department")
        try:
            rg = ResourceGroup.objects.get(id=id)
        except ResourceGroup.DoesNotExist:
            return DeleteResourceGroupResult(success=False, message="Resource group not found")
        if rg.resource_count > 0:
            return DeleteResourceGroupResult(success=False, message="Resource group has resources. Remove them first.")
        rg.delete()
        return DeleteResourceGroupResult(success=True, message="Resource group deleted.")

    @strawberry.mutation
    def create_resource(self, info: strawberry.types.Info, name: str, resource_group_id: str,
                        code: str = "", status: str = "active") -> ResourceNode:
        ensure_access(user=_user(info), action="create_department")
        rg = ResourceGroup.objects.get(id=resource_group_id)
        r = Resource.objects.create(
            name=name.strip(),
            code=code.strip() or name.strip()[:4].upper(),
            status=status,
            resource_group=rg,
        )
        return ResourceNode.from_db(r)

    @strawberry.mutation
    def update_company(self, info: strawberry.types.Info, input: CompanyInput) -> CompanyMutationResult:
        ensure_access(user=_user(info), action="manage_settings")
        errors: list[FieldError] = []
        if not input.name.strip():
            errors.append(FieldError(field="name", message="Company name is required"))
        if not input.code.strip():
            errors.append(FieldError(field="code", message="Company code is required"))
        if errors:
            return CompanyMutationResult(errors=errors)

        company, _ = Company.objects.get_or_create(pk=1, defaults={
            "code": input.code.strip(),
            "name": input.name.strip(),
        })
        company.code = input.code.strip()
        company.name = input.name.strip()
        company.address = input.address or ""
        company.phone = input.phone or ""
        company.email = input.email or ""
        company.website = input.website or ""
        company.description = input.description or ""
        company.industry_type = input.industry_type or ""
        company.manufacturing_type = input.manufacturing_type or ""
        company.default_timezone = input.default_timezone or "UTC"
        company.default_units = input.default_units or "Metric"
        company.default_shift_model = input.default_shift_model or ""
        company.production_calendar = input.production_calendar or ""
        company.default_language = input.default_language or "en"
        company.lean_methodology = input.lean_methodology or ""
        company.save()
        return CompanyMutationResult(company=CompanyNode.from_db(company))

    @strawberry.mutation
    def create_reference_table(self, info: strawberry.types.Info, input: ReferenceTableInput) -> ReferenceTableMutationResult:
        ensure_access(user=_user(info), action="manage_settings")
        if not input.name.strip():
            return ReferenceTableMutationResult(errors=[FieldError(field="name", message="Table name is required")])
        table = ReferenceTable.objects.create(
            name=input.name.strip(),
            description=input.description or "",
            status=input.status or "active",
            group=input.group or "",
        )
        return ReferenceTableMutationResult(table=ReferenceTableNode.from_db(table))

    @strawberry.mutation
    def update_reference_table(self, info: strawberry.types.Info, id: str, input: ReferenceTableInput) -> ReferenceTableMutationResult:
        ensure_access(user=_user(info), action="manage_settings")
        try:
            table = ReferenceTable.objects.get(id=id)
        except ReferenceTable.DoesNotExist:
            return ReferenceTableMutationResult(errors=[FieldError(field="id", message="Table not found")])
        if not input.name.strip():
            return ReferenceTableMutationResult(errors=[FieldError(field="name", message="Table name is required")])
        table.name = input.name.strip()
        table.description = input.description or ""
        table.status = input.status or "active"
        table.group = input.group or ""
        table.save()
        return ReferenceTableMutationResult(table=ReferenceTableNode.from_db(table))

    @strawberry.mutation
    def delete_reference_table(self, info: strawberry.types.Info, id: str) -> DeleteReferenceTableResult:
        ensure_access(user=_user(info), action="manage_settings")
        try:
            table = ReferenceTable.objects.get(id=id)
            table.delete()
            return DeleteReferenceTableResult(success=True)
        except ReferenceTable.DoesNotExist:
            return DeleteReferenceTableResult(success=False, errors=[FieldError(field="id", message="Table not found")])

    @strawberry.mutation
    def create_reference_item(self, info: strawberry.types.Info, input: ReferenceItemInput) -> ReferenceItemMutationResult:
        ensure_access(user=_user(info), action="manage_settings")
        errors: list[FieldError] = []
        if not input.code.strip():
            errors.append(FieldError(field="code", message="Code is required"))
        if not input.name.strip():
            errors.append(FieldError(field="name", message="Name is required"))
        if not input.table_type:
            errors.append(FieldError(field="table_type", message="Table type is required"))
        if errors:
            return ReferenceItemMutationResult(errors=errors)
        item = ReferenceItem.objects.create(
            table_type=input.table_type,
            code=input.code.strip(),
            name=input.name.strip(),
            description=input.description or "",
            is_active=input.is_active if input.is_active is not None else True,
            sort_order=input.sort_order or 0,
        )
        return ReferenceItemMutationResult(item=ReferenceItemNode.from_db(item))

    @strawberry.mutation
    def update_reference_item(self, info: strawberry.types.Info, id: str, input: ReferenceItemInput) -> ReferenceItemMutationResult:
        ensure_access(user=_user(info), action="manage_settings")
        try:
            item = ReferenceItem.objects.get(id=id)
        except ReferenceItem.DoesNotExist:
            return ReferenceItemMutationResult(errors=[FieldError(field="id", message="Item not found")])
        if not input.name.strip():
            return ReferenceItemMutationResult(errors=[FieldError(field="name", message="Name is required")])
        item.code = input.code.strip()
        item.name = input.name.strip()
        item.description = input.description or ""
        item.is_active = input.is_active if input.is_active is not None else item.is_active
        item.sort_order = input.sort_order or 0
        item.save()
        return ReferenceItemMutationResult(item=ReferenceItemNode.from_db(item))

    @strawberry.mutation
    def deactivate_reference_item(self, info: strawberry.types.Info, id: str) -> ReferenceItemMutationResult:
        ensure_access(user=_user(info), action="manage_settings")
        try:
            item = ReferenceItem.objects.get(id=id)
            item.is_active = False
            item.save()
            return ReferenceItemMutationResult(item=ReferenceItemNode.from_db(item))
        except ReferenceItem.DoesNotExist:
            return ReferenceItemMutationResult(errors=[FieldError(field="id", message="Item not found")])

