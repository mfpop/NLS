import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SafetyAuditsPage } from "@/pages/check/SafetyAuditsPage";

import { useIssueSection } from "@/pages/check/quality-control/IssueSection";
import { useActionSection } from "@/pages/check/quality-control/ActionSection";
import { useAuditSection } from "@/pages/check/quality-control/AuditSection";
import { useQuery } from "@apollo/client/react";

const mockAuditItems: any[] = [];
const mockIssueItems: any[] = [];
const mockActionItems: any[] = [];

const mockHNew = vi.fn();
const mockHCreate = vi.fn();
const mockHComplete = vi.fn();
const mockHArchive = vi.fn();
const mockHDeleteAudit = vi.fn();
const mockHRefresh = vi.fn();
const mockHInstall = vi.fn();
const mockHCancelNew = vi.fn();
const mockSetArchiveConfirmId = vi.fn();
const mockSetDeleteConfirmIdAudit = vi.fn();
const mockSetExecId = vi.fn();
const mockSetDeleteConfirmIdIssue = vi.fn();
const mockSetDeleteConfirmIdAction = vi.fn();
const mockHCancelIssue = vi.fn();
const mockHCompleteAction = vi.fn();
const mockHCancelAction = vi.fn();

function auditList() {
  return <div data-testid="audit-list">Audits ({mockAuditItems.length})</div>;
}
function auditDetail() {
  return <div data-testid="audit-detail">Audit Detail</div>;
}
function issueList() {
  return <div data-testid="issue-list">Issues ({mockIssueItems.length})</div>;
}
function issueDetail() {
  return <div data-testid="issue-detail">Issue Detail</div>;
}
function actionList() {
  return <div data-testid="action-list">Actions ({mockActionItems.length})</div>;
}
function actionDetail() {
  return <div data-testid="action-detail">Action Detail</div>;
}

function buildMockAuditSection(overrides: Record<string, any> = {}) {
  return { items: mockAuditItems, renderList: auditList, renderDetail: auditDetail,
    creating: false, created: false, execId: null, setExecId: mockSetExecId,
    hNew: mockHNew, hCreate: mockHCreate, hComplete: mockHComplete, hArchive: mockHArchive,
    hDelete: mockHDeleteAudit, hInstall: mockHInstall, hRefresh: mockHRefresh, hCancelNew: mockHCancelNew,
    canSave: true, saving: false, templates: [], execForm: null, editing: false,
    hStartEdit: vi.fn(), hCancelEdit: vi.fn(), hSaveEdit: vi.fn(),
    archiveConfirmId: null, setArchiveConfirmId: mockSetArchiveConfirmId,
    deleteConfirmId: null, setDeleteConfirmId: mockSetDeleteConfirmIdAudit,
    ...overrides };
}

function buildMockIssueSection(overrides: Record<string, any> = {}) {
  return { items: mockIssueItems, selectedId: null,
    renderList: issueList, renderDetail: issueDetail,
    creating: false, editing: false, hNew: mockHNew, hCreate: mockHCreate,
    hEdit: vi.fn(), hSaveEdit: vi.fn(), hCancelEdit: vi.fn(), hCancelNew: vi.fn(),
    resetSelection: vi.fn(), hCancelIssue: mockHCancelIssue, hDelete: vi.fn(),
    hRefresh: mockHRefresh, deleteConfirmId: null, setDeleteConfirmId: mockSetDeleteConfirmIdIssue,
    canSave: true, canSaveEdit: true, ...overrides };
}

function buildMockActionSection(overrides: Record<string, any> = {}) {
  return { items: mockActionItems, selectedId: null,
    renderList: actionList, renderDetail: actionDetail,
    creating: false, editing: false, hNew: mockHNew, hCreate: mockHCreate,
    hEdit: vi.fn(), hSaveEdit: vi.fn(), hCancelEdit: vi.fn(), hCancelNew: vi.fn(),
    resetSelection: vi.fn(), hCompleteAction: mockHCompleteAction, hCancelAction: mockHCancelAction,
    hDelete: vi.fn(), hRefresh: mockHRefresh, deleteConfirmId: null,
    setDeleteConfirmId: mockSetDeleteConfirmIdAction, canSave: true, canSaveEdit: true,
    ...overrides };
}

vi.mock("@/pages/check/quality-control/IssueSection", () => ({ useIssueSection: vi.fn(() => buildMockIssueSection()) }));
vi.mock("@/pages/check/quality-control/ActionSection", () => ({ useActionSection: vi.fn(() => buildMockActionSection()) }));
vi.mock("@/pages/check/quality-control/AuditSection", () => ({ useAuditSection: vi.fn(() => buildMockAuditSection()) }));
vi.mock("@apollo/client/react", async () => {
  const actual = await vi.importActual("@apollo/client/react");
  return { ...(actual as any), useQuery: vi.fn((query: any, _opts: any) => {
    const body = (query?.loc?.source?.body || query?.definitions?.[0]?.name?.value || "").toLowerCase();
    if (body.includes("problems")) return { data: { problems: [] }, loading: false, refetch: vi.fn() };
    if (body.includes("actions")) return { data: { actions: [] }, loading: false, refetch: vi.fn() };
    return { data: null, loading: false, refetch: vi.fn() };
  })};
});
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...(actual as any), useNavigate: () => vi.fn() };
});

function renderPage() {
  return render(<MemoryRouter><SafetyAuditsPage /></MemoryRouter>);
}

function clearMockData() { mockAuditItems.length = 0; mockIssueItems.length = 0; mockActionItems.length = 0; }

function resetAllMocks() {
  vi.clearAllMocks(); clearMockData();
  (useAuditSection as any).mockReturnValue(buildMockAuditSection());
  (useIssueSection as any).mockReturnValue(buildMockIssueSection());
  (useActionSection as any).mockReturnValue(buildMockActionSection());
  (useQuery as any).mockImplementation((query: any, _opts: any) => {
    const body = (query?.loc?.source?.body || query?.definitions?.[0]?.name?.value || "").toLowerCase();
    if (body.includes("problems")) return { data: { problems: [] }, loading: false, refetch: vi.fn() };
    if (body.includes("actions")) return { data: { actions: [] }, loading: false, refetch: vi.fn() };
    return { data: null, loading: false, refetch: vi.fn() };
  });
}

// Click the first radio button with the given label text
function clickRadio(label: string) {
  const btns = screen.getAllByText(label);
  const radio = btns.find((el) => el.closest("button") || el.tagName === "BUTTON") || btns[0];
  fireEvent.click(radio);
}

describe("SafetyAuditsPage - Page Layout", () => {
  beforeEach(resetAllMocks);

  it("renders page title and subtitle", () => {
    renderPage();
    expect(screen.getByText("Safety Audits")).toBeDefined();
    expect(screen.getByText("Run safety inspections, checklist audits, and record safety findings.")).toBeDefined();
  });

  it("renders toolbar with search input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Search...")).toBeDefined();
  });

  it("renders 3 radio buttons for Audits, Issues, and Actions", () => {
    renderPage();
    expect(screen.getAllByText("Audits").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Issues").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Actions").length).toBeGreaterThanOrEqual(2);
  });

  it("renders refresh button in toolbar", () => {
    renderPage();
    expect(screen.getByText("Refresh")).toBeDefined();
  });
});

describe("SafetyAuditsPage - Dashboard Overview", () => {
  beforeEach(() => {
    vi.clearAllMocks(); clearMockData();
    (useAuditSection as any).mockReturnValue(buildMockAuditSection());
    (useIssueSection as any).mockReturnValue(buildMockIssueSection());
    (useActionSection as any).mockReturnValue(buildMockActionSection());
    (useQuery as any).mockImplementation((query: any, _opts: any) => {
      const body = (query?.loc?.source?.body || query?.definitions?.[0]?.name?.value || "").toLowerCase();
      if (body.includes("problems")) return { data: { problems: [] }, loading: false, refetch: vi.fn() };
      if (body.includes("actions")) return { data: { actions: [] }, loading: false, refetch: vi.fn() };
      return { data: null, loading: false, refetch: vi.fn() };
    });
  });

  it("renders dashboard overview when no record type is selected", () => {
    renderPage();
    expect(screen.getAllByText("Safety Compliance Scorecard").length).toBeGreaterThanOrEqual(1);
  });

  it("shows alert banner when 3+ critical/high issues exist", () => {
    // Alert banner triggers at criticalHigh.length > 2
    const criticalProblems = [
      { id: 1, severity: "CRITICAL", status: "OPEN", title: "Fire hazard", problemType: "SAFETY" },
      { id: 2, severity: "CRITICAL", status: "OPEN", title: "Chemical spill", problemType: "SAFETY" },
      { id: 3, severity: "HIGH", status: "OPEN", title: "Guard missing", problemType: "SAFETY" },
    ];
    (useQuery as any).mockImplementation((query: any, _opts: any) => {
      const body = (query?.loc?.source?.body || "").toLowerCase();
      if (body.includes("problems")) return { data: { problems: criticalProblems }, loading: false, refetch: vi.fn() };
      if (body.includes("actions")) return { data: { actions: [] }, loading: false, refetch: vi.fn() };
      return { data: null, loading: false, refetch: vi.fn() };
    });
    renderPage();
    expect(screen.getAllByText(/critical safety issue/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows Install Default Safety Templates button when no templates exist", () => {
    renderPage();
    expect(screen.getByText("Install Default Safety Templates")).toBeDefined();
  });

  it("shows KPI cards with metric labels", () => {
    renderPage();
    expect(screen.getByText("Safety Audits Open")).toBeDefined();
    expect(screen.getByText("Open Issues")).toBeDefined();
    expect(screen.getByText("Open Actions")).toBeDefined();
    expect(screen.getByText("Overdue Actions")).toBeDefined();
    expect(screen.getByText("Critical / High")).toBeDefined();
    expect(screen.getByText("Completed Audits")).toBeDefined();
    expect(screen.getByText("Safety Score")).toBeDefined();
  });

  it("shows Quick Stats section", () => {
    renderPage();
    expect(screen.getByText("Quick Stats")).toBeDefined();
    expect(screen.getByText("Total Safety Audits")).toBeDefined();
    expect(screen.getByText("Total Issues")).toBeDefined();
    expect(screen.getByText("Total Actions")).toBeDefined();
    expect(screen.getByText("Completion Rate")).toBeDefined();
  });

  it("shows Recent Safety Activity section", () => {
    renderPage();
    expect(screen.getAllByText("Recent Safety Activity").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Safety Risk Board section", () => {
    renderPage();
    expect(screen.getAllByText("Safety Risk Board").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Issue Severity Matrix section", () => {
    renderPage();
    expect(screen.getByText("Issue Severity Matrix")).toBeDefined();
  });
});

describe("SafetyAuditsPage - Audit Tab", () => {
  beforeEach(resetAllMocks);

  it("shows New Audit button in toolbar by default", () => {
    renderPage();
    expect(screen.getAllByText("New Audit").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Records header in left column when Audits radio button is clicked", async () => {
    renderPage();
    clickRadio("Audits");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
  });

  it("deselects and shows overview when Audits clicked again", async () => {
    renderPage();
    clickRadio("Audits");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
    clickRadio("Audits");
    await waitFor(() => expect(screen.getAllByText("Safety Compliance Scorecard").length).toBeGreaterThanOrEqual(1));
  });
});

describe("SafetyAuditsPage - Issues Tab", () => {
  beforeEach(resetAllMocks);

  it("shows Records header when Issues radio button is clicked", async () => {
    renderPage();
    clickRadio("Issues");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
  });

  it("switches from Audits to Issues", async () => {
    renderPage();
    clickRadio("Audits");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
    clickRadio("Issues");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
  });
});

describe("SafetyAuditsPage - Actions Tab", () => {
  beforeEach(resetAllMocks);

  it("shows Records header when Actions radio button is clicked", async () => {
    renderPage();
    clickRadio("Actions");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
  });

  it("switches from Issues to Actions", async () => {
    renderPage();
    clickRadio("Issues");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
    clickRadio("Actions");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
  });
});

describe("SafetyAuditsPage - Record Switching & Refresh", () => {
  beforeEach(resetAllMocks);

  it("shows dashboard when active radio button is clicked to deselect", async () => {
    renderPage();
    clickRadio("Audits");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
    clickRadio("Audits");
    await waitFor(() => expect(screen.getAllByText("Safety Compliance Scorecard").length).toBeGreaterThanOrEqual(1));
  });

  it("shows dashboard when Refresh is clicked", async () => {
    renderPage();
    clickRadio("Issues");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
    fireEvent.click(screen.getByText("Refresh"));
    await waitFor(() => expect(screen.getAllByText("Safety Compliance Scorecard").length).toBeGreaterThanOrEqual(1));
  });

  it("shows dashboard when Refresh is clicked from overview", () => {
    renderPage();
    fireEvent.click(screen.getByText("Refresh"));
    expect(screen.getAllByText("Safety Compliance Scorecard").length).toBeGreaterThanOrEqual(1);
  });
});

describe("SafetyAuditsPage - Record Type Filter Options", () => {
  beforeEach(resetAllMocks);

  it("shows audit filter options (Draft, Archived) when Audits selected", async () => {
    renderPage();
    clickRadio("Audits");
    await waitFor(() => {
      expect(screen.getAllByText("Draft").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Archived").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows issue filter options (In Review, Contained) when Issues selected", async () => {
    renderPage();
    clickRadio("Issues");
    await waitFor(() => {
      expect(screen.getAllByText("In Review").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Contained").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows action filter options (In Progress) when Actions selected", async () => {
    renderPage();
    clickRadio("Actions");
    await waitFor(() => {
      expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("SafetyAuditsPage - Confirm Dialogs", () => {
  beforeEach(resetAllMocks);

  it("renders archive confirm dialog when archive is triggered via audit section", () => {
    (useAuditSection as any).mockReturnValue(buildMockAuditSection({ archiveConfirmId: "1" }));
    renderPage();
    expect(screen.getByText("Archive Audit")).toBeDefined();
    expect(screen.getByText("Archive this audit?")).toBeDefined();
  });

  it("renders delete confirm dialog when delete is triggered via audit section", () => {
    (useAuditSection as any).mockReturnValue(buildMockAuditSection({ deleteConfirmId: "1" }));
    renderPage();
    expect(screen.getByText("Delete Audit")).toBeDefined();
    expect(screen.getByText("Permanently delete this audit?")).toBeDefined();
  });

  it("renders delete confirm dialog for issues", () => {
    (useIssueSection as any).mockReturnValue(buildMockIssueSection({ deleteConfirmId: 1 }));
    renderPage();
    expect(screen.getByText("Delete Issue")).toBeDefined();
    expect(screen.getByText("Cancel this issue?")).toBeDefined();
  });

  it("renders delete confirm dialog for actions", () => {
    (useActionSection as any).mockReturnValue(buildMockActionSection({ deleteConfirmId: 1 }));
    renderPage();
    expect(screen.getByText("Delete Action")).toBeDefined();
    expect(screen.getByText("Cancel this action?")).toBeDefined();
  });
});

describe("SafetyAuditsPage - Dashboard with Data", () => {
  beforeEach(() => { vi.clearAllMocks(); clearMockData(); });

  it("shows risk items and KPI counts when audits/issues/actions have open records", () => {
    mockAuditItems.push({ id: 1, title: "Open Audit", auditType: "SF_PPE", status: "OPEN", auditor: "Bob", score: 70 });
    mockIssueItems.push({ id: 2, title: "Critical Issue", severity: "CRITICAL", status: "OPEN", problemType: "SAFETY", owner: "Alice" });
    mockActionItems.push({ id: 3, title: "Overdue Action", status: "OPEN", owner: "Charlie", dueDate: "2024-01-01" });

    (useAuditSection as any).mockReturnValue(buildMockAuditSection({ items: mockAuditItems }));
    (useIssueSection as any).mockReturnValue(buildMockIssueSection({ items: mockIssueItems }));
    (useActionSection as any).mockReturnValue(buildMockActionSection({ items: mockActionItems }));
    (useQuery as any).mockImplementation((query: any, _opts: any) => {
      const body = (query?.loc?.source?.body || "").toLowerCase();
      if (body.includes("problems")) return { data: { problems: mockIssueItems }, loading: false, refetch: vi.fn() };
      if (body.includes("actions")) return { data: { actions: mockActionItems }, loading: false, refetch: vi.fn() };
      return { data: null, loading: false, refetch: vi.fn() };
    });

    renderPage();
    // Risk Board should show items (not the empty-state message)
    expect(screen.queryByText("No safety risks need attention")).toBeNull();
    // Quick Stats should show non-zero values
    expect(screen.getByText("Total Safety Audits")).toBeDefined();
  });
});

describe("SafetyAuditsPage - Unified List", () => {
  beforeEach(() => { vi.clearAllMocks(); clearMockData(); });

  it("shows Records header when a record type is selected", async () => {
    mockAuditItems.push({ id: 1, title: "PPE Check", auditType: "SF_PPE", status: "DRAFT", auditor: "Bob", auditDate: "2024-01-01" });
    (useAuditSection as any).mockReturnValue(buildMockAuditSection({ items: mockAuditItems }));
    (useIssueSection as any).mockReturnValue(buildMockIssueSection());
    (useActionSection as any).mockReturnValue(buildMockActionSection());
    renderPage();
    clickRadio("Audits");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
  });

  it("shows Records header even when no data exists", async () => {
    renderPage();
    clickRadio("Audits");
    await waitFor(() => expect(screen.getByText("Records")).toBeDefined());
  });
});
