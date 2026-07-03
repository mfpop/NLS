import { Activity, Clock, Package, AlertTriangle, ListChecks, GitBranch, RefreshCw } from "lucide-react";
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

function KpiCard({
  title,
  value,
  icon,
  color,
  helper,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "green" | "amber" | "red" | "blue" | "slate";
  helper?: string;
}) {
  const colorMap = {
    green: { text: "text-emerald-600", icon: "text-emerald-500" },
    amber: { text: "text-amber-600", icon: "text-amber-500" },
    red: { text: "text-red-600", icon: "text-red-500" },
    blue: { text: "text-sky-600", icon: "text-sky-500" },
    slate: { text: "text-slate-600", icon: "text-slate-400" },
  };
  const c = colorMap[color];

  return (
    <div className="flex items-center gap-2 px-3 min-w-0">
      <div className={`shrink-0 ${c.icon}`}>{icon}</div>
      <div className="min-w-0 overflow-hidden">
        <span className="block text-[11px] uppercase tracking-wide text-slate-500 truncate">{title}</span>
        <span className={`block text-lg font-semibold tabular-nums leading-tight truncate ${c.text}`}>{value}</span>
        {helper && <span className="block text-[10px] text-slate-500 leading-tight truncate">{helper}</span>}
      </div>
    </div>
  );
}

export function LiveShopfloorKpiStrip({
  liveStatus,
  activeDowntime,
  bottleneckSignal,
  issueCount,
  actionCount,
  outputCount,
  lastUpdatedAt,
}: Props) {
  const statusColor = liveStatus?.lineStatus === "running" ? "green"
    : liveStatus?.lineStatus === "stopped" ? "red"
      : liveStatus?.lineStatus === "idle" ? "amber" : "slate";

  const downtimeColor = activeDowntime ? "red" : "green";
  const bottleneckColor = bottleneckSignal?.isConstrained ? "amber" : "slate";
  const issueColor = issueCount > 0 ? "amber" : "slate";
  const actionColor = actionCount > 0 ? "blue" : "slate";

  return (
    <div className="grid h-16 grid-cols-7 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
      <KpiCard
        title="Line Status"
        value={liveStatus?.displayStatus ?? "—"}
        icon={<Activity className="h-4 w-4" />}
        color={statusColor}
        helper={liveStatus?.runState ?? undefined}
      />
      <KpiCard
        title="Active Downtime"
        value={activeDowntime ? `${activeDowntime.durationMinutes}m` : "None"}
        icon={<Clock className="h-4 w-4" />}
        color={downtimeColor}
        helper={activeDowntime?.reason ? activeDowntime.reason.length > 40 ? `${activeDowntime.reason.slice(0, 40)}…` : activeDowntime.reason : undefined}
      />
      <KpiCard
        title="Output"
        value={outputCount ?? "—"}
        icon={<Package className="h-4 w-4" />}
        color="slate"
      />
      <KpiCard
        title="Issues"
        value={issueCount}
        icon={<AlertTriangle className="h-4 w-4" />}
        color={issueColor}
      />
      <KpiCard
        title="Actions"
        value={actionCount}
        icon={<ListChecks className="h-4 w-4" />}
        color={actionColor}
      />
      <KpiCard
        title="Bottleneck"
        value={bottleneckSignal?.isConstrained ? "Active" : "None"}
        icon={<GitBranch className="h-4 w-4" />}
        color={bottleneckColor}
        helper={bottleneckSignal?.resourceName ? (bottleneckSignal.resourceName.length > 35 ? `${bottleneckSignal.resourceName.slice(0, 35)}…` : bottleneckSignal.resourceName) : undefined}
      />
      <KpiCard
        title="Updated"
        value={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
        icon={<RefreshCw className="h-4 w-4" />}
        color="slate"
      />
    </div>
  );
}
