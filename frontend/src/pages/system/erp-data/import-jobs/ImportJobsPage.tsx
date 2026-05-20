import { useState, useMemo, useRef, useCallback, type ChangeEvent } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Upload, Search, Plus, RefreshCw, Eye, CheckCircle, GitCompare,
  Play, XCircle, FileSpreadsheet, FolderOpen,
  AlertTriangle, ListChecks, Trash2, FileText, Table2,
  ShieldAlert, MapIcon, DiffIcon, ClipboardCheck,
  Info, Check, AlertCircle,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { useImportJobs, type PlantStructureMutationResult } from "@/hooks/useImportJobs";
import {
  FILE_PREVIEW_QUERY, IMPORT_VALIDATION_ERRORS_QUERY,
  IMPORT_COMPARE_RESULTS_QUERY, IMPORT_AUDIT_LOGS_QUERY,
} from "@/graphql/erpDataJobQueries";

const STATUS_FLOW: Record<string, { label: string; icon: typeof Upload; color: string; colorClass: string; next: string[] }> = {
  DRAFT: { label: "Draft", icon: FileSpreadsheet, color: "text-slate-500", colorClass: "bg-slate-500", next: ["FILE_ATTACHED"] },
  FILE_ATTACHED: { label: "File Attached", icon: Upload, color: "text-cyan-500", colorClass: "bg-cyan-500", next: ["PREVIEWED"] },
  FILE_MISSING: { label: "File Missing", icon: AlertTriangle, color: "text-red-500", colorClass: "bg-red-500", next: ["FILE_ATTACHED"] },
  PREVIEWED: { label: "Previewed", icon: Eye, color: "text-blue-500", colorClass: "bg-blue-500", next: ["VALIDATED"] },
  VALIDATED: { label: "Validated", icon: CheckCircle, color: "text-teal-500", colorClass: "bg-teal-500", next: ["COMPARED"] },
  COMPARED: { label: "Compared", icon: GitCompare, color: "text-indigo-500", colorClass: "bg-indigo-500", next: ["READY_TO_APPLY"] },
  READY_TO_APPLY: { label: "Ready to Apply", icon: ListChecks, color: "text-amber-500", colorClass: "bg-amber-500", next: ["APPLIED"] },
  APPLIED: { label: "Applied", icon: Play, color: "text-emerald-500", colorClass: "bg-emerald-500", next: [] },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "text-red-500", colorClass: "bg-red-500", next: [] },
  PREVIEW_FAILED: { label: "Preview Failed", icon: AlertTriangle, color: "text-red-500", colorClass: "bg-red-500", next: ["DRAFT", "FILE_ATTACHED"] },
  VALIDATION_FAILED: { label: "Validation Failed", icon: AlertTriangle, color: "text-red-500", colorClass: "bg-red-500", next: ["DRAFT", "FILE_ATTACHED"] },
  COMPARE_FAILED: { label: "Compare Failed", icon: AlertTriangle, color: "text-red-500", colorClass: "bg-red-500", next: ["VALIDATED"] },
  APPLY_FAILED: { label: "Apply Failed", icon: AlertTriangle, color: "text-red-500", colorClass: "bg-red-500", next: ["READY_TO_APPLY"] },
};

const PROGRESS_STEPS = ["FILE_ATTACHED", "PREVIEWED", "VALIDATED", "COMPARED", "READY_TO_APPLY", "APPLIED"];

const PREVIEW_TABS = [
  { id: "file-preview", label: "File Preview", icon: FileText },
  { id: "parsed-data", label: "Parsed Data", icon: Table2 },
  { id: "validation", label: "Validation", icon: ShieldAlert },
  { id: "mapping", label: "Mapping", icon: MapIcon },
  { id: "compare", label: "Compare", icon: DiffIcon },
  { id: "apply", label: "Apply Preview", icon: ClipboardCheck },
];

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const tBtn = `inline-flex items-center justify-center h-7 w-7 rounded-sm border border-transparent bg-transparent text-[11px] font-medium text-muted-foreground hover:bg-card hover:border-border/50 active:bg-muted disabled:pointer-events-none disabled:opacity-45`;

function dedupeById<T extends { id: string }>(items: T[]) { return Array.from(new Map(items.map((i) => [i.id, i])).values()); }

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

function colLetter(i: number) { let l = ""; for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) l = String.fromCharCode(65 + (n % 26)) + l; return l; }

function SeverityBadge({ code }: { code: string }) {
  const isErr = ["REQUIRED", "INVALID", "MAX_LENGTH", "UNSUPPORTED", "ERROR", "NOT_FOUND"].includes(code);
  const isWarn = ["DUPLICATE", "CONFLICT", "FORMAT"].includes(code);
  const cls = isErr ? "text-red-600 bg-red-100" : isWarn ? "text-amber-600 bg-amber-100" : "text-blue-600 bg-blue-100";
  return <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium ${cls}`}>{isErr ? <AlertCircle className="h-2.5 w-2.5" /> : isWarn ? <AlertTriangle className="h-2.5 w-2.5" /> : <Info className="h-2.5 w-2.5" />}{code}</span>;
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`truncate ml-1 max-w-[120px] text-foreground ${valueClass ?? ""}`} title={value}>{value}</span>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded border border-danger/30 bg-danger/5 px-2 py-1.5">
      <div className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-danger" /><span className="text-[9px] font-semibold text-danger">Error</span></div>
      <p className="text-[9px] text-danger/80 mt-0.5">{message}</p>
    </div>
  );
}

function FooterProgress({ status, failed }: { status: string; failed?: string | null }) {
  const step = PROGRESS_STEPS.indexOf(status);
  const failedStep = failed ? PROGRESS_STEPS.indexOf(failed) : -1;
  return (
    <div className="flex items-center w-full h-full px-3 gap-1.5">
      {PROGRESS_STEPS.map((st, i) => {
        const f = STATUS_FLOW[st];
        const done = i < step;
        const current = i === step;
        const isFailed = i === failedStep;
        const last = i === PROGRESS_STEPS.length - 1;
        return (
          <div key={st} className="flex items-center gap-1 flex-1 min-w-0">
            <div className={`flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[8px] font-medium leading-tight truncate transition-all
              ${isFailed ? "bg-red-100 text-red-700 ring-1 ring-red-400 font-semibold" : current ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400 font-semibold" : done ? "bg-emerald-50 text-emerald-700" : "bg-muted/40 text-muted-foreground/70"}
            `}>
              {isFailed ? <AlertCircle className="h-2.5 w-2.5 text-red-500 shrink-0" /> : current ? <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shrink-0" /> : done ? <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" /> : <div className="h-1 w-1 rounded-full bg-border/60 shrink-0" />}
              <span className="truncate">{f.label}</span>
            </div>
            {!last && (
              <div className={`h-[3px] flex-1 rounded-full ${isFailed ? "bg-red-400" : done ? "bg-emerald-400" : "bg-border/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FilePreviewGrid({ data, loading, error }: { data: any; loading: boolean; error?: any }) {
  const headers: string[] = data?.columnHeaders ?? [];
  const allRows: Array<{ rowNumber: number; columns: (string | null)[] }> = data?.sampleRows ?? [];
  const total = data?.totalRows ?? 0;
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const rows = allRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const colWidths = useMemo(() => {
    if (headers.length === 0) return [] as number[];
    return headers.map((h: string) => Math.max(90, Math.min(h.length * 10 + 32, 280)));
  }, [headers]);

  if (loading) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-success animate-bounce mr-2" />Loading preview…</div>;
  if (error) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-8 w-8 stroke-current text-danger mx-auto mb-2" />
        <p className="text-xs text-danger font-medium mb-1">Preview Error</p>
        <p className="text-[10px] text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
  if (data?.errors && data.errors.length > 0) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-8 w-8 stroke-current text-danger mx-auto mb-2" />
        <p className="text-xs text-danger font-medium mb-1">Preview Error</p>
        <p className="text-[10px] text-muted-foreground">{data.errors[0].message}</p>
      </div>
    </div>
  );
  if (!data || headers.length === 0) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground"><Upload className="h-8 w-8 stroke-current opacity-30 mr-2" />Run Preview to see data</div>;
  const firstRow = allRows.length > 0 ? allRows[0].rowNumber : 0;
  const lastShown = allRows.length > 0 ? allRows[Math.min((safePage + 1) * PAGE_SIZE, allRows.length) - 1].rowNumber : 0;
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-1.5 py-1 text-[9px] text-muted-foreground border-b border-border/20 bg-muted/40">
        <span className="font-medium">{data.fileName ?? "Preview"}</span>
        <span>{total} row{total !== 1 ? "s" : ""} · {headers.length} column{headers.length !== 1 ? "s" : ""} · {data.activeSheet ? `Sheet: ${data.activeSheet}` : ""}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[11px] font-mono" style={{ tableLayout: "fixed" as any }}>
          <thead>
            <tr className="sticky top-0 z-30 bg-muted">
              <th className="sticky left-0 z-40 bg-muted border-r-2 border-b-2 border-border/30 px-1.5 py-1.5 text-[9px] font-bold text-foreground text-center"
                style={{ width: 44, minWidth: 44, maxWidth: 44 }}>#</th>
              {headers.map((h: string, ci: number) => (
                <th key={ci} className="border-r border-b-2 border-border/30 px-1.5 py-1.5 text-[9px] font-bold text-foreground text-left whitespace-nowrap overflow-hidden text-ellipsis bg-muted"
                  style={{ width: colWidths[ci], minWidth: colWidths[ci], maxWidth: colWidths[ci] }}
                  title={h}>
                  <span className="mr-1 inline-flex min-w-4 items-center justify-center rounded border border-border/30 bg-card/90 px-1 py-0.5 text-[7.7px] font-semibold leading-none text-foreground/80 shadow-sm shrink-0">{colLetter(ci)}</span>
                  <span className="truncate">{h}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length + 1} className="text-center py-6 text-[10px] text-muted-foreground">No data rows</td></tr>
            ) : rows.map((row, ri) => { return (
                <tr key={`${safePage}-${ri}`}
                  className={`transition-colors ${ri % 2 === 0 ? "bg-card" : "bg-muted/[0.04]"} hover:bg-indigo-500/10`}>
                  <td className="sticky left-0 z-10 bg-[inherit] hover:bg-[inherit] border-r-2 border-border/10 px-1.5 py-0.5 text-[9px] text-muted-foreground text-center font-medium leading-tight"
                    style={{ width: 44, minWidth: 44, maxWidth: 44 }}>{row.rowNumber}</td>
              {headers.map((_: string, ci: number) => (
                    <td key={ci} className="border-r border-border/10 px-1 py-0.5 text-foreground truncate overflow-hidden text-ellipsis whitespace-nowrap leading-tight hover:bg-amber-500/10 hover:shadow-inner cursor-default"
                      style={{ width: colWidths[ci], minWidth: colWidths[ci], maxWidth: colWidths[ci] }}
                      title={row.columns[ci] ?? ""}>
                      {row.columns[ci] ?? <span className="text-muted-foreground/30">—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 h-8 flex items-center justify-between px-1.5 text-[10px] text-muted-foreground border-t border-border/20 bg-muted/40">
        <span>Rows {firstRow}–{lastShown} of {total}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="h-6 px-1.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-card disabled:opacity-30 disabled:pointer-events-none">
            ← Prev
          </button>
          <span className="text-muted-foreground/60">{safePage + 1} / {totalPages}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="h-6 px-1.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-card disabled:opacity-30 disabled:pointer-events-none">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function ValidationPanel({ data, loading, onJumpToRow }: { data: any; loading: boolean; onJumpToRow?: (rowNumber: number) => void }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const issues: any[] = data?.items ?? [];
  const selected = selectedIdx !== null ? issues[selectedIdx] : null;
  if (loading) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-success animate-bounce mr-2" />Loading…</div>;
  return (
    <div className="h-full flex">
      <div className="w-1/2 border-r border-border/20 overflow-y-auto">
        {issues.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground"><ShieldAlert className="h-8 w-8 stroke-current opacity-30 mr-2" />No validation issues</div>
        ) : issues.map((iss: any, i: number) => (
          <button key={i} onClick={() => { setSelectedIdx(i); if (iss.rowNumber && onJumpToRow) onJumpToRow(iss.rowNumber); }}
            className={`w-full text-left px-2 py-1.5 border-b border-border/10 text-[10px] hover:bg-muted/30 transition-colors ${selectedIdx === i ? "bg-muted/40 ring-1 ring-inset ring-border/30" : ""}`}>
            <div className="flex items-center gap-1.5">
              <SeverityBadge code={iss.errorCode} />
              <span className="font-medium text-foreground truncate">{iss.entityType}</span>
              {iss.rowNumber && <span className="text-muted-foreground shrink-0">Row {iss.rowNumber}</span>}
            </div>
            <p className="mt-0.5 text-muted-foreground truncate">{iss.message}</p>
          </button>
        ))}
      </div>
      <div className="w-1/2 overflow-y-auto p-2">
        {selected ? (
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center gap-1"><SeverityBadge code={selected.errorCode} /><span className="font-semibold text-foreground">{selected.errorCode}</span></div>
            <div><span className="text-muted-foreground">Entity:</span><span className="ml-1 text-foreground">{selected.entityType}</span></div>
            {selected.sheetName && <div><span className="text-muted-foreground">Sheet:</span><span className="ml-1 text-foreground">{selected.sheetName}</span></div>}
            {selected.rowNumber && <div><span className="text-muted-foreground">Row:</span><span className="ml-1 text-foreground">{selected.rowNumber}</span></div>}
            {selected.fieldName && <div><span className="text-muted-foreground">Field:</span><span className="ml-1 text-foreground">{selected.fieldName}</span></div>}
            {selected.rawValue && <div><span className="text-muted-foreground">Value:</span><span className="ml-1 font-mono text-foreground">"{selected.rawValue}"</span></div>}
            <div className="mt-1 p-1.5 rounded bg-muted/40 text-foreground">{selected.message}</div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">Select an issue</div>
        )}
      </div>
    </div>
  );
}

function DiffTable({ data, loading }: { data: any; loading: boolean }) {
  const items: any[] = data?.items ?? [];
  if (loading) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-success animate-bounce mr-2" />Loading…</div>;
  const groups: Record<string, any[]> = { CREATE: [], UPDATE: [], UNCHANGED: [], CONFLICT: [] };
  for (const it of items) { if (groups[it.action]) groups[it.action].push(it); }
  const colors: Record<string, string> = { CREATE: "text-emerald-600 bg-emerald-100", UPDATE: "text-blue-600 bg-blue-100", UNCHANGED: "text-muted-foreground bg-muted", CONFLICT: "text-red-600 bg-red-100" };
  if (items.length === 0) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground"><DiffIcon className="h-8 w-8 stroke-current opacity-30 mr-2" />No compare results</div>;
  return (
    <div className="h-full overflow-auto">
      {Object.entries(groups).map(([action, rows]) =>
        rows.length > 0 && (
          <div key={action} className="mb-1">
            <div className="sticky top-0 z-10 bg-muted/95 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${action === "CREATE" ? "bg-emerald-500" : action === "UPDATE" ? "bg-blue-500" : action === "CONFLICT" ? "bg-red-500" : "bg-border"}`} />
              {action} ({rows.length})
            </div>
            {rows.map((r: any, i: number) => (
              <div key={i} className="px-2 py-1 border-b border-border/10 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1 py-0.5 text-[8px] font-medium ${colors[action] ?? ""}`}>{r.action}</span>
                  <span className="font-medium text-foreground">{r.entityType}</span>
                  <span className="text-muted-foreground">#{r.stableKey}</span>
                </div>
                {r.diffJson && <pre className="mt-0.5 text-[8px] text-muted-foreground font-mono truncate">{r.diffJson.slice(0, 200)}</pre>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

const PS_STATUS_COLORS: Record<string, string> = {
  MATCH: "text-emerald-600 bg-emerald-100",
  MISSING_IN_APP: "text-amber-600 bg-amber-100",
  MISSING_IN_EXCEL: "text-blue-600 bg-blue-100",
  DIFFERENT: "text-red-600 bg-red-100",
  INVALID_EXCEL_ROW: "text-orange-600 bg-orange-100",
  DUPLICATE_IN_EXCEL: "text-purple-600 bg-purple-100",
};

function PsValidationPanel({ result }: { result: PlantStructureMutationResult | null }) {
  const errors = result?.validationErrors ?? [];
  if (!result || errors.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        <ShieldAlert className="h-8 w-8 stroke-current opacity-30 mr-2" />
        No validation errors
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      {errors.map((err: { field: string; code: string; message: string }, i: number) => (
        <div key={i} className="px-2 py-1.5 border-b border-border/10 text-[10px]">
          <div className="flex items-center gap-1.5">
            <SeverityBadge code={err.code} />
            <span className="font-medium text-foreground truncate">{err.field}</span>
          </div>
          <p className="mt-0.5 text-muted-foreground">{err.message}</p>
        </div>
      ))}
    </div>
  );
}

function PsComparePanel({ result }: { result: PlantStructureMutationResult | null }) {
  const rows = result?.compareRows ?? [];
  if (!result || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        <DiffIcon className="h-8 w-8 stroke-current opacity-30 mr-2" />
        No compare results
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      {rows.map((row: { sheet: string; rowNumber: number; entityType: string; businessKey: string; status: string; fieldDifferences: Array<{ field: string; excelValue: string; appValue: string }>; message: string }, i: number) => (
        <div key={i} className="px-2 py-1.5 border-b border-border/10 text-[10px]">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1 py-0.5 text-[8px] font-medium ${PS_STATUS_COLORS[row.status] ?? "text-muted-foreground bg-muted"}`}>
              {row.status}
            </span>
            <span className="font-medium text-foreground">{row.entityType}</span>
            <span className="text-muted-foreground">#{row.businessKey}</span>
            {row.rowNumber && <span className="text-muted-foreground/60">Row {row.rowNumber}</span>}
          </div>
          {row.message && <p className="mt-0.5 text-muted-foreground">{row.message}</p>}
          {row.fieldDifferences.length > 0 && (
            <div className="mt-1 ml-2 space-y-0.5">
              {row.fieldDifferences.map((fd: { field: string; excelValue: string; appValue: string }, j: number) => (
                <div key={j} className="flex items-center gap-1 text-[9px]">
                  <span className="font-medium text-foreground">{fd.field}:</span>
                  <span className="text-red-600 line-through">{fd.appValue || "—"}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-600">{fd.excelValue || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ImportJobsPage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobSource, setNewJobSource] = useState("");
  const [newJobFile, setNewJobFile] = useState<File | null>(null);
  const [newJobError, setNewJobError] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewTab, setPreviewTab] = useState("file-preview");
  const [directJob, setDirectJob] = useState<any>(null);
  const newJobFileRef = useRef<HTMLInputElement>(null);
  const createLockRef = useRef(false);

  const PLANT_STRUCTURE_DOMAIN = "PLANT_STRUCTURE";

  const { jobs, sources, loading, refetch, createJob, transitionJob, deleteJob, isCreating, actionLoading, actionError, clearActionError, validatePlantStructure, comparePlantStructure, importPlantStructure, plantStructureResult } = useImportJobs(sourceFilter, statusFilter);

  const jobsById = useMemo(() => dedupeById(jobs), [jobs]);

  const filtered = useMemo(() => {
    let list = jobsById.filter((j: any) => j.status !== "DRAFT");
    if (sourceFilter) list = list.filter((j: any) => j.sourceConfigId === sourceFilter);
    if (statusFilter) list = list.filter((j: any) => j.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((j: any) => j.fileName.toLowerCase().includes(q) || j.sourceConfigName.toLowerCase().includes(q) || j.status.toLowerCase().includes(q));
    }
    return list;
  }, [jobsById, search, sourceFilter, statusFilter]);

  const selectedJob = useMemo(() => {
    if (directJob && directJob.id === selectedJobId) return directJob;
    return jobsById.find((j: any) => j.id === selectedJobId) ?? null;
  }, [jobsById, selectedJobId, directJob]);

  const failedStatusStepMap: Record<string, string> = {
    PREVIEW_FAILED: "PREVIEWED",
    VALIDATION_FAILED: "VALIDATED",
    COMPARE_FAILED: "COMPARED",
    APPLY_FAILED: "READY_TO_APPLY",
  };
  const progressFailedStatus = selectedJob?.status ? (failedStatusStepMap[selectedJob.status] ?? null) : null;

  const { data: previewData, loading: previewLoading, error: previewError } = useQuery<any>(FILE_PREVIEW_QUERY, {
    variables: { jobId: selectedJobId },
    skip: !selectedJobId,
    fetchPolicy: "network-only",
  });
  const previewMeta = previewData?.filePreview;
  const totalRows = previewMeta?.totalRows ?? selectedJob?.recordsProcessed;
  const totalCols = previewMeta?.columnHeaders?.length ?? 0;
  const selectedSheet = previewMeta?.activeSheet ?? null;
  const isPlantStructure = selectedJob?.domain === PLANT_STRUCTURE_DOMAIN;

  const { data: errorData, loading: errorLoading } = useQuery<any>(IMPORT_VALIDATION_ERRORS_QUERY, {
    variables: { jobId: selectedJobId },
    skip: !selectedJobId || previewTab !== "validation" || isPlantStructure,
    fetchPolicy: "network-only",
  });
  const { data: compareData, loading: compareLoading } = useQuery<any>(IMPORT_COMPARE_RESULTS_QUERY, {
    variables: { jobId: selectedJobId },
    skip: !selectedJobId || previewTab !== "compare" || isPlantStructure,
    fetchPolicy: "network-only",
  });
  const { data: logsData, loading: logsLoading } = useQuery<any>(IMPORT_AUDIT_LOGS_QUERY, {
    variables: { jobId: selectedJobId, limit: 5 },
    skip: !selectedJobId,
    fetchPolicy: "network-only",
  });

  const canTransition = (action: string) => {
    if (!selectedJob) return false;
    const flow = STATUS_FLOW[selectedJob.status]; if (!flow) return false;
    if (action === "VALIDATE") return ["FILE_ATTACHED", "PREVIEWED"].includes(selectedJob.status);
    if (action === "COMPARE") return flow.next.includes("COMPARED");
    if (action === "APPLY") return flow.next.includes("READY_TO_APPLY") || flow.next.includes("APPLIED");
    if (action === "RETRY") return ["PREVIEW_FAILED", "VALIDATION_FAILED", "COMPARE_FAILED", "APPLY_FAILED"].includes(selectedJob.status);
    if (action === "CANCEL") return !["CANCELLED", "APPLIED", "ARCHIVED"].includes(selectedJob.status);
    return false;
  };

  const handleAction = useCallback(async (action: string, jobId: string) => {
    clearActionError();
    try {
      if (selectedJob?.domain === PLANT_STRUCTURE_DOMAIN) {
        if (action === "VALIDATE") { await validatePlantStructure(jobId); refetch(); return; }
        if (action === "COMPARE") { await comparePlantStructure(jobId); refetch(); return; }
        if (action === "APPLY") { await importPlantStructure(jobId); refetch(); return; }
      }
      const ok = await transitionJob(action, jobId);
      if (ok) { setDirectJob(null); refetch(); }
    } catch { clearActionError(); }
  }, [selectedJob, validatePlantStructure, comparePlantStructure, importPlantStructure, transitionJob, clearActionError, refetch]);

  const handleOpenNewJob = () => { setNewJobSource(sources[0]?.id ?? ""); setNewJobFile(null); setNewJobError(null); setShowNewJobModal(true); };
  const handleNewJobFilePick = () => newJobFileRef.current?.click();
  const handleNewJobFileChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0] ?? null; if (f) setNewJobFile(f); };
  const handleNewJobSourceChange = (e: ChangeEvent<HTMLSelectElement>) => setNewJobSource(e.target.value);

  const uploadFile = async (jobId: string, file: File): Promise<boolean> => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch(`/api/import-jobs/${encodeURIComponent(jobId)}/upload/`, { method: "POST", body: fd });
      const d = await parseBody(r);
      if (!r.ok || !d?.ok) { setNewJobError(typeof d?.message === "string" ? d.message : `Upload failed (HTTP ${r.status}).`); return false; }
      const newId = typeof d.job_id === "string" ? d.job_id : jobId;
      setDirectJob({ id: newId, fileName: d.file_name ?? "", filePath: d.file_path ?? "", fileSize: d.file_size ?? null, fileHash: d.file_hash ?? null, status: d.status ?? "FILE_ATTACHED", sourceConfigId: "", sourceConfigName: "", domain: "", startedAt: "", completedAt: null, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, errorSummary: null, triggeredBy: null, createdAt: new Date().toISOString() });
      setSelectedJobId(newId); setPreviewTab("file-preview"); refetch(); return true;
    } catch (err) { setNewJobError(err instanceof Error ? err.message : "Upload failed."); return false; }
  };

  const handleConfirmNewJob = async () => {
    if (createLockRef.current) return;
    if (!newJobSource) { setNewJobError("Select an import source."); return; }
    if (!newJobFile) { setNewJobError("Select a file."); return; }
    createLockRef.current = true; setIsSubmitting(true); setNewJobError(null);
    try {
      const fh = await sha256Hex(newJobFile);
      const cr = await createJob(newJobSource, newJobFile.name, fh);
      if (!cr.ok || !cr.job) { if (cr.errorCode === "DUPLICATE_ACTIVE_IMPORT_JOB") { setDuplicateNotice({ message: cr.message ?? "", existingJobId: cr.existingJobId, mode: "create" }); setShowNewJobModal(false); return; } setNewJobError(cr.message ?? "Failed."); return; }
      const up = await uploadFile(cr.job.id, newJobFile); if (!up) return;
      setShowNewJobModal(false);
    } finally { setIsSubmitting(false); createLockRef.current = false; }
  };

  const handleOpenExistingJob = () => { if (duplicateNotice?.existingJobId) setSelectedJobId(duplicateNotice.existingJobId); setDuplicateNotice(null); };
  const handleOpenNewJobFromDupe = () => { setDuplicateNotice(null); setShowNewJobModal(true); window.setTimeout(() => newJobFileRef.current?.click(), 0); };
  const handleDeleteSelectedJob = useCallback(async () => {
    if (!selectedJobId || actionLoading !== null) return;
    if (!window.confirm("Delete the selected import job? This cannot be undone.")) return;
    clearActionError(); const ok = await deleteJob(selectedJobId); if (!ok) return; setSelectedJobId(null); setDirectJob(null); refetch();
  }, [selectedJobId, actionLoading, clearActionError, deleteJob, refetch]);

  const allStatuses = Object.keys(STATUS_FLOW);

  return (
    <AppPageLayout title="Import Jobs" subtitle="Review and process ERP data imports" icon={<Upload />} iconClass="text-indigo-600">
      <div className="flex flex-col h-full overflow-hidden">
        {duplicateNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-lg bg-card border border-border/30 shadow-lg p-4 space-y-3">
              <p className="text-xs text-muted-foreground">{duplicateNotice.message}</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleOpenExistingJob} className="h-7 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted">Open existing job</button>
                <button type="button" onClick={handleOpenNewJobFromDupe} className="h-7 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted">Replace file</button>
                <button type="button" onClick={() => setDuplicateNotice(null)} className="h-7 px-2.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted">Cancel</button>
              </div>
            </div>
          </div>
        )}
        {showNewJobModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-card/85 backdrop-blur-xl border border-border/20 shadow-2xl shadow-black/15">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/10"><h3 className="text-sm font-semibold text-foreground">New Import Job</h3><button type="button" onClick={() => setShowNewJobModal(false)} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"><XCircle className="h-4 w-4 stroke-current" /></button></div>
              <div className="p-4 space-y-3">
                <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Import Source</label>
                  <select value={newJobSource} onChange={handleNewJobSourceChange} className="h-8 w-full rounded-lg border border-border/50 bg-card/90 px-2 text-xs text-foreground outline-none transition-colors focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20">
                    {sources.length === 0 && <option value="">No sources</option>}{sources.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.domain})</option>)}
                  </select></div>
                <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">File</label>
                  <div className="flex items-center gap-2"><input ref={newJobFileRef} type="file" className="hidden" onChange={handleNewJobFileChange} />
                    <button type="button" onClick={handleNewJobFilePick} title="Choose file" className="h-8 flex-1 rounded-lg border border-border/50 bg-card/90 px-3 text-xs text-foreground text-left truncate transition-colors hover:bg-muted focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20">{newJobFile ? newJobFile.name : "Select file…"}</button>
                    <button type="button" onClick={handleNewJobFilePick} title="Browse files" className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/50 bg-card/90 text-muted-foreground hover:bg-muted transition-colors focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"><FolderOpen className="h-4 w-4 stroke-current" /></button>
                  </div></div>
                {newJobError && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">{newJobError}</div>}
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 border-t border-border/10">
                <button type="button" onClick={() => setShowNewJobModal(false)} className="h-8 px-3 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-black/5 transition-colors">Cancel</button>
                <button type="button" onClick={handleConfirmNewJob} disabled={isSubmitting || isCreating || !newJobSource || !newJobFile} className="h-8 px-4 rounded-lg text-[10px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">{isSubmitting || isCreating ? "Working…" : "Create & Upload"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="shrink-0 flex h-10 items-center gap-1 border-b border-border/35 bg-muted/80 px-2.5 select-none">
          <div className="relative w-48"><Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs…" className={inputClass} /></div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-muted-foreground outline-none"><option value="">All Sources</option>{sources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-muted-foreground outline-none"><option value="">All Statuses</option>{allStatuses.map((st) => <option key={st} value={st}>{STATUS_FLOW[st].label}</option>)}</select>
          <div className="flex-1" />
          <button type="button" onClick={handleOpenNewJob} disabled={isCreating || isSubmitting || sources.length === 0} className={tBtn} title="New import job" aria-label="New job"><Plus className="h-4 w-4 stroke-current" /></button>
          <button type="button" onClick={handleDeleteSelectedJob} disabled={!selectedJobId || !!actionLoading} className={tBtn} title={"Delete" + (!selectedJobId ? " (select a job)" : "")} aria-label="Delete"><Trash2 className="h-4 w-4 stroke-current" /></button>
          <button type="button" onClick={() => refetch()} className={tBtn} title="Refresh"><RefreshCw className="h-4 w-4 stroke-current" /></button>
          {actionLoading && <span className="text-[10px] text-blue-600 ml-1 whitespace-nowrap">{actionLoading}…</span>}
          {actionError && <span className="text-[10px] text-red-600 ml-1 whitespace-nowrap">{actionError}</span>}
        </div>

        {/* Three-column content */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar - Jobs List */}
          <div className="w-[22%] min-w-[180px] max-w-[280px] shrink-0 border-r border-border/30 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {loading ? <div className="flex items-center justify-center h-16"><div className="h-2 w-2 rounded-full bg-success animate-bounce" /></div>
              : filtered.length === 0 ? <div className="p-3 text-center text-[10px] text-muted-foreground">No jobs found</div>
              : filtered.map((job: any) => {
                const flow = STATUS_FLOW[job.status] ?? STATUS_FLOW.FILE_ATTACHED;
                return (
                  <button key={job.id} type="button" onClick={() => { setSelectedJobId(job.id); clearActionError(); }}
                    className={`w-full text-left px-3 py-2 border-b border-border/5 transition-colors hover:bg-muted/20 ${selectedJobId === job.id ? "bg-indigo-500/8 ring-1 ring-inset ring-indigo-300/40" : ""}`}>
                    <div className="flex gap-2">
                      <flow.icon className={`h-4 w-4 shrink-0 stroke-current mt-0.5 ${flow.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-foreground truncate">{job.fileName || "Untitled"}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground/70 truncate">{job.sourceConfigName}</span>
                          <span className="text-[11px] text-muted-foreground/50">{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="shrink-0 h-8 border-t border-border/20 bg-muted/30 flex items-center px-2 text-[10px] text-muted-foreground">
              <span>{filtered.length} job{filtered.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Center - Main Workspace */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedJob ? (
              <>
                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border/10 bg-muted/15">
                  <FileSpreadsheet className="h-4 w-4 stroke-current text-indigo-500 shrink-0" />
                  <span className="text-[12px] font-semibold text-foreground truncate">{selectedJob.fileName || "Import Job"}</span>
                  <div className="flex-1" />
                  <span className="text-[9px] text-muted-foreground/60">{totalRows ?? 0} rows · {totalCols ?? 0} columns{selectedSheet ? ` · ${selectedSheet}` : ""}</span>
                </div>
                <div className="shrink-0 px-3 pt-1.5 pb-1.5 bg-muted/5 border-b border-border/10">
                  <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
                    {PREVIEW_TABS.map((tab) => {
                      const TI = tab.icon;
                      const tip = selectedJob && tab.id === "validation" && selectedJob.status === "FILE_ATTACHED" ? "Run Validate to see results" : selectedJob && tab.id === "compare" && ["FILE_ATTACHED", "PREVIEWED", "VALIDATED"].includes(selectedJob.status) ? "Run Compare to see results" : tab.id === "apply" && !["READY_TO_APPLY", "COMPARED"].includes(selectedJob?.status ?? "") ? "Apply will be available after Compare" : "";
                      return (
                        <button key={tab.id} type="button" onClick={() => setPreviewTab(tab.id)}
                          title={tip}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-sm transition-colors shrink-0 whitespace-nowrap
                            ${previewTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/20"}`}>
                          <TI className="h-3 w-3 stroke-current" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {previewTab === "file-preview" && <FilePreviewGrid data={previewData?.filePreview} loading={previewLoading} error={previewError} />}
                  {previewTab === "validation" && (
                    isPlantStructure && plantStructureResult
                      ? <PsValidationPanel result={plantStructureResult} />
                      : <ValidationPanel data={errorData?.importValidationErrors} loading={errorLoading} onJumpToRow={() => setPreviewTab("file-preview")} />
                  )}
                  {previewTab === "compare" && (
                    isPlantStructure && plantStructureResult
                      ? <PsComparePanel result={plantStructureResult} />
                      : <DiffTable data={compareData?.importCompareResults} loading={compareLoading} />
                  )}
                  {!["file-preview", "validation", "compare"].includes(previewTab) && (
                    <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground">
                      {(() => { const t = PREVIEW_TABS.find((x) => x.id === previewTab); const TI = t?.icon ?? Info; return <><TI className="h-8 w-8 stroke-current opacity-30 mr-2" /><span>{t?.label ?? "View"}</span></>; })()}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full"><div className="text-center"><Upload className="h-10 w-10 stroke-current text-indigo-600/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">Select a job to preview its data</p></div></div>
            )}
          </div>

          {/* Right panel - Actions + Summary + Logs */}
          <div className="w-[240px] min-w-[200px] max-w-[280px] shrink-0 border-l border-border/30 flex flex-col bg-muted/5">
            {selectedJob ? (
              <>
                {/* Actions — sticky top */}
                <div className="shrink-0 px-2 py-1.5 border-b border-border/10 bg-muted/10">
                  <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 px-0.5">Actions</div>
                  <div className="flex flex-col gap-0.5">
                    {[
                      { a: "VALIDATE", icon: CheckCircle, l: "Validate" },
                      { a: "COMPARE", icon: GitCompare, l: "Compare" },
                      { a: "APPLY", icon: Play, l: "Apply" },
                      { a: "RETRY", icon: RefreshCw, l: "Retry" },
                      { a: "CANCEL", icon: XCircle, l: "Cancel" },
                    ].filter(({ a }) => canTransition(a)).map(({ a, icon: AI, l }) => (
                      <button key={a} type="button" onClick={() => handleAction(a, selectedJob.id)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-sm text-[10px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-35 disabled:pointer-events-none">
                        <AI className="h-3.5 w-3.5 stroke-current shrink-0" />
                        <span>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary + Logs — scrollable */}
                <div className="flex-1 overflow-y-auto px-2.5 pt-3 pb-2 space-y-2.5 text-[10px]">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">General</div>
                  <div className="space-y-0.5">
                    <InfoRow label="Source" value={selectedJob.sourceConfigName} />
                    <InfoRow label="File" value={selectedJob.fileName || "-"} />
                    <InfoRow label="Domain" value={selectedJob.domain} />
                    <InfoRow label="Created" value={new Date(selectedJob.createdAt).toLocaleString()} />
                  </div>
                  <hr className="border-border/5" />
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">File Metadata</div>
                    <div className="space-y-0.5">
                      <InfoRow label="Size" value={selectedJob.fileSize ? `${(selectedJob.fileSize / 1024).toFixed(1)} KB` : "-"} />
                      <InfoRow label="Hash" value={selectedJob.fileHash ? selectedJob.fileHash.slice(0, 8) + "…" : "-"} />
                      <InfoRow label="Path" value={selectedJob.filePath || "-"} />
                    </div>
                  </div>
                  <hr className="border-border/5" />
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Statistics</div>
                    {isPlantStructure && plantStructureResult ? (
                      <div className="space-y-0.5">
                        <InfoRow label="Total Created" value={String(plantStructureResult.totalCreated)} valueClass="text-emerald-600" />
                        <InfoRow label="Total Updated" value={String(plantStructureResult.totalUpdated)} valueClass="text-blue-600" />
                        <InfoRow label="Companies" value={`${plantStructureResult.companiesCreated}C / ${plantStructureResult.companiesUpdated}U`} />
                        <InfoRow label="Plants" value={`${plantStructureResult.plantsCreated}C / ${plantStructureResult.plantsUpdated}U`} />
                        <InfoRow label="Lines" value={`${plantStructureResult.linesCreated}C / ${plantStructureResult.linesUpdated}U`} />
                        <InfoRow label="Departments" value={`${plantStructureResult.departmentsCreated}C / ${plantStructureResult.departmentsUpdated}U`} />
                        <InfoRow label="Assignments" value={`${plantStructureResult.assignmentsCreated}C / ${plantStructureResult.assignmentsUpdated}U`} />
                        <InfoRow label="Res. Groups" value={`${plantStructureResult.resourceGroupsCreated}C / ${plantStructureResult.resourceGroupsUpdated}U`} />
                        <InfoRow label="Resources" value={`${plantStructureResult.resourcesCreated}C / ${plantStructureResult.resourcesUpdated}U`} />
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <InfoRow label="Processed" value={String(selectedJob.recordsProcessed)} />
                        <InfoRow label="Created" value={String(selectedJob.recordsCreated)} valueClass="text-emerald-600" />
                        <InfoRow label="Updated" value={String(selectedJob.recordsUpdated)} valueClass="text-blue-600" />
                        <InfoRow label="Failed" value={String(selectedJob.recordsFailed)} valueClass="text-red-600" />
                      </div>
                    )}
                  </div>
                  <hr className="border-border/5" />
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Logs</div>
                    {logsLoading ? (
                      <div className="text-[9px] text-muted-foreground py-1">Loading…</div>
                    ) : (
                      <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                        {(logsData?.importAuditLogs?.items ?? []).length === 0 ? (
                          <div className="text-[9px] text-muted-foreground">No log entries</div>
                        ) : logsData.importAuditLogs.items.slice(0, 5).map((log: any, i: number) => (
                          <div key={i} className="text-[9px] leading-snug py-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground/60 shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
                              <span className="rounded bg-muted px-0.5 text-[7px] font-medium text-foreground">{log.action}</span>
                            </div>
                            <div className="text-muted-foreground truncate">{log.message}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedJob.errorSummary && <ErrorBox message={selectedJob.errorSummary} />}
                </div>
                <div className="shrink-0 h-8 border-t border-border/20 bg-muted/30" />
              </>
            ) : <div className="flex items-center justify-center h-full p-3 text-[10px] text-muted-foreground text-center">Select a job</div>}
          </div>
        </div>

        {/* Footer progress bar */}
        <div className="shrink-0 h-8 border-t border-border/25 bg-muted/50">
          {selectedJob ? (
            <FooterProgress status={selectedJob.status} failed={progressFailedStatus} />
          ) : (
            <div className="flex items-center h-full px-2 text-[8px] text-muted-foreground">Select a job to view progress</div>
          )}
        </div>
      </div>
    </AppPageLayout>
  );
}

