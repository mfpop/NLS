import strawberry
from typing import Optional
from api.types.lineage import (
    ErpSourceDefinitionNode, ErpDefinitionFieldNode, ErpRelationshipDefinitionNode,
    ErpValidationResultNode, ErpSourceDefinitionPayload, ErpDefinitionFieldPayload,
    ErpRelationshipDefinitionPayload, ErpDeletePayload, ErpValidationPayload,
    LineageError,
    ErpSourceDefinitionInput, ErpSourceDefinitionUpdateInput,
    ErpDefinitionFieldInput, ErpRelationshipDefinitionInput,
)
from manufacturing.domain.lineage_service import LineageService, LineageServiceError


@strawberry.type
class LineageMutation:

    @strawberry.mutation
    def create_erp_source_definition(
        self, input: ErpSourceDefinitionInput
    ) -> ErpSourceDefinitionPayload:
        try:
            obj = LineageService.create_definition({
                "name": input.name,
                "scope": input.scope,
                "source_type": input.source_type or "MANUAL",
                "destination_table": input.destination_table or "",
                "expected_file_pattern": input.expected_file_pattern or "",
                "active": input.active if input.active is not None else True,
                "status": input.status or "DRAFT",
                "schema_json": input.schema_json or {},
                "row_count": input.row_count or 0,
            })
            return ErpSourceDefinitionPayload(
                ok=True,
                definition=ErpSourceDefinitionNode.from_db(obj),
            )
        except LineageServiceError as e:
            return ErpSourceDefinitionPayload(
                ok=False,
                errors=[LineageError(field=e.field or "", code=e.code, message=e.message)],
            )

    @strawberry.mutation
    def update_erp_source_definition(
        self, id: str, input: ErpSourceDefinitionUpdateInput
    ) -> ErpSourceDefinitionPayload:
        try:
            data = {}
            for field in ("name", "scope", "source_type", "destination_table",
                          "expected_file_pattern", "active", "status", "schema_json", "row_count"):
                val = getattr(input, field)
                if val is not None:
                    data[field] = val
            obj = LineageService.update_definition(id, data)
            return ErpSourceDefinitionPayload(
                ok=True,
                definition=ErpSourceDefinitionNode.from_db(obj),
            )
        except LineageServiceError as e:
            return ErpSourceDefinitionPayload(
                ok=False,
                errors=[LineageError(field=e.field or "", code=e.code, message=e.message)],
            )

    @strawberry.mutation
    def delete_erp_source_definition(self, id: str) -> ErpDeletePayload:
        try:
            LineageService.delete_definition(id)
            return ErpDeletePayload(ok=True)
        except LineageServiceError as e:
            return ErpDeletePayload(
                ok=False,
                errors=[LineageError(field=e.field or "", code=e.code, message=e.message)],
            )

    @strawberry.mutation
    def save_erp_definition_field(
        self, source_definition_id: str, input: ErpDefinitionFieldInput
    ) -> ErpDefinitionFieldPayload:
        try:
            obj = LineageService.save_field(source_definition_id, {
                "field_name": input.field_name,
                "data_type": input.data_type or "string",
                "required": input.required if input.required is not None else False,
                "primary_key": input.primary_key if input.primary_key is not None else False,
                "foreign_key": input.foreign_key if input.foreign_key is not None else False,
                "nexus_field": input.nexus_field or "",
                "aliases_json": input.aliases_json or [],
                "active": input.active if input.active is not None else True,
            })
            return ErpDefinitionFieldPayload(
                ok=True,
                field=ErpDefinitionFieldNode.from_db(obj),
            )
        except LineageServiceError as e:
            return ErpDefinitionFieldPayload(
                ok=False,
                errors=[LineageError(field=e.field or "", code=e.code, message=e.message)],
            )

    @strawberry.mutation
    def delete_erp_definition_field(self, id: str) -> ErpDeletePayload:
        try:
            LineageService.delete_field(id)
            return ErpDeletePayload(ok=True)
        except Exception as e:
            return ErpDeletePayload(
                ok=False,
                errors=[LineageError(field="id", code="ERROR", message=str(e))],
            )

    @strawberry.mutation
    def save_erp_relationship_definition(
        self, source_definition_id: str, input: ErpRelationshipDefinitionInput
    ) -> ErpRelationshipDefinitionPayload:
        try:
            # Lineage page enforces ONE_TO_ONE for all relationships
            final_type = "ONE_TO_ONE"
            obj = LineageService.save_relationship(source_definition_id, {
                "source_field": input.source_field,
                "target_source_definition_id": input.target_source_definition_id,
                "target_field": input.target_field,
                "relationship_type": final_type,
                "required": input.required if input.required is not None else False,
                "active": input.active if input.active is not None else True,
            })
            return ErpRelationshipDefinitionPayload(
                ok=True,
                relationship=ErpRelationshipDefinitionNode.from_db(obj),
            )
        except LineageServiceError as e:
            return ErpRelationshipDefinitionPayload(
                ok=False,
                errors=[LineageError(field=e.field or "", code=e.code, message=e.message)],
            )

    @strawberry.mutation
    def delete_erp_relationship_definition(self, id: str) -> ErpDeletePayload:
        try:
            LineageService.delete_relationship(id)
            return ErpDeletePayload(ok=True)
        except Exception as e:
            return ErpDeletePayload(
                ok=False,
                errors=[LineageError(field="id", code="ERROR", message=str(e))],
            )

    @strawberry.mutation
    def validate_erp_lineage(
        self, source_definition_id: str, destination_table: str
    ) -> ErpValidationPayload:
        try:
            result = LineageService.run_validation(source_definition_id, destination_table)
            return ErpValidationPayload(
                ok=True,
                results=[ErpValidationResultNode.from_db(r) for r in result["results"]],
                total_errors=result["total_errors"],
                total_warnings=result["total_warnings"],
                total_info=result["total_info"],
            )
        except LineageServiceError as e:
            return ErpValidationPayload(
                ok=False,
                results=[],
                errors=[LineageError(field=e.field or "", code=e.code, message=e.message)],
            )
