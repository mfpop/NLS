import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RMA_STATUS_STYLES, DMR_STATUS_STYLES,
  ISSUE_STATUS_STYLES, ACTION_STATUS_STYLES,
  SEVERITY_STYLES, PRIORITY_STYLES,
  STATUS_STYLES, DMR_DISPOSITION_OPTIONS,
  RMA_DISPOSITION_OPTIONS, statusLabel,
} from "./QualityStatusStyles";

interface OverviewProps {
  audits: any[];
  problems: any[];
  actions: any[];
  dmrs: any[];
  rmas: any[];
  auditTemplates?: any[];
  onInstallTemplates?: () => void;
}

// ── Constants ──
const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const WEEK_END = new Date(NOW);
WEEK_END.setDate(WEEK_END.getDate() + 7);
const WEEK_END_STR = WEEK_END.toISOString().slice(0, 10);

type NavTarget = { tab: string; status?: string };

// ── Helpers ──
function badgeCls(cls: string): string {
  return `inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${cls}`;
}

function SectionH({ label, color = "bg-cyan-500" }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`w-1 h-4 shrink-0 ${color}`} />
      <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return <div className="text-xs text-muted-foreground italic py-1">{msg}</div>;
}

function RowBtn({
  children, onClick, cls = "",
}: {
  children: React.ReactNode; onClick?: () => void; cls?: string;
}) {
  if (!onClick) return <div className={`flex items-center gap-2 text-xs py-0.5 px-0.5 ${cls}`}>{children}</div>;
  return (
    <button onClick={onClick} className={`w-full text-left flex items-center gap-2 text-xs py-0.5 px-0.5 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${cls}`}>
      {children}
    </button>
  );
}

// ── Component ──
export function QualityOverview(props: OverviewProps) {
  const { audits, problems, actions, dmrs, rmas, auditTemplates, onInstallTemplates } = props;
  const navigate = useNavigate();

  const kpiClick = useCallback((target: NavTarget) => {
    const params = new URLSearchParams();
    params.set("tab", target.tab);
    if (target.status) params.set("status", target.status);
    navigate(`/check/quality-control?${params.toString()}`, { replace: true });
  }, [navigate]);

  // ── Computed KPI data ──
  const kpis = useMemo(() => {
    const openIssues = problems.filter((p) => p.status === "OPEN" || p.status === "IN_REVIEW");
    const openActions = actions.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS");
    const openDmrs = dmrs.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW" || d.status === "QUARANTINED");
    const openRmas = rmas.filter((r) => r.status === "OPEN" || r.status === "RECEIVED" || r.status === "UNDER_REVIEW" || r.status === "DISPOSITION_PENDING" || r.status === "CUSTOMER_RESPONSE_PENDING");
    const overdueActions = actions.filter((a) => a.dueDate && a.dueDate < TODAY && a.status !== "COMPLETED" && a.status !== "CANCELLED");
    const criticalHigh = [
      ...problems.filter((p) => p.severity === "CRITICAL" || p.severity === "HIGH"),
      ...actions.filter((a) => a.priority === "CRITICAL" || a.priority === "HIGH"),
    ].filter((i: any) => i.status !== "CLOSED" && i.status !== "COMPLETED" && i.status !== "CANCELLED");
    const completedAudits = audits.filter((a) => a.status === "COMPLETED");
    const completionRate = audits.length > 0 ? Math.round((completedAudits.length / audits.length) * 100) : 0;
    return { openIssues, openActions, openDmrs, openRmas, overdueActions, criticalHigh, completedAudits, completionRate };
  }, [problems, actions, dmrs, rmas, audits]);

  // ── Risk Board ──
  const riskItems = useMemo(() => {
    const items: { id: string; priority: number; type: string; title: string; detail: string; color: string; onClick: () => void }[] = [];

    // 1. Customer-impacting RMA (RMA awaiting customer response)
    const custImpactRma = rmas.filter((r) => r.status === "CUSTOMER_RESPONSE_PENDING");
    for (const r of custImpactRma) {
      items.push({
        id: `rma-${r.id}`, priority: 1, type: "RMA", title: `${r.rmaNumber || ""} ${r.customerName || ""}`.trim(),
        detail: r.partNumber || "", color: "bg-red-500",
        onClick: () => kpiClick({ tab: "rmas" }),
      });
    }

    // 2. Critical/high issues
    const hiProblems = problems.filter((p) => (p.severity === "CRITICAL" || p.severity === "HIGH") && p.status !== "CLOSED" && p.status !== "CANCELLED");
    for (const p of hiProblems) {
      items.push({
        id: `issue-${p.id}`, priority: 2, type: "Issue", title: p.title || "Issue",
        detail: `${p.severity} ${p.problemType || ""}`.trim(), color: "bg-orange-500",
        onClick: () => kpiClick({ tab: "issues" }),
      });
    }

    // 3. Overdue actions
    const overActions = actions.filter((a) => a.dueDate && a.dueDate < TODAY && a.status !== "COMPLETED" && a.status !== "CANCELLED");
    for (const a of overActions) {
      items.push({
        id: `action-${a.id}`, priority: 3, type: "Action", title: a.title || "Action",
        detail: `Due ${a.dueDate}${a.owner ? ` · ${a.owner}` : ""}`, color: "bg-red-400",
        onClick: () => kpiClick({ tab: "actions" }),
      });
    }

    // 4. Quarantined DMR
    const qDmrs = dmrs.filter((d) => d.status === "QUARANTINED");
    for (const d of qDmrs) {
      items.push({
        id: `dmr-${d.id}`, priority: 4, type: "DMR", title: `${d.dmrNumber || ""} ${d.title || ""}`.trim(),
        detail: `Qty: ${d.quantity || "—"} ${d.uom || ""}`.trim(), color: "bg-orange-500",
        onClick: () => kpiClick({ tab: "dmrs" }),
      });
    }

    // 5. Disposition-pending DMR/RMA
    const dispPendDmrs = dmrs.filter((d) => d.status === "DISPOSITION_PENDING");
    for (const d of dispPendDmrs) {
      items.push({
        id: `dmr-disp-${d.id}`, priority: 5, type: "DMR", title: `${d.dmrNumber || ""} - Disposition Pending`,
        detail: `${d.severity || ""}`.trim(), color: "bg-indigo-500",
        onClick: () => kpiClick({ tab: "dmrs" }),
      });
    }
    const dispPendRmas = rmas.filter((r) => r.status === "DISPOSITION_PENDING");
    for (const r of dispPendRmas) {
      items.push({
        id: `rma-disp-${r.id}`, priority: 5, type: "RMA", title: `${r.rmaNumber || ""} - Disposition Pending`,
        detail: `${r.customerName || ""}`.trim(), color: "bg-indigo-500",
        onClick: () => kpiClick({ tab: "rmas" }),
      });
    }

    // 6. Failed audit findings - we don't have findings data here, so skip
    // 7. Incomplete audits
    const incompleteAudits = audits.filter((a) => a.status === "DRAFT" || a.status === "OPEN");
    for (const a of incompleteAudits) {
      items.push({
        id: `audit-${a.id}`, priority: 7, type: "Audit", title: a.title || `Audit #${a.id}`,
        detail: a.auditType || "", color: "bg-amber-500",
        onClick: () => kpiClick({ tab: "audits" }),
      });
    }

    items.sort((a, b) => a.priority - b.priority);
    return items.slice(0, 12);
  }, [rmas, problems, actions, dmrs, audits, kpiClick]);

  // ── Due This Week ──
  const dueThisWeek = useMemo(() => {
    const items: { id: string; title: string; owner: string; dueDate: string; priority: string; source: string; type: "action" | "issue" | "dmr"; onClick: () => void }[] = [];
    for (const a of actions) {
      if (a.dueDate && a.dueDate >= TODAY && a.dueDate <= WEEK_END_STR && a.status !== "COMPLETED" && a.status !== "CANCELLED") {
        items.push({
          id: `action-${a.id}`, title: a.title, owner: a.owner || "", dueDate: a.dueDate, priority: a.priority || "MEDIUM",
          source: a.sourceType ? statusLabel(a.sourceType) : "Action", type: "action",
          onClick: () => kpiClick({ tab: "actions" }),
        });
      }
    }
    for (const p of problems) {
      if (p.dueDate && p.dueDate >= TODAY && p.dueDate <= WEEK_END_STR && p.status !== "CLOSED" && p.status !== "CANCELLED") {
        items.push({
          id: `issue-${p.id}`, title: p.title, owner: p.reportedBy || p.owner || "", dueDate: p.dueDate, priority: p.severity || "MEDIUM",
          source: "Issue", type: "issue",
          onClick: () => kpiClick({ tab: "issues" }),
        });
      }
    }
    for (const d of dmrs) {
      if (d.dueDate && d.dueDate >= TODAY && d.dueDate <= WEEK_END_STR && d.status !== "CLOSED" && d.status !== "CANCELLED") {
        items.push({
          id: `dmr-${d.id}`, title: `${d.dmrNumber || ""} ${d.title || ""}`.trim(), owner: d.owner || "", dueDate: d.dueDate, priority: d.severity || "MEDIUM",
          source: "DMR", type: "dmr",
          onClick: () => kpiClick({ tab: "dmrs" }),
        });
      }
    }
    items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return items.slice(0, 6);
  }, [actions, problems, dmrs, kpiClick]);

  // ── Incomplete Audits ──
  const incompleteAudits = useMemo(() => {
    return audits.filter((a) => a.status === "DRAFT" || a.status === "OPEN").slice(0, 5);
  }, [audits]);

  // ── Recent Activity ──
  const recentItems = useMemo(() => {
    const mapped: { date: string; type: string; title: string; status: string; owner: string; onClick: () => void }[] = [
      ...actions.map((a: any) => ({ date: a.createdAt || "", type: "Action", title: a.title, status: a.status, owner: a.owner || "", onClick: () => kpiClick({ tab: "actions" }) })),
      ...problems.map((p: any) => ({ date: p.createdAt || "", type: "Issue", title: p.title || "Issue", status: p.status, owner: p.reportedBy || p.owner || "", onClick: () => kpiClick({ tab: "issues" }) })),
      ...audits.map((a: any) => ({ date: a.createdAt || "", type: "Audit", title: a.title || `Audit #${a.id}`, status: a.status, owner: a.auditor || "", onClick: () => kpiClick({ tab: "audits" }) })),
      ...dmrs.map((d: any) => ({ date: d.createdAt || "", type: "DMR", title: `${d.dmrNumber || "DMR"} ${d.title || ""}`.trim(), status: d.status, owner: d.owner || "", onClick: () => kpiClick({ tab: "dmrs" }) })),
      ...rmas.map((r: any) => ({ date: r.createdAt || "", type: "RMA", title: `${r.rmaNumber || "RMA"} ${r.customerName || ""}`.trim(), status: r.status, owner: r.owner || "", onClick: () => kpiClick({ tab: "rmas" }) })),
    ];
    return mapped.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 8);
  }, [actions, problems, audits, dmrs, rmas, kpiClick]);

  // ── DMR Status Breakdown ──
  const dmrStatusBreakdown = useMemo(() => {
    const statuses = ["OPEN", "UNDER_REVIEW", "QUARANTINED", "DISPOSITION_PENDING", "CLOSED"];
    const labels: Record<string, string> = { OPEN: "Open", UNDER_REVIEW: "Review", QUARANTINED: "Quarantined", DISPOSITION_PENDING: "Disp. Pending", CLOSED: "Closed" };
    const colors: Record<string, string> = { OPEN: "border-blue-300 text-blue-700", UNDER_REVIEW: "border-amber-300 text-amber-700", QUARANTINED: "border-purple-300 text-purple-700", DISPOSITION_PENDING: "border-indigo-300 text-indigo-700", CLOSED: "border-green-300 text-green-700" };
    return statuses.map((s) => ({
      status: s, label: labels[s] || s, count: dmrs.filter((d) => d.status === s).length, color: colors[s] || "",
    }));
  }, [dmrs]);

  // ── RMA Status Breakdown ──
  const rmaStatusBreakdown = useMemo(() => {
    const statuses = ["OPEN", "RECEIVED", "UNDER_REVIEW", "DISPOSITION_PENDING", "CUSTOMER_RESPONSE_PENDING", "CLOSED"];
    const labels: Record<string, string> = { OPEN: "Open", RECEIVED: "Received", UNDER_REVIEW: "Review", DISPOSITION_PENDING: "Disp. Pending", CUSTOMER_RESPONSE_PENDING: "Cust. Resp.", CLOSED: "Closed" };
    const colors: Record<string, string> = { OPEN: "border-blue-300 text-blue-700", RECEIVED: "border-teal-300 text-teal-700", UNDER_REVIEW: "border-amber-300 text-amber-700", DISPOSITION_PENDING: "border-indigo-300 text-indigo-700", CUSTOMER_RESPONSE_PENDING: "border-purple-300 text-purple-700", CLOSED: "border-green-300 text-green-700" };
    return statuses.map((s) => ({
      status: s, label: labels[s] || s, count: rmas.filter((r) => r.status === s).length, color: colors[s] || "",
    }));
  }, [rmas]);

  // ── Top Defect Categories (keyword-based from DMR defect descriptions and RMA reasons) ──
  const defectCategories = useMemo(() => {
    const keywords: Record<string, { pattern: RegExp; short: string }> = {
      DIMENSIONAL: { pattern: /dimension|tolerance|size|length|width|height|thickness|diameter|bore|clearance|fit|gap|out.?of.?spec/i, short: "Dimensional" },
      VISUAL: { pattern: /visual|scratch|dentin|color|stain|discoloration|surface|finish|appearance|blemish|rust|corrosion|pitting|mark|smudge/i, short: "Visual" },
      FUNCTIONAL: { pattern: /function|operation|performance|failure|noise|leak|vibrat|broken|jam|stall|overheat|intermittent|does.?not.?work/i, short: "Functional" },
      MATERIAL: { pattern: /material|composition|alloy|grade|contamin|purity|hardness|strength|property|batch|lot|raw.?material/i, short: "Material" },
      LABELING: { pattern: /label|tag|marking|traceab|barcode|serial|lot.?code|date.?code|identif|certif|documentat/i, short: "Labeling / Traceability" },
      PACKAGING: { pattern: /packag|box|carton|pallet|wrap|protect|damage|container|ship|freight/i, short: "Packaging" },
      SUPPLIER: { pattern: /supplier|vendor|purchas|incoming|receiv|inbound|third.?party|outsource/i, short: "Supplier Defect" },
      PROCESS: { pattern: /process|setup|tooling|fixture|paramet|speed|feed|temp|pressur|cycle.?time|method|procedure|operator.?error|human.?error/i, short: "Process Defect" },
    };
    const counts: Record<string, number> = {};
    const texts = [
      ...dmrs.map((d) => `${d.defectDescription || ""} ${d.title || ""} ${d.notes || ""}`),
      ...rmas.map((r) => `${r.reason || ""} ${r.confirmedDefect || ""} ${r.suspectedCause || ""} ${r.notes || ""}`),
    ];
    for (const txt of texts) {
      for (const [, v] of Object.entries(keywords)) {
        if (v.pattern.test(txt)) counts[v.short] = (counts[v.short] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [dmrs, rmas]);

  // ── Audit Type Breakdown ──
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

  // ── Template install banner ──
  const showInstallBanner = props.auditTemplates?.length === 0 && props.onInstallTemplates;

  // ── Render ──
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      {/* ═══ KPI Row ═══ */}
      <div className="grid grid-cols-8 gap-2">
        {[
          { label: "Open Issues", count: kpis.openIssues.length, color: "text-amber-600 dark:text-amber-400", onClick: () => kpiClick({ tab: "issues", status: "OPEN" }) },
          { label: "Open Actions", count: kpis.openActions.length, color: "text-purple-600 dark:text-purple-400", onClick: () => kpiClick({ tab: "actions", status: "OPEN" }) },
          { label: "Open DMRs", count: kpis.openDmrs.length, color: "text-orange-600 dark:text-orange-400", onClick: () => kpiClick({ tab: "dmrs", status: "OPEN" }) },
          { label: "Open RMAs", count: kpis.openRmas.length, color: "text-teal-600 dark:text-teal-400", onClick: () => kpiClick({ tab: "rmas", status: "OPEN" }) },
          { label: "Overdue Actions", count: kpis.overdueActions.length, color: "text-red-600 dark:text-red-400", onClick: () => kpiClick({ tab: "actions" }) },
          { label: "Critical / High", count: kpis.criticalHigh.length, color: "text-red-600 dark:text-red-400", onClick: () => kpiClick({ tab: "issues" }) },
          { label: "Completed Audits", count: kpis.completedAudits.length, color: "text-green-600 dark:text-green-400", onClick: () => kpiClick({ tab: "audits", status: "COMPLETED" }) },
          { label: "Audit Completion", count: `${kpis.completionRate}%`, color: "text-foreground", onClick: () => kpiClick({ tab: "audits" }) },
        ].map((kpi) => (
          <button key={kpi.label} onClick={kpi.onClick}
            className="cursor-pointer text-left bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-2.5 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
            <p className={`text-base font-bold ${kpi.color}`}>{kpi.count}</p>
          </button>
        ))}
      </div>

      {/* ═══ Main Content: 60/40 ═══ */}
      <div className="flex gap-3">
        {/* ── Left 60% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>
          {/* Quality Risk Board */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Quality Risk Board" color="bg-red-500" />
            {riskItems.length === 0 ? (
              <EmptyRow msg="No quality risks need attention" />
            ) : (
              <div className="space-y-0.5">
                {riskItems.map((item) => (
                  <button key={item.id} onClick={item.onClick}
                    className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
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

          {/* Due This Week */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Due This Week" color="bg-blue-500" />
            {dueThisWeek.length === 0 ? (
              <EmptyRow msg="No items due this week" />
            ) : (
              <div className="space-y-0.5">
                {dueThisWeek.map((item) => (
                  <button key={item.id} onClick={item.onClick}
                    className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{item.title}</span>
                    {item.owner && <span className="text-muted-foreground shrink-0 hidden sm:inline">{item.owner}</span>}
                    <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border shrink-0 ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.MEDIUM}`}>
                      {statusLabel(item.priority)}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">{item.dueDate}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-1 py-0.5 shrink-0">{item.source}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality Audits Needing Completion */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Quality Audits Needing Completion" color="bg-cyan-500" />
            {incompleteAudits.length === 0 ? (
              <EmptyRow msg="No incomplete audits" />
            ) : (
              <div className="space-y-0.5">
                {incompleteAudits.map((a: any) => (
                  <button key={a.id} onClick={() => kpiClick({ tab: "audits" })}
                    className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground font-medium">{a.title || `Audit #${a.id}`}</span>
                    <span className="text-muted-foreground shrink-0 hidden sm:inline">{a.auditType || "—"}</span>
                    {a.auditor && <span className="text-muted-foreground shrink-0 hidden sm:inline">{a.auditor}</span>}
                    <span className={badgeCls(STATUS_STYLES[a.status] || STATUS_STYLES.DRAFT)}>{statusLabel(a.status)}</span>
                    {a.score !== null && a.score !== undefined && (
                      <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border shrink-0 ${
                        a.score >= 80 ? "border-green-300 text-green-700 bg-green-50/80" : a.score >= 60 ? "border-amber-300 text-amber-700 bg-amber-50/80" : "border-red-300 text-red-700 bg-red-50/80"
                      }`}>{a.score}%</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right 40% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "40%" }}>
          {/* Recent Quality Activity */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="Recent Quality Activity" color="bg-violet-500" />
            {recentItems.length === 0 ? (
              <EmptyRow msg="No recent activity" />
            ) : (
              <div className="space-y-0.5">
                {recentItems.map((item, i) => {
                  const stCls = item.type === "Action" ? ACTION_STATUS_STYLES[item.status] || ACTION_STATUS_STYLES.OPEN
                    : item.type === "Issue" ? ISSUE_STATUS_STYLES[item.status] || ISSUE_STATUS_STYLES.OPEN
                    : item.type === "Audit" ? STATUS_STYLES[item.status] || STATUS_STYLES.DRAFT
                    : item.type === "DMR" ? DMR_STATUS_STYLES[item.status] || DMR_STATUS_STYLES.OPEN
                    : item.type === "RMA" ? RMA_STATUS_STYLES[item.status] || RMA_STATUS_STYLES.OPEN
                    : "border-gray-300 text-gray-600 bg-gray-50/80";
                  return (
                    <button key={`${item.type}-${i}`} onClick={item.onClick}
                      className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-white/10 dark:border-slate-700/10 last:border-b-0 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
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

          {/* DMR / RMA Status */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SectionH label="DMR / RMA Status" color="bg-teal-500" />
            <div className="grid grid-cols-2 gap-3">
              {/* DMR side */}
              <div>
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500" /> DMR
                </p>
                <div className="space-y-1">
                  {dmrStatusBreakdown.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <button onClick={() => kpiClick({ tab: "dmrs", status: s.status === "CLOSED" ? undefined : s.status })}
                        className={`cursor-pointer inline-flex items-center gap-1 px-1 py-0.5 border text-[10px] font-medium hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors ${s.color}`}
                      >
                        <span className="font-semibold">{s.count}</span> {s.label}
                      </button>
                      {s.count > 0 && <span className="text-muted-foreground text-[10px]">{s.status === "CLOSED" ? "closed" : s.status === "QUARANTINED" ? "quarantined" : "active"}</span>}
                    </div>
                  ))}
                </div>
              </div>
              {/* RMA side */}
              <div>
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-teal-500" /> RMA
                </p>
                <div className="space-y-1">
                  {rmaStatusBreakdown.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <button onClick={() => kpiClick({ tab: "rmas", status: s.status === "CLOSED" ? undefined : s.status })}
                        className={`cursor-pointer inline-flex items-center gap-1 px-1 py-0.5 border text-[10px] font-medium hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors ${s.color}`}
                      >
                        <span className="font-semibold">{s.count}</span> {s.label}
                      </button>
                      {s.count > 0 && <span className="text-muted-foreground text-[10px]">{s.status === "CLOSED" ? "closed" : "active"}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Defect Categories */}
          {defectCategories.length > 0 && (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
              <SectionH label="Top Defect Categories" color="bg-amber-500" />
              <div className="flex flex-wrap gap-1.5">
                {defectCategories.map(([cat, count]) => (
                  <button key={cat} onClick={() => kpiClick({ tab: "dmrs" })}
                    className="cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 border border-border/40 text-[10px] font-medium text-muted-foreground hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <span className="font-semibold text-foreground">{count}</span> {cat}
                  </button>
                ))}
              </div>
              {defectCategories.length === 0 && <EmptyRow msg="No defect data" />}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Bottom: Audit Type Breakdown ═══ */}
      {auditTypeBreakdown.length > 0 && (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
          <SectionH label="Audit Type Breakdown" color="bg-blue-500" />
          <div className="flex flex-wrap gap-3">
            {auditTypeBreakdown.map(([type, data]) => {
              const avg = data.scores.length > 0 ? Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length) : null;
              return (
                <button key={type} onClick={() => kpiClick({ tab: "audits" })}
                  className="cursor-pointer min-w-[150px] flex-1 text-left text-xs border-r border-white/20 dark:border-slate-700/20 last:border-r-0 pr-3 last:pr-0 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors rounded-l px-1 py-0.5"
                >
                  <p className="font-semibold text-foreground truncate">{type.replace(/_/g, " ")}</p>
                  <p className="text-muted-foreground">{data.total} total · {data.completed} done · {data.draft} draft</p>
                  {avg !== null && (
                    <p className="text-muted-foreground">
                      Avg score: <span className={avg >= 80 ? "text-green-600 font-semibold" : avg >= 60 ? "text-amber-600 font-semibold" : "text-red-600 font-semibold"}>{avg}%</span>
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Template install banner */}
      {auditTemplates && auditTemplates.length === 0 && onInstallTemplates && (
        <div className="bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50 p-3 text-center">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">No audit templates installed</p>
          <button onClick={onInstallTemplates} className="mt-1 inline-flex h-6 items-center gap-1 bg-amber-600 px-2 text-[10px] font-semibold text-white hover:bg-amber-700">Install Defaults</button>
        </div>
      )}
    </div>
  );
}
