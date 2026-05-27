from __future__ import annotations

import strawberry
from typing import Optional

from data_management.graphql.erp_import_types import (
    ErpPatternNode, ErpImportLogNode, ValidationResultType,
)
from data_management.services.erp_import_workspace_service import ErpImportWorkspaceService
from data_management.services.erp_import_validation_service import ErpImportValidationService


@strawberry.type
class ErpImportQuery:

    @strawberry.field
    def erp_patterns(self) -> list[ErpPatternNode]:
        patterns = ErpImportWorkspaceService.refresh_pattern_list()
        return [ErpPatternNode.from_db(p) for p in patterns]

    @strawberry.field
    def erp_import_validation(self, pattern_id: int) -> ValidationResultType:
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

    @strawberry.field
    def erp_import_logs(self, pattern_id: Optional[int] = None) -> list[ErpImportLogNode]:
        from data_management.models import ErpImportLog
        qs = ErpImportLog.objects.all().select_related("pattern", "source_file")
        if pattern_id is not None:
            qs = qs.filter(pattern_id=pattern_id)
        return [ErpImportLogNode.from_db(log) for log in qs.order_by("-started_at")]
