import { AlertTriangle, Gauge } from "lucide-react";
import type { LiveShopfloorResourceGroupStatusSummary } from "@/types/liveShopfloor";

interface Props {
  summary: LiveShopfloorResourceGroupStatusSummary | null;
}

interface StatusCount {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

export function ResourceGroupStatusSummary({ summary }: Props) {
  if (!summary) {
    return null;
  }

  const items: StatusCount[] = [
    {
      label: "Running",
      count: summary.runningCount,
      color: "text-success",
      bgColor: "bg-success/8",
      borderColor: "border-success/15",
      dotColor: "bg-success",
    },
    {
      label: "Stopped",
      count: summary.stoppedCount,
      color: "text-danger",
      bgColor: "bg-danger/8",
      borderColor: "border-danger/15",
      dotColor: "bg-danger",
    },
    {
      label: "Blocked",
      count: summary.blockedCount,
      color: "text-warning",
      bgColor: "bg-warning/8",
      borderColor: "border-warning/15",
      dotColor: "bg-warning",
    },
    {
      label: "Starved",
      count: summary.starvedCount,
      color: "text-accent",
      bgColor: "bg-accent/8",
      borderColor: "border-accent/15",
      dotColor: "bg-accent",
    },
    {
      label: "Maint.",
      count: summary.maintenanceCount,
      color: "text-muted-foreground",
      bgColor: "bg-muted/40",
      borderColor: "border-border/30",
      dotColor: "bg-muted-foreground",
    },
    {
      label: "Unknown",
      count: summary.unknownCount,
      color: "text-muted-foreground",
      bgColor: "bg-muted/40",
      borderColor: "border-border/30",
      dotColor: "bg-muted-foreground",
    },
  ];

  const hasActive = items.some((i) => i.count > 0);

  if (!hasActive) {
    return null;
  }

  return (
    <div className="px-4">
      <div className="rounded-md border border-border/40 bg-card p-2.5">
        <div className="flex items-center gap-2 mb-2">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-wide">
            Resource Group Status
          </h3>
          {summary.activeBottleneckResource && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium text-warning border border-warning/20">
              <AlertTriangle className="h-2.5 w-2.5" />
              {summary.activeBottleneckResource}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {items.map((item) =>
            item.count > 0 ? (
              <div
                key={item.label}
                className={`flex flex-1 items-center gap-1.5 rounded px-2 py-1 border ${item.borderColor} ${item.bgColor}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${item.dotColor}`} />
                <span className="text-[10px] font-semibold tabular-nums text-foreground">
                  {item.count}
                </span>
                <span className={`text-[9px] ${item.color}`}>{item.label}</span>
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
