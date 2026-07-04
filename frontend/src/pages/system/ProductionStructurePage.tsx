import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Factory, TrendingUpDown, Layers, Component, Dumbbell, X, RefreshCw, Plus, Pencil, ChevronLeft } from "lucide-react";
import { TwoColumnPageTemplate } from "@/components/layout/TwoColumnPageTemplate";
import { ToolbarButton, ToolbarDropdown } from "@/components/layout/PageToolbar";
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
      <div className="min-w-40 rounded-lg border shadow-lg py-1 bg-card border-border">
        {items.map((item, i) => (
          <button key={i} type="button" onClick={() => { item.action(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer transition-colors ${
              item.danger ? "text-danger hover:bg-danger text-danger hover:bg-danger" : "text-foreground hover:bg-muted text-muted-foreground dark:hover:bg-muted"
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
    plantId: selectedPlantId,
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    includeTree: true,
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
    <>
      <ContextMenu state={contextMenu} onClose={closeContextMenu}
        onAdd={(key) => { const node = findNodeByKey(treeData || [], key); if (node) { const route = ADD_ROUTES[node.type]; if (route) navigate(route); } }}
        onEdit={(key) => { const node = findNodeByKey(treeData || [], key); if (node) { const route = entityRoutes[node.type]; if (route) navigate(route + node.id); } }} />

      <TwoColumnPageTemplate
        icon={<Database className="h-5 w-5 stroke-current" />}
        iconClass={theme.iconBoxEmerald}
        title="Production Structure - Flow"
        subtitle="Manufacturing hierarchy explorer"
        toolbarProps={{
          searchValue: searchQuery,
          onSearchChange: setSearchQuery,
          searchPlaceholder: "Search tree",
          filters: (
            <ToolbarDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          ),
          actions: (
            <ToolbarButton
              icon={RefreshCw}
              label="Refresh"
              onClick={() => refetch()}
              disabled={loading}
            />
          ),
        }}
        leftChildren={
          <>
            <div className="flex-1 min-h-0 overflow-auto">
              <TreeNavigation
                data={treeData || []} selectedKey={selectedNodeKey} expandedSet={expandedSet}
                onToggleNode={handleToggleNode} onSelectNode={handleSelectNode}
                onContextMenu={handleContextMenu} isLoading={loading && !treeData.length}
              />
            </div>
            <div className="shrink-0 border-t border-border bg-card flex items-center gap-5 px-5 text-xs text-muted-foreground font-medium" style={{ height: "60px" }}>
              <span className="flex items-center gap-1.5"><Factory className="h-3.5 w-3.5 text-primary stroke-current" /> Plant</span>
              <span className="flex items-center gap-1.5"><TrendingUpDown className="h-3.5 w-3.5 text-warning stroke-current" /> Line</span>
              <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-info stroke-current" /> Dept</span>
              <span className="flex items-center gap-1.5"><Component className="h-3.5 w-3.5 text-danger stroke-current" /> RG</span>
              <span className="flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5 text-muted-foreground stroke-current" /> Resource</span>
            </div>
          </>
        }
        rightHeader={
          isCompany ? null : selectedNode && !isCompany ? (() => {
            const cfg = ENTITY_CONFIG[selectedNode.type] || ENTITY_CONFIG.resource;
            const Icon = cfg.icon;
            return (
              <div className="flex items-center justify-between gap-2 px-3 h-10">
                <div className="flex items-center gap-2 min-w-0">
                  <button type="button" onClick={() => setSelectedNodeKey(null)}
                    className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted text-muted-foreground hover:bg-muted transition-colors shrink-0" title="Back">
                    <ChevronLeft className="h-4 w-4 stroke-current" />
                  </button>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${cfg.color}`}>
                    <Icon className="h-3 w-3 stroke-current" />
                  </span>
                  <span className="text-[13px] font-bold text-foreground truncate">{selectedNode.name}</span>
                  <span className="text-[11px] text-muted-foreground font-normal">{cfg.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {workspaceMode === "view" && (<>
                    {canAdd && (
                      <button type="button" onClick={() => setWorkspaceMode("create")} className="h-7 px-2 rounded text-xs font-medium text-muted-foreground hover:bg-muted hover:bg-muted inline-flex items-center gap-1 transition-colors">
                        <Plus className="h-3.5 w-3.5 stroke-current" /> Add {childLabel}
                      </button>
                    )}
                    <button type="button" onClick={() => setWorkspaceMode("edit")}
                      className="h-7 px-2 rounded text-xs font-medium text-muted-foreground hover:bg-muted hover:bg-muted inline-flex items-center gap-1 transition-colors">
                      <Pencil className="h-3.5 w-3.5 stroke-current" /> Details
                    </button>
                  </>)}
                  {workspaceMode !== "view" && (<>
                    {(workspaceMode !== "edit" || (selectedNode.type !== "resourceGroup" && selectedNode.type !== "group")) && (
                      <button type="button" onClick={() => {
                        if (workspaceMode === "edit") { const route = entityRoutes[selectedNode.type]; if (route) navigate(route + selectedNode.id); }
                        if (workspaceMode === "create") { const route = ADD_ROUTES[selectedNode.type]; if (route) navigate(route); }
                      }} className="h-7 px-2 rounded text-xs font-medium text-success hover:bg-success hover:bg-success inline-flex items-center gap-1 transition-colors">Save</button>
                    )}
                    <button type="button" onClick={() => setWorkspaceMode("view")}
                      className="h-7 px-2 rounded text-xs font-medium text-muted-foreground hover:bg-muted hover:bg-muted inline-flex items-center gap-1 transition-colors"><X className="h-3.5 w-3.5 stroke-current" /> Cancel</button>
                  </>)}
                </div>
              </div>
            );
          })() : (
            <div className="h-10 flex items-center px-3 bg-muted bg-background">
              <span className="text-[13px] text-muted-foreground">Select a node</span>
            </div>
          )
        }
      >
        {isCompany ? (
          <CompanyDetailView />
        ) : (
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
        )}
      </TwoColumnPageTemplate>
    </>
  );
}
