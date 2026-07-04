// ── Material handling equipment SVG icons for VSM ──
// Line icons, 16-22px, consistent stroke, no heavy fills

interface IconProps {
  x: number;
  y: number;
  size?: number;
  severity?: "NORMAL" | "WARNING" | "CRITICAL" | "UNKNOWN";
  color?: string;
}

const SEV_COLORS: Record<string, string> = {
  NORMAL: "hsl(var(--muted-foreground))",
  WARNING: "hsl(var(--warning))",
  CRITICAL: "hsl(var(--danger))",
  UNKNOWN: "hsl(var(--muted-foreground) / 0.6)",
};

function useColor(severity?: IconProps["severity"], color?: string): string {
  if (color) return color;
  if (severity && SEV_COLORS[severity]) return SEV_COLORS[severity];
  return "#64748b";
}

// ── Dispatch component ──
export function VsmTransportIcon({
  type, x, y, size = 36, severity = "UNKNOWN",
}: IconProps & { type: string }) {
  const p = { x, y, size, severity };
  switch (type) {
    case "FORKLIFT": return <VsmForkliftIcon {...p} />;
    case "PALLET_JACK": return <VsmPalletJackIcon {...p} />;
    case "TUGGER": return <VsmTuggerIcon {...p} />;
    case "HAND_CART": return <VsmHandCartIcon {...p} />;
    case "MANUAL_CARRY": return <VsmManualCarryIcon {...p} />;
    case "CONVEYOR": return <VsmConveyorIcon {...p} />;
    case "AGV": return <VsmAgvIcon {...p} />;
    case "TRUCK": return <VsmTruckIconSmall {...p} />;
    default: return null;
  }
}

// ── Forklift ──
export function VsmForkliftIcon({ x, y, size = 18, severity, color }: IconProps) {
  const c = useColor(severity, color);
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>Forklift</title>
      {/* Body */}
      <rect x={s * 0.15} y={s * 0.25} width={s * 0.55} height={s * 0.45} rx={s * 0.06} fill="none" stroke={c} strokeWidth={1.5} />
      {/* Mast */}
      <line x1={s * 0.7} y1={s * 0.25} x2={s * 0.85} y2={s * 0.1} stroke={c} strokeWidth={1.5} />
      <line x1={s * 0.85} y1={s * 0.1} x2={s * 0.85} y2={s * 0.7} stroke={c} strokeWidth={1.5} />
      {/* Forks */}
      <line x1={s * 0.78} y1={s * 0.7} x2={s * 0.95} y2={s * 0.85} stroke={c} strokeWidth={1.2} />
      <line x1={s * 0.85} y1={s * 0.7} x2={s * 1.0} y2={s * 0.85} stroke={c} strokeWidth={1.2} />
      {/* Wheels */}
      <circle cx={s * 0.3} cy={s * 0.7} r={s * 0.1} fill={c} />
      <circle cx={s * 0.55} cy={s * 0.7} r={s * 0.1} fill={c} />
      {/* Seat */}
      <line x1={s * 0.25} y1={s * 0.45} x2={s * 0.45} y2={s * 0.45} stroke={c} strokeWidth={1} />
      {/* Roof */}
      <line x1={s * 0.15} y1={s * 0.25} x2={s * 0.6} y2={s * 0.25} stroke={c} strokeWidth={1.2} />
    </g>
  );
}

// ── Pallet Jack ──
export function VsmPalletJackIcon({ x, y, size = 18, severity, color }: IconProps) {
  const c = useColor(severity, color);
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>Pallet Jack</title>
      {/* Handle */}
      <line x1={s * 0.2} y1={s * 0.15} x2={s * 0.4} y2={s * 0.35} stroke={c} strokeWidth={1.5} />
      <line x1={s * 0.15} y1={s * 0.15} x2={s * 0.25} y2={s * 0.15} stroke={c} strokeWidth={1.5} />
      {/* Body */}
      <rect x={s * 0.3} y={s * 0.3} width={s * 0.4} height={s * 0.25} rx={s * 0.04} fill="none" stroke={c} strokeWidth={1.5} />
      {/* Forks */}
      <line x1={s * 0.25} y1={s * 0.55} x2={s * 0.9} y2={s * 0.6} stroke={c} strokeWidth={1.5} />
      <line x1={s * 0.25} y1={s * 0.7} x2={s * 0.9} y2={s * 0.75} stroke={c} strokeWidth={1.5} />
      {/* Wheel */}
      <circle cx={s * 0.5} cy={s * 0.55} r={s * 0.08} fill={c} />
      {/* Load */}
      <rect x={s * 0.65} y={s * 0.35} width={s * 0.2} height={s * 0.15} rx={1} fill="none" stroke={c} strokeWidth={1} strokeDasharray="1,1" />
    </g>
  );
}

// ── Tugger (tugger train / AGV cart) ──
export function VsmTuggerIcon({ x, y, size = 18, severity, color }: IconProps) {
  const c = useColor(severity, color);
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>Tugger</title>
      {/* Tractor unit */}
      <rect x={s * 0.1} y={s * 0.25} width={s * 0.3} height={s * 0.3} rx={s * 0.05} fill="none" stroke={c} strokeWidth={1.5} />
      {/* Cab window */}
      <rect x={s * 0.13} y={s * 0.28} width={s * 0.12} height={s * 0.1} rx={1} fill="none" stroke={c} strokeWidth={1} />
      {/* Wheels */}
      <circle cx={s * 0.2} cy={s * 0.55} r={s * 0.07} fill={c} />
      <circle cx={s * 0.32} cy={s * 0.55} r={s * 0.07} fill={c} />
      {/* Trailer 1 */}
      <rect x={s * 0.42} y={s * 0.3} width={s * 0.2} height={s * 0.2} rx={s * 0.03} fill="none" stroke={c} strokeWidth={1.2} />
      <circle cx={s * 0.52} cy={s * 0.5} r={s * 0.06} fill={c} />
      {/* Trailer 2 */}
      <rect x={s * 0.64} y={s * 0.3} width={s * 0.2} height={s * 0.2} rx={s * 0.03} fill="none" stroke={c} strokeWidth={1.2} />
      <circle cx={s * 0.74} cy={s * 0.5} r={s * 0.06} fill={c} />
      {/* Hitch */}
      <line x1={s * 0.4} y1={s * 0.4} x2={s * 0.42} y2={s * 0.4} stroke={c} strokeWidth={1.5} />
      <line x1={s * 0.62} y1={s * 0.4} x2={s * 0.64} y2={s * 0.4} stroke={c} strokeWidth={1.5} />
    </g>
  );
}

// ── Hand Cart ──
export function VsmHandCartIcon({ x, y, size = 18, severity, color }: IconProps) {
  const c = useColor(severity, color);
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>Hand Cart</title>
      {/* Handles */}
      <line x1={s * 0.15} y1={s * 0.1} x2={s * 0.2} y2={s * 0.35} stroke={c} strokeWidth={1.5} />
      <line x1={s * 0.15} y1={s * 0.1} x2={s * 0.35} y2={s * 0.1} stroke={c} strokeWidth={1.5} />
      {/* Frame */}
      <line x1={s * 0.2} y1={s * 0.35} x2={s * 0.8} y2={s * 0.35} stroke={c} strokeWidth={1.5} />
      <line x1={s * 0.8} y1={s * 0.35} x2={s * 0.8} y2={s * 0.75} stroke={c} strokeWidth={1.5} />
      {/* Bed */}
      <line x1={s * 0.25} y1={s * 0.55} x2={s * 0.75} y2={s * 0.55} stroke={c} strokeWidth={1} />
      <line x1={s * 0.25} y1={s * 0.65} x2={s * 0.75} y2={s * 0.65} stroke={c} strokeWidth={1} />
      {/* Wheel */}
      <circle cx={s * 0.8} cy={s * 0.78} r={s * 0.1} fill={c} />
      {/* Leg */}
      <line x1={s * 0.3} y1={s * 0.75} x2={s * 0.3} y2={s * 0.85} stroke={c} strokeWidth={1} />
    </g>
  );
}

// ── Manual Carry ──
export function VsmManualCarryIcon({ x, y, size = 18, severity, color }: IconProps) {
  const c = useColor(severity, color);
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>Manual Carry</title>
      {/* Person (head + body) */}
      <circle cx={s * 0.5} cy={s * 0.18} r={s * 0.12} fill="none" stroke={c} strokeWidth={1.5} />
      <line x1={s * 0.5} y1={s * 0.3} x2={s * 0.5} y2={s * 0.55} stroke={c} strokeWidth={1.5} />
      {/* Arms carrying box */}
      <line x1={s * 0.3} y1={s * 0.38} x2={s * 0.7} y2={s * 0.38} stroke={c} strokeWidth={1.5} />
      {/* Box being carried */}
      <rect x={s * 0.3} y={s * 0.28} width={s * 0.4} height={s * 0.12} rx={2} fill="none" stroke={c} strokeWidth={1.2} />
      {/* Legs */}
      <line x1={s * 0.5} y1={s * 0.55} x2={s * 0.35} y2={s * 0.8} stroke={c} strokeWidth={1.5} />
      <line x1={s * 0.5} y1={s * 0.55} x2={s * 0.65} y2={s * 0.8} stroke={c} strokeWidth={1.5} />
    </g>
  );
}

// ── Conveyor ──
export function VsmConveyorIcon({ x, y, size = 18, severity, color }: IconProps) {
  const c = useColor(severity, color);
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>Conveyor</title>
      {/* Belt */}
      <line x1={0} y1={s * 0.6} x2={s} y2={s * 0.6} stroke={c} strokeWidth={1.5} />
      {/* Rollers */}
      <line x1={s * 0.1} y1={s * 0.45} x2={s * 0.1} y2={s * 0.6} stroke={c} strokeWidth={1} />
      <line x1={s * 0.3} y1={s * 0.45} x2={s * 0.3} y2={s * 0.6} stroke={c} strokeWidth={1} />
      <line x1={s * 0.5} y1={s * 0.45} x2={s * 0.5} y2={s * 0.6} stroke={c} strokeWidth={1} />
      <line x1={s * 0.7} y1={s * 0.45} x2={s * 0.7} y2={s * 0.6} stroke={c} strokeWidth={1} />
      <line x1={s * 0.9} y1={s * 0.45} x2={s * 0.9} y2={s * 0.6} stroke={c} strokeWidth={1} />
      {/* Topbelt line */}
      <line x1={0} y1={s * 0.45} x2={s} y2={s * 0.45} stroke={c} strokeWidth={1.5} />
      {/* Legs */}
      <line x1={s * 0.2} y1={s * 0.6} x2={s * 0.2} y2={s * 0.85} stroke={c} strokeWidth={1} />
      <line x1={s * 0.8} y1={s * 0.6} x2={s * 0.8} y2={s * 0.85} stroke={c} strokeWidth={1} />
      {/* Item on belt */}
      <rect x={s * 0.45} y={s * 0.32} width={s * 0.15} height={s * 0.13} rx={1} fill="none" stroke={c} strokeWidth={1} />
    </g>
  );
}

// ── AGV ──
export function VsmAgvIcon({ x, y, size = 18, severity, color }: IconProps) {
  const c = useColor(severity, color);
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>AGV</title>
      {/* Body */}
      <rect x={s * 0.1} y={s * 0.25} width={s * 0.8} height={s * 0.35} rx={s * 0.06} fill="none" stroke={c} strokeWidth={1.5} />
      {/* Antenna */}
      <line x1={s * 0.3} y1={s * 0.25} x2={s * 0.3} y2={s * 0.1} stroke={c} strokeWidth={1.2} />
      <circle cx={s * 0.3} cy={s * 0.08} r={s * 0.04} fill={c} />
      {/* Sensor */}
      <circle cx={s * 0.7} cy={s * 0.42} r={s * 0.06} fill="none" stroke={c} strokeWidth={1} />
      {/* Load */}
      <rect x={s * 0.25} y={s * 0.28} width={s * 0.3} height={s * 0.15} rx={1} fill="none" stroke={c} strokeWidth={1} strokeDasharray="1,1" />
      {/* Wheels */}
      <circle cx={s * 0.3} cy={s * 0.6} r={s * 0.07} fill={c} />
      <circle cx={s * 0.7} cy={s * 0.6} r={s * 0.07} fill={c} />
      {/* Signal waves */}
      <path d={`M${s*0.85},${s*0.15} Q${s*0.95},${s*0.2} ${s*0.85},${s*0.3}`} fill="none" stroke={c} strokeWidth={1} />
    </g>
  );
}

// ── Small Truck (for internal material flow labels) ──
export function VsmTruckIconSmall({ x, y, size = 18, severity, color }: IconProps) {
  const c = useColor(severity, color);
  const s = size;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>Truck</title>
      {/* Cab */}
      <path d={`M${s*0.05},${s*0.5} L${s*0.05},${s*0.3} Q${s*0.05},${s*0.25} ${s*0.15},${s*0.25} L${s*0.3},${s*0.25} L${s*0.35},${s*0.4} L${s*0.35},${s*0.5} Z`} fill="none" stroke={c} strokeWidth={2.0} />
      {/* Windshield */}
      <line x1={s * 0.15} y1={s * 0.28} x2={s * 0.25} y2={s * 0.28} stroke={c} strokeWidth={1.2} />
      {/* Bed */}
      <rect x={s * 0.35} y={s * 0.3} width={s * 0.55} height={s * 0.2} rx={s * 0.03} fill="none" stroke={c} strokeWidth={2.0} />
      {/* Wheels */}
      <circle cx={s * 0.2} cy={s * 0.55} r={s * 0.08} fill={c} />
      <circle cx={s * 0.55} cy={s * 0.55} r={s * 0.08} fill={c} />
      <circle cx={s * 0.8} cy={s * 0.55} r={s * 0.08} fill={c} />
    </g>
  );
}

// ── Equipment label helper ──
export const EQUIPMENT_LABELS: Record<string, string> = {
  MANUAL_CARRY: "Manual carry",
  HAND_CART: "Hand cart",
  PALLET_JACK: "Pallet jack",
  FORKLIFT: "Forklift",
  TUGGER: "Tugger",
  CONVEYOR: "Conveyor",
  AGV: "AGV",
  TRUCK: "Truck",
  NONE: "",
  OTHER: "",
  UNKNOWN: "",
};
