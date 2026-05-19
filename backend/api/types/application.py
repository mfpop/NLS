from typing import Any

import strawberry

from application.models import ApplicationSetting
from api.types.pagination import PageInfo


@strawberry.type
class ApplicationSettingNode:
    key: str
    category: str
    value_type: str
    value: strawberry.scalars.JSON
    description: str
    updated_at: str

    @classmethod
    def from_model(cls, setting: ApplicationSetting) -> "ApplicationSettingNode":
        return cls(
            key=setting.key,
            category=setting.category,
            value_type=setting.value_type,
            value=setting.value,
            description=setting.description,
            updated_at=setting.updated_at.isoformat() if setting.updated_at else "",
        )


@strawberry.input
class ApplicationSettingInput:
    key: str
    value: strawberry.scalars.JSON


@strawberry.type
class ApplicationSettingError:
    field: str
    code: str
    message: str


@strawberry.type
class ApplicationSettingsPayload:
    ok: bool
    settings: list[ApplicationSettingNode]
    errors: list[ApplicationSettingError]


def setting_value_to_python(value: Any) -> Any:
    return value


@strawberry.type
class ImportSourceConfigNode:
    id: str
    name: str
    source_type: str = strawberry.field(name="sourceType")
    domain: str
    path: str
    file_pattern: str = strawberry.field(name="filePattern")
    archive_path: str | None = strawberry.field(name="archivePath")
    error_path: str | None = strawberry.field(name="errorPath")
    is_active: bool = strawberry.field(name="isActive")
    is_archived: bool = strawberry.field(name="isArchived")
    polling_interval_minutes: int | None = strawberry.field(name="pollingIntervalMinutes")
    last_checked_at: str | None = strawberry.field(name="lastCheckedAt")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_model(cls, config) -> "ImportSourceConfigNode":
        return cls(
            id=str(config.id),
            name=config.name,
            source_type=config.source_type,
            domain=config.domain,
            path=config.path,
            file_pattern=config.file_pattern,
            archive_path=config.archive_path or None,
            error_path=config.error_path or None,
            is_active=config.is_active,
            is_archived=config.is_archived,
            polling_interval_minutes=config.polling_interval_minutes,
            last_checked_at=config.last_checked_at.isoformat() if config.last_checked_at else None,
            created_at=config.created_at.isoformat() if config.created_at else "",
            updated_at=config.updated_at.isoformat() if config.updated_at else "",
        )


@strawberry.input
class ImportSourceConfigInput:
    name: str
    source_type: str = strawberry.field(name="sourceType")
    domain: str
    path: str
    file_pattern: str = strawberry.field(name="filePattern")
    archive_path: str | None = strawberry.field(name="archivePath", default=None)
    error_path: str | None = strawberry.field(name="errorPath", default=None)
    is_active: bool | None = strawberry.field(name="isActive", default=None)
    polling_interval_minutes: int | None = strawberry.field(name="pollingIntervalMinutes", default=None)


@strawberry.input
class ImportSourceConfigUpdateInput:
    name: str | None = None
    source_type: str | None = strawberry.field(name="sourceType", default=None)
    domain: str | None = None
    path: str | None = None
    file_pattern: str | None = strawberry.field(name="filePattern", default=None)
    archive_path: str | None = strawberry.field(name="archivePath", default=None)
    error_path: str | None = strawberry.field(name="errorPath", default=None)
    is_active: bool | None = strawberry.field(name="isActive", default=None)
    polling_interval_minutes: int | None = strawberry.field(name="pollingIntervalMinutes", default=None)


@strawberry.type
class ImportSourceConfigPayload:
    ok: bool
    config: ImportSourceConfigNode | None = None
    errors: list[ApplicationSettingError]


@strawberry.type
class ImportSourcePathTestPayload:
    ok: bool
    exists: bool | None = None
    readable: bool | None = None
    message: str
    last_checked_at: str | None = strawberry.field(name="lastCheckedAt")
    errors: list[ApplicationSettingError]


@strawberry.type
class ImportSourceConfigsResult:
    items: list[ImportSourceConfigNode]
    page_info: PageInfo = strawberry.field(name="pageInfo")
