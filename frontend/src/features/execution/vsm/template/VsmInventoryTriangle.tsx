import type { InventoryModel } from "./vsmTemplateTypes";
import { INV_HALF, INV_SIZE, INV_QTY_INSET, INV_DAYS_Y, INV_WIP_LABEL_Y, INV_CODE_Y, INV_CLEARANCE_BTM, INV_CLEARANCE_LR, INV_CLEARANCE_TOP } from "./vsmTemplateGeometry";
import { VsmTransportIcon } from "./VsmTransportIcons";

interface Props {
  model: InventoryModel;
  x: number;
  y: number;
  onClick?: () => void;
  showClearanceZone?: boolean;
  icon?: { type: string; label: string; severity: string } | null;
}

function severityColor(sev: string): string {
  if (sev === "critical") return "#dc2626";
  if (sev === "warning") return "#f59e0b";
  return "#2563eb";
}

function severityBg(sev: string): string {
  if (sev === "critical") return "#fef2f2";
  if (sev === "warning") return "#fffbeb";
  return "#eff6ff";
}

function daysColor(sev: string): string {
  if (sev === "critical") return "#dc2626";
  if (sev === "warning") return "#f59e0b";
  return "#334155";
}

const TYPE_LABELS: Record<string, string> = {
  RM: "Purchased Material",
  WIP: "WIP",
  FG: "Finished Goods",
};

export function VsmInventoryTriangle({ model, x, y, onClick, showClearanceZone, icon }: Props) {
  const c = severityColor(model.severity);
  const bg = severityBg(model.severity);
  const baseY = y + INV_HALF;

  const typeLabel = TYPE_LABELS[model.type] ?? model.type;
  const iconSize = 56;

  // ── Tooltip ──
  const tooltipLines = [
    `Inventory type: ${typeLabel}`,
    `Qty: ${model.quantity}`,
    `Days: ${model.waitTimeLabel}`,
    icon ? `Transport: ${icon.label}` : "",
  ].filter(Boolean);

  return (
    <g onClick={onClick} className="cursor-pointer" role="button" tabIndex={0}>
      {/* ── Clearance zone debug overlay ── */}
      {showClearanceZone && (
        <rect
          x={x - INV_HALF - INV_CLEARANCE_LR}
          y={y - INV_HALF - INV_CLEARANCE_TOP}
          width={INV_SIZE + INV_CLEARANCE_LR * 2}
          height={INV_SIZE + INV_CLEARANCE_TOP + INV_CLEARANCE_BTM}
          fill="rgba(59,130,246,0.04)"
          stroke="rgba(59,130,246,0.5)"
          strokeWidth={1}
          strokeDasharray="4,3"
          rx={3}
        />
      )}

      {/* ── Tooltip ── */}
      <title>{tooltipLines.join("\n")}</title>

      {/* ── Triangle ── */}
      <polygon
        points={`${x},${y - INV_HALF} ${x - INV_HALF},${baseY} ${x + INV_HALF},${baseY}`}
        fill={bg} stroke={c} strokeWidth={2.5} strokeLinejoin="miter" />

      {/* ── Quantity inside triangle ── */}
      <text x={x} y={baseY + INV_QTY_INSET} textAnchor="middle" className="text-[18px] font-extrabold" fill={c}>
        {model.quantity}
      </text>

      {/* ── Stacked labels below triangle ── */}
      {/* Line 1: Days of supply (0.8d) */}
      <text x={x} y={baseY + INV_DAYS_Y}
        textAnchor="middle" className="text-[13px] font-semibold" fill={daysColor(model.severity)}>
        {model.waitTimeLabel}
      </text>

      {/* Line 2: Inventory type — uses severity color */}
      <text x={x} y={baseY + INV_WIP_LABEL_Y}
        textAnchor="middle" className="text-[14px] font-bold" fill={c}>
        {typeLabel}
      </text>

      {/* Line 3: Transport icon */}
      {icon && (
        <g transform={`translate(${x - iconSize / 2}, ${baseY + INV_CODE_Y})`}>
          <VsmTransportIcon type={icon.type} x={0} y={0} size={iconSize} severity={icon.severity as any} />
        </g>
      )}
    </g>
  );
}
