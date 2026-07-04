// ── Pure info-flow routing logic — no React dependencies, fully testable ──
// Computes SVG path strings and label positions for VSM information-flow arrows.

import type { InformationFlowModel } from "./vsmTemplateTypes";

// ── Routing constants ──
// Top-zone info-flow lanes — below factories/PC, above process row
export const INFO_CUSTOMER_Y = 250;   // Customer → PC horizontal lane
export const INFO_SUPPLIER_Y = 265;   // PC → Supplier horizontal lane
// PC→Process elbow horizontal Y: above process top (PROC_Y=420)
export const SCHEDULE_LANE_BASE_Y = 395;
// Per-flow lane stride so multiple PC→Process schedules don't overlap
export const SCHEDULE_LANE_STRIDE = 14;
// Label offset above the line stroke
export const INFO_LABEL_OFFSET = 32;
// Minimum clearance around boxes
export const INFO_BOX_CLEARANCE = 12;



// ── Result type ──
export interface InfoFlowPath {
  pathD: string;
  labelX: number;
  labelY: number;
}

// ── Anchor points interface ──
export interface InfoFlowAnchors {
  supplier: { top: { x: number; y: number }; left: { x: number; y: number }; right: { x: number; y: number }; bottom: { x: number; y: number } };
  pc: { left: { x: number; y: number }; right: { x: number; y: number }; top: { x: number; y: number }; bottom: { x: number; y: number } };
  customer: { top: { x: number; y: number }; left: { x: number; y: number }; right: { x: number; y: number }; bottom: { x: number; y: number } };
  processes: Record<string, { top: { x: number; y: number }; center: { x: number; y: number }; bottom: { x: number; y: number } }>;
}

// ── Entity normalisation ──

/** Normalize entity names for info-flow routing.
 *  Catches non-canonical IDs that the API may return (prefixed IDs like
 *  "PC-001", DB UUIDs, different casing, etc.) and maps them to the
 *  canonical SUPPLIER / CUSTOMER / PC names used by resolveAnchor. */
export function normalizeFlowEntity(id: string): string {
  if (!id) return id;
  const upper = id.toUpperCase().replace(/[\s_-]+/g, "_");
  if (upper === "SUPPLIER" || upper === "CUSTOMER" || upper === "PC") return upper;
  if (upper.startsWith("PC_") || upper.startsWith("PROD_CONTROL") || upper.includes("CONTROL")) return "PC";
  if (upper.startsWith("SUPP_") || upper.includes("SUPPLIER") || upper.includes("RM_SUPPL")) return "SUPPLIER";
  if (upper.startsWith("CUST_") || upper.includes("CUSTOMER") || upper.includes("FG_CUST")) return "CUSTOMER";
  return id; // process IDs pass through
}

// ── Anchor resolution ──

/** Resolve an anchor point for a given entity and side. */
export function resolveAnchor(
  entity: string,
  side: "top" | "right" | "bottom" | "left" | "center",
  anchors: InfoFlowAnchors,
): { x: number; y: number } | null {
  if (entity === "SUPPLIER") {
    if (side === "right") return anchors.supplier.right;
    if (side === "left") return anchors.supplier.left;
    if (side === "top") return anchors.supplier.top;
    if (side === "bottom") return anchors.supplier.bottom;
  }
  if (entity === "PC") {
    if (side === "left") return anchors.pc.left;
    if (side === "right") return anchors.pc.right;
    if (side === "top") return anchors.pc.top;
    if (side === "bottom") return anchors.pc.bottom;
    if (side === "center") return {
      x: anchors.pc.left.x + (anchors.pc.right.x - anchors.pc.left.x) / 2,
      y: anchors.pc.top.y + (anchors.pc.bottom.y - anchors.pc.top.y) / 2,
    };
  }
  if (entity === "CUSTOMER") {
    if (side === "left") return anchors.customer.left;
    if (side === "right") return anchors.customer.right;
    if (side === "top") return anchors.customer.top;
    if (side === "bottom") return anchors.customer.bottom;
  }
  const proc = anchors.processes[entity];
  if (proc) {
    if (side === "top") return proc.top;
    if (side === "center") return proc.center;
    if (side === "bottom") return proc.bottom;
  }
  return null;
}

// ── Info-flow path computation ──

/**
 * Compute a clean orthogonal elbow path for an information flow,
 * connecting source border center to target border center.
 *
 * @param flow  The information-flow model (from / to / label).
 * @param anchors  Pre-computed anchor points for supplier / PC / customer / processes.
 * @param flowIndex  Optional index for staggering multiple PC→Process schedule lanes.
 * @returns  SVG path string and label position.
 */
export function computeInfoFlowPath(
  flow: InformationFlowModel,
  anchors: InfoFlowAnchors,
  flowIndex?: number,
): InfoFlowPath {
  const normFrom = normalizeFlowEntity(flow.from);
  const normTo = normalizeFlowEntity(flow.to);

  // ── Route: Customer → PC ──
  // Octopus-arm cubic bezier: from FG Customer left border center to PC right border center.
  if (normFrom === "CUSTOMER" && normTo === "PC") {
    const src = anchors.customer.left;
    const tgt = anchors.pc.right;
    const midX = (src.x + tgt.x) / 2;
    const dx = tgt.x - src.x;
    const cp1x = src.x + dx * 0.3;
    const cp2x = tgt.x - dx * 0.2;
    // Push CP1 down and CP2 up to create a tentacle S-curve
    const cp1y = src.y + 60;
    const cp2y = tgt.y - 60;

    return {
      pathD: `M${src.x},${src.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${tgt.x},${tgt.y}`,
      labelX: midX,
      labelY: (cp1y + cp2y) / 2 - INFO_LABEL_OFFSET,
    };
  }

  // ── Route: PC → Supplier ──
  // Octopus-arm cubic bezier: from PC left border center to RM Supply right border center.
  if (normFrom === "PC" && normTo === "SUPPLIER") {
    const src = anchors.pc.left;
    const tgt = anchors.supplier.right;
    const midX = (src.x + tgt.x) / 2;
    const dx = tgt.x - src.x;
    const cp1x = src.x + dx * 0.3;
    const cp2x = tgt.x - dx * 0.2;
    // Push CP1 down and CP2 up to create a tentacle S-curve
    const cp1y = src.y + 60;
    const cp2y = tgt.y - 60;

    return {
      pathD: `M${src.x},${src.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${tgt.x},${tgt.y}`,
      labelX: midX,
      labelY: (cp1y + cp2y) / 2 - INFO_LABEL_OFFSET,
    };
  }

  // ── Route: PC → Process (smooth octopus-arm bezier from PC bottom to process top) ──
  if (normFrom === "PC" && normTo !== "CUSTOMER" && normTo !== "SUPPLIER") {
    const src = anchors.pc.bottom;
    const processAnchor = anchors.processes[normTo];
    if (processAnchor) {
      const tgt = processAnchor.top;
      const dy = tgt.y - src.y;
      const laneOffset = flowIndex != null ? flowIndex * SCHEDULE_LANE_STRIDE : 0;
      // Stagger the curve depth so multiple schedule arms don't overlap
      const dip = dy * (0.55 + laneOffset * 0.012);
      const cp1 = { x: src.x + (tgt.x - src.x) * 0.15, y: src.y + dip };
      const cp2 = { x: tgt.x - (tgt.x - src.x) * 0.15, y: tgt.y - dy * 0.1 };
      const bottomY = Math.max(cp1.y, cp2.y);
      return {
        pathD: `M${src.x},${src.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${tgt.x},${tgt.y}`,
        labelX: (src.x + tgt.x) / 2,
        labelY: bottomY - INFO_LABEL_OFFSET,
      };
    }
  }

  // ── Generic fallback: smooth octopus-arm bezier ──
  const srcSide = normFrom === "PC" ? "bottom" : normTo === "PC" ? "right" : normTo === "CUSTOMER" ? "left" : "top";
  const tgtSide = normTo === "PC" ? "left" : normFrom === "CUSTOMER" ? "right" : "top";
  const anchor = (entity: string, side: "top" | "right" | "bottom" | "left" | "center") =>
    resolveAnchor(entity, side, anchors);
  const srcAnchor = anchor(normFrom, srcSide);
  const tgtAnchor = anchor(normTo, tgtSide);
  if (srcAnchor && tgtAnchor) {
    const midX = (srcAnchor.x + tgtAnchor.x) / 2;
    const dx = tgtAnchor.x - srcAnchor.x;
    const dy = tgtAnchor.y - srcAnchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // For near-vertical routes dip horizontally; for near-horizontal routes dip vertically
    const isVertical = Math.abs(dy) > Math.abs(dx);
    if (isVertical) {
      const cp1 = { x: srcAnchor.x + dx * 0.15, y: srcAnchor.y + dy * 0.45 };
      const cp2 = { x: tgtAnchor.x - dx * 0.15, y: tgtAnchor.y - dy * 0.15 };
      return {
        pathD: `M${srcAnchor.x},${srcAnchor.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${tgtAnchor.x},${tgtAnchor.y}`,
        labelX: midX,
        labelY: Math.max(cp1.y, cp2.y) - INFO_LABEL_OFFSET,
      };
    }
    // Horizontal routes: gentle S-curve
    const midY = (srcAnchor.y + tgtAnchor.y) / 2;
    const cp1 = { x: srcAnchor.x + dx * 0.35, y: srcAnchor.y + (midY - srcAnchor.y) * 0.6 };
    const cp2 = { x: tgtAnchor.x - dx * 0.35, y: tgtAnchor.y + (midY - tgtAnchor.y) * 0.6 };
    const pathY = Math.max(cp1.y, cp2.y);
    return {
      pathD: `M${srcAnchor.x},${srcAnchor.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${tgtAnchor.x},${tgtAnchor.y}`,
      labelX: midX,
      labelY: pathY - INFO_LABEL_OFFSET,
    };
  }

  return { pathD: "", labelX: 0, labelY: 0 };
}
