import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { QualitySummary } from "@/types/linePerformance";

interface Props {
  qualitySummary: QualitySummary | null;
}

export function QualitySummaryPanel({ qualitySummary }: Props) {
  if (!qualitySummary) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[10px] text-muted-foreground">Quality data unavailable</p>
      </div>
    );
  }

  const fpyStatus = qualitySummary.firstPassYield !== null
    ? qualitySummary.firstPassYield >= 0.98 ? "good"
      : qualitySummary.firstPassYield >= 0.95 ? "warning" : "critical"
    : "neutral";

  const total = qualitySummary.goodQuantity + qualitySummary.rejectedQuantity;
  const rejectPct = total > 0 ? Math.round((qualitySummary.rejectedQuantity / total) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Quality</h3>
        </div>
      </div>

      {/* Body — compact summary: FPY, Good, Reject, Top defect only */}
      <div className="flex-1 min-h-0 px-3 py-1.5">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground block">FPY</span>
            <p className={`text-base font-bold tabular-nums ${
              fpyStatus === "good" ? "text-success"
                : fpyStatus === "warning" ? "text-warning"
                  : fpyStatus === "critical" ? "text-danger" : "text-foreground"
            }`}>
              {qualitySummary.firstPassYield !== null ? `${(qualitySummary.firstPassYield * 100).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Good</span>
            <p className="text-base font-bold text-foreground tabular-nums">{qualitySummary.goodQuantity}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Reject</span>
            <p className="text-base font-bold text-danger tabular-nums">{qualitySummary.rejectedQuantity}</p>
            {rejectPct > 0 && (
              <span className="text-[10px] text-muted-foreground">{rejectPct}%</span>
            )}
          </div>
        </div>

        {/* Reject rate bar */}
        {total > 0 && (
          <div className="my-1.5">
            <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-danger/100"
                style={{ width: `${Math.min(rejectPct * 5, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Top defect */}
        {qualitySummary.topDefectReason && (
          <div className="flex items-start gap-1.5 rounded border border-warning/20 bg-warning/10 px-1.5 py-1">
            <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
            <span className="text-[10px] text-muted-foreground leading-tight">{qualitySummary.topDefectReason}</span>
          </div>
        )}
      </div>
    </div>
  );
}
