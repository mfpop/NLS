import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  unit?: string;
  critical?: "good" | "warning" | "critical" | "neutral";
  icon?: ReactNode;
  delta?: string;
}

const VALUE_COLOR: Record<string, string> = {
  good: "text-success",
  warning: "text-warning",
  critical: "text-danger",
  neutral: "text-foreground",
};

export function LinePerformanceKpiCard({ title, value, unit, critical = "neutral", icon, delta }: Props) {
  const color = VALUE_COLOR[critical] || VALUE_COLOR.neutral;

  return (
    <div className="flex flex-col gap-0 min-w-0 px-3 py-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="shrink-0 text-muted-foreground/60">{icon}</span>}
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{title}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-lg font-semibold tabular-nums leading-tight ${color}`}>
          {value ?? "—"}
        </span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      {delta && (
        <span className="text-[10px] text-muted-foreground truncate leading-tight">{delta}</span>
      )}
    </div>
  );
}
