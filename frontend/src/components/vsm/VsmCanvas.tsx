import { useRef, useCallback, useMemo, useEffect } from "react";
import type { VsmDiagram } from "@/types/vsm";
import { VsmInfoFlowBand } from "./VsmInfoFlowBand";
import { VsmMaterialFlowBand } from "./VsmMaterialFlowBand";
import { VsmTimelineBand } from "./VsmTimelineBand";

interface Props {
  diagram: VsmDiagram;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  showWip: boolean;
  showMetrics: boolean;
  zoom: number;
  fitZoom: number;
  pan: { x: number; y: number };
  onZoomChange: (z: number) => void;
  onFitZoomChange: (z: number) => void;
  onPanChange: (p: { x: number; y: number }) => void;
}

const BOX_W = 160;
const BOX_H = 62;
const DATA_BOX_H = 38;
const INV_SIZE = 28;
const NODE_GAP = 80;

const CANVAS_PADDING_X = 40;
const SUPPLIER_OFFSET = 70;
const CUSTOMER_OFFSET = 70;
const PC_WIDTH = 120;

export function VsmCanvas({ diagram, selectedNodeId, onSelectNode, showWip, showMetrics, zoom, pan, onZoomChange, onFitZoomChange, onPanChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastPan = useRef(pan);
  lastPan.current = pan;

  const layout = useMemo(() => {
    const nodes = diagram.processNodes;
    const numNodes = nodes.length;
    const spacing = BOX_W + NODE_GAP;
    const totalMatWidth = (numNodes - 1) * spacing + BOX_W;
    const offsetX = SUPPLIER_OFFSET + 80 + 30;

    // Band Y positions — tight, minimal spacing
    const infoBandY = 20;
    const infoBandH = 100;
    const matBandY = infoBandY + infoBandH + 6;
    const matBandH = 260;
    const timelineBandY = matBandY + matBandH + 6;
    const timelineBandH = 130;

    const matCenterY = matBandY + matBandH / 2;
    const invY = matBandY + BOX_H + 28;

    const procPos = nodes.map((n, i) => ({ id: n.id, x: offsetX + i * spacing, y: matCenterY - BOX_H / 2 }));

    const invPos = diagram.inventoryNodes.map((inv, i) => {
      if (i === 0) return { id: inv.id, x: offsetX - INV_SIZE - 20, y: invY };
      if (i === diagram.inventoryNodes.length - 1) {
        return { id: inv.id, x: offsetX + (numNodes - 1) * spacing + BOX_W + 20, y: invY };
      }
      const procIdx = Math.min(i - 1, numNodes - 2);
      const betweenX = offsetX + procIdx * spacing + BOX_W + NODE_GAP / 2 - INV_SIZE / 2;
      return { id: inv.id, x: betweenX, y: invY };
    });

    const totalMatWidthWithPadding = totalMatWidth + offsetX + CUSTOMER_OFFSET + 80;
    const pcX = offsetX + totalMatWidth / 2 - PC_WIDTH / 2;
    const pcY = infoBandY + 18;
    const supplierX = CANVAS_PADDING_X;
    const customerX = offsetX + totalMatWidth + 40;

    const canvasWidth = Math.max(totalMatWidthWithPadding + CUSTOMER_OFFSET, 900);
    const canvasHeight = timelineBandY + timelineBandH + 30;

    return {
      procPos, invPos, offsetX, spacing, totalMatWidth,
      infoBandY, infoBandH, matBandY, matBandH, timelineBandY, timelineBandH,
      matCenterY, invY, pcX, pcY, supplierX, customerX,
      canvasWidth, canvasHeight, numNodes,
    };
  }, [diagram]);

  // Auto-fit zoom on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const computeFitZoom = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return 1;
      const zoomX = (w - 20) / layout.canvasWidth;
      const zoomY = (h - 20) / layout.canvasHeight;
      return Math.min(zoomX, zoomY, 1.2);
    };

    const fz = computeFitZoom();
    onFitZoomChange(fz);
    onZoomChange(fz);
    onPanChange({ x: 0, y: 0 });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        const h = entry.contentBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (w > 0 && h > 0) {
          const zx = (w - 20) / layout.canvasWidth;
          const zy = (h - 20) / layout.canvasHeight;
          const nfz = Math.min(zx, zy, 1.2);
          onFitZoomChange(nfz);
          onZoomChange(nfz);
          onPanChange({ x: 0, y: 0 });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [layout.canvasWidth, layout.canvasHeight, onZoomChange, onFitZoomChange, onPanChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    onZoomChange(Math.max(0.25, Math.min(3, zoom + delta)));
  }, [zoom, onZoomChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { dragging.current = true; dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging.current) onPanChange({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [onPanChange]);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden bg-muted">
        <svg width="100%" height="100%"
          className="cursor-grab active:cursor-grabbing"
          onWheel={handleWheel} onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          viewBox={`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <VsmInfoFlowBand
              diagram={diagram}
              canvasWidth={layout.canvasWidth}
              supplierX={layout.supplierX}
              customerX={layout.customerX}
              pcX={layout.pcX}
              pcY={layout.pcY}
              offsetX={layout.offsetX}
              spacing={layout.spacing}
              boxW={BOX_W}
              bandY={layout.infoBandY}
              bandHeight={layout.infoBandH}
            />

            <VsmMaterialFlowBand
              diagram={diagram}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              showWip={showWip}
              showMetrics={showMetrics}
              bandY={layout.matBandY}
              bandHeight={layout.matBandH}
              canvasWidth={layout.canvasWidth}
              supplierX={layout.supplierX}
              customerX={layout.customerX}
              offsetX={layout.offsetX}
              spacing={layout.spacing}
              boxW={BOX_W}
              boxH={BOX_H}
              dataBoxH={DATA_BOX_H}
              invSize={INV_SIZE}
              matCenterY={layout.matCenterY}
              procPos={layout.procPos}
              invPos={layout.invPos}
            />

            <VsmTimelineBand
              events={diagram.timeline}
              totalLeadTimeMinutes={diagram.totalLeadTimeMinutes}
              totalValueAddMinutes={diagram.totalValueAddMinutes}
              bandY={layout.timelineBandY}
              bandHeight={layout.timelineBandH}
              canvasWidth={layout.canvasWidth}
              startX={layout.offsetX}
              processSpacing={layout.spacing}
              processWidth={BOX_W}
              numProcesses={layout.numNodes}
            />
          </g>

          <defs>
            <marker id="arrow-PUSH" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
              <polygon points="0,0 8,3 0,6" fill="hsl(var(--muted-foreground))" />
            </marker>
            <marker id="arrow-PULL" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
              <polygon points="0,0 8,3 0,6" fill="hsl(var(--primary))" />
            </marker>
            <marker id="arrow-KANBAN" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
              <polygon points="0,0 8,3 0,6" fill="hsl(var(--warning))" />
            </marker>
            <marker id="arrow-FIFO" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
              <polygon points="0,0 8,3 0,6" fill="hsl(var(--success))" />
            </marker>
            <marker id="arrow-info" markerWidth={6} markerHeight={5} refX={6} refY={2.5} orient="auto">
              <polygon points="0,0 6,2.5 0,5" fill="hsl(var(--muted-foreground))" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}
