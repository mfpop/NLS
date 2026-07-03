import type { TimelineSegmentModel, TotalsModel } from "./vsmTemplateTypes";
import {
  TIMELINE_TOP_Y, TIMELINE_BTM_Y, VA_HALF,
} from "./vsmTemplateGeometry";

interface SteppedProps {
  segments: TimelineSegmentModel[];
  segmentCentersX: number[];
  startX: number;
  totals: TotalsModel;
  totBoxLeft: number;
  taktTimeSeconds?: number | null;
}

export function VsmSteppedTimeline({ segments, segmentCentersX, startX, totBoxLeft, taktTimeSeconds }: SteppedProps) {
  if (!segments.length) return null;

  const waits: Array<{ x: number; label: string | null }> = [];
  const vas: Array<{ x: number; label: string | null }> = [];
  const pts: string[] = [`${startX},${TIMELINE_TOP_Y}`];
  let segStartX = startX;

  segments.forEach((seg, i) => {
    const cx = segmentCentersX[i] ?? startX;
    const waitEndX = cx - VA_HALF;
    pts.push(`${waitEndX},${TIMELINE_TOP_Y}`);
    waits.push({
      x: (segStartX + waitEndX) / 2,
      label: seg.waitTimeLabel,
    });
    pts.push(`${waitEndX},${TIMELINE_BTM_Y}`);
    const vaEndX = cx + VA_HALF;
    pts.push(`${vaEndX},${TIMELINE_BTM_Y}`);
    vas.push({ x: cx, label: seg.processTimeLabel });
    pts.push(`${vaEndX},${TIMELINE_TOP_Y}`);
    segStartX = vaEndX;
  });

  // Extend past last segment to the totals box left edge
  pts.push(`${totBoxLeft},${TIMELINE_TOP_Y}`);

  return (
    <g>
      {/* Stepped line */}
      <polyline
        points={pts.join(" ")}
        fill="none" stroke="#334155" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square"
      />

      {/* Wait labels */}
      {waits.map((w, i) =>
        w.label ? (
          <text key={`wt-${i}`} x={w.x} y={TIMELINE_TOP_Y - 12}
            textAnchor="middle" className="text-[17px] font-bold" fill="#1e293b">
            {w.label}
          </text>
        ) : null
      )}

      {/* VA labels */}
      {vas.map((v, i) =>
        v.label ? (
          <text key={`va-${i}`} x={v.x} y={TIMELINE_BTM_Y + 18}
            textAnchor="middle" className="text-[17px] font-bold" fill="#047857">
            {v.label}
          </text>
        ) : null
      )}

      {/* Process names */}
      {segments.map((seg, i) => (
        <text key={`pn-${i}`} x={segmentCentersX[i] ?? startX} y={TIMELINE_BTM_Y + 40}
          textAnchor="middle" className="text-[16px] font-semibold" fill="#334155">
          {seg.processLabel.length > 22 ? seg.processLabel.slice(0, 20) + "\u2026" : seg.processLabel}
        </text>
      ))}

      {/* Takt reference line — horizontal dashed line at the VA bar level */}
      {taktTimeSeconds != null && vas.length > 0 && (
        <g>
          <line x1={startX} y1={TIMELINE_BTM_Y} x2={totBoxLeft} y2={TIMELINE_BTM_Y}
            stroke="#3b82f6" strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
          <text x={startX - 4} y={TIMELINE_BTM_Y + 4}
            textAnchor="end" className="text-[10px] font-semibold" fill="#3b82f6">
            Takt ref
          </text>
        </g>
      )}

      {/* Clean end cap — small circle at the polyline endpoint (replaces totals box) */}
      <circle cx={totBoxLeft} cy={TIMELINE_TOP_Y} r={3} fill="#334155" opacity={0.6} />
    </g>
  );
}

interface TotalsProps {
  x: number;
  y: number;
  width: number;
  height: number;
  totals: TotalsModel;
}

export function VsmTotalsBox({ x, y, width, height, totals }: TotalsProps) {
  const vaPct = totals.valueAddedPercent;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height}
        fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} rx={3} />

      {/* Lead Time — 14px (+20% from 12px) */}
      <text x={x + width / 2} y={y + 20}
        textAnchor="middle" className="text-[14px] font-semibold" fill="#64748b">
        <tspan className="font-bold" fill="#0f172a">{totals.leadTimeLabel}</tspan>
        <tspan fill="#94a3b8"> Lead Time</tspan>
      </text>

      {/* VA Time — 14px */}
      <text x={x + width / 2} y={y + 40}
        textAnchor="middle" className="text-[14px] font-semibold" fill="#64748b">
        <tspan className="font-bold" fill="#047857">{totals.valueAddedTimeLabel}</tspan>
        <tspan fill="#94a3b8"> VA Time</tspan>
      </text>

      <line x1={x + 8} y1={y + 47} x2={x + width - 8} y2={y + 47}
        stroke="#cbd5e1" strokeWidth={0.5} />

      {/* VA % — 17px (+20% from 14px) */}
      <text x={x + width / 2} y={y + 60}
        textAnchor="middle"
        className={`text-[17px] font-extrabold ${vaPct < 5 ? "fill-red-500" : vaPct < 20 ? "fill-amber-500" : "fill-emerald-600"}`}>
        VA {vaPct}%
      </text>
    </g>
  );
}
