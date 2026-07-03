// ── VSM Footer Legend — compact 3-section legend strip (Flow + MH + Status) ──
// Per spec: shows only active symbols. No KPI values.

import { VsmTransportIcon, EQUIPMENT_LABELS } from "./VsmTransportIcons";

interface Props {
  showFlow: boolean;
  hasKanban: boolean;
  activeEquipment: Set<string>;
  hasPacemaker: boolean;
  hasBottleneck: boolean;
  hasCritical: boolean;
}

/**
 * Inline SVG line sample — renders the actual dash pattern faithfully
 */
function FlowLineSample({ color, dash, strokeWidth = 1.6, arrow = true }: {
  color: string;
  dash?: string;
  strokeWidth?: number;
  arrow?: boolean;
}) {
  const W = 26;
  const H = 10;
  const id = `arrow-${color.replace("#", "")}-${strokeWidth}-${dash || "solid"}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 block">
      <defs>
        <marker id={id} markerWidth={5} markerHeight={5} refX={4.5} refY={2.5} orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill={color} />
        </marker>
      </defs>
      <line
        x1={2} y1={H / 2} x2={W - 3} y2={H / 2}
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={dash === "none" ? undefined : dash}
        strokeLinecap="butt"
        markerEnd={arrow ? `url(#${id})` : undefined}
      />
    </svg>
  );
}

function MhIcon({ equipType, size = 18 }: { equipType: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 block"
      aria-hidden="true"
    >
      <VsmTransportIcon type={equipType} x={0} y={0} size={size} severity="NORMAL" />
    </svg>
  );
}

const MH_ORDER = ["TRUCK", "FORKLIFT", "CONVEYOR", "AGV", "TUGGER", "PALLET_JACK", "HAND_CART", "MANUAL_CARRY"];

function LegendItem({ children, title, tone = "default" }: { children: React.ReactNode; title?: string; tone?: "default" | "purple" | "amber" | "warn" | "bad" }) {
  const toneWrap: Record<string, string> = {
    default: "bg-slate-50 border-slate-200 text-slate-700",
    purple:  "bg-purple-50 border-purple-200 text-purple-800",
    amber:   "bg-amber-50 border-amber-200 text-amber-800",
    warn:    "bg-amber-50 border-amber-200 text-amber-700",
    bad:     "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full border text-[11px] font-semibold whitespace-nowrap ${toneWrap[tone]} shrink-0`}
    >
      {children}
    </span>
  );
}

export function VsmFooterLegend({
  showFlow, hasKanban, activeEquipment,
  hasPacemaker, hasBottleneck, hasCritical,
}: Props) {
  // Sort MH by canonical order for stable display
  const sortedEquipment = Array.from(activeEquipment)
    .filter(Boolean)
    .sort((a, b) => MH_ORDER.indexOf(a) - MH_ORDER.indexOf(b));

  return (
    <footer className="shrink-0 min-h-11 border-t border-slate-200 bg-slate-50 flex flex-wrap divide-x divide-slate-200 overflow-hidden">
      {/* ── Section 1: Flow Notation ── */}
      <div className="flex-1 min-w-[200px] flex items-center gap-2.5 px-3 py-1.5 overflow-x-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
          Flow
        </span>
        {showFlow ? (
          <div className="flex items-center gap-2.5 text-[11px] leading-none font-medium text-slate-600 flex-wrap">
            {/* Always show legend entries — they document standard VSM notation */}
            <LegendItem title="Manual — solid line with arrowhead">
              <FlowLineSample color="#334155" dash="none" strokeWidth={1.6} />
              <span>Manual</span>
            </LegendItem>
            <LegendItem title="Electronic / EDI — dashed line with arrowhead">
              <FlowLineSample color="#2563eb" dash="5 4" strokeWidth={1.8} />
              <span>EDI</span>
            </LegendItem>
            <LegendItem title="Production schedule — dashed line with arrowhead">
              <FlowLineSample color="#475569" dash="5 4" strokeWidth={1.6} />
              <span>Schedule</span>
            </LegendItem>
            {hasKanban && (
              <LegendItem title="Kanban / Pull — long-dash line with arrowhead">
                <FlowLineSample color="#7c3aed" dash="6 4" strokeWidth={1.8} />
                <span>Kanban</span>
              </LegendItem>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 italic">— toggled off</span>
        )}
      </div>

      {/* ── Section 2: Material Handling (icons) ── */}
      <div className="flex-1 min-w-[160px] flex items-center gap-2.5 px-3 py-1.5 overflow-x-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
          MH
        </span>
        <div className="flex items-center gap-2.5 text-[11px] leading-none font-medium text-slate-600 flex-wrap">
          {/* Always-show common equipment */}
          {sortedEquipment.includes("FORKLIFT") && (
            <LegendItem title="Forklift — material handling equipment">
              <MhIcon equipType="FORKLIFT" size={18} />
              <span>Forklift</span>
            </LegendItem>
          )}
          {sortedEquipment.includes("CONVEYOR") && (
            <LegendItem title="Conveyor — material handling equipment">
              <MhIcon equipType="CONVEYOR" size={18} />
              <span>Conveyor</span>
            </LegendItem>
          )}
          {/* Chart-specific active equipment */}
          {sortedEquipment.filter(e => e !== "FORKLIFT" && e !== "CONVEYOR").map((equip) => (
            <LegendItem key={equip} title={`${EQUIPMENT_LABELS[equip] || equip} — material handling equipment`}>
              <MhIcon equipType={equip} size={18} />
              <span>{EQUIPMENT_LABELS[equip] || equip}</span>
            </LegendItem>
          ))}
        </div>
      </div>

      {/* ── Section 3: Status / Severity ── */}
      <div className="flex-1 min-w-[180px] flex items-center gap-2.5 px-3 py-1.5 overflow-x-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
          Status
        </span>
        <div className="flex items-center gap-2.5 text-[11px] leading-none font-medium text-slate-600 flex-wrap">
          {hasPacemaker && (
            <LegendItem title="Pacemaker process — sets the production pace" tone="purple">
              <span className="inline-block w-2.5 h-2.5 rounded-[1px] border-2 border-purple-700 bg-white" />
              <span>Pacemaker</span>
            </LegendItem>
          )}
          {hasBottleneck && (
            <LegendItem title="Bottleneck process — constrains throughput" tone="amber">
              <span className="inline-block w-2.5 h-2.5 rounded-[1px] border-2 border-dashed border-amber-600 bg-white" />
              <span>Bottleneck</span>
            </LegendItem>
          )}
          <LegendItem title="Warning severity — monitor closely" tone="warn">
            <span className="inline-block w-4 h-[3px] rounded-sm bg-amber-500" />
            <span>Warning</span>
          </LegendItem>
          {hasCritical && (
            <LegendItem title="Critical severity — requires attention" tone="bad">
              <span className="inline-block w-4 h-[3px] rounded-sm bg-red-600" />
              <span>Critical</span>
            </LegendItem>
          )}
        </div>
      </div>
    </footer>
  );
}
