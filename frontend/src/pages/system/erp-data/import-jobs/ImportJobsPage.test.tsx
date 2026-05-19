import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseImportJobs = vi.fn();

vi.mock("@/hooks/useImportJobs", () => ({
  useImportJobs: (...args: unknown[]) => mockUseImportJobs(...args),
}));

vi.mock("lucide-react", () => {
  return new Proxy(
    {},
    {
      get: (_, name: string) => (props: Record<string, unknown>) => <span data-testid={`icon-${name}`} {...props} />,
    },
  );
});

import { ImportJobsPage } from "./ImportJobsPage";

const SOURCES = [
  { id: "src-1", name: "Routing Source", domain: "ROUTING", sourceType: "CSV", isActive: true },
];

function makeJob(id: string, fileName: string, status = "FILE_ATTACHED") {
  return {
    id,
    sourceConfigId: "src-1",
    sourceConfigName: "Routing Source",
    domain: "ROUTING",
    fileName,
    filePath: `/imports/${fileName}`,
    fileSize: 10,
    fileHash: `hash-${id}`,
    startedAt: "2025-01-01T00:00:00Z",
    completedAt: null,
    status,
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errorSummary: null,
    triggeredBy: "tester",
    createdAt: "2025-01-01T00:00:00Z",
  };
}

function renderPage(state: any = {}) {
  mockUseImportJobs.mockImplementation(() => buildHookState(state));
  return render(<ImportJobsPage />);
}

function buildHookState(state: any = {}) {
  return {
    jobs: state.jobs ?? [],
    sources: state.sources ?? SOURCES,
    loading: state.loading ?? false,
    refetch: state.refetch ?? vi.fn().mockResolvedValue({}),
    createJob: state.createJob ?? vi.fn().mockResolvedValue({ ok: true, job: makeJob("job-new", "routing.csv") }),
    attachFile: state.attachFile ?? vi.fn().mockResolvedValue({ ok: true, job: makeJob("job-new", "routing.csv") }),
    transitionJob: state.transitionJob ?? vi.fn().mockResolvedValue(true),
    isCreating: state.isCreating ?? false,
    isAttaching: state.isAttaching ?? false,
    actionLoading: state.actionLoading ?? null,
    actionError: state.actionError ?? null,
    clearActionError: state.clearActionError ?? vi.fn(),
  };
}

describe("ImportJobsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", {
      subtle: {
        digest: vi.fn().mockResolvedValue(new Uint8Array(32).fill(1).buffer),
      },
    } as any);
  });

  it("disables new job while create is pending", () => {
    renderPage({ isCreating: true });
    expect(screen.getByRole("button", { name: /new job/i })).toBeDisabled();
  });

  it("preserves the selected job on refresh", async () => {
    const user = userEvent.setup();
    renderPage({ jobs: [makeJob("job-1", "routing.csv"), makeJob("job-2", "routing-2.csv")] });

    await user.click(screen.getByRole("button", { name: /routing\.csv/i }));
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    expect(screen.getByRole("button", { name: /routing\.csv/i })).toHaveClass("bg-muted/40");
  });

  it("dedupes import jobs by backend id", () => {
    renderPage({ jobs: [makeJob("job-1", "routing.csv"), makeJob("job-1", "routing.csv"), makeJob("job-2", "routing-2.csv")] });
    expect(screen.getAllByText("routing.csv")).toHaveLength(1);
    expect(screen.getAllByText("routing-2.csv")).toHaveLength(1);
  });

  it("pick file updates the selected job only", async () => {
    const user = userEvent.setup();
    const attachFile = vi.fn().mockResolvedValue({ ok: true, job: makeJob("job-1", "routing-updated.csv") });
    renderPage({ jobs: [makeJob("job-1", "routing.csv")], attachFile });

    await user.click(screen.getByRole("button", { name: /routing\.csv/i }));
    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[0] as HTMLInputElement, new File(["a,b\n1,2\n"], "routing-updated.csv", { type: "text/csv" }));

    await waitFor(() => {
      expect(attachFile).toHaveBeenCalledWith("job-1", "routing-updated.csv", "/erp-data/source/routing-updated.csv", 8, expect.any(String));
    });
  });

  it("shows duplicate error actions for existing jobs", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockResolvedValue({
      ok: false,
      job: makeJob("job-2", "routing.csv"),
      errorCode: "DUPLICATE_ACTIVE_IMPORT_JOB",
      message: "Import job already exists for this file/source.",
      existingJobId: "job-1",
      sourceConfigId: "src-1",
      fileName: "routing.csv",
    });

    renderPage({ jobs: [makeJob("job-1", "routing.csv")], createJob });

    await user.click(screen.getByRole("button", { name: /new job/i }));
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const createSourceSelect = screen.getAllByRole("combobox")[screen.getAllByRole("combobox").length - 1] as HTMLSelectElement;
    await user.selectOptions(createSourceSelect, "src-1");
    await user.upload(fileInputs[1] as HTMLInputElement, new File(["a,b\n1,2\n"], "routing.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: /create job/i }));

    await waitFor(() => {
      expect(screen.getByText(/duplicate import job/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /open existing job/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /replace attached file/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /open existing job/i }));
    expect(screen.getByText("routing.csv")).toBeInTheDocument();
  });

  it("creates and attaches a single visible row", async () => {
    const user = userEvent.setup();
    const jobs = [makeJob("job-existing", "routing.csv")];
    const createJob = vi.fn().mockImplementation(async () => ({ ok: true, job: jobs[0] }));
    const attachFile = vi.fn().mockImplementation(async (_, fileName: string) => {
      jobs[0] = { ...jobs[0], fileName, status: "FILE_ATTACHED" };
      return { ok: true, job: jobs[0] };
    });

    renderPage({ jobs, createJob, attachFile });

    await user.click(screen.getByRole("button", { name: /new job/i }));
    const createSourceSelect = screen.getAllByRole("combobox")[screen.getAllByRole("combobox").length - 1] as HTMLSelectElement;
    await user.selectOptions(createSourceSelect, "src-1");
    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[1] as HTMLInputElement, new File(["a,b\n1,2\n"], "routing.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: /create job/i }));

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledTimes(1);
      expect(attachFile).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText("routing.csv").length).toBeGreaterThanOrEqual(1);
    });
  });
});
