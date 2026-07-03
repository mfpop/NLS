interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  type: "Supplier" | "Customer";
}

export function VsmExternalEntity({ x, y, width, height, name, type }: Props) {
  const roofH = 18;
  const roofTopY = y - roofH;

  return (
    <g>
      <polygon
        points={`${x},${y} ${x},${y + height} ${x + width},${y + height} ${x + width},${y} ${x + width / 2},${roofTopY}`}
        fill="#f0f9ff"
        stroke="#64748b"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <line x1={x} y1={y} x2={x + width} y2={y} stroke="#64748b" strokeWidth={1.5} />
      <text x={x + width / 2} y={y + height / 2 + 2} textAnchor="middle" className="text-[11px] font-semibold" fill="#1e293b">
        {name}
      </text>
      <text x={x + width / 2} y={y + height - 6} textAnchor="middle" className="text-[8px]" fill="#64748b">
        {type}
      </text>
    </g>
  );
}
