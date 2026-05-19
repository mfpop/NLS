import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Database, Factory, TrendingUpDown, Layers, Component, Dumbbell, X, Search, RefreshCw, GripVertical, Plus, Pencil, Trash2, Check } from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { theme } from "../../../styles/themeTokens";
import { useDataManagementOverview } from "@/hooks/useDataManagementOverview";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { TreeNavigation } from "./components/TreeNavigation";
import { CompanyDetailView } from "./components/CompanyDetailView";
import { PlantDetailView } from "./components/PlantDetailView";
import { NodeDetailPanel } from "./components/NodeDetailPanel";
import { FlowEmbeddedDetail, type FlowEmbeddedDetailKind } from "./FlowEmbeddedDetail";
import { findNodeByKey, findNodePathByKey, ADD_ROUTES } from "./config";

const TYPE_ROUTE: Record<string, string> = {
  company: "company",
  plant: "plants",
  productionLine: "line",
  department: "dept",
  resourceGroup: "rg",
  resource: "resource",
  lineGroup: "line",
};

function getKeyType(key: string): string {
  const segment = key.split("/").pop() || key;
  return segment.split(":")[0] || "";
}

function getParentKey(key: string): string | null {
  const lastSlash = key.lastIndexOf("/");
  return lastSlash > -1 ? key.substring(0, lastSlash) : null;
}

function getAncestorKeys(key: string): string[] {
  const ancestors: string[] = [];
  let parent = getParentKey(key);
  while (parent) {
    ancestors.unshift(parent);
    parent = getParentKey(parent);
  }
  return ancestors;
}

export function ProductionFlowLayout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlDepartmentId = searchParams.get("departmentId");
  const urlLineId = searchParams.get("productionLineId");
  const urlRgId = searchParams.get("resourceGroupId");
  const urlResourceId = searchParams.get("resourceId");

  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [treePct, setTreePct] = useState(20);
  const [selectionFilteredOut, setSelectionFilteredOut] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setTreePct(Math.min(Math.max(pct, 20), 50));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const { data: overviewData, loading, refetch } = useDataManagementOverview({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    includeTree: true,
    deferTree: true,
  });

  const treeData = overviewData?.tree ? [overviewData.tree] : [];

  const selectedNode = selectedNodeKey ? findNodeByKey(treeData, selectedNodeKey) : null;
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
  const totalTreeNodes = contextCounts
    ? 1 + contextCounts.plants + contextCounts.lines + contextCounts.departments + contextCounts.groups + contextCounts.resources
    : treeData.length;

  useEffect(() => {
    if (overviewData?.tree && expandedSet.size === 0 && overviewData.tree.children.length > 0) {
      const rootKey = `${overviewData.tree.type}:${overviewData.tree.id}`;
      setExpandedSet(new Set([rootKey]));
    }
  }, [overviewData?.tree]);

  useEffect(() => {
    if (!selectedNodeKey) {
      setSelectionFilteredOut(false);
      return;
    }
    const exists = treeData.length > 0 ? findNodeByKey(treeData, selectedNodeKey) : null;
    setSelectionFilteredOut(!exists && !loading);
    if (!exists && !loading) setSelectedNodeKey(null);
  }, [treeData, selectedNodeKey, loading]);

  const handleToggleNode = useCallback((key: string) => {
    setExpandedSet((prev) => {
      const type = getKeyType(key);
      const ancestors = getAncestorKeys(key);

      if (prev.has(key)) {
        const next = new Set(prev);
        next.delete(key);
        if (type === "plant") {
          for (const expandedKey of next) {
            if (expandedKey.startsWith(`${key}/`)) next.delete(expandedKey);
          }
        }
        return next;
      }

      const next = new Set(ancestors);
      next.add(key);

      if (type === "plant") {
        return next;
      }

      if (type === "productionLine" || type === "line") {
        return next;
      }

      const parentKey = getParentKey(key);
      if (parentKey) next.add(parentKey);
      return next;
    });
  }, []);

  const handleSelectNode = useCallback((key: string | null) => {
    setSelectedNodeKey(key);
    if (key && treeData.length) {
      const node = findNodeByKey(treeData, key);
      if (node) {
        if (node.type === "department") {
          navigate(`/system/production-structure/flow/dept?departmentId=${node.id}`, { replace: true });
          return;
        }
        if (node.type === "productionLine" || node.type === "line") {
          navigate(`/system/production-structure/flow/line?productionLineId=${node.id}`, { replace: true });
          return;
        }
        if (node.type === "resourceGroup" || node.type === "group") {
          navigate(`/system/production-structure/flow/rg?resourceGroupId=${node.id}`, { replace: true });
          return;
        }
        if (node.type === "resource") {
          navigate(`/system/production-structure/flow/resource?resourceId=${node.id}`, { replace: true });
          return;
        }
        const route = TYPE_ROUTE[node.type];
        if (route) {
          navigate(`/system/production-structure/flow/${route}`, { replace: true });
          return;
        }
      }
    }
    navigate("/system/production-structure/flow/company", { replace: true });
  }, [navigate, treeData]);

  const handleNew = useCallback(() => {
    const route = ADD_ROUTES[selectedNode?.type || "company"];
    if (route) navigate(route);
  }, [selectedNode, navigate]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    const route = ADD_ROUTES[selectedNode.type];
    if (route) navigate(route);
  }, [selectedNode, navigate]);

  const canDelete = !!selectedNode && selectedNode.type !== "company" && selectedNode.type !== "lineGroup";

  const embeddedDetailKind: FlowEmbeddedDetailKind | null = urlDepartmentId
    ? "department"
    : urlLineId
      ? "line"
      : urlRgId
        ? "rg"
        : urlResourceId
          ? "resource"
          : selectedNode?.type === "department"
            ? "department"
            : selectedNode?.type === "productionLine" || selectedNode?.type === "line"
              ? "line"
              : selectedNode?.type === "resourceGroup" || selectedNode?.type === "group"
                ? "rg"
                : selectedNode?.type === "resource"
                  ? "resource"
                  : null;
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const companyRef = useRef<{ startEditing: () => void; save: () => Promise<void>; cancel: () => void }>(null);
  const flowToolbarButtonClass = "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:bg-transparent disabled:text-muted-foreground disabled:opacity-70 dark:disabled:text-muted-foreground";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <div className="relative">
        <PageHeader
          icon={<Database className="h-5 w-5 stroke-current" />}
          iconClass={theme.iconBoxEmerald}
          title="Production Structure - Flow"
          subtitle="Manufacturing hierarchy explorer"
        />
        {toast && (
          <div className="absolute inset-x-0 top-0 flex items-center justify-center pointer-events-none" style={{ height: "100%" }}>
            <span className={`px-3 py-1 rounded text-xs font-medium pointer-events-auto ${toast.type === "success" ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground"}`}>
              {toast.message}
            </span>
          </div>
        )}
      </div>

      {/* Toolbar - Windows Explorer style */}
      <div className="flex h-9 shrink-0 select-none items-center gap-2 border-b border-border/35 bg-muted px-3">
        <div className="flex h-full items-center gap-2 pr-2" style={{ flexBasis: `${treePct}%`, minWidth: 200 }}>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search"
              className="h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25" />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
                <X className="h-3.5 w-3.5 stroke-current" />
              </button>
            )}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 w-24 shrink-0 cursor-pointer rounded border border-border/30 bg-transparent px-2 text-xs text-muted-foreground outline-none transition-colors focus:border-border/50 focus:ring-1 focus:ring-border/25">
            <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="h-5 w-px shrink-0 bg-border/25" />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
        {isEditingCompany ? (
          <>
            <button type="button" onClick={() => companyRef.current?.save()} title="Save"
              className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-[11px] font-medium text-success transition-colors hover:bg-success/12">
              <Check className="h-4 w-4 stroke-current" />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button type="button" onClick={() => companyRef.current?.cancel()} title="Cancel"
              className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted">
              <X className="h-4 w-4 stroke-current" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={handleNew} title="New"
              className={flowToolbarButtonClass}>
              <Plus className="h-4 w-4 stroke-current" />
              <span>New</span>
            </button>
            <button type="button" onClick={() => companyRef.current?.startEditing()} title="Edit" disabled={!selectedNode}
              className={flowToolbarButtonClass}>
              <Pencil className="h-4 w-4 stroke-current" />
              <span>Edit</span>
            </button>
            <button type="button" onClick={handleDeleteNode} title="Delete" disabled={!canDelete}
              className={flowToolbarButtonClass}>
              <Trash2 className="h-4 w-4 stroke-current" />
              <span>Delete</span>
            </button>
            <span className="mx-1 h-5 w-px bg-muted shrink-0" />
            <button type="button" onClick={() => refetch()} title="Refresh"
              className={flowToolbarButtonClass}>
              <RefreshCw className={`h-4 w-4 stroke-current ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </>
        )}
        {selectionFilteredOut && <span className="ml-2 text-[11px] text-muted-foreground">Selection filtered out</span>}
        </div>
      </div>

      {/* Content - resizable split */}
      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tree column */}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-border/20 bg-card/40" style={{ flexBasis: `${treePct}%`, minWidth: 200 }}>
          <div className="flex-1 min-h-0 overflow-auto">
            <TreeNavigation
              data={treeData || []} selectedKey={selectedNodeKey} expandedSet={expandedSet}
              onToggleNode={handleToggleNode} onSelectNode={handleSelectNode}
              onContextMenu={() => {}} isLoading={loading && !treeData.length}
            />
          </div>
          <div className="flex h-7 shrink-0 items-center justify-between border-t border-border/15 bg-muted/70 px-2.5 text-[10px] font-medium text-muted-foreground">
            <span>{totalTreeNodes} structure nodes</span>
            <span>{selectedPath.length ? `Depth ${selectedPath.length}` : "No selection"}</span>
          </div>
        </div>

        {/* Resizable divider */}
        <div onMouseDown={handleSplitMouseDown}
          className="flex shrink-0 cursor-col-resize items-center justify-center bg-muted transition-colors hover:bg-primary"
          style={{ width: 4 }}>
          <GripVertical className="h-3 w-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Detail column */}
        <div className="flex flex-col min-h-0 min-w-0" style={{ flex: 1 }}>
          {embeddedDetailKind ? (
            <FlowEmbeddedDetail kind={embeddedDetailKind} />
          ) : selectedNode ? (
            selectedNode.type === "company" ? (
              <CompanyDetailView ref={companyRef} simple onEditChange={setIsEditingCompany} />
            ) : selectedNode.type === "plant" ? (
              <PlantDetailView plantId={selectedNode.id} />
            ) : (
              <NodeDetailPanel
                selectedNode={selectedNode}
                selectedNodeKey={selectedNodeKey}
                selectedPath={selectedPath}
                contextCounts={contextCounts}
                workspaceMode="view"
              />
            )
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground gap-2">
              <Database className="h-8 w-8 stroke-current text-muted-foreground" />
              <span className="text-sm font-medium">Select an element from the production structure</span>
              <span className="text-xs">Click on a node in the tree to view its details</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
        <span className="flex items-center gap-1.5"><Factory className="h-3.5 w-3.5 text-entity-plant stroke-current" /> Plant</span>
        <span className="flex items-center gap-1.5"><TrendingUpDown className="h-3.5 w-3.5 text-entity-line stroke-current" /> Line</span>
        <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-entity-department stroke-current" /> Dept</span>
        <span className="flex items-center gap-1.5"><Component className="h-3.5 w-3.5 text-entity-resource-group stroke-current" /> RG</span>
        <span className="flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5 text-entity-resource stroke-current" /> Resource</span>
      </div>
    </div>
  );
}
