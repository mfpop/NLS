// ── VSM information-flow + status legend ──
// Default shows only active/used symbols. Full vocabulary available on expand.

interface Props {
  x: number;
  y: number;
  showFlow?: boolean;
  hasFifo?: boolean;
  hasSupermarket?: boolean;
  hasKanban?: boolean;
  hasKaizen?: boolean;
  hasCritical?: boolean;
  hasTransportWaste?: boolean;
}

const ENTRY_H = 18;
const BOX_W = 165;
const BOX_H = 6 * ENTRY_H + 18;
const COL_GAP = 8;

function LegendEntry({ x, y, width = 32, color = "#64748b", dash = "none", strokeWidth = 1.5, markerEnd, children }: {
  x: number; y: number; width?: number; color?: string; dash?: string; strokeWidth?: number; markerEnd?: string; children: string;
}) {
  return (
    <g>
      <line x1={x + 8} y1={y + 3} x2={x + 8 + width} y2={y + 3}
        stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash}
        markerEnd={markerEnd} />
      <text x={x + 46} y={y + 7}
        className="text-[11px] font-semibold" fill={color}>
        {children}
      </text>
    </g>
  );
}

export function VsmLegend({
  x, y, showFlow,
  hasFifo: _hasFifo, hasSupermarket: _hasSupermarket, hasKanban, hasKaizen: _hasKaizen,
  hasCritical, hasTransportWaste,
}: Props) {

  // Only show flow notation entries that are actually active in the current chart
  interface FlowEntry {
    key: string;
    label: string;
    color: string;
    dash?: string;
    strokeWidth?: number;
    markerId?: string;
  }
  const activeFlowEntries: FlowEntry[] = [];

  if (showFlow) {
    // Manual + Electronic + Schedule are shown if Flow is ON
    activeFlowEntries.push(
      { key: "manual", label: "Manual information", color: "#334155", markerId: "arr-info-MANUAL" },
      { key: "electronic", label: "Electronic / EDI", color: "#2563eb", dash: "5,4", strokeWidth: 2, markerId: "arr-info-ELECTRONIC" },
      { key: "schedule", label: "Production schedule", color: "#475569", dash: "5,4", strokeWidth: 1.6, markerId: "arr-info-MANUAL" },
    );
    if (hasKanban) {
      activeFlowEntries.push({ key: "kanban", label: "Kanban / Pull signal", color: "#7c3aed", dash: "6,4", strokeWidth: 1.8, markerId: "arr-info-KANBAN" });
    }
  }

  // Status column origin (no Material Handling column anymore)
  const statusX = activeFlowEntries.length > 0 ? x + BOX_W + COL_GAP : x;

  return (
    <g>
      {/* ── Column 1: Flow Notation ── */}
      {activeFlowEntries.length > 0 && (
        <>
          <rect x={x} y={y} width={BOX_W}
            height={Math.max(36, activeFlowEntries.length * ENTRY_H + 28)}
            fill="hsl(var(--background))" fillOpacity={0.92} stroke="hsl(var(--muted-foreground))" strokeWidth={1} rx={4} />
          <text x={x + BOX_W / 2} y={y + 13}
            textAnchor="middle" className="text-[11px] font-bold tracking-wide" fill="hsl(var(--foreground))">
            Flow Notation
          </text>
          {activeFlowEntries.map((e, i) => (
            <LegendEntry key={e.key} x={x} y={y + 22 + i * ENTRY_H}
              color={e.color} dash={e.dash || "none"}
              strokeWidth={e.strokeWidth || 1.5}
              markerEnd={e.markerId ? `url(#${e.markerId})` : undefined}>
              {e.label}
            </LegendEntry>
          ))}
        </>
      )}

      {/* ── Column 2: Status ── always shown, minimal */}
      <rect x={statusX} y={y} width={BOX_W}
        height={BOX_H}
        fill="hsl(var(--background))" fillOpacity={0.92} stroke="hsl(var(--muted-foreground))" strokeWidth={1} rx={4} />
      <text x={statusX + BOX_W / 2} y={y + 13}
        textAnchor="middle" className="text-[11px] font-bold tracking-wide" fill="hsl(var(--foreground))">
        Status
      </text>

      <rect x={statusX + 10} y={y + 24} width={12} height={9} rx={1}
        fill="none" stroke="hsl(var(--accent))" strokeWidth={2} />
      <text x={statusX + 16} y={y + 31} textAnchor="middle" className="text-[6px] font-bold" fill="hsl(var(--accent))">PM</text>
      <text x={statusX + 42} y={y + 32} className="text-[11px] font-semibold" fill="hsl(var(--accent))">Pacemaker</text>

      <rect x={statusX + 10} y={y + 42} width={12} height={9} rx={1}
        fill="none" stroke="hsl(var(--warning))" strokeWidth={2} strokeDasharray="3,2" />
      <text x={statusX + 16} y={y + 49} textAnchor="middle" className="text-[6px] font-bold" fill="hsl(var(--warning))">BN</text>
      <text x={statusX + 42} y={y + 50} className="text-[11px] font-semibold" fill="hsl(var(--warning))">Bottleneck</text>

      <line x1={statusX + 10} y1={y + 62} x2={statusX + 22} y2={y + 62}
        stroke="hsl(var(--warning))" strokeWidth={2} />
      <text x={statusX + 42} y={y + 65} className="text-[11px] font-semibold" fill="hsl(var(--warning))">Warning</text>

      {(hasCritical || hasTransportWaste) && (
        <>
          <line x1={statusX + 10} y1={y + 78} x2={statusX + 22} y2={y + 78}
            stroke="hsl(var(--danger))" strokeWidth={2.5} />
          <text x={statusX + 42} y={y + 81} className="text-[11px] font-semibold" fill="hsl(var(--danger))">Critical</text>
        </>
      )}

      {hasTransportWaste && !hasCritical && (
        <text x={statusX + 42} y={y + 96} className="text-[11px] font-semibold" fill="hsl(var(--danger))">Transport waste</text>
      )}
    </g>
  );
}
