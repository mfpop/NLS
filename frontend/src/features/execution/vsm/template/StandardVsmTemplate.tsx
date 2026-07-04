import type { StandardVsmTemplateModel } from "./vsmTemplateTypes";
import { computeInfoFlowPath, normalizeFlowEntity } from "./vsmInfoFlowRouter";
import type { InfoFlowAnchors } from "./vsmInfoFlowRouter";
import { CANVAS_W, CANVAS_H, VSM_VIEW_X, VSM_VIEW_Y, VSM_VIEW_W, VSM_VIEW_H, FAC_X, FAC_Y, FAC_W, FAC_H, FAC_CUST_X, FAC_CUST_Y, PC_X, PC_Y, PC_W, PC_H, PROC_W, PROC_H, PROC_Y, MAT_Y, DATA_Y, INV_HALF, INV_Y, TIMELINE_Y, TIMELINE_DROP, SUP_CX, SUP_BOTTOM, CUST_CX, CUST_BOTTOM, MAT_ARROW_GAP_BEFORE, MAT_ARROW_GAP_AFTER } from "./vsmTemplateGeometry";
import { VsmFactorySymbol } from "./VsmFactorySymbol";
import { VsmProductionControlSymbol } from "./VsmProductionControlSymbol";
import { VsmProcessSymbol } from "./VsmProcessSymbol";
import { VsmProcessDataBox } from "./VsmProcessDataBox";
import { VsmInventoryTriangle } from "./VsmInventoryTriangle";
import { VsmMaterialArrow } from "./VsmMaterialArrow";
import { VsmInformationArrow } from "./VsmInformationArrow";
import { VsmSteppedTimeline, VsmTotalsBox } from "./VsmSteppedTimeline";
import { VsmShipmentMarker } from "./VsmShipmentMarker";
import { VsmSupermarketSymbol, VsmFifoLaneSymbol, VsmKanbanSymbol } from "./VsmFlowSymbols";
import { EQUIPMENT_LABELS } from "./VsmTransportIcons";
import { VsmKaizenBurst } from "./VsmKaizenBurst";
import type { InformationFlowModel } from "./vsmTemplateTypes";
import { useMemo } from "react";

interface Props {
  model: StandardVsmTemplateModel;
  onSelectNode: (id: string) => void;
  showKaizen?: boolean;
  showFlowLogic?: boolean;
  /** Show ALL downstream schedule signals (not just core Customer↔PC↔Supplier↔Pacemaker) */
  showAllFlows?: boolean;
  /** Called when a kaizen burst marker is clicked — passes process id and opportunity index */
  onKaizenClick?: (processId: string, oppIndex: number) => void;
  /** Dynamic viewBox "x y w h" override. When set, takes priority over the default constant. */
  viewBox?: string;
  /** CSS/SVG transform string applied to the VSM content <g> group.
   *  When set, replaces the default verticalOffset-only transform. */
  contentTransform?: string;
}

// ── Named anchor points for VSM nodes ──
// Each major node exposes anchors that information-flow curves connect to.

interface Anchors extends InfoFlowAnchors {}

function computeAnchors(procPos: { id: string; x: number; y: number }[]): Anchors {
  const a: Anchors = {
    supplier: {
      top: { x: SUP_CX, y: FAC_Y },
      left: { x: FAC_X, y: FAC_Y + FAC_H / 2 },
      right: { x: FAC_X + FAC_W, y: FAC_Y + FAC_H / 2 },
      bottom: { x: SUP_CX, y: SUP_BOTTOM },
    },
    pc: {
      left: { x: PC_X, y: PC_Y + PC_H / 2 },
      right: { x: PC_X + PC_W, y: PC_Y + PC_H / 2 },
      top: { x: PC_X + PC_W / 2, y: PC_Y },
      bottom: { x: PC_X + PC_W / 2, y: PC_Y + PC_H },
    },
    customer: {
      top: { x: CUST_CX, y: FAC_CUST_Y },
      left: { x: FAC_CUST_X, y: FAC_CUST_Y + FAC_H / 2 },
      right: { x: FAC_CUST_X + FAC_W, y: FAC_CUST_Y + FAC_H / 2 },
      bottom: { x: CUST_CX, y: CUST_BOTTOM },
    },
    processes: {},
  };
  for (const p of procPos) {
    a.processes[p.id] = {
      top: { x: p.x + PROC_W / 2, y: p.y },
      center: { x: p.x + PROC_W / 2, y: p.y + PROC_H / 2 },
      bottom: { x: p.x + PROC_W / 2, y: p.y + PROC_H },
    };
  }
  return a;
}

function ArrowDefs() {
  return (
    <defs>
      <marker id="arr-PUSH" markerWidth={5} markerHeight={4} refX={5} refY={2} orient="auto">
        <polygon points="0,0 5,2 0,4" fill="hsl(var(--muted-foreground))" />
      </marker>
      <marker id="arr-PULL" markerWidth={5} markerHeight={4} refX={5} refY={2} orient="auto">
        <polygon points="0,0 5,2 0,4" fill="hsl(var(--primary))" />
      </marker>
      <marker id="arr-KANBAN" markerWidth={5} markerHeight={4} refX={5} refY={2} orient="auto">
        <polygon points="0,0 5,2 0,4" fill="hsl(var(--warning))" />
      </marker>
      <marker id="arr-FIFO" markerWidth={5} markerHeight={4} refX={5} refY={2} orient="auto">
        <polygon points="0,0 5,2 0,4" fill="hsl(var(--success))" />
      </marker>
      <marker id="arr-SUPERMARKET" markerWidth={5} markerHeight={4} refX={5} refY={2} orient="auto">
        <polygon points="0,0 5,2 0,4" fill="hsl(var(--warning))" />
      </marker>
      <marker id="arr-SHIPMENT" markerWidth={6} markerHeight={5} refX={6} refY={2.5} orient="auto">
        <polygon points="0,0 6,2.5 0,5" fill="hsl(var(--foreground))" />
      </marker>
      <marker id="arr-fifo-sym" markerWidth={4} markerHeight={3} refX={4} refY={1.5} orient="auto">
        <polygon points="0,0 4,1.5 0,3" fill="hsl(var(--success))" />
      </marker>
      <marker id="arr-info-MANUAL" markerWidth={4} markerHeight={3} refX={4} refY={1.5} orient="auto">
        <polygon points="0,0 4,1.5 0,3" fill="hsl(var(--muted-foreground))" />
      </marker>
      <marker id="arr-info-ELECTRONIC" markerWidth={12} markerHeight={9} refX={12} refY={4.5} orient="auto">
        <polygon points="0,0 12,4.5 0,9" fill="hsl(var(--primary))" />
      </marker>
      <marker id="arr-info-KANBAN" markerWidth={4} markerHeight={3} refX={4} refY={1.5} orient="auto">
        <polygon points="0,0 4,1.5 0,3" fill="hsl(var(--accent))" />
      </marker>
      <marker id="arr-info-SCHEDULE" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
        <polygon points="0,0 8,3 0,6" fill="hsl(var(--secondary-foreground))" />
      </marker>
    </defs>
  );
}

// ── Schedule line rendering (PC → Process straight connectors) ──
// Renders straight lines from PC bottom border to each scheduled process top border.
// Default view: only pacemaker line. Detail (showAllFlows): all scheduled processes.
function renderScheduleLines(
  model: StandardVsmTemplateModel,
  anchors: Anchors,
  pacemakerId: string | null,
  showAllFlows: boolean,
) {
  const pcBottom = PC_Y + PC_H;  // 50 + 120 = 170
  const scheduleFlows = model.informationFlows.filter((f) => {
    const normFrom = normalizeFlowEntity(f.from);
    const normTo = normalizeFlowEntity(f.to);
    return normFrom === "PC" && normTo !== "CUSTOMER" && normTo !== "SUPPLIER";
  });

  // Default: only pacemaker line. Detail toggle shows all scheduled-process lines.
  const visibleFlows = scheduleFlows.filter((f) => {
    const isPush = f.label?.includes("no schedule") || !model.processes.find((p) => p.id === f.to)?.isActive;
    if (isPush) return false;
    if (f.to === pacemakerId) return true;
    return showAllFlows;
  });

  const n = visibleFlows.length;
  if (!n) return null;

  // Distribute start anchors across PC bottom border (20px inset from each side)
  const pcLeftInset = PC_X + 20;
  const pcRightInset = PC_X + PC_W - 20;
  const anchorSpacing = n > 1 ? (pcRightInset - pcLeftInset) / (n - 1) : 0;

  return visibleFlows.map((flow, i) => {
    const normTo = normalizeFlowEntity(flow.to);
    const procAnchor = anchors.processes[normTo];
    const proc = model.processes.find((p) => p.id === normTo);
    if (!procAnchor || !proc) return null;

    const startX = n > 1 ? pcLeftInset + i * anchorSpacing : PC_X + PC_W / 2;
    const endX = procAnchor.top.x;
    const endY = procAnchor.top.y - 4;  // stop 4px before process border
    const midX = (startX + endX) / 2;
    const midY = (pcBottom + endY) / 2;
    const isPacemaker = flow.to === pacemakerId;
    const label = isPacemaker ? "Production schedule · Daily · Dispatch list" : "";
    const procLabel = proc.name || flow.to;

    // Cubic bezier control points — matched to VsmInformationArrow curvature
    const dx = endX - startX;
    const cp1x = startX + dx * 0.3;
    const cp1y = pcBottom + 60;
    const cp2x = endX - dx * 0.2;
    const cp2y = endY - 60;

    return (
      <g key={`sched-${i}`} className="group cursor-pointer">
        {/* Curved octopus-arm line from PC bottom to process top */}
        <path d={`M${startX},${pcBottom} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`}
          fill="none" stroke="hsl(var(--secondary-foreground))" strokeWidth={1.5}
          strokeDasharray="5,4" strokeLinecap="round"
          markerEnd="url(#arr-info-SCHEDULE)"
          opacity={0.8}
          className="transition-all duration-150 group-hover:opacity-100 group-hover:stroke-[1.8]" />
        {/* Label — only for pacemaker line in default view */}
        {label && (
          <g>
            <rect x={midX - 4} y={midY - 12 - 20}
              width={label.length * 7.2 + 8} height={18}
              rx={3} fill="hsl(var(--muted))" fillOpacity={0.92} />
            <text x={midX} y={midY - 20}
              textAnchor="middle" className="text-[12px] font-bold" fill="hsl(var(--secondary-foreground))">
              {label}
            </text>
          </g>
        )}
        {/* Tooltip with schedule details */}
        <title>{`From: Production Control\nTo: ${procLabel}\nFrequency: ${flow.frequency || "—"}\nMethod: ${flow.method || "—"}\nTrigger: ${flow.triggerType || "—"}`}</title>
      </g>
    );
  });
}

export function StandardVsmTemplate({ model, onSelectNode, showKaizen, showFlowLogic, showAllFlows, onKaizenClick, viewBox: viewBoxProp, contentTransform }: Props) {
  const n = model.processes.length;

  // ── Process center X positions ──
  const procCx = useMemo(() => {
    if (!n) return [];
    const firstCx = SUP_CX + INV_HALF + PROC_W + PROC_W / 2;
    const lastCx = CUST_CX - INV_HALF - PROC_W - PROC_W / 2;
    if (n === 1) return [firstCx];
    const gap = (lastCx - firstCx) / (n - 1);
    return model.processes.map((_, i) => firstCx + i * gap);
  }, [model.processes, n]);

  // ── Process box positions ──
  const procPos = useMemo(() =>
    model.processes.map((p, i) => ({ id: p.id, x: procCx[i] - PROC_W / 2, y: PROC_Y })),
    [model.processes, procCx]
  );

  // ── Named anchors for all VSM nodes ──
  const anchors = useMemo(() => computeAnchors(procPos), [procPos]);

  // ── Timeline segment center X positions ──
  const segmentCentersX = useMemo(() => {
    return model.timelineSegments.map((seg, i) => {
      const procIdx = model.processes.findIndex((p) => p.id === seg.processId);
      if (procIdx >= 0 && procIdx < procCx.length) return procCx[procIdx];
      return procCx[Math.min(i, procCx.length - 1)] ?? procCx[0] ?? 400;
    });
  }, [model.timelineSegments, model.processes, procCx]);

  // ── Inventory positions ──
  const invPos = useMemo(() => {
    const invs = model.inventories;
    if (!invs.length || !procCx.length) return [];
    return invs.map((inv, i) => {
      if (i === 0) return { id: inv.id, x: SUP_CX, y: INV_Y };
      if (i === invs.length - 1) return { id: inv.id, x: CUST_CX, y: INV_Y };
      const idx = Math.min(i - 1, n - 2);
      const mid = (procCx[idx] + procCx[idx + 1]) / 2;
      return { id: inv.id, x: mid, y: INV_Y };
    });
  }, [model.inventories, procCx, n]);

  // ── Pacemaker process ID (for filtering info flows) ──
  const pacemakerId = useMemo(() =>
    model.processes.find((p) => p.isPacemaker)?.id ?? null,
    [model.processes],
  );

  // ── Categorize each info flow as core / downstream / push ──
  function flowVisibility(flow: InformationFlowModel): "core" | "downstream" | "push" {
    const f = normalizeFlowEntity(flow.from);
    const t = normalizeFlowEntity(flow.to);
    if (flow.label?.includes("no schedule")) return "push";
    if (f === "CUSTOMER" && t === "PC") return "core";
    if (f === "PC" && t === "SUPPLIER") return "core";
    if (f === "PC" && flow.to === pacemakerId) return "core";
    return "downstream";
  }

  // ── Helper: get horizontal endpoint X for material flow ──
  const getEndpointX = (id: string, isSource: boolean): number | null => {
    if (id === "SUPPLIER") return SUP_CX;
    if (id === "CUSTOMER") return CUST_CX;
    const p = procPos.find(n => n.id === id);
    if (p) return isSource ? p.x + PROC_W : p.x;
    const inv = invPos.find(n => n.id === id);
    if (inv) return isSource ? inv.x + INV_HALF : inv.x - INV_HALF;
    return null;
  };

  // ── Find shipment flow data from material flows ──
  const supplierShipFlow = model.materialFlows.find(f => f.from === "SUPPLIER");
  const customerShipFlow = model.materialFlows.find(f => f.to === "CUSTOMER");

  // ── Vertical centering offset ──
  // Shifts the full VSM drawing group so its center aligns with the viewBox center.
  // Content top: min(PC_Y, FAC_Y) — highest visible element
  // Content bottom: TIMELINE_Y + TIMELINE_DROP — lowest visible element
  const verticalOffset = useMemo(() => {
    const contentTop = Math.min(FAC_Y, PC_Y);
    const contentBottom = TIMELINE_Y + TIMELINE_DROP;
    const contentCenter = (contentTop + contentBottom) / 2;
    const viewBoxCenter = (VSM_VIEW_Y + CANVAS_H) / 2;
    return Math.round(viewBoxCenter - contentCenter);
  }, []);

  return (
    <svg width="100%" height="100%" viewBox={`${VSM_VIEW_X} ${VSM_VIEW_Y} ${VSM_VIEW_W} ${VSM_VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="select-none">

      {/* VSM content group — scaled/translated by contentTransform (when provided, replaces verticalOffset) */}
      <g transform={contentTransform ?? `translate(0, ${verticalOffset})`}>
        {/* ═══════════════════════════════════════
             LAYER 1: SUPPLIER & CUSTOMER FACTORIES
             (always behind everything else)
             ═══════════════════════════════════════ */}
        <VsmFactorySymbol model={model.supplier} x={FAC_X} y={FAC_Y} />
        <VsmFactorySymbol model={model.customer} x={FAC_CUST_X} y={FAC_CUST_Y} />

        {/* ═══════════════════════════════════════
             LAYER 2: PRODUCTION CONTROL
             ═══════════════════════════════════════ */}
        {/* Production Control — control context only */}
        {model.productionControl && (
          <VsmProductionControlSymbol
            model={model.productionControl}
            x={PC_X} y={PC_Y}
          />
        )}

        {/* ═══════════════════════════════════════
             LAYER 2B: SCHEDULE LINES (PC → Process)
             ── straight connectors from PC bottom to process top ──
             ═══════════════════════════════════════ */}
        {renderScheduleLines(model, anchors, pacemakerId, showAllFlows ?? false)}

        {/* ═══════════════════════════════════════
             LAYER 3: TIMELINE (drawn behind material flow)
             ═══════════════════════════════════════ */}
        {model.timelineSegments.length > 0 && (
          <>
          {/* Timeline background band — visual separation from process-flow area */}
        <rect x={VSM_VIEW_X} y={TIMELINE_Y - 12} width={VSM_VIEW_W} height={TIMELINE_DROP + 28}
          fill="#ffffff" fillOpacity={0.03} rx={4} />

        <g transform={`translate(0,${TIMELINE_Y})`}>
            <VsmSteppedTimeline
              segments={model.timelineSegments}
              segmentCentersX={segmentCentersX}
              startX={segmentCentersX[0] - 160}
              totals={model.totals}
              totBoxLeft={FAC_CUST_X}
              taktTimeSeconds={model.taktTimeSeconds}
            />
            {/* Summary totals box — starts at timeline end (FAC_CUST_X + 16) */}
            <VsmTotalsBox
              x={FAC_CUST_X + 16}
              y={-18}
              width={155}
              height={68}
              totals={model.totals}
            />
          </g>
          </>
        )}

        {/* ═══════════════════════════════════════
             LAYER 4: VERTICAL CONNECTOR LINES
             (supplier ⇄ material-flow level ⇄ customer)
             ═══════════════════════════════════════ */}
        {/* Supplier → material flow (SHIPMENT) — clean connection at triangle tip */}
        <line x1={SUP_CX} y1={SUP_BOTTOM} x2={SUP_CX} y2={MAT_Y - INV_HALF}
          stroke="hsl(var(--foreground))" strokeWidth={4}
          markerEnd="url(#arr-SHIPMENT)" />
        <VsmShipmentMarker
          cx={SUP_CX - 32}
          y={(SUP_BOTTOM + MAT_Y - INV_HALF) / 2 - 38}
          label="Shipment"
          frequency={supplierShipFlow?.deliveryFrequency || null}
          equipmentType={supplierShipFlow?.equipmentType || "TRUCK"}
          direction="inbound"
          from={model.supplier?.label}
        />

        {/* Material flow → Customer (SHIPMENT) — drops from FG triangle tip to Customer */}
        <line x1={CUST_CX} y1={MAT_Y + INV_HALF} x2={CUST_CX} y2={CUST_BOTTOM}
          stroke="hsl(var(--foreground))" strokeWidth={4}
          markerEnd="url(#arr-SHIPMENT)" />
        <VsmShipmentMarker
          cx={CUST_CX + 32}
          y={(MAT_Y + INV_HALF + CUST_BOTTOM) / 2 - 28}
          label="Shipment"
          frequency={customerShipFlow?.deliveryFrequency || null}
          equipmentType={customerShipFlow?.equipmentType || "TRUCK"}
          direction="outbound"
          to={model.customer?.label}
        />

        {/* ═══════════════════════════════════════
             LAYER 5: MATERIAL FLOW ARROWS (SPLIT AROUND INVENTORY)
             (horizontal, at MAT_Y level, split into segments around inventory triangles)
             ═══════════════════════════════════════ */}
        <g fill="none" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
          {model.materialFlows.map((flow, idx) => {
            const x1 = getEndpointX(flow.from, true);
            const x2 = getEndpointX(flow.to, false);
            if (x1 === null || x2 === null || x1 >= x2) return null;

            // Find if an inventory triangle sits between x1 and x2
            const betweenInv = invPos.find((pos) => {
              const inv = model.inventories.find(i => i.id === pos.id);
              if (!inv) return false;
              return pos.x > x1 + 10 && pos.x < x2 - 10;
            });

            if (betweenInv) {
              // ── SPLIT: Two arrow segments around the inventory triangle ──
              const leftEnd = betweenInv.x - INV_HALF - MAT_ARROW_GAP_BEFORE;
              const rightStart = betweenInv.x + INV_HALF + MAT_ARROW_GAP_AFTER;

              if (leftEnd > x1 && rightStart < x2) {
                const seg1Cx = (x1 + leftEnd) / 2;
                const seg2Cx = (rightStart + x2) / 2;
                // Per spec: only show text label on first segment or when flow type changes
                const showLabelOnFirst = idx === 0 || model.materialFlows[idx - 1]?.type !== flow.type;
                return (
                  <g key={`mf-${idx}`}>
                    {/* Left segment: source → inventory */}
                    <VsmMaterialArrow
                      x1={x1} x2={leftEnd} y={MAT_Y}
                      label={flow.label}
                      flowType={flow.type}
                      transport={flow.distance != null || flow.tripFrequency || flow.equipmentType ? flow : null}
                      hideLabel={!showLabelOnFirst}
                    />
                    {/* Right segment: inventory → destination */}
                    <VsmMaterialArrow
                      x1={rightStart} x2={x2} y={MAT_Y}
                      label={null}
                      flowType={flow.type}
                      transport={flow.equipmentType ? { equipmentType: flow.equipmentType, equipmentLabel: flow.equipmentLabel } : null}
                      hideLabel={true}
                    />
                    {/* Flow symbols at midpoint of relevant segment */}
                    {flow.type === "SUPERMARKET" && (
                      <g transform={`translate(${seg1Cx},${MAT_Y})`}>
                        <VsmSupermarketSymbol x={0} y={0} size={28} />
                      </g>
                    )}
                    {flow.type === "FIFO" && (
                      <g transform={`translate(${seg1Cx},${MAT_Y - 16})`}>
                        <VsmFifoLaneSymbol x={0} y={0} size={24} />
                      </g>
                    )}
                    {flow.type === "KANBAN" && (
                      <g transform={`translate(${seg2Cx},${MAT_Y})`}>
                        <VsmKanbanSymbol x={0} y={0} size={22} />
                      </g>
                    )}
                  </g>
                );
              }
            }

            // ── NO SPLIT: Single continuous arrow (no inventory or inventory hidden) ──
            const cx = (x1 + x2) / 2;
            const showLabelOnThis = idx === 0 || model.materialFlows[idx - 1]?.type !== flow.type;
            return (
              <g key={`mf-${idx}`}>
                <VsmMaterialArrow
                  x1={x1} x2={x2} y={MAT_Y}
                  label={flow.label}
                  flowType={flow.type}
                  transport={flow.distance != null || flow.tripFrequency || flow.equipmentType ? flow : null}
                  hideLabel={!showLabelOnThis}
                />
                {flow.type === "SUPERMARKET" && (
                  <g transform={`translate(${cx},${MAT_Y})`}>
                    <VsmSupermarketSymbol x={0} y={0} size={28} />
                  </g>
                )}
                {flow.type === "FIFO" && (
                  <g transform={`translate(${cx},${MAT_Y - 16})`}>
                    <VsmFifoLaneSymbol x={0} y={0} size={24} />
                  </g>
                )}
                {flow.type === "KANBAN" && (
                  <g transform={`translate(${cx},${MAT_Y})`}>
                    <VsmKanbanSymbol x={0} y={0} size={22} />
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* ═══════════════════════════════════════
             LAYER 6: INVENTORY TRIANGLES (WIP)
             Drawn AFTER arrows so triangles sit on top.
             Each triangle has a protected clearance zone.
             ═══════════════════════════════════════ */}
        {invPos.map((pos, i) => {
          const inv = model.inventories.find(inv => inv.id === pos.id);
          if (!inv) return null;
          // Find matching material flow's equipment for this inventory
          const flow = model.materialFlows[Math.min(i, model.materialFlows.length - 1)];
          const equipType = flow?.equipmentType;
          const severity = flow?.transportSeverity ?? "UNKNOWN";
          const hasEquipment = equipType && equipType !== "NONE" && equipType !== "UNKNOWN" && equipType !== "";
          const equipLabel = flow?.equipmentLabel || (equipType ? EQUIPMENT_LABELS[equipType] || "" : "");
          return (
            <g key={inv.id}>
              <VsmInventoryTriangle
                model={inv}
                x={pos.x}
                y={pos.y}
                onClick={() => onSelectNode(inv.id)}
                icon={hasEquipment ? { type: equipType, label: equipLabel, severity } : null}
              />
            </g>
          );
        })}

        {/* ═══════════════════════════════════════
             LAYER 7: PROCESS BOXES + DATA BOXES
             ═══════════════════════════════════════ */}
        {procPos.map((pos) => {
          const proc = model.processes.find(p => p.id === pos.id);
          if (!proc) return null;
          return (
            <g key={proc.id}>
              {!proc.isActive && (
                <title>Pure push — no schedule signal from Production Control. Material flows based on downstream demand only.</title>
              )}
              <VsmProcessSymbol
                model={proc}
                x={pos.x}
                y={pos.y}
                onClick={() => onSelectNode(proc.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectNode(proc.id);
                  }
                }}
              />
              {/* Kaizen bursts — all severities, controlled by showKaizen toggle */}
              {showKaizen && proc.opportunities.length > 0 && (
                <VsmKaizenBurst
                  type={proc.opportunities[0].type}
                  severity={proc.opportunities[0].severity}
                  x={pos.x + PROC_W + 18}
                  y={pos.y - 12}
                  size={22}
                  message={proc.opportunities[0].message}
                  recommendation={proc.opportunities[0].label}
                  groupCount={proc.opportunities.length}
                  groupIndex={0}
                  onClick={() => onKaizenClick?.(proc.id, 0)}
                />
              )}
            </g>
          );
        })}

        {/* Data boxes — all rows always visible */}
        {procPos.map((pos) => {
          const proc = model.processes.find(p => p.id === pos.id);
          if (!proc || !proc.dataRows.length) return null;
          return (
            <VsmProcessDataBox
              key={`db-${proc.id}`}
              rows={proc.dataRows}
              x={pos.x}
              y={DATA_Y}
              width={PROC_W}
              isAboveTakt={proc.isAboveTakt}
            />
          );
        })}

        {/* ═══════════════════════════════════════
             LAYER 8: INFORMATION-FLOW ARROWS
             (drawn on top of everything for visibility)
             ═══════════════════════════════════════ */}
        {/* Flow labels — core (Customer↔PC↔Supplier↔Pacemaker) always; downstream only when showAllFlows */}
        {(showFlowLogic ?? true) && model.informationFlows.map((flow, i) => {
          const normFrom = normalizeFlowEntity(flow.from);
          const normTo = normalizeFlowEntity(flow.to);

          // Skip PC→Process flows — rendered as schedule lines in LAYER 2B
          if (normFrom === "PC" && normTo !== "CUSTOMER" && normTo !== "SUPPLIER") {
            return null;
          }

          const pathInfo = computeInfoFlowPath(flow, anchors);
          if (!pathInfo.pathD) return null;
          const vis = flowVisibility(flow);
          const tooltip = `${flow.label}\nFrom: ${flow.from}\nTo: ${flow.to}${flow.frequency ? `\nFrequency: ${flow.frequency}` : ""}${flow.method ? `\nMethod: ${flow.method}` : ""}${flow.transmissionType ? `\nType: ${flow.transmissionType}` : ""}${flow.triggerType ? `\nTrigger: ${flow.triggerType}` : ""}`;

          // Push/no-signal: thin dotted line, tooltip, no visible label
          if (vis === "push") {
            return (
              <VsmInformationArrow
                key={`if-${i}`}
                pathD={pathInfo.pathD}
                labelX={pathInfo.labelX}
                labelY={pathInfo.labelY}
                label=""
                pushNoSignal={true}
                tooltip={tooltip}
              />
            );
          }

          // Downstream signal (non-pacemaker PC→process): hidden by default
          // Per spec: only 3 main arrows show by default (Customer→PC, PC→Supplier, PC→Pacemaker)
          // Toggle showAllFlows to reveal downstream schedule signals
          if (vis === "downstream" && !showAllFlows) {
            return null;
          }

          // Core flow: full label
          const labelParts: string[] = [flow.label];
          if (flow.frequency && flow.frequency !== "—") labelParts.push(flow.frequency);
          if (flow.method) labelParts.push(flow.method);
          const displayLabel = labelParts.join(" · ");
          let subLabel: string | null = null;
          if (flow.transmissionType && flow.transmissionType !== "MANUAL" && flow.transmissionType !== "NONE") {
            const methodUpper = (flow.method || "").toUpperCase();
            const transUpper = flow.transmissionType.toUpperCase();
            if (!methodUpper.includes(transUpper) && transUpper !== "ELECTRONIC") {
              subLabel = flow.transmissionType;
            }
          }
          return (
            <VsmInformationArrow
              key={`if-${i}`}
              pathD={pathInfo.pathD}
              labelX={pathInfo.labelX}
              labelY={pathInfo.labelY}
              label={displayLabel}
              subLabel={subLabel}
              flowStyle={(flow.flowStyle ?? "MANUAL") as "MANUAL" | "ELECTRONIC" | "KANBAN" | "SCHEDULE"}
              tooltip={tooltip}
            />
          );
        })}

        {/* ═══════════════════════════════════════
             LAYER 9: OVERLAYS / EXTRAS
             ═══════════════════════════════════════ */}



      </g>{/* end centered VSM group */}

      {/* Future State watermark — positioned at viewBox center, not shifted with content */}
      {model.chartState === "FUTURE_STATE" && (
        <g opacity={0.08}>
          <text x={CANVAS_W / 2} y={CANVAS_H / 2}
            textAnchor="middle" dominantBaseline="central"
            className="text-[96px] font-extrabold uppercase" fill="hsl(var(--accent))"
            transform={`rotate(-30, ${CANVAS_W / 2}, ${CANVAS_H / 2})`}>
            Future State
          </text>
        </g>
      )}

      <ArrowDefs />
    </svg>
  );
}
