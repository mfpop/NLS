import { PanelTop, Clock, Package } from "lucide-react";
import type {
  LiveShopfloorLineSummary,
  LiveShopfloorShiftSummary,
  LiveShopfloorCurrentProduction,
} from "@/types/liveShopfloor";

interface Props {
  lineSummary: LiveShopfloorLineSummary | null;
  shiftSummary: LiveShopfloorShiftSummary | null;
  currentProduction: LiveShopfloorCurrentProduction | null;
}

function StatusDot({ status }: { status: string }) {
  const color = status === "running" || status === "active" ? "bg-success/100"
    : status === "stopped" ? "bg-danger/100"
      : status === "idle" || status === "starved" ? "bg-warning/100"
        : "bg-muted-foreground/40";
  return <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />;
}

export function LineContextPanel({ lineSummary, shiftSummary, currentProduction }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted">
      {/* Line Card */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <PanelTop className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Line</span>
        </div>
        {lineSummary ? (
          <div className="flex items-center gap-2">
            <StatusDot status={lineSummary.status} />
            <span className="text-sm font-semibold text-foreground truncate">{lineSummary.name}</span>
            <span className={`ml-auto inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${
              lineSummary.displayStatus === "Running" ? "border-success/20 bg-success/10 text-success"
                : lineSummary.displayStatus === "Stopped" ? "border-danger/20 bg-danger/10 text-danger"
                  : "border-border bg-muted text-muted-foreground"
            }`}>
              {lineSummary.displayStatus}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No line selected</p>
        )}
      </div>

      {/* Shift Card */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Shift</span>
        </div>
        {shiftSummary ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{shiftSummary.name}</span>
              <span className="text-[10px] text-muted-foreground">{shiftSummary.date}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {shiftSummary.startTime} – {shiftSummary.endTime}
            </div>
            {shiftSummary.elapsedPercent !== null && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>Elapsed</span>
                  <span>{shiftSummary.elapsedPercent}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted/80 overflow-hidden">
                  <div className="h-full rounded-full bg-accent/100" style={{ width: `${shiftSummary.elapsedPercent}%` }} />
                </div>
              </div>
            )}
            {shiftSummary.supervisor && (
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="text-muted-foreground/60">Supervisor:</span>
                <span className="text-muted-foreground font-medium">{shiftSummary.supervisor}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No shift data</p>
        )}
      </div>

      {/* Active Production */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Production</span>
        </div>
        {currentProduction ? (
          <div className="space-y-1">
            {currentProduction.productName && (
              <div className="text-xs font-medium text-foreground truncate" title={currentProduction.productName}>
                {currentProduction.productName}
              </div>
            )}
            {currentProduction.partNumber && (
              <div className="text-[10px] text-muted-foreground truncate">PN: {currentProduction.partNumber}</div>
            )}
            {currentProduction.productionOrderNumber && (
              <div className="text-[10px] text-muted-foreground">Order: {currentProduction.productionOrderNumber}</div>
            )}
            {currentProduction.plannedQuantity !== null && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground tabular-nums">
                  {currentProduction.actualQuantity ?? 0} / {currentProduction.plannedQuantity}
                </span>
              </div>
            )}
            {currentProduction.actualQuantity !== null && currentProduction.plannedQuantity !== null && currentProduction.plannedQuantity > 0 && (
              <div className="h-1 rounded-full bg-muted/80 overflow-hidden">
                <div className="h-full rounded-full bg-success/100"
                  style={{ width: `${Math.min((currentProduction.actualQuantity / currentProduction.plannedQuantity) * 100, 100)}%` }} />
              </div>
            )}
            {currentProduction.routingStep && (
              <div className="text-[10px] text-accent-foreground font-medium">{currentProduction.routingStep}</div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No production data</p>
        )}
      </div>
    </div>
  );
}
