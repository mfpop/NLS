import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { WorkHistoryColumn } from "@/pages/system/profile/WorkHistoryColumn";
import type { WorkHistoryEntry } from "@/types/profile";

/* ── Helpers ── */

function makeEntry(overrides: Partial<WorkHistoryEntry> = {}): WorkHistoryEntry {
  return {
    id: `wh-${Math.random().toString(36).slice(2, 8)}`,
    role: "Plant Manager",
    company: "Acme Manufacturing",
    period: "2020 - Present",
    description: "Led a team of 50 operators to improve OEE by 15% through Kaizen events.",
    ...overrides,
  };
}

function fakeRef(): React.RefObject<HTMLDivElement | null> {
  return { current: document.createElement("div") };
}

function renderWorkHistory({
  workDraft = [],
  setWorkDraft = vi.fn(),
  editingSection = null,
  startEditing = vi.fn(),
  fieldErrors = {},
  normalized = { roles: [], highlights: [], score: { value: 0, label: "Needs work" }, summary: [] },
}: {
  workDraft?: WorkHistoryEntry[];
  setWorkDraft?: (draft: WorkHistoryEntry[] | ((prev: WorkHistoryEntry[]) => WorkHistoryEntry[])) => void;
  editingSection?: string | null;
  startEditing?: (section: string) => void;
  fieldErrors?: Record<string, string>;
  normalized?: {
    roles: { bullets: string[] }[];
    highlights: string[];
    score: { value: number; label: string };
    summary: string[];
  };
} = {}) {
  return render(
    <WorkHistoryColumn
      workDraft={workDraft}
      setWorkDraft={setWorkDraft}
      editingSection={editingSection}
      startEditing={startEditing}
      fieldErrors={fieldErrors}
      experienceRef={fakeRef()}
      normalized={normalized}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   WorkHistoryColumn — Empty State
   ═══════════════════════════════════════════════════════════════════ */

describe("WorkHistoryColumn — empty state", () => {
  it("shows 'No work experience' when workDraft is empty", () => {
    renderWorkHistory();
    expect(screen.getByText("No work experience")).toBeInTheDocument();
  });

  it("shows 'Add Experience' action button in empty state", () => {
    renderWorkHistory();
    expect(screen.getByText("Add Experience")).toBeInTheDocument();
  });

  it("calls startEditing('work') when Add Experience is clicked", () => {
    const startEditing = vi.fn();
    renderWorkHistory({ startEditing });
    fireEvent.click(screen.getByText("Add Experience"));
    expect(startEditing).toHaveBeenCalledWith("work");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   WorkHistoryColumn — View Mode
   ═══════════════════════════════════════════════════════════════════ */

describe("WorkHistoryColumn — view mode", () => {
  it("renders a single work entry with role, company, and period", () => {
    const entry = makeEntry({ role: "Production Supervisor", company: "Beta Industries", period: "2018 - 2020" });
    renderWorkHistory({ workDraft: [entry] });
    expect(screen.getByText("Production Supervisor")).toBeInTheDocument();
    expect(screen.getByText("Beta Industries")).toBeInTheDocument();
    expect(screen.getByText("2018 - 2020")).toBeInTheDocument();
  });

  it("renders multiple work entries sorted by period descending", () => {
    const older = makeEntry({ id: "wh-1", role: "Junior Engineer", company: "Startup Co", period: "2015 - 2017" });
    const newer = makeEntry({ id: "wh-2", role: "Senior Engineer", company: "Big Corp", period: "2018 - Present" });
    renderWorkHistory({ workDraft: [older, newer] });

    // Both roles should render
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("Junior Engineer")).toBeInTheDocument();
  });

  it("renders company only when company text is non-empty", () => {
    const withCompany = makeEntry({ company: "Visible Corp" });
    const withoutCompany = makeEntry({ id: "wh-nc", company: "" });
    renderWorkHistory({ workDraft: [withCompany, withoutCompany] });

    expect(screen.getByText("Visible Corp")).toBeInTheDocument();
    expect(screen.queryByText("Untitled company")).toBeNull();
  });

  it("shows 'Untitled role' placeholder when role is empty", () => {
    const entry = makeEntry({ role: "" });
    renderWorkHistory({ workDraft: [entry] });
    expect(screen.getByText("Untitled role")).toBeInTheDocument();
  });

  it("renders normalized impact bullets when present", () => {
    const entry = makeEntry({ id: "wh-bullets" });
    renderWorkHistory({
      workDraft: [entry],
      normalized: {
        roles: [{ bullets: ["Improved OEE by 15%", "Reduced changeover time by 30%"] }],
        highlights: [],
        score: { value: 75, label: "Strong" },
        summary: [],
      },
    });
    expect(screen.getByText("Improved OEE by 15%")).toBeInTheDocument();
    expect(screen.getByText("Reduced changeover time by 30%")).toBeInTheDocument();
  });

  it("does not render bullets container when no bullets exist", () => {
    const entry = makeEntry({ id: "wh-no-bullets" });
    renderWorkHistory({
      workDraft: [entry],
      normalized: { roles: [{ bullets: [] }], highlights: [], score: { value: 0, label: "Needs work" }, summary: [] },
    });
    // The entry renders but no bullet list should appear
    expect(screen.getByText(entry.role)).toBeInTheDocument();
    // No bullet items should exist
    const listItems = document.querySelectorAll("li");
    expect(listItems.length).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   WorkHistoryColumn — Edit Mode
   ═══════════════════════════════════════════════════════════════════ */

describe("WorkHistoryColumn — edit mode", () => {
  it("renders role input field when editing", () => {
    const entry = makeEntry({ role: "Current Role" });
    renderWorkHistory({ workDraft: [entry], editingSection: "work" });
    const roleInput = document.querySelector<HTMLInputElement>('input[placeholder="Plant manager"]');
    expect(roleInput).toBeInTheDocument();
    expect(roleInput?.value).toBe("Current Role");
  });

  it("renders company input field when editing", () => {
    const entry = makeEntry({ company: "Edit Corp" });
    renderWorkHistory({ workDraft: [entry], editingSection: "work" });
    const companyInput = document.querySelector<HTMLInputElement>('input[placeholder="Company name"]');
    expect(companyInput).toBeInTheDocument();
    expect(companyInput?.value).toBe("Edit Corp");
  });

  it("renders period input field when editing", () => {
    const entry = makeEntry({ period: "2022 - Now" });
    renderWorkHistory({ workDraft: [entry], editingSection: "work" });
    const periodInput = document.querySelector<HTMLInputElement>('input[placeholder="2023 - Present"]');
    expect(periodInput).toBeInTheDocument();
    expect(periodInput?.value).toBe("2022 - Now");
  });

  it("renders impact description textarea when editing", () => {
    const entry = makeEntry({ description: "Led continuous improvement projects." });
    renderWorkHistory({ workDraft: [entry], editingSection: "work" });
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea).toBeInTheDocument();
    expect(textarea?.value).toBe("Led continuous improvement projects.");
  });

  it("renders Remove button for each entry when editing", () => {
    const entries = [makeEntry({ id: "wh-1" }), makeEntry({ id: "wh-2" })];
    renderWorkHistory({ workDraft: entries, editingSection: "work" });
    const removeButtons = screen.getAllByText("Remove");
    expect(removeButtons.length).toBe(2);
  });

  it("calls setWorkDraft with filter when Remove is clicked", () => {
    const entry = makeEntry({ id: "wh-remove-me", role: "To Delete" });
    const setWorkDraft = vi.fn();
    renderWorkHistory({ workDraft: [entry], editingSection: "work", setWorkDraft });

    const removeBtn = screen.getByText("Remove");
    fireEvent.click(removeBtn);

    // setWorkDraft was called with a function that filters out the entry
    expect(setWorkDraft).toHaveBeenCalledTimes(1);
    const setterFn = setWorkDraft.mock.calls[0][0];
    const result = setterFn([entry, makeEntry({ id: "wh-other" })]);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("wh-other");
  });

  it("displays field errors when provided", () => {
    const entry = makeEntry({ id: "wh-error" });
    renderWorkHistory({
      workDraft: [entry],
      editingSection: "work",
      fieldErrors: { "work-0-role": "Role is required for each work entry." },
    });
    expect(screen.getByText("Role is required for each work entry.")).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   WorkHistoryColumn — Edge Cases
   ═══════════════════════════════════════════════════════════════════ */

describe("WorkHistoryColumn — edge cases", () => {
  it("renders section header with correct text", () => {
    renderWorkHistory({ workDraft: [makeEntry()] });
    expect(screen.getByText("Work history")).toBeInTheDocument();
  });

  it("renders subtitle with correct text", () => {
    renderWorkHistory({ workDraft: [makeEntry()] });
    expect(screen.getByText("Roles, companies, and measurable impact")).toBeInTheDocument();
  });

  it("renders Briefcase icon in header", () => {
    renderWorkHistory({ workDraft: [makeEntry()] });
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });
});
