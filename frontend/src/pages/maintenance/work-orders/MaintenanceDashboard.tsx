import { useMemo, type ReactNode } from "react";
import {
  ClipboardList, CheckCircle, AlertTriangle, Plus,
  CalendarClock, Clock, Wrench, Package,
  AlertOctagon,
} from "lucide-react";

// ── Types ──

export interface DashboardData {
  openWorkOrders: number; inProgress: number; overdue: number;
  completed: number; preventive: number; correctiveBreakdown: number;
  waitingParts: number; dueThisWeek: number; totalDowntimeMinutes: number;
}

interface WorkOrder {
  id: number; number: string; title: string;
  workOrderType: string; status: string; priority: string;
  assignedTo: string; dueDate: string | null;
  plantId: number | null; productionLineId: number | null;
  departmentId: number | null; resourceGroupId: number | null; resourceId: number | null;
  targetType: string; targetId: number | null;
  dateOpened: string | null; downtimeMinutes: number | null;
  linkedPmId: number | null; linkedBreakdownId: number | null;
}

interface BreakdownItem {
  id: number; number: string; title: string;
  status: string; severity: string; downtimeMinutes: number | null;
  targetType: string; targetId: number | null;
  reportedAt: string;
}

interface PMPlan {
  id: number; code: string; title: string;
  frequency: string; nextDueDate: string | null;
  assignedTo: string; priority: string; status: string;
  targetType: string; targetId: number | null;
}

interface SparePart {
  id: number; partNumber: string; name: string;
  quantityOnHand: number; minQuantity: number;
  uom: string; storageLocation: string; status: string;
  category: string;
}

export interface DashboardProps {
  dash: DashboardData;
  workOrders: WorkOrder[];
  breakdowns: BreakdownItem[];
  duePlans: PMPlan[];
  lowStockParts: SparePart[];
  onFilterView: (status?: string) => void;
  onNewWO: () => void;
  onNavigateTo?: (path: string) => void;
}

// ── Helpers ──

const statusLabelFn = (s: string): string => ({
  DRAFT: "Draft", OPEN: "Open", ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts",
  WAITING_APPROVAL: "Waiting Approval", COMPLETED: "Completed",
  CANCELLED: "Cancelled", ARCHIVED: "Archived",
}[s] || s);

const typeLabelFn = (t: string): string => {
  const m: Record<string, string> = {
    CORRECTIVE: "CM", PREVENTIVE: "PM", BREAKDOWN: "BD",
    INSPECTION: "INSP", CALIBRATION: "CAL", IMPROVEMENT: "IMP",
    SAFETY: "SFT", TOOLING: "TLG", OTHER: "Other",
  };
  return m[t] || t;
};

const priorityColors: Record<string, string> = {
  LOW: "text-gray-500", MEDIUM: "text-blue-500", HIGH: "text-orange-500", CRITICAL: "text-red-500",
};

const statusDotColor: Record<string, string> = {
  DRAFT: "bg-gray-400", OPEN: "bg-blue-500", ASSIGNED: "bg-indigo-500",
  IN_PROGRESS: "bg-amber-500", WAITING_PARTS: "bg-orange-500",
  WAITING_APPROVAL: "bg-purple-500", COMPLETED: "bg-green-500",
  CANCELLED: "bg-gray-400", ARCHIVED: "bg-gray-300",
};

const DOT = "inline-block h-2 w-2 rounded-full shrink-0";

const today = new Date().toISOString().slice(0, 10);

const cls = (...args: (string | false | null | undefined)[]): string => args.filter(Boolean).join(" ");

// ── Section Header ──

function SecH({ label, count, color = "bg-indigo-500" }: { label: string; count?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={cls("w-1 h-3.5 shrink-0 rounded-sm", color)} />
      <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">{label}</span>
      {count !== undefined &&      <span className="text-[10px] font-mono text-slate-500 ml-auto">{count}</span>}
    </div>
  );
}

// ── KPI Tile ──

function KpiTile({
  label, value, sub, color, icon, onClick,
}: {
  label: string; value: number | string; sub?: string; color?: string; icon?: ReactNode; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cls(
        "flex items-center gap-2.5 border-0 border-b border-border/10 bg-card/20 px-2 py-1.5 text-left transition-all duration-150",
        onClick ? "cursor-pointer hover:bg-card/40 hover:border-border/30" : "cursor-default",
      )}
    >        {icon && <div className={cls("flex h-7 w-7 shrink-0 items-center justify-center rounded", color || "bg-muted", "bg-opacity-10")}>{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <p className={cls("text-sm font-bold", color?.replace("bg-", "text-") || "text-foreground")}>{value}</p>
        {sub && <p className="text-[9px] text-muted-foreground/70 truncate">{sub}</p>}
      </div>
    </button>
  );
}

// ── Empty State ──

function Empty({ msg }: { msg: string }) {
  return <p className="text-[10px] text-muted-foreground italic py-1">{msg}</p>;
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════

export function MaintenanceDashboard({
  dash, workOrders, breakdowns, duePlans, lowStockParts,
  onFilterView, onNewWO, onNavigateTo,
}: DashboardProps) {
  // ── Derived Data ──
  const overdueWOList = useMemo(() => workOrders.filter((w) => w.dueDate && w.dueDate < today && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)), [workOrders, today]);
  const waitingPartsWO = useMemo(() => workOrders.filter((w) => w.status === "WAITING_PARTS"), [workOrders]);
  const activeBreakdowns = useMemo(() => breakdowns.filter((b) => ["REPORTED", "UNDER_REPAIR"].includes(b.status)), [breakdowns]);
  const pmDueOverdue = useMemo(() => duePlans.filter((p) => p.nextDueDate && p.nextDueDate < today), [duePlans, today]);
  const criticalLowParts = useMemo(() => lowStockParts.filter((p) => p.quantityOnHand === 0).slice(0, 8), [lowStockParts]);
  const warningLowParts = useMemo(() => lowStockParts.filter((p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.minQuantity).slice(0, 8), [lowStockParts]);

  // Recent activity: latest 10 WOs + breakdowns sorted by date
  const recentActivity = useMemo(() => {
    const items: { id: string; type: string; ref: string; title: string; detail: string; color: string; date: string }[] = [];
    for (const wo of workOrders.slice(0, 15)) {
      items.push({
        id: `wo-${wo.id}`, type: typeLabelFn(wo.workOrderType), ref: wo.number,
        title: wo.title, detail: statusLabelFn(wo.status),
        color: statusDotColor[wo.status] || "bg-gray-400", date: wo.dateOpened || "",
      });
    }
    for (const bd of breakdowns.slice(0, 10)) {
      items.push({
        id: `bd-${bd.id}`, type: "BD", ref: bd.number,
        title: bd.title, detail: bd.status,
        color: bd.severity === "CRITICAL" ? "bg-red-500" : bd.severity === "HIGH" ? "bg-orange-500" : "bg-blue-500",
        date: bd.reportedAt || "",
      });
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
      if (wo.dueDate && wo.dueDate >= today && wo.dueDate <= today) d.dueThisWeek++;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].open - a[1].open).slice(0, 12);
  }, [workOrders, today]);

  // Asset health: group WOs by target
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
    const counts: Record<string, number> = {};
    for (const s of ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "CANCELLED"]) {
      counts[s] = workOrders.filter((w) => w.status === s).length;
    }
    return counts;
  }, [workOrders]);

  // High-priority open WOs (Critical + High)
  const highPriorityWO = useMemo(() => workOrders.filter((w) => ["CRITICAL", "HIGH"].includes(w.priority) && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)).slice(0, 4), [workOrders]);

  // Critical assets down
  const criticalAssetsDown = useMemo(() => breakdowns.filter((b) => b.severity === "CRITICAL" && ["REPORTED", "UNDER_REPAIR"].includes(b.status)).slice(0, 4), [breakdowns]);

  // ── Due this week (PM + WO) ──
  const dueThisWeekPM = useMemo(() => duePlans.slice(0, 6), [duePlans]);
  const dueThisWeekWO = useMemo(() => {
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    const endDate = sevenDays.toISOString().slice(0, 10);
    return workOrders.filter((w) => w.dueDate && w.dueDate >= today && w.dueDate <= endDate && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)).slice(0, 6);
  }, [workOrders, today]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
      {/* ═══ KPI ROW ═══ */}
      <div className="grid grid-cols-9 gap-2">
        <KpiTile label="Open WOs" value={dash.openWorkOrders} sub="Active" color="bg-blue-500" onClick={() => onFilterView("")}
          icon={<ClipboardList className="h-3.5 w-3.5 text-blue-600 stroke-current" />} />
        <KpiTile label="Overdue" value={dash.overdue} sub="Past due" color="bg-red-500" onClick={() => onFilterView("OVERDUE")}
          icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600 stroke-current" />} />
        <KpiTile label="Breakdowns" value={activeBreakdowns.length} sub="Active failures" color="bg-orange-500" onClick={() => onNavigateTo?.("/maintenance/breakdowns")}
          icon={<AlertOctagon className="h-3.5 w-3.5 text-orange-600 stroke-current" />} />
        <KpiTile label="PM Due" value={duePlans.length} sub={pmDueOverdue.length > 0 ? `${pmDueOverdue.length} overdue` : "On track"} color="bg-purple-500"
          icon={<CalendarClock className="h-3.5 w-3.5 text-purple-600 stroke-current" />} />
        <KpiTile label="PM Overdue" value={pmDueOverdue.length} sub={pmDueOverdue.length === 0 ? "None overdue" : "Past due"} color="bg-red-500"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600 stroke-current" />} />
        <KpiTile label="Waiting Parts" value={dash.waitingParts} sub="WOs on hold" color="bg-orange-500" onClick={() => onFilterView("WAITING_PARTS")}
          icon={<Package className="h-3.5 w-3.5 text-orange-600 stroke-current" />} />
        <KpiTile label="Completed Wk" value={dash.completed} sub="This week" color="bg-green-500" onClick={() => onFilterView("COMPLETED")}
          icon={<CheckCircle className="h-3.5 w-3.5 text-green-600 stroke-current" />} />
        <KpiTile label="Downtime" value={`${dash.totalDowntimeMinutes} min`} sub={dash.totalDowntimeMinutes > 0 ? `~${Math.round(dash.totalDowntimeMinutes / 60)} hrs` : "Today"} color="bg-rose-500"
          icon={<Clock className="h-3.5 w-3.5 text-rose-600 stroke-current" />} />
        <KpiTile label="Low Stock" value={lowStockParts.length} sub={lowStockParts.length > 0 ? "Critical spares" : "OK"} color="bg-amber-500"
          icon={<AlertOctagon className="h-3.5 w-3.5 text-amber-600 stroke-current" />} onClick={() => onNavigateTo?.("/maintenance/spare-parts?stock=critical")} />
      </div>

      {/* ═══ 60/40 MAIN LAYOUT ═══ */}
      <div className="flex gap-3">
        {/* ── Left 60% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>

          {/* 1. Maintenance Risk Board */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Maintenance Risk Board" color="bg-red-500" count={overdueWOList.length + activeBreakdowns.length + pmDueOverdue.length + waitingPartsWO.length} />
            {overdueWOList.length === 0 && activeBreakdowns.length === 0 && pmDueOverdue.length === 0 && waitingPartsWO.length === 0 && criticalLowParts.length === 0 && highPriorityWO.length === 0 ? (
              <Empty msg="No active risks — all clear" />
            ) : (
              <div className="space-y-0.5">
                {overdueWOList.slice(0, 3).map((wo) => (
                  <Row key={`overdue-${wo.id}`} color="bg-red-500" type="Overdue WO" ref={wo.number} title={wo.title}
                    detail={`Due ${wo.dueDate?.slice(0, 10) || "—"} · ${wo.assignedTo || "Unassigned"}`} />
                ))}
                {criticalAssetsDown.slice(0, 2).map((bd) => (
                  <Row key={`cad-${bd.id}`} color="bg-red-500" type="Critical Down" ref={bd.number} title={bd.title}
                    detail={bd.downtimeMinutes ? `${bd.downtimeMinutes} min downtime` : bd.targetType} />
                ))}
                {activeBreakdowns.filter((b) => b.severity !== "CRITICAL").slice(0, 2).map((bd) => (
                  <Row key={`bd-${bd.id}`} color="bg-orange-500" type={bd.severity} ref={bd.number} title={bd.title}
                    detail={bd.downtimeMinutes ? `${bd.downtimeMinutes} min downtime` : "Active"} />
                ))}
                {highPriorityWO.slice(0, 2).map((wo) => (
                  <Row key={`hp-${wo.id}`} color="bg-red-500" type={`${wo.priority} Priority`} ref={wo.number} title={wo.title}
                    detail={`${wo.assignedTo || "Unassigned"} · ${typeLabelFn(wo.workOrderType)}`} />
                ))}
                {pmDueOverdue.slice(0, 2).map((pm) => (
                  <Row key={`pm-${pm.id}`} color="bg-purple-500" type="PM Overdue" ref={pm.code} title={pm.title}
                    detail={`Due ${pm.nextDueDate?.slice(0, 10) || "—"} · ${pm.assignedTo || "Unassigned"}`} />
                ))}
                {waitingPartsWO.slice(0, 2).map((wo) => (
                  <Row key={`wp-${wo.id}`} color="bg-orange-500" type="Waiting Parts" ref={wo.number} title={wo.title}
                    detail={wo.assignedTo ? `Assigned: ${wo.assignedTo}` : ""} />
                ))}
                {criticalLowParts.slice(0, 2).map((sp) => (
                  <Row key={`cs-${sp.id}`} color="bg-red-500" type="Stockout" ref={sp.partNumber} title={sp.name}
                    detail="0 on hand — reorder immediately" />
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
                  <Row key={`dpm-${pm.id}`} color="bg-purple-500" type="PM" ref={pm.code} title={pm.title}
                    detail={`${pm.assignedTo || "Unassigned"} · ${pm.targetType || ""}${pm.targetId ? ` #${pm.targetId}` : ""}`}
                    right={<span className={cls("text-[10px] font-semibold", priorityColors[pm.priority] || "")}>{pm.priority}</span>} />
                ))}
                {dueThisWeekWO.map((wo) => (
                  <Row key={`dwo-${wo.id}`} color="bg-blue-500" type={typeLabelFn(wo.workOrderType)} ref={wo.number} title={wo.title}
                    detail={`${wo.assignedTo || "Unassigned"} · ${wo.targetType || ""}${wo.targetId ? ` #${wo.targetId}` : ""} — Due ${wo.dueDate?.slice(0, 10) || "—"}`}
                    right={<span className={cls("text-[10px] font-semibold", priorityColors[wo.priority] || "")}>{wo.priority}</span>} />
                ))}
              </div>
            )}
          </div>

          {/* 3. Work Order Flow */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Work Order Flow" color="bg-blue-500" count={workOrders.length} />
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge color="bg-blue-500" label="Open" count={statusCounts.OPEN} onClick={() => onFilterView("OPEN")} />
              <StatusBadge color="bg-indigo-500" label="Assigned" count={statusCounts.ASSIGNED} onClick={() => onFilterView("ASSIGNED")} />
              <StatusBadge color="bg-amber-500" label="In Progress" count={statusCounts.IN_PROGRESS} onClick={() => onFilterView("IN_PROGRESS")} />
              <StatusBadge color="bg-orange-500" label="Waiting Parts" count={statusCounts.WAITING_PARTS} onClick={() => onFilterView("WAITING_PARTS")} />
              <StatusBadge color="bg-green-500" label="Completed" count={statusCounts.COMPLETED} onClick={() => onFilterView("COMPLETED")} />
              <StatusBadge color="bg-gray-400" label="Cancelled" count={statusCounts.CANCELLED} />
              {statusCounts.WAITING_PARTS > 0 && (
                <span className="ml-auto text-[9px] font-medium text-orange-600">{statusCounts.WAITING_PARTS} blocked by parts</span>
              )}
            </div>
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
                  <Row key={a.id} color={a.color} type={a.type} ref={a.ref} title={a.title}
                    detail={a.detail} right={<span className="text-[9px] text-muted-foreground">{a.date.slice(0, 10)}</span>} />
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
                  <Row key={`cs-${sp.id}`} color="bg-red-500" type="Stockout" ref={sp.partNumber} title={sp.name}
                    detail={`0 / ${sp.minQuantity} ${sp.uom}`} />
                ))}
                {warningLowParts.map((sp) => (
                  <Row key={`ls-${sp.id}`} color="bg-amber-500" type="Low" ref={sp.partNumber} title={sp.name}
                    detail={`${sp.quantityOnHand} / ${sp.minQuantity} ${sp.uom}${sp.storageLocation ? ` · ${sp.storageLocation}` : ""}`} />
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
          <Empty msg="No assets with open work orders" />
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {assetHealth.map((a) => (
              <div key={`${a.targetType}:${a.targetId}`} className="border border-border/30 bg-card/40 p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wrench className="h-3 w-3 text-muted-foreground stroke-current" />
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

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="flex items-center gap-2 pb-2 flex-wrap">
        <button type="button" onClick={onNewWO}
          className="inline-flex h-7 items-center gap-1.5 border border-indigo-200 bg-indigo-50 px-2.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 transition-colors">
          <Plus className="h-3 w-3 stroke-current" /> New WO
        </button>
        <button type="button" onClick={() => onFilterView("")}
          className="inline-flex h-7 items-center gap-1.5 border border-border/40 bg-card/40 px-2.5 text-[10px] font-semibold text-foreground hover:bg-card/60 transition-colors">
          <ClipboardList className="h-3 w-3 stroke-current" /> All WOs
        </button>
        <span className="h-4 w-px bg-border/30" />
        <span className="text-[10px] text-muted-foreground">Jump to:</span>
        <button type="button" onClick={() => onFilterView("")}
          className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          WO List
        </button>
        {onNavigateTo && (
          <>
            <button type="button" onClick={() => onNavigateTo("/maintenance/pm")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              PM Schedule
            </button>
            <button type="button" onClick={() => onNavigateTo("/maintenance/breakdowns")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Breakdowns
            </button>
            <button type="button" onClick={() => onNavigateTo("/maintenance/spare-parts")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Spare Parts
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

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

function StatusBadge({ color, label, count, onClick }: { color: string; label: string; count: number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cls(
        "inline-flex items-center gap-1.5 border border-border/30 px-2 py-1 text-[10px] font-medium transition-colors",
        onClick ? "cursor-pointer hover:bg-muted" : "cursor-default",
        count === 0 ? "opacity-40" : "",
      )}
    >
      <span className={cls("inline-block h-1.5 w-1.5 rounded-full", color)} />
      <span className="text-foreground">{label}</span>
      <span className="font-semibold text-muted-foreground">{count}</span>
    </button>
  );
}
