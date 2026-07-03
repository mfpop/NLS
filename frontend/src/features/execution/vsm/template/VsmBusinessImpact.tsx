// ── Business Impact Panel ──
// Readable insight panel placed on the right of the VSM canvas.

import type { BusinessImpactModel } from "./vsmTemplateTypes";

interface Props {
  impact: BusinessImpactModel;
  x: number;
  y: number;
  onClose?: () => void;
}

const W = 250;
const HEADER_H = 26;
const ROW_H = 24;
const PAD = 12;
const STATUS_COLORS: Record<string, string> = {
  GOOD: "#16a34a",
  WARNING: "#d97706",
  CRITICAL: "#dc2626",
  UNKNOWN: "#94a3b8",
};

interface RowDef {
  label: string;
  value: string | null;
  status?: "GOOD" | "WARNING" | "CRITICAL" | "UNKNOWN";
}

function StatusDot({ color }: { color: string }) {
  return <circle cx={W - PAD - 6} cy={-4} r={4} fill={color} />;
}

export function VsmBusinessImpact({ impact, x, y, onClose }: Props) {
  const rows: RowDef[] = [
    { label: "Inventory Cost", value: impact.inventoryCost, status: impact.inventoryCostStatus },
    { label: "Inventory Turns", value: impact.inventoryTurns, status: impact.inventoryTurnsStatus },
    { label: "Service Level", value: impact.serviceLevel, status: impact.serviceLevelStatus },
    { label: "LT Reduction Opp.", value: impact.leadTimeReductionOpp, status: impact.leadTimeReductionStatus },
    { label: "WIP Reduction Opp.", value: impact.wipReductionOpp },
  ];

  const visible = rows.filter((r) => r.value != null);
  const hasData = visible.length > 0;
  const bodyH = hasData ? visible.length * ROW_H : ROW_H;
  const panelH = HEADER_H + PAD + bodyH + PAD;

  // Tooltip lines
  const tooltipParts: string[] = [];
  if (impact.estimatedSavings) tooltipParts.push(`Est. savings: ${impact.estimatedSavings}`);
  if (impact.lastCalculatedAt) tooltipParts.push(`Last calc.: ${impact.lastCalculatedAt}`);
  visible.forEach((r) => {
    if (r.status) tooltipParts.push(`${r.label}: ${r.status}`);
  });
  const tooltip = tooltipParts.join("\n");

  return (
    <g>
      <title>{tooltip || "Business Impact"}</title>

      {/* Panel background */}
      <rect x={x} y={y} width={W} height={panelH}
        fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} rx={5}
        filter="url(#drop-shadow)" />

      {/* Header */}
      <rect x={x} y={y} width={W} height={HEADER_H}
        fill="#1e293b" rx={5} />
      <rect x={x} y={y + HEADER_H / 2} width={W} height={HEADER_H / 2}
        fill="#1e293b" />
      <text x={x + W / 2} y={y + HEADER_H / 2 + 1}
        textAnchor="middle" className="text-[12px] font-bold uppercase tracking-wider" fill="#ffffff">
        Business Impact
      </text>

      {/* Close button */}
      {onClose && (
        <g onClick={onClose} className="cursor-pointer" role="button" tabIndex={0}>
          <line x1={x + W - 16} y1={y + 7} x2={x + W - 10} y2={y + 13}
            stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={x + W - 10} y1={y + 7} x2={x + W - 16} y2={y + 13}
            stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
        </g>
      )}

      {/* Body */}
      <g transform={`translate(${x + PAD}, ${y + HEADER_H + PAD})`}>
        {hasData ? visible.map((row, i) => {
          const ry = i * ROW_H;
          const statusColor = row.status ? STATUS_COLORS[row.status] : null;
          return (
            <g key={i}>
              <text x={0} y={ry + 7}
                className="text-[12px] font-medium" fill="#475569">
                {row.label}
              </text>
              <g transform={`translate(${W - PAD * 2}, ${ry + 7})`}>
                {statusColor && <StatusDot color={statusColor} />}
                <text x={statusColor ? -14 : 0} y={0}
                  textAnchor="end"
                  className="text-[12px] font-bold tabular-nums"
                  fill={statusColor || "#0f172a"}>
                  {row.value}
                </text>
              </g>
              {i < visible.length - 1 && (
                <line x1={0} y1={ry + ROW_H} x2={W - PAD * 2} y2={ry + ROW_H}
                  stroke="#e2e8f0" strokeWidth={0.5} />
              )}
            </g>
          );
        }) : (
          <text x={0} y={ROW_H / 2 + 3}
            className="text-[12px] italic" fill="#94a3b8">
            Impact data not available
          </text>
        )}
      </g>
    </g>
  );
}
