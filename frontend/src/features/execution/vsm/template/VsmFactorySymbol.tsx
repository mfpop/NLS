import type { FactoryModel } from "./vsmTemplateTypes";
import { FAC_W, FAC_H } from "./vsmTemplateGeometry";

interface Props {
  model: FactoryModel;
  x: number;
  y: number;
}

/**
 * Standard VSM factory symbol with sawtooth roof.
 * Roof is diagonal rise + vertical drop repeated 3 times (not symmetric zig-zag).
 * Path for w=220, h=90, roofTop=18, roofBase=38:
 *   M 0 90 L 0 38 L 45 18 L 45 38 L 90 18 L 90 38 L 135 18 L 135 38 L 220 38 L 220 90 Z
 */
export function VsmFactorySymbol({ model, x, y }: Props) {
  const w = FAC_W;
  const h = FAC_H;
  const rt = 18; // roof peak top
  const rb = 38; // roof base (where vertical drops end)
  const cx = x + w / 2;
  const bodyH = h - rb;
  const bodyMid = y + rb + bodyH / 2;

  // 3-peak sawtooth: diagonal rise, vertical drop, repeat
  const pts = [
    `${x},${y + h}`,
    `${x},${y + rb}`,
    `${x + w * 1 / 6},${y + rt}`,
    `${x + w * 1 / 6},${y + rb}`,
    `${x + w * 3 / 6},${y + rt}`,
    `${x + w * 3 / 6},${y + rb}`,
    `${x + w * 5 / 6},${y + rt}`,
    `${x + w * 5 / 6},${y + rb}`,
    `${x + w},${y + rb}`,
    `${x + w},${y + h}`,
  ].join(" ");

  return (
    <g>
      <polygon points={pts} fill="#f8fafc" stroke="#334155" strokeWidth={2} strokeLinejoin="miter" />
      <text x={cx} y={bodyMid + 1} textAnchor="middle" className="text-[18px] font-bold" fill="#1e293b">
        {model.label}
      </text>
      <text x={cx} y={y + h - 7} textAnchor="middle" className="text-[14px] font-semibold" fill="#475569">
        {model.typeLabel}
      </text>
      {/* Demand removed from factory box — KPI bar owns all summary values */}
    </g>
  );
}
