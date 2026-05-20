import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GitBranch, RefreshCw, Save, Plus, ShieldCheck, Info, Key, Link2, AlertTriangle, XCircle, Table2, Layers } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { ERP_PATTERN_DEFINITIONS, ERP_RELATED_DATA, ERP_VALIDATION_RESULTS, ERP_RELATIONSHIP_GRAPH } from "@/graphql/lineageQueries";

const SCOPES = [
  "PLANT_STRUCTURE", "PRODUCT_MASTER", "MATERIALS", "WAREHOUSE_BINS",
  "ROUTING", "SCHEDULES", "CAPACITY", "QUALITY", "CUSTOM",
];

const DEST_TABLES: Record<string, string[]> = {
  PLANT_STRUCTURE: ["Company", "Plant", "Warehouse", "ProductionLine", "Department", "ResourceGroup", "Resource", "MaterialBin", "RoutingStep"],
  PRODUCT_MASTER: ["ProductFamily", "ProductModel", "ProductVariant", "PartNumber"],
  MATERIALS: ["Material", "BOM", "BOMItem"],
  WAREHOUSE_BINS: ["Warehouse", "MaterialBin", "InventoryLocation"],
  ROUTING: ["Routing", "RoutingStep", "ProcessFlow", "ProcessStep"],
  SCHEDULES: ["Schedule", "Shift", "ScheduleAssignment"],
  CAPACITY: ["CapacityPlan", "CapacityProfile", "CapacitySnapshot"],
  QUALITY: ["QualityCheck", "DefectRecord"],
  CUSTOM: [],
};

const SEV_ICON: Record<string, typeof AlertTriangle> = { ERROR: XCircle, WARNING: AlertTriangle, INFO: Info };
const SEV_DOT: Record<string, string> = { ERROR: "bg-red-500", WARNING: "bg-amber-500", INFO: "bg-blue-500" };

const sel = `h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-foreground outline-none min-w-[120px]`;
const explorerBtn = `inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium text-foreground hover:bg-[#e5e7eb] dark:hover:bg-[#374151] transition-colors border-0`;
const explorerDivider = `w-px h-5 bg-border/25 mx-1 shrink-0`;

interface FileSourceDef { name: string; scope: string; sourceType: string; destinationTable: string; active: boolean; status: string; fileName?: string; }
interface GraphField { name: string; dataType: string; required: boolean; primaryKey: boolean; foreignKey: boolean; nexusField: string; validationState: string; }
interface GraphTable { id: string; name: string; fields: GraphField[]; }
interface GraphRel { id: string; sourceTableId: string; sourceField: string; targetTableId: string; targetField: string; cardinality: string; required: boolean; status: string; }
interface StagingRow { id: string; rowNumber: number; rawDataJson: Record<string, unknown>; normalizedDataJson: Record<string, unknown>; validationStatus: string; }
interface ValidationItem { id: string; severity: string; entity: string; fieldName: string; rowNumber?: number | null; ruleCode: string; message: string; recommendedAction: string; }

export function LineagePage() {
  const [scope, setScope] = useState("PLANT_STRUCTURE");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [destTable, setDestTable] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);
  const [selectedValidationIdx, setSelectedValidationIdx] = useState<number | null>(null);

  const { data: patternData } = useQuery<{ erpPatternDefinitions: FileSourceDef[] }>(ERP_PATTERN_DEFINITIONS, { fetchPolicy: "cache-and-network" });
  const sources = useMemo(() => (patternData?.erpPatternDefinitions ?? []).map((s) => ({
    id: s.name, name: s.name, scope: s.scope, sourceType: s.sourceType,
    destinationTable: s.destinationTable, active: s.active, status: s.status,
    fieldCount: 0, lastImportedAt: null as string | null,
  })), [patternData]);
  const selectedSource = useMemo(() => sources.find((s) => s.id === sourceId) ?? null, [sources, sourceId]);

  const { data: graphData } = useQuery<{ erpRelationshipGraph: { tables: GraphTable[]; relationships: GraphRel[]; validationState: string } | null }>(
    ERP_RELATIONSHIP_GRAPH, { variables: { sourceDefinitionId: sourceId, destinationTable: destTable }, skip: !sourceId, fetchPolicy: "cache-and-network" }
  );
  const graph = graphData?.erpRelationshipGraph;
  const tables = graph?.tables ?? [];
  const relationships = graph?.relationships ?? [];

  const { data: stagingData, loading: stagingLoading } = useQuery<{ erpRelatedData: { items: StagingRow[]; pageInfo: { totalCount: number } } }>(
    ERP_RELATED_DATA, { variables: { sourceDefinitionId: sourceId, limit: 50 }, skip: !sourceId, fetchPolicy: "cache-and-network" }
  );
  const stagingRows = useMemo(() => stagingData?.erpRelatedData?.items ?? [], [stagingData]);
  const stagingTotal = stagingData?.erpRelatedData?.pageInfo?.totalCount ?? 0;

  const { data: valData, loading: valLoading, refetch: refetchVal } = useQuery<{ erpValidationResults: { items: ValidationItem[] } }>(
    ERP_VALIDATION_RESULTS, { variables: { sourceDefinitionId: sourceId }, skip: !sourceId, fetchPolicy: "cache-and-network" }
  );
  const validationItems = useMemo(() => valData?.erpValidationResults?.items ?? [], [valData]);

  const handleScopeChange = (val: string) => { setScope(val); setSourceId(null); setDestTable(""); setSelectedTableId(null); setSelectedField(null); setSelectedRelId(null); setSelectedValidationIdx(null); };
  const handleSourceChange = (id: string) => { setSourceId(id); setSelectedTableId(null); setSelectedField(null); setSelectedRelId(null); setSelectedValidationIdx(null); const s = sources.find((x) => x.id === id); if (s?.destinationTable) setDestTable(s.destinationTable); };
  const canValidate = Boolean(sourceId && destTable);

  const handleTableClick = (tid: string) => { setSelectedTableId(tid); setSelectedField(null); setSelectedRelId(null); };
  const handleFieldClick = (fname: string) => { setSelectedField(fname); setSelectedTableId(null); setSelectedRelId(null); };
  const handleRelClick = (rid: string) => { setSelectedRelId(rid); setSelectedTableId(null); setSelectedField(null); };

  const activeTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const activeRel = relationships.find((r) => r.id === selectedRelId) ?? null;

  return (
    <AppPageLayout
      icon={<GitBranch />}
      title="Lineage & Relationships"
      subtitle="Define ERP source structures, destination links, and relationship validation for import integrity."
      toolbar={
        <>
          <select value={scope} onChange={(e) => handleScopeChange(e.target.value)} className={sel} title="Scope">
            {SCOPES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select value={sourceId ?? ""} onChange={(e) => handleSourceChange(e.target.value)} className={sel} title="ERP Source">
            <option value="">Source (patterns)...</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={destTable} onChange={(e) => setDestTable(e.target.value)} className={sel} title="Destination Table">
            <option value="">Destination...</option>
            {(DEST_TABLES[scope] ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex-1" />
          <button type="button" onClick={() => setIsEditing(true)} className={explorerBtn}><Plus className="h-4 w-4 stroke-current" /><span>New</span></button>
          <button type="button" onClick={() => setIsEditing(false)} disabled={!isEditing} className={`${explorerBtn} ${isEditing ? "" : "opacity-40 pointer-events-none"}`}><Save className="h-4 w-4 stroke-current" /><span>Save</span></button>
          <span className={explorerDivider} />
          <button type="button" onClick={() => {}} disabled={!canValidate} className={`${explorerBtn} ${canValidate ? "" : "opacity-40 pointer-events-none"}`}><ShieldCheck className="h-4 w-4 stroke-current" /><span>Validate</span></button>
          <button type="button" onClick={() => refetchVal()} className={explorerBtn}><RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span></button>
        </>
      }
      footer={
        <div className="flex w-full items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{scope.replace(/_/g, " ")}</span>
          <span className="text-border/40">&middot;</span>
          <span>{selectedSource?.name ?? "No source"}</span>
          <span className="text-border/40">&middot;</span>
          <span>{destTable || "No destination"}</span>
          <div className="flex-1" />
          {activeRel && <span className="text-[10px]">1:1 {activeRel.sourceField} &rarr; {activeRel.targetField}</span>}
          {activeTable && <span className="text-[10px]">{activeTable.name} ({activeTable.fields.length} fields)</span>}
          {stagingTotal > 0 && <span className="text-[10px]">{stagingTotal.toLocaleString()} rows</span>}
        </div>
      }
    >
      <div className="h-full overflow-hidden">
        {!sourceId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20 stroke-current" />
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Select an ERP Source</h3>
              <p className="text-xs text-muted-foreground">Choose a scope and ERP source definition from the toolbar to inspect lineage, relationships, and validation.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 h-full gap-0">
            {/* LEFT COLUMN — SQL Relationship Designer */}
            <div className="col-span-4 border-r border-border/20 overflow-y-auto bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Definition Zone</h3>
                  <p className="text-[10px] text-muted-foreground">ERP source tables, fields, keys, and 1:1 relationships</p>
                </div>
              </div>

              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground">
                  <Table2 className="h-8 w-8 text-muted-foreground/20 stroke-current mb-2" />
                  <p>No table definitions found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tables.map((table) => {
                    const isTableSelected = selectedTableId === table.id;
                    const hasRel = relationships.some(
                      (r) => r.sourceTableId === table.id || r.targetTableId === table.id
                    );
                    return (
                      <div key={table.id}
                        onClick={() => handleTableClick(table.id)}
                        className={`rounded-lg border-2 transition-all cursor-pointer ${
                          isTableSelected
                            ? "border-primary/40 bg-primary/[0.03] shadow-sm"
                            : "border-border/30 bg-card hover:border-border/60"
                        }`}
                      >
                        {/* Table header */}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/15 bg-muted/30">
                          <Table2 className="h-3.5 w-3.5 stroke-current text-muted-foreground shrink-0" />
                          <span className="text-[12px] font-bold text-foreground truncate">{table.name}</span>
                          {hasRel && (
                            <span className="ml-auto rounded bg-blue-100 px-1 py-0.5 text-[8px] font-medium text-blue-700 shrink-0">1:1</span>
                          )}
                        </div>
                        {/* Field list */}
                        <div className="py-0.5">
                          {table.fields.map((f) => {
                            const isFieldSelected = selectedField === f.name;
                            const isRelField = relationships.some(
                              (r) => (r.sourceField === f.name && r.sourceTableId === table.id) ||
                                     (r.targetField === f.name && r.targetTableId === table.id)
                            );
                            return (
                              <div key={f.name}
                                onClick={(e) => { e.stopPropagation(); handleFieldClick(f.name); }}
                                className={`flex items-center gap-1.5 px-2.5 py-[3px] text-[11px] cursor-pointer transition-colors ${
                                  isFieldSelected
                                    ? "bg-indigo-50 ring-1 ring-inset ring-indigo-200 font-medium"
                                    : "hover:bg-muted/40"
                                } ${isRelField ? "bg-blue-50/30" : ""}`}
                                title={`${f.name} (${f.dataType})${f.nexusField ? ` \u2192 ${f.nexusField}` : ""}`}
                              >
                                <Key className={`h-3 w-3 stroke-current shrink-0 ${f.primaryKey ? "text-amber-600" : "text-transparent"}`} />
                                <Link2 className={`h-3 w-3 stroke-current shrink-0 ${f.foreignKey ? "text-blue-500" : "text-transparent"}`} />
                                <span className={`min-w-0 flex-1 truncate ${f.required ? "after:content-['*'] after:text-red-500 after:ml-0.5 font-medium" : ""}`}>
                                  {f.name}
                                </span>
                                <span className="text-[9px] text-muted-foreground hidden lg:inline">{f.dataType}</span>
                                {f.nexusField && (
                                  <span className="text-[8px] text-emerald-600 truncate max-w-[60px] hidden xl:inline">{f.nexusField}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Relationship connectors */}
                  {relationships.length > 0 && (
                    <div className="border-t border-border/15 pt-3 mt-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">1:1 Relationships</h4>
                      <div className="space-y-1">
                        {relationships.map((rel) => {
                          const isSelected = selectedRelId === rel.id;
                          const sourceTbl = tables.find((t) => t.id === rel.sourceTableId);
                          const targetTbl = tables.find((t) => t.id === rel.targetTableId);
                          return (
                            <div key={rel.id}
                              onClick={() => handleRelClick(rel.id)}
                              className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-indigo-50 ring-1 ring-indigo-200"
                                  : "bg-muted/20 hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <span className="font-medium text-foreground truncate">{sourceTbl?.name ?? "?"}</span>
                                <span className="text-muted-foreground">.</span>
                                <span className="text-foreground">{rel.sourceField}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                                <span className="text-[9px] font-bold text-blue-600">1</span>
                                <span className="w-6 h-px bg-border/60 relative">
                                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                                    <span className="text-[6px] text-muted-foreground">&mdash;</span>
                                  </span>
                                </span>
                                <span className="text-[9px] font-bold text-blue-600">1</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                                <span className="text-foreground">{rel.targetField}</span>
                                <span className="text-muted-foreground">.</span>
                                <span className="font-medium text-foreground truncate">{targetTbl?.name ?? "?"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MIDDLE COLUMN — Related Data */}
            <div className="col-span-5 border-r border-border/20 overflow-y-auto bg-card/50">
              <div className="sticky top-0 z-10 bg-card/95 border-b border-border/15 px-3 py-2 flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Related Data</h3>
                <span className="text-[10px] text-muted-foreground">
                  {activeRel ? "1:1 Match Grid" : activeTable ? `${activeTable.name} rows` : selectedField ? "Field Profile" : stagingTotal > 0 ? `${stagingTotal.toLocaleString()} rows` : "No data"}
                </span>
              </div>

              {stagingLoading ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground"><RefreshCw className="h-4 w-4 mr-2 animate-spin stroke-current" />Loading staging data...</div>
              ) : activeRel ? (
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-foreground mb-3">1:1 Relationship: {activeRel.sourceField} &harr; {activeRel.targetField}</h4>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-[10px]">
                    <div className="rounded bg-muted/30 p-2"><div className="text-muted-foreground">Matched</div><div className="font-bold text-emerald-600">{stagingRows.length}</div></div>
                    <div className="rounded bg-muted/30 p-2"><div className="text-muted-foreground">Missing Target</div><div className="font-bold text-red-600">0</div></div>
                    <div className="rounded bg-muted/30 p-2"><div className="text-muted-foreground">Orphans</div><div className="font-bold text-amber-600">0</div></div>
                  </div>
                  {stagingRows.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground py-4 text-center">No staging data to validate this relationship.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead><tr className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/10">
                          <th className="px-2 py-1 text-left">Row</th>
                          <th className="px-2 py-1 text-left">{activeRel.sourceField}</th>
                          <th className="px-2 py-1 text-left">{activeRel.targetField}</th>
                          <th className="px-2 py-1 text-left">Status</th>
                        </tr></thead>
                        <tbody>
                          {stagingRows.slice(0, 20).map((row) => {
                            const sv = row.rawDataJson[activeRel.sourceField];
                            const tv = row.rawDataJson[activeRel.targetField];
                            const matched = sv != null && tv != null;
                            return (
                              <tr key={row.id} className="border-t border-border/10 hover:bg-muted/30">
                                <td className="px-2 py-1 text-[10px] text-muted-foreground">{row.rowNumber}</td>
                                <td className="px-2 py-1 text-foreground">{sv != null ? String(sv) : <span className="text-muted-foreground/40">&mdash;</span>}</td>
                                <td className="px-2 py-1 text-foreground">{tv != null ? String(tv) : <span className="text-muted-foreground/40">&mdash;</span>}</td>
                                <td className="px-2 py-1">
                                  <span className={`rounded px-1 py-0.5 text-[8px] font-medium ${matched ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                    {matched ? "matched" : "missing target"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : activeTable ? (
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-foreground mb-2">{activeTable.name}</h4>
                  {stagingRows.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground py-4 text-center">No staging rows for this table.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead><tr className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/10">
                          <th className="px-2 py-1 text-left w-10">#</th>
                          {activeTable.fields.slice(0, 6).map((f) => (
                            <th key={f.name} className="px-2 py-1 text-left truncate max-w-[100px]" title={f.name}>{f.name}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {stagingRows.slice(0, 30).map((row) => (
                            <tr key={row.id} className="border-t border-border/10 hover:bg-muted/30">
                              <td className="px-2 py-1 text-[10px] text-muted-foreground">{row.rowNumber}</td>
                              {activeTable.fields.slice(0, 6).map((f) => (
                                <td key={f.name} className="px-2 py-1 truncate max-w-[100px] text-foreground" title={String(row.rawDataJson[f.name] ?? "")}>
                                  {row.rawDataJson[f.name] != null ? String(row.rawDataJson[f.name]) : <span className="text-muted-foreground/30">&mdash;</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : selectedField ? (
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-foreground mb-2">Field: {selectedField}</h4>
                  {(() => {
                    const f = tables.flatMap((t) => t.fields).find((x) => x.name === selectedField);
                    if (!f) return <p className="text-[10px] text-muted-foreground">Field not found.</p>;
                    return (
                      <div className="space-y-2 text-[11px]">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded bg-muted/30 p-2"><div className="text-[10px] text-muted-foreground">Data Type</div><div className="font-medium text-foreground">{f.dataType}</div></div>
                          <div className="rounded bg-muted/30 p-2"><div className="text-[10px] text-muted-foreground">Nexus Mapping</div><div className={`font-medium ${f.nexusField ? "text-emerald-600" : "text-muted-foreground"}`}>{f.nexusField || "Not mapped"}</div></div>
                        </div>
                        <div className="flex gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${f.primaryKey ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{f.primaryKey ? "PK" : ""}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${f.foreignKey ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>{f.foreignKey ? "FK" : ""}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${f.required ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>{f.required ? "Required" : "Optional"}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Values: {stagingRows.filter((r) => r.rawDataJson[f.name] != null).length} / {stagingRows.length} non-null
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : stagingRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Table2 className="h-8 w-8 text-muted-foreground/20 stroke-current mb-2" />
                  <p className="text-xs text-muted-foreground">No staging rows imported for this ERP source.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Select a table, field, or relationship to inspect.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead><tr className="sticky top-0 z-10 bg-muted/90 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-2 py-1.5 text-left w-12">#</th>
                      {tables[0]?.fields.slice(0, 8).map((f) => (
                        <th key={f.name} className="px-2 py-1.5 text-left truncate max-w-[120px]" title={f.name}>{f.name}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {stagingRows.slice(0, 50).map((row) => (
                        <tr key={row.id} className="border-t border-border/10 hover:bg-muted/30">
                          <td className="px-2 py-1 text-[10px] text-muted-foreground">{row.rowNumber}</td>
                          {tables[0]?.fields.slice(0, 8).map((f) => (
                            <td key={f.name} className="px-2 py-1 truncate max-w-[120px] text-foreground" title={String(row.rawDataJson[f.name] ?? "")}>
                              {row.rawDataJson[f.name] != null ? String(row.rawDataJson[f.name]) : <span className="text-muted-foreground/30">&mdash;</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN — Validation Results */}
            <div className="col-span-3 overflow-y-auto bg-card">
              <div className="sticky top-0 z-10 bg-card border-b border-border/15 px-3 py-2">
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Validation</h3>
              </div>

              {valLoading ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground"><RefreshCw className="h-4 w-4 mr-2 animate-spin stroke-current" />Validating...</div>
              ) : validationItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-3">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground/20 stroke-current mb-2" />
                  <p className="text-xs text-muted-foreground">No validation issues.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Run Validate from the toolbar.</p>
                </div>
              ) : (
                <div className="space-y-0.5 p-1">
                  {(["ERROR", "WARNING", "INFO"] as const).map((sev) => {
                    const items = validationItems.filter((v) => v.severity === sev);
                    if (items.length === 0) return null;
                    const SevIcon = SEV_ICON[sev];
                    return (
                      <div key={sev}>
                        <div className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-card z-10">
                          <span className={`h-1.5 w-1.5 rounded-full ${SEV_DOT[sev]}`} />
                          {sev === "ERROR" ? "Blocking Issues" : sev === "WARNING" ? "Warnings" : "Info"}
                          <span className="text-muted-foreground/60">({items.length})</span>
                        </div>
                        {items.map((v) => {
                          const idx = validationItems.indexOf(v);
                          const isSelected = selectedValidationIdx === idx;
                          return (
                            <div key={v.id}
                              onClick={() => { setSelectedValidationIdx(idx); if (v.fieldName) setSelectedField(v.fieldName); }}
                              className={`rounded px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${isSelected ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-muted/30"}`}>
                              <div className="flex items-start gap-1.5">
                                <SevIcon className={`h-3.5 w-3.5 stroke-current shrink-0 mt-0.5 ${sev === "ERROR" ? "text-red-500" : sev === "WARNING" ? "text-amber-500" : "text-blue-500"}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-medium text-foreground">{v.entity || v.fieldName}</span>
                                    {v.ruleCode && <span className="rounded bg-muted px-1 py-0.5 text-[8px] text-muted-foreground font-mono">{v.ruleCode}</span>}
                                  </div>
                                  <p className="text-muted-foreground mt-0.5">{v.message}</p>
                                  {v.recommendedAction && <p className="text-[9px] text-blue-600 mt-0.5">{v.recommendedAction}</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppPageLayout>
  );
}
