import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Database, Factory, Layers, Search, Users,
  GitBranch, Building2, Circle, X,
  RefreshCw, Monitor, AlertCircle, ChevronDown,
  Pencil, Plus, Trash2, Check, Info,
  Activity
} from "lucide-react";
import { theme } from "../../styles/themeTokens";
import { useDataManagementOverview } from "@/hooks/useDataManagementOverview";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { COMPANY_QUERY, UPDATE_COMPANY_MUTATION, CONFIG_OPTIONS_QUERY } from "@/graphql/companyQueries";

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

function TreeNode({ node, depth, expanded, selectedKey, onToggle, onSelect, expandedSet, nodeKey, onContextMenu, index }: {
  node: DataManagementTreeChild; depth: number; expanded: boolean;
  selectedKey: string | null; onToggle: (id: string) => void;
  onSelect: (key: string | null) => void;
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
        className={`flex items-center gap-1.5 h-8 min-h-8 rounded px-2 cursor-pointer transition-all duration-150 select-none ${
          isSelected
            ? "bg-blue-50/60 dark:bg-slate-700/30 border-l-2 border-l-blue-400 dark:border-l-cyan-500/60"
            : "border-l-2 border-l-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
        } ${index % 2 === 1 ? "bg-slate-50/20 dark:bg-slate-900/10" : ""}`}
        style={{ paddingLeft: `${indentPx}px` }}
        onClick={() => { onSelect(isSelected ? null : nodeKey); if (hasChildren) onToggle(nodeKey); }}
        onContextMenu={(e) => onContextMenu(e, nodeKey, node)}
        role="treeitem" tabIndex={0} aria-expanded={hasChildren ? expanded : undefined}
        onKeyDown={(e) => { if (e.key === "Enter") { onSelect(isSelected ? null : nodeKey); if (hasChildren) onToggle(nodeKey); } }}
      >
        <span className="w-4 shrink-0 flex items-center justify-center">
          {hasChildren ? (
            <ChevronDown className={`h-3 w-3 text-slate-400 stroke-current transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`} />
          ) : (
            <span className="w-3" />
          )}
        </span>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${cfg.color}`}>
          <Icon className="h-3 w-3 stroke-current" />
        </span>
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <span className={`text-[13px] font-semibold truncate ${isSelected ? "text-blue-700 dark:text-cyan-300" : theme.textPrimary}`}>
            {node.name}
          </span>
          {node.code && (
            <span className={`rounded px-1 py-0.5 text-[9px] font-mono font-medium ${theme.codeBadge}`}>{node.code}</span>
          )}
          <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${node.status === "active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
          {(node.childCount ?? 0) > 0 && (
            <span className={`text-[10px] font-medium ${theme.textMuted}`}>{node.childCount}</span>
          )}
        </div>
      </div>
      {hasChildren && (
        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${expanded ? "opacity-100" : "max-h-0 opacity-0"}`}>
          {expanded && node.children!.map((child, idx) => {
            const childKey = `${nodeKey}/${child.type}:${child.id}`;
            return <TreeNode key={childKey} nodeKey={childKey} node={child} depth={depth + 1}
              expanded={expandedSet.has(childKey)} selectedKey={selectedKey}
              onToggle={onToggle} onSelect={onSelect}
              expandedSet={expandedSet} onContextMenu={onContextMenu} index={idx} />;
          })}
        </div>
      )}
    </div>
  );
}

function NodeFormPanel({ selectedNode, selectedNodeKey, setSelectedNodeKey, pathItems, contextCounts }: {
  selectedNode: DataManagementTreeChild | null;
  selectedNodeKey: string | null;
  setSelectedNodeKey: (key: string | null) => void;
  pathItems: DataManagementTreeChild[];
  contextCounts: Record<string, number> | undefined;
}) {
  const navigate = useNavigate();
  const [workspaceMode, setWorkspaceMode] = useState<'view' | 'edit' | 'create'>('view');
  const [createType, setCreateType] = useState('');

  useEffect(() => { setWorkspaceMode('view'); }, [selectedNodeKey]);

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

  const childTypeMap: Record<string, string> = { company: "Plant", plant: "Production Line", productionLine: "Department", line: "Department", department: "Resource Group", resourceGroup: "Resource", group: "Resource" };
  const addLabel = childTypeMap[selectedNode?.type ?? ""];
  const canAdd = !!addLabel;

  const entityRoutes: Record<string, string> = {
    plant: "/system/production-structure/plant/", productionLine: "/system/production-structure/production-lines/", line: "/system/production-structure/production-lines/",
    department: "/system/production-structure/departments/", resourceGroup: "/system/production-structure/resource-groups/", group: "/system/production-structure/resource-groups/",
    resource: "/system/production-structure/resources/",
  };

  const addRoutes: Record<string, string> = {
    company: "/system/production-structure/plant", plant: "/system/production-structure/production-lines", productionLine: "/system/production-structure/departments",
    line: "/system/production-structure/departments", department: "/system/production-structure/resource-groups", resourceGroup: "/system/production-structure/resources",
    group: "/system/production-structure/resources",
  };

  if (!selectedNode || !selectedNodeKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-slate-400">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
          <Info className="h-4 w-4 stroke-current text-slate-300" />
        </div>
        <span className="text-sm font-semibold text-slate-400">No node selected</span>
        <span className="text-xs text-slate-400">Select a node from the production tree</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Right Column: Title Header */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-900/80 h-12 px-4 flex items-center">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${ts?.color || theme.iconBoxSubtle}`}>
            <Icon className="h-2.5 w-2.5 stroke-current" />
          </span>
          <span className={`text-[13px] font-bold truncate ${theme.textPrimary}`}>{selectedNode.name}</span>
          <span className="text-slate-300 mx-1">·</span>
          <span className="text-[11px] text-slate-500 shrink-0">{title}</span>
          {selectedNode.code && <><span className="text-slate-300 mx-1">·</span><span className="text-[11px] font-mono text-slate-500 shrink-0">{selectedNode.code}</span></>}
          <span className="text-slate-300 mx-1">·</span>
          <span className={`inline-flex items-center gap-1 text-[11px] shrink-0 ${selectedNode.status === "active" ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${selectedNode.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />
            {statusLabel}
          </span>
          <span className="text-slate-300 mx-1">·</span>
          <span className="text-[11px] text-slate-500 shrink-0">depth {hierarchyDepth}</span>
        </div>
      </div>

      {/* Right Column: Toolbar */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/40 h-10 px-4 flex items-center justify-end gap-1">
        {workspaceMode === 'view' && canAdd && (
          <button type="button" onClick={() => { const route = addRoutes[selectedNode.type]; if (route) { setCreateType(childTypeMap[selectedNode.type]); setWorkspaceMode('create'); } }}
            className="h-7 px-2.5 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
          ><Plus className="h-3.5 w-3.5 stroke-current" /> Add {addLabel}</button>
        )}
        {workspaceMode === 'view' && (
          <button type="button" onClick={() => setWorkspaceMode('edit')}
            className="h-7 px-2.5 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
          ><Pencil className="h-3.5 w-3.5 stroke-current" /> Edit</button>
        )}
        {workspaceMode !== 'view' && (
          <>
            <button type="button" onClick={() => {
              if (workspaceMode === 'edit') { const base = entityRoutes[selectedNode.type]; if (base) navigate(base + selectedNode.id); }
              if (workspaceMode === 'create') { const route = addRoutes[selectedNode.type]; if (route) navigate(route); }
            }}
              className="h-7 px-2.5 rounded text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 inline-flex items-center gap-1.5 transition-colors"
            ><Check className="h-3.5 w-3.5 stroke-current" /> Save</button>
            <button type="button" onClick={() => setWorkspaceMode('view')}
              className="h-7 px-2.5 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
            ><X className="h-3.5 w-3.5 stroke-current" /> Cancel</button>
          </>
        )}
        {workspaceMode === 'view' && (
          <button type="button" onClick={() => setSelectedNodeKey(null)}
            className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          ><X className="h-3.5 w-3.5 stroke-current" /></button>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-0">
        {workspaceMode === 'view' && (
          <ViewContent selectedNode={selectedNode} selectedNodeKey={selectedNodeKey} setSelectedNodeKey={setSelectedNodeKey}
            title={title} statusLabel={statusLabel} hierarchyDepth={hierarchyDepth} parentEntity={parentEntity}
            activeInactiveCounts={activeInactiveCounts} contextCounts={contextCounts}
            entityRoutes={entityRoutes} navigate={navigate} />
        )}

        {workspaceMode === 'edit' && (
          <div className="px-2.5 pt-2 pb-3 space-y-2">
            <div className="rounded border border-amber-200/50 dark:border-amber-500/15 bg-amber-50/20 dark:bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Info className="h-3 w-3 stroke-current shrink-0" />
              Editing {title} — changes will be saved to the database.
            </div>
            <div className="rounded border border-slate-200/50 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{title} Fields</div>
              <div className="p-2.5 space-y-2">
                <Field label="Name" value={selectedNode.name} />
                <Field label="Code" value={selectedNode.code || ""} />
                <Field label="Status" value={statusLabel} />
              </div>
            </div>
          </div>
        )}

        {workspaceMode === 'create' && (
          <div className="px-2.5 pt-2 pb-3 space-y-2">
            <div className="rounded border border-sky-200/50 dark:border-sky-500/15 bg-sky-50/20 dark:bg-sky-500/5 px-2.5 py-1.5 text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <Info className="h-3 w-3 stroke-current shrink-0" />
              Creating new {createType} under {selectedNode.name}
            </div>
            <div className="rounded border border-slate-200/50 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">New {createType}</div>
              <div className="p-2.5 space-y-2">
                <Field label="Name" value="" />
                <Field label="Code" value="" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">{label}</label>
      <input type="text" defaultValue={value} className="w-full h-8 rounded border border-slate-200 dark:border-slate-700 px-2.5 text-[12px] bg-white dark:bg-slate-900 outline-none focus:border-emerald-400 transition-colors" placeholder={label} />
    </div>
  );
}

function ViewContent({ selectedNode, selectedNodeKey, setSelectedNodeKey, title, statusLabel, hierarchyDepth, parentEntity, activeInactiveCounts, contextCounts, entityRoutes, navigate }: {
  selectedNode: DataManagementTreeChild; selectedNodeKey: string; setSelectedNodeKey: (k: string | null) => void;
  title: string; statusLabel: string; hierarchyDepth: number; parentEntity: DataManagementTreeChild | null;
  activeInactiveCounts: { active: number; inactive: number }; contextCounts: Record<string, number> | undefined;
  entityRoutes: Record<string, string>; navigate: (path: string) => void;
}) {
  return (<>
    <div className="px-2.5 pt-1.5">
      <div className="rounded border border-slate-200/50 dark:border-slate-800">
        <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">Overview</div>
        <div className="p-2.5 grid grid-cols-3 gap-x-4 gap-y-1.5">
          <div className="flex items-center justify-between gap-2 col-span-3">
            <span className="text-[11px] font-medium text-slate-400">Name</span>
            <span className="text-[15px] font-semibold text-right text-slate-900 dark:text-slate-100">{selectedNode.name}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Type</span>
            <span className="text-[13px] font-medium text-right text-slate-700 dark:text-slate-200">{title}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Code</span>
            <span className="text-[13px] font-mono font-medium text-right text-slate-700 dark:text-slate-200">{selectedNode.code || "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Status</span>
            <span className={`text-[13px] font-medium text-right ${selectedNode.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>{statusLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Depth</span>
            <span className="text-[13px] font-medium text-right text-slate-700 dark:text-slate-200">{hierarchyDepth}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Parent</span>
            <span className="text-[13px] font-medium text-right text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{parentEntity?.name || "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Children</span>
            <span className="text-[13px] font-medium text-right text-slate-700 dark:text-slate-200">{selectedNode.children?.length ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
    <div className="px-2.5 pt-1.5 flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 rounded px-2 py-1 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 text-[13px] font-semibold">
        <GitBranch className="h-3.5 w-3.5" stroke-current /> {selectedNode.children?.length ?? 0} <span className="text-[11px] font-medium text-sky-500 dark:text-sky-400">direct</span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-[13px] font-semibold">
        <Activity className="h-3.5 w-3.5" stroke-current /> {selectedNode.childCount ?? 0} <span className="text-[11px] font-medium text-emerald-500 dark:text-emerald-400">total</span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-[13px] font-semibold">
        <Circle className="h-3.5 w-3.5" stroke-current /> {activeInactiveCounts.active} <span className="text-[11px] font-medium text-emerald-500 dark:text-emerald-400">active</span>
      </span>
      <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[13px] font-semibold ${activeInactiveCounts.inactive > 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500"}`}>
        <X className="h-3.5 w-3.5" stroke-current /> {activeInactiveCounts.inactive} <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">inactive</span>
      </span>
    </div>
    <div className="px-2.5 pt-1.5">
      <div className="rounded border border-slate-200/50 dark:border-slate-800">
        <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">Hierarchy Distribution</div>
        <div className="flex items-center gap-2 p-2.5 flex-wrap">
          {[
            { label: "Plants", value: String(contextCounts?.plants ?? 0), color: ENTITY_CONFIG.plant.color, icon: Building2 },
            { label: "Lines", value: String(contextCounts?.productionLines ?? 0), color: ENTITY_CONFIG.productionLine.color, icon: GitBranch },
            { label: "Departments", value: String(contextCounts?.departments ?? 0), color: ENTITY_CONFIG.department.color, icon: Layers },
            { label: "Groups", value: String(contextCounts?.resourceGroups ?? 0), color: ENTITY_CONFIG.resourceGroup.color, icon: Users },
            { label: "Resources", value: String(contextCounts?.resources ?? 0), color: ENTITY_CONFIG.resource.color, icon: Monitor },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded px-2 py-1.5 bg-slate-50/40 dark:bg-slate-900/20">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${item.color}`}><item.icon className="h-3 w-3" stroke-current /></span>
              <div className="leading-tight">
                <div className="text-[10px] font-medium text-slate-400">{item.label}</div>
                <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    {selectedNode.children && selectedNode.children.length > 0 && (
      <div className="px-2.5 pt-1.5 pb-2">
        <div className="rounded border border-slate-200/50 dark:border-slate-800">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Direct Children</span>
            <span className="text-xs font-normal text-slate-400">{selectedNode.children.length}</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {selectedNode.children.map((child) => {
              const childCfg = ENTITY_CONFIG[child.type] || ENTITY_CONFIG.resource;
              const ChildIcon = childCfg.icon;
              const childRoute = entityRoutes[child.type];
              return (
                <div key={child.id} className="flex items-center gap-2.5 px-2.5 py-1.5 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 group"
                  onClick={() => setSelectedNodeKey(`${selectedNodeKey}/${child.type}:${child.id}`)}
                  onDoubleClick={() => { if (childRoute) navigate(childRoute + child.id); }}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${childCfg.color}`}><ChildIcon className="h-3 w-3" stroke-current /></span>
                  <span className="flex-1 text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate">{child.name}</span>
                  {child.code && <span className="text-[10px] font-mono text-slate-400">{child.code}</span>}
                  <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${child.status === "active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                  <span className="text-[11px] text-slate-400">{TYPE_TITLES[child.type] || child.type}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button type="button" onClick={(e) => { e.stopPropagation(); if (childRoute) navigate(childRoute + child.id); }}
                      className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Edit">
                      <Pencil className="h-3 w-3 stroke-current" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    <div className="px-2.5 pt-1.5 pb-2">
      <div className="rounded border border-slate-200/50 dark:border-slate-800">
        <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">Related Configuration</div>
        <div className="p-3 flex flex-col items-center gap-1 text-[11px] text-slate-400">
          <Database className="h-5 w-5 stroke-current text-slate-300" />
          <span>No configuration links for this entity yet.</span>
        </div>
      </div>
    </div>
  </>);
}

function PageFooter() {
  return (
    <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center px-4 h-[52px]">
      <div className="flex items-center gap-4">
        {[
          { label: "Plant", dot: "bg-blue-400" },
          { label: "Line", dot: "bg-amber-400" },
          { label: "Dept", dot: "bg-purple-400" },
          { label: "Group", dot: "bg-blue-400" },
          { label: "Resource", dot: "bg-gray-400" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
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
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, nodeKey: "", node: null as any, visible: false });

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery]);

  const { data: overview, loading, error, refetch } = useDataManagementOverview({
    plantId: selectedPlantId, search: debouncedSearch || undefined, status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: companyData } = useQuery<{ company: { id: string; code: string; name: string; address: string; phone: string; email: string; website: string; description: string; industryType: string; manufacturingType: string; defaultTimezone: string; defaultUnits: string; defaultShiftModel: string; productionCalendar: string; defaultLanguage: string; leanMethodology: string } }>(COMPANY_QUERY, {
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const [updateCompany] = useMutation(UPDATE_COMPANY_MUTATION);
  const { data: optsData } = useQuery<{ configOptions: Array<{ category: string; value: string; label: string }> }>(CONFIG_OPTIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const configOptions = useMemo(() => {
    const map: Record<string, Array<{ value: string; label: string }>> = {};
    (optsData?.configOptions ?? []).forEach((o) => {
      if (!map[o.category]) map[o.category] = [];
      map[o.category].push({ value: o.value, label: o.label });
    });
    return map;
  }, [optsData]);

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

  const isCompanyDirty = useMemo(() => {
    if (!company) return false;
    const keys = ["code", "name", "address", "phone", "email", "website", "description", "industryType", "manufacturingType", "defaultTimezone", "defaultUnits", "defaultShiftModel", "productionCalendar", "defaultLanguage", "leanMethodology"];
    return keys.some((key) => (companyForm[key] ?? "") !== ((company as any)[key] ?? ""));
  }, [company, companyForm]);

  useEffect(() => { if (overview?.tree && expandedSet.size === 0 && overview.tree.children.length > 0) setExpandedSet(new Set(["plant:root", ...overview.tree.children.map((c) => `${c.type}:${c.id}`)])); }, [overview?.tree]);
  useEffect(() => {
    if (debouncedSearch && overview?.tree) {
      const ids = new Set<string>();
      const walk = (n: DataManagementTreeChild, pk: string) => { const k = `${pk}/${n.type}:${n.id}`; ids.add(k); n.children?.forEach((c) => walk(c, k)); };
      overview.tree.children.forEach((c) => { const k = `${c.type}:${c.id}`; ids.add(k); c.children?.forEach((ch) => walk(ch, k)); });
      setExpandedSet(ids);
    }
  }, [debouncedSearch, overview?.tree]);

  const handleToggle = useCallback((id: string) => setExpandedSet((prev) => {
    if (prev.has(id)) { const n = new Set(prev); n.delete(id); return n; }
    const n = new Set(prev);
    n.add(id);
    if (id.includes('/')) {
      const parentPath = id.substring(0, id.lastIndexOf('/'));
      for (const key of n) {
        if (key === id) continue;
        if (key.includes('/') && key.substring(0, key.lastIndexOf('/')) === parentPath) {
          n.delete(key);
        }
      }
    }
    return n;
  }), []);
  const handleSelect = useCallback((key: string | null) => setSelectedNodeKey(key), []);

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeKey: string, node: DataManagementTreeChild) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeKey, node, visible: true });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu((prev) => ({ ...prev, visible: false })), []);

  const plants = overview?.plants ?? [];
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <ContextMenu state={contextMenu} onClose={closeContextMenu}
        onAdd={(key) => { handleSelect(key); }}
        onEdit={(key) => { handleSelect(key); }}
        onDelete={(key) => { handleSelect(key); }}
      />

      {/* ── Page Header ── */}
      <header className={`flex shrink-0 items-center justify-between gap-4 border-b px-5 h-14 ${theme.header}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Database className="h-4 w-4 stroke-current" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-sm font-bold tracking-tight ${theme.textPrimary}`}>Production Structure</h1>
            <p className={`text-[11px] ${theme.textSecondary}`}>Manufacturing hierarchy explorer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value="" onChange={(e) => { if (e.target.value) navigate(e.target.value); }}
            className="h-7 rounded-lg border border-emerald-300 bg-emerald-50 pl-2 pr-6 text-[10px] font-semibold text-emerald-700 min-w-36 appearance-none dark:bg-slate-900 dark:border-emerald-700 dark:text-emerald-300"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", backgroundSize: "12px" }}
          >
            <option value="" disabled>Navigate to...</option>
            <option value="/system/production-structure/plant">Plants ({navCounts?.plants ?? 0})</option>
            <option value="/system/production-structure/production-lines">Lines ({navCounts?.productionLines ?? 0})</option>
            <option value="/system/production-structure/departments">Departments ({navCounts?.departments ?? 0})</option>
            <option value="/system/production-structure/resource-groups">Resource Groups ({navCounts?.resourceGroups ?? 0})</option>
            <option value="/system/production-structure/resources">Resources ({navCounts?.resources ?? 0})</option>
            <option value="/system/production-structure/references">References ({navCounts?.referenceTables ?? 0})</option>
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
      <div className="flex-1 min-h-0 flex overflow-hidden gap-0">
        {/* ═══ LEFT: Production Tree (fixed width) ═══ */}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-slate-200 dark:border-slate-700/50 w-[340px] min-w-[280px] max-w-[400px] shrink-0">
        
          <div className="shrink-0 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-900/80">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <GitBranch className="h-3 w-3 text-emerald-500 stroke-current shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Structure Explorer</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 pb-1.5">
              {searchFocused || searchQuery ? (
                <div className="relative flex-1">
                  <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 stroke-current pointer-events-none" />
                  <input ref={searchRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search"
                    onBlur={() => { if (!searchQuery) setSearchFocused(false); }}
                    className="h-7 w-full rounded text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 pl-8 pr-6 outline-none transition-all placeholder:text-slate-400" />
                  {searchQuery && (
                    <button type="button" onClick={() => { setSearchQuery(""); setSearchFocused(false); }} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3 stroke-current" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <select value={selectedPlantId === null ? "__company__" : selectedPlantId}
                    onChange={(e) => { const v = e.target.value; if (v === "__company__") { setSelectedPlantId(null); setSelectedNodeKey("plant:root"); setExpandedSet(new Set()); } else { setSelectedPlantId(v || null); setSelectedNodeKey(null); setExpandedSet(new Set()); } }}
                    className="h-7 rounded text-xs text-slate-600 dark:text-slate-300 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 max-w-24 appearance-none cursor-pointer transition-colors outline-none"
                  >
                    <option value="__company__">{company?.name ?? "Company"}</option>
                    {plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button type="button" onClick={() => { setSearchFocused(true); setTimeout(() => searchRef.current?.focus(), 50); }}
                    className="flex items-center justify-center h-7 w-7 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Search"
                  >
                    <Search className="h-3.5 w-3.5 stroke-current" />
                  </button>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-7 rounded text-xs text-slate-600 dark:text-slate-300 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 px-1 appearance-none cursor-pointer transition-colors outline-none"
                  >
                    <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                  <button type="button" onClick={() => refetch()}
                    className="flex items-center justify-center h-7 w-7 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 stroke-current ${loading ? "animate-spin" : ""}`} />
                  </button>
                </>
              )}
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
                      onToggle={handleToggle} onSelect={handleSelect}
                      expandedSet={expandedSet} onContextMenu={handleContextMenu} index={idx} />;
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Fills remaining space ═══ */}
        <div className="flex flex-col min-h-0 flex-1 m-0">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {selectedNode && selectedNode.id === "root" && company ? (
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-[1120px] mx-auto px-6 py-5 space-y-6">
                  {/* ── Header ── */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Company Configuration</h2>
                      <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Defines global defaults applied across all plants, lines, and resources.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <button type="button" onClick={async () => {
                        setCompanySaving(true); setCompanyError(null);
                        try { await updateCompany({ variables: { input: companyForm } }); setSelectedNodeKey(null); }
                        catch (e) { setCompanyError(e instanceof Error ? e.message : "Save failed"); }
                        setCompanySaving(false);
                      }} disabled={!isCompanyDirty || companySaving}
                        title="Saving updates company-wide defaults. Existing records are not overwritten."
                        className="h-8 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {companySaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" /> : <Check className="h-3.5 w-3.5 stroke-current" />}
                        Save
                      </button>
                      <button type="button" onClick={() => setSelectedNodeKey(null)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <X className="h-4 w-4 stroke-current" />
                      </button>
                    </div>
                  </div>

                  {/* ── Section: Identity ── */}
                  <div className="bg-[#F9FAFB] dark:bg-slate-900/60 rounded-lg p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Identity</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Fields marked * are required. Changes affect system-wide behavior.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Company Name <span className="text-red-500">*</span></label>
                        <input type="text" value={companyForm.name ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none" placeholder="e.g. Lean Manufacturing Demo" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Company Code <span className="text-red-500">*</span></label>
                        <input type="text" value={companyForm.code ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, code: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none" placeholder="e.g. LMD" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Industry Type <span className="text-red-500">*</span></label>
                        <select value={companyForm.industryType ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, industryType: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px" }}
                        >
                          <option value="">Select industry type...</option>
                          {(configOptions["industry_type"] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Manufacturing Type <span className="text-red-500">*</span></label>
                        <select value={companyForm.manufacturingType ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, manufacturingType: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px" }}
                        >
                          <option value="">Select manufacturing type...</option>
                          {(configOptions["manufacturing_type"] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Section: Operations ── */}
                  <div className="bg-[#F9FAFB] dark:bg-slate-900/60 rounded-lg p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Operations</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Fields marked * are required. Changes affect system-wide behavior.</p>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-sky-100 dark:border-sky-500/20 bg-sky-50/50 dark:bg-sky-500/5 px-3 py-2">
                      <Info className="h-4 w-4 text-sky-500 stroke-current shrink-0 mt-0.5" />
                      <p className="text-[12px] text-sky-700 dark:text-sky-300">These settings control scheduling, reporting, and capacity calculations.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Timezone <span className="text-red-500">*</span></label>
                        <select value={companyForm.defaultTimezone ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, defaultTimezone: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px" }}
                        >
                          <option value="">Select timezone...</option>
                          {(configOptions["timezone"] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Units <span className="text-red-500">*</span></label>
                        <select value={companyForm.defaultUnits ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, defaultUnits: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px" }}
                        >
                          <option value="">Select units...</option>
                          {(configOptions["units"] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Shift Model <span className="text-red-500">*</span></label>
                        <select value={companyForm.defaultShiftModel ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, defaultShiftModel: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px" }}
                        >
                          <option value="">Select shift model...</option>
                          {(configOptions["shift_model"] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Calendar</label>
                        <select value={companyForm.productionCalendar ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, productionCalendar: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px" }}
                        >
                          <option value="">Select calendar...</option>
                          {(configOptions["calendar"] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Lean Methodology</label>
                        <select value={companyForm.leanMethodology ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, leanMethodology: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px" }}
                        >
                          <option value="">Select lean methodology...</option>
                          {(configOptions["lean_methodology"] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Language</label>
                        <select value={companyForm.defaultLanguage ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, defaultLanguage: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px" }}
                        >
                          <option value="">Select language...</option>
                          {(configOptions["language"] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Section: Contact ── */}
                  <div className="bg-[#F9FAFB] dark:bg-slate-900/60 rounded-lg p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Contact</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Fields marked * are required. Changes affect system-wide behavior.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Phone</label>
                        <input type="text" value={companyForm.phone ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none" placeholder="+1 (555) 000-0000" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
                        <input type="text" value={companyForm.email ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, email: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none" placeholder="info@company.com" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Website</label>
                        <input type="text" value={companyForm.website ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, website: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none" placeholder="https://company.com" />
                      </div>
                    </div>
                  </div>

                  {/* ── Section: Location ── */}
                  <div className="bg-[#F9FAFB] dark:bg-slate-900/60 rounded-lg p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Location</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Fields marked * are required. Changes affect system-wide behavior.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Address</label>
                        <input type="text" value={companyForm.address ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none" placeholder="123 Industrial Blvd, Suite 100" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                        <textarea value={companyForm.description ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, description: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] bg-white dark:bg-slate-900 transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none resize-none min-h-[96px]"
                          maxLength={500} placeholder="Brief description of the company, core products, and operational scope." />
                        <p className={`text-right text-[11px] mt-1 ${(companyForm.description?.length ?? 0) >= 500 ? "text-red-500" : (companyForm.description?.length ?? 0) >= 450 ? "text-amber-500" : "text-slate-400"}`}>
                          {companyForm.description?.length ?? 0} / 500
                        </p>
                      </div>
                    </div>
                  </div>

                  {companyError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{companyError}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-2">
                <div className="py-1.5">
                  <NodeFormPanel
                    selectedNode={selectedNode}
                    selectedNodeKey={selectedNodeKey}
                    setSelectedNodeKey={setSelectedNodeKey}
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
      <PageFooter />
    </div>
  );
}
