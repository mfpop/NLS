import type { VsmProductionControl } from "@/types/vsm";

interface Props {
  pc: VsmProductionControl;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function VsmProductionControlBox({ pc, x, y, width, height }: Props) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3}
        fill="#f0f9ff" stroke="#38bdf8" strokeWidth={2} />
      <text x={x + width / 2} y={y + 22} textAnchor="middle" className="text-[11px] font-bold" fill="#0369a1">
        {pc.label}
      </text>
      <text x={x + width / 2} y={y + 38} textAnchor="middle" className="text-[9px]" fill="#475569">
        {pc.schedulingType}
      </text>
      <text x={x + width / 2} y={y + 52} textAnchor="middle" className="text-[8px]" fill="#94a3b8">
        {pc.schedulingInterval}
      </text>
    </g>
  );
}
