import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { theme } from "@/styles/themeTokens";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Database, Upload, ShieldCheck, RefreshCw, FileSpreadsheet,
  XCircle, Eye, ArrowUpFromLine, Plus,
} from "lucide-react";
import { ERP_IMPORT_PATTERNS_QUERY, ERP_IMPORT_LOGS_QUERY } from "@/graphql/erpDataManagementQueries";
import {
  VALIDATE_ERP_PATTERN, EXECUTE_ERP_IMPORT, RESET_ERP_IMPORT_WORKSPACE,
} from "@/graphql/erpDataManagementMutations";
import { uploadErpSourceFile } from "./graphqlUpload";

const toolBtnCls = theme.toolbarBtn;

interface BackendPattern {
  id: string; name: string; destinationEntity: string;
  sourceFileType: string; sourceFilePattern: string;
  sourceSchemaJson?: string; isActive: boolean;
}

interface ValidationResult {
  status: string; errors: string[]; warnings: string[]; missingFields: string[];
}

interface ImportResult {
  patternId: string; patternName: string; status: string;
  rowsAdded: number; rowsUpdated: number; rowsNotUpdated: number;
  rowsFailed: number; errorMessage: string;
}

const STATUS_BADGE: Record<string, string> = {
  "Ready to validate": "bg-muted/50 text-muted-foreground border border-border/40",
  MISSING_FILE: "bg-amber-50 text-amber-700 border border-amber-200",
  MISSING_FIELDS: "bg-amber-50 text-amber-700 border border-amber-300",
  INVALID_FILE: "bg-red-50 text-red-700 border border-red-200",
  READY: "bg-green-50 text-green-700 border border-green-200",
  IMPORTED: "bg-green-50 text-green-700 border border-green-200",
  FAILED: "bg-red-50 text-red-700 border border-red-200",
};

export function ErpImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [validationMap, setValidationMap] = useState<Record<string, ValidationResult>>({});
  const [, setImportResultMap] = useState<Record<string, ImportResult>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [previewPatternId, setPreviewPatternId] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { data: patternsData, refetch: refetchPatterns } = useQuery<{ erpImportPatterns: BackendPattern[] }>(
    ERP_IMPORT_PATTERNS_QUERY, { fetchPolicy: "cache-and-network" },
  );

  const { data: logsData, refetch: refetchLogs } = useQuery<{ erpImportLogs: any[] }>(
    ERP_IMPORT_LOGS_QUERY, { fetchPolicy: "cache-and-network" },
  );

  const [doValidate] = useMutation<{ validateErpPattern: ValidationResult }>(VALIDATE_ERP_PATTERN);
  const [doImport] = useMutation<{ executeErpImport: ImportResult }>(EXECUTE_ERP_IMPORT);
  const [doReset] = useMutation<{ resetErpImportWorkspace: boolean }>(RESET_ERP_IMPORT_WORKSPACE);

  const patterns = useMemo(() => patternsData?.erpImportPatterns ?? [], [patternsData]);

  const logsByPattern = useMemo(() => {
    const map: Record<string, any> = {};
    for (const log of logsData?.erpImportLogs ?? []) {
      if (!map[log.patternId] || new Date(log.createdAt) > new Date(map[log.patternId].createdAt)) {
        map[log.patternId] = log;
      }
    }
    return map;
  }, [logsData]);

  const rows = useMemo(() => {
    return patterns.map(p => {
      const val = validationMap[p.id];
      const log = logsByPattern[p.id];
      let status: string;
      if (!val) status = "Ready to validate";
      else status = val.status;
      return {
        pattern: p,
        validationStatus: status,
        hasSource: false,
        added: log?.rowsAdded ?? 0,
        updated: log?.rowsUpdated ?? 0,
        notUpdated: log?.rowsNotUpdated ?? 0,
        failed: log?.rowsFailed ?? 0,
        hasImportedLog: log?.status === "IMPORTED",
      };
    });
  }, [patterns, validationMap, logsByPattern]);

  const filteredRows = useMemo(() => rows, [rows]);

  const readyForImport = useMemo(
    () => filteredRows.filter(r => r.validationStatus === "READY"),
    [filteredRows],
  );

  const selectedCount = useMemo(
    () => selectedRows.size > 0 ? selectedRows.size : 0,
    [selectedRows],
  );

  const canImportBulk = useMemo(
    () => selectedRows.size > 0 && readyForImport.some(r => selectedRows.has(r.pattern.id)) && !importing,
    [selectedRows, readyForImport, importing],
  );

  const handleFilePicked = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await uploadErpSourceFile(file);
      await refetchPatterns();
    } catch (err: any) {
      console.error("Upload failed", err);
    }
  }, [refetchPatterns]);

  const handleValidate = useCallback(async (patternId: string) => {
    try {
      const { data } = await doValidate({ variables: { patternId: Number(patternId) } });
      if (data?.validateErpPattern) {
        setValidationMap(prev => ({ ...prev, [patternId]: data.validateErpPattern }));
      }
    } catch (err: any) {
      setValidationMap(prev => ({
        ...prev,
        [patternId]: { status: "FAILED", errors: [err.message], warnings: [], missingFields: [] },
      }));
    }
  }, [doValidate]);

  const handleImport = useCallback(async (patternId: string) => {
    setImporting(true);
    try {
      const { data } = await doImport({ variables: { patternId: Number(patternId), confirmed: true } });
      if (data?.executeErpImport) {
        setImportResultMap(prev => ({ ...prev, [patternId]: data.executeErpImport }));
      }
    } catch (err: any) {
      console.error("Import failed", err);
    }
    setImporting(false);
  }, [doImport]);

  const handleImportAll = useCallback(async () => {
    setShowImportConfirm(false);
    setImporting(true);
    const ready = readyForImport.filter(r => selectedRows.has(r.pattern.id));
    const results: ImportResult[] = [];
    for (const r of ready) {
      try {
        const { data } = await doImport({ variables: { patternId: Number(r.pattern.id), confirmed: true } });
        if (data?.executeErpImport) {
          results.push(data.executeErpImport);
          setImportResultMap(prev => ({ ...prev, [r.pattern.id]: data.executeErpImport }));
        }
      } catch (err: any) {
        console.error("Import failed for", r.pattern.name, err);
      }
    }
    setImporting(false);
  }, [readyForImport, selectedRows, doImport]);

  const handleResetConfirm = useCallback(async () => {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      await doReset({ variables: { confirmed: true } });
      setValidationMap({});
      setImportResultMap({});
      setSelectedRows(new Set());
      await Promise.all([refetchPatterns(), refetchLogs()]);
    } catch (err: any) {
      console.error("Reset failed", err);
    }
    setResetting(false);
  }, [doReset, refetchPatterns, refetchLogs]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedRows.size === filteredRows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filteredRows.map(r => r.pattern.id)));
  }, [filteredRows, selectedRows]);

  const displayStatus = (r: typeof rows[0]) => {
    if (r.hasImportedLog && r.validationStatus === "Ready to validate") return "IMPORTED";
    if (r.validationStatus === "READY" && r.hasImportedLog) return "IMPORTED";
    return r.validationStatus;
  };

  const displayCount = (val: number) => val > 0 ? val : "—";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader icon={<Database className="h-5 w-5 stroke-current" />} iconClass={theme.iconBoxEmerald}
        title="ERP Import" subtitle="Import ERP files using saved ERP Patterns" />

      <div className="shrink-0 flex items-center border-b border-border/35 bg-muted py-2 select-none overflow-hidden">
        <div className="flex h-full items-center px-2 shrink-0">
          <select disabled className="h-7 w-50 cursor-pointer bg-card px-1.5 text-xs text-muted-foreground outline-none transition-colors focus:border-b-2 focus:border-info opacity-40">
            <option value="">All Patterns</option>
          </select>
        </div>
        <span className="h-5 w-px shrink-0 bg-border/25" />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 px-2 overflow-hidden">
          <input ref={fileInputRef} type="file" onChange={handleFilePicked} className="hidden" accept=".xlsx,.xls,.csv,.tsv,.txt,.xml,.json" />

          <button onClick={() => fileInputRef.current?.click()} title="Upload source file" className={toolBtnCls}>
            <Upload className="h-4 w-4 stroke-current" /> Upload
          </button>
          <button onClick={() => setShowImportConfirm(true)} disabled={!canImportBulk}
            className={theme.toolbarBtnPrimary}>
            {importing ? <RefreshCw className="h-4 w-4 stroke-current animate-spin" /> : <ArrowUpFromLine className="h-4 w-4 stroke-current" />} Import
          </button>
          <button onClick={() => setShowResetConfirm(true)} title="Reset" className={toolBtnCls}>
            <RefreshCw className="h-4 w-4 stroke-current" /> Reset
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Database className="h-8 w-8 text-muted-foreground/25 mb-2 stroke-current" />
            <p className="text-sm font-medium text-muted-foreground">No ERP Patterns found</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Create an ERP Pattern to start importing.</p>
            <button onClick={() => navigate("/system/erp-data/erp-patterns")} className="mt-3 inline-flex h-7 items-center gap-1 rounded px-2.5 text-[10px] font-medium text-primary hover:bg-primary/10 border border-primary/30 transition-colors">
              <Plus className="h-3 w-3 stroke-current" /> Create Pattern
            </button>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr className="text-left bg-muted/30 sticky top-0 z-10 border-b border-border/20">
                <th className="py-2 px-3 w-8">
                  <input type="checkbox" checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                    onChange={toggleSelectAll} className="h-3.5 w-3.5 cursor-pointer" />
                </th>
                <th className="py-2 px-3 font-semibold text-muted-foreground w-[25%]">Pattern</th>
                <th className="py-2 px-3 font-semibold text-muted-foreground w-[12%]">Destination</th>
                <th className="py-2 px-3 font-semibold text-muted-foreground w-[20%]">Source</th>
                <th className="py-2 px-3 font-semibold text-muted-foreground w-[10%]">Validation</th>
                <th className="py-2 px-3 font-semibold text-muted-foreground text-center w-[6%]">Added</th>
                <th className="py-2 px-3 font-semibold text-muted-foreground text-center w-[6%]">Updated</th>
                <th className="py-2 px-3 font-semibold text-muted-foreground text-center w-[7%]">Not Updated</th>
                <th className="py-2 px-3 font-semibold text-muted-foreground text-center w-[6%]">Failed</th>
                <th className="py-2 px-3 font-semibold text-muted-foreground w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(r => (
                <tr key={r.pattern.id} className={`border-b border-border/10 transition-colors ${previewPatternId === r.pattern.id ? "bg-primary/5" : "hover:bg-muted/20"} ${selectedRows.has(r.pattern.id) ? "bg-primary/[0.03]" : ""}`}>
                  <td className="py-2 px-3">
                    <input type="checkbox" checked={selectedRows.has(r.pattern.id)} onChange={() => toggleSelect(r.pattern.id)} className="h-3.5 w-3.5 cursor-pointer" />
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-foreground">{r.pattern.name}</div>
                  </td>
                  <td className="py-2 px-3 text-foreground">{r.pattern.destinationEntity}</td>
                  <td className="py-2 px-3">
                    <span className="text-foreground truncate inline-block max-w-full" title={r.pattern.sourceFilePattern || `${r.pattern.sourceFileType}`}>
                      {r.pattern.sourceFilePattern || `*.${r.pattern.sourceFileType}`}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center rounded px-1.5 py-px text-[8px] font-medium ${STATUS_BADGE[displayStatus(r)] || "bg-muted/50 text-muted-foreground border border-border/40"}`}>
                      {displayStatus(r)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center text-success font-medium">{displayCount(r.added)}</td>
                  <td className="py-2 px-3 text-center text-info font-medium">{displayCount(r.updated)}</td>
                  <td className="py-2 px-3 text-center text-warning font-medium">{displayCount(r.notUpdated)}</td>
                  <td className="py-2 px-3 text-center text-destructive font-medium">{displayCount(r.failed)}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleValidate(r.pattern.id)}
                        title="Validate source data" className={toolBtnCls}>
                        <ShieldCheck className="h-3 w-3 stroke-current" />
                      </button>
                      <button onClick={() => setPreviewPatternId(prev => prev === r.pattern.id ? null : r.pattern.id)}
                        title="Preview field mappings" className={toolBtnCls}>
                        <Eye className="h-3 w-3 stroke-current" />
                      </button>
                      <button onClick={() => handleImport(r.pattern.id)}
                        disabled={r.validationStatus !== "READY" || importing}
                        title={r.validationStatus === "READY" ? "Import data" : "Validate before import"} className={toolBtnCls}>
                        <ArrowUpFromLine className="h-3 w-3 stroke-current" />
                      </button>
                      <button onClick={() => navigate("/system/erp-data/erp-patterns")} title="Open ERP Pattern" className={toolBtnCls}>
                        <FileSpreadsheet className="h-3 w-3 stroke-current" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {previewPatternId && (() => {
        const pp = patterns.find(p => p.id === previewPatternId);
        if (!pp) return null;
        return (
          <div className="shrink-0 border-t border-border/20 bg-card overflow-y-auto" style={{ maxHeight: "30%" }}>
            <div className="flex items-center gap-2 px-3 h-8 border-b border-border/20 bg-muted/30">
              <Eye className="h-3.5 w-3.5 text-muted-foreground stroke-current" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview — {pp.name}</span>
              <button onClick={() => setPreviewPatternId(null)} title="Close preview" className="ml-auto flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground transition-colors">
                <XCircle className="h-3.5 w-3.5 stroke-current" />
              </button>
            </div>
            <div className="p-3 text-[10px] text-muted-foreground">
              <div className="space-y-1">
                <div className="flex justify-between"><span>Destination</span><span className="text-foreground font-medium">{pp.destinationEntity}</span></div>
                <div className="flex justify-between"><span>Source File Pattern</span><span className="text-foreground font-medium">{pp.sourceFilePattern || `*.${pp.sourceFileType}`}</span></div>
                <div className="flex justify-between"><span>Active</span><span className="text-foreground font-medium">{pp.isActive ? "Yes" : "No"}</span></div>
              </div>
              <button onClick={() => navigate("/system/erp-data/erp-patterns")} className="mt-2 text-[9px] text-primary hover:underline font-medium inline-block">Open in ERP Pattern →</button>
            </div>
          </div>
        );
      })()}

      <div className="shrink-0 flex h-10 items-center gap-4 min-w-0 overflow-hidden border-t border-border/20 bg-muted/50 px-4 pr-6 text-xs font-medium text-muted-foreground select-none">
        <span className="shrink-0">{filteredRows.length} pattern{filteredRows.length !== 1 ? "s" : ""}</span>
        <span className="h-4 w-px bg-border/30 shrink-0" />
        <span className="shrink-0">{readyForImport.length} ready for import</span>
        {selectedCount > 0 && (
          <>
            <span className="h-4 w-px bg-border/30 shrink-0" />
            <span className="shrink-0">{selectedCount} selected</span>
          </>
        )}
        <span className="flex-1" />
        {(importing || resetting) && <span className="text-[10px] text-info flex items-center gap-1"><RefreshCw className="h-3 w-3 stroke-current animate-spin" /> {importing ? "Importing..." : "Resetting..."}</span>}
      </div>

      <ConfirmDialog open={showImportConfirm} onClose={() => setShowImportConfirm(false)} onConfirm={handleImportAll}
        title="Confirm import?"
        message="Import/update database records using selected ERP Pattern and source file."
        confirmLabel="Import / Update" danger={false} />

      <ConfirmDialog open={showResetConfirm} onClose={() => setShowResetConfirm(false)} onConfirm={handleResetConfirm}
        title="Reset ERP import workspace?"
        message="This refreshes patterns, clears selection, and deletes ERP source files only. Logs and patterns are preserved."
        confirmLabel="Reset" danger />
    </div>
  );
}
