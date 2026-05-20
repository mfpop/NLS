import strawberry
import typing
from datetime import datetime
from manufacturing.models.lineage import (
    ErpSourceDefinition, ErpDefinitionField, ErpRelationshipDefinition,
    ErpImportBatch, ErpStagingRow, ErpValidationResult, ErpImportLog,
)
from api.types.pagination import PageInfo, paginate_queryset


def _iso(dt: typing.Optional[datetime]) -> str:
    return dt.isoformat() if dt else ""


# ── Inputs ──────────────────────────────────────────────────────────────

@strawberry.input
class ErpSourceDefinitionInput:
    name: str
    scope: str
    source_type: typing.Optional[str] = "MANUAL"
    destination_table: typing.Optional[str] = ""
    expected_file_pattern: typing.Optional[str] = ""
    active: typing.Optional[bool] = True
    status: typing.Optional[str] = "DRAFT"
    schema_json: typing.Optional[strawberry.scalars.JSON] = None
    row_count: typing.Optional[int] = 0


@strawberry.input
class ErpSourceDefinitionUpdateInput:
    name: typing.Optional[str] = None
    scope: typing.Optional[str] = None
    source_type: typing.Optional[str] = None
    destination_table: typing.Optional[str] = None
    expected_file_pattern: typing.Optional[str] = None
    active: typing.Optional[bool] = None
    status: typing.Optional[str] = None
    schema_json: typing.Optional[strawberry.scalars.JSON] = None
    row_count: typing.Optional[int] = None


@strawberry.input
class ErpDefinitionFieldInput:
    field_name: str
    data_type: typing.Optional[str] = "string"
    required: typing.Optional[bool] = False
    primary_key: typing.Optional[bool] = False
    foreign_key: typing.Optional[bool] = False
    nexus_field: typing.Optional[str] = ""
    aliases_json: typing.Optional[strawberry.scalars.JSON] = None
    active: typing.Optional[bool] = True


@strawberry.input
class ErpRelationshipDefinitionInput:
    source_field: str
    target_source_definition_id: str
    target_field: str
    relationship_type: str
    required: typing.Optional[bool] = False
    active: typing.Optional[bool] = True


# ── Nodes ───────────────────────────────────────────────────────────────

@strawberry.type
class ErpSourceDefinitionNode:
    id: strawberry.ID
    name: str
    scope: str
    source_type: str
    destination_table: str
    expected_file_pattern: str
    active: bool
    status: str
    schema_json: strawberry.scalars.JSON
    row_count: int
    last_imported_at: typing.Optional[str]
    created_at: str
    updated_at: str
    field_count: int = 0

    @classmethod
    def from_db(cls, obj: ErpSourceDefinition) -> "ErpSourceDefinitionNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            scope=obj.scope,
            source_type=obj.source_type,
            destination_table=obj.destination_table or "",
            expected_file_pattern=obj.expected_file_pattern or "",
            active=obj.active,
            status=obj.status,
            schema_json=obj.schema_json or {},
            row_count=obj.row_count,
            last_imported_at=_iso(obj.last_imported_at) if obj.last_imported_at else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
            field_count=getattr(obj, "_field_count", 0),
        )


@strawberry.type
class ErpStructureFileNode:
    """A source definition loaded from erp_data/structure/*.json."""
    name: str
    scope: str
    source_type: str
    destination_table: str
    expected_file_pattern: str
    active: bool
    status: str
    fields: strawberry.scalars.JSON
    relationships: strawberry.scalars.JSON
    file_name: str


@strawberry.type
class ErpDefinitionFieldNode:
    id: strawberry.ID
    source_definition_id: strawberry.ID
    field_name: str
    data_type: str
    required: bool
    primary_key: bool
    foreign_key: bool
    nexus_field: str
    aliases_json: strawberry.scalars.JSON
    active: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_db(cls, obj: ErpDefinitionField) -> "ErpDefinitionFieldNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            source_definition_id=strawberry.ID(str(obj.source_definition_id)),
            field_name=obj.field_name,
            data_type=obj.data_type or "string",
            required=obj.required,
            primary_key=obj.primary_key,
            foreign_key=obj.foreign_key,
            nexus_field=obj.nexus_field or "",
            aliases_json=obj.aliases_json or [],
            active=obj.active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ErpRelationshipDefinitionNode:
    id: strawberry.ID
    source_definition_id: strawberry.ID
    source_field: str
    target_source_definition_id: strawberry.ID
    target_field: str
    relationship_type: str
    required: bool
    active: bool
    created_at: str
    updated_at: str
    target_name: str = ""

    @classmethod
    def from_db(cls, obj: ErpRelationshipDefinition) -> "ErpRelationshipDefinitionNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            source_definition_id=strawberry.ID(str(obj.source_definition_id)),
            source_field=obj.source_field,
            target_source_definition_id=strawberry.ID(str(obj.target_source_definition_id)),
            target_field=obj.target_field,
            relationship_type=obj.relationship_type,
            required=obj.required,
            active=obj.active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
            target_name=getattr(obj, "_target_name", ""),
        )


@strawberry.type
class ErpImportBatchNode:
    id: strawberry.ID
    source_definition_id: strawberry.ID
    file_name: str
    file_hash: str
    imported_by: str
    imported_at: str
    mode: str
    status: str
    row_count: int
    error_message: str
    created_at: str

    @classmethod
    def from_db(cls, obj: ErpImportBatch) -> "ErpImportBatchNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            source_definition_id=strawberry.ID(str(obj.source_definition_id)),
            file_name=obj.file_name,
            file_hash=obj.file_hash or "",
            imported_by=obj.imported_by or "",
            imported_at=_iso(obj.imported_at),
            mode=obj.mode,
            status=obj.status,
            row_count=obj.row_count,
            error_message=obj.error_message or "",
            created_at=_iso(obj.created_at),
        )


@strawberry.type
class ErpStagingRowNode:
    id: strawberry.ID
    batch_id: strawberry.ID
    source_definition_id: strawberry.ID
    row_number: int
    raw_data_json: strawberry.scalars.JSON
    normalized_data_json: strawberry.scalars.JSON
    validation_status: str
    created_at: str

    @classmethod
    def from_db(cls, obj: ErpStagingRow) -> "ErpStagingRowNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            batch_id=strawberry.ID(str(obj.batch_id)),
            source_definition_id=strawberry.ID(str(obj.source_definition_id)),
            row_number=obj.row_number,
            raw_data_json=obj.raw_data_json or {},
            normalized_data_json=obj.normalized_data_json or {},
            validation_status=obj.validation_status or "",
            created_at=_iso(obj.created_at),
        )


@strawberry.type
class ErpValidationResultNode:
    id: strawberry.ID
    scope: str
    source_definition_id: strawberry.ID
    destination_table: str
    severity: str
    entity: str
    field_name: str
    row_number: typing.Optional[int]
    rule_code: str
    message: str
    recommended_action: str
    created_at: str

    @classmethod
    def from_db(cls, obj: ErpValidationResult) -> "ErpValidationResultNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            scope=obj.scope,
            source_definition_id=strawberry.ID(str(obj.source_definition_id)),
            destination_table=obj.destination_table or "",
            severity=obj.severity,
            entity=obj.entity or "",
            field_name=obj.field_name or "",
            row_number=obj.row_number,
            rule_code=obj.rule_code,
            message=obj.message,
            recommended_action=obj.recommended_action or "",
            created_at=_iso(obj.created_at),
        )


@strawberry.type
class ErpImportLogNode:
    id: strawberry.ID
    batch_id: strawberry.ID
    event_type: str
    message: str
    user: str
    metadata_json: strawberry.scalars.JSON
    created_at: str

    @classmethod
    def from_db(cls, obj: ErpImportLog) -> "ErpImportLogNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            batch_id=strawberry.ID(str(obj.batch_id)),
            event_type=obj.event_type,
            message=obj.message or "",
            user=obj.user or "",
            metadata_json=obj.metadata_json or {},
            created_at=_iso(obj.created_at),
        )


# ── Paginated / Payload types ──────────────────────────────────────────

@strawberry.type
class ErpSourceDefinitionsResult:
    items: list[ErpSourceDefinitionNode]
    page_info: PageInfo


@strawberry.type
class ErpDefinitionFieldsResult:
    items: list[ErpDefinitionFieldNode]
    page_info: PageInfo


@strawberry.type
class ErpRelationshipDefinitionsResult:
    items: list[ErpRelationshipDefinitionNode]
    page_info: PageInfo


@strawberry.type
class ErpStagingRowsResult:
    items: list[ErpStagingRowNode]
    page_info: PageInfo


@strawberry.type
class ErpValidationResultsResult:
    items: list[ErpValidationResultNode]
    page_info: PageInfo


@strawberry.type
class ErpImportBatchesResult:
    items: list[ErpImportBatchNode]
    page_info: PageInfo


@strawberry.type
class LineageError:
    field: str
    code: str
    message: str


@strawberry.type
class ErpSourceDefinitionPayload:
    ok: bool
    definition: typing.Optional[ErpSourceDefinitionNode] = None
    errors: typing.Optional[list[LineageError]] = None


@strawberry.type
class ErpDefinitionFieldPayload:
    ok: bool
    field: typing.Optional[ErpDefinitionFieldNode] = None
    errors: typing.Optional[list[LineageError]] = None


@strawberry.type
class ErpRelationshipDefinitionPayload:
    ok: bool
    relationship: typing.Optional[ErpRelationshipDefinitionNode] = None
    errors: typing.Optional[list[LineageError]] = None


@strawberry.type
class ErpDeletePayload:
    ok: bool
    errors: typing.Optional[list[LineageError]] = None


@strawberry.type
class ErpValidationPayload:
    ok: bool
    results: list[ErpValidationResultNode]
    total_errors: int = 0
    total_warnings: int = 0
    total_info: int = 0
    errors: typing.Optional[list[LineageError]] = None


@strawberry.type
class ErpLineageValidationSummary:
    scope: str
    source_definition_name: str
    destination_table: str
    status: str
    total_issues: int
    errors: int
    warnings: int
    info: int
    last_validated_at: typing.Optional[str]


@strawberry.type
class ErpGraphFieldNode:
    name: str
    data_type: str
    required: bool
    primary_key: bool
    foreign_key: bool
    nexus_field: str
    validation_state: str = "none"


@strawberry.type
class ErpGraphTableNode:
    id: strawberry.ID
    name: str
    fields: list[ErpGraphFieldNode]


@strawberry.type
class ErpGraphRelationshipNode:
    id: strawberry.ID
    source_table_id: strawberry.ID
    source_field: str
    target_table_id: strawberry.ID
    target_field: str
    cardinality: str = "ONE_TO_ONE"
    required: bool = False
    status: str = "unknown"


@strawberry.type
class ErpRelationshipGraphResult:
    tables: list[ErpGraphTableNode]
    relationships: list[ErpGraphRelationshipNode]
    validation_state: str = "unknown"


@strawberry.type
class ErpRelationshipValidationNode:
    id: strawberry.ID
    status: str
    matched_count: int = 0
    missing_count: int = 0
    duplicate_source_count: int = 0
    duplicate_target_count: int = 0
    orphan_count: int = 0
    issues: list[ErpValidationResultNode]


@strawberry.type
class ErpFieldProfile:
    field_name: str
    distinct_values: int
    null_count: int
    duplicate_count: int
    sample_values: list[str]
    nexus_field: str
    invalid_values: list[str]


# ── Relationship Graph Types ──────────────────────────────────────────

@strawberry.type
class ErpRelationshipGraphNodeItem:
    id: str
    name: str
    source_type: str
    active: bool

@strawberry.type
class ErpRelationshipGraphFieldItem:
    id: str
    entity_id: str
    field_name: str
    primary_key: bool
    foreign_key: bool
    required: bool
    nexus_field: str
    data_type: str

@strawberry.type
class ErpRelationshipGraphRelItem:
    id: str
    source_entity: str
    source_field: str
    target_entity: str
    target_field: str
    cardinality: str
    required: bool
    status: str

@strawberry.type
class ErpRelationshipGraphValidationState:
    status: str
    issues: list[str]

@strawberry.type
class ErpRelationshipGraph:
    nodes: list[ErpRelationshipGraphNodeItem]
    fields: list[ErpRelationshipGraphFieldItem]
    relationships: list[ErpRelationshipGraphRelItem]
    validation_state: ErpRelationshipGraphValidationState

@strawberry.type
class ErpRelationshipValidationIssue:
    severity: str
    table: str
    field: str
    source_row: typing.Optional[int]
    message: str
    rule_code: str
    recommended_action: str

@strawberry.type
class ErpRelationshipValidation:
    status: str
    matched_count: int
    missing_count: int
    duplicate_source_count: int
    duplicate_target_count: int
    orphan_count: int
    issues: list[ErpRelationshipValidationIssue]

@strawberry.type
class SaveErpRelationshipDefinitionPayload:
    ok: bool
    errors: typing.Optional[list[LineageError]] = None
