import { useMemo, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import {
  Wrench, ClipboardList, AlertTriangle, CalendarClock, CheckCircle,
  Clock, Package, RefreshCw, Target, AlertOctagon,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Toolbar, ToolbarButton } from "@/components/shared/Toolbar";
import {
  MAINTENANCE_SUMMARY_QUERY, WORK_ORDERS_QUERY, BREAKDOWNS_QUERY,
  DUE_PM_QUERY, LOW_STOCK_SPARE_PARTS_QUERY,
} from "@/graphql/maintenanceQueries";

// ── Types ──

interface MaintenanceSummary {
  openWorkOrders: number; overdueWorkOrders: number; activeBreakdowns: number;
  pmDueThisWeek: number; completedWorkOrders: number;
  totalDowntimeMinutes: number; lowStockSpareParts: number;
  lastUpdated: string;
}

interface WorkOrder {
  id: number; number: string; title: string; workOrderType: string;
  status: string; priority: string; assignedTo: string; dueDate: string | null;
  targetType: string; targetId: number | null; dateOpened: string | null;
  downtimeMinutes: number | null; linkedBreakdownId: number | null;
}

interface Breakdown {
  id: number; number: string; title: string; status: string;
  severity: string; downtimeMinutes: number | null;
  targetType: string; targetId: number | null; reportedAt: string;
}

interface PMPlan {
  id: number; code: string; title: string; frequency: string;
  nextDueDate: string | null; assignedTo: string; priority: string;
  status: string; targetType: string; targetId: number | null;
}

interface LowStockPart {
  id: number; partNumber: string; name: string; description: string;
  category: string; uom: string; minQuantity: number;
  quantityOnHand: number; storageLocation: string; status: string;
}

// ── Helpers ──

const cls = (...args: (string | false | null | undefined)[]): string => args.filter(Boolean).join(" ");

const DOT = "inline-block h-2 w-2 rounded-full shrink-0";

const today = new Date().toISOString().slice(0, 10);

const priorityColors: Record<string, string> = {
  LOW: "text-gray-500", MEDIUM: "text-blue-500", HIGH: "text-orange-500", CRITICAL: "text-red-500",
};

const statusDotColor: Record<string, string> = {
  DRAFT: "bg-gray-400", OPEN: "bg-blue-500", ASSIGNED: "bg-indigo-500",
  IN_PROGRESS: "bg-amber-500", WAITING_PARTS: "bg-orange-500",
  WAITING_APPROVAL: "bg-purple-500", COMPLETED: "bg-green-500",
  CANCELLED: "bg-gray-400", ARCHIVED: "bg-gray-300",
};

const typeLabelFn = (t: string): string => ({
  CORRECTIVE: "CM", PREVENTIVE: "PM", BREAKDOWN: "BD",
  INSPECTION: "INSP", CALIBRATION: "CAL", IMPROVEMENT: "IMP",
  SAFETY: "SFT", TOOLING: "TLG", OTHER: "Other",
}[t] || t);

const statusLabelFn = (s: string): string => ({
  DRAFT: "Draft", OPEN: "Open", ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts",
  WAITING_APPROVAL: "Waiting Approval", COMPLETED: "Completed",
  CANCELLED: "Cancelled", ARCHIVED: "Archived",
}[s] || s);

// ── Sub-components ──

function SecH({ label, count, color = "bg-indigo-500" }: { label: string; count?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={cls("w-1 h-3.5 shrink-0 rounded-sm", color)} />
      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{label}</span>
      {count !== undefined && <span className="text-[10px] font-mono text-muted-foreground ml-auto">{count}</span>}
    </div>
  );
}

function KpiTile({
  label, value, sub, color, icon, onClick,
}: {
  label: string; value: number | string; sub?: string; color?: string; icon?: ReactNode; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cls(
        "flex items-center gap-2 border-0 border-b border-border/10 bg-card/20 px-2 py-1.5 text-left transition-all duration-150",
        onClick ? "cursor-pointer hover:bg-card/40 hover:border-border/30" : "cursor-default",
      )}
    >
      {icon && <div className={cls("flex h-7 w-7 shrink-0 items-center justify-center rounded", color || "bg-muted")}>{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <p className={cls("text-sm font-bold", color?.replace("bg-", "text-") || "text-foreground")}>{value}</p>
        {sub && <p className="text-[9px] text-muted-foreground/70 truncate">{sub}</p>}
      </div>
    </button>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-[10px] text-muted-foreground italic py-1">{msg}</p>;
}

function Row({
  color, type, ref: refNum, title, detail, right,
}: {
  color: string; type: string; ref?: string; title: string; detail?: string; right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 py-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
      <span className={cls(DOT, color)} />
      <span className="text-[9px] font-semibold text-muted-foreground w-14 shrink-0 uppercase">{type}</span>
      {refNum && <span className="text-[9px] font-mono text-muted-foreground w-16 shrink-0">{refNum}</span>}
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{title}</span>
      {detail && <span className="text-[10px] text-muted-foreground truncate max-w-[140px] hidden sm:inline">{detail}</span>}
      {right}
    </div>
  );
}

function StatusBadge({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className={cls(
      "inline-flex items-center gap-1.5 border border-border/30 px-2 py-1 text-[10px] font-medium",
      count === 0 ? "opacity-40" : "",
    )}>
      <span className={cls("inline-block h-1.5 w-1.5 rounded-full", color)} />
      <span className="text-foreground">{label}</span>
      <span className="font-semibold text-muted-foreground">{count}</span>
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  MAINTENANCE DASHBOARD PAGE — TPM Command Center
// ══════════════════════════════════════════════════════════════════════

export function MaintenanceDashboardPage() {
  const navigate = useNavigate();

  // ── Queries ──
  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: summaryRefetch } = useQuery(MAINTENANCE_SUMMARY_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: woData, refetch: woRefetch } = useQuery(WORK_ORDERS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: bdData, refetch: bdRefetch } = useQuery(BREAKDOWNS_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: duePmData, refetch: duePmRefetch } = useQuery(DUE_PM_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: lowStockData, refetch: lowStockRefetch } = useQuery(LOW_STOCK_SPARE_PARTS_QUERY, { fetchPolicy: "cache-and-network" });

  const summary: MaintenanceSummary | undefined = (summaryData as any)?.maintenanceSummary;
  const workOrders: WorkOrder[] = (woData as any)?.maintenanceWorkOrders || [];
  const breakdowns: Breakdown[] = (bdData as any)?.breakdowns || [];
  const duePlans: PMPlan[] = (duePmData as any)?.duePreventiveMaintenance || [];
  const lowStockParts: LowStockPart[] = (lowStockData as any)?.lowStockSpareParts || [];

  const hRefresh = useCallback(() => {
    Promise.all([summaryRefetch(), woRefetch(), bdRefetch(), duePmRefetch(), lowStockRefetch()]);
  }, [summaryRefetch, woRefetch, bdRefetch, duePmRefetch, lowStockRefetch]);

  // ── Derived Data ──
  const activeBreakdowns = useMemo(() => breakdowns.filter((b) => ["REPORTED", "UNDER_REPAIR"].includes(b.status)), [breakdowns]);
  const pmDueOverdue = useMemo(() => duePlans.filter((p) => p.nextDueDate && p.nextDueDate < today), [duePlans, today]);
  const overdueWO = useMemo(() => workOrders.filter((w) => w.dueDate && w.dueDate < today && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)), [workOrders, today]);
  const waitingPartsWO = useMemo(() => workOrders.filter((w) => w.status === "WAITING_PARTS"), [workOrders]);
  const criticalLowParts = useMemo(() => lowStockParts.filter((p) => p.quantityOnHand === 0).slice(0, 8), [lowStockParts]);
  const warningLowParts = useMemo(() => lowStockParts.filter((p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.minQuantity).slice(0, 8), [lowStockParts]);
  const criticalAssetsDown = useMemo(() => breakdowns.filter((b) => b.severity === "CRITICAL" && ["REPORTED", "UNDER_REPAIR"].includes(b.status)).slice(0, 4), [breakdowns]);
  const highPriorityWO = useMemo(() => workOrders.filter((w) => ["CRITICAL", "HIGH"].includes(w.priority) && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)).slice(0, 4), [workOrders]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const items: { id: string; type: string; ref: string; title: string; detail: string; color: string; date: string }[] = [];
    for (const wo of workOrders.slice(0, 15)) {
      items.push({ id: `wo-${wo.id}`, type: typeLabelFn(wo.workOrderType), ref: wo.number, title: wo.title, detail: statusLabelFn(wo.status), color: statusDotColor[wo.status] || "bg-gray-400", date: wo.dateOpened || "" });
    }
    for (const bd of breakdowns.slice(0, 10)) {
      items.push({ id: `bd-${bd.id}`, type: "BD", ref: bd.number, title: bd.title, detail: bd.status, color: bd.severity === "CRITICAL" ? "bg-red-500" : bd.severity === "HIGH" ? "bg-orange-500" : "bg-blue-500", date: bd.reportedAt || "" });
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items.slice(0, 12);
  }, [workOrders, breakdowns]);

  // Technician load
  const techLoad = useMemo(() => {
    const map = new Map<string, { open: number; overdue: number; dueThisWeek: number }>();
    for (const wo of workOrders.filter((w) => w.assignedTo && ["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(w.status))) {
      const t = wo.assignedTo;
      if (!map.has(t)) map.set(t, { open: 0, overdue: 0, dueThisWeek: 0 });
      const d = map.get(t)!;
      d.open++;
      if (wo.dueDate && wo.dueDate < today) d.overdue++;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].open - a[1].open).slice(0, 12);
  }, [workOrders, today]);

  // Asset health
  const assetHealth = useMemo(() => {
    const map = new Map<string, { targetType: string; targetId: string; openWOs: number; breakdowns: number; totalDowntime: number }>();
    for (const wo of workOrders.filter((w) => w.targetType)) {
      const key = `${wo.targetType}:${wo.targetId}`;
      if (!map.has(key)) map.set(key, { targetType: wo.targetType, targetId: String(wo.targetId || ""), openWOs: 0, breakdowns: 0, totalDowntime: 0 });
      const d = map.get(key)!;
      if (!["COMPLETED", "CANCELLED", "ARCHIVED"].includes(wo.status)) d.openWOs++;
      if (wo.linkedBreakdownId) d.breakdowns++;
      d.totalDowntime += wo.downtimeMinutes || 0;
    }
    return Array.from(map.values()).sort((a, b) => b.openWOs - a.openWOs).slice(0, 8);
  }, [workOrders]);

  // WO Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { OPEN: 0, ASSIGNED: 0, IN_PROGRESS: 0, WAITING_PARTS: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const s of Object.keys(counts)) counts[s] = workOrders.filter((w) => w.status === s).length;
    return counts;
  }, [workOrders]);

  // Due this week
  const dueThisWeekPM = useMemo(() => duePlans.slice(0, 6), [duePlans]);
  const dueThisWeekWO = useMemo(() => {
    const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7);
    const endDate = sevenDays.toISOString().slice(0, 10);
    return workOrders.filter((w) => w.dueDate && w.dueDate >= today && w.dueDate <= endDate && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)).slice(0, 6);
  }, [workOrders, today]);

  // ── Loading / Error / Empty ──
  if (summaryLoading && !summary) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        <PageHeader icon={<Wrench className="h-5 w-5 stroke-current" />} iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" title="Maintenance Dashboard" subtitle="TPM & maintenance performance command center" />
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current mr-2" />Loading dashboard...
        </div>
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        <PageHeader icon={<Wrench className="h-5 w-5 stroke-current" />} iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" title="Maintenance Dashboard" subtitle="TPM & maintenance performance command center" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-xs">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive stroke-current mb-2" />
            <p className="text-sm font-medium text-destructive">Failed to load data</p>
            <p className="text-xs text-muted-foreground mt-1">{summaryError.message}</p>
            <button type="button" onClick={hRefresh} className="mt-3 inline-flex h-7 items-center gap-1 bg-destructive/10 px-3 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"><RefreshCw className="h-3 w-3 stroke-current" /> Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        <PageHeader icon={<Wrench className="h-5 w-5 stroke-current" />} iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" title="Maintenance Dashboard" subtitle="TPM & maintenance performance command center" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-xs">
            <Wrench className="mx-auto h-8 w-8 text-muted-foreground/30 stroke-current mb-2" />
            <p className="text-sm font-medium text-foreground">No data available</p>
            <p className="text-xs text-muted-foreground mt-1">Create work orders and PM plans to see metrics here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <PageHeader
        icon={<Wrench className="h-5 w-5 stroke-current" />}
        iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
        title="Maintenance Dashboard"
        subtitle="TPM & maintenance performance command center"
      />
      <div className="print-ignore">
        <Toolbar
          left={<div className="px-2 text-xs font-medium text-muted-foreground">Dashboard</div>}
          right={
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <ToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 space-y-3">
          {/* ═══ COMPACT KPI STRIP ═══ */}
          <div className="grid grid-cols-9 gap-2">
            <KpiTile label="Open WOs" value={summary.openWorkOrders} sub="Active" color="bg-blue-500"
              icon={<ClipboardList className="h-3.5 w-3.5 text-blue-600 stroke-current" />} onClick={() => navigate("/maintenance/work-orders")} />
            <KpiTile label="Overdue" value={summary.overdueWorkOrders} sub={summary.overdueWorkOrders > 0 ? `${summary.overdueWorkOrders} past due` : "None"} color="bg-red-500"
              icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600 stroke-current" />} onClick={() => navigate("/maintenance/work-orders?status=OVERDUE")} />
            <KpiTile label="Breakdowns" value={activeBreakdowns.length} sub={activeBreakdowns.length > 0 ? "Active failures" : "Clear"} color="bg-orange-500"
              icon={<AlertOctagon className="h-3.5 w-3.5 text-orange-600 stroke-current" />} onClick={() => navigate("/maintenance/breakdowns")} />
            <KpiTile label="PM Due" value={summary.pmDueThisWeek} sub={pmDueOverdue.length > 0 ? `${pmDueOverdue.length} overdue` : "On track"} color="bg-purple-500"
              icon={<CalendarClock className="h-3.5 w-3.5 text-purple-600 stroke-current" />} onClick={() => navigate("/maintenance/preventive-maintenance?status=DUE_THIS_WEEK")} />
            <KpiTile label="PM Overdue" value={pmDueOverdue.length} sub={pmDueOverdue.length === 0 ? "None" : "Past due"} color="bg-red-500"
              icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600 stroke-current" />} onClick={() => navigate("/maintenance/preventive-maintenance?status=OVERDUE")} />
            <KpiTile label="Waiting Parts" value={waitingPartsWO.length} sub={waitingPartsWO.length > 0 ? "WOs on hold" : "None"} color="bg-orange-500"
              icon={<Package className="h-3.5 w-3.5 text-orange-600 stroke-current" />} onClick={() => navigate("/maintenance/work-orders?status=WAITING_PARTS")} />
            <KpiTile label="Completed Wk" value={summary.completedWorkOrders} sub="This week" color="bg-green-500"
              icon={<CheckCircle className="h-3.5 w-3.5 text-green-600 stroke-current" />} />
            <KpiTile label="Downtime" value={`${summary.totalDowntimeMinutes}m`} sub={summary.totalDowntimeMinutes > 0 ? `~${Math.round(summary.totalDowntimeMinutes / 60)}h` : "Today"} color="bg-rose-500"
              icon={<Clock className="h-3.5 w-3.5 text-rose-600 stroke-current" />} />
            <KpiTile label="Low Stock" value={lowStockParts.length} sub={lowStockParts.length > 0 ? "Critical spares" : "OK"} color="bg-amber-500"
              icon={<AlertOctagon className="h-3.5 w-3.5 text-amber-600 stroke-current" />} onClick={() => navigate("/maintenance/spare-parts?stock=critical")} />
          </div>

          {/* ═══ 60/40 MAIN GRID ═══ */}
          <div className="flex gap-3">
            {/* ── Left 60% ── */}
            <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>

              {/* 1. Maintenance Risk Board */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
                <SecH label="Maintenance Risk Board" color="bg-red-500" count={overdueWO.length + activeBreakdowns.length + pmDueOverdue.length + waitingPartsWO.length} />
                {overdueWO.length === 0 && activeBreakdowns.length === 0 && pmDueOverdue.length === 0 && waitingPartsWO.length === 0 && criticalLowParts.length === 0 && highPriorityWO.length === 0 ? (
                  <Empty msg="No active risks — all clear" />
                ) : (
                  <div className="space-y-0.5">
                    {overdueWO.slice(0, 3).map((wo) => (
                      <Row key={`ow-${wo.id}`} color="bg-red-500" type="Overdue WO" ref={wo.number} title={wo.title} detail={`Due ${wo.dueDate?.slice(0, 10) || "—"} · ${wo.assignedTo || "Unassigned"}`} />
                    ))}
                    {criticalAssetsDown.slice(0, 2).map((bd) => (
                      <Row key={`cd-${bd.id}`} color="bg-red-500" type="Critical Down" ref={bd.number} title={bd.title} detail={bd.downtimeMinutes ? `${bd.downtimeMinutes} min downtime` : bd.targetType} />
                    ))}
                    {activeBreakdowns.filter((b) => b.severity !== "CRITICAL").slice(0, 2).map((bd) => (
                      <Row key={`bd-${bd.id}`} color="bg-orange-500" type={bd.severity} ref={bd.number} title={bd.title} detail={bd.downtimeMinutes ? `${bd.downtimeMinutes} min downtime` : "Active"} />
                    ))}
                    {highPriorityWO.slice(0, 2).map((wo) => (
                      <Row key={`hp-${wo.id}`} color="bg-red-500" type={`${wo.priority} Priority`} ref={wo.number} title={wo.title} detail={`${wo.assignedTo || "Unassigned"} · ${typeLabelFn(wo.workOrderType)}`} />
                    ))}
                    {pmDueOverdue.slice(0, 2).map((pm) => (
                      <Row key={`po-${pm.id}`} color="bg-purple-500" type="PM Overdue" ref={pm.code} title={pm.title} detail={`Due ${pm.nextDueDate?.slice(0, 10) || "—"} · ${pm.assignedTo || "Unassigned"}`} />
                    ))}
                    {waitingPartsWO.slice(0, 2).map((wo) => (
                      <Row key={`wp-${wo.id}`} color="bg-orange-500" type="Waiting Parts" ref={wo.number} title={wo.title} detail={wo.assignedTo ? `Assigned: ${wo.assignedTo}` : ""} />
                    ))}
                    {criticalLowParts.slice(0, 2).map((sp) => (
                      <Row key={`cs-${sp.id}`} color="bg-red-500" type="Stockout" ref={sp.partNumber} title={sp.name} detail="0 on hand — reorder immediately" />
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Due This Week */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
                <SecH label="Due This Week" color="bg-indigo-500" count={dueThisWeekPM.length + dueThisWeekWO.length} />
                {dueThisWeekPM.length === 0 && dueThisWeekWO.length === 0 ? (
                  <Empty msg="No tasks due this week" />
                ) : (
                  <div className="space-y-0.5">
                    {dueThisWeekPM.map((pm) => (
                      <Row key={`dp-${pm.id}`} color="bg-purple-500" type="PM" ref={pm.code} title={pm.title}
                        detail={`${pm.assignedTo || "Unassigned"} · ${pm.targetType || ""} ${pm.targetId ? `#${pm.targetId}` : ""}`}
                        right={<span className={cls("text-[10px] font-semibold", priorityColors[pm.priority] || "")}>{pm.priority}</span>} />
                    ))}
                    {dueThisWeekWO.map((wo) => (
                      <Row key={`dw-${wo.id}`} color="bg-blue-500" type={typeLabelFn(wo.workOrderType)} ref={wo.number} title={wo.title}
                        detail={`${wo.assignedTo || "Unassigned"} · ${wo.targetType || ""}${wo.targetId ? ` #${wo.targetId}` : ""} — Due ${wo.dueDate?.slice(0, 10) || "—"}`}
                        right={<span className={cls("text-[10px] font-semibold", priorityColors[wo.priority] || "")}>{wo.priority}</span>} />
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Work Order Flow */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
                <SecH label="Work Order Flow" color="bg-blue-500" count={workOrders.length} />
                {workOrders.length === 0 ? (
                  <Empty msg="No work orders created yet" />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge color="bg-blue-500" label="Open" count={statusCounts.OPEN} />
                    <StatusBadge color="bg-indigo-500" label="Assigned" count={statusCounts.ASSIGNED} />
                    <StatusBadge color="bg-amber-500" label="In Progress" count={statusCounts.IN_PROGRESS} />
                    <StatusBadge color="bg-orange-500" label="Waiting Parts" count={statusCounts.WAITING_PARTS} />
                    <StatusBadge color="bg-green-500" label="Completed" count={statusCounts.COMPLETED} />
                    <StatusBadge color="bg-gray-400" label="Cancelled" count={statusCounts.CANCELLED} />
                    {waitingPartsWO.length > 0 && (
                      <span className="ml-auto text-[9px] font-medium text-orange-600">{waitingPartsWO.length} blocked by parts</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right 40% ── */}
            <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "40%" }}>

              {/* 1. Recent Maintenance Activity */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
                <SecH label="Recent Activity" color="bg-teal-500" />
                {recentActivity.length === 0 ? (
                  <Empty msg="No recent maintenance activity" />
                ) : (
                  <div className="space-y-0.5">
                    {recentActivity.map((a) => (
                      <Row key={a.id} color={a.color} type={a.type} ref={a.ref} title={a.title} detail={a.detail} right={<span className="text-[9px] text-muted-foreground">{a.date.slice(0, 10)}</span>} />
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Technician Load */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
                <SecH label="Technician Load" color="bg-violet-500" count={techLoad.length} />
                {techLoad.length === 0 ? (
                  <Empty msg="No active assignments" />
                ) : (
                  <div className="space-y-1">
                    {techLoad.map(([name, d]) => (
                      <div key={name} className="flex items-center gap-2 py-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{name}</span>
                        <span className="text-xs font-semibold text-blue-600">{d.open}</span>
                        {d.overdue > 0 && <span className="text-[10px] font-semibold text-red-500">{d.overdue} overdue</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Spare Parts Risk */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
                <SecH label="Spare Parts Risk" color="bg-emerald-500" count={lowStockParts.length} />
                {lowStockParts.length === 0 ? (
                  <Empty msg="No spare parts below minimum" />
                ) : (
                  <div className="space-y-0.5">
                    {criticalLowParts.map((sp) => (
                      <Row key={`sl-${sp.id}`} color="bg-red-500" type="Stockout" ref={sp.partNumber} title={sp.name} detail={`0 / ${sp.minQuantity} ${sp.uom}`} />
                    ))}
                    {warningLowParts.map((sp) => (
                      <Row key={`wl-${sp.id}`} color="bg-amber-500" type="Low" ref={sp.partNumber} title={sp.name} detail={`${sp.quantityOnHand} / ${sp.minQuantity} ${sp.uom}${sp.storageLocation ? ` · ${sp.storageLocation}` : ""}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ BOTTOM: ASSET / RESOURCE HEALTH ═══ */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Asset / Resource Health" color="bg-sky-500" count={assetHealth.length} />
            {assetHealth.length === 0 ? (
              <Empty msg="No assets with open work orders or breakdowns" />
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {assetHealth.map((a) => (
                  <div key={`${a.targetType}:${a.targetId}`} className="border border-border/30 bg-card/40 p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="h-3 w-3 text-muted-foreground stroke-current" />
                      <span className="text-[10px] font-semibold text-foreground truncate">
                        {a.targetType === "PLANT" ? "Plant" : a.targetType === "PRODUCTION_LINE" ? "Line" : a.targetType === "DEPARTMENT" ? "Dept" : a.targetType === "RESOURCE_GROUP" ? "RG" : a.targetType}
                        {a.targetId ? ` #${a.targetId}` : ""}
                      </span>
                    </div>
                    <div className="flex gap-2 text-[9px] text-muted-foreground">
                      <span className="text-blue-500 font-semibold">{a.openWOs} open</span>
                      {a.breakdowns > 0 && <span className="text-red-500 font-semibold">{a.breakdowns} BD</span>}
                      {a.totalDowntime > 0 && <span className="text-amber-500 font-semibold">{a.totalDowntime} min</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═══ COMPACT QUICK ACTIONS ═══ */}
          <div className="flex items-center gap-2 pb-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Jump to:</span>
            <button type="button" onClick={() => navigate("/maintenance/work-orders")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <ClipboardList className="h-3 w-3 mr-1 stroke-current" /> Work Orders
            </button>
            <button type="button" onClick={() => navigate("/maintenance/preventive-maintenance")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <CalendarClock className="h-3 w-3 mr-1 stroke-current" /> PM Schedule
            </button>
            <button type="button" onClick={() => navigate("/maintenance/breakdowns")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <AlertTriangle className="h-3 w-3 mr-1 stroke-current" /> Breakdowns
            </button>
            <button type="button" onClick={() => navigate("/maintenance/spare-parts")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Package className="h-3 w-3 mr-1 stroke-current" /> Spare Parts
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center gap-3 px-4 text-[10px] text-muted-foreground font-medium">
        <span className="font-semibold text-foreground">Maintenance Dashboard</span>
        <span className="mx-1 h-3 w-px bg-border/30" />
        <span>{summary.openWorkOrders} open WOs</span>
        {activeBreakdowns.length > 0 && (
          <><span className="mx-1 h-3 w-px bg-border/30" /><span className="text-red-500 font-semibold">{activeBreakdowns.length} breakdowns</span></>
        )}
        {summary.pmDueThisWeek > 0 && (
          <><span className="mx-1 h-3 w-px bg-border/30" /><span className="text-purple-500 font-semibold">{summary.pmDueThisWeek} PM due</span></>
        )}
        <span className="flex-1" />
        <span className="text-[9px]">Last updated: {summary.lastUpdated?.slice(0, 16).replace("T", " ") || "—"}</span>
      </div>
    </div>
  );
}
