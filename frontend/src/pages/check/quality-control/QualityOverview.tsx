import { useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  STATUS_STYLES, statusLabel,
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

const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const WEEK_START = new Date(NOW);
WEEK_START.setDate(WEEK_START.getDate() - 7);
const WEEK_START_STR = WEEK_START.toISOString().slice(0, 10);
const MONTH_START = new Date(NOW);
MONTH_START.setDate(MONTH_START.getDate() - 30);
const MONTH_START_STR = MONTH_START.toISOString().slice(0, 10);

type NavTarget = { tab: string; status?: string };

function SectionH({ label, color = "bg-primary" }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`w-1 h-4 shrink-0 ${color}`} />
      <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function KpiCard({ label, count, color, onClick }: { label: string; count: string | number; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="cursor-pointer text-left bg-background/60 backdrop-blur-md border border-border/30 p-2.5 hover:bg-background/80 transition-colors"
    >
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <p className={`text-base font-bold ${color}`}>{count}</p>
    </button>
  );
}

export function QualityOverview(props: OverviewProps) {
  const { audits, problems, actions, dmrs, rmas, auditTemplates, onInstallTemplates } = props;
  const navigate = useNavigate();
  const [workQueueTab, setWorkQueueTab] = useState<"open" | "recent" | "completed">("open");

  const kpiClick = useCallback((target: NavTarget) => {
    const params = new URLSearchParams();
    params.set("tab", target.tab);
    if (target.status) params.set("status", target.status);
    navigate(`/check/quality-control?${params.toString()}`, { replace: true });
  }, [navigate]);

  // ── KPI data ──
  const kpis = useMemo(() => {
    const openIssues = problems.filter((p) => p.status === "OPEN" || p.status === "IN_REVIEW");
    const criticalIssues = problems.filter((p) => (p.severity === "CRITICAL" || p.severity === "HIGH") && p.status !== "CLOSED" && p.status !== "CANCELLED");
    const openActions = actions.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS");
    const completedAudits = audits.filter((a) => a.status === "COMPLETED");
    const completionRate = audits.length > 0 ? Math.round((completedAudits.length / audits.length) * 100) : 0;

    // Defect rate: DMRs created in last 30 days as proxy
    const dmr30 = dmrs.filter((d) => d.createdAt && d.createdAt >= MONTH_START_STR);
    const defectRate = dmrs.length > 0 ? Math.round((dmr30.length / Math.max(dmrs.length, 1)) * 100) : 0;

    // First Pass Yield: rough proxy using completed audits with scores >= 80
    const highScoreAudits = completedAudits.filter((a) => a.score !== null && a.score !== undefined && a.score >= 80);
    const fpy = completedAudits.length > 0 ? Math.round((highScoreAudits.length / completedAudits.length) * 100) : 0;

    const openDmrs = dmrs.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW" || d.status === "QUARANTINED");
    const openRmas = rmas.filter((r) => r.status === "OPEN" || r.status === "RECEIVED" || r.status === "UNDER_REVIEW" || r.status === "DISPOSITION_PENDING" || r.status === "CUSTOMER_RESPONSE_PENDING");

    return { openIssues, criticalIssues, openActions, completionRate, defectRate, fpy, openDmrs, openRmas };
  }, [problems, actions, audits, dmrs, rmas]);

  // ── Work Queue ──
  const workQueueItems = useMemo(() => {
    const items: { id: string; priority: number; sortPriority: number; type: string; title: string; status: string; owner: string; date: string; onClick: () => void }[] = [];

    const priorityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    // Open issues (open + in_review)
    for (const p of problems) {
      if (p.status === "OPEN" || p.status === "IN_REVIEW") {
        const pri = priorityRank[p.severity] ?? 3;
        items.push({
          id: `issue-${p.id}`, priority: pri, sortPriority: 0,
          type: "Issue", title: p.title || "Issue",
          status: p.status, owner: p.reportedBy || p.owner || "",
          date: p.createdAt || "",
          onClick: () => kpiClick({ tab: "issues" }),
        });
      }
    }

    // Open actions (open + in_progress)
    for (const a of actions) {
      if (a.status === "OPEN" || a.status === "IN_PROGRESS") {
        const pri = priorityRank[a.priority] ?? 3;
        items.push({
          id: `action-${a.id}`, priority: pri, sortPriority: 1,
          type: "Corrective Action", title: a.title || "Action",
          status: a.status, owner: a.owner || "",
          date: a.dueDate || a.createdAt || "",
          onClick: () => kpiClick({ tab: "actions" }),
        });
      }
    }

    // Draft/Open audits
    for (const a of audits) {
      if (a.status === "DRAFT" || a.status === "OPEN") {
        items.push({
          id: `audit-${a.id}`, priority: 2, sortPriority: 2,
          type: "Audit", title: a.title || `Audit #${a.id}`,
          status: a.status, owner: a.auditor || "",
          date: a.dueDate || a.auditDate || a.createdAt || "",
          onClick: () => kpiClick({ tab: "audits" }),
        });
      }
    }

    // Open DMRs
    for (const d of dmrs) {
      if (d.status === "OPEN" || d.status === "UNDER_REVIEW" || d.status === "QUARANTINED") {
        const pri = priorityRank[d.severity] ?? 3;
        items.push({
          id: `dmr-${d.id}`, priority: pri, sortPriority: 3,
          type: "DMR", title: `${d.dmrNumber || ""} ${d.title || ""}`.trim(),
          status: d.status, owner: d.owner || "",
          date: d.dueDate || d.createdAt || "",
          onClick: () => kpiClick({ tab: "dmrs" }),
        });
      }
    }

    // Open RMAs
    for (const r of rmas) {
      if (r.status === "OPEN" || r.status === "RECEIVED" || r.status === "UNDER_REVIEW" || r.status === "DISPOSITION_PENDING") {
        const pri = priorityRank[r.severity] ?? 3;
        items.push({
          id: `rma-${r.id}`, priority: pri, sortPriority: 4,
          type: "RMA", title: `${r.rmaNumber || ""} ${r.customerName || ""}`.trim(),
          status: r.status, owner: r.owner || "",
          date: r.dueDate || r.createdAt || "",
          onClick: () => kpiClick({ tab: "rmas" }),
        });
      }
    }

    items.sort((a, b) => a.priority - b.priority || a.sortPriority - b.sortPriority);
    return items;
  }, [problems, actions, audits, dmrs, rmas, kpiClick]);

  // ── Recent items ──
  const recentItems = useMemo(() => {
    const priorityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const mapped: { id: string; date: string; type: string; title: string; status: string; owner: string; onClick: () => void; priority: number; sortPriority: number }[] = [
      ...actions.filter((a) => a.status !== "CANCELLED").map((a: any) => ({ id: `action-${a.id}`, date: a.createdAt || "", type: "Action", title: a.title, status: a.status, owner: a.owner || "", priority: priorityRank[a.priority] ?? 3, sortPriority: 1, onClick: () => kpiClick({ tab: "actions" }) })),
      ...problems.filter((p) => p.status !== "CANCELLED").map((p: any) => ({ id: `issue-${p.id}`, date: p.createdAt || "", type: "Issue", title: p.title || "Issue", status: p.status, owner: p.reportedBy || p.owner || "", priority: priorityRank[p.severity] ?? 3, sortPriority: 0, onClick: () => kpiClick({ tab: "issues" }) })),
      ...audits.map((a: any) => ({ id: `audit-${a.id}`, date: a.createdAt || "0", type: "Audit", title: a.title || `Audit #${a.id}`, status: a.status, owner: a.auditor || "", priority: 2, sortPriority: 2, onClick: () => kpiClick({ tab: "audits" }) })),
      ...dmrs.filter((d) => d.status !== "CANCELLED").map((d: any) => ({ id: `dmr-${d.id}`, date: d.createdAt || "0", type: "DMR", title: `${d.dmrNumber || "DMR"} ${d.title || ""}`.trim(), status: d.status, owner: d.owner || "", priority: priorityRank[d.severity] ?? 3, sortPriority: 3, onClick: () => kpiClick({ tab: "dmrs" }) })),
      ...rmas.filter((r) => r.status !== "CANCELLED").map((r: any) => ({ id: `rma-${r.id}`, date: r.createdAt || "0", type: "RMA", title: `${r.rmaNumber || "RMA"} ${r.customerName || ""}`.trim(), status: r.status, owner: r.owner || "", priority: priorityRank[r.severity] ?? 3, sortPriority: 4, onClick: () => kpiClick({ tab: "rmas" }) })),
    ];
    return mapped.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);
  }, [actions, problems, audits, dmrs, rmas, kpiClick]);

  // ── Completed items ──
  const completedItems = useMemo(() => {
    const priorityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const mapped: { id: string; date: string; type: string; title: string; status: string; owner: string; onClick: () => void; priority: number; sortPriority: number }[] = [
      ...actions.filter((a) => a.status === "COMPLETED").map((a: any) => ({ id: `action-${a.id}`, date: a.updatedAt || a.createdAt || "", type: "Action", title: a.title, status: a.status, owner: a.owner || "", priority: priorityRank[a.priority] ?? 3, sortPriority: 1, onClick: () => kpiClick({ tab: "actions" }) })),
      ...problems.filter((p) => p.status === "CLOSED").map((p: any) => ({ id: `issue-${p.id}`, date: p.updatedAt || p.createdAt || "", type: "Issue", title: p.title || "Issue", status: p.status, owner: p.reportedBy || p.owner || "", priority: priorityRank[p.severity] ?? 3, sortPriority: 0, onClick: () => kpiClick({ tab: "issues" }) })),
      ...audits.filter((a) => a.status === "COMPLETED" || a.status === "ARCHIVED").map((a: any) => ({ id: `audit-${a.id}`, date: a.updatedAt || a.createdAt || "", type: "Audit", title: a.title || `Audit #${a.id}`, status: a.status, owner: a.auditor || "", priority: 2, sortPriority: 2, onClick: () => kpiClick({ tab: "audits" }) })),
      ...dmrs.filter((d) => d.status === "CLOSED").map((d: any) => ({ id: `dmr-${d.id}`, date: d.closedAt || d.updatedAt || d.createdAt || "", type: "DMR", title: `${d.dmrNumber || "DMR"} ${d.title || ""}`.trim(), status: d.status, owner: d.owner || "", priority: priorityRank[d.severity] ?? 3, sortPriority: 3, onClick: () => kpiClick({ tab: "dmrs" }) })),
      ...rmas.filter((r) => r.status === "CLOSED").map((r: any) => ({ id: `rma-${r.id}`, date: r.updatedAt || r.createdAt || "", type: "RMA", title: `${r.rmaNumber || "RMA"} ${r.customerName || ""}`.trim(), status: r.status, owner: r.owner || "", priority: priorityRank[r.severity] ?? 3, sortPriority: 4, onClick: () => kpiClick({ tab: "rmas" }) })),
    ];
    return mapped.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);
  }, [actions, problems, audits, dmrs, rmas, kpiClick]);

  // ── Overdue audits ──
  const overdueAudits = useMemo(() => {
    return audits.filter((a) => a.dueDate && a.dueDate < TODAY && (a.status === "DRAFT" || a.status === "OPEN"));
  }, [audits]);

  // ── Open Quality Audits (excludes overdue to avoid duplicates) ──
  const openQualityAudits = useMemo(() => {
    const overdueIds = new Set(overdueAudits.map((a: any) => a.id));
    return audits.filter((a) => (a.status === "DRAFT" || a.status === "OPEN") && !overdueIds.has(a.id)).slice(0, 10);
  }, [audits, overdueAudits]);

  // ── Quality Performance ──
  const qualityPerformance = useMemo(() => {
    const dmr30 = dmrs.filter((d) => d.createdAt && d.createdAt >= MONTH_START_STR);
    const prevDmr30 = dmrs.filter((d) => d.createdAt && d.createdAt >= `${NOW.getFullYear() - (NOW.getMonth() === 0 ? 1 : 0)}-${String(NOW.getMonth() === 0 ? 12 : NOW.getMonth()).padStart(2, "0")}-01` && d.createdAt < MONTH_START_STR);

    const completedAudits = audits.filter((a) => a.status === "COMPLETED");
    const recentCompletedAudits = audits.filter((a) => a.status === "COMPLETED" && a.updatedAt && a.updatedAt >= MONTH_START_STR);
    const prevCompletedAudits = audits.filter((a) => a.status === "COMPLETED" && a.updatedAt && a.updatedAt >= MONTH_START_STR && a.updatedAt < WEEK_START_STR);

    const totalQty = dmrs.reduce((sum: number, d) => sum + (d.quantity || 0), 0);
    const totalQtyAll = Math.max(dmrs.reduce((sum: number, d) => sum + (d.quantity || 0), 0), 1);
    const scrapDmrs = dmrs.filter((d) => d.disposition === "SCRAP");
    const scrapQty = scrapDmrs.reduce((sum: number, d) => sum + (d.quantity || 0), 0);
    const reworkDmrs = dmrs.filter((d) => d.disposition === "REWORK");
    const reworkQty = reworkDmrs.reduce((sum: number, d) => sum + (d.quantity || 0), 0);

    const highScoreAudits = recentCompletedAudits.filter((a) => a.score !== null && a.score !== undefined && a.score >= 80);
    const prevHighScore = prevCompletedAudits.filter((a) => a.score !== null && a.score !== undefined && a.score >= 80);

    return {
      defectRate: { current: dmr30.length > 0 ? Math.round((dmr30.length / Math.max(dmrs.length, 1)) * 100) : 0, previous: prevDmr30.length > 0 ? Math.round((prevDmr30.length / Math.max(dmrs.length, 1)) * 100) : 0 },
      scrapRate: { current: totalQty > 0 ? Math.round((scrapQty / totalQtyAll) * 100) : 0, previous: 0 },
      reworkRate: { current: totalQty > 0 ? Math.round((reworkQty / totalQtyAll) * 100) : 0, previous: 0 },
      fpy: { current: recentCompletedAudits.length > 0 ? Math.round((highScoreAudits.length / recentCompletedAudits.length) * 100) : 0, previous: prevCompletedAudits.length > 0 ? Math.round((prevHighScore.length / prevCompletedAudits.length) * 100) : 0 },
      auditCompliance: { current: audits.length > 0 ? Math.round((completedAudits.length / audits.length) * 100) : 0, previous: 0 },
    };
  }, [dmrs, audits]);

  // ── DMR Status Breakdown ──
  const dmrStatusBreakdown = useMemo(() => {
    const statuses = ["OPEN", "UNDER_REVIEW", "QUARANTINED", "DISPOSITION_PENDING", "CLOSED"];
    const labels: Record<string, string> = { OPEN: "Open", UNDER_REVIEW: "Review", QUARANTINED: "Quarantined", DISPOSITION_PENDING: "Disp. Pending", CLOSED: "Closed" };
    const colors: Record<string, string> = { OPEN: "border-primary/30 text-primary", UNDER_REVIEW: "border-warning/30 text-warning", QUARANTINED: "border-accent/30 text-accent-foreground", DISPOSITION_PENDING: "border-accent/30 text-primary", CLOSED: "border-success/30 text-success" };
    return statuses.map((s) => ({
      status: s, label: labels[s] || s, count: dmrs.filter((d) => d.status === s).length, color: colors[s] || "",
    }));
  }, [dmrs]);

  // ── RMA Status Breakdown ──
  const rmaStatusBreakdown = useMemo(() => {
    const statuses = ["OPEN", "RECEIVED", "UNDER_REVIEW", "DISPOSITION_PENDING", "CUSTOMER_RESPONSE_PENDING", "CLOSED"];
    const labels: Record<string, string> = { OPEN: "Open", RECEIVED: "Received", UNDER_REVIEW: "Review", DISPOSITION_PENDING: "Disp. Pending", CUSTOMER_RESPONSE_PENDING: "Cust. Resp.", CLOSED: "Closed" };
    const colors: Record<string, string> = { OPEN: "border-primary/30 text-primary", RECEIVED: "border-primary/30 text-primary", UNDER_REVIEW: "border-warning/30 text-warning", DISPOSITION_PENDING: "border-accent/30 text-primary", CUSTOMER_RESPONSE_PENDING: "border-accent/30 text-accent-foreground", CLOSED: "border-success/30 text-success" };
    return statuses.map((s) => ({
      status: s, label: labels[s] || s, count: rmas.filter((r) => r.status === s).length, color: colors[s] || "",
    }));
  }, [rmas]);

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

  // ── Top Defect Categories ──
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

  // ── Trend indicator ──
  function TrendBadge({ current, previous }: { current: number; previous: number }) {
    const diff = current - previous;
    const isBetter = diff <= 0;
    if (previous === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
    return (
      <span className={`text-[10px] font-medium ${isBetter ? "text-success" : "text-danger"}`}>
        {isBetter ? "\u2193" : "\u2191"} {Math.abs(diff)}%
      </span>
    );
  }

  // ── Work Queue items display helper ──
  function renderWorkQueueItems(items: typeof workQueueItems) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-0.5">
        {items.slice(0, 8).map((item) => (
          <button key={item.id} onClick={item.onClick}
            className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-border/10 last:border-b-0 hover:bg-background/40 transition-colors cursor-pointer"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${
              item.priority <= 0 ? "bg-danger/100" : item.priority <= 1 ? "bg-warning/100" : item.priority <= 2 ? "bg-warning/100" : "bg-muted-foreground/40"
            }`} />
            <span className="text-[10px] font-semibold text-muted-foreground w-24 shrink-0">{item.type}</span>
            <span className="min-w-0 flex-1 truncate text-foreground font-medium">{item.title}</span>
            {item.owner && <span className="text-muted-foreground shrink-0 hidden sm:inline text-[10px]">{item.owner}</span>}
            {item.date && <span className="text-muted-foreground shrink-0 text-[10px]">{item.date.slice(0, 10)}</span>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      {/* ═══ KPI Row ═══ */}
      <div className="grid grid-cols-8 gap-2">
        <KpiCard label="Open Issues" count={kpis.openIssues.length} color="text-warning" onClick={() => kpiClick({ tab: "issues", status: "OPEN" })} />
        <KpiCard label="Critical Issues" count={kpis.criticalIssues.length} color="text-danger" onClick={() => kpiClick({ tab: "issues" })} />
        <KpiCard label="Open Corrective Actions" count={kpis.openActions.length} color="text-accent-foreground" onClick={() => kpiClick({ tab: "actions", status: "OPEN" })} />
        <KpiCard label="Audit Completion" count={`${kpis.completionRate}%`} color="text-primary" onClick={() => kpiClick({ tab: "audits" })} />
        <KpiCard label="Defect Rate" count={`${kpis.defectRate}%`} color="text-warning" onClick={() => kpiClick({ tab: "dmrs" })} />
        <KpiCard label="First Pass Yield" count={`${kpis.fpy}%`} color="text-success" onClick={() => kpiClick({ tab: "audits", status: "COMPLETED" })} />
        <KpiCard label="Open DMR" count={kpis.openDmrs.length} color="text-warning dark:text-orange-400" onClick={() => kpiClick({ tab: "dmrs", status: "OPEN" })} />
        <KpiCard label="Open RMA" count={kpis.openRmas.length} color="text-primary" onClick={() => kpiClick({ tab: "rmas", status: "OPEN" })} />
      </div>

      {/* ═══ Main Content: 60/40 ═══ */}
      <div className="flex gap-3">
        {/* ── Left 60% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>
          {/* Work Queue */}
          <div className="bg-background/60 backdrop-blur-md border border-border/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <SectionH label="Work Queue" color="bg-accent" />
              <div className="flex items-center gap-1">
                {(["open", "recent", "completed"] as const).map((tab) => (
                  <button key={tab} onClick={() => setWorkQueueTab(tab)}
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase transition-colors ${
                      workQueueTab === tab
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {tab === "open" ? `Open (${workQueueItems.length})` : tab === "recent" ? "Recent" : "Completed"}
                  </button>
                ))}
              </div>
            </div>
            {workQueueTab === "open" && renderWorkQueueItems(workQueueItems)}
            {workQueueTab === "recent" && renderWorkQueueItems(recentItems)}
            {workQueueTab === "completed" && renderWorkQueueItems(completedItems)}
            {workQueueTab === "open" && workQueueItems.length === 0 && (
              <div className="text-xs text-muted-foreground italic py-1">No open items requiring attention</div>
            )}
            {workQueueTab === "recent" && recentItems.length === 0 && (
              <div className="text-xs text-muted-foreground italic py-1">No recent activity</div>
            )}
            {workQueueTab === "completed" && completedItems.length === 0 && (
              <div className="text-xs text-muted-foreground italic py-1">No completed items</div>
            )}
          </div>

          {/* Open Quality Audits */}
          {openQualityAudits.length > 0 || overdueAudits.length > 0 ? (
            <div className="bg-background/60 backdrop-blur-md border border-border/30 p-3">
              <SectionH label="Open Quality Audits" color="bg-danger/100" />
              {overdueAudits.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold text-danger uppercase tracking-wider mb-1">Overdue</p>
                  {overdueAudits.map((a: any) => (
                    <button key={a.id} onClick={() => kpiClick({ tab: "audits" })}
                      className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-border/10 last:border-b-0 hover:bg-background/40 transition-colors cursor-pointer"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-danger/100" />
                      <span className="min-w-0 flex-1 truncate text-foreground font-medium">{a.title || `Audit #${a.id}`}</span>
                      <span className="text-muted-foreground shrink-0 text-[10px]">{a.auditType || ""}</span>
                      <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border shrink-0 ${STATUS_STYLES[a.status] || STATUS_STYLES.DRAFT}`}>{statusLabel(a.status)}</span>
                    </button>
                  ))}
                </div>
              )}
              {openQualityAudits.length > 0 && (
                <div>
                  {overdueAudits.length > 0 && <p className="text-[10px] font-semibold text-warning uppercase tracking-wider mb-1">In Progress / Draft</p>}
                  {openQualityAudits.map((a: any) => (
                    <button key={a.id} onClick={() => kpiClick({ tab: "audits" })}
                      className="w-full text-left flex items-center gap-2 text-xs py-1 px-0.5 border-b border-border/10 last:border-b-0 hover:bg-background/40 transition-colors cursor-pointer"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-warning/100" />
                      <span className="min-w-0 flex-1 truncate text-foreground font-medium">{a.title || `Audit #${a.id}`}</span>
                      <span className="text-muted-foreground shrink-0 text-[10px]">{a.auditType || ""}</span>
                      <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border shrink-0 ${STATUS_STYLES[a.status] || STATUS_STYLES.DRAFT}`}>{statusLabel(a.status)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* DMR Status */}
          {dmrs.length > 0 && (
            <div className="bg-background/60 backdrop-blur-md border border-border/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1 h-4 shrink-0 bg-warning/100" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">DMR Status</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dmrStatusBreakdown.map((s) => (
                  <button key={s.status} onClick={() => kpiClick({ tab: "dmrs", status: s.status === "CLOSED" ? undefined : s.status })}
                    className={`cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-medium hover:bg-background/30 transition-colors ${s.color}`}
                  >
                    <span className="font-semibold">{s.count}</span> {s.label}
                  </button>
                ))}
                {dmrs.length === 0 && <span className="text-xs text-muted-foreground italic">No DMRs</span>}
              </div>
            </div>
          )}

          {/* RMA Status */}
          {rmas.length > 0 && (
            <div className="bg-background/60 backdrop-blur-md border border-border/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1 h-4 shrink-0 bg-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">RMA Status</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rmaStatusBreakdown.map((s) => (
                  <button key={s.status} onClick={() => kpiClick({ tab: "rmas", status: s.status === "CLOSED" ? undefined : s.status })}
                    className={`cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-medium hover:bg-background/30 transition-colors ${s.color}`}
                  >
                    <span className="font-semibold">{s.count}</span> {s.label}
                  </button>
                ))}
                {rmas.length === 0 && <span className="text-xs text-muted-foreground italic">No RMAs</span>}
              </div>
            </div>
          )}

          {/* Top Defect Categories */}
          {defectCategories.length > 0 && (
            <div className="bg-background/60 backdrop-blur-md border border-border/30 p-3">
              <SectionH label="Top Defect Categories" color="bg-warning/100" />
              <div className="flex flex-wrap gap-1.5">
                {defectCategories.map(([cat, count]) => (
                  <button key={cat} onClick={() => kpiClick({ tab: "dmrs" })}
                    className="cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 border border-border/40 text-[10px] font-medium text-muted-foreground hover:bg-background/30 transition-colors"
                  >
                    <span className="font-semibold text-foreground">{count}</span> {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right 40% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "40%" }}>
          {/* Quality Performance */}
          <div className="bg-background/60 backdrop-blur-md border border-border/30 p-3">
            <SectionH label="Quality Performance" color="bg-primary" />
            <div className="space-y-2">
              <div className="grid grid-cols-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/10">
                <span>Metric</span>
                <span className="text-right">Current</span>
                <span className="text-right">Previous</span>
                <span className="text-right">Trend</span>
              </div>
              {[
                { label: "Defect Rate", current: `${qualityPerformance.defectRate.current}%`, previous: `${qualityPerformance.defectRate.previous}%`, cur: qualityPerformance.defectRate.current, prev: qualityPerformance.defectRate.previous },
                { label: "Scrap Rate", current: `${qualityPerformance.scrapRate.current}%`, previous: `${qualityPerformance.scrapRate.previous}%`, cur: qualityPerformance.scrapRate.current, prev: qualityPerformance.scrapRate.previous },
                { label: "Rework Rate", current: `${qualityPerformance.reworkRate.current}%`, previous: `${qualityPerformance.reworkRate.previous}%`, cur: qualityPerformance.reworkRate.current, prev: qualityPerformance.reworkRate.previous },
                { label: "First Pass Yield", current: `${qualityPerformance.fpy.current}%`, previous: `${qualityPerformance.fpy.previous}%`, cur: qualityPerformance.fpy.current, prev: qualityPerformance.fpy.previous },
                { label: "Audit Compliance", current: `${qualityPerformance.auditCompliance.current}%`, previous: `${qualityPerformance.auditCompliance.previous}%`, cur: qualityPerformance.auditCompliance.current, prev: qualityPerformance.auditCompliance.previous },
              ].map((m) => (
                <div key={m.label} className="grid grid-cols-4 text-xs items-center py-0.5 border-b border-border/5 last:border-b-0">
                  <span className="text-foreground font-medium">{m.label}</span>
                  <span className="text-right text-foreground">{m.current}</span>
                  <span className="text-right text-muted-foreground">{m.previous}</span>
                  <span className="text-right"><TrendBadge current={m.cur} previous={m.prev} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Type Breakdown */}
          {auditTypeBreakdown.length > 0 && (
            <div className="bg-background/60 backdrop-blur-md border border-border/30 p-3">
              <SectionH label="Audit Breakdown" color="bg-primary/100" />
              <div className="flex flex-wrap gap-3">
                {auditTypeBreakdown.map(([type, data]) => {
                  const avg = data.scores.length > 0 ? Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length) : null;
                  return (
                    <button key={type} onClick={() => kpiClick({ tab: "audits" })}
                      className="cursor-pointer min-w-[150px] flex-1 text-left text-xs border-r border-border/20 last:border-r-0 pr-3 last:pr-0 hover:bg-background/30 transition-colors rounded-l px-1 py-0.5"
                    >
                      <p className="font-semibold text-foreground truncate">{type.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground">{data.total} total · {data.completed} done · {data.draft} draft</p>
                      {avg !== null && (
                        <p className="text-muted-foreground">
                          Avg score: <span className={avg >= 80 ? "text-success font-semibold" : avg >= 60 ? "text-warning font-semibold" : "text-danger font-semibold"}>{avg}%</span>
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template install banner */}
      {auditTemplates && auditTemplates.length === 0 && onInstallTemplates && (
        <div className="bg-warning/10 backdrop-blur-sm border border-warning/20 p-3 text-center">
          <p className="text-xs font-medium text-warning">No audit templates installed</p>
          <button onClick={onInstallTemplates} className="mt-1 inline-flex h-6 items-center gap-1 bg-warning px-2 text-[10px] font-semibold text-primary-foreground hover:bg-warning/80">Install Defaults</button>
        </div>
      )}
    </div>
  );
}
