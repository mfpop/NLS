import type { ProcessSymbolModel } from "./vsmTemplateTypes";
import { PROC_W, PROC_H } from "./vsmTemplateGeometry";

interface Props {
  model: ProcessSymbolModel;
  x: number;
  y: number;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function VsmProcessSymbol({ model, x, y, onClick, onKeyDown }: Props) {
  const bn = model.isBottleneck;
  const pm = model.isPacemaker;
  const sel = model.isSelected;
  const inactive = !model.isActive;
  const isLogistics = model.processType === "LOGISTICS" || model.processType === "TRANSPORT";
  const isWaste = model.valueAddType === "NON_VALUE_ADD_WASTE";
  const sev = model.severity;

  // Border color by severity when no special flag overrides
  function borderColor(): string {
    if (sel) return "hsl(var(--primary))";
    if (pm) return "hsl(var(--accent))";
    if (bn) return "hsl(var(--warning))";
    if (inactive) return "hsl(var(--muted-foreground) / 0.4)";
    if (isLogistics) return "hsl(var(--danger))";
    if (sev === "critical") return "hsl(var(--danger))";
    if (sev === "warning") return "hsl(var(--warning))";
    return "hsl(var(--muted-foreground))";
  }

  // Badge text for logistics/transport processes
  const logisticsBadge = model.processType === "TRANSPORT" ? "Non-Value-Add — Transport"
    : model.processType === "LOGISTICS" ? "Non-Value-Add — Handling"
    : null;

  return (
    <g onClick={onClick} onKeyDown={onKeyDown}
      className="cursor-pointer outline-none" role="button" tabIndex={0}>

      {/* PACEMAKER marker */}
      {pm && (
        <rect x={x - 5} y={y - 5} width={PROC_W + 10} height={PROC_H + 10}
          fill="none" stroke="hsl(var(--accent))" strokeWidth={2.5} rx={3} />
      )}

      {/* Bottleneck glow */}
      {bn && (
        <rect x={x - 4} y={y - 4} width={PROC_W + 8} height={PROC_H + 8}
          fill="none" stroke="hsl(var(--warning))" strokeWidth={1.8} strokeDasharray="5,3" />
      )}

      {/* Severity overlay — warning (dashed amber) or critical (solid red) */}
      {!pm && !bn && !sel && sev === "critical" && (
        <rect x={x - 3} y={y - 3} width={PROC_W + 6} height={PROC_H + 6}
          fill="none" stroke="hsl(var(--danger))" strokeWidth={2} rx={2} />
      )}
      {!pm && !bn && !sel && sev === "warning" && (
        <rect x={x - 3} y={y - 3} width={PROC_W + 6} height={PROC_H + 6}
          fill="none" stroke="hsl(var(--warning))" strokeWidth={1.5} strokeDasharray="4,3" rx={2} />
      )}

      {/* Box */}
      <rect x={x} y={y} width={PROC_W} height={PROC_H}
        fill={bn ? "hsl(var(--warning) / 0.08)" : pm ? "hsl(var(--accent) / 0.08)" : sel ? "hsl(var(--primary) / 0.06)" : inactive ? "hsl(var(--muted))" : isLogistics ? "hsl(var(--danger) / 0.04)" : "hsl(var(--background))"}
        stroke={borderColor()}
        strokeWidth={pm ? 2.5 : bn ? 2.5 : sel ? 2 : isLogistics ? 1.8 : 1.5} />

      {/* Title */}
      <text x={x + PROC_W / 2} y={y + 22}
        textAnchor="middle" className="text-[17px] font-bold" fill={inactive ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))"}>
        {model.name}
      </text>

      {/* Department subtitle — 14px (+10% from 13px) */}
      <text x={x + PROC_W / 2} y={y + 43}
        textAnchor="middle" className="text-[14px] font-semibold" fill={inactive ? "hsl(var(--muted-foreground) / 0.6)" : "hsl(var(--secondary-foreground))"}>
        {model.departmentLabel}
      </text>

      {/* Logistics/Transport badge — shown below department name when no PM/BN badge */}
      {isLogistics && logisticsBadge && !pm && !bn && (
        <>
          <rect x={x + 4} y={y + 52} width={PROC_W - 8} height={20}
            fill="hsl(var(--danger) / 0.08)" rx={10} stroke="hsl(var(--danger) / 0.2)" strokeWidth={1} />
          <text x={x + PROC_W / 2} y={y + 67}
            textAnchor="middle" className="text-[10px] font-bold uppercase" fill="hsl(var(--danger))">
            {logisticsBadge}
          </text>
        </>
      )}
      {isLogistics && logisticsBadge && (
        <title>{model.name} — {logisticsBadge}{model.valueAddType === "NON_VALUE_ADD_WASTE" ? " (Transportation Waste)" : ""}</title>
      )}

      {/* Material-handling icon in top-left corner of logistics process box */}
      {isLogistics && (
        <g transform={`translate(${x + 6}, ${y + 4}) scale(0.5)`} opacity={0.7}>
          {/* Hand-cart icon */}
          <line x1={0} y1={0} x2={4} y2={12} stroke="hsl(var(--danger))" strokeWidth={2} strokeLinecap="round" />
          <line x1={8} y1={0} x2={6} y2={12} stroke="hsl(var(--danger))" strokeWidth={2} strokeLinecap="round" />
          <line x1={0} y1={12} x2={16} y2={12} stroke="hsl(var(--danger))" strokeWidth={2} />
          <line x1={16} y1={12} x2={16} y2={24} stroke="hsl(var(--danger))" strokeWidth={2} />
          <circle cx={16} cy={28} r={4} fill="hsl(var(--danger))" />
          <rect x={6} y={16} width={8} height={6} rx={1} fill="none" stroke="hsl(var(--danger))" strokeWidth={1.2} />
        </g>
      )}

      {/* Waste indicator */}
      {isWaste && (
        <line x1={x + PROC_W - 8} y1={y + 4} x2={x + PROC_W - 4} y2={y + 8}
          stroke="hsl(var(--danger))" strokeWidth={1.5} />
      )}

      {/* Meta badges row — subtle chip style matching footer */}
      {pm && (
        <>
          <rect x={x + PROC_W / 2 - 42} y={y + 53} width={84} height={22}
            fill="hsl(var(--accent) / 0.08)" rx={11} stroke="hsl(var(--accent) / 0.4)" strokeWidth={1} />
          <text x={x + PROC_W / 2} y={y + 69}
            textAnchor="middle" className="text-[12px] font-extrabold uppercase tracking-wider" fill="hsl(var(--accent))">
            PACEMAKER
          </text>
        </>
      )}
      {pm && (
        <title>{model.name} — Pacemaker — Scheduled directly by Production Control</title>
      )}
      {bn && !pm && (
        <>
          <rect x={x + PROC_W / 2 - 44} y={y + 53} width={88} height={22}
            fill="hsl(var(--warning) / 0.12)" rx={11} stroke="hsl(var(--warning) / 0.4)" strokeWidth={1} />
          <text x={x + PROC_W / 2} y={y + 69}
            textAnchor="middle" className="text-[12px] font-extrabold uppercase tracking-wider" fill="hsl(var(--warning))">
            BOTTLENECK
          </text>
        </>
      )}
      {bn && (
        <title>{model.name} — Bottleneck — Capacity constraint{model.dataRows.find(r => r.label === "C/T") ? ` · C/T: ${model.dataRows.find(r => r.label === "C/T")?.value}` : ""}</title>
      )}
    </g>
  );
}
