import { describe, it, expect } from "vitest";
import {
  computeInfoFlowPath,
  normalizeFlowEntity,
  resolveAnchor,
  INFO_CUSTOMER_Y,
  INFO_SUPPLIER_Y,
  SCHEDULE_LANE_BASE_Y,
  INFO_LABEL_OFFSET,
} from "@/features/execution/vsm/template/vsmInfoFlowRouter";
import type { InfoFlowAnchors } from "@/features/execution/vsm/template/vsmInfoFlowRouter";
import type { InformationFlowModel } from "@/features/execution/vsm/template/vsmTemplateTypes";

// ── Geometry constants (mirrors vsmTemplateGeometry.ts) ──
const FAC_X = 24;
const FAC_Y = 55;
const FAC_W = 155;
const FAC_H = 90;
const SUP_CX = FAC_X + FAC_W / 2;  // 102
const CUST_CX = 2400 - FAC_W - 24 + FAC_W / 2;  // 2299
const PC_X = (2400 - 260) / 2;     // 1070
const PC_W = 260;
const PC_H = 95;
const PC_Y = 50;
const PROC_H = 78;
const PROC_Y = 420;

// ── Build standard InfoFlowAnchors (as used by computeAnchors in StandardVsmTemplate) ──
function makeAnchors(procPositions: { id: string; cx: number }[]): InfoFlowAnchors {
  const processes: InfoFlowAnchors["processes"] = {};
  for (const p of procPositions) {
    processes[p.id] = {
      top: { x: p.cx, y: PROC_Y },
      center: { x: p.cx, y: PROC_Y + PROC_H / 2 },
      bottom: { x: p.cx, y: PROC_Y + PROC_H },
    };
  }
  return {
    supplier: {
      top: { x: SUP_CX, y: FAC_Y },
      left: { x: FAC_X, y: FAC_Y + FAC_H / 2 },
      right: { x: FAC_X + FAC_W, y: FAC_Y + FAC_H / 2 },
      bottom: { x: SUP_CX, y: FAC_Y + FAC_H },
    },
    pc: {
      left: { x: PC_X, y: PC_Y + PC_H / 2 },
      right: { x: PC_X + PC_W, y: PC_Y + PC_H / 2 },
      top: { x: PC_X + PC_W / 2, y: PC_Y },
      bottom: { x: PC_X + PC_W / 2, y: PC_Y + PC_H },
    },
    customer: {
      top: { x: CUST_CX, y: FAC_Y },
      left: { x: 2400 - FAC_W - 24, y: FAC_Y + FAC_H / 2 },
      right: { x: 2400 - 24, y: FAC_Y + FAC_H / 2 },
      bottom: { x: CUST_CX, y: FAC_Y + FAC_H },
    },
    processes,
  };
}

// ── Helper: extract coordinates from SVG path string ──
function parsePath(pathD: string): { x: number; y: number }[] {
  const nums = pathD.match(/[\d.]+/g);
  if (!nums) return [];
  const coords: { x: number; y: number }[] = [];
  const tokens = pathD.match(/[MHV]\s*[\d.]+(?:[\s,]+[\d.]+)?/g);
  if (!tokens) return coords;
  let cx = 0, cy = 0;
  for (const tok of tokens) {
    const cmd = tok[0];
    const rest = tok.slice(1).trim();
    if (cmd === "M") {
      const parts = rest.split(/[\s,]+/).map(Number);
      cx = parts[0];
      cy = parts[1];
      coords.push({ x: cx, y: cy });
    } else if (cmd === "V") {
      cy = Number(rest);
      coords.push({ x: cx, y: cy });
    } else if (cmd === "H") {
      cx = Number(rest);
      coords.push({ x: cx, y: cy });
    }
  }
  return coords;
}

// ── Process / clearance reference values ──
const PROCESS_TOP_Y = PROC_Y;  // 398

// ══════════════════════════════════════════════════════════════════
// normalizeFlowEntity
// ══════════════════════════════════════════════════════════════════

describe("normalizeFlowEntity", () => {
  it("returns canonical names as-is", () => {
    expect(normalizeFlowEntity("SUPPLIER")).toBe("SUPPLIER");
    expect(normalizeFlowEntity("CUSTOMER")).toBe("CUSTOMER");
    expect(normalizeFlowEntity("PC")).toBe("PC");
  });

  it("maps prefixed IDs to canonical names", () => {
    expect(normalizeFlowEntity("PC-001")).toBe("PC");
    expect(normalizeFlowEntity("SUPP-001")).toBe("SUPPLIER");
    expect(normalizeFlowEntity("CUST-001")).toBe("CUSTOMER");
    expect(normalizeFlowEntity("PROD_CONTROL")).toBe("PC");
  });

  it("maps loose descriptive strings", () => {
    expect(normalizeFlowEntity("Rm supply")).toBe("SUPPLIER");
    expect(normalizeFlowEntity("FG Customer")).toBe("CUSTOMER");
    expect(normalizeFlowEntity("production control")).toBe("PC");
  });

  it("passes through process IDs unchanged", () => {
    expect(normalizeFlowEntity("PN-001")).toBe("PN-001");
    expect(normalizeFlowEntity("proc-abc")).toBe("proc-abc");
  });

  it("handles empty / falsy input", () => {
    expect(normalizeFlowEntity("")).toBe("");
    expect(normalizeFlowEntity("abc")).toBe("abc");
  });
});

// ══════════════════════════════════════════════════════════════════
// resolveAnchor
// ══════════════════════════════════════════════════════════════════

describe("resolveAnchor", () => {
  const anchors = makeAnchors([]);

  it("resolves supplier anchors", () => {
    expect(resolveAnchor("SUPPLIER", "right", anchors)!.x).toBe(FAC_X + FAC_W);
    expect(resolveAnchor("SUPPLIER", "left", anchors)!.x).toBe(FAC_X);
    expect(resolveAnchor("SUPPLIER", "top", anchors)!.x).toBe(SUP_CX);
    expect(resolveAnchor("SUPPLIER", "bottom", anchors)!.x).toBe(SUP_CX);
  });

  it("resolves PC anchors", () => {
    expect(resolveAnchor("PC", "left", anchors)!.x).toBe(PC_X);
    expect(resolveAnchor("PC", "right", anchors)!.x).toBe(PC_X + PC_W);
    expect(resolveAnchor("PC", "top", anchors)!.y).toBe(PC_Y);
    expect(resolveAnchor("PC", "bottom", anchors)!.y).toBe(PC_Y + PC_H);
  });

  it("resolves customer anchors", () => {
    const left = resolveAnchor("CUSTOMER", "left", anchors)!;
    expect(left.x).toBe(2400 - FAC_W - 24);
    expect(left.y).toBe(FAC_Y + FAC_H / 2);
  });

  it("resolves process anchors", () => {
    const anchors2 = makeAnchors([{ id: "proc-1", cx: 600 }]);
    expect(resolveAnchor("proc-1", "top", anchors2)!.x).toBe(600);
    expect(resolveAnchor("proc-1", "top", anchors2)!.y).toBe(PROC_Y);
    expect(resolveAnchor("proc-1", "center", anchors2)!.y).toBe(PROC_Y + PROC_H / 2);
    expect(resolveAnchor("proc-1", "bottom", anchors2)!.y).toBe(PROC_Y + PROC_H);
  });

  it("returns null for unknown entity", () => {
    expect(resolveAnchor("bogus", "top", anchors)).toBeNull();
  });

  it("returns PC center anchor", () => {
    const center = resolveAnchor("PC", "center", anchors)!;
    expect(center.x).toBe(PC_X + PC_W / 2);
    expect(center.y).toBe(PC_Y + PC_H / 2);
  });
});

// ══════════════════════════════════════════════════════════════════
// computeInfoFlowPath – Customer → PC
// ══════════════════════════════════════════════════════════════════

describe("computeInfoFlowPath – Customer → PC", () => {
  const anchors = makeAnchors([]);
  const flow: InformationFlowModel = { from: "CUSTOMER", to: "PC", label: "Customer demand", frequency: "Daily" };
  const result = computeInfoFlowPath(flow, anchors);
  const custLeftY = FAC_Y + FAC_H / 2;  // 100
  const custLeftX = 2400 - FAC_W - 24;  // 2221
  const pcRightX = PC_X + PC_W;         // 1330
  const lineY = custLeftY;              // straight horizontal at source anchor Y

  it("draws straight horizontal line from customer left border center to PC right border center", () => {
    const pts = parsePath(result.pathD);
    expect(pts).toHaveLength(2);
    expect(pts[0].x).toBe(custLeftX);
    expect(pts[0].y).toBe(lineY);
    expect(pts[1].x).toBe(pcRightX);
    expect(pts[1].y).toBe(lineY);
  });

  it("label is above the line at source anchor Y", () => {
    expect(result.labelY).toBe(lineY - INFO_LABEL_OFFSET);
  });

  it("label X is midway between customer left and PC right", () => {
    expect(result.labelX).toBe((custLeftX + pcRightX) / 2);
  });

  it("pathD has straight M+H pattern (no vertical segments)", () => {
    expect(result.pathD).toMatch(/^M[\d.]+,[\d.]+ H[\d.]+$/);
  });

  it("does not use INFO_CUSTOMER_Y (straight horizontal, no info lane)", () => {
    const pts = parsePath(result.pathD);
    expect(pts[0].y).toBe(custLeftY);
    expect(pts[0].y).not.toBe(INFO_CUSTOMER_Y);
  });
});

// ══════════════════════════════════════════════════════════════════
// computeInfoFlowPath – PC → Supplier
// ══════════════════════════════════════════════════════════════════

describe("computeInfoFlowPath – PC → Supplier", () => {
  const anchors = makeAnchors([]);
  const flow: InformationFlowModel = { from: "PC", to: "SUPPLIER", label: "Release schedule", frequency: "Weekly" };
  const result = computeInfoFlowPath(flow, anchors);
  const pcLeftY = PC_Y + PC_H / 2;  // 97.5
  const pcLeftX = PC_X;             // 1070
  const suppRightX = FAC_X + FAC_W; // 179
  const lineY = pcLeftY;            // straight horizontal at source anchor Y

  it("draws straight horizontal line from PC left border center to supplier right border center", () => {
    const pts = parsePath(result.pathD);
    expect(pts).toHaveLength(2);
    expect(pts[0].x).toBe(pcLeftX);
    expect(pts[0].y).toBe(lineY);
    expect(pts[1].x).toBe(suppRightX);
    expect(pts[1].y).toBe(lineY);
  });

  it("label is above the line at source anchor Y", () => {
    expect(result.labelY).toBe(lineY - INFO_LABEL_OFFSET);
  });

  it("label X is midway between PC left and supplier right", () => {
    expect(result.labelX).toBe((pcLeftX + suppRightX) / 2);
  });

  it("pathD has straight M+H pattern (no vertical segments)", () => {
    expect(result.pathD).toMatch(/^M[\d.]+,[\d.]+ H[\d.]+$/);
  });

  it("does not use INFO_SUPPLIER_Y (straight horizontal, no info lane)", () => {
    const pts = parsePath(result.pathD);
    expect(pts[0].y).toBe(pcLeftY);
    expect(pts[0].y).not.toBe(INFO_SUPPLIER_Y);
  });
});

// ══════════════════════════════════════════════════════════════════
// computeInfoFlowPath – PC → Process
// ══════════════════════════════════════════════════════════════════

describe("computeInfoFlowPath – PC → Process (centered below PC)", () => {
  // Process directly below PC — uses 2-segment elbow through SCHEDULE_LANE_BASE_Y
  const procCx = PC_X + PC_W / 2;  // 1200
  const anchors = makeAnchors([{ id: "proc-1", cx: procCx }]);
  const flow: InformationFlowModel = { from: "PC", to: "proc-1", label: "Production schedule", frequency: "Daily" };
  const result = computeInfoFlowPath(flow, anchors);

  it("uses 2-segment elbow path (V H V)", () => {
    const pts = parsePath(result.pathD);
    expect(pts).toHaveLength(4);  // M → V → H → V
    expect(result.pathD).toMatch(/^M[\d.]+,[\d.]+ V[\d.]+ H[\d.]+ V[\d.]+$/);
  });

  it("elbow horizontal is at SCHEDULE_LANE_BASE_Y", () => {
    const pts = parsePath(result.pathD);
    expect(pts[1].y).toBe(SCHEDULE_LANE_BASE_Y);
    expect(pts[2].y).toBe(SCHEDULE_LANE_BASE_Y);
  });

  it("goes from PC bottom to process top", () => {
    const pts = parsePath(result.pathD);
    expect(pts[0].x).toBe(procCx);
    expect(pts[0].y).toBe(PC_Y + PC_H);  // PC bottom
    expect(pts[3].y).toBe(PROC_Y);       // Process top
  });

  it("label is above the elbow horizontal segment", () => {
    expect(result.labelY).toBe(SCHEDULE_LANE_BASE_Y - INFO_LABEL_OFFSET);
  });
});

describe("computeInfoFlowPath – PC → Process (elbow, process to left)", () => {
  // Process to the left of PC — 2-segment elbow
  const procCx = 400;
  const anchors = makeAnchors([{ id: "proc-left", cx: procCx }]);
  const flow: InformationFlowModel = { from: "PC", to: "proc-left", label: "Schedule signal", frequency: "Daily" };
  const result = computeInfoFlowPath(flow, anchors);

  it("uses 2-segment elbow path (V H V)", () => {
    const pts = parsePath(result.pathD);
    expect(result.pathD).toMatch(/^M[\d.]+,[\d.]+ V[\d.]+ H[\d.]+ V[\d.]+$/);
    expect(pts).toHaveLength(4);
  });

  it("horizontal segment Y (SCHEDULE_LANE_BASE_Y) is above process top", () => {
    const pts = parsePath(result.pathD);
    const midY = pts[1].y;
    expect(midY).toBe(SCHEDULE_LANE_BASE_Y);
    expect(midY).toBeLessThan(PROCESS_TOP_Y);
  });

  it("horizontal segment connects PC bottom to process center", () => {
    const pts = parsePath(result.pathD);
    const pcCx = PC_X + PC_W / 2;
    expect(pts[0].x).toBe(pcCx);
    expect(pts[1].x).toBe(pcCx);
    expect(pts[2].x).toBe(procCx);
    expect(pts[2].y).toBe(pts[1].y);
    expect(pts[3].x).toBe(procCx);
    expect(pts[3].y).toBe(PROCESS_TOP_Y);
  });

  it("starts from PC bottom and ends at process top", () => {
    const pts = parsePath(result.pathD);
    expect(pts[0].y).toBe(PC_Y + PC_H);
    expect(pts[3].y).toBe(PROCESS_TOP_Y);
  });

  it("label is above the elbow horizontal segment", () => {
    expect(result.labelY).toBe(SCHEDULE_LANE_BASE_Y - INFO_LABEL_OFFSET);
  });

  it("label X is midway between PC and process", () => {
    const pcCx = PC_X + PC_W / 2;
    expect(result.labelX).toBe((pcCx + procCx) / 2);
  });
});

describe("computeInfoFlowPath – PC → Process (elbow, process to right)", () => {
  const procCx = 1800;
  const anchors = makeAnchors([{ id: "proc-right", cx: procCx }]);
  const flow: InformationFlowModel = { from: "PC", to: "proc-right", label: "Schedule signal", frequency: "Daily" };
  const result = computeInfoFlowPath(flow, anchors);

  it("horizontal segment Y is SCHEDULE_LANE_BASE_Y even when process is to the right", () => {
    const pts = parsePath(result.pathD);
    expect(pts[1].y).toBe(SCHEDULE_LANE_BASE_Y);
  });

  it("horizontal goes from PC center to process center", () => {
    const pts = parsePath(result.pathD);
    const pcCx = PC_X + PC_W / 2;
    expect(pts[0].x).toBe(pcCx);
    expect(pts[1].x).toBe(pcCx);
    expect(pts[2].x).toBe(procCx);
  });
});

describe("computeInfoFlowPath – PC → Process (multiple processes)", () => {
  it("routes correctly for the leftmost process", () => {
    const anchors = makeAnchors([
      { id: "proc-1", cx: 350 },
      { id: "proc-2", cx: 600 },
      { id: "proc-3", cx: 850 },
    ]);
    const flow: InformationFlowModel = { from: "PC", to: "proc-1", label: "Schedule", frequency: "Daily" };
    const result = computeInfoFlowPath(flow, anchors);
    const pts = parsePath(result.pathD);
    const midY = pts[1].y;
    expect(midY).toBe(SCHEDULE_LANE_BASE_Y);
    expect(midY).toBeLessThan(PROCESS_TOP_Y);
  });

  it("routes correctly for the rightmost process", () => {
    const anchors = makeAnchors([
      { id: "proc-1", cx: 350 },
      { id: "proc-2", cx: 1800 },
    ]);
    const flow: InformationFlowModel = { from: "PC", to: "proc-2", label: "Schedule", frequency: "Daily" };
    const result = computeInfoFlowPath(flow, anchors);
    const pts = parsePath(result.pathD);
    expect(pts[1].y).toBe(SCHEDULE_LANE_BASE_Y);
  });
});

// ══════════════════════════════════════════════════════════════════
// computeInfoFlowPath – Unknown / fallback routes
// ══════════════════════════════════════════════════════════════════

describe("computeInfoFlowPath – fallback and edge cases", () => {
  const anchors = makeAnchors([]);

  it("returns empty path for unresolvable entities", () => {
    const flow: InformationFlowModel = { from: "bogus", to: "nowhere", label: "", frequency: null };
    const result = computeInfoFlowPath(flow, anchors);
    expect(result.pathD).toBe("");
    expect(result.labelX).toBe(0);
    expect(result.labelY).toBe(0);
  });

  it("handles empty from/to gracefully", () => {
    const flow: InformationFlowModel = { from: "", to: "", label: "", frequency: null };
    const result = computeInfoFlowPath(flow, anchors);
    expect(typeof result.pathD).toBe("string");
  });

  it("routes Supplier → PC through a fallback path", () => {
    const flow: InformationFlowModel = { from: "SUPPLIER", to: "PC", label: "Signal", frequency: null };
    const result = computeInfoFlowPath(flow, anchors);
    expect(result.pathD).toBeTruthy();
    expect(result.pathD).toMatch(/^M[\d.]+,[\d.]+ V[\d.]+ H[\d.]+ V[\d.]+$/);
  });

  it("routes PC → Customer through a fallback path", () => {
    const flow: InformationFlowModel = { from: "PC", to: "CUSTOMER", label: "Signal", frequency: null };
    const result = computeInfoFlowPath(flow, anchors);
    expect(result.pathD).toBeTruthy();
    expect(result.pathD).toMatch(/^M[\d.]+,[\d.]+ V[\d.]+ H[\d.]+ V[\d.]+$/);
  });

  it("routes Supplier → Customer through a fallback path", () => {
    const flow: InformationFlowModel = { from: "SUPPLIER", to: "CUSTOMER", label: "Cross", frequency: null };
    const result = computeInfoFlowPath(flow, anchors);
    expect(result.pathD).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════
// SCHEDULE_LANE_BASE_Y clearance invariant — ALL PC→Process routes must
// have elbow Y above process top
// ══════════════════════════════════════════════════════════════════

describe("SCHEDULE_LANE_BASE_Y clearance invariant", () => {
  const testCases = [350, 500, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000];

  for (const cx of testCases) {
    it(`PC→Process elbow Y is SCHEDULE_LANE_BASE_Y for process at cx=${cx}`, () => {
      const anchors = makeAnchors([{ id: "p", cx }]);
      const flow: InformationFlowModel = { from: "PC", to: "p", label: "Signal", frequency: "Daily" };
      const result = computeInfoFlowPath(flow, anchors);
      const pts = parsePath(result.pathD);
      const midY = pts[1].y;
      expect(pts).toHaveLength(4);
      expect(midY).toBe(SCHEDULE_LANE_BASE_Y);
      expect(midY).toBeLessThan(PROCESS_TOP_Y);
    });
  }

  it("SCHEDULE_LANE_BASE_Y constant is above process top", () => {
    expect(SCHEDULE_LANE_BASE_Y).toBeLessThan(PROCESS_TOP_Y);
  });

  it("SCHEDULE_LANE_BASE_Y is below PC bottom (no overlap with Production Control)", () => {
    expect(SCHEDULE_LANE_BASE_Y).toBeGreaterThan(PC_Y + PC_H);
  });
});
