import { useMemo, useCallback, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import {
  Wrench, ClipboardList, AlertTriangle, CalendarClock, CheckCircle,
  Clock, Package, RefreshCw, Target, AlertOctagon, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PageToolbar, ToolbarButton } from "@/components/layout/PageToolbar";
import {
  MAINTENANCE_SUMMARY_QUERY, WORK_ORDERS_QUERY, BREAKDOWNS_QUERY,
  DUE_PM_QUERY, LOW_STOCK_SPARE_PARTS_QUERY,
} from "@/graphql/maintenanceQueries";
import {
  mockMaintenanceSummary,
  mockMaintenanceWorkOrders,
  mockBreakdowns,
  mockDuePmPlans,
  mockLowStockSpareParts,
} from "@/demo/maintenanceMockData";

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
  LOW: "text-gray-500", MEDIUM: "text-primary", HIGH: "text-warning", CRITICAL: "text-danger",
};

const statusDotColor: Record<string, string> = {
  DRAFT: "bg-muted-foreground/40", OPEN: "bg-primary/100", ASSIGNED: "bg-primary",
  IN_PROGRESS: "bg-warning/100", WAITING_PARTS: "bg-warning/100",
  WAITING_APPROVAL: "bg-purple-500", COMPLETED: "bg-success/100",
  CANCELLED: "bg-muted-foreground/40", ARCHIVED: "bg-gray-300",
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

function PanelHeader({ label, count, color = "bg-primary" }: { label: string; count?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
      <span className={cls("w-1 h-3.5 shrink-0 rounded-sm", color)} />
      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{label}</span>
      {count !== undefined && <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{count}</span>}
    </div>
  );
}

function KpiTile({
  label, value, sub, icon, onClick,
}: {
  label: string; value: number | string; sub?: string; icon?: ReactNode; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cls(
        "flex items-center gap-1.5 bg-background border border-border px-2 py-1 text-left transition-all",
        onClick ? "cursor-pointer hover:border-slate-400 hover:shadow-sm" : "cursor-default",
      )}
    >
      {icon && <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">{icon}</div>}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[9px] text-muted-foreground/60 truncate leading-tight">{sub}</p>}
      </div>
    </button>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-[10px] text-muted-foreground/60 italic px-3 py-1.5">{msg}</p>;
}

function Row({
  color, type, ref: refNum, title, detail, right,
}: {
  color: string; type: string; ref?: string; title: string; detail?: string; right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 last:border-b-0 hover:bg-muted/50 transition-colors">
      <span className={cls(DOT, color)} />
      <span className="text-[9px] font-semibold text-muted-foreground/60 w-14 shrink-0 uppercase">{type}</span>
      {refNum && <span className="text-[9px] font-mono text-muted-foreground/60 w-16 shrink-0">{refNum}</span>}
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground" title={title}>{title}</span>
      {detail && <span className="text-[10px] text-muted-foreground/60 truncate max-w-[120px] hidden sm:inline">{detail}</span>}
      {right}
    </div>
  );
}

function StatusBadge({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className={cls(
      "inline-flex items-center gap-1 border border-border px-2 py-1 text-[10px] font-medium bg-background",
      count === 0 ? "opacity-40" : "",
    )}>
      <span className={cls("inline-block h-1.5 w-1.5 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-muted-foreground">{count}</span>
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  MAINTENANCE DASHBOARD PAGE — TPM Command Center
// ══════════════════════════════════════════════════════════════════════

export function MaintenanceDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navBtn = (path: string) => location.pathname.startsWith(path);
  const [search, setSearch] = useState("");

  // ── Queries ──
  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: summaryRefetch } = useQuery(MAINTENANCE_SUMMARY_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: woData, refetch: woRefetch } = useQuery(WORK_ORDERS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: bdData, refetch: bdRefetch } = useQuery(BREAKDOWNS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: duePmData, refetch: duePmRefetch } = useQuery(DUE_PM_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: lowStockData, refetch: lowStockRefetch } = useQuery(LOW_STOCK_SPARE_PARTS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });

  const summary: MaintenanceSummary | undefined = (summaryData as any)?.maintenanceSummary ?? mockMaintenanceSummary.maintenanceSummary;
  const workOrders: WorkOrder[] = (woData as any)?.maintenanceWorkOrders ?? mockMaintenanceWorkOrders.maintenanceWorkOrders;
  const breakdowns: Breakdown[] = (bdData as any)?.breakdowns ?? mockBreakdowns.breakdowns;
  const duePlans: PMPlan[] = (duePmData as any)?.duePreventiveMaintenance ?? mockDuePmPlans.duePreventiveMaintenance;
  const lowStockParts: LowStockPart[] = (lowStockData as any)?.lowStockSpareParts ?? mockLowStockSpareParts.lowStockSpareParts;

  const hRefresh = useCallback(() => {
    Promise.all([summaryRefetch(), woRefetch(), bdRefetch(), duePmRefetch(), lowStockRefetch()]);
  }, [summaryRefetch, woRefetch, bdRefetch, duePmRefetch, lowStockRefetch]);

  // ── Derived Data ──
  const activeBreakdowns = useMemo(() => breakdowns.filter((b) => ["REPORTED", "UNDER_REPAIR"].includes(b.status)), [breakdowns]);
  const pmDueOverdue = useMemo(() => duePlans.filter((p) => p.nextDueDate && p.nextDueDate < today), [duePlans, today]);
  const overdueWO = useMemo(() => workOrders.filter((w) => w.dueDate && w.dueDate < today && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)), [workOrders, today]);
  const waitingPartsWO = useMemo(() => workOrders.filter((w) => w.status === "WAITING_PARTS"), [workOrders]);
  const criticalLowParts = useMemo(() => lowStockParts.filter((p) => p.quantityOnHand === 0).slice(0, 6), [lowStockParts]);
  const warningLowParts = useMemo(() => lowStockParts.filter((p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.minQuantity).slice(0, 6), [lowStockParts]);
  const criticalAssetsDown = useMemo(() => breakdowns.filter((b) => b.severity === "CRITICAL" && ["REPORTED", "UNDER_REPAIR"].includes(b.status)).slice(0, 3), [breakdowns]);
  const highPriorityWO = useMemo(() => workOrders.filter((w) => ["CRITICAL", "HIGH"].includes(w.priority) && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)).slice(0, 3), [workOrders]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const items: { id: string; type: string; ref: string; title: string; detail: string; color: string; date: string }[] = [];
    for (const wo of workOrders.slice(0, 15)) {
      items.push({ id: `wo-${wo.id}`, type: typeLabelFn(wo.workOrderType), ref: wo.number, title: wo.title, detail: statusLabelFn(wo.status), color: statusDotColor[wo.status] || "bg-muted-foreground/40", date: wo.dateOpened || "" });
    }
    for (const bd of breakdowns.slice(0, 10)) {
      items.push({ id: `bd-${bd.id}`, type: "BD", ref: bd.number, title: bd.title, detail: bd.status, color: bd.severity === "CRITICAL" ? "bg-danger/100" : bd.severity === "HIGH" ? "bg-warning/100" : "bg-primary/100", date: bd.reportedAt || "" });
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items.slice(0, 10);
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
    return Array.from(map.entries()).sort((a, b) => b[1].open - a[1].open).slice(0, 8);
  }, [workOrders, today]);

  const [assetHealthCollapsed, setAssetHealthCollapsed] = useState(false);

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
    return Array.from(map.values()).sort((a, b) => b.openWOs - a.openWOs).slice(0, 6);
  }, [workOrders]);

  // WO Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { OPEN: 0, ASSIGNED: 0, IN_PROGRESS: 0, WAITING_PARTS: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const s of Object.keys(counts)) counts[s] = workOrders.filter((w) => w.status === s).length;
    return counts;
  }, [workOrders]);

  // Due this week (compact)
  const dueThisWeekPM = useMemo(() => duePlans.slice(0, 4), [duePlans]);
  const dueThisWeekWO = useMemo(() => {
    const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7);
    const endDate = sevenDays.toISOString().slice(0, 10);
    return workOrders.filter((w) => w.dueDate && w.dueDate >= today && w.dueDate <= endDate && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)).slice(0, 4);
  }, [workOrders, today]);

  // ── Loading / Error / Empty ──
  if (summaryLoading && !summary) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        <PageHeader icon={<Wrench className="h-5 w-5 stroke-current" />} iconClass="bg-primary/15 text-primary" title="Maintenance Dashboard" subtitle="TPM & maintenance performance command center" />
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground/60">
          <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current mr-2" />Loading dashboard...
        </div>
      </div>
    );
  }

  if (summaryError && !summary) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        <PageHeader icon={<Wrench className="h-5 w-5 stroke-current" />} iconClass="bg-primary/15 text-primary" title="Maintenance Dashboard" subtitle="TPM & maintenance performance command center" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-xs">
            <AlertTriangle className="mx-auto h-8 w-8 text-danger stroke-current mb-2" />
            <p className="text-sm font-medium text-danger">Failed to load data</p>
            <p className="text-xs text-muted-foreground mt-1">{summaryError.message}</p>
            <button type="button" onClick={hRefresh} className="mt-3 inline-flex h-7 items-center gap-1 bg-danger/10 px-3 text-xs font-semibold text-danger hover:bg-danger/15 transition-colors"><RefreshCw className="h-3 w-3 stroke-current" /> Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        <PageHeader icon={<Wrench className="h-5 w-5 stroke-current" />} iconClass="bg-primary/15 text-primary" title="Maintenance Dashboard" subtitle="TPM & maintenance performance command center" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-xs">
            <Wrench className="mx-auto h-8 w-8 text-muted-foreground/30 stroke-current mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No data available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create work orders and PM plans to see metrics here.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Risk Board Items ──
  const riskItems = useMemo(() => {
    const items: { id: string; color: string; type: string; ref: string; title: string; detail: string }[] = [];
    overdueWO.slice(0, 3).forEach((wo) => items.push({ id: `ow-${wo.id}`, color: "bg-danger/100", type: "Overdue WO", ref: wo.number, title: wo.title, detail: `Due ${wo.dueDate?.slice(0, 10) || "—"} · ${wo.assignedTo || "Unassigned"}` }));
    criticalAssetsDown.slice(0, 2).forEach((bd) => items.push({ id: `cd-${bd.id}`, color: "bg-danger/100", type: "Critical Down", ref: bd.number, title: bd.title, detail: bd.downtimeMinutes ? `${bd.downtimeMinutes} min` : bd.targetType }));
    activeBreakdowns.filter((b) => b.severity !== "CRITICAL").slice(0, 2).forEach((bd) => items.push({ id: `bd-${bd.id}`, color: "bg-warning/100", type: bd.severity, ref: bd.number, title: bd.title, detail: bd.downtimeMinutes ? `${bd.downtimeMinutes} min` : "Active" }));
    highPriorityWO.slice(0, 2).forEach((wo) => items.push({ id: `hp-${wo.id}`, color: "bg-danger/100", type: `${wo.priority} Priority`, ref: wo.number, title: wo.title, detail: `${wo.assignedTo || "Unassigned"} · ${typeLabelFn(wo.workOrderType)}` }));
    pmDueOverdue.slice(0, 2).forEach((pm) => items.push({ id: `po-${pm.id}`, color: "bg-purple-500", type: "PM Overdue", ref: pm.code, title: pm.title, detail: `Due ${pm.nextDueDate?.slice(0, 10) || "—"}` }));
    waitingPartsWO.slice(0, 2).forEach((wo) => items.push({ id: `wp-${wo.id}`, color: "bg-warning/100", type: "Waiting Parts", ref: wo.number, title: wo.title, detail: wo.assignedTo || "" }));
    criticalLowParts.slice(0, 2).forEach((sp) => items.push({ id: `cs-${sp.id}`, color: "bg-danger/100", type: "Stockout", ref: sp.partNumber, title: sp.name, detail: "0 on hand" }));
    return items;
  }, [overdueWO, criticalAssetsDown, activeBreakdowns, highPriorityWO, pmDueOverdue, waitingPartsWO, criticalLowParts]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <PageHeader
        icon={<Wrench className="h-5 w-5 stroke-current" />}
        iconClass="bg-primary/15 text-primary"
        title="Maintenance Dashboard"
        subtitle="TPM & maintenance performance command center"
      />
      <div className="print-ignore">
        <PageToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search maintenance dashboard..."
          filters={
            <>
              <button type="button" onClick={() => navigate("/maintenance/work-orders")}
                className={cls(
                  "inline-flex h-7 items-center gap-1 px-2 text-[10px] font-medium whitespace-nowrap rounded transition-colors",
                  navBtn("/maintenance/work-orders")
                    ? "text-primary bg-primary/10 border-b-2 border-b-blue-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}>
                <ClipboardList className="h-3 w-3 stroke-current" /> Work Orders
              </button>
              <button type="button" onClick={() => navigate("/maintenance/preventive-maintenance")}
                className={cls(
                  "inline-flex h-7 items-center gap-1 px-2 text-[10px] font-medium whitespace-nowrap rounded transition-colors",
                  navBtn("/maintenance/preventive-maintenance")
                    ? "text-accent-foreground bg-purple-50 border-b-2 border-b-purple-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}>
                <CalendarClock className="h-3 w-3 stroke-current" /> PM Schedule
              </button>
              <button type="button" onClick={() => navigate("/maintenance/breakdowns")}
                className={cls(
                  "inline-flex h-7 items-center gap-1 px-2 text-[10px] font-medium whitespace-nowrap rounded transition-colors",
                  navBtn("/maintenance/breakdowns")
                    ? "text-warning bg-warning/10 border-b-2 border-b-orange-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}>
                <AlertTriangle className="h-3 w-3 stroke-current" /> Breakdowns
              </button>
              <button type="button" onClick={() => navigate("/maintenance/spare-parts")}
                className={cls(
                  "inline-flex h-7 items-center gap-1 px-2 text-[10px] font-medium whitespace-nowrap rounded transition-colors",
                  navBtn("/maintenance/spare-parts")
                    ? "text-success bg-success/10 border-b-2 border-b-emerald-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}>
                <Package className="h-3 w-3 stroke-current" /> Spare Parts
              </button>
            </>
          }
          actions={
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />
          }
        />
      </div>

      {/* ═══ DASHBOARD CONTENT — NO PAGE SCROLL ═══ */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 overflow-hidden">
        {/* ── COMPACT KPI STRIP ── */}
        <div className="shrink-0 grid grid-cols-9 gap-1">
          <KpiTile label="Open WOs" value={summary.openWorkOrders} sub="Active"
            icon={<ClipboardList className="h-3.5 w-3.5 text-primary stroke-current" />} onClick={() => navigate("/maintenance/work-orders")} />
          <KpiTile label="Overdue" value={summary.overdueWorkOrders} sub={summary.overdueWorkOrders > 0 ? "Past due" : "None"}
            icon={<AlertTriangle className="h-3.5 w-3.5 text-danger stroke-current" />} onClick={() => navigate("/maintenance/work-orders?status=OVERDUE")} />
          <KpiTile label="Breakdowns" value={activeBreakdowns.length} sub={activeBreakdowns.length > 0 ? "Active" : "Clear"}
            icon={<AlertOctagon className="h-3.5 w-3.5 text-warning stroke-current" />} onClick={() => navigate("/maintenance/breakdowns")} />
          <KpiTile label="PM Due" value={summary.pmDueThisWeek} sub={pmDueOverdue.length > 0 ? `${pmDueOverdue.length} overdue` : "On track"}
            icon={<CalendarClock className="h-3.5 w-3.5 text-accent-foreground stroke-current" />} onClick={() => navigate("/maintenance/preventive-maintenance?status=DUE_THIS_WEEK")} />
          <KpiTile label="PM Overdue" value={pmDueOverdue.length} sub={pmDueOverdue.length === 0 ? "None" : "Past due"}
            icon={<AlertTriangle className="h-3.5 w-3.5 text-danger stroke-current" />} onClick={() => navigate("/maintenance/preventive-maintenance?status=OVERDUE")} />
          <KpiTile label="Waiting Parts" value={waitingPartsWO.length} sub={waitingPartsWO.length > 0 ? "WOs on hold" : "None"}
            icon={<Package className="h-3.5 w-3.5 text-warning stroke-current" />} onClick={() => navigate("/maintenance/work-orders?status=WAITING_PARTS")} />
          <KpiTile label="Completed Wk" value={summary.completedWorkOrders} sub="This week"
            icon={<CheckCircle className="h-3.5 w-3.5 text-success stroke-current" />} />
          <KpiTile label="Downtime" value={`${summary.totalDowntimeMinutes}m`} sub={summary.totalDowntimeMinutes > 0 ? `~${Math.round(summary.totalDowntimeMinutes / 60)}h` : "Today"}
            icon={<Clock className="h-3.5 w-3.5 text-rose-600 stroke-current" />} />
          <KpiTile label="Low Stock" value={lowStockParts.length} sub={lowStockParts.length > 0 ? "Critical spares" : "OK"}
            icon={<AlertOctagon className="h-3.5 w-3.5 text-warning stroke-current" />} onClick={() => navigate("/maintenance/spare-parts?stock=critical")} />
        </div>

        {/* ── 60/40 MAIN GRID — row 1 ~55%, row 2 fills rest ── */}
        <div className="flex-1 min-h-0 grid grid-cols-[3fr_2fr] grid-rows-[55%_1fr] gap-1.5 overflow-hidden">
          {/* Row 1, Col 1: Maintenance Risk Board */}
          <div className="row-span-1 flex flex-col min-h-0 bg-background border border-border overflow-hidden">
            <PanelHeader label="Maintenance Risk Board" color="bg-danger/100" count={riskItems.length} />
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
              {riskItems.length === 0 ? (
                <Empty msg="No active risks — all clear" />
              ) : (
                riskItems.map((item) => (
                  <Row key={item.id} color={item.color} type={item.type} ref={item.ref} title={item.title} detail={item.detail} />
                ))
              )}
            </div>
          </div>

          {/* Row 1, Col 2: Recent Activity */}
          <div className="row-span-1 flex flex-col min-h-0 bg-background border border-border overflow-hidden">
            <PanelHeader label="Recent Activity" color="bg-teal-500" />
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
              {recentActivity.length === 0 ? (
                <Empty msg="No recent activity" />
              ) : (
                recentActivity.map((a) => (
                  <Row key={a.id} color={a.color} type={a.type} ref={a.ref} title={a.title} detail={a.detail}
                    right={<span className="text-[9px] text-muted-foreground/60">{a.date.slice(0, 10)}</span>} />
                ))
              )}
            </div>
          </div>

          {/* Row 2, Col 1: Due This Week + WO Flow — side-by-side */}
          <div className="row-span-1 shrink-0 grid grid-cols-2 gap-1.5">
            <div className="bg-background border border-border">
              <PanelHeader label="Due This Week" color="bg-primary" count={dueThisWeekPM.length + dueThisWeekWO.length} />
              <div className="divide-y divide-border">
                {dueThisWeekPM.length === 0 && dueThisWeekWO.length === 0 ? (
                  <Empty msg="No tasks due" />
                ) : (
                  <>
                    {dueThisWeekPM.map((pm) => (
                      <Row key={`dp-${pm.id}`} color="bg-purple-500" type="PM" ref={pm.code} title={pm.title}
                        detail={`${pm.assignedTo || ""} · ${pm.targetType || ""}`}
                        right={<span className={cls("text-[10px] font-semibold", priorityColors[pm.priority] || "text-muted-foreground/60")}>{pm.priority}</span>} />
                    ))}
                    {dueThisWeekWO.map((wo) => (
                      <Row key={`dw-${wo.id}`} color="bg-primary/100" type={typeLabelFn(wo.workOrderType)} ref={wo.number} title={wo.title}
                        detail={`${wo.assignedTo || ""} · Due ${wo.dueDate?.slice(0, 10) || "—"}`}
                        right={<span className={cls("text-[10px] font-semibold", priorityColors[wo.priority] || "text-muted-foreground/60")}>{wo.priority}</span>} />
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="bg-background border border-border">
              <PanelHeader label="WO Flow" color="bg-primary/100" count={workOrders.length} />
              <div className="px-3 py-2">
                {workOrders.length === 0 ? (
                  <Empty msg="No WOs" />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge color="bg-primary/100" label="Open" count={statusCounts.OPEN} />
                    <StatusBadge color="bg-primary" label="Assigned" count={statusCounts.ASSIGNED} />
                    <StatusBadge color="bg-warning/100" label="In Progress" count={statusCounts.IN_PROGRESS} />
                    <StatusBadge color="bg-warning/100" label="Waiting Parts" count={statusCounts.WAITING_PARTS} />
                    <StatusBadge color="bg-success/100" label="Completed" count={statusCounts.COMPLETED} />
                    <StatusBadge color="bg-muted-foreground/40" label="Cancelled" count={statusCounts.CANCELLED} />
                    {waitingPartsWO.length > 0 && (
                      <span className="text-[9px] font-medium text-warning ml-auto">{waitingPartsWO.length} blocked by parts</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2, Col 2: Technician Load + Spare Parts Risk + Asset/Resource Health — stacked */}
          <div className="row-span-1 shrink-0 flex flex-col gap-1.5">
            <div className="bg-background border border-border">
              <PanelHeader label="Technician Load" color="bg-violet-500" count={techLoad.length} />
              {techLoad.length === 0 ? (
                <Empty msg="No active assignments" />
              ) : (
                <div className="divide-y divide-border">
                  {techLoad.map(([name, d]) => (
                    <div key={name} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 last:border-b-0 hover:bg-muted/50 transition-colors">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{name}</span>
                      <span className="text-xs font-semibold text-primary">{d.open}</span>
                      {d.overdue > 0 && <span className="text-[10px] font-semibold text-danger">{d.overdue} overdue</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-background border border-border">
              <PanelHeader label="Spare Parts Risk" color="bg-success/100" count={lowStockParts.length} />
              {lowStockParts.length === 0 ? (
                <Empty msg="No parts below minimum" />
              ) : (
                <div className="divide-y divide-border">
                  {criticalLowParts.map((sp) => (
                    <Row key={`sl-${sp.id}`} color="bg-danger/100" type="Stockout" ref={sp.partNumber} title={sp.name} detail={`0 / ${sp.minQuantity}`} />
                  ))}
                  {warningLowParts.map((sp) => (
                    <Row key={`wl-${sp.id}`} color="bg-warning/100" type="Low" ref={sp.partNumber} title={sp.name} detail={`${sp.quantityOnHand} / ${sp.minQuantity}`} />
                  ))}
                </div>
              )}
            </div>
            {assetHealth.length > 0 && (
              <div className="bg-background border border-border">
                <button type="button" onClick={() => setAssetHealthCollapsed((p) => !p)}
                  className="flex items-center gap-2 w-full px-3 py-2 border-b border-border shrink-0 text-left hover:bg-muted transition-colors">
                  <span className="w-1 h-3.5 shrink-0 rounded-sm bg-accent/100" />
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Asset / Resource Health</span>
                  <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{assetHealth.length}</span>
                  <ChevronDown className={cls("h-3 w-3 text-muted-foreground/60 stroke-current transition-transform duration-150", assetHealthCollapsed ? "-rotate-90" : "")} />
                </button>
                {!assetHealthCollapsed && (
                  <div className="grid grid-cols-2 gap-1 px-2 py-1.5">
                    {assetHealth.map((a) => (
                      <div key={`${a.targetType}:${a.targetId}`} className="flex items-center gap-1.5 border border-border/50 bg-muted px-2 py-1">
                        <Target className="h-3 w-3 shrink-0 text-muted-foreground/60 stroke-current" />
                        <span className="text-[9px] font-semibold text-foreground truncate min-w-0">
                          {a.targetType === "PLANT" ? "Plant" : a.targetType === "PRODUCTION_LINE" ? "Line" : a.targetType === "DEPARTMENT" ? "Dept" : a.targetType === "RESOURCE_GROUP" ? "RG" : a.targetType}
                          {a.targetId ? ` #${a.targetId}` : ""}
                        </span>
                        <div className="flex gap-1 ml-auto text-[8px] text-muted-foreground shrink-0">
                          <span className="text-primary font-semibold">{a.openWOs}</span>
                          {a.breakdowns > 0 && <span className="text-danger font-semibold">{a.breakdowns}</span>}
                          {a.totalDowntime > 0 && <span className="text-warning font-semibold">{Math.round(a.totalDowntime / 60)}h</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Footer */}
      <div className="print-ignore shrink-0 border-t border-border bg-background flex h-10 items-center gap-3 px-4 text-[10px] text-muted-foreground font-medium">
        <span className="font-semibold text-foreground">Maintenance Dashboard</span>
        <span className="mx-1 h-3 w-px bg-muted/80" />
        <span>{summary.openWorkOrders} open WOs</span>
        {activeBreakdowns.length > 0 && (
          <><span className="mx-1 h-3 w-px bg-muted/80" /><span className="text-danger font-semibold">{activeBreakdowns.length} breakdowns</span></>
        )}
        {summary.pmDueThisWeek > 0 && (
          <><span className="mx-1 h-3 w-px bg-muted/80" /><span className="text-purple-500 font-semibold">{summary.pmDueThisWeek} PM due</span></>
        )}
        <span className="flex-1" />
        <span className="text-[9px]">Last updated: {summary.lastUpdated?.slice(0, 16).replace("T", " ") || "—"}</span>
      </div>
    </div>
  );
}
