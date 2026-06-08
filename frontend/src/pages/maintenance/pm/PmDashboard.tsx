import { useMemo, type ReactNode } from "react";
import {
  CalendarClock, CheckCircle, AlertTriangle,
  Clock, Target, Pause, Activity,
} from "lucide-react";

// ── Types ──

export interface PMPlan {
  id: number; code: string; title: string; description: string;
  targetType: string; targetId: number | null; frequency: string;
  intervalValue: number | null; nextDueDate: string | null;
  lastCompletedDate: string | null; assignedTo: string;
  priority: string; status: string;
}

export interface PmDashboardProps {
  plans: PMPlan[];
  duePlans: PMPlan[];
  onNavigateView: (view: "detail" | "form") => void;
  onNavigateTo?: (path: string) => void;
}

// ── Helpers ──

function freqLabel(f: string): string {
  const m: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Yearly", USAGE_BASED: "Usage Based" };
  return m[f] || f;
}

const priorityColors: Record<string, string> = {
  LOW: "text-gray-500", MEDIUM: "text-blue-500", HIGH: "text-orange-500", CRITICAL: "text-red-500",
};

const DOT = "inline-block h-2 w-2 rounded-full shrink-0";

const today = new Date().toISOString().slice(0, 10);

const cls = (...args: (string | false | null | undefined)[]): string => args.filter(Boolean).join(" ");

// ── Section Header ──

function SecH({ label, count, color = "bg-purple-500" }: { label: string; count?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={cls("w-1 h-3.5 shrink-0 rounded-sm", color)} />
      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{label}</span>
      {count !== undefined && <span className="text-[10px] font-mono text-muted-foreground ml-auto">{count}</span>}
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
    >
      {icon && <div className={cls("flex h-7 w-7 shrink-0 items-center justify-center rounded", color || "bg-muted", "bg-opacity-10")}>{icon}</div>}
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
//  PM DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════

export function PmDashboard({
  plans, duePlans,
  onNavigateView, onNavigateTo,
}: PmDashboardProps) {
  // ── Derived Data ──
  const activePlans = useMemo(() => plans.filter((p) => p.status === "ACTIVE"), [plans]);
  const pausedPlans = useMemo(() => plans.filter((p) => p.status === "PAUSED"), [plans]);
  const archivedPlans = useMemo(() => plans.filter((p) => p.status === "ARCHIVED"), [plans]);

  const overduePlans = useMemo(() =>
    plans.filter((p) => p.status === "ACTIVE" && p.nextDueDate && p.nextDueDate < today),
  [plans, today]);

  const criticalOverdue = useMemo(() =>
    overduePlans.filter((p) => p.priority === "CRITICAL" || p.priority === "HIGH"),
  [overduePlans]);

  const pmDueThisWeek = useMemo(() => {
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    const endDate = sevenDays.toISOString().slice(0, 10);
    return duePlans.filter((p) => p.nextDueDate && p.nextDueDate >= today && p.nextDueDate <= endDate);
  }, [duePlans, today]);

  const dueToday = useMemo(() =>
    duePlans.filter((p) => p.nextDueDate === today),
  [duePlans, today]);

  const completedThisWeek = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().slice(0, 10);
    return plans.filter((p) => p.lastCompletedDate && p.lastCompletedDate >= startDate && p.lastCompletedDate <= today);
  }, [plans, today]);

  const noCompletion = useMemo(() =>
    plans.filter((p) => p.status === "ACTIVE" && !p.lastCompletedDate).slice(0, 6),
  [plans]);

  // Due this week = all due plans (includes overdue and upcoming)
  const dueThisWeekAll = useMemo(() => {
    return duePlans.slice(0, 10);
  }, [duePlans]);

  // Technician load from PM assignments
  const techLoad = useMemo(() => {
    const map = new Map<string, { total: number; active: number; overdue: number }>();
    for (const pm of plans.filter((p) => p.assignedTo)) {
      const t = pm.assignedTo;
      if (!map.has(t)) map.set(t, { total: 0, active: 0, overdue: 0 });
      const d = map.get(t)!;
      d.total++;
      if (pm.status === "ACTIVE") d.active++;
      if (pm.status === "ACTIVE" && pm.nextDueDate && pm.nextDueDate < today) d.overdue++;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].active - a[1].active).slice(0, 10);
  }, [plans, today]);

  // Plans grouped by target type
  const plansByTarget = useMemo(() => {
    const map = new Map<string, { targetType: string; targetId: string; count: number; overdue: number }>();
    for (const pm of plans.filter((p) => p.targetType)) {
      const key = `${pm.targetType}:${pm.targetId || ""}`;
      if (!map.has(key)) map.set(key, { targetType: pm.targetType, targetId: String(pm.targetId || ""), count: 0, overdue: 0 });
      const d = map.get(key)!;
      d.count++;
      if (pm.status === "ACTIVE" && pm.nextDueDate && pm.nextDueDate < today) d.overdue++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [plans, today]);

  // Frequency distribution
  const freqDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pm of plans) {
      counts[pm.frequency] = (counts[pm.frequency] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [plans]);

    return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
      {/* ═══ KPI ROW ═══ */}
      <div className="grid grid-cols-8 gap-2">
        <KpiTile label="Active Plans" value={activePlans.length} sub={plans.length === 0 ? "No plans" : `${Math.round((activePlans.length / plans.length) * 100)}% of total`} color="bg-blue-500"
          icon={<CalendarClock className="h-3.5 w-3.5 text-blue-600 stroke-current" />} onClick={() => onNavigateView("detail")} />
        <KpiTile label="Overdue PMs" value={overduePlans.length} sub={overduePlans.length === 0 ? "All on track" : `${criticalOverdue.length} critical/high`} color="bg-red-500"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600 stroke-current" />} onClick={() => onNavigateView("detail")} />
        <KpiTile label="Due This Week" value={pmDueThisWeek.length} sub={pmDueThisWeek.length === 0 ? "Schedule clear" : "Including overdue"} color="bg-amber-500"
          icon={<Clock className="h-3.5 w-3.5 text-amber-600 stroke-current" />} onClick={() => onNavigateView("detail")} />
        <KpiTile label="Due Today" value={dueToday.length} sub={dueToday.length === 0 ? "Clear" : "Due now"} color="bg-purple-500"
          icon={<CalendarClock className="h-3.5 w-3.5 text-purple-600 stroke-current" />} onClick={() => onNavigateView("detail")} />
        <KpiTile label="Paused" value={pausedPlans.length} sub={pausedPlans.length === 0 ? "All active" : `${Math.round((pausedPlans.length / plans.length) * 100)}% paused`} color="bg-gray-500"
          icon={<Pause className="h-3.5 w-3.5 text-gray-600 stroke-current" />} onClick={() => onNavigateView("detail")} />
        <KpiTile label="Compl. Wk" value={completedThisWeek.length} sub={`${completedThisWeek.length > 0 ? `${Math.round((completedThisWeek.length / plans.length) * 100)}% this week` : "No completions"}`} color="bg-green-500"
          icon={<CheckCircle className="h-3.5 w-3.5 text-green-600 stroke-current" />} />
        <KpiTile label="Compliance" value={activePlans.length > 0 ? `${Math.round((activePlans.filter((p) => p.lastCompletedDate).length / activePlans.length) * 100)}%` : "—"} sub={activePlans.length === 0 ? "No active plans" : "Have completion record"} color="bg-emerald-500"
          icon={<Activity className="h-3.5 w-3.5 text-emerald-600 stroke-current" />} />
        <KpiTile label="Uniq. Freq." value={freqDist.length} sub={freqDist.map(([f]) => freqLabel(f)).join(", ")} color="bg-sky-500"
          icon={<Activity className="h-3.5 w-3.5 text-sky-600 stroke-current" />} />
      </div>

      {/* ═══ 60/40 MAIN LAYOUT ═══ */}
      <div className="flex gap-3">
        {/* ── Left 60% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>

          {/* 1. PM Risk Board */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="PM Risk Board" color="bg-red-500" count={overduePlans.length + noCompletion.length} />
            {overduePlans.length === 0 && noCompletion.length === 0 ? (
              <Empty msg="No PM risks — all active plans on schedule" />
            ) : (
              <div className="space-y-0.5">
                {criticalOverdue.slice(0, 4).map((pm) => (
                  <Row key={`co-${pm.id}`} color="bg-red-500" type="Overdue" ref={pm.code} title={pm.title}
                    detail={`${pm.priority} · Due ${pm.nextDueDate?.slice(0, 10) || "—"} · ${pm.assignedTo || "Unassigned"}`} />
                ))}
                {overduePlans.filter((p) => p.priority !== "CRITICAL" && p.priority !== "HIGH").slice(0, 3).map((pm) => (
                  <Row key={`po-${pm.id}`} color="bg-orange-500" type="Late" ref={pm.code} title={pm.title}
                    detail={`Due ${pm.nextDueDate?.slice(0, 10) || "—"} · ${pm.assignedTo || "Unassigned"}`} />
                ))}
                {noCompletion.slice(0, 3).map((pm) => (
                  <Row key={`nc-${pm.id}`} color="bg-amber-500" type="No Record" ref={pm.code} title={pm.title}
                    detail={`${freqLabel(pm.frequency)} · Next due: ${pm.nextDueDate?.slice(0, 10) || "—"}`} />
                ))}
              </div>
            )}
          </div>

          {/* 2. Due This Week */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Due This Week" color="bg-purple-500" count={dueThisWeekAll.length} />
            {dueThisWeekAll.length === 0 ? (
              <Empty msg="No PM tasks due this week" />
            ) : (
              <div className="space-y-0.5">
                {dueThisWeekAll.map((pm) => (
                  <Row key={`dpm-${pm.id}`} color={pm.nextDueDate && pm.nextDueDate < today ? "bg-red-500" : "bg-purple-500"}
                    type={pm.nextDueDate && pm.nextDueDate < today ? "Overdue" : freqLabel(pm.frequency)}
                    ref={pm.code} title={pm.title}
                    detail={`${pm.assignedTo || "Unassigned"} · ${pm.targetType}${pm.targetId ? ` #${pm.targetId}` : ""}${pm.nextDueDate ? ` · Due ${pm.nextDueDate.slice(0, 10)}` : ""}`}
                    right={<span className={cls("text-[10px] font-semibold", priorityColors[pm.priority] || "")}>{pm.priority}</span>} />
                ))}
              </div>
            )}
          </div>

          {/* 3. PM Status Distribution */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="PM Status" color="bg-blue-500" count={plans.length} />
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge color="bg-green-500" label="Active" count={activePlans.length} />
              <StatusBadge color="bg-amber-500" label="Paused" count={pausedPlans.length} />
              <StatusBadge color="bg-gray-400" label="Archived" count={archivedPlans.length} />
              <span className="mx-2 h-5 w-px bg-border/30" />
              {freqDist.slice(0, 4).map(([freq, cnt]) => (
                <span key={freq} className="inline-flex items-center gap-1 border border-border/30 px-2 py-1 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{cnt}</span>
                  {freqLabel(freq)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right 40% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "40%" }}>

          {/* 1. Technician Load */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Technician Load" color="bg-violet-500" count={techLoad.length} />
            {techLoad.length === 0 ? (
              <Empty msg="No PM assignments" />
            ) : (
              <div className="space-y-1">
                {techLoad.map(([name, d]) => (
                  <div key={name} className="flex items-center gap-2 py-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{name}</span>
                    <span className="text-xs font-semibold text-purple-600">{d.active} active</span>
                    {d.overdue > 0 && <span className="text-[10px] font-semibold text-red-500">{d.overdue} overdue</span>}
                    {d.total > 0 && <span className="text-[9px] text-muted-foreground">({d.total} total)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Plans by Target */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Plans by Target" color="bg-sky-500" count={plansByTarget.length} />
            {plansByTarget.length === 0 ? (
              <Empty msg="No target-linked PM plans" />
            ) : (
              <div className="space-y-0.5">
                {plansByTarget.map((t) => (
                  <div key={`${t.targetType}:${t.targetId}`} className="flex items-center gap-2 py-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
                    <Target className="h-3 w-3 shrink-0 text-muted-foreground/50 stroke-current" />
                    <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">{t.targetType === "RESOURCE_GROUP" ? "RG" : t.targetType === "PRODUCTION_LINE" ? "Line" : t.targetType}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                      {t.targetId ? `#${t.targetId}` : "(global)"}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{t.count}</span>
                    {t.overdue > 0 && <span className="text-[10px] font-semibold text-red-500">{t.overdue} overdue</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Frequency Distribution */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Frequency Breakdown" color="bg-emerald-500" count={plans.length} />
            {freqDist.length === 0 ? (
              <Empty msg="No plans to analyze" />
            ) : (
              <div className="space-y-1">
                {freqDist.map(([freq, cnt]) => {
                  const pct = Math.round((cnt / plans.length) * 100);
                  return (
                    <div key={freq} className="flex items-center gap-2 py-1">
                      <span className="text-[10px] font-medium text-muted-foreground w-20 shrink-0">{freqLabel(freq)}</span>
                      <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                        <div className="h-full bg-purple-500/30 rounded-sm transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-foreground w-8 text-right">{cnt}</span>
                      <span className="text-[9px] text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="flex items-center gap-2 pb-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground">Jump to:</span>
        <button type="button" onClick={() => onNavigateView("detail")}
          className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          PM List
        </button>
        {onNavigateTo && (
          <>
            <button type="button" onClick={() => onNavigateTo("/maintenance/work-orders")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Work Orders
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
