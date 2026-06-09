import typing
import strawberry

from api.common.errors import MutationError
from manufacturing.domain.plant_structure_compare_service import CompareRow, FieldDifference


@strawberry.type
class PlantStructureFieldDifferenceType:
    field: str
    excel_value: str = strawberry.field(name="excelValue")
    app_value: str = strawberry.field(name="appValue")

    @classmethod
    def from_dataclass(cls, fd: FieldDifference) -> "PlantStructureFieldDifferenceType":
        return cls(field=fd.field, excel_value=fd.excel_value, app_value=fd.app_value)


@strawberry.type
class PlantStructureCompareRowType:
    sheet: str
    row_number: int = strawberry.field(name="rowNumber")
    entity_type: str = strawberry.field(name="entityType")
    business_key: str = strawberry.field(name="businessKey")
    status: str
    field_differences: list[PlantStructureFieldDifferenceType] = strawberry.field(name="fieldDifferences", default_factory=list)
    message: str = ""

    @classmethod
    def from_dataclass(cls, cr: CompareRow) -> "PlantStructureCompareRowType":
        return cls(
            sheet=cr.sheet,
            row_number=cr.row_number,
            entity_type=cr.entity_type,
            business_key=cr.business_key,
            status=cr.status,
            field_differences=[PlantStructureFieldDifferenceType.from_dataclass(fd) for fd in cr.field_differences],
            message=cr.message,
        )


@strawberry.type
class PlantStructureImportResultType:
    ok: bool
    validation_errors: list[MutationError] = strawberry.field(name="validationErrors", default_factory=list)
    compare_rows: list[PlantStructureCompareRowType] = strawberry.field(name="compareRows", default_factory=list)
    companies_created: int = strawberry.field(name="companiesCreated", default=0)
    companies_updated: int = strawberry.field(name="companiesUpdated", default=0)
    plants_created: int = strawberry.field(name="plantsCreated", default=0)
    plants_updated: int = strawberry.field(name="plantsUpdated", default=0)
    lines_created: int = strawberry.field(name="linesCreated", default=0)
    lines_updated: int = strawberry.field(name="linesUpdated", default=0)
    departments_created: int = strawberry.field(name="departmentsCreated", default=0)
    departments_updated: int = strawberry.field(name="departmentsUpdated", default=0)
    assignments_created: int = strawberry.field(name="assignmentsCreated", default=0)
    assignments_updated: int = strawberry.field(name="assignmentsUpdated", default=0)
    resource_groups_created: int = strawberry.field(name="resourceGroupsCreated", default=0)
    resource_groups_updated: int = strawberry.field(name="resourceGroupsUpdated", default=0)
    resources_created: int = strawberry.field(name="resourcesCreated", default=0)
    resources_updated: int = strawberry.field(name="resourcesUpdated", default=0)
    total_created: int = strawberry.field(name="totalCreated", default=0)
    total_updated: int = strawberry.field(name="totalUpdated", default=0)
