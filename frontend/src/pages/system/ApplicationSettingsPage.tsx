import { useEffect, useMemo, useState, useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  Cog, Globe2, Lock, Bell, Hash, Flag, RefreshCw, Save, X, TriangleAlert, Info,
  Undo2,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarButton } from "@/components/layout/PageToolbar";
import { APPLICATION_SETTINGS_QUERY } from "@/graphql/applicationSettingsQueries";
import { UPDATE_APPLICATION_SETTINGS } from "@/graphql/applicationSettingsMutations";
import type { ApplicationSetting, ApplicationSettingInput } from "@/types/applicationSettings";
import { theme } from "@/styles/themeTokens";
import { formatDateFull } from "@/utils/dateFormat";

type FieldType = "select" | "boolean" | "number" | "text" | "json";

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  placeholder?: string;
}

interface SectionConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: FieldConfig[];
}

interface UpdateSettingsResponse {
  updateApplicationSettings?: {
    ok: boolean;
    errors?: Array<{ message: string }>;
  };
}

// Section order: left column = General, Notification Defaults, Numbering / Codes
//                right column = Security Defaults, Localization Defaults, Feature Flags
const SETTING_SECTIONS: SectionConfig[] = [
  // LEFT COLUMN
  {
    id: "general",
    title: "General",
    description: "Global application identity and behavior defaults.",
    icon: <Cog className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "appearance.brand_name", label: "Application name", type: "text" },
      { key: "general.app_base_url", label: "Application base URL", type: "text" },
    ],
  },
  {
    id: "notifications",
    title: "Notification Defaults",
    description: "System-wide notification behavior defaults.",
    icon: <Bell className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "notifications.in_app_enabled", label: "Default in-app notifications", type: "boolean" },
      { key: "notifications.email_enabled", label: "Default email notifications", type: "boolean" },
    ],
  },
  {
    id: "numbering",
    title: "Numbering / Codes",
    description: "Document and record numbering defaults.",
    icon: <Hash className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "numbering.document_prefix", label: "Document prefix", type: "text", placeholder: "DOC-" },
      { key: "numbering.task_prefix", label: "Task prefix", type: "text", placeholder: "TASK-" },
      { key: "numbering.mer_prefix", label: "MER prefix", type: "text", placeholder: "MER-" },
      { key: "numbering.audit_prefix", label: "Audit prefix", type: "text", placeholder: "AUD-" },
      { key: "numbering.safety_prefix", label: "Safety event prefix", type: "text", placeholder: "SAF-" },
      { key: "numbering.sequence_reset", label: "Sequence reset rule", type: "select", options: [{ label: "Never reset", value: "never" }, { label: "Yearly", value: "yearly" }, { label: "Monthly", value: "monthly" }] },
    ],
  },
  // RIGHT COLUMN
  {
    id: "security",
    title: "Security Defaults",
    description: "Session, authentication, and access policy defaults.",
    icon: <Lock className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "security.session_timeout_minutes", label: "Session timeout (minutes)", type: "number", min: 5, max: 1440 },
      { key: "security.mfa_required", label: "Require MFA", type: "boolean" },
      { key: "security.self_registration_enabled", label: "Self-registration allowed", type: "boolean" },
      { key: "security.password_reset_token_expiry_minutes", label: "Password reset token expiry (minutes)", type: "number", min: 5, max: 1440 },
    ],
  },
  {
    id: "localization",
    title: "Localization Defaults",
    description: "Global display and formatting defaults for the application.",
    icon: <Globe2 className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "localization.language", label: "Default language", type: "select", options: [{ label: "English (US)", value: "en-US" }, { label: "Spanish", value: "es-MX" }] },
      { key: "localization.timezone", label: "Default timezone", type: "select", options: [{ label: "UTC", value: "UTC" }, { label: "America/Los Angeles", value: "America/Los_Angeles" }, { label: "America/Mexico City", value: "America/Mexico_City" }] },
      { key: "localization.date_format", label: "Default date format", type: "select", options: [{ label: "YYYY-MM-DD", value: "YYYY-MM-DD" }, { label: "MM/DD/YYYY", value: "MM/DD/YYYY" }, { label: "DD/MM/YYYY", value: "DD/MM/YYYY" }] },
      { key: "localization.time_format", label: "Default time format", type: "select", options: [{ label: "24-hour", value: "24h" }, { label: "12-hour", value: "12h" }] },
      { key: "localization.unit_system", label: "Default unit system", type: "select", options: [{ label: "Metric", value: "metric" }, { label: "Imperial", value: "imperial" }] },
      { key: "localization.decimal_precision", label: "Default decimal precision", type: "number", min: 0, max: 6 },
    ],
  },
  {
    id: "feature_flags",
    title: "Feature Flags",
    description: "Feature switches and beta module toggles.",
    icon: <Flag className="h-4 w-4 stroke-current" />,
    fields: [
      { key: "system.feature_flags", label: "Feature flags", type: "json" },
    ],
  },
];

// ─── Sub-components ───

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
        checked ? "bg-primary" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

function LoadingSkeleton() {
  // Left column sections: General (2 fields), Notification (2), Numbering (6)
  // Right column sections: Security (4), Localization (6), Feature Flags (1)
  const leftFields = [2, 2, 6];
  const rightFields = [4, 6, 1];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 animate-pulse">
      <div>
        {leftFields.map((fcount, si) => (
          <div key={`l-${si}`} className={`${si > 0 ? "border-t border-border" : ""} md:border-r border-border`}>
            <div className="h-9 border-b border-border bg-muted px-3 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-muted/80" />
              <div className="h-3 w-28 rounded bg-muted/80" />
            </div>
            <div className="divide-y divide-border/50">
              {Array.from({ length: fcount }, (_, j) => (
                <div key={j} className="grid grid-cols-[1fr_220px] items-center gap-4 px-3 py-2 min-h-12">
                  <div className="space-y-1">
                    <div className="h-3 w-32 rounded bg-muted" />
                    <div className="h-2 w-48 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-full rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div>
        {rightFields.map((fcount, si) => (
          <div key={`r-${si}`} className={`${si > 0 ? "border-t border-border" : ""}`}>
            <div className="h-9 border-b border-border bg-muted px-3 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-muted/80" />
              <div className="h-3 w-28 rounded bg-muted/80" />
            </div>
            <div className="divide-y divide-border/50">
              {Array.from({ length: fcount }, (_, j) => (
                <div key={j} className="grid grid-cols-[1fr_220px] items-center gap-4 px-3 py-2 min-h-12">
                  <div className="space-y-1">
                    <div className="h-3 w-32 rounded bg-muted" />
                    <div className="h-2 w-48 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-full rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page Component ───

export function ApplicationSettingsPage() {
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState(false);

  const { data, loading, error, refetch } = useQuery<{ applicationSettings: ApplicationSetting[] }>(
    APPLICATION_SETTINGS_QUERY,
    { fetchPolicy: "cache-and-network", errorPolicy: "all" }
  );
  const [updateSettings, { loading: saving }] = useMutation<UpdateSettingsResponse>(UPDATE_APPLICATION_SETTINGS, {
    refetchQueries: [APPLICATION_SETTINGS_QUERY],
  });

  const settingsByKey = useMemo(() => new Map((data?.applicationSettings ?? []).map((s) => [s.key, s])), [data]);
  const draftKeys = useMemo(() => new Set(Object.keys(draft)), [draft]);
  const draftInputs = useMemo<ApplicationSettingInput[]>(() => Object.entries(draft).map(([key, value]) => ({ key, value })), [draft]);
  const isDirty = draftInputs.length > 0;
  const settingsLoaded = Boolean(data?.applicationSettings?.length);
  const validationErrors = useMemo(() => validateSettings(draft), [draft]);
  const isValid = validationErrors.length === 0;
  const canSave = settingsLoaded && isDirty && !saving && isValid;

  const getValue = useCallback(
    (key: string) => (key in draft ? draft[key] : settingsByKey.get(key)?.value ?? ""),
    [draft, settingsByKey]
  );

  const isFieldDirty = useCallback((key: string) => draftKeys.has(key), [draftKeys]);

  // Auto-dismiss status messages
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  const setValue = useCallback((key: string, value: unknown) => {
    setStatusMessage(null);
    setDiscardConfirm(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const revertField = useCallback((key: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setDraft({});
    setDiscardConfirm(false);
    setStatusMessage(null);
    try {
      await refetch();
      setStatusMessage({ text: "Settings refreshed", type: "success" });
    } catch (err) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Refresh failed", type: "error" });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refetch]);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      if (!settingsLoaded) setStatusMessage({ text: "Settings must load before saving", type: "error" });
      else if (!isDirty) setStatusMessage({ text: "No changes to save", type: "error" });
      else if (!isValid) setStatusMessage({ text: validationErrors.join(". "), type: "error" });
      return;
    }
    try {
      const response = await updateSettings({ variables: { settings: draftInputs } });
      const payload = response.data?.updateApplicationSettings;
      if (payload?.ok) {
        const count = draftInputs.length;
        setDraft({});
        setDraftSavedAt(new Date().toISOString());
        setStatusMessage({ text: `${count} setting${count !== 1 ? "s" : ""} saved`, type: "success" });
        return;
      }
      setStatusMessage({
        text: payload?.errors?.map((e: { message: string }) => e.message).join(", ") || "Save failed",
        type: "error",
      });
    } catch (err) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Save failed", type: "error" });
    }
  }, [canSave, settingsLoaded, isDirty, isValid, validationErrors, updateSettings, draftInputs]);

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (canSave) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canSave, handleSave]);

  const handleReset = useCallback(() => {
    if (draftInputs.length === 0) return;
    setDiscardConfirm(true);
  }, [draftInputs]);

  const confirmDiscard = useCallback(() => {
    const count = draftInputs.length;
    setDraft({});
    setDiscardConfirm(false);
    setStatusMessage({ text: `${count} change${count !== 1 ? "s" : ""} discarded`, type: "success" });
  }, [draftInputs]);

  const cancelDiscard = useCallback(() => setDiscardConfirm(false), []);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return formatDateFull(iso);
  };

  const lastUpdated = useMemo(() => {
    const timestamps = data?.applicationSettings?.map((s) => s.updatedAt).filter(Boolean) ?? [];
    if (timestamps.length === 0) return null;
    return [...timestamps].sort().reverse()[0] ?? null;
  }, [data]);

  // Footer state text
  const footerState = useMemo(() => {
    if (saving) return "Saving...";
    if (isDirty) return `${draftInputs.length} unsaved change${draftInputs.length !== 1 ? "s" : ""}`;
    if (validationErrors.length > 0) return "Validation error";
    if (draftSavedAt) return `Saved: ${formatTime(draftSavedAt)}`;
    return "No changes";
  }, [saving, isDirty, draftInputs.length, validationErrors.length, draftSavedAt]);

  // Left column: indices 0,1,2 (General, Notification, Numbering)
  // Right column: indices 3,4,5 (Security, Localization, Feature Flags)
  const leftSections = SETTING_SECTIONS.slice(0, 3);
  const rightSections = SETTING_SECTIONS.slice(3, 6);

  return (
    <div className="relative h-full flex flex-col">
      <AppPageLayout
        icon={<Cog />}
        iconClass={theme.iconBoxBrand}
        title="Application Settings"
        subtitle="Configure global application defaults and system-wide behavior."
        toolbar={
          <PageToolbar
            leftSlot={
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <Cog className="h-4 w-4" />
                <span className="hidden md:inline">Global settings only</span>
                {isDirty && (
                  <span className="inline-flex items-center justify-center h-[18px] min-w-[22px] px-1.5 text-[10px] font-semibold rounded-sm border border-primary/20 bg-primary/10 text-primary whitespace-nowrap">
                    {draftInputs.length} changed
                  </span>
                )}
              </div>
            }
            leftWidthClass="w-72"
            actions={
              <div className="flex items-center gap-0.5">
                <ToolbarButton
                  icon={RefreshCw}
                  label={isRefreshing ? "Refreshing..." : "Refresh"}
                  onClick={handleRefresh}
                  disabled={isRefreshing || !settingsLoaded}
                  variant="neutral"
                />
                {isDirty && !discardConfirm && (
                  <ToolbarButton icon={X} label="Discard all" onClick={handleReset} variant="danger" />
                )}
                {isDirty && discardConfirm && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-warning font-medium">Discard changes?</span>
                    <button type="button" onClick={confirmDiscard}
                      className="inline-flex h-7 items-center rounded bg-warning px-2 text-[10px] font-semibold text-white hover:bg-warning/80">Yes</button>
                    <button type="button" onClick={cancelDiscard}
                      className="inline-flex h-7 items-center rounded border border-border bg-background px-2 text-[10px] text-muted-foreground hover:bg-muted">No</button>
                  </div>
                )}
                <ToolbarButton
                  icon={Save}
                  label={saving ? "Saving..." : "Save"}
                  onClick={handleSave}
                  disabled={!canSave}
                  variant="edit"
                />
              </div>
            }
          />
        }
        footer={
          <>
            <span className="font-medium">Application Settings</span>
            <span className={`${isDirty ? "text-warning font-medium" : "text-muted-foreground/60"}`}>
              {footerState}
            </span>
            <span className="flex-1" />
            <span className="text-muted-foreground/60">Last updated: {formatTime(lastUpdated)}</span>
          </>
        }
      >
        <div className="flex-1 min-h-0 overflow-y-auto bg-muted">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-1.5">
            {/* Domain banner - full width aligned with content */}
            <div className="flex h-9 items-center border border-primary/20 bg-primary/10 px-2.5 mb-3 text-xs text-primary overflow-hidden">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 stroke-current mr-2" />
              <p className="min-w-0 truncate">
                <span className="font-semibold">Domain boundary:</span> Application Settings controls global app defaults only. Manufacturing structure, ERP imports, diagnostics, integrations, and personal preferences are managed in their own modules.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="border border-danger/20 bg-danger/10 px-3 py-2 mb-3 text-xs text-danger flex items-center gap-2">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 stroke-current" />
                <span>{error.message}</span>
              </div>
            )}

            {/* Validation errors */}
            {validationErrors.length > 0 && isDirty && (
              <div className="border border-warning/20 bg-warning/10 px-3 py-1.5 mb-3 text-[10px] text-warning flex items-center gap-2">
                <TriangleAlert className="h-3 w-3 shrink-0 stroke-current" />
                <span>{validationErrors.join("; ")}</span>
              </div>
            )}

            {/* Settings grid - two columns */}
            {loading && !data ? (
              <LoadingSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border">
                {/* Left column: General, Notification Defaults, Numbering / Codes */}
                <div className="divide-y divide-slate-300">
                  {leftSections.map((section) => (
                    <section key={section.id} className="flex flex-col">
                      <div className="h-9 border-b border-border bg-muted px-3 flex items-center gap-2 group">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-primary">{section.icon}</span>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xs font-semibold text-foreground truncate">{section.title}</h2>
                        </div>
                        <span className="text-[9px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[180px] text-right">
                          {section.description}
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {section.fields.map((field) => {
                          const setting = settingsByKey.get(field.key);
                          const dirty = isFieldDirty(field.key);
                          const currentVal = getValue(field.key);
                          return (
                            <SettingRow
                              key={field.key}
                              field={field}
                              value={currentVal}
                              description={setting?.description || ""}
                              isDirty={dirty}
                              onChange={(v) => setValue(field.key, v)}
                              onRevert={() => revertField(field.key)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
                {/* Right column: Security Defaults, Localization Defaults, Feature Flags */}
                <div className="divide-y divide-slate-300">
                  {rightSections.map((section) => (
                    <section key={section.id} className="flex flex-col">
                      <div className="h-9 border-b border-border bg-muted px-3 flex items-center gap-2 group">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-primary">{section.icon}</span>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xs font-semibold text-foreground truncate">{section.title}</h2>
                        </div>
                        <span className="text-[9px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[180px] text-right">
                          {section.description}
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {section.fields.map((field) => {
                          const setting = settingsByKey.get(field.key);
                          const dirty = isFieldDirty(field.key);
                          const currentVal = getValue(field.key);
                          return (
                            <SettingRow
                              key={field.key}
                              field={field}
                              value={currentVal}
                              description={setting?.description || ""}
                              isDirty={dirty}
                              onChange={(v) => setValue(field.key, v)}
                              onRevert={() => revertField(field.key)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppPageLayout>

      {/* Floating status toast */}
      {statusMessage && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center pt-4 animate-in slide-in-from-top-2 fade-in duration-200">
          <div
            className={`pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm transition-all duration-200 ${
              statusMessage.type === "success"
                ? "border-success/20 bg-success/10/95 text-success"
                : "border-danger/20 bg-danger/10/95 text-danger"
            }`}
          >
            <Info className="h-3.5 w-3.5 shrink-0 stroke-current" />
            <span className="truncate">{statusMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SettingRow Component ───

interface SettingRowProps {
  field: FieldConfig;
  value: unknown;
  description: string;
  isDirty: boolean;
  onChange: (value: unknown) => void;
  onRevert: () => void;
}

function SettingRow({ field, value, description, isDirty, onChange, onRevert }: SettingRowProps) {
  const controlId = `setting-${field.key.replace(/\./g, "-")}`;
  return (
    <label
      htmlFor={field.type === "boolean" ? undefined : controlId}              className={`grid grid-cols-[1fr_220px] items-center gap-4 px-3 py-1.5 min-h-[40px] transition-colors duration-150 cursor-pointer ${
        isDirty ? "bg-primary/10/40" : "hover:bg-muted/50"
      }`}
    >
      {/* Label + description */}
      <div className="min-w-0 flex items-center gap-2">
        {isDirty && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/100 animate-in fade-in duration-150" title="Unsaved change" />
        )}
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground truncate">{field.label}</span>
          {description && (
            <span className="block text-xs text-muted-foreground truncate leading-tight">{description}</span>
          )}
        </div>
      </div>

      {/* Control + revert */}
      <div className="flex items-center gap-1 justify-end">
        <div className={field.type === "boolean" ? "w-9 shrink-0" : "w-[220px] shrink-0"}>
          {field.type === "boolean" ? (
            <Toggle checked={Boolean(value)} onChange={onChange} id={controlId} />
          ) : field.type === "select" ? (
            <select
              id={controlId}
              value={String(value ?? "")}
              onChange={(e) => onChange(e.target.value)}
              className={`h-8 w-full border bg-background px-2 text-xs text-foreground outline-none transition-colors duration-150 ${
                isDirty ? "border-primary/30 bg-primary/10/50 focus:border-primary" : "border-border focus:border-primary"
              } focus:ring-1 focus:ring-primary/30`}
            >
              {field.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : field.type === "number" ? (
            <input
              id={controlId}
              type="number"
              value={Number(value ?? 0)}
              min={field.min}
              max={field.max}
              onChange={(e) => onChange(Number(e.target.value))}
              className={`h-8 w-full border bg-background px-2 text-xs text-foreground outline-none transition-colors duration-150 ${
                isDirty ? "border-primary/30 bg-primary/10/50 focus:border-primary" : "border-border focus:border-primary"
              } focus:ring-1 focus:ring-primary/30`}
            />
          ) : field.type === "json" ? (
            <textarea
              id={controlId}
              value={typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "{}")}
              onChange={(e) => {
                try { onChange(JSON.parse(e.target.value || "{}")); }
                catch { onChange(e.target.value); }
              }}
              rows={3}
              placeholder='{ "key": "value" }'
              className={`h-full w-full border bg-background px-2 py-1 text-[10px] font-mono text-foreground outline-none transition-colors duration-150 resize-y ${
                isDirty ? "border-primary/30 bg-primary/10/50 focus:border-primary" : "border-border focus:border-primary"
              } focus:ring-1 focus:ring-primary/30`}
            />
          ) : (
            <input
              id={controlId}
              type="text"
              value={String(value ?? "")}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className={`h-8 w-full border bg-background px-2 text-xs text-foreground outline-none transition-colors duration-150 ${
                isDirty ? "border-primary/30 bg-primary/10/50 focus:border-primary" : "border-border focus:border-primary"
              } focus:ring-1 focus:ring-primary/30`}
            />
          )}
        </div>

        {isDirty && (
          <button
            type="button"
            onClick={onRevert}
            className="shrink-0 p-1 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded transition-colors duration-150"
            title="Revert this field"
          >
            <Undo2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </label>
  );
}

// ─── Helpers ───

function validateSettings(values: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const precision = values["localization.decimal_precision"];
  const timeout = values["security.session_timeout_minutes"];
  const tokenExpiry = values["security.password_reset_token_expiry_minutes"];
  const flags = values["system.feature_flags"];

  if (precision !== undefined && (!Number.isInteger(Number(precision)) || Number(precision) < 0 || Number(precision) > 6)) {
    errors.push("Decimal precision must be 0–6");
  }
  if (timeout !== undefined && (!Number.isInteger(Number(timeout)) || Number(timeout) < 5 || Number(timeout) > 1440)) {
    errors.push("Session timeout must be 5–1440 minutes");
  }
  if (tokenExpiry !== undefined && (!Number.isInteger(Number(tokenExpiry)) || Number(tokenExpiry) < 5 || Number(tokenExpiry) > 1440)) {
    errors.push("Token expiry must be 5–1440 minutes");
  }
  if (typeof flags === "string") {
    try { JSON.parse(flags || "{}"); } catch { errors.push("Feature flags must be valid JSON"); }
  }
  return errors;
}
