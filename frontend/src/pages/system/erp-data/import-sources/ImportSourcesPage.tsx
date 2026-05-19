import { useState, useMemo, useRef, useEffect, type ChangeEvent } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { HardDrive, Plus, Search, X, RefreshCw, Trash2, Activity, ExternalLink, Check, CheckCircle, AlertCircle, Clock, FolderOpen } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { IMPORT_SOURCE_CONFIGS_QUERY } from "@/graphql/importSourceQueries";
import { CREATE_IMPORT_SOURCE_CONFIG, UPDATE_IMPORT_SOURCE_CONFIG, ARCHIVE_IMPORT_SOURCE_CONFIG } from "@/graphql/importSourceMutations";
import { theme } from "../../../../styles/themeTokens";

const TEST_PATH = gql`
  query TestImportSourcePath($id: String!) {
    testImportSourcePath(id: $id) {
      ok exists readable message lastCheckedAt
      errors { field code message }
    }
  }
`;

const JOB_STATUS = gql`
  query ImportJobsForSourceStatus($sourceId: String!) {
    importJobs(sourceId: $sourceId, status: "APPLIED") {
      id fileName completedAt recordsCreated recordsUpdated
    }
  }
`;

interface ImportSource {
  id: string; name: string; domain: string; sourceType: string; path: string;
  filePattern: string; archivePath?: string | null; errorPath?: string | null;
  pollingIntervalMinutes?: number | null; isActive: boolean;
  lastCheckedAt?: string | null; createdAt: string; updatedAt: string;
}
interface SourceFormData { name: string; domain: string; sourceType: string; path: string; filePattern: string; archivePath: string; errorPath: string; pollingIntervalMinutes: string; importFile: string; }

const DOMAINS = ["PLANT_STRUCTURE", "PRODUCTS", "MATERIALS", "BOM", "ROUTING", "SCHEDULES", "INVENTORY"];
const SOURCE_TYPES = ["EXCEL", "CSV"];

const INFER_DOMAIN_KEYWORDS: Record<string, string> = {
  bom: "BOM",
  routing: "ROUTING",
  material: "MATERIALS",
  inventory: "INVENTORY",
  schedule: "SCHEDULES",
  plant: "PLANT_STRUCTURE",
  structure: "PLANT_STRUCTURE",
  product: "PRODUCTS",
};

const INFER_EXT_SOURCE_TYPE: Record<string, string> = {
  ".xlsx": "EXCEL",
  ".xls": "EXCEL",
  ".csv": "CSV",
};

const fi = `h-7 w-full rounded border border-border/30 bg-card px-2.5 text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const fip = `h-7 w-full min-w-0 rounded border border-border/30 bg-card px-2.5 pr-2 text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const fs = `h-7 w-full cursor-pointer rounded border border-border/30 bg-card px-2 text-[11px] text-foreground outline-none transition-colors focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const tb = `inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:pointer-events-none disabled:text-muted-foreground disabled:bg-transparent disabled:opacity-70`;

function ef(): SourceFormData {
  return { name: "", domain: "PLANT_STRUCTURE", sourceType: "EXCEL", path: "", filePattern: "", archivePath: "D:/02_Work/localai/lmd/erp_data/archive", errorPath: "D:/02_Work/localai/lmd/erp_data/error", pollingIntervalMinutes: "", importFile: "" };
}

export function ImportSourcesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [form, setForm] = useState<SourceFormData>(ef());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [systemMsg, setSystemMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [pathTestData, setPathTestData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, refetch } = useQuery<{ importSourceConfigs: ImportSource[] }>(IMPORT_SOURCE_CONFIGS_QUERY);
  const [createSource] = useMutation<any>(CREATE_IMPORT_SOURCE_CONFIG);
  const [updateSource] = useMutation<any>(UPDATE_IMPORT_SOURCE_CONFIG);
  const [archiveSource] = useMutation<any>(ARCHIVE_IMPORT_SOURCE_CONFIG);
  const [runPathTest, { loading: ptLoading }] = useLazyQuery<any>(TEST_PATH, { fetchPolicy: "network-only" });
  const { data: jd } = useQuery(JOB_STATUS, { variables: { sourceId: selectedSourceId || "" }, skip: !selectedSourceId });

  const sources = data?.importSourceConfigs ?? [];
  const selected = useMemo(() => sources.find((s) => s.id === selectedSourceId) ?? null, [sources, selectedSourceId]);
  const lastJob: any = useMemo(() => { const j: any[] = (jd as any)?.importJobs ?? []; return j[0] ?? null; }, [jd]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter((s) => s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q) || s.path.toLowerCase().includes(q));
  }, [sources, search]);

  const selectSource = (id: string) => {
    setSelectedSourceId(id); setIsAddingNew(false);
    const s = sources.find((x) => x.id === id);
    if (s) setForm({ name: s.name, domain: s.domain, sourceType: s.sourceType, path: s.path, filePattern: s.filePattern ?? "", archivePath: s.archivePath ?? "", errorPath: s.errorPath ?? "", pollingIntervalMinutes: s.pollingIntervalMinutes?.toString() ?? "", importFile: "" });
    setFormErrors({}); setSystemMsg(null); setPathTestData(null);
  };

  const addNew = () => {
    setSelectedSourceId(null); setIsAddingNew(true); setForm(ef());
    setFormErrors({}); setSystemMsg(null); setPathTestData(null);
  };

  const cancel = () => {
    setIsAddingNew(false); setSelectedSourceId(null); setForm(ef());
    setFormErrors({}); setSystemMsg(null); setPathTestData(null);
  };

  const isFormOpen = selectedSourceId || isAddingNew;

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.path.trim()) errs.path = "Required";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSystemMsg(null);
    const input = { name: form.name, domain: form.domain, sourceType: form.sourceType, path: form.path, filePattern: form.filePattern || null, archivePath: form.archivePath || null, errorPath: form.errorPath || null, pollingIntervalMinutes: form.pollingIntervalMinutes ? parseInt(form.pollingIntervalMinutes, 10) : null };
    try {
      const r = selectedSourceId ? await updateSource({ variables: { id: selectedSourceId, input } }) : await createSource({ variables: { input } });
      const d: any = r.data;
      const resp = selectedSourceId ? d?.updateImportSourceConfig : d?.createImportSourceConfig;
      if (resp?.ok) {
        await refetch();
        cancel();
        // Set success message LAST so it isn't overridden by cancel clearing systemMsg
        setSystemMsg({ text: selectedSourceId ? "Source saved successfully." : "Source created successfully.", type: "success" });
      } else {
        const e = resp?.errors ?? [];
        if (e.length > 0) {
          // Map field-level errors to formErrors if present
          const nextErrors: Record<string, string> = {};
          for (const err of e) {
            if (err.field) {
              // backend uses field names like 'name' or 'path'
              nextErrors[err.field] = err.message;
            }
          }
          if (Object.keys(nextErrors).length > 0) setFormErrors((p) => ({ ...p, ...nextErrors }));
          setSystemMsg({ text: e[0]?.message ?? "Save failed", type: "error" });
        }
      }
    } catch (err) { setSystemMsg({ text: err instanceof Error ? err.message : "Save failed", type: "error" }); }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm("Archive this import source? It will be deactivated and hidden from the active list.")) return;
    try {
      const r = await archiveSource({ variables: { id } });
      const d: any = r.data;
      if (d?.archiveImportSourceConfig?.ok) { await refetch(); cancel(); }
    } catch { /* ignore */ }
  };

  const handleTestPath = async () => {
    if (!selectedSourceId) return;
    const r = await runPathTest({ variables: { id: selectedSourceId } });
    setPathTestData(r.data?.testImportSourcePath ?? null);
  };

  const updateField = (f: keyof SourceFormData, v: string) => {
    setForm((p) => ({ ...p, [f]: v }));
    if (formErrors[f]) setFormErrors((p) => { const n = { ...p }; delete n[f]; return n; });
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    const fileName = file.name;
    const filePath = (file as any).webkitRelativePath || file.name;
    const ext = fileName.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? "";

    updateField("importFile", filePath);

    // Name: strip extension from filename
    if (!form.name) {
      updateField("name", fileName.replace(/\.[^.]+$/, ""));
    }

    // Path: use normalized source directory
    if (!form.path) {
      updateField("path", "D:/02_Work/localai/lmd/erp_data/source");
    }

    // Source type: infer from file extension
    if (ext && INFER_EXT_SOURCE_TYPE[ext]) {
      updateField("sourceType", INFER_EXT_SOURCE_TYPE[ext]);
    }

    // Domain: infer from keywords in the filename
    const fileNameLower = fileName.toLowerCase();
    for (const [keyword, domain] of Object.entries(INFER_DOMAIN_KEYWORDS)) {
      if (fileNameLower.includes(keyword)) {
        updateField("domain", domain);
        break;
      }
    }

    // File pattern: infer from extension
    if (ext && !form.filePattern) {
      updateField("filePattern", `*${ext}`);
    }
  };

  const    saveDisabled = !form.name.trim() || !form.path.trim();

  // Auto-dismiss success messages after 4 seconds
  useEffect(() => {
    if (systemMsg?.type === "success") {
      const timer = setTimeout(() => setSystemMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [systemMsg]);

  return (
    <AppPageLayout title="Import Sources" subtitle="Configure reusable ERP file import sources." icon={<HardDrive />} iconClass="text-blue-600"
        systemMessage={systemMsg}
        onDismissSystemMessage={() => setSystemMsg(null)}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex items-center border-b border-border/35 bg-muted h-10 select-none">
          <div className="flex h-full min-w-0 items-center gap-2 w-1/4 min-w-[200px] max-w-[320px] px-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-current pointer-events-none text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sources..."
                className="h-7 w-full rounded border border-border/35 bg-transparent pl-3 pr-7 text-xs outline-none text-muted-foreground placeholder:text-muted-foreground transition-colors focus:border-border/50 focus:bg-card focus:ring-1 focus:ring-border/20" />
            </div>
          </div>
          <span className="h-5 w-px shrink-0 bg-border/25" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 pr-3">
            {isFormOpen && (
              <>
                <button type="button" onClick={handleSave} disabled={saveDisabled} title="Save source configuration"
                  className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-semibold border-0 transition-colors ${saveDisabled ? `${theme.chip} ${theme.textSecondary} cursor-not-allowed` : theme.buttonSuccessSolid}`}>
                  <Check className="h-4 w-4 stroke-current" /><span>Save</span>
                </button>
                <button type="button" onClick={cancel} title="Cancel editing"
                  className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors`}>
                  <X className="h-4 w-4 stroke-current" /><span>Cancel</span>
                </button>
                <span className="mx-1 h-5 w-px bg-muted shrink-0" />
              </>
            )}
            {selectedSourceId && (
              <>
                <button type="button" onClick={() => void handleTestPath()} disabled={ptLoading} title="Validate source path accessibility" className={tb}>
                  <Activity className="h-4 w-4 stroke-current" /><span>{ptLoading ? "Testing..." : "Test Path"}</span>
                </button>
                <button type="button" onClick={() => selected && handleArchive(selected.id)} title="Archive this source" className={tb}>
                  <Trash2 className="h-4 w-4 stroke-current" /><span>Archive</span>
                </button>
                <span className="mx-1 h-5 w-px bg-muted shrink-0" />
              </>
            )}
            {!isFormOpen && (
              <button type="button" onClick={addNew} title="Create a new import source" className={tb}><Plus className="h-4 w-4 stroke-current" /><span>New</span></button>
            )}
            <button type="button" onClick={() => refetch()} title="Refresh source list" className={tb}><RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span></button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-1/4 min-w-[200px] max-w-[320px] border-r border-border/30 overflow-y-auto bg-muted/20">
            {loading ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <HardDrive className="h-8 w-8 text-blue-600/30 stroke-current mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{search ? "No matches" : "No sources yet"}</p>
                <button type="button" onClick={addNew} className="mt-2 text-[11px] font-medium text-blue-600 hover:text-blue-700">Add one</button>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((s) => {
                  const isSel = s.id === selectedSourceId;
                  const hasErr = pathTestData && !pathTestData.ok && selectedSourceId === s.id;
                  return (
                    <button key={s.id} type="button" onClick={() => selectSource(s.id)}
                      className={`w-full text-left px-3 py-2.5 border-b border-border/10 transition-colors hover:bg-muted/40 ${isSel ? "bg-muted/50 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${s.isActive ? "bg-success" : "bg-muted-foreground/40"}`} />
                        <span className="text-[12px] font-medium text-foreground truncate flex-1">{s.name}</span>
                        {hasErr && <AlertCircle className="h-3.5 w-3.5 shrink-0 stroke-current text-red-500" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{s.domain}</span>
                        <span className="text-[10px] text-muted-foreground">&bull;</span>
                        <span className="text-[10px] text-muted-foreground">{s.sourceType}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">{s.path}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-card">
            {isAddingNew ? (
              <div className="h-full grid grid-cols-[1fr_320px] gap-0">
                <div className="p-4 space-y-4 overflow-y-auto border-r border-border/20">
                  <h2 className="text-sm font-semibold text-foreground">New Source</h2>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">File</label>
                    <div className="flex items-center gap-2">
                      <input type="text" value={form.importFile} onChange={(e) => updateField("importFile", e.target.value)} placeholder="Type file path or pick a file" className={fip} />
                      <button type="button" onClick={handlePickFile} className="inline-flex items-center gap-1 h-7 shrink-0 rounded border border-border/30 bg-card px-2 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                        <FolderOpen className="h-3.5 w-3.5 stroke-current" />Pick
                      </button>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                    </div>
                  </div>
                  <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name *</label>
                    <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Source name" className={fi} />
                    {formErrors.name && <p className="mt-0.5 text-[10px] text-danger">{formErrors.name}</p>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Domain</label>
                      <select value={form.domain} onChange={(e) => updateField("domain", e.target.value)} className={fs}>{DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Source Type</label>
                      <select value={form.sourceType} onChange={(e) => updateField("sourceType", e.target.value)} className={fs}>{SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  </div>
                  <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Path *</label>
                    <input type="text" value={form.path} onChange={(e) => updateField("path", e.target.value)} placeholder="e.g. /mnt/erp/exports" className={fi} />
                    {formErrors.path && <p className="mt-0.5 text-[10px] text-danger">{formErrors.path}</p>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">File Pattern</label>
                      <input type="text" value={form.filePattern} onChange={(e) => updateField("filePattern", e.target.value)} placeholder="e.g. *.xlsx" className={fi} /></div>
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Polling Interval (min)</label>
                      <input type="number" value={form.pollingIntervalMinutes} onChange={(e) => updateField("pollingIntervalMinutes", e.target.value)} placeholder="Leave empty for one-time import" min={0} className={fi} />
                      {!form.pollingIntervalMinutes && <p className="mt-0.5 text-[10px] italic text-muted-foreground">One-time import (no polling)</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Archive Path</label>
                      <input type="text" value={form.archivePath} onChange={(e) => updateField("archivePath", e.target.value)} placeholder="e.g. /mnt/erp/archive" className={fi} /></div>
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Error Path</label>
                      <input type="text" value={form.errorPath} onChange={(e) => updateField("errorPath", e.target.value)} placeholder="e.g. /mnt/erp/errors" className={fi} /></div>
                  </div>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto bg-muted/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Preview</div>
                  <div className="rounded-lg border border-border/20 bg-card p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source</div>
                    <div className="mt-1 font-medium text-foreground">{form.name || "Untitled source"}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{form.domain} / {form.sourceType}</div>
                  </div>
                  <div className="rounded-lg border border-border/20 bg-card p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paths</div>
                    <div className="mt-1 font-mono text-[11px] text-foreground break-all">{form.path || "No path set"}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Pattern: {form.filePattern || "-"}</div>
                    <div className="text-[11px] text-muted-foreground">{form.pollingIntervalMinutes ? `Polling: every ${form.pollingIntervalMinutes} min` : 'One-time import'}</div>
                  </div>
                </div>
              </div>

            ) : selectedSourceId && selected ? (
              <div className="h-full grid grid-cols-[1fr_320px] gap-0">
                <div className="p-4 space-y-4 overflow-y-auto border-r border-border/20">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Edit Source</h2>
                    <button type="button" onClick={() => navigate("/system/erp-data/import-jobs")} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5 stroke-current" />Open Jobs
                    </button>
                  </div>
                  <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name *</label>
                    <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className={fi} />
                    {formErrors.name && <p className="mt-0.5 text-[10px] text-danger">{formErrors.name}</p>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Domain</label>
                      <select value={form.domain} onChange={(e) => updateField("domain", e.target.value)} className={fs}>{DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Source Type</label>
                      <select value={form.sourceType} onChange={(e) => updateField("sourceType", e.target.value)} className={fs}>{SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  </div>
                  <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Path *</label>
                    <input type="text" value={form.path} onChange={(e) => updateField("path", e.target.value)} className={fi} />
                    {formErrors.path && <p className="mt-0.5 text-[10px] text-danger">{formErrors.path}</p>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">File Pattern</label>
                      <input type="text" value={form.filePattern} onChange={(e) => updateField("filePattern", e.target.value)} className={fi} /></div>
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Polling Interval (min)</label>
                      <input type="number" value={form.pollingIntervalMinutes} onChange={(e) => updateField("pollingIntervalMinutes", e.target.value)} placeholder="Leave empty for one-time import" min={0} className={fi} />
                      {!form.pollingIntervalMinutes && <p className="mt-0.5 text-[10px] italic text-muted-foreground">One-time import (no polling)</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Archive Path</label>
                      <input type="text" value={form.archivePath} onChange={(e) => updateField("archivePath", e.target.value)} className={fi} /></div>
                    <div><label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Error Path</label>
                      <input type="text" value={form.errorPath} onChange={(e) => updateField("errorPath", e.target.value)} className={fi} /></div>
                  </div>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto bg-muted/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Preview</div>
                  <div className="rounded-lg border border-border/20 bg-card p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${selected.isActive ? "bg-success" : "bg-muted-foreground/40"}`} />
                      <span className="text-[12px] font-medium text-foreground">{selected.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="mt-2 text-muted-foreground text-[11px]">{selected.domain} / {selected.sourceType}</div>
                  </div>
                  <div className="rounded-lg border border-border/20 bg-card p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paths</div>
                    <div className="mt-1 font-mono text-[11px] text-foreground break-all">{selected.path}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Pattern: {selected.filePattern || "-"}</div>
                    <div className="text-[11px] text-muted-foreground">Archive: {selected.archivePath || "-"}</div>
                    <div className="text-[11px] text-muted-foreground">Errors: {selected.errorPath || "-"}</div>
                    {selected.pollingIntervalMinutes ? (
                      <div className="text-[11px] text-muted-foreground">Polling: every {selected.pollingIntervalMinutes} min</div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground italic">One-time import</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-border/20 bg-card p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Path Diagnostics</div>
                    {pathTestData ? (
                      <div className="mt-1 space-y-1">
                        <div className={`flex items-center gap-1 text-[12px] font-medium ${pathTestData.ok ? "text-emerald-600" : "text-red-600"}`}>
                          {pathTestData.ok ? <CheckCircle className="h-4 w-4 stroke-current" /> : <AlertCircle className="h-4 w-4 stroke-current" />}
                          {pathTestData.message}
                        </div>
                        <div className="text-[11px] text-muted-foreground">Exists: {String(pathTestData.exists ?? false)} | Readable: {String(pathTestData.readable ?? false)}</div>
                        {pathTestData.lastCheckedAt && <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 stroke-current" />{new Date(pathTestData.lastCheckedAt).toLocaleString()}</div>}
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-muted-foreground">Click Test Path to validate.</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-border/20 bg-card p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last Scan</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{selected.lastCheckedAt ? new Date(selected.lastCheckedAt).toLocaleString() : "No scan recorded"}</div>
                    <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last Successful Import</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{lastJob ? `${lastJob.fileName || "Import"} - ${new Date(lastJob.completedAt).toLocaleString()}` : "None"}</div>
                    {lastJob && <div className="text-[11px] text-muted-foreground">{lastJob.recordsCreated} created, {lastJob.recordsUpdated} updated</div>}
                  </div>
                </div>
              </div>

            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <HardDrive className="h-10 w-10 stroke-current text-blue-600/30 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Import Sources</h3>
                  <p className="text-xs text-muted-foreground max-w-60 mx-auto leading-relaxed">Select a source from the left panel or create a new one to configure ERP file import paths.</p>
                  <button type="button" onClick={addNew} className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Plus className="h-4 w-4 stroke-current" /> New Source
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
