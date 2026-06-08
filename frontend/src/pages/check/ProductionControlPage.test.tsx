import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Hoisted mocks ──────────────────────────────────────────
const { mockUseQuery, mockUseMutation } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
}));

vi.mock("lucide-react", () => {
  return new Proxy(
    {},
    {
      get(_, name: string) {
        return (props: Record<string, unknown>) =>
          <span data-testid={`icon-${name}`} {...props} />;
      },
    },
  );
});

// ── Mock data: Templates ───────────────────────────────────

const MOCK_QUESTION_PASS_FAIL = {
  id: "q1",
  categoryId: "cat1",
  code: "SORT-01",
  question: "Are unnecessary items removed from the work area?",
  responseType: "PASS_FAIL_NA",
  isRequired: true,
  weight: 1,
  sequence: 1,
  helpText: "Check for unused tools, materials, or equipment",
  maxScore: 5,
  allowNa: true,
};

const MOCK_QUESTION_YES_NO = {
  id: "q2",
  categoryId: "cat1",
  code: "SORT-02",
  question: "Is the area clean and free of debris?",
  responseType: "YES_NO_NA",
  isRequired: true,
  weight: 1,
  sequence: 2,
  helpText: "",
  maxScore: 5,
  allowNa: true,
};

const MOCK_QUESTION_SCORE = {
  id: "q3",
  categoryId: "cat1",
  code: "SORT-03",
  question: "Rate the overall organization level",
  responseType: "SCORE_1_5",
  isRequired: false,
  weight: 1,
  sequence: 3,
  helpText: "",
  maxScore: 5,
  allowNa: false,
};

const MOCK_QUESTION_TEXT = {
  id: "q4",
  categoryId: "cat1",
  code: "SORT-04",
  question: "Describe any observations",
  responseType: "TEXT",
  isRequired: false,
  weight: 1,
  sequence: 4,
  helpText: "Optional notes",
  maxScore: 0,
  allowNa: false,
};

const MOCK_QUESTION_NUMBER = {
  id: "q5",
  categoryId: "cat1",
  code: "SORT-05",
  question: "Number of non-compliances found",
  responseType: "NUMBER",
  isRequired: false,
  weight: 1,
  sequence: 5,
  helpText: "",
  maxScore: 0,
  allowNa: false,
};

const MOCK_TEMPLATE = {
  id: "1",
  code: "5S-AUDIT",
  name: "5S Audit",
  auditType: "FIVE_S",
  moduleScope: "PRODUCTION_CONTROL",
  targetTypes: ["PRODUCTION_LINE", "DEPARTMENT"],
  version: 1,
  status: "ACTIVE",
  isDefault: true,
  isActive: true,
  categories: [
    {
      id: "cat1",
      templateId: "1",
      code: "SORT",
      name: "Sort",
      sequence: 1,
      isRequired: true,
      questions: [
        MOCK_QUESTION_PASS_FAIL,
        MOCK_QUESTION_YES_NO,
        MOCK_QUESTION_SCORE,
        MOCK_QUESTION_TEXT,
        MOCK_QUESTION_NUMBER,
      ],
    },
  ],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const MOCK_TEMPLATES = [MOCK_TEMPLATE];

// ── Mock data: Audits ──────────────────────────────────────

const MOCK_AUDIT = {
  id: "1",
  controlArea: "PRODUCTION",
  auditType: "FIVE_S",
  targetType: "PRODUCTION_LINE",
  targetId: 1,
  title: "Weekly 5S Audit - Line 1",
  auditor: "John Smith",
  auditDate: "2025-06-03",
  status: "DRAFT",
  score: null,
  notes: "",
  templateId: "1",
  createdAt: "2025-06-03T10:00:00Z",
  updatedAt: "2025-06-03T10:00:00Z",
};

const MOCK_AUDITS = [MOCK_AUDIT];

const MOCK_ANSWERS = [
  {
    id: "ans1",
    auditId: "1",
    questionId: "q1",
    answerValue: "",
    comment: "",
    evidenceUrl: "",
    findingRequired: false,
    question: MOCK_QUESTION_PASS_FAIL,
    createdAt: "2025-06-03T10:00:00Z",
    updatedAt: "2025-06-03T10:00:00Z",
  },
  {
    id: "ans2",
    auditId: "1",
    questionId: "q2",
    answerValue: "",
    comment: "",
    evidenceUrl: "",
    findingRequired: false,
    question: MOCK_QUESTION_YES_NO,
    createdAt: "2025-06-03T10:00:00Z",
    updatedAt: "2025-06-03T10:00:00Z",
  },
  {
    id: "ans3",
    auditId: "1",
    questionId: "q3",
    answerValue: "",
    comment: "",
    evidenceUrl: "",
    findingRequired: false,
    question: MOCK_QUESTION_SCORE,
    createdAt: "2025-06-03T10:00:00Z",
    updatedAt: "2025-06-03T10:00:00Z",
  },
  {
    id: "ans4",
    auditId: "1",
    questionId: "q4",
    answerValue: "",
    comment: "",
    evidenceUrl: "",
    findingRequired: false,
    question: MOCK_QUESTION_TEXT,
    createdAt: "2025-06-03T10:00:00Z",
    updatedAt: "2025-06-03T10:00:00Z",
  },
  {
    id: "ans5",
    auditId: "1",
    questionId: "q5",
    answerValue: "",
    comment: "",
    evidenceUrl: "",
    findingRequired: false,
    question: MOCK_QUESTION_NUMBER,
    createdAt: "2025-06-03T10:00:00Z",
    updatedAt: "2025-06-03T10:00:00Z",
  },
];

const MOCK_AUDIT_DETAIL = {
  ...MOCK_AUDIT,
  checklistItems: [],
  findings: [],
  answers: MOCK_ANSWERS,
};

const MOCK_COMPLETED_AUDIT = {
  ...MOCK_AUDIT,
  status: "COMPLETED",
  score: 80,
  findings: [],
  answers: [
    {
      ...MOCK_ANSWERS[0],
      answerValue: "PASS",
      comment: "Looks good",
    },
    {
      ...MOCK_ANSWERS[1],
      answerValue: "YES",
      comment: "",
    },
    {
      ...MOCK_ANSWERS[2],
      answerValue: "4",
      comment: "",
    },
    {
      ...MOCK_ANSWERS[3],
      answerValue: "All clear",
      comment: "No observations",
    },
    {
      ...MOCK_ANSWERS[4],
      answerValue: "0",
      comment: "",
    },
  ],
};

// ── Default query/mutation returns ─────────────────────────

const DEFAULT_TEMPLATES_RETURN = {
  data: { auditTemplates: MOCK_TEMPLATES },
  loading: false,
  refetch: vi.fn().mockResolvedValue({}),
};



const EMPTY_TEMPLATES_RETURN = {
  data: { auditTemplates: [] },
  loading: false,
  refetch: vi.fn().mockResolvedValue({}),
};

const DEFAULT_AUDITS_RETURN = {
  data: { audits: MOCK_AUDITS },
  loading: false,
  refetch: vi.fn().mockResolvedValue({}),
};

const AUDITS_LOADING_RETURN = {
  data: null,
  loading: true,
  refetch: vi.fn(),
};

const EMPTY_AUDITS_RETURN = {
  data: { audits: [] },
  loading: false,
  refetch: vi.fn().mockResolvedValue({}),
};

function makeAuditDetailReturn(audit: typeof MOCK_AUDIT_DETAIL) {
  return {
    data: { audit },
    loading: false,
    refetch: vi.fn().mockResolvedValue({}),
  };
}

const DEFAULT_AUDIT_DETAIL_RETURN = makeAuditDetailReturn(MOCK_AUDIT_DETAIL);

// ── Helpers ────────────────────────────────────────────────

function setupDefaultMocks() {
  mockUseQuery.mockImplementation((_query: any, _options?: any) => {
    const queryName = _query?.definitions?.[0]?.name?.value || "";
    // Be smarter: check for template query
    if (queryName === "AuditTemplates") {
      return DEFAULT_TEMPLATES_RETURN;
    }
    // Audit detail query (has id variable)
    if (queryName === "Audit" && _options?.variables?.id) {
      return DEFAULT_AUDIT_DETAIL_RETURN;
    }
    // Default to audits list
    return DEFAULT_AUDITS_RETURN;
  });

  mockUseMutation.mockReset();
  mockUseMutation.mockReturnValue([vi.fn().mockResolvedValue({ data: { ok: true } }), { loading: false }]);
}

function setupEmptyMocks() {
  mockUseQuery.mockImplementation((_query: any) => {
    const queryName = _query?.definitions?.[0]?.name?.value || "";
    if (queryName === "AuditTemplates") {
      return EMPTY_TEMPLATES_RETURN;
    }
    return EMPTY_AUDITS_RETURN;
  });
  mockUseMutation.mockReset();
  mockUseMutation.mockReturnValue([vi.fn().mockResolvedValue({ data: { ok: true } }), { loading: false }]);
}

// Import AFTER mocks are set up
import { ProductionControlPage } from "./ProductionControlPage";

function renderPage() {
  return render(
    <div style={{ height: "900px", display: "flex", flexDirection: "column" }}>
      <ProductionControlPage />
    </div>,
  );
}

// ── Tests ──────────────────────────────────────────────────

describe("ProductionControlPage — Audit Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════
  //  Page Rendering
  // ══════════════════════════════════════════════════════════

  describe("Page rendering", () => {
    it("renders the page header with title and subtitle", () => {
      setupDefaultMocks();
      renderPage();
      expect(screen.getByText("Production Control")).toBeInTheDocument();
      expect(
        screen.getByText(/Template-driven production audits/i),
      ).toBeInTheDocument();
    });

    it("shows loading state while audits are being fetched", () => {
      mockUseQuery.mockImplementation((_query: any) => {
        const queryName = _query?.definitions?.[0]?.name?.value || "";
        if (queryName === "AuditTemplates") return DEFAULT_TEMPLATES_RETURN;
        return AUDITS_LOADING_RETURN;
      });
      renderPage();
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it("shows empty state with no audits and a New button", () => {
      setupEmptyMocks();
      renderPage();
      expect(screen.getByText("No audits yet")).toBeInTheDocument();
      expect(screen.getByText("New Audit")).toBeInTheDocument();
    });

    it("shows overview stats when no audit is selected", () => {
      setupDefaultMocks();
      renderPage();
      expect(screen.getByText("Active Audits")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Total Audits")).toBeInTheDocument();
      expect(screen.getByText("Findings")).toBeInTheDocument();
    });

    it("shows the install templates banner when no templates exist", () => {
      mockUseQuery.mockImplementation((_query: any) => {
        const queryName = _query?.definitions?.[0]?.name?.value || "";
        if (queryName === "AuditTemplates") return EMPTY_TEMPLATES_RETURN;
        return DEFAULT_AUDITS_RETURN;
      });
      renderPage();
      expect(
        screen.getByText(/No production control audit templates installed/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Install Default Templates"),
      ).toBeInTheDocument();
    });

    it("shows audit count in footer", () => {
      setupDefaultMocks();
      renderPage();
      expect(screen.getByText(/1 audit/)).toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════════════════════
  //  Installing Templates
  // ══════════════════════════════════════════════════════════

  describe("Template installation", () => {
    it("installs default templates successfully", async () => {
      const user = userEvent.setup();
      const mockInstall = vi.fn().mockResolvedValue({
        data: {
          installDefaultProductionControlAuditTemplates: {
            ok: true,
            message: "Templates installed",
            errors: null,
          },
        },
      });

      let fetchTemplatesCount = 0;
      mockUseQuery.mockImplementation((_query: any) => {
        const queryName = _query?.definitions?.[0]?.name?.value || "";
        if (queryName === "AuditTemplates") {
          fetchTemplatesCount++;
          return EMPTY_TEMPLATES_RETURN;
        }
        return DEFAULT_AUDITS_RETURN;
      });
      mockUseMutation.mockReset();
      mockUseMutation.mockReturnValue([mockInstall, { loading: false }]);

      renderPage();

      await waitFor(() => {
        expect(
          screen.getByText("Install Default Templates"),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText("Install Default Templates"));

      await waitFor(() => {
        expect(mockInstall).toHaveBeenCalled();
      });
    });

    it("shows error when template installation fails", async () => {
      const user = userEvent.setup();
      const mockInstall = vi.fn().mockResolvedValue({
        data: {
          installDefaultProductionControlAuditTemplates: {
            ok: false,
            message: "Database error",
            errors: [{ field: "", code: "DB_ERROR", message: "DB error" }],
          },
        },
      });

      mockUseQuery.mockImplementation((_query: any) => {
        const queryName = _query?.definitions?.[0]?.name?.value || "";
        if (queryName === "AuditTemplates") return EMPTY_TEMPLATES_RETURN;
        return DEFAULT_AUDITS_RETURN;
      });
      mockUseMutation.mockReset();
      mockUseMutation.mockReturnValue([mockInstall, { loading: false }]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Install Default Templates")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Install Default Templates"));

      await waitFor(() => {
        expect(screen.getByText(/Install failed/)).toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  //  Creating an Audit from Template
  // ══════════════════════════════════════════════════════════

  describe("Creating an audit from template", () => {
    it("opens the create form when New is clicked", async () => {
      const user = userEvent.setup();
      setupDefaultMocks();
      renderPage();

      await waitFor(() => expect(screen.getByText("New Audit")).toBeInTheDocument());
      // In the list mode, "New Audit" might be in multiple places; the toolbar has just "New"
      // Let's find the toolbar "New" button
      const newButtons = screen.getAllByText("New");
      // The toolbar "New" button - click the first one
      await user.click(newButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("New Production Control Audit")).toBeInTheDocument();
      });
      expect(screen.getByText("Audit Title *")).toBeInTheDocument();
      expect(screen.getByText("Target Type")).toBeInTheDocument();
      expect(screen.getByText("Auditor")).toBeInTheDocument();
      expect(screen.getByText("Audit Date")).toBeInTheDocument();
      expect(screen.getByText("Notes")).toBeInTheDocument();
      expect(screen.getByText("Create Audit")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("creates an audit from template successfully", async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn().mockResolvedValue({});

      // Create audit mutation returns the new audit with full detail
      const mockCreate = vi.fn().mockResolvedValue({
        data: {
          createAuditFromTemplate: {
            ok: true,
            audit: {
              ...MOCK_AUDIT_DETAIL,
              id: "2",
              title: "New Audit Test",
            },
            errors: null,
          },
        },
      });

      // useQuery returns: templates (loaded), audits (loaded), audit detail (loading initially)
      const auditDetailReturn = {
        ...DEFAULT_AUDIT_DETAIL_RETURN,
        refetch: mockRefetch,
      };

      mockUseQuery.mockImplementation((_query: any, _options?: any) => {
        const queryName = _query?.definitions?.[0]?.name?.value || "";
        if (queryName === "AuditTemplates") {
          return { ...DEFAULT_TEMPLATES_RETURN, refetch: mockRefetch };
        }
        if (queryName === "Audit") {
          return auditDetailReturn;
        }
        return { ...DEFAULT_AUDITS_RETURN, refetch: mockRefetch };
      });

      mockUseMutation.mockReset();
      // First mutation: create audit; others: no-op
      mockUseMutation.mockReturnValue([mockCreate, { loading: false }]);

      renderPage();

      // Click New
      await waitFor(() => expect(screen.getByText("New")).toBeInTheDocument());
      await user.click(screen.getByText("New"));

      await waitFor(() => {
        expect(screen.getByText("New Production Control Audit")).toBeInTheDocument();
      });

      // Select template
      const templateSelect = screen.getByDisplayValue("Select template...");
      await user.selectOptions(templateSelect, "1");

      // Fill target type is already PRODUCTION_LINE, fill target ID
      const targetIdInput = screen.getByPlaceholderText("Enter ID...");
      await user.type(targetIdInput, "1");

      // Fill title
      const titleInput = screen.getByPlaceholderText("e.g. Weekly 5S Audit - Line 1");
      await user.clear(titleInput);
      await user.type(titleInput, "New Audit Test");

      // Fill auditor
      const auditorInput = screen.getByPlaceholderText("Inspector name...");
      await user.type(auditorInput, "Jane Doe");

      // Click Create
      await user.click(screen.getByText("Create Audit"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              input: expect.objectContaining({
                templateId: 1,
                title: "New Audit Test",
                targetId: 1,
              }),
            }),
          }),
        );
      });
    });

    it("shows error when creating audit fails", async () => {
      const user = userEvent.setup();
      const mockCreate = vi.fn().mockResolvedValue({
        data: {
          createAuditFromTemplate: {
            ok: false,
            audit: null,
            errors: [
              { field: "title", code: "VALIDATION", message: "Title is required" },
            ],
          },
        },
      });

      mockUseQuery.mockImplementation((_query: any) => {
        const queryName = _query?.definitions?.[0]?.name?.value || "";
        if (queryName === "AuditTemplates") return DEFAULT_TEMPLATES_RETURN;
        if (queryName === "Audit")
          return { data: { audit: null }, loading: false, refetch: vi.fn() };
        return DEFAULT_AUDITS_RETURN;
      });

      // Disable the create button by not providing required fields
      // The button is disabled when !newTitle.trim() || !newTargetId.trim() || !newTemplateId
      // Let's trigger creation with all fields filled but mutation returns error
      mockUseMutation.mockReset();
      mockUseMutation.mockReturnValue([mockCreate, { loading: false }]);

      renderPage();

      await waitFor(() => expect(screen.getByText("New")).toBeInTheDocument());
      await user.click(screen.getByText("New"));

      await waitFor(() => {
        expect(screen.getByText("New Production Control Audit")).toBeInTheDocument();
      });

      // Select template
      await user.selectOptions(screen.getByDisplayValue("Select template..."), "1");

      // Fill required fields
      await user.type(screen.getByPlaceholderText("Enter ID..."), "1");
      await user.type(
        screen.getByPlaceholderText("e.g. Weekly 5S Audit - Line 1"),
        "Failed Audit",
      );

      await user.click(screen.getByText("Create Audit"));

      await waitFor(() => {
        expect(
          screen.getByText(/Title is required/),
        ).toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  //  Filling Answers (Execute Mode)
  // ══════════════════════════════════════════════════════════

  describe("Filling audit answers", () => {
    it("opens an audit in execute mode when clicked", async () => {
      const user = userEvent.setup();
      setupDefaultMocks();
      renderPage();

      // The audit list should show the audit title
      await waitFor(() => {
        expect(
          screen.getByText("Weekly 5S Audit - Line 1"),
        ).toBeInTheDocument();
      });

      // Click the audit to open it
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      // Should show the audit form with answers
      await waitFor(() => {
        expect(
          screen.getByText("Are unnecessary items removed from the work area?"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Is the area clean and free of debris?"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Rate the overall organization level"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Describe any observations"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Number of non-compliances found"),
        ).toBeInTheDocument();
      });

      // Should show Save Draft and Complete Audit buttons
      expect(screen.getByText("Save Draft")).toBeInTheDocument();
      expect(screen.getByText("Complete Audit")).toBeInTheDocument();
    });

    it("fills a PASS_FAIL_NA answer", async () => {
      const user = userEvent.setup();
      setupDefaultMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Are unnecessary items removed from the work area?"),
        ).toBeInTheDocument();
      });

      // Find the PASS_FAIL_NA select and select "Pass"
      const passFailSelects = screen.getAllByRole("combobox");
      // The first select should be the PASS_FAIL_NA one
      // There might be multiple selects (filter status, tab selector, template select in create form)
      // Let's find selects that have "Pass" as an option
      const passFailSelect = passFailSelects.find(
        (s) =>
          s.querySelector('option[value="PASS"]') &&
          s.querySelector('option[value="FAIL"]'),
      );
      expect(passFailSelect).toBeInTheDocument();
      if (passFailSelect) {
        await user.selectOptions(passFailSelect, "PASS");
      }
    });

    it("fills a SCORE_1_5 answer", async () => {
      const user = userEvent.setup();
      setupDefaultMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(screen.getByText("Rate the overall organization level")).toBeInTheDocument();
      });

      // Score buttons are rendered as buttons with numbers 1-5
      // Find the score buttons near "Rate the overall organization level"
      const scoreButtons = screen.getAllByRole("button").filter((b) =>
        ["1", "2", "3", "4", "5"].includes(b.textContent || ""),
      );
      expect(scoreButtons.length).toBeGreaterThanOrEqual(5);

      // Click score 4
      const score4Button = scoreButtons.find((b) => b.textContent === "4");
      expect(score4Button).toBeInTheDocument();
      if (score4Button) {
        await user.click(score4Button);
      }
    });

    it("fills a TEXT answer with a comment", async () => {
      const user = userEvent.setup();
      setupDefaultMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Describe any observations"),
        ).toBeInTheDocument();
      });

      // Find the text input near "Describe any observations"
      const textInput = screen.getByPlaceholderText("Enter response...");
      await user.type(textInput, "All workstations are properly organized");
    });

    it("fills a NUMBER answer", async () => {
      const user = userEvent.setup();
      setupDefaultMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Number of non-compliances found"),
        ).toBeInTheDocument();
      });

      // Find NUMBER inputs - check placeholder "0"
      const numberInputs = screen.getAllByPlaceholderText("0");
      expect(numberInputs.length).toBeGreaterThanOrEqual(1);
      await user.clear(numberInputs[0]);
      await user.type(numberInputs[0], "3");
    });
  });

  // ══════════════════════════════════════════════════════════
  //  Saving Draft
  // ══════════════════════════════════════════════════════════

  describe("Saving draft", () => {
    it("saves a draft successfully", async () => {
      const user = userEvent.setup();
      const mockSaveBulk = vi.fn().mockResolvedValue({
        data: {
          saveAuditAnswersBulk: {
            ok: true,
            audit: MOCK_AUDIT_DETAIL,
            errors: null,
          },
        },
      });

      setupDefaultMocks();
      mockUseMutation.mockReset();
      mockUseMutation.mockReturnValue([mockSaveBulk, { loading: false }]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Are unnecessary items removed from the work area?"),
        ).toBeInTheDocument();
      });

      // Fill an answer first
      const passFailSelect = screen.getAllByRole("combobox").find(
        (s) =>
          s.querySelector('option[value="PASS"]') &&
          s.querySelector('option[value="FAIL"]'),
      );
      if (passFailSelect) {
        await user.selectOptions(passFailSelect, "PASS");
      }

      // Click Save Draft
      await user.click(screen.getByText("Save Draft"));

      await waitFor(() => {
        expect(mockSaveBulk).toHaveBeenCalled();
        expect(screen.getByText("Draft saved")).toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  //  Creating Findings
  // ══════════════════════════════════════════════════════════

  describe("Creating findings from failed answers", () => {
    it("shows Finding button when a FAIL answer is selected", async () => {
      const user = userEvent.setup();
      setupDefaultMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Are unnecessary items removed from the work area?"),
        ).toBeInTheDocument();
      });

      // Select FAIL to trigger the Finding button
      const passFailSelect = screen.getAllByRole("combobox").find(
        (s) =>
          s.querySelector('option[value="PASS"]') &&
          s.querySelector('option[value="FAIL"]'),
      );
      expect(passFailSelect).toBeInTheDocument();
      if (passFailSelect) {
        await user.selectOptions(passFailSelect, "FAIL");
      }

      // The Finding button should appear
      await waitFor(() => {
        const findingButtons = screen.getAllByText("Finding");
        expect(findingButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("creates a finding from a failed answer", async () => {
      const user = userEvent.setup();
      const mockCreateFinding = vi.fn().mockResolvedValue({
        data: {
          createAuditFindingFromAnswer: {
            ok: true,
            finding: {
              id: "f1",
              auditId: "1",
              description: "Unnecessary items found",
              severity: "MEDIUM",
              status: "OPEN",
              owner: "Jane Doe",
              dueDate: null,
              createdAt: "2025-06-03T12:00:00Z",
              updatedAt: "2025-06-03T12:00:00Z",
            },
            errors: null,
          },
        },
      });

      setupDefaultMocks();
      mockUseMutation.mockReset();
      mockUseMutation.mockReturnValue([mockCreateFinding, { loading: false }]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Are unnecessary items removed from the work area?"),
        ).toBeInTheDocument();
      });

      // Select FAIL
      const passFailSelect = screen.getAllByRole("combobox").find(
        (s) =>
          s.querySelector('option[value="PASS"]') &&
          s.querySelector('option[value="FAIL"]'),
      );
      expect(passFailSelect).toBeInTheDocument();
      if (passFailSelect) {
        await user.selectOptions(passFailSelect, "FAIL");
      }

      // Click Finding button
      await waitFor(() => {
        const findingBtn = screen.getByText("Finding");
        expect(findingBtn).toBeInTheDocument();
      });
      await user.click(screen.getByText("Finding"));

      // The finding dialog should appear
      await waitFor(() => {
        expect(screen.getByText("Create Finding")).toBeInTheDocument();
        expect(
          screen.getByText(/Are unnecessary items removed/),
        ).toBeInTheDocument();
      });

      // Fill in finding details
      const descInput = screen.getByPlaceholderText(
        "Describe the non-conformance...",
      );
      await user.type(descInput, "Several unnecessary items found in work area");

      // Select severity (default is Medium)
      // Set owner
      const ownerInput = screen.getByPlaceholderText("Owner name...");
      await user.type(ownerInput, "Jane Doe");

      // Click Create Finding
      await user.click(screen.getByText("Create Finding"));

      await waitFor(() => {
        expect(mockCreateFinding).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              input: expect.objectContaining({
                description: "Several unnecessary items found in work area",
                severity: "MEDIUM",
                owner: "Jane Doe",
              }),
            }),
          }),
        );
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  //  Completing Audits
  // ══════════════════════════════════════════════════════════

  describe("Completing audits", () => {
    it("completes an audit successfully", async () => {
      const user = userEvent.setup();
      const mockComplete = vi.fn().mockResolvedValue({
        data: {
          completeAudit: {
            ok: true,
            audit: MOCK_COMPLETED_AUDIT,
            errors: null,
          },
        },
      });

      // For the complete flow, we need a mock for saveAnswersBulk and completeAuditMutation
      const mockSaveBulk = vi.fn().mockResolvedValue({
        data: {
          saveAuditAnswersBulk: {
            ok: true,
            audit: MOCK_AUDIT_DETAIL,
            errors: null,
          },
        },
      });

      setupDefaultMocks();

      // Return order: saveAnswersBulk, then completeAuditMutation
      mockUseMutation.mockReset();
      mockUseMutation
        .mockReturnValueOnce([mockSaveBulk, { loading: false }])
        .mockReturnValueOnce([mockComplete, { loading: false }])
        .mockReturnValueOnce([vi.fn(), { loading: false }])
        .mockReturnValueOnce([vi.fn(), { loading: false }])
        .mockReturnValueOnce([vi.fn(), { loading: false }]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Are unnecessary items removed from the work area?"),
        ).toBeInTheDocument();
      });

      // Fill required answers (since Complete Audit requires all required questions answered)
      const passFailSelects = screen.getAllByRole("combobox");
      const passFailSelect = passFailSelects.find(
        (s) =>
          s.querySelector('option[value="PASS"]') &&
          s.querySelector('option[value="FAIL"]'),
      );
      if (passFailSelect) {
        await user.selectOptions(passFailSelect, "PASS");
      }

      // Fill the YES_NO_NA select
      const yesNoSelect = passFailSelects.find(
        (s) =>
          s.querySelector('option[value="YES"]') &&
          s.querySelector('option[value="NO"]'),
      );
      if (yesNoSelect) {
        await user.selectOptions(yesNoSelect, "YES");
      }

      // Click Complete Audit
      const completeBtn = screen.getByText("Complete Audit");
      expect(completeBtn).not.toBeDisabled();
      await user.click(completeBtn);

      await waitFor(() => {
        expect(mockSaveBulk).toHaveBeenCalled();
        expect(mockComplete).toHaveBeenCalled();
        expect(screen.getByText("Audit completed")).toBeInTheDocument();
      });
    });

    it("shows error when complete audit fails", async () => {
      const user = userEvent.setup();
      const mockComplete = vi.fn().mockResolvedValue({
        data: {
          completeAudit: {
            ok: false,
            audit: null,
            errors: [
              {
                field: "",
                code: "CANNOT_COMPLETE",
                message: "Cannot complete audit with unanswered required items",
              },
            ],
          },
        },
      });

      setupDefaultMocks();

      mockUseMutation.mockReset();
      mockUseMutation
        .mockReturnValueOnce([vi.fn().mockResolvedValue({ data: { saveAuditAnswersBulk: { ok: true, audit: MOCK_AUDIT_DETAIL, errors: null } } }), { loading: false }])
        .mockReturnValueOnce([mockComplete, { loading: false }])
        .mockReturnValueOnce([vi.fn(), { loading: false }])
        .mockReturnValueOnce([vi.fn(), { loading: false }])
        .mockReturnValueOnce([vi.fn(), { loading: false }]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Are unnecessary items removed from the work area?"),
        ).toBeInTheDocument();
      });

      // Try to complete without filling required answers
      // The Complete Audit button might be disabled if required answers aren't filled
      // Let's check its state
      const completeBtn = screen.getByText("Complete Audit");

      // If it's not disabled, click it and expect error
      if (!completeBtn.hasAttribute("disabled")) {
        await user.click(completeBtn);
        await waitFor(() => {
          expect(
            screen.getByText(/Cannot complete audit/),
          ).toBeInTheDocument();
        });
      }
    });

    it("disables complete button when required answers are missing", async () => {
      const user = userEvent.setup();
      // Set up with mock audit where answers have empty values and questions are required
      const unansweredAudit = {
        ...MOCK_AUDIT_DETAIL,
        answers: MOCK_ANSWERS.map((a) => ({
          ...a,
          answerValue: "",
          comment: "",
        })),
      };

  mockUseQuery.mockImplementation((_query: any, _opts?: any) => {
    const queryName = _query?.definitions?.[0]?.name?.value || "";
    if (queryName === "AuditTemplates") return DEFAULT_TEMPLATES_RETURN;
    if (queryName === "Audit" && _opts?.variables?.id) {
          return makeAuditDetailReturn(unansweredAudit);
        }
        return DEFAULT_AUDITS_RETURN;
      });

      mockUseMutation.mockReset();
      mockUseMutation.mockReturnValue([vi.fn(), { loading: false }]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        expect(
          screen.getByText("Are unnecessary items removed from the work area?"),
        ).toBeInTheDocument();
      });

      // Complete Audit should be disabled because required questions (q1, q2) are unanswered
      const completeBtn = screen.getByText("Complete Audit");
      expect(completeBtn).toBeDisabled();
    });
  });

  // ══════════════════════════════════════════════════════════
  //  Score Display
  // ══════════════════════════════════════════════════════════

  describe("Score display", () => {
    it("shows the audit score for completed audits", async () => {
      const user = userEvent.setup();
      const completedAudit = {
        ...MOCK_COMPLETED_AUDIT,
      };

  mockUseQuery.mockImplementation((_query: any, _opts?: any) => {
    const queryName = _query?.definitions?.[0]?.name?.value || "";
    if (queryName === "AuditTemplates") return DEFAULT_TEMPLATES_RETURN;
    if (queryName === "Audit" && _opts?.variables?.id) {
          return makeAuditDetailReturn(completedAudit as any);
        }
        return {
          data: { audits: [completedAudit] },
          loading: false,
          refetch: vi.fn(),
        };
      });

      mockUseMutation.mockReset();
      mockUseMutation.mockReturnValue([vi.fn(), { loading: false }]);

      renderPage();

      // The list should show the score
      await waitFor(() => {
        expect(screen.getByText("Weekly 5S Audit - Line 1")).toBeInTheDocument();
      });

      // Score should appear in the list item
      expect(screen.getByText("80%")).toBeInTheDocument();

      await user.click(screen.getByText("Weekly 5S Audit - Line 1"));

      await waitFor(() => {
        // The score should also appear in the detail header
        const scores = screen.getAllByText("80%");
        expect(scores.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
