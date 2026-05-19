import { useState, useMemo, useRef, useCallback, type ChangeEvent } from "react";
import {
  Upload, Search, Plus, RefreshCw, Eye, CheckCircle, GitCompare,
  Play, XCircle, FileSpreadsheet, FolderOpen,
  AlertTriangle, ListChecks,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { useImportJobs } from "@/hooks/useImportJobs";

const STATUS_FLOW: Record<string, { label: string; icon: typeof Upload; color: string; next: string[] }> = {
  DRAFT: { label: "Draft", icon: FileSpreadsheet, color: "text-slate-500", next: ["FILE_ATTACHED"] },
  FILE_ATTACHED: { label: "File Attached", icon: Upload, color: "text-cyan-500", next: ["PREVIEWED"] },
  PREVIEWED: { label: "Previewed", icon: Eye, color: "text-blue-500", next: ["VALIDATED"] },
  VALIDATED: { label: "Validated", icon: CheckCircle, color: "text-teal-500", next: ["COMPARED"] },
  COMPARED: { label: "Compared", icon: GitCompare, color: "text-indigo-500", next: ["READY_TO_APPLY"] },
  READY_TO_APPLY: { label: "Ready to Apply", icon: ListChecks, color: "text-amber-500", next: ["APPLIED"] },
  APPLIED: { label: "Applied", icon: Play, color: "text-emerald-500", next: [] },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "text-red-500", next: [] },
  PREVIEW_FAILED: { label: "Preview Failed", icon: AlertTriangle, color: "text-red-500", next: ["DRAFT", "FILE_ATTACHED"] },
  VALIDATION_FAILED: { label: "Validation Failed", icon: AlertTriangle, color: "text-red-500", next: ["DRAFT", "FILE_ATTACHED"] },
  COMPARE_FAILED: { label: "Compare Failed", icon: AlertTriangle, color: "text-red-500", next: ["VALIDATED"] },
  APPLY_FAILED: { label: "Apply Failed", icon: AlertTriangle, color: "text-red-500", next: ["READY_TO_APPLY"] },
};

const STATUS_STEPS = ["DRAFT", "FILE_ATTACHED", "PREVIEWED", "VALIDATED", "COMPARED", "READY_TO_APPLY", "APPLIED"];

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:pointer-events-none disabled:opacity-50`;

function dedupeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function ImportJobsPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobSource, setNewJobSource] = useState("");
  const [newJobFile, setNewJobFile] = useState<File | null>(null);
  const [newJobError, setNewJobError] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<{ message: string; existingJobId: string | null; mode: "create" | "attach" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const newJobFileRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createLockRef = useRef(false);
  const attachLockRef = useRef(false);

  const {
    jobs, sources, loading, refetch,
    createJob, attachFile, transitionJob,
    isCreating, isAttaching, actionLoading, actionError, clearActionError,
  } = useImportJobs(sourceFilter, statusFilter, showAllJobs);

  const jobsById = useMemo(() => dedupeById(jobs), [jobs]);

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobsById.filter((j) =>
      j.fileName.toLowerCase().includes(q) ||
      j.sourceConfigName.toLowerCase().includes(q) ||
      j.status.toLowerCase().includes(q)
    );
  }, [jobsById, search]);

  const selectedJob = useMemo(() => jobsById.find((j) => j.id === selectedJobId) ?? null, [jobsById, selectedJobId]);

  const statusStep = selectedJob ? STATUS_STEPS.indexOf(selectedJob.status) : -1;
  const hasFile = selectedJob ? selectedJob.status !== "DRAFT" : false;

const canTransition = (action: string) => {
  if (!selectedJob) return false;
  if (!hasFile && action === "PREVIEW") return false;
  if(selectedJob.status === "FILE_ATTACHED" && action === "PREVIEW") return true;
    const flow = STATUS_FLOW[selectedJob.status];
    if (!flow) return false;
    if (action === "PREVIEW") return flow.next.includes("PREVIEWED");
    if (action === "VALIDATE") return flow.next.includes("VALIDATED");
    if (action === "COMPARE") return flow.next.includes("COMPARED");
    if (action === "APPLY") return flow.next.includes("READY_TO_APPLY") || flow.next.includes("APPLIED");
    if (action === "CANCEL") return selectedJob.status !== "CANCELLED" && selectedJob.status !== "APPLIED";
    if (action === "RETRY") return ["PREVIEW_FAILED", "VALIDATION_FAILED", "COMPARE_FAILED", "APPLY_FAILED"].includes(selectedJob.status);
    return false;
  };

  const handleAction = useCallback(async (action: string, jobId: string) => {
    clearActionError();
    try {
      const ok = await transitionJob(action, jobId);
      if (ok) {
        refetch();
      }
    } catch (err) {
      clearActionError();
      throw err;
    }
  }, [transitionJob, clearActionError, refetch]);

  const handleOpenNewJob = () => {
    setNewJobSource(sources[0]?.id ?? "");
    setNewJobFile(null);
    setNewJobError(null);
    setShowNewJobModal(true);
  };

  const handleNewJobFilePick = () => {
    newJobFileRef.current?.click();
  };

  const handleNewJobFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) setNewJobFile(file);
  };

  const handleNewJobSourceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setNewJobSource(event.target.value);
  };

  const handleConfirmNewJob = async () => {
    if (createLockRef.current) return;
    if (!newJobSource) {
      setNewJobError("Select an import source.");
      return;
    }
    if (!newJobFile) {
      setNewJobError("Select a file.");
      return;
    }
    createLockRef.current = true;
    setIsSubmitting(true);
    setNewJobError(null);
    try {
      const fileHash = await sha256Hex(newJobFile);
      const created = await createJob(newJobSource, newJobFile.name, fileHash);
      if (!created.ok || !created.job) {
        if (created.errorCode === "DUPLICATE_ACTIVE_IMPORT_JOB") {
          setDuplicateNotice({ message: created.message ?? "Import job already exists for this file/source.", existingJobId: created.existingJobId, mode: "create" });
          setShowNewJobModal(false);
          return;
        }
        setNewJobError(created.message ?? "Failed to create import job.");
        return;
      }
      const filePath = `/erp-data/source/${newJobFile.name}`;
      const updated = await attachFile(created.job.id, newJobFile.name, filePath, newJobFile.size, fileHash);
      if (!updated.ok || !updated.job) {
        if (updated.errorCode === "DUPLICATE_ACTIVE_IMPORT_JOB") {
          setDuplicateNotice({ message: updated.message ?? "Import job already exists for this file/source.", existingJobId: updated.existingJobId, mode: "attach" });
          setShowNewJobModal(false);
          return;
        }
        setNewJobError(updated.message ?? "Job created but file attach failed.");
        return;
      }
      setSelectedJobId(updated.job.id);
      setShowNewJobModal(false);
      refetch();
    } finally {
      setIsSubmitting(false);
      createLockRef.current = false;
    }
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (attachLockRef.current) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!selectedJobId) {
      clearActionError();
      return;
    }
    const fileHash = await sha256Hex(file);
    const filePath = `/erp-data/source/${file.name}`;
    attachLockRef.current = true;
    try {
      const updated = await attachFile(selectedJobId, file.name, filePath, file.size, fileHash);
      if (!updated.ok && updated.errorCode === "DUPLICATE_ACTIVE_IMPORT_JOB") {
        setDuplicateNotice({ message: updated.message ?? "Import job already exists for this file/source.", existingJobId: updated.existingJobId, mode: "attach" });
        return;
      }
      if (updated.ok && updated.job) {
        refetch();
      }
    } finally {
      attachLockRef.current = false;
    }
  };

  const handleOpenExistingJob = () => {
    if (duplicateNotice?.existingJobId) {
      setSelectedJobId(duplicateNotice.existingJobId);
    }
    setDuplicateNotice(null);
  };

  const handleReplaceAttachedFile = () => {
    setDuplicateNotice(null);
    if (duplicateNotice?.mode === "create") {
      setShowNewJobModal(true);
      window.setTimeout(() => newJobFileRef.current?.click(), 0);
      return;
    }
    fileInputRef.current?.click();
  };

  const allStatuses = Object.keys(STATUS_FLOW);

  return (
    <AppPageLayout
      title="Import Jobs"
      subtitle="Run and monitor file imports for ERP data integration."
      icon={<Upload />}
      iconClass="text-indigo-600"
    >
      <div className="flex flex-col h-full overflow-hidden">

        {duplicateNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-lg bg-card border border-border/30 shadow-lg">
              <div className="px-4 py-3 border-b border-border/20">
                <h3 className="text-sm font-semibold text-foreground">Duplicate Import Job</h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">{duplicateNotice.message}</p>
                <div className="rounded border border-border/20 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  Existing job: {duplicateNotice.existingJobId || "unknown"}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/20">
                <button type="button" onClick={handleOpenExistingJob} className="h-8 px-3 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Open existing job
                </button>
                <button type="button" onClick={handleReplaceAttachedFile} className="h-8 px-3 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Replace attached file
                </button>
                <button type="button" onClick={() => setDuplicateNotice(null)} className="h-8 px-3 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- New Job Modal --- */}
        {showNewJobModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-lg bg-card border border-border/30 shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                <h3 className="text-sm font-semibold text-foreground">New Import Job</h3>
                <button type="button" onClick={() => setShowNewJobModal(false)} className={buttonClass}>
                  <XCircle className="h-4 w-4 stroke-current" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Import Source</label>
                  <select
                    value={newJobSource}
                    onChange={handleNewJobSourceChange}
                    className="h-8 w-full rounded border border-border/30 bg-card px-2 text-xs text-muted-foreground outline-none"
                  >
                    {sources.length === 0 && <option value="">No sources available</option>}
                    {sources.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.domain})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">File</label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={newJobFileRef}
                      type="file"
                      className="hidden"
                      onChange={handleNewJobFileChange}
                    />
                    <button
                      type="button"
                      onClick={handleNewJobFilePick}
                      className="h-8 flex-1 rounded border border-border/30 bg-card px-3 text-xs text-muted-foreground text-left truncate hover:bg-muted transition-colors"
                    >
                      {newJobFile ? newJobFile.name : "Click to select file..."}
                    </button>
                    <button type="button" onClick={handleNewJobFilePick} className={buttonClass}>
                      <FolderOpen className="h-4 w-4 stroke-current" />
                    </button>
                  </div>
                </div>
                {newJobError && (
                  <div className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">{newJobError}</div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/20">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  className="h-8 px-3 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNewJob}
                  disabled={isSubmitting || isCreating || isAttaching || !newJobSource || !newJobFile}
                  className="h-8 px-4 rounded text-[10px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {isSubmitting || isCreating || isAttaching ? "Working..." : "Create Job"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Toolbar --- */}
        <div className="shrink-0 flex h-10 items-center gap-2 border-b border-border/35 bg-muted px-3 select-none">
          <div className="relative w-72">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className={inputClass} />
          </div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-muted-foreground outline-none">
            <option value="">All Sources</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-muted-foreground outline-none">
            <option value="">All Statuses</option>
            {allStatuses.map((st) => <option key={st} value={st}>{STATUS_FLOW[st].label}</option>)}
          </select>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handlePickFile}
            disabled={!selectedJobId || isAttaching || isCreating || isSubmitting || sources.length === 0}
            className={buttonClass}
            title={!selectedJobId ? "Create/select a draft job first" : undefined}
          >
            <FolderOpen className="h-4 w-4 stroke-current" /><span>Pick File</span>
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={handleOpenNewJob}
            disabled={isCreating || isAttaching || isSubmitting || sources.length === 0}
            className={buttonClass}
          >
            <Plus className="h-4 w-4 stroke-current" /><span>New Job</span>
          </button>
          <button type="button" onClick={() => setShowAllJobs((v) => !v)} className={buttonClass}>
            <RefreshCw className={`h-3.5 w-3.5 stroke-current ${showAllJobs ? "text-indigo-500" : ""}`} />
            <span>{showAllJobs ? "Showing all" : "Recent 50"}</span>
          </button>
          <button type="button" onClick={() => { refetch(); }} className={buttonClass}>
            <RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span>
          </button>
        </div>

        {/* --- Actions bar --- */}
        {selectedJob && (
          <div className="shrink-0 flex h-10 items-center gap-1.5 border-b border-border/30 bg-muted/50 px-3 select-none">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-2">Actions:</span>
            <button type="button" onClick={() => handleAction("PREVIEW", selectedJob.id)} disabled={!canTransition("PREVIEW") || actionLoading !== null} className={buttonClass} title={!hasFile ? "Attach a file first" : undefined}>
              <Eye className="h-4 w-4 stroke-current" /><span>Preview</span>
            </button>
            <button type="button" onClick={() => handleAction("VALIDATE", selectedJob.id)} disabled={!canTransition("VALIDATE") || actionLoading !== null} className={buttonClass}>
              <CheckCircle className="h-4 w-4 stroke-current" /><span>Validate</span>
            </button>
            <button type="button" onClick={() => handleAction("COMPARE", selectedJob.id)} disabled={!canTransition("COMPARE") || actionLoading !== null} className={buttonClass}>
              <GitCompare className="h-4 w-4 stroke-current" /><span>Compare</span>
            </button>
            <button type="button" onClick={() => handleAction("APPLY", selectedJob.id)} disabled={!canTransition("APPLY") || actionLoading !== null} className={buttonClass}>
              <Play className="h-4 w-4 stroke-current" /><span>Apply</span>
            </button>
            <span className="mx-1 h-5 w-px bg-border/40" />
            <button type="button" onClick={() => handleAction("RETRY", selectedJob.id)} disabled={!canTransition("RETRY") || actionLoading !== null} className={buttonClass}>
              <RefreshCw className="h-4 w-4 stroke-current" /><span>Retry</span>
            </button>
            <button type="button" onClick={() => handleAction("CANCEL", selectedJob.id)} disabled={!canTransition("CANCEL") || actionLoading !== null} className={buttonClass}>
              <XCircle className="h-4 w-4 stroke-current" /><span>Cancel</span>
            </button>
{actionLoading && <span className="text-[10px] text-blue-600 ml-2">{actionLoading}...</span>}
{actionError && <span className="text-[10px] text-red-600 ml-2">Error: {actionError}</span>}
          </div>
        )}

        {/* --- Main content --- */}
        <div className="flex flex-1 min-h-0">
          <div className="w-72 shrink-0 border-r border-border/30 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-success animate-bounce" /> Loading...
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-3">
                  <Upload className="h-8 w-8 mx-auto text-indigo-600/30 stroke-current" />
                  <p className="mt-2 text-xs text-muted-foreground">No import jobs found.</p>
                </div>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((job) => {
                  const flow = STATUS_FLOW[job.status] ?? STATUS_FLOW.DRAFT;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => { setSelectedJobId(job.id); clearActionError(); }}
                      className={`w-full text-left px-3 py-2 border-b border-border/10 transition-colors hover:bg-muted/30 ${selectedJobId === job.id ? "bg-muted/40" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <flow.icon className={`h-3.5 w-3.5 shrink-0 stroke-current ${flow.color}`} />
                        <span className="text-[11px] font-medium text-foreground truncate flex-1">{job.fileName || "Untitled"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{job.sourceConfigName}</span>
                        <span className={`text-[10px] font-medium ${flow.color}`}>{flow.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {selectedJob ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{selectedJob.fileName || "Import Job"}</h3>
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_FLOW[selectedJob.status]?.color ?? "text-muted-foreground"} bg-muted`}>
                    {STATUS_FLOW[selectedJob.status]?.label ?? selectedJob.status}
                  </span>
                </div>

                {!hasFile && (
                  <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                    No file attached. Use <strong>Pick File</strong> to attach a file, or create a new job via <strong>New Job</strong>.
                  </div>
                )}

                {selectedJob.errorSummary && (
                  <div className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">{selectedJob.errorSummary}</div>
                )}

                {statusStep >= 0 && (
                  <div className="flex items-center gap-1">
                    {STATUS_STEPS.map((st, i) => {
                      const f = STATUS_FLOW[st];
                      const isDone = i <= statusStep;
                      const isCurrent = i === statusStep;
                      return (
                        <div key={st} className="flex items-center gap-1">
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium ${isCurrent ? "ring-1 ring-border" : isDone ? f.color : "text-muted-foreground"} ${isDone ? "" : "opacity-40"}`}>
                            <f.icon className="h-3 w-3 stroke-current" />
                            {f.label}
                          </span>
                          {i < STATUS_STEPS.length - 1 && <span className="h-px w-4 bg-border/40" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Source", value: selectedJob.sourceConfigName },
                    { label: "File", value: selectedJob.fileName || "-" },
                    { label: "File Size", value: selectedJob.fileSize ? `${(selectedJob.fileSize / 1024).toFixed(1)} KB` : "-" },
                    { label: "Domain", value: selectedJob.domain },
                    { label: "Created", value: new Date(selectedJob.createdAt).toLocaleString() },
                    { label: "Started", value: selectedJob.startedAt ? new Date(selectedJob.startedAt).toLocaleString() : "-" },
                    { label: "Completed", value: selectedJob.completedAt ? new Date(selectedJob.completedAt).toLocaleString() : "-" },
                    { label: "Triggered By", value: selectedJob.triggeredBy || "-" },
                  ].map((info) => (
                    <div key={info.label} className="rounded border border-border/20 bg-card p-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{info.label}</div>
                      <div className="mt-0.5 text-[11px] font-medium text-foreground truncate">{info.value}</div>
                    </div>
                  ))}
                </div>

                {(selectedJob.recordsCreated > 0 || selectedJob.recordsUpdated > 0 || selectedJob.recordsFailed > 0) && (
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-emerald-600">{selectedJob.recordsCreated} created</span>
                    <span className="text-blue-600">{selectedJob.recordsUpdated} updated</span>
                    <span className="text-red-600">{selectedJob.recordsFailed} failed</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <Upload className="h-10 w-10 stroke-current text-indigo-600/30 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Import Jobs</h3>
                  <p className="text-xs text-muted-foreground max-w-60 mx-auto leading-relaxed">
                    Select a job from the list or create a new one to start the import workflow.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
