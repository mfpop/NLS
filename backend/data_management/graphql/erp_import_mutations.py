from __future__ import annotations

import strawberry
from strawberry.types import Info

from api.permissions import ensure_access
from api.common.errors import MutationError

from data_management.graphql.erp_import_types import (
    ErpSourceFileNode, ValidationResultType, ImportResultType,
)
from data_management.services.erp_source_file_service import ErpSourceFileService, ErpSourceFileError
from data_management.services.erp_import_validation_service import ErpImportValidationService
from data_management.services.erp_import_service import ErpImportService, ErpImportError
from data_management.services.erp_import_workspace_service import ErpImportWorkspaceService, ErpImportWorkspaceError


@strawberry.type
class ErpImportMutation:

    @strawberry.mutation
    async def upload_erp_source_file(self, info: Info, file: strawberry.file_uploads.Upload) -> ErpSourceFileNode:
        ensure_access(user=info.context.user, action="manage_erp_import_patterns")
        user_name = info.context.user.username if info.context.user and info.context.user.is_authenticated else ""
        sf = ErpSourceFileService.upload_file(file, uploaded_by=user_name)
        return ErpSourceFileNode.from_db(sf)

    @strawberry.mutation(name="validateErpPattern")
    def validate_erp_pattern(self, info: Info, pattern_id: int) -> ValidationResultType:
        ensure_access(user=info.context.user, action="manage_erp_import_patterns")
        result = ErpImportValidationService.validate_pattern(pattern_id)
        pattern_node = None
        source_file_node = None
        if result.pattern:
            from data_management.graphql.erp_import_types import ErpPatternNode
            pattern_node = ErpPatternNode.from_db(result.pattern)
        if result.source_file:
            from data_management.graphql.erp_import_types import ErpSourceFileNode
            source_file_node = ErpSourceFileNode.from_db(result.source_file)
        return ValidationResultType.from_dataclass(result, source_file_node, pattern_node)

    @strawberry.mutation
    def execute_erp_import(self, info: Info, pattern_id: int, confirmed: bool = False) -> ImportResultType:
        ensure_access(user=info.context.user, action="manage_erp_import_patterns")
        user_name = info.context.user.username if info.context.user and info.context.user.is_authenticated else ""
        result = ErpImportService.execute_import(pattern_id, user=user_name, confirmed=confirmed)
        return ImportResultType.from_dataclass(result)

    @strawberry.mutation
    def reset_erp_import_workspace(self, info: Info, confirmed: bool = False) -> bool:
        ensure_access(user=info.context.user, action="manage_erp_import_patterns")
        user_name = info.context.user.username if info.context.user and info.context.user.is_authenticated else ""
        ErpImportWorkspaceService.reset_workspace(user=user_name, confirmed=confirmed)
        return True
