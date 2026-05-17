from typing import Any

import strawberry

from application.models import ApplicationSetting


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
