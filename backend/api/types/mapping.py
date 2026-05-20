import typing
import strawberry

from api.types.manufacturing import MutationError
from manufacturing.models.mapping_profile import ImportProfile, ImportFieldMapping


@strawberry.type
class ImportProfileNode:
    id: strawberry.ID
    name: str
    domain: str
    version: int
    is_active: bool = strawberry.field(name="isActive")
    created_by: str = strawberry.field(name="createdBy", default="")
    notes: str = ""
    created_at: str = strawberry.field(name="createdAt")

    @classmethod
    def from_db(cls, obj: ImportProfile) -> "ImportProfileNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            domain=obj.domain,
            version=obj.version,
            is_active=obj.is_active,
            created_by=obj.created_by or "",
            notes=obj.notes or "",
            created_at=obj.created_at.isoformat() if obj.created_at else "",
        )


@strawberry.type
class ImportFieldMappingNode:
    id: strawberry.ID
    profile_id: strawberry.ID = strawberry.field(name="profileId")
    entity_type: str = strawberry.field(name="entityType")
    source_column: str = strawberry.field(name="sourceColumn")
    target_field: str = strawberry.field(name="targetField")
    transform_rule: typing.Optional[str] = strawberry.field(name="transformRule", default=None)
    is_required: bool = strawberry.field(name="isRequired")
    sort_order: int = strawberry.field(name="sortOrder")

    @classmethod
    def from_db(cls, obj: ImportFieldMapping) -> "ImportFieldMappingNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            profile_id=strawberry.ID(str(obj.profile_id)),
            entity_type=obj.entity_type,
            source_column=obj.source_column,
            target_field=obj.target_field,
            transform_rule=obj.transform_rule,
            is_required=obj.is_required,
            sort_order=obj.sort_order,
        )


@strawberry.input
class SaveFieldMappingInput:
    profile_id: str = strawberry.field(name="profileId")
    entity_type: str = strawberry.field(name="entityType")
    source_column: str = strawberry.field(name="sourceColumn")
    target_field: str = strawberry.field(name="targetField")
    is_required: bool = False


@strawberry.type
class DetectedColumnType:
    column_name: str = strawberry.field(name="columnName")
    sample_values: list[str] = strawberry.field(name="sampleValues", default_factory=list)
    detected_type: str = strawberry.field(name="detectedType")
    null_count: int = strawberry.field(name="nullCount", default=0)
    total_rows: int = strawberry.field(name="totalRows", default=0)
    sheet_name: str = strawberry.field(name="sheetName", default="")


@strawberry.type
class MappingValidationIssueType:
    entity_type: str = strawberry.field(name="entityType")
    source_column: str = strawberry.field(name="sourceColumn", default="")
    target_field: typing.Optional[str] = strawberry.field(name="targetField", default=None)
    severity: str
    code: str
    message: str


@strawberry.type
class MappingValidationResultType:
    ok: bool
    issues: list[MappingValidationIssueType] = strawberry.field(default_factory=list)
    blocking_error_count: int = strawberry.field(name="blockingErrorCount")

    @classmethod
    def from_dataclass(cls, result) -> "MappingValidationResultType":
        return cls(
            ok=result.ok,
            blocking_error_count=len(result.blocking_errors),
            issues=[
                MappingValidationIssueType(
                    entity_type=i.entity_type,
                    source_column=i.source_column,
                    target_field=i.target_field,
                    severity=i.severity,
                    code=i.code,
                    message=i.message,
                )
                for i in result.issues
            ],
        )


@strawberry.type
class ResultTreeNodeType:
    entity_type: str = strawberry.field(name="entityType")
    entity_key: str = strawberry.field(name="entityKey")
    children: list["ResultTreeNodeType"] = strawberry.field(default_factory=list)
    action: str = "UNCHANGED"
    details_json: str = strawberry.field(name="detailsJson", default="{}")

    @classmethod
    def from_dataclass(cls, node) -> "ResultTreeNodeType":
        import json
        return cls(
            entity_type=node.entity_type,
            entity_key=node.entity_key,
            action=node.action,
            details_json=json.dumps(node.details),
            children=[cls.from_dataclass(c) for c in node.children],
        )


@strawberry.type
class CompareRowType:
    entity_type: str = strawberry.field(name="entityType")
    entity_key: str = strawberry.field(name="entityKey")
    action: str
    incoming_json: str = strawberry.field(name="incomingJson")
    existing_json: typing.Optional[str] = strawberry.field(name="existingJson", default=None)
    diffs_json: str = strawberry.field(name="diffsJson", default="[]")

    @classmethod
    def from_dataclass(cls, row) -> "CompareRowType":
        import json
        return cls(
            entity_type=row.entity_type,
            entity_key=row.entity_key,
            action=row.action,
            incoming_json=json.dumps(row.incoming),
            existing_json=json.dumps(row.existing) if row.existing else None,
            diffs_json=json.dumps(row.diffs),
        )


@strawberry.type
class ImportProfilePayload:
    ok: bool
    profile: typing.Optional[ImportProfileNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class ImportFieldMappingPayload:
    ok: bool
    mapping: typing.Optional[ImportFieldMappingNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class ExportMappingType:
    entity_type: str = strawberry.field(name="entityType")
    source_column: str = strawberry.field(name="sourceColumn")
    target_field: str = strawberry.field(name="targetField")
    is_required: bool = strawberry.field(name="isRequired")
    transform_rule: typing.Optional[str] = strawberry.field(name="transformRule", default=None)
