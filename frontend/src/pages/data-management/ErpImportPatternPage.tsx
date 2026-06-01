import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { theme } from "@/styles/themeTokens";
import { PageHeader } from "@/pages/shared/PageHeader";
import {
  Database, Plus, Pencil, Trash2, Save, X, AlertCircle, ArrowLeft, Search,
  RotateCcw, XCircle, Loader2, RefreshCw, FileSpreadsheet, ChevronDown, Upload,
} from "lucide-react";
import {
  ERP_IMPORT_PATTERNS_QUERY,
  ERP_IMPORT_PATTERN_MAPPINGS_QUERY,
  ERP_LIST_SOURCE_FILES,
  ERP_DESTINATION_DEFINITION,
} from "@/graphql/erpImportPatternQueries";
import { ERP_STRUCTURE_DEFINITION } from "@/graphql/lineageQueries";
import {
  CREATE_ERP_IMPORT_PATTERN,
  UPDATE_ERP_IMPORT_PATTERN,
  DELETE_ERP_IMPORT_PATTERN,
  REPLACE_ERP_IMPORT_PATTERN_MAPPINGS,
  UPLOAD_SOURCE_FILE,
} from "@/graphql/erpImportPatternMutations";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Pattern {
  id: string; name: string; description: string; scope: string;
  destinationEntity: string; isActive: boolean; createdBy: string;
  sourceFilePattern: string; plantSelectionJson: string;
  departmentSelectionJson: string; resourceGroupSelectionJson: string;
  createdAt: string; updatedAt: string;   fieldCount: number;
  sourceSchemaJson?: string;
}

interface FieldMapping {
  id: string; patternId: string; sourceName: string; sourceDataType: string;
  destinationName: string; destinationDataType: string; isRequired: boolean; sortOrder: number;
  _isUserAdded?: boolean;
}

const SCOPE_OPTIONS = [
  { value: "PLANT_STRUCTURE", label: "Plant Structure" },
  { value: "PRODUCT_MASTER", label: "Product Master" },
  { value: "MATERIALS", label: "Materials" },
  { value: "WAREHOUSE_BINS", label: "Warehouse Bins" },
  { value: "ROUTING", label: "Routing" },
  { value: "SCHEDULES", label: "Schedules" },
  { value: "CAPACITY", label: "Capacity" },
  { value: "QUALITY", label: "Quality" },
  { value: "CUSTOM", label: "Custom" },
];

const SCOPE_DESTINATIONS: Record<string, { value: string; label: string }[]> = {
  PLANT_STRUCTURE: [
    { value: "Department", label: "Department" },
    { value: "ResourceGroup", label: "Resource Group" },
    { value: "Resource", label: "Resource" },
  ],
  PRODUCT_MASTER: [
    { value: "ProductFamily", label: "Product Family" },
    { value: "ProductModel", label: "Product Model" },
    { value: "ProductVariant", label: "Product Variant" },

    { value: "BOM", label: "BOM" },
    { value: "Routing", label: "Routing" },
  ],
};

const toolBtnCls = theme.toolbarBtn;
const inputCls = `h-7 w-full rounded ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} transition-all ${theme.focusRingCritical}`;
const labelCls = "block text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5";

function formatDate(d: string | undefined | null): string {
  if (!d) return "";
  try { const dt = new Date(d); if (isNaN(dt.getTime())) return ""; const s = dt.toLocaleDateString(); return s === "Invalid Date" ? "" : s; } catch { return ""; }
}

function SourceFilePicker({ value, files, onChange, onUpload }: {
  value: string; files: { name: string }[]; onChange: (v: string) => void | Promise<void>;
  onUpload: (fileName: string, contentBase64: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; b64: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handle); return () => document.removeEventListener("mousedown", handle);
  }, [open]);
  const picked = value && files.some(f => f.name === value);

  const doUpload = async (fileName: string, b64: string) => {
    setUploadError(null); setUploading(true);
    try {
      await onUpload(fileName, b64); await onChange(fileName); setOpen(false);
    } catch { setUploadError("Upload failed."); }
    finally { setUploading(false); setPendingFile(null); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full h-8 rounded border border-border/30 bg-transparent px-2.5 text-[11px] outline-none transition-colors focus:border-border/50 focus:ring-1 focus:ring-border/25">
        <Database className="h-3.5 w-3.5 text-muted-foreground stroke-current shrink-0" />
        <span className={`flex-1 truncate text-left ${value ? "text-foreground" : "text-muted-foreground"}`}>{value || "Select or type a file pattern..."}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground stroke-current shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <input type="file" ref={inputRef} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (![".xlsx", ".xls", ".csv", ".tsv", ".txt", ".xml", ".json"].includes(ext)) { setUploadError("Invalid format."); return; }
        const buf = await file.arrayBuffer(); const bytes = new Uint8Array(buf);
        let binary = ""; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        if (files.some((f) => f.name === file.name)) {
          setPendingFile({ name: file.name, b64 });
          return;
        }
        await doUpload(file.name, b64);
      }} className="hidden" accept=".xlsx,.xls,.csv,.tsv,.txt,.xml,.json" />
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border/30 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto" style={{ maxHeight: 240 }}>
          {pendingFile ? (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/10">
              <span className="text-[10px] text-muted-foreground flex-1">Overwrite "{pendingFile.name}"?</span>
              <button type="button" onClick={() => doUpload(pendingFile.name, pendingFile.b64)} disabled={uploading}
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] font-medium text-white bg-primary hover:bg-accent transition-colors disabled:opacity-40">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin stroke-current" /> : null} Overwrite
              </button>
              <button type="button" onClick={() => { setPendingFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          ) : (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 w-full px-3 h-8 text-[11px] text-left font-medium text-primary hover:bg-muted disabled:opacity-40">
            {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin stroke-current" /> Uploading...</> : <><Upload className="h-3.5 w-3.5 stroke-current" /> Upload new file...</>}
          </button>
          )}
          {uploadError && <p className="px-3 py-1 text-[10px] text-danger">{uploadError}</p>}
          <div className="border-t border-border/10" />
          {files.length === 0 ? <p className="px-3 py-2 text-[10px] text-muted-foreground italic">No source files found.</p>
            : files.map(f => (
            <button key={f.name} type="button" onClick={() => { onChange(f.name); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 h-8 text-[11px] text-left hover:bg-muted ${value === f.name ? "bg-primary/5 text-primary font-semibold" : "text-foreground"}`}>
              <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0 stroke-current" /><span className="truncate">{f.name}</span>
            </button>
          ))}
          <div className="border-t border-border/10 mt-1 pt-1">
            <div className="px-3 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Custom pattern</div>
            <input type="text" value={!picked ? value : ""} onChange={e => onChange(e.target.value)}
              placeholder="e.g. Plants*.xlsx" className="w-full px-3 h-8 text-[11px] bg-transparent outline-none placeholder:text-muted-foreground/50"
              onKeyDown={e => { if (e.key === "Enter") setOpen(false); }} autoFocus />
          </div>
        </div>
      )}
    </div>
  );
}

export function ErpImportPatternPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formScope, setFormScope] = useState("CUSTOM");
  const [formDest, setFormDest] = useState("");
  const [formFilePattern, setFormFilePattern] = useState("");
  const [, setRgMode] = useState<"all" | "selected">("all" as const);
  const [, setSelectedRgIds] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Array<{
    sourceName: string; sourceDataType: string; destinationName: string;
    destinationDataType: string; isRequired: boolean; sortOrder: number;
    _isUserAdded?: boolean;
  }>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patternToDelete, setPatternToDelete] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const pendingDeleteRef = useRef(false);
  const uploadedSourceRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const patternUploadRef = useRef<HTMLInputElement>(null);
  const [uploadingPattern, setUploadingPattern] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const { data: patternsData, loading: patternsLoading, refetch: refetchPatterns } = useQuery<{ erpImportPatterns: Pattern[] }>(
    ERP_IMPORT_PATTERNS_QUERY, { fetchPolicy: "cache-and-network" },
  );
  const { data: mappingsData } = useQuery<{ erpImportPatternMappings: FieldMapping[] }>(
    ERP_IMPORT_PATTERN_MAPPINGS_QUERY,
    { variables: { patternId: selectedId }, skip: !selectedId || mode === "create", fetchPolicy: "network-only" },
  );
  const { data: sourceFilesData, refetch: refetchSourceFiles } = useQuery<{ erpListStorageFiles: { items: { name: string }[] } }>(
    ERP_LIST_SOURCE_FILES, { variables: { folder: "source_pattern" }, fetchPolicy: "cache-and-network" },
  );
  const sourceFiles = useMemo(() => (sourceFilesData?.erpListStorageFiles?.items ?? []).filter((f: { name: string }) => f.name.endsWith(".json")), [sourceFilesData]);
  const [uploadSourceFile] = useMutation(UPLOAD_SOURCE_FILE);

  const [fetchPatternDef] = useLazyQuery<{
    erpStructureDefinition: {
      name: string; scope?: string; destinationTable?: string;
      fields?: Array<{ fieldName: string; dataType: string; required?: boolean; nexusField?: string }>;
      tables?: Array<{
        name: string; fields?: Array<{
          fieldName: string; dataType: string; required?: boolean; nexusField?: string;
        }>;
      }>;
    } | null;
  }>(ERP_STRUCTURE_DEFINITION);

  const [fetchDestDef] = useLazyQuery<{
    erpDestinationDefinition: { name: string; fields: Array<{ fieldName: string; dataType: string; required: boolean; nexusField?: string }> } | null;
  }>(ERP_DESTINATION_DEFINITION);

  const [sourceFieldOptions, setSourceFieldOptions] = useState<Array<{ sourceName: string; sourceDataType: string }>>([]);
  const [destinationFields, setDestinationFields] = useState<Array<{
    fieldName: string; dataType: string; required: boolean; nexusField?: string;
  }>>([]);

  const extractFieldOptions = useCallback((def: Record<string, unknown> | null | undefined): Array<{ sourceName: string; sourceDataType: string }> => {
    if (!def) return [];
    const opts: Array<{ sourceName: string; sourceDataType: string }> = [];
    let tables = def.tables;
    let fields = def.fields;
    try { if (typeof tables === "string") tables = JSON.parse(tables); } catch { tables = null; }
    try { if (typeof fields === "string") fields = JSON.parse(fields); } catch { fields = null; }
    if (Array.isArray(tables) && tables.length > 0) {
      for (const t of tables) {
        const tf = Array.isArray(t.fields) ? t.fields : [];
        for (const f of tf) opts.push({ sourceName: f.fieldName, sourceDataType: (f.dataType || "string").toLowerCase() });
      }
    } else if (Array.isArray(fields)) {
      for (const f of fields) opts.push({ sourceName: f.fieldName, sourceDataType: (f.dataType || "string").toLowerCase() });
    }
    return opts;
  }, []);

  const patterns = useMemo(() => patternsData?.erpImportPatterns ?? [], [patternsData]);
  const dbMappings = useMemo(() => mappingsData?.erpImportPatternMappings ?? [], [mappingsData]);
  const selected = useMemo(() => patterns.find(p => p.id === selectedId) ?? null, [patterns, selectedId]);

  const [createPattern] = useMutation(CREATE_ERP_IMPORT_PATTERN);
  const [updatePattern] = useMutation(UPDATE_ERP_IMPORT_PATTERN);
  const [deletePattern] = useMutation(DELETE_ERP_IMPORT_PATTERN);
  const [replaceMappings] = useMutation(REPLACE_ERP_IMPORT_PATTERN_MAPPINGS);

  const isForm = mode === "create" || mode === "edit";

  const mergedRows = useMemo(() => {
    if (destinationFields.length > 0) {
      const seen = new Set<string>();
      const srcMap = new Map<string, { sourceName: string; sourceDataType: string }>();
      const srcData = isForm ? mappings : dbMappings;
      for (const m of srcData) {
        seen.add(m.destinationName);
        srcMap.set(m.destinationName, { sourceName: m.sourceName, sourceDataType: m.sourceDataType });
      }
      const rows = destinationFields.map((f, i) => {
        const destName = f.nexusField || f.fieldName;
        const s = srcMap.get(destName);
        return {
          sourceName: s?.sourceName || "",
          sourceDataType: s?.sourceDataType || (f.dataType || "string").toLowerCase(),
          destinationName: destName,
          destinationDataType: (f.dataType || "string").toLowerCase(),
          isRequired: f.required || false,
          sortOrder: i,
          _isUserAdded: false,
        };
      });
      if (isForm) {
        for (const m of mappings) {
          if (!seen.has(m.destinationName) && m.destinationName) {
            rows.push({ ...m, _isUserAdded: m._isUserAdded ?? false, sortOrder: rows.length });
          }
        }
      }
      return rows;
    }
    return isForm ? mappings : dbMappings;
  }, [destinationFields, isForm, mappings, dbMappings]);

  const isDirty = useMemo(() => {
    if (!isForm) return false;
    if (mode === "create") return userEdited;
    if (!selected) return false;
    if (userEdited) return true;
    return formName !== selected.name || formDesc !== selected.description || formScope !== selected.scope ||
      formDest !== selected.destinationEntity || formFilePattern !== selected.sourceFilePattern ||
      (() => { const savedMap = new Map(dbMappings.map(d => [d.destinationName, d.sourceName])); return mappings.some(m => m.sourceName !== (savedMap.get(m.destinationName) ?? "")); })()
  }, [isForm, mode, userEdited, formName, formDesc, formScope, formDest, formFilePattern, mappings, selected, dbMappings]);

  const requiredCount = useMemo(() => mergedRows.filter(m => m.isRequired).length, [mergedRows]);
  const mappedRequired = useMemo(() => mergedRows.filter(m => m.isRequired && m.sourceName).length, [mergedRows]);
  const optionalCount = useMemo(() => mergedRows.filter(m => !m.isRequired).length, [mergedRows]);
  const mappedOptional = useMemo(() => mergedRows.filter(m => !m.isRequired && m.sourceName).length, [mergedRows]);
  const unmappedRequired = requiredCount - mappedRequired;
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load destination schema fields for the current entity
  useEffect(() => {
    if (!selectedId || mode === "create") return;
    if (!formDest) { setDestinationFields([]); return; }
    setDestinationFields([]);
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchDestDef({ variables: { name: formDest } });
        if (cancelled) return;
        const fields = r.data?.erpDestinationDefinition?.fields;
        if (fields) setDestinationFields(fields);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [selectedId, mode, formDest, fetchDestDef]);

  const allRequiredMapped = requiredCount > 0 ? mappedRequired === requiredCount : true;
  const hasMappings = mappings.length > 0;
  const saveDisabled = !formName.trim() || !formDest.trim() || !hasMappings || !allRequiredMapped || !isDirty;

  const resetForm = useCallback(() => {
    setFormName(""); setFormDesc(""); setFormScope("CUSTOM"); setFormDest("");
    setFormFilePattern(""); setRgMode("all"); setSelectedRgIds([]);
    setMappings([]); setSourceFieldOptions([]); setUserEdited(false);
  }, []);

  const loadPattern = useCallback((p: Pattern) => {
    setFormName(p.name); setFormDesc(p.description); setFormScope(p.scope);
    setFormDest(p.destinationEntity); setFormFilePattern(p.sourceFilePattern);
    try { const rparsed = JSON.parse(p.resourceGroupSelectionJson); setRgMode(rparsed.mode === "selected" ? "selected" : "all"); setSelectedRgIds(Array.isArray(rparsed.resourceGroupIds) ? rparsed.resourceGroupIds.map(String) : []); }
    catch { setRgMode("all"); setSelectedRgIds([]); }
    try { const ss = JSON.parse(p.sourceSchemaJson || "[]"); if (Array.isArray(ss) && ss.length > 0) setSourceFieldOptions(ss.map((f: { fieldName: string; dataType: string }) => ({ sourceName: f.fieldName, sourceDataType: f.dataType }))); }
    catch { /* ignore */ }
  }, []);

  const handleNew = useCallback(() => { resetForm(); setSelectedId(null); setMode("create"); }, [resetForm]);
  const handleEdit = useCallback(() => {
    if (!selected) return;
    setUserEdited(false);
    loadPattern(selected);
    setMappings([]);
    setMode("edit");
  }, [selected, loadPattern]);

  // Keep mappings + source field options in sync with dbMappings in edit mode
  useEffect(() => {
    if (mode !== "edit" || dbMappings.length === 0) return;
    setMappings(dbMappings.map((m) => ({
      sourceName: m.sourceName, sourceDataType: m.sourceDataType,
      destinationName: m.destinationName, destinationDataType: m.destinationDataType,
      isRequired: m.isRequired, sortOrder: m.sortOrder,
    })));
    setSourceFieldOptions(prev => {
      const existing = new Map(prev.map(o => [o.sourceName.toLowerCase(), o]));
      for (const m of dbMappings) {
        if (m.sourceName && !existing.has(m.sourceName.toLowerCase())) {
          existing.set(m.sourceName.toLowerCase(), { sourceName: m.sourceName, sourceDataType: m.sourceDataType });
        }
      }
      return Array.from(existing.values());
    });
  }, [mode, dbMappings]);

  // Auto-load source field options when source file pattern is set in form
  useEffect(() => {
    if (!isForm || !formFilePattern) return;
    const name = formFilePattern.replace(/\.(xlsx|xls|csv|tsv|txt|xml|json)$/i, "");
    if (!name) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchPatternDef({ variables: { name } });
        if (cancelled) return;
        const d = r.data?.erpStructureDefinition;
        if (d) setSourceFieldOptions(extractFieldOptions(d));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [isForm, formFilePattern, fetchPatternDef, extractFieldOptions]);

  const handleBack = useCallback(() => {
    if (isDirty) { setShowCancelConfirm(true); return; }
    if (selected) { loadPattern(selected); setMode("view"); } else { resetForm(); setMode("view"); }
  }, [isDirty, selected, loadPattern, resetForm]);

  const handleCancelConfirm = useCallback(() => {
    setShowCancelConfirm(false);
    if (selected) { loadPattern(selected); setMode("view"); } else { resetForm(); setMode("view"); }
    if (pendingDeleteRef.current) {
      pendingDeleteRef.current = false;
      if (selectedId) { setPatternToDelete(selectedId); setShowDeleteConfirm(true); }
    }
  }, [selected, selectedId, loadPattern, resetForm]);

  const handleSave = useCallback(async () => {
    if (saveDisabled) return;
    setSaveError(null);
    const emptyScopeJson = JSON.stringify({ mode: "all" });
    try {
      const sourceSchemaJson = JSON.stringify(sourceFieldOptions.map(o => ({ fieldName: o.sourceName, dataType: o.sourceDataType })));
      let patternId: string | null = selectedId;
      if (mode === "create") {
        const res = await createPattern({ variables: { name: formName.trim(), destinationEntity: formDest.trim(), scope: formScope, description: formDesc, sourceFilePattern: formFilePattern, sourceSchemaJson, plantSelectionJson: emptyScopeJson, departmentSelectionJson: emptyScopeJson, resourceGroupSelectionJson: emptyScopeJson } });
        const result = (res.data as { createErpImportPattern?: { ok?: boolean; pattern?: { id?: string }; errors?: Array<{ message?: string }> } } | null)?.createErpImportPattern;
        if (!result?.ok) {
          const errMsg = result?.errors?.[0]?.message || "Failed to create pattern";
          setSaveError(errMsg);
          return;
        }
        patternId = result?.pattern?.id ?? null;
      } else if (mode === "edit" && selectedId) {
        const res = await updatePattern({ variables: { patternId: selectedId, name: formName.trim(), description: formDesc, scope: formScope, destinationEntity: formDest.trim(), sourceFilePattern: formFilePattern, sourceSchemaJson, plantSelectionJson: emptyScopeJson, departmentSelectionJson: emptyScopeJson, resourceGroupSelectionJson: emptyScopeJson } });
        const result = (res.data as { updateErpImportPattern?: { ok?: boolean; errors?: Array<{ message?: string }> } } | null)?.updateErpImportPattern;
        if (!result?.ok) {
          const errMsg = result?.errors?.[0]?.message || "Failed to update pattern";
          setSaveError(errMsg);
          return;
        }
      }
      if (!patternId) {
        const errMsg = "Pattern saved but no ID returned — mappings not saved";
        console.error(errMsg);
        setSaveError(errMsg);
        return;
      }
      const mappingRes = await replaceMappings({
        variables: {
          patternId,
          mappings: mappings.filter(m => m.sourceName.trim()).map(m => ({
            sourceName: m.sourceName,
            sourceDataType: m.sourceDataType,
            destinationName: m.destinationName,
            destinationDataType: m.destinationDataType,
            isRequired: m.isRequired,
            sortOrder: m.sortOrder,
          })),
        },
      });
      const mappingData = mappingRes.data as { replaceErpImportPatternMappings?: { ok?: boolean; errors?: Array<{ field?: string; code?: string; message?: string }> } } | null;
      if (mappingData?.replaceErpImportPatternMappings?.ok === false) {
        const errMsg = mappingData.replaceErpImportPatternMappings.errors?.[0]?.message || "Failed to save field mappings";
        console.error("Mapping save failed:", errMsg);
        setSaveError(errMsg);
        return;
      }
      await refetchPatterns();
      setSaveError(null);
      setToast({ message: "Pattern saved", type: "success" });
      if (mode === "create") resetForm();
      setMode("view");
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "An unexpected error occurred";
      console.error("Save error:", e);
      setSaveError(errMsg);
    }
  }, [mode, selectedId, formName, formDesc, formScope, formDest, formFilePattern, createPattern, updatePattern, replaceMappings, refetchPatterns, resetForm, saveDisabled, mappings]);

  const handleDelete = useCallback(async () => {
    if (!patternToDelete) return;
    try {
      await deletePattern({ variables: { patternId: patternToDelete } });
      await refetchPatterns();
      if (selectedId === patternToDelete) {
        const remaining = patterns.filter(p => p.id !== patternToDelete);
        if (remaining.length > 0) {
          setSelectedId(remaining[0].id);
          loadPattern(remaining[0]);
        } else {
          setSelectedId(null);
          resetForm();
        }
      }
    }
    finally { setShowDeleteConfirm(false); setPatternToDelete(null); }
  }, [patternToDelete, selectedId, deletePattern, refetchPatterns, patterns, loadPattern, resetForm]);

  const handleDeleteClick = useCallback(() => {
    if (!selectedId) return;
    if (isForm && isDirty) {
      pendingDeleteRef.current = true;
      setShowCancelConfirm(true);
      return;
    }
    setPatternToDelete(selectedId);
    setShowDeleteConfirm(true);
  }, [selectedId, isForm, isDirty]);

  const updateMapping = useCallback((destName: string, field: string, value: unknown) => {
    setUserEdited(true);
    setMappings(prev => {
      const found = prev.some(m => m.destinationName === destName);
      if (!found) {
        let dataType = "string";
        if (field === "sourceName") {
          const opt = sourceFieldOptions.find(o => o.sourceName === value);
          if (opt) dataType = opt.sourceDataType;
        }
        return [...prev, {
          sourceName: field === "sourceName" ? (value as string) : "",
          sourceDataType: field === "sourceDataType" ? (value as string) : dataType,
          destinationName: destName,
          destinationDataType: "string",
          isRequired: false,
          sortOrder: prev.length,
          _isUserAdded: false,
        }];
      }
      return prev.map(m => {
        if (m.destinationName !== destName) return m;
        const updated = { ...m, [field]: value };
        if (field === "sourceName") {
          const opt = sourceFieldOptions.find(o => o.sourceName === value);
          if (opt) updated.sourceDataType = opt.sourceDataType;
        }
        return updated;
      });
    });
  }, [sourceFieldOptions]);

  const removeMappingRow = useCallback((destName: string) => {
    setUserEdited(true);
    setMappings(prev => prev.filter(m => m.destinationName !== destName));
  }, []);

  const handleResetMapping = useCallback((destName: string) => {
    setUserEdited(true);
    setMappings(prev => {
      const found = prev.some(m => m.destinationName === destName);
      if (!found) return prev;
      return prev.map(m => m.destinationName === destName ? { ...m, sourceName: "", sourceDataType: "" } : m);
    });
  }, []);

  const handleAddMapping = useCallback(() => {
    setUserEdited(true);
    setMappings(prev => [...prev, { sourceName: "", sourceDataType: "", destinationName: "", destinationDataType: "", isRequired: false, sortOrder: prev.length, _isUserAdded: true }]);
  }, []);

  const autoMap = useCallback(() => {
    setUserEdited(true);
    setMappings(prev => prev.map(m => {
      if (m.sourceName) return m;
      const match = sourceFieldOptions.find(o =>
        o.sourceName.toLowerCase().includes(m.destinationName.toLowerCase().replace(/^[^.]+\./, "")) ||
        m.destinationName.toLowerCase().includes(o.sourceName.toLowerCase())
      );
      return match ? { ...m, sourceName: match.sourceName, sourceDataType: match.sourceDataType } : m;
    }));
  }, [sourceFieldOptions]);

  const handleClearMappings = useCallback(() => {
    if (mappings.some(m => m.sourceName)) { setShowClearConfirm(true); return; }
  }, [mappings]);

  const confirmClearMappings = useCallback(() => {
    setUserEdited(true);
    setMappings(prev => prev.map(m => ({ ...m, sourceName: "" })));
    setShowClearConfirm(false);
  }, []);

  return (
    <div className="flex flex-col h-full w-full max-w-full min-w-0 overflow-hidden">
      <PageHeader icon={<FileSpreadsheet className="h-5 w-5 stroke-current" />} iconClass={theme.iconBoxEmerald}
        title="ERP Pattern" subtitle="Define reusable ERP import patterns — map source fields to LeanSync destinations" />

      {/* Toolbar */}
      <div className="shrink-0 flex items-center min-w-0 border-b border-border/35 bg-muted px-3 select-none gap-3 h-10">
        {isForm ? (
          <>
            <button onClick={handleBack} className={toolBtnCls} title="Back"><ArrowLeft className="h-4 w-4 stroke-current" /></button>
            <span className="h-5 w-px bg-border/25 shrink-0" />
            {isDirty && <span className="text-[10px] text-warning font-medium">Unsaved changes</span>}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
              {saveError && (
                <span className="flex items-center gap-1 text-[10px] text-destructive max-w-[240px] truncate" title={saveError}>
                  <AlertCircle className="h-3 w-3 stroke-current shrink-0" />
                  <span className="truncate">{saveError}</span>
                </span>
              )}
              <button onClick={handleSave} disabled={saveDisabled}
                className={`${theme.toolbarBtnPrimary} ${saveDisabled ? "!bg-muted/50 !text-muted-foreground pointer-events-none" : ""}`}>
                <Save className="h-4 w-4 stroke-current" /> Save
              </button>
              <button onClick={autoMap} disabled={sourceFieldOptions.length === 0 || mappings.length === 0}
                className={toolBtnCls}>
                <RefreshCw className="h-4 w-4 stroke-current" /> Auto-map
              </button>
              <button onClick={handleClearMappings} disabled={mappings.length === 0}
                className={toolBtnCls}>
                <XCircle className="h-4 w-4 stroke-current" /> Clear
              </button>
              <button onClick={handleBack} className={toolBtnCls}><X className="h-4 w-4 stroke-current" /><span className="hidden sm:inline">Cancel</span></button>
              <button onClick={handleDeleteClick} title="Delete pattern" className={toolBtnCls}>
                <Trash2 className="h-4 w-4 stroke-current" /><span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative shrink-0" style={{ width: 256 }}>
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground stroke-current pointer-events-none" />
              <input type="text" placeholder="Search patterns..."
                className="h-8 w-full rounded bg-card px-3 py-1 text-sm outline-none text-muted-foreground placeholder:text-muted-foreground transition-colors focus:border-b-2 focus:border-info" />
            </div>
            <div className="h-5 w-px bg-border/25 shrink-0" />
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <input ref={patternUploadRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.xml,.json,.txt" onChange={async (e) => {
                const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
                setUploadingPattern(true);
                try {
                  const buf = await file.arrayBuffer(); const bytes = new Uint8Array(buf);
                  let binary = ""; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                  await uploadSourceFile({ variables: { fileName: file.name, contentBase64: btoa(binary) } });
                } catch { /* ignore */ }
                finally { setUploadingPattern(false); }
              }} className="hidden" />
              <button onClick={() => setShowUploadConfirm(true)} disabled={uploadingPattern} title="Upload source file" className={toolBtnCls}>
                <Upload className="h-4 w-4 stroke-current" />{uploadingPattern ? " Uploading..." : " Upload"}
              </button>
              {selected && <button onClick={handleEdit} className={toolBtnCls}><Pencil className="h-4 w-4 stroke-current" /><span className="hidden sm:inline">Edit</span></button>}
              <button onClick={handleNew} className={toolBtnCls}><Plus className="h-4 w-4 stroke-current" /><span className="hidden sm:inline">New</span></button>
              {selected && <button onClick={handleDeleteClick} title="Delete pattern" className={toolBtnCls}><Trash2 className="h-4 w-4 stroke-current" /><span className="hidden sm:inline">Delete</span></button>}
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid h-full min-w-0 overflow-hidden" style={{
          gridTemplateColumns: !isForm && selected
            ? "280px minmax(360px,420px) minmax(0,1fr)"
            : !isForm
              ? "280px 1fr"
              : "minmax(360px,420px) minmax(0,1fr)",
          gap: "0px",
        }}>
          {!isForm && (
            <div className="flex flex-col min-h-0 min-w-0 overflow-hidden border-r border-border/20 bg-muted/[0.03]">
              <div className="shrink-0 flex items-center gap-3 px-3 border-b border-border/30 bg-muted/40 h-10">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground stroke-current" />
                <span className="text-sm font-semibold text-foreground">Patterns</span>
                {patternsLoading && <Loader2 className="h-3 w-3 text-muted-foreground animate-spin stroke-current" />}
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">{patterns.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {patterns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <FileSpreadsheet className="h-6 w-6 text-muted-foreground/30 mb-2 stroke-current" />
                    <p className="text-[11px] text-muted-foreground mb-3">No patterns found</p>
                    <button onClick={handleNew} className="inline-flex h-8 items-center gap-3.5 px-2 text-sm font-medium text-primary select-none transition-all duration-150 bg-transparent hover:bg-accent/10 active:bg-accent/20">
                      <Plus className="h-4 w-4 stroke-current" /> New Pattern
                    </button>
                  </div>
                ) : patterns.map(p => {
                  return (
                  <div key={p.id} onClick={() => { setSelectedId(p.id); setDestinationFields([]); loadPattern(p); setMode("view"); }}
                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-border/5 min-w-0 ${selectedId === p.id ? theme.rowSelected : `${theme.interactiveRow} border-l-2 border-l-transparent`}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selectedId === p.id ? "bg-primary/10 text-primary" : theme.iconBoxSubtle}`}>
                      <FileSpreadsheet className="h-3.5 w-3.5 stroke-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-[12px] font-semibold truncate ${theme.textPrimary}`} title={p.name}>{p.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.destinationEntity} · {p.fieldCount} field{p.fieldCount !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isForm && !selected ? (
            <div className="min-w-0 overflow-y-auto flex items-start justify-center pt-16">
              <div className="text-center max-w-sm">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground/25 stroke-current" />
                <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>ERP Import Patterns</h3>
                <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>Define reusable patterns that map source file fields to LeanSync destination entities. Select a pattern from the list or create a new one.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Left: Pattern Setup */}
              <div className="min-w-0 overflow-y-auto border-r border-border/20 bg-card/[0.02] flex flex-col">
                <div className="shrink-0 flex items-center gap-2 px-3 h-8 border-b border-border/30 bg-muted/30">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground stroke-current" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pattern Setup</span>
                </div>
                <div className={`flex-1 min-h-0 overflow-y-auto px-3 py-4 flex flex-col ${isForm ? "gap-6" : "gap-3"}`}>
                  <div>
                    <label className={labelCls}>Pattern Name</label>
                    {isForm ? (
                      <input type="text" value={formName} onChange={e => { setFormName(e.target.value); setUserEdited(true); }} className={inputCls} placeholder="e.g. Department Import" />
                    ) : (
                      <div className="flex items-center h-7 px-2 text-[11px] text-foreground font-medium">{selected?.name || "—"}</div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Scope</label>
                    {isForm ? (
                      <select value={formScope} onChange={e => { setFormScope(e.target.value); setUserEdited(true); }} className={inputCls}>
                        {SCOPE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center h-7 px-2 text-[11px] text-foreground">{SCOPE_OPTIONS.find(s => s.value === selected?.scope)?.label || selected?.scope || "—"}</div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    {isForm ? (
                      <input type="text" value={formDesc} onChange={e => { setFormDesc(e.target.value); setUserEdited(true); }} className={inputCls} placeholder="Optional description" />
                    ) : (
                      <div className="flex items-center h-7 px-2 text-[11px] text-muted-foreground">{selected?.description || "—"}</div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Destination Entity</label>
                    {isForm && SCOPE_DESTINATIONS[formScope] ? (
                      <select value={formDest} onChange={async e => {
                        const val = e.target.value; setFormDest(val); setUserEdited(true);
                        if (val) { try { const r = await fetchDestDef({ variables: { name: val } }); const d = r.data?.erpDestinationDefinition; const fields = d?.fields; if (fields) { setDestinationFields(fields); setMappings(fields.map((f, i) => ({ sourceName: "", sourceDataType: "", destinationName: f.nexusField || f.fieldName, destinationDataType: (f.dataType || "string").toLowerCase(), isRequired: f.required || false, sortOrder: i, _isUserAdded: false }))); } } catch {} }
                        else { setDestinationFields([]); setMappings([]); }
                      }} className={inputCls}>
                        <option value="">Select...</option>
                        {SCOPE_DESTINATIONS[formScope].map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : isForm ? (
                      <input type="text" value={formDest}
                        onChange={async e => { const val = e.target.value; setFormDest(val); setUserEdited(true);
                          if (val) { try { const r = await fetchDestDef({ variables: { name: val } }); const d = r.data?.erpDestinationDefinition; const fields = d?.fields; if (fields) { setDestinationFields(fields); setMappings(fields.map((f, i) => ({ sourceName: "", sourceDataType: "", destinationName: f.nexusField || f.fieldName, destinationDataType: (f.dataType || "string").toLowerCase(), isRequired: f.required || false, sortOrder: i, _isUserAdded: false }))); } } catch {} }
                          else { setDestinationFields([]); setMappings([]); }
                        }} className={inputCls} placeholder="e.g. Department" />
                    ) : (
                      <div className="flex items-center h-7 px-2 text-[11px] text-foreground">{selected?.destinationEntity || "—"}</div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Source File Pattern</label>
                    {isForm ? (
                      <SourceFilePicker value={formFilePattern} files={sourceFiles}
                  onChange={async fileName => {
                    setFormFilePattern(fileName); setUserEdited(true);
                    if (uploadedSourceRef.current) { uploadedSourceRef.current = false; return; }
                    const name = fileName.replace(/\.(xlsx|xls|csv|tsv|txt|xml|json)$/i, "");
                    try { const r = await fetchPatternDef({ variables: { name } }); setSourceFieldOptions(extractFieldOptions(r.data?.erpStructureDefinition)); }
                    catch { setSourceFieldOptions([]); }
                  }}
                          onUpload={async (fn, b64) => {
                            const ext = fn.split(".").pop()?.toLowerCase();
                            const jsonName = "pattern/" + fn.replace(/\.(xlsx|xls|csv|tsv|txt|xml)$/i, ".json");
                            let structStr = "";
                            try {
                              const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                              let maxCols = 0;
                              let rows: unknown[][] = [];
                              if (ext === "xlsx" || ext === "xls") {
                                const wb = XLSX.read(bytes, { type: "array" });
                                const ws = wb.Sheets[wb.SheetNames[0]];
                                const ref = ws["!ref"];
                                if (ref) { const r = XLSX.utils.decode_range(ref); maxCols = r.e.c + 1; }
                                rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
                              } else if (["csv", "tsv", "txt"].includes(ext ?? "")) {
                                const txt = new TextDecoder().decode(bytes);
                                const wb = XLSX.read(txt, { type: "string" });
                                const ws = wb.Sheets[wb.SheetNames[0]];
                                const ref = ws["!ref"];
                                if (ref) { const r = XLSX.utils.decode_range(ref); maxCols = r.e.c + 1; }
                                rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
                              } else if (ext === "xml") {
                                const txt = new TextDecoder().decode(bytes);
                                const parser = new DOMParser();
                                const xmlDoc = parser.parseFromString(txt, "text/xml");
                                const root = xmlDoc.documentElement;
                                const childEls = Array.from(root.children).length > 0 ? Array.from(root.children) : Array.from(root.querySelectorAll("> *"));
                                if (childEls.length > 0) {
                                  const first = childEls[0];
                                  const tagName = first.tagName;
                                  const items = root.querySelectorAll(tagName);
                                  const headers = Array.from(items[0]?.children || []).map((c) => c.tagName);
                                  rows = [headers, ...Array.from(items).map((item) => Array.from(item.children).map((c) => c.textContent || ""))];
                                  maxCols = headers.length;
                                }
                              }
                              if (ext !== "json" && rows.length > 0) {
                                const colCount = maxCols || rows.reduce((n, r) => Math.max(n, Array.isArray(r) ? r.length : 0), 0);
                                const headers = (rows[0] ?? []).map((h) => String(h ?? ""));
                                while (headers.length < colCount) headers.push("");
                                const sample = rows[1] ?? [];
                                while (sample.length < colCount) sample.push("");
                                const fields = headers.map((name, i) => {
                                  const val = sample[i];
                                  let dt = "string";
                                  if (typeof val === "number") dt = Number.isInteger(val) ? "integer" : "decimal";
                                  else if (typeof val === "boolean") dt = "boolean";
                                  else if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) dt = "date";
                                  return { fieldName: name, dataType: dt };
                                });
                                structStr = JSON.stringify({ fields });
                                setSourceFieldOptions(fields.map((f: { fieldName: string; dataType: string }) => ({ sourceName: f.fieldName, sourceDataType: f.dataType })));
                              }
                            } catch { /* parse failed */ }
                            try {
                              if (structStr) {
                                await uploadSourceFile({ variables: { fileName: jsonName, contentBase64: btoa(structStr) } });
                              }
                            } catch { structStr = ""; }
                            uploadedSourceRef.current = true;
                            setFormFilePattern(fn);
                            setUserEdited(true);
                            await uploadSourceFile({ variables: { fileName: fn, contentBase64: b64 } });
                            await refetchSourceFiles();
                            if (structStr) {
                              const shortName = jsonName.replace(/^pattern\//, "");
                              setToast({ message: `Schema extracted — ${shortName} ready for mapping.`, type: "success" });
                            } else if (ext !== "json") {
                              setToast({ message: "Could not extract column structure — file uploaded without schema.", type: "info" });
                            }
                          }} />
                      ) : (
                        <div className="flex items-center gap-1.5 h-7 px-2 text-[11px] text-muted-foreground">
                          <Database className="h-3 w-3 stroke-current shrink-0" />
                          <span className="truncate">{selected?.sourceFilePattern || "—"}</span>
                        </div>
                      )}
                      <p className="text-[8px] text-muted-foreground/60 mt-1 leading-normal">Defines which uploaded files this pattern can process.</p>
                    </div>
                  {/* Pattern Summary */}
                  {(isForm || selected) && (
                    <div className="pt-2 border-t border-border/20 space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Pattern Summary</p>
                      <div className="space-y-0.5 text-[10px]">
                        <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span className="text-foreground font-medium">{isForm ? formDest || "—" : selected?.destinationEntity || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Source File</span><span className="text-foreground font-medium truncate ml-2">{isForm ? formFilePattern || "—" : selected?.sourceFilePattern || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Scope</span><span className="text-foreground font-medium">{isForm ? formScope : selected?.scope}</span></div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Required mapped</span>
                          <span className={`font-medium ${mappedRequired === requiredCount && requiredCount > 0 ? "text-success" : "text-warning"}`}>{mappedRequired}/{requiredCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Optional mapped</span>
                          <span className="text-foreground font-medium">{mappedOptional}/{optionalCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Source schema</span>
                          {(() => {
                            const hasSchema = !isForm ? (selected?.sourceSchemaJson && selected.sourceSchemaJson !== "[]") : sourceFieldOptions.length > 0;
                            if (!isForm && !selected) return <span className="text-muted-foreground">—</span>;
                            if (hasSchema) return <span className="font-medium text-success">Detected</span>;
                            if (isForm && !formFilePattern) return <span className="font-medium text-warning">Needs source file</span>;
                            if (!isForm && selected?.sourceFilePattern) return <span className="font-medium text-muted-foreground">Not detected</span>;
                            return <span className="text-muted-foreground">—</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Field Mappings */}
              <div className="flex flex-col min-w-0 overflow-hidden bg-card/[0.02]">
                <div className="shrink-0 flex items-center gap-3 px-3 h-10 border-b border-border/30 bg-muted/30">
                  <Database className="h-4 w-4 text-muted-foreground stroke-current" />
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Field Mappings</span>
                  {requiredCount > 0 && (
                    <span className={`text-[10px] font-medium ${mappedRequired === requiredCount ? "text-success" : "text-warning"}`}>
                      {mappedRequired}/{requiredCount} required mapped
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono min-w-0">{mergedRows.length}</span>

                </div>

                <div className="flex-1 overflow-y-auto p-3 min-w-0" style={{ minHeight: 0 }}>
                  {unmappedRequired > 0 && isForm && (
                    <div className="mb-2 px-2.5 py-1.5 rounded-md bg-warning/10 border border-warning/20 text-[10px] font-medium text-warning flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 stroke-current shrink-0" />
                      {unmappedRequired} required field{unmappedRequired !== 1 ? "s" : ""} unmapped
                    </div>
                  )}

                  {!isForm && !selected ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <Database className="h-8 w-8 text-muted-foreground/25 mb-2 stroke-current" />
                      <p className="text-[11px] text-muted-foreground">Select a pattern to view its field mappings.</p>
                    </div>
                  ) : isForm && !formDest ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <Database className="h-8 w-8 text-muted-foreground/25 mb-2 stroke-current" />
                      <p className="text-[11px] text-muted-foreground">Select a destination entity to define mappings.</p>
                    </div>
                  ) : mergedRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 min-w-0">
                      <Database className="h-8 w-8 text-muted-foreground/25 mb-2 stroke-current shrink-0" />
                      {isForm ? (
                        <>
                          <p className="text-[11px] text-muted-foreground mb-3">No field mappings yet</p>
                          <div className="flex items-center gap-3">
                            <button onClick={handleAddMapping}
                              className="inline-flex h-8 items-center gap-3.5 rounded px-3 text-sm font-medium text-primary select-none transition-all duration-150 bg-transparent hover:bg-accent/10 active:bg-accent/20">
                              <Plus className="h-4 w-4 stroke-current" /> Add Mapping
                            </button>
                            <button onClick={autoMap} disabled={sourceFieldOptions.length === 0}
                              className="inline-flex h-8 items-center gap-3.5 rounded px-3 text-sm font-medium text-muted-foreground select-none transition-all duration-150 bg-transparent hover:bg-accent/10 active:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed">
                              <RefreshCw className="h-4 w-4 stroke-current" /> Auto-map
                            </button>
                          </div>
                          {sourceFieldOptions.length === 0 && (
                            <p className="text-[10px] text-muted-foreground/70 max-w-[260px] mt-3">
                              {formFilePattern
                                ? "Source schema not detected. Select a valid source file before auto-mapping."
                                : "Select a source file pattern to enable Auto-map."}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">No field mappings defined for this pattern.</p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto min-w-0">
                      <style>{`.erp-pattern-tbl td { vertical-align: middle; }`}</style>
                      <table className="erp-pattern-tbl w-full text-[11px] border-collapse border-spacing-0">
                        <thead>
                          <tr className="text-left sticky top-0 z-10">
                            <th className="py-1.5 px-2 font-semibold text-muted-foreground border-b border-border/40 bg-muted/50">Source Name</th>
                            <th className="py-1.5 px-2 font-semibold text-muted-foreground border-b border-border/40 bg-muted/50">Source Type</th>
                            <th className="py-1.5 px-2 font-semibold text-muted-foreground border-b border-border/40 bg-muted/50">Destination Name</th>
                            <th className="py-1.5 px-2 font-semibold text-muted-foreground border-b border-border/40 bg-muted/50">Destination Type</th>
                            <th className="py-1.5 px-2 font-semibold text-muted-foreground border-b border-border/40 bg-muted/50 text-center">Required</th>
                            <th className="py-1.5 px-2 font-semibold text-muted-foreground border-b border-border/40 bg-muted/50 text-center">Status</th>
                            {isForm && <th className="py-1.5 px-2 border-b border-border/40 bg-muted/50 text-center" />}
                          </tr>
                        </thead>
                        <tbody>
                          {mergedRows.map((m, i) => {
                            const hasSource = !!m.sourceName;
                            const statusKey = hasSource ? "Mapped" : m.isRequired ? "Missing" : "Optional";
                            return (
                            <tr key={i} className={`transition-colors ${i % 2 === 0 ? "bg-card" : "bg-muted/[0.03]"} ${theme.interactiveRow}`}>
                              <td className="py-1 px-2 border-b border-border/10">
                                {isForm ? (
                                    <select value={m.sourceName} onChange={e => updateMapping(m.destinationName, "sourceName", e.target.value)}
                                      className="h-7 w-full bg-card px-1.5 text-[11px] outline-none">
                                      <option value="">— select —</option>
                                      {sourceFieldOptions.map(opt => <option key={opt.sourceName} value={opt.sourceName}>{opt.sourceName} ({opt.sourceDataType})</option>)}
                                    </select>
                                ) : (
                                  <span className={`text-[11px] ${hasSource ? "text-foreground font-medium" : "text-muted-foreground"}`}>{hasSource ? m.sourceName : "—"}</span>
                                )}
                              </td>
                              <td className="py-1 px-2 border-b border-border/10">
                                <span className="text-[11px] text-muted-foreground">{hasSource ? m.sourceDataType : "—"}</span>
                              </td>
                              <td className="py-1 px-2 border-b border-border/10">
                                <span className="text-[11px] text-foreground font-medium">{m.destinationName}</span>
                              </td>
                              <td className="py-1 px-2 border-b border-border/10">
                                <span className="text-[11px] text-muted-foreground font-mono">{m.destinationDataType}</span>
                              </td>
                              <td className="py-1 px-2 border-b border-border/10 text-center">
                                {m.isRequired ? (
                                  <span className="inline-flex items-center rounded px-1.5 py-px text-[9px] font-semibold bg-success/10 text-success border border-success/20">Req</span>
                                ) : (
                                  <span className="inline-flex items-center rounded px-1.5 py-px text-[9px] font-medium text-muted-foreground/70 bg-muted/30 border border-border/20">Opt</span>
                                )}
                              </td>
                              <td className="py-1 px-2 border-b border-border/10 text-center">
                                {statusKey === "Mapped" ? (
                                  <span className="inline-flex items-center rounded px-1.5 py-px text-[9px] font-semibold bg-success/10 text-success border border-success/20">Mapped</span>
                                ) : statusKey === "Missing" ? (
                                  <span className="inline-flex items-center rounded px-1.5 py-px text-[9px] font-semibold bg-warning/10 text-warning border border-warning/25">Missing</span>
                                ) : (
                                  <span className="inline-flex items-center rounded px-1.5 py-px text-[9px] font-medium text-muted-foreground/70 bg-muted/30 border border-border/20">Optional</span>
                                )}
                              </td>
                              {isForm && (
                                <td className="py-1 px-2 border-b border-border/10 text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    {hasSource ? (
                                      <button onClick={() => handleResetMapping(m.destinationName)} title="Reset mapping"
                                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-warning hover:bg-warning/10 transition-colors">
                                        <RotateCcw className="h-3 w-3 stroke-current" />
                                      </button>
                                    ) : null}
                                    {m._isUserAdded ? (
                                      <button onClick={() => removeMappingRow(m.destinationName)} title="Remove mapping"
                                        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-danger hover:bg-danger/10 transition-colors">
                                        <XCircle className="h-3 w-3 stroke-current" />
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              )}
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex h-10 items-center gap-4 min-w-0 overflow-hidden border-t border-border/20 bg-muted/50 px-4 pr-6 text-xs font-medium text-muted-foreground select-none">
        <span className="shrink-0">{patterns.length} pattern{patterns.length !== 1 ? "s" : ""} defined</span>
        <span className="h-4 w-px bg-border/30 shrink-0" />
        <span className="truncate min-w-0" title={isForm ? (mode === "create" ? "New Pattern" : selected?.name || "Edit Pattern") : selected?.name || "No pattern selected"}>{isForm ? (mode === "create" ? "New Pattern" : selected?.name || "Edit Pattern") : selected ? selected.name : "No pattern selected"}</span>
        <span className="flex-1" />
        {selected && (() => {
          const created = formatDate(selected.createdAt);
          const updated = formatDate(selected.updatedAt);
          if (!created && !updated) return null;
          return (
            <>
              {created && <span className="text-[10px]" title={`Created ${created}`}>Created {created}</span>}
              {updated && <span className="text-[10px]" title={`Updated ${updated}`}>Updated {updated}</span>}
            </>
          );
        })()}
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-xs font-medium shadow-lg transition-opacity ${
          toast.type === "success" ? "bg-success text-success-foreground" : toast.type === "info" ? "bg-info/15 text-info" : "bg-danger text-danger-foreground"
        }`}>{toast.message}</div>
      )}

      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        title="Delete pattern?" message="This will permanently delete this ERP pattern." confirmLabel="Delete" danger={true} />
      <ConfirmDialog open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} onConfirm={handleCancelConfirm}
        title="Discard changes?" message="You have unsaved changes. Discard them?" confirmLabel="Discard" danger={true} />
      <ConfirmDialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)} onConfirm={confirmClearMappings}
        title="Clear all field mappings?" message="This will remove all source name assignments. The destination fields will remain." confirmLabel="Clear" danger={false} />
      <ConfirmDialog open={showUploadConfirm} onClose={() => setShowUploadConfirm(false)} onConfirm={() => { setShowUploadConfirm(false); patternUploadRef.current?.click(); }}
        title="Upload source file?"
        message="This will upload the file to the ERP source folder. Source fields can then be detected and mapped to the pattern."
        confirmLabel="Upload" danger={false} />
    </div>
  );
}
