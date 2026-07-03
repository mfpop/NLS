import { describe, it, expect } from "vitest";
import type { StandardVsmTemplateModel } from "@/features/execution/vsm/template/vsmTemplateTypes";

// ── Helper: create a minimal mock model with process WIP and inventory quantities ──
function createMockModel(overrides?: {
  processWips?: number[];
  inventoryQtys?: number[];
  inventoryTypes?: string[];
}): StandardVsmTemplateModel {
  const processWips = overrides?.processWips ?? [];
  const inventoryQtys = overrides?.inventoryQtys ?? [];
  const inventoryTypes = overrides?.inventoryTypes;

  return {
    supplier: { label: "Supplier", typeLabel: "Supplier" },
    customer: { label: "Customer", typeLabel: "Customer" },
    productionControl: null,
    processes: processWips.map((wip, i) => ({
      id: `proc-${i}`,
      sequence: i + 1,
      name: `Process ${i + 1}`,
      departmentLabel: "",
      operatorCount: 1,
      isActive: true,
      isSelected: false,
      isBottleneck: false,
      isPacemaker: false,
      isAboveTakt: null,
      wip,
      severity: "normal",
      dataRows: [],
      opportunities: [],
    })),
    inventories: inventoryQtys.map((qty, i) => ({
      id: `inv-${i}`,
      quantity: qty,
      waitTimeLabel: "1.0d",
      label: "Inventory",
      type: inventoryTypes
        ? inventoryTypes[i] ?? "WIP"
        : i === 0
          ? "RM"
          : i === inventoryQtys.length - 1
            ? "FG"
            : "WIP",
      severity: "normal",
    })),
    materialFlows: [],
    informationFlows: [],
    timelineSegments: [],
    totals: {
      leadTimeLabel: "—",
      valueAddedTimeLabel: "—",
      valueAddedPercentLabel: "VA = 0%",
      valueAddedPercent: 0,
    },
    taktTimeSeconds: null,
    taktTimeDisplay: "—",
    taktTimeStatus: "not_calculated",
    taktTimeMissingReason: "Not calculated",
    availableWorkingTime: null,
    chartState: "CURRENT_STATE",
    businessImpact: null,
    improvementOpportunities: [],
    demandDisplay: null,
  };
}

// ── The calculation under test (mirrors VsmPage.tsx kpiData logic) ──
// Per spec: WIP KPI = process-level WIP + WIP-type inventory triangles only.
// Purchased Material (RM) and Finished Goods (FG) are NOT included in WIP.
function computeTotalWip(model: StandardVsmTemplateModel): number {
  const processWip = model.processes.reduce((sum, p) => sum + (p.wip || 0), 0);
  const wipInventory = model.inventories
    .filter((inv) => inv.type === "WIP")
    .reduce((sum, inv) => sum + (inv.quantity || 0), 0);
  return processWip + wipInventory;
}

// ══════════════════════════════════════════════════════════════════
// computeTotalWip
// ══════════════════════════════════════════════════════════════════

describe("computeTotalWip", () => {
  it("returns 0 for model with no processes and no inventories", () => {
    const model = createMockModel();
    expect(computeTotalWip(model)).toBe(0);
  });

  it("returns sum of process WIP when no inventories exist", () => {
    const model = createMockModel({ processWips: [10, 20, 30] });
    expect(computeTotalWip(model)).toBe(60);
  });

  it("returns 0 for non-WIP inventories when no process WIP exists", () => {
    // RM inventory should NOT be counted as WIP
    const model = createMockModel({ inventoryQtys: [500], inventoryTypes: ["RM"] });
    expect(computeTotalWip(model)).toBe(0);
  });

  it("does not count Purchased Material (RM) inventory in WIP", () => {
    const model = createMockModel({
      processWips: [30],
      inventoryQtys: [500, 80],
      inventoryTypes: ["RM", "WIP"],
    });
    // processWip = 30, WIP inventory = 80, RM (500) excluded → total = 110
    expect(computeTotalWip(model)).toBe(110);
  });

  it("does not count Finished Goods (FG) inventory in WIP", () => {
    const model = createMockModel({
      processWips: [20],
      inventoryQtys: [120, 300],
      inventoryTypes: ["WIP", "FG"],
    });
    // processWip = 20, WIP inventory = 120, FG (300) excluded → total = 140
    expect(computeTotalWip(model)).toBe(140);
  });

  it("counts only WIP-type inventory triangles, excluding RM and FG", () => {
    // Typical VSM: RM buffer → Process A → WIP buffer → Process B → FG buffer
    const model = createMockModel({
      processWips: [20, 35],
      inventoryQtys: [500, 120, 200],
    });
    // First inventory (index 0) = RM = 500 → excluded
    // Middle inventory (index 1) = WIP = 120 → included
    // Last inventory (index 2) = FG = 200 → excluded
    // processWip = 20 + 35 = 55
    // WIP inventory = 120
    // total = 175
    expect(computeTotalWip(model)).toBe(175);
  });

  it("excludes RM (first) and FG (last), computing internal WIP from middle inventories only", () => {
    // 6 inventory triangles: 80 (RM) + 120 (WIP) + 40 (WIP) + 30 (WIP) + 50 (WIP) + 75 (FG)
    // Internal WIP only = 120 + 40 + 30 + 50 = 240 (4 middle inventories)
    const model = createMockModel({
      processWips: [0],
      inventoryQtys: [80, 120, 40, 30, 50, 75],
    });
    // First = RM (80 excluded), Last = FG (75 excluded)
    // Middle 4 = WIP: 120 + 40 + 30 + 50 = 240
    expect(computeTotalWip(model)).toBe(240);
  });

  it("handles multiple WIP inventory triangles correctly", () => {
    // All WIP type inventories
    const model = createMockModel({
      processWips: [10, 20, 30],
      inventoryQtys: [50, 60, 70],
      inventoryTypes: ["WIP", "WIP", "WIP"],
    });
    // processWip = 10 + 20 + 30 = 60
    // all 3 inventories are WIP: 50 + 60 + 70 = 180
    // total = 240
    expect(computeTotalWip(model)).toBe(240);
  });

  it("handles no WIP-type inventories when others exist", () => {
    const model = createMockModel({
      inventoryQtys: [300, 200],
      inventoryTypes: ["RM", "FG"],
    });
    // No process WIP, no WIP inventory → 0
    expect(computeTotalWip(model)).toBe(0);
  });

  it("handles zero process WIP gracefully", () => {
    const model = createMockModel({
      processWips: [0, 0, 0],
      inventoryQtys: [100, 200],
      inventoryTypes: ["RM", "WIP"],
    });
    // processWip = 0, WIP inventory = 200 → total = 200
    expect(computeTotalWip(model)).toBe(200);
  });

  it("handles zero inventory quantities gracefully", () => {
    const model = createMockModel({
      processWips: [10, 20],
      inventoryQtys: [0, 0, 0],
      inventoryTypes: ["RM", "WIP", "FG"],
    });
    // processWip = 30, WIP inventory = 0 → total = 30
    expect(computeTotalWip(model)).toBe(30);
  });

  it("handles empty arrays", () => {
    const model = createMockModel({
      processWips: [],
      inventoryQtys: [],
    });
    expect(computeTotalWip(model)).toBe(0);
  });

  it("handles a single WIP inventory with no processes", () => {
    const model = createMockModel({
      inventoryQtys: [395],
      inventoryTypes: ["WIP"],
    });
    expect(computeTotalWip(model)).toBe(395);
  });

  it("gracefully handles NaN wip values (treated as 0)", () => {
    const model = createMockModel({ processWips: [NaN, 10], inventoryQtys: [20], inventoryTypes: ["WIP"] });
    // NaN || 0 → 0, so processWip = 0 + 10 = 10, WIP inventory = 20, total = 30
    expect(computeTotalWip(model)).toBe(30);
  });
});
