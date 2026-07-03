import type { VsmDiagram } from "@/types/vsm";
import { VsmProcessBox } from "./VsmProcessBox";
import { VsmInventoryTriangle } from "./VsmInventoryNode";

interface Props {
  diagram: VsmDiagram;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  showWip: boolean;
  showMetrics: boolean;
  bandY: number;
  bandHeight: number;
  canvasWidth: number;
  supplierX: number;
  customerX: number;
  offsetX: number;
  spacing: number;
  boxW: number;
  boxH: number;
  dataBoxH: number;
  invSize: number;
  matCenterY: number;
  procPos: Array<{ id: string; x: number; y: number }>;
  invPos: Array<{ id: string; x: number; y: number }>;
}

export function VsmMaterialFlowBand({
  diagram, selectedNodeId, onSelectNode, showWip, showMetrics,
  bandY, bandHeight, canvasWidth,
  supplierX, customerX, boxW, boxH, dataBoxH, invSize,
  matCenterY, procPos, invPos,
}: Props) {
  const numNodes = diagram.processNodes.length;

  const flowArrows: Array<{ x1: number; y1: number; x2: number; y2: number; type: string; label: string }> = [];

  const firstInv = invPos[0];
  if (firstInv) {
    flowArrows.push({
      x1: supplierX + 70, y1: matCenterY,
      x2: firstInv.x - invSize, y2: matCenterY,
      type: "PUSH", label: "Weekly",
    });
  }

  for (let i = 0; i < numNodes; i++) {
    const proc = procPos[i];
    const prevInv = invPos[i];
    if (prevInv && prevInv.id !== diagram.inventoryNodes[0]?.id) {
      const link = diagram.flowLinks.find((f) => f.toId === proc.id);
      flowArrows.push({
        x1: prevInv.x + invSize, y1: matCenterY,
        x2: proc.x, y2: matCenterY,
        type: link?.type || "PUSH", label: link?.label || "",
      });
    }
    const nextInv = invPos[i + 1];
    if (nextInv) {
      const link = diagram.flowLinks.find((f) => f.fromId === proc.id);
      flowArrows.push({
        x1: proc.x + boxW, y1: matCenterY,
        x2: nextInv.x - invSize, y2: matCenterY,
        type: link?.type || "PUSH", label: link?.label || "",
      });
    }
  }

  const lastProc = procPos[numNodes - 1];
  const lastInv = invPos[invPos.length - 1];
  if (lastProc && lastInv) {
    flowArrows.push({
      x1: lastProc.x + boxW, y1: matCenterY,
      x2: lastInv.x - invSize, y2: matCenterY,
      type: "PUSH", label: "",
    });
    flowArrows.push({
      x1: lastInv.x + invSize, y1: matCenterY,
      x2: customerX, y2: matCenterY,
      type: "PULL", label: "Ship daily",
    });
  }

  return (
    <g>
      <rect x={0} y={bandY} width={canvasWidth} height={bandHeight} fill="#ffffff" stroke="#e2e8f0" strokeWidth={1} />

      <rect x={supplierX} y={matCenterY - 22} width={70} height={44} rx={4}
        fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} />
      <text x={supplierX + 35} y={matCenterY + 18} textAnchor="middle" className="text-[8px]" fill="#94a3b8">
        Supplier
      </text>

      <rect x={customerX} y={matCenterY - 22} width={70} height={44} rx={4}
        fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} />
      <text x={customerX + 35} y={matCenterY + 18} textAnchor="middle" className="text-[8px]" fill="#94a3b8">
        Customer
      </text>

      {flowArrows.map((arrow, i) => (
        <g key={`fa-${i}`}>
          <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2}
            stroke={arrow.type === "PULL" ? "#3b82f6" : arrow.type === "KANBAN" ? "#f59e0b" : arrow.type === "FIFO" ? "#22c55e" : "#64748b"}
            strokeWidth={1.5}
            strokeDasharray={arrow.type === "PULL" ? "6,4" : arrow.type === "KANBAN" ? "3,3" : "none"}
            markerEnd={`url(#arrow-${arrow.type})`} />
          {arrow.label && (
            <text x={(arrow.x1 + arrow.x2) / 2} y={matCenterY - 10}
              textAnchor="middle" className="text-[7px]" fill="#64748b">{arrow.label}</text>
          )}
          {(arrow.type === "PUSH" || arrow.type === "PULL" || arrow.type === "KANBAN" || arrow.type === "FIFO") && (
            <text x={(arrow.x1 + arrow.x2) / 2} y={matCenterY + 16}
              textAnchor="middle" className="text-[7px] font-semibold"
              fill={arrow.type === "PULL" ? "#3b82f6" : arrow.type === "KANBAN" ? "#f59e0b" : arrow.type === "FIFO" ? "#22c55e" : "#64748b"}>
              {arrow.type}
            </text>
          )}
        </g>
      ))}

      {procPos.map((pos) => {
        const node = diagram.processNodes.find((n) => n.id === pos.id);
        if (!node) return null;
        return (
          <VsmProcessBox key={node.id} node={node} x={pos.x} y={pos.y}
            width={boxW} height={boxH} dataBoxHeight={showMetrics ? dataBoxH : 16}
            selected={selectedNodeId === node.id} onSelect={onSelectNode} />
        );
      })}

      {showWip && invPos.map((pos) => {
        const inv = diagram.inventoryNodes.find((n) => n.id === pos.id);
        if (!inv) return null;
        return (
          <VsmInventoryTriangle key={inv.id} node={inv} x={pos.x} y={pos.y}
            size={invSize} onSelect={onSelectNode} />
        );
      })}
    </g>
  );
}
