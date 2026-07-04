import { useRef, useCallback, useEffect, useMemo } from "react";
import type { VsmDiagram } from "@/types/vsm";
import { StandardVsmTemplate } from "@/features/execution/vsm/template/StandardVsmTemplate";
import { mapVsmApiToTemplateModel } from "@/features/execution/vsm/template/mapVsmApiToTemplateModel";
import { VSM_VIEW_X, VSM_VIEW_Y, VSM_VIEW_W, VSM_VIEW_H, CONTENT_W, CONTENT_H } from "@/features/execution/vsm/template/vsmTemplateGeometry";

interface Props {
  diagram: VsmDiagram;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  showKaizen?: boolean;
  showFlowLogic?: boolean;
  showAllFlows?: boolean;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (z: number) => void;
  onPanChange: (p: { x: number; y: number }) => void;
  /** Increment refitKey to trigger a re-fit from this component's own container */
  refitKey?: number;
}

const FIT_PAD_X = 16;
const FIT_PAD_Y = 12;

/** Convert CSS-style zoom/pan to viewBox string.
 *  zoom=1 → viewBox shows full canvas at natural size.
 *  zoom=0.5 → viewBox shows 2× the area (zoomed out).
 *  pan shifts the viewBox origin in SVG coordinate units. */
function toViewBox(z: number, p: { x: number; y: number }): string {
  const vw = VSM_VIEW_W / z;
  const vh = VSM_VIEW_H / z;
  const cx = VSM_VIEW_X + VSM_VIEW_W / 2 + p.x / z;
  const cy = VSM_VIEW_Y + VSM_VIEW_H / 2 + p.y / z;
  return `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;
}

export function ClassicalVsmCanvas({
  diagram, selectedNodeId, onSelectNode,
  showKaizen, showFlowLogic, showAllFlows, zoom, pan,
  onZoomChange, onPanChange, refitKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doFitRef = useRef<(() => void) | null>(null);

  // Fit: set zoom=1, pan=(0,0). SVG's preserveAspectRatio handles the rest.
  const doFit = useCallback(() => {
    onZoomChange(1);
    onPanChange({ x: 0, y: 0 });
  }, [onZoomChange, onPanChange]);

  useEffect(() => { doFitRef.current = doFit; }, [doFit]);

  // Auto-fit on mount & resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let frame: number;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cw = e.contentBoxSize?.[0]?.inlineSize ?? e.contentRect.width;
        const ch = e.contentBoxSize?.[0]?.blockSize ?? e.contentRect.height;
        if (cw > 0 && ch > 0) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            doFit();
          });
        }
      }
    });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(frame); };
  }, [doFit]);

  // Re-fit on refitKey change (triggered by panel open/close, sidebar toggle, etc.)
  useEffect(() => {
    if (refitKey != null) doFit();
  }, [refitKey, doFit]);

  // Compute viewBox from zoom/pan once per render
  const viewBoxValue = useMemo(() => toViewBox(zoom, pan), [zoom, pan]);

  // Map API data → template model (one-time per diagram change)
  const templateModel = useMemo(() => mapVsmApiToTemplateModel(diagram), [diagram]);

  // Assign selected state
  const modelWithSelection = useMemo(() => ({
    ...templateModel,
    processes: templateModel.processes.map((p) => ({
      ...p,
      isSelected: p.id === selectedNodeId,
    })),
  }), [templateModel, selectedNodeId]);

  // Smooth mouse wheel zoom with inertia
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.25, Math.min(3, zoom + delta));
    onZoomChange(newZoom);
    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    wheelTimeoutRef.current = setTimeout(() => {}, 150);
  }, [zoom, onZoomChange]);

  // Drag-to-pan (viewBox-space shifts)
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number }>(
    { active: false, sx: 0, sy: 0, ox: 0, oy: 0 }
  );
  const handleMD = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
    }
  }, [pan]);
  const handleMM = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    onPanChange({
      x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
      y: dragRef.current.oy + (e.clientY - dragRef.current.sy),
    });
  }, [onPanChange]);
  const handleMU = useCallback(() => { dragRef.current.active = false; }, []);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden bg-gradient-to-br from-muted/30 to-background cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel} onMouseDown={handleMD} onMouseMove={handleMM} onMouseUp={handleMU} onMouseLeave={handleMU}
    >
      <StandardVsmTemplate
        model={modelWithSelection}
        onSelectNode={onSelectNode}
        showKaizen={showKaizen}
        showFlowLogic={showFlowLogic}
        showAllFlows={showAllFlows}
        viewBoxOverride={viewBoxValue}
      />
    </div>
  );
}
