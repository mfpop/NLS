// ── Process data box — each parameter on its own row, C/T prominent ──

import type { DataRowModel } from "./vsmTemplateTypes";

interface Props {
  rows: DataRowModel[];
  x: number;
  y: number;
  width: number;
  isAboveTakt?: boolean | null;
}

function severityColor(s?: string): string {
  if (s === "warning") return "#d97706";
  if (s === "critical") return "#dc2626";
  return "hsl(var(--foreground))";
}

export function VsmProcessDataBox({ rows, x, y, width, isAboveTakt }: Props) {
  if (!rows.length) return null;

  // Standard row height — 22px per row with consistent alignment
  const ROW_H = 22;
  const totalH = rows.length * ROW_H + 8; // +8 for top/bottom padding

  let curY = y + 4; // top padding
  return (
    <g>
      <rect x={x} y={y} width={width} height={totalH}
        fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={0.8} rx={3} />

      {rows.map((row, i) => {
        const isCt = row.label === "C/T";
        const fy = curY + ROW_H / 2 + 4;
        // If C/T and Takt data available, show arrow instead of plain value
        const showTakt = isCt && isAboveTakt != null;
        const result = (
          <g key={i}>
            <text x={x + 12} y={fy}
              className="text-[11px] font-semibold"
              fill="hsl(var(--muted-foreground))">
              {row.label}
            </text>
            {showTakt ? (
              <text x={x + width - 12} y={fy}
                textAnchor="end"
                className="text-[15px] font-extrabold tabular-nums"
                fill={isAboveTakt ? "hsl(var(--danger))" : "hsl(var(--success))"}>
                {row.value} {isAboveTakt ? "▲" : "▼"}
              </text>
            ) : (
              <text x={x + width - 12} y={fy}
                textAnchor="end"
                className={`tabular-nums ${isCt ? "text-[15px] font-extrabold" : "text-[12px] font-bold"}`}
                fill={severityColor(row.severity)}>
                {row.value}
              </text>
            )}
            {/* Separator line between rows */}
            {i < rows.length - 1 && (
              <line x1={x + 8} y1={curY + ROW_H} x2={x + width - 8} y2={curY + ROW_H}
                stroke="hsl(var(--muted))" strokeWidth={0.5} />
            )}
          </g>
        );
        curY += ROW_H;
        return result;
      })}
    </g>
  );
}
