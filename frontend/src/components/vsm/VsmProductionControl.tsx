interface Props {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
  interval: string;
}

export function VsmProductionControl({ x, y, w, h, label, sub, interval }: Props) {
  const headerH = 28;

  return (
    <g>
      {/* Outer box */}
      <rect x={x} y={y} width={w} height={h}
        fill="#f8fafc" stroke="#334155" strokeWidth={2} />

      {/* Header band */}
      <rect x={x} y={y} width={w} height={headerH}
        fill="#1e293b" />
      <text x={x + w / 2} y={y + headerH / 2 + 1}
        textAnchor="middle" className="text-xs font-bold uppercase tracking-wider" fill="#ffffff">
        {label}
      </text>

      {/* Horizontal separator line */}
      <line x1={x + 8} y1={y + headerH} x2={x + w - 8} y2={y + headerH}
        stroke="#cbd5e1" strokeWidth={0.5} />

      {/* Scheduling type */}
      <text x={x + w / 2} y={y + 54}
        textAnchor="middle" className="text-[11px]" fill="#475569">
        {sub}
      </text>

      {/* Scheduling interval */}
      <text x={x + w / 2} y={y + 74}
        textAnchor="middle" className="text-[10px]" fill="#94a3b8">
        {interval}
      </text>
    </g>
  );
}
