import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Database, Factory, Layers, Search, Users,
  GitBranch, ChevronRight, Building2, Circle, X,
  RefreshCw, Monitor, AlertCircle, ChevronDown,
  Pencil, Plus, Trash2, Check, AlertTriangle, Info,
  Hash, Calendar, Clock, Activity
} from "lucide-react";
import { theme } from "../../styles/themeTokens";
import { useDataManagementOverview } from "@/hooks/useDataManagementOverview";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { CompanyEditor } from "./data-management/components/CompanyEditor";
import { COMPANY_QUERY, UPDATE_COMPANY_MUTATION } from "@/graphql/companyQueries";

const ENTITY_CONFIG: Record<string, { icon: typeof Circle; color: string; borderTop: string; label: string }> = {
  company:        { icon: Factory,     color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10", borderTop: "border-t-emerald-400", label: "Company" },
  plant:          { icon: Building2,   color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",     borderTop: "border-t-blue-400",     label: "Plant" },
  productionLine: { icon: GitBranch,   color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10", borderTop: "border-t-amber-400",   label: "Production Line" },
  line:           { icon: GitBranch,   color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10", borderTop: "border-t-amber-400",   label: "Line" },
  department:     { icon: Layers,      color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10", borderTop: "border-t-purple-400", label: "Department" },
  resourceGroup:  { icon: Users,       color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",     borderTop: "border-t-blue-400",     label: "Resource Group" },
  group:          { icon: Users,       color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",     borderTop: "border-t-blue-400",     label: "Resource Group" },
  resource:       { icon: Monitor,     color: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10",     borderTop: "border-t-gray-400",     label: "Resource" },
};

const TYPE_TITLES: Record<string, string> = {
  productionLine: "Production Line", line: "Line", department: "Department",
  resourceGroup: "Resource Group", group: "Resource Group", resource: "Resource",
  plant: "Plant", company: "Company",
};

function findNodeByKey(nodes: DataManagementTreeChild[], targetKey: string, parentKey = ""): DataManagementTreeChild | null {
  for (const n of nodes) {
    const nodeKey = parentKey ? `${parentKey}/${n.type}:${n.id}` : `${n.type}:${n.id}`;
    if (nodeKey === targetKey) return n;
    if (n.children) {
      const found = findNodeByKey(n.children, targetKey, nodeKey);
      if (found) return found;
    }
  }
  return null;
}

function findNodePathByKey(
  nodes: DataManagementTreeChild[],
  targetKey: string,
  path: DataManagementTreeChild[] = [],
  parentKey = "",
): DataManagementTreeChild[] | null {
  for (const n of nodes) {
    const nodeKey = parentKey ? `${parentKey}/${n.type}:${n.id}` : `${n.type}:${n.id}`;
    const nextPath = [...path, n];
    if (nodeKey === targetKey) return nextPath;
    if (n.children) {
      const found = findNodePathByKey(n.children, targetKey, nextPath, nodeKey);
      if (found) return found;
    }
  }
  return null;
}

function formatStatusLabel(status?: string | null) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function countTotalNodes(nodes: DataManagementTreeChild[]): number {
  let c = 0;
  for (const n of nodes) { c += 1; if (n.children) c += countTotalNodes(n.children); }
  return c;
}

interface ContextMenuState {
  x: number; y: number; nodeKey: string; node: DataManagementTreeChild; visible: boolean;
}

function ContextMenu({ state, onClose, onAdd, onEdit, onDelete }: {
  state: ContextMenuState;
  onClose: () => void;
  onAdd: (parentKey: string) => void;
  onEdit: (nodeKey: string) => void;
  onDelete: (nodeKey: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!state.visible) return null;

  const items = [
    { icon: Plus, label: "Add Child", action: () => { onAdd(state.nodeKey); onClose(); }, disabled: false },
    { icon: Pencil, label: "Edit", action: () => { onEdit(state.nodeKey); onClose(); }, disabled: false },
    { icon: Trash2, label: "Delete", action: () => { onDelete(state.nodeKey); onClose(); }, danger: true },
  ];

  const mx = Math.min(state.x, window.innerWidth - 180);
  const my = Math.min(state.y, window.innerHeight - 160);

  return (
    <div ref={ref} className="fixed z-50" style={{ left: mx, top: my }}>
      <div className={`min-w-[160px] rounded-lg border shadow-lg py-1 ${theme.dropdown}`}>
        {items.map((item, i) => (
          <button key={i} type="button" onClick={item.action} disabled={item.disabled}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
              item.danger
                ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                : `${theme.textPrimary} hover:bg-slate-100 dark:hover:bg-slate-800`
            } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <item.icon className="h-3.5 w-3.5 stroke-current shrink-0" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TreeNode({ node, depth, expanded, selectedKey, onToggle, onSelect, onDoubleClick, expandedSet, nodeKey, onContextMenu, index }: {
  node: DataManagementTreeChild; depth: number; expanded: boolean;
  selectedKey: string | null; onToggle: (id: string) => void;
  onSelect: (key: string | null) => void; onDoubleClick: (key: string) => void;
  expandedSet: Set<string>; nodeKey: string;
  onContextMenu: (e: React.MouseEvent, nodeKey: string, node: DataManagementTreeChild) => void;
  index: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedKey === nodeKey;
  const cfg = ENTITY_CONFIG[node.type] || ENTITY_CONFIG.resource;
  const Icon = cfg.icon;
  const indentPx = depth === 0 ? 6 : 16 + (depth - 1) * 12;

  return (
    <div>
      <div
        className={`flex items-center gap-1 h-7 min-h-7 rounded px-1.5 cursor-pointer transition-all duration-150 select-none ${
          isSelected
            ? "bg-blue-50/60 dark:bg-slate-700/30 border-l-2 border-l-blue-400 dark:border-l-cyan-500/60"
            : "border-l-2 border-l-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
        } ${index % 2 === 1 ? "bg-slate-50/20 dark:bg-slate-900/10" : ""}`}
        style={{ paddingLeft: `${indentPx}px` }}
        onClick={() => { onSelect(isSelected ? null : nodeKey); if (hasChildren) onToggle(nodeKey); }}
        onDoubleClick={() => { onDoubleClick(nodeKey); }}
        onContextMenu={(e) => onContextMenu(e, nodeKey, node)}
        role="treeitem" tabIndex={0} aria-expanded={hasChildren ? expanded : undefined}
        onKeyDown={(e) => { if (e.key === "Enter") { onSelect(isSelected ? null : nodeKey); if (hasChildren) onToggle(nodeKey); } }}
      >
        <span className="w-3.5 shrink-0 flex items-center justify-center">
          {hasChildren ? (
            <ChevronDown className={`h-2.5 w-2.5 text-slate-400 stroke-current transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`} />
          ) : (
            <span className="w-2.5" />
          )}
        </span>
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${cfg.color}`}>
          <Icon className="h-2.5 w-2.5 stroke-current" />
        </span>
        <div className="min-w-0 flex-1 flex items-center gap-1">
          <span className={`text-[11px] font-medium truncate ${isSelected ? "text-blue-700 dark:text-cyan-300" : theme.textPrimary}`}>
            {node.name}
          </span>
          {node.code && (
            <span className={`rounded px-1 py-0.5 text-[8px] font-mono font-medium ${theme.codeBadge}`}>{node.code}</span>
          )}
          <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${node.status === "active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
          {(node.childCount ?? 0) > 0 && (
            <span className={`text-[9px] ${theme.textMuted}`}>{node.childCount}</span>
          )}
        </div>
      </div>
      {hasChildren && (
        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${expanded ? "opacity-100" : "max-h-0 opacity-0"}`}>
          {expanded && node.children!.map((child, idx) => {
            const childKey = `${nodeKey}/${child.type}:${child.id}`;
            return <TreeNode key={childKey} nodeKey={childKey} node={child} depth={depth + 1}
              expanded={expandedSet.has(childKey)} selectedKey={selectedKey}
              onToggle={onToggle} onSelect={onSelect} onDoubleClick={onDoubleClick}
              expandedSet={expandedSet} onContextMenu={onContextMenu} index={idx} />;
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCards({ kpis, navCounts }: { kpis: { productionLines: number; departments: number; resourceGroups: number; resources: number; plantStatus: string } | null; navCounts?: { plants?: number; resourceGroups?: number } | null }) {
  const navigate = useNavigate();
  if (!kpis) return null;
  const cards = [
    { label: "Plants", value: String(navCounts?.plants ?? 0), icon: Building2, config: ENTITY_CONFIG.plant, href: "/system/data-management/plant" },
    { label: "Production Lines", value: String(kpis.productionLines), icon: GitBranch, config: ENTITY_CONFIG.productionLine, href: "/system/data-management/production-lines" },
    { label: "Departments", value: String(kpis.departments), icon: Layers, config: ENTITY_CONFIG.department, href: "/system/data-management/departments" },
    { label: "Resource Groups", value: String(kpis.resourceGroups), icon: Users, config: ENTITY_CONFIG.resourceGroup, href: "/system/data-management/resource-groups" },
    { label: "Resources", value: String(kpis.resources), icon: Monitor, config: ENTITY_CONFIG.resource, href: "/system/data-management/resources" },
  ];
  return (
    <div className="grid shrink-0 grid-cols-5 gap-2">
      {cards.map((c) => (
        <button key={c.label} type="button" onClick={() => navigate(c.href)}
          className={`flex flex-col rounded-lg border border-t-[3px] ${c.config.borderTop} p-2.5 min-h-0 h-full transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] ${theme.card} ${theme.cardHover}`}
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${theme.textSecondary}`}>{c.label}</span>
            <span className={`flex h-4 w-4 items-center justify-center rounded ${c.config.color}`}>
              <c.icon className="h-2.5 w-2.5 stroke-current" />
            </span>
          </div>
          <div className={`text-base font-bold leading-none ${theme.textPrimary}`}>{c.value}</div>
        </button>
      ))}
    </div>
  );
}

function NodeFormPanel({ selectedNode, selectedNodeKey, setSelectedNodeKey, editingNodeKey, pathItems, contextCounts }: {
  selectedNode: DataManagementTreeChild | null;
  selectedNodeKey: string | null;
  setSelectedNodeKey: (key: string | null) => void;
  editingNodeKey: string | null;
  pathItems: DataManagementTreeChild[];
  contextCounts: Record<string, number> | undefined;
}) {
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const prevEditingKey = useRef<string | null>(null);

  useEffect(() => {
    if (editingNodeKey === selectedNodeKey && editingNodeKey !== prevEditingKey.current) {
      setEditMode(true);
      setDirty(false);
    }
    prevEditingKey.current = editingNodeKey;
  }, [editingNodeKey, selectedNodeKey]);

  const ts = selectedNode ? (ENTITY_CONFIG[selectedNode.type] || ENTITY_CONFIG.resource) : null;
  const Icon = ts?.icon || Circle;
  const title = selectedNode ? (TYPE_TITLES[selectedNode.type] || selectedNode.type) : "";
  const statusLabel = selectedNode ? formatStatusLabel(selectedNode?.status) : "";
  const parentEntity = pathItems.length > 1 ? pathItems[pathItems.length - 2] : null;
  const hierarchyDepth = pathItems.length;

  const activeInactiveCounts = useMemo(() => {
    if (!selectedNode?.children) return { active: 0, inactive: 0, total: 0 };
    let active = 0, inactive = 0;
    const walk = (n: DataManagementTreeChild) => { if (n.status === "active") active++; else inactive++; n.children?.forEach(walk); };
    selectedNode.children.forEach(walk);
    return { active, inactive, total: active + inactive };
  }, [selectedNode]);

  const childGroupEntries = useMemo(() => {
    if (!selectedNode?.children) return [];
    const groups = selectedNode.children.reduce<Record<string, number>>((acc, child) => {
      const key = TYPE_TITLES[child.type] || child.type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups);
  }, [selectedNode]);

  const handleEdit = () => { setEditMode(true); setDirty(false); };
  const handleCancel = () => { setEditMode(false); setDirty(false); };
  const handleSave = () => { setEditMode(false); setDirty(false); };

  if (!selectedNode || !selectedNodeKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-slate-400 min-h-0 py-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
          <Info className="h-4 w-4 stroke-current text-slate-300" />
        </div>
        <span className="text-sm font-medium text-slate-400">No node selected</span>
        <span className="text-[10px] text-slate-400">Select a node from the production tree</span>
      </div>
    );
  }

  const opSummaryCards = [
    { icon: GitBranch, label: "Direct Children", value: String(selectedNode.children?.length ?? 0), color: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" },
    { icon: Activity, label: "Total Descendants", value: String(selectedNode.childCount ?? 0), color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    { icon: Circle, label: "Active", value: String(activeInactiveCounts.active), color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    { icon: X, label: "Inactive", value: String(activeInactiveCounts.inactive), color: activeInactiveCounts.inactive > 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500" },
  ];

  return (
    <div className="flex flex-col">
      <div className={`sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-2.5 py-2 -mx-2 ${theme.subHeader}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${ts?.color || theme.iconBoxSubtle}`}>
            <Icon className="h-3 w-3 stroke-current" />
          </span>
          <div className="min-w-0">
            <div className={`text-[11px] font-semibold truncate ${theme.textPrimary}`}>{selectedNode.name}</div>
            <div className="text-[8px] text-slate-400 truncate">{title}</div>
          </div>
          {dirty && (
            <span className="flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="h-2.5 w-2.5 stroke-current" /> Unsaved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {editMode ? (
            <>
              <button type="button" onClick={handleSave} disabled={!dirty}
                className={`h-6 px-2 rounded text-[9px] font-semibold inline-flex items-center gap-1 transition-colors ${
                  dirty ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                }`}
              >
                <Check className="h-2.5 w-2.5 stroke-current" /> Save
              </button>
              <button type="button" onClick={handleCancel}
                className="h-6 px-2 rounded border border-slate-200 dark:border-slate-700 text-[9px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleEdit}
                className="h-6 px-1.5 rounded border border-slate-200 dark:border-slate-700 text-[9px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
              >
                <Pencil className="h-2.5 w-2.5 stroke-current" /> Edit
              </button>
              <button type="button" onClick={() => setSelectedNodeKey(null)}
                className="h-6 w-6 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-2.5 w-2.5 stroke-current" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-2 py-1.5 space-y-1.5">
        {/* ── Breadcrumb path ── */}
        {pathItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-0.5 text-[9px] text-slate-400">
            {pathItems.map((node, i) => (
              <span key={`${node.type}:${node.id}`} className="inline-flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="h-2 w-2 stroke-current text-slate-300" />}
                <span className={`rounded px-1 py-0.5 ${i === pathItems.length - 1 ? "bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-500/10 dark:text-emerald-300" : "text-slate-500"}`}>
                  {node.name}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* ── Details Card ── */}
        <div className="rounded border border-slate-200/60 dark:border-slate-800">
          <div className="px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
            Entity Details
          </div>
          <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center justify-between gap-1 col-span-2">
              <span className="text-[9px] text-slate-400">Name</span>
              <span className={`text-[11px] font-semibold text-right ${theme.textPrimary}`}>{selectedNode.name}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] text-slate-400">Type</span>
              <span className="text-[10px] font-medium text-right text-slate-600 dark:text-slate-300">{title}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] text-slate-400">Code</span>
              <span className="text-[10px] font-mono font-medium text-right text-slate-600 dark:text-slate-300">{selectedNode.code || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] text-slate-400">Status</span>
              <span className={`text-[10px] font-medium text-right ${selectedNode.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>{statusLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] text-slate-400">Depth</span>
              <span className="text-[10px] font-medium text-right text-slate-600 dark:text-slate-300">{hierarchyDepth}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] text-slate-400">Parent</span>
              <span className="text-[10px] font-medium text-right text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{parentEntity?.name || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-1 col-span-2 border-t border-slate-50 dark:border-slate-800 pt-1 mt-0.5">
              <span className="flex items-center gap-1 text-[9px] text-slate-400">
                <Calendar className="h-2.5 w-2.5 stroke-current" /> Created
              </span>
              <span className="text-[9px] text-slate-500">—</span>
            </div>
            <div className="flex items-center justify-between gap-1 col-span-2">
              <span className="flex items-center gap-1 text-[9px] text-slate-400">
                <Clock className="h-2.5 w-2.5 stroke-current" /> Updated
              </span>
              <span className="text-[9px] text-slate-500">—</span>
            </div>
          </div>
        </div>

        {/* ── Operational Summary ── */}
        <div className="rounded border border-slate-200/60 dark:border-slate-800">
          <div className="px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
            Branch Summary
          </div>
          <div className="p-2 grid grid-cols-4 gap-1">
            {opSummaryCards.map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-0.5 rounded py-1.5 px-1 bg-slate-50/40 dark:bg-slate-900/20">
                <span className={`flex h-4 w-4 items-center justify-center rounded ${c.color}`}>
                  <c.icon className="h-2.5 w-2.5 stroke-current" />
                </span>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100">{c.value}</span>
                <span className="text-[7px] text-slate-400 uppercase tracking-wider truncate w-full text-center">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Hierarchy Distribution ── */}
        <div className="rounded border border-slate-200/60 dark:border-slate-800">
          <div className="px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
            Hierarchy Distribution
          </div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {[
              { icon: Building2, label: "Plants", value: String(contextCounts?.plants ?? 0), color: ENTITY_CONFIG.plant.color },
              { icon: GitBranch, label: "Lines", value: String(contextCounts?.productionLines ?? 0), color: ENTITY_CONFIG.productionLine.color },
              { icon: Layers, label: "Departments", value: String(contextCounts?.departments ?? 0), color: ENTITY_CONFIG.department.color },
              { icon: Users, label: "Groups", value: String(contextCounts?.resourceGroups ?? 0), color: ENTITY_CONFIG.resourceGroup.color },
              { icon: Monitor, label: "Resources", value: String(contextCounts?.resources ?? 0), color: ENTITY_CONFIG.resource.color },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 rounded px-1.5 py-1 bg-slate-50/30 dark:bg-slate-900/10">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${item.color}`}>
                  <item.icon className="h-2.5 w-2.5 stroke-current" />
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[7px] font-medium text-slate-400 truncate uppercase tracking-wider">{item.label}</div>
                  <div className="text-[10px] font-semibold leading-none text-slate-800 dark:text-slate-100">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Composition (only if direct children exist) ── */}
        {childGroupEntries.length > 0 && (
          <div className="rounded border border-slate-200/60 dark:border-slate-800">
            <div className="px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
              Direct Composition
            </div>
            <div className="p-2 space-y-0.5">
              {childGroupEntries.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded px-1.5 py-1 bg-slate-50/30 dark:bg-slate-900/10">
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {editMode && (
          <div className="rounded border border-amber-200/50 dark:border-amber-500/15 bg-amber-50/20 dark:bg-amber-500/5 px-2 py-1.5">
            <p className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Info className="h-2.5 w-2.5 stroke-current shrink-0" />
              Edit mode active
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PageFooter({ totalNodes, navCounts }: { totalNodes: number; navCounts: any }) {
  const totalManaged = navCounts
    ? (navCounts.plants ?? 0) + (navCounts.productionLines ?? 0) + (navCounts.departments ?? 0) + (navCounts.resourceGroups ?? 0) + (navCounts.resources ?? 0)
    : 0;
  const legendItems = [
    { label: "Plant", dot: "bg-blue-400" },
    { label: "Line", dot: "bg-amber-400" },
    { label: "Dept", dot: "bg-purple-400" },
    { label: "Group", dot: "bg-blue-400" },
    { label: "Resource", dot: "bg-gray-400" },
  ];
  return (
    <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center px-5 h-[60px]">
      <div className="flex items-center gap-6 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <Database className="h-3.5 w-3.5 stroke-current text-slate-400" />
          {totalNodes} tree nodes
        </span>
        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <Hash className="h-3.5 w-3.5 stroke-current text-slate-400" />
          {totalManaged} entities
        </span>
      </div>
      <div className="flex items-center gap-4">
        {legendItems.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className={`inline-block h-2 w-2 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DataManagementPage() {
  const navigate = useNavigate();
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, nodeKey: "", node: null as any, visible: false });
  const [editingNodeKey, setEditingNodeKey] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery]);

  const { data: overview, loading, error, refetch } = useDataManagementOverview({
    plantId: selectedPlantId, search: debouncedSearch || undefined, status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: companyData } = useQuery<{ company: { id: string; code: string; name: string; address: string; phone: string; email: string; website: string; description: string; industryType: string; manufacturingType: string; defaultTimezone: string; defaultUnits: string; defaultShiftModel: string; productionCalendar: string; defaultLanguage: string; leanMethodology: string } }>(COMPANY_QUERY, {
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const [updateCompany] = useMutation(UPDATE_COMPANY_MUTATION);
  const [companyForm, setCompanyForm] = useState<Record<string, string>>({});
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const company = companyData?.company;

  useEffect(() => {
    if (company && Object.keys(companyForm).length === 0) {
      setCompanyForm({
        code: company.code, name: company.name, address: company.address || "",
        phone: company.phone || "", email: company.email || "", website: company.website || "",
        description: company.description || "", industryType: company.industryType || "",
        manufacturingType: company.manufacturingType || "", defaultTimezone: company.defaultTimezone || "",
        defaultUnits: company.defaultUnits || "", defaultShiftModel: company.defaultShiftModel || "",
        productionCalendar: company.productionCalendar || "", defaultLanguage: company.defaultLanguage || "",
        leanMethodology: company.leanMethodology || "",
      });
    }
  }, [company]);

  useEffect(() => { if (overview?.tree && expandedSet.size === 0) setExpandedSet(new Set(overview.tree.children.map((c) => `${c.type}:${c.id}`))); }, [overview?.tree]);
  useEffect(() => {
    if (debouncedSearch && overview?.tree) {
      const ids = new Set<string>();
      const walk = (n: DataManagementTreeChild, pk: string) => { const k = `${pk}/${n.type}:${n.id}`; ids.add(k); n.children?.forEach((c) => walk(c, k)); };
      overview.tree.children.forEach((c) => { const k = `${c.type}:${c.id}`; ids.add(k); c.children?.forEach((ch) => walk(ch, k)); });
      setExpandedSet(ids);
    }
  }, [debouncedSearch, overview?.tree]);

  const handleToggle = useCallback((id: string) => setExpandedSet((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const handleSelect = useCallback((key: string | null) => { setSelectedNodeKey(key); setEditingNodeKey(null); }, []);

  const handleDoubleClick = useCallback((key: string) => {
    setSelectedNodeKey(key);
    setEditingNodeKey(key);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeKey: string, node: DataManagementTreeChild) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeKey, node, visible: true });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu((prev) => ({ ...prev, visible: false })), []);

  const plants = overview?.plants ?? [];
  const kpis = overview?.kpis ?? null;
  const navCounts = overview?.navigationCounts;
  const treeData = overview?.tree;

  const normalizedTreeNodes = useMemo((): DataManagementTreeChild[] => {
    if (!treeData) return [];
    const plantChildren: DataManagementTreeChild[] = selectedPlantId
      ? [{ ...(treeData as unknown as DataManagementTreeChild), type: "plant", children: treeData.children, childCount: treeData.children?.reduce((s: number, c: DataManagementTreeChild) => s + 1 + (c.childCount ?? 0), 0) ?? 0 }]
      : (treeData.children || []);
    const totalDescendants = plantChildren.reduce((s, c) => s + 1 + (c.childCount ?? 0), 0);
    return [{
      ...(treeData as unknown as DataManagementTreeChild),
      id: "root", name: company?.name ?? "Company", type: "plant",
      children: plantChildren, childCount: totalDescendants, code: "", status: "active",
    } as DataManagementTreeChild];
  }, [treeData, selectedPlantId]);

  const selectedNode = useMemo((): DataManagementTreeChild | null => {
    if (!selectedNodeKey || normalizedTreeNodes.length === 0) return null;
    return findNodeByKey(normalizedTreeNodes, selectedNodeKey);
  }, [selectedNodeKey, normalizedTreeNodes]);

  const selectedPath = useMemo(() => {
    if (!selectedNodeKey || normalizedTreeNodes.length === 0) return [];
    return findNodePathByKey(normalizedTreeNodes, selectedNodeKey) || [];
  }, [selectedNodeKey, normalizedTreeNodes]);

  const pathItems = useMemo(() => (selectedPath || []).filter((n) => n.type !== "plant"), [selectedPath]);

  const contextCounts = useMemo((): Record<string, number> => {
    if (!selectedNode) {
      return {
        plants: navCounts?.plants ?? 0,
        productionLines: navCounts?.productionLines ?? 0,
        departments: navCounts?.departments ?? 0,
        resourceGroups: navCounts?.resourceGroups ?? 0,
        resources: navCounts?.resources ?? 0,
      };
    }
    const counts: Record<string, number> = {};
    const walk = (n: DataManagementTreeChild) => { const t = n.type; counts[t] = (counts[t] || 0) + 1; n.children?.forEach(walk); };
    walk(selectedNode);
    return {
      plants: counts.plant || 0,
      productionLines: counts.productionLine || counts.line || 0,
      departments: counts.department || 0,
      resourceGroups: counts.resourceGroup || counts.group || 0,
      resources: counts.resource || 0,
    };
  }, [selectedNode, navCounts]);

  const totalNodes = useMemo(() => countTotalNodes(normalizedTreeNodes), [normalizedTreeNodes]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <ContextMenu state={contextMenu} onClose={closeContextMenu}
        onAdd={(key) => { handleSelect(key); }}
        onEdit={(key) => { handleSelect(key); }}
        onDelete={(key) => { handleSelect(key); }}
      />

      {/* ── Header h-16 ── */}
      <header className={`flex shrink-0 items-center justify-between gap-4 border-b px-5 h-16 ${theme.header}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Database className="h-4 w-4 stroke-current" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-sm font-bold tracking-tight ${theme.textPrimary}`}>Data Management</h1>
            <p className={`text-[9px] ${theme.textSecondary}`}>Digital plant model with live operational context</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value="" onChange={(e) => { if (e.target.value) navigate(e.target.value); }}
            className="h-8 rounded-lg border border-emerald-300 bg-emerald-50 pl-2.5 pr-7 text-[10px] font-semibold text-emerald-700 min-w-40 appearance-none dark:bg-slate-900 dark:border-emerald-700 dark:text-emerald-300"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "13px" }}
          >
            <option value="" disabled>Navigate to...</option>
            <option value="/system/data-management/plant">Plants ({navCounts?.plants ?? 0})</option>
            <option value="/system/data-management/production-lines">Lines ({navCounts?.productionLines ?? 0})</option>
            <option value="/system/data-management/departments">Departments ({navCounts?.departments ?? 0})</option>
            <option value="/system/data-management/resource-groups">Resource Groups ({navCounts?.resourceGroups ?? 0})</option>
            <option value="/system/data-management/resources">Resources ({navCounts?.resources ?? 0})</option>
            <option value="/system/data-management/references">References ({navCounts?.referenceTables ?? 0})</option>
          </select>
          <button type="button" onClick={() => navigate("/control-tower")}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" aria-label="Close"
          >
            <X className="h-3.5 w-3.5 stroke-current" />
          </button>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && !treeData && (
        <div className={`border-b px-5 py-2 shrink-0 ${theme.dangerPanel}`}>
          <div className="flex items-center gap-2 text-[11px] text-red-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5 stroke-current shrink-0" />
            <span>Failed to load production data.</span>
            <button type="button" onClick={() => refetch()}
              className="ml-auto inline-flex items-center gap-1 rounded border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <RefreshCw className="h-3 w-3 stroke-current" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Body: fixed tree width + flex right ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ═══ LEFT: Production Tree (fixed width) ═══ */}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-slate-200/50 dark:border-slate-800 w-[340px] min-w-[280px] max-w-[400px] shrink-0">
          <div className="shrink-0 border-b border-slate-200/50 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <GitBranch className="h-3 w-3 text-emerald-500 stroke-current shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">Structure</span>
                {!loading && <span className={`text-[9px] ${theme.textMuted}`}>({totalNodes})</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 pb-1.5">
              <select value={selectedPlantId === null ? "__company__" : selectedPlantId}
                onChange={(e) => { const v = e.target.value; if (v === "__company__") { setSelectedPlantId(null); setSelectedNodeKey("plant:root"); setExpandedSet(new Set()); } else { setSelectedPlantId(v || null); setSelectedNodeKey(null); setExpandedSet(new Set()); } }}
                className="h-6 rounded border border-slate-200 dark:border-slate-700 px-1 text-[9px] font-medium max-w-24 bg-white dark:bg-slate-900"
              >
                <option value="__company__">{company?.name ?? "Company"}</option>
                {plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="relative flex-1 min-w-0 max-w-28">
                <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-400 stroke-current pointer-events-none" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search"
                  className="h-6 w-full rounded border border-slate-200 dark:border-slate-700 pl-5 pr-1 text-[9px] bg-white dark:bg-slate-900" />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-2 w-2 stroke-current" />
                  </button>
                )}
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="h-6 rounded border border-slate-200 dark:border-slate-700 px-0.5 text-[9px] bg-white dark:bg-slate-900"
              >
                <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
              <button type="button" onClick={() => refetch()}
                className="flex items-center justify-center h-6 w-6 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors"
              >
                <RefreshCw className={`h-2.5 w-2.5 text-slate-500 stroke-current ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-1.5 py-1">
            {loading && !treeData ? (
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 py-8"><RefreshCw className="h-3 w-3 animate-spin stroke-current" /> Loading...</div>
            ) : !treeData || treeData.children.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-[10px] text-slate-400">
                <Database className="h-5 w-5 stroke-current text-slate-300" />
                <span className="text-xs font-medium text-slate-400">No production structure found</span>
                <span className="text-[9px] text-slate-400">Add plants and entities to populate the tree</span>
              </div>
            ) : (
              <div role="tree" className="space-y-px">
                {normalizedTreeNodes.map((node, idx) => {
                  const nodeKey = `${node.type}:${node.id}`;
                  return <TreeNode key={nodeKey} nodeKey={nodeKey} node={node} depth={0}
                    expanded={expandedSet.has(nodeKey)} selectedKey={selectedNodeKey}
                    onToggle={handleToggle} onSelect={handleSelect} onDoubleClick={handleDoubleClick}
                    expandedSet={expandedSet} onContextMenu={handleContextMenu} index={idx} />;
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Fills remaining space ═══ */}
        <div className="flex flex-col min-h-0 flex-1">
          <div className="shrink-0 px-2 pt-2 pb-1 bg-slate-50/20 dark:bg-slate-900/10">
            <SummaryCards kpis={kpis} navCounts={navCounts} />
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {selectedNode && selectedNode.id === "root" && company ? (
              <>
                <div className="flex-1 overflow-y-hidden px-3 py-2">
                  {/* Paper sheet */}
                  <div className="h-full rounded-sm border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.3)] flex flex-col">
                    {/* Paper header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 px-3 py-2 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <Factory className="h-3 w-3 stroke-current" />
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Company Configuration</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={async () => {
                          setCompanySaving(true); setCompanyError(null);
                          try { await updateCompany({ variables: { input: companyForm } }); setSelectedNodeKey(null); }
                          catch (e) { setCompanyError(e instanceof Error ? e.message : "Save failed"); }
                          setCompanySaving(false);
                        }} disabled={companySaving}
                          className="h-6 px-2.5 rounded text-[9px] font-semibold inline-flex items-center gap-1 transition-colors bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {companySaving ? <RefreshCw className="h-2.5 w-2.5 animate-spin stroke-current" /> : <Check className="h-2.5 w-2.5 stroke-current" />}
                          Save
                        </button>
                        <button type="button" onClick={() => setSelectedNodeKey(null)}
                          className="h-6 px-2 rounded border border-slate-200 dark:border-slate-700 text-[9px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors"
                        >
                          <X className="h-2.5 w-2.5 stroke-current" /> Close
                        </button>
                      </div>
                    </div>
                    {/* Paper body */}
                    <div className="flex-1 overflow-y-auto">
                      <CompanyEditor form={companyForm as any} onChange={(k, v) => setCompanyForm((p) => ({ ...p, [k]: v }))} compact
                        onSave={async () => {
                          setCompanySaving(true); setCompanyError(null);
                          try { await updateCompany({ variables: { input: companyForm } }); setSelectedNodeKey(null); } catch (e) { setCompanyError(e instanceof Error ? e.message : "Save failed"); }
                          setCompanySaving(false);
                        }}
                        saving={companySaving}
                        onClose={() => setSelectedNodeKey(null)} />
                    </div>
                    {/* Paper footer */}
                    <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-3 py-1.5 text-[9px] text-slate-400 flex items-center gap-2">
                      <span className="text-red-500 font-bold">*</span> Required fields
                    </div>
                  </div>
                  {companyError && (
                    <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 mt-1">{companyError}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-2">
                <div className="py-1.5">
                  <NodeFormPanel
                    selectedNode={selectedNode}
                    selectedNodeKey={selectedNodeKey}
                    setSelectedNodeKey={setSelectedNodeKey}
                    editingNodeKey={editingNodeKey}
                    pathItems={pathItems}
                    contextCounts={contextCounts}
                  />
                </div>
              </div>
            )}

            </div>
        </div>
      </div>

      {/* ── Footer h-15 ── */}
      <PageFooter totalNodes={totalNodes} navCounts={navCounts} />
    </div>
  );
}
