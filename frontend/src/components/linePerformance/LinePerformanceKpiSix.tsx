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
  good: { text: "text-success", bar: "bg-success/100" },
  warning: { text: "text-warning", bar: "bg-warning/100" },
  critical: { text: "text-danger", bar: "bg-danger/100" },
  neutral: { text: "text-muted-foreground", bar: "bg-slate-400" },
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
      <div className="shrink-0 text-muted-foreground/60">{icon}</div>
      <div className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground truncate">{title}</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-semibold tabular-nums ${c.text}`}>{value}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

export function LinePerformanceKpiSix({ kpis }: Props) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-6 divide-x divide-border border-b border-border h-16">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center px-3 animate-pulse">
            <div className="h-10 w-full rounded bg-muted/80" />
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
    <div className="grid grid-cols-6 divide-x divide-slate-300 border-b border-border bg-muted h-16">
      <KpiCard title="Plan" value={kpis.planQuantity} icon={<Target className="h-4 w-4" />} status="neutral" />
      <KpiCard title="Actual" value={kpis.actualQuantity} icon={<Package className="h-4 w-4" />} status={gapStat} />
      <KpiCard title="Gap" value={kpis.gap >= 0 ? `+${kpis.gap}` : `${kpis.gap}`} icon={<TrendingDown className="h-4 w-4" />} status={gapStat} />
      <KpiCard title="OEE" value={kpis.oeeSignal !== null ? `${(kpis.oeeSignal * 100).toFixed(1)}%` : "—"} icon={<Activity className="h-4 w-4" />} status={oeeStat} />
      <KpiCard title="Run Rate" value={kpis.runRate} unit={kpis.runRateUnit} icon={<Gauge className="h-4 w-4" />} status={runStat} />
      <KpiCard title="Quality" value={kpis.firstPassYield !== null ? `${(kpis.firstPassYield * 100).toFixed(1)}%` : "—"} icon={<ShieldCheck className="h-4 w-4" />} status={qualStat} />
    </div>
  );
}
