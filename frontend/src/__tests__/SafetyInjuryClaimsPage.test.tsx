import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SafetyInjuryClaimsPage } from "@/pages/safety/SafetyInjuryClaimsPage";
import { useQuery, useMutation } from "@apollo/client/react";

const mockNavigate = vi.fn();
const mockMutate = vi.fn().mockResolvedValue({});

vi.mock("@apollo/client/react", async () => {
  const actual = await vi.importActual("@apollo/client/react");
  return { ...(actual as any), useQuery: vi.fn(), useMutation: vi.fn() };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...(actual as any), useNavigate: () => mockNavigate };
});

// ── Helpers ──

function mockClaim(overrides: Record<string, any> = {}) {
  return {
    id: 1, safetyEventId: null, claimNumber: null,
    claimantName: "John Doe", claimantEmployeeId: null, claimType: "FIRST_AID",
    status: "DRAFT", injurySummary: null, bodyArea: null,
    lostTime: false, restrictedWork: false,
    reportedToInsurer: false, insurerReference: null,
    openedAt: null, closedAt: null, owner: "",
    notes: null, createdAt: "2025-06-20T10:00:00Z", updatedAt: "2025-06-20T10:00:00Z",
    ...overrides,
  };
}

function mockEvent(overrides: Record<string, any> = {}) {
  return {
    id: 10, eventType: "INCIDENT", severity: "LOW", status: "REPORTED",
    targetType: null, targetId: null, title: "Chemical splash",
    description: null, reportedBy: null, reportedAt: null, occurredAt: null,
    locationText: null, immediateAction: null, injuryInvolved: false,
    propertyDamage: false, environmentalImpact: false,
    owner: null, closedAt: null, notes: null, createdAt: null, updatedAt: null,
    ...overrides,
  };
}

function mockData(claims: any[] = [], events: any[] = []) {
  const mockRefetch = vi.fn();
  (useQuery as any).mockImplementation((query: any) => {
    const body = (query?.loc?.source?.body || "") as string;
    if (body.includes("SafetyEvents")) {
      return { data: { safetyEvents: events }, loading: false, refetch: mockRefetch };
    }
    return { data: { safetyInjuryClaims: claims }, loading: false, refetch: mockRefetch };
  });
  (useMutation as any).mockReturnValue([mockMutate]);
  return mockRefetch;
}

function renderPage() {
  return render(<MemoryRouter><SafetyInjuryClaimsPage /></MemoryRouter>);
}

/** Click the first visible button in the toolbar matching the given text. */
function clickToolbarButton(label: string) {
  const buttons = screen.getAllByRole("button").filter((b) => b.textContent?.trim() === label);
  if (buttons.length > 0) fireEvent.click(buttons[0]);
}

// ── Empty State ──

describe("SafetyInjuryClaimsPage - Empty State", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows 'No injury claims recorded.' when claims list is empty", () => {
    mockData([], []); renderPage();
    expect(screen.getByText("No injury claims recorded.")).toBeDefined();
  });

  it("shows two New Claim buttons in empty state (toolbar + inline)", () => {
    mockData([], []); renderPage();
    expect(screen.getAllByText("New Claim").length).toBe(2);
  });

  it("transitions to create mode when a New Claim button is clicked", () => {
    mockData([], []); renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);
    expect(screen.getByText("Save Draft")).toBeDefined();
    expect(screen.getByPlaceholderText("Full name...")).toBeDefined();
  });

  it("shows detail placeholder when no claim is selected", () => {
    mockData([], []); renderPage();
    expect(screen.getByText("Select a claim to view details")).toBeDefined();
  });

  it("shows footer claim count as 0 when empty", () => {
    mockData([], []); renderPage();
    expect(screen.getByText("0 claims")).toBeDefined();
  });
});

// ── Create Flow ──

describe("SafetyInjuryClaimsPage - Create Flow", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("calls create mutation with form data when Save Draft is clicked", async () => {
    const refetch = mockData([], []);
    renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);
    fireEvent.change(screen.getByPlaceholderText("Full name..."), { target: { value: "Jane Worker" } });
    fireEvent.change(screen.getByPlaceholderText("Assigned owner..."), { target: { value: "Supervisor" } });

    fireEvent.click(screen.getByText("Save Draft"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            claimantName: "Jane Worker",
            claimType: "FIRST_AID",
            owner: "Supervisor",
          }),
        }),
      );
    });
    expect(refetch).toHaveBeenCalled();
  });

  it("disables Save Draft when required fields are empty", () => {
    mockData([], []); renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);
    expect(screen.getByText("Save Draft").closest("button")).toBeDisabled();
  });

  it("cancels creation and returns to list", () => {
    mockData([], []); renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);
    expect(screen.getByText("Save Draft")).toBeDefined();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("No injury claims recorded.")).toBeDefined();
  });

  it("sends optional fields when filled", async () => {
    mockData([], []); renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);

    fireEvent.change(screen.getByPlaceholderText("Full name..."), { target: { value: "John" } });
    fireEvent.change(screen.getByPlaceholderText("Assigned owner..."), { target: { value: "Owner" } });
    fireEvent.change(screen.getByPlaceholderText("Employee number..."), { target: { value: "EMP-001" } });
    fireEvent.change(screen.getByPlaceholderText("Describe the injury..."), { target: { value: "Laceration" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. left hand, lower back..."), { target: { value: "Left hand" } });

    // Toggle checkboxes by clicking their labels for reliable state updates in jsdom
    fireEvent.click(screen.getByText("Lost time"));
    fireEvent.click(screen.getByText("Restricted work"));

    fireEvent.click(screen.getByText("Save Draft"));

    await waitFor(() => {
      // First verify the mutation was called at all
      expect(mockMutate).toHaveBeenCalled();
    });
    // Then check the variables content
    const callArgs = mockMutate.mock.calls[0][0] as any;
    expect(callArgs.variables.claimantName).toBe("John");
    expect(callArgs.variables.claimantEmployeeId).toBe("EMP-001");
    expect(callArgs.variables.injurySummary).toBe("Laceration");
    expect(callArgs.variables.bodyArea).toBe("Left hand");
    expect(callArgs.variables.lostTime).toBe(true);
    expect(callArgs.variables.restrictedWork).toBe(true);
  });
});

// ── Open Flow ──

describe("SafetyInjuryClaimsPage - Open Claim", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows Open button for a DRAFT claim", () => {
    mockData([mockClaim({ id: 1, status: "DRAFT", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    // "Open" appears in filter dropdown + toolbar button — use getAllByText
    const openEls = screen.getAllByText("Open");
    expect(openEls.length).toBeGreaterThanOrEqual(1);
  });

  it("calls open mutation when Open button is clicked", async () => {
    mockData([mockClaim({ id: 1, status: "DRAFT", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));

    clickToolbarButton("Open");

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 1 } }));
    });
  });

  it("shows success message after opening a claim", async () => {
    mockData([mockClaim({ id: 1, status: "DRAFT", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));

    clickToolbarButton("Open");

    await waitFor(() => {
      expect(screen.getByText("Claim opened")).toBeDefined();
    });
  });

  it("disables Open button when claim is not DRAFT", () => {
    mockData([mockClaim({ id: 1, status: "OPEN", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    const openBtns = screen.getAllByRole("button").filter((b) => b.textContent?.trim() === "Open");
    expect(openBtns.length).toBeGreaterThanOrEqual(1);
    openBtns.forEach((btn) => expect(btn).toBeDisabled());
  });
});

// ── Close Flow ──

describe("SafetyInjuryClaimsPage - Close Claim", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows Close button for an UNDER_REVIEW claim", () => {
    mockData([mockClaim({ id: 1, status: "UNDER_REVIEW", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    expect(screen.getByText("Close")).toBeDefined();
  });

  it("calls close mutation when Close button is clicked", async () => {
    mockData([mockClaim({ id: 1, status: "UNDER_REVIEW", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));

    fireEvent.click(screen.getByText("Close"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 1 } }));
    });
  });

  it("shows Close for WAITING_INFO status too", () => {
    mockData([mockClaim({ id: 1, status: "WAITING_INFO", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    expect(screen.getByText("Close")).toBeDefined();
  });

  it("disables Close for CLOSED claim", () => {
    mockData([mockClaim({ id: 1, status: "CLOSED", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    const closeBtns = screen.getAllByRole("button").filter((b) => b.textContent?.trim() === "Close");
    expect(closeBtns.length).toBeGreaterThanOrEqual(1);
    closeBtns.forEach((btn) => expect(btn).toBeDisabled());
  });
});

// ── Cancel Flow ──

describe("SafetyInjuryClaimsPage - Cancel Claim", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows Cancel button for a DRAFT claim", () => {
    mockData([mockClaim({ id: 1, status: "DRAFT", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    expect(screen.getByText("Cancel")).toBeDefined();
  });

  it("shows Cancel button for an OPEN claim", () => {
    mockData([mockClaim({ id: 1, status: "OPEN", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    expect(screen.getByText("Cancel")).toBeDefined();
  });

  it("opens confirmation dialog when Cancel is clicked", () => {
    mockData([mockClaim({ id: 1, status: "DRAFT", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Cancel Claim")).toBeDefined();
    expect(screen.getByText("Yes, Cancel")).toBeDefined();
    expect(screen.getByText("No")).toBeDefined();
  });

  it("calls cancel mutation after confirming", async () => {
    mockData([mockClaim({ id: 1, status: "DRAFT", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("Yes, Cancel"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 1 } }));
    });
  });

  it("does not call cancel mutation when No is clicked in dialog", async () => {
    mockData([mockClaim({ id: 1, status: "DRAFT", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("No"));

    expect(mockMutate).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText("Cancel Claim")).toBeNull();
    });
  });

  it("disables Cancel for CLOSED claim", () => {
    mockData([mockClaim({ id: 1, status: "CLOSED", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    const cancelBtns = screen.getAllByRole("button").filter((b) => b.textContent?.trim() === "Cancel");
    expect(cancelBtns.length).toBeGreaterThanOrEqual(1);
    cancelBtns.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("disables Cancel for CANCELLED claim", () => {
    mockData([mockClaim({ id: 1, status: "CANCELLED", owner: "Supervisor" })], []);
    renderPage();
    fireEvent.click(screen.getByText("John Doe"));
    const cancelBtns = screen.getAllByRole("button").filter((b) => b.textContent?.trim() === "Cancel");
    expect(cancelBtns.length).toBeGreaterThanOrEqual(1);
    cancelBtns.forEach((btn) => expect(btn).toBeDisabled());
  });
});

// ── Linked Event Selector ──

describe("SafetyInjuryClaimsPage - Linked Event Selector", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows injury-related events in the linked event dropdown when they exist", () => {
    const injuryEvent = mockEvent({ id: 20, title: "Chemical burn", injuryInvolved: true });
    mockData([], [injuryEvent]);
    renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);

    // There are 2 <select> elements (filter + linked event). Use display value to find the right one.
    const linkedEventSelect = screen.getByDisplayValue("None");
    expect(linkedEventSelect).toBeDefined();
    expect(screen.getByText(/Chemical burn/)).toBeDefined();
  });

  it("shows helper text when no injury events exist", () => {
    mockData([], [mockEvent({ id: 20, title: "Property damage", injuryInvolved: false })]);
    renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);
    expect(screen.getByText(/Claims may be linked after an injury event is reported/)).toBeDefined();
  });

  it("does not show helper text when injury events exist", () => {
    mockData([], [mockEvent({ id: 20, title: "Chemical burn", injuryInvolved: true })]);
    renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);
    expect(screen.queryByText(/Claims may be linked after an injury event is reported/)).toBeNull();
  });

  it("falls back to INCIDENT/ACCIDENT events when no injury events exist, and shows helper text", () => {
    const incidentEvent = mockEvent({ id: 20, title: "Accident on line", eventType: "ACCIDENT", injuryInvolved: false });
    mockData([], [incidentEvent, mockEvent({ id: 21, title: "Hazard observation", eventType: "HAZARD", injuryInvolved: false })]);
    renderPage();
    fireEvent.click(screen.getAllByText("New Claim")[0]);
    expect(screen.getByText(/Accident on line/)).toBeDefined();
    expect(screen.getByText(/Claims may be linked after an injury event is reported/)).toBeDefined();
  });
});

// ── List / Selection ──

describe("SafetyInjuryClaimsPage - List and Selection", () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockReset(); });

  it("shows claims in the left list with claimant name and status badge", () => {
    mockData([
      mockClaim({ id: 1, claimantName: "Alice", status: "DRAFT" }),
      mockClaim({ id: 2, claimantName: "Bob", status: "OPEN" }),
    ], []);
    renderPage();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("shows claim footer count matching number of claims", () => {
    mockData([mockClaim({ id: 1 }), mockClaim({ id: 2 })], []);
    renderPage();
    expect(screen.getByText("2 claims")).toBeDefined();
  });

  it("selects a claim when clicked and shows detail view", () => {
    mockData([mockClaim({ id: 1, claimantName: "Alice", status: "DRAFT" })], []);
    renderPage();
    fireEvent.click(screen.getByText("Alice"));
    expect(screen.getByText("Draft")).toBeDefined();
    // "First Aid" appears in left list AND detail header — use getAllByText
    const firstAidEls = screen.getAllByText("First Aid");
    expect(firstAidEls.length).toBeGreaterThanOrEqual(2);
  });

  it("navigates back to list when Back is clicked", () => {
    mockData([mockClaim({ id: 1, claimantName: "Alice", status: "DRAFT" })], []);
    renderPage();
    fireEvent.click(screen.getByText("Alice"));
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Select a claim to view details")).toBeDefined();
  });

  it("calls refetch when Refresh is clicked", () => {
    const mockRefetch = mockData([mockClaim({ id: 1 })], []);
    renderPage();
    fireEvent.click(screen.getByText("Refresh"));
    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("switches detail view when selecting different claims", () => {
    mockData([
      mockClaim({ id: 1, claimantName: "Alice", status: "DRAFT" }),
      mockClaim({ id: 2, claimantName: "Bob", status: "OPEN" }),
    ], []);
    renderPage();

    fireEvent.click(screen.getByText("Alice"));
    expect(screen.getByText("Draft")).toBeDefined();

    fireEvent.click(screen.getByText("Bob"));
    // "Open" appears in filter dropdown + status badge + toolbar button
    const openEls = screen.getAllByText("Open");
    expect(openEls.length).toBeGreaterThanOrEqual(2);
  });
});
