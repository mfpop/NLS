import type { VsmProcessNode } from "@/types/vsm";
import { fmtSeconds, fmtCO, v } from "./vsmFormatters";
import { DATA_ROW_H } from "./vsmFormatters";

interface Props {
  node: VsmProcessNode;
  x: number;
  y: number;
  width: number;
}

export function VsmProcessDataBox({ node, x, y, width }: Props) {
  const rowH = DATA_ROW_H;
  const pad = 6;
  const topH = 6;
  const totalH = rowH * 6 + topH + pad;
  const labelX = x + 8;
  const valX = x + width - 8;

  return (
    <g>
      {/* Outer box — sharp rectangle */}
      <rect x={x} y={y} width={width} height={totalH}
        fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={0.8} />

      {/* Thin header line */}
      <line x1={x} y1={y + topH} x2={x + width} y2={y + topH} stroke="hsl(var(--border))" strokeWidth={0.5} />

      {/* ── Row 1: C/T = 45s ── */}
      <text x={labelX} y={y + topH + rowH - 4} className="text-[10px] font-bold" fill="hsl(var(--secondary-foreground))">C/T</text>
      <text x={valX} y={y + topH + rowH - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="hsl(var(--foreground))">
        {v(fmtSeconds(node.cycleTimeSeconds))}
      </text>

      {/* Row divider */}
      <line x1={x + pad} y1={y + topH + rowH} x2={x + width - pad} y2={y + topH + rowH} stroke="hsl(var(--border))" strokeWidth={0.5} />

      {/* ── Row 2: C/O = 30min ── */}
      <text x={labelX} y={y + topH + rowH * 2 - 4} className="text-[10px] font-bold" fill="hsl(var(--secondary-foreground))">C/O</text>
      <text x={valX} y={y + topH + rowH * 2 - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="hsl(var(--foreground))">
        {v(fmtCO(node.changeoverSeconds))}
      </text>

      <line x1={x + pad} y1={y + topH + rowH * 2} x2={x + width - pad} y2={y + topH + rowH * 2} stroke="hsl(var(--border))" strokeWidth={0.5} />

      {/* ── Row 3: Uptime = 95% ── */}
      <text x={labelX} y={y + topH + rowH * 3 - 4} className="text-[10px] font-bold" fill="hsl(var(--secondary-foreground))">Uptime</text>
      <text x={valX} y={y + topH + rowH * 3 - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="hsl(var(--foreground))">
        {v(node.uptimePercent, "%")}
      </text>

      <line x1={x + pad} y1={y + topH + rowH * 3} x2={x + width - pad} y2={y + topH + rowH * 3} stroke="hsl(var(--border))" strokeWidth={0.5} />

      {/* ── Row 4: Operators = 2 ── */}
      <text x={labelX} y={y + topH + rowH * 4 - 4} className="text-[10px] font-bold" fill="hsl(var(--secondary-foreground))">Operators</text>
      <text x={valX} y={y + topH + rowH * 4 - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="hsl(var(--foreground))">
        {v(node.operatorCount)}
      </text>

      <line x1={x + pad} y1={y + topH + rowH * 4} x2={x + width - pad} y2={y + topH + rowH * 4} stroke="hsl(var(--border))" strokeWidth={0.5} />

      {/* ── Row 5: WIP = 120 ── */}
      <text x={labelX} y={y + topH + rowH * 5 - 4} className="text-[10px] font-bold" fill="hsl(var(--secondary-foreground))">WIP</text>
      <text x={valX} y={y + topH + rowH * 5 - 4} textAnchor="end"
        className={`text-[10px] font-semibold tabular-nums ${node.wipAfter > 80 ? "fill-warning" : node.wipAfter > 40 ? "fill-warning" : "fill-success"}`}>
        {v(node.wipAfter)}
      </text>

      <line x1={x + pad} y1={y + topH + rowH * 5} x2={x + width - pad} y2={y + topH + rowH * 5} stroke="hsl(var(--border))" strokeWidth={0.5} />

      {/* ── Row 6: Yield = 98.8% / — ── */}
      <text x={labelX} y={y + topH + rowH * 6 - 4} className="text-[10px] font-bold" fill="hsl(var(--secondary-foreground))">Yield</text>
      <text x={valX} y={y + topH + rowH * 6 - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="hsl(var(--foreground))">
        {node.defectRate !== null ? `${(100 - node.defectRate).toFixed(1)}%` : "\u2014"}
      </text>
    </g>
  );
}
