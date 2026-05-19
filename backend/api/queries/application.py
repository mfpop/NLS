from typing import Optional

import strawberry
from django.utils import timezone
from django.db import connection
from django.db.utils import OperationalError

from api.types.application import (
    ApplicationSettingError,
    ApplicationSettingNode,
    ImportSourceConfigNode,
    ImportSourceConfigsResult,
    ImportSourcePathTestPayload,
)
from api.types.pagination import PageInfo, paginate_queryset
from manufacturing.domain.import_source_config_service import ImportSourceConfigError, ImportSourceConfigService
from application.services import ApplicationSettingsService


@strawberry.type
class SystemHealth:
    graphql_status: str = strawberry.field(name="graphqlStatus")
    database_status: str = strawberry.field(name="databaseStatus")
    server_time: str = strawberry.field(name="serverTime")
    version: str


@strawberry.type
class ApplicationSettingsQuery:
    @strawberry.field
    def application_settings(self, category: Optional[str] = None) -> list[ApplicationSettingNode]:
        settings = ApplicationSettingsService.list_settings(category=category)
        return [ApplicationSettingNode.from_model(setting) for setting in settings]

    @strawberry.field
    def system_health(self) -> SystemHealth:
        try:
            connection.ensure_connection()
            database_status = "OK"
        except OperationalError:
            database_status = "ERROR"

        return SystemHealth(
            graphql_status="OK",
            database_status=database_status,
            server_time=timezone.now().isoformat(),
            version="1.0.0",
        )

    @strawberry.field
    def import_source_configs(
        self,
        domain: Optional[str] = None,
        is_active: Optional[bool] = None,
        offset: Optional[int] = 0,
        limit: Optional[int] = 100,
    ) -> ImportSourceConfigsResult:
        from application.models import ImportSourceConfig
        qs = ImportSourceConfig.objects.all()
        if is_active is not None:
            qs = qs.filter(is_active=is_active)
        if domain:
            qs = qs.filter(domain=domain)
        qs = qs.order_by("domain", "name")
        items, total, has_more = paginate_queryset(qs, offset or 0, limit or 100)
        return ImportSourceConfigsResult(
            items=[ImportSourceConfigNode.from_model(item) for item in items],
            page_info=PageInfo(total_count=total, has_next_page=has_more, offset=offset or 0, limit=limit or 100),
        )

    @strawberry.field
    def test_import_source_path(self, id: str) -> ImportSourcePathTestPayload:
        try:
            result = ImportSourceConfigService.test_path_access(int(id))
            return ImportSourcePathTestPayload(
                ok=result.ok,
                exists=result.exists,
                readable=result.readable,
                message=result.message,
                last_checked_at=result.checked_at.isoformat(),
                errors=[],
            )
        except ImportSourceConfigError as exc:
            return ImportSourcePathTestPayload(
                ok=False,
                message=exc.message,
                errors=[ApplicationSettingError(field=exc.field, code=exc.code, message=exc.message)],
            )
        except Exception as exc:
            return ImportSourcePathTestPayload(
                ok=False,
                message=str(exc),
                errors=[ApplicationSettingError(field="id", code="ERROR", message=str(exc))],
            )
