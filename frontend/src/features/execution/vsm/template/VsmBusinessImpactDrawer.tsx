// ── Business Impact Drawer — slide-in panel for VSM business impact data ──

import { X } from "lucide-react";
import type { BusinessImpactModel } from "./vsmTemplateTypes";

interface Props {
  impact: BusinessImpactModel;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  GOOD: "text-success bg-success/10 border-success/20",
  WARNING: "text-warning bg-warning/10 border-warning/20",
  CRITICAL: "text-danger bg-danger/10 border-danger/20",
  UNKNOWN: "text-muted-foreground/60 bg-muted border-border",
};

const STATUS_DOT: Record<string, string> = {
  GOOD: "bg-success/100",
  WARNING: "bg-warning/100",
  CRITICAL: "bg-danger/100",
  UNKNOWN: "bg-muted-foreground/30",
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
    <div className="w-[340px] h-full shrink-0 bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-muted">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
            Business Impact
          </h3>
          <button onClick={onClose}
            className="p-1 rounded hover:bg-muted/80 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="@container flex-1 overflow-y-auto p-4">
          {visible.length === 0 ? (
            <p className="text-[13px] italic text-muted-foreground/60 text-center mt-8">
              Impact data not available
            </p>
          ) : (
            <div className="grid grid-cols-1 @[280px]:grid-cols-2 gap-3">
              {visible.map((row, i) => {
                const sc = row.status ? STATUS_COLORS[row.status] : "text-foreground";
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
            <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-success">
                Estimated Savings
              </p>
              <p className="text-[15px] font-extrabold text-success mt-0.5">
                {impact.estimatedSavings}
              </p>
            </div>
          )}

          {/* Last calculated timestamp */}
          {impact.lastCalculatedAt && (
            <p className="mt-3 text-[10px] text-muted-foreground/60 text-center">
              Last calculated: {impact.lastCalculatedAt}
            </p>
          )}
        </div>
      </div>
  );
}
