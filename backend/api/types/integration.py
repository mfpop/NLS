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
