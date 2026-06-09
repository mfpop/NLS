"""GraphQL inputs for manufacturing structure entities.

Company, Plant, Department, ResourceGroup, Resource, ProductionLine,
and their assignment inputs.
"""

import typing
import strawberry


# ── Company ──

@strawberry.input
class CompanyInput:
    code: typing.Optional[str] = None
    name: typing.Optional[str] = None
    legal_name: typing.Optional[str] = strawberry.field(name="legalName", default=None)
    description: typing.Optional[str] = None
    industry_type: typing.Optional[str] = strawberry.field(name="industryType", default=None)
    industry_type_id: typing.Optional[str] = strawberry.field(name="industryTypeId", default=None)
    status: typing.Optional[str] = None
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    address: typing.Optional[str] = None
    city: typing.Optional[str] = None
    state: typing.Optional[str] = None
    country: typing.Optional[str] = None
    country_id: typing.Optional[str] = strawberry.field(name="countryId", default=None)
    phone: typing.Optional[str] = None
    email: typing.Optional[str] = None
    website: typing.Optional[str] = None
    operating_since: typing.Optional[str] = strawberry.field(name="operatingSince", default=None)
    manufacturing_focus: typing.Optional[str] = strawberry.field(name="manufacturingFocus", default=None)
    product_lines: typing.Optional[str] = strawberry.field(name="productLines", default=None)
    lean_methodology: typing.Optional[str] = strawberry.field(name="leanMethodology", default=None)
    default_timezone: typing.Optional[str] = strawberry.field(name="defaultTimezone", default=None)
    default_timezone_id: typing.Optional[str] = strawberry.field(name="defaultTimezoneId", default=None)
    default_language: typing.Optional[str] = strawberry.field(name="defaultLanguage", default=None)
    default_language_id: typing.Optional[str] = strawberry.field(name="defaultLanguageId", default=None)
    default_calendar: typing.Optional[str] = strawberry.field(name="defaultCalendar", default=None)
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    default_shift_model: typing.Optional[str] = strawberry.field(name="defaultShiftModel", default=None)
    default_shift_model_id: typing.Optional[str] = strawberry.field(name="defaultShiftModelId", default=None)
    week_start_day: typing.Optional[str] = strawberry.field(name="weekStartDay", default=None)
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    admin_name: typing.Optional[str] = strawberry.field(name="adminName", default=None)
    admin_role: typing.Optional[str] = strawberry.field(name="adminRole", default=None)
    zipcode: typing.Optional[str] = None
    manufacturing_focus_ids: typing.Optional[list[str]] = strawberry.field(name="manufacturingFocusIds", default=None)
    product_line_ids: typing.Optional[list[str]] = strawberry.field(name="productLineIds", default=None)
    lean_methodology_ids: typing.Optional[list[str]] = strawberry.field(name="leanMethodologyIds", default=None)


# ── Plant ──

@strawberry.input
class PlantInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    building: typing.Optional[str] = ""
    address: typing.Optional[str] = ""
    city: typing.Optional[str] = ""
    state: typing.Optional[str] = ""
    country: typing.Optional[str] = ""
    country_id: typing.Optional[str] = strawberry.field(name="countryId", default=None)
    zipcode: typing.Optional[str] = ""
    timezone: typing.Optional[str] = ""
    timezone_id: typing.Optional[str] = strawberry.field(name="timezoneId", default=None)
    latitude: typing.Optional[str] = ""
    longitude: typing.Optional[str] = ""
    plant_type: typing.Optional[str] = strawberry.field(name="plantType", default="")
    plant_type_id: typing.Optional[str] = strawberry.field(name="plantTypeId", default=None)
    operating_since: typing.Optional[str] = strawberry.field(name="operatingSince", default="")
    manager_name: typing.Optional[str] = strawberry.field(name="managerName", default="")
    manager_email: typing.Optional[str] = strawberry.field(name="managerEmail", default="")
    manager_phone: typing.Optional[str] = strawberry.field(name="managerPhone", default="")
    default_calendar: typing.Optional[str] = strawberry.field(name="defaultCalendar", default="")
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    default_shift_model: typing.Optional[str] = strawberry.field(name="defaultShiftModel", default="")
    default_shift_model_id: typing.Optional[str] = strawberry.field(name="defaultShiftModelId", default=None)
    week_start_day: typing.Optional[str] = strawberry.field(name="weekStartDay", default="")
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    default_schedule: typing.Optional[str] = strawberry.field(name="defaultSchedule", default="")
    default_schedule_id: typing.Optional[str] = strawberry.field(name="defaultScheduleId", default=None)
    manufacturing_focus: typing.Optional[str] = strawberry.field(name="manufacturingFocus", default="")
    manufacturing_focus_ids: typing.Optional[list[str]] = strawberry.field(name="manufacturingFocusIds", default=None)


# ── ProductionLine ──

@strawberry.input
class ProductionLineInput:
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    line_type_id: typing.Optional[str] = strawberry.field(name="lineTypeId", default=None)
    shift_pattern: typing.Optional[str] = strawberry.field(name="shiftPattern", default="")
    shift_pattern_id: typing.Optional[str] = strawberry.field(name="shiftPatternId", default=None)
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    timezone_id: typing.Optional[str] = strawberry.field(name="timezoneId", default=None)
    capacity_basis: typing.Optional[str] = strawberry.field(name="capacityBasis", default="")
    capacity_uom_id: typing.Optional[str] = strawberry.field(name="capacityUomId", default=None)
    bottleneck_resource_group_id: typing.Optional[str] = strawberry.field(name="bottleneckResourceGroupId", default=None)
    is_constraint: typing.Optional[bool] = strawberry.field(name="isConstraint", default=False)
    product_family_id: typing.Optional[str] = strawberry.field(name="productFamilyId", default=None)
    product_model_ids: typing.Optional[list[str]] = strawberry.field(name="productModelIds", default=None)
    primary_product_model_id: typing.Optional[str] = strawberry.field(name="primaryProductModelId", default=None)


# ── Department ──

@strawberry.input
class DepartmentInput:
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    manager: typing.Optional[str] = ""
    supervisor: typing.Optional[str] = ""
    employees: typing.Optional[int] = 0
    department_type_id: typing.Optional[str] = strawberry.field(name="departmentTypeId", default=None)


# ── ResourceGroup ──

@strawberry.input
class ResourceGroupInput:
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    code: typing.Optional[str] = ""
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    members: typing.Optional[int] = 0
    leader: typing.Optional[str] = ""
    supervisor: typing.Optional[str] = ""
    group_type_id: typing.Optional[str] = strawberry.field(name="groupTypeId", default=None)
    capability_type: typing.Optional[str] = strawberry.field(name="capabilityType", default="SHARED")
    shift_pattern_id: typing.Optional[str] = strawberry.field(name="shiftPatternId", default=None)
    capacity_model: typing.Optional[str] = strawberry.field(name="capacityModel", default="")
    oee_target: typing.Optional[float] = strawberry.field(name="oeeTarget", default=None)
    is_bottleneck: typing.Optional[bool] = strawberry.field(name="isBottleneck", default=False)
    is_constraint: typing.Optional[bool] = strawberry.field(name="isConstraint", default=False)


# ── Resource ──

@strawberry.input
class ResourceInput:
    resource_group_id: strawberry.ID = strawberry.field(name="resourceGroupId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    resource_type_id: typing.Optional[str] = strawberry.field(name="resourceTypeId", default=None)
    capability_ids: typing.Optional[list[str]] = strawberry.field(name="capabilityIds", default=None)


# ── Assignment Inputs ──

@strawberry.input
class AssignDepartmentInput:
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    sequence: typing.Optional[int] = 0
    status: typing.Optional[str] = "ACTIVE"


@strawberry.input
class AssignDepartmentToLinesInput:
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    production_line_ids: list[str] = strawberry.field(name="productionLineIds")
