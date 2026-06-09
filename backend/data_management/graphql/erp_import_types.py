import typing
import strawberry
from strawberry.types import Info

from api.common.errors import MutationError
from data_management.models import ErpPattern, ErpPatternMapping, ErpSourceFile, ErpImportLog


@strawberry.type
class ErpPatternNode:
    id: strawberry.ID
    name: str
    source_file_type: str = strawberry.field(name="sourceFileType")
    destination_entity: str = strawberry.field(name="destinationEntity")
    is_active: bool = strawberry.field(name="isActive")
    created_by: str = strawberry.field(name="createdBy", default="")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ErpPattern) -> "ErpPatternNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            source_file_type=obj.source_file_type,
            destination_entity=obj.destination_entity,
            is_active=obj.is_active,
            created_by=obj.created_by or "",
            created_at=obj.created_at.isoformat() if obj.created_at else "",
            updated_at=obj.updated_at.isoformat() if obj.updated_at else "",
        )


@strawberry.type
class ErpPatternMappingNode:
    id: strawberry.ID
    pattern_id: strawberry.ID = strawberry.field(name="patternId")
    source_name: str = strawberry.field(name="sourceName")
    source_data_type: str = strawberry.field(name="sourceDataType")
    destination_name: str = strawberry.field(name="destinationName")
    destination_data_type: str = strawberry.field(name="destinationDataType")
    is_required: bool = strawberry.field(name="isRequired")
    transform_rule: typing.Optional[str] = strawberry.field(name="transformRule", default=None)
    order: int

    @classmethod
    def from_db(cls, obj: ErpPatternMapping) -> "ErpPatternMappingNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            pattern_id=strawberry.ID(str(obj.pattern_id)),
            source_name=obj.source_name,
            source_data_type=obj.source_data_type,
            destination_name=obj.destination_name,
            destination_data_type=obj.destination_data_type,
            is_required=obj.is_required,
            transform_rule=obj.transform_rule,
            order=obj.order,
        )


@strawberry.type
class ErpSourceFileNode:
    id: strawberry.ID
    original_name: str = strawberry.field(name="originalName")
    stored_name: str = strawberry.field(name="storedName")
    file_path: str = strawberry.field(name="filePath")
    file_type: str = strawberry.field(name="fileType")
    uploaded_by: str = strawberry.field(name="uploadedBy", default="")
    uploaded_at: str = strawberry.field(name="uploadedAt")
    status: str

    @classmethod
    def from_db(cls, obj: ErpSourceFile) -> "ErpSourceFileNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            original_name=obj.original_name,
            stored_name=obj.stored_name,
            file_path=obj.file_path,
            file_type=obj.file_type,
            uploaded_by=obj.uploaded_by or "",
            uploaded_at=obj.uploaded_at.isoformat() if obj.uploaded_at else "",
            status=obj.status,
        )


@strawberry.type
class ErpImportLogNode:
    id: strawberry.ID
    pattern_id: strawberry.ID = strawberry.field(name="patternId")
    source_file_id: typing.Optional[strawberry.ID] = strawberry.field(name="sourceFileId", default=None)
    status: str
    rows_total: int = strawberry.field(name="rowsTotal")
    rows_added: int = strawberry.field(name="rowsAdded")
    rows_updated: int = strawberry.field(name="rowsUpdated")
    rows_not_updated: int = strawberry.field(name="rowsNotUpdated")
    rows_failed: int = strawberry.field(name="rowsFailed")
    error_message: str = strawberry.field(name="errorMessage", default="")
    started_at: typing.Optional[str] = strawberry.field(name="startedAt", default=None)
    completed_at: typing.Optional[str] = strawberry.field(name="completedAt", default=None)
    created_at: str = strawberry.field(name="createdAt")

    @classmethod
    def from_db(cls, obj: ErpImportLog) -> "ErpImportLogNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            pattern_id=strawberry.ID(str(obj.pattern_id)),
            source_file_id=strawberry.ID(str(obj.source_file_id)) if obj.source_file_id else None,
            status=obj.status,
            rows_total=obj.rows_total,
            rows_added=obj.rows_added,
            rows_updated=obj.rows_updated,
            rows_not_updated=obj.rows_not_updated,
            rows_failed=obj.rows_failed,
            error_message=obj.error_message or "",
            started_at=obj.started_at.isoformat() if obj.started_at else None,
            completed_at=obj.completed_at.isoformat() if obj.completed_at else None,
            created_at=obj.created_at.isoformat() if obj.created_at else "",
        )


@strawberry.type
class ValidationResultType:
    status: str
    errors: list[str] = strawberry.field(default_factory=list)
    warnings: list[str] = strawberry.field(default_factory=list)
    missing_fields: list[str] = strawberry.field(name="missingFields", default_factory=list)
    source_file: typing.Optional[ErpSourceFileNode] = strawberry.field(name="sourceFile", default=None)
    pattern: typing.Optional[ErpPatternNode] = None

    @classmethod
    def from_dataclass(cls, result, source_file_node=None, pattern_node=None) -> "ValidationResultType":
        return cls(
            status=result.status,
            errors=result.errors,
            warnings=result.warnings,
            missing_fields=result.missing_fields,
            source_file=source_file_node,
            pattern=pattern_node,
        )


@strawberry.type
class ImportResultType:
    pattern_id: strawberry.ID = strawberry.field(name="patternId")
    pattern_name: str = strawberry.field(name="patternName")
    status: str
    rows_added: int = strawberry.field(name="rowsAdded")
    rows_updated: int = strawberry.field(name="rowsUpdated")
    rows_not_updated: int = strawberry.field(name="rowsNotUpdated")
    rows_failed: int = strawberry.field(name="rowsFailed")
    error_message: str = strawberry.field(name="errorMessage", default="")

    @classmethod
    def from_dataclass(cls, result) -> "ImportResultType":
        return cls(
            pattern_id=strawberry.ID(str(result.pattern_id)),
            pattern_name=result.pattern_name,
            status=result.status,
            rows_added=result.rows_added,
            rows_updated=result.rows_updated,
            rows_not_updated=result.rows_not_updated,
            rows_failed=result.rows_failed,
            error_message=result.error_message or "",
        )



