import { Activity, HelpCircle } from "lucide-react";
import type { OeeSignal } from "@/types/linePerformance";

interface Props {
  data: OeeSignal | null;
}

function OeeGauge({ label, value, status }: { label: string; value: number | null; status: string }) {
  const isAvailable = value !== null;
  const statusColor = status === "good"
    ? "text-success"
    : status === "warning"
      ? "text-warning"
      : status === "critical"
        ? "text-danger"
        : "text-muted-foreground";

  const barColor = status === "good"
    ? "bg-success"
    : status === "warning"
      ? "bg-warning"
      : status === "critical"
        ? "bg-danger"
        : "bg-muted-foreground";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${statusColor}`}>
        {isAvailable ? `${(value * 100).toFixed(1)}%` : "—"}
      </span>
      {isAvailable && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${value * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export function OeeSignalPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="rounded-md border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">OEE signal unavailable</p>
        </div>
      </div>
    );
  }

  const hasAnyValue = data.overall !== null || data.availability !== null || data.performance !== null || data.quality !== null;

  if (!hasAnyValue) {
    return (
      <div className="rounded-md border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">OEE signal unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">OEE Signal</h3>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="col-span-2 flex flex-col items-center justify-center py-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Overall OEE</span>
          <span className={`text-3xl font-bold tabular-nums ${
            data.overallStatus === "good" ? "text-success"
              : data.overallStatus === "warning" ? "text-warning"
                : data.overallStatus === "critical" ? "text-danger"
                  : "text-muted-foreground"
          }`}>
            {data.overall !== null ? `${(data.overall * 100).toFixed(1)}%` : "—"}
          </span>
          {data.overall !== null && (
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-2">
              <div className={`h-full rounded-full ${
                data.overallStatus === "good" ? "bg-success"
                  : data.overallStatus === "warning" ? "bg-warning"
                    : data.overallStatus === "critical" ? "bg-danger"
                      : "bg-muted-foreground"
              }`} style={{ width: `${data.overall * 100}%` }} />
            </div>
          )}
        </div>
        <OeeGauge label="Availability" value={data.availability} status={data.availabilityStatus} />
        <OeeGauge label="Performance" value={data.performance} status={data.performanceStatus} />
        <OeeGauge label="Quality" value={data.quality} status={data.qualityStatus} />
      </div>

      {data.explanation && (
        <p className="text-[10px] text-muted-foreground border-t border-border/20 pt-2 mt-2">{data.explanation}</p>
      )}
    </div>
  );
}
