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
  return "#0f172a";
}

export function VsmProcessDataBox({ rows, x, y, width, isAboveTakt }: Props) {
  if (!rows.length) return null;

  // Each row: C/T = 30px tall (+10% text), others = 20px tall (+10% text)
  const rowH = (r: DataRowModel) => r.label === "C/T" ? 30 : 20;
  const totalH = rows.reduce((h, r) => h + rowH(r), 0);

  let curY = y;
  return (
    <g>
      <rect x={x} y={y} width={width} height={totalH}
        fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={0.8} rx={3} />

      {rows.map((row, i) => {
        const rh = rowH(row);
        const isCt = row.label === "C/T";
        const fy = curY + rh / 2 + (isCt ? 5 : 5);
        // If C/T and Takt data available, show arrow instead of plain value
        const showTakt = isCt && isAboveTakt != null;
        const result = (
          <g key={i}>
            <text x={x + 12} y={fy}
              className={isCt ? "text-[13px] font-bold" : "text-[11px] font-semibold"}
              fill="hsl(var(--muted-foreground))">
              {row.label}
            </text>
            {showTakt ? (
              <text x={x + width - 12} y={fy}
                textAnchor="end"
                className="text-[18px] font-extrabold tabular-nums"
                fill={isAboveTakt ? "#dc2626" : "#059669"}>
                {row.value} {isAboveTakt ? "▲" : "▼"}
              </text>
            ) : (
              <text x={x + width - 12} y={fy}
                textAnchor="end"
                className={`tabular-nums ${isCt ? "text-[18px] font-extrabold" : "text-[12px] font-bold"}`}
                fill={severityColor(row.severity)}>
                {row.value}
              </text>
            )}
            {/* Separator line between rows */}
            {i < rows.length - 1 && (
              <line x1={x + 8} y1={curY + rh} x2={x + width - 8} y2={curY + rh}
                stroke="hsl(var(--muted))" strokeWidth={0.5} />
            )}
          </g>
        );
        curY += rh;
        return result;
      })}
    </g>
  );
}
