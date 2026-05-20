import strawberry
from typing import Optional

from api.types.integration import (
    ImportJobNode, ImportJobsResult, ImportValidationErrorNode,
    ImportValidationErrorsResult, MappingRuleNode, MappingRulesResult,
    ImportCompareResultsResult, ImportAuditLogsResult,
    IntegrationStatusNode, IntegrationStatusPayload,
    FilePreviewNode, PreviewRowNode, ImportCompareResultNode, ImportAuditLogNode,
)
from api.types.pagination import PageInfo, paginate_queryset
from api.types.integration import MutationError
from manufacturing.domain.import_job_service import ImportJobService
from manufacturing.domain.erp_import_service import ErpImportService
from manufacturing.domain.file_parser_service import FileParserService
from manufacturing.domain.mapping_rule_service import MappingRuleService
from manufacturing.models import ImportJob, ImportCompareResult, ImportAuditLog


@strawberry.type
class IntegrationQuery:

    @strawberry.field
    def import_jobs(
        self,
        source_id: Optional[str] = None,
        status: Optional[str] = None,
        domain: Optional[str] = None,
        offset: Optional[int] = 0,
        limit: Optional[int] = 50,
    ) -> ImportJobsResult:
        qs = ImportJobService.list(source_id=source_id, status=status, domain=domain)
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 50)
        return ImportJobsResult(
            items=[ImportJobNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 50),
        )

    @strawberry.field
    def import_validation_errors(
        self,
        job_id: str,
        entity_type: Optional[str] = None,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ImportValidationErrorsResult:
        from manufacturing.models import ImportValidationError
        qs = ImportValidationError.objects.filter(import_job_id=job_id)
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        qs = qs.order_by("row_number")
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ImportValidationErrorsResult(
            items=[ImportValidationErrorNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def mapping_rules(
        self,
        domain: Optional[str] = None,
        active_only: Optional[bool] = False,
        sort_by: Optional[str] = "domain",
        sort_order: Optional[str] = "asc",
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> MappingRulesResult:
        qs = MappingRuleService.list(
            domain=domain,
            active_only=active_only or False,
            sort_by=sort_by or "domain",
            sort_order=sort_order or "asc",
        )
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return MappingRulesResult(
            items=[MappingRuleNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def integration_status(
        self,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> IntegrationStatusPayload:
        from application.models import ImportSourceConfig

        qs = ImportSourceConfig.objects.all().order_by("domain", "name")
        configs, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        statuses = []
        for config in configs:
            jobs = ImportJob.objects.filter(source_config=config).order_by("-created_at")
            last_job = jobs.first()
            last_success = jobs.filter(status="APPLIED").first()
            last_failure = jobs.filter(status__in=[
                "FAILED", "PREVIEW_FAILED", "VALIDATION_FAILED",
                "COMPARE_FAILED", "APPLY_FAILED",
            ]).first()
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

    @strawberry.field
    def file_preview(self, job_id: str) -> FilePreviewNode:
        """Return parsed file preview data for a given import job."""
        try:
            job = ImportJob.objects.select_related("source_config").get(id=job_id)
        except ImportJob.DoesNotExist:
            return FilePreviewNode(
                job_id=strawberry.ID(job_id), file_name="",
                errors=[MutationError(field="jobId", code="NOT_FOUND", message="Import job not found")],
            )

        file_path = ErpImportService._resolve_file_path(job)
        if not file_path:
            return FilePreviewNode(
                job_id=strawberry.ID(job_id), file_name=job.file_name or "",
                errors=[MutationError(field="filePath", code="FILE_NOT_FOUND", message=f"File not found for job {job.id}")],
            )

        try:
            parse_result = FileParserService.parse(file_path, job.source_config.source_type)
        except Exception as exc:
            return FilePreviewNode(
                job_id=strawberry.ID(job_id), file_name=job.file_name or "",
                errors=[MutationError(field="filePath", code="PARSE_ERROR", message=str(exc))],
            )

        if not parse_result.sheets:
            return FilePreviewNode(
                job_id=strawberry.ID(job_id), file_name=parse_result.file_name,
                errors=[MutationError(field="filePath", code="EMPTY", message="No data found in file")],
            )

        active_sheet = parse_result.active_sheet or parse_result.sheets[0].sheet_name
        active = parse_result.sheets[0]  # Use first sheet for preview
        for s in parse_result.sheets:
            if s.sheet_name == active_sheet or (not active_sheet):
                active = s
                break

        sample_rows = [
            PreviewRowNode(row_number=r.row_number, columns=[c if c is not None else "" for c in r.values])
            for r in active.rows[:FileParserService.SAMPLE_ROW_COUNT]
        ]

        detected_types = [ct.detected_type for ct in active.column_types] if active.column_types else None

        return FilePreviewNode(
            job_id=strawberry.ID(job_id),
            file_name=parse_result.file_name,
            sheet_names=[s.sheet_name for s in parse_result.sheets],
            active_sheet=active_sheet,
            column_headers=active.column_headers,
            total_rows=active.total_rows,
            sample_rows=sample_rows,
            detected_types=detected_types,
            empty_required_cells=active.empty_required_cells,
            duplicate_rows=active.duplicate_rows,
        )

    @strawberry.field
    def import_compare_results(
        self,
        job_id: str,
        action_filter: Optional[str] = None,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ImportCompareResultsResult:
        """Return paginated compare results for a given import job."""
        qs = ImportCompareResult.objects.filter(import_job_id=job_id)
        if action_filter:
            qs = qs.filter(action=action_filter.upper())
        qs = qs.order_by("stable_key")
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ImportCompareResultsResult(
            items=[ImportCompareResultNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def import_audit_logs(
        self,
        job_id: str,
        offset: Optional[int] = 0,
        limit: Optional[int] = 50,
    ) -> ImportAuditLogsResult:
        """Return paginated audit logs for a given import job."""
        qs = ImportAuditLog.objects.filter(import_job_id=job_id).order_by("-created_at")
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 50)
        return ImportAuditLogsResult(
            items=[ImportAuditLogNode.from_db(obj) for obj in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 50),
        )


def _iso(dt):
    return dt.isoformat() if dt else ""
