import type { VsmDiagram } from "@/types/vsm";

interface Props {
  diagram: VsmDiagram;
  canvasWidth: number;
  supplierX: number;
  customerX: number;
  pcX: number;
  pcY: number;
  offsetX: number;
  spacing: number;
  boxW: number;
  bandY: number;
  bandHeight: number;
}

export function VsmInfoFlowBand({ diagram, canvasWidth, supplierX, customerX, pcX, pcY, offsetX, spacing, boxW, bandY, bandHeight }: Props) {
  const infoCenterY = bandY + bandHeight / 2;

  return (
    <g>
      <rect x={0} y={bandY} width={canvasWidth} height={bandHeight} fill="#fafafa" stroke="#e2e8f0" strokeWidth={1} />
      <text x={10} y={bandY + 12} className="text-[7px] font-semibold uppercase tracking-wider" fill="#94a3b8">
        INFORMATION FLOW
      </text>

      <rect x={supplierX} y={infoCenterY - 16} width={70} height={32} rx={3}
        fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.3} />
      <text x={supplierX + 35} y={infoCenterY - 2} textAnchor="middle" className="text-[8px] font-semibold" fill="#475569">
        {diagram.supplierName}
      </text>
      <text x={supplierX + 35} y={infoCenterY + 9} textAnchor="middle" className="text-[6px]" fill="#94a3b8">
        Supplier
      </text>

      <rect x={customerX} y={infoCenterY - 16} width={70} height={32} rx={3}
        fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.3} />
      <text x={customerX + 35} y={infoCenterY - 2} textAnchor="middle" className="text-[8px] font-semibold" fill="#475569">
        {diagram.customerName}
      </text>
      <text x={customerX + 35} y={infoCenterY + 9} textAnchor="middle" className="text-[6px]" fill="#94a3b8">
        Customer
      </text>

      {diagram.productionControl && (
        <g>
          <rect x={pcX} y={pcY} width={110} height={44} rx={3}
            fill="#f0f9ff" stroke="#38bdf8" strokeWidth={1.5} />
          <text x={pcX + 55} y={pcY + 16} textAnchor="middle" className="text-[8px] font-semibold" fill="#0369a1">
            {diagram.productionControl.label}
          </text>
          <text x={pcX + 55} y={pcY + 28} textAnchor="middle" className="text-[6px]" fill="#64748b">
            {diagram.productionControl.schedulingType}
          </text>
          <text x={pcX + 55} y={pcY + 37} textAnchor="middle" className="text-[6px]" fill="#94a3b8">
            {diagram.productionControl.schedulingInterval}
          </text>
        </g>
      )}

      <path d={`M${customerX},${infoCenterY} Q${(customerX + pcX + 110) / 2},${infoCenterY - 24} ${(customerX + pcX + 110) / 2},${pcY + 22} Q${(customerX + pcX + 110) / 2},${pcY + 44} ${pcX + 110},${pcY + 22}`}
        fill="none" stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#arrow-info)" />
      <rect x={(customerX + pcX + 110) / 2 - 32} y={infoCenterY - 36} width={64} height={14} rx={2}
        fill="white" fillOpacity={0.9} stroke="#e2e8f0" strokeWidth={0.5} />
      <text x={(customerX + pcX + 110) / 2} y={infoCenterY - 27} textAnchor="middle" className="text-[6px] font-medium" fill="#475569">
        Daily orders
      </text>

      <path d={`M${pcX},${pcY + 22} Q${(pcX + supplierX + 70) / 2},${pcY + 22} ${(pcX + supplierX + 70) / 2},${infoCenterY} Q${(pcX + supplierX + 70) / 2},${infoCenterY} ${supplierX + 70},${infoCenterY}`}
        fill="none" stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#arrow-info)" />
      <rect x={(pcX + supplierX + 70) / 2 - 36} y={infoCenterY - 16} width={72} height={14} rx={2}
        fill="white" fillOpacity={0.9} stroke="#e2e8f0" strokeWidth={0.5} />
      <text x={(pcX + supplierX + 70) / 2} y={infoCenterY - 7} textAnchor="middle" className="text-[6px] font-medium" fill="#475569">
        Release schedule
      </text>

      {diagram.informationFlows.map((inf, i) => {
        const targetProc = diagram.processNodes.find((n) => n.id === inf.toId);
        if (!targetProc) return null;
        const procIdx = diagram.processNodes.indexOf(targetProc);
        const targetX = offsetX + procIdx * spacing + boxW / 2;
        const midX = (pcX + 55 + targetX) / 2;
        const matBandTopY = bandY + bandHeight + 16;

        return (
          <g key={`inf-${i}`}>
            <path d={`M${pcX + 55},${pcY + 44} Q${midX},${pcY + 44} ${midX},${(pcY + 44 + matBandTopY) / 2} Q${midX},${matBandTopY} ${targetX},${matBandTopY}`}
              fill="none" stroke="#64748b" strokeWidth={0.8} strokeDasharray="3,3" markerEnd="url(#arrow-info)" />
            <rect x={midX - 30} y={(pcY + 44 + matBandTopY) / 2 - 8} width={60} height={18} rx={2}
              fill="white" fillOpacity={0.9} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={midX} y={(pcY + 44 + matBandTopY) / 2 + 2} textAnchor="middle" className="text-[6px] font-medium" fill="#475569">
              {inf.label}
            </text>
            <text x={midX} y={(pcY + 44 + matBandTopY) / 2 + 11} textAnchor="middle" className="text-[5px]" fill="#94a3b8">
              {inf.frequency}
            </text>
          </g>
        );
      })}
    </g>
  );
}
