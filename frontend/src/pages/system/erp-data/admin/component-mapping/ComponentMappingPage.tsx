import { useState, useCallback, type DragEvent } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  RefreshCw, CheckCircle, XCircle,
  AlertTriangle, ListChecks, Info, Check, AlertCircle,
  MapIcon, ShieldAlert, DiffIcon, Layers, GitCompare,
  Play, GripVertical, ArrowRight, CornerDownRight,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import {
  IMPORT_PROFILES_QUERY, IMPORT_PROFILE_QUERY,
  DETECTED_COLUMNS_QUERY,
  MAPPING_VALIDATION_QUERY, IMPORT_RESULT_TREE_QUERY,
  COMPARE_SUMMARY_QUERY,
  SAVE_IMPORT_FIELD_MAPPING,
  REMOVE_IMPORT_FIELD_MAPPING, ACTIVATE_IMPORT_PROFILE,
} from "@/graphql/erpMappingQueries";

const tBtn = `inline-flex items-center justify-center h-7 px-2 rounded border border-border/30 bg-card text-[10px] font-medium text-muted-foreground hover:bg-muted hover:border-border/50 active:bg-muted disabled:pointer-events-none disabled:opacity-40 transition-colors gap-1`;

const TABS = [
  { id: "plant-validation", label: "Plant", icon: ShieldAlert },
  { id: "departments", label: "Depts", icon: Layers },
  { id: "resource-groups", label: "Groups", icon: Layers },
  { id: "resources", label: "Resources", icon: Layers },
  { id: "result-tree", label: "Tree", icon: GitCompare },
  { id: "validation", label: "Checks", icon: ListChecks },
  { id: "compare-summary", label: "Compare", icon: DiffIcon },
];

const ENTITY_REQUIRED_FIELDS: Record<string, string[]> = {
  Department: ["department_code"],
  ResourceGroup: ["resource_group_code", "resource_group_name", "department_code"],
  Resource: ["resource_code", "resource_name", "resource_group_code"],
};

const ENTITY_OPTIONAL_FIELDS: Record<string, string[]> = {
  Department: ["department_name", "status", "plant_code"],
  ResourceGroup: ["operation_code", "calendar_code", "input_bin", "output_bin", "backflush_bin", "status"],
  Resource: ["resource_type", "calendar_code", "capacity", "operator_type", "status"],
};

function SeverityBadge({ severity }: { severity: string }) {
  const isErr = severity === "error";
  const isWarn = severity === "warning";
  const cls = isErr ? "text-destructive bg-destructive/10" : isWarn ? "text-amber-600 bg-amber-100" : "text-blue-600 bg-blue-100";
  return <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium ${cls}`}>{isErr ? <AlertCircle className="h-2.5 w-2.5" /> : isWarn ? <AlertTriangle className="h-2.5 w-2.5" /> : <Info className="h-2.5 w-2.5" />}{severity}</span>;
}

function SectionHeader({ title, count, actions }: { title: string; count?: number; actions?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-muted/95 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1 border-b border-border/10 min-h-[24px]">
      <span>{title}</span>
      {count !== undefined && <span className="text-muted-foreground">({count})</span>}
      <div className="flex-1" />
      {actions}
    </div>
  );
}

function FieldBadge({ field, required, mapped, onDragStart }: { field: string; required?: boolean; mapped?: boolean; onDragStart?: (e: DragEvent) => void }) {
  const mappedCls = mapped ? "border-emerald-400/40 bg-emerald-500/10" : required ? "border-destructive/30 bg-destructive/5" : "border-border/20 bg-card";
  return (
    <div className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] border ${mappedCls} ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""} group transition-colors`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}>
      {onDragStart && <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
      <span className="truncate flex-1">{field}</span>
      {required && !mapped && <AlertCircle className="h-3 w-3 text-destructive shrink-0" />}
      {mapped && <Check className="h-3 w-3 text-emerald-600 shrink-0" />}
    </div>
  );
}

function ColBadge({ col, onDragStart }: { col: any; onDragStart: (e: DragEvent, col: any) => void }) {
  const coverage = col.totalRows > 0 ? Math.round(((col.totalRows - col.nullCount) / col.totalRows) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-1 rounded border border-border/20 bg-card text-[10px] cursor-grab active:cursor-grabbing hover:bg-muted/40 hover:border-indigo-300/40 transition-all group"
      draggable
      onDragStart={(e) => onDragStart(e, col)}>
      <GripVertical className="h-3 w-3 text-muted-foreground/20 shrink-0 group-hover:text-muted-foreground/50 transition-colors" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground truncate">{col.columnName}</div>
        <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground mt-0.5">
          {col.sampleValues?.[0] && <span className="truncate max-w-[60px]">Ex: {col.sampleValues[0]}</span>}
          <span className={`px-0.5 rounded ${col.detectedType === "NUMERIC" ? "text-blue-600 bg-blue-100" : "text-muted-foreground bg-muted"}`}>{col.detectedType}</span>
          <span className={coverage === 100 ? "text-emerald-600" : coverage > 50 ? "text-amber-600" : "text-destructive"}>{coverage}%</span>
        </div>
      </div>
    </div>
  );
}

function MappingCard({ sourceCol, targetField, onRemove }: { sourceCol: string; targetField: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-indigo-300/30 bg-indigo-500/8 text-[10px] group hover:border-indigo-400/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-[8px] font-medium uppercase tracking-wider">ERP</span>
          <span className="font-medium text-foreground truncate">{sourceCol}</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
          <CornerDownRight className="h-2.5 w-2.5" />
          <span className="font-medium text-indigo-600 truncate">{targetField}</span>
        </div>
      </div>
      <button type="button" onClick={onRemove} className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all">
        <XCircle className="h-3 w-3 stroke-current" />
      </button>
    </div>
  );
}

function MappingCanvas({
  entityType,
  mappings,
  onDrop,
  onRemove,
}: {
  entityType: string;
  mappings: Array<{ sourceColumn: string; targetField: string; isRequired: boolean }>;
  onDrop: (sourceColumn: string, targetField: string) => void;
  onRemove: (sourceColumn: string) => void;
}) {
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "link"; };
  const handleDrop = (e: DragEvent, targetField: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.columnName) onDrop(data.columnName, targetField);
    } catch { /* ignore */ }
  };

  const requiredFields = ENTITY_REQUIRED_FIELDS[entityType] || [];
  const optionalFields = ENTITY_OPTIONAL_FIELDS[entityType] || [];
  const mappedTargets = new Set(mappings.map((m) => m.targetField));

  const mappedTargetSet = new Set(mappings.map((m) => m.targetField));
  const mappedCount = mappings.length;
  const requiredMapped = requiredFields.filter((f) => mappedTargetSet.has(f)).length;

  return (
    <div className="h-full flex flex-col">
      <SectionHeader title={`${entityType} Mapping`}
        actions={<span className="text-[9px] text-muted-foreground">{mappedCount} mapped · {requiredMapped}/{requiredFields.length} required</span>}
      />
      <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
        {mappings.length > 0 && (
          <div className="space-y-1">
            <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">Active Mappings</div>
            {mappings.map((m) => (
              <MappingCard key={m.sourceColumn} sourceCol={m.sourceColumn} targetField={m.targetField} onRemove={() => onRemove(m.sourceColumn)} />
            ))}
          </div>
        )}
        <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">Required Fields — {requiredMapped}/{requiredFields.length}</div>
        {requiredFields.map((rf) => {
          const mapping = mappings.find((m) => m.targetField === rf);
          return (
            <div key={rf}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, rf)}
              className={`min-h-[28px] rounded border-2 border-dashed transition-all ${mapping ? "border-emerald-400/50 bg-emerald-500/8" : mappedTargets.has(rf) ? "border-emerald-400/50" : "border-destructive/30 bg-destructive/[0.02] hover:border-destructive/50"}`}>
              {mapping ? (
                <MappingCard sourceCol={mapping.sourceColumn} targetField={rf} onRemove={() => onRemove(mapping.sourceColumn)} />
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] text-destructive/70"><AlertCircle className="h-3 w-3 shrink-0" /><span>Drop column → <strong>{rf}</strong></span></div>
              )}
            </div>
          );
        })}
        <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5 mt-2">Optional Fields</div>
        {optionalFields.map((of) => {
          const mapping = mappings.find((m) => m.targetField === of);
          return (
            <div key={of}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, of)}
              className={`min-h-[28px] rounded border-2 border-dashed border-border/30 transition-all ${mapping ? "border-indigo-300/30 bg-indigo-500/5" : "hover:border-border/60"}`}>
              {mapping ? (
                <MappingCard sourceCol={mapping.sourceColumn} targetField={of} onRemove={() => onRemove(mapping.sourceColumn)} />
              ) : (
                <div className="text-[9px] text-muted-foreground/50 italic px-2 py-1">Drop → {of}</div>
              )}
            </div>
          );
        })}
        {mappings.length === 0 && requiredFields.length === 0 && (
          <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground italic">
            <MapIcon className="h-6 w-6 stroke-current opacity-20 mr-1" /> Drag ERP columns from the left panel to LeanSync fields
          </div>
        )}
      </div>
    </div>
  );
}

function ResultTreeView({ data, loading }: { data: any; loading: boolean }) {
  const nodes: any[] = data?.importResultTree ?? [];
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  if (loading) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-success animate-bounce mr-2" />Loading tree…</div>;
  if (nodes.length === 0) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground"><GitCompare className="h-8 w-8 stroke-current opacity-30 mr-2" />Run compare to see result tree</div>;

  const renderNode = (node: any, depth: number): React.ReactNode => {
    const key = `${node.entityType}:${node.entityKey}`;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(key);
    const actionCls = node.action === "CREATE" ? "text-emerald-600 bg-emerald-100" : node.action === "UPDATE" ? "text-blue-600 bg-blue-100" : node.action === "CONFLICT" ? "text-destructive bg-destructive/10" : node.action === "ERROR" ? "text-red-600 bg-red-100" : "text-muted-foreground bg-muted";
    let details: any = {};
    try { details = JSON.parse(node.detailsJson || "{}"); } catch { /* ignore */ }
    return (
      <div key={key}>
        <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] hover:bg-muted/20 cursor-pointer"
          onClick={() => hasChildren && toggle(key)}
          style={{ paddingLeft: 6 + depth * 14 }}>
          {hasChildren ? (
            <span className="text-muted-foreground w-2.5 shrink-0 text-[8px]">{isExpanded ? "▼" : "▶"}</span>
          ) : <span className="w-2.5 shrink-0" />}
          <span className={`rounded px-1 py-0.5 text-[7px] font-medium ${actionCls}`}>{node.action}</span>
          <span className="font-medium text-foreground">{node.entityType}</span>
          <span className="text-muted-foreground text-[9px]">#{node.entityKey}</span>
          {details.name && <span className="text-muted-foreground/50 truncate max-w-[80px] text-[9px]">({details.name})</span>}
        </div>
        {isExpanded && hasChildren && node.children.map((c: any) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return <div className="h-full overflow-auto py-0.5">{nodes.map((n: any) => renderNode(n, 0))}</div>;
}

export function ComponentMappingPage() {
  const [activeTab, setActiveTab] = useState("departments");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [filePath, setFilePath] = useState("");
  const [plantCode, setPlantCode] = useState("");
  const [searchCol, setSearchCol] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const { data: profilesData } = useQuery<any>(IMPORT_PROFILES_QUERY);
  const profiles: any[] = profilesData?.importProfiles ?? [];
  const activeProfile = profiles.find((p: any) => p.isActive);

  const { data: profileData, refetch: refetchProfile } = useQuery<any>(IMPORT_PROFILE_QUERY, {
    variables: { profileId: selectedProfileId },
    skip: !selectedProfileId,
    fetchPolicy: "network-only",
  });

  const { data: columnsData, loading: columnsLoading } = useQuery<any>(DETECTED_COLUMNS_QUERY, {
    variables: { filePath },
    skip: !filePath,
    fetchPolicy: "network-only",
  });

  const { data: validationData } = useQuery<any>(MAPPING_VALIDATION_QUERY, {
    variables: { profileId: selectedProfileId },
    skip: !selectedProfileId,
    fetchPolicy: "network-only",
  });

  const { data: treeData, loading: treeLoading } = useQuery<any>(IMPORT_RESULT_TREE_QUERY, {
    variables: { profileId: selectedProfileId, filePath, plantCode },
    skip: !selectedProfileId || !filePath || activeTab !== "result-tree",
    fetchPolicy: "network-only",
  });

  const { data: compareData, loading: compareLoading } = useQuery<any>(COMPARE_SUMMARY_QUERY, {
    variables: { profileId: selectedProfileId, filePath },
    skip: !selectedProfileId || !filePath || activeTab !== "compare-summary",
    fetchPolicy: "network-only",
  });

  const [saveMapping] = useMutation(SAVE_IMPORT_FIELD_MAPPING, {
    onCompleted: () => { refetchProfile(); setStatusMsg({ type: "success", text: "Mapping saved" }); setTimeout(() => setStatusMsg(null), 2000); },
  });
  const [removeMapping] = useMutation(REMOVE_IMPORT_FIELD_MAPPING, { onCompleted: () => refetchProfile() });
  const [activateProfile] = useMutation(ACTIVATE_IMPORT_PROFILE, {
    onCompleted: (d: any) => { if (d?.activateImportProfile?.ok) { setStatusMsg({ type: "success", text: "Profile activated" }); setTimeout(() => setStatusMsg(null), 2000); } refetchProfile(); },
  });

  const mappings: any[] = profileData?.importFieldMappings ?? [];
  const columns: any[] = columnsData?.detectedColumns ?? [];
  const validation: any = validationData?.mappingValidation;
  const compareRows: any[] = compareData?.compareSummary ?? [];

  const filteredColumns = searchCol ? columns.filter((c: any) => c.columnName.toLowerCase().includes(searchCol.toLowerCase())) : columns;

  const getEntityMappings = (entityType: string) => mappings.filter((m: any) => m.entityType === entityType);

  const handleDropMapping = useCallback(async (entityType: string, sourceColumn: string, targetField: string) => {
    if (!selectedProfileId) return;
    const isRequired = (ENTITY_REQUIRED_FIELDS[entityType] || []).includes(targetField);
    setStatusMsg({ type: "info", text: `Mapping ${sourceColumn} → ${targetField}…` });
    await saveMapping({ variables: { profileId: selectedProfileId, entityType, sourceColumn, targetField, isRequired } });
  }, [selectedProfileId, saveMapping]);

  const handleRemoveMapping = useCallback(async (entityType: string, sourceColumn: string) => {
    const m = mappings.find((m: any) => m.entityType === entityType && m.sourceColumn === sourceColumn);
    if (!m) return;
    await removeMapping({ variables: { profileId: selectedProfileId, mappingId: m.id } });
  }, [selectedProfileId, mappings, removeMapping]);

  const handleColumnDrag = (e: DragEvent, col: any) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(col));
  };

  const handleActivate = async () => {
    if (!selectedProfileId) return;
    try {
      await activateProfile({ variables: { profileId: selectedProfileId } });
    } catch { setStatusMsg({ type: "error", text: "Activation failed: resolve validation errors first" }); }
  };

  const currentEntityType = activeTab === "departments" ? "Department" : activeTab === "resource-groups" ? "ResourceGroup" : activeTab === "resources" ? "Resource" : null;
  const entityMappings = currentEntityType ? getEntityMappings(currentEntityType) : [];

  const validationSummary = validation ? {
    blockingErrors: validation.blockingErrorCount || 0,
    errors: validation.issues?.filter((i: any) => i.severity === "error").length || 0,
    warnings: validation.issues?.filter((i: any) => i.severity === "warning").length || 0,
    ok: validation.ok,
  } : null;

  return (
    <AppPageLayout title="Component Mapping" subtitle="ERP-to-LeanSync production structure mapping" icon={<MapIcon />} iconClass="text-indigo-600">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Status bar */}
        {statusMsg && (
          <div className={`shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] border-b border-border/20 ${statusMsg.type === "success" ? "bg-emerald-500/10 text-emerald-700" : statusMsg.type === "error" ? "bg-destructive/10 text-destructive" : "bg-blue-500/10 text-blue-700"}`}>
            {statusMsg.type === "success" ? <Check className="h-3 w-3" /> : statusMsg.type === "error" ? <AlertCircle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
            {statusMsg.text}
          </div>
        )}

        {/* Toolbar */}
        <div className="shrink-0 flex h-9 items-center gap-1.5 border-b border-border/30 bg-muted/70 px-2 select-none">
          <select value={selectedProfileId} onChange={(e) => { setSelectedProfileId(e.target.value); setStatusMsg(null); }}
            className="h-6 rounded border border-border/30 bg-card px-1.5 text-[10px] text-muted-foreground outline-none max-w-[140px]">
            <option value="">Select profile</option>
            {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.isActive ? " ★" : ""}</option>)}
          </select>
          <select value={filePath} onChange={(e) => setFilePath(e.target.value)}
            className="h-6 rounded border border-border/30 bg-card px-1.5 text-[10px] text-muted-foreground outline-none max-w-[160px]">
            <option value="">Select file</option>
            <option value="C:\imports\RG_Dashboard.xlsx">RG_Dashboard.xlsx</option>
            <option value="D:\erp\plant_structure.xlsx">plant_structure.xlsx</option>
          </select>
          <input type="text" value={plantCode} onChange={(e) => setPlantCode(e.target.value)} placeholder="Plant…"
            className="h-6 w-20 rounded border border-border/30 bg-card px-1.5 text-[10px] text-muted-foreground outline-none" />
          <div className="w-px h-5 bg-border/30 mx-0.5" />
          <button type="button" onClick={() => refetchProfile()} className={tBtn} title="Refresh"><RefreshCw className="h-3.5 w-3.5 stroke-current" /></button>
          <div className="flex-1" />

          {/* Validation status badge */}
          {validationSummary && (
            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${validationSummary.ok ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
              {validationSummary.ok ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {validationSummary.ok ? "Valid" : `${validationSummary.blockingErrors} blocking`}
            </div>
          )}

          {selectedProfileId && (
            <>
              <button type="button" onClick={handleActivate} className={tBtn} title="Activate Profile"><Play className="h-3.5 w-3.5 stroke-current text-emerald-600" /></button>
            </>
          )}

          {activeProfile && (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.5 text-[8px] font-medium text-emerald-700">
              <CheckCircle className="h-2.5 w-2.5" /> {activeProfile.name}
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="shrink-0 px-2 pt-1 pb-1 bg-muted/5 border-b border-border/10">
          <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
            {TABS.map((tab) => {
              const TI = tab.icon;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-[9px] font-medium rounded-sm transition-colors shrink-0 whitespace-nowrap
                    ${activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/20"}`}>
                  <TI className="h-3 w-3 stroke-current" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main workspace */}
        <div className="flex flex-1 min-h-0">
          {/* ERP Columns Panel */}
          {currentEntityType && (
            <div className="w-[220px] min-w-[180px] max-w-[260px] shrink-0 border-r border-border/30 flex flex-col bg-muted/5">
              <div className="shrink-0">
                <div className="flex items-center gap-1 px-1.5 py-1 border-b border-border/10">
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex-1">ERP Columns</span>
                  <span className="text-[8px] text-muted-foreground/40">{columns.length}</span>
                </div>
                <input type="text" value={searchCol} onChange={(e) => setSearchCol(e.target.value)} placeholder="Search…"
                  className="h-6 w-full border-b border-border/10 bg-transparent px-1.5 text-[9px] text-muted-foreground outline-none placeholder:text-muted-foreground/30" />
              </div>
              <div className="flex-1 overflow-y-auto p-1 space-y-1">
                {columnsLoading ? <div className="text-[9px] text-muted-foreground p-2 italic">Loading…</div>
                : !filePath ? <div className="text-[9px] text-muted-foreground p-2 italic">Select a file to detect columns</div>
                : filteredColumns.length === 0 ? <div className="text-[9px] text-muted-foreground p-2 italic">No columns match</div>
                : filteredColumns.map((col: any, i: number) => <ColBadge key={i} col={col} onDragStart={handleColumnDrag} />)}
              </div>
            </div>
          )}

          {/* Center workspace */}
          <div className="flex-1 flex flex-col min-w-0">
            {currentEntityType ? (
              <MappingCanvas
                entityType={currentEntityType}
                mappings={entityMappings}
                onDrop={(sc, tf) => handleDropMapping(currentEntityType, sc, tf)}
                onRemove={(sc) => handleRemoveMapping(currentEntityType, sc)}
              />
            ) : activeTab === "plant-validation" ? (
              <div className="h-full flex flex-col p-2 space-y-1.5 overflow-y-auto">
                <SectionHeader title="Plant Validation" />
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-muted-foreground shrink-0">Plant code:</span>
                  <input type="text" value={plantCode} onChange={(e) => setPlantCode(e.target.value)} placeholder="Enter plant code…" className="h-7 w-36 rounded border border-border/30 bg-card px-1.5 text-[10px] text-foreground outline-none" />
                </div>
                {plantCode && (
                  <div className="rounded border border-emerald-200/30 bg-emerald-500/5 px-2 py-1 text-[10px]">
                    <div className="flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> Plant <strong>{plantCode}</strong> selected</div>
                    <div className="text-muted-foreground text-[9px]">All imported rows validated against this plant</div>
                  </div>
                )}
                {validation && validation.issues?.length > 0 && (
                  <div className="space-y-0.5">
                    <SectionHeader title="Issues" count={validation.issues.length} />
                    {validation.issues.map((iss: any, i: number) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-0.5 text-[10px] border-b border-border/10">
                        <SeverityBadge severity={iss.severity} />
                        <span className="text-foreground truncate">{iss.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!plantCode && <div className="flex items-center justify-center flex-1 text-[10px] text-muted-foreground italic"><ShieldAlert className="h-6 w-6 stroke-current opacity-20 mr-1" /> Enter a plant code to validate</div>}
              </div>
            ) : activeTab === "result-tree" ? (
              <ResultTreeView data={treeData} loading={treeLoading} />
            ) : activeTab === "validation" ? (
              <div className="h-full flex flex-col">
                <SectionHeader title="Validation Results"
                  actions={validationSummary ? <span className={`text-[9px] ${validationSummary.ok ? "text-emerald-600" : "text-destructive"}`}>{validationSummary.ok ? "All checks passed" : `${validationSummary.blockingErrors} blocking`}</span> : undefined}
                />
                <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
                  {!validation ? <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground italic"><ListChecks className="h-6 w-6 stroke-current opacity-20 mr-1" />Select a profile to validate</div>
                  : validation.issues?.length === 0 ? <div className="flex items-center justify-center h-full text-[10px] text-emerald-600"><Check className="h-4 w-4 mr-1" />All validations passed</div>
                  : ["error", "warning", "info"].map((sev) => {
                    const items = validation.issues.filter((i: any) => i.severity === sev);
                    if (items.length === 0) return null;
                    return (
                      <div key={sev}>
                        <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1 py-0.5">{sev === "error" ? "Blocking Errors" : sev === "warning" ? "Warnings" : "Info"} ({items.length})</div>
                        {items.map((iss: any, i: number) => (
                          <div key={i} className="flex items-start gap-1 px-2 py-0.5 text-[10px] border-b border-border/10">
                            <SeverityBadge severity={iss.severity} />
                            <span className="text-foreground truncate flex-1">{iss.message}</span>
                            {iss.entityType && <span className="text-muted-foreground/50 shrink-0 text-[9px]">{iss.entityType}</span>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeTab === "compare-summary" ? (
              <div className="h-full flex flex-col">
                <div className="shrink-0 flex gap-1.5 p-1.5 border-b border-border/20 bg-muted/20">
                  {["CREATE", "UPDATE", "UNCHANGED", "CONFLICT"].map((action) => {
                    const count = compareRows.filter((r: any) => r.action === action).length;
                    const cls = action === "CREATE" ? "text-emerald-600" : action === "UPDATE" ? "text-blue-600" : action === "CONFLICT" ? "text-destructive" : "text-muted-foreground";
                    return (
                      <div key={action} className="flex-1 rounded border border-border/20 p-1 text-center bg-card">
                        <div className={`text-sm font-bold ${cls}`}>{count}</div>
                        <div className="text-[7px] text-muted-foreground uppercase tracking-wider">{action}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex-1 overflow-auto">
                  {compareLoading ? <div className="p-2 text-[10px] text-muted-foreground italic">Loading…</div>
                  : compareRows.length === 0 ? <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground italic"><DiffIcon className="h-6 w-6 stroke-current opacity-20 mr-1" />No compare data — run test mapping first</div>
                  : compareRows.map((row: any, i: number) => {
                    let diffs: any[] = [];
                    try { diffs = JSON.parse(row.diffsJson || "[]"); } catch { /* ignore */ }
                    const opCls = row.action === "CREATE" ? "text-emerald-600 bg-emerald-100" : row.action === "UPDATE" ? "text-blue-600 bg-blue-100" : row.action === "CONFLICT" ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted";
                    return (
                      <div key={i} className="px-2 py-1 border-b border-border/10 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded px-1 py-0.5 text-[7px] font-medium ${opCls}`}>{row.action}</span>
                          <span className="font-medium text-foreground">{row.entityType}</span>
                          <span className="text-muted-foreground text-[9px]">#{row.entityKey}</span>
                        </div>
                        {diffs.length > 0 && (
                          <div className="mt-0.5 ml-3 space-y-0.5">
                            {diffs.map((d: any, j: number) => (
                              <div key={j} className="flex items-center gap-1 text-[9px]">
                                <span className="font-medium text-foreground">{d.field}:</span>
                                <span className="text-destructive line-through">{d.from || "—"}</span>
                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                <span className="text-emerald-600">{d.to || "—"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Fallback empty state */}
            {!currentEntityType && !["plant-validation", "result-tree", "validation", "compare-summary"].includes(activeTab) && (
              <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground italic">
                <MapIcon className="h-8 w-8 stroke-current opacity-20 mr-2" />Select a mapping tab
              </div>
            )}
          </div>

          {/* LeanSync Fields Panel */}
          {currentEntityType && (
            <div className="w-[200px] min-w-[160px] max-w-[240px] shrink-0 border-l border-border/30 flex flex-col bg-muted/5">
              <div className="shrink-0 px-1.5 py-1 border-b border-border/10">
                <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">LeanSync Fields</div>
                <div className="text-[9px] text-foreground font-medium mt-0.5">{currentEntityType}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-1 space-y-1">
                <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">Required</div>
                {(ENTITY_REQUIRED_FIELDS[currentEntityType] || []).map((rf) => {
                  const mapped = entityMappings.some((m: any) => m.targetField === rf);
                  return <FieldBadge key={rf} field={rf} required mapped={mapped} />;
                })}
                <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5 mt-2">Optional</div>
                {(ENTITY_OPTIONAL_FIELDS[currentEntityType] || []).map((of) => {
                  const mapped = entityMappings.some((m: any) => m.targetField === of);
                  return <FieldBadge key={of} field={of} mapped={mapped} />;
                })}
              </div>
              <div className="shrink-0 h-7 border-t border-border/20 bg-muted/30 flex items-center px-1.5 text-[8px] text-muted-foreground">
                {entityMappings.length} mapping{entityMappings.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppPageLayout>
  );
}
