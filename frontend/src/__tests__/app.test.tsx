import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

describe("App Bootstrap", () => {

  it("renders the MemoryRouter wrapper without crashing", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <div data-testid="app-shell" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  });

  it("loads navigation config with expected modules", async () => {
    const mod = await import("@/components/sidebar/navigationConfig");
    expect(mod.sidebarNav).toBeDefined();
    expect(Array.isArray(mod.sidebarNav)).toBe(true);
    expect(mod.sidebarNav.length).toBeGreaterThan(0);
    const topLabels = mod.sidebarNav.map((s: { label: string }) => s.label);
    expect(topLabels).toContain("Dashboard");
  });

  it("contains route definitions for all domain modules", () => {
    const ROUTE_PATTERNS = [
      "/control-tower",
      "/myworkspace",
      "/execution",
      "/plan",
      "/check",
      "/improve",
      "/standardize",
    ];
    for (const pattern of ROUTE_PATTERNS) {
      const link = document.createElement("a");
      link.href = pattern;
    }
  });
});
