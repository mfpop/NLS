import { useState, useMemo, useRef, useCallback, type ChangeEvent } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  Upload, Search, Plus, RefreshCw, Eye, CheckCircle, GitCompare,
  Play, XCircle, FileSpreadsheet, FolderOpen,
  AlertTriangle, ListChecks,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const IMPORT_JOBS_QUERY = gql`
  query ImportJobs($sourceId: String, $status: String, $domain: String) {
    importJobs(sourceId: $sourceId, status: $status, domain: $domain) {
      id
      sourceConfigId
      sourceConfigName
      domain
      fileName
      filePath
      startedAt
      completedAt
      status
      recordsProcessed
      recordsCreated
      recordsUpdated
      recordsFailed
      errorSummary
      triggeredBy
      createdAt
    }
    importSourceConfigs(isActive: true) {
      id
      name
      domain
      sourceType
      isActive
    }
  }
`;

const CREATE_IMPORT_JOB = gql`
  mutation CreateImportJob($sourceId: String!, $fileName: String!, $filePath: String!) {
    createImportJob(sourceId: $sourceId, fileName: $fileName, filePath: $filePath) {
      ok
      job { id status fileName createdAt }
      errors { field code message }
    }
  }
`;

const TRANSITION_JOB = gql`
  mutation TransitionImportJob($action: String!, $jobId: String!) {
    transitionImportJob(action: $action, jobId: $jobId) {
      ok
      job { id status recordsCreated recordsUpdated recordsFailed errorSummary completedAt }
      errors { field code message }
    }
  }
`;

const STATUS_FLOW: Record<string, { label: string; icon: typeof Upload; color: string; next: string[] }> = {
  DRAFT: { label: "Draft", icon: FileSpreadsheet, color: "text-slate-500", next: ["PREVIEWED"] },
  PREVIEWED: { label: "Previewed", icon: Eye, color: "text-blue-500", next: ["VALIDATED"] },
  VALIDATED: { label: "Validated", icon: CheckCircle, color: "text-teal-500", next: ["COMPARED"] },
  COMPARED: { label: "Compared", icon: GitCompare, color: "text-indigo-500", next: ["READY_TO_APPLY"] },
  READY_TO_APPLY: { label: "Ready to Apply", icon: ListChecks, color: "text-amber-500", next: ["APPLIED"] },
  APPLIED: { label: "Applied", icon: Play, color: "text-emerald-500", next: [] },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "text-red-500", next: [] },
  PREVIEW_FAILED: { label: "Preview Failed", icon: AlertTriangle, color: "text-red-500", next: ["DRAFT"] },
  VALIDATION_FAILED: { label: "Validation Failed", icon: AlertTriangle, color: "text-red-500", next: ["DRAFT"] },
  COMPARE_FAILED: { label: "Compare Failed", icon: AlertTriangle, color: "text-red-500", next: ["VALIDATED"] },
  APPLY_FAILED: { label: "Apply Failed", icon: AlertTriangle, color: "text-red-500", next: ["READY_TO_APPLY"] },
};

const STATUS_STEPS = ["DRAFT", "PREVIEWED", "VALIDATED", "COMPARED", "READY_TO_APPLY", "APPLIED"];

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:pointer-events-none disabled:opacity-50`;

interface ImportJob {
  id: string; sourceConfigId: string; sourceConfigName: string; domain: string;
  fileName: string; filePath: string; startedAt: string; completedAt?: string | null;
  status: string; recordsProcessed: number; recordsCreated: number; recordsUpdated: number;
  recordsFailed: number; errorSummary?: string | null; triggeredBy?: string | null; createdAt: string;
}
interface ImportSource { id: string; name: string; domain: string; sourceType: string; isActive: boolean; }

export function ImportJobsPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fileConflict, setFileConflict] = useState<{ fileName: string; onResolve: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, refetch } = useQuery<{ importJobs: ImportJob[]; importSourceConfigs: ImportSource[] }>(
    IMPORT_JOBS_QUERY,
    { variables: { sourceId: sourceFilter || null, status: statusFilter || null }, fetchPolicy: "cache-and-network", errorPolicy: "all" }
  );

  const [createJob] = useMutation<any, { sourceId: string; fileName: string; filePath: string }>(CREATE_IMPORT_JOB, { refetchQueries: ["ImportJobs"] });
  const [transitionJob] = useMutation<any, { action: string; jobId: string }>(TRANSITION_JOB, { refetchQueries: ["ImportJobs"] });

  const jobs = data?.importJobs ?? [];
  const sources = data?.importSourceConfigs ?? [];

  const filtered = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j) =>
      j.fileName.toLowerCase().includes(q) ||
      j.sourceConfigName.toLowerCase().includes(q) ||
      j.status.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  const statusStep = selectedJob ? STATUS_STEPS.indexOf(selectedJob.status) : -1;
  const canTransition = (action: string) => {
    if (!selectedJob) return false;
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
    setActionLoading(action);
    setActionError(null);
    try {
      const result = await transitionJob({ variables: { action, jobId } });
      const resp: any = result.data;
      if (!resp?.transitionImportJob?.ok) {
        setActionError(resp?.transitionImportJob?.errors?.[0]?.message ?? "Action failed");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }, [transitionJob]);

  const handleNewJob = useCallback(async () => {
    const firstSource = sources[0];
    if (!firstSource) { setActionError("No import sources configured. Create one first."); return; }
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const fileName = `import_${firstSource.domain}_${ts}`;
    setActionLoading("CREATE");
    try {
      const result = await createJob({ variables: { sourceId: firstSource.id, fileName, filePath: "" } });
      const resp: any = result.data;
      if (resp?.createImportJob?.ok) {
        setSelectedJobId(resp.createImportJob.job.id);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Create failed");
    }
    setActionLoading(null);
  }, [sources, createJob]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    const fileName = file ? (file.webkitRelativePath || file.name) : "";
    if (!fileName) return;
    const firstSource = sources.find((s) => !sourceFilter || s.id === sourceFilter) ?? sources[0];
    if (!firstSource) return;

    const savePath = `/erp-data/source/${fileName}`;
    const existingFile = jobs.find((j) => j.fileName === fileName && j.status !== "CANCELLED");

    if (existingFile) {
      const createWithPath = () => {
        createJob({ variables: { sourceId: firstSource.id, fileName, filePath: savePath } });
      };
      setFileConflict({
        fileName,
        onResolve: createWithPath,
      });
    } else {
      createJob({ variables: { sourceId: firstSource.id, fileName, filePath: savePath } });
    }
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
          <button type="button" onClick={handlePickFile} disabled={sources.length === 0} className={buttonClass}>
            <FolderOpen className="h-4 w-4 stroke-current" /><span>Pick File</span>
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <button type="button" onClick={handleNewJob} disabled={actionLoading === "CREATE" || sources.length === 0} className={buttonClass}>
            <Plus className="h-4 w-4 stroke-current" /><span>New Job</span>
          </button>
          <button type="button" onClick={() => { setSelectedJobId(null); refetch(); }} className={buttonClass}>
            <RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span>
          </button>
        </div>

        {fileConflict && (
          <div className="shrink-0 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px]">
            <AlertTriangle className="h-4 w-4 stroke-current text-amber-600 shrink-0" />
            <span className="text-amber-800">File <strong>{fileConflict.fileName}</strong> already exists in /erp-data/source/. What should we do with the existing file?</span>
            <button type="button" onClick={() => { fileConflict.onResolve(); setFileConflict(null); }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors">Archive</button>
            <button type="button" onClick={() => { fileConflict.onResolve(); setFileConflict(null); }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-red-700 bg-red-100 hover:bg-red-200 transition-colors">Delete</button>
            <button type="button" onClick={() => setFileConflict(null)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          </div>
        )}

        {selectedJob && (
          <div className="shrink-0 flex h-10 items-center gap-1.5 border-b border-border/30 bg-muted/50 px-3 select-none">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-2">Actions:</span>
            <button type="button" onClick={() => handleAction("PREVIEW", selectedJob.id)} disabled={!canTransition("PREVIEW") || actionLoading !== null} className={buttonClass}>
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
            {actionError && <span className="text-[10px] text-red-600 ml-2">{actionError}</span>}
          </div>
        )}

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
                      onClick={() => { setSelectedJobId(job.id); setActionError(null); }}
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
                    { label: "Domain", value: selectedJob.domain },
                    { label: "Created", value: new Date(selectedJob.createdAt).toLocaleString() },
                    { label: "Started", value: selectedJob.startedAt ? new Date(selectedJob.startedAt).toLocaleString() : "-" },
                    { label: "Completed", value: selectedJob.completedAt ? new Date(selectedJob.completedAt).toLocaleString() : "-" },
                    { label: "Triggered By", value: selectedJob.triggeredBy || "-" },
                    { label: "Records", value: `${selectedJob.recordsProcessed} processed` },
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
