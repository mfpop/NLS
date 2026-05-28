import { useState, useMemo } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { AlignVerticalSpaceAround, RefreshCw, Save, Search, Check, X, AlertTriangle, CheckCircle2, XCircle, Info, HardDrive } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import {
  ALIGNMENT_SOURCES_QUERY, ALIGNMENT_DEST_TABLES_QUERY, ALIGNMENT_PROFILES_QUERY, ALIGNMENT_PROFILE_QUERY,
  DETECTED_COLUMNS_QUERY, NEXUS_TARGET_FIELDS_QUERY,
  SAVE_ALIGNMENT_MAPPING, VALIDATE_ALIGNMENT, CREATE_ALIGNMENT_PROFILE,
} from "@/graphql/dataAlignmentQueries";

const sel = "h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-foreground outline-none min-w-[120px]";
const tBtn = "inline-flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium text-foreground hover:bg-muted transition-colors border border-border/30";
const tBtnPrimary = "inline-flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors border-0";
const SCOPES = ["PLANT_STRUCTURE", "PRODUCT_MASTER", "MATERIALS", "WAREHOUSE_BINS", "ROUTING", "SCHEDULES", "CAPACITY", "QUALITY", "CUSTOM"];

interface SourceItem { id: string; name: string; scope: string; sourceType: string; destinationTable: string; expectedFilePattern: string; active: boolean; status: string; lastImportedAt?: string | null; isPattern?: boolean; }
interface DetectedColumn { columnName: string; sampleValues: string[]; detectedType: string; nullCount: number; totalRows: number; }
interface ProfileItem { id: string; name: string; domain: string; version: number; isActive: boolean; notes: string; }
interface FieldMapping { id?: string; entityType: string; sourceColumn: string; targetField: string; isRequired: boolean; sortOrder?: number; }
interface ValidationIssue { entityType: string; sourceColumn: string; targetField?: string | null; severity: string; code: string; message: string; }

interface NexusFieldOption { entity: string; field: string; path: string; required: boolean; type: string; }

export function DataAlignmentPage() {
  // Selectors
  const [scope, setScope] = useState("PLANT_STRUCTURE");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [destTable, setDestTable] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filePath, setFilePath] = useState("");

  // Mappings: erpColumn -> targetField
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [requiredFields, setRequiredFields] = useState<Record<string, boolean>>({});

  // Profile
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");

  // Validation
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationErrorCount, setValidationErrorCount] = useState(0);

  // Messages
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info" | null; text: string }>({ type: null, text: "" });

  // ── Queries ──
  const { data: sourcesData } = useQuery<{ erpSourceDefinitions: { items: any[] }; erpPatternDefinitions: any[] }>(ALIGNMENT_SOURCES_QUERY, { variables: { scope }, fetchPolicy: "cache-and-network" });

  const allSources = useMemo(() => {
    const map = new Map<string, SourceItem>();
    (sourcesData?.erpPatternDefinitions ?? []).forEach((s: any) => {
      map.set(s.name, { id: s.name, name: s.name, scope: s.scope, sourceType: s.sourceType, destinationTable: s.destinationTable || "", expectedFilePattern: s.expectedFilePattern || "", active: s.active, status: s.status, isPattern: true });
    });
    (sourcesData?.erpSourceDefinitions?.items ?? []).forEach((s: any) => {
      map.set(s.name, { id: s.id, name: s.name, scope: s.scope, sourceType: s.sourceType, destinationTable: s.destinationTable || "", expectedFilePattern: s.expectedFilePattern || "", active: s.active, status: s.status, lastImportedAt: s.lastImportedAt, isPattern: false });
    });
    return Array.from(map.values());
  }, [sourcesData]);

  const sources = useMemo(() => allSources.filter(s => s.scope === scope), [allSources, scope]);
  const selectedSource = useMemo(() => allSources.find(s => s.id === sourceId) ?? null, [allSources, sourceId]);

  const { data: destData } = useQuery<{ erpDestinationTables: string[] }>(ALIGNMENT_DEST_TABLES_QUERY, { variables: { scope }, skip: !scope, fetchPolicy: "cache-and-network" });

  // Nexus target fields (parsed from JSON)
  const [fetchNexusFields, { data: nexusFieldsRaw }] = useLazyQuery<{ nexusTargetFields: string }>(NEXUS_TARGET_FIELDS_QUERY);

  const nexusFields = useMemo((): NexusFieldOption[] => {
    if (!nexusFieldsRaw?.nexusTargetFields) return [];
    try {
      const parsed = JSON.parse(nexusFieldsRaw.nexusTargetFields);
      if (Array.isArray(parsed)) return parsed as NexusFieldOption[];
      if (typeof parsed === "object") {
        const fields: NexusFieldOption[] = [];
        for (const [entity, fds] of Object.entries(parsed)) {
          if (Array.isArray(fds)) {
            fds.forEach((fd: any) => {
              fields.push({ entity, field: fd.name || fd.field || fd, path: `${entity}.${fd.name || fd.field || fd}`, required: fd.required || false, type: fd.type || "string" });
            });
          }
        }
        return fields;
      }
    } catch { /* ignore parse errors */ }
    return [];
  }, [nexusFieldsRaw]);

  // Detected columns from selected source
  const [fetchColumns, { data: columnsData, loading: columnsLoading }] = useLazyQuery<{ detectedColumns: DetectedColumn[] }>(DETECTED_COLUMNS_QUERY);

  // Profiles
  const { data: profilesData, refetch: refetchProfiles } = useQuery<{ importProfiles: ProfileItem[] }>(ALIGNMENT_PROFILES_QUERY, { fetchPolicy: "cache-and-network" });
  const [fetchProfile, { data: profileData }] = useLazyQuery<{ importProfile: ProfileItem | null; importFieldMappings: FieldMapping[] }>(ALIGNMENT_PROFILE_QUERY);

  // Mutations
  const [saveMapping] = useMutation<any>(SAVE_ALIGNMENT_MAPPING);
  const [validateMapping] = useMutation<any>(VALIDATE_ALIGNMENT);
  const [createProfile] = useMutation<any>(CREATE_ALIGNMENT_PROFILE);

  // Derived column list
  const detectedColumns: DetectedColumn[] = useMemo(() => columnsData?.detectedColumns ?? [], [columnsData]);
  const filteredColumns = useMemo(() => {
    if (!searchTerm) return detectedColumns;
    const t = searchTerm.toLowerCase();
    return detectedColumns.filter(c => c.columnName.toLowerCase().includes(t));
  }, [detectedColumns, searchTerm]);

  // Validation state
  const hasErrors = validationErrorCount > 0;
  const mappedCount = Object.keys(mappings).filter(k => mappings[k]).length;
  const reqMissing = Object.entries(requiredFields).filter(([col, req]) => req && !mappings[col]).length;

  // ── Handlers ──
  const handleScopeChange = (val: string) => {
    setScope(val); setSourceId(null); setDestTable(""); setMappings({}); setRequiredFields({}); setValidationIssues([]); setValidationErrorCount(0);
  };

  const handleSourceChange = (id: string) => {
    setSourceId(id); setMappings({}); setRequiredFields({}); setValidationIssues([]); setValidationErrorCount(0);
    const s = allSources.find(x => x.id === id);
    if (s?.destinationTable && s.scope === scope) {
      setDestTable(s.destinationTable);
      void fetchNexusFields({ variables: { entityType: s.destinationTable } });
    } else {
      setDestTable("");
    }
    // Default file path for pattern sources — resolve from expectedFilePattern to Excel
    if (s?.isPattern) {
      const baseDir = "D:/02_Work/localai/lmd/erp_data/patterns/";
      // expectedFilePattern is e.g. "RG_Dashboard_template.xlsx" or "RG Dashboard*.xlsx"
      const pat = s.expectedFilePattern || "";
      // Strip glob chars, strip _template before extension, normalize underscores to spaces
      const fileName = pat
        .replace(/[*?]/g, "")
        .replace(/_template(?=\.)/i, "")
        .replace(/_/g, " ");
      // Ensure .xlsx extension
      const finalName = /\.(xlsx|xls|csv)$/i.test(fileName) ? fileName : fileName + ".xlsx";
      const defaultPath = baseDir + finalName;
      setFilePath(defaultPath);
      void fetchColumns({ variables: { filePath: defaultPath } });
    } else {
      setFilePath("");
    }
  };

  const handleDestChange = (val: string) => {
    setDestTable(val);
    if (val) void fetchNexusFields({ variables: { entityType: val } });
  };

  const handleMappingChange = (columnName: string, targetField: string) => {
    setMappings(prev => ({ ...prev, [columnName]: targetField }));
    setValidationIssues([]); setValidationErrorCount(0);
  };

  const handleRequiredToggle = (columnName: string) => {
    setRequiredFields(prev => ({ ...prev, [columnName]: !prev[columnName] }));
  };

  const handleAutoMatch = async () => {
    if (!activeProfileId) {
      const name = profileName || `Alignment ${new Date().toLocaleDateString()}`;
      try {
        const r = await createProfile({ variables: { name, domain: scope } });
        if (r.data?.createImportProfile?.ok) {
          setActiveProfileId(r.data.createImportProfile.profile.id);
        } else { setStatusMsg({ type: "error", text: "Failed to create alignment profile" }); return; }
      } catch { setStatusMsg({ type: "error", text: "Error creating profile" }); return; }
    }
    if (!activeProfileId) return;
    setStatusMsg({ type: "info", text: "Running auto-match..." });
    try {
      const r = await validateMapping({ variables: { profileId: activeProfileId } });
      if (r.data?.validateImportMapping) {
        const issues: ValidationIssue[] = r.data.validateImportMapping.issues || [];
        setValidationIssues(issues);
        setValidationErrorCount(r.data.validateImportMapping.blockingErrorCount || 0);
        setStatusMsg({ type: issues.length === 0 ? "success" : "info", text: `Auto-match done. ${issues.length} issues found.` });
      }
    } catch { setStatusMsg({ type: "error", text: "Auto-match failed" }); }
  };

  const handleValidate = async () => {
    if (!activeProfileId) { setStatusMsg({ type: "error", text: "Save alignment first" }); return; }
    setStatusMsg({ type: "info", text: "Validating..." });
    try {
      const r = await validateMapping({ variables: { profileId: activeProfileId } });
      if (r.data?.validateImportMapping) {
        const issues: ValidationIssue[] = r.data.validateImportMapping.issues || [];
        setValidationIssues(issues);
        setValidationErrorCount(r.data.validateImportMapping.blockingErrorCount || 0);
        setStatusMsg({ type: issues.some(i => i.severity === "ERROR") ? "error" : "success", text: `Validation complete. ${issues.length} issues.` });
      }
    } catch { setStatusMsg({ type: "error", text: "Validation failed" }); }
  };

  const handleSave = async () => {
    if (!activeProfileId) {
      const name = profileName || `Alignment ${new Date().toLocaleDateString()}`;
      try {
        const r = await createProfile({ variables: { name, domain: scope } });
        if (r.data?.createImportProfile?.ok) {
          setActiveProfileId(r.data.createImportProfile.profile.id);
        } else { setStatusMsg({ type: "error", text: "Failed to create profile" }); return; }
      } catch { setStatusMsg({ type: "error", text: "Error creating profile" }); return; }
    }
    setStatusMsg({ type: "info", text: "Saving mappings..." });
    let saved = 0, failed = 0;
    for (const [col, target] of Object.entries(mappings)) {
      if (!target) continue;
      try {
        const r = await saveMapping({ variables: { profileId: activeProfileId, entityType: scope, sourceColumn: col, targetField: target, isRequired: requiredFields[col] || false } });
        if (r.data?.saveImportFieldMapping?.ok) saved++; else failed++;
      } catch { failed++; }
    }
    setStatusMsg({ type: failed === 0 ? "success" : "error", text: `Saved ${saved} mappings${failed > 0 ? `, ${failed} failed` : ""}.` });
    void refetchProfiles();
  };

  const handleSelectProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    void fetchProfile({ variables: { profileId } });
    const p = profilesData?.importProfiles?.find(pr => pr.id === profileId);
    if (p) { setScope(p.domain); setProfileName(p.name); }
  };

  // Load existing mappings when profile is fetched
  useMemo(() => {
    if (profileData?.importFieldMappings) {
      const m: Record<string, string> = {};
      const r: Record<string, boolean> = {};
      profileData.importFieldMappings.forEach(fm => {
        m[fm.sourceColumn] = fm.targetField;
        r[fm.sourceColumn] = fm.isRequired;
      });
      setMappings(m);
      setRequiredFields(r);
    }
  }, [profileData]);

  // ── ISSUE HELPERS ──
  const issueSeverityIcon = (sev: string) => {
    switch (sev) {
      case "ERROR": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case "WARNING": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };


  // Nexus fields are already scoped by the backend query — no client filter needed
  const filteredNexusOptions = nexusFields;

  // ── RENDER ──
  return (
    <AppPageLayout icon={<AlignVerticalSpaceAround />} title="Data Alignment"
      subtitle="Align ERP source columns with Nexus production structure fields."
      toolbar={
        <>
          <select value={scope} onChange={e => handleScopeChange(e.target.value)} className={sel} title="Scope — filters available sources and destination tables">
            {SCOPES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select value={sourceId ?? ""} onChange={e => handleSourceChange(e.target.value)} className={sel} title="ERP file/source">
            <option value="">Source...</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}{s.isPattern ? "" : " (DB)"}</option>)}
          </select>
          <select value={destTable} onChange={e => handleDestChange(e.target.value)} className={sel} title="Destination group">
            <option value="">Destination...</option>
            {(destData?.erpDestinationTables ?? []).map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="relative">
            <input value={filePath} onChange={e => setFilePath(e.target.value)} placeholder="File path..."
              className="h-7 px-2 rounded border border-border/30 bg-card text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50 w-[280px]" />
          </div>
          <button type="button" onClick={() => { if (filePath) void fetchColumns({ variables: { filePath } }); }}
            disabled={!filePath} className={tBtn} title="Detect columns from Excel file">
            <HardDrive className="h-4 w-4" /><span>Detect</span>
          </button>
          <div className="relative flex-1 max-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search columns..."
              className="w-full h-7 pl-7 pr-2 rounded border border-border/30 bg-card text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50" />
          </div>
          <div className="flex-1" />
          <select value={activeProfileId ?? ""} onChange={e => handleSelectProfile(e.target.value)} className={sel} title="Saved alignment">
            <option value="">Saved alignments...</option>
            {(profilesData?.importProfiles ?? []).map(p => <option key={p.id} value={p.id}>{p.name} v{p.version}</option>)}
          </select>
          <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Alignment name..."
            className="h-7 px-2 rounded border border-border/30 bg-card text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50 w-[180px]" />
          <button type="button" onClick={handleAutoMatch} disabled={!activeProfileId && detectedColumns.length === 0} className={tBtn} title="Auto-match columns to Nexus fields">
            <Check className="h-4 w-4" /><span>Auto Match</span>
          </button>
          <button type="button" onClick={handleValidate} disabled={!activeProfileId} className={tBtn} title="Validate current mapping">
            <AlertTriangle className="h-4 w-4" /><span>Validate</span>
          </button>
          <button type="button" onClick={handleSave} disabled={detectedColumns.length === 0} className={tBtnPrimary}>
            <Save className="h-4 w-4" /><span>Save Alignment</span>
          </button>
          <button type="button" onClick={() => { void refetchProfiles(); }} className={tBtn}>
            <RefreshCw className="h-4 w-4" /><span>Refresh</span>
          </button>
        </>
      }
      footer={
        <div className="flex w-full items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="font-semibold text-foreground">{scope.replace(/_/g, " ")}</span>
          <span className="text-border/30">&middot;</span>
          <span>{selectedSource?.name || "No source"}</span>
          <span className="text-border/30">&middot;</span>
          <span>{destTable || "No destination"}</span>
          <span className="text-border/30">&middot;</span>
          <span>{mappedCount}/{detectedColumns.length} mapped</span>
          {reqMissing > 0 && <span className="text-destructive">{reqMissing} required missing</span>}
          {hasErrors && <span className="text-destructive">{validationErrorCount} blocking</span>}
          {!hasErrors && validationIssues.length > 0 && <span className="text-emerald-500">Valid</span>}
          {validationIssues.length === 0 && mappedCount > 0 && <span className="text-muted-foreground">Not validated</span>}
        </div>
      }
    >
      <div className="h-full overflow-hidden flex flex-col">
        {/* Status message */}
        {statusMsg.text && (
          <div className={`shrink-0 flex items-center justify-between px-4 py-2 text-xs border-b ${
            statusMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
            statusMsg.type === "error" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-blue-500/10 border-blue-500/20 text-blue-600"}`}>
            <span>{statusMsg.text}</span>
            <button type="button" onClick={() => setStatusMsg({ type: null, text: "" })} className="p-0.5 rounded hover:bg-muted"><X className="h-3 w-3" /></button>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* MAIN: Mapping Table */}
          {!sourceId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <HardDrive className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Select an ERP Source</h3>
                <p className="text-xs text-muted-foreground">Choose a scope and ERP source file to see columns and align them with Nexus fields.</p>
              </div>
            </div>
          ) : columnsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-xs text-muted-foreground">Reading columns from file...</span>
            </div>
          ) : detectedColumns.length === 0 && filePath ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <XCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/20" />
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">No Columns Detected</h3>
                <p className="text-xs text-muted-foreground">The file at <code className="rounded bg-muted px-1 text-[10px]">{filePath}</code> has no detectable columns. Check the file path and try again.</p>
              </div>
            </div>
          ) : detectedColumns.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <HardDrive className="h-10 w-10 mx-auto mb-2 text-muted-foreground/20" />
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Enter a File Path</h3>
                <p className="text-xs text-muted-foreground mb-4">Specify the path to an Excel file in the toolbar to detect columns and begin mapping.</p>
                <div className="flex items-center gap-2 justify-center">
                  <input value={filePath} onChange={e => setFilePath(e.target.value)} placeholder="e.g. D:/data/RG Dashboard.xlsx"
                    className="h-8 px-3 rounded border border-border/30 bg-card text-[11px] text-foreground outline-none w-[320px]" />
                  <button type="button" onClick={() => { if (filePath) void fetchColumns({ variables: { filePath } }); }}
                    disabled={!filePath} className={`${tBtnPrimary} h-8`}>Detect Columns</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0">
              {/* Mapping Table */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-muted/90 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-3 py-2 text-left w-8"></th>
                      <th className="px-3 py-2 text-left w-[30%]">ERP Source Column</th>
                      <th className="px-3 py-2 text-left w-[15%]">Type</th>
                      <th className="px-3 py-2 text-left w-[20%]">Sample Values</th>
                      <th className="px-3 py-2 text-left w-[35%]">Nexus Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredColumns.map(col => {
                      const isMapped = !!mappings[col.columnName];
                      const isRequired = requiredFields[col.columnName] || false;
                      const colError = validationIssues.find(i => i.sourceColumn === col.columnName && i.severity === "ERROR");
                      const colWarn = validationIssues.find(i => i.sourceColumn === col.columnName && i.severity === "WARNING");
                      const rowStatus = colError ? "border-l-2 border-l-destructive bg-destructive/5" : colWarn ? "border-l-2 border-l-amber-500 bg-amber-500/5" : isMapped ? "border-l-2 border-l-emerald-500" : "";

                      return (
                        <tr key={col.columnName} className={`border-t border-border/10 hover:bg-muted/20 transition-colors ${rowStatus}`}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={isRequired} onChange={() => handleRequiredToggle(col.columnName)}
                              className="h-3.5 w-3.5 rounded border-border/30 accent-primary" title={isRequired ? "Required" : "Optional"} />
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">{col.columnName}</td>
                          <td className="px-3 py-2 text-muted-foreground"><span className="rounded bg-muted px-1.5 py-0.5 text-[9px]">{col.detectedType}</span></td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">
                            {col.sampleValues?.slice(0, 3).map((v, i) => (
                              <span key={i} className="inline-block rounded bg-card border border-border/30 px-1 mr-1 text-[9px]">{v}</span>
                            ))}
                            {(!col.sampleValues || col.sampleValues.length === 0) && <span className="text-muted-foreground/50 italic">no samples</span>}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <select value={mappings[col.columnName] || ""} onChange={e => handleMappingChange(col.columnName, e.target.value)}
                                className="flex-1 h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-foreground outline-none min-w-[140px]">
                                <option value="">{isRequired ? "⚠ Required — select field" : "— Not mapped —"}</option>
                                {filteredNexusOptions.map(nf => (
                                  <option key={nf.path} value={nf.path}>{nf.entity} &gt; {nf.field}</option>
                                ))}
                              </select>
                              {colError && <span title={colError.message}><XCircle className="h-3.5 w-3.5 text-destructive shrink-0" /></span>}
                              {colWarn && <span title={colWarn.message}><AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /></span>}
                              {isMapped && !colError && !colWarn && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredColumns.length === 0 && searchTerm && (
                  <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                    No columns matching "{searchTerm}"
                  </div>
                )}
              </div>

              {/* RIGHT: Validation Panel */}
              <div className="w-[280px] shrink-0 border-l border-border/30 overflow-y-auto bg-card/50">
                <div className="sticky top-0 bg-card/95 border-b border-border/15 px-3 py-2">
                  <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Validation</h3>
                </div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div className="rounded bg-muted p-2">
                    <div className="text-[10px] text-muted-foreground">Columns</div>
                    <div className="font-medium text-foreground">{detectedColumns.length}</div>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <div className="text-[10px] text-muted-foreground">Mapped</div>
                    <div className={`font-medium ${mappedCount === detectedColumns.length ? "text-emerald-500" : "text-foreground"}`}>{mappedCount}/{detectedColumns.length}</div>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <div className="text-[10px] text-muted-foreground">Required missing</div>
                    <div className={`font-medium ${reqMissing === 0 ? "text-emerald-500" : "text-destructive"}`}>{reqMissing}</div>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <div className="text-[10px] text-muted-foreground">Status</div>
                    <div className={`font-medium ${hasErrors ? "text-destructive" : validationIssues.length > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {hasErrors ? "Blocked" : validationIssues.length > 0 ? "Valid" : "Not validated"}
                    </div>
                  </div>

                  {validationIssues.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/20">
                      <div className="text-[10px] font-semibold text-muted-foreground">Issues</div>
                      {validationIssues.slice(0, 10).map((issue, i) => (
                        <div key={i} className="flex items-start gap-1.5 p-1.5 rounded bg-muted">
                          {issueSeverityIcon(issue.severity)}
                          <div className="min-w-0">
                            <div className="text-[10px] text-foreground">{issue.message}</div>
                            {issue.sourceColumn && <div className="text-[9px] text-muted-foreground">{issue.sourceColumn}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasErrors && mappedCount === detectedColumns.length && detectedColumns.length > 0 && (
                    <div className="rounded bg-emerald-500/10 p-3 border border-emerald-500/20 text-center mt-2">
                      <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                      <p className="text-[10px] font-medium text-emerald-600">All columns mapped</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Save alignment to reuse in Import / Update.</p>
                    </div>
                  )}

                  {nexusFields.length === 0 && destTable && (
                    <div className="rounded bg-amber-500/10 p-2 border border-amber-500/20 text-[10px]">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 inline mr-1" />
                      No Nexus fields found for this destination.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppPageLayout>
  );
}
