import strawberry
from strawberry.types import Info

from api.permissions import ensure_access
from api.types.erp_import_pattern import (
    ErpImportPatternPayload, FieldMappingPayload,
    ErpImportPatternNode, ErpImportPatternFieldMappingNode,
    PatternValidationResultType, FieldMappingInput,
)
from api.common.errors import MutationError
from manufacturing.domain.erp_import_pattern_service import ErpImportPatternService, ErpImportPatternError


@strawberry.type
class ErpImportPatternMutation:

    @strawberry.mutation
    def create_erp_import_pattern(
        self, info: Info,
        name: str,
        destination_entity: str,
        scope: str = "CUSTOM",
        description: str = "",
        source_file_pattern: str = "",
        plant_selection_json: str = '{"mode": "all"}',
        department_selection_json: str = '{"mode": "all"}',
        resource_group_selection_json: str = '{"mode": "all"}',
        source_schema_json: str = "[]",
    ) -> ErpImportPatternPayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            import json
            user_name = info.context.user.username if info.context.user and info.context.user.is_authenticated else ""
            ps = json.loads(plant_selection_json) if plant_selection_json else None
            ds = json.loads(department_selection_json) if department_selection_json else None
            rs = json.loads(resource_group_selection_json) if resource_group_selection_json else None
            ss = json.loads(source_schema_json) if source_schema_json else []
            pattern = ErpImportPatternService.create_pattern(
                name=name,
                destination_entity=destination_entity,
                scope=scope,
                description=description,
                created_by=user_name,
                source_file_pattern=source_file_pattern,
                source_schema=ss,
                plant_selection=ps,
                department_selection=ds,
                resource_group_selection=rs,
            )
            return ErpImportPatternPayload(
                ok=True,
                pattern=ErpImportPatternNode.from_db(pattern),
            )
        except ErpImportPatternError as exc:
            return ErpImportPatternPayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def update_erp_import_pattern(
        self, info: Info,
        pattern_id: str,
        name: str | None = None,
        description: str | None = None,
        scope: str | None = None,
        destination_entity: str | None = None,
        is_active: bool | None = None,
        source_file_pattern: str | None = None,
        plant_selection_json: str | None = None,
        department_selection_json: str | None = None,
        resource_group_selection_json: str | None = None,
        source_schema_json: str | None = None,
    ) -> ErpImportPatternPayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            import json
            ps = json.loads(plant_selection_json) if plant_selection_json else None
            ds = json.loads(department_selection_json) if department_selection_json else None
            rs = json.loads(resource_group_selection_json) if resource_group_selection_json else None
            ss = json.loads(source_schema_json) if source_schema_json else None
            pattern = ErpImportPatternService.update_pattern(
                pattern_id=pattern_id,
                name=name,
                description=description,
                scope=scope,
                destination_entity=destination_entity,
                is_active=is_active,
                source_file_pattern=source_file_pattern,
                source_schema=ss,
                plant_selection=ps,
                department_selection=ds,
                resource_group_selection=rs,
            )
            return ErpImportPatternPayload(
                ok=True,
                pattern=ErpImportPatternNode.from_db(pattern, field_count=pattern.field_mappings.count()),
            )
        except ErpImportPatternError as exc:
            return ErpImportPatternPayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def delete_erp_import_pattern(self, info: Info, pattern_id: str) -> ErpImportPatternPayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            ErpImportPatternService.delete_pattern(pattern_id)
            return ErpImportPatternPayload(ok=True)
        except ErpImportPatternError as exc:
            return ErpImportPatternPayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def save_erp_import_pattern_mapping(
        self, info: Info,
        pattern_id: str,
        source_name: str,
        source_data_type: str,
        destination_name: str,
        destination_data_type: str,
        is_required: bool = False,
        sort_order: int = 0,
    ) -> FieldMappingPayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            mapping = ErpImportPatternService.save_mapping(
                pattern_id=pattern_id,
                source_name=source_name,
                source_data_type=source_data_type,
                destination_name=destination_name,
                destination_data_type=destination_data_type,
                is_required=is_required,
                sort_order=sort_order,
            )
            return FieldMappingPayload(ok=True, mapping=ErpImportPatternFieldMappingNode.from_db(mapping))
        except ErpImportPatternError as exc:
            return FieldMappingPayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def remove_erp_import_pattern_mapping(self, info: Info, pattern_id: str, mapping_id: str) -> ErpImportPatternPayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            ErpImportPatternService.remove_mapping(pattern_id, mapping_id)
            pattern = ErpImportPatternService.get_pattern(pattern_id)
            return ErpImportPatternPayload(
                ok=True,
                pattern=ErpImportPatternNode.from_db(pattern, field_count=pattern.field_mappings.count()),
            )
        except ErpImportPatternError as exc:
            return ErpImportPatternPayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def replace_erp_import_pattern_mappings(
        self, info: Info,
        pattern_id: str,
        mappings: list[FieldMappingInput],
    ) -> ErpImportPatternPayload:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        try:
            dicts = [
                {
                    "source_name": m.source_name,
                    "source_data_type": m.source_data_type,
                    "destination_name": m.destination_name,
                    "destination_data_type": m.destination_data_type,
                    "is_required": m.is_required,
                    "sort_order": m.sort_order,
                }
                for m in mappings
            ]
            created = ErpImportPatternService.replace_all_mappings(pattern_id, dicts)
            pattern = ErpImportPatternService.get_pattern(pattern_id)
            return ErpImportPatternPayload(
                ok=True,
                pattern=ErpImportPatternNode.from_db(pattern, field_count=len(created)),
            )
        except ErpImportPatternError as exc:
            return ErpImportPatternPayload(
                ok=False,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def validate_erp_import_pattern(self, info: Info, pattern_id: str) -> PatternValidationResultType:
        ensure_access(user=info.context.user, action="manage_mapping_rules")
        result = ErpImportPatternService.validate_pattern(pattern_id)
        return PatternValidationResultType.from_dataclass(result)
