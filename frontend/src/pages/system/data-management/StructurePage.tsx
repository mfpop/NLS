import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, Factory, Layers, Users, Database,
  GitBranch, Monitor, X, Eye, Pointer, RefreshCw, Shield, Edit3,
  AlertTriangle, Hash, Calendar, Clock, FileText, ExternalLink, Info,
  Lock
} from "lucide-react";
import { StatusBadge } from "./shared";
import { PageHeader } from "@/pages/shared/PageHeader";
import { theme } from "../../../styles/themeTokens";
import { useDataManagementOverview, type DataManagementTreeChild, type DataManagementTreeRoot } from "@/hooks/useDataManagementOverview";
import { REFERENCE_TABLES_QUERY } from "@/graphql/manufacturingQueries";
import { useQuery } from "@apollo/client/react";
import { ReferenceTablesCard } from "./components/ReferenceTablesCard";

interface StructureTreeNode {
  id: string;
  label: string;
  code: string;
  icon: typeof Factory;
  type: "plant" | "department" | "group" | "resource" | "table" | "line";
  status?: string;
  children?: StructureTreeNode[];
  to?: string;
  childCount: number;
}

interface ReferenceTablesQueryData {
  referenceTables: Array<{ id: string; name: string; entryCount: number }>;
}

const TYPE_LABEL: Record<string, string> = {
  plant: "Plant", line: "Production Line", department: "Department",
  group: "Resource Group", resource: "Resource", table: "Reference Table",
};

const TYPE_STYLE: Record<string, string> = {
  plant: theme.typePlant,
  line: theme.iconBoxAmber,
  department: theme.typeDepartment,
  group: theme.typeGroup,
  resource: theme.typeResource,
  table: theme.typeTable,
};

const ICON_MAP: Record<string, typeof Factory> = {
  plant: Factory,
  productionLine: GitBranch,
  line: GitBranch,
  department: Layers,
  resourceGroup: Users,
  group: Users,
  resource: Monitor,
};

function getNodePath(type: string, id: string): string | undefined {
  const routes: Record<string, string> = {
    plant: "/system/data-management/plant/",
    productionLine: "/system/data-management/production-lines/",
    line: "/system/data-management/production-lines/",
    department: "/system/data-management/departments/",
    resourceGroup: "/system/data-management/resource-groups/",
    group: "/system/data-management/resource-groups/",
    resource: "/system/data-management/resources/",
  };
  const base = routes[type];
  return base ? base + id : undefined;
}

function countDescendants(node: StructureTreeNode): number {
  let total = node.children?.length ?? 0;
  for (const child of node.children ?? []) {
    total += countDescendants(child);
  }
  return total;
}

function convertTreeChild(node: DataManagementTreeChild, depth: number): StructureTreeNode {
  const icon = ICON_MAP[node.type] || Factory;
  const type = (node.type === "productionLine" ? "line" : node.type === "resourceGroup" ? "group" : node.type) as StructureTreeNode["type"];
  const children = (node.children || []).map((c) => convertTreeChild(c, depth + 1));
  return {
    id: node.type === "productionLine" ? `line-${node.id}` : node.id,
    label: node.name,
    code: node.code,
    icon,
    type,
    status: node.status,
    children,
    to: getNodePath(node.type, node.id),
    childCount: node.childCount,
  };
}

function buildTree(tree: DataManagementTreeRoot | null): StructureTreeNode[] {
  if (!tree || !tree.children || tree.children.length === 0) return [];
  const plantNodes = tree.children.map((c) => convertTreeChild(c, 1));
  return [{
    id: "company",
    label: "Company",
    code: "",
    icon: Factory,
    type: "plant",
    childCount: plantNodes.reduce((sum, n) => sum + 1 + countDescendants(n), 0),
    children: plantNodes,
  }];
}

function TreeNodeRow({ node, nodeKey, depth = 0, selectedKey, onSelect }: {
  node: StructureTreeNode;
  nodeKey: string;
  depth?: number;
  selectedKey: string | null;
  onSelect?: (node: StructureTreeNode, key: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = !!node.children?.length;
  const isSelected = selectedKey === nodeKey;
  const isAncestor = open && hasChildren && !isSelected;
  const indent = `${12 + depth * 20}px`;
  const rowClass = isSelected
    ? "bg-white dark:bg-slate-900 border border-emerald-400 border-l-4 border-l-emerald-500 ring-1 ring-emerald-200 shadow-sm relative z-10"
    : isAncestor
      ? "bg-emerald-50/10 border-l border-emerald-200/20 shadow-none ring-0"
      : `${theme.cardHover} border-l border-transparent shadow-none ring-0`;

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 transition-colors min-h-[44px] ${rowClass}`}
        style={{ paddingLeft: indent }}
        onClick={() => { onSelect?.(node, nodeKey); if (hasChildren) setOpen(!open); }}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") { onSelect?.(node, nodeKey); if (hasChildren) setOpen(!open); } }}
      >
        <span className="w-4 shrink-0">
          {hasChildren ? (
            <span className="transition-transform duration-150 inline-block" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>
              <ChevronDown className="h-3.5 w-3.5 stroke-current" />
            </span>
          ) : <span className="inline-block w-3.5" />}
        </span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${TYPE_STYLE[node.type] || theme.iconBoxSubtle}`}>
          <node.icon className="h-3.5 w-3.5 stroke-current" />
        </span>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className={`text-sm truncate ${depth === 0 ? "font-semibold" : "font-medium"} ${theme.textPrimary}`}>{node.label}</span>
          {node.code && <span className={`font-mono text-[10px] shrink-0 ${theme.textMuted}`}>{node.code}</span>}
          {node.status && (
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${node.status === "active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
          )}
          {(node.childCount ?? 0) > 0 && (
            <span className={`ml-auto text-[10px] font-medium shrink-0 ${theme.textMuted}`}>· {node.childCount}</span>
          )}
        </div>
      </div>
      {open && hasChildren && (
        <div className="overflow-hidden transition-all duration-150">
          {node.children!.map((child) => (
            <TreeNodeRow
              key={`${nodeKey}/${child.type}:${child.id}`}
              node={child}
              nodeKey={`${nodeKey}/${child.type}:${child.id}`}
              depth={depth + 1}
              selectedKey={selectedKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function StructurePage() {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<StructureTreeNode | null>(null);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit">("view");

  const { data: overview, loading, error } = useDataManagementOverview({});
  const { data: tablesData } = useQuery<ReferenceTablesQueryData>(REFERENCE_TABLES_QUERY, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const referenceTables = tablesData?.referenceTables ?? [];
  const plants = overview?.plants ?? [];

  const structureTree = useMemo(() => buildTree(overview?.tree ?? null), [overview?.tree]);

  const handleNodeClick = useCallback((node: StructureTreeNode, key: string) => {
    setSelectedNode(node);
    setSelectedNodeKey(key);
  }, []);

  const descendantCount = useMemo(() => {
    if (!selectedNode) return 0;
    return countDescendants(selectedNode);
  }, [selectedNode]);

  const childCounts = useMemo(() => {
    if (!selectedNode || !selectedNode.children) return {};
    return selectedNode.children.reduce<Record<string, number>>((acc, child) => {
      const type = TYPE_LABEL[child.type] || child.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }, [selectedNode]);

  const riskSignals = useMemo(() => {
    if (!selectedNode) return [];
    const signals: { icon: typeof Calendar; label: string; level: "low" | "medium" | "high" }[] = [];
    if (selectedNode.type === "plant" || selectedNode.type === "line") {
      signals.push({ icon: Calendar, label: "Linked to production schedule", level: "medium" });
      signals.push({ icon: Clock, label: "Shift pattern configured", level: "low" });
    }
    if (selectedNode.type === "plant") {
      signals.push({ icon: FileText, label: "Default calendar assigned", level: "medium" });
    }
    if (selectedNode.type === "resource") {
      signals.push({ icon: AlertTriangle, label: "Active in work center assignment", level: "high" });
    }
    return signals;
  }, [selectedNode]);

  const relatedTables = useMemo(() => {
    if (!selectedNode) return [];
    const typeMap: Record<string, string[]> = {
      plant: ["Shift Patterns", "Holiday Calendars", "Maintenance Plans"],
      line: ["Production Models", "Shift Patterns", "Routing Templates"],
      department: ["Skill Matrix", "Role Definitions"],
      group: ["Certification Types", "Tool Registries"],
      resource: ["Maintenance Records", "Calibration Logs", "Operator Certifications"],
    };
    const tableNames = typeMap[selectedNode.type] || [];
    return referenceTables.filter((t) =>
      tableNames.some((n) => t.name.toLowerCase().includes(n.toLowerCase()))
    );
  }, [selectedNode, referenceTables]);

  const totalPlants = plants.length;
  const totalLines = overview?.kpis?.productionLines ?? 0;

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <PageHeader
        icon={<Factory className="h-5 w-5 stroke-current" />}
        iconClass={theme.iconBoxEmerald}
        title="Structure"
        subtitle="Database-backed manufacturing hierarchy and configuration structure"
      >
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${viewMode === "edit" ? theme.buttonWarningSoft : theme.buttonSecondary}`}>
          {viewMode === "edit" ? <Edit3 className="h-3 w-3 stroke-current" /> : <Shield className="h-3 w-3 stroke-current" />}
          <button type="button" onClick={() => setViewMode(viewMode === "view" ? "edit" : "view")} className="hover:underline">
            {viewMode === "view" ? "View" : "Edit"}
          </button>
        </span>
        {viewMode === "edit" && (
          <span className={`flex items-center gap-1 text-[10px] font-medium ${theme.textWarning}`}>
            <AlertTriangle className="h-3 w-3 stroke-current" />
            {totalPlants} plant(s)
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${theme.buttonWarningSoft}`}>
          <Lock className="h-3 w-3 stroke-current" />
          {viewMode === "view" ? "View Mode" : "Edit Mode"}
        </span>
      </PageHeader>

      {/* ── 2-COLUMN BODY ── */}
      <div className="flex-1 grid gap-4 overflow-hidden p-5 pt-3" style={{ gridTemplateColumns: "1fr 340px" }}>
        {/* ═══ LEFT COLUMN: Tree Card ═══ */}
        <div className={`flex flex-col overflow-hidden rounded-xl border ${theme.card}`}>
          <div className={`flex items-center justify-between border-b px-4 py-2.5 shrink-0 ${theme.subHeader}`}>
            <h2 className={`text-[11px] font-bold uppercase tracking-wide ${theme.textPrimary}`}>
              Production Structure
              <span className={`ml-2 font-normal text-[10px] ${theme.textMuted}`}>{totalPlants} plant(s) · {totalLines} line(s)</span>
            </h2>
            {viewMode === "edit" && (
              <button type="button" className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium ${theme.buttonWarningSoft}`}>
                <Edit3 className="h-3 w-3 stroke-current" />
                Edit
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-1.5 py-1">
            {loading && !overview ? (
              <div className={`flex items-center justify-center gap-2 py-12 text-xs ${theme.textMuted}`}>
                <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" /> Loading structure...
              </div>
            ) : error && !overview ? (
              <div className={`py-12 text-center text-xs ${theme.textCritical}`}>Unable to load structure from the database.</div>
            ) : structureTree.length === 0 ? (
              <div className={`py-12 text-center text-xs ${theme.textMuted}`}>No structure found.</div>
            ) : (
              structureTree.map((node) => (
                <TreeNodeRow
                  key={`${node.type}:${node.id}`}
                  node={node}
                  nodeKey={`${node.type}:${node.id}`}
                  depth={0}
                  selectedKey={selectedNodeKey}
                  onSelect={handleNodeClick}
                />
              ))
            )}
          </div>

          <div className={`flex items-center gap-3 border-t px-4 py-2 text-[10px] shrink-0 ${theme.textMuted} ${theme.subHeader}`}>
            <span className="font-medium uppercase tracking-wide">Legend</span>
            <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded ${theme.typePlant}`} /> Plant</span>
            <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded ${theme.iconBoxAmber}`} /> Line</span>
            <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded ${theme.typeDepartment}`} /> Dept</span>
            <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded ${theme.typeGroup}`} /> Group</span>
            <span className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded ${theme.typeResource}`} /> Resource</span>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Stacked Cards ═══ */}
        <div className="flex flex-col gap-3 h-full min-h-0" style={{ minHeight: 0 }}>
          {/* Context Detail Panel */}
          <div className={`rounded-2xl border overflow-hidden shrink-0 ${theme.card}`}>
            {selectedNode ? (
              <>
                <div className={`flex items-center justify-between border-b px-4 py-2.5 ${theme.subHeader}`}>
                  <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                    <Info className="h-3.5 w-3.5 stroke-current" />
                    {TYPE_LABEL[selectedNode.type] || "Node"}
                  </div>
                  <button type="button" onClick={() => { setSelectedNode(null); setSelectedNodeKey(null); }} className={theme.buttonGhost}>
                    <X className="h-3.5 w-3.5 stroke-current" />
                  </button>
                </div>
                <div className="px-4 py-3 space-y-3 text-xs max-h-[320px] overflow-y-auto">
                  <div className={`flex items-center gap-3 rounded-xl border p-3 ${theme.card}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TYPE_STYLE[selectedNode.type] || theme.iconBoxSubtle}`}>
                      <selectedNode.icon className="h-4 w-4 stroke-current" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold ${theme.textPrimary}`}>{selectedNode.label}</span>
                        <span className={`font-mono text-[10px] ${theme.textMuted}`}>{selectedNode.code}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {selectedNode.status && <StatusBadge status={selectedNode.status} />}
                        <span className={`text-[10px] ${theme.textMuted}`}>
                          {selectedNode.children?.length ?? 0} direct · {descendantCount} total
                        </span>
                      </div>
                    </div>
                  </div>

                  {Object.keys(childCounts).length > 0 && (
                    <div className={`rounded-xl border p-3 ${theme.card}`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${theme.textMuted} mb-2`}>
                        <Hash className="h-3 w-3 stroke-current" />
                        Impacted Nodes — {descendantCount}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(childCounts).map(([type, count]) => (
                          <div key={type} className={`flex items-center justify-between rounded-md px-2 py-1.5 ${theme.interactiveRow}`}>
                            <span className={`text-[11px] ${theme.textSecondary}`}>{type}</span>
                            <span className={`text-[11px] font-semibold ${theme.textPrimary}`}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {riskSignals.length > 0 && (
                    <div className={`rounded-xl border p-3 ${theme.card}`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${theme.textMuted} mb-2`}>
                        <Shield className="h-3 w-3 stroke-current" />
                        Linked Schedules
                      </div>
                      <div className="space-y-1">
                        {riskSignals.map((s, i) => (
                          <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${theme.interactiveRow}`}>
                            <s.icon className={`h-3 w-3 stroke-current shrink-0 ${
                              s.level === "high" ? theme.textCritical : s.level === "medium" ? theme.textWarning : theme.textMuted
                            }`} />
                            <span className={`text-[11px] flex-1 ${theme.textSecondary}`}>{s.label}</span>
                            <span className={`text-[10px] font-medium ${
                              s.level === "high" ? theme.textCritical : s.level === "medium" ? theme.textWarning : theme.textMuted
                            }`}>{s.level}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {relatedTables.length > 0 && (
                    <div className={`rounded-xl border p-3 ${theme.card}`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${theme.textMuted} mb-2`}>
                        <Database className="h-3 w-3 stroke-current" />
                        Assigned Resources ({relatedTables.length})
                      </div>
                      <div className="space-y-1">
                        {relatedTables.map((t) => (
                          <div
                            key={t.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 ${theme.cardHover} transition-colors`}
                            onClick={() => navigate(`/system/data-management/references/${t.id}`)}
                            role="button" tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/references/${t.id}`); }}
                          >
                            <Database className={`h-3 w-3 stroke-current shrink-0 ${theme.iconAccent}`} />
                            <span className={`text-[11px] flex-1 ${theme.textPrimary}`}>{t.name}</span>
                            <span className={`text-[10px] font-medium ${theme.textMuted}`}>{t.entryCount}</span>
                            <ExternalLink className={`h-3 w-3 stroke-current ${theme.iconSubtle}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedNode.to && (
                    <button
                      type="button"
                      onClick={() => navigate(selectedNode.to!)}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-medium transition-colors ${theme.buttonSecondary}`}
                    >
                      <Eye className="h-3.5 w-3.5 stroke-current" />
                      Open {TYPE_LABEL[selectedNode.type]}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className={`flex flex-col items-center justify-center gap-2 px-4 py-10 text-xs ${theme.textMuted}`}>
                <Pointer className="h-6 w-6 stroke-current" />
                <span>Select a node to view details</span>
              </div>
            )}
          </div>

            <ReferenceTablesCard onSelectCompany={() => navigate("/system/data-management/plant")} />
        </div>
      </div>
    </div>
  );
}
