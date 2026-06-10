import type { ReactNode } from "react";
import type { KpiStatus } from "@/types/linePerformance";

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: KpiStatus;
  icon?: ReactNode;
  delta?: string;
}

const STATUS_STYLES: Record<KpiStatus, string> = {
  good: "border-l-success/50",
  warning: "border-l-warning/50",
  critical: "border-l-danger/50",
  neutral: "border-l-border",
};

const STATUS_TEXT: Record<KpiStatus, string> = {
  good: "text-success",
  warning: "text-warning",
  critical: "text-danger",
  neutral: "text-muted-foreground",
};

export function LinePerformanceKpiCard({ title, value, unit, status = "neutral", icon, delta }: KpiCardProps) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 flex-1 rounded-md border border-kpi-border bg-kpi p-3 border-l-4 ${STATUS_STYLES[status]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</span>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-bold tabular-nums ${STATUS_TEXT[status]}`}>
          {value ?? "—"}
        </span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      {delta && (
        <span className="text-[10px] text-muted-foreground truncate">{delta}</span>
      )}
    </div>
  );
}
