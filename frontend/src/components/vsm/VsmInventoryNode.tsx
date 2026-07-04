import type { VsmInventoryNode } from "@/types/vsm";

interface Props {
  node: VsmInventoryNode;
  x: number;
  y: number;
  size: number;
  onSelect: (id: string) => void;
}

function getTypeColor(type: string, quantity: number): string {
  if (type === "WIP" && quantity > 80) return "#ef4444";
  if (type === "WIP" && quantity > 40) return "#f59e0b";
  const colors: Record<string, string> = {
    RM: "#3b82f6",
    WIP: "#f59e0b",
    FG: "#22c55e",
    BUFFER: "#a855f7",
    QUARANTINE: "#ef4444",
  };
  return colors[type] || "#94a3b8";
}

const TYPE_LABELS: Record<string, string> = {
  RM: "RAW",
  WIP: "WIP",
  FG: "FG",
  BUFFER: "BUF",
  QUARANTINE: "QUAR",
};

export function VsmInventoryTriangle({ node, x, y, size, onSelect }: Props) {
  const color = getTypeColor(node.type, node.quantity);
  const half = size / 2;
  const tipY = y - half;
  const botY = y + half;

  return (
    <g onClick={() => onSelect(node.id)} className="cursor-pointer">
      <polygon
        points={`${x},${tipY} ${x - half},${botY} ${x + half},${botY}`}
        fill="hsl(var(--background))"
        stroke={color}
        strokeWidth={2.5}
      />

      <text x={x} y={y + 4} textAnchor="middle" className="text-[8px] font-bold" fill={color}>
        {TYPE_LABELS[node.type]}
      </text>

      <text x={x} y={botY + 14} textAnchor="middle" className="text-[10px] font-bold" fill="hsl(var(--foreground))">
        {node.quantity}
      </text>
      <text x={x} y={botY + 25} textAnchor="middle" className="text-[8px]" fill="hsl(var(--muted-foreground))">
        {node.daysOfInventory}d
      </text>

      <text x={x} y={botY + 37} textAnchor="middle" className="text-[8px]" fill="hsl(var(--muted-foreground))">
        {node.label}
      </text>
    </g>
  );
}
