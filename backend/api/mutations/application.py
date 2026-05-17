import strawberry

from api.types.application import (
    ApplicationSettingError,
    ApplicationSettingInput,
    ApplicationSettingNode,
    ApplicationSettingsPayload,
)
from application.services import ApplicationSettingsError, ApplicationSettingsService


@strawberry.type
class ApplicationSettingsMutation:
    @strawberry.mutation
    def update_application_settings(self, settings: list[ApplicationSettingInput]) -> ApplicationSettingsPayload:
        try:
            values = {setting.key: setting.value for setting in settings}
            updated = ApplicationSettingsService.update_settings(values)
            return ApplicationSettingsPayload(
                ok=True,
                settings=[ApplicationSettingNode.from_model(setting) for setting in updated],
                errors=[],
            )
        except ApplicationSettingsError as exc:
            return ApplicationSettingsPayload(
                ok=False,
                settings=[],
                errors=[ApplicationSettingError(field="settings", code="invalid_scope", message=str(exc))],
            )
