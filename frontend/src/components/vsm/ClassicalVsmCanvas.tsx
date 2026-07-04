import { useRef, useCallback, useEffect, useMemo } from "react";
import type { VsmDiagram } from "@/types/vsm";
import { StandardVsmTemplate } from "@/features/execution/vsm/template/StandardVsmTemplate";
import { mapVsmApiToTemplateModel } from "@/features/execution/vsm/template/mapVsmApiToTemplateModel";
import { VSM_VIEW_W, VSM_VIEW_H } from "@/features/execution/vsm/template/vsmTemplateGeometry";

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

function computeFit(cw: number, ch: number): { zoom: number; pan: { x: number; y: number } } {
  const scale = Math.min(
    (cw - FIT_PAD_X * 2) / VSM_VIEW_W,
    (ch - FIT_PAD_Y * 2) / VSM_VIEW_H
  );
  return {
    zoom: Math.max(0.1, Math.min(2, scale)),
    pan: {
      x: Math.round((cw - VSM_VIEW_W * scale) / 2),
      y: Math.round((ch - VSM_VIEW_H * scale) / 2),
    },
  };
}

export function ClassicalVsmCanvas({
  diagram, selectedNodeId, onSelectNode,
  showKaizen, showFlowLogic, showAllFlows, zoom, pan,
  onZoomChange, onPanChange, refitKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doFitRef = useRef<(() => void) | null>(null);

  // Expose fit function so it can be called from resize or refitKey change
  const doFit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const scale = Math.min(
      (cw - FIT_PAD_X * 2) / VSM_VIEW_W,
      (ch - FIT_PAD_Y * 2) / VSM_VIEW_H
    );
    onZoomChange(Math.max(0.1, Math.min(2, scale)));
    onPanChange({
      x: Math.round((cw - VSM_VIEW_W * scale) / 2),
      y: Math.round((ch - VSM_VIEW_H * scale) / 2),
    });
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
    // Dampened zoom for smooth feel
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.25, Math.min(3, zoom + delta));
    onZoomChange(newZoom);

    // Subtle inertia: continue zooming slightly after wheel stops
    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    wheelTimeoutRef.current = setTimeout(() => {
      // snap effect is done — no further action needed
    }, 150);
  }, [zoom, onZoomChange]);

  // Drag-to-pan with smooth mouse tracking
  const panState = useRef({ dragging: false, dx: 0, dy: 0 });
  const handleMD = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      panState.current = { dragging: true, dx: e.clientX - pan.x, dy: e.clientY - pan.y };
    }
  }, [pan]);
  const handleMM = useCallback((e: React.MouseEvent) => {
    if (panState.current.dragging) {
      onPanChange({ x: e.clientX - panState.current.dx, y: e.clientY - panState.current.dy });
    }
  }, [onPanChange]);
  const handleMU = useCallback(() => {
    panState.current.dragging = false;
  }, []);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden bg-gradient-to-br from-muted/30 to-background">
      <div style={{
        width: "100%", height: "100%",
        transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
        transformOrigin: "0 0",
        transition: "transform 0.08s ease-out",
        cursor: "grab",
      }}
        onWheel={handleWheel} onMouseDown={handleMD}
        onMouseMove={handleMM} onMouseUp={handleMU} onMouseLeave={handleMU}
        className="active:cursor-grabbing select-none"
      >
        {/* Subtle background grid pattern for depth */}
        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <defs>
            <pattern id="vsm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#vsm-grid)" />
        </svg>
        <StandardVsmTemplate
          model={modelWithSelection}
          onSelectNode={onSelectNode}
          showKaizen={showKaizen}
          showFlowLogic={showFlowLogic}
          showAllFlows={showAllFlows}
        />
      </div>
    </div>
  );
}
