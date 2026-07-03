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
    if (sel) return "#3b82f6";
    if (pm) return "#7c3aed";
    if (bn) return "#f59e0b";
    if (inactive) return "#d1d5db";
    if (isLogistics) return "#b91c1c";
    if (sev === "critical") return "#dc2626";
    if (sev === "warning") return "#d97706";
    return "#334155";
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
          fill="none" stroke="#7c3aed" strokeWidth={2.5} rx={3} />
      )}

      {/* Bottleneck glow */}
      {bn && (
        <rect x={x - 4} y={y - 4} width={PROC_W + 8} height={PROC_H + 8}
          fill="none" stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="5,3" />
      )}

      {/* Severity overlay — warning (dashed amber) or critical (solid red) */}
      {!pm && !bn && !sel && sev === "critical" && (
        <rect x={x - 3} y={y - 3} width={PROC_W + 6} height={PROC_H + 6}
          fill="none" stroke="#dc2626" strokeWidth={2} rx={2} />
      )}
      {!pm && !bn && !sel && sev === "warning" && (
        <rect x={x - 3} y={y - 3} width={PROC_W + 6} height={PROC_H + 6}
          fill="none" stroke="#d97706" strokeWidth={1.5} strokeDasharray="4,3" rx={2} />
      )}

      {/* Box */}
      <rect x={x} y={y} width={PROC_W} height={PROC_H}
        fill={bn ? "#fffbeb" : pm ? "#f5f3ff" : sel ? "#f0f9ff" : inactive ? "#f8fafc" : isLogistics ? "#fef2f2" : "#fff"}
        stroke={borderColor()}
        strokeWidth={pm ? 2.5 : bn ? 2.5 : sel ? 2 : isLogistics ? 1.8 : 1.5} />

      {/* Title */}
      <text x={x + PROC_W / 2} y={y + 22}
        textAnchor="middle" className="text-[17px] font-bold" fill={inactive ? "#94a3b8" : "#0f172a"}>
        {model.name}
      </text>

      {/* Department subtitle — 14px (+10% from 13px) */}
      <text x={x + PROC_W / 2} y={y + 43}
        textAnchor="middle" className="text-[14px] font-semibold" fill={inactive ? "#cbd5e1" : "#475569"}>
        {model.departmentLabel}
      </text>

      {/* Logistics/Transport badge — shown below department name when no PM/BN badge */}
      {isLogistics && logisticsBadge && !pm && !bn && (
        <>
          <rect x={x + 4} y={y + 52} width={PROC_W - 8} height={20}
            fill="#fef2f2" rx={10} stroke="#fecaca" strokeWidth={1} />
          <text x={x + PROC_W / 2} y={y + 67}
            textAnchor="middle" className="text-[10px] font-bold uppercase" fill="#dc2626">
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
          <line x1={0} y1={0} x2={4} y2={12} stroke="#dc2626" strokeWidth={2} strokeLinecap="round" />
          <line x1={8} y1={0} x2={6} y2={12} stroke="#dc2626" strokeWidth={2} strokeLinecap="round" />
          <line x1={0} y1={12} x2={16} y2={12} stroke="#dc2626" strokeWidth={2} />
          <line x1={16} y1={12} x2={16} y2={24} stroke="#dc2626" strokeWidth={2} />
          <circle cx={16} cy={28} r={4} fill="#dc2626" />
          <rect x={6} y={16} width={8} height={6} rx={1} fill="none" stroke="#dc2626" strokeWidth={1.2} />
        </g>
      )}

      {/* Waste indicator */}
      {isWaste && (
        <line x1={x + PROC_W - 8} y1={y + 4} x2={x + PROC_W - 4} y2={y + 8}
          stroke="#dc2626" strokeWidth={1.5} />
      )}

      {/* Meta badges row — subtle chip style matching footer */}
      {pm && (
        <>
          <rect x={x + PROC_W / 2 - 42} y={y + 53} width={84} height={22}
            fill="#f5f3ff" rx={11} stroke="#c4b5fd" strokeWidth={1} />
          <text x={x + PROC_W / 2} y={y + 69}
            textAnchor="middle" className="text-[12px] font-extrabold uppercase tracking-wider" fill="#6d28d9">
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
            fill="#fffbeb" rx={11} stroke="#fde68a" strokeWidth={1} />
          <text x={x + PROC_W / 2} y={y + 69}
            textAnchor="middle" className="text-[12px] font-extrabold uppercase tracking-wider" fill="#d97706">
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
