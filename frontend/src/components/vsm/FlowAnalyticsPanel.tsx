import { X, Lightbulb } from "lucide-react";
import type { VsmDiagram } from "@/types/vsm";

interface Props {
  diagram: VsmDiagram;
  onClose: () => void;
}

export function FlowAnalyticsPanel({ diagram, onClose }: Props) {
  const nodes = diagram.processNodes;
  const bottleneck = nodes.find((n) => n.isBottleneck);
  const largestWip = [...nodes].sort((a, b) => b.wipAfter - a.wipAfter)[0];
  const slowestProcess = [...nodes].sort((a, b) => b.cycleTimeSeconds - a.cycleTimeSeconds)[0];
  const highVariability = [...nodes]
    .filter((n) => n.defectRate !== null)
    .sort((a, b) => (b.defectRate ?? 0) - (a.defectRate ?? 0))[0];

  const totalWip = nodes.reduce((sum, n) => sum + n.wipBefore + n.wipAfter, 0);
  const vaPct = diagram.totalLeadTimeMinutes > 0
    ? Math.round((diagram.totalValueAddMinutes / diagram.totalLeadTimeMinutes) * 100)
    : 0;

  return (
    <div className="w-[360px] shrink-0 border-l border-border bg-muted flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flow Analytics</h3>
        <button type="button" onClick={onClose}
          className="text-muted-foreground/60 hover:text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs">
        {/* ── Totals Section ── */}
        <div>
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Totals</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-border bg-background px-2.5 py-2">
              <span className="text-[10px] text-muted-foreground block">Lead Time</span>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {diagram.totalLeadTimeMinutes >= 1440
                  ? `${(diagram.totalLeadTimeMinutes / 1440).toFixed(1)}d`
                  : `${diagram.totalLeadTimeMinutes}min`}
              </p>
            </div>
            <div className="rounded border border-border bg-background px-2.5 py-2">
              <span className="text-[10px] text-muted-foreground block">VA Time</span>
              <p className="text-sm font-bold text-success tabular-nums">
                {diagram.totalValueAddMinutes >= 1440
                  ? `${(diagram.totalValueAddMinutes / 1440).toFixed(1)}d`
                  : `${diagram.totalValueAddMinutes}min`}
              </p>
            </div>
            <div className="rounded border border-border bg-background px-2.5 py-2">
              <span className="text-[10px] text-muted-foreground block">VA %</span>
              <p className={`text-sm font-bold tabular-nums ${vaPct < 10 ? "text-danger" : vaPct < 30 ? "text-warning" : "text-success"}`}>
                {vaPct}%
              </p>
            </div>
            <div className="rounded border border-border bg-background px-2.5 py-2">
              <span className="text-[10px] text-muted-foreground block">Total WIP</span>
              <p className="text-sm font-bold text-foreground tabular-nums">{totalWip}</p>
            </div>
          </div>
        </div>

        {/* ── Key Issues ── */}
        <div>
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Issues</h4>
          <div className="space-y-2">
            {/* Bottleneck */}
            {bottleneck && (
              <div className="rounded border border-warning/20 bg-warning/10 px-2.5 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="h-2 w-2 rounded-full bg-warning/100" />
                  <span className="text-[10px] font-semibold text-warning uppercase tracking-wide">Bottleneck</span>
                </div>
                <p className="text-[10px] font-medium text-foreground">{bottleneck.label}</p>
                <p className="text-[10px] text-muted-foreground">CT: {bottleneck.cycleTimeSeconds}s · WIP: {bottleneck.wipAfter}</p>
                <p className="text-[10px] text-warning mt-0.5">Reduce cycle time or rebalance workload across downstream stations.</p>
              </div>
            )}

            {/* Largest queue */}
            {largestWip && largestWip.wipAfter > 0 && (
              <div className="flex items-start gap-2 px-2.5 py-2 rounded border border-border bg-background">
                <div className="h-2 w-2 rounded-full bg-warning/100 shrink-0 mt-1" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-muted-foreground">Largest Queue</span>
                  <p className="text-[10px] text-foreground font-medium">{largestWip.label}</p>
                  <p className="text-[10px] text-muted-foreground">{largestWip.wipAfter} units queued (norm: ~30)</p>
                </div>
              </div>
            )}

            {/* Slowest process */}
            {slowestProcess && (
              <div className="flex items-start gap-2 px-2.5 py-2 rounded border border-border bg-background">
                <div className="h-2 w-2 rounded-full bg-accent/100 shrink-0 mt-1" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-muted-foreground">Slowest Step</span>
                  <p className="text-[10px] text-foreground font-medium">{slowestProcess.label}</p>
                  <p className="text-[10px] text-muted-foreground">CT: {slowestProcess.cycleTimeSeconds}s</p>
                </div>
              </div>
            )}

            {/* High variability */}
            {highVariability && highVariability.defectRate !== null && highVariability.defectRate > 1 && (
              <div className="flex items-start gap-2 px-2.5 py-2 rounded border border-border bg-background">
                <div className="h-2 w-2 rounded-full bg-danger/100 shrink-0 mt-1" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-muted-foreground">High Defect Rate</span>
                  <p className="text-[10px] text-foreground font-medium">{highVariability.label}</p>
                  <p className="text-[10px] text-muted-foreground">{highVariability.defectRate}% defect rate</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Insights ── */}
        <div>
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Insights</h4>
          <div className="space-y-1.5">
            {bottleneck && (
              <InsightCard text={`Lead time is driven primarily by queue buildup at ${bottleneck.label}`} />
            )}
            {vaPct < 30 && (
              <InsightCard text={`Only ${vaPct}% of total lead time is value-added — high NVA indicates significant waste in waiting and queues.`} />
            )}
            {largestWip && largestWip.wipAfter > 100 && (
              <InsightCard text={`Excessive WIP at ${largestWip.label} (${largestWip.wipAfter} units) indicates flow imbalance.`} />
            )}
            {!bottleneck && !largestWip && (
              <InsightCard text="Flow appears balanced. Monitor cycle times and WIP levels for early constraint detection." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 rounded border border-border bg-background px-2 py-1.5">
      <span className="shrink-0 mt-0.5 text-accent-foreground"><Lightbulb className="h-3 w-3" /></span>
      <p className="text-[10px] text-muted-foreground leading-tight">{text}</p>
    </div>
  );
}
