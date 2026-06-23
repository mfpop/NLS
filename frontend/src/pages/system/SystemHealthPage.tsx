import { useQuery } from "@apollo/client/react";
import { useLocation } from "react-router-dom";
import { Activity, RefreshCw, Server, GitCommit, ShieldCheck, Database, AlertTriangle } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { ExplorerToolbar, ExplorerToolbarButton } from "@/components/shared/ExplorerToolbar";
import { SYSTEM_HEALTH_QUERY } from "@/graphql/systemHealthQueries";

/* ── Types ── */

type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

interface Service {
  name: string;
  status: HealthStatus;
  detail: string;
}

interface RecentError {
  source: string;
  message: string;
  timestamp: string;
  severity: string;
}

interface DeploymentInfo {
  appVersion: string;
  commit: string;
  environment: string;
  debugEnabled: boolean;
  lastDeploy: string;
  djangoVersion: string;
  pythonVersion: string;
  serverTime: string;
}

interface SystemCheck {
  name: string;
  status: HealthStatus;
  detail: string;
}

interface SystemHealthData {
  systemHealth: {
    overallStatus: HealthStatus;
    appStatus: HealthStatus;
    apiStatus: HealthStatus;
    databaseStatus: HealthStatus;
    diskUsage: string;
    memoryUsage: string;
    services: Service[];
    recentErrors: RecentError[];
    deploymentInfo: DeploymentInfo;
    checks: SystemCheck[];
  };
}

/* ── Section config ── */

interface SectionConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionConfig[] = [
  { key: "", label: "Health Summary", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "services", label: "Services", icon: <Server className="h-3.5 w-3.5" /> },
  { key: "database", label: "Database", icon: <Database className="h-3.5 w-3.5" /> },
  { key: "deployment", label: "Deployment Info", icon: <GitCommit className="h-3.5 w-3.5" /> },
  { key: "errors", label: "Recent Errors", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
];

function sectionFromPath(path: string): string {
  if (path.endsWith("/services")) return "services";
  if (path.endsWith("/database")) return "database";
  if (path.endsWith("/deployment")) return "deployment";
  if (path.endsWith("/errors")) return "errors";
  return "";
}

/* ── Helpers ── */

function statusDot(status: HealthStatus): string {
  switch (status) {
    case "healthy": return "bg-emerald-500";
    case "warning": return "bg-amber-500";
    case "critical": return "bg-red-500";
    default: return "bg-slate-400";
  }
}

function statusLabel(status: HealthStatus): string {
  switch (status) {
    case "healthy": return "Healthy";
    case "warning": return "Warning";
    case "critical": return "Critical";
    default: return "Unknown";
  }
}

function statusBadge(status: HealthStatus): string {
  switch (status) {
    case "healthy": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "warning": return "bg-amber-100 text-amber-700 border-amber-200";
    case "critical": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex h-8 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
      <span className="text-slate-500">{icon}</span>
      <span className="text-xs font-semibold text-slate-700">{title}</span>
    </div>
  );
}

function StatusRow({ label, value, status }: { label: string; value: string; status?: HealthStatus }) {
  return (
    <div className="flex h-12 items-center gap-3 border-b border-slate-100 px-3 last:border-b-0 transition-colors">
      {status && <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(status)}`} />}
      <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {status && <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm border whitespace-nowrap ${statusBadge(status)}`}>{statusLabel(status)}</span>}
        <span className="text-xs text-slate-700 font-medium">{value}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-10 items-center gap-3 border-b border-slate-100 px-3 last:border-b-0 transition-colors">
      <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{label}</span>
      <span className="text-xs text-slate-800 font-mono truncate">{value}</span>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-12 text-xs text-slate-400">{message}</div>
  );
}

/* ── Sub-page components ── */

function HealthSummarySection({ health }: { health: SystemHealthData["systemHealth"] }) {
  return (
    <div>
      <SectionHeader icon={<Activity className="h-3.5 w-3.5" />} title="Health Summary" />
      <div className="bg-white">
        <StatusRow label="Application" value="Running" status={health.appStatus} />
        <StatusRow label="API / GraphQL" value="Responding" status={health.apiStatus} />
        <StatusRow label="Database" value={health.databaseStatus === "healthy" ? "Connected" : health.databaseStatus} status={health.databaseStatus} />
        <StatusRow label="Frontend Build" value="Built" status="healthy" />
        <StatusRow label="Disk Usage" value={health.diskUsage} status={health.diskUsage.startsWith("N/A") ? "unknown" : "healthy"} />
        <StatusRow label="Memory Usage" value={health.memoryUsage} status={health.memoryUsage.startsWith("N/A") ? "unknown" : "healthy"} />
      </div>
      {/* System Checks */}
      <div className="mt-4">
        <SectionHeader icon={<ShieldCheck className="h-3.5 w-3.5" />} title="System Checks" />
        <div className="bg-white">
          {health.checks.length === 0 ? (
            <EmptyRow message="No checks available." />
          ) : (
            health.checks.map((chk) => (
              <StatusRow key={chk.name} label={chk.name} value={chk.detail} status={chk.status} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ServicesSection({ health }: { health: SystemHealthData["systemHealth"] }) {
  return (
    <div>
      <SectionHeader icon={<Server className="h-3.5 w-3.5" />} title="Services" />
      <div className="bg-white">
        {health.services.length === 0 ? (
          <EmptyRow message="No services reported." />
        ) : (
          health.services.map((svc) => (
            <StatusRow key={svc.name} label={svc.name} value={svc.detail} status={svc.status} />
          ))
        )}
      </div>
    </div>
  );
}

function DatabaseSection({ health }: { health: SystemHealthData["systemHealth"] }) {
  return (
    <div>
      <SectionHeader icon={<Database className="h-3.5 w-3.5" />} title="Database" />
      <div className="bg-white">
        <StatusRow label="Connection" value={health.databaseStatus === "healthy" ? "Connected" : health.databaseStatus} status={health.databaseStatus} />
        <InfoRow label="Disk Usage" value={health.diskUsage} />
        <InfoRow label="Memory Usage" value={health.memoryUsage} />
      </div>
      {/* System Checks */}
      <div className="mt-4">
        <SectionHeader icon={<ShieldCheck className="h-3.5 w-3.5" />} title="System Checks" />
        <div className="bg-white">
          {health.checks.length === 0 ? (
            <EmptyRow message="No checks available." />
          ) : (
            health.checks.map((chk) => (
              <StatusRow key={chk.name} label={chk.name} value={chk.detail} status={chk.status} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DeploymentSection({ health }: { health: SystemHealthData["systemHealth"] }) {
  return (
    <div>
      <SectionHeader icon={<GitCommit className="h-3.5 w-3.5" />} title="Deployment Info" />
      <div className="bg-white">
        <InfoRow label="App Version" value={health.deploymentInfo.appVersion} />
        <InfoRow label="Commit" value={health.deploymentInfo.commit || "N/A"} />
        <InfoRow label="Environment" value={health.deploymentInfo.environment} />
        <InfoRow label="Debug Mode" value={health.deploymentInfo.debugEnabled ? "Enabled" : "Disabled"} />
        <InfoRow label="Django" value={health.deploymentInfo.djangoVersion || "N/A"} />
        <InfoRow label="Python" value={health.deploymentInfo.pythonVersion} />
        <InfoRow label="Last Deploy" value={health.deploymentInfo.lastDeploy || "N/A"} />
        <InfoRow label="Server Time" value={formatTime(health.deploymentInfo.serverTime)} />
      </div>
    </div>
  );
}

function ErrorsSection({ health }: { health: SystemHealthData["systemHealth"] }) {
  return (
    <div>
      <SectionHeader icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Recent Errors" />
      <div className="bg-white">
        {health.recentErrors.length === 0 ? (
          <EmptyRow message="No recent errors." />
        ) : (
          health.recentErrors.map((err, idx) => (
            <StatusRow
              key={idx}
              label={err.source}
              value={`${err.message.slice(0, 80)} · ${formatTime(err.timestamp)}`}
              status={err.severity === "error" ? "critical" : err.severity === "warning" ? "warning" : "unknown"}
            />
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/* ── Main Component ── */

export function SystemHealthPage() {
  const location = useLocation();
  const activeSection = sectionFromPath(location.pathname);

  const sectionConfig = SECTIONS.find((s) => s.key === activeSection);
  const pageTitle = sectionConfig ? `${sectionConfig.label} - System Health` : "System Health";
  const pageSubtitle = sectionConfig
    ? `Detailed view of ${sectionConfig.label.toLowerCase()}.`
    : "Monitor application services, database, API, background jobs, and deployment status.";

  const { data, loading, refetch } = useQuery<SystemHealthData>(SYSTEM_HEALTH_QUERY, {
    fetchPolicy: "cache-and-network",
    pollInterval: activeSection ? 5000 : 30000,
  });

  const health = data?.systemHealth;

  return (
    <AppPageLayout
      icon={<Activity />}
      iconClass="bg-emerald-100 text-emerald-600"
      title={pageTitle}
      subtitle={pageSubtitle}
      toolbar={
        <ExplorerToolbar
          searchValue=""
          onSearchChange={() => {}}
          searchPlaceholder=""
          actions={<ExplorerToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />}
        />
      }
      footer={
        <span className="flex items-center gap-4 text-xs text-slate-500">
          <span className="font-medium">System Health</span>
          <span className="flex-1" />
          {health ? (
            <span>
              Overall: <span className={health.overallStatus === "healthy" ? "text-emerald-600" : health.overallStatus === "warning" ? "text-amber-600" : health.overallStatus === "critical" ? "text-red-600" : "text-slate-500"}>{statusLabel(health.overallStatus)}</span>
              {" · "}
              {health.deploymentInfo.serverTime ? `Updated: ${formatTime(health.deploymentInfo.serverTime)}` : ""}
            </span>
          ) : "Checking health..."}
        </span>
      }
    >
      <div className="h-full overflow-y-auto bg-slate-50">
        {loading && !health ? (
          <div className="flex items-center justify-center h-24 text-xs text-slate-400">
            <span className="inline-block h-2 w-2 bg-slate-300 animate-pulse rounded-full mr-2" />
            Loading health data...
          </div>
        ) : !health ? (
          <div className="flex items-center justify-center h-32 text-xs text-slate-400">Unable to load health data.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {(!activeSection || activeSection === "") && <HealthSummarySection health={health} />}
            {(activeSection === "" || activeSection === "services") && <ServicesSection health={health} />}
            {(activeSection === "" || activeSection === "database") && <DatabaseSection health={health} />}
            {(activeSection === "" || activeSection === "deployment") && <DeploymentSection health={health} />}
            {(activeSection === "" || activeSection === "errors") && <ErrorsSection health={health} />}
          </div>
        )}
      </div>
    </AppPageLayout>
  );
}
