import { useQuery } from "@apollo/client/react";
import { AlertTriangle, Plus, Activity, TrendingUp, List, BarChart3, RefreshCw, Clock, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { Toolbar, ToolbarButton } from "@/components/shared/Toolbar";
import { SAFETY_DASHBOARD_SUMMARY_QUERY } from "@/graphql/checkQueries";

const KPI_CARD = "flex flex-col gap-0.5 min-w-0 px-4 py-2.5 border-r border-slate-200 last:border-r-0 cursor-pointer transition-colors hover:bg-slate-50";
const KPI_VALUE = "text-lg font-bold tabular-nums leading-none";
const KPI_LABEL = "text-[10px] font-medium text-slate-500 uppercase tracking-wider";

const PANEL_HEADER = "shrink-0 h-8 border-b border-slate-200 flex items-center bg-slate-50 px-3";
const PANEL_TITLE = "text-xs font-semibold text-slate-700";
const PANEL_BODY = "flex-1 overflow-y-auto";

function kpiColor(key: string): string {
  switch (key) {
    case "open": return "text-amber-600";
    case "critical": return "text-red-600";
    case "highSeverity": return "text-orange-600";
    case "action": return "text-orange-600";
    case "closed": return "text-emerald-600";
    case "overdue": return "text-red-600";
    default: return "text-slate-900";
  }
}

function typeLabel(t: string): string {
  switch (t) {
    case "INCIDENT": return "Incidents";
    case "ACCIDENT": return "Accidents";
    case "NEAR_MISS": return "Near Misses";
    case "HAZARD": return "Hazards";
    case "OBSERVATION": return "Observations";
    default: return t;
  }
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function daysSince(d: string): number {
  const diff = Date.now() - new Date(d).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function SafetyDashboardPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery(SAFETY_DASHBOARD_SUMMARY_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const s = (data as any)?.safetyDashboardSummary;
  const hasData = s && s.totalEvents > 0;

  const byType: Array<{ eventType: string; count: number }> = s?.byEventType ?? [];
  const bySeverity: Array<{ severity: string; count: number }> = s?.bySeverity ?? [];
  const byStatus: Array<{ status: string; count: number }> = s?.byStatus ?? [];
  const maxTypeCount = Math.max(...byType.map((e) => e.count), 1);
  const maxSevCount = Math.max(...bySeverity.map((e) => e.count), 1);
  const maxStatusCount = Math.max(...byStatus.map((e) => e.count), 1);

  const allSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const sevColor: Record<string, string> = {
    LOW: "bg-slate-400", MEDIUM: "bg-amber-500", HIGH: "bg-orange-500", CRITICAL: "bg-red-500",
  };

  const navigateTo = (path: string) => navigate(path);

  const renderKpiStrip = () => (
    <div className="shrink-0 flex items-stretch divide-x divide-slate-200 border-b border-slate-200 bg-white">
      <div className={KPI_CARD} onClick={() => navigateTo("/safety/incidents")}>
        <span className={`${KPI_VALUE} ${kpiColor("")}`}>{s?.totalEvents ?? 0}</span>
        <span className={KPI_LABEL}>Total Events</span>
      </div>
      <div className={KPI_CARD} onClick={() => navigateTo("/safety/incidents")}>
        <span className={`${KPI_VALUE} ${kpiColor("open")}`}>{s?.openEvents ?? 0}</span>
        <span className={KPI_LABEL}>Open</span>
      </div>
      <div className={KPI_CARD} onClick={() => navigateTo("/safety/incidents")}>
        <span className={`${KPI_VALUE} ${kpiColor("action")}`}>{s?.actionRequiredEvents ?? 0}</span>
        <span className={KPI_LABEL}>Action Required</span>
      </div>
      <div className={KPI_CARD} onClick={() => navigateTo("/safety/incidents")}>
        <span className={`${KPI_VALUE} ${kpiColor("critical")}`}>{s?.criticalEvents ?? 0}</span>
        <span className={KPI_LABEL}>Critical</span>
      </div>
      <div className={KPI_CARD} onClick={() => navigateTo("/safety/incidents")}>
        <span className={`${KPI_VALUE} ${kpiColor("highSeverity")}`}>{s?.highSeverityEvents ?? 0}</span>
        <span className={KPI_LABEL}>High / Critical</span>
      </div>
      <div className={KPI_CARD} onClick={() => navigateTo("/safety/incidents")}>
        <span className={`${KPI_VALUE} ${kpiColor("")}`}>{s?.underReviewEvents ?? 0}</span>
        <span className={KPI_LABEL}>Under Review</span>
      </div>
      <div className={KPI_CARD} onClick={() => navigateTo("/safety/incidents")}>
        <span className={`${KPI_VALUE} ${kpiColor("closed")}`}>{s?.closedEvents ?? 0}</span>
        <span className={KPI_LABEL}>Closed</span>
      </div>
      {s?.overdueFollowUps > 0 && (
        <div className={KPI_CARD} onClick={() => navigateTo("/safety/incidents")}>
          <span className={`${KPI_VALUE} ${kpiColor("overdue")}`}>{s.overdueFollowUps}</span>
          <span className={KPI_LABEL}>Overdue</span>
        </div>
      )}
    </div>
  );

  const renderZeroState = () => (
    <div className="flex flex-1 items-center justify-center h-full">
      <div className="text-center max-w-md px-6 py-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">No safety events recorded yet.</h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Start by reporting an incident, near miss, hazard, or observation.
        </p>
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <button onClick={() => navigateTo("/safety/incidents")}
              className="inline-flex h-8 items-center gap-1.5 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">
              <Plus className="h-3.5 w-3.5" /> New Incident / Accident
            </button>
            <button onClick={() => navigateTo("/safety/near-misses")}
              className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700">
              <Plus className="h-3.5 w-3.5" /> New Near Miss
            </button>
          </div>
          <button onClick={() => navigateTo("/safety/hazards")}
            className="inline-flex h-8 items-center gap-1.5 bg-slate-600 px-4 text-sm font-semibold text-white hover:bg-slate-700">
            <Plus className="h-3.5 w-3.5" /> New Hazard / Observation
          </button>
        </div>
      </div>
    </div>
  );

  const renderBar = (count: number, max: number, color: string) => (
    <div className="h-5 w-full bg-slate-100 rounded-sm overflow-hidden">
      <div
        className={`h-full rounded-sm transition-all ${color}`}
        style={{ width: `${Math.max((count / max) * 100, count > 0 ? 4 : 0)}%` }}
      />
    </div>
  );

  const renderStatusSummary = () => (
    <div className="space-y-1.5 text-xs">
      {byStatus.map((s) => (
        <div key={s.status} className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === "CLOSED" ? "bg-emerald-500" : s.status === "CANCELLED" ? "bg-slate-400" : s.status === "DRAFT" ? "bg-slate-400" : s.status === "REPORTED" ? "bg-blue-500" : s.status === "UNDER_REVIEW" ? "bg-amber-500" : s.status === "ACTION_REQUIRED" ? "bg-orange-500" : "bg-slate-400"}`} />
          <span className="text-slate-600 w-28 truncate">{statusLabel(s.status)}</span>
          <div className="flex-1">{renderBar(s.count, maxStatusCount, "bg-blue-500")}</div>
          <span className="text-slate-900 font-medium tabular-nums w-8 text-right">{s.count}</span>
        </div>
      ))}
      {byStatus.length === 0 && <p className="text-xs text-slate-400 italic">No status data</p>}
    </div>
  );

  const renderQuickActions = () => (
    <div className="p-3 border-t border-slate-200 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Quick Actions</p>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => navigateTo("/safety/incidents")}
          className="inline-flex h-7 items-center gap-1 bg-red-100 text-red-700 px-2.5 text-[10px] font-semibold hover:bg-red-200 border border-red-200">
          <Plus className="h-3 w-3" /> Incident
        </button>
        <button onClick={() => navigateTo("/safety/near-misses")}
          className="inline-flex h-7 items-center gap-1 bg-amber-100 text-amber-700 px-2.5 text-[10px] font-semibold hover:bg-amber-200 border border-amber-200">
          <Plus className="h-3 w-3" /> Near Miss
        </button>
        <button onClick={() => navigateTo("/safety/hazards")}
          className="inline-flex h-7 items-center gap-1 bg-slate-100 text-slate-700 px-2.5 text-[10px] font-semibold hover:bg-slate-200 border border-slate-200">
          <Plus className="h-3 w-3" /> Hazard
        </button>
      </div>
    </div>
  );

  const recentEvents: Array<any> = s?.recentEvents ?? [];
  const overdueEvents: Array<any> = s?.overdueEvents ?? [];

  const renderRecentEvents = () => (
    <div className="divide-y divide-slate-100">
      {recentEvents.length === 0 ? (
        <p className="p-3 text-xs text-slate-400 italic">No recent events</p>
      ) : recentEvents.slice(0, 6).map((e: any) => (
        <div key={e.id}
          onClick={() => navigateTo(`/safety/${e.eventType === "NEAR_MISS" ? "near-misses" : e.eventType === "HAZARD" || e.eventType === "OBSERVATION" ? "hazards" : "incidents"}`)}
          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
          <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${
            e.severity === "CRITICAL" ? "bg-red-500" :
            e.severity === "HIGH" ? "bg-orange-500" :
            e.severity === "MEDIUM" ? "bg-amber-500" :
            "bg-slate-400"
          }`} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-900 truncate font-medium">{e.title}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span>{typeLabel(e.eventType)}</span>
              <span>·</span>
              <span className={`inline-flex items-center px-1 py-0.5 border text-[9px] font-medium ${
                e.status === "CLOSED" ? "bg-green-100 text-green-700 border-green-200" :
                e.status === "CANCELLED" ? "bg-slate-100 text-slate-500 border-slate-200" :
                e.status === "DRAFT" ? "bg-slate-100 text-slate-600 border-slate-200" :
                e.status === "ACTION_REQUIRED" ? "bg-orange-100 text-orange-700 border-orange-200" :
                e.status === "UNDER_REVIEW" ? "bg-amber-100 text-amber-700 border-amber-200" :
                "bg-blue-100 text-blue-700 border-blue-200"
              }`}>{statusLabel(e.status)}</span>
            </div>
          </div>
          {e.occurredAt && <span className="text-[10px] text-slate-400 shrink-0">{e.occurredAt.slice(0, 10)}</span>}
        </div>
      ))}
    </div>
  );

  const renderOverdueEvents = () => (
    <div className="divide-y divide-slate-100">
      {overdueEvents.length === 0 ? (
        <p className="p-3 text-xs text-slate-400 italic">No overdue follow-ups</p>
      ) : overdueEvents.map((e: any) => (
        <div key={e.id}
          onClick={() => navigateTo(`/safety/${e.eventType === "NEAR_MISS" ? "near-misses" : e.eventType === "HAZARD" || e.eventType === "OBSERVATION" ? "hazards" : "incidents"}`)}
          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
          <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${
            e.severity === "CRITICAL" ? "bg-red-500" :
            e.severity === "HIGH" ? "bg-orange-500" :
            e.severity === "MEDIUM" ? "bg-amber-500" :
            "bg-slate-400"
          }`} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-900 truncate font-medium">{e.title}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span>{typeLabel(e.eventType)}</span>
              <span>·</span>
              <span className={`inline-flex items-center px-1 py-0.5 border text-[9px] font-medium ${
                e.status === "ACTION_REQUIRED" ? "bg-orange-100 text-orange-700 border-orange-200" :
                e.status === "UNDER_REVIEW" ? "bg-amber-100 text-amber-700 border-amber-200" :
                "bg-blue-100 text-blue-700 border-blue-200"
              }`}>{statusLabel(e.status)}</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-red-600 shrink-0">{daysSince(e.occurredAt || e.reportedAt)} days</span>
        </div>
      ))}
    </div>
  );

  const content = hasData ? (
    <div className="flex flex-col h-full">
      {renderKpiStrip()}
      <div className="flex-1 grid grid-cols-2 auto-rows-[1fr] gap-0 min-h-0 overflow-hidden">
        {/* Left top: Events by Type */}
        <div className="flex flex-col border-r border-b border-slate-200 overflow-hidden">
          <div className={PANEL_HEADER}>
            <List className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
            <span className={PANEL_TITLE}>Events by Type</span>
          </div>
          <div className={`${PANEL_BODY} p-3`}>
            <div className="space-y-2 text-xs">
              {byType.map((e) => (
                <div key={e.eventType} className="flex items-center gap-2">
                  <span className="text-slate-600 w-24 truncate">{typeLabel(e.eventType)}</span>
                  <div className="flex-1">{renderBar(e.count, maxTypeCount, "bg-blue-500")}</div>
                  <span className="text-slate-900 font-medium tabular-nums w-8 text-right">{e.count}</span>
                </div>
              ))}
              {byType.length === 0 && <p className="text-xs text-slate-400 italic">No data</p>}
            </div>
          </div>
        </div>
        {/* Right top: Events by Severity */}
        <div className="flex flex-col border-b border-slate-200 overflow-hidden">
          <div className={PANEL_HEADER}>
            <BarChart3 className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
            <span className={PANEL_TITLE}>Events by Severity</span>
          </div>
          <div className={`${PANEL_BODY} p-3`}>
            <div className="space-y-2 text-xs">
              {allSeverities.map((sev) => {
                const entry = bySeverity.find((s) => s.severity === sev);
                const count = entry?.count ?? 0;
                return (
                  <div key={sev} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sevColor[sev] || "bg-slate-400"}`} />
                    <span className="text-slate-600 w-20">{sev.charAt(0) + sev.slice(1).toLowerCase()}</span>
                    <div className="flex-1">{renderBar(count, maxSevCount, sevColor[sev] || "bg-slate-400")}</div>
                    <span className="text-slate-900 font-medium tabular-nums w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* Left bottom: Recent Safety Events */}
        <div className="flex flex-col border-r border-slate-200 overflow-hidden">
          <div className={PANEL_HEADER}>
            <Activity className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
            <span className={PANEL_TITLE}>Recent Safety Events</span>
          </div>
          <div className={`${PANEL_BODY}`}>
            {renderRecentEvents()}
          </div>
        </div>
        {/* Right bottom: Status Summary + Quick Actions */}
        <div className="flex flex-col overflow-hidden">
          <div className={PANEL_HEADER}>
            <TrendingUp className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
            <span className={PANEL_TITLE}>Status Summary</span>
          </div>
          <div className={`${PANEL_BODY} p-3`}>
            {renderStatusSummary()}
          </div>
          {renderQuickActions()}
        </div>
      </div>
      {overdueEvents.length > 0 && (
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className={PANEL_HEADER}>
            <Clock className="h-3.5 w-3.5 text-red-500 mr-1.5" />
            <span className="text-xs font-semibold text-red-700">Overdue Follow-ups</span>
            <span className="ml-auto text-[10px] text-red-500 font-mono">{overdueEvents.length} item{overdueEvents.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="max-h-[120px] overflow-y-auto">
            {renderOverdueEvents()}
          </div>
        </div>
      )}
    </div>
  ) : loading ? (
    <div className="flex flex-1 items-center justify-center h-full text-xs text-slate-400">Loading dashboard...</div>
  ) : (
    renderZeroState()
  );

  const toolbarContent = (
    <Toolbar left={<ToolbarButton icon={Search} label="Search" onClick={() => navigate("/safety/incidents")} className="w-full justify-start" />} right={
      <><div className="flex items-center gap-0.5" /><div className="ml-auto flex items-center gap-0.5"><ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></div></>
    } />
  );

  const footerContent = hasData
    ? <>{s.totalEvents} total events · {s.openEvents} open · {s.criticalEvents} critical · {s.overdueFollowUps > 0 ? `${s.overdueFollowUps} overdue` : "No overdue follow-ups"}</>
    : <>No safety data recorded</>;

  return (
    <AppPageLayout
      icon={<AlertTriangle className="h-5 w-5 stroke-current" />}
      iconClass="bg-red-100 text-red-600"
      title="Safety Dashboard"
      subtitle="Operational safety overview across all plants."
      toolbar={toolbarContent}
      footer={footerContent}
    >
      {content}
    </AppPageLayout>
  );
}
