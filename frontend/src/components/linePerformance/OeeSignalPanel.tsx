import { Activity } from "lucide-react";
import type { OeeSignal } from "@/types/linePerformance";

interface Props {
  data: OeeSignal | null;
}

function OeeBar({ label, value, status }: { label: string; value: number | null; status: string }) {
  const isAvail = value !== null;
  const barColor = status === "good" ? "bg-success/100"
    : status === "warning" ? "bg-warning/100"
      : status === "critical" ? "bg-danger/100" : "bg-muted-foreground/30";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted/80 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`}
          style={{ width: isAvail ? `${value * 100}%` : "0%" }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground w-10 text-right shrink-0">
        {isAvail ? `${(value * 100).toFixed(0)}%` : "—"}
      </span>
    </div>
  );
}

export function OeeSignalPanel({ data }: Props) {
  if (!data || (data.overall === null && data.availability === null)) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">OEE signal unavailable</p>
      </div>
    );
  }

  const overallColor = data.overallStatus === "good" ? "text-success"
    : data.overallStatus === "warning" ? "text-warning"
      : data.overallStatus === "critical" ? "text-danger" : "text-muted-foreground";

  const overallBarColor = data.overallStatus === "good" ? "bg-success/100"
    : data.overallStatus === "warning" ? "bg-warning/100"
      : data.overallStatus === "critical" ? "bg-danger/100" : "bg-muted-foreground/30";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">OEE Signal</h3>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-3 py-1.5">
        {/* Large OEE value */}
        <div className="flex flex-col items-center mb-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Overall OEE</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold tabular-nums ${overallColor}`}>
              {data.overall !== null ? `${(data.overall * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
          {data.overall !== null && (
            <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden mt-1 max-w-[200px]">
              <div className={`h-full rounded-full ${overallBarColor}`}
                style={{ width: `${data.overall * 100}%` }} />
            </div>
          )}
        </div>

        {/* Sub-bars */}
        <div className="space-y-1 mb-1.5">
          <OeeBar label="Availability" value={data.availability} status={data.availabilityStatus} />
          <OeeBar label="Performance" value={data.performance} status={data.performanceStatus} />
          <OeeBar label="Quality" value={data.quality} status={data.qualityStatus} />
        </div>

        {/* Explanation */}
        {data.explanation && (
          <p className="text-[10px] text-muted-foreground border-t border-border pt-1 mt-1 leading-tight truncate" title={data.explanation}>
            {data.explanation}
          </p>
        )}
      </div>
    </div>
  );
}
