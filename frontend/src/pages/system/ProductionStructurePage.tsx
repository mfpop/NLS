import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Factory, TrendingUpDown, Layers, Component, Dumbbell, X, Search, RefreshCw, Plus, Pencil, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { theme } from "../../styles/themeTokens";
import { useDataManagementOverview } from "@/hooks/useDataManagementOverview";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { TreeNavigation, NodeDetailPanel, CompanyDetailView } from "./production-structure/components";
import { findNodeByKey, findNodePathByKey, ADD_ROUTES, ENTITY_CONFIG, CHILD_TYPE_MAP } from "./production-structure/config";

interface ContextMenuState {
  x: number; y: number; nodeKey: string; node: DataManagementTreeChild; visible: boolean;
}

function ContextMenu({ state, onClose, onAdd, onEdit }: {
  state: ContextMenuState; onClose: () => void;
  onAdd: (parentKey: string) => void; onEdit: (nodeKey: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  if (!state.visible) return null;
  const items = [
    { icon: Plus, label: "Add Child", action: () => onAdd(state.nodeKey) },
    { icon: Pencil, label: "Edit", action: () => onEdit(state.nodeKey) },
    { icon: X, label: "Delete", action: () => onClose(), danger: true },
  ];
  return (
    <div ref={ref} className="fixed z-50" style={{ left: Math.min(state.x, window.innerWidth - 180), top: Math.min(state.y, window.innerHeight - 160) }}>
      <div className="min-w-40 rounded-lg border shadow-lg py-1 bg-white dark:bg-slate-900 dark:border-slate-700">
        {items.map((item, i) => (
          <button key={i} type="button" onClick={() => { item.action(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer transition-colors ${
              item.danger ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <item.icon className="h-3.5 w-3.5 stroke-current" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProductionFlow() {
  const navigate = useNavigate();
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, nodeKey: "", node: null as any, visible: false });
  const [workspaceMode, setWorkspaceMode] = useState<"view" | "edit" | "create">("view");

  useEffect(() => { setWorkspaceMode("view"); }, [selectedNodeKey]);

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

  const { data: overviewData, loading, refetch } = useDataManagementOverview({
    plantId: selectedPlantId, search: searchQuery || undefined, status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // When a plant is selected from the tree, fetch its detailed tree
  // (selectedPlantId stays null initially so all plants are shown)

  const treeData = overviewData?.tree ? [overviewData.tree] : [];

  useEffect(() => {
    if (overviewData?.tree && expandedSet.size === 0 && overviewData.tree.children.length > 0) {
      const rootKey = `${overviewData.tree.type}:${overviewData.tree.id}`;
      // Expand root (company) to show plants
      const keys = [rootKey];
      // Also expand each plant to show its lines
      for (const plant of overviewData.tree.children) {
        const plantKey = `${plant.type}:${plant.id}`;
        keys.push(plantKey);
      }
      setExpandedSet(new Set(keys));
      if (!selectedNodeKey) {
        setSelectedNodeKey(rootKey);
      }
    }
  }, [overviewData?.tree]);

  const handleToggleNode = useCallback((key: string) => {
    setExpandedSet((prev) => {
      if (prev.has(key)) { const n = new Set(prev); n.delete(key); return n; }
      const n = new Set(prev); n.add(key);
      if (key.includes('/')) {
        const parentPath = key.substring(0, key.lastIndexOf('/'));
        for (const k of n) {
          if (k !== key && k.includes('/') && k.substring(0, k.lastIndexOf('/')) === parentPath) n.delete(k);
        }
      }
      return n;
    });
  }, []);

  const handleSelectNode = useCallback((key: string | null) => {
    setSelectedNodeKey(key);
    if (key && key.startsWith("plant:")) {
      const plantId = key.split(":")[1];
      setSelectedPlantId(plantId);
    }
  }, []);
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeKey: string, node: DataManagementTreeChild) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeKey, node, visible: true });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu((prev) => ({ ...prev, visible: false })), []);

  const selectedNode = selectedNodeKey && treeData ? findNodeByKey(treeData, selectedNodeKey) : null;
  const selectedPath = useMemo(() => {
    if (!selectedNodeKey || treeData.length === 0) return [];
    return findNodePathByKey(treeData, selectedNodeKey) || [];
  }, [selectedNodeKey, treeData]);

  const contextCounts = overviewData?.navigationCounts ? {
    plants: overviewData.navigationCounts.plants,
    lines: overviewData.navigationCounts.productionLines,
    departments: overviewData.navigationCounts.departments,
    groups: overviewData.navigationCounts.resourceGroups,
    resources: overviewData.navigationCounts.resources,
  } : null;

  const entityRoutes: Record<string, string> = {
    plant: "/system/production-structure/plant/",
    productionLine: "/system/production-structure/production-lines/",
    line: "/system/production-structure/production-lines/",
    department: "/system/production-structure/departments/",
    resourceGroup: "/system/production-structure/resource-groups/",
    group: "/system/production-structure/resource-groups/",
    resource: "/system/production-structure/resources/",
  };

  const isCompany = selectedNode?.type === "company";
  const childLabel = selectedNode ? (CHILD_TYPE_MAP[selectedNode.type] || null) : null;
  const canAdd = !!childLabel;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <ContextMenu state={contextMenu} onClose={closeContextMenu}
        onAdd={(key) => { const node = findNodeByKey(treeData || [], key); if (node) { const route = ADD_ROUTES[node.type]; if (route) navigate(route); } }}
        onEdit={(key) => { const node = findNodeByKey(treeData || [], key); if (node) { const route = entityRoutes[node.type]; if (route) navigate(route + node.id); } }} />

      {/* Page Header */}
      <PageHeader
        icon={<Database className="h-5 w-5 stroke-current" />}
        iconClass={theme.iconBoxEmerald}
        title="Production Structure - Flow"
        subtitle="Manufacturing hierarchy explorer"
      />

      {/* 2-Column Explorer */}
      <div className="flex-1 min-h-0 grid grid-cols-[380px_1fr] gap-0">
        {/* Column 1: Hierarchy Tree */}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-slate-200 dark:border-slate-700/50 min-w-0">
          {/* Tree Toolbar */}
          <div className="shrink-0 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-950 h-10 px-2 flex items-center gap-1">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current pointer-events-none" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search"
                className="h-7 w-full rounded text-[10px] text-slate-700 dark:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 pl-6 pr-1 outline-none transition-colors" />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3 w-3 stroke-current" />
                </button>
              )}
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 rounded text-[10px] text-slate-600 dark:text-slate-300 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 px-1 appearance-none cursor-pointer transition-colors outline-none">
              <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
            <button type="button" onClick={() => refetch()}
              className="flex items-center justify-center h-7 w-7 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
              <RefreshCw className={`h-3 w-3 stroke-current ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Tree Body */}
          <div className="flex-1 min-h-0 overflow-auto">
            <TreeNavigation
              data={treeData || []} selectedKey={selectedNodeKey} expandedSet={expandedSet}
              onToggleNode={handleToggleNode} onSelectNode={handleSelectNode}
              onContextMenu={handleContextMenu} isLoading={loading && !treeData.length}
            />
          </div>

          {/* Footer Legend */}
          <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center gap-5 px-5 text-xs text-slate-500 dark:text-slate-300 font-medium" style={{ height: "60px" }}>
            <span className="flex items-center gap-1.5"><Factory className="h-3.5 w-3.5 text-blue-500 stroke-current" /> Plant</span>
            <span className="flex items-center gap-1.5"><TrendingUpDown className="h-3.5 w-3.5 text-amber-500 stroke-current" /> Line</span>
            <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-purple-500 stroke-current" /> Dept</span>
            <span className="flex items-center gap-1.5"><Component className="h-3.5 w-3.5 text-rose-500 stroke-current" /> RG</span>
            <span className="flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5 text-gray-500 stroke-current" /> Resource</span>
          </div>
        </div>

        {/* Column 3: Entity Details */}
        <div className="flex flex-col min-h-0 min-w-0">
          {isCompany ? (
            <CompanyDetailView />
          ) : (
            <>
              {/* Entity Header + Actions */}
              <div className="shrink-0 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-950">
                {selectedNode && !isCompany ? (() => {
                  const cfg = ENTITY_CONFIG[selectedNode.type] || ENTITY_CONFIG.resource;
                  const Icon = cfg.icon;
                  return (
                    <div className="h-10 flex items-center justify-between gap-2 px-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <button type="button" onClick={() => setSelectedNodeKey(null)}
                            className="flex items-center justify-center h-7 w-7 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors shrink-0" title="Back">
                            <ChevronLeft className="h-4 w-4 stroke-current" />
                          </button>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${cfg.color}`}>
                            <Icon className="h-3 w-3 stroke-current" />
                          </span>
                          <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">{selectedNode.name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {workspaceMode === "view" && (<>
                            {canAdd && (
                              <button type="button" onClick={() => setWorkspaceMode("create")} className="h-7 px-2 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 inline-flex items-center gap-1 transition-colors">
                                <Plus className="h-3.5 w-3.5 stroke-current" /> Add {childLabel}
                              </button>
                            )}
                            <button type="button" onClick={() => setWorkspaceMode("edit")}
                              className="h-7 px-2 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 inline-flex items-center gap-1 transition-colors">
                              <Pencil className="h-3.5 w-3.5 stroke-current" /> Details
                            </button>
                          </>)}
                          {workspaceMode !== "view" && (<>
                            {(workspaceMode !== "edit" || (selectedNode.type !== "resourceGroup" && selectedNode.type !== "group")) && (
                              <button type="button" onClick={() => {
                                if (workspaceMode === "edit") { const route = entityRoutes[selectedNode.type]; if (route) navigate(route + selectedNode.id); }
                                if (workspaceMode === "create") { const route = ADD_ROUTES[selectedNode.type]; if (route) navigate(route); }
                              }} className="h-7 px-2 rounded text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 inline-flex items-center gap-1 transition-colors">Save</button>
                            )}
                            <button type="button" onClick={() => setWorkspaceMode("view")}
                              className="h-7 px-2 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 inline-flex items-center gap-1 transition-colors"><X className="h-3.5 w-3.5 stroke-current" /> Cancel</button>
                          </>)}
                        </div>
                      </div>
                  );
                })() : (
                  <div className="h-10 flex items-center px-3 bg-slate-50 dark:bg-slate-950">
                    <span className="text-[13px] text-slate-400">Select a node</span>
                  </div>
                )}
              </div>

              {/* Detail Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
                <NodeDetailPanel
                  selectedNode={selectedNode}
                  selectedNodeKey={selectedNodeKey}
                  selectedPath={selectedPath}
                  contextCounts={contextCounts}
                  workspaceMode={workspaceMode}
                  onAddChild={() => setWorkspaceMode("create")}
                  onSave={() => { setWorkspaceMode("view"); refetch(); }}
                />
              </div>
            </>
          )}


        </div>
      </div>
    </div>
  );
}
