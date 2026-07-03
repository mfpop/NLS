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
  lastUpdatedAt: string | null;
}

export function LiveStatusStrip({ liveStatus, activeDowntime, bottleneckSignal, issueCount, actionCount, outputCount, lastUpdatedAt }: Props) {
  if (!liveStatus) {
    return (
      <div className="grid grid-cols-7 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50 h-16">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center px-3 animate-pulse">
            <div className="h-8 w-full rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  const lineCritical = activeDowntime ? "critical" :
    liveStatus.lineStatus === "running" ? "good" :
    liveStatus.lineStatus === "stopped" || liveStatus.lineStatus === "blocked" ? "critical" :
    liveStatus.lineStatus === "starved" || liveStatus.lineStatus === "maintenance" ? "warning" : "neutral";

  return (
    <div className="grid grid-cols-7 divide-x divide-slate-300 border-b border-slate-300 bg-slate-50">
      <LiveStatusCard
        title="Line Status"
        value={liveStatus.displayStatus || liveStatus.lineStatus}
        critical={lineCritical}
        icon={<Activity className="h-4 w-4" />}
      />
      <LiveStatusCard
        title={activeDowntime ? "Active Downtime" : "Run State"}
        value={activeDowntime ? activeDowntime.reason : liveStatus.runState || "No active event"}
        critical={activeDowntime ? "critical" : lineCritical}
        icon={<Clock className="h-4 w-4" />}
      />
      <LiveStatusCard
        title="Current Output"
        value={outputCount !== null ? String(outputCount) : "—"}
        critical={outputCount !== null && outputCount > 0 ? "good" : "neutral"}
        icon={<Package className="h-4 w-4" />}
      />
      <LiveStatusCard
        title="Issues"
        value={String(issueCount)}
        critical={issueCount > 0 ? "warning" : "good"}
        icon={<AlertTriangle className="h-4 w-4" />}
      />
      <LiveStatusCard
        title="Actions"
        value={String(actionCount)}
        critical={actionCount > 0 ? "warning" : "good"}
        icon={<ListChecks className="h-4 w-4" />}
      />
      <LiveStatusCard
        title={bottleneckSignal?.isConstrained ? "Bottleneck" : "Constraint"}
        value={bottleneckSignal?.resourceName ? "Active" : "No constraint"}
        critical={bottleneckSignal?.isConstrained ? "warning" : "good"}
        icon={<GitBranch className="h-4 w-4" />}
      />
      <LiveStatusCard
        title="Last Updated"
        value={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
        critical="neutral"
        icon={<Clock className="h-4 w-4" />}
        className="text-right justify-self-end"
        valueClassName="text-right"
      />
    </div>
  );
}
