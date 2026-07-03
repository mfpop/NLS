// ── Business Impact Drawer — slide-in panel for VSM business impact data ──

import { X } from "lucide-react";
import type { BusinessImpactModel } from "./vsmTemplateTypes";

interface Props {
  impact: BusinessImpactModel;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  GOOD: "text-emerald-600 bg-emerald-50 border-emerald-200",
  WARNING: "text-amber-600 bg-amber-50 border-amber-200",
  CRITICAL: "text-red-600 bg-red-50 border-red-200",
  UNKNOWN: "text-slate-400 bg-slate-50 border-slate-200",
};

const STATUS_DOT: Record<string, string> = {
  GOOD: "bg-emerald-500",
  WARNING: "bg-amber-500",
  CRITICAL: "bg-red-500",
  UNKNOWN: "bg-slate-300",
};

interface RowDef {
  label: string;
  value: string | null;
  status?: "GOOD" | "WARNING" | "CRITICAL" | "UNKNOWN";
}

export function VsmBusinessImpactDrawer({ impact, onClose }: Props) {
  const rows: RowDef[] = [
    { label: "Inventory Cost", value: impact.inventoryCost, status: impact.inventoryCostStatus },
    { label: "Inventory Turns", value: impact.inventoryTurns, status: impact.inventoryTurnsStatus },
    { label: "Service Level", value: impact.serviceLevel, status: impact.serviceLevelStatus },
    { label: "LT Reduction Opp.", value: impact.leadTimeReductionOpp, status: impact.leadTimeReductionStatus },
    { label: "WIP Reduction Opp.", value: impact.wipReductionOpp },
  ];

  const visible = rows.filter((r) => r.value != null);

  return (
    <div className="w-[340px] h-full shrink-0 bg-white border-l border-slate-300 shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 bg-slate-50">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-800">
            Business Impact
          </h3>
          <button onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {visible.length === 0 ? (
            <p className="text-[13px] italic text-slate-400 text-center mt-8">
              Impact data not available
            </p>
          ) : (
            <div className="space-y-1">
              {visible.map((row, i) => {
                const sc = row.status ? STATUS_COLORS[row.status] : "text-slate-800";
                const sd = row.status ? STATUS_DOT[row.status] : "";
                return (
                  <div key={i}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-[13px] ${sc}`}>
                    <span className="font-medium">{row.label}</span>
                    <span className="flex items-center gap-2 font-bold tabular-nums">
                      {sd && <span className={`h-2 w-2 rounded-full ${sd}`} />}
                      {row.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Estimated savings */}
          {impact.estimatedSavings && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Estimated Savings
              </p>
              <p className="text-[15px] font-extrabold text-emerald-800 mt-0.5">
                {impact.estimatedSavings}
              </p>
            </div>
          )}

          {/* Last calculated timestamp */}
          {impact.lastCalculatedAt && (
            <p className="mt-3 text-[10px] text-slate-400 text-center">
              Last calculated: {impact.lastCalculatedAt}
            </p>
          )}
        </div>
      </div>
  );
}
