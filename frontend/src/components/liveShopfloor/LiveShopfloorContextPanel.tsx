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
    <div className="border-b border-slate-200 last:border-b-0">
      <div className="px-3 py-1.5">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
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
              <span className="text-sm font-semibold text-slate-800">{lineSummary.name}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${
                lineSummary.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                <Circle className={`h-1.5 w-1.5 fill-current ${lineSummary.status === "active" ? "text-emerald-500" : "text-slate-400"}`} />
                {lineSummary.displayStatus || lineSummary.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">{lineSummary.code} · {lineSummary.plantName}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Line context unavailable</p>
        )}
      </Section>

      <Section label="Shift">
        {shiftSummary ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">{shiftSummary.name}</span>
              <span className="text-[10px] text-slate-500">{shiftSummary.date}</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">{shiftSummary.startTime} – {shiftSummary.endTime}</p>
            {shiftSummary.elapsedPercent !== null && (
              <div className="mt-1">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>Elapsed: {shiftSummary.elapsedPercent}%</span>
                  <span className="text-slate-400">·</span>
                  <span>{shiftSummary.remainingMinutes} min left</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mt-0.5">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(shiftSummary.elapsedPercent, 100)}%` }} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-0.5">
              {shiftSummary.supervisor && (
                <span className="flex items-center gap-1"><User className="h-3 w-3 text-slate-400" />{shiftSummary.supervisor}</span>
              )}
              {shiftSummary.crew && (
                <span className="text-slate-400">·</span>
              )}
              {shiftSummary.crew && <span>{shiftSummary.crew}</span>}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Shift data unavailable</p>
        )}
      </Section>

      <Section label="Active Production">
        {currentProduction?.productName ? (
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-800 truncate">{currentProduction.productName}</span>
              {currentProduction.productCode && (
                <span className="text-[10px] text-slate-500 font-mono">({currentProduction.productCode})</span>
              )}
            </div>
            {currentProduction.partNumber && (
              <p className="text-[10px] text-slate-500">Part: {currentProduction.partNumber}</p>
            )}
            {currentProduction.productionOrderNumber && (
              <p className="text-[10px] text-slate-500">Order: {currentProduction.productionOrderNumber}</p>
            )}
            {currentProduction.plannedQuantity !== null && (
              <div className="mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold tabular-nums text-slate-800">{currentProduction.actualQuantity ?? 0}</span>
                  <span className="text-[10px] text-slate-500">/ {currentProduction.plannedQuantity}</span>
                </div>
                {currentProduction.plannedQuantity > 0 && (
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(((currentProduction.actualQuantity ?? 0) / currentProduction.plannedQuantity) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {currentProduction.operationName && (
              <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                {currentProduction.routingStep ? `${currentProduction.routingStep}: ` : ""}{currentProduction.operationName}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs text-slate-500">No active production</p>
          </div>
        )}
      </Section>
    </div>
  );
}
