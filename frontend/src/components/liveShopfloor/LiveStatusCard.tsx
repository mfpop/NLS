import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  status?: "running" | "stopped" | "blocked" | "starved" | "maintenance" | "changeover" | "unknown" | "active" | "critical" | "warning" | "good" | "neutral";
  icon?: ReactNode;
}

const STATUS_BORDER: Record<string, string> = {
  running: "border-l-success/50",
  good: "border-l-success/50",
  stopped: "border-l-danger/50",
  blocked: "border-l-danger/50",
  critical: "border-l-danger/50",
  starved: "border-l-warning/50",
  maintenance: "border-l-warning/50",
  changeover: "border-l-accent/50",
  warning: "border-l-warning/50",
  active: "border-l-accent/50",
  unknown: "border-l-border",
  neutral: "border-l-border",
};

const STATUS_TEXT: Record<string, string> = {
  running: "text-success",
  good: "text-success",
  stopped: "text-danger",
  blocked: "text-danger",
  critical: "text-danger",
  starved: "text-warning",
  maintenance: "text-warning",
  changeover: "text-accent",
  warning: "text-warning",
  active: "text-accent",
  unknown: "text-muted-foreground",
  neutral: "text-muted-foreground",
};

export function LiveStatusCard({ title, value, status = "neutral", icon }: Props) {
  const border = STATUS_BORDER[status] || STATUS_BORDER.neutral;
  const text = STATUS_TEXT[status] || STATUS_TEXT.neutral;

  return (
    <div className={`flex flex-col gap-1 min-w-0 flex-1 rounded-md border border-kpi-border bg-kpi p-3 border-l-4 ${border}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</span>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      </div>
      <span className={`text-lg font-bold tabular-nums ${text}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}
