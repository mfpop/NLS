import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing/react";
import { LinePerformancePage } from "@/pages/execution/LinePerformancePage";
import { LINE_PERFORMANCE_DASHBOARD_QUERY, LINE_PERFORMANCE_RECORDS_QUERY, LINE_PERFORMANCE_FILTERS_QUERY } from "@/graphql/linePerformanceQueries";

// Mock the active line store
vi.mock("@/stores/activeLineStore", () => ({
  useActiveLineId: () => ["test-line-1", vi.fn()],
  useSelectedPlantId: () => ["test-plant-1", vi.fn()],
  getActiveLineId: () => "test-line-1",
}));

// Mock the production lines query
vi.mock("@/graphql/productionLineQueries", () => ({
  PRODUCTION_LINES_QUERY: {},
}));

const mockDashboardData = {
  linePerformanceDashboard: {
    line: { id: "L1", code: "L-CYL", name: "C2-Cylinder Assembly", plantId: "P1", plantName: "Main Plant", status: "active" },
    shift: { id: "S1", name: "Morning", startTime: "06:00", endTime: "14:00", date: "2026-06-10" },
    kpis: {
      planQuantity: 500, actualQuantity: 420, gap: -80, gapStatus: "behind",
      runRate: 52, runRateUnit: "units/hr", oeeSignal: 0.72, oeeStatus: "warning",
      availability: 0.85, performance: 0.88, quality: 0.96, downtimeMinutes: 45,
      firstPassYield: 0.96, qualityStatus: "warning",
    },
    planVsActual: {
      plannedQuantity: 500, actualQuantity: 420, remainingQuantity: 80, gap: -80,
      targetRunRate: 60, actualRunRate: 52, runRateUnit: "units/hr",
      projectedEndOfShift: 480, progressPercent: 84, status: "behind",
    },
    oeeSignal: {
      availability: 0.85, performance: 0.88, quality: 0.96,
      availabilityStatus: "warning", performanceStatus: "good",
      qualityStatus: "good", overallStatus: "warning", overall: 0.72,
      explanation: "Performance loss due to minor stoppages",
    },
    downtimeSummary: {
      totalDowntimeMinutes: 45, topReason: "Material shortage",
      topReasonDurationMinutes: 20, activeDowntimeEvent: null, totalEvents: 3,
    },
    downtimeEvents: [
      { id: "DE1", startTime: "07:15", endTime: "07:35", durationMinutes: 20, reason: "Material shortage", reasonCode: "MAT", status: "resolved", description: "Awaiting cylinders", linkedIssueId: null, linkedActionId: "ACT1", resourceName: null, resourceGroupName: null },
      { id: "DE2", startTime: "08:45", endTime: "09:00", durationMinutes: 15, reason: "Micro stoppage", reasonCode: "MICRO", status: "resolved", description: "Sensor adjustment", linkedIssueId: null, linkedActionId: null, resourceName: null, resourceGroupName: null },
      { id: "DE3", startTime: "10:30", endTime: "10:40", durationMinutes: 10, reason: "Changeover", reasonCode: "CO", status: "resolved", description: "Model change", linkedIssueId: null, linkedActionId: null, resourceName: null, resourceGroupName: null },
    ],
    qualitySummary: {
      goodQuantity: 403, rejectedQuantity: 12, reworkQuantity: 5, scrapQuantity: 7,
      firstPassYield: 0.96, defectCount: 8, topDefectReason: "Surface scratch",
      linkedIssueCount: 1,
    },
    bottleneckSignal: {
      resourceName: "CNC-03", resourceGroupName: "Machining", cycleTimeSignal: "45.2s (+12%)",
      queueWipSignal: "12 units", blockedStatus: "running", starvedStatus: null,
      runningStatus: "running", reasonSummary: "Cycle time exceeds takt time",
      attentionMessage: "Review setup and consider operator support", isConstrained: true,
    },
    linkedIssues: [
      { id: "ISS1", title: "CNC-03 cycle time above takt", severity: "high", status: "open", owner: "John", dueDate: "2026-06-15", createdAt: "2026-06-10T07:30:00Z" },
    ],
    linkedActions: [
      { id: "ACT1", title: "Resolve material shortage for C2 line", priority: "urgent", status: "in_progress", assignedTo: "Sarah", dueDate: "2026-06-10T14:00:00Z", createdAt: "2026-06-10T07:20:00Z" },
    ],
    timelineEvents: [
      { id: "TE1", eventType: "shift_started", description: "Morning shift started", timestamp: "06:00", severity: null, userId: null, userName: null },
      { id: "TE2", eventType: "downtime_started", description: "Material shortage at station 3", timestamp: "07:15", severity: "critical", userId: "U1", userName: "John" },
      { id: "TE3", eventType: "downtime_stopped", description: "Material shortage resolved", timestamp: "07:35", severity: null, userId: "U2", userName: "Sarah" },
    ],
    allowedActions: ["refresh", "log_downtime", "create_issue", "create_action"],
    lastUpdatedAt: "2026-06-10T11:00:00Z",
  },
};

const mockRecordsData = {
  linePerformanceRecords: [
    { id: "R1", shiftName: "Morning", date: "2026-06-10", startTime: "06:00", endTime: "14:00", plannedQuantity: 500, actualQuantity: 420, gap: -80, oeeStatus: "warning", downtimeMinutes: 45, qualityIssueCount: 1, status: "active" },
    { id: "R2", shiftName: "Afternoon", date: "2026-06-10", startTime: "14:00", endTime: "22:00", plannedQuantity: 500, actualQuantity: 0, gap: 0, oeeStatus: "pending", downtimeMinutes: 0, qualityIssueCount: 0, status: "upcoming" },
  ],
};

const mockFiltersData = {
  linePerformanceFilters: {
    shifts: [{ id: "S1", name: "Morning", startTime: "06:00", endTime: "14:00" }],
    dates: ["2026-06-10"],
    statuses: ["active", "upcoming"],
    downtimeReasons: [{ id: "DR1", code: "MAT", name: "Material shortage" }],
  },
};

const mocks = [
  {
    request: { query: LINE_PERFORMANCE_DASHBOARD_QUERY, variables: { lineId: "test-line-1" } },
    result: { data: mockDashboardData },
  },
  {
    request: { query: LINE_PERFORMANCE_RECORDS_QUERY, variables: { lineId: "test-line-1", filters: {} } },
    result: { data: mockRecordsData },
  },
  {
    request: { query: LINE_PERFORMANCE_FILTERS_QUERY, variables: { lineId: "test-line-1" } },
    result: { data: mockFiltersData },
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <LinePerformancePage />
      </MockedProvider>
    </MemoryRouter>
  );
}

describe("LinePerformancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders shared header with title", async () => {
    renderPage();
    expect(await screen.findByText("Line Performance")).toBeDefined();
  });

  it("renders shared toolbar with refresh button", async () => {
    renderPage();
    expect(await screen.findByTitle("Refresh dashboard data")).toBeDefined();
  });

  it("renders shared footer with line info", async () => {
    renderPage();
    expect(await screen.findByText(/Line:/)).toBeDefined();
  });

  it("renders KPI strip with plan quantity", async () => {
    renderPage();
    expect(await screen.findByText("Plan")).toBeDefined();
    expect(await screen.findByText("500")).toBeDefined();
  });

  it("renders plan vs actual section", async () => {
    renderPage();
    expect(await screen.findByText("Plan vs Actual")).toBeDefined();
  });

  it("renders OEE signal section", async () => {
    renderPage();
    expect(await screen.findByText("OEE Signal")).toBeDefined();
  });

  it("renders downtime section", async () => {
    renderPage();
    expect(await screen.findByText("Downtime")).toBeDefined();
  });

  it("renders quality section", async () => {
    renderPage();
    expect(await screen.findByText("Quality")).toBeDefined();
  });

  it("renders bottleneck section", async () => {
    renderPage();
    expect(await screen.findByText("Bottleneck")).toBeDefined();
  });

  it("renders linked issues and actions section", async () => {
    renderPage();
    expect(await screen.findByText("Issues & Actions")).toBeDefined();
  });

  it("renders timeline section", async () => {
    renderPage();
    expect(await screen.findByText("Timeline")).toBeDefined();
  });

  it("renders record list with shift names", async () => {
    renderPage();
    expect(await screen.findByText("Morning")).toBeDefined();
  });

  it("renders log downtime button", async () => {
    renderPage();
    expect(await screen.findByTitle("Log a downtime event")).toBeDefined();
  });

  it("renders new issue button", async () => {
    renderPage();
    expect(await screen.findByTitle("Create new issue")).toBeDefined();
  });

  it("renders new action button", async () => {
    renderPage();
    expect(await screen.findByTitle("Create new action")).toBeDefined();
  });

  it("shows loading skeleton initially", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={mocks} addTypename={false}>
          <LinePerformancePage />
        </MockedProvider>
      </MemoryRouter>
    );
    // Should show skeleton loading state (animate-pulse elements)
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("handles GraphQL error state", async () => {
    const errorMock = [
      {
        request: { query: LINE_PERFORMANCE_DASHBOARD_QUERY, variables: { lineId: "test-line-1" } },
        error: new Error("GraphQL error"),
      },
      {
        request: { query: LINE_PERFORMANCE_RECORDS_QUERY, variables: { lineId: "test-line-1", filters: {} } },
        error: new Error("GraphQL error"),
      },
      {
        request: { query: LINE_PERFORMANCE_FILTERS_QUERY, variables: { lineId: "test-line-1" } },
        error: new Error("GraphQL error"),
      },
    ];

    render(
      <MemoryRouter>
        <MockedProvider mocks={errorMock} addTypename={false}>
          <LinePerformancePage />
        </MockedProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("Failed to load line performance data.")).toBeDefined();
    expect(await screen.findByText("Retry")).toBeDefined();
  });
});
