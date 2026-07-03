from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SettingDefinition:
    key: str
    category: str
    value_type: str
    default: Any
    description: str


SETTING_DEFINITIONS: dict[str, SettingDefinition] = {
    "appearance.theme_default": SettingDefinition("appearance.theme_default", "appearance", "STRING", "system", "Default theme for new sessions."),
    "appearance.brand_name": SettingDefinition("appearance.brand_name", "appearance", "STRING", "Nexus Lean Sync", "Application display name."),
    "localization.language": SettingDefinition("localization.language", "localization", "STRING", "en-US", "Default application language."),
    "localization.timezone": SettingDefinition("localization.timezone", "localization", "STRING", "UTC", "Default display timezone."),
    "localization.date_format": SettingDefinition("localization.date_format", "localization", "STRING", "YYYY-MM-DD", "Default date display format."),
    "localization.time_format": SettingDefinition("localization.time_format", "localization", "STRING", "24h", "Default time display format."),
    "localization.unit_system": SettingDefinition("localization.unit_system", "localization", "STRING", "metric", "Default unit display system."),
    "localization.decimal_precision": SettingDefinition("localization.decimal_precision", "localization", "INTEGER", 2, "Default decimal places for numeric display."),
    "notifications.email_enabled": SettingDefinition("notifications.email_enabled", "notifications", "BOOLEAN", False, "Enable outbound system email notifications."),
    "notifications.in_app_enabled": SettingDefinition("notifications.in_app_enabled", "notifications", "BOOLEAN", True, "Enable in-app system notifications."),
    "security.session_timeout_minutes": SettingDefinition("security.session_timeout_minutes", "security", "INTEGER", 60, "Idle session timeout in minutes."),
    "security.mfa_required": SettingDefinition("security.mfa_required", "security", "BOOLEAN", False, "Require multi-factor authentication when supported."),
    "security.self_registration_enabled": SettingDefinition("security.self_registration_enabled", "security", "BOOLEAN", True, "Allow users to self-register from the login page."),
    "general.app_base_url": SettingDefinition("general.app_base_url", "general", "STRING", "http://localhost:5173", "Base URL for the frontend application (used in emails)."),
    "integrations.api_enabled": SettingDefinition("integrations.api_enabled", "integrations", "BOOLEAN", True, "Enable application API integrations."),
    "integrations.webhooks_enabled": SettingDefinition("integrations.webhooks_enabled", "integrations", "BOOLEAN", False, "Enable outbound webhook integrations."),
    "system.feature_flags": SettingDefinition("system.feature_flags", "system", "JSON", {}, "Application feature flags."),
    "audit.audit_log_enabled": SettingDefinition("audit.audit_log_enabled", "audit", "BOOLEAN", True, "Enable application audit logging."),
    "security.password_reset_token_expiry_minutes": SettingDefinition("security.password_reset_token_expiry_minutes", "security", "INTEGER", 60, "Password reset token expiration in minutes."),
    "audit.diagnostics_level": SettingDefinition("audit.diagnostics_level", "audit", "STRING", "standard", "Application diagnostics verbosity."),
    "numbering.document_prefix": SettingDefinition("numbering.document_prefix", "numbering", "STRING", "DOC-", "Default document numbering prefix."),
    "numbering.task_prefix": SettingDefinition("numbering.task_prefix", "numbering", "STRING", "TASK-", "Default task numbering prefix."),
    "numbering.mer_prefix": SettingDefinition("numbering.mer_prefix", "numbering", "STRING", "MER-", "Default MER numbering prefix."),
    "numbering.audit_prefix": SettingDefinition("numbering.audit_prefix", "numbering", "STRING", "AUD-", "Default audit numbering prefix."),
    "numbering.safety_prefix": SettingDefinition("numbering.safety_prefix", "numbering", "STRING", "SAF-", "Default safety event numbering prefix."),
    "numbering.sequence_reset": SettingDefinition("numbering.sequence_reset", "numbering", "STRING", "never", "Numbering sequence reset rule."),
}


FORBIDDEN_SETTING_KEYWORDS = (
    "plant",
    "production_line",
    "department",
    "resource_group",
    "resource.",
    "product_family",
    "product_model",
    "product_variant",
    "part_number",
    "routing",
    "process_flow",
    "schedule",
    "shift",
    "material",
    "kanban",
    "fifo",
    "supermarket",
    "bom",
    "inventory",
    "capacity",
    "labor_assignment",
    "operator_assignment",
)


def is_allowed_setting_key(key: str) -> bool:
    normalized = key.strip().lower()
    return normalized in SETTING_DEFINITIONS and not any(token in normalized for token in FORBIDDEN_SETTING_KEYWORDS)
