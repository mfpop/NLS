// ── Material flow arrow — flow-type label above, transport annotation below ──

interface TransportInfo {
  distance?: number | null;
  distanceUnit?: string;
  tripFrequency?: string;
  batchSize?: number | null;
  handlingTime?: number | null;
  handlingTimeUnit?: string;
  equipmentType?: string | null;
  equipmentLabel?: string | null;
}

interface Props {
  x1: number;
  x2: number;
  y: number;
  label: string | null;
  flowType: "PUSH" | "PULL" | "KANBAN" | "FIFO" | "SUPERMARKET" | "SHIPMENT";
  transport?: TransportInfo | null;
  /** If true, suppress flow-type text label (arrow + icon is enough). */
  hideLabel?: boolean;
}

const STROKE: Record<string, string> = {
  PUSH: "#334155",
  PULL: "#3b82f6",
  KANBAN: "#f59e0b",
  FIFO: "#16a34a",
  SUPERMARKET: "#ea580c",
  SHIPMENT: "#1e293b",
};

const DASH: Record<string, string> = {
  PUSH: "none",
  PULL: "9,5",
  KANBAN: "3,3",
  FIFO: "6,3",
  SUPERMARKET: "none",
  SHIPMENT: "none",
};

const FLOW_LABELS: Record<string, string> = {
  PUSH: "PUSH",
  PULL: "PULL",
  KANBAN: "KANBAN",
  FIFO: "FIFO",
  SUPERMARKET: "SUPERMARKET",
  SHIPMENT: "SHIPMENT",
};

export function VsmMaterialArrow({ x1, x2, y, label, flowType, transport, hideLabel }: Props) {
  if (x1 >= x2) return null;

  const stroke = STROKE[flowType] ?? "#334155";
  const dash = DASH[flowType] ?? "none";
  const markerId = `arr-${flowType}`;
  const cx = (x1 + x2) / 2;
  const flowLabel = FLOW_LABELS[flowType] ?? flowType;

  // Build transport annotation: "Every 2h · 40m"
  const annotParts: string[] = [];
  if (transport?.tripFrequency) annotParts.push(transport.tripFrequency);
  if (transport?.distance != null) annotParts.push(`${transport.distance}${transport.distanceUnit || "m"}`);
  const annotation = annotParts.join(" · ");

  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y}
        stroke={stroke} strokeWidth={flowType === "SHIPMENT" ? 4 : 3.5} strokeLinecap="round"
        strokeDasharray={dash}
        markerEnd={`url(#${markerId})`} />

      {/* Flow type label above arrow — suppressed when hideLabel=true */}
      {!hideLabel && (
        <text x={cx} y={y - 10}
          textAnchor="middle" className="text-[12px] font-bold" fill={stroke}>
          {flowLabel}
        </text>
      )}

      {/* Custom label above arrow */}
      {label && label.length < 20 && (
        <text x={cx} y={y + 14}
          textAnchor="middle" className="text-[10px] font-medium" fill="#64748b">
          {label}
        </text>
      )}

      {/* Transport annotation below arrow (frequency · distance) */}
      {annotation && (
        <text x={cx} y={y + 26}
          textAnchor="middle" className="text-[9px] font-medium" fill="#94a3b8">
          {annotation}
        </text>
      )}
    </g>
  );
}
