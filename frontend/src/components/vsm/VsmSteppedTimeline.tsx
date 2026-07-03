import type { VsmTimelineEvent } from "@/types/vsm";
import { fmtMinutes } from "./vsmFormatters";

interface Props {
  events: VsmTimelineEvent[];
  totalLeadTimeMinutes: number;
  totalValueAddMinutes: number;
  processCentersX: number[];
  startX: number;
  canvasW: number;
}

export function VsmSteppedTimeline({
  events, totalLeadTimeMinutes, totalValueAddMinutes,
  processCentersX, startX, canvasW,
}: Props) {
  if (!events.length) return null;

  const VA_SEG_W = 80;
  const VA_HALF = VA_SEG_W / 2;
  const TOP_Y = 0;
  const BTM_Y = 48;
  const waits: Array<{ x: number; label: string | null }> = [];
  const vas: Array<{ x: number; label: string | null }> = [];

  // ── Build stepped polyline ──
  const pts: Array<string> = [`${startX},${TOP_Y}`];
  let segStartX = startX;

  events.forEach((ev, i) => {
    const cx = processCentersX[i];

    // Wait segment: upper horizontal to left of VA (process center minus half)
    const waitEndX = cx - VA_HALF;
    pts.push(`${waitEndX},${TOP_Y}`);
    const waitLabel = ev.waitTimeMinutes != null
      ? fmtMinutes(ev.waitTimeMinutes)
      : null;
    // Only show label if it's not "0s" and not em-dash
    waits.push({
      x: (segStartX + waitEndX) / 2,
      label: waitLabel === "0s" ? null : waitLabel,
    });

    // Drop
    pts.push(`${waitEndX},${BTM_Y}`);

    // VA segment: short horizontal centered under process
    const vaEndX = cx + VA_HALF;
    pts.push(`${vaEndX},${BTM_Y}`);
    const vaLabel = ev.processTimeMinutes != null
      ? fmtMinutes(ev.processTimeMinutes)
      : null;
    vas.push({
      x: cx,
      label: vaLabel === "0s" ? null : vaLabel,
    });

    // Rise
    pts.push(`${vaEndX},${TOP_Y}`);

    segStartX = vaEndX;
  });

  // Extend line past last process
  pts.push(`${segStartX + 40},${TOP_Y}`);

  // Totals box — after last rise with enough margin
  const totBoxW = 180;
  const totBoxH = BTM_Y + 26;
  const lastVaEndX = processCentersX[events.length - 1] + VA_HALF;
  const totBoxX = Math.min(lastVaEndX + 60, canvasW - totBoxW - 12);

  const vaPct = totalLeadTimeMinutes > 0
    ? Math.round((totalValueAddMinutes / totalLeadTimeMinutes) * 100)
    : 0;

  return (
    <g>
      {/* Stepped polyline — classical VA/NVA ladder */}
      <polyline
        points={pts.join(" ")}
        fill="none" stroke="#334155" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square"
      />

      {/* Wait / NVA labels — above upper segments */}
      {waits.map((w, i) =>
        w.label ? (
          <text key={`wt-${i}`} x={w.x} y={TOP_Y - 8}
            textAnchor="middle" className="text-[10px] font-semibold" fill="#64748b">
            {w.label}
          </text>
        ) : null
      )}

      {/* VA labels — below lower segments */}
      {vas.map((v, i) =>
        v.label ? (
          <text key={`va-${i}`} x={v.x} y={BTM_Y + 14}
            textAnchor="middle" className="text-[10px] font-semibold" fill="#15803d">
            {v.label}
          </text>
        ) : null
      )}

      {/* Process names — below VA labels, aligned to process center */}
      {events.map((ev, i) => (
        <text key={`pn-${i}`} x={processCentersX[i]} y={BTM_Y + 32}
          textAnchor="middle" className="text-[9px] font-medium" fill="#94a3b8">
          {ev.stepName.length > 18 ? ev.stepName.slice(0, 16) + "\u2026" : ev.stepName}
        </text>
      ))}

      {/* ── Totals Box ── */}
      <g>
        <rect x={totBoxX} y={TOP_Y - 6} width={totBoxW} height={totBoxH}
          fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />

        {/* Lead Time */}
        <text x={totBoxX + 10} y={TOP_Y + 14}
          className="text-[10px]" fill="#475569">
          Lead Time: <tspan className="font-semibold" fill="#1e293b">{fmtMinutes(totalLeadTimeMinutes)}</tspan>
        </text>

        {/* VA Time */}
        <text x={totBoxX + 10} y={TOP_Y + 32}
          className="text-[10px]" fill="#15803d">
          VA Time: <tspan className="font-semibold">{fmtMinutes(totalValueAddMinutes)}</tspan>
        </text>

        {/* Separator */}
        <line x1={totBoxX + 8} y1={TOP_Y + 38} x2={totBoxX + totBoxW - 8} y2={TOP_Y + 38}
          stroke="#e2e8f0" strokeWidth={0.5} />

        {/* VA % */}
        <text x={totBoxX + totBoxW / 2} y={TOP_Y + 52}
          textAnchor="middle"
          className={`text-sm font-extrabold ${vaPct < 5 ? "fill-red-500" : vaPct < 20 ? "fill-amber-500" : "fill-emerald-600"}`}>
          VA = {vaPct}%
        </text>
      </g>
    </g>
  );
}
