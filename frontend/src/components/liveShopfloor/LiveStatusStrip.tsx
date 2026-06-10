import { Activity, AlertTriangle, ListChecks, Clock, GitBranch, Package } from "lucide-react";
import { LiveStatusCard } from "./LiveStatusCard";
import type { LiveShopfloorLiveStatus, LiveShopfloorActiveDowntime, LiveShopfloorBottleneckSignal } from "@/types/liveShopfloor";

interface Props {
  liveStatus: LiveShopfloorLiveStatus | null;
  activeDowntime: LiveShopfloorActiveDowntime | null;
  bottleneckSignal: LiveShopfloorBottleneckSignal | null;
  issueCount: number;
  actionCount: number;
  outputCount: number | null;
}

function mapLineStatus(status: string): "running" | "stopped" | "blocked" | "starved" | "maintenance" | "changeover" | "unknown" {
  if (status === "running") return "running";
  if (status === "stopped") return "stopped";
  if (status === "blocked") return "blocked";
  if (status === "starved") return "starved";
  if (status === "maintenance") return "maintenance";
  if (status === "changeover") return "changeover";
  return "unknown";
}

export function LiveStatusStrip({ liveStatus, activeDowntime, bottleneckSignal, issueCount, actionCount, outputCount }: Props) {
  if (!liveStatus) {
    return (
      <div className="flex gap-3 px-4 pt-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 h-20 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 pt-3">
      <LiveStatusCard
        title="Line Status"
        value={liveStatus.displayStatus || liveStatus.lineStatus}
        status={mapLineStatus(liveStatus.lineStatus)}
        icon={<Activity className="h-4 w-4" />}
      />
      <LiveStatusCard
        title={activeDowntime ? "Active Downtime" : "Run State"}
        value={activeDowntime ? activeDowntime.reason : liveStatus.runState || "No active event"}
        status={activeDowntime ? "critical" : mapLineStatus(liveStatus.lineStatus)}
        icon={<Clock className="h-4 w-4" />}
      />
      <LiveStatusCard
        title="Current Output"
        value={outputCount !== null ? String(outputCount) : "—"}
        status={mapLineStatus(liveStatus.lineStatus)}
        icon={<Package className="h-4 w-4" />}
      />
      <LiveStatusCard
        title="Issues"
        value={String(issueCount)}
        status={issueCount > 0 ? "warning" : "good"}
        icon={<AlertTriangle className="h-4 w-4" />}
      />
      <LiveStatusCard
        title="Actions"
        value={String(actionCount)}
        status={actionCount > 0 ? "active" : "good"}
        icon={<ListChecks className="h-4 w-4" />}
      />
      <LiveStatusCard
        title={bottleneckSignal?.isConstrained ? "Bottleneck" : "Constraint"}
        value={bottleneckSignal?.resourceName || "No constraint"}
        status={bottleneckSignal?.isConstrained ? "warning" : "good"}
        icon={<GitBranch className="h-4 w-4" />}
      />
    </div>
  );
}
