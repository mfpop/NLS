import { useMemo } from "react";
import type { Breakdown } from "./BreakdownSection";
import { BREAKDOWN_STATUS_STYLES, SEVERITY_BG, SEVERITY_STYLES, wfLabel } from "./BreakdownStatusStyles";

interface OverviewProps {
  breakdowns: Breakdown[];
}

function SectionH({ label, color = "bg-warning/100" }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`w-1 h-4 shrink-0 rounded-sm ${color}`} />
      <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return <div className="text-xs text-muted-foreground italic py-1">{msg}</div>;
}

function statusBadge(status: string): string {
  return `inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${BREAKDOWN_STATUS_STYLES[status] || ""}`;
}

const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const SEVEN_DAYS = new Date(NOW);
SEVEN_DAYS.setDate(SEVEN_DAYS.getDate() - 7);
const LAST_WEEK = SEVEN_DAYS.toISOString().slice(0, 10);

export function BreakdownOverview({ breakdowns }: OverviewProps) {
  // ── KPI Calculations ──
  const kpis = useMemo(() => {
    const activeBreakdowns = breakdowns.filter((b) => b.status === "REPORTED" || b.status === "OPEN" || b.status === "ASSIGNED" || b.status === "IN_PROGRESS" || b.status === "WAITING_PARTS");
    const openCritical = breakdowns.filter((b) => b.status !== "CLOSED" && b.status !== "CANCELLED" && b.severity === "CRITICAL");
    const repairedBreakdowns = breakdowns.filter((b) => b.status === "RESOLVED" || b.status === "CLOSED");
    const totalDowntime = breakdowns.reduce((sum, b) => sum + (b.downtimeMinutes || 0), 0);
    const mttr = repairedBreakdowns.length > 0
      ? Math.round(totalDowntime / repairedBreakdowns.length)
      : 0;
    const thisWeek = breakdowns.filter((b) => b.reportedAt >= LAST_WEEK && b.reportedAt <= TODAY);
    const closedRate = breakdowns.length > 0
      ? Math.round((breakdowns.filter((b) => b.status === "CLOSED").length / breakdowns.length) * 100)
      : 0;
    return { activeBreakdowns, openCritical, repairedBreakdowns, totalDowntime, mttr, thisWeek, closedRate };
  }, [breakdowns]);

  // ── Risk Board: open items needing attention ──
  const riskItems = useMemo(() => {
    const items: { id: string; priority: number; type: string; title: string; detail: string; color: string }[] = [];
    const criticalOpen = breakdowns.filter((b) => b.severity === "CRITICAL" && b.status !== "CLOSED" && b.status !== "CANCELLED");
    for (const b of criticalOpen) {
      items.push({
        id: `bd-critical-${b.id}`, priority: 1, type: "CRITICAL", title: b.title,
        detail: `${b.downtimeMinutes ? `${b.downtimeMinutes} min` : ""} ${b.targetType}`.trim(), color: "bg-danger/100",
      });
    }
    const highOpen = breakdowns.filter((b) => b.severity === "HIGH" && b.status !== "CLOSED" && b.status !== "CANCELLED");
    for (const b of highOpen) {
      items.push({
        id: `bd-high-${b.id}`, priority: 2, type: "HIGH", title: b.title,
        detail: `${b.downtimeMinutes ? `${b.downtimeMinutes} min` : ""} ${b.targetType}`.trim(), color: "bg-warning/100",
      });
    }
    const underRepair = breakdowns.filter((b) => b.status === "IN_PROGRESS" && b.severity !== "CRITICAL" && b.severity !== "HIGH");
    for (const b of underRepair) {
      items.push({
        id: `bd-repair-${b.id}`, priority: 3, type: "In Repair", title: b.title,
        detail: `Started: ${b.repairStartedAt?.slice(0, 10) || "—"}`, color: "bg-warning/100",
      });
    }
    items.sort((a, b) => a.priority - b.priority);
    return items.slice(0, 12);
  }, [breakdowns]);

  // ── Recent breakdowns (newest first) ──
  const recentItems = useMemo(() => {
    return [...breakdowns]
      .sort((a, b) => (b.reportedAt || "").localeCompare(a.reportedAt || ""))
      .slice(0, 8);
  }, [breakdowns]);

  // ── Severity distribution ──
  const severityDist = useMemo(() => {
    const sevs = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    const colors: Record<string, string> = {
      CRITICAL: "border-danger/30 text-danger dark:border-red-800 dark:text-red-300",
      HIGH: "border-orange-300 text-warning dark:border-orange-800 dark:text-orange-300",
      MEDIUM: "border-primary/30 text-primary dark:border-blue-800 dark:text-blue-300",
      LOW: "border-border text-gray-600 dark:border-gray-700 dark:text-gray-400",
    };
    const bgColors: Record<string, string> = {
      CRITICAL: "bg-danger/10/80 dark:bg-red-950/30",
      HIGH: "bg-warning/10/80 dark:bg-orange-950/30",
      MEDIUM: "bg-primary/10/80 dark:bg-blue-950/30",
      LOW: "bg-gray-50/80 dark:bg-gray-900/30",
    };
    return sevs.map((s) => ({
      severity: s, count: breakdowns.filter((b) => b.severity === s).length,
      color: colors[s], bg: bgColors[s],
    }));
  }, [breakdowns]);

  // ── Status distribution ──
  const statusDist = useMemo(() => {
    const statuses = ["REPORTED", "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "RESOLVED", "CLOSED", "CANCELLED"];
    return statuses.map((s) => ({ status: s, count: breakdowns.filter((b) => b.status === s).length }));
  }, [breakdowns]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      {/* ═══ KPI Row ═══ */}
      <div className="grid grid-cols-6 gap-2">
        <KpiCard label="Active Breakdowns" count={kpis.activeBreakdowns.length} color="text-danger" />
        <KpiCard label="Critical/High Open" count={kpis.openCritical.length} color="text-warning" />
        <KpiCard label="This Week" count={kpis.thisWeek.length} color="text-primary" />
        <KpiCard label="Total Downtime" count={`${kpis.totalDowntime} min`} color="text-foreground" />
        <KpiCard label="MTTR" count={`${kpis.mttr} min`} color="text-accent-foreground" />
        <KpiCard label="Closure Rate" count={`${kpis.closedRate}%`} color="text-success" />
      </div>

      {/* ═══ Main Content: 60/40 ═══ */}
      <div className="flex gap-3">
        {/* ── Left 60% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>
          {/* Risk Board */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Breakdown Risk Board" color="bg-danger/100" />
            {riskItems.length === 0 ? (
              <EmptyRow msg="No breakdowns need immediate attention" />
            ) : (
              <div className="space-y-0.5">
                {riskItems.map((item) => (
                  <div key={item.id}
                    className="flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                    <span className="text-[10px] font-semibold text-muted-foreground w-16 shrink-0">{item.type}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{item.title}</span>
                    {item.detail && <span className="text-muted-foreground truncate max-w-[120px] hidden sm:inline">{item.detail}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Severity Distribution */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Severity Distribution" color="bg-warning/100" />
            <div className="grid grid-cols-4 gap-2">
              {severityDist.map((s) => (
                <div key={s.severity} className={`${s.bg} border ${s.color} p-2 text-center`}>
                  <p className={`text-lg font-bold ${s.color.split(" ")[0]}`}>{s.count}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">{s.severity}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Status Distribution" color="bg-primary/100" />
            <div className="flex flex-wrap gap-2">
              {statusDist.map((s) => (
                <div key={s.status} className={`inline-flex items-center gap-1.5 ${statusBadge(s.status)}`}>
                  <span className="font-bold">{s.count}</span> {wfLabel(s.status)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right 40% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "40%" }}>
          {/* Recent Breakdowns */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Recent Breakdowns" color="bg-violet-500" />
            {recentItems.length === 0 ? (
              <EmptyRow msg="No recent breakdowns" />
            ) : (
              <div className="space-y-0.5">
                {recentItems.map((b) => (
                  <div key={b.id}
                    className="flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0"
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${SEVERITY_BG[b.severity] || "bg-muted"} ${SEVERITY_STYLES[b.severity] || ""}`}>
                      {b.severity === "CRITICAL" ? "C!" : b.severity === "HIGH" ? "H" : b.severity === "MEDIUM" ? "M" : "L"}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{b.title}</span>
                    <span className={`shrink-0 inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${BREAKDOWN_STATUS_STYLES[b.status] || ""}`}>
                      {wfLabel(b.status)}
                    </span>
                    {b.downtimeMinutes != null && (
                      <span className="text-muted-foreground text-[10px] shrink-0">{b.downtimeMinutes}m</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Lean Metrics" color="bg-success/100" />
            <div className="space-y-2">
              <MetricRow label="Active Breakdowns" value={kpis.activeBreakdowns.length} sub="Open / In Progress / Waiting" />
              <MetricRow label="Repaired" value={kpis.repairedBreakdowns.length} sub="REPAIRED + CLOSED" />
              <MetricRow label="MTTR (Mean Time To Repair)" value={`${kpis.mttr} min`} sub="Average per breakdown" />
              <MetricRow label="Total Downtime" value={`${kpis.totalDowntime} min`} sub={`~${kpis.totalDowntime > 0 ? Math.round(kpis.totalDowntime / 60) : 0} hrs`} />
              <MetricRow label="Closure Rate" value={`${kpis.closedRate}%`} sub={`${breakdowns.length} total`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, count, color }: { label: string; count: number | string; color: string }) {
  return (
    <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-2.5">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <p className={`text-base font-bold ${color}`}>{count}</p>
    </div>
  );
}

function MetricRow({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
      <span className="text-sm font-bold text-foreground shrink-0 ml-3">{value}</span>
    </div>
  );
}
