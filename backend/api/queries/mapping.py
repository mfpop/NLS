import strawberry
from typing import Optional

from api.types.mapping import (
    ImportProfileNode, ImportFieldMappingNode,
    DetectedColumnType, MappingValidationResultType,
    ResultTreeNodeType, CompareRowType, ExportMappingType,
)
from api.types.manufacturing import MutationError
from manufacturing.domain.erp_mapping_service import ERPMappingService


@strawberry.type
class MappingQuery:

    @strawberry.field
    def import_profiles(self) -> list[ImportProfileNode]:
        return [ImportProfileNode.from_db(p) for p in ERPMappingService.list_profiles()]

    @strawberry.field
    def import_profile(self, profile_id: str) -> Optional[ImportProfileNode]:
        try:
            p = ERPMappingService.get_profile(profile_id)
            return ImportProfileNode.from_db(p)
        except Exception:
            return None

    @strawberry.field
    def import_field_mappings(self, profile_id: str) -> list[ImportFieldMappingNode]:
        return [ImportFieldMappingNode.from_db(m) for m in ERPMappingService.get_mappings(profile_id)]

    @strawberry.field
    def detected_columns(self, file_path: str) -> list[DetectedColumnType]:
        cols = ERPMappingService.detect_columns(file_path)
        return [DetectedColumnType(**c) for c in cols]

    @strawberry.field
    def nexus_target_fields(self, entity_type: Optional[str] = None) -> str:
        import json
        return json.dumps(ERPMappingService.nexus_target_fields(entity_type))

    @strawberry.field
    def mapping_validation(self, profile_id: str) -> MappingValidationResultType:
        result = ERPMappingService.validate_mapping(profile_id)
        return MappingValidationResultType.from_dataclass(result)

    @strawberry.field
    def import_result_tree(self, profile_id: str, file_path: str, plant_code: Optional[str] = None) -> list[ResultTreeNodeType]:
        nodes = ERPMappingService.generate_result_tree(profile_id, file_path, plant_code)
        return [ResultTreeNodeType.from_dataclass(n) for n in nodes]

    @strawberry.field
    def compare_summary(self, profile_id: str, file_path: str) -> list[CompareRowType]:
        rows = ERPMappingService.compare_import(profile_id, file_path)
        return [CompareRowType.from_dataclass(r) for r in rows]

    @strawberry.field
    def export_mapping(self, profile_id: str) -> list[ExportMappingType]:
        data = ERPMappingService.export_mapping(profile_id)
        return [ExportMappingType(**d) for d in data]
