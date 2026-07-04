import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { VsmDiagram } from "@/types/vsm";
import { StandardVsmTemplate } from "@/features/execution/vsm/template/StandardVsmTemplate";
import { mapVsmApiToTemplateModel } from "@/features/execution/vsm/template/mapVsmApiToTemplateModel";
import { CONTENT_W, CONTENT_H, CONTENT_MIN_X, CONTENT_MIN_Y, CANVAS_W } from "@/features/execution/vsm/template/vsmTemplateGeometry";

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
  refitKey?: number;
}

const FIT_PAD = 40;

export function ClassicalVsmCanvas({
  diagram, selectedNodeId, onSelectNode,
  showKaizen, showFlowLogic, showAllFlows, zoom, pan,
  onZoomChange, onPanChange, refitKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const [ch, setCh] = useState(0);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let frame: number;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentBoxSize?.[0]?.inlineSize ?? e.contentRect.width;
        const h = e.contentBoxSize?.[0]?.blockSize ?? e.contentRect.height;
        if (w > 0 && h > 0) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            setCw(w);
            setCh(h);
          });
        }
      }
    });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  // Compute fit zoom from container dimensions
  const doFit = useCallback(() => {
    if (cw <= 0 || ch <= 0) return;
    const availW = cw - FIT_PAD * 2;
    const availH = ch - FIT_PAD * 2;
    const sx = availW / CONTENT_W;
    const sy = availH / CONTENT_H;
    // Fit all content on screen — nothing clipped, none pushed outside.
    const scale = Math.min(sx, sy);
    console.log(
      `Fit | cw=${cw} ch=${ch} availW=${availW} availH=${availH} ` +
      `contentW=${CONTENT_W} contentH=${CONTENT_H} ` +
      `scaleX=${sx.toFixed(4)} scaleY=${sy.toFixed(4)} finalScale=${scale.toFixed(4)} ` +
      `contentMinY=${CONTENT_MIN_Y} contentMaxY=${CONTENT_MIN_Y + CONTENT_H} contentH=${CONTENT_H}`
    );
    onZoomChange(Math.max(0.1, scale));
    onPanChange({ x: 0, y: 0 });
  }, [cw, ch, onZoomChange, onPanChange]);

  // Fit on mount/resize
  useEffect(() => { doFit(); }, [doFit]);

  // Re-fit on refitKey change
  useEffect(() => {
    if (refitKey != null) doFit();
  }, [refitKey, doFit]);

  // Content group transform: scale + translate
  // Centered both horizontally and vertically — all content stays on screen.
  const contentTransform = useMemo<string | undefined>(() => {
    if (cw <= 0 || ch <= 0) return undefined;
    const ox = (cw - CONTENT_W * zoom) / 2 - CONTENT_MIN_X * zoom + pan.x;
    const oy = (ch - CONTENT_H * zoom) / 2 - CONTENT_MIN_Y * zoom + pan.y;
    return `translate(${ox},${oy}) scale(${zoom})`;
  }, [cw, ch, zoom, pan]);

  // ViewBox matches container dimensions for 1:1 coordinate-to-pixel mapping
  const viewBoxValue = useMemo<string>(() => {
    if (cw <= 0 || ch <= 0) return `0 0 ${CANVAS_W} ${CANVAS_W}`;
    return `0 0 ${cw} ${ch}`;
  }, [cw, ch]);

  // Map API data → template model
  const templateModel = useMemo(() => mapVsmApiToTemplateModel(diagram), [diagram]);

  // Assign selected state
  const modelWithSelection = useMemo(() => ({
    ...templateModel,
    processes: templateModel.processes.map((p) => ({
      ...p,
      isSelected: p.id === selectedNodeId,
    })),
  }), [templateModel, selectedNodeId]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.1, Math.min(3, zoom + delta));
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  // Drag-to-pan (pixel-space shift, 1:1 with viewBox)
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
    <div ref={containerRef} className="relative h-full overflow-hidden bg-gradient-to-br from-muted/30 to-background cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel} onMouseDown={handleMD} onMouseMove={handleMM} onMouseUp={handleMU} onMouseLeave={handleMU}
    >
      {/* absolute inset-0 wrapper forces the SVG to have explicit dimensions
          regardless of SVG's special replaced-element height:100% rules */}
      <div className="absolute inset-0">
        <StandardVsmTemplate
          model={modelWithSelection}
          onSelectNode={onSelectNode}
          showKaizen={showKaizen}
          showFlowLogic={showFlowLogic}
          showAllFlows={showAllFlows}
          viewBox={viewBoxValue}
          contentTransform={contentTransform}
        />
      </div>
    </div>
  );
}
