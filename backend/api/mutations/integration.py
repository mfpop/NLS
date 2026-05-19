import strawberry
from typing import Optional
from strawberry.types import Info

from api.types.integration import (
    MappingRuleInput, MappingRuleNode, MappingRulePayload,
    ImportJobPayload, ImportJobNode,
    MutationError,
)
from manufacturing.domain.import_job_service import ImportJobService, ImportJobError
from manufacturing.models import MappingRule


@strawberry.type
class IntegrationMutation:

    @strawberry.mutation
    def trigger_import_job(
        self, source_id: str, triggered_by: Optional[str] = None
    ) -> ImportJobPayload:
        try:
            job = ImportJobService.trigger(source_id, triggered_by=triggered_by)
            return ImportJobPayload(ok=True, job=ImportJobNode.from_db(job))
        except ImportJobError as e:
            return ImportJobPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_import_job(
        self, source_id: str, file_name: str = "", file_path: str = "", triggered_by: Optional[str] = None
    ) -> ImportJobPayload:
        from manufacturing.domain.erp_import_service import ErpImportService, ErpImportError
        try:
            job = ErpImportService.create_job(source_id, file_name, file_path, triggered_by)
            return ImportJobPayload(ok=True, job=ImportJobNode.from_db(job))
        except ErpImportError as e:
            return ImportJobPayload(ok=False, errors=[MutationError(field=e.field or "sourceId", code=e.code, message=e.message)])

    @strawberry.mutation
    def transition_import_job(
        self, action: str, job_id: str, summary: Optional[str] = None
    ) -> ImportJobPayload:
        from manufacturing.domain.erp_import_service import ErpImportService, ErpImportError
        try:
            action_map = {
                "PREVIEW": ErpImportService.preview_file,
                "VALIDATE": ErpImportService.validate_job,
                "COMPARE": ErpImportService.compare_job,
                "APPLY": ErpImportService.apply_job,
                "CANCEL": ErpImportService.cancel_job,
                "RETRY": ErpImportService.retry_job,
            }
            handler = action_map.get(action.upper())
            if handler is None:
                return ImportJobPayload(ok=False, errors=[MutationError(field="action", code="INVALID", message=f"Unknown action: {action}")])
            summary_dict = None
            if summary:
                import json
                summary_dict = json.loads(summary)
            job = handler(job_id, summary_dict) if action.upper() == "APPLY" and summary_dict else handler(job_id)
            return ImportJobPayload(ok=True, job=ImportJobNode.from_db(job))
        except ErpImportError as e:
            return ImportJobPayload(ok=False, errors=[MutationError(field=e.field or "jobId", code=e.code, message=e.message)])

    @strawberry.mutation
    def create_mapping_rule(self, input: MappingRuleInput) -> MappingRulePayload:
        domain = (input.domain or "").strip().upper()
        source_field = (input.source_field or "").strip()
        dest_field = (input.destination_field or "").strip()
        if not source_field:
            return MappingRulePayload(ok=False, errors=[MutationError(field="sourceField", code="REQUIRED", message="Source field is required")])
        if not dest_field:
            return MappingRulePayload(ok=False, errors=[MutationError(field="destinationField", code="REQUIRED", message="Destination field is required")])

        rule = MappingRule.objects.create(
            domain=domain,
            source_field=source_field,
            destination_field=dest_field,
            transform_rule=input.transform_rule or None,
            is_required=input.is_required or False,
        )
        return MappingRulePayload(ok=True, rule=MappingRuleNode.from_db(rule))

    @strawberry.mutation
    def update_mapping_rule(self, id: str, input: MappingRuleInput) -> MappingRulePayload:
        try:
            rule = MappingRule.objects.get(id=id)
        except MappingRule.DoesNotExist:
            return MappingRulePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Mapping rule not found")])
        rule.domain = (input.domain or rule.domain).strip().upper()
        rule.source_field = (input.source_field or rule.source_field).strip()
        rule.destination_field = (input.destination_field or rule.destination_field).strip()
        if input.transform_rule is not None:
            rule.transform_rule = input.transform_rule or None
        if input.is_required is not None:
            rule.is_required = input.is_required
        rule.save()
        return MappingRulePayload(ok=True, rule=MappingRuleNode.from_db(rule))

    @strawberry.mutation
    def archive_mapping_rule(self, id: str) -> MappingRulePayload:
        try:
            rule = MappingRule.objects.get(id=id)
        except MappingRule.DoesNotExist:
            return MappingRulePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Mapping rule not found")])
        rule.is_active = False
        rule.save()
        return MappingRulePayload(ok=True, rule=MappingRuleNode.from_db(rule))
