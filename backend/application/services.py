from typing import Any

from django.db import transaction

from application.models import ApplicationSetting
from application.settings_registry import SETTING_DEFINITIONS, is_allowed_setting_key


class ApplicationSettingsError(ValueError):
    pass


class ApplicationSettingsService:
    @staticmethod
    def ensure_defaults() -> None:
        for definition in SETTING_DEFINITIONS.values():
            ApplicationSetting.objects.get_or_create(
                key=definition.key,
                defaults={
                    "value": definition.default,
                    "value_type": definition.value_type,
                    "category": definition.category,
                    "description": definition.description,
                    "is_system": True,
                },
            )

    @staticmethod
    def list_settings(category: str | None = None) -> list[ApplicationSetting]:
        ApplicationSettingsService.ensure_defaults()
        qs = ApplicationSetting.objects.all()
        if category:
            qs = qs.filter(category=category)
        return list(qs.order_by("category", "key"))

    @staticmethod
    @transaction.atomic
    def update_settings(values: dict[str, Any]) -> list[ApplicationSetting]:
        ApplicationSettingsService.ensure_defaults()
        updated: list[ApplicationSetting] = []
        for key, value in values.items():
            if not is_allowed_setting_key(key):
                raise ApplicationSettingsError(f"{key} is not an allowed application setting")
            definition = SETTING_DEFINITIONS[key]
            setting = ApplicationSetting.objects.select_for_update().get(key=key)
            setting.value = value
            setting.value_type = definition.value_type
            setting.category = definition.category
            setting.description = definition.description
            setting.save(update_fields=["value", "value_type", "category", "description", "updated_at"])
            updated.append(setting)
        return updated
