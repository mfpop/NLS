import strawberry
from strawberry.types import Info

from api.permissions import ensure_access
from api.types.mapping import (
    ImportProfilePayload, ImportFieldMappingPayload,
    ImportProfileNode, ImportFieldMappingNode,
    MappingValidationResultType,
)
from api.common.errors import MutationError
from manufacturing.domain.erp_mapping_service import ERPMappingService, ERPMappingError


@strawberry.type
class MappingMutation:

    @strawberry.mutation
    def create_import_profile(self, info: Info, name: str, domain: str = "PLANT_STRUCTURE") -> ImportProfilePayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            profile = ERPMappingService.create_profile(name, domain)
            return ImportProfilePayload(ok=True, profile=ImportProfileNode.from_db(profile))
        except ERPMappingError as exc:
            return ImportProfilePayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def save_import_field_mapping(
        self, info: Info,
        profile_id: str,
        entity_type: str,
        source_column: str,
        target_field: str,
        is_required: bool = False,
    ) -> ImportFieldMappingPayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            mapping = ERPMappingService.save_mapping(profile_id, entity_type, source_column, target_field, is_required)
            return ImportFieldMappingPayload(ok=True, mapping=ImportFieldMappingNode.from_db(mapping))
        except ERPMappingError as exc:
            return ImportFieldMappingPayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def remove_import_field_mapping(self, info: Info, profile_id: str, mapping_id: str) -> ImportProfilePayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            ERPMappingService.remove_mapping(profile_id, mapping_id)
            profile = ERPMappingService.get_profile(profile_id)
            return ImportProfilePayload(ok=True, profile=ImportProfileNode.from_db(profile))
        except ERPMappingError as exc:
            return ImportProfilePayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def validate_import_mapping(self, info: Info, profile_id: str) -> MappingValidationResultType:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        result = ERPMappingService.validate_mapping(profile_id)
        return MappingValidationResultType.from_dataclass(result)

    @strawberry.mutation
    def test_import_mapping(self, info: Info, profile_id: str, file_path: str) -> MappingValidationResultType:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        result = ERPMappingService.test_mapping(profile_id, file_path)
        return MappingValidationResultType.from_dataclass(result)

    @strawberry.mutation
    def activate_import_profile(self, info: Info, profile_id: str) -> ImportProfilePayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            profile = ERPMappingService.activate_profile(profile_id)
            return ImportProfilePayload(ok=True, profile=ImportProfileNode.from_db(profile))
        except ERPMappingError as exc:
            return ImportProfilePayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )
