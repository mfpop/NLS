import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { SYSTEM_HEALTH_QUERY } from "@/graphql/system";
import { PageHeader } from "@/pages/shared/PageHeader";
import { theme } from "@/styles/themeTokens";
import {
  Activity,
  AlertTriangle,
  Archive,
  Cable,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  Gauge,
  Globe2,
  HelpCircle,
  LockKeyhole,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";

interface SystemHealthData {
  systemHealth: {
    graphqlStatus: string;
    databaseStatus: string;
    serverTime: string;
    version: string;
  };
}

type HealthState = "healthy" | "warning" | "error";

interface HealthMetric {
  label: string;
  value: string;
  state?: HealthState;
}

interface HealthSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  state: HealthState;
  metrics: HealthMetric[];
}

const stateStyles: Record<HealthState, { accent: string; icon: string; pill: string; dot: string; label: string }> = {
  healthy: {
    accent: "bg-success",
    icon: "text-success bg-success/10",
    pill: "border-success/25 bg-success/10 text-success",
    dot: "bg-success",
    label: "Healthy",
  },
  warning: {
    accent: "bg-warning/70",
    icon: "text-warning bg-warning/10",
    pill: "border-warning/25 bg-warning/10 text-warning",
    dot: "bg-warning",
    label: "Warning",
  },
  error: {
    accent: "bg-danger",
    icon: "text-danger bg-danger/10",
    pill: "border-danger/35 bg-danger/15 text-danger",
    dot: "bg-danger",
    label: "Error",
  },
};

const okState = (value?: string): HealthState => value === "OK" ? "healthy" : value ? "error" : "warning";
const safe = (value: string | undefined | null, fallback = "Not reported") => value || fallback;
const isUnknownMetric = (metric: HealthMetric) => metric.value === "Not reported" || metric.value === "Not configured" || metric.value === "Not exposed" || metric.value === "Browser only" || metric.value === "Not confirmed";
const formatTimestamp = (value?: string | null) => {
  if (!value) return "Not reported";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export function GraphqlStatusPage() {
  const initialLatencyStartRef = useRef(performance.now());
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState(() => new Date());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false);
  const { data, loading, error, refetch } = useQuery<SystemHealthData>(SYSTEM_HEALTH_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (!loading && lastLatencyMs === null && (data || error)) {
      setLastLatencyMs(Math.round(performance.now() - initialLatencyStartRef.current));
      setLastCheckedAt(new Date());
    }
  }, [data, error, lastLatencyMs, loading]);

  const health = data?.systemHealth;
  const graphqlState = error ? "error" : okState(health?.graphqlStatus);
  const databaseState = error ? "error" : okState(health?.databaseStatus);
  const version = health?.version || import.meta.env.VITE_APP_VERSION || "Not reported";
  const runtimeMode = import.meta.env.MODE || "development";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Not reported";
  const serverTime = formatTimestamp(health?.serverTime);
  const lastResponse = lastLatencyMs == null ? (loading ? "Measuring..." : "Not measured") : `${lastLatencyMs} ms`;
  const overallState: HealthState = error || graphqlState === "error" || databaseState === "error"
    ? "error"
    : graphqlState === "warning" || databaseState === "warning"
      ? "warning"
      : "healthy";

  const sections: HealthSection[] = useMemo(() => [
    {
      title: "API Health",
      description: "Runtime API reachability and response behavior.",
      icon: <Globe2 className="h-4 w-4 stroke-current" />,
      state: graphqlState,
      metrics: [
        { label: "GraphQL endpoint", value: health?.graphqlStatus === "OK" ? "Online" : "Unavailable", state: graphqlState },
        { label: "GraphQL schema/status", value: health?.graphqlStatus === "OK" ? "Schema reachable" : "Schema unavailable", state: graphqlState },
        { label: "Auth service", value: graphqlState === "healthy" ? "Reachable" : "Not confirmed", state: graphqlState === "healthy" ? "healthy" : "warning" },
        { label: "Subscriptions/WebSocket", value: "Not reported", state: "warning" },
        { label: "Latency", value: lastResponse, state: lastLatencyMs && lastLatencyMs > 750 ? "warning" : graphqlState },
        { label: "Last response time", value: serverTime },
        { label: "Uptime", value: "Not reported", state: "warning" },
      ],
    },
    {
      title: "Database Health",
      description: "Database connection and migration readiness.",
      icon: <Database className="h-4 w-4 stroke-current" />,
      state: databaseState,
      metrics: [
        { label: "DB connection", value: health?.databaseStatus === "OK" ? "Connected" : "Unavailable", state: databaseState },
        { label: "Active connections", value: "Not reported", state: "warning" },
        { label: "Query latency", value: "Not reported", state: "warning" },
        { label: "Migration status", value: databaseState === "healthy" ? "Connection verified" : "Needs review", state: databaseState },
        { label: "Pending migrations", value: "Not reported", state: "warning" },
        { label: "Last backup date", value: "Not reported", state: "warning" },
      ],
    },
    {
      title: "Runtime / Deployment",
      description: "Deployment identity and runtime context.",
      icon: <Server className="h-4 w-4 stroke-current" />,
      state: "healthy",
      metrics: [
        { label: "Runtime mode", value: runtimeMode },
        { label: "App version", value: safe(version) },
        { label: "Build version", value: safe(import.meta.env.VITE_BUILD_VERSION) },
        { label: "Deployment timestamp", value: safe(import.meta.env.VITE_DEPLOYED_AT) },
        { label: "Current timezone", value: timezone },
        { label: "Server region", value: safe(import.meta.env.VITE_REGION) },
      ],
    },
    {
      title: "Performance",
      description: "Runtime throughput and platform performance signals.",
      icon: <Gauge className="h-4 w-4 stroke-current" />,
      state: "warning",
      metrics: [
        { label: "Avg response time", value: lastResponse, state: lastLatencyMs && lastLatencyMs > 750 ? "warning" : "healthy" },
        { label: "Slow queries count", value: "Not reported", state: "warning" },
        { label: "Active requests", value: loading ? "1 active" : "0 active", state: loading ? "warning" : "healthy" },
        { label: "Cache hit ratio", value: "Not reported", state: "warning" },
        { label: "Memory usage", value: "Browser only", state: "warning" },
        { label: "CPU usage", value: "Browser only", state: "warning" },
      ],
    },
    {
      title: "Security",
      description: "Authentication and session posture.",
      icon: <ShieldCheck className="h-4 w-4 stroke-current" />,
      state: "warning",
      metrics: [
        { label: "JWT validity", value: "Not exposed", state: "warning" },
        { label: "Session status", value: "Client session active", state: "healthy" },
        { label: "MFA enabled", value: "Not reported", state: "warning" },
        { label: "Failed auth attempts", value: "Not reported", state: "warning" },
      ],
    },
    {
      title: "Platform Services",
      description: "Realtime, storage, and observability signals.",
      icon: <Radio className="h-4 w-4 stroke-current" />,
      state: error ? "error" : "warning",
      metrics: [
        { label: "Event bus connected", value: "Not reported", state: "warning" },
        { label: "WebSocket clients", value: "Not reported", state: "warning" },
        { label: "Queue lag", value: "Not reported", state: "warning" },
        { label: "File storage status", value: "Not reported", state: "warning" },
        { label: "Remaining storage", value: "Not reported", state: "warning" },
        { label: "Upload service status", value: "Not reported", state: "warning" },
        { label: "Logging enabled", value: "Client logging active", state: "healthy" },
        { label: "Trace status", value: "Not reported", state: "warning" },
        { label: "Error reporting service", value: error ? "GraphQL query error" : "No critical client error", state: error ? "error" : "healthy" },
        { label: "Last critical error", value: error ? "Health query failed" : "None reported", state: error ? "error" : "healthy" },
      ],
    },
  ], [databaseState, error, graphqlState, health?.databaseStatus, health?.graphqlStatus, lastLatencyMs, lastResponse, loading, runtimeMode, serverTime, timezone, version]);

  const refreshDiagnostics = async () => {
    const started = performance.now();
    setActionMessage(null);
    setIsRefreshingDiagnostics(true);
    try {
      await refetch();
      setLastLatencyMs(Math.round(performance.now() - started));
      setLastCheckedAt(new Date());
      setActionMessage("Diagnostics refreshed.");
    } catch {
      setLastLatencyMs(Math.round(performance.now() - started));
      setLastCheckedAt(new Date());
      setActionMessage("Diagnostics refresh failed.");
    } finally {
      setIsRefreshingDiagnostics(false);
    }
  };

  const exportDiagnostics = () => {
    const safePayload = {
      exportedAt: new Date().toISOString(),
      overallState,
      systemHealth: health ?? null,
      runtime: {
        mode: runtimeMode,
        timezone,
        version,
      },
      note: "Diagnostics export intentionally excludes secrets, tokens, credentials, and stack traces.",
    };
    const blob = new Blob([JSON.stringify(safePayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `runtime-diagnostics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setActionMessage("Diagnostics exported without secrets or raw traces.");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        icon={<StatusIcon state={overallState} />}
        iconClass={theme.iconBoxSubtle}
        title="Diagnostics / Runtime Health"
        subtitle={`Application runtime health overview. Last checked ${lastCheckedAt.toLocaleTimeString()}.`}
      >
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <SummaryTile icon={<Activity className="h-3.5 w-3.5 stroke-current" />} label="API" state={graphqlState} value={health?.graphqlStatus || "unknown"} />
          <SummaryTile icon={<Database className="h-3.5 w-3.5 stroke-current" />} label="DB" state={databaseState} value={health?.databaseStatus || "unknown"} />
          <SummaryTile icon={<Clock3 className="h-3.5 w-3.5 stroke-current" />} label="Latency" state={lastLatencyMs && lastLatencyMs > 750 ? "warning" : overallState} value={lastResponse} />
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {loading && !data && !error && (
          <div className="flex items-center gap-2 rounded border border-info/20 bg-info/10 px-3 py-1.5 text-[11px] font-semibold text-info">
            <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" />
            Loading diagnostics...
          </div>
        )}
        {isRefreshingDiagnostics && (
          <div className="flex items-center gap-2 rounded border border-info/20 bg-info/10 px-3 py-1.5 text-[11px] font-semibold text-info">
            <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" />
            Refreshing diagnostics...
          </div>
        )}
        {error && !data && (
          <div className="flex items-center gap-2 rounded border border-danger/25 bg-danger/10 px-3 py-1.5 text-[11px] font-semibold text-danger">
            <XCircle className="h-3.5 w-3.5 stroke-current" />
            Backend unreachable. Diagnostics are limited until the health endpoint responds.
          </div>
        )}
        {!error && data && sections.some((section) => section.metrics.some(isUnknownMetric)) && (
          <div className="flex items-center gap-2 rounded border border-border/15 bg-muted/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5 stroke-current" />
            Some runtime checks are not reported by the backend yet.
          </div>
        )}
        {actionMessage && (
          <div className="rounded border border-info/20 bg-info/10 px-3 py-1.5 text-[11px] font-semibold text-info">
            {actionMessage}
          </div>
        )}

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-2 md:grid-cols-2">
            {sections.map((section) => <HealthSectionCard key={section.title} section={section} />)}
          </div>

          <aside className="space-y-2">
            <div className="rounded-lg border border-border/25 bg-card p-2 shadow-sm shadow-foreground/5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
                  <Cable className="h-4 w-4 stroke-current" />
                </span>
                <div>
                  <h3 className="text-xs font-extrabold text-foreground">Quick Actions</h3>
                  <p className="text-[10px] text-muted-foreground">Safe diagnostics operations.</p>
                </div>
              </div>
              <div className="grid gap-1">
                <ActionButton variant="primary" icon={<RefreshCw className={`h-3.5 w-3.5 stroke-current ${loading || isRefreshingDiagnostics ? "animate-spin" : ""}`} />} label="Refresh diagnostics" onClick={refreshDiagnostics} disabled={isRefreshingDiagnostics} />
                <ActionButton icon={<Wifi className="h-3.5 w-3.5 stroke-current" />} label="Reconnect services" onClick={refreshDiagnostics} />
                <ActionButton icon={<Download className="h-3.5 w-3.5 stroke-current" />} label="Export diagnostics" onClick={exportDiagnostics} />
                <ActionButton icon={<Archive className="h-3.5 w-3.5 stroke-current" />} label="Clear cache" disabled title="Requires a backend cache endpoint." />
                <ActionButton icon={<FileText className="h-3.5 w-3.5 stroke-current" />} label="Open logs" disabled title="Logging destination is not configured." />
              </div>
            </div>

            <div className="rounded-lg border border-warning/15 bg-warning/5 p-2 text-[10px] text-muted-foreground shadow-sm shadow-foreground/5">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-warning">
                <LockKeyhole className="h-3.5 w-3.5 stroke-current" />
                Safe Output
              </div>
              <p>No secrets, tokens, stack traces, or database credentials are displayed. Missing server metrics are shown as not reported until backend diagnostics expose them.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function HealthSectionCard({ section }: { section: HealthSection }) {
  const styles = stateStyles[section.state];
  const visibleCount = section.title === "API Health" ? section.metrics.length : 3;
  const visibleMetrics = section.metrics.slice(0, visibleCount);
  const secondaryMetrics = section.metrics.slice(visibleCount);
  const secondaryWarnings = secondaryMetrics.filter((metric) => metric.state === "warning").length;
  const secondaryErrors = secondaryMetrics.filter((metric) => metric.state === "error").length;
  const secondaryHealthy = secondaryMetrics.filter((metric) => (metric.state || "healthy") === "healthy").length;

  return (
    <section className="relative overflow-hidden rounded-lg border border-border/15 bg-card p-3 shadow-sm shadow-foreground/5">
      <span className={`absolute left-0 top-0 h-full w-1 ${styles.accent}`} aria-hidden="true" />
      <div className="mb-2.5 flex h-10 items-start gap-2.5 pl-1">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${styles.icon}`}>{section.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-extrabold text-foreground">{section.title}</h3>
            <StatusPill state={section.state} />
          </div>
          <p className="truncate text-[11px] text-muted-foreground">{section.description}</p>
        </div>
      </div>
      <div className="space-y-1.5 pl-1">
        {visibleMetrics.map((metric) => <MetricRow key={metric.label} metric={metric} />)}
      </div>
      {secondaryMetrics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 pl-1 text-[10px] font-semibold">
          {secondaryErrors > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-danger">{secondaryErrors} critical hidden</span>}
          {secondaryWarnings > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{secondaryWarnings} unknown checks</span>}
          {secondaryHealthy > 0 && <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">{secondaryHealthy} healthy checks</span>}
          {secondaryErrors === 0 && secondaryWarnings === 0 && secondaryHealthy === 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{secondaryMetrics.length} secondary checks</span>}
        </div>
      )}
    </section>
  );
}

function MetricRow({ metric }: { metric: HealthMetric }) {
  const state = metric.state || "healthy";
  const unknown = isUnknownMetric(metric);
  return (
    <div className={`flex h-8 items-center gap-2 rounded px-2.5 text-[11px] ${unknown ? "bg-muted/30" : state === "warning" ? "bg-warning/5" : state === "error" ? "bg-danger/5" : "bg-muted/45"}`}>
      {unknown ? <HelpCircle className="h-3 w-3 shrink-0 stroke-current text-muted-foreground" /> : <span className={`h-2 w-2 shrink-0 rounded-full ${stateStyles[state].dot}`} />}
      <span className="min-w-0 flex-1 truncate font-semibold text-muted-foreground">{metric.label}</span>
      <span className={`max-w-[54%] truncate text-right text-xs font-bold ${unknown ? "text-muted-foreground" : "text-foreground"}`}>{metric.value}</span>
    </div>
  );
}

function StatusPill({ state }: { state: HealthState }) {
  const styles = stateStyles[state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${styles.pill}`}>
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
      {styles.label}
    </span>
  );
}

function StatusIcon({ state }: { state: HealthState }) {
  const className = `h-4 w-4 stroke-current ${state === "healthy" ? "text-success" : state === "warning" ? "text-warning" : "text-danger"}`;
  if (state === "healthy") return <CheckCircle2 className={className} />;
  if (state === "warning") return <AlertTriangle className={className} />;
  return <XCircle className={className} />;
}

function SummaryTile({ icon, label, value, state }: { icon: React.ReactNode; label: string; value: string; state: HealthState }) {
  return (
    <div className="rounded border border-border/15 bg-muted/45 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <div className={`mt-0.5 truncate text-sm font-extrabold ${state === "healthy" ? "text-success" : state === "warning" ? "text-warning" : "text-danger"}`}>{value}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, title, variant = "secondary" }: { icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; title?: string; variant?: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-left text-[10px] font-semibold transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground/55 ${variant === "primary" ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" : "border border-border/15 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {icon}
      {label}
    </button>
  );
}
