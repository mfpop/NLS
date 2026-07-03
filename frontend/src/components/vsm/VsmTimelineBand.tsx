import type { VsmTimelineEvent } from "@/types/vsm";

interface Props {
  events: VsmTimelineEvent[];
  totalLeadTimeMinutes: number;
  totalValueAddMinutes: number;
  bandY: number;
  bandHeight: number;
  canvasWidth: number;
  startX: number;
  processSpacing: number;
  processWidth: number;
  numProcesses: number;
}

export function VsmTimelineBand({
  events, totalLeadTimeMinutes, totalValueAddMinutes,
  bandY, bandHeight, canvasWidth,
  startX, processSpacing, processWidth, numProcesses,
}: Props) {
  const vaPct = totalLeadTimeMinutes > 0
    ? Math.round((totalValueAddMinutes / totalLeadTimeMinutes) * 100)
    : 0;
  const maxTime = Math.max(totalLeadTimeMinutes, 1);

  const titleY = bandY + 12;
  const vaRowY = bandY + 24;
  const nvaRowY = bandY + 44;
  const barH = 14;
  const totalWidth = numProcesses * processSpacing;
  const totalBoxX = totalWidth > 0 ? startX + totalWidth + 20 : startX + 200;

  return (
    <g>
      <rect x={0} y={bandY} width={canvasWidth} height={bandHeight} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
      <text x={10} y={titleY} className="text-[7px] font-semibold uppercase tracking-wider" fill="#94a3b8">
        VA/NVA TIMELINE
      </text>

      <text x={startX} y={vaRowY - 3} className="text-[7px]" fill="#16a34a">VA</text>
      <text x={startX + 16} y={vaRowY - 3} className="text-[6px]" fill="#94a3b8">value-add</text>
      <text x={startX} y={nvaRowY - 3} className="text-[7px]" fill="#94a3b8">NVA</text>
      <text x={startX + 18} y={nvaRowY - 3} className="text-[6px]" fill="#94a3b8">wait</text>

      {events.map((event, i) => {
        const cx = startX + i * processSpacing + processWidth / 2;
        const pw = Math.max(6, processWidth * 0.35);
        const ph = Math.max(4, (event.processTimeMinutes / maxTime) * barH);
        return (
          <g key={`va-${i}`}>
            <rect x={cx - pw / 2} y={vaRowY + barH - ph} width={pw} height={ph} rx={1} fill="#22c55e" opacity={0.85} />
            {event.isBottleneck && (
              <rect x={cx - pw / 2 - 1} y={vaRowY + barH - ph - 1} width={pw + 2} height={ph + 2} rx={2}
                fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="2,2" />
            )}
          </g>
        );
      })}

      {events.map((event, i) => {
        const cx = startX + i * processSpacing + processWidth / 2;
        const pw = Math.max(10, processWidth * 0.55);
        const ph = Math.max(4, (event.waitTimeMinutes / maxTime) * barH);
        return (
          <rect key={`nva-${i}`} x={cx - pw / 2} y={nvaRowY + barH - ph} width={pw} height={ph} rx={1}
            fill="#cbd5e1" opacity={0.7} />
        );
      })}

      {processSpacing > 0 && numProcesses > 0 && events.map((_event, i) => {
        if (i >= numProcesses - 1) return null;
        const fromRight = startX + (i + 1) * processSpacing;
        const toLeft = fromRight + processSpacing;
        return (
          <line key={`step-${i}`} x1={fromRight} y1={nvaRowY + barH} x2={toLeft} y2={nvaRowY + barH}
            stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="2,2" />
        );
      })}

      {events.map((event, i) => {
        const cx = startX + i * processSpacing + processWidth / 2;
        return (
          <text key={`step-label-${i}`} x={cx} y={nvaRowY + barH + 12}
            textAnchor="middle" className="text-[6px]" fill="#64748b">
            {event.stepName}
          </text>
        );
      })}

      <rect x={totalBoxX} y={bandY + 4} width={130} height={bandHeight - 8} rx={3}
        fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={1} />
      <text x={totalBoxX + 8} y={bandY + 18} className="text-[8px] font-semibold uppercase tracking-wider" fill="#1e293b">Totals</text>
      <text x={totalBoxX + 8} y={bandY + 32} className="text-[9px]" fill="#475569">
        Lead: {formatTime(totalLeadTimeMinutes)}
      </text>
      <text x={totalBoxX + 8} y={bandY + 44} className="text-[9px]" fill="#16a34a">
        VA: {formatTime(totalValueAddMinutes)}
      </text>
      <text x={totalBoxX + 8} y={bandY + 58}
        className={`text-[9px] font-bold ${vaPct < 10 ? "fill-red-500" : vaPct < 30 ? "fill-amber-500" : "fill-emerald-600"}`}>
        VA% = {vaPct}%
      </text>
    </g>
  );
}

function formatTime(minutes: number): string {
  if (minutes >= 1440) return `${(minutes / 1440).toFixed(1)}d`;
  if (minutes >= 60) return `${Math.round(minutes / 60)}min`;
  return `${minutes}min`;
}
