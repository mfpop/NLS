import type { OpportunityType } from "./vsmTemplateTypes";

interface KaizenBurstProps {
  type: OpportunityType;
  severity: "minor" | "major" | "critical";
  x: number;
  y: number;
  size?: number;
  message?: string;
  recommendation?: string;
}

/**
 * Kaizen burst / starburst SVG component.
 * Renders a 4-point explosion star with an inner icon indicating the opportunity type.
 * Placed on the VSM process boxes to highlight improvement opportunities.
 */
export function VsmKaizenBurst({ type, severity, x, y, size = 32, message, recommendation }: KaizenBurstProps) {
  const half = size / 2;

  // Colors by severity
  const palette = severity === "critical"
    ? { fill: "#dc2626", stroke: "#991b1b", bg: "#fef2f2" }
    : severity === "major"
      ? { fill: "#ea580c", stroke: "#c2410c", bg: "#fff7ed" }
      : { fill: "#f59e0b", stroke: "#b45309", bg: "#fffbeb" };

  // 4-point starburst path: outer points at (0, -half), (half, 0), (0, half), (-half, 0)
  // Inner points at ±(half*0.35) for the concave indentations
  const i = half * 0.35;
  const burstD = [
    `M${x},${y - half}`,
    `L${x + i},${y - i}`,
    `L${x + half},${y}`,
    `L${x + i},${y + i}`,
    `L${x},${y + half}`,
    `L${x - i},${y + i}`,
    `L${x - half},${y}`,
    `L${x - i},${y - i}`,
    "Z",
  ].join(" ");

  return (
    <g>
      {/* Tooltip */}
      <title>{message || "Improvement opportunity"}{recommendation ? `\nRecommendation: ${recommendation}` : ""}</title>
      {/* Burst shadow */}
      <path d={burstD} fill="none" stroke={palette.stroke} strokeWidth={2.5} strokeLinejoin="round"
        transform={`translate(1,1)`} opacity={0.3} />
      {/* Burst fill */}
      <path d={burstD} fill={palette.fill} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Inner icon */}
      <BurstIcon type={type} x={x} y={y} color="#fff" size={half * 0.8} />
    </g>
  );
}

/**
 * Small marker badge shown next to data rows in the data box area.
 * More compact than the full kaizen burst.
 */
export function VsmOpportunityBadge({ type, x, y }: {
  type: OpportunityType;
  x: number;
  y: number;
}) {
  const palette = BADGE_PALETTE[type] ?? BADGE_PALETTE.HIGH_WIP;
  const label = OPP_LABELS[type] ?? "Issue";
  const r = 7;

  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={palette.bg} stroke={palette.stroke} strokeWidth={1.5} />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
        className="text-[10px] font-extrabold" fill={palette.fill}>
        {label}
      </text>
    </g>
  );
}

// ── Inner icons ──

function BurstIcon({ type, x, y, color, size }: {
  type: OpportunityType; x: number; y: number; color: string; size: number;
}) {
  const gap = size * 0.3;
  const ih = size * 0.6;
  const iw = size * 0.6;

  switch (type) {
    case "HIGH_WIP":
      // Stacked boxes icon (inventory)
      return (
        <g>
          <rect x={x - iw / 2} y={y - ih / 2 + 2} width={iw} height={ih - 4}
            fill="none" stroke={color} strokeWidth={1.5} rx={1.5} />
          <rect x={x - iw / 2 - 1} y={y - ih / 2 - 1} width={iw} height={ih - 4}
            fill="none" stroke={color} strokeWidth={1.5} rx={1.5} opacity={0.6} />
        </g>
      );
    case "CT_ABOVE_TAKT":
      // Up arrow with clock
      return (
        <g>
          <line x1={x} y1={y + gap} x2={x} y2={y - gap} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <polygon points={`${x},${y - gap - 2} ${x - 3.5},${y - gap + 3} ${x + 3.5},${y - gap + 3}`}
            fill={color} />
        </g>
      );
    case "LOW_UPTIME":
      // Down arrow
      return (
        <g>
          <line x1={x} y1={y - gap} x2={x} y2={y + gap} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <polygon points={`${x},${y + gap + 2} ${x - 3.5},${y + gap - 3} ${x + 3.5},${y + gap - 3}`}
            fill={color} />
        </g>
      );
    case "QUALITY_LOSS":
      // "X" mark
      return (
        <g>
          <line x1={x - gap * 0.6} y1={y - gap * 0.6}
            x2={x + gap * 0.6} y2={y + gap * 0.6}
            stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <line x1={x + gap * 0.6} y1={y - gap * 0.6}
            x2={x - gap * 0.6} y2={y + gap * 0.6}
            stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      );
  }
}

// ── Helpers ──

const BADGE_PALETTE: Record<OpportunityType, { fill: string; stroke: string; bg: string }> = {
  HIGH_WIP: { fill: "#d97706", stroke: "#b45309", bg: "#fffbeb" },
  CT_ABOVE_TAKT: { fill: "#dc2626", stroke: "#991b1b", bg: "#fef2f2" },
  LOW_UPTIME: { fill: "#ea580c", stroke: "#c2410c", bg: "#fff7ed" },
  QUALITY_LOSS: { fill: "#9333ea", stroke: "#7e22ce", bg: "#faf5ff" },
};

const OPP_LABELS: Record<OpportunityType, string> = {
  HIGH_WIP: "W",
  CT_ABOVE_TAKT: "T",
  LOW_UPTIME: "U",
  QUALITY_LOSS: "Q",
};

/**
 * Detect improvement opportunities from process data.
 * Used by both mappers to auto-generate kaizen bursts.
 */
export function detectOpportunities(params: {
  wip?: number | null;
  isAboveTakt?: boolean | null;
  uptimePercent?: number | null;
  yieldPercent?: number | null;
  defectRate?: number | null;
  cycleTimeVsTakt?: string | null;
}): Array<{ type: OpportunityType; severity: "minor" | "major" | "critical"; label: string; message: string }> {
  const ops: Array<{ type: OpportunityType; severity: "minor" | "major" | "critical"; label: string; message: string }> = [];

  // High WIP
  const wip = params.wip ?? 0;
  if (wip > 100) {
    ops.push({ type: "HIGH_WIP", severity: "critical", label: "High WIP", message: `WIP = ${wip} — exceeds target` });
  } else if (wip > 60) {
    ops.push({ type: "HIGH_WIP", severity: "major", label: "High WIP", message: `WIP = ${wip} — above threshold` });
  }

  // C/T above takt
  const aboveTakt = params.isAboveTakt ?? (params.cycleTimeVsTakt === "above" ? true : null);
  if (aboveTakt === true) {
    ops.push({ type: "CT_ABOVE_TAKT", severity: "critical", label: "C/T > Takt", message: "Cycle time exceeds takt time" });
  }

  // Low uptime
  const uptime = params.uptimePercent ?? 100;
  if (uptime < 80) {
    ops.push({ type: "LOW_UPTIME", severity: "critical", label: "Low Uptime", message: `Uptime = ${uptime}%` });
  } else if (uptime < 90) {
    ops.push({ type: "LOW_UPTIME", severity: "major", label: "Low Uptime", message: `Uptime = ${uptime}%` });
  }

  // Quality loss
  const yieldPct = params.yieldPercent ?? 100;
  const defect = params.defectRate ?? 0;
  if (yieldPct < 95 || defect > 5) {
    ops.push({ type: "QUALITY_LOSS", severity: "critical", label: "Quality Loss", message: `Yield = ${yieldPct}%` });
  } else if (yieldPct < 98 || defect > 2) {
    ops.push({ type: "QUALITY_LOSS", severity: "major", label: "Quality Loss", message: `Yield = ${yieldPct}%` });
  }

  return ops;
}
