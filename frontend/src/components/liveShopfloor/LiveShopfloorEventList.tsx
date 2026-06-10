import { AlertTriangle, Clock, XCircle, CheckCircle2, Activity, GitBranch } from "lucide-react";
import type { LiveShopfloorEvent } from "@/types/liveShopfloor";
import { LiveShopfloorEmptyState } from "./LiveShopfloorEmptyState";

interface Props {
  events: LiveShopfloorEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

const EVENT_ICONS: Record<string, typeof Clock> = {
  downtime: XCircle,
  quality_alert: AlertTriangle,
  material_shortage: AlertTriangle,
  safety_alert: AlertTriangle,
  issue: AlertTriangle,
  action: CheckCircle2,
  bottleneck: GitBranch,
  status_change: Activity,
};

const EVENT_COLORS: Record<string, string> = {
  downtime: "text-danger",
  quality_alert: "text-warning",
  material_shortage: "text-warning",
  safety_alert: "text-danger",
  issue: "text-warning",
  action: "text-accent",
  bottleneck: "text-warning",
  status_change: "text-accent",
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-l-danger/50",
  high: "border-l-warning/50",
  medium: "border-l-accent/40",
  low: "border-l-border/30",
};

export function LiveShopfloorEventList({ events, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-3">
        <LiveShopfloorEmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border/20">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Active Events ({events.length})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {events.map((event) => {
          const Icon = EVENT_ICONS[event.eventType] || Activity;
          const color = EVENT_COLORS[event.eventType] || "text-muted-foreground";
          const border = SEVERITY_BORDER[event.severity] || "border-l-border/30";

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              className={`w-full text-left px-3 py-2.5 border-l-4 border-b border-border/10 transition-colors hover:bg-muted/40 ${
                selectedId === event.id ? "bg-accent/10 border-l-accent" : border
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                  <span className="text-xs font-medium text-foreground truncate">{event.title}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                  event.severity === "critical" ? "bg-danger/10 text-danger border-danger/20"
                    : event.severity === "high" ? "bg-warning/10 text-warning border-warning/20"
                      : event.severity === "medium" ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-muted text-muted-foreground border-border/50"
                }`}>
                  {event.displaySeverity || event.severity}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-5">
                <span>{event.timestamp}</span>
                {event.linkedResourceName && (
                  <><span className="w-1 h-1 rounded-full bg-border" /><span>{event.linkedResourceName}</span></>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
