import { useMemo, type ReactNode } from "react";
import {
  Package, AlertTriangle, Archive, Hash,
  Activity, Clock, Layers, Wrench,
} from "lucide-react";

// ── Types ──

export interface SparePart {
  id: number; partNumber: string; name: string; description: string;
  category: string; manufacturer: string; supplier: string;
  uom: string; minQuantity: number;
  quantityOnHand: number; storageLocation: string; notes: string; status: string;
}

export interface UsageRecord {
  id: number; partId: number; workOrderId: number;
  quantity: number; usedBy: string; usedAt: string; notes: string;
}

export interface SparePartsDashboardProps {
  parts: SparePart[];
  usages: UsageRecord[];
  onNavigateView: (view: "detail" | "form") => void;
  onNavigateTo?: (path: string) => void;
  onFilterStock?: (level: "low" | "critical") => void;
}

// ── Helpers ──

const DOT = "inline-block h-2 w-2 rounded-full shrink-0";

const cls = (...args: (string | false | null | undefined)[]): string => args.filter(Boolean).join(" ");

// ── Section Header ──

function SecH({ label, count, color = "bg-teal-500" }: { label: string; count?: number; color?: string }) {
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
//  SPARE PARTS DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════

export function SparePartsDashboard({
  parts, usages,
  onNavigateView, onNavigateTo, onFilterStock,
}: SparePartsDashboardProps) {
  // ── Derived Data ──
  const activeParts = useMemo(() => parts.filter((p) => p.status === "ACTIVE"), [parts]);
  const inactiveParts = useMemo(() => parts.filter((p) => p.status === "INACTIVE"), [parts]);
  const obsoleteParts = useMemo(() => parts.filter((p) => p.status === "OBSOLETE"), [parts]);

  const stockoutParts = useMemo(() => activeParts.filter((p) => p.quantityOnHand === 0), [activeParts]);
  const lowStockParts = useMemo(() => activeParts.filter((p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.minQuantity), [activeParts]);
  const healthyParts = useMemo(() => activeParts.filter((p) => p.quantityOnHand > p.minQuantity), [activeParts]);

  // Category distribution
  const categoryDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of parts) {
      const cat = p.category || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [parts]);

  // Recent usage (last 12)
  const recentUsage = useMemo(() => {
    return [...usages].sort((a, b) => (b.usedAt || "").localeCompare(a.usedAt || "")).slice(0, 12);
  }, [usages]);

  // Parts with the most usages
  const topUsedParts = useMemo(() => {
    const map = new Map<number, { partId: number; name: string; partNumber: string; totalQty: number; count: number }>();
    for (const u of usages) {
      if (!map.has(u.partId)) {
        const part = parts.find((p) => p.id === u.partId);
        map.set(u.partId, { partId: u.partId, name: part?.name || `#${u.partId}`, partNumber: part?.partNumber || "", totalQty: 0, count: 0 });
      }
      const d = map.get(u.partId)!;
      d.totalQty += u.quantity;
      d.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [usages, parts]);

  // Stock level summary
  const totalQty = useMemo(() => parts.reduce((s, p) => s + p.quantityOnHand, 0), [parts]);
  const avgStock = useMemo(() => activeParts.length > 0 ? Math.round(totalQty / activeParts.length) : 0, [totalQty, activeParts]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
      {/* ═══ KPI ROW ═══ */}
      <div className="grid grid-cols-8 gap-2">
        <KpiTile label="Total Parts" value={parts.length} sub={activeParts.length === parts.length ? "All active" : `${activeParts.length} active`} color="bg-teal-500"
          icon={<Package className="h-3.5 w-3.5 text-teal-600 stroke-current" />} onClick={() => onNavigateView("detail")} />
        <KpiTile label="Stockout" value={stockoutParts.length} sub={stockoutParts.length === 0 ? "Fully stocked" : "Reorder immediately"} color="bg-red-500"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600 stroke-current" />} onClick={() => onFilterStock?.("critical")} />
        <KpiTile label="Low Stock" value={lowStockParts.length} sub={lowStockParts.length === 0 ? "All above min" : "Below minimum"} color="bg-amber-500"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600 stroke-current" />} onClick={() => onFilterStock?.("low")} />
        <KpiTile label="Healthy" value={healthyParts.length} sub={activeParts.length > 0 ? `${Math.round((healthyParts.length / activeParts.length) * 100)}% of active` : "—"} color="bg-green-500"
          icon={<Activity className="h-3.5 w-3.5 text-green-600 stroke-current" />} onClick={() => onNavigateView("detail")} />
        <KpiTile label="Avg Stock" value={avgStock} sub={`per active part`} color="bg-blue-500"
          icon={<Layers className="h-3.5 w-3.5 text-blue-600 stroke-current" />} />
        <KpiTile label="Categories" value={categoryDist.length} sub={categoryDist.slice(0, 3).map(([c]) => c).join(", ")} color="bg-purple-500"
          icon={<Hash className="h-3.5 w-3.5 text-purple-600 stroke-current" />} />
        <KpiTile label="Inact./Obs." value={`${inactiveParts.length}/${obsoleteParts.length}`} sub={`${Math.round(((inactiveParts.length + obsoleteParts.length) / Math.max(parts.length, 1)) * 100)}% non-active`} color="bg-gray-500"
          icon={<Archive className="h-3.5 w-3.5 text-gray-600 stroke-current" />} />
        <KpiTile label="Blocking WOs" value={stockoutParts.length + lowStockParts.length} sub={stockoutParts.length + lowStockParts.length === 0 ? "None" : "Parts at risk"} color="bg-rose-500"
          icon={<Wrench className="h-3.5 w-3.5 text-rose-600 stroke-current" />} onClick={() => onNavigateView("detail")} />
      </div>

      {/* ═══ 60/40 MAIN LAYOUT ═══ */}
      <div className="flex gap-3">
        {/* ── Left 60% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "60%" }}>

          {/* 1. Inventory Risk Board */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Inventory Risk Board" color="bg-red-500" count={stockoutParts.length + lowStockParts.length} />
            {stockoutParts.length === 0 && lowStockParts.length === 0 ? (
              <Empty msg="No inventory risks — all parts sufficiently stocked" />
            ) : (
              <div className="space-y-0.5">
                {stockoutParts.slice(0, 5).map((sp) => (
                  <Row key={`so-${sp.id}`} color="bg-red-500" type="Stockout" ref={sp.partNumber} title={sp.name}
                    detail={`0 / ${sp.minQuantity} ${sp.uom}${sp.storageLocation ? ` · ${sp.storageLocation}` : ""}`} />
                ))}
                {lowStockParts.slice(0, 5).map((sp) => (
                  <Row key={`ls-${sp.id}`} color="bg-amber-500" type="Low" ref={sp.partNumber} title={sp.name}
                    detail={`${sp.quantityOnHand} / ${sp.minQuantity} ${sp.uom}${sp.storageLocation ? ` · ${sp.storageLocation}` : ""}`} />
                ))}
              </div>
            )}
          </div>

          {/* 2. Stock Level Distribution */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Stock Level Distribution" color="bg-teal-500" count={activeParts.length} />
            <div className="space-y-2">
              <div className="flex h-5 overflow-hidden rounded-sm">
                {stockoutParts.length > 0 && (
                  <div className="flex items-center justify-center bg-red-500 text-[9px] font-bold text-white" style={{ width: `${(stockoutParts.length / Math.max(activeParts.length, 1)) * 100}%` }}>
                    {stockoutParts.length > 0 && `${stockoutParts.length}`}
                  </div>
                )}
                {lowStockParts.length > 0 && (
                  <div className="flex items-center justify-center bg-amber-500 text-[9px] font-bold text-white" style={{ width: `${(lowStockParts.length / Math.max(activeParts.length, 1)) * 100}%` }}>
                    {lowStockParts.length}
                  </div>
                )}
                {healthyParts.length > 0 && (
                  <div className="flex items-center justify-center bg-green-500 text-[9px] font-bold text-white" style={{ width: `${(healthyParts.length / Math.max(activeParts.length, 1)) * 100}%` }}>
                    {healthyParts.length}
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500" /> Stockout ({stockoutParts.length})</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-500" /> Low ({lowStockParts.length})</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green-500" /> Healthy ({healthyParts.length})</span>
              </div>
            </div>
          </div>

          {/* 3. Category Breakdown */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Category Breakdown" color="bg-purple-500" count={categoryDist.length} />
            {categoryDist.length === 0 ? (
              <Empty msg="No categories defined" />
            ) : (
              <div className="space-y-1">
                {categoryDist.map(([cat, cnt]) => {
                  const pct = Math.round((cnt / parts.length) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-2 py-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground min-w-[80px] truncate">{cat}</span>
                      <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                        <div className="h-full bg-teal-500/30 rounded-sm transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-foreground w-6 text-right">{cnt}</span>
                      <span className="text-[9px] text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right 40% ── */}
        <div className="flex-1 min-w-0 space-y-3" style={{ flexBasis: "40%" }}>

          {/* 1. Recent Usage */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Recent Usage" color="bg-teal-500" count={recentUsage.length} />
            {recentUsage.length === 0 ? (
              <Empty msg="No usage recorded" />
            ) : (
              <div className="space-y-0.5">
                {recentUsage.map((u) => {
                  const part = parts.find((p) => p.id === u.partId);
                  return (
                    <Row key={u.id} color="bg-blue-500" type="Used" ref={part?.partNumber || `#${u.partId}`}
                      title={part?.name || `Part #${u.partId}`}
                      detail={`-${u.quantity} ${part?.uom || ""} · WO #${u.workOrderId}`}
                      right={<span className="text-[9px] text-muted-foreground">{u.usedAt?.slice(0, 10)}</span>} />
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Top Used Parts */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Most Frequently Used" color="bg-violet-500" count={topUsedParts.length} />
            {topUsedParts.length === 0 ? (
              <Empty msg="No usage data yet" />
            ) : (
              <div className="space-y-0.5">
                {topUsedParts.map((t) => (
                  <div key={t.partId} className="flex items-center gap-2 py-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground/50 stroke-current" />
                    <span className="text-[9px] font-mono text-muted-foreground w-16 shrink-0 truncate">{t.partNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{t.name}</span>
                    <span className="text-xs font-semibold text-red-500">{t.totalQty}</span>
                    <span className="text-[9px] text-muted-foreground">used {t.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Status Distribution */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Part Status" color="bg-emerald-500" count={parts.length} />
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge color="bg-green-500" label="Active" count={activeParts.length} />
              <StatusBadge color="bg-amber-500" label="Inactive" count={inactiveParts.length} />
              <StatusBadge color="bg-gray-400" label="Obsolete" count={obsoleteParts.length} />
            </div>
          </div>

          {/* 4. Parts Blocking Work Orders */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/30 dark:border-slate-700/30 p-3">
            <SecH label="Parts Blocking WOs" color="bg-red-500" count={stockoutParts.length + lowStockParts.length} />
            {stockoutParts.length === 0 && lowStockParts.length === 0 ? (
              <Empty msg="No parts currently blocking work orders" />
            ) : (
              <div className="space-y-0.5">
                {stockoutParts.slice(0, 4).map((sp) => (
                  <div key={`bw-${sp.id}`} className="flex items-center gap-2 py-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
                    <AlertTriangle className="h-3 w-3 shrink-0 text-red-500 stroke-current" />
                    <span className="text-[9px] font-mono text-muted-foreground w-16 shrink-0">{sp.partNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{sp.name}</span>
                    <span className="text-[9px] font-semibold text-red-500">Stockout</span>
                  </div>
                ))}
                {lowStockParts.slice(0, 3).map((sp) => (
                  <div key={`bl-${sp.id}`} className="flex items-center gap-2 py-1 border-b border-white/10 dark:border-slate-700/10 last:border-b-0">
                    <Wrench className="h-3 w-3 shrink-0 text-amber-500 stroke-current" />
                    <span className="text-[9px] font-mono text-muted-foreground w-16 shrink-0">{sp.partNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{sp.name}</span>
                    <span className="text-[9px] font-semibold text-amber-500">Low ({sp.quantityOnHand})</span>
                  </div>
                ))}
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
          Part List
        </button>
        {onNavigateTo && (
          <>
            <button type="button" onClick={() => onNavigateTo("/maintenance/work-orders")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Work Orders
            </button>
            <button type="button" onClick={() => onNavigateTo("/maintenance/pm")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              PM Schedule
            </button>
            <button type="button" onClick={() => onNavigateTo("/maintenance/breakdowns")}
              className="inline-flex h-6 items-center px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Breakdowns
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
