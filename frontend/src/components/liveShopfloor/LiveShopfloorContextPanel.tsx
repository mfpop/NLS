import { Clock, Calendar, User, Package, AlertTriangle, Circle } from "lucide-react";
import type { LiveShopfloorLineSummary, LiveShopfloorShiftSummary, LiveShopfloorCurrentProduction } from "@/types/liveShopfloor";

interface Props {
  lineSummary: LiveShopfloorLineSummary | null;
  shiftSummary: LiveShopfloorShiftSummary | null;
  currentProduction: LiveShopfloorCurrentProduction | null;
}

export function LiveShopfloorContextPanel({ lineSummary, shiftSummary, currentProduction }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Line Context */}
      <div className="px-4 py-3 border-b border-border/20">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Line</span>
        {lineSummary ? (
          <div>
            <span className="text-sm font-semibold text-foreground">{lineSummary.name}</span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
              <span>{lineSummary.code}</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{lineSummary.plantName}</span>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium mt-1 border ${
              lineSummary.status === "active" ? "bg-success/10 text-success border-success/20"
                : "bg-muted text-muted-foreground border-border/50"
            }`}>
              <Circle className={`h-2 w-2 fill-current ${lineSummary.status === "active" ? "text-success" : "text-muted-foreground"}`} />
              {lineSummary.displayStatus || lineSummary.status}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Line context unavailable</p>
        )}
      </div>

      {/* Shift Summary */}
      <div className="px-4 py-3 border-b border-border/20">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
          <Clock className="h-3 w-3 inline mr-1" />
          Shift
        </span>
        {shiftSummary ? (
          <div>
            <span className="text-xs font-semibold text-foreground">{shiftSummary.name}</span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3" />
              <span>{shiftSummary.date}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {shiftSummary.startTime} – {shiftSummary.endTime}
            </div>
            {shiftSummary.elapsedPercent !== null && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>Elapsed</span>
                  <span>{shiftSummary.elapsedPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(shiftSummary.elapsedPercent, 100)}%` }} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
              {shiftSummary.supervisor && (
                <><User className="h-3 w-3" /><span>{shiftSummary.supervisor}</span></>
              )}
              {shiftSummary.crew && (
                <><span className="w-1 h-1 rounded-full bg-border" /><span>{shiftSummary.crew}</span></>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Shift data unavailable</p>
        )}
      </div>

      {/* Current Production */}
      <div className="px-4 py-3 border-b border-border/20">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
          <Package className="h-3 w-3 inline mr-1" />
          Active Production
        </span>
        {currentProduction?.productName ? (
          <div>
            <span className="text-xs font-semibold text-foreground">{currentProduction.productName}</span>
            {currentProduction.productCode && (
              <span className="text-[10px] text-muted-foreground ml-1 font-mono">({currentProduction.productCode})</span>
            )}
            {currentProduction.partNumber && (
              <div className="text-[10px] text-muted-foreground">Part: {currentProduction.partNumber}</div>
            )}
            {currentProduction.productionOrderNumber && (
              <div className="text-[10px] text-muted-foreground">Order: {currentProduction.productionOrderNumber}</div>
            )}
            {currentProduction.plannedQuantity !== null && (
              <div className="flex items-center gap-1 text-[10px] mt-1">
                <span className="text-foreground font-medium">{currentProduction.actualQuantity ?? 0}</span>
                <span className="text-muted-foreground">/ {currentProduction.plannedQuantity}</span>
              </div>
            )}
            {currentProduction.operationName && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Step: {currentProduction.routingStep || ""} {currentProduction.operationName}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <p className="text-xs text-muted-foreground">No active production</p>
          </div>
        )}
      </div>

      {/* Resource Group Status Summary */}
      {!lineSummary && (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-muted-foreground text-center">Select a production line to view live shopfloor status</p>
        </div>
      )}
    </div>
  );
}
