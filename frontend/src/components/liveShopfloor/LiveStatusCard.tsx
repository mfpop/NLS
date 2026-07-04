import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  critical?: "good" | "warning" | "critical" | "neutral";
  icon?: ReactNode;
  className?: string;
  valueClassName?: string;
}

const VALUE_COLOR: Record<string, string> = {
  good: "text-success",
  warning: "text-warning",
  critical: "text-danger",
  neutral: "text-foreground",
};

export function LiveStatusCard({ title, value, critical = "neutral", icon, className = "", valueClassName = "" }: Props) {
  const color = VALUE_COLOR[critical] || VALUE_COLOR.neutral;

  return (
    <div className={`flex flex-col gap-0 min-w-0 px-3 py-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="shrink-0 text-muted-foreground/60">{icon}</span>}
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{title}</span>
      </div>
      <span className={`text-lg font-semibold tabular-nums leading-tight line-clamp-2 ${color} ${valueClassName}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}
