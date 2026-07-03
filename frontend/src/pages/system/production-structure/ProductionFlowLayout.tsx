import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { Database, Factory, TrendingUpDown, Component, Dumbbell, RefreshCw, Plus, Pencil, Trash2, Check, X, Rocket } from "lucide-react";
import { SEED_GPT_LINE_MUTATION, CLEANUP_GPT_LINE_MUTATION } from "@/graphql/productionLineMutations";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PageToolbar, ToolbarSearch, ToolbarButton } from "@/components/layout/PageToolbar";
import { LEFT_COLUMN_WIDTH_CLASS } from "@/components/layout/layoutWidths";
import { useDataManagementOverview } from "@/hooks/useDataManagementOverview";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ENTITY_COLORS } from "./config/entityColors";
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
  assignedGroup: "line",
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

function normalizeFlowTreeNode<T extends { type: string; children?: T[] }>(node: T): T {
  const normalizedChildren = (node.children || []).flatMap((child) => {
    const normalizedChild = normalizeFlowTreeNode(child);
    if (normalizedChild.type === "assignedGroup" || normalizedChild.type === "department") {
      return normalizedChild.children || [];
    }
    return [normalizedChild];
  });

  return {
    ...node,
    children: normalizedChildren,
  };
}

export function ProductionFlowLayout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [seedGptMutation, { loading: seeding }] = useMutation<{ seedGptLine: { ok: boolean; messages?: string[] } }>(SEED_GPT_LINE_MUTATION);
  const [cleanupGptMutation, { loading: cleaning }] = useMutation<{ cleanupGptLine: { ok: boolean; messages?: string[] } }>(CLEANUP_GPT_LINE_MUTATION);
  const urlDepartmentId = searchParams.get("departmentId");
  const urlLineId = searchParams.get("productionLineId");
  const urlRgId = searchParams.get("resourceGroupId");
  const urlResourceId = searchParams.get("resourceId");

  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectionFilteredOut, setSelectionFilteredOut] = useState(false);

  const { data: overviewData, loading, refetch } = useDataManagementOverview({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    includeTree: true,
    deferTree: true,
    treeMode: "flow",
  });

  const treeData = useMemo(() => {
    if (!overviewData?.tree) return [];
    return [normalizeFlowTreeNode(overviewData.tree)];
  }, [overviewData?.tree]);

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
        if (node.type === "productionLine" || node.type === "line" || node.type === "assignedGroup") {
          const lineId = node.type === "assignedGroup" ? node.id.replace("assigned_", "") : node.id;
          navigate(`/system/production-structure/flow/line?productionLineId=${lineId}`, { replace: true });
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
          iconClass="bg-emerald-100 text-emerald-700 ring-emerald-200/50"
          title="Production Structure - Flow"
          subtitle="Manufacturing hierarchy explorer"
        />
        {toast && (
          <div className="absolute inset-x-0 top-0 flex items-center justify-center pointer-events-none" style={{ height: "100%" }}>
            <span className={`px-3 py-1 rounded text-xs font-medium pointer-events-auto ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
              {toast.message}
            </span>
          </div>
        )}
      </div>

      <PageToolbar
        leftWidthClass={LEFT_COLUMN_WIDTH_CLASS}
        leftSlot={
          <ToolbarSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search tree" />
        }
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 w-36 rounded-[2px] border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        }
        actions={
          <>
            {isEditingCompany ? (
              <>
                <ToolbarButton variant="edit" icon={<Check className="h-4 w-4" />} onClick={() => companyRef.current?.save()}>
                  Save
                </ToolbarButton>
                <ToolbarButton variant="danger" icon={<X className="h-4 w-4" />} onClick={() => companyRef.current?.cancel()}>
                  Cancel
                </ToolbarButton>
              </>
            ) : (
              <>
                <ToolbarButton variant="create" icon={<Plus className="h-4 w-4" />} onClick={handleNew} disabled={!selectedNode}>
                  New
                </ToolbarButton>
                <ToolbarButton variant="edit" icon={<Pencil className="h-4 w-4" />} onClick={() => companyRef.current?.startEditing()} disabled={!selectedNode}>
                  Edit
                </ToolbarButton>
                <ToolbarButton variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={handleDeleteNode} disabled={!canDelete}>
                  Delete
                </ToolbarButton>
              </>
            )}
          </>
        }
        rightActions={
          <>
            <ToolbarButton variant="neutral" icon={<RefreshCw className="h-4 w-4" />} onClick={() => refetch()}>
              Refresh
            </ToolbarButton>
            <ToolbarButton variant="neutral" icon={<Trash2 className="h-4 w-4" />} onClick={async () => {
              if (!window.confirm("This will delete ALL GPT line data (departments, RGs, resources, variant, PNs, BOM, line, bins). Continue?")) return;
              try {
                const { data } = await cleanupGptMutation();
                if (data?.cleanupGptLine?.ok) {
                  setToast({ message: "GPT line cleaned up!", type: "success" });
                  refetch();
                } else {
                  const msgs = data?.cleanupGptLine?.messages?.join("; ") || "Cleanup failed";
                  setToast({ message: msgs, type: "error" });
                }
              } catch (e) {
                setToast({ message: e instanceof Error ? e.message : "Cleanup failed", type: "error" });
              }
            }} disabled={cleaning}>
              {cleaning ? "Cleaning..." : "Cleanup GPT"}
            </ToolbarButton>
            <ToolbarButton variant="neutral" icon={<Rocket className="h-4 w-4" />} onClick={async () => {
              if (!window.confirm("This will reset the GPT line and overwrite existing data. Continue?")) return;
              try {
                const { data } = await seedGptMutation();
                if (data?.seedGptLine?.ok) {
                  setToast({ message: "GPT Line setup complete!", type: "success" });
                  refetch();
                } else {
                  const msgs = data?.seedGptLine?.messages?.join("; ") || "Setup failed";
                  setToast({ message: msgs, type: "error" });
                }
              } catch (e) {
                setToast({ message: e instanceof Error ? e.message : "Setup failed", type: "error" });
              }
            }} disabled={seeding}>
              {seeding ? "Setting up..." : "GPT Setup"}
            </ToolbarButton>
            {selectionFilteredOut && <span className="ml-2 text-[11px] text-slate-500">Selection filtered out</span>}
          </>
        }
      />

      {/* Content - fixed 20/80 split */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tree column */}
        <div className={`flex flex-col min-h-0 overflow-hidden border-r border-slate-300 bg-slate-50 ${LEFT_COLUMN_WIDTH_CLASS}`}>
          <div className="flex-1 min-h-0 overflow-auto">
            <TreeNavigation
              data={treeData || []} selectedKey={selectedNodeKey} expandedSet={expandedSet}
              onToggleNode={handleToggleNode} onSelectNode={handleSelectNode}
              onContextMenu={() => {}} isLoading={loading && !treeData.length}
            />
          </div>
          <div className="flex h-7 shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100/70 px-2.5 text-[10px] font-medium text-slate-500">
            <span>{totalTreeNodes} structure nodes</span>
            <span>{selectedPath.length ? `Depth ${selectedPath.length}` : "No selection"}</span>
          </div>
        </div>



        {/* Detail column */}
        <div className="flex flex-col min-h-0 min-w-0 flex-1 bg-slate-50">
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
            <div className="flex flex-1 flex-col items-center justify-center text-slate-500 gap-2">
              <Database className="h-8 w-8 stroke-current text-slate-500" />
              <span className="text-sm font-medium">Select an element from the production structure</span>
              <span className="text-xs">Click on a node in the tree to view its details</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer — Flow Legend */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 flex h-10 items-center gap-5 px-4 text-xs text-slate-600 font-medium">
        <span className="flex items-center gap-1.5"><Factory className={`h-3.5 w-3.5 ${ENTITY_COLORS.plant.iconFg} stroke-current`} /> Plant</span>
        <span className="flex items-center gap-1.5"><TrendingUpDown className={`h-3.5 w-3.5 ${ENTITY_COLORS.line.iconFg} stroke-current`} /> Line</span>
        <span className="flex items-center gap-1.5"><Component className={`h-3.5 w-3.5 ${ENTITY_COLORS.resourceGroup.iconFg} stroke-current`} /> Assigned RG</span>
        <span className="flex items-center gap-1.5"><Component className={`h-3.5 w-3.5 ${ENTITY_COLORS.resourceGroup.iconFg} stroke-current`} /> RG</span>
        <span className="flex items-center gap-1.5"><Dumbbell className={`h-3.5 w-3.5 ${ENTITY_COLORS.resource.iconFg} stroke-current`} /> Resource</span>
      </div>
    </div>
  );
}
