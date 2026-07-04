// ── Shipment marker — vertical stack: label, truck icon, frequency ──

import { VsmTransportIcon } from "./VsmTransportIcons";

interface Props {
  cx: number;
  y: number;
  label?: string | null;
  frequency?: string | null;
  equipmentType?: string | null;
  direction?: "inbound" | "outbound";
  from?: string | null;
  to?: string | null;
}

const ICON_SIZE = 88;

export function VsmShipmentMarker({ cx, y, label, frequency, equipmentType, from, to }: Props) {
  // Vertical layout — fixed offsets from group top
  const labelY = -8;        // "Shipment" baseline (11px text, occupies y≈-8 to y≈3)
  const iconY = 0;          // icon top: icon content starts here
  const freqY = 78;         // frequency baseline: below larger 88px icon

  // Tooltip
  const tooltipParts: string[] = [];
  if (label) tooltipParts.push(label);
  if (frequency) tooltipParts.push(`Frequency: ${frequency}`);
  if (equipmentType) tooltipParts.push(`Equipment: ${equipmentType}`);
  if (from) tooltipParts.push(`From: ${from}`);
  if (to) tooltipParts.push(`To: ${to}`);
  const tooltip = tooltipParts.join("\n");

  return (
    <g>
      <title>{tooltip}</title>

      {/* Shipment label */}
      <text x={cx} y={y + labelY}
        textAnchor="middle" className="text-[11px] font-bold" fill="hsl(var(--muted-foreground))">
        {label || "Shipment"}
      </text>

      {/* Truck icon from material handling icon set */}
      <VsmTransportIcon type="TRUCK" x={cx - ICON_SIZE / 2} y={y + iconY} size={ICON_SIZE} />

      {/* Frequency */}
      {frequency && (
        <text x={cx} y={y + freqY}
          textAnchor="middle" className="text-[11px] font-bold" fill="hsl(var(--foreground))">
          {frequency}
        </text>
      )}
    </g>
  );
}
