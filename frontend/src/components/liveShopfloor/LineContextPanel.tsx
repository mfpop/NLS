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
  const color = status === "running" || status === "active" ? "bg-emerald-500"
    : status === "stopped" ? "bg-red-500"
      : status === "idle" || status === "starved" ? "bg-amber-500"
        : "bg-slate-400";
  return <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />;
}

export function LineContextPanel({ lineSummary, shiftSummary, currentProduction }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
      {/* Line Card */}
      <div className="px-3 py-2 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <PanelTop className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Line</span>
        </div>
        {lineSummary ? (
          <div className="flex items-center gap-2">
            <StatusDot status={lineSummary.status} />
            <span className="text-sm font-semibold text-slate-900 truncate">{lineSummary.name}</span>
            <span className={`ml-auto inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${
              lineSummary.displayStatus === "Running" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : lineSummary.displayStatus === "Stopped" ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
            }`}>
              {lineSummary.displayStatus}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No line selected</p>
        )}
      </div>

      {/* Shift Card */}
      <div className="px-3 py-2 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Shift</span>
        </div>
        {shiftSummary ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800">{shiftSummary.name}</span>
              <span className="text-[10px] text-slate-500">{shiftSummary.date}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {shiftSummary.startTime} – {shiftSummary.endTime}
            </div>
            {shiftSummary.elapsedPercent !== null && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                  <span>Elapsed</span>
                  <span>{shiftSummary.elapsedPercent}%</span>
                </div>
                <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${shiftSummary.elapsedPercent}%` }} />
                </div>
              </div>
            )}
            {shiftSummary.supervisor && (
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span className="text-slate-400">Supervisor:</span>
                <span className="text-slate-700 font-medium">{shiftSummary.supervisor}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No shift data</p>
        )}
      </div>

      {/* Active Production */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Production</span>
        </div>
        {currentProduction ? (
          <div className="space-y-1">
            {currentProduction.productName && (
              <div className="text-xs font-medium text-slate-800 truncate" title={currentProduction.productName}>
                {currentProduction.productName}
              </div>
            )}
            {currentProduction.partNumber && (
              <div className="text-[10px] text-slate-500 truncate">PN: {currentProduction.partNumber}</div>
            )}
            {currentProduction.productionOrderNumber && (
              <div className="text-[10px] text-slate-500">Order: {currentProduction.productionOrderNumber}</div>
            )}
            {currentProduction.plannedQuantity !== null && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Progress</span>
                <span className="font-medium text-slate-800 tabular-nums">
                  {currentProduction.actualQuantity ?? 0} / {currentProduction.plannedQuantity}
                </span>
              </div>
            )}
            {currentProduction.actualQuantity !== null && currentProduction.plannedQuantity !== null && currentProduction.plannedQuantity > 0 && (
              <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min((currentProduction.actualQuantity / currentProduction.plannedQuantity) * 100, 100)}%` }} />
              </div>
            )}
            {currentProduction.routingStep && (
              <div className="text-[10px] text-sky-700 font-medium">{currentProduction.routingStep}</div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No production data</p>
        )}
      </div>
    </div>
  );
}
