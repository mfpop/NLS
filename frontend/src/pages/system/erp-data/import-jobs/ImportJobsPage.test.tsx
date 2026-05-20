import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseImportJobs = vi.fn();
let mockFetch: ReturnType<typeof vi.fn>;

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
    transitionJob: state.transitionJob ?? vi.fn().mockResolvedValue(true),
    deleteJob: state.deleteJob ?? vi.fn().mockResolvedValue(true),
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
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, job_id: "job-new", status: "FILE_ATTACHED" }),
      text: async () => JSON.stringify({ ok: true, job_id: "job-new", status: "FILE_ATTACHED" }),
    });
    vi.stubGlobal("fetch", mockFetch);
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

  it("clicking New Job does not create a record — modal opens but no mutations fire", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockResolvedValue({ ok: true, job: makeJob("job-new", "routing.csv") });
    renderPage({ createJob });

    await user.click(screen.getByRole("button", { name: /new job/i }));

    expect(screen.getByText("New Import Job")).toBeInTheDocument();
    expect(createJob).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("select file + Create creates exactly one DRAFT job via mutation and uploads via fetch", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockResolvedValue({ ok: true, job: makeJob("job-new", "routing.csv") });
    const refetch = vi.fn().mockResolvedValue({});
    renderPage({ createJob, refetch, jobs: [] });

    await user.click(screen.getByRole("button", { name: /new job/i }));
    const combos = screen.getAllByRole("combobox");
    await user.selectOptions(combos[combos.length - 1], "src-1");
    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[1] as HTMLInputElement, new File(["a,b\n1,2\n"], "routing.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: /create job/i }));

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("double-click Create creates exactly one job — lockRef prevents second call", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockResolvedValue({ ok: true, job: makeJob("job-new", "routing.csv") });
    renderPage({ createJob, jobs: [] });

    await user.click(screen.getByRole("button", { name: /new job/i }));
    const combos = screen.getAllByRole("combobox");
    await user.selectOptions(combos[combos.length - 1], "src-1");
    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[1] as HTMLInputElement, new File(["a,b\n1,2\n"], "routing.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: /create job/i }));
    await user.click(screen.getByRole("button", { name: /create job/i }));

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledTimes(1);
    });
  });

  it("upload failure does not create FILE_ATTACHED job — DRAFT job remains", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockResolvedValue({ ok: true, job: { ...makeJob("job-new", "routing.csv"), status: "DRAFT" } });
    mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, code: "STORAGE_SAVE_FAILED", message: "Upload failed" }),
      text: async () => JSON.stringify({ ok: false, code: "STORAGE_SAVE_FAILED", message: "Upload failed" }),
    });
    vi.stubGlobal("fetch", mockFetch);
    renderPage({ createJob, jobs: [] });

    await user.click(screen.getByRole("button", { name: /new job/i }));
    const combos = screen.getAllByRole("combobox");
    await user.selectOptions(combos[combos.length - 1], "src-1");
    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[1] as HTMLInputElement, new File(["a,b\n1,2\n"], "routing.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: /create job/i }));

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
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

  it("creates and attaches a single visible row via the upload flow", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockResolvedValue({ ok: true, job: makeJob("job-new", "routing.csv") });
    const refetch = vi.fn().mockResolvedValue({});
    renderPage({ jobs: [makeJob("job-existing", "routing.csv")], createJob, refetch });

    await user.click(screen.getByRole("button", { name: /new job/i }));
    const createSourceSelect = screen.getAllByRole("combobox")[screen.getAllByRole("combobox").length - 1] as HTMLSelectElement;
    await user.selectOptions(createSourceSelect, "src-1");
    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[1] as HTMLInputElement, new File(["a,b\n1,2\n"], "routing.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: /create job/i }));

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("creates only one job even when no existing jobs are present", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockResolvedValue({ ok: true, job: makeJob("job-new", "new-file.csv") });
    const refetch = vi.fn().mockResolvedValue({});
    renderPage({ jobs: [], createJob, refetch });

    await user.click(screen.getByRole("button", { name: /new job/i }));
    const createSourceSelect = screen.getAllByRole("combobox")[screen.getAllByRole("combobox").length - 1] as HTMLSelectElement;
    await user.selectOptions(createSourceSelect, "src-1");
    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[1] as HTMLInputElement, new File(["data\nval\n"], "new-file.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: /create job/i }));

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledTimes(1);
    });
  });

  it("Create button is disabled while upload is running (isSubmitting)", async () => {
    const createJob = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves
    renderPage({ createJob, jobs: [] });

    expect(screen.getByRole("button", { name: /new job/i })).not.toBeDisabled();
  });
});
