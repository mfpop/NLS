import type { VsmTimelineEvent } from "@/types/vsm";

interface Props {
  events: VsmTimelineEvent[];
  totalLeadTimeMinutes: number;
  totalValueAddMinutes: number;
  startX: number;
  processSpacing: number;
  processWidth: number;
  canvasWidth: number;
}

export function VsmTimelineBar({ events, totalLeadTimeMinutes, totalValueAddMinutes, startX, processSpacing, processWidth, canvasWidth }: Props) {
  const vaPct = totalLeadTimeMinutes > 0 ? Math.round((totalValueAddMinutes / totalLeadTimeMinutes) * 100) : 0;
  const maxTime = Math.max(totalLeadTimeMinutes, 1);
  const barHeight = 14;
  const totalWidth = events.length * processSpacing;
  const totalBoxX = startX + totalWidth + 30;

  return (
    <g>
      {/* Background */}
      <rect x={0} y={0} width={canvasWidth} height={80} fill="hsl(var(--muted))" rx={2} />

      {/* VA bars (green, top) */}
      {events.map((event, i) => {
        const cx = startX + i * processSpacing + processWidth / 2;
        const pw = Math.max(6, processWidth * 0.4);
        const ph = Math.max(3, (event.processTimeMinutes / maxTime) * barHeight);
        return (
          <g key={`va-${i}`}>
            <rect x={cx - pw / 2} y={20 + barHeight - ph} width={pw} height={ph} rx={1} fill="hsl(var(--success))" opacity={0.85} />
            {event.isBottleneck && (
              <rect x={cx - pw / 2 - 1} y={18 + barHeight - ph - 1} width={pw + 2} height={ph + 2} rx={2}
                fill="none" stroke="hsl(var(--warning))" strokeWidth={1} strokeDasharray="2,2" />
            )}
          </g>
        );
      })}

      {/* NVA bars (grey, below) */}
      {events.map((event, i) => {
        const cx = startX + i * processSpacing + processWidth / 2;
        const pw = Math.max(10, processWidth * 0.6);
        const ph = Math.max(3, (event.waitTimeMinutes / maxTime) * barHeight);
        return (
          <rect key={`nva-${i}`} x={cx - pw / 2} y={42 + barHeight - ph} width={pw} height={ph} rx={1}
            fill="hsl(var(--border))" opacity={0.7} />
        );
      })}

      {/* Labels */}
      <text x={startX} y={16} className="text-[8px]" fill="hsl(var(--success))">VA</text>
      <text x={startX} y={60} className="text-[8px]" fill="hsl(var(--muted-foreground))">NVA</text>

      {/* Totals box */}
      <rect x={totalBoxX} y={8} width={135} height={64} rx={4} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} />
      <text x={totalBoxX + 8} y={24} className="text-[9px] font-semibold" fill="hsl(var(--foreground))">Timeline</text>
      <text x={totalBoxX + 8} y={38} className="text-[9px]" fill="hsl(var(--secondary-foreground))">
        Lead: {totalLeadTimeMinutes >= 1440 ? `${(totalLeadTimeMinutes / 1440).toFixed(1)}d` : `${totalLeadTimeMinutes}min`}
      </text>
      <text x={totalBoxX + 8} y={50} className="text-[9px]" fill="hsl(var(--success))">
        VA: {totalValueAddMinutes >= 1440 ? `${(totalValueAddMinutes / 1440).toFixed(1)}d` : `${totalValueAddMinutes}min`}
      </text>
      <text x={totalBoxX + 8} y={65} className={`text-[9px] font-semibold ${vaPct < 10 ? "fill-danger" : vaPct < 30 ? "fill-warning" : "fill-success"}`}>
        VA% = {vaPct}%
      </text>
    </g>
  );
}
