import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Sun,
  Moon,
  Palette,
  Monitor,
  Bell,
  Globe,
  Lock,
  LogOut,
  ChevronRight,
  SlidersHorizontal,
  Eye,
  Database,
  RefreshCw,
  CheckCheck,
} from "lucide-react";
import { ToolbarButton } from "@/components/layout/PageToolbar";
import { useThemeStore } from "@/stores/theme";
import { usePreferencesStore, type DensityMode, type SidebarMode, type UnitsSystem, type TimeFormatPref } from "@/stores/preferencesStore";

/* ── Category config ─────────────────────────────────────────────── */
interface Category {
  id: string;
  label: string;
  icon: typeof Sun;
  description: string;
}

const CATEGORIES: Category[] = [
  { id: "appearance", label: "Appearance", icon: Eye, description: "Theme, density, and sidebar" },
  { id: "workspace", label: "Workspace Defaults", icon: Monitor, description: "Default plant, line, and session memory" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "In-app, email, and alert preferences" },
  { id: "language", label: "Language & Region", icon: Globe, description: "Locale, timezone, and date formats" },
  { id: "data-display", label: "Data Display", icon: Database, description: "Tables, units, and record visibility" },
  { id: "privacy", label: "Privacy & Session", icon: Lock, description: "Auto-lock and session management" },
];

/* ── Reusable row components ─────────────────────────────────────── */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between min-h-14 border-b border-border px-4">
      <div className="min-w-0 flex-1 mr-3">
        <div className="text-xs font-medium text-foreground">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${
          checked ? "bg-accent" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transform ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SelectRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between min-h-14 border-b border-border px-4">
      <div className="min-w-0 flex-1 mr-3">
        <div className="text-xs font-medium text-foreground">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-[150px] rounded-[2px] border border-border bg-background px-2 text-xs text-muted-foreground outline-none transition hover:border-muted-foreground/40 focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberRow({
  label,
  description,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between min-h-14 border-b border-border px-4">
      <div className="min-w-0 flex-1 mr-3">
        <div className="text-xs font-medium text-foreground">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 w-20 rounded-[2px] border border-border bg-background px-2 text-xs text-muted-foreground outline-none transition hover:border-muted-foreground/40 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && <span className="text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function RadioRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  options: { label: string; value: string; icon?: typeof Sun }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-h-14 border-b border-border px-4 py-2 flex items-center justify-between">
      <div className="min-w-0 flex-1 mr-3">
        <div className="text-xs font-medium text-foreground">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="flex flex-wrap gap-1 shrink-0">
        {options.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-[2px] border text-xs font-medium transition-all focus:outline-none ${
                active
                  ? "border-emerald-500 bg-success/10 text-success"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Sun; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5 h-14 shrink-0 border-b border-border px-4 bg-muted">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] bg-accent/10 text-accent-foreground">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
        <p className="text-[11px] text-muted-foreground leading-4">{subtitle}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SAVE FEEDBACK BANNER
   ═══════════════════════════════════════════════════════════════════ */

function SaveFeedback({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success shadow-sm">
        <CheckCheck className="h-3.5 w-3.5" />
        {message}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CATEGORY PANELS
   ═══════════════════════════════════════════════════════════════════ */

function AppearancePanel() {
  const currentTheme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const density = usePreferencesStore((s) => s.density);
  const setDensity = usePreferencesStore((s) => s.setDensity);
  const sidebarDefault = usePreferencesStore((s) => s.sidebarDefault);
  const setSidebarDefault = usePreferencesStore((s) => s.setSidebarDefault);

  return (
    <div className="divide-y divide-border">
      <SectionHeader icon={Eye} title="Appearance" subtitle="Theme, density, and sidebar behavior" />

      <RadioRow
        label="Theme mode"
        description="Choose the visual mode for your workspace."
        value={currentTheme}
        options={[
          { label: "Light", value: "light", icon: Sun },
          { label: "Dark", value: "dark", icon: Moon },
          { label: "System", value: "system", icon: Palette },
        ]}
        onChange={(v) => setTheme(v as "light" | "dark" | "system")}
      />

      <SelectRow
        label="Density"
        description="Controls spacing throughout the interface."
        value={density}
        options={[
          { label: "Comfortable", value: "comfortable" },
          { label: "Compact", value: "compact" },
        ]}
        onChange={(v) => setDensity(v as DensityMode)}
      />

      <SelectRow
        label="Sidebar default"
        description="Default state when you log in."
        value={sidebarDefault}
        options={[
          { label: "Expanded", value: "expanded" },
          { label: "Collapsed", value: "collapsed" },
        ]}
        onChange={(v) => setSidebarDefault(v as SidebarMode)}
      />
    </div>
  );
}

function WorkspacePanel() {
  const defaultPlant = usePreferencesStore((s) => s.defaultPlant);
  const setDefaultPlant = usePreferencesStore((s) => s.setDefaultPlant);
  const defaultLine = usePreferencesStore((s) => s.defaultLine);
  const setDefaultLine = usePreferencesStore((s) => s.setDefaultLine);
  const rememberLastLine = usePreferencesStore((s) => s.rememberLastLine);
  const setRememberLastLine = usePreferencesStore((s) => s.setRememberLastLine);

  return (
    <div className="divide-y divide-border">
      <SectionHeader icon={Monitor} title="Workspace Defaults" subtitle="Default plant, line, and session memory" />

      <SelectRow
        label="Default plant"
        description="Plant selected when no line is active. Configured through Production Structure."
        value={defaultPlant}
        options={[
          { label: "None (ask each time)", value: "" },
        ]}
        onChange={setDefaultPlant}
      />

      <SelectRow
        label="Default production line"
        description="Line selected by default within the plant. Configured through Production Structure."
        value={defaultLine}
        options={[
          { label: "None (ask each time)", value: "" },
        ]}
        onChange={setDefaultLine}
      />

      <ToggleRow
        label="Remember last selected line"
        description="Automatically restore the last active production line on next visit."
        checked={rememberLastLine}
        onChange={setRememberLastLine}
      />
    </div>
  );
}

function NotificationsPanel() {
  const inApp = usePreferencesStore((s) => s.inAppNotifications);
  const setInApp = usePreferencesStore((s) => s.setInAppNotifications);
  const email = usePreferencesStore((s) => s.emailNotifications);
  const setEmail = usePreferencesStore((s) => s.setEmailNotifications);
  const findings = usePreferencesStore((s) => s.notifyFindings);
  const setFindings = usePreferencesStore((s) => s.setNotifyFindings);
  const tasks = usePreferencesStore((s) => s.notifyTasks);
  const setTasks = usePreferencesStore((s) => s.setNotifyTasks);
  const approvals = usePreferencesStore((s) => s.notifyApprovals);
  const setApprovals = usePreferencesStore((s) => s.setNotifyApprovals);

  return (
    <div className="divide-y divide-border">
      <SectionHeader icon={Bell} title="Notifications" subtitle="In-app, email, and alert preferences" />

      <ToggleRow
        label="In-app notifications"
        description="Show notifications inside the application."
        checked={inApp}
        onChange={setInApp}
      />

      <ToggleRow
        label="Email notifications"
        description="Send notifications via email."
        checked={email}
        onChange={setEmail}
      />

      <div className="px-4 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground px-4 py-2">Assigned items</div>
      </div>

      <ToggleRow
        label="Findings"
        description="When a finding is assigned to you."
        checked={findings}
        onChange={setFindings}
      />

      <ToggleRow
        label="Tasks"
        description="When a task is assigned to you."
        checked={tasks}
        onChange={setTasks}
      />

      <ToggleRow
        label="Approvals"
        description="When an item awaits your approval."
        checked={approvals}
        onChange={setApprovals}
      />
    </div>
  );
}

function LanguagePanel() {
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);
  const timezone = usePreferencesStore((s) => s.timezone);
  const setTimezone = usePreferencesStore((s) => s.setTimezone);
  const dateFormat = usePreferencesStore((s) => s.dateFormat);
  const setDateFormat = usePreferencesStore((s) => s.setDateFormat);
  const timeFormat = usePreferencesStore((s) => s.timeFormat);
  const setTimeFormat = usePreferencesStore((s) => s.setTimeFormat);

  return (
    <div className="divide-y divide-border">
      <SectionHeader icon={Globe} title="Language & Region" subtitle="Locale, timezone, and date formats" />

      <SelectRow
        label="Language"
        description="UI language."
        value={language}
        options={[
          { label: "English (US)", value: "en-US" },
          { label: "Spanish", value: "es-MX" },
        ]}
        onChange={setLanguage}
      />

      <SelectRow
        label="Time zone"
        description="Timezone used for timestamps."
        value={timezone}
        options={[
          { label: "UTC", value: "UTC" },
          { label: "America/New_York", value: "America/New_York" },
          { label: "America/Chicago", value: "America/Chicago" },
          { label: "America/Denver", value: "America/Denver" },
          { label: "America/Los_Angeles", value: "America/Los_Angeles" },
          { label: "America/Mexico_City", value: "America/Mexico_City" },
          { label: "Europe/London", value: "Europe/London" },
          { label: "Europe/Berlin", value: "Europe/Berlin" },
          { label: "Asia/Tokyo", value: "Asia/Tokyo" },
        ]}
        onChange={setTimezone}
      />

      <SelectRow
        label="Date format"
        description="How dates are displayed."
        value={dateFormat}
        options={[
          { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
          { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
          { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
        ]}
        onChange={setDateFormat}
      />

      <SelectRow
        label="Time format"
        description="How times are displayed."
        value={timeFormat}
        options={[
          { label: "24-hour (14:30)", value: "24h" },
          { label: "12-hour (2:30 PM)", value: "12h" },
        ]}
        onChange={(v) => setTimeFormat(v as TimeFormatPref)}
      />
    </div>
  );
}

function DataDisplayPanel() {
  const pageSize = usePreferencesStore((s) => s.defaultPageSize);
  const setPageSize = usePreferencesStore((s) => s.setDefaultPageSize);
  const showArchived = usePreferencesStore((s) => s.showArchivedRecords);
  const setShowArchived = usePreferencesStore((s) => s.setShowArchivedRecords);
  const units = usePreferencesStore((s) => s.measurementUnits);
  const setUnits = usePreferencesStore((s) => s.setMeasurementUnits);

  return (
    <div className="divide-y divide-border">
      <SectionHeader icon={Database} title="Data Display" subtitle="Tables, units, and record visibility" />

      <SelectRow
        label="Default table page size"
        description="Number of rows shown per page in tables."
        value={String(pageSize)}
        options={[
          { label: "10 rows", value: "10" },
          { label: "25 rows", value: "25" },
          { label: "50 rows", value: "50" },
          { label: "100 rows", value: "100" },
        ]}
        onChange={(v) => setPageSize(Number(v))}
      />

      <ToggleRow
        label="Show archived records"
        description="Include archived (soft-deleted) records in lists by default."
        checked={showArchived}
        onChange={setShowArchived}
      />

      <SelectRow
        label="Measurement units"
        description="Unit system for dimensions, weights, and volumes."
        value={units}
        options={[
          { label: "Metric (mm, kg, L)", value: "metric" },
          { label: "Imperial (in, lb, gal)", value: "imperial" },
        ]}
        onChange={(v) => setUnits(v as UnitsSystem)}
      />
    </div>
  );
}

function PrivacyPanel() {
  const autoLockTimeout = usePreferencesStore((s) => s.autoLockTimeout);
  const setAutoLockTimeout = usePreferencesStore((s) => s.setAutoLockTimeout);

  return (
    <div className="divide-y divide-border">
      <SectionHeader icon={Lock} title="Privacy & Session" subtitle="Auto-lock and session management" />

      <NumberRow
        label="Auto-lock timeout"
        description="Automatically lock the app after inactivity (local preference)."
        value={autoLockTimeout}
        min={5}
        max={480}
        suffix="minutes"
        onChange={setAutoLockTimeout}
      />

      <div className="px-4 py-3">
        <ToolbarButton icon={LogOut} label="Sign out from all sessions (requires backend)" disabled={true} title="Requires backend authentication service" />
      </div>
    </div>
  );
}

/* ── Category panel map ──────────────────────────────────────────── */
const PANELS: Record<string, () => ReactNode> = {
  appearance: AppearancePanel,
  workspace: WorkspacePanel,
  notifications: NotificationsPanel,
  language: LanguagePanel,
  "data-display": DataDisplayPanel,
  privacy: PrivacyPanel,
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function UserPreferencesPage() {
  const [activeCategory, setActiveCategory] = useState("appearance");
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ActivePanel = PANELS[activeCategory];

  // Subscribe to store changes to show save feedback
  useEffect(() => {
    const unsub = usePreferencesStore.subscribe(() => {
      setFeedback("Saved locally");
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
    });
    return () => {
      unsub();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted">
      {/* ── HEADER ── */}
      <header className="flex items-center gap-3 h-14 shrink-0 border-b border-border px-4 bg-muted">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] bg-accent/10 text-accent-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="text-xs font-semibold text-foreground leading-tight">Preferences</h1>
          <p className="text-[11px] text-muted-foreground leading-tight mt-px">Personal workspace settings</p>
        </div>
      </header>

      {/* ── BODY: two-column layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column — Category nav */}
        <nav className="w-72 shrink-0 flex h-full min-h-0 flex-col border-r border-border bg-muted overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex w-full items-center gap-3 h-14 px-3 text-left transition-colors border-b border-border/50 ${
                  active
                    ? "bg-success/10 border-l-2 border-success text-success"
                    : "bg-muted border-l-2 border-transparent text-muted-foreground hover:bg-background"
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] ${
                  active ? "bg-success/15 text-success" : "bg-background text-muted-foreground"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium leading-tight ${active ? "text-success" : "text-foreground"}`}>
                    {cat.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight truncate">{cat.description}</div>
                </div>
                <ChevronRight className={`h-3 w-3 shrink-0 ${active ? "text-success" : "text-muted-foreground/60"}`} />
              </button>
            );
          })}
        </nav>

        {/* Right column — Settings panel */}
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-muted">
          {ActivePanel && <ActivePanel />}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="h-10 shrink-0 border-t border-border bg-muted px-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Preferences are stored locally on this device.</span>
        <button
          type="button"
          onClick={() => {
            const confirmed = window.confirm("Reset all preferences to their default values?");
            if (confirmed) {
              usePreferencesStore.getState().resetAll();
            }
          }}
          className="inline-flex h-7 items-center gap-1.5 px-2 text-xs font-medium rounded-[2px] text-muted-foreground hover:bg-muted active:bg-muted/80 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5 stroke-current" />
          Reset defaults
        </button>
      </footer>

      {/* ── SAVE FEEDBACK TOAST ── */}
      <SaveFeedback message={feedback ?? ""} visible={feedback !== null} />
    </div>
  );
}
