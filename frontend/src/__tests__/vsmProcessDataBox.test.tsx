import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { VsmProcessDataBox } from "@/components/vsm/VsmProcessDataBox";
import type { VsmProcessNode } from "@/types/vsm";
import { DATA_ROW_H } from "@/components/vsm/vsmFormatters";

function makeNode(overrides: Partial<VsmProcessNode> = {}): VsmProcessNode {
  return {
    id: "PN-001",
    sequence: 1,
    label: "Cutting",
    resourceGroupName: "Sub-Assembly",
    cycleTimeSeconds: 45,
    changeoverSeconds: 600,
    uptimePercent: 95,
    operatorCount: 2,
    wipBefore: 0,
    wipAfter: 80,
    defectRate: 0.5,
    isBottleneck: false,
    isPacemaker: false,
    isActive: true,
    ...overrides,
  };
}

const BASE_X = 200;
const BASE_Y = 400;
const BOX_WIDTH = 155;

function renderBox(node: VsmProcessNode) {
  const { container } = render(
    <svg>
      <VsmProcessDataBox node={node} x={BASE_X} y={BASE_Y} width={BOX_WIDTH} />
    </svg>
  );
  return container;
}

describe("VsmProcessDataBox", () => {
  it("renders an SVG group element", () => {
    const container = renderBox(makeNode());
    const g = container.querySelector("g");
    expect(g).toBeInTheDocument();
  });

  it("renders the outer rectangle", () => {
    const container = renderBox(makeNode());
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBe(1);
    const r = rects[0];
    expect(r).toHaveAttribute("x", String(BASE_X));
    expect(r).toHaveAttribute("y", String(BASE_Y));
    expect(r).toHaveAttribute("width", String(BOX_WIDTH));
  });

  it("renders 6 data rows with labels", () => {
    const container = renderBox(makeNode());
    const texts = container.querySelectorAll("text");
    const labels = Array.from(texts)
      .filter((t) => t.getAttribute("fill") === "#475569")
      .map((t) => t.textContent);

    expect(labels).toContain("C/T");
    expect(labels).toContain("C/O");
    expect(labels).toContain("Uptime");
    expect(labels).toContain("Operators");
    expect(labels).toContain("WIP");
    expect(labels).toContain("Yield");
  });

  it("formats cycle time via fmtSeconds", () => {
    const node = makeNode({ cycleTimeSeconds: 45 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("45s");
  });

  it("formats changeover time via fmtCO", () => {
    const node = makeNode({ changeoverSeconds: 600 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("10min");
  });

  it("displays uptime with percent sign", () => {
    const node = makeNode({ uptimePercent: 95 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("95%");
  });

  it("displays operator count", () => {
    const node = makeNode({ operatorCount: 2 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("2");
  });

  it("displays WIP value", () => {
    const node = makeNode({ wipAfter: 80 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("80");
  });

  it("applies amber-500 WIP class for wipAfter > 40", () => {
    const node = makeNode({ wipAfter: 60 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("fill-amber-500");
  });

  it("applies emerald-600 WIP class for wipAfter <= 40", () => {
    const node = makeNode({ wipAfter: 30 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("fill-emerald-600");
  });

  it("shows yield percentage when defectRate is provided", () => {
    const node = makeNode({ defectRate: 0.5 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("99.5%");
  });

  it("shows em-dash for yield when defectRate is null", () => {
    const node = makeNode({ defectRate: null });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("\u2014");
  });

  it("shows em-dash for yield when defectRate is 0", () => {
    const node = makeNode({ defectRate: 0 });
    const container = renderBox(node);
    const svg = container.innerHTML;
    expect(svg).toContain("100.0%");
  });

  it("computes total height from DATA_ROW_H * 6 + 12", () => {
    const container = renderBox(makeNode());
    const rect = container.querySelector("rect");
    const expectedH = DATA_ROW_H * 6 + 12;
    expect(rect).toHaveAttribute("height", String(expectedH));
  });

  it("renders 1 header line + 5 row dividers = 6 lines", () => {
    const container = renderBox(makeNode());
    const lines = container.querySelectorAll("line");
    // 1 header line + 5 row dividers (between 6 rows)
    expect(lines.length).toBe(6);
  });

  it("renders all 12 text elements (6 labels + 6 values)", () => {
    const container = renderBox(makeNode());
    const texts = container.querySelectorAll("text");
    expect(texts.length).toBe(12);
  });

  it("handles zero values properly", () => {
    const node = makeNode({
      cycleTimeSeconds: 0,
      changeoverSeconds: 0,
      uptimePercent: 0,
      operatorCount: 0,
      wipAfter: 0,
      defectRate: 0,
    });
    const container = renderBox(node);
    const svg = container.innerHTML;
    // fmtSeconds(0) → "0s", fmtCO(0) → "0"
    expect(svg).not.toContain("Invalid");
    expect(svg).not.toContain("undefined");
    expect(svg).not.toContain("NaN");
  });

  it("handles all null/missing values with em-dash", () => {
    const node = makeNode({
      cycleTimeSeconds: null as unknown as number,
      changeoverSeconds: null as unknown as number,
      uptimePercent: null as unknown as number,
      operatorCount: null as unknown as number,
      wipAfter: null as unknown as number,
      defectRate: null,
    });
    const container = renderBox(node);
    const svg = container.innerHTML;
    // Should not render "null", "undefined", or "NaN"
    expect(svg).not.toContain("null");
    expect(svg).not.toContain("undefined");
    expect(svg).not.toContain("NaN");
  });
});
