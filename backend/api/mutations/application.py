import strawberry

from api.types.application import (
    ApplicationSettingError,
    ApplicationSettingInput,
    ApplicationSettingNode,
    ApplicationSettingsPayload,
    ImportSourceConfigInput,
    ImportSourceConfigNode,
    ImportSourceConfigPayload,
    ImportSourceConfigUpdateInput,
)
from manufacturing.domain.import_source_config_service import ImportSourceConfigError, ImportSourceConfigService
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

    @strawberry.mutation
    def create_import_source_config(self, input: ImportSourceConfigInput) -> ImportSourceConfigPayload:
        try:
            config = ImportSourceConfigService.create_config(_input_to_dict(input))
            return ImportSourceConfigPayload(
                ok=True,
                config=ImportSourceConfigNode.from_model(config),
                errors=[],
            )
        except ImportSourceConfigError as exc:
            return _import_source_error_payload(exc)

    @strawberry.mutation
    def update_import_source_config(
        self,
        id: str,
        input: ImportSourceConfigUpdateInput,
    ) -> ImportSourceConfigPayload:
        try:
            config = ImportSourceConfigService.update_config(int(id), _update_input_to_dict(input))
            return ImportSourceConfigPayload(
                ok=True,
                config=ImportSourceConfigNode.from_model(config),
                errors=[],
            )
        except ImportSourceConfigError as exc:
            return _import_source_error_payload(exc)

    @strawberry.mutation
    def archive_import_source_config(self, id: str) -> ImportSourceConfigPayload:
        try:
            config = ImportSourceConfigService.archive_config(int(id))
            return ImportSourceConfigPayload(
                ok=True,
                config=ImportSourceConfigNode.from_model(config),
                errors=[],
            )
        except ImportSourceConfigError as exc:
            return _import_source_error_payload(exc)


def _import_source_error_payload(exc: ImportSourceConfigError) -> ImportSourceConfigPayload:
    return ImportSourceConfigPayload(
        ok=False,
        config=None,
        errors=[ApplicationSettingError(field=exc.field, code=exc.code, message=exc.message)],
    )


def _input_to_dict(input: ImportSourceConfigInput) -> dict:
    return {
        "name": input.name,
        "source_type": input.source_type,
        "domain": input.domain,
        "path": input.path,
        "file_pattern": input.file_pattern,
        "archive_path": input.archive_path,
        "error_path": input.error_path,
        "is_active": input.is_active,
        "polling_interval_minutes": input.polling_interval_minutes,
    }


def _update_input_to_dict(input: ImportSourceConfigUpdateInput) -> dict:
    data: dict = {}
    if input.name is not None:
        data["name"] = input.name
    if input.source_type is not None:
        data["source_type"] = input.source_type
    if input.domain is not None:
        data["domain"] = input.domain
    if input.path is not None:
        data["path"] = input.path
    if input.file_pattern is not None:
        data["file_pattern"] = input.file_pattern
    if input.archive_path is not None:
        data["archive_path"] = input.archive_path
    if input.error_path is not None:
        data["error_path"] = input.error_path
    if input.is_active is not None:
        data["is_active"] = input.is_active
    if input.polling_interval_minutes is not None:
        data["polling_interval_minutes"] = input.polling_interval_minutes
    return data
