// ── Information flow arrow with classical VSM notation ──

interface Props {
  pathD: string;
  labelX: number;
  labelY: number;
  label: string;
  subLabel?: string | null;
  flowStyle?: "MANUAL" | "ELECTRONIC" | "KANBAN" | "SCHEDULE";
  pushNoSignal?: boolean;
  compactSignal?: boolean;
  tooltip?: string;
}

const STROKE: Record<string, string> = {
  MANUAL: "#334155",
  ELECTRONIC: "#2563eb",
  KANBAN: "#7c3aed",
  SCHEDULE: "#475569",
};

const DASH: Record<string, string> = {
  MANUAL: "none",
  ELECTRONIC: "5,4",
  KANBAN: "6,4",
  SCHEDULE: "5,4",
};

const STROKE_WIDTH: Record<string, number> = {
  MANUAL: 1.5,
  ELECTRONIC: 1.6,
  KANBAN: 1.8,
  SCHEDULE: 1.6,
};

export function VsmInformationArrow({ pathD, labelX, labelY, label, subLabel, flowStyle = "MANUAL", pushNoSignal, compactSignal, tooltip }: Props) {
  if (pushNoSignal) {
    return (
      <g>
        {tooltip && <title>{tooltip}</title>}
        <path d={pathD}
          fill="none" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="2,3"
          strokeLinecap="round" opacity={0.5} />
      </g>
    );
  }

  // Compact downstream signal: small dashed line + tiny kanban-like icon, no text label
  if (compactSignal) {
    return (
      <g>
        {tooltip && <title>{tooltip}</title>}
        <path d={pathD}
          fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3"
          strokeLinecap="round" opacity={0.7}
          markerEnd="url(#arr-info-KANBAN)" />
        {/* Tiny Kanban card at midpoint */}
        <CompactSignalMarker pathD={pathD} />
      </g>
    );
  }

  const stroke = STROKE[flowStyle] ?? "#334155";
  const dash = DASH[flowStyle] ?? "none";
  const markerId = `arr-info-${flowStyle}`;

  return (
    <g>
      {tooltip && (
        <title>{tooltip}</title>
      )}
      {/* Main line */}
      <path d={pathD}
        fill="none" stroke={stroke} strokeWidth={STROKE_WIDTH[flowStyle] ?? 1.5}
        strokeDasharray={dash} strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
        className="cursor-pointer" />

      {/* Lightning icon at midpoint for electronic flows */}
      {flowStyle === "ELECTRONIC" && (
        <LightningMarker pathD={pathD} stroke={stroke} />
      )}

      {/* Card marker at midpoint for kanban flows */}
      {flowStyle === "KANBAN" && (
        <KanbanMarker pathD={pathD} stroke={stroke} />
      )}

      {/* Label background mask — prevents line stroke showing through text */}
      {label && (
        <rect
          x={labelX - label.length * 3.6 - 4}
          y={labelY - 12}
          width={label.length * 7.2 + 8}
          height={subLabel ? 26 : 18}
          rx={3}
          fill="#f8fafc"
          fillOpacity={0.92}
          stroke="none"
        />
      )}

      {/* Label — 12px bold per VSM cleanup spec */}
      {label && (
        <text x={labelX} y={labelY}
          textAnchor="middle" className="text-[12px] font-bold" fill={stroke}>
          {label}
        </text>
      )}

      {/* Frequency/method sub-label */}
      {subLabel && (
        <text x={labelX} y={labelY + 14}
          textAnchor="middle" className="text-[10px] font-semibold" fill="#64748b">
          {subLabel}
        </text>
      )}
    </g>
  );
}

/** Extract midpoint from SVG path string */
function midFromPath(pathD: string): { x: number; y: number } | null {
  try {
    const nums = pathD.match(/[\d.]+/g);
    if (!nums || nums.length < 4) return null;
    const vals = nums.map(Number);
    return { x: (vals[0] + vals[vals.length - 2]) / 2, y: (vals[1] + vals[vals.length - 1]) / 2 };
  } catch {
    return null;
  }
}

/** Readable lightning bolt icon at electronic flow midpoint */
function LightningMarker({ pathD, stroke }: { pathD: string; stroke: string }) {
  const mid = midFromPath(pathD);
  if (!mid) return null;
  const s = 7;
  return (
    <g transform={`translate(${mid.x - s},${mid.y - s})`}>
      <polygon
        points={`0,${s * 2} ${s * 0.7},${s * 0.8} ${s * 1.2},${s * 1.4} ${s * 2},0 ${s * 1.3},${s * 1.2} ${s * 0.8},${s * 0.6}`}
        fill={stroke} stroke="none" strokeLinejoin="round" />
    </g>
  );
}

/** Tiny compact signal marker (smaller kanban-like icon) for downstream flows */
function CompactSignalMarker({ pathD }: { pathD: string }) {
  const mid = midFromPath(pathD);
  if (!mid) return null;
  const s = 6;
  return (
    <g transform={`translate(${mid.x - s / 2},${mid.y - s / 2})`}>
      <rect x={0} y={0} width={s} height={s * 0.75}
        fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} rx={1} />
      <text x={s / 2} y={s * 0.48}
        textAnchor="middle" className="text-[6px] font-extrabold" fill="#64748b">
        K
      </text>
    </g>
  );
}

/** Kanban card icon at signal midpoint */
function KanbanMarker({ pathD, stroke }: { pathD: string; stroke: string }) {
  const mid = midFromPath(pathD);
  if (!mid) return null;
  const s = 10;
  return (
    <g transform={`translate(${mid.x - s / 2},${mid.y - s / 2})`}>
      <rect x={0} y={0} width={s} height={s * 0.75}
        fill="#f5f3ff" stroke={stroke} strokeWidth={1.2} rx={2} />
      <text x={s / 2} y={s * 0.48}
        textAnchor="middle" className="text-[11px] font-extrabold" fill={stroke}>
        K
      </text>
    </g>
  );
}
