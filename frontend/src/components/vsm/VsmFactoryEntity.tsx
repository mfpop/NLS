interface Props {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  type: "Supplier" | "Customer";
}

export function VsmFactoryEntity({ x, y, w, h, name, type }: Props) {
  const roof = 28;
  const bodyTop = y + roof;
  const bodyH = h - roof;

  // 3-peak sawtooth roof polygon
  const pts = [
    `${x},${y + h}`,           // bottom-left
    `${x},${bodyTop}`,         // left wall top
    `${x + w * 1 / 6},${y}`,  // peak 1
    `${x + w * 2 / 6},${bodyTop}`, // valley 1
    `${x + w * 3 / 6},${y}`,  // peak 2
    `${x + w * 4 / 6},${bodyTop}`, // valley 2
    `${x + w * 5 / 6},${y}`,  // peak 3
    `${x + w},${bodyTop}`,    // right wall top
    `${x + w},${y + h}`,      // bottom-right
  ].join(" ");

  const cx = x + w / 2;

  return (
    <g>
      {/* Full outline — sawtooth roof + body walls */}
      <polygon
        points={pts}
        fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeLinejoin="miter"
      />
      {/* Main label */}
      <text x={cx} y={bodyTop + bodyH / 2 + 1}
        textAnchor="middle" className="text-base font-bold" fill="hsl(var(--foreground))">
        {name}
      </text>
      {/* Sub label */}
      <text x={cx} y={bodyTop + bodyH - 7}
        textAnchor="middle" className="text-[10px] font-medium" fill="hsl(var(--muted-foreground))">
        {type}
      </text>
    </g>
  );
}
