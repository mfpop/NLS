import { useMemo, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ISSUE_STATUS_STYLES, ACTION_STATUS_STYLES,
  STATUS_STYLES, statusLabel,
} from "./quality-control/QualityStatusStyles";

interface OverviewProps {
  audits: any[];
  problems: any[];
  actions: any[];
  auditTemplates?: any[];
  onInstallTemplates?: () => void;
}

const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const WEEK_END = new Date(NOW);
WEEK_END.setDate(WEEK_END.getDate() + 7);
const WEEK_END_STR = WEEK_END.toISOString().slice(0, 10);
const MONTH_AGO = new Date(NOW);
MONTH_AGO.setDate(MONTH_AGO.getDate() - 30);
const MONTH_AGO_STR = MONTH_AGO.toISOString().slice(0, 10);

type NavTarget = { tab: string; status?: string };

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-white/30 dark:bg-slate-800/30 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function Gauge({ value, label, sub, color, size = "sm" }: { value: number; label: string; sub?: string; color: string; size?: "sm" | "md" }) {
  const r = size === "sm" ? 22 : 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ;
  const fontSz = size === "sm" ? "text-lg" : "text-2xl";
  const strokeW = size === "sm" ? 4 : 6;
  return (
    <div className="flex flex-col items-center">
      <svg width={(r + 8) * 2} height={(r + 8) * 2} className="transform -rotate-90">
        <circle cx={r + 8} cy={r + 8} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} className="text-white/10 dark:text-slate-800/30" />
        <circle cx={r + 8} cy={r + 8} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: (r + 8) * 2, height: (r + 8) * 2 }}>
        <span className={`${fontSz} font-bold text-foreground`}>{value}%</span>
      </div>
      <p className="text-[10px] font-medium text-muted-foreground mt-1 text-center">{label}</p>
      {sub && <p className="text-[9px] text-muted-foreground/60 text-center">{sub}</p>}
    </div>
  );
}

function Badge({ cls, label }: { cls: string; label: string }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${cls}`}>{label}</span>;
}  function SectionH({ label, color = "bg-teal-500", action }: { label: string; color?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className={`w-1 h-4 shrink-0 ${color}`} />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
      </div>
      {action}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-400", OPEN: "bg-blue-500", COMPLETED: "bg-green-500",
    ARCHIVED: "bg-amber-400", RESOLVED: "bg-green-400", CLOSED: "bg-green-600",
    CANCELLED: "bg-red-400", IN_PROGRESS: "bg-amber-500", IN_REVIEW: "bg-purple-500",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${colors[status] || "bg-gray-400"}`} />;
}

type KpiCard = { label: string; count: number | string; color: string; sub?: string; trend?: "up" | "down" | "neutral"; trendVal?: string; onClick: () => void };
function KpiCard({ card }: { card: KpiCard }) {
  const trendIcon = card.trend === "up" ? "↑" : card.trend === "down" ? "↓" : "→";
  const trendCls = card.trend === "up" ? "text-green-500" : card.trend === "down" ? "text-red-500" : "text-muted-foreground";
  return (
    <button onClick={card.onClick}
      className="group cursor-pointer text-left bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-2.5 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <p className="text-[10px] text-muted-foreground font-medium truncate">{card.label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className={`text-lg font-bold ${card.color}`}>{card.count}</p>
        {card.trend && <span className={`text-[10px] font-medium ${trendCls}`}>{trendIcon} {card.trendVal}</span>}
      </div>
      {card.sub && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{card.sub}</p>}
    </button>
  );
}

export function MaterialOverview(props: OverviewProps) {
  const { audits, problems, actions, auditTemplates, onInstallTemplates } = props;
  const navigate = useNavigate();

  const kpiClick = useCallback((target: NavTarget) => {
    const params = new URLSearchParams();
    params.set("tab", target.tab);
    if (target.status) params.set("status", target.status);
    navigate(`/check/material-control?${params.toString()}`, { replace: true });
  }, [navigate]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const openIssues = problems.filter((p) => p.status === "OPEN" || p.status === "IN_REVIEW");
    const openActions = actions.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS");
    const openAudits = audits.filter((a) => a.status === "DRAFT" || a.status === "OPEN");
    const overdueActions = actions.filter((a) => a.dueDate && a.dueDate < TODAY && a.status !== "COMPLETED" && a.status !== "CANCELLED");
    const criticalHigh = [
      ...problems.filter((p) => (p.severity === "CRITICAL" || p.severity === "HIGH") && p.status !== "CLOSED" && p.status !== "CANCELLED"),
      ...actions.filter((a) => (a.priority === "CRITICAL" || a.priority === "HIGH") && a.status !== "COMPLETED" && a.status !== "CANCELLED"),
    ];
    const completedAudits = audits.filter((a) => a.status === "COMPLETED");
    const completionRate = audits.length > 0 ? Math.round((completedAudits.length / audits.length) * 100) : 0;
    const avgScore = audits.filter((a) => a.score != null).length > 0
      ? Math.round(audits.filter((a) => a.score != null).reduce((s, a) => s + a.score, 0) / audits.filter((a) => a.score != null).length)
      : null;
    // Trend: compare last 30 days to previous period
    const recentCompleted = audits.filter((a) => a.status === "COMPLETED" && a.createdAt >= MONTH_AGO_STR).length;
    return { openIssues, openActions, openAudits, overdueActions, criticalHigh, completedAudits, completionRate, avgScore, recentCompleted };
  }, [problems, actions, audits]);

  const kpiCards: KpiCard[] = useMemo(() => [
    { label: "Material Audits Open", count: kpis.openAudits.length, color: "text-blue-600 dark:text-blue-400", sub: `${kpis.openAudits.length} pending review`, onClick: () => kpiClick({ tab: "audits", status: "OPEN" }) },
    { label: "Open Issues", count: kpis.openIssues.length, color: "text-amber-600 dark:text-amber-400", sub: "Requires action", trend: kpis.openIssues.length > 3 ? "up" : kpis.openIssues.length === 0 ? "down" : "neutral", trendVal: `${kpis.openIssues.length > 0 ? "+" : ""}${kpis.openIssues.length}`, onClick: () => kpiClick({ tab: "issues", status: "OPEN" }) },
    { label: "Open Actions", count: kpis.openActions.length, color: "text-purple-600 dark:text-purple-400", sub: `${actions.length} total`, onClick: () => kpiClick({ tab: "actions", status: "OPEN" }) },
    { label: "Overdue Actions", count: kpis.overdueActions.length, color: "text-red-600 dark:text-red-400", sub: "Past due date", trend: kpis.overdueActions.length > 0 ? "up" : "down", trendVal: `${kpis.overdueActions.length}`, onClick: () => kpiClick({ tab: "actions" }) },
    { label: "Critical / High", count: kpis.criticalHigh.length, color: "text-red-600 dark:text-red-400", sub: "Needs immediate attention", onClick: () => kpiClick({ tab: "issues" }) },
    { label: "Completed Audits", count: kpis.completedAudits.length, color: "text-green-600 dark:text-green-400", sub: `${kpis.recentCompleted} in last 30d`, onClick: () => kpiClick({ tab: "audits", status: "COMPLETED" }) },
    { label: "Audit Completion", count: `${kpis.completionRate}%`, color: "text-foreground", sub: kpis.avgScore !== null ? `Avg score: ${kpis.avgScore}%` : "No data yet", onClick: () => kpiClick({ tab: "audits" }) },
  ], [kpis, actions.length]);

  // ── Performance Gauges ──
  const scores = useMemo(() => {
    const matFlow = audits.filter((a) => a.auditType === "FIFO" || a.auditType === "MATERIAL_FLOW" || a.auditType?.includes("FIFO") || a.auditType?.includes("MATERIAL"));
    const fifo = audits.filter((a) => a.auditType === "FIFO" || a.auditType === "MT_FIFO_CHECK" || a.auditType?.includes("FIFO"));
    const storage = audits.filter((a) => a.auditType === "MT_BIN_LOCATION" || a.auditType === "MT_WIP_CHECK" || a.auditType?.includes("BIN") || a.auditType?.includes("WIP"));
    const calcAvg = (items: any[]) => items.filter((a) => a.score != null).length > 0 ? Math.round(items.filter((a) => a.score != null).reduce((s, a) => s + a.score, 0) / items.filter((a) => a.score != null).length) : null;
    return {
      fifoScore: calcAvg(fifo),
      flowScore: calcAvg(matFlow),
      storageScore: calcAvg(storage),
      overall: kpis.avgScore,
    };
  }, [audits, kpis.avgScore]);

  // ── Risk Board ──
  const riskItems = useMemo(() => {
    const items: { id: string; priority: number; type: string; title: string; detail: string; color: string; onClick: () => void }[] = [];
    const hiProblems = problems.filter((p) => (p.severity === "CRITICAL" || p.severity === "HIGH") && p.status !== "CLOSED" && p.status !== "CANCELLED");
    for (const p of hiProblems) items.push({ id: `issue-${p.id}`, priority: 1, type: "Issue", title: p.title || "Issue", detail: `${p.severity} ${p.problemType || ""}`.trim(), color: "bg-red-500", onClick: () => kpiClick({ tab: "issues" }) });
    const overActions = actions.filter((a) => a.dueDate && a.dueDate < TODAY && a.status !== "COMPLETED" && a.status !== "CANCELLED");
    for (const a of overActions) items.push({ id: `action-${a.id}`, priority: 2, type: "Action", title: a.title || "Action", detail: `Due ${a.dueDate}${a.owner ? ` · ${a.owner}` : ""}`, color: "bg-red-400", onClick: () => kpiClick({ tab: "actions" }) });
    const incomplete = audits.filter((a) => a.status === "DRAFT" || a.status === "OPEN");
    for (const a of incomplete) items.push({ id: `audit-${a.id}`, priority: 3, type: "Audit", title: a.title || `Audit #${a.id}`, detail: a.auditType || "", color: "bg-teal-400", onClick: () => kpiClick({ tab: "audits" }) });
    items.sort((a, b) => a.priority - b.priority);
    return items.slice(0, 10);
  }, [problems, actions, audits, kpiClick]);

  // ── Due This Week ──
  const dueThisWeek = useMemo(() => {
    const items: { id: string; title: string; owner: string; dueDate: string; priority: string; source: string; onClick: () => void }[] = [];
    for (const a of actions) {
      if (a.dueDate && a.dueDate >= TODAY && a.dueDate <= WEEK_END_STR && a.status !== "COMPLETED" && a.status !== "CANCELLED")
        items.push({ id: `action-${a.id}`, title: a.title, owner: a.owner || "", dueDate: a.dueDate, priority: a.priority || "MEDIUM", source: "Action", onClick: () => kpiClick({ tab: "actions" }) });
    }
    for (const p of problems) {
      if (p.dueDate && p.dueDate >= TODAY && p.dueDate <= WEEK_END_STR && p.status !== "CLOSED" && p.status !== "CANCELLED")
        items.push({ id: `issue-${p.id}`, title: p.title, owner: p.reportedBy || p.owner || "", dueDate: p.dueDate, priority: p.severity || "MEDIUM", source: "Issue", onClick: () => kpiClick({ tab: "issues" }) });
    }
    items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return items.slice(0, 8);
  }, [actions, problems, kpiClick]);

  // ── Audit Type Breakdown ──
  const auditTypeBreakdown = useMemo(() => {
    const map: Record<string, { total: number; completed: number; draft: number; scores: number[] }> = {};
    for (const a of audits) {
      const t = a.auditType || "Other";
      if (!map[t]) map[t] = { total: 0, completed: 0, draft: 0, scores: [] };
      map[t].total++;
      if (a.status === "COMPLETED") map[t].completed++;
      if (a.status === "DRAFT") map[t].draft++;
      if (a.score !== null && a.score !== undefined) map[t].scores.push(a.score);
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [audits]);

  // ── Recent Activity ──
  const recentItems = useMemo(() => {
    const mapped = [
      ...actions.map((a: any) => ({ date: a.createdAt || "", type: "Action" as const, title: a.title, status: a.status, owner: a.owner || "", score: undefined, onClick: () => kpiClick({ tab: "actions" }) })),
      ...problems.map((p: any) => ({ date: p.createdAt || "", type: "Issue" as const, title: p.title || "Issue", status: p.status, owner: p.reportedBy || p.owner || "", score: undefined, onClick: () => kpiClick({ tab: "issues" }) })),
      ...audits.map((a: any) => ({ date: a.createdAt || "", type: "Audit" as const, title: a.title || `Audit #${a.id}`, status: a.status, owner: a.auditor || "", score: a.score, onClick: () => kpiClick({ tab: "audits" }) })),
    ];
    return mapped.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 12);
  }, [actions, problems, audits, kpiClick]);

  // ── Status distribution for the visual bar ──
  const statusDist = useMemo(() => {
    const total = audits.length;
    if (total === 0) return [];
    const counts = [
      { label: "Draft", count: audits.filter((a) => a.status === "DRAFT").length, color: "bg-gray-400" },
      { label: "Open", count: audits.filter((a) => a.status === "OPEN").length, color: "bg-blue-500" },
      { label: "Completed", count: audits.filter((a) => a.status === "COMPLETED").length, color: "bg-green-500" },
      { label: "Archived", count: audits.filter((a) => a.status === "ARCHIVED").length, color: "bg-amber-400" },
    ];
    return counts.filter((c) => c.count > 0).map((c) => ({ ...c, pct: Math.round((c.count / total) * 100) }));
  }, [audits]);

  // ── Overdue alert ──
  const alertBanner = useMemo(() => {
    if (kpis.overdueActions.length > 3) return { msg: `${kpis.overdueActions.length} overdue actions require immediate attention`, severity: "critical" as const };
    if (kpis.criticalHigh.length > 2) return { msg: `${kpis.criticalHigh.length} critical/high items unresolved`, severity: "warning" as const };
    if (kpis.overdueActions.length > 0) return { msg: `${kpis.overdueActions.length} action${kpis.overdueActions.length > 1 ? "s" : ""} overdue`, severity: "info" as const };
    return null;
  }, [kpis]);

  const scoreColor = (v: number | null) => {
    if (v === null) return "text-muted-foreground";
    if (v >= 85) return "text-green-500";
    if (v >= 70) return "text-amber-500";
    return "text-red-500";
  };
  const gaugeColor = (v: number | null) => {
    if (v === null) return "#94a3b8";
    if (v >= 85) return "#22c55e";
    if (v >= 70) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      {/* Alert Banner */}
      {alertBanner && (
        <div className={`flex items-center gap-2 px-3 py-2 text-xs font-medium backdrop-blur-sm border ${
          alertBanner.severity === "critical" ? "bg-red-50/90 dark:bg-red-950/80 border-red-200/50 dark:border-red-800/50 text-red-700 dark:text-red-300"
          : alertBanner.severity === "warning" ? "bg-orange-50/90 dark:bg-orange-950/80 border-orange-200/50 dark:border-orange-800/50 text-orange-700 dark:text-orange-300"
          : "bg-blue-50/90 dark:bg-blue-950/80 border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-300"}`}
        >
          <span className="text-base shrink-0">{alertBanner.severity === "critical" ? "🔴" : alertBanner.severity === "warning" ? "🟠" : "🔵"}</span>
          <span className="flex-1">{alertBanner.msg}</span>
          <button onClick={() => kpiClick({ tab: "actions" })} className="underline font-semibold hover:no-underline shrink-0">View</button>
        </div>
      )}

      {/* Executive KPI Row */}
      <div className="grid grid-cols-7 gap-2">
        {kpiCards.map((card) => <KpiCard key={card.label} card={card} />)}
      </div>

      {/* Performance Gauges Row */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-4">
        <SectionH label="Material Control Scorecard" color="bg-teal-500" />
        <div className="flex items-center justify-around gap-4">
          <div className="relative flex flex-col items-center">
            <Gauge value={scores.overall ?? 0} label="Overall" sub={audits.length > 0 ? `${audits.length} audits` : "No data"} color={gaugeColor(scores.overall)} size="md" />
          </div>
          <div className="relative flex flex-col items-center">
            <Gauge value={scores.fifoScore ?? 0} label="FIFO Compliance" sub={scores.fifoScore !== null ? `${audits.filter((a) => a.auditType?.includes("FIFO")).length} audits` : "No data"} color={gaugeColor(scores.fifoScore)} size="sm" />
          </div>
          <div className="relative flex flex-col items-center">
            <Gauge value={scores.flowScore ?? 0} label="Material Flow" sub={scores.flowScore !== null ? `${audits.filter((a) => a.auditType?.includes("MATERIAL") || a.auditType?.includes("FLOW")).length} audits` : "No data"} color={gaugeColor(scores.flowScore)} size="sm" />
          </div>
          <div className="relative flex flex-col items-center">
            <Gauge value={scores.storageScore ?? 0} label="Storage / WIP" sub={scores.storageScore !== null ? `${audits.filter((a) => a.auditType?.includes("BIN") || a.auditType?.includes("WIP")).length} audits` : "No data"} color={gaugeColor(scores.storageScore)} size="sm" />
          </div>
          <div className="h-16 w-px bg-border/30" />
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Exceeds (≥85%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Needs Improvement (70-84%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Critical (&lt;70%)</span>
            </div>
          </div>
        </div>
        {auditTypeBreakdown.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 dark:border-slate-700/10">
            <p className="text-[10px] font-medium text-muted-foreground mb-2">Audit Type Scores</p>
            <div className="flex gap-4 flex-wrap">
              {auditTypeBreakdown.map(([type, data]) => {
                const avg = data.scores.length > 0 ? Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length) : null;
                return (
                  <button key={type} onClick={() => kpiClick({ tab: "audits" })}
                    className="cursor-pointer text-left hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors rounded px-1.5 py-1"
                  >
                    <p className="text-[10px] font-semibold text-foreground">{type.replace(/_/g, " ")}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-bold ${scoreColor(avg)}`}>{avg !== null ? `${avg}%` : "N/A"}</span>
                      <span className="text-[9px] text-muted-foreground">{data.total} audits</span>
                    </div>
                    <MiniBar pct={avg ?? 0} color={avg !== null && avg >= 85 ? "bg-green-500" : avg !== null && avg >= 70 ? "bg-amber-500" : "bg-red-500"} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: 60/40 */}
      <div className="flex gap-3">
        {/* Left 60% */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>
          {/* Risk Board */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Material Risk Board" color="bg-red-500" action={
              <span className="text-[10px] text-muted-foreground">{riskItems.length} items</span>
            } />
            {riskItems.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
                <span className="text-green-500 mr-1.5">✓</span> No material risks need attention
              </div>
            ) : (
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {riskItems.map((item) => (
                  <button key={item.id} onClick={item.onClick}
                    className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${item.color} group-hover:animate-pulse`} />
                    <span className="text-[10px] font-semibold text-muted-foreground w-10 shrink-0">{item.type}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{item.title}</span>
                    {item.detail && <span className="text-muted-foreground truncate max-w-[140px] hidden sm:inline">{item.detail}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Due This Week */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Due This Week" color="bg-blue-500" action={
              <span className="text-[10px] text-muted-foreground">{dueThisWeek.length} item{dueThisWeek.length !== 1 ? "s" : ""}</span>
            } />
            {dueThisWeek.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-xs text-muted-foreground italic">No items due this week</div>
            ) : (
              <div className="space-y-0.5">
                {dueThisWeek.map((item) => {
                  const isToday = item.dueDate === TODAY;
                  return (
                    <button key={item.id} onClick={item.onClick}
                      className={`w-full text-left flex items-center gap-2 text-xs py-1.5 px-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${isToday ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${item.priority === "CRITICAL" || item.priority === "HIGH" ? "bg-red-500" : item.priority === "MEDIUM" ? "bg-amber-500" : "bg-blue-500"}`} />
                      <span className="min-w-0 flex-1 truncate text-foreground font-medium">{item.title}</span>
                      {item.owner && <span className="text-muted-foreground shrink-0 hidden sm:inline text-[10px]">{item.owner}</span>}
                      {isToday && <span className="text-[9px] font-semibold text-red-500 uppercase shrink-0">Today</span>}
                      {!isToday && <span className="text-muted-foreground shrink-0 text-[10px]">{item.dueDate}</span>}
                      <span className="text-[10px] text-muted-foreground bg-muted/40 px-1 py-0.5 shrink-0">{item.source}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audits Needing Completion */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Open Audits" color="bg-teal-500" action={
              <button onClick={() => kpiClick({ tab: "audits" })} className="text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View all</button>
            } />
            {kpis.openAudits.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-xs text-muted-foreground italic">
                <span className="text-green-500 mr-1.5">✓</span> All audits completed
              </div>
            ) : (
              <div className="space-y-0.5">
                {audits.filter((a) => a.status === "DRAFT" || a.status === "OPEN").slice(0, 5).map((a: any) => (
                  <button key={a.id} onClick={() => kpiClick({ tab: "audits" })}
                    className="w-full text-left flex items-center gap-2 text-xs py-1.5 px-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <StatusDot status={a.status} />
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{a.title || `Audit #${a.id}`}</span>
                    <span className="text-muted-foreground shrink-0 hidden sm:inline text-[10px]">{a.auditType || "—"}</span>
                    {a.auditor && <span className="text-muted-foreground shrink-0 hidden sm:inline text-[10px]">{a.auditor}</span>}
                    <Badge cls={STATUS_STYLES[a.status] || STATUS_STYLES.DRAFT} label={statusLabel(a.status)} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 40% */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "40%" }}>
          {/* Audit Status Distribution */}
          {statusDist.length > 0 && (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
              <SectionH label="Audit Status Distribution" color="bg-blue-500" />
              <div className="h-6 flex rounded-full overflow-hidden bg-white/30 dark:bg-slate-800/30 border border-white/10 dark:border-slate-700/10">
                {statusDist.map((s) => (
                  <div key={s.label} style={{ width: `${s.pct}%` }}
                    className={`${s.color} flex items-center justify-center text-[8px] font-bold text-white first:rounded-l-full last:rounded-r-full min-w-[20px] transition-all duration-500`}
                    title={`${s.label}: ${s.count} (${s.pct}%)`}
                  >
                    {s.pct > 10 ? s.pct + "%" : ""}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {statusDist.map((s) => (
                  <button key={s.label} onClick={() => kpiClick({ tab: "audits", status: s.label === "All" ? undefined : s.label.toUpperCase() })}
                    className="inline-flex items-center gap-1 cursor-pointer hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors rounded px-1 py-0.5"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
                    <span className="text-[10px] text-muted-foreground">{s.label} <strong>{s.count}</strong></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Recent Activity" color="bg-violet-500" action={
              <span className="text-[10px] text-muted-foreground">Latest 12</span>
            } />
            {recentItems.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-xs text-muted-foreground italic">No recent activity</div>
            ) : (
              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {recentItems.map((item, i) => {
                  const stCls = item.type === "Action" ? ACTION_STATUS_STYLES[item.status] || ACTION_STATUS_STYLES.OPEN
                    : item.type === "Issue" ? ISSUE_STATUS_STYLES[item.status] || ISSUE_STATUS_STYLES.OPEN
                    : STATUS_STYLES[item.status] || STATUS_STYLES.DRAFT;
                  const typeIcon = item.type === "Action" ? "→" : item.type === "Issue" ? "!" : "◎";
                  return (
                    <button key={`${item.type}-${i}`} onClick={item.onClick}
                      className="w-full text-left flex items-center gap-2 text-xs py-1.5 px-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                        item.type === "Action" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : item.type === "Issue" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                      }`}>{typeIcon}</span>
                      <span className="min-w-0 flex-1 truncate text-foreground">{item.title}</span>
                      {item.score !== undefined && item.score !== null && (
                        <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold shrink-0 ${
                          item.score >= 80 ? "text-green-700 bg-green-50/80 dark:text-green-300 dark:bg-green-950/30"
                          : item.score >= 60 ? "text-amber-700 bg-amber-50/80 dark:text-amber-300 dark:bg-amber-950/30"
                          : "text-red-700 bg-red-50/80 dark:text-red-300 dark:bg-red-950/30"
                        }`}>{item.score}%</span>
                      )}
                      <Badge cls={stCls} label={statusLabel(item.status)} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Quick Stats" color="bg-gray-500" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/40 dark:bg-slate-800/40 p-2">
                <p className="text-muted-foreground text-[10px]">Total Audits</p>
                <p className="text-sm font-bold text-foreground">{audits.length}</p>
              </div>
              <div className="bg-white/40 dark:bg-slate-800/40 p-2">
                <p className="text-muted-foreground text-[10px]">Total Issues</p>
                <p className="text-sm font-bold text-foreground">{problems.length}</p>
              </div>
              <div className="bg-white/40 dark:bg-slate-800/40 p-2">
                <p className="text-muted-foreground text-[10px]">Total Actions</p>
                <p className="text-sm font-bold text-foreground">{actions.length}</p>
              </div>
              <div className="bg-white/40 dark:bg-slate-800/40 p-2">
                <p className="text-muted-foreground text-[10px]">Completion %</p>
                <p className="text-sm font-bold text-foreground">{kpis.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template install banner */}
      {auditTemplates && auditTemplates.length === 0 && onInstallTemplates && (
        <div className="bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50 p-4 text-center rounded-lg">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-lg">📋</span>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">No material audit templates installed</p>
          </div>
          <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mb-2">Install the default template pack to get started with material control audits.</p>
          <button onClick={onInstallTemplates} className="inline-flex h-7 items-center gap-1.5 bg-amber-600 px-3 text-[11px] font-semibold text-white hover:bg-amber-700 transition-colors rounded">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Install Default Templates
          </button>
        </div>
      )}
    </div>
  );
}
