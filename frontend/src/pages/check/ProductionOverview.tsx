import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ISSUE_STATUS_STYLES, ACTION_STATUS_STYLES,
  PRIORITY_STYLES,
  STATUS_STYLES, statusLabel, auditTypeLabel,
} from "./ProductionStatusStyles.tsx";

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

type NavTarget = { tab: string; status?: string };

function badgeCls(cls: string): string {
  return `inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${cls}`;
}

function SectionH({ label }: { label: string }) {
  return <div className="flex items-center gap-2 mb-2"><span className="w-1 h-4 bg-warning/100 shrink-0" /><span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span></div>;
}

function EmptyRow({ msg }: { msg: string }) {
  return <div className="text-xs text-muted-foreground italic py-1">{msg}</div>;
}

export function ProductionOverview(props: OverviewProps) {
  const { audits, problems, actions, auditTemplates, onInstallTemplates } = props;
  const navigate = useNavigate();

  const kpiClick = useCallback((target: NavTarget) => {
    const params = new URLSearchParams();
    params.set("tab", target.tab);
    if (target.status) params.set("status", target.status);
    navigate(`/check/production-control?${params.toString()}`, { replace: true });
  }, [navigate]);

  const kpis = useMemo(() => {
    const openAudits = audits.filter((a) => a.status === "DRAFT" || a.status === "OPEN");
    const openIssues = problems.filter((p) => p.status === "OPEN");
    const openActions = actions.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS");
    const overdueActions = actions.filter((a) => a.dueDate && a.dueDate < TODAY && a.status !== "COMPLETED" && a.status !== "CANCELLED");
    const criticalHigh = [
      ...problems.filter((p) => (p.severity === "HIGH" || p.severity === "CRITICAL") && p.status !== "CLOSED" && p.status !== "CANCELLED"),
      ...actions.filter((a) => (a.priority === "HIGH" || a.priority === "CRITICAL") && a.status !== "COMPLETED" && a.status !== "CANCELLED"),
    ];
    const completedAudits = audits.filter((a) => a.status === "COMPLETED");
    const completionRate = audits.length > 0 ? Math.round((completedAudits.length / audits.length) * 100) : 0;
    return { openAudits, openIssues, openActions, overdueActions, criticalHigh, completedAudits, completionRate };
  }, [audits, problems, actions]);

  // Risk Board
  const riskItems = useMemo(() => {
    const items: { id: string; priority: number; type: string; title: string; detail: string; color: string; onClick: () => void }[] = [];
    const hiProblems = problems.filter((p) => (p.severity === "CRITICAL" || p.severity === "HIGH") && p.status !== "CLOSED" && p.status !== "CANCELLED");
    for (const p of hiProblems) items.push({ id: `issue-${p.id}`, priority: 1, type: "Issue", title: p.title || "Issue", detail: `${p.severity} ${p.problemType || ""}`.trim(), color: "bg-danger/100", onClick: () => kpiClick({ tab: "issues" }) });
    const overActions = actions.filter((a) => a.dueDate && a.dueDate < TODAY && a.status !== "COMPLETED" && a.status !== "CANCELLED");
    for (const a of overActions) items.push({ id: `action-${a.id}`, priority: 2, type: "Action", title: a.title || "Action", detail: `Due ${a.dueDate}${a.owner ? ` · ${a.owner}` : ""}`, color: "bg-red-400", onClick: () => kpiClick({ tab: "actions" }) });
    const incAudits = audits.filter((a) => a.status === "DRAFT" || a.status === "OPEN");
    for (const a of incAudits) items.push({ id: `audit-${a.id}`, priority: 3, type: "Audit", title: a.title || `Audit #${a.id}`, detail: a.auditType || "", color: "bg-amber-400", onClick: () => kpiClick({ tab: "audits" }) });
    items.sort((a, b) => a.priority - b.priority);
    return items.slice(0, 12);
  }, [problems, actions, audits, kpiClick]);

  // Due This Week
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
    return items.slice(0, 6);
  }, [actions, problems, kpiClick]);

  const incompleteAudits = useMemo(() => audits.filter((a) => a.status === "DRAFT" || a.status === "OPEN").slice(0, 5), [audits]);

  // Recent Activity
  const recentItems = useMemo(() => {
    const mapped = [
      ...actions.map((a: any) => ({ date: a.createdAt || "", type: "Action", title: a.title, status: a.status, owner: a.owner || "", onClick: () => kpiClick({ tab: "actions" }) })),
      ...problems.map((p: any) => ({ date: p.createdAt || "", type: "Issue", title: p.title || "Issue", status: p.status, owner: p.reportedBy || p.owner || "", onClick: () => kpiClick({ tab: "issues" }) })),
      ...audits.map((a: any) => ({ date: a.createdAt || "", type: "Audit", title: a.title || `Audit #${a.id}`, status: a.status, owner: a.auditor || "", onClick: () => kpiClick({ tab: "audits" }) })),
    ];
    return mapped.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 8);
  }, [actions, problems, audits, kpiClick]);

  // Audit Type Breakdown
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-6 gap-2">
        {[
          { label: "Active Audits", count: kpis.openAudits.length, color: "text-primary dark:text-blue-400", onClick: () => kpiClick({ tab: "audits" }) },
          { label: "Open Issues", count: kpis.openIssues.length, color: "text-warning dark:text-amber-400", onClick: () => kpiClick({ tab: "issues" }) },
          { label: "Open Actions", count: kpis.openActions.length, color: "text-accent-foreground dark:text-purple-400", onClick: () => kpiClick({ tab: "actions" }) },
          { label: "Overdue", count: kpis.overdueActions.length, color: "text-danger dark:text-danger/80", onClick: () => kpiClick({ tab: "actions" }) },
          { label: "Completed", count: kpis.completedAudits.length, color: "text-success dark:text-success/80", onClick: () => kpiClick({ tab: "audits", status: "COMPLETED" }) },
          { label: "Completion", count: `${kpis.completionRate}%`, color: "text-foreground", onClick: () => kpiClick({ tab: "audits" }) },
        ].map((kpi) => (
          <button key={kpi.label} onClick={kpi.onClick}
            className="cursor-pointer text-left bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-2.5 hover:bg-background/80 dark:hover:bg-slate-800/80 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
            <p className={`text-base font-bold ${kpi.color}`}>{kpi.count}</p>
          </button>
        ))}
      </div>

      {/* Main: 60/40 */}
      <div className="flex gap-3">
        {/* Left 60% */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>
          {/* Risk Board */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Risk / Attention" />
            {riskItems.length === 0 ? <EmptyRow msg="No items need attention" /> : (
              <div className="space-y-0.5">
                {riskItems.map((item) => (
                  <button key={item.id} onClick={item.onClick}
                    className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-background/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                    <span className="text-[10px] font-semibold text-muted-foreground w-10 shrink-0">{item.type}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{item.title}</span>
                    {item.detail && <span className="text-muted-foreground truncate max-w-[120px] hidden sm:inline">{item.detail}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Audits Needing Completion */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Audits Needing Completion" />
            {incompleteAudits.length === 0 ? <EmptyRow msg="No incomplete audits" /> : (
              <div className="space-y-0.5">
                {incompleteAudits.map((a: any) => (
                  <button key={a.id} onClick={() => kpiClick({ tab: "audits" })}
                    className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-background/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{a.title || `Audit #${a.id}`}</span>
                    <span className="text-muted-foreground shrink-0 hidden sm:inline">{a.auditType || "—"}</span>
                    {a.auditor && <span className="text-muted-foreground shrink-0 hidden sm:inline">{a.auditor}</span>}
                    <span className={badgeCls(STATUS_STYLES[a.status] || "")}>{statusLabel(a.status)}</span>
                    {a.score !== null && a.score !== undefined && (
                      <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border shrink-0 ${a.score >= 80 ? "border-green-300 text-success bg-success/10/80" : a.score >= 60 ? "border-warning/30 text-warning bg-warning/10/80" : "border-danger/30 text-danger bg-danger/10/80"}`}>{a.score}%</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Due This Week */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Due This Week" />
            {dueThisWeek.length === 0 ? <EmptyRow msg="No items due this week" /> : (
              <div className="space-y-0.5">
                {dueThisWeek.map((item) => (
                  <button key={item.id} onClick={item.onClick}
                    className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-background/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{item.title}</span>
                    {item.owner && <span className="text-muted-foreground shrink-0 hidden sm:inline">{item.owner}</span>}
                    <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border shrink-0 ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.MEDIUM}`}>{statusLabel(item.priority)}</span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">{item.dueDate}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-1 py-0.5 shrink-0">{item.source}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 40% */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "40%" }}>
          {/* Recent Activity */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Recent Activity" />
            {recentItems.length === 0 ? <EmptyRow msg="No recent activity" /> : (
              <div className="space-y-0.5">
                {recentItems.map((item, i) => {
                  const stCls = item.type === "Action" ? ACTION_STATUS_STYLES[item.status] || ACTION_STATUS_STYLES.OPEN
                    : item.type === "Issue" ? ISSUE_STATUS_STYLES[item.status] || ISSUE_STATUS_STYLES.OPEN
                    : STATUS_STYLES[item.status] || "";
                  return (
                    <button key={`${item.type}-${i}`} onClick={item.onClick}
                      className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-background/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <span className="text-[10px] font-semibold text-muted-foreground shrink-0 w-10">{item.type}</span>
                      <span className="min-w-0 flex-1 truncate text-foreground">{item.title}</span>
                      {item.owner && <span className="text-muted-foreground shrink-0 hidden sm:inline">{item.owner}</span>}
                      <span className={badgeCls(stCls)}>{statusLabel(item.status)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audit Status */}
          <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Audit Status" />
            <div className="flex flex-wrap gap-1.5">
              {[
                { status: "DRAFT", label: "Draft", count: audits.filter((a) => a.status === "DRAFT").length, color: "border-border text-gray-600" },
                { status: "OPEN", label: "Open", count: audits.filter((a) => a.status === "OPEN").length, color: "border-primary/30 text-primary" },
                { status: "COMPLETED", label: "Completed", count: audits.filter((a) => a.status === "COMPLETED").length, color: "border-green-300 text-success" },
                { status: "ARCHIVED", label: "Archived", count: audits.filter((a) => a.status === "ARCHIVED").length, color: "border-warning/30 text-warning" },
              ].map((s) => (
                <button key={s.status} onClick={() => kpiClick({ tab: "audits", status: s.status === "COMPLETED" ? "COMPLETED" : s.status === "ARCHIVED" ? undefined : s.status })}
                  className={`cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-medium hover:bg-background/30 dark:hover:bg-slate-800/30 transition-colors ${s.color}`}
                >
                  <span className="font-semibold">{s.count}</span> {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Type Breakdown */}
      {auditTypeBreakdown.length > 0 && (
        <div className="bg-background/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <SectionH label="Audit Type Breakdown" />
          <div className="flex flex-wrap gap-3">
            {auditTypeBreakdown.map(([type, data]) => {
              const avg = data.scores.length > 0 ? Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length) : null;
              return (
                <button key={type} onClick={() => kpiClick({ tab: "audits" })}
                  className="cursor-pointer min-w-[150px] flex-1 text-left text-xs border-r border-white/20 dark:border-slate-700/20 last:border-r-0 pr-3 last:pr-0 hover:bg-background/30 dark:hover:bg-slate-800/30 transition-colors rounded-l px-1 py-0.5"
                >
                  <p className="font-semibold text-foreground truncate">{auditTypeLabel(type)}</p>
                  <p className="text-muted-foreground">{data.total} total · {data.completed} done · {data.draft} draft</p>
                  {avg !== null && <p className="text-muted-foreground">Avg score: <span className={avg >= 80 ? "text-success font-semibold" : avg >= 60 ? "text-warning font-semibold" : "text-danger font-semibold"}>{avg}%</span></p>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Template install banner */}
      {auditTemplates && auditTemplates.length === 0 && onInstallTemplates && (
        <div className="bg-warning/10/80 dark:bg-amber-950/80 backdrop-blur-sm border border-warning/20/50 dark:border-amber-800/50 p-3 text-center">
          <p className="text-xs font-medium text-warning dark:text-amber-400">No audit templates installed</p>
          <button onClick={onInstallTemplates} className="mt-1 inline-flex h-6 items-center gap-1 bg-warning px-2 text-[10px] font-semibold text-white hover:bg-warning/80"><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg> Install Defaults</button>
        </div>
      )}
    </div>
  );
}
