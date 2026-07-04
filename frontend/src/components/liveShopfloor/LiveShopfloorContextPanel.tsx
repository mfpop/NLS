import { User, AlertTriangle, Circle } from "lucide-react";
import type { ReactNode } from "react";
import type { LiveShopfloorLineSummary, LiveShopfloorShiftSummary, LiveShopfloorCurrentProduction } from "@/types/liveShopfloor";

interface Props {
  lineSummary: LiveShopfloorLineSummary | null;
  shiftSummary: LiveShopfloorShiftSummary | null;
  currentProduction: LiveShopfloorCurrentProduction | null;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="px-3 py-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function LiveShopfloorContextPanel({ lineSummary, shiftSummary, currentProduction }: Props) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Section label="Line">
        {lineSummary ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{lineSummary.name}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${
                lineSummary.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border"
              }`}>
                <Circle className={`h-1.5 w-1.5 fill-current ${lineSummary.status === "active" ? "text-success" : "text-muted-foreground/60"}`} />
                {lineSummary.displayStatus || lineSummary.status}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">{lineSummary.code} · {lineSummary.plantName}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Line context unavailable</p>
        )}
      </Section>

      <Section label="Shift">
        {shiftSummary ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{shiftSummary.name}</span>
              <span className="text-[10px] text-muted-foreground">{shiftSummary.date}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">{shiftSummary.startTime} – {shiftSummary.endTime}</p>
            {shiftSummary.elapsedPercent !== null && (
              <div className="mt-1">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>Elapsed: {shiftSummary.elapsedPercent}%</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{shiftSummary.remainingMinutes} min left</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden mt-0.5">
                  <div className="h-full rounded-full bg-accent/100" style={{ width: `${Math.min(shiftSummary.elapsedPercent, 100)}%` }} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
              {shiftSummary.supervisor && (
                <span className="flex items-center gap-1"><User className="h-3 w-3 text-muted-foreground/60" />{shiftSummary.supervisor}</span>
              )}
              {shiftSummary.crew && (
                <span className="text-muted-foreground/60">·</span>
              )}
              {shiftSummary.crew && <span>{shiftSummary.crew}</span>}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Shift data unavailable</p>
        )}
      </Section>

      <Section label="Active Production">
        {currentProduction?.productName ? (
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-foreground truncate">{currentProduction.productName}</span>
              {currentProduction.productCode && (
                <span className="text-[10px] text-muted-foreground font-mono">({currentProduction.productCode})</span>
              )}
            </div>
            {currentProduction.partNumber && (
              <p className="text-[10px] text-muted-foreground">Part: {currentProduction.partNumber}</p>
            )}
            {currentProduction.productionOrderNumber && (
              <p className="text-[10px] text-muted-foreground">Order: {currentProduction.productionOrderNumber}</p>
            )}
            {currentProduction.plannedQuantity !== null && (
              <div className="mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold tabular-nums text-foreground">{currentProduction.actualQuantity ?? 0}</span>
                  <span className="text-[10px] text-muted-foreground">/ {currentProduction.plannedQuantity}</span>
                </div>
                {currentProduction.plannedQuantity > 0 && (
                  <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full bg-success/100"
                      style={{ width: `${Math.min(((currentProduction.actualQuantity ?? 0) / currentProduction.plannedQuantity) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {currentProduction.operationName && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {currentProduction.routingStep ? `${currentProduction.routingStep}: ` : ""}{currentProduction.operationName}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <p className="text-xs text-muted-foreground">No active production</p>
          </div>
        )}
      </Section>
    </div>
  );
}
