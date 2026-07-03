import type { VsmInventoryNode } from "@/types/vsm";

interface Props {
  node: VsmInventoryNode;
  x: number;
  y: number;
  size: number;
  onSelect: (id: string) => void;
}

function color(type: string, qty: number): string {
  if (type === "WIP" && qty > 120) return "#dc2626";
  if (type === "WIP" && qty > 60) return "#f59e0b";
  return { RM: "#2563eb", WIP: "#f59e0b", FG: "#16a34a", BUFFER: "#9333ea", QUARANTINE: "#dc2626" }[type] || "#94a3b8";
}

function fillBg(type: string, qty: number): string {
  const c = color(type, qty);
  const m: Record<string, string> = {
    "#dc2626": "#fef2f2", "#f59e0b": "#fffbeb", "#2563eb": "#eff6ff",
    "#16a34a": "#f0fdf4", "#9333ea": "#faf5ff", "#94a3b8": "#f8fafc",
  };
  return m[c] || "#f8fafc";
}

const SHORT: Record<string, string> = {
  RM: "RAW", WIP: "WIP", FG: "FG",
  BUFFER: "BUF", QUARANTINE: "QUAR",
};

export function VsmInventoryTriangle({ node, x, y, size, onSelect }: Props) {
  const c = color(node.type, node.quantity);
  const bg = fillBg(node.type, node.quantity);
  const half = size / 2;

  return (
    <g onClick={() => onSelect(node.id)} className="cursor-pointer" role="button" tabIndex={0}>

      {/* Triangle — sharp joins */}
      <polygon
        points={`${x},${y - half} ${x - half},${y + half} ${x + half},${y + half}`}
        fill={bg} stroke={c} strokeWidth={2.5} strokeLinejoin="miter" />

      {/* Quantity inside triangle */}
      <text x={x} y={y + 4} textAnchor="middle" className="text-[13px] font-extrabold" fill={c}>
        {node.quantity}
      </text>

      {/* Days of inventory below triangle tip */}
      <text x={x} y={y + half + 14} textAnchor="middle" className="text-[10px] font-medium" fill="#64748b">
        {node.daysOfInventory}d
      </text>

      {/* Label */}
      <text x={x} y={y + half + 28} textAnchor="middle" className="text-[11px] font-semibold" fill="#475569">
        {node.label.length > 16 ? node.label.slice(0, 14) + "\u2026" : node.label}
      </text>

      {/* Type tag */}
      <text x={x} y={y + half + 42} textAnchor="middle"
        className="text-[9px] font-bold uppercase tracking-widest" fill={c}>
        {SHORT[node.type]}
      </text>
    </g>
  );
}
