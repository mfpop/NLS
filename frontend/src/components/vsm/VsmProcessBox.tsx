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

function nodeTooltip(node: VsmProcessNode): string {
  const lines = [
    `${node.label} (${node.resourceGroupName})`,
    `CT: ${node.cycleTimeSeconds}s | C/O: ${fmtCO(node.changeoverSeconds)}`,
    `Uptime: ${node.uptimePercent}% | Operators: ${node.operatorCount}`,
    `WIP Before: ${node.wipBefore} | WIP After: ${node.wipAfter}`,
  ];
  if (node.defectRate !== null) lines.push(`Defect Rate: ${node.defectRate}% | Yield: ${(100 - node.defectRate).toFixed(1)}%`);
  if (node.isBottleneck) lines.push(`⚠ BOTTLENECK — CT: ${node.cycleTimeSeconds}s, WIP queue: ${node.wipAfter} units. Reduce CT or rebalance.`);
  return lines.join("\n");
}

export function VsmProcessBox({ node, x, y, width, height, dataBoxHeight, selected, onSelect }: Props) {
  const isBn = node.isBottleneck;
  const isConstrained = node.wipAfter > 80 || node.uptimePercent < 90;
  const isStarved = !node.isActive && node.wipAfter < 20;
  const isOverproduced = node.wipAfter > 100 && node.uptimePercent > 90;
  const hasFlowSignal = isStarved || isOverproduced;

  const fillColor = isBn ? "#fffbeb" : selected ? "#f0f9ff" : "#ffffff";
  const strokeColor = selected ? "#3b82f6" : isBn ? "#f59e0b" : "#cbd5e1";
  const strokeW = isBn ? 2.5 : selected ? 2 : 1.5;

  const dbY = y + height;

  return (
    <g onClick={() => onSelect(node.id)} className="cursor-pointer" role="button" tabIndex={0}>
      <title>{nodeTooltip(node)}</title>

      {isBn && (
        <rect x={x - 4} y={y - 4} width={width + 8} height={height + 8} rx={5}
          fill="none" stroke="hsl(var(--warning))" strokeWidth={1.5} strokeOpacity={0.3} strokeDasharray="4,3" />
      )}

      <rect x={x} y={y} width={width} height={height} rx={3}
        fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} />

      <rect x={x} y={y + 4} width={3} height={height - 8} rx={1.5}
        fill={isBn ? "#f59e0b" : isConstrained ? "#f97316" : "#22c55e"} />

      <text x={x + width / 2} y={y + 20} textAnchor="middle" className="text-sm font-semibold" fill="hsl(var(--foreground))">
        {node.label}
      </text>

      <text x={x + width / 2} y={y + 35} textAnchor="middle" className="text-[11px]" fill="hsl(var(--muted-foreground))">
        {node.resourceGroupName}
      </text>

      {isBn && (
        <g>
          <rect x={x + 6} y={y + height - 19} width={width - 12} height={15} rx={2} fill="hsl(var(--warning))" opacity={0.92} />
          <text x={x + width / 2} y={y + height - 9} textAnchor="middle" className="text-[8px] font-bold" fill="hsl(var(--background))">
            ⚠ BOTTLENECK
          </text>
        </g>
      )}

      {hasFlowSignal && (
        <text x={x + width - 6} y={y + 12} textAnchor="end" className="text-[8px]" fill={isStarved ? "#f97316" : "#ef4444"}>
          ⚠
        </text>
      )}
      {isStarved && (
        <text x={x + width - 4} y={y + height - 2} textAnchor="end" className="text-[7px] italic" fill="hsl(var(--warning))">starved</text>
      )}
      {isOverproduced && (
        <text x={x + width - 4} y={y + height - 2} textAnchor="end" className="text-[7px] italic" fill="hsl(var(--danger))">overprod</text>
      )}

      {dataBoxHeight > 16 && (
        <>
          <rect x={x + 2} y={dbY + 1} width={width - 4} height={dataBoxHeight - 1} rx={2}
            fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} />

          <text x={x + 6} y={dbY + 14} className="text-[11px]" fill="hsl(var(--secondary-foreground))">CT={node.cycleTimeSeconds}s</text>
          <text x={x + width - 6} y={dbY + 14} textAnchor="end" className="text-[11px]" fill="hsl(var(--secondary-foreground))">C/O={fmtCO(node.changeoverSeconds)}</text>

          <text x={x + 6} y={dbY + 27} className="text-[11px]" fill="hsl(var(--secondary-foreground))">Up={node.uptimePercent}%</text>
          <text x={x + width - 6} y={dbY + 27} textAnchor="end" className="text-[11px]" fill={node.wipAfter > 80 ? "#ef4444" : "#475569"}>
            WIP={node.wipAfter}
          </text>

          {dataBoxHeight > 32 && (
            <svg x={x + 6} y={dbY + 30} width={width - 12} height={4} overflow="visible">
              <rect x={0} y={0} width={width - 12} height={4} rx={2} fill="hsl(var(--border))" />
              <rect x={0} y={0}
                width={Math.max(0, Math.min(node.wipAfter / 150, 1) * (width - 12))}
                height={4} rx={2}
                fill={node.wipAfter > 80 ? "#ef4444" : node.wipAfter > 40 ? "#f59e0b" : "#22c55e"}
                opacity={0.8} />
            </svg>
          )}
        </>
      )}
    </g>
  );
}
