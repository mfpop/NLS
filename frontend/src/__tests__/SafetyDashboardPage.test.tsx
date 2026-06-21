import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SafetyDashboardPage } from "@/pages/safety/SafetyDashboardPage";
import { useQuery } from "@apollo/client/react";

const mockNavigate = vi.fn();

// Build a complete mock summary payload
function mockSummary(overrides: Record<string, any> = {}) {
  return {
    totalEvents: 0,
    openEvents: 0,
    underReviewEvents: 0,
    actionRequiredEvents: 0,
    closedEvents: 0,
    criticalEvents: 0,
    highSeverityEvents: 0,
    incidents: 0,
    accidents: 0,
    nearMisses: 0,
    hazards: 0,
    observations: 0,
    overdueFollowUps: 0,
    byEventType: [],
    bySeverity: [],
    byStatus: [],
    recentEvents: [],
    ...overrides,
  };
}

vi.mock("@apollo/client/react", async () => {
  const actual = await vi.importActual("@apollo/client/react");
  return { ...(actual as any), useQuery: vi.fn() };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...(actual as any), useNavigate: () => mockNavigate };
});

const mockRefetch = vi.fn();

function renderPage() {
  return render(<MemoryRouter><SafetyDashboardPage /></MemoryRouter>);
}

function resetUseQuery(data: any, loading = false) {
  (useQuery as any).mockReturnValue({
    data: { safetyDashboardSummary: data },
    loading,
    refetch: mockRefetch,
  });
}

describe("SafetyDashboardPage - Zero State", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows zero-state heading and guidance when totalEvents is 0", () => {
    resetUseQuery(mockSummary());
    renderPage();
    expect(screen.getByText("No safety events recorded yet.")).toBeDefined();
    expect(screen.getByText(/Start by reporting an incident, near miss, hazard, or observation/)).toBeDefined();
  });

  it("shows zero-state when data is null", () => {
    (useQuery as any).mockReturnValue({ data: null, loading: false, refetch: mockRefetch });
    renderPage();
    expect(screen.getByText("No safety events recorded yet.")).toBeDefined();
  });

  it("shows 3 quick action buttons in zero state: New Incident/Accident, New Near Miss, New Hazard/Observation", () => {
    resetUseQuery(mockSummary());
    renderPage();
    expect(screen.getByText("New Incident / Accident")).toBeDefined();
    expect(screen.getByText("New Near Miss")).toBeDefined();
    expect(screen.getByText("New Hazard / Observation")).toBeDefined();
  });

  it("navigates to correct route when New Incident/Accident button is clicked", () => {
    resetUseQuery(mockSummary());
    renderPage();
    fireEvent.click(screen.getByText("New Incident / Accident"));
    expect(mockNavigate).toHaveBeenCalledWith("/safety/incidents");
  });

  it("navigates to correct route when New Near Miss button is clicked", () => {
    resetUseQuery(mockSummary());
    renderPage();
    fireEvent.click(screen.getByText("New Near Miss"));
    expect(mockNavigate).toHaveBeenCalledWith("/safety/near-misses");
  });

  it("navigates to correct route when New Hazard / Observation button is clicked", () => {
    resetUseQuery(mockSummary());
    renderPage();
    fireEvent.click(screen.getByText("New Hazard / Observation"));
    expect(mockNavigate).toHaveBeenCalledWith("/safety/hazards");
  });

  it("shows footer 'No safety data recorded' in zero state", () => {
    resetUseQuery(mockSummary());
    renderPage();
    expect(screen.getByText("No safety data recorded")).toBeDefined();
  });
});

describe("SafetyDashboardPage - KPI Strip", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows all 7 KPI cards with correct values when data exists", () => {
    resetUseQuery(mockSummary({
      totalEvents: 42, openEvents: 15, actionRequiredEvents: 5,
      criticalEvents: 3, highSeverityEvents: 8, underReviewEvents: 4, closedEvents: 20,
    }));
    renderPage();
    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getAllByText("Total Events").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("15")).toBeDefined();
    expect(screen.getAllByText("Open").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getAllByText("Action Required").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getAllByText("Critical").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("8")).toBeDefined();
    expect(screen.getAllByText("High / Critical").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getAllByText("Under Review").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("20")).toBeDefined();
    expect(screen.getAllByText("Closed").length).toBeGreaterThanOrEqual(1);
  });

  it("shows conditional Overdue KPI card when overdueFollowUps > 0", () => {
    resetUseQuery(mockSummary({
      totalEvents: 10, openEvents: 5, actionRequiredEvents: 2,
      criticalEvents: 1, highSeverityEvents: 2, underReviewEvents: 1, closedEvents: 3,
      overdueFollowUps: 3,
    }));
    renderPage();
    // "3" appears twice: closedEvents=3 and overdueFollowUps=3
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Overdue")).toBeDefined();
  });

  it("does NOT show Overdue KPI card when overdueFollowUps is 0", () => {
    resetUseQuery(mockSummary({
      totalEvents: 10, openEvents: 5, actionRequiredEvents: 2,
      criticalEvents: 1, highSeverityEvents: 2, underReviewEvents: 1, closedEvents: 3,
      overdueFollowUps: 0,
    }));
    renderPage();
    expect(screen.queryByText("Overdue")).toBeNull();
  });
});

describe("SafetyDashboardPage - Recent Events", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows 'No recent events' when recentEvents array is empty", () => {
    resetUseQuery(mockSummary({
      totalEvents: 5, openEvents: 2, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 1, closedEvents: 1,
      recentEvents: [],
    }));
    renderPage();
    expect(screen.getByText("No recent events")).toBeDefined();
  });

  it("renders recent event items with title, type, status badge, and date", () => {
    resetUseQuery(mockSummary({
      totalEvents: 5, openEvents: 2, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 1, closedEvents: 1,
      byEventType: [{ eventType: "INCIDENT", count: 3 }, { eventType: "NEAR_MISS", count: 2 }],
      bySeverity: [{ severity: "LOW", count: 5 }],
      byStatus: [{ status: "DRAFT", count: 5 }],
      recentEvents: [
        { id: 1, eventType: "INCIDENT", severity: "HIGH", status: "OPEN", title: "Chemical spill", occurredAt: "2025-06-15T10:00:00Z" },
        { id: 2, eventType: "NEAR_MISS", severity: "MEDIUM", status: "REPORTED", title: "Slippery floor", occurredAt: "2025-06-14T08:00:00Z" },
      ],
    }));
    renderPage();
    expect(screen.getByText("Chemical spill")).toBeDefined();
    expect(screen.getByText("Slippery floor")).toBeDefined();
    expect(screen.getAllByText("Incidents").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Near Misses").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2025-06-15")).toBeDefined();
    expect(screen.getByText("2025-06-14")).toBeDefined();
  });

  it("limits recent events to 6 items", () => {
    const manyEvents = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, eventType: "INCIDENT", severity: "LOW", status: "DRAFT",
      title: `Event ${i + 1}`, occurredAt: "2025-06-15T10:00:00Z",
    }));
    resetUseQuery(mockSummary({
      totalEvents: 10, openEvents: 10, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 0, closedEvents: 0,
      byEventType: [{ eventType: "INCIDENT", count: 10 }],
      bySeverity: [{ severity: "LOW", count: 10 }],
      byStatus: [{ status: "DRAFT", count: 10 }],
      recentEvents: manyEvents,
    }));
    renderPage();
    // Event 10 should not be shown (only 1-6)
    expect(screen.queryByText("Event 10")).toBeNull();
    expect(screen.getByText("Event 1")).toBeDefined();
    expect(screen.getByText("Event 6")).toBeDefined();
    expect(screen.queryByText("Event 7")).toBeNull();
  });

  it("navigates to /safety/incidents when clicking an INCIDENT event", () => {
    resetUseQuery(mockSummary({
      totalEvents: 1, openEvents: 1, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 0, closedEvents: 0,
      byEventType: [{ eventType: "INCIDENT", count: 1 }],
      bySeverity: [{ severity: "LOW", count: 1 }],
      byStatus: [{ status: "DRAFT", count: 1 }],
      recentEvents: [{ id: 1, eventType: "INCIDENT", severity: "LOW", status: "DRAFT", title: "Test incident", occurredAt: "2025-06-15T10:00:00Z" }],
    }));
    renderPage();
    fireEvent.click(screen.getByText("Test incident"));
    expect(mockNavigate).toHaveBeenCalledWith("/safety/incidents");
  });

  it("navigates to /safety/near-misses when clicking a NEAR_MISS event", () => {
    resetUseQuery(mockSummary({
      totalEvents: 1, openEvents: 1, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 0, closedEvents: 0,
      byEventType: [{ eventType: "NEAR_MISS", count: 1 }],
      bySeverity: [{ severity: "LOW", count: 1 }],
      byStatus: [{ status: "DRAFT", count: 1 }],
      recentEvents: [{ id: 1, eventType: "NEAR_MISS", severity: "LOW", status: "DRAFT", title: "Near miss test", occurredAt: "2025-06-15T10:00:00Z" }],
    }));
    renderPage();
    fireEvent.click(screen.getByText("Near miss test"));
    expect(mockNavigate).toHaveBeenCalledWith("/safety/near-misses");
  });

  it("navigates to /safety/hazards when clicking a HAZARD event", () => {
    resetUseQuery(mockSummary({
      totalEvents: 1, openEvents: 1, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 0, closedEvents: 0,
      byEventType: [{ eventType: "HAZARD", count: 1 }],
      bySeverity: [{ severity: "LOW", count: 1 }],
      byStatus: [{ status: "DRAFT", count: 1 }],
      recentEvents: [{ id: 1, eventType: "HAZARD", severity: "LOW", status: "DRAFT", title: "Hazard test", occurredAt: "2025-06-15T10:00:00Z" }],
    }));
    renderPage();
    fireEvent.click(screen.getByText("Hazard test"));
    expect(mockNavigate).toHaveBeenCalledWith("/safety/hazards");
  });

  it("navigates to /safety/hazards when clicking an OBSERVATION event", () => {
    resetUseQuery(mockSummary({
      totalEvents: 1, openEvents: 1, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 0, closedEvents: 0,
      byEventType: [{ eventType: "OBSERVATION", count: 1 }],
      bySeverity: [{ severity: "LOW", count: 1 }],
      byStatus: [{ status: "DRAFT", count: 1 }],
      recentEvents: [{ id: 1, eventType: "OBSERVATION", severity: "LOW", status: "DRAFT", title: "Observation test", occurredAt: "2025-06-15T10:00:00Z" }],
    }));
    renderPage();
    fireEvent.click(screen.getByText("Observation test"));
    expect(mockNavigate).toHaveBeenCalledWith("/safety/hazards");
  });
});

describe("SafetyDashboardPage - Drill-Down Routing", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows quick action buttons (Incident, Near Miss, Hazard) under Status Summary", () => {
    resetUseQuery(mockSummary({
      totalEvents: 5, openEvents: 2, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 1, closedEvents: 1,
      byStatus: [{ status: "DRAFT", count: 5 }],
    }));
    renderPage();
    expect(screen.getAllByText("Incident").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Near Miss").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Hazard").length).toBeGreaterThanOrEqual(1);
  });

  it("navigates to correct routes when quick action buttons are clicked", () => {
    resetUseQuery(mockSummary({
      totalEvents: 5, openEvents: 2, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 1, closedEvents: 1,
      byStatus: [{ status: "DRAFT", count: 5 }],
    }));
    renderPage();
    fireEvent.click(screen.getAllByText("Incident")[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/safety/incidents");
    mockNavigate.mockReset();
    fireEvent.click(screen.getAllByText("Near Miss")[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/safety/near-misses");
    mockNavigate.mockReset();
    fireEvent.click(screen.getAllByText("Hazard")[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/safety/hazards");
  });
});

describe("SafetyDashboardPage - Loading State", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("shows loading message when loading is true and no data", () => {
    (useQuery as any).mockReturnValue({ data: null, loading: true, refetch: mockRefetch });
    renderPage();
    expect(screen.getByText("Loading dashboard...")).toBeDefined();
  });
});

describe("SafetyDashboardPage - Toolbar / Refresh", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls refetch when Refresh button is clicked", () => {
    resetUseQuery(mockSummary({ totalEvents: 5, openEvents: 2, actionRequiredEvents: 0, criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 1, closedEvents: 1 }));
    renderPage();
    const refreshBtn = screen.getByText("Refresh");
    expect(refreshBtn).toBeDefined();
    fireEvent.click(refreshBtn);
    expect(mockRefetch).toHaveBeenCalledOnce();
  });
});

describe("SafetyDashboardPage - Footer", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows footer with total, open, critical counts when data exists", () => {
    resetUseQuery(mockSummary({
      totalEvents: 42, openEvents: 15, actionRequiredEvents: 3,
      criticalEvents: 2, highSeverityEvents: 5, underReviewEvents: 4, closedEvents: 20,
      overdueFollowUps: 0,
    }));
    renderPage();
    expect(screen.getByText(/42 total events/)).toBeDefined();
    expect(screen.getByText(/15 open/)).toBeDefined();
    expect(screen.getByText(/2 critical/)).toBeDefined();
    expect(screen.getByText(/No overdue follow-ups/)).toBeDefined();
  });

  it("shows 'overdue' in footer when overdueFollowUps > 0", () => {
    resetUseQuery(mockSummary({
      totalEvents: 10, openEvents: 5, actionRequiredEvents: 2,
      criticalEvents: 1, highSeverityEvents: 2, underReviewEvents: 1, closedEvents: 3,
      overdueFollowUps: 3,
    }));
    renderPage();
    expect(screen.getByText(/3 overdue/)).toBeDefined();
  });
});

describe("SafetyDashboardPage - Panels", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows all 4 panel titles when data exists", () => {
    resetUseQuery(mockSummary({
      totalEvents: 5, openEvents: 2, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 1, closedEvents: 1,
      byEventType: [{ eventType: "INCIDENT", count: 5 }],
      bySeverity: [{ severity: "LOW", count: 5 }],
      byStatus: [{ status: "DRAFT", count: 5 }],
    }));
    renderPage();
    expect(screen.getAllByText("Events by Type").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Events by Severity").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Recent Safety Events").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Status Summary").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Events by Type panel with type labels and counts", () => {
    resetUseQuery(mockSummary({
      totalEvents: 10, openEvents: 5, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 1, closedEvents: 3,
      byEventType: [
        { eventType: "INCIDENT", count: 4 },
        { eventType: "NEAR_MISS", count: 3 },
        { eventType: "HAZARD", count: 2 },
        { eventType: "OBSERVATION", count: 1 },
      ],
      bySeverity: [{ severity: "LOW", count: 10 }],
      byStatus: [{ status: "DRAFT", count: 10 }],
    }));
    renderPage();
    expect(screen.getByText("Incidents")).toBeDefined();
    expect(screen.getByText("Near Misses")).toBeDefined();
    expect(screen.getByText("Hazards")).toBeDefined();
    expect(screen.getByText("Observations")).toBeDefined();
  });

  it("renders Events by Severity panel with all 4 severities", () => {
    resetUseQuery(mockSummary({
      totalEvents: 10, openEvents: 5, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 1, closedEvents: 3,
      byEventType: [{ eventType: "INCIDENT", count: 10 }],
      bySeverity: [
        { severity: "LOW", count: 3 },
        { severity: "MEDIUM", count: 3 },
        { severity: "HIGH", count: 2 },
        { severity: "CRITICAL", count: 2 },
      ],
      byStatus: [{ status: "DRAFT", count: 10 }],
    }));
    renderPage();
    // "Low" only appears in severity panel; "Critical" appears in both KPI and severity panel
    expect(screen.getByText("Low")).toBeDefined();
    expect(screen.getByText("Medium")).toBeDefined();
    expect(screen.getByText("High")).toBeDefined();
    const criticals = screen.getAllByText("Critical");
    expect(criticals.length).toBeGreaterThanOrEqual(2); // KPI label + severity label
  });

  it("shows 'No data' for empty byEventType", () => {
    resetUseQuery(mockSummary({
      totalEvents: 5, openEvents: 5, actionRequiredEvents: 0,
      criticalEvents: 0, highSeverityEvents: 0, underReviewEvents: 0, closedEvents: 0,
      byEventType: [],
      bySeverity: [{ severity: "LOW", count: 5 }],
      byStatus: [{ status: "DRAFT", count: 5 }],
    }));
    renderPage();
    expect(screen.getByText("No data")).toBeDefined();
  });
});
