import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { QualitySummary } from "@/types/linePerformance";

interface Props {
  data: QualitySummary | null;
  onCreateIssue?: () => void;
}

export function QualitySignalPanel({ data, onCreateIssue }: Props) {
  if (!data) {
    return (
      <div className="p-4">
        <p className="text-xs text-muted-foreground">Quality data unavailable</p>
      </div>
    );
  }

  const fpyStatus = data.firstPassYield !== null
    ? data.firstPassYield >= 0.98 ? "good"
      : data.firstPassYield >= 0.95 ? "warning"
        : "critical"
    : "neutral";

  const statusColor = fpyStatus === "good"
    ? "text-success"
    : fpyStatus === "warning"
      ? "text-warning"
      : fpyStatus === "critical"
        ? "text-danger"
        : "text-muted-foreground";

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Quality</h3>
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <span className="text-[10px] text-muted-foreground block">Good</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{data.goodQuantity}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Rejected</span>
          <span className="text-lg font-bold tabular-nums text-danger">{data.rejectedQuantity}</span>
        </div>
        {data.reworkQuantity !== null && (
          <div>
            <span className="text-[10px] text-muted-foreground block">Rework</span>
            <span className="text-lg font-bold tabular-nums text-warning">{data.reworkQuantity}</span>
          </div>
        )}
        {data.scrapQuantity !== null && (
          <div>
            <span className="text-[10px] text-muted-foreground block">Scrap</span>
            <span className="text-lg font-bold tabular-nums text-danger">{data.scrapQuantity}</span>
          </div>
        )}
        <div>
          <span className="text-[10px] text-muted-foreground block">First Pass Yield</span>
          <span className={`text-lg font-bold tabular-nums ${statusColor}`}>
            {data.firstPassYield !== null ? `${(data.firstPassYield * 100).toFixed(1)}%` : "—"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Defects</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{data.defectCount}</span>
        </div>
      </div>

      {data.topDefectReason && (
        <div className="flex items-center gap-2 rounded-md bg-warning/5 border border-warning/20 p-2 mb-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground">Top defect: </span>
            <span className="text-[10px] font-medium text-foreground">{data.topDefectReason}</span>
          </div>
        </div>
      )}

      {onCreateIssue && data.linkedIssueCount > 0 && (
        <p className="text-[10px] text-muted-foreground">{data.linkedIssueCount} quality issue(s) linked</p>
      )}
    </div>
  );
}
