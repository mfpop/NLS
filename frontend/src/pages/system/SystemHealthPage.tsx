import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Activity, RefreshCw, Server, GitCommit, ShieldCheck, Database, AlertTriangle } from "lucide-react";
import { TwoColumnPageTemplate } from "@/components/layout/TwoColumnPageTemplate";
import { ToolbarButton } from "@/components/layout/PageToolbar";
import { SYSTEM_HEALTH_QUERY } from "@/graphql/systemHealthQueries";
import { formatDateFull } from "@/utils/dateFormat";

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
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionConfig[] = [
  { key: "summary", label: "Health Summary", icon: Activity },
  { key: "services", label: "Services", icon: Server },
  { key: "database", label: "Database", icon: Database },
  { key: "deployment", label: "Deployment Info", icon: GitCommit },
  { key: "errors", label: "Recent Errors", icon: AlertTriangle },
];

/* ── Helpers ── */

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
    default: return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

function statusDot(status: HealthStatus): string {
  switch (status) {
    case "healthy": return "bg-emerald-500";
    case "warning": return "bg-amber-500";
    case "critical": return "bg-red-500";
    default: return "bg-slate-400";
  }
}

function formatTime(iso: string): string {
  return formatDateFull(iso);
}

/* ── Compact Row ── */

function Row({ label, value, status }: { label: string; value: string; status?: HealthStatus }) {
  return (
    <div className="h-8 px-3 border-b border-slate-100 flex items-center justify-between">
      <span className="min-w-0 truncate text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {status && (
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm border whitespace-nowrap ${statusBadge(status)}`}>
            {statusLabel(status)}
          </span>
        )}
        <span className="text-xs text-slate-700 font-medium truncate max-w-[180px]">{value}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="h-8 px-3 border-b border-slate-100 flex items-center justify-between">
      <span className="min-w-0 truncate text-xs text-slate-600">{label}</span>
      <span className="text-xs text-slate-700 font-mono truncate max-w-[180px]">{value}</span>
    </div>
  );
}

/* ── Panel Header ── */

function PanelHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="h-8 border-b border-slate-200 bg-slate-50 px-3 flex items-center gap-2 shrink-0">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">{title}</span>
    </div>
  );
}

/* ── Status Strip (top of Health Summary) ── */

function StatusStrip({ health }: { health: SystemHealthData["systemHealth"] }) {
  const items = [
    { label: "Overall", status: health.overallStatus },
    { label: "API", status: health.apiStatus },
    { label: "Database", status: health.databaseStatus },
    { label: "Services", status: health.services.length > 0 ? (health.services.every(s => s.status === "healthy") ? "healthy" as HealthStatus : health.services.some(s => s.status === "critical") ? "critical" as HealthStatus : "warning" as HealthStatus) : "unknown" as HealthStatus },
    { label: "Storage", status: health.diskUsage.startsWith("N/A") ? "unknown" as HealthStatus : "healthy" as HealthStatus },
    { label: "Last Checked", status: undefined, value: health.deploymentInfo.serverTime ? formatTime(health.deploymentInfo.serverTime) : "—" },
  ];
  return (
    <div className="grid grid-cols-6 divide-x divide-slate-200 border-b border-slate-200 h-16 shrink-0">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center justify-center gap-1 px-2">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{item.label}</span>
          {item.status ? (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-sm border ${statusBadge(item.status)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot(item.status)}`} />
              {statusLabel(item.status)}
            </span>
          ) : (
            <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Section Views ── */

function HealthSummaryView({ health }: { health: SystemHealthData["systemHealth"] }) {
  return (
    <div className="flex flex-col min-h-0">
      <StatusStrip health={health} />
      <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 divide-x divide-y divide-slate-200" style={{ gridTemplateRows: "1fr 1fr" }}>
        {/* Application & API */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <PanelHeader icon={Activity} title="Application & API" />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Row label="Application" value="Running" status={health.appStatus} />
            <Row label="API / GraphQL" value="Responding" status={health.apiStatus} />
            <Row label="Frontend Build" value="Built" status="healthy" />
            <Row label="Memory Usage" value={health.memoryUsage} status={health.memoryUsage.startsWith("N/A") ? "unknown" : undefined} />
          </div>
        </div>
        {/* Database & Storage */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <PanelHeader icon={Database} title="Database & Storage" />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Row label="Database" value={health.databaseStatus === "healthy" ? "Connected" : statusLabel(health.databaseStatus)} status={health.databaseStatus} />
            <Row label="Connection" value={health.databaseStatus === "healthy" ? "OK" : statusLabel(health.databaseStatus)} status={health.databaseStatus} />
            <InfoRow label="Disk Usage" value={health.diskUsage} />
            <InfoRow label="Media Files" value={health.deploymentInfo.debugEnabled ? "Debug" : "Production"} />
          </div>
        </div>
        {/* Services */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <PanelHeader icon={Server} title="Services" />
          <div className="flex-1 min-h-0 overflow-y-auto">
            {health.services.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-xs text-slate-400">No services reported.</div>
            ) : (
              health.services.slice(0, 5).map((svc) => (
                <Row key={svc.name} label={svc.name} value={svc.detail} status={svc.status} />
              ))
            )}
          </div>
        </div>
        {/* System Checks */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <PanelHeader icon={ShieldCheck} title="System Checks" />
          <div className="flex-1 min-h-0 overflow-y-auto">
            {health.checks.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-xs text-slate-400">No checks available.</div>
            ) : (
              health.checks.slice(0, 4).map((chk) => (
                <Row key={chk.name} label={chk.name} value={chk.detail} status={chk.status} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicesView({ health }: { health: SystemHealthData["systemHealth"] }) {
  const stripItems = [
    { label: "Backend", status: health.services.find(s => s.name.toLowerCase().includes("backend") || s.name.toLowerCase().includes("django"))?.status || "unknown" as HealthStatus },
    { label: "GraphQL", status: health.services.find(s => s.name.toLowerCase().includes("graphql") || s.name.toLowerCase().includes("api"))?.status || "unknown" as HealthStatus },
    { label: "Database", status: health.databaseStatus },
    { label: "Nginx", status: health.services.find(s => s.name.toLowerCase().includes("nginx"))?.status || "unknown" as HealthStatus },
    { label: "Gunicorn", status: health.services.find(s => s.name.toLowerCase().includes("gunicorn"))?.status || "unknown" as HealthStatus },
    { label: "Last Checked", status: undefined, value: health.deploymentInfo.serverTime ? formatTime(health.deploymentInfo.serverTime) : "—" },
  ];

  return (
    <div className="flex flex-col min-h-0">
      <div className="grid grid-cols-6 divide-x divide-slate-200 border-b border-slate-200 h-16 shrink-0">
        {stripItems.map((item) => (
          <div key={item.label} className="flex flex-col items-center justify-center gap-1 px-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{item.label}</span>
            {item.status ? (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-sm border ${statusBadge(item.status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot(item.status)}`} />
                {statusLabel(item.status)}
              </span>
            ) : (
              <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]">{item.value}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {health.services.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-slate-400">No services reported.</div>
        ) : (
          health.services.map((svc) => (
            <div key={svc.name} className="h-9 px-3 border-b border-slate-100 flex items-center justify-between">
              <span className="min-w-0 truncate text-xs text-slate-600">{svc.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm border whitespace-nowrap ${statusBadge(svc.status)}`}>
                  {statusLabel(svc.status)}
                </span>
                <span className="text-xs text-slate-700 font-medium truncate max-w-[180px]">{svc.detail}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DatabaseView({ health }: { health: SystemHealthData["systemHealth"] }) {
  const stripItems = [
    { label: "DB Status", status: health.databaseStatus },
    { label: "Connection", status: health.databaseStatus },
    { label: "Disk Usage", status: health.diskUsage.startsWith("N/A") ? "unknown" as HealthStatus : "healthy" as HealthStatus },
    { label: "Media Files", status: "healthy" as HealthStatus },
    { label: "Static Files", status: "healthy" as HealthStatus },
    { label: "Last Checked", status: undefined, value: health.deploymentInfo.serverTime ? formatTime(health.deploymentInfo.serverTime) : "—" },
  ];

  return (
    <div className="flex flex-col min-h-0">
      <div className="grid grid-cols-6 divide-x divide-slate-200 border-b border-slate-200 h-16 shrink-0">
        {stripItems.map((item) => (
          <div key={item.label} className="flex flex-col items-center justify-center gap-1 px-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{item.label}</span>
            {item.status ? (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-sm border ${statusBadge(item.status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot(item.status)}`} />
                {statusLabel(item.status)}
              </span>
            ) : (
              <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]">{item.value}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Row label="Database" value={health.databaseStatus === "healthy" ? "Connected" : statusLabel(health.databaseStatus)} status={health.databaseStatus} />
        <Row label="Connection" value={health.databaseStatus === "healthy" ? "OK" : statusLabel(health.databaseStatus)} status={health.databaseStatus} />
        <InfoRow label="Disk Usage" value={health.diskUsage} />
        <InfoRow label="Media Files" value={health.deploymentInfo.debugEnabled ? "Debug" : "Production"} />
        <InfoRow label="Static Files" value={health.deploymentInfo.debugEnabled ? "Debug" : "Production"} />

      </div>
    </div>
  );
}

function DeploymentView({ health }: { health: SystemHealthData["systemHealth"] }) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="h-8 border-b border-slate-200 bg-slate-50 px-3 flex items-center shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Deployment Info</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
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

function ErrorsView({ health }: { health: SystemHealthData["systemHealth"] }) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="h-8 border-b border-slate-200 bg-slate-50 px-3 flex items-center shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Recent Errors</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {health.recentErrors.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-slate-400">No recent errors reported.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-3 py-1.5">Time</th>
                  <th className="px-3 py-1.5">Severity</th>
                  <th className="px-3 py-1.5">Source</th>
                  <th className="px-3 py-1.5">Message</th>
                </tr>
              </thead>
              <tbody>
                {health.recentErrors.map((err, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{formatTime(err.timestamp)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm border whitespace-nowrap ${err.severity === "error" ? "bg-red-100 text-red-700 border-red-200" : err.severity === "warning" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {err.severity}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 truncate max-w-[120px]">{err.source}</td>
                    <td className="px-3 py-1.5 text-slate-700 truncate max-w-[300px]">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function SystemHealthPage() {
  const [activeSection, setActiveSection] = useState("summary");

  const { data, loading, error, refetch } = useQuery<SystemHealthData>(SYSTEM_HEALTH_QUERY, {
    fetchPolicy: "cache-and-network",
    pollInterval: 30000,
  });

  const health = data?.systemHealth;

  return (
    <TwoColumnPageTemplate
      icon={<Activity />}
      iconClass="bg-emerald-100 text-emerald-600"
      title="System Health"
      subtitle="Monitor application services, database, runtime checks, deployment status, and recent errors."
      toolbarProps={{
        searchValue: "",
        onSearchChange: () => {},
        searchPlaceholder: "",

        actions: <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} disabled={loading} />,
      }}
      leftPanelProps={{
        title: "Sections",
        records: SECTIONS,
        selectedId: activeSection,
        onSelect: (key) => setActiveSection(key),
        getId: (s) => s.key,
        renderRecord: (s, _selected) => {
          const Icon = s.icon;
          return (
            <div className="flex items-center gap-2 py-0.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="flex-1 text-xs text-slate-700 truncate">{s.label}</span>
            </div>
          );
        },
        emptyMessage: "No sections",
        pageSize: 100,
        selectedBorderClass: "border-l-emerald-600",
        selectedBgClass: "bg-emerald-50/40",
      }}
      footerLeft="System Health"
      footerCenter={
        health ? (
          <span className="flex items-center gap-4">
            <span>Overall: <span className={health.overallStatus === "healthy" ? "text-emerald-600" : health.overallStatus === "warning" ? "text-amber-600" : health.overallStatus === "critical" ? "text-red-600" : "text-slate-500"}>{statusLabel(health.overallStatus)}</span></span>
            {health.deploymentInfo.serverTime && (
              <><span className="h-4 w-px bg-slate-200" /><span>Updated: {formatTime(health.deploymentInfo.serverTime)}</span></>
            )}
          </span>
        ) : "Checking health..."
      }
    >
      <div className="h-full bg-slate-50">
        {loading && !health ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-xs text-slate-400">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
              <Activity className="h-4 w-4 text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-600">Loading health data...</span>
          </div>
        ) : error && !health ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-xs text-slate-400">
            <div className="rounded-full bg-red-50 p-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-sm font-medium text-slate-600">Unable to load health data</span>
            <span className="text-slate-400 max-w-xs text-center">{error.message}</span>
            <button type="button" onClick={() => refetch()} className="mt-1 inline-flex items-center gap-1.5 rounded-sm bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : !health ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-xs text-slate-400">
            <span>Unable to load health data.</span>
            <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors">
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : (
          <div className="h-full">
            {activeSection === "summary" && <HealthSummaryView health={health} />}
            {activeSection === "services" && <ServicesView health={health} />}
            {activeSection === "database" && <DatabaseView health={health} />}
            {activeSection === "deployment" && <DeploymentView health={health} />}
            {activeSection === "errors" && <ErrorsView health={health} />}
          </div>
        )}
      </div>
    </TwoColumnPageTemplate>
  );
}
