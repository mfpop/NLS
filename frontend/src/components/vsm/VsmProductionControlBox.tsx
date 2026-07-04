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
        fill="hsl(var(--primary) / 0.06)" stroke="hsl(var(--accent))" strokeWidth={2} />
      <text x={x + width / 2} y={y + 22} textAnchor="middle" className="text-[11px] font-bold" fill="hsl(var(--primary))">
        {pc.label}
      </text>
      <text x={x + width / 2} y={y + 38} textAnchor="middle" className="text-[9px]" fill="hsl(var(--secondary-foreground))">
        {pc.schedulingType}
      </text>
      <text x={x + width / 2} y={y + 52} textAnchor="middle" className="text-[8px]" fill="hsl(var(--muted-foreground))">
        {pc.schedulingInterval}
      </text>
    </g>
  );
}
