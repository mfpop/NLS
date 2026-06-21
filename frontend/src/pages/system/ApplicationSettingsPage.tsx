import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Bell, Check, Cog, DatabaseZap, Eye, Globe2, Info, Lock, RefreshCw, Save, ShieldCheck, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { Toolbar, ToolbarButton } from "@/components/shared/Toolbar";
import { APPLICATION_SETTINGS_QUERY } from "@/graphql/applicationSettingsQueries";
import { UPDATE_APPLICATION_SETTINGS } from "@/graphql/applicationSettingsMutations";
import type { ApplicationSetting, ApplicationSettingInput } from "@/types/applicationSettings";
import { useThemeStore } from "@/stores/theme";
import { theme } from "../../styles/themeTokens";
import { ImportSourcesCard } from "./ImportSourcesCard";

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

const APPLICATION_SETTING_PREFIXES = [
  "appearance.",
  "localization.",
  "notifications.",
  "audit.",
  "security.",
  "integrations.",
  "system.",
] as const;

const MANUFACTURING_SETTING_PATTERNS = [
  /company/i,
  /plant/i,
  /production[-_.\s]?line/i,
  /department/i,
  /resource[-_.\s]?group/i,
  /resource/i,
  /material[-_.\s]?bin/i,
  /routing[-_.\s]?step/i,
  /product[-_.\s]?(family|model)/i,
  /capacity/i,
  /schedule/i,
  /kanban/i,
  /fifo/i,
  /supermarket/i,
  /manufacturing[-_.\s]?kpi/i,
] as const;

function isApplicationSettingsKey(key: string): boolean {
  return APPLICATION_SETTING_PREFIXES.some((prefix) => key.startsWith(prefix))
    && !MANUFACTURING_SETTING_PATTERNS.some((pattern) => pattern.test(key));
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
      { key: "security.self_registration_enabled", label: "Self-registration", type: "boolean" },
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
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [diagnosticsMessage, setDiagnosticsMessage] = useState<string | null>(null);
  const setTheme = useThemeStore((state) => state.setTheme);
  const { data, loading, error, refetch } = useQuery<{ applicationSettings: ApplicationSetting[] }>(APPLICATION_SETTINGS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const [updateSettings, { loading: saving }] = useMutation<UpdateApplicationSettingsResponse>(UPDATE_APPLICATION_SETTINGS, { refetchQueries: [APPLICATION_SETTINGS_QUERY] });

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
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    if (!diagnosticsMessage) return;
    const timer = setTimeout(() => setDiagnosticsMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [diagnosticsMessage]);

  const setValue = (key: string, value: unknown) => {
    if (!isApplicationSettingsKey(key)) {
      setStatusMessage("Application Settings cannot edit manufacturing domain configuration.");
      return;
    }
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
      await refetch();
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
    if (dirtyInputs.some((input) => !isApplicationSettingsKey(input.key))) {
      setStatusMessage("Blocked: Application Settings can only persist system/runtime behavior.");
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
    <div className="relative">
      <AppPageLayout
        icon={<Cog />}
        iconClass={theme.iconBoxBrand}
        title="Application Settings"
        subtitle="Configure application behavior, security, localization, integrations, and diagnostics."
        toolbar={
          <Toolbar
            left={
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <Cog className="h-4 w-4" />
                <span className="hidden md:inline">System behavior only</span>
              </div>
            }
            right={
              <>
                <ToolbarButton icon={RefreshCw} label={isRefreshing ? "Refreshing..." : "Refresh"} onClick={handleRefresh} disabled={isRefreshing || !settingsLoaded} />
                <ToolbarButton icon={Save} label={saving ? "Saving..." : "Save"} onClick={handleSave} disabled={!canAttemptSave} variant="success" />
              </>
            }
          />
        }
        footer={<span>Application Settings controls application behavior only. Manufacturing modules control manufacturing operations.</span>}
      >
        <div className="h-full overflow-y-auto p-2">
          <div className="space-y-2">
                <div className="flex h-8 items-center rounded border border-info/20 bg-info/10 px-2.5 text-[10px] text-info">
              <div className="flex min-w-0 items-center gap-2">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 stroke-current" />
                <p className="min-w-0 truncate">
                  <span className="font-semibold">Domain boundary:</span> Application Settings controls system/runtime behavior only. Manufacturing structure, routing, materials, capacity, and schedules stay in manufacturing modules.
                </p>
              </div>
            </div>
            {loading && !data && <EmptyState message="Loading application settings..." />}
            {error && <EmptyState tone="error" message={error.message} />}
            {validationErrors.length > 0 && (
              <div className="rounded border border-warning/25 bg-warning/10 px-3 py-1.5 text-[10px] text-warning">
                {validationErrors.join(", ")}
              </div>
            )}
            <div className="grid gap-2 xl:grid-cols-4">
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
              <DiagnosticsSummaryCard auditEnabled={auditEnabled} settingsLoaded={settingsLoaded} lastCheckLabel={new Date().toLocaleTimeString()} onOpenDiagnostics={() => navigate("/system/diagnostics")} />
              <ImportSourcesCard />
            </div>
        </div>
      </div>
    </AppPageLayout>
      {statusMessage && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center pt-4">
          <div className={`pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-sm ${isSuccessMessage(statusMessage) ? "border-success/25 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
            <Info className="h-3.5 w-3.5 shrink-0 stroke-current" />
            <span className="truncate">{statusMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsCard({ sectionId, title, description, icon, children, themeValue, auditEnabled, diagnosticsLevel, diagnosticsMessage, onRunDiagnostics }: { sectionId: string; title: string; description: string; icon: React.ReactNode; children: React.ReactNode; themeValue?: string; auditEnabled?: boolean; diagnosticsLevel?: string; diagnosticsMessage?: string | null; onRunDiagnostics?: () => void }) {
  return (
    <section className="flex flex-col rounded-lg border border-border/10 bg-card p-2 shadow-md shadow-foreground/5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>{icon}</span>
        <div className="min-w-0">
          <h2 className="text-[12px] font-extrabold text-foreground">{title}</h2>
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
    <div className="mt-1.5 grid grid-cols-3 gap-1">
      {["system", "light", "dark"].map((option) => {
        const active = value === option;
        return (
          <div key={option} className={`relative flex h-8 flex-col justify-center rounded border px-1.5 py-1 ${active ? "border-primary/40 bg-primary/10 text-primary shadow-sm" : "border-border/15 bg-muted/40 text-muted-foreground"}`}>
            {active && <Check className="absolute right-1 top-1 h-2.5 w-2.5 stroke-current" />}
            <div className={`mb-1 h-1 rounded ${option === "dark" ? "bg-foreground" : option === "light" ? "bg-card" : "bg-accent"}`} />
            <p className="truncate pr-3 text-[9px] font-semibold capitalize">{option}</p>
          </div>
        );
      })}
    </div>
  );
}

function DiagnosticsSummaryCard({ auditEnabled, settingsLoaded, lastCheckLabel, onOpenDiagnostics }: { auditEnabled: boolean; settingsLoaded: boolean; lastCheckLabel: string; onOpenDiagnostics: () => void }) {
  return (
    <button type="button" onClick={onOpenDiagnostics} className="flex flex-col rounded-lg border border-border/10 bg-card p-2 text-left shadow-md shadow-foreground/5 transition-colors hover:bg-muted/45 focus:outline-none focus:ring-2 focus:ring-ring/20">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-settings/15 text-sidebar-settings">
          <ShieldCheck className="h-4 w-4 stroke-current" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[12px] font-extrabold text-foreground">Diagnostics Summary</h2>
          <p className="truncate text-[10px] text-muted-foreground">Runtime readiness snapshot.</p>
        </div>
      </div>
      <div className="grid gap-1.5 text-[10px]">
        <SummaryRow label="GraphQL" value={settingsLoaded ? "OK" : "Loading"} ok={settingsLoaded} />
        <SummaryRow label="DB" value={settingsLoaded ? "OK" : "Loading"} ok={settingsLoaded} />
        <SummaryRow label="Audit" value={auditEnabled ? "Active" : "Off"} ok={auditEnabled} />
        <SummaryRow label="Last check" value={lastCheckLabel} />
      </div>
    </button>
  );
}

function SummaryRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded bg-muted/40 px-2 py-1">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ok === undefined ? "bg-muted-foreground/50" : ok ? "bg-success" : "bg-warning"}`} />
      <span className="min-w-0 flex-1 truncate font-semibold text-muted-foreground">{label}</span>
      <span className="truncate text-right font-bold text-foreground">{value}</span>
    </div>
  );
}

function AuditDiagnosticsStatus({ auditEnabled, diagnosticsLevel, diagnosticsMessage, onRunDiagnostics }: { auditEnabled: boolean; diagnosticsLevel: string; diagnosticsMessage?: string | null; onRunDiagnostics?: () => void }) {
  const levelLabel = diagnosticsLevel === "verbose" ? "Verbose diagnostics" : diagnosticsLevel === "errors" ? "Errors only" : "Standard diagnostics";
  return (
    <div className="mt-auto space-y-1 pt-1.5 text-[10px]">
      <div className="grid grid-cols-2 gap-1">
        <div className={`rounded px-1.5 py-1 ${auditEnabled ? "bg-success/10 text-success" : "bg-muted/40 text-muted-foreground"}`}>
          <span className="block font-semibold">{auditEnabled ? "Audit active" : "Audit off"}</span>
          <span className="block truncate">Save events tracked</span>
        </div>
        <div className="rounded bg-muted/40 px-1.5 py-1 text-muted-foreground">
          <span className="block font-semibold">{levelLabel}</span>
          <span className="block truncate">Runtime visibility</span>
        </div>
      </div>
      <button type="button" onClick={onRunDiagnostics} className="h-6 w-full rounded border border-border/25 bg-card px-2 text-[10px] font-semibold text-muted-foreground hover:bg-muted">
        Run Diagnostics Check
      </button>
      {diagnosticsMessage && <p className="truncate rounded bg-muted/40 px-1.5 py-1 text-muted-foreground">{diagnosticsMessage}</p>}
    </div>
  );
}

function SettingField({ field, value, description, onChange }: { field: FieldConfig; value: unknown; description: string; onChange: (value: unknown) => void }) {
  return (
    <label className="grid grid-cols-[132px_1fr] items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
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
    <div className={`rounded-lg border px-3 py-4 text-center text-xs ${tone === "error" ? "border-danger/25 bg-danger/10 text-danger" : "border-border/20 bg-card text-muted-foreground shadow-sm shadow-foreground/5"}`}>
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