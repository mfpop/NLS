import typing
import strawberry
from datetime import datetime

from api.types.manufacturing import MutationError
from api.types.pagination import PageInfo
from manufacturing.models import (
    ImportJob, ImportValidationError, MappingRule,
)


# ── Helper ──

def _iso(dt: datetime | None) -> str:
    return dt.isoformat() if dt else ""

@strawberry.type
class ImportJobNode:
    id: strawberry.ID
    source_config_id: strawberry.ID = strawberry.field(name="sourceConfigId")
    domain: str
    file_name: str = strawberry.field(name="fileName")
    file_path: str = strawberry.field(name="filePath")
    file_size: typing.Optional[int] = strawberry.field(name="fileSize", default=None)
    file_hash: typing.Optional[str] = strawberry.field(name="fileHash", default=None)
    started_at: str = strawberry.field(name="startedAt")
    completed_at: typing.Optional[str] = strawberry.field(name="completedAt", default=None)
    status: str
    records_processed: int = strawberry.field(name="recordsProcessed")
    records_created: int = strawberry.field(name="recordsCreated")
    records_updated: int = strawberry.field(name="recordsUpdated")
    records_failed: int = strawberry.field(name="recordsFailed")
    error_summary: typing.Optional[str] = strawberry.field(name="errorSummary", default=None)
    triggered_by: typing.Optional[str] = strawberry.field(name="triggeredBy", default=None)
    created_at: str = strawberry.field(name="createdAt")
    source_config_name: str = strawberry.field(name="sourceConfigName", default="")

    @classmethod
    def from_db(cls, obj: ImportJob) -> "ImportJobNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            source_config_id=strawberry.ID(str(obj.source_config_id)),
            domain=obj.source_config.domain if obj.source_config_id else "",
            file_name=obj.file_name,
            file_path=obj.file_path,
            file_size=obj.file_size,
            file_hash=obj.file_hash or None,
            started_at=_iso(obj.started_at),
            completed_at=_iso(obj.completed_at),
            status=obj.status,
            records_processed=obj.records_processed,
            records_created=obj.records_created,
            records_updated=obj.records_updated,
            records_failed=obj.records_failed,
            error_summary=obj.error_summary,
            triggered_by=obj.triggered_by,
            created_at=_iso(obj.created_at),
            source_config_name=obj.source_config.name if obj.source_config_id else "",
        )


@strawberry.type
class ImportJobStructuredError:
    error_code: typing.Optional[str] = strawberry.field(name="errorCode", default=None)
    message: typing.Optional[str] = None
    existing_job_id: typing.Optional[strawberry.ID] = strawberry.field(name="existingJobId", default=None)
    source_config_id: typing.Optional[strawberry.ID] = strawberry.field(name="sourceConfigId", default=None)
    file_name: typing.Optional[str] = strawberry.field(name="fileName", default=None)


@strawberry.input
class AttachFileInput:
    file_name: str = strawberry.field(name="fileName")
    file_path: str = strawberry.field(name="filePath")
    file_size: typing.Optional[int] = strawberry.field(name="fileSize", default=None)
    file_hash: typing.Optional[str] = strawberry.field(name="fileHash", default=None)


@strawberry.type
class ImportJobPayload:
    ok: bool
    job: typing.Optional[ImportJobNode] = None
    error_code: typing.Optional[str] = strawberry.field(name="errorCode", default=None)
    message: typing.Optional[str] = None
    existing_job_id: typing.Optional[strawberry.ID] = strawberry.field(name="existingJobId", default=None)
    source_config_id: typing.Optional[strawberry.ID] = strawberry.field(name="sourceConfigId", default=None)
    file_name: typing.Optional[str] = strawberry.field(name="fileName", default=None)
    errors: typing.Optional[list["MutationError"]] = None


@strawberry.type
class ImportJobDeletePayload:
    ok: bool
    message: typing.Optional[str] = None
    errors: typing.Optional[list["MutationError"]] = None


# ── Import Validation Error ──

@strawberry.type
class ImportValidationErrorNode:
    id: strawberry.ID
    import_job_id: strawberry.ID = strawberry.field(name="importJobId")
    sheet_name: typing.Optional[str] = strawberry.field(name="sheetName", default=None)
    row_number: typing.Optional[int] = strawberry.field(name="rowNumber", default=None)
    entity_type: str = strawberry.field(name="entityType")
    field_name: typing.Optional[str] = strawberry.field(name="fieldName", default=None)
    error_code: str = strawberry.field(name="errorCode")
    message: str
    raw_value: typing.Optional[str] = strawberry.field(name="rawValue", default=None)
    created_at: str = strawberry.field(name="createdAt")

    @classmethod
    def from_db(cls, obj: ImportValidationError) -> "ImportValidationErrorNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            import_job_id=strawberry.ID(str(obj.import_job_id)),
            sheet_name=obj.sheet_name,
            row_number=obj.row_number,
            entity_type=obj.entity_type,
            field_name=obj.field_name,
            error_code=obj.error_code,
            message=obj.message,
            raw_value=obj.raw_value,
            created_at=_iso(obj.created_at),
        )


@strawberry.type
class ImportValidationErrorPayload:
    ok: bool
    errors: typing.Optional[list["MutationError"]] = None


# ── Mapping Rule ──

@strawberry.input
class MappingRuleInput:
    domain: str
    source_field: str = strawberry.field(name="sourceField")
    destination_field: str = strawberry.field(name="destinationField")
    transform_rule: typing.Optional[str] = strawberry.field(name="transformRule", default=None)
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=False)


@strawberry.type
class MappingRuleNode:
    id: strawberry.ID
    domain: str
    source_field: str = strawberry.field(name="sourceField")
    destination_field: str = strawberry.field(name="destinationField")
    transform_rule: typing.Optional[str] = strawberry.field(name="transformRule", default=None)
    is_required: bool = strawberry.field(name="isRequired")
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: MappingRule) -> "MappingRuleNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            domain=obj.domain,
            source_field=obj.source_field,
            destination_field=obj.destination_field,
            transform_rule=obj.transform_rule,
            is_required=obj.is_required,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class MappingRulePayload:
    ok: bool
    rule: typing.Optional[MappingRuleNode] = None
    errors: typing.Optional[list["MutationError"]] = None


# ── Integration Status ──

@strawberry.type
class IntegrationStatusNode:
    source_id: strawberry.ID = strawberry.field(name="sourceId")
    source_name: str = strawberry.field(name="sourceName")
    domain: str
    is_active: bool = strawberry.field(name="isActive")
    last_sync: typing.Optional[str] = strawberry.field(name="lastSync", default=None)
    last_success: typing.Optional[str] = strawberry.field(name="lastSuccess", default=None)
    last_failure: typing.Optional[str] = strawberry.field(name="lastFailure", default=None)
    queue_backlog: int = strawberry.field(name="queueBacklog")


@strawberry.type
class IntegrationStatusPayload:
    ok: bool
    statuses: list[IntegrationStatusNode] = strawberry.field(name="statuses")


# ── Import Compare Result ──

@strawberry.type
class ImportCompareResultNode:
    id: strawberry.ID
    import_job_id: strawberry.ID = strawberry.field(name="importJobId")
    action: str
    entity_type: str = strawberry.field(name="entityType")
    stable_key: str = strawberry.field(name="stableKey")
    current_value_json: typing.Optional[str] = strawberry.field(name="currentValueJson", default=None)
    incoming_value_json: typing.Optional[str] = strawberry.field(name="incomingValueJson", default=None)
    diff_json: typing.Optional[str] = strawberry.field(name="diffJson", default=None)
    status: str = "PENDING"

    @classmethod
    def from_db(cls, obj) -> "ImportCompareResultNode":
        import json
        return cls(
            id=strawberry.ID(str(obj.id)),
            import_job_id=strawberry.ID(str(obj.import_job_id)),
            action=obj.action,
            entity_type=obj.entity_type,
            stable_key=obj.stable_key,
            current_value_json=json.dumps(obj.current_value) if obj.current_value else None,
            incoming_value_json=json.dumps(obj.incoming_value) if obj.incoming_value else None,
            diff_json=json.dumps(obj.diff) if obj.diff else None,
            status=obj.status,
        )


# ── Import Audit Log ──

@strawberry.type
class ImportAuditLogNode:
    id: strawberry.ID
    import_job_id: strawberry.ID = strawberry.field(name="importJobId")
    action: str
    user: str = ""
    message: str = ""
    metadata_json: typing.Optional[str] = strawberry.field(name="metadataJson", default=None)
    created_at: str = strawberry.field(name="createdAt")

    @classmethod
    def from_db(cls, obj) -> "ImportAuditLogNode":
        import json
        return cls(
            id=strawberry.ID(str(obj.id)),
            import_job_id=strawberry.ID(str(obj.import_job_id)),
            action=obj.action,
            user=obj.user or "",
            message=obj.message or "",
            metadata_json=json.dumps(obj.metadata) if obj.metadata else None,
            created_at=_iso(obj.created_at),
        )


# ── Paginated result wrappers ──

@strawberry.type
class ImportJobsResult:
    items: list[ImportJobNode]
    page_info: PageInfo = strawberry.field(name="pageInfo")


@strawberry.type
class ImportValidationErrorsResult:
    items: list[ImportValidationErrorNode]
    page_info: PageInfo = strawberry.field(name="pageInfo")


@strawberry.type
class MappingRulesResult:
    items: list[MappingRuleNode]
    page_info: PageInfo = strawberry.field(name="pageInfo")


@strawberry.type
class ImportCompareResultsResult:
    items: list[ImportCompareResultNode]
    page_info: PageInfo = strawberry.field(name="pageInfo")


@strawberry.type
class ImportAuditLogsResult:
    items: list[ImportAuditLogNode]
    page_info: PageInfo = strawberry.field(name="pageInfo")


# ── File Preview Row ──

# ── Parsed Data ──

@strawberry.type
class ParsedSheetType:
    sheet_name: str = strawberry.field(name="sheetName")
    column_headers: list[str] = strawberry.field(name="columnHeaders", default_factory=list)
    column_types: list[str] = strawberry.field(name="columnTypes", default_factory=list)
    total_rows: int = strawberry.field(name="totalRows", default=0)
    sample_rows: list["PreviewRowNode"] = strawberry.field(name="sampleRows", default_factory=list)

    @classmethod
    def from_sheet(cls, sheet, sample_limit: int = 100) -> "ParsedSheetType":
        sample = [
            PreviewRowNode(row_number=r.row_number, columns=[c if c is not None else "" for c in r.values])
            for r in sheet.rows[:sample_limit]
        ]
        col_types = [ct.detected_type for ct in sheet.column_types] if sheet.column_types else []
        return cls(
            sheet_name=sheet.sheet_name,
            column_headers=sheet.column_headers,
            column_types=col_types,
            total_rows=sheet.total_rows,
            sample_rows=sample,
        )


@strawberry.type
class ParsedDataResult:
    ok: bool
    file_name: str = strawberry.field(name="fileName", default="")
    sheets: list[ParsedSheetType] = strawberry.field(default_factory=list)
    errors: typing.Optional[list["MutationError"]] = None


# ── Mapping Suggestions ──

@strawberry.type
class MappingSuggestionType:
    source_column: str = strawberry.field(name="sourceColumn")
    nexus_field: typing.Optional[str] = strawberry.field(name="nexusField", default=None)
    confidence: str = "pending"
    status: str = "unmapped"
    required: bool = False
    message: str = ""

    @classmethod
    def unmapped(cls, col: str, required: bool = False) -> "MappingSuggestionType":
        return cls(
            source_column=col,
            status="unmapped",
            confidence="low",
            required=required,
            message="No matching Nexus field found" if not required else f"Required field '{col}' is not mapped",
        )

    @classmethod
    def mapped(cls, col: str, nexus: str, required: bool = False) -> "MappingSuggestionType":
        return cls(
            source_column=col,
            nexus_field=nexus,
            status="mapped" if required else "optional",
            confidence="high" if required else "medium",
            required=required,
            message=f"Mapped to {nexus}" if not required else f"Required: mapped to {nexus}",
        )


@strawberry.type
class MappingSuggestionsResult:
    ok: bool
    items: list[MappingSuggestionType] = strawberry.field(default_factory=list)
    unmapped_count: int = strawberry.field(name="unmappedCount", default=0)
    required_unmapped_count: int = strawberry.field(name="requiredUnmappedCount", default=0)
    errors: typing.Optional[list["MutationError"]] = None


# ── Apply Preview ──

@strawberry.type
class FieldDiffType:
    field: str
    incoming: typing.Optional[str] = None
    existing: typing.Optional[str] = None

    @classmethod
    def from_dict(cls, field: str, incoming: typing.Any, existing: typing.Any) -> "FieldDiffType":
        return cls(
            field=field,
            incoming=str(incoming) if incoming is not None else None,
            existing=str(existing) if existing is not None else None,
        )


@strawberry.type
class PlannedMutationType:
    row_number: typing.Optional[int] = strawberry.field(name="rowNumber", default=None)
    entity_type: str = strawberry.field(name="entityType")
    entity_key: str = strawberry.field(name="entityKey")
    operation: str
    incoming: typing.Optional[str] = None
    existing: typing.Optional[str] = None
    field_diffs: list[FieldDiffType] = strawberry.field(name="fieldDiffs", default_factory=list)

    @classmethod
    def from_compare(cls, obj) -> "PlannedMutationType":
        import json
        diffs = []
        if obj.diff:
            for k, v in obj.diff.items():
                incoming_v = obj.incoming_value.get(k) if obj.incoming_value else None
                existing_v = obj.current_value.get(k) if obj.current_value else None
                diffs.append(FieldDiffType.from_dict(k, str(v.get("incoming", "")), str(v.get("existing", ""))))
        return cls(
            entity_type=obj.entity_type,
            entity_key=obj.stable_key,
            operation=obj.action,
            incoming=json.dumps(obj.incoming_value) if obj.incoming_value else None,
            existing=json.dumps(obj.current_value) if obj.current_value else None,
            field_diffs=diffs,
        )


@strawberry.type
class ApplyPreviewResult:
    ok: bool
    create_count: int = strawberry.field(name="createCount", default=0)
    update_count: int = strawberry.field(name="updateCount", default=0)
    unchanged_count: int = strawberry.field(name="unchangedCount", default=0)
    conflict_count: int = strawberry.field(name="conflictCount", default=0)
    skip_count: int = strawberry.field(name="skipCount", default=0)
    planned_mutations: list[PlannedMutationType] = strawberry.field(name="plannedMutations", default_factory=list)
    errors: typing.Optional[list["MutationError"]] = None


@strawberry.type
class PreviewRowNode:
    row_number: int = strawberry.field(name="rowNumber")
    columns: typing.Optional[list[str]] = None
    is_empty: bool = strawberry.field(name="isEmpty", default=False)

    @classmethod
    def from_row(cls, row_number: int, columns: list[str]) -> "PreviewRowNode":
        return cls(row_number=row_number, columns=columns)


@strawberry.type
class FilePreviewNode:
    job_id: strawberry.ID = strawberry.field(name="jobId")
    file_name: str = strawberry.field(name="fileName")
    sheet_names: list[str] = strawberry.field(name="sheetNames", default_factory=list)
    active_sheet: str = strawberry.field(name="activeSheet", default="")
    column_headers: list[str] = strawberry.field(name="columnHeaders", default_factory=list)
    total_rows: int = strawberry.field(name="totalRows", default=0)
    sample_rows: list[PreviewRowNode] = strawberry.field(name="sampleRows", default_factory=list)
    detected_types: typing.Optional[list[str]] = strawberry.field(name="detectedTypes", default=None)
    empty_required_cells: int = strawberry.field(name="emptyRequiredCells", default=0)
    duplicate_rows: int = strawberry.field(name="duplicateRows", default=0)
    errors: typing.Optional[list["MutationError"]] = None
