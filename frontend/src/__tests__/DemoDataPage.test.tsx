import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DemoDataPage } from "@/demo/DemoDataPage";

// Mock theme tokens (they're just CSS classes, fine as empty strings in tests)
vi.mock("@/styles/themeTokens", () => ({
  theme: {
    iconBoxAmber: "bg-warning/15 text-warning",
    iconBoxTeal: "bg-info/15 text-info",
  },
}));

function renderPage() {
  return render(<DemoDataPage />);
}

describe("DemoDataPage - Shared Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const switchToLiveShopfloor = () => {
    fireEvent.click(screen.getAllByText("Live Shopfloor")[0]);
  };

  it("renders DEMO MODE banner", () => {
    renderPage();
    expect(screen.getByText("DEMO MODE")).toBeDefined();
  });

  it("renders view toggle buttons", () => {
    renderPage();
    expect(screen.getByText("Line Performance")).toBeDefined();
    expect(screen.getByText("Live Shopfloor")).toBeDefined();
  });

  it("shows Line Performance view by default", () => {
    renderPage();
    expect(screen.getByText("Line Performance")).toBeDefined();
    // The AppPageLayout title should be visible
    expect(screen.getByText(/C2-Cylinder Assembly/)).toBeDefined();
  });

  it("renders footer with line name and demo status", () => {
    renderPage();
    expect(screen.getByText(/C2-Cylinder Assembly/)).toBeDefined();
    expect(screen.getByText("Live Demo")).toBeDefined();
    expect(screen.getByText(/No backend — mock data/)).toBeDefined();
  });

  it("toggles to Live Shopfloor view when button clicked", async () => {
    renderPage();
    // Find the Live Shopfloor toggle button in the banner
    const liveShopfloorBtn = screen.getAllByText("Live Shopfloor");
    // Click the banner toggle button (not the toolbar button)
    fireEvent.click(liveShopfloorBtn[0]);
    await waitFor(() => {
      // Live Shopfloor has a different subtitle pattern
      expect(screen.getByText(/Real-time line status/)).toBeDefined();
    });
  });

  it("shows toolbar buttons for primary actions", () => {
    renderPage();
    // The toolbar has Refresh, Log Downtime, New Issue, New Action buttons
    const refreshBtn = screen.getByText("Refresh");
    expect(refreshBtn).toBeDefined();
    expect(screen.getByText("Log Downtime")).toBeDefined();
    expect(screen.getByText("New Issue")).toBeDefined();
    expect(screen.getByText("New Action")).toBeDefined();
  });
});

describe("DemoDataPage - Line Performance View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Performance Snapshots section in left panel", () => {
    renderPage();
    expect(screen.getByText("Performance Snapshots")).toBeDefined();
  });

  it("renders KPI strip with metric labels", () => {
    renderPage();
    expect(screen.getByText("Plan")).toBeDefined();
    expect(screen.getByText("Actual")).toBeDefined();
    expect(screen.getByText("OEE")).toBeDefined();
    expect(screen.getByText("Downtime")).toBeDefined();
    expect(screen.getByText("Quality")).toBeDefined();
  });

  it("renders KPI values from mock data", () => {
    renderPage();
    // Plan quantity = 500
    expect(screen.getByText("500")).toBeDefined();
    // Actual quantity = 420
    expect(screen.getByText("420")).toBeDefined();
  });

  it("renders Plan vs Actual section", () => {
    renderPage();
    expect(screen.getByText("Plan vs Actual")).toBeDefined();
  });

  it("renders OEE Signal section", () => {
    renderPage();
    expect(screen.getByText("OEE Signal")).toBeDefined();
    // OEE value = 72.0%
    expect(screen.getByText("72.0%")).toBeDefined();
  });

  it("renders Downtime section", () => {
    renderPage();
    expect(screen.getByText("Downtime")).toBeDefined();
  });

  it("renders Quality section", () => {
    renderPage();
    expect(screen.getByText("Quality")).toBeDefined();
  });

  it("renders Bottleneck section", () => {
    renderPage();
    expect(screen.getByText("Bottleneck")).toBeDefined();
  });

  it("renders Issues & Actions section", () => {
    renderPage();
    expect(screen.getByText("Issues & Actions")).toBeDefined();
  });

  it("renders Timeline section", () => {
    renderPage();
    expect(screen.getByText("Timeline")).toBeDefined();
  });

  it("renders record list with shift names", () => {
    renderPage();
    expect(screen.getByText("Morning Shift")).toBeDefined();
    expect(screen.getByText("Afternoon Shift")).toBeDefined();
  });

  it("renders log downtime modal when Log Downtime button clicked", async () => {
    renderPage();
    fireEvent.click(screen.getByText("Log Downtime"));
    expect(await screen.findByRole("dialog", { name: /log downtime/i })).toBeDefined();
  });

  it("renders new issue modal when New Issue button clicked", async () => {
    renderPage();
    fireEvent.click(screen.getByText("New Issue"));
    expect(await screen.findByRole("dialog", { name: /new issue/i })).toBeDefined();
  });

  it("renders new action modal when New Action button clicked", async () => {
    renderPage();
    fireEvent.click(screen.getByText("New Action"));
    expect(await screen.findByRole("dialog", { name: /new action/i })).toBeDefined();
  });

  it("closes modal when cancel is clicked", async () => {
    renderPage();
    fireEvent.click(screen.getByText("New Issue"));
    expect(await screen.findByRole("dialog", { name: /new issue/i })).toBeDefined();
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /new issue/i })).toBeNull();
    });
  });
});

describe("DemoDataPage - Live Shopfloor View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Line Context section after switching", async () => {
    renderPage();
    switchToLiveShopfloor();
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText(/C2-Cylinder Assembly/)).toBeDefined();
    });
  });

  it("renders Shift section with shift info", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText("Shift")).toBeDefined();
    });
  });

  it("renders Active Production section", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText("Active Production")).toBeDefined();
      // Current product from mock data
      expect(screen.getByText(/Cylinder Assembly Type-B/)).toBeDefined();
    });
  });

  it("renders Active Events list", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText("Active Events")).toBeDefined();
    });
  });

  it("renders live status strip with line status", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText("Line Status")).toBeDefined();
      expect(screen.getByText("Running")).toBeDefined();
    });
  });

  it("renders status indicators", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText("Current Output")).toBeDefined();
      expect(screen.getByText("420")).toBeDefined();
      expect(screen.getByText("Issues")).toBeDefined();
      expect(screen.getByText("2")).toBeDefined();
      expect(screen.getByText("Actions")).toBeDefined();
      expect(screen.getByText("3")).toBeDefined();
    });
  });

  it("renders Assigned Resource Groups section", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText("Assigned Resource Groups")).toBeDefined();
    });
  });

  it("renders resource group flow cards", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      // Resource groups from mock data
      expect(screen.getByText("Sub-Assembly")).toBeDefined();
      expect(screen.getByText("Precision Machining")).toBeDefined();
      expect(screen.getByText("Final Assembly")).toBeDefined();
      expect(screen.getByText("Final Test & Pack")).toBeDefined();
    });
  });

  it("renders bottleneck in status strip", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText(/CNC-03/)).toBeDefined();
    });
  });

  it("renders Issues & Actions section in right panel", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText("Issues & Actions")).toBeDefined();
    });
  });

  it("renders Recent Events section", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      expect(screen.getByText("Recent Events")).toBeDefined();
    });
  });

  it("renders log downtime modal when clicked in live view", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      fireEvent.click(screen.getAllByText("Log Downtime")[0]);
    });
    expect(screen.getByRole("dialog", { name: /log downtime/i })).toBeDefined();
  });

  it("renders new issue modal with LIVE_SHOPFLOOR source type", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      fireEvent.click(screen.getAllByText("New Issue")[0]);
    });
    const dialog = screen.getByRole("dialog", { name: /new issue/i });
    expect(dialog).toBeDefined();
    expect(screen.getByText("LIVE_SHOPFLOOR")).toBeDefined();
  });

  it("renders new action modal with LIVE_SHOPFLOOR source type", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      fireEvent.click(screen.getAllByText("New Action")[0]);
    });
    const dialog = screen.getByRole("dialog", { name: /new action/i });
    expect(dialog).toBeDefined();
    expect(screen.getByText("LIVE_SHOPFLOOR")).toBeDefined();
  });

  it("switches back to Line Performance view from Shopfloor", async () => {
    switchToLiveShopfloor();
    await waitFor(() => {
      // The toolbar has a "Line Perf." button to switch back
      const linePerfBtn = screen.getByText("Line Perf.");
      fireEvent.click(linePerfBtn);
    });
    await waitFor(() => {
      expect(screen.getByText("Plan vs Actual")).toBeDefined();
    });
  });
});

describe("DemoDataPage - Modal Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes log downtime modal on cancel", async () => {
    renderPage();
    fireEvent.click(screen.getByText("Log Downtime"));
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("disables save button in new issue modal when title is empty", () => {
    renderPage();
    fireEvent.click(screen.getByText("New Issue"));
    const saveBtn = screen.getByText("Create Issue");
    expect(saveBtn).toBeDefined();
    expect(saveBtn.hasAttribute("disabled")).toBe(true);
  });

  it("enables save button after typing a title", async () => {
    renderPage();
    fireEvent.click(screen.getByText("New Issue"));
    const titleInput = screen.getByPlaceholderText(/Describe the abnormal condition/);
    fireEvent.change(titleInput, { target: { value: "Test issue title" } });
    const saveBtn = screen.getByText("Create Issue");
    expect(saveBtn.hasAttribute("disabled")).toBe(false);
  });

  it("closes new action modal on cancel", async () => {
    renderPage();
    fireEvent.click(screen.getByText("New Action"));
    expect(screen.getByRole("dialog", { name: /new action/i })).toBeDefined();
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("closes modals on Escape key", async () => {
    renderPage();
    fireEvent.click(screen.getByText("New Issue"));
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});

describe("DemoDataPage - Data Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows bottleneck attention message in line perf view", () => {
    renderPage();
    expect(screen.getByText(/Review setup/)).toBeDefined();
  });

  it("shows quality alert with defect reason", () => {
    renderPage();
    expect(screen.getByText(/Surface scratch/)).toBeDefined();
  });

  it("shows linked issue titles", () => {
    renderPage();
    expect(screen.getByText(/CNC-03 cycle time/)).toBeDefined();
  });

  it("shows overdue action priority in line perf view", () => {
    renderPage();
    // The urgent action title should be visible
    expect(screen.getByText(/Resolve material shortage/)).toBeDefined();
    expect(screen.getByText("urgent")).toBeDefined();
  });
});
