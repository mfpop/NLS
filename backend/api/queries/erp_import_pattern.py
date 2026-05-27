import strawberry
from typing import Optional

from api.types.erp_import_pattern import (
    ErpImportPatternNode, ErpImportPatternFieldMappingNode,
    PatternValidationResultType, ScopeOption, DestinationOption,
)
from api.types.manufacturing import MutationError
from manufacturing.domain.erp_import_pattern_service import ErpImportPatternService
from manufacturing.domain.lineage_service import LineageService


@strawberry.type
class ErpImportPatternQuery:

    @strawberry.field
    def erp_import_patterns(self) -> list[ErpImportPatternNode]:
        patterns = ErpImportPatternService.list_patterns()
        return [
            ErpImportPatternNode.from_db(
                p,
                field_count=p.field_mappings.count(),
            )
            for p in patterns
        ]

    @strawberry.field
    def erp_import_pattern(self, pattern_id: str) -> Optional[ErpImportPatternNode]:
        try:
            p = ErpImportPatternService.get_pattern(pattern_id)
            return ErpImportPatternNode.from_db(p, field_count=p.field_mappings.count())
        except Exception:
            return None

    @strawberry.field
    def erp_import_pattern_mappings(self, pattern_id: str) -> list[ErpImportPatternFieldMappingNode]:
        return [
            ErpImportPatternFieldMappingNode.from_db(m)
            for m in ErpImportPatternService.list_mappings(pattern_id)
        ]

    @strawberry.field
    def erp_import_pattern_validation(self, pattern_id: str) -> PatternValidationResultType:
        result = ErpImportPatternService.validate_pattern(pattern_id)
        return PatternValidationResultType.from_dataclass(result)

    @strawberry.field
    def erp_pattern_scope_options(self) -> list[ScopeOption]:
        opts = ErpImportPatternService.get_scope_options()
        return [ScopeOption(value=o["value"], label=o["label"]) for o in opts]

    @strawberry.field
    def erp_pattern_destination_options(self, scope: Optional[str] = None) -> list[DestinationOption]:
        tables = LineageService.get_destination_tables(scope)
        return [
            DestinationOption(entity=t, scope=scope or "ALL", available=True)
            for t in tables
        ]
