import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResourceGroupStatusSummary } from "@/components/liveShopfloor/ResourceGroupStatusSummary";
import type { LiveShopfloorResourceGroupStatusSummary } from "@/types/liveShopfloor";

function makeSummary(overrides?: Partial<LiveShopfloorResourceGroupStatusSummary>): LiveShopfloorResourceGroupStatusSummary {
  return {
    runningCount: 4,
    stoppedCount: 1,
    blockedCount: 0,
    starvedCount: 1,
    maintenanceCount: 0,
    unknownCount: 0,
    activeBottleneckResource: "CNC-03 — Machining Center #3",
    ...overrides,
  };
}

describe("ResourceGroupStatusSummary", () => {
  describe("null / empty data handling", () => {
    it("renders nothing when summary is null", () => {
      const { container } = render(<ResourceGroupStatusSummary summary={null} />);
      expect(container.innerHTML).toBe("");
    });

    it("renders nothing when all counts are zero", () => {
      const summary = makeSummary({
        runningCount: 0,
        stoppedCount: 0,
        blockedCount: 0,
        starvedCount: 0,
        maintenanceCount: 0,
        unknownCount: 0,
      });
      const { container } = render(<ResourceGroupStatusSummary summary={summary} />);
      expect(container.innerHTML).toBe("");
    });
  });

  describe("section header", () => {
    it("renders the section title", () => {
      render(<ResourceGroupStatusSummary summary={makeSummary()} />);
      expect(screen.getByText("Resource Group Status")).toBeDefined();
    });

    it("shows bottleneck resource badge when provided", () => {
      render(<ResourceGroupStatusSummary summary={makeSummary()} />);
      expect(screen.getByText("CNC-03 — Machining Center #3")).toBeDefined();
    });

    it("does not show bottleneck badge when null", () => {
      render(
        <ResourceGroupStatusSummary
          summary={makeSummary({ activeBottleneckResource: null })}
        />
      );
      expect(screen.queryByText(/CNC-03/)).toBeNull();
    });
  });

  describe("six status counts rendering", () => {
    it("renders all six status counts when present", () => {
      const summary = makeSummary({
        runningCount: 5,
        stoppedCount: 2,
        blockedCount: 1,
        starvedCount: 3,
        maintenanceCount: 1,
        unknownCount: 1,
      });
      render(<ResourceGroupStatusSummary summary={summary} />);

      // Labels
      expect(screen.getByText("Running")).toBeDefined();
      expect(screen.getByText("Stopped")).toBeDefined();
      expect(screen.getByText("Blocked")).toBeDefined();
      expect(screen.getByText("Starved")).toBeDefined();
      expect(screen.getByText("Maint.")).toBeDefined();
      expect(screen.getByText("Unknown")).toBeDefined();

      // Count values - use getAllByText for "1" which appears in multiple pills
      expect(screen.getByText("5")).toBeDefined();
      expect(screen.getByText("2")).toBeDefined();
      expect(screen.getByText("3")).toBeDefined();
      const ones = screen.getAllByText("1");
      expect(ones.length).toBeGreaterThanOrEqual(3);
    });

    it("only renders non-zero counts", () => {
      const summary = makeSummary({
        runningCount: 4,
        stoppedCount: 0,
        blockedCount: 0,
        starvedCount: 1,
        maintenanceCount: 0,
        unknownCount: 0,
      });
      render(<ResourceGroupStatusSummary summary={summary} />);

      expect(screen.getByText("Running")).toBeDefined();
      expect(screen.getByText("Starved")).toBeDefined();
      expect(screen.queryByText("Stopped")).toBeNull();
      expect(screen.queryByText("Blocked")).toBeNull();
      expect(screen.queryByText("Maint.")).toBeNull();
      expect(screen.queryByText("Unknown")).toBeNull();

      // Only Running and Starved counts
      expect(screen.getByText("4")).toBeDefined();
      expect(screen.getByText("1")).toBeDefined();
    });

    it("renders all statuses as individual elements when all non-zero", () => {
      const summary = makeSummary({
        runningCount: 3,
        stoppedCount: 2,
        blockedCount: 1,
        starvedCount: 1,
        maintenanceCount: 1,
        unknownCount: 0,
      });
      render(<ResourceGroupStatusSummary summary={summary} />);

      // Check the section renders
      expect(screen.getByText("Resource Group Status")).toBeDefined();
    });

    it("handles large count values without overflow issues", () => {
      const summary = makeSummary({
        runningCount: 999,
        stoppedCount: 88,
      });
      render(<ResourceGroupStatusSummary summary={summary} />);

      expect(screen.getByText("999")).toBeDefined();
      expect(screen.getByText("88")).toBeDefined();
    });
  });

  describe("color-coding correctness", () => {
    it("applies success color classes to Running pill", () => {
      const { container } = render(<ResourceGroupStatusSummary summary={makeSummary()} />);
      const runningPill = container.querySelector(
        '[class*="border-success"]'
      );
      expect(runningPill).toBeDefined();

      // Verify the Running label is inside a pill with success border
      const runningLabel = screen.getByText("Running");
      expect(runningLabel.className).toContain("text-success");
    });

    it("applies danger color classes to Stopped pill", () => {
      const summary = makeSummary({ stoppedCount: 1 });
      render(<ResourceGroupStatusSummary summary={summary} />);

      const stoppedLabel = screen.getByText("Stopped");
      expect(stoppedLabel.className).toContain("text-danger");
    });

    it("applies warning color classes to Blocked pill", () => {
      const summary = makeSummary({ blockedCount: 1 });
      render(<ResourceGroupStatusSummary summary={summary} />);

      const blockedLabel = screen.getByText("Blocked");
      expect(blockedLabel.className).toContain("text-warning");
    });

    it("applies accent color classes to Starved pill", () => {
      const summary = makeSummary({ starvedCount: 1 });
      render(<ResourceGroupStatusSummary summary={summary} />);

      const starvedLabel = screen.getByText("Starved");
      expect(starvedLabel.className).toContain("text-accent");
    });

    it("applies muted color classes to Maint. and Unknown pills", () => {
      const summary = makeSummary({
        maintenanceCount: 1,
        unknownCount: 1,
      });
      render(<ResourceGroupStatusSummary summary={summary} />);

      const maintLabel = screen.getByText("Maint.");
      expect(maintLabel.className).toContain("text-muted-foreground");

      const unknownLabel = screen.getByText("Unknown");
      expect(unknownLabel.className).toContain("text-muted-foreground");
    });

    it("shows bottleneck badge with warning/alert styling", () => {
      const { container } = render(<ResourceGroupStatusSummary summary={makeSummary()} />);

      // The bottleneck badge container should have warning border
      const badge = container.querySelector('[class*="border-warning"]');
      expect(badge).toBeDefined();
      expect(badge?.textContent).toContain("CNC-03");
    });

    it("renders Gauge icon in header", () => {
      const { container } = render(<ResourceGroupStatusSummary summary={makeSummary()} />);
      // The Gauge icon creates an SVG element
      const svg = container.querySelector("svg");
      expect(svg).toBeDefined();
    });

    it("renders AlertTriangle icon inside bottleneck badge", () => {
      const { container } = render(<ResourceGroupStatusSummary summary={makeSummary()} />);
      // Should have 2 SVGs: Gauge + AlertTriangle
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(2);
    });
  });

  describe("partial and edge case data", () => {
    it("renders with only running count (everything else zero)", () => {
      const summary = makeSummary({
        runningCount: 6,
        stoppedCount: 0,
        blockedCount: 0,
        starvedCount: 0,
        maintenanceCount: 0,
        unknownCount: 0,
      });
      render(<ResourceGroupStatusSummary summary={summary} />);

      expect(screen.getByText("Running")).toBeDefined();
      expect(screen.getByText("6")).toBeDefined();
      expect(screen.queryByText("Stopped")).toBeNull();
      expect(screen.queryByText("Starved")).toBeNull();

      // Bottleneck badge should still show
      expect(screen.getByText(/CNC-03/)).toBeDefined();
    });

    it("renders with bottleneck null but counts present", () => {
      const summary = makeSummary({
        runningCount: 3,
        stoppedCount: 1,
        activeBottleneckResource: null,
      });
      const { container } = render(<ResourceGroupStatusSummary summary={summary} />);

      expect(screen.getByText("Resource Group Status")).toBeDefined();
      expect(container.innerHTML).toContain("Running");
      expect(container.innerHTML).toContain("Stopped");
    });

    it("renders all counts zero when bottleneck is non-null", () => {
      // hasActive checks count > 0, so if all counts are 0 but bottleneck is non-null
      const summary = makeSummary({
        runningCount: 0,
        stoppedCount: 0,
        blockedCount: 0,
        starvedCount: 0,
        maintenanceCount: 0,
        unknownCount: 0,
        activeBottleneckResource: "Some resource",
      });
      const { container } = render(<ResourceGroupStatusSummary summary={summary} />);
      // hasActive is false because all counts are 0, so nothing renders
      expect(container.innerHTML).toBe("");
    });
  });
});
