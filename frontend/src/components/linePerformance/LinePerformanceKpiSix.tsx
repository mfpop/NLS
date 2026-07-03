import { Package, TrendingDown, Activity, Gauge, ShieldCheck, Target } from "lucide-react";
import type { LinePerformanceKpis } from "@/types/linePerformance";

interface Props {
  kpis: LinePerformanceKpis | null;
}

function statusColor(status: string): "good" | "warning" | "critical" | "neutral" {
  if (status === "ahead" || status === "on_plan" || status === "good" || status === "on_target") return "good";
  if (status === "behind" || status === "warning" || status === "needs_attention") return "warning";
  if (status === "critical") return "critical";
  return "neutral";
}

const colorMap = {
  good: { text: "text-emerald-600", bar: "bg-emerald-500" },
  warning: { text: "text-amber-600", bar: "bg-amber-500" },
  critical: { text: "text-red-600", bar: "bg-red-500" },
  neutral: { text: "text-slate-700", bar: "bg-slate-400" },
};

function KpiCard({
  title,
  value,
  unit,
  icon,
  status,
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status: "good" | "warning" | "critical" | "neutral";
}) {
  const c = colorMap[status];
  return (
    <div className="flex items-center gap-2 px-3 min-w-0">
      <div className="shrink-0 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wide text-slate-500 truncate">{title}</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-semibold tabular-nums ${c.text}`}>{value}</span>
          {unit && <span className="text-xs text-slate-500">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

export function LinePerformanceKpiSix({ kpis }: Props) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-6 divide-x divide-slate-200 border-b border-slate-200 h-16">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center px-3 animate-pulse">
            <div className="h-10 w-full rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  const gapStat = statusColor(kpis.gapStatus);
  const oeeStat = kpis.oeeSignal !== null
    ? kpis.oeeSignal >= 0.85 ? "good" : kpis.oeeSignal >= 0.70 ? "warning" : "critical"
    : "neutral";
  const runStat = statusColor(kpis.gapStatus);
  const qualStat = kpis.qualityStatus ? statusColor(kpis.qualityStatus) : "neutral";

  return (
    <div className="grid grid-cols-6 divide-x divide-slate-300 border-b border-slate-300 bg-slate-50 h-16">
      <KpiCard title="Plan" value={kpis.planQuantity} icon={<Target className="h-4 w-4" />} status="neutral" />
      <KpiCard title="Actual" value={kpis.actualQuantity} icon={<Package className="h-4 w-4" />} status={gapStat} />
      <KpiCard title="Gap" value={kpis.gap >= 0 ? `+${kpis.gap}` : `${kpis.gap}`} icon={<TrendingDown className="h-4 w-4" />} status={gapStat} />
      <KpiCard title="OEE" value={kpis.oeeSignal !== null ? `${(kpis.oeeSignal * 100).toFixed(1)}%` : "—"} icon={<Activity className="h-4 w-4" />} status={oeeStat} />
      <KpiCard title="Run Rate" value={kpis.runRate} unit={kpis.runRateUnit} icon={<Gauge className="h-4 w-4" />} status={runStat} />
      <KpiCard title="Quality" value={kpis.firstPassYield !== null ? `${(kpis.firstPassYield * 100).toFixed(1)}%` : "—"} icon={<ShieldCheck className="h-4 w-4" />} status={qualStat} />
    </div>
  );
}
