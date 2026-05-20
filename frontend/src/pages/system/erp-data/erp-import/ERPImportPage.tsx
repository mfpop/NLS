import { useState, useMemo, useRef, type ChangeEvent } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Database, RefreshCw, Search, Play, Clock, CheckCircle, XCircle, AlertCircle, HardDrive, FolderOpen } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { IMPORT_SOURCE_CONFIGS_QUERY } from "@/graphql/importSourceQueries";
import { CREATE_IMPORT_JOB } from "@/graphql/erpDataJobMutations";
import { gql } from "@apollo/client";

const IMPORT_JOBS_FOR_SOURCES = gql`
  query ImportJobsForSources($sourceIds: [String!]!) {
    importJobs(sourceIds: $sourceIds, limit: 5) {
      items {
        id
        sourceConfigId
        fileName
        status
        recordsCreated
        recordsUpdated
        recordsFailed
        completedAt
        createdAt
        startedAt
      }
    }
  }
`;

const DOMAIN_LABELS: Record<string, string> = {
  PLANT_STRUCTURE: "Plant Structure",
  MATERIALS: "Materials",
  BOM: "BOM",
  ROUTING: "Routing",
  SCHEDULES: "Schedules",
  INVENTORY: "Inventory",
};

const DOMAIN_ICONS: Record<string, string> = {
  PLANT_STRUCTURE: "text-emerald-600 bg-emerald-100",
  MATERIALS: "text-blue-600 bg-blue-100",
  BOM: "text-indigo-600 bg-indigo-100",
  ROUTING: "text-violet-600 bg-violet-100",
  SCHEDULES: "text-amber-600 bg-amber-100",
  INVENTORY: "text-cyan-600 bg-cyan-100",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  APPLIED: { label: "Applied", cls: "text-emerald-600 bg-emerald-100" },
  COMPARED: { label: "Compared", cls: "text-indigo-600 bg-indigo-100" },
  VALIDATED: { label: "Validated", cls: "text-teal-600 bg-teal-100" },
  PREVIEWED: { label: "Previewed", cls: "text-blue-600 bg-blue-100" },
  FILE_ATTACHED: { label: "File Attached", cls: "text-cyan-600 bg-cyan-100" },
  DRAFT: { label: "Draft", cls: "text-slate-500 bg-slate-100" },
  PREVIEW_FAILED: { label: "Preview Failed", cls: "text-red-600 bg-red-100" },
  VALIDATION_FAILED: { label: "Validation Failed", cls: "text-red-600 bg-red-100" },
  COMPARE_FAILED: { label: "Compare Failed", cls: "text-red-600 bg-red-100" },
  APPLY_FAILED: { label: "Apply Failed", cls: "text-red-600 bg-red-100" },
  CANCELLED: { label: "Cancelled", cls: "text-muted-foreground bg-muted" },
  FAILED: { label: "Failed", cls: "text-red-600 bg-red-100" },
};

const fi = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const tb = `inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:pointer-events-none disabled:opacity-40`;

async function sha256Hex(file: File) {
  const buf = await file.arrayBuffer();
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function parseBody(r: Response) {
  const t = await r.text();
  if (!t) return null;
  try { return JSON.parse(t); } catch { return null; }
}

interface ImportSource {
  id: string; name: string; domain: string; sourceType: string; path: string;
  filePattern: string; isActive: boolean; lastCheckedAt?: string | null;
}

interface ImportJobItem {
  id: string; sourceConfigId: string; fileName: string; status: string;
  recordsCreated: number; recordsUpdated: number; recordsFailed: number;
  completedAt?: string | null; createdAt: string; startedAt: string;
}

export function ERPImportPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showNewSourceModal, setShowNewSourceModal] = useState(false);
  const [newSourceFile, setNewSourceFile] = useState<File | null>(null);
  const [newSourceError, setNewSourceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: srcData, loading: srcLoading, refetch: refetchSources } = useQuery<{ importSourceConfigs: { items: ImportSource[] } }>(
    IMPORT_SOURCE_CONFIGS_QUERY,
    { variables: { isActive: true }, fetchPolicy: "cache-and-network" }
  );

  const sources = useMemo(() => srcData?.importSourceConfigs?.items ?? [], [srcData]);
  const sourceIds = useMemo(() => sources.map((s) => s.id), [sources]);

  const { data: jobsData, refetch: refetchJobs } = useQuery<{ importJobs: { items: ImportJobItem[] } }>(
    IMPORT_JOBS_FOR_SOURCES,
    { variables: { sourceIds }, skip: sourceIds.length === 0, fetchPolicy: "cache-and-network" }
  );

  const [createJob] = useMutation<{
    createImportJob?: {
      ok: boolean;
      job?: { id: string; status: string } | null;
      errorCode?: string | null;
      message?: string | null;
      existingJobId?: string | null;
      errors?: Array<{ field?: string | null; code: string; message: string }> | null;
    };
  }>(CREATE_IMPORT_JOB);

  const jobsBySourceId = useMemo(() => {
    const map = new Map<string, ImportJobItem[]>();
    for (const job of jobsData?.importJobs?.items ?? []) {
      const list = map.get(job.sourceConfigId) ?? [];
      list.push(job);
      map.set(job.sourceConfigId, list);
    }
    return map;
  }, [jobsData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.domain.toLowerCase().includes(q) ||
      s.sourceType.toLowerCase().includes(q)
    );
  }, [sources, search]);

  const groupedByDomain = useMemo(() => {
    const groups = new Map<string, ImportSource[]>();
    const order = ["PLANT_STRUCTURE", "MATERIALS", "BOM", "ROUTING", "SCHEDULES", "INVENTORY"];
    for (const d of order) groups.set(d, []);
    for (const s of filtered) {
      const list = groups.get(s.domain) ?? [];
      list.push(s);
      groups.set(s.domain, list);
    }
    return Array.from(groups.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const totalSources = sources.length;
  const recentImports = useMemo(() => {
    return (jobsData?.importJobs?.items ?? []).filter((j) => j.status === "APPLIED").length;
  }, [jobsData]);
  const recentFailed = useMemo(() => {
    return (jobsData?.importJobs?.items ?? []).filter((j) =>
      ["FAILED", "PREVIEW_FAILED", "VALIDATION_FAILED", "COMPARE_FAILED", "APPLY_FAILED"].includes(j.status)
    ).length;
  }, [jobsData]);

  const lastJobForSource = (sourceId: string): ImportJobItem | null => {
    const jobs = jobsBySourceId.get(sourceId);
    if (!jobs || jobs.length === 0) return null;
    return jobs.reduce((latest, j) =>
      !latest || new Date(j.createdAt) > new Date(latest.createdAt) ? j : latest
    , jobs[0]);
  };

  const handleRunImport = async (source: ImportSource) => {
    if (runningSourceId) return;
    setRunningSourceId(source.id);
    setImportMsg(null);
    try {
      const res = await createJob({
        variables: { sourceId: source.id, fileName: null, fileHash: null }
      });
      const payload = res.data?.createImportJob;
      if (payload?.ok && payload.job?.id) {
        navigate(`/system/erp-data/import-jobs?jobId=${payload.job.id}`);
      } else if (payload?.existingJobId) {
        navigate(`/system/erp-data/import-jobs?jobId=${payload.existingJobId}`);
      } else {
        setImportMsg({ text: payload?.message ?? "Failed to create import job", type: "error" });
      }
    } catch (err) {
      setImportMsg({ text: err instanceof Error ? err.message : "Import failed", type: "error" });
    } finally {
      setRunningSourceId(null);
    }
  };

  const handlePickFile = () => {
    setNewSourceError(null);
    setNewSourceFile(null);
    setShowNewSourceModal(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewSourceFile(e.target.files?.[0] ?? null);
  };

  const handleUploadImport = async (source: ImportSource) => {
    if (!newSourceFile || runningSourceId) return;
    setRunningSourceId(source.id);
    setNewSourceError(null);
    try {
      const fh = await sha256Hex(newSourceFile);
      const res = await createJob({
        variables: { sourceId: source.id, fileName: newSourceFile.name, fileHash: fh }
      });
      const payload = res.data?.createImportJob;
      if (!payload?.ok) {
        if (payload?.existingJobId) {
          const fd = new FormData();
          fd.append("file", newSourceFile);
          const uploadRes = await fetch(`/api/import-jobs/${encodeURIComponent(payload.existingJobId)}/upload/`, { method: "POST", body: fd });
          const up = await parseBody(uploadRes);
          if (uploadRes.ok && up?.ok) {
            navigate(`/system/erp-data/import-jobs?jobId=${payload.existingJobId}`);
            return;
          }
        }
        setNewSourceError(payload?.message ?? "Failed to create import job");
        return;
      }
      const jobId = payload.job?.id;
      if (!jobId) {
        setNewSourceError("Job created but no ID returned");
        return;
      }
      const fd = new FormData();
      fd.append("file", newSourceFile);
      const uploadRes = await fetch(`/api/import-jobs/${encodeURIComponent(jobId)}/upload/`, { method: "POST", body: fd });
      const up = await parseBody(uploadRes);
      if (uploadRes.ok && up?.ok) {
        navigate(`/system/erp-data/import-jobs?jobId=${jobId}`);
      } else {
        setNewSourceError(up?.message ?? "Upload failed");
      }
    } catch (err) {
      setNewSourceError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setRunningSourceId(null);
      setShowNewSourceModal(false);
    }
  };

  const cardBtn = `inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold transition-all border-0`;

  return (
    <AppPageLayout
      title="ERP Import"
      subtitle="Import data from configured ERP sources. Select an option below to start an import job."
      icon={<Database />}
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex h-9 items-center gap-2 border-b border-border/35 bg-muted px-3 select-none">
          <div className="relative w-72">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search import options..." className={fi} />
          </div>
          <div className="flex-1" />
          {importMsg && (
            <span className={`text-[10px] font-medium ${importMsg.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {importMsg.text}
            </span>
          )}
          <button type="button" onClick={() => { refetchSources(); refetchJobs(); }} className={tb}>
            <RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/20 bg-card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sources</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{srcLoading ? "\u2014" : totalSources}</div>
            </div>
            <div className="rounded-xl border border-border/20 bg-card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Active</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">{srcLoading ? "\u2014" : sources.filter((s) => s.isActive).length}</div>
            </div>
            <div className="rounded-xl border border-border/20 bg-card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recent Imports</div>
              <div className="mt-1 text-2xl font-bold text-blue-600">{recentImports}</div>
            </div>
            <div className="rounded-xl border border-border/20 bg-card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Failed</div>
              <div className="mt-1 text-2xl font-bold text-red-600">{recentFailed}</div>
            </div>
          </div>

          {srcLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin stroke-current" />Loading import options...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <HardDrive className="h-12 w-12 text-muted-foreground/20 stroke-current mb-3" />
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">No import options found</h3>
              <p className="text-xs text-muted-foreground max-w-md text-center">
                {search ? "Try a different search term." : "Configure import sources in ERP Admin to see import options here."}
              </p>
              {!search && (
                <button type="button" onClick={() => navigate("/system/erp-data/import-sources")}
                  className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <HardDrive className="h-4 w-4 stroke-current" /> Configure Sources
                </button>
              )}
            </div>
          ) : (
            groupedByDomain.map(([domain, domainSources]) => (
              <section key={domain}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${DOMAIN_ICONS[domain] ?? "text-muted-foreground bg-muted"}`}>
                    {domain[0]}
                  </span>
                  <h2 className="text-sm font-bold text-foreground">{DOMAIN_LABELS[domain] ?? domain}</h2>
                  <span className="text-[11px] text-muted-foreground">({domainSources.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {domainSources.map((source) => {
                    const lastJob = lastJobForSource(source.id);
                    const isRunning = runningSourceId === source.id;
                    return (
                      <div key={source.id} className="rounded-xl border border-border/20 bg-card p-4 hover:border-border/40 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-foreground truncate">{source.name}</h3>
                            <p className="text-[11px] text-muted-foreground">{source.sourceType} &bull; {source.path}</p>
                          </div>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${DOMAIN_ICONS[source.domain] ?? "text-muted-foreground bg-muted"}`}>
                            {DOMAIN_LABELS[source.domain] ?? source.domain}
                          </span>
                        </div>

                        {lastJob ? (
                          <div className="mb-3 space-y-1 rounded-lg bg-muted/30 p-2">
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {lastJob.status === "APPLIED" ? (
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 stroke-current shrink-0" />
                              ) : lastJob.status === "FAILED" || lastJob.status.endsWith("_FAILED") ? (
                                <XCircle className="h-3.5 w-3.5 text-red-500 stroke-current shrink-0" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-amber-500 stroke-current shrink-0" />
                              )}
                              <span className={`rounded px-1 py-0.5 text-[8px] font-medium ${STATUS_BADGE[lastJob.status]?.cls ?? "text-muted-foreground bg-muted"}`}>
                                {STATUS_BADGE[lastJob.status]?.label ?? lastJob.status}
                              </span>
                              <span className="text-muted-foreground truncate">{lastJob.fileName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {lastJob.status === "APPLIED" && (
                                <span>{lastJob.recordsCreated} created, {lastJob.recordsUpdated} updated</span>
                              )}
                              {lastJob.completedAt && (
                                <span className="ml-auto shrink-0">{new Date(lastJob.completedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-3 flex items-center gap-1.5 text-[10px] text-muted-foreground rounded-lg bg-muted/20 p-2">
                            <Clock className="h-3.5 w-3.5 stroke-current shrink-0" />
                            No imports yet
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => void handleRunImport(source)} disabled={isRunning}
                            className={`${cardBtn} bg-primary text-primary-foreground hover:bg-primary/90 ${isRunning ? "opacity-60 pointer-events-none" : ""}`}>
                            {isRunning ? (
                              <><RefreshCw className="h-4 w-4 animate-spin stroke-current" /> Running...</>
                            ) : (
                              <><Play className="h-4 w-4 stroke-current" /> Import Now</>
                            )}
                          </button>
                          <button type="button" onClick={handlePickFile} disabled={isRunning}
                            className={`${cardBtn} border border-border/30 bg-card text-foreground hover:bg-muted ${isRunning ? "opacity-60 pointer-events-none" : ""}`}>
                            <FolderOpen className="h-4 w-4 stroke-current" /> Upload File
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {showNewSourceModal && (() => {
        const source = filtered.find((s) => s.id === runningSourceId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-card/85 backdrop-blur-xl border border-border/20 shadow-2xl shadow-black/15 p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Upload File for Import</h3>
              {newSourceError && (
                <div className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 stroke-current shrink-0" />{newSourceError}
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Select File</label>
                <input ref={fileInputRef} type="file" onChange={handleFileChange}
                  className="h-8 w-full rounded border border-border/30 bg-card px-2 text-[11px] text-foreground outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowNewSourceModal(false); setNewSourceError(null); }}
                  className="h-8 px-3 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => source && void handleUploadImport(source)} disabled={!newSourceFile}
                  className="h-8 px-3 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40">
                  Upload & Import
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppPageLayout>
  );
}
