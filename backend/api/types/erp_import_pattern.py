import typing
import strawberry

from api.types.manufacturing import MutationError
from manufacturing.models.erp_import_pattern import ErpImportPattern, ErpImportPatternFieldMapping


@strawberry.type
class ErpImportPatternNode:
    id: strawberry.ID
    name: str
    description: str = ""
    scope: str
    destination_entity: str = strawberry.field(name="destinationEntity")
    is_active: bool = strawberry.field(name="isActive")
    created_by: str = strawberry.field(name="createdBy", default="")
    source_file_pattern: str = strawberry.field(name="sourceFilePattern", default="")
    source_file_type: str = strawberry.field(name="sourceFileType", default="")
    plant_selection_json: str = strawberry.field(name="plantSelectionJson", default="{}")
    department_selection_json: str = strawberry.field(name="departmentSelectionJson", default="{}")
    resource_group_selection_json: str = strawberry.field(name="resourceGroupSelectionJson", default="{}")
    source_schema_json: str = strawberry.field(name="sourceSchemaJson", default="[]")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")
    field_count: int = strawberry.field(name="fieldCount", default=0)

    @classmethod
    def from_db(cls, obj: ErpImportPattern, field_count: int = 0) -> "ErpImportPatternNode":
        import json
        return cls(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            description=obj.description or "",
            scope=obj.scope,
            destination_entity=obj.destination_entity,
            is_active=obj.is_active,
            created_by=obj.created_by or "",
            source_file_pattern=obj.source_file_pattern or "",
            source_file_type=obj.source_file_type or "",
            plant_selection_json=json.dumps(obj.plant_selection or {"mode": "all"}),
            department_selection_json=json.dumps(obj.department_selection or {"mode": "all"}),
            resource_group_selection_json=json.dumps(obj.resource_group_selection or {"mode": "all"}),
            source_schema_json=json.dumps(obj.source_schema or []),
            created_at=obj.created_at.isoformat() if obj.created_at else "",
            updated_at=obj.updated_at.isoformat() if obj.updated_at else "",
            field_count=field_count,
        )


@strawberry.type
class ErpImportPatternFieldMappingNode:
    id: strawberry.ID
    pattern_id: strawberry.ID = strawberry.field(name="patternId")
    source_name: str = strawberry.field(name="sourceName")
    source_data_type: str = strawberry.field(name="sourceDataType")
    destination_name: str = strawberry.field(name="destinationName")
    destination_data_type: str = strawberry.field(name="destinationDataType")
    is_required: bool = strawberry.field(name="isRequired")
    sort_order: int = strawberry.field(name="sortOrder")

    @classmethod
    def from_db(cls, obj: ErpImportPatternFieldMapping) -> "ErpImportPatternFieldMappingNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            pattern_id=strawberry.ID(str(obj.pattern_id)),
            source_name=obj.source_name,
            source_data_type=obj.source_data_type,
            destination_name=obj.destination_name,
            destination_data_type=obj.destination_data_type,
            is_required=obj.is_required,
            sort_order=obj.sort_order,
        )


@strawberry.type
class ErpImportPatternPayload:
    ok: bool
    pattern: typing.Optional[ErpImportPatternNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class FieldMappingPayload:
    ok: bool
    mapping: typing.Optional[ErpImportPatternFieldMappingNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class PatternValidationIssueType:
    source_name: str = strawberry.field(name="sourceName", default="")
    destination_name: str = strawberry.field(name="destinationName", default="")
    severity: str
    code: str
    message: str


@strawberry.type
class PatternValidationResultType:
    ok: bool
    issues: list[PatternValidationIssueType] = strawberry.field(default_factory=list)
    blocking_error_count: int = strawberry.field(name="blockingErrorCount")

    @classmethod
    def from_dataclass(cls, result) -> "PatternValidationResultType":
        return cls(
            ok=result.ok,
            blocking_error_count=len([i for i in result.issues if i.severity == "error"]),
            issues=[
                PatternValidationIssueType(
                    source_name=i.source_name,
                    destination_name=i.destination_name,
                    severity=i.severity,
                    code=i.code,
                    message=i.message,
                )
                for i in result.issues
            ],
        )


@strawberry.type
class ScopeOption:
    value: str
    label: str


@strawberry.type
class DestinationOption:
    entity: str
    scope: str
    available: bool


@strawberry.input
class FieldMappingInput:
    source_name: str = strawberry.field(name="sourceName")
    source_data_type: str = strawberry.field(name="sourceDataType", default="string")
    destination_name: str = strawberry.field(name="destinationName")
    destination_data_type: str = strawberry.field(name="destinationDataType", default="string")
    is_required: bool = strawberry.field(name="isRequired", default=False)
    sort_order: int = strawberry.field(name="sortOrder", default=0)
