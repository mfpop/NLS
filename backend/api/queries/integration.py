import strawberry
from typing import Optional

from api.types.integration import (
    ImportJobNode, ImportValidationErrorNode,
    MappingRuleNode, IntegrationStatusNode, IntegrationStatusPayload,
)
from manufacturing.domain.import_job_service import ImportJobService
from manufacturing.models import MappingRule


@strawberry.type
class IntegrationQuery:

    @strawberry.field
    def import_jobs(
        self,
        source_id: Optional[str] = None,
        status: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> list[ImportJobNode]:
        qs = ImportJobService.list(source_id=source_id, status=status, domain=domain)
        return [ImportJobNode.from_db(obj) for obj in qs]

    @strawberry.field
    def import_validation_errors(
        self,
        job_id: str,
        entity_type: Optional[str] = None,
    ) -> list[ImportValidationErrorNode]:
        qs = ImportJobService.get_validation_errors(job_id, entity_type=entity_type)
        return [ImportValidationErrorNode.from_db(obj) for obj in qs]

    @strawberry.field
    def mapping_rules(
        self,
        domain: Optional[str] = None,
        active_only: Optional[bool] = False,
    ) -> list[MappingRuleNode]:
        qs = MappingRule.objects.all()
        if domain:
            qs = qs.filter(domain=domain.upper())
        if active_only:
            qs = qs.filter(is_active=True)
        return [MappingRuleNode.from_db(obj) for obj in qs.order_by("domain", "source_field")]

    @strawberry.field
    def integration_status(self) -> IntegrationStatusPayload:
        from application.models import ImportSourceConfig
        from manufacturing.models import ImportJob

        configs = ImportSourceConfig.objects.all()
        statuses = []
        for config in configs:
            jobs = ImportJob.objects.filter(source_config=config).order_by("-created_at")
            last_job = jobs.first()
            last_success = jobs.filter(status="APPLIED").first()
            last_failure = jobs.filter(status="FAILED").first()
            backlog = jobs.filter(status__in=["DRAFT", "PENDING", "RUNNING"]).count()

            statuses.append(IntegrationStatusNode(
                source_id=strawberry.ID(str(config.id)),
                source_name=config.name,
                domain=config.domain,
                is_active=config.is_active,
                last_sync=_iso(last_job.created_at) if last_job else None,
                last_success=_iso(last_success.created_at) if last_success else None,
                last_failure=_iso(last_failure.created_at) if last_failure else None,
                queue_backlog=backlog,
            ))
        return IntegrationStatusPayload(ok=True, statuses=statuses)


def _iso(dt):
    return dt.isoformat() if dt else ""
