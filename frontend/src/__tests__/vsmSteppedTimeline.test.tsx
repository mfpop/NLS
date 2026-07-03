import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { VsmSteppedTimeline } from "@/components/vsm/VsmSteppedTimeline";
import type { VsmTimelineEvent } from "@/types/vsm";

// ── Constants matching the component ──
const TOP_Y = 0;
const BTM_Y = 48;
const VA_SEG_W = 80;
const VA_HALF = VA_SEG_W / 2; // 40

function makeEvent(overrides: Partial<VsmTimelineEvent> = {}): VsmTimelineEvent {
  return {
    stepName: "Cutting",
    processTimeMinutes: 2.5,
    waitTimeMinutes: 15,
    isBottleneck: false,
    ...overrides,
  };
}

const START_X = 200;
const CANVAS_W = 1200;
const CENTERS = [300, 600, 900];

interface RenderOptions {
  events?: VsmTimelineEvent[];
  totalLeadTimeMinutes?: number;
  totalValueAddMinutes?: number;
  processCentersX?: number[];
  startX?: number;
  canvasW?: number;
}

function renderTimeline(opts: RenderOptions = {}) {
  const { container } = render(
    <svg>
      <VsmSteppedTimeline
        events={opts.events ?? [makeEvent(), makeEvent({ stepName: "Welding", isBottleneck: true }), makeEvent({ stepName: "Assembly" })]}
        totalLeadTimeMinutes={opts.totalLeadTimeMinutes ?? 60}
        totalValueAddMinutes={opts.totalValueAddMinutes ?? 8}
        processCentersX={opts.processCentersX ?? CENTERS}
        startX={opts.startX ?? START_X}
        canvasW={opts.canvasW ?? CANVAS_W}
      />
    </svg>
  );
  return container;
}

/** Helper: find text element with a specific y coordinate */
function textAtY(container: HTMLElement, y: number) {
  return Array.from(container.querySelectorAll("text")).find(
    (t) => Number(t.getAttribute("y")) === y
  );
}

describe("VsmSteppedTimeline", () => {
  // ── Empty state ──

  it("returns null for empty events array", () => {
    const { container } = render(
      <svg><VsmSteppedTimeline events={[]} totalLeadTimeMinutes={0} totalValueAddMinutes={0} processCentersX={[]} startX={200} canvasW={1200} /></svg>
    );
    expect(container.querySelector("g")).toBeNull();
    expect(container.querySelector("polyline")).toBeNull();
  });

  // ── Polyline ──

  it("renders a polyline element", () => {
    const container = renderTimeline();
    expect(container.querySelector("polyline")).toBeTruthy();
  });

  it("polyline has correct stroke attributes", () => {
    const container = renderTimeline();
    const poly = container.querySelector("polyline")!;
    expect(poly).toHaveAttribute("fill", "none");
    expect(poly).toHaveAttribute("stroke", "#334155");
    expect(poly).toHaveAttribute("stroke-width", "2");
    expect(poly).toHaveAttribute("stroke-linejoin", "miter");
    expect(poly).toHaveAttribute("stroke-linecap", "square");
  });

  it("polyline starts at startX,TOP_Y", () => {
    const container = renderTimeline();
    const poly = container.querySelector("polyline")!;
    const points = poly.getAttribute("points")!;
    expect(points).toMatch(new RegExp(`^${START_X},${TOP_Y}`));
  });

  it("polyline contains correct number of points for N events", () => {
    // 1 start + 4 per event + 1 extension = 4N + 2 points
    const n = 3;
    const container = renderTimeline({ events: [makeEvent(), makeEvent(), makeEvent()] });
    const poly = container.querySelector("polyline")!;
    const pts = poly.getAttribute("points")!.trim().split(/\s+/);
    expect(pts.length).toBe(4 * n + 2);
  });

  it("polyline points follow the correct stepped pattern for 2 events", () => {
    const centers = [300, 600];
    const container = renderTimeline({
      events: [makeEvent(), makeEvent()],
      processCentersX: centers,
      startX: 200,
    });
    const poly = container.querySelector("polyline")!;
    const pts = poly.getAttribute("points")!.trim().split(/\s+/);

    // Expected: start → waitEnd1 → drop → vaEnd1 → rise → waitEnd2 → drop → vaEnd2 → rise → extension
    // Event 0: cx=300, waitEnd=260, vaEnd=340
    // Event 1: cx=600, waitEnd=560, vaEnd=640
    expect(pts[0]).toBe("200,0");         // start
    expect(pts[1]).toBe("260,0");         // wait end horizontal
    expect(pts[2]).toBe("260,48");        // drop
    expect(pts[3]).toBe("340,48");        // VA segment
    expect(pts[4]).toBe("340,0");         // rise
    expect(pts[5]).toBe("560,0");         // wait end horizontal
    expect(pts[6]).toBe("560,48");        // drop
    expect(pts[7]).toBe("640,48");        // VA segment
    expect(pts[8]).toBe("640,0");         // rise
    expect(pts[9]).toBe("680,0");         // extension
  });

  // ── Wait labels ──

  it("renders wait time labels above the upper line (y = TOP_Y - 8)", () => {
    const container = renderTimeline();
    const waitTexts = Array.from(container.querySelectorAll("text"))
      .filter((t) => Number(t.getAttribute("y")) === TOP_Y - 8);
    // Should be one per event with non-zero wait time
    expect(waitTexts.length).toBeGreaterThan(0);
  });

  it("formats wait times via fmtMinutes", () => {
    const events = [makeEvent({ waitTimeMinutes: 30 })];
    const container = renderTimeline({ events, processCentersX: [300] });
    const waitText = textAtY(container, TOP_Y - 8);
    expect(waitText?.textContent).toBe("30m");
  });

  it("formats wait times in hours format", () => {
    const events = [makeEvent({ waitTimeMinutes: 120 })];
    const container = renderTimeline({ events, processCentersX: [300] });
    const waitText = textAtY(container, TOP_Y - 8);
    expect(waitText?.textContent).toBe("2h");
  });

  it("suppresses wait label when waitTime is 0 (0s)", () => {
    const events = [makeEvent({ waitTimeMinutes: 0 })];
    const container = renderTimeline({ events, processCentersX: [300] });
    const waitText = textAtY(container, TOP_Y - 8);
    expect(waitText).toBeFalsy();
  });

  it("suppresses wait label when waitTime is null", () => {
    const events = [makeEvent({ waitTimeMinutes: null as unknown as number })];
    const container = renderTimeline({ events, processCentersX: [300] });
    const waitText = textAtY(container, TOP_Y - 8);
    expect(waitText).toBeFalsy();
  });

  it("positions each wait label at the midpoint of the wait segment", () => {
    const startX = 100;
    const centers = [300];
    const container = renderTimeline({ events: [makeEvent({ waitTimeMinutes: 10 })], processCentersX: centers, startX });
    const waitText = textAtY(container, TOP_Y - 8);
    // Wait segment runs from startX(100) to 300-40=260. Midpoint = (100+260)/2 = 180
    expect(waitText).toHaveAttribute("x", "180");
  });

  // ── VA labels ──

  it("renders VA time labels below the lower line (y = BTM_Y + 14)", () => {
    const container = renderTimeline();
    const vaTexts = Array.from(container.querySelectorAll("text"))
      .filter((t) => Number(t.getAttribute("y")) === BTM_Y + 14);
    expect(vaTexts.length).toBeGreaterThan(0);
  });

  it("formats VA times via fmtMinutes (rounds to nearest minute)", () => {
    const events = [makeEvent({ processTimeMinutes: 2.5 })];
    const container = renderTimeline({ events, processCentersX: [300] });
    const vaText = textAtY(container, BTM_Y + 14);
    expect(vaText?.textContent).toBe("3m");
  });

  it("suppresses VA label when processTime is 0 (0s)", () => {
    const events = [makeEvent({ processTimeMinutes: 0 })];
    const container = renderTimeline({ events, processCentersX: [300] });
    const vaText = textAtY(container, BTM_Y + 14);
    expect(vaText).toBeFalsy();
  });

  it("suppresses VA label when processTime is null", () => {
    const events = [makeEvent({ processTimeMinutes: null as unknown as number })];
    const container = renderTimeline({ events, processCentersX: [300] });
    const vaText = textAtY(container, BTM_Y + 14);
    expect(vaText).toBeFalsy();
  });

  it("positions each VA label at the process center", () => {
    const container = renderTimeline({
      events: [makeEvent({ processTimeMinutes: 5 })],
      processCentersX: [300],
    });
    const vaText = textAtY(container, BTM_Y + 14);
    expect(vaText).toHaveAttribute("x", "300");
  });

  // ── Process names ──

  it("renders process step names at y = BTM_Y + 32", () => {
    const events = [makeEvent({ stepName: "Cutting" }), makeEvent({ stepName: "Welding" })];
    const container = renderTimeline({ events, processCentersX: [300, 600] });
    const nameTexts = Array.from(container.querySelectorAll("text"))
      .filter((t) => Number(t.getAttribute("y")) === BTM_Y + 32);
    expect(nameTexts.length).toBe(2);
    expect(nameTexts[0].textContent).toBe("Cutting");
    expect(nameTexts[1].textContent).toBe("Welding");
  });

  it("truncates step names longer than 18 characters", () => {
    const events = [makeEvent({ stepName: "Very Long Process Step Name" })]; // 28 chars
    const container = renderTimeline({ events, processCentersX: [300] });
    const nameText = textAtY(container, BTM_Y + 32);
    expect(nameText?.textContent).toBe("Very Long Proces\u2026");
  });

  it("does not truncate step names of 18 or fewer characters", () => {
    const events = [makeEvent({ stepName: "Exactly 18 chars!" })]; // 18 chars
    const container = renderTimeline({ events, processCentersX: [300] });
    const nameText = textAtY(container, BTM_Y + 32);
    expect(nameText?.textContent).toBe("Exactly 18 chars!");
  });

  // ── Totals box: structure ──

  it("renders a totals box rectangle", () => {
    const container = renderTimeline();
    const rects = container.querySelectorAll("rect");
    // Totals box rect + inner rect from totals area
    expect(rects.length).toBe(1);
  });

  it("positions totals box after the last VA segment", () => {
    const container = renderTimeline({
      events: [makeEvent(), makeEvent(), makeEvent()],
      processCentersX: CENTERS,
      startX: START_X,
      canvasW: CANVAS_W,
    });
    const rect = container.querySelector("rect")!;
    const lastVaEndX = CENTERS[2] + VA_HALF; // 900 + 40 = 940
    const totBoxW = 180;
    const expectedX = Math.min(lastVaEndX + 60, CANVAS_W - totBoxW - 12); // min(1000, 1008) = 1000
    expect(Number(rect.getAttribute("x"))).toBe(expectedX);
  });

  it("clamps totals box x to not overflow canvas", () => {
    const container = renderTimeline({
      events: [makeEvent()],
      processCentersX: [1000],
      startX: 50,
      canvasW: 1200,
    });
    const rect = container.querySelector("rect")!;
    const x = Number(rect.getAttribute("x"));
    const w = Number(rect.getAttribute("width"));
    // x + w should be <= canvasW - 12
    expect(x + w).toBeLessThanOrEqual(1188);
  });

  it("totals box has correct width and height", () => {
    const container = renderTimeline();
    const rect = container.querySelector("rect")!;
    expect(rect).toHaveAttribute("width", "180");
    expect(Number(rect.getAttribute("height"))).toBe(BTM_Y + 26); // 74
  });

  it("totals box starts at y = TOP_Y - 6", () => {
    const container = renderTimeline();
    const rect = container.querySelector("rect")!;
    expect(Number(rect.getAttribute("y"))).toBe(TOP_Y - 6); // -6
  });

  // ── Totals box: content ──

  it("renders Lead Time text with formatted value", () => {
    const container = renderTimeline({ totalLeadTimeMinutes: 90 });
    expect(container.innerHTML).toContain("Lead Time:");
    expect(container.innerHTML).toContain("1h 30m");
  });

  it("renders VA Time text with formatted value", () => {
    const container = renderTimeline({ totalValueAddMinutes: 5 });
    expect(container.innerHTML).toContain("VA Time:");
    expect(container.innerHTML).toContain("5m");
  });

  it("renders separator line in totals box", () => {
    const container = renderTimeline();
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    // Separator is at y=TOP_Y+38
    const sepLine = Array.from(lines).find(
      (l) => Number(l.getAttribute("y1")) === TOP_Y + 38
    );
    expect(sepLine).toBeTruthy();
  });

  it("renders VA% label with correct format", () => {
    const container = renderTimeline({ totalLeadTimeMinutes: 100, totalValueAddMinutes: 13 });
    expect(container.innerHTML).toContain("VA = 13%");
  });

  it("renders VA% as 0% when lead time is 0", () => {
    const container = renderTimeline({ totalLeadTimeMinutes: 0, totalValueAddMinutes: 0 });
    expect(container.innerHTML).toContain("VA = 0%");
  });

  // ── VA% Color logic ──

  it("applies fill-emerald-600 for VA% >= 20", () => {
    const container = renderTimeline({ totalLeadTimeMinutes: 100, totalValueAddMinutes: 30 }); // 30%
    const svg = container.innerHTML;
    expect(svg).toContain("fill-emerald-600");
    expect(svg).not.toContain("fill-red-500");
    expect(svg).not.toContain("fill-amber-500");
  });

  it("applies fill-amber-500 for VA% between 5 and 19", () => {
    const container = renderTimeline({ totalLeadTimeMinutes: 100, totalValueAddMinutes: 10 }); // 10%
    const svg = container.innerHTML;
    expect(svg).toContain("fill-amber-500");
    expect(svg).not.toContain("fill-red-500");
    expect(svg).not.toContain("fill-emerald-600");
  });

  it("applies fill-amber-500 for VA% = 5 exactly (boundary)", () => {
    const container = renderTimeline({ totalLeadTimeMinutes: 100, totalValueAddMinutes: 5 }); // 5%
    const svg = container.innerHTML;
    expect(svg).toContain("fill-amber-500");
  });

  it("applies fill-red-500 for VA% < 5", () => {
    const container = renderTimeline({ totalLeadTimeMinutes: 100, totalValueAddMinutes: 4 }); // 4%
    const svg = container.innerHTML;
    expect(svg).toContain("fill-red-500");
    expect(svg).not.toContain("fill-amber-500");
    expect(svg).not.toContain("fill-emerald-600");
  });

  it("applies fill-red-500 for VA% = 0 (no value-add)", () => {
    const container = renderTimeline({ totalLeadTimeMinutes: 60, totalValueAddMinutes: 0 }); // 0%
    const svg = container.innerHTML;
    expect(svg).toContain("fill-red-500");
  });

  it("rounds VA% to nearest integer", () => {
    // 2.6 / 20 = 0.13 → 13 → amber
    const container = renderTimeline({ totalLeadTimeMinutes: 20, totalValueAddMinutes: 2.6 });
    expect(container.innerHTML).toContain("VA = 13%");
    expect(container.innerHTML).toContain("fill-amber-500");
  });

  // ── Multiple events ──

  it("renders correct number of wait and VA labels for multiple events", () => {
    const events = [
      makeEvent({ waitTimeMinutes: 10, processTimeMinutes: 2 }),
      makeEvent({ waitTimeMinutes: 15, processTimeMinutes: 3 }),
      makeEvent({ waitTimeMinutes: 5, processTimeMinutes: 1 }),
    ];
    const container = renderTimeline({ events, processCentersX: CENTERS });
    const waitTexts = Array.from(container.querySelectorAll("text"))
      .filter((t) => Number(t.getAttribute("y")) === TOP_Y - 8);
    const vaTexts = Array.from(container.querySelectorAll("text"))
      .filter((t) => Number(t.getAttribute("y")) === BTM_Y + 14);
    expect(waitTexts.length).toBe(3);
    expect(vaTexts.length).toBe(3);
  });

  it("renders all 3 events: 3 wait labels + 3 VA labels + 3 process names + 3 totals texts = 12 texts", () => {
    const events = [
      makeEvent({ waitTimeMinutes: 10, processTimeMinutes: 2 }),
      makeEvent({ waitTimeMinutes: 15, processTimeMinutes: 3 }),
      makeEvent({ waitTimeMinutes: 5, processTimeMinutes: 1 }),
    ];
    const container = renderTimeline({ events, processCentersX: CENTERS });
    // Wait labels (y=-8) + VA labels (y=62) + process names (y=80) + totals texts (y=14,32,52) = 3+3+3+3 = 12
    const texts = container.querySelectorAll("text");
    expect(texts.length).toBe(12);
  });

  // ── Single event ──

  it("handles a single event correctly", () => {
    const container = renderTimeline({ events: [makeEvent()], processCentersX: [300] });
    const poly = container.querySelector("polyline")!;
    const pts = poly.getAttribute("points")!.trim().split(/\s+/);
    // 1 start + 4 per event + 1 extension = 6 points
    expect(pts.length).toBe(6);
  });

  // ── Regression ──

  it("does not contain 'undefined', 'NaN', or 'null' strings", () => {
    const container = renderTimeline();
    const svg = container.innerHTML;
    expect(svg).not.toContain("undefined");
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("null");
  });
});
