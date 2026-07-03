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
        fill="#fafafa" stroke="#cbd5e1" strokeWidth={0.8} />

      {/* Thin header line */}
      <line x1={x} y1={y + topH} x2={x + width} y2={y + topH} stroke="#e2e8f0" strokeWidth={0.5} />

      {/* ── Row 1: C/T = 45s ── */}
      <text x={labelX} y={y + topH + rowH - 4} className="text-[10px] font-bold" fill="#475569">C/T</text>
      <text x={valX} y={y + topH + rowH - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="#1e293b">
        {v(fmtSeconds(node.cycleTimeSeconds))}
      </text>

      {/* Row divider */}
      <line x1={x + pad} y1={y + topH + rowH} x2={x + width - pad} y2={y + topH + rowH} stroke="#e2e8f0" strokeWidth={0.5} />

      {/* ── Row 2: C/O = 30min ── */}
      <text x={labelX} y={y + topH + rowH * 2 - 4} className="text-[10px] font-bold" fill="#475569">C/O</text>
      <text x={valX} y={y + topH + rowH * 2 - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="#1e293b">
        {v(fmtCO(node.changeoverSeconds))}
      </text>

      <line x1={x + pad} y1={y + topH + rowH * 2} x2={x + width - pad} y2={y + topH + rowH * 2} stroke="#e2e8f0" strokeWidth={0.5} />

      {/* ── Row 3: Uptime = 95% ── */}
      <text x={labelX} y={y + topH + rowH * 3 - 4} className="text-[10px] font-bold" fill="#475569">Uptime</text>
      <text x={valX} y={y + topH + rowH * 3 - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="#1e293b">
        {v(node.uptimePercent, "%")}
      </text>

      <line x1={x + pad} y1={y + topH + rowH * 3} x2={x + width - pad} y2={y + topH + rowH * 3} stroke="#e2e8f0" strokeWidth={0.5} />

      {/* ── Row 4: Operators = 2 ── */}
      <text x={labelX} y={y + topH + rowH * 4 - 4} className="text-[10px] font-bold" fill="#475569">Operators</text>
      <text x={valX} y={y + topH + rowH * 4 - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="#1e293b">
        {v(node.operatorCount)}
      </text>

      <line x1={x + pad} y1={y + topH + rowH * 4} x2={x + width - pad} y2={y + topH + rowH * 4} stroke="#e2e8f0" strokeWidth={0.5} />

      {/* ── Row 5: WIP = 120 ── */}
      <text x={labelX} y={y + topH + rowH * 5 - 4} className="text-[10px] font-bold" fill="#475569">WIP</text>
      <text x={valX} y={y + topH + rowH * 5 - 4} textAnchor="end"
        className={`text-[10px] font-semibold tabular-nums ${node.wipAfter > 80 ? "fill-amber-500" : node.wipAfter > 40 ? "fill-amber-500" : "fill-emerald-600"}`}>
        {v(node.wipAfter)}
      </text>

      <line x1={x + pad} y1={y + topH + rowH * 5} x2={x + width - pad} y2={y + topH + rowH * 5} stroke="#e2e8f0" strokeWidth={0.5} />

      {/* ── Row 6: Yield = 98.8% / — ── */}
      <text x={labelX} y={y + topH + rowH * 6 - 4} className="text-[10px] font-bold" fill="#475569">Yield</text>
      <text x={valX} y={y + topH + rowH * 6 - 4} textAnchor="end" className="text-[10px] tabular-nums" fill="#1e293b">
        {node.defectRate !== null ? `${(100 - node.defectRate).toFixed(1)}%` : "\u2014"}
      </text>
    </g>
  );
}
