from typing import Optional

import strawberry
from django.utils import timezone
from django.db import connection
from django.db.utils import OperationalError

from api.types.application import ApplicationSettingNode
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
