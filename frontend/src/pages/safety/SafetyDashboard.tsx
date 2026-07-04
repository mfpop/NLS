import { useQuery } from "@apollo/client/react";
import { AlertTriangle, Activity, CheckCircle, Clock, ShieldAlert } from "lucide-react";
import { gql } from "@apollo/client";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { useNavigate } from "react-router-dom";

export const SAFETY_DASHBOARD_SUMMARY = gql`
  query SafetyDashboardSummary {
    safetyDashboardSummary {
      totalEvents
      byEventType { eventType count }
      bySeverity { severity count }
      byStatus { status count }
      openEvents
      closedEvents
    }
  }
`;

const EVENT_TYPE_LABELS: Record<string, string> = {
  INCIDENT: "Incidents", ACCIDENT: "Accidents", NEAR_MISS: "Near Misses",
  HAZARD: "Hazards", OBSERVATION: "Observations",
};

const EVENT_TYPE_ROUTES: Record<string, string> = {
  INCIDENT: "/safety/incidents", ACCIDENT: "/safety/incidents",
  NEAR_MISS: "/safety/near-misses",
  HAZARD: "/safety/hazards", OBSERVATION: "/safety/hazards",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  REPORTED: "bg-primary/15 text-primary border-primary/20",
  UNDER_REVIEW: "bg-warning/15 text-warning border-warning/20",
  ACTION_REQUIRED: "bg-warning/15 text-warning border-warning/20",
  CLOSED: "bg-success/15 text-success border-success/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border px-3 py-2 min-h-[64px]">
      <div className={`flex h-9 w-9 items-center justify-center ${color}`}>
        <Icon className="h-4 w-4 stroke-current" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-[11px] text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

export function SafetyDashboard() {
  const navigate = useNavigate();
  const { data, loading } = useQuery(SAFETY_DASHBOARD_SUMMARY, { fetchPolicy: "cache-and-network" });
  const summary: any = (data as any)?.safetyDashboardSummary;

  return (
    <AppPageLayout
      icon={<ShieldAlert className="h-5 w-5 stroke-current" />}
      iconClass="bg-danger/15 text-danger"
      title="Safety Dashboard"
      subtitle="Operational safety oversight — events, incidents, hazards, and observations."
      footer="Dashboard shows aggregate counts from safety events. Click event type cards to view details."
    >
      <div className="p-4 space-y-4 max-w-5xl">
        {loading && !summary && (
          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground/60">Loading dashboard...</div>
        )}
        {!loading && !summary && (
          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground/60">No safety data available.</div>
        )}
        {summary && (
          <>
            {/* ── KPI row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KpiCard label="Total Events" value={summary.totalEvents} icon={AlertTriangle} color="bg-danger/15 text-danger" />
              <KpiCard label="Open" value={summary.openEvents} icon={Activity} color="bg-warning/15 text-warning" />
              <KpiCard label="Closed" value={summary.closedEvents} icon={CheckCircle} color="bg-success/15 text-success" />
              <KpiCard label="Under Review" value={summary.byStatus?.find((s: any) => s.status === "UNDER_REVIEW")?.count || 0} icon={Clock} color="bg-primary/15 text-primary" />
            </div>

            {/* ── By Event Type ── */}
            <div>
              <h3 className="text-[11px] font-semibold text-secondary-foreground uppercase tracking-wider mb-2">By Event Type</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                {(summary.byEventType || []).map((e: any) => (
                  <button key={e.eventType} type="button" onClick={() => navigate(EVENT_TYPE_ROUTES[e.eventType] || "/safety/incidents")}
                    className="flex items-center gap-2 bg-card border border-border px-3 py-2 hover:bg-muted transition-colors text-left">
                    <span className="text-sm font-bold text-foreground min-w-[28px]">{e.count}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{EVENT_TYPE_LABELS[e.eventType] || e.eventType}</span>
                  </button>
                ))}
                {(!summary.byEventType || summary.byEventType.length === 0) && (
                  <span className="text-[11px] text-muted-foreground/60 col-span-full">No events recorded.</span>
                )}
              </div>
            </div>

            {/* ── By Severity ── */}
            <div>
              <h3 className="text-[11px] font-semibold text-secondary-foreground uppercase tracking-wider mb-2">By Severity</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(summary.bySeverity || []).map((s: any) => (
                  <div key={s.severity} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.severity === "CRITICAL" ? "bg-danger" : s.severity === "HIGH" ? "bg-warning" : s.severity === "MEDIUM" ? "bg-warning" : "bg-muted-foreground/40"}`} />
                    <span className="text-sm font-bold text-foreground">{s.count}</span>
                    <span className="text-[11px] text-muted-foreground">{s.severity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── By Status ── */}
            <div>
              <h3 className="text-[11px] font-semibold text-secondary-foreground uppercase tracking-wider mb-2">By Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                {(summary.byStatus || []).map((s: any) => (
                  <div key={s.status} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2">
                    <span className={`text-sm font-bold text-slate-900 min-w-[24px]`}>{s.count}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${STATUS_COLORS[s.status] || "bg-muted text-muted-foreground border-border"}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppPageLayout>
  );
}
