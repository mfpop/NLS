// ── Production Control box — control context only (no KPI duplicates) ──
// Per task spec: Demand, Takt, Bottleneck, Lead Time, VA Time, VA%, WIP all
// live in the KPI bar. PC box shows only: control method, schedule, pacemaker.

import type { ProductionControlModel } from "./vsmTemplateTypes";
import { PC_W } from "./vsmTemplateGeometry";

interface Props {
  model: ProductionControlModel;
  x: number;
  y: number;
}

const HEADER = 36;              // py-2-like padding for 21px title
const BODY_PAD_TOP = 12;        // top padding inside body area
const BODY_ROW_H = 18;          // row height for 15px/14px text
const BODY_PAD_BOTTOM = 10;     // bottom padding inside body area
const ANCHOR_CLEARANCE = 8;     // zone between body text and box bottom

export function VsmProductionControlSymbol({ model, x, y }: Props) {
  const cx = x + PC_W / 2;

  const method = model.methodLabel || "—";
  const schedule = model.frequencyLabel || "—";
  const pacemaker = model.pacemakerLabel || "—";

  // ── Box dimensions ──
  // Total height matches PC_H = 120 in vsmTemplateGeometry
  const boxH = HEADER + BODY_PAD_TOP + BODY_ROW_H * 3 + BODY_PAD_BOTTOM + ANCHOR_CLEARANCE;
  // Vertically center 3 rows inside body area (between header and anchor zone)
  const bodyTop = y + HEADER;
  const bodyH = boxH - HEADER - ANCHOR_CLEARANCE;  // usable vertical space for rows
  const contentH = BODY_ROW_H * 3;
  const bodyPad = (bodyH - contentH) / 2;           // distributes evenly
  // Row center Ys using dominantBaseline="middle"
  const rowY = [
    bodyTop + bodyPad + BODY_ROW_H * 0.5,
    bodyTop + bodyPad + BODY_ROW_H * 1.5,
    bodyTop + bodyPad + BODY_ROW_H * 2.5,
  ];

  return (
    <g>
      <rect x={x} y={y} width={PC_W} height={boxH}
        fill="#ffffff" stroke="#334155" strokeWidth={2} rx={4} />

      {/* Header — dark bar, title centered both axes */}
      <rect x={x} y={y} width={PC_W} height={HEADER}
        fill="#1e293b" rx={4} />
      <rect x={x} y={y + HEADER - 14} width={PC_W} height={14}
        fill="#1e293b" />
      <text x={cx} y={y + HEADER / 2}
        textAnchor="middle" dominantBaseline="middle"
        className="text-[21px] font-bold" fill="#ffffff"
        style={{ letterSpacing: "0.5px" }}>
        Production Control
      </text>

      {/* Row 0: Method (centered, semibold) — 15px (+15% from 13px) */}
      <text x={cx} y={rowY[0]}
        textAnchor="middle" dominantBaseline="middle"
        className="text-[15px]"
        fontWeight={600}
        fill="#0f172a">
        {method}
      </text>

      {/* Row 1: Schedule (label / value) — 14px (+15% from 12px) */}
      <text x={x + 14} y={rowY[1]}
        dominantBaseline="middle"
        className="text-[14px]" fill="#64748b" fontWeight={500}>
        Schedule
      </text>
      <text x={x + PC_W - 14} y={rowY[1]}
        textAnchor="end" dominantBaseline="middle"
        className="text-[14px] tabular-nums"
        fill="#475569" fontWeight={600}>
        {schedule}
      </text>

      {/* Row 2: Pacemaker (label / value) — 14px */}
      <text x={x + 14} y={rowY[2]}
        dominantBaseline="middle"
        className="text-[14px]" fill="#64748b" fontWeight={500}>
        Pacemaker
      </text>
      <text x={x + PC_W - 14} y={rowY[2]}
        textAnchor="end" dominantBaseline="middle"
        className="text-[14px] tabular-nums"
        fill="#6d28d9" fontWeight={600}>
        {pacemaker}
      </text>
    </g>
  );
}
