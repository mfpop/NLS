import type { VsmProcessNode } from "@/types/vsm";

interface Props {
  node: VsmProcessNode;
  x: number;
  y: number;
  width: number;
  height: number;
  dataBoxHeight: number;
  selected: boolean;
  onSelect: (id: string) => void;
}

function fmtCO(seconds: number): string {
  if (seconds === 0) return "0";
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)}min`;
  return `${seconds}s`;
}

/** WIP indicator: small bar that fills relative to max */
function WipIndicator({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = value > max * 0.7 ? "#ef4444"
    : value > max * 0.4 ? "#f59e0b" : "#10b981";
  return (
    <rect x={0} y={0} width={pct > 0 ? Math.max(pct, 4) : 0} height={3} rx={1.5} fill={color} opacity={0.8} />
  );
}

/** Build a hover tooltip string */
function nodeTooltip(node: VsmProcessNode): string {
  const lines = [
    `${node.label} (${node.resourceGroupName})`,
    `CT: ${node.cycleTimeSeconds}s | C/O: ${fmtCO(node.changeoverSeconds)}`,
    `Uptime: ${node.uptimePercent}% | Operators: ${node.operatorCount}`,
    `WIP Before: ${node.wipBefore} | WIP After: ${node.wipAfter}`,
  ];
  if (node.defectRate !== null) lines.push(`Defect Rate: ${node.defectRate}% | Yield: ${(100 - node.defectRate).toFixed(1)}%`);
  if (node.isBottleneck) lines.push("⚠ BOTTLENECK — Limit throughput");
  return lines.join("\n");
}

export function VsmProcessNodeBox({ node, x, y, width, height, dataBoxHeight, selected, onSelect }: Props) {
  const isBn = node.isBottleneck;
  const fillColor = isBn ? "#fffbeb" : (selected ? "#f0f9ff" : "#ffffff");
  const strokeColor = selected ? "#3b82f6" : (isBn ? "#f59e0b" : "#cbd5e1");
  const strokeWidth = isBn ? 2.5 : (selected ? 2 : 1.5);
  const dbY = y + height;
  const wipMax = 150; // expected max WIP for visualization scale

  // Stable vs constrained indicator
  const isConstrained = node.wipAfter > 80 || node.uptimePercent < 90;
  // Flow signals derived from process data
  const isStarved = !node.isActive && node.wipAfter < 20;
  const isOverproduced = node.wipAfter > 100 && node.uptimePercent > 90;
  const hasFlowSignal = isStarved || isOverproduced;

  return (
    <g onClick={() => onSelect(node.id)} className="cursor-pointer" role="button" tabIndex={0}>
      <title>{nodeTooltip(node)}</title>
      {/* Bottleneck glow (subtle) */}
      {isBn && (
        <rect x={x - 2} y={y - 2} width={width + 4} height={height + 4} rx={5}
          fill="none" stroke="hsl(var(--warning))" strokeWidth={1} strokeOpacity={0.3} />
      )}

      {/* Process box */}
      <rect x={x} y={y} width={width} height={height} rx={3}
        fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />

      {/* Status accent bar on left */}
      <rect x={x} y={y + 4} width={3} height={height - 8} rx={1.5}
        fill={isBn ? "#f59e0b" : isConstrained ? "#f97316" : "#22c55e"} />

      {/* Process name */}
      <text x={x + width / 2} y={y + 20} textAnchor="middle" className="text-xs font-semibold" fill="hsl(var(--foreground))">
        {node.label}
      </text>

      {/* Department */}
      <text x={x + width / 2} y={y + 33} textAnchor="middle" className="text-[8px]" fill="hsl(var(--muted-foreground))">
        {node.resourceGroupName}
      </text>

      {/* Bottleneck label */}
      {isBn && (
        <g>
          <rect x={x + 4} y={y + height - 15} width={width - 8} height={12} rx={2} fill="hsl(var(--warning))" opacity={0.9} />
          <text x={x + width / 2} y={y + height - 6} textAnchor="middle" className="text-[7px] font-bold" fill="hsl(var(--background))">
            ⚠ BOTTLENECK
          </text>
        </g>
      )}

      {/* Flow signals: starvation / overproduction */}
      {hasFlowSignal && (
        <text x={x + width - 6} y={y + 12} textAnchor="end" className="text-[7px]" fill={isStarved ? "#f97316" : isOverproduced ? "#ef4444" : "#f59e0b"}>
          {isStarved ? "⚠" : isOverproduced ? "⚠" : ""}
        </text>
      )}
      {isStarved && (
        <text x={x + width - 4} y={y + height - 2} textAnchor="end" className="text-[6px] italic" fill="hsl(var(--warning))">starved</text>
      )}
      {isOverproduced && (
        <text x={x + width - 4} y={y + height - 2} textAnchor="end" className="text-[6px] italic" fill="hsl(var(--danger))">overprod</text>
      )}

      {/* Data box directly below process box */}
      <rect x={x + 2} y={dbY + 1} width={width - 4} height={dataBoxHeight - 1} rx={2}
        fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} />

      {/* Row 1: CT + C/O */}
      <text x={x + 6} y={dbY + 13} className="text-[9px]" fill="hsl(var(--secondary-foreground))">CT={node.cycleTimeSeconds}s</text>
      <text x={x + width - 6} y={dbY + 13} textAnchor="end" className="text-[9px]" fill="hsl(var(--secondary-foreground))">C/O={fmtCO(node.changeoverSeconds)}</text>

      {/* Row 2: Uptime + WIP */}
      <text x={x + 6} y={dbY + 25} className="text-[9px]" fill="hsl(var(--secondary-foreground))">Up={node.uptimePercent}%</text>
      <text x={x + width - 6} y={dbY + 25} textAnchor="end" className="text-[9px]" fill={node.wipAfter > 80 ? "#ef4444" : "#475569"}>
        WIP={node.wipAfter}
      </text>

      {/* Row 3: WIP indicator bar */}
      {dataBoxHeight > 30 && (
        <svg x={x + 6} y={dbY + 27} width={width - 12} height={3} overflow="visible">
          <rect x={0} y={0} width={width - 12} height={3} rx={1.5} fill="hsl(var(--border))" />
          <WipIndicator value={node.wipAfter} max={wipMax} />
        </svg>
      )}
    </g>
  );
}
