import { useQuery } from "@apollo/client/react";
import { AlertTriangle, Plus, Activity, TrendingUp, List, BarChart3, RefreshCw, Clock, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarButton } from "@/components/layout/PageToolbar";
import { SAFETY_DASHBOARD_SUMMARY_QUERY } from "@/graphql/checkQueries";

const KPI_CARD = "flex flex-col gap-0.5 min-w-0 px-4 py-2.5 border-r border-border last:border-r-0 cursor-pointer transition-colors hover:bg-muted";
const KPI_VALUE = "text-lg font-bold tabular-nums leading-none";
const KPI_LABEL = "text-[10px] font-medium text-muted-foreground uppercase tracking-wider";

const PANEL_HEADER = "shrink-0 h-8 border-b border-border flex items-center bg-muted px-3";
const PANEL_TITLE = "text-xs font-semibold text-secondary-foreground";
const PANEL_BODY = "flex-1 overflow-y-auto";

function kpiColor(key: string): string {
  switch (key) {
    case "open": return "text-warning";
    case "critical": return "text-danger";
    case "highSeverity": return "text-warning";
    case "action": return "text-warning";
    case "closed": return "text-success";
    case "overdue": return "text-danger";
    default: return "text-foreground";
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
  LOW: "bg-muted-foreground/40", MEDIUM: "bg-warning", HIGH: "bg-warning", CRITICAL: "bg-danger",
};

  const navigateTo = (path: string) => navigate(path);

  const renderKpiStrip = () => (
    <div className="shrink-0 flex items-stretch divide-x divide-border border-b border-border bg-muted">
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle className="h-7 w-7 text-danger/60" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No safety events recorded yet.</h3>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          Start by reporting an incident, near miss, hazard, or observation.
        </p>
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <button onClick={() => navigateTo("/safety/incidents")}
              className="inline-flex h-8 items-center gap-1.5 bg-danger px-4 text-sm font-semibold text-danger-foreground hover:bg-danger/80">
              <Plus className="h-3.5 w-3.5" /> New Incident / Accident
            </button>
            <button onClick={() => navigateTo("/safety/near-misses")}
              className="inline-flex h-8 items-center gap-1.5 bg-warning px-4 text-sm font-semibold text-warning-foreground hover:bg-warning/80">
              <Plus className="h-3.5 w-3.5" /> New Near Miss
            </button>
          </div>
          <button onClick={() => navigateTo("/safety/hazards")}
            className="inline-flex h-8 items-center gap-1.5 bg-muted-foreground px-4 text-sm font-semibold text-foreground hover:bg-muted-foreground/80">
            <Plus className="h-3.5 w-3.5" /> New Hazard / Observation
          </button>
        </div>
      </div>
    </div>
  );

  const renderBar = (count: number, max: number, color: string) => (
    <div className="h-5 w-full bg-muted rounded-sm overflow-hidden">
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
          <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === "CLOSED" ? "bg-success" : s.status === "CANCELLED" ? "bg-muted-foreground/40" : s.status === "DRAFT" ? "bg-muted-foreground/40" : s.status === "REPORTED" ? "bg-primary" : s.status === "UNDER_REVIEW" ? "bg-warning" : s.status === "ACTION_REQUIRED" ? "bg-warning" : "bg-muted-foreground/40"}`} />
          <span className="text-muted-foreground w-28 truncate">{statusLabel(s.status)}</span>
          <div className="flex-1">{renderBar(s.count, maxStatusCount, "bg-primary")}</div>
          <span className="text-foreground font-medium tabular-nums w-8 text-right">{s.count}</span>
        </div>
      ))}
      {byStatus.length === 0 && <p className="text-xs text-muted-foreground/60 italic">No status data</p>}
    </div>
  );

  const renderQuickActions = () => (
    <div className="p-3 border-t border-slate-200 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</p>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => navigateTo("/safety/incidents")}
          className="inline-flex h-7 items-center gap-1 bg-danger/15 text-danger px-2.5 text-[10px] font-semibold hover:bg-danger/20 border border-danger/20">
          <Plus className="h-3 w-3" /> Incident
        </button>
        <button onClick={() => navigateTo("/safety/near-misses")}
          className="inline-flex h-7 items-center gap-1 bg-warning/15 text-warning px-2.5 text-[10px] font-semibold hover:bg-warning/20 border border-warning/20">
          <Plus className="h-3 w-3" /> Near Miss
        </button>
        <button onClick={() => navigateTo("/safety/hazards")}
          className="inline-flex h-7 items-center gap-1 bg-muted text-secondary-foreground px-2.5 text-[10px] font-semibold hover:bg-muted/80 border border-border">
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
        <p className="p-3 text-xs text-muted-foreground/60 italic">No recent events</p>
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
            <div className="text-xs text-foreground truncate font-medium">{e.title}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>{typeLabel(e.eventType)}</span>
              <span>·</span>
              <span className={`inline-flex items-center px-1 py-0.5 border text-[9px] font-medium ${
                e.status === "CLOSED" ? "bg-success/15 text-success border-success/20" :
                e.status === "CANCELLED" ? "bg-muted text-muted-foreground border-border" :
                e.status === "DRAFT" ? "bg-muted text-muted-foreground border-border" :
                e.status === "ACTION_REQUIRED" ? "bg-warning/15 text-warning border-warning/20" :
                e.status === "UNDER_REVIEW" ? "bg-warning/15 text-warning border-warning/20" :
                "bg-primary/15 text-primary border-primary/20"
              }`}>{statusLabel(e.status)}</span>
            </div>
          </div>
          {e.occurredAt && <span className="text-[10px] text-muted-foreground/60 shrink-0">{e.occurredAt.slice(0, 10)}</span>}
        </div>
      ))}
    </div>
  );

  const renderOverdueEvents = () => (
    <div className="divide-y divide-slate-100">
      {overdueEvents.length === 0 ? (
        <p className="p-3 text-xs text-muted-foreground/60 italic">No overdue follow-ups</p>
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
            <div className="text-xs text-foreground truncate font-medium">{e.title}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>{typeLabel(e.eventType)}</span>
              <span>·</span>
              <span className={`inline-flex items-center px-1 py-0.5 border text-[9px] font-medium ${
                e.status === "ACTION_REQUIRED" ? "bg-warning/15 text-warning border-warning/20" :
                e.status === "UNDER_REVIEW" ? "bg-warning/15 text-warning border-warning/20" :
                "bg-primary/15 text-primary border-primary/20"
              }`}>{statusLabel(e.status)}</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-danger shrink-0">{daysSince(e.occurredAt || e.reportedAt)} days</span>
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
            <List className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
            <span className={PANEL_TITLE}>Events by Type</span>
          </div>
          <div className={`${PANEL_BODY} p-3`}>
            <div className="space-y-2 text-xs">
              {byType.map((e) => (
                <div key={e.eventType} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24 truncate">{typeLabel(e.eventType)}</span>
                  <div className="flex-1">{renderBar(e.count, maxTypeCount, "bg-primary")}</div>
                  <span className="text-slate-900 font-medium tabular-nums w-8 text-right">{e.count}</span>
                </div>
              ))}
              {byType.length === 0 && <p className="text-xs text-muted-foreground/60 italic">No data</p>}
            </div>
          </div>
        </div>
        {/* Right top: Events by Severity */}
        <div className="flex flex-col border-b border-slate-200 overflow-hidden">
          <div className={PANEL_HEADER}>
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
            <span className={PANEL_TITLE}>Events by Severity</span>
          </div>
          <div className={`${PANEL_BODY} p-3`}>
            <div className="space-y-2 text-xs">
              {allSeverities.map((sev) => {
                const entry = bySeverity.find((s) => s.severity === sev);
                const count = entry?.count ?? 0;
                return (
                  <div key={sev} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sevColor[sev] || "bg-muted-foreground/40"}`} />
                    <span className="text-muted-foreground w-20">{sev.charAt(0) + sev.slice(1).toLowerCase()}</span>
                    <div className="flex-1">{renderBar(count, maxSevCount, sevColor[sev] || "bg-muted-foreground/40")}</div>
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
            <Activity className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
            <span className={PANEL_TITLE}>Recent Safety Events</span>
          </div>
          <div className={`${PANEL_BODY}`}>
            {renderRecentEvents()}
          </div>
        </div>
        {/* Right bottom: Status Summary + Quick Actions */}
        <div className="flex flex-col overflow-hidden">
          <div className={PANEL_HEADER}>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
            <span className={PANEL_TITLE}>Status Summary</span>
          </div>
          <div className={`${PANEL_BODY} p-3`}>
            {renderStatusSummary()}
          </div>
          {renderQuickActions()}
        </div>
      </div>
      {overdueEvents.length > 0 && (
        <div className="shrink-0 border-t border-slate-200 bg-muted">
          <div className={PANEL_HEADER}>
            <Clock className="h-3.5 w-3.5 text-danger mr-1.5" />
            <span className="text-xs font-semibold text-danger">Overdue Follow-ups</span>
            <span className="ml-auto text-[10px] text-danger font-mono">{overdueEvents.length} item{overdueEvents.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="max-h-[120px] overflow-y-auto">
            {renderOverdueEvents()}
          </div>
        </div>
      )}
    </div>
  ) : loading ? (
    <div className="flex flex-1 items-center justify-center h-full text-xs text-muted-foreground/60">Loading dashboard...</div>
  ) : (
    renderZeroState()
  );

  const toolbarContent = (
    <PageToolbar
      leftSlot={<ToolbarButton icon={Search} label="Search" onClick={() => navigate("/safety/incidents")} className="w-full justify-start" />}
      actions={<ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />}
    />
  );

  const footerContent = hasData
    ? <>{s.totalEvents} total events · {s.openEvents} open · {s.criticalEvents} critical · {s.overdueFollowUps > 0 ? `${s.overdueFollowUps} overdue` : "No overdue follow-ups"}</>
    : <>No safety data recorded</>;

  return (
    <AppPageLayout
      icon={<AlertTriangle className="h-5 w-5 stroke-current" />}
      iconClass="bg-danger/15 text-danger"
      title="Safety Dashboard"
      subtitle="Operational safety overview across all plants."
      toolbar={toolbarContent}
      footer={footerContent}
    >
      {content}
    </AppPageLayout>
  );
}
