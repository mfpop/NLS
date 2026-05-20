import strawberry
from typing import Optional
from strawberry.types import Info

from api.permissions import ensure_access
from api.types.integration import (
    MappingRuleInput, MappingRuleNode, MappingRulePayload,
    ImportJobPayload, ImportJobNode,
    ImportJobDeletePayload,
    AttachFileInput,
    MutationError,
)
from manufacturing.domain.import_job_service import ImportJobService, ImportJobError, ImportJobDuplicateError
from manufacturing.domain.mapping_rule_service import MappingRuleService, MappingRuleError


def _user(info):
    return info.context.user


@strawberry.type
class IntegrationMutation:

    @strawberry.mutation
    def trigger_import_job(
        self, info: Info, source_id: str, triggered_by: Optional[str] = None
    ) -> ImportJobPayload:
        ensure_access(user=_user(info), action="trigger_import_job")
        try:
            job = ImportJobService.trigger(source_id, triggered_by=triggered_by)
            return ImportJobPayload(ok=True, job=ImportJobNode.from_db(job))
        except ImportJobError as e:
            return ImportJobPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_import_job(
        self, info: Info, source_id: str, file_name: Optional[str] = None, file_hash: Optional[str] = None, triggered_by: Optional[str] = None
    ) -> ImportJobPayload:
        ensure_access(user=_user(info), action="create_import_job")
        try:
            job = ImportJobService.create_draft_job(
                source_id,
                file_name=file_name,
                file_hash=file_hash,
                triggered_by=triggered_by,
            )
            return ImportJobPayload(ok=True, job=ImportJobNode.from_db(job))
        except ImportJobDuplicateError as e:
            existing = ImportJobService.get(e.existing_job_id) if e.existing_job_id else None
            return ImportJobPayload(
                ok=False,
                job=ImportJobNode.from_db(existing) if existing else None,
                error_code=e.code,
                message=e.message,
                existing_job_id=existing.id if existing else None,
                source_config_id=e.source_config_id,
                file_name=e.file_name,
            )
        except ImportJobError as e:
            return ImportJobPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def attach_import_file(
        self, info: Info, job_id: str, input: AttachFileInput
    ) -> ImportJobPayload:
        ensure_access(user=_user(info), action="attach_import_file")
        if not job_id:
            return ImportJobPayload(ok=False, errors=[MutationError(field="jobId", code="REQUIRED", message="jobId is required")])
        try:
            job = ImportJobService.attach_file(
                job_id,
                file_name=input.file_name,
                file_path=input.file_path,
                file_size=input.file_size,
                file_hash=input.file_hash,
            )
            return ImportJobPayload(ok=True, job=ImportJobNode.from_db(job))
        except ImportJobDuplicateError as e:
            existing = ImportJobService.get(e.existing_job_id) if e.existing_job_id else None
            return ImportJobPayload(
                ok=False,
                job=ImportJobNode.from_db(existing) if existing else None,
                error_code=e.code,
                message=e.message,
                existing_job_id=existing.id if existing else None,
                source_config_id=e.source_config_id,
                file_name=e.file_name,
            )
        except ImportJobError as e:
            return ImportJobPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def transition_import_job(
        self, info: Info, action: str, job_id: str, summary: Optional[str] = None
    ) -> ImportJobPayload:
        ensure_access(user=_user(info), action="transition_import_job")
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
    def delete_import_job(self, info: Info, job_id: str) -> ImportJobDeletePayload:
        ensure_access(user=_user(info), action="delete_import_job")
        if not job_id:
            return ImportJobDeletePayload(
                ok=False,
                errors=[MutationError(field="jobId", code="REQUIRED", message="jobId is required")],
            )
        try:
            ImportJobService.delete(job_id)
            return ImportJobDeletePayload(ok=True, message="Import job deleted.")
        except ImportJobError as e:
            return ImportJobDeletePayload(
                ok=False,
                errors=[MutationError(field=e.field, code=e.code, message=e.message)],
            )

    @strawberry.mutation
    def create_mapping_rule(self, info: Info, input: MappingRuleInput) -> MappingRulePayload:
        ensure_access(user=_user(info), action="manage_mapping_rules")
        try:
            rule = MappingRuleService.create_from_dict({
                "domain": input.domain,
                "source_field": input.source_field,
                "destination_field": input.destination_field,
                "transform_rule": input.transform_rule,
                "is_required": input.is_required,
            })
            return MappingRulePayload(ok=True, rule=MappingRuleNode.from_db(rule))
        except MappingRuleError as exc:
            return MappingRulePayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    def update_mapping_rule(self, info: Info, id: str, input: MappingRuleInput) -> MappingRulePayload:
        ensure_access(user=_user(info), action="manage_mapping_rules")
        try:
            rule = MappingRuleService.update_from_dict(id, {
                "domain": input.domain,
                "source_field": input.source_field,
                "destination_field": input.destination_field,
                "transform_rule": input.transform_rule,
                "is_required": input.is_required,
            })
            return MappingRulePayload(ok=True, rule=MappingRuleNode.from_db(rule))
        except MappingRuleError as exc:
            return MappingRulePayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    def archive_mapping_rule(self, info: Info, id: str) -> MappingRulePayload:
        ensure_access(user=_user(info), action="manage_mapping_rules")
        try:
            rule = MappingRuleService.archive(id)
            return MappingRulePayload(ok=True, rule=MappingRuleNode.from_db(rule))
        except MappingRuleError as exc:
            return MappingRulePayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    def restore_mapping_rule(self, info: Info, id: str) -> MappingRulePayload:
        ensure_access(user=_user(info), action="manage_mapping_rules")
        try:
            rule = MappingRuleService.restore(id)
            return MappingRulePayload(ok=True, rule=MappingRuleNode.from_db(rule))
        except MappingRuleError as exc:
            return MappingRulePayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])
