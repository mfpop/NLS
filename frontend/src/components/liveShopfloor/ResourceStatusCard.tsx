import { Circle } from "lucide-react";
import type { LiveShopfloorResourceStatus } from "@/types/liveShopfloor";

interface Props {
  resource: LiveShopfloorResourceStatus;
  onOpenDetail?: (id: string) => void;
  onCreateIssue?: (id: string) => void;
  onLogDowntime?: (id: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  running: "text-success",
  idle: "text-muted-foreground",
  stopped: "text-danger",
  blocked: "text-danger",
  starved: "text-warning",
  maintenance: "text-warning",
  changeover: "text-accent",
  unknown: "text-muted-foreground",
};

const STATUS_BG: Record<string, string> = {
  running: "border-l-success/40 bg-success/5",
  idle: "border-l-border/40 bg-card",
  stopped: "border-l-danger/40 bg-danger/5",
  blocked: "border-l-danger/40 bg-danger/5",
  starved: "border-l-warning/40 bg-warning/5",
  maintenance: "border-l-warning/40 bg-warning/5",
  changeover: "border-l-accent/40 bg-accent/5",
  unknown: "border-l-border/40 bg-muted/30",
};

export function ResourceStatusCard({ resource, onOpenDetail, onCreateIssue, onLogDowntime }: Props) {
  const dotColor = STATUS_DOT[resource.status] || STATUS_DOT.unknown;
  const cardBg = STATUS_BG[resource.status] || STATUS_BG.unknown;

  return (
    <div className={`rounded border border-border/50 border-l-4 p-3 ${cardBg} hover:bg-muted/20 transition-colors`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <Circle className={`h-3 w-3 fill-current ${dotColor}`} />
          <span className="text-xs font-semibold text-foreground truncate">{resource.name}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{resource.code}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
          resource.status === "running" ? "bg-success/10 text-success border-success/20"
            : resource.status === "stopped" || resource.status === "blocked" ? "bg-danger/10 text-danger border-danger/20"
              : resource.status === "starved" || resource.status === "maintenance" ? "bg-warning/10 text-warning border-warning/20"
                : "bg-muted text-muted-foreground border-border/50"
        }`}>
          {resource.displayStatus || resource.status}
        </span>
      </div>
      {resource.currentOperation && (
        <p className="text-[10px] text-muted-foreground truncate ml-5">
          {resource.currentOperation}
        </p>
      )}
      {resource.activeDowntimeReason && (
        <p className="text-[10px] text-danger ml-5 mt-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
          {resource.activeDowntimeReason}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1.5 ml-5">
        {onOpenDetail && (
          <button type="button" onClick={() => onOpenDetail(resource.id)} className="text-[10px] text-accent hover:underline">Detail</button>
        )}
        {onCreateIssue && (
          <button type="button" onClick={() => onCreateIssue(resource.id)} className="text-[10px] text-accent hover:underline">Issue</button>
        )}
        {onLogDowntime && (
          <button type="button" onClick={() => onLogDowntime(resource.id)} className="text-[10px] text-accent hover:underline">Log Downtime</button>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">{resource.lastUpdated}</span>
      </div>
    </div>
  );
}
