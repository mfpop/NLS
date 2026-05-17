import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Bell, Check, ChevronDown, Cog, DatabaseZap, Eye, Globe2, Lock, RefreshCw, Save, ShieldCheck, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { GraphqlStatusPage } from "@/pages/graphql-status";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { APPLICATION_SETTINGS_QUERY } from "@/graphql/applicationSettingsQueries";
import { UPDATE_APPLICATION_SETTINGS } from "@/graphql/applicationSettingsMutations";
import type { ApplicationSetting, ApplicationSettingInput } from "@/types/applicationSettings";
import { useThemeStore } from "@/stores/theme";
import { theme } from "../../styles/themeTokens";

type SettingsTab = "settings" | "graphql-status";

type FieldType = "select" | "boolean" | "number" | "text";

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: Array<{ label: string; value: string }>;
}

interface UpdateApplicationSettingsResponse {
  updateApplicationSettings?: {
    ok: boolean;
    errors?: Array<{ message: string }>;
  };
}

const SETTING_SECTIONS: Array<{ id: string; title: string; description: string; icon: React.ReactNode; fields: FieldConfig[] }> = [
  {
    id: "appearance",
    title: "Appearance",
    description: "Default visual behavior for the application shell.",
    icon: <Eye className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "appearance.theme_default", label: "Default theme", type: "select", options: [{ label: "System", value: "system" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }] },
      { key: "appearance.brand_name", label: "Application name", type: "text" },
    ],
  },
  {
    id: "localization",
    title: "Localization",
    description: "Language, timezone, unit, and display formatting.",
    icon: <Globe2 className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "localization.language", label: "Language", type: "select", options: [{ label: "English (US)", value: "en-US" }, { label: "Spanish", value: "es-MX" }] },
      { key: "localization.timezone", label: "Timezone", type: "select", options: [{ label: "UTC", value: "UTC" }, { label: "America/Los Angeles", value: "America/Los_Angeles" }, { label: "America/Mexico City", value: "America/Mexico_City" }] },
      { key: "localization.date_format", label: "Date format", type: "select", options: [{ label: "YYYY-MM-DD", value: "YYYY-MM-DD" }, { label: "MM/DD/YYYY", value: "MM/DD/YYYY" }, { label: "DD/MM/YYYY", value: "DD/MM/YYYY" }] },
      { key: "localization.time_format", label: "Time format", type: "select", options: [{ label: "24-hour", value: "24h" }, { label: "12-hour", value: "12h" }] },
      { key: "localization.unit_system", label: "Unit system", type: "select", options: [{ label: "Metric", value: "metric" }, { label: "Imperial", value: "imperial" }] },
      { key: "localization.decimal_precision", label: "Decimal precision", type: "number" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Application-level notification behavior.",
    icon: <Bell className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "notifications.in_app_enabled", label: "In-app notifications", type: "boolean" },
      { key: "notifications.email_enabled", label: "Email notifications", type: "boolean" },
    ],
  },
  {
    id: "audit",
    title: "Audit / Diagnostics",
    description: "Application audit and diagnostics behavior.",
    icon: <ShieldCheck className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "audit.audit_log_enabled", label: "Audit logging", type: "boolean" },
      { key: "audit.diagnostics_level", label: "Diagnostics level", type: "select", options: [{ label: "Standard", value: "standard" }, { label: "Verbose", value: "verbose" }, { label: "Errors only", value: "errors" }] },
    ],
  },
  {
    id: "security",
    title: "Security",
    description: "Session and authentication behavior.",
    icon: <Lock className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "security.session_timeout_minutes", label: "Session timeout (minutes)", type: "number" },
      { key: "security.mfa_required", label: "Require MFA", type: "boolean" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "API and outbound integration switches.",
    icon: <DatabaseZap className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "integrations.api_enabled", label: "API integrations", type: "boolean" },
      { key: "integrations.webhooks_enabled", label: "Webhooks", type: "boolean" },
    ],
  },
  {
    id: "system",
    title: "System Preferences",
    description: "Application feature controls.",
    icon: <SlidersHorizontal className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "system.feature_flags", label: "Feature flags (JSON)", type: "text" },
    ],
  },
];

export function ApplicationSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [diagnosticsMessage, setDiagnosticsMessage] = useState<string | null>(null);
  const setTheme = useThemeStore((state) => state.setTheme);
  const { data, loading, error, refetch } = useQuery<{ applicationSettings: ApplicationSetting[] }>(APPLICATION_SETTINGS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const [updateSettings, { loading: saving }] = useMutation<UpdateApplicationSettingsResponse>(UPDATE_APPLICATION_SETTINGS, { refetchQueries: [APPLICATION_SETTINGS_QUERY] });

  const tabs: { value: SettingsTab; label: string }[] = [
    { value: "settings", label: "Settings" },
    { value: "graphql-status", label: "GraphQL Status" },
  ];

  const activeTabLabel = tabs.find((t) => t.value === activeTab)?.label || "Overview";
  const buttonClass = "inline-flex h-7 items-center gap-1.5 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70";
  const settingsByKey = useMemo(() => new Map((data?.applicationSettings ?? []).map((setting) => [setting.key, setting])), [data]);
  const dirtyInputs = useMemo<ApplicationSettingInput[]>(() => Object.entries(draft).map(([key, value]) => ({ key, value })), [draft]);
  const isDirty = dirtyInputs.length > 0;
  const settingsLoaded = Boolean(data?.applicationSettings?.length);
  const validationErrors = useMemo(() => validateSettings(draft), [draft]);
  const isValid = validationErrors.length === 0;
  const canAttemptSave = settingsLoaded && isDirty && !saving;
  const auditEnabled = Boolean(draft["audit.audit_log_enabled"] ?? settingsByKey.get("audit.audit_log_enabled")?.value);
  const diagnosticsLevel = String(draft["audit.diagnostics_level"] ?? settingsByKey.get("audit.diagnostics_level")?.value ?? "standard");

  const getValue = (key: string) => draft[key] ?? settingsByKey.get(key)?.value ?? "";
  const applyApplicationTheme = (value: string) => {
    if (value !== "system" && value !== "light" && value !== "dark") return;
    setTheme(value);
  };
  useEffect(() => {
    const themeValue = settingsByKey.get("appearance.theme_default")?.value;
    if (themeValue === "system" || themeValue === "light" || themeValue === "dark") {
      applyApplicationTheme(themeValue);
    }
  }, [settingsByKey]);

  const setValue = (key: string, value: unknown) => {
    setStatusMessage(null);
    setDraft((previous) => ({ ...previous, [key]: value }));
    if (key === "appearance.theme_default" && (value === "system" || value === "light" || value === "dark")) {
      applyApplicationTheme(value);
    }
  };
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setDraft({});
    setStatusMessage(null);
    try {
      const result = await refetch();
      const themeValue = result.data?.applicationSettings?.find((setting) => setting.key === "appearance.theme_default")?.value;
      if (themeValue === "system" || themeValue === "light" || themeValue === "dark") {
        applyApplicationTheme(themeValue);
      }
      setStatusMessage("Application settings refreshed.");
    } catch (refreshError) {
      setStatusMessage(refreshError instanceof Error ? refreshError.message : "Refresh failed.");
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleSave = async () => {
    if (!canAttemptSave) {
      setStatusMessage(!settingsLoaded ? "Settings must load before saving." : validationErrors.join(", ") || "Make a change before saving.");
      return;
    }
    if (!isValid) {
      setStatusMessage(validationErrors.join(", "));
      return;
    }
    try {
      const response = await updateSettings({ variables: { settings: dirtyInputs } });
      const payload = response.data?.updateApplicationSettings;
      if (payload?.ok) {
        setDraft({});
        const themeValue = dirtyInputs.find((input) => input.key === "appearance.theme_default")?.value;
        if (themeValue === "system" || themeValue === "light" || themeValue === "dark") {
          applyApplicationTheme(themeValue);
        }
        setStatusMessage("Application settings saved.");
        return;
      }
      setStatusMessage(payload?.errors?.map((item: { message: string }) => item.message).join(", ") || "Save failed.");
    } catch (saveError) {
      setStatusMessage(saveError instanceof Error ? saveError.message : "Save failed.");
    }
  };
  const handleRunDiagnostics = () => {
    const settingCount = data?.applicationSettings?.length ?? 0;
    const auditState = auditEnabled ? "audit logging enabled" : "audit logging disabled";
    setDiagnosticsMessage(`${settingCount} settings loaded; ${auditState}; diagnostics level ${diagnosticsLevel}.`);
  };

  return (
    <AppPageLayout
      icon={<Cog />}
      title="Application Settings"
      subtitle="Configure application behavior, security, localization, integrations, and diagnostics."
      toolbar={
        <div className="flex w-full items-center gap-1">
          <div className="relative">
          <button
            className={buttonClass}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            <Cog className="h-4 w-4 stroke-current" />
            <span className="truncate max-w-28">{activeTabLabel}</span>
            <ChevronDown className={"h-4 w-4 stroke-current transition " + (isDropdownOpen ? "rotate-180" : "rotate-0")} />
          </button>
          {isDropdownOpen && (
            <div className={`absolute left-0 z-10 mt-1 w-44 rounded-lg border p-1 shadow-lg ${theme.dropdown}`}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    className={
                      "flex h-7 w-full items-center gap-2 rounded px-2 text-left text-[11px] " +
                      (isActive
                        ? `font-medium ${theme.iconBoxEmerald}`
                        : `${theme.textSecondary} ${theme.interactiveRow}`)
                    }
                    onClick={() => {
                      setActiveTab(tab.value);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
          </div>
          <span className="mx-1 h-5 w-px shrink-0 bg-muted" />
          <span className={`hidden text-[11px] font-medium md:inline ${theme.textMuted}`}>System behavior only</span>
          <div className="flex-1" />
          <button type="button" onClick={handleRefresh} disabled={isRefreshing}
            className={buttonClass}>
            <RefreshCw className={`h-3.5 w-3.5 stroke-current ${loading || isRefreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <span className="mx-1 h-5 w-px shrink-0 bg-muted" />
          <button type="button" onClick={handleSave} disabled={!canAttemptSave} title={!settingsLoaded ? "Settings must load successfully before saving." : !isDirty ? "Make a change before saving." : !isValid ? validationErrors.join(", ") : "Save application settings"}
            className={`inline-flex h-7 items-center gap-1.5 rounded px-3 text-[11px] font-semibold ${!canAttemptSave ? `${theme.chip} ${theme.textDisabled}` : theme.buttonSuccessSolid}`}>
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" /> : <Save className="h-3.5 w-3.5 stroke-current" />} Save
          </button>
        </div>
      }
      footer={<span>Application Settings controls app behavior only. Manufacturing master data remains in Data Management.</span>}
    >
      <div className="h-full overflow-y-auto p-2">
        {activeTab === "settings" && (
          <div className="space-y-2">
            <div className={`flex h-8 items-center rounded border px-2.5 text-[10px] ${theme.infoBanner}`}>
              <div className="flex min-w-0 items-center gap-2">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 stroke-current" />
                <p className="min-w-0 truncate">
                  <span className="font-semibold">Scope:</span> Application Settings controls app behavior only. Manufacturing master data stays in Data Management.
                </p>
              </div>
            </div>
            {loading && !data && <EmptyState message="Loading application settings..." />}
            {error && <EmptyState tone="error" message={error.message} />}
            {statusMessage && (
              <div className={`flex items-center gap-2 rounded border px-3 py-2 text-[11px] ${isSuccessMessage(statusMessage) ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
                <Check className="h-3.5 w-3.5 stroke-current" /> {statusMessage}
              </div>
            )}
            {validationErrors.length > 0 && (
              <div className="rounded border border-warning/35 bg-warning/10 px-3 py-1.5 text-[10px] text-warning">
                {validationErrors.join(", ")}
              </div>
            )}
            <div className="grid auto-rows-fr gap-2 xl:grid-cols-4">
              {SETTING_SECTIONS.map((section) => (
                <SettingsCard
                  key={section.id}
                  sectionId={section.id}
                  title={section.title}
                  description={section.description}
                  icon={section.icon}
                  themeValue={String(getValue("appearance.theme_default") || "system")}
                  auditEnabled={auditEnabled}
                  diagnosticsLevel={diagnosticsLevel}
                  diagnosticsMessage={diagnosticsMessage}
                  onRunDiagnostics={handleRunDiagnostics}
                >
                  {section.fields.map((field) => (
                    <SettingField
                      key={field.key}
                      field={field}
                      value={getValue(field.key)}
                      description={settingsByKey.get(field.key)?.description || ""}
                      onChange={(value) => setValue(field.key, value)}
                    />
                  ))}
                </SettingsCard>
              ))}
            </div>
          </div>
        )}
        {activeTab === "graphql-status" && <GraphqlStatusPage />}
      </div>
    </AppPageLayout>
  );
}

function SettingsCard({ sectionId, title, description, icon, children, themeValue, auditEnabled, diagnosticsLevel, diagnosticsMessage, onRunDiagnostics }: { sectionId: string; title: string; description: string; icon: React.ReactNode; children: React.ReactNode; themeValue?: string; auditEnabled?: boolean; diagnosticsLevel?: string; diagnosticsMessage?: string | null; onRunDiagnostics?: () => void }) {
  return (
    <section className={`flex h-full flex-col rounded-lg border p-2 shadow-sm ${theme.card}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>{icon}</span>
        <div className="min-w-0">
          <h2 className={`text-[12px] font-bold ${theme.textPrimary}`}>{title}</h2>
          <p className={`truncate text-[10px] ${theme.textMuted}`}>{description}</p>
        </div>
      </div>
      <div className="grid gap-1.5">{children}</div>
      {sectionId === "appearance" && <ThemePreview value={themeValue || "system"} />}
      {sectionId === "audit" && <AuditDiagnosticsStatus auditEnabled={Boolean(auditEnabled)} diagnosticsLevel={diagnosticsLevel || "standard"} diagnosticsMessage={diagnosticsMessage} onRunDiagnostics={onRunDiagnostics} />}
    </section>
  );
}

function ThemePreview({ value }: { value: string }) {
  return (
    <div className="mt-auto grid grid-cols-3 gap-1 pt-1.5">
      {["system", "light", "dark"].map((option) => {
        const active = value === option;
        return (
          <div key={option} className={`h-8 rounded border px-1.5 py-1 ${active ? "border-primary bg-primary/10" : "border-border bg-muted"}`}>
            <div className={`mb-1 h-1 rounded ${option === "dark" ? "bg-foreground" : option === "light" ? "bg-card" : "bg-accent"}`} />
            <p className={`truncate text-[9px] font-semibold capitalize ${active ? "text-primary" : theme.textMuted}`}>{option}</p>
          </div>
        );
      })}
    </div>
  );
}

function AuditDiagnosticsStatus({ auditEnabled, diagnosticsLevel, diagnosticsMessage, onRunDiagnostics }: { auditEnabled: boolean; diagnosticsLevel: string; diagnosticsMessage?: string | null; onRunDiagnostics?: () => void }) {
  const levelLabel = diagnosticsLevel === "verbose" ? "Verbose diagnostics" : diagnosticsLevel === "errors" ? "Errors only" : "Standard diagnostics";
  return (
    <div className="mt-auto space-y-1 pt-1.5 text-[10px]">
      <div className="grid grid-cols-2 gap-1">
        <div className={`rounded border px-1.5 py-1 ${auditEnabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground"}`}>
          <span className="block font-semibold">{auditEnabled ? "Audit active" : "Audit off"}</span>
          <span className="block truncate">Save events tracked</span>
        </div>
        <div className="rounded border border-border bg-muted px-1.5 py-1 text-muted-foreground">
          <span className="block font-semibold">{levelLabel}</span>
          <span className="block truncate">Runtime visibility</span>
        </div>
      </div>
      <button type="button" onClick={onRunDiagnostics} className="h-6 w-full rounded border border-input bg-card px-2 text-[10px] font-semibold text-muted-foreground hover:bg-muted">
        Run Diagnostics Check
      </button>
      {diagnosticsMessage && <p className={`truncate rounded border px-1.5 py-1 ${theme.chip}`}>{diagnosticsMessage}</p>}
    </div>
  );
}

function SettingField({ field, value, description, onChange }: { field: FieldConfig; value: unknown; description: string; onChange: (value: unknown) => void }) {
  return (
    <label className="grid grid-cols-[132px_1fr] items-center gap-2 rounded border border-border bg-muted px-2 py-1.5">
      <span className="min-w-0">
        <span className={`block truncate text-[11px] font-semibold ${theme.textSecondary}`}>{field.label}</span>
        {description && <span className={`block truncate text-[10px] ${theme.textMuted}`}>{description}</span>}
      </span>
      {field.type === "boolean" ? (
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 justify-self-start accent-primary" />
      ) : field.type === "select" ? (
        <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}
          className="h-7 rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20">
          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : field.type === "number" ? (
        <input type="number" value={Number(value ?? 0)} onChange={(event) => onChange(Number(event.target.value))}
          className="h-7 rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
      ) : (
        <input type="text" value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "")} onChange={(event) => {
          if (field.key === "system.feature_flags") {
            try {
              onChange(JSON.parse(event.target.value || "{}"));
            } catch {
              onChange(event.target.value);
            }
            return;
          }
          onChange(event.target.value);
        }}
          className="h-7 rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
      )}
    </label>
  );
}

function EmptyState({ message, tone = "neutral" }: { message: string; tone?: "neutral" | "error" }) {
  return (
    <div className={`rounded-lg border px-3 py-4 text-center text-xs ${tone === "error" ? "border-danger/30 bg-danger/10 text-danger" : `${theme.card} ${theme.textMuted}`}`}>
      {message}
    </div>
  );
}

function isSuccessMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("saved") || normalized.includes("refreshed");
}

function validateSettings(values: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const precision = values["localization.decimal_precision"];
  const timeout = values["security.session_timeout_minutes"];
  const flags = values["system.feature_flags"];
  if (precision !== undefined && (!Number.isInteger(Number(precision)) || Number(precision) < 0 || Number(precision) > 6)) {
    errors.push("Decimal precision must be 0-6");
  }
  if (timeout !== undefined && (!Number.isInteger(Number(timeout)) || Number(timeout) < 5 || Number(timeout) > 1440)) {
    errors.push("Session timeout must be 5-1440 minutes");
  }
  if (typeof flags === "string") {
    try {
      JSON.parse(flags || "{}");
    } catch {
      errors.push("Feature flags must be valid JSON");
    }
  }
  return errors;
}