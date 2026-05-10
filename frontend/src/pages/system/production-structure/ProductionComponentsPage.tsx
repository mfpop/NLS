import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import {
  Factory, X, GripVertical, TrendingUpDown, Layers, Component, Dumbbell, Pencil, RefreshCw, Plus, Trash2, Calendar, Check
} from "lucide-react";
import { Pagination, EntityToolbar, NodeDetailPanel, CompanyDetailView, PlantDetailView } from "./components";
import { UnifiedModal } from "./components/UnifiedModal";
import { PlantSummary } from "./components/SummaryBlock";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { usePlants, EMPTY_FORM, TIMEZONE_OPTIONS } from "@/hooks/usePlants";
import { useProductionLines } from "@/hooks/useProductionLines";
import { useDepartments } from "@/hooks/useDepartments";
import { useProductionStructureTree } from "@/hooks/useProductionStructureTree";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { getEntityIconProps, saveEntityConfig } from "./entityDisplay";
import { PageHeader } from "@/pages/shared/PageHeader";
import type { Plant } from "@/types/plant";
import { COMPANY_QUERY } from "@/graphql/companyQueries";
import { RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { ENTITY_CONFIG, ADD_ROUTES } from "./config/entityConfig";
const PER_PAGE = 10;

type DetailTreeNode = DataManagementTreeChild & { metadata?: Record<string, unknown> };

const ADD_CHILD_ROUTES: Record<string, string> = {
  plant: "/system/production-structure/production-lines",
  productionLine: "/system/production-structure/departments",
  department: "/system/production-structure/resource-groups",
  resourceGroup: "/system/production-structure/resources",
};

function EntityCard({ icon, iconBg, name, code, status, subtitle, metrics, selected, onClick, selectedClass }: {
  icon: React.ReactNode; iconBg?: string; name: string; code?: string;
  status: string; subtitle?: string; metrics?: { icon?: React.ComponentType<{ className?: string }>; label?: string; value: string | number; color?: string }[];
  selected?: boolean; onClick?: () => void; selectedClass?: string;
}) {
  const isActive = status === "active";
  return (
    <div className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors ${selected ? (selectedClass || "bg-blue-100/60 dark:bg-blue-900/30") : "hover:bg-blue-50/40 dark:hover:bg-slate-800/40"}`} onClick={onClick}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${iconBg || "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[13px] font-medium ${theme.textPrimary}`}>{name}</span>
          {code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{code}</span>}
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${isActive ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />{status}
          </span>
        </div>
        {subtitle && <div className={`text-[11px] truncate ${theme.textMuted}`}>{subtitle}</div>}
        {metrics && metrics.length > 0 && (
          <div className="mt-0.5 flex items-center gap-2">
            {metrics.map((m, idx) => {
              const MetricIcon = m.icon;
              return MetricIcon ? (
                <span key={idx} className="inline-flex items-center gap-1" title={`${m.value}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded ${m.color ? `${m.color} bg-opacity-100` : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
                    <MetricIcon className="h-2.5 w-2.5 stroke-current" />
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{m.value}</span>
                </span>
              ) : (
                <span key={idx}>{idx > 0 && <span className="mx-1.5 text-gray-400 dark:text-gray-600">|</span>}{m.label}: {m.value}</span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function summarizeLineCounts(lines: any[] = []) {
  return lines.reduce((totals, line) => {
    const departments = line.departments ?? [];
    const groupCount = departments.reduce((count: number, department: any) => count + (department.resourceGroups?.length ?? 0), 0);
    const resourceCount = departments.reduce(
      (count: number, department: any) => count + (department.resourceGroups ?? []).reduce((groupTotal: number, group: any) => groupTotal + (group.resources?.length ?? 0), 0),
      0,
    );
    totals.departmentCount += departments.length;
    totals.groupCount += groupCount;
    totals.resourceCount += resourceCount;
    return totals;
  }, { departmentCount: 0, groupCount: 0, resourceCount: 0 });
}

function createDetailNode(base: { id: string; name: string; code?: string; status?: string }, type: string, metadata: Record<string, unknown>, children: DetailTreeNode[] = []): DetailTreeNode {
  return {
    id: base.id,
    type,
    name: base.name,
    code: base.code || "",
    status: base.status || "active",
    childCount: children.length,
    children,
    metadata,
  };
}

function buildResourceNode(resource: any, group: any, department: any, plant: any): DetailTreeNode {
  return createDetailNode(resource, "resource", {
    ...resource,
    groupName: group.name,
    groupId: group.id,
    departmentName: department.name,
    departmentId: department.id,
    plantName: plant.name,
    plantId: plant.id,
  });
}

function buildGroupNode(group: any, department: any, plant: any): DetailTreeNode {
  const children = (group.resources ?? []).map((resource: any) => buildResourceNode(resource, group, department, plant));
  return createDetailNode(group, "resourceGroup", {
    ...group,
    departmentName: department.name,
    departmentId: department.id,
    plantName: plant.name,
    plantId: plant.id,
    resourceCount: group.resourceCount ?? children.length,
  }, children);
}

function buildDepartmentNode(department: any, line: any, plant: any): DetailTreeNode {
  const children = (department.resourceGroups ?? []).map((group: any) => buildGroupNode(group, department, plant));
  const resourceCount = children.reduce((count: number, group: DetailTreeNode) => count + (group.children?.length ?? 0), 0);
  return createDetailNode(department, "department", {
    ...department,
    plantName: plant.name,
    plantId: plant.id,
    lineName: line.name,
    lineId: line.id,
    groupCount: department.groupCount ?? children.length,
    resourceCount: department.resourceCount ?? resourceCount,
  }, children);
}

function buildLineNode(line: any, plant: any): DetailTreeNode {
  const children = (line.departments ?? []).map((department: any) => buildDepartmentNode(department, line, plant));
  const counts = summarizeLineCounts([line]);
  return createDetailNode(line, "productionLine", {
    ...line,
    plantName: plant.name,
    plantId: plant.id,
    departmentCount: line.departmentCount ?? counts.departmentCount,
    groupCount: line.groupCount ?? counts.groupCount,
    resourceCount: line.resourceCount ?? counts.resourceCount,
  }, children);
}

function buildPlantNode(plantEntity: any, structureTree: any): DetailTreeNode | null {
  if (!plantEntity && !structureTree) return null;

  const plant = {
    id: plantEntity?.id ?? structureTree?.id,
    name: plantEntity?.name ?? structureTree?.name,
    code: plantEntity?.code ?? structureTree?.code,
    status: plantEntity?.status ?? structureTree?.status,
  };

  if (!plant.id) return null;

  const children = (structureTree?.productionLines ?? []).map((line: any) => buildLineNode(line, plant));
  const counts = summarizeLineCounts(structureTree?.productionLines ?? []);

  return createDetailNode(plant, "plant", {
    ...structureTree,
    ...plantEntity,
    lineCount: plantEntity?.lineCount ?? children.length,
    departmentCount: plantEntity?.departmentCount ?? counts.departmentCount,
    groupCount: plantEntity?.groupCount ?? counts.groupCount,
    resourceCount: plantEntity?.resourceCount ?? counts.resourceCount,
  }, children);
}

function findNodePath(root: DetailTreeNode | null, matcher: (node: DetailTreeNode) => boolean): DetailTreeNode[] | null {
  if (!root) return null;
  if (matcher(root)) return [root];
  for (const child of root.children ?? []) {
    const childPath = findNodePath(child as DetailTreeNode, matcher);
    if (childPath) return [root, ...childPath];
  }
  return null;
}

function buildSyntheticPath(root: DetailTreeNode | null, entityType: string, selectedEntity: any): DetailTreeNode[] | null {
  if (!root || !selectedEntity) return null;

  if (entityType === "plant") {
    return [createDetailNode(selectedEntity, entityType, selectedEntity)];
  }

  if (entityType === "productionLine") {
    return [
      root,
      createDetailNode(selectedEntity, entityType, { ...selectedEntity, plantName: root.name, plantId: root.id }),
    ];
  }

  if (entityType === "department") {
    const linePath = selectedEntity.lineName
      ? findNodePath(root, (node) => node.type === "productionLine" && node.name === selectedEntity.lineName)
      : null;

    if (linePath) {
      return [
        ...linePath,
        createDetailNode(selectedEntity, entityType, selectedEntity),
      ];
    }
  }

  if (entityType === "resourceGroup") {
    const departmentPath = findNodePath(root, (node) =>
      node.type === "department" && (
        (selectedEntity.departmentId && node.id === selectedEntity.departmentId) ||
        (selectedEntity.departmentName && node.name === selectedEntity.departmentName)
      ),
    );

    if (departmentPath) {
      return [
        ...departmentPath,
        createDetailNode(selectedEntity, entityType, selectedEntity),
      ];
    }
  }

  if (entityType === "resource") {
    const groupPath = findNodePath(root, (node) =>
      (node.type === "resourceGroup" || node.type === "group") && (
        (selectedEntity.groupId && node.id === selectedEntity.groupId) ||
        (selectedEntity.groupName && node.name === selectedEntity.groupName)
      ),
    );

    if (groupPath) {
      return [
        ...groupPath,
        createDetailNode(selectedEntity, entityType, selectedEntity),
      ];
    }
  }

  return null;
}

function useDetailTreeContext(entityType: string, selectedEntity: any, plants: Array<{ id: string; name: string; code?: string }>, plantId?: string | null) {
  const resolvedPlantId = useMemo(() => {
    if (entityType === "plant") return selectedEntity?.id || plantId || "";
    if (plantId && plants.some((plant) => plant.id === plantId)) return plantId;

    const matchingPlant = plants.find((plant) =>
      (selectedEntity?.plantName && plant.name === selectedEntity.plantName) ||
      (selectedEntity?.plantCode && plant.code === selectedEntity.plantCode),
    );

    return matchingPlant?.id || plantId || "";
  }, [entityType, plantId, plants, selectedEntity]);

  const { data: structureTree } = useProductionStructureTree(resolvedPlantId);

  return useMemo(() => {
    if (!selectedEntity) {
      return { selectedNode: null, selectedPath: undefined as DetailTreeNode[] | undefined, selectedNodeKey: null as string | null };
    }

    const rootNode = buildPlantNode(
      entityType === "plant"
        ? selectedEntity
        : { id: resolvedPlantId || plantId, name: selectedEntity.plantName, code: selectedEntity.plantCode, status: "active" },
      structureTree,
    );

    const matchedPath = findNodePath(rootNode, (node) => {
      if (node.type !== entityType) return false;
      if (selectedEntity.id && node.id === selectedEntity.id) return true;
      if (selectedEntity.code && node.code && node.code === selectedEntity.code) return true;
      if (selectedEntity.name && node.name === selectedEntity.name) return true;
      return false;
    });

    const resolvedPath = matchedPath && matchedPath.length > 0
      ? matchedPath
      : buildSyntheticPath(rootNode, entityType, selectedEntity);

    if (resolvedPath && resolvedPath.length > 0) {
      const selectedNode = resolvedPath[resolvedPath.length - 1];
      const mergedSelectedNode: DetailTreeNode = {
        ...selectedNode,
        metadata: { ...(selectedNode.metadata ?? {}), ...selectedEntity },
      };
      const selectedPath = [...resolvedPath.slice(0, -1), mergedSelectedNode];
      return {
        selectedNode: mergedSelectedNode,
        selectedPath,
        selectedNodeKey: `tree/${selectedPath.map((node) => node.id).join("/")}`,
      };
    }

    const fallbackNode = createDetailNode(selectedEntity, entityType, selectedEntity);
    return {
      selectedNode: fallbackNode,
      selectedPath: [fallbackNode],
      selectedNodeKey: `tree/${selectedEntity.id}`,
    };
  }, [entityType, plantId, resolvedPlantId, selectedEntity, structureTree]);
}

function DetailColumnContent({
  selectedEntity,
  selectedNode,
  selectedPath,
  selectedNodeKey,
  onClose,
  emptyMessage,
  onAddChild,
}: {
  selectedEntity: any;
  selectedNode: DetailTreeNode | null;
  selectedPath?: DetailTreeNode[];
  selectedNodeKey: string | null;
  onClose: () => void;
  emptyMessage: string;
  onAddChild?: () => void;
}) {
  if (!selectedEntity || !selectedNode) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center"><p className={`text-xs ${theme.textMuted}`}>{emptyMessage}</p></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 m-0 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedEntity.name}</span>
          {selectedEntity.code && <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{selectedEntity.code}</span>}
        </div>
        <button type="button" onClick={onClose} className="rounded p-0.5 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5 stroke-current" /></button>
      </div>
      <NodeDetailPanel
        selectedNode={selectedNode}
        selectedNodeKey={selectedNodeKey}
        selectedPath={selectedPath}
        workspaceMode="view"
        onAddChild={onAddChild}
      />
    </div>
  );
}


function PlantsViewMode({ selectedId, onSelect, onEdit, detailItem, search, onSearchChange, statusFilter, onStatusFilterChange, onNavigateToLine }: {
  selectedId: string | null; onSelect: (id: string | null) => void; onEdit: (plant: Plant) => void;
  detailItem: any; search: string; onSearchChange: (v: string) => void; statusFilter: string; onStatusFilterChange: (v: string) => void;
  onNavigateToLine?: (lineId: string) => void;
}) {
  const navigate = useNavigate();
  const { plants, loading, refetch } = usePlants();
  const [page, setPage] = useState(1);
  const [detailPct, setDetailPct] = useState(85);
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const handleDetailDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = detailContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { const pct = ((ev.clientX - rect.left) / rect.width) * 100; setDetailPct(Math.min(Math.max(100 - pct, 15), 85)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);
  useEffect(() => { setPage(1); }, [search, statusFilter]);
  const filtered = plants.filter((p) => statusFilter === "all" || p.status === statusFilter).filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const openAdd = () => onEdit({} as Plant);
  const selectedPlant = selectedId ? plants.find((p) => p.id === selectedId) : null;
  const plantDetailRef = useRef<{ save: () => Promise<void>; cancel: () => void }>(null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      {editingPlantId ? (
        <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]" style={{ height: 40 }}>
          <button type="button" title="Refresh plant data" onClick={() => refetch()} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
            <RefreshCw className="h-3.5 w-3.5 stroke-current" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
          <button type="button" title="Save changes" disabled={saving} onClick={async () => { setSaving(true); try { await plantDetailRef.current?.save(); setEditingPlantId(null); } finally { setSaving(false); } }} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 transition-colors">
            <Check className="h-3.5 w-3.5 stroke-current" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button type="button" title="Cancel editing" onClick={() => { plantDetailRef.current?.cancel(); setEditingPlantId(null); }} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
            <X className="h-3.5 w-3.5 stroke-current" />
            <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      ) : (
        <EntityToolbar
          onBack={() => navigate("/system/production-structure")}
          onAdd={openAdd}
          onEdit={selectedPlant ? () => setEditingPlantId(selectedPlant.id) : undefined}
          onDelete={undefined}
          hasSelected={!!selectedPlant}
          onRefresh={() => refetch()}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          search={search}
          onSearchChange={onSearchChange}
        />
      )}
      <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: `${100 - detailPct}%`, minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto p-2 m-0 bg-white dark:bg-slate-900">
            {loading && plants.length === 0 ? (
              <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading plants...</div>
            ) : filtered.length === 0 ? (
              <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><Factory className="h-5 w-5 stroke-current" /></div>
                <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>{search ? "No plants match your search" : "No plants configured"}</h3>
                <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Add your first plant to start modeling your production structure.</p>
              </div>
            ) : (
              <div className="space-y-px">{paginated.map((plant) => {
                const { textColor, bgColor } = getEntityIconProps("plant", plant.id);
                return (
                  <EntityCard key={plant.id} icon={<Factory className={`h-5 w-5 stroke-current ${textColor}`} />} iconBg={bgColor}
                    name={plant.name} code={plant.code} status={plant.status}
                    metrics={[{ icon: TrendingUpDown, value: plant.lineCount ?? 0, color: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" }, { icon: Layers, value: plant.departmentCount ?? 0, color: "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" }, { icon: Component, value: plant.groupCount ?? 0, color: "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" }, { icon: Dumbbell, value: plant.resourceCount ?? 0, color: "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" }]}
                    selected={selectedId === plant.id} onClick={() => onSelect(plant.id)} selectedClass="bg-blue-100/60 dark:bg-blue-900/30" />
                );
              })}</div>
            )}
            <div className="mt-3"><Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} /></div>
          </div>
        </div>
        <div onMouseDown={handleDetailDividerDown} className="flex shrink-0 cursor-col-resize items-center justify-center bg-slate-200/60 hover:bg-blue-300/60 dark:bg-slate-700/60 dark:hover:bg-blue-500/30 transition-colors" style={{ width: 4 }}>
          <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flexBasis: `${detailPct}%`, minWidth: 0 }}>
          {detailItem ? (
            <PlantDetailView
              ref={plantDetailRef}
              plantId={detailItem.id}
              editing={editingPlantId === detailItem.id}
              onEditToggle={(v) => setEditingPlantId(v ? detailItem.id : null)}
              onNavigateToLine={onNavigateToLine}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900">
              <div className="text-center"><p className={`text-xs ${theme.textMuted}`}>Select a plant to view details</p></div>
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]">
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

function LinesViewMode({ selectedId, onSelect, search, onSearchChange, statusFilter, onStatusFilterChange, plants }: {
  selectedId: string | null; onSelect: (id: string | null) => void; search: string; onSearchChange: (v: string) => void;
  statusFilter: string; onStatusFilterChange: (v: string) => void; plants: any[];
}) {
  const navigate = useNavigate();
  const { lines, loading, refetch } = useProductionLines();
  const [plantFilterValue, setPlantFilterValue] = useState("all");
  const [detailPct, setDetailPct] = useState(75);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const handleDetailDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = detailContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { const pct = ((ev.clientX - rect.left) / rect.width) * 100; setDetailPct(Math.min(Math.max(100 - pct, 15), 85)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);
  const selectedLine = selectedId ? lines.find((l) => l.id === selectedId) ?? null : null;
  const filtered = lines.filter((l) => (statusFilter === "all" || l.status === statusFilter) && (plantFilterValue === "all" || l.plantId === plantFilterValue)).filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()));
  const plantFilterOptions = [{ label: "All Plants", value: "all" }, ...plants.map((p) => ({ label: p.name, value: p.id }))];
  const { selectedNode, selectedPath, selectedNodeKey } = useDetailTreeContext("productionLine", selectedLine, plants, selectedLine?.plantId);
  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <EntityToolbar
        onBack={() => navigate("/system/production-structure")}
        onAdd={() => navigate("/system/production-structure/production-lines")}
        onEdit={selectedLine ? () => navigate(`/system/production-structure/production-lines/${selectedLine.id}`) : undefined}
        onDelete={undefined}
        hasSelected={!!selectedLine}
        onRefresh={() => refetch()}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        search={search}
        onSearchChange={onSearchChange}
        plantFilter={{ value: plantFilterValue, onChange: setPlantFilterValue, options: plantFilterOptions }}
      />
      <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto p-3 m-0 bg-white dark:bg-slate-900">
            {loading ? <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading lines...</div>
            : filtered.length === 0 ? (
              <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><TrendingUpDown className="h-5 w-5 stroke-current" /></div>
                <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>No production lines</h3><p className={`mt-1 text-xs ${theme.textSecondary}`}>No lines match your criteria.</p>
              </div>
            ) : (
              <div className="space-y-px">{filtered.map((line) => (
                <EntityCard key={line.id} icon={<TrendingUpDown className="h-5 w-5 stroke-current text-amber-600 dark:text-amber-400" />} iconBg="bg-amber-50 dark:bg-amber-500/10"
                  name={line.name} code={line.code} status={line.status} subtitle={line.plantName ? `Plant: ${line.plantName}` : undefined}
                  metrics={[{ label: "Departments", value: line.departmentCount ?? 0 }, { label: "Groups", value: line.groupCount ?? 0 }, { label: "Resources", value: line.resourceCount ?? 0 }]}
                  selected={selectedId === line.id} onClick={() => onSelect(line.id)} selectedClass="bg-amber-100/60 dark:bg-amber-900/30" />
              ))}</div>
            )}
          </div>
        </div>
        <div onMouseDown={handleDetailDividerDown} className="flex shrink-0 cursor-col-resize items-center justify-center bg-slate-200/60 hover:bg-blue-300/60 dark:bg-slate-700/60 dark:hover:bg-blue-500/30 transition-colors" style={{ width: 4 }}>
          <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flexBasis: `${detailPct}%`, minWidth: 0 }}>
          <DetailColumnContent
            selectedEntity={selectedLine}
            selectedNode={selectedNode}
            selectedPath={selectedPath}
            selectedNodeKey={selectedNodeKey}
            onClose={() => onSelect(null)}
            emptyMessage="Select a line to view details"
            onAddChild={() => navigate(ADD_CHILD_ROUTES.productionLine)}
          />
        </div>
      </div>
      <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]">
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

function DeptsViewMode({ selectedId, onSelect, search, onSearchChange, statusFilter, onStatusFilterChange, plants }: {
  selectedId: string | null; onSelect: (id: string | null) => void; search: string; onSearchChange: (v: string) => void;
  statusFilter: string; onStatusFilterChange: (v: string) => void; plants: any[];
}) {
  const navigate = useNavigate();
  const { departments, loading, refetch: refetchDepts } = useDepartments();
  const [plantFilterValue, setPlantFilterValue] = useState("all");
  const [detailPct, setDetailPct] = useState(75);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const handleDetailDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = detailContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { const pct = ((ev.clientX - rect.left) / rect.width) * 100; setDetailPct(Math.min(Math.max(100 - pct, 15), 85)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);
  const selectedDept = selectedId ? departments.find((d) => d.id === selectedId) ?? null : null;
  const filtered = departments.filter((d) => (statusFilter === "all" || d.status === statusFilter) && (plantFilterValue === "all" || d.plantId === plantFilterValue)).filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));
  const plantFilterOptions = [{ label: "All Plants", value: "all" }, ...plants.map((p) => ({ label: p.name, value: p.id }))];
  const { selectedNode, selectedPath, selectedNodeKey } = useDetailTreeContext("department", selectedDept, plants, selectedDept?.plantId);
  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <EntityToolbar
        onBack={() => navigate("/system/production-structure")}
        onAdd={() => navigate("/system/production-structure/departments")}
        onEdit={selectedDept ? () => navigate(`/system/production-structure/departments/${selectedDept.id}`) : undefined}
        onDelete={undefined}
        hasSelected={!!selectedDept}
        onRefresh={() => refetchDepts()}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        search={search}
        onSearchChange={onSearchChange}
        plantFilter={{ value: plantFilterValue, onChange: setPlantFilterValue, options: plantFilterOptions }}
      />
      <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto p-3 m-0 bg-white dark:bg-slate-900">
            {loading ? <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading departments...</div>
            : filtered.length === 0 ? (
              <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><Layers className="h-5 w-5 stroke-current" /></div>
                <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>No departments</h3><p className={`mt-1 text-xs ${theme.textSecondary}`}>No departments match your criteria.</p>
              </div>
            ) : (
              <div className="space-y-px">{filtered.map((dept) => (
                <EntityCard key={dept.id} icon={<Layers className="h-5 w-5 stroke-current text-purple-600 dark:text-purple-400" />} iconBg="bg-purple-50 dark:bg-purple-500/10"
                  name={dept.name} code={dept.code} status={dept.status} subtitle={dept.manager ? `Manager: ${dept.manager}` : undefined}
                  metrics={[{ label: "Employees", value: dept.employees }, { label: "Groups", value: dept.groupCount }, { label: "Resources", value: dept.resourceCount }]}
                  selected={selectedId === dept.id} onClick={() => onSelect(dept.id)} selectedClass="bg-purple-100/60 dark:bg-purple-900/30" />
              ))}</div>
            )}
          </div>
        </div>
        <div onMouseDown={handleDetailDividerDown} className="flex shrink-0 cursor-col-resize items-center justify-center bg-slate-200/60 hover:bg-blue-300/60 dark:bg-slate-700/60 dark:hover:bg-blue-500/30 transition-colors" style={{ width: 4 }}>
          <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flexBasis: `${detailPct}%`, minWidth: 0 }}>
          <DetailColumnContent
            selectedEntity={selectedDept}
            selectedNode={selectedNode}
            selectedPath={selectedPath}
            selectedNodeKey={selectedNodeKey}
            onClose={() => onSelect(null)}
            emptyMessage="Select a department"
            onAddChild={() => navigate(ADD_CHILD_ROUTES.department)}
          />
        </div>
      </div>
      <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]">
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

function RGViewMode({ selectedId, onSelect, search, onSearchChange, statusFilter, onStatusFilterChange, plants }: {
  selectedId: string | null; onSelect: (id: string | null) => void; search: string; onSearchChange: (v: string) => void;
  statusFilter: string; onStatusFilterChange: (v: string) => void; plants: any[];
}) {
  const navigate = useNavigate();
  const { data, loading, refetch: refetchRG } = useQuery<any>(RESOURCE_GROUPS_QUERY);
  const [plantFilterValue, setPlantFilterValue] = useState("all");
  const [detailPct, setDetailPct] = useState(75);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const handleDetailDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = detailContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { const pct = ((ev.clientX - rect.left) / rect.width) * 100; setDetailPct(Math.min(Math.max(100 - pct, 15), 85)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);
  const groups = data?.resourceGroups || [];
  const selectedRG = selectedId ? groups.find((g: any) => g.id === selectedId) ?? null : null;
  const filtered = groups.filter((g: any) => (statusFilter === "all" || g.status === statusFilter) && (plantFilterValue === "all" || g.plantId === plantFilterValue)).filter((g: any) => !search || g.name.toLowerCase().includes(search.toLowerCase()));
  const plantFilterOptions = [{ label: "All Plants", value: "all" }, ...plants.map((p) => ({ label: p.name, value: p.id }))];
  const { selectedNode, selectedPath, selectedNodeKey } = useDetailTreeContext("resourceGroup", selectedRG, plants, selectedRG?.plantId);
  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <EntityToolbar
        onBack={() => navigate("/system/production-structure")}
        onAdd={() => navigate("/system/production-structure/resource-groups")}
        onEdit={selectedRG ? () => navigate(`/system/production-structure/resource-groups/${selectedRG.id}`) : undefined}
        onDelete={undefined}
        hasSelected={!!selectedRG}
        onRefresh={() => refetchRG()}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        search={search}
        onSearchChange={onSearchChange}
        plantFilter={{ value: plantFilterValue, onChange: setPlantFilterValue, options: plantFilterOptions }}
      />
      <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto p-3 m-0 bg-white dark:bg-slate-900">
            {loading ? <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading resource groups...</div>
            : filtered.length === 0 ? (
              <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><Component className="h-5 w-5 stroke-current" /></div>
                <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>No resource groups</h3><p className={`mt-1 text-xs ${theme.textSecondary}`}>No resource groups match your criteria.</p>
              </div>
            ) : (
              <div className="space-y-px">{filtered.map((g: any) => (
                <EntityCard key={g.id} icon={<Component className="h-5 w-5 stroke-current text-rose-600 dark:text-rose-400" />} iconBg="bg-rose-50 dark:bg-rose-500/10"
                  name={g.name} code={g.code} status={g.status} subtitle={g.departmentName ? `${g.departmentName}${g.plantName ? ` · ${g.plantName}` : ""}` : undefined}
                  metrics={[{ label: "Members", value: g.members || 0 }, { label: "Resources", value: g.resourceCount || 0 }]}
                  selected={selectedId === g.id} onClick={() => onSelect(g.id)} selectedClass="bg-rose-100/60 dark:bg-rose-900/30" />
              ))}</div>
            )}
          </div>
        </div>
        <div onMouseDown={handleDetailDividerDown} className="flex shrink-0 cursor-col-resize items-center justify-center bg-slate-200/60 hover:bg-blue-300/60 dark:bg-slate-700/60 dark:hover:bg-blue-500/30 transition-colors" style={{ width: 4 }}>
          <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flexBasis: `${detailPct}%`, minWidth: 0 }}>
          <DetailColumnContent
            selectedEntity={selectedRG}
            selectedNode={selectedNode}
            selectedPath={selectedPath}
            selectedNodeKey={selectedNodeKey}
            onClose={() => onSelect(null)}
            emptyMessage="Select a resource group"
            onAddChild={() => navigate(ADD_CHILD_ROUTES.resourceGroup)}
          />
        </div>
      </div>
      <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]">
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

function ResViewMode({ selectedId, onSelect, search, onSearchChange, statusFilter, onStatusFilterChange, plants }: {
  selectedId: string | null; onSelect: (id: string | null) => void; search: string; onSearchChange: (v: string) => void;
  statusFilter: string; onStatusFilterChange: (v: string) => void; plants: any[];
}) {
  const navigate = useNavigate();
  const { data, loading, refetch: refetchRes } = useQuery<any>(RESOURCES_QUERY);
  const [plantFilterValue, setPlantFilterValue] = useState("all");
  const [detailPct, setDetailPct] = useState(75);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const handleDetailDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = detailContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { const pct = ((ev.clientX - rect.left) / rect.width) * 100; setDetailPct(Math.min(Math.max(100 - pct, 15), 85)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);
  const resources = data?.resources || [];
  const selectedRes = selectedId ? resources.find((r: any) => r.id === selectedId) ?? null : null;
  const filtered = resources.filter((r: any) => (statusFilter === "all" || r.status === statusFilter) && (plantFilterValue === "all" || r.plantId === plantFilterValue)).filter((r: any) => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const plantFilterOptions = [{ label: "All Plants", value: "all" }, ...plants.map((p) => ({ label: p.name, value: p.id }))];
  const { selectedNode, selectedPath, selectedNodeKey } = useDetailTreeContext("resource", selectedRes, plants, selectedRes?.plantId);
  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <EntityToolbar
        onBack={() => navigate("/system/production-structure")}
        onAdd={() => navigate("/system/production-structure/resources")}
        onEdit={selectedRes ? () => navigate(`/system/production-structure/resources/${selectedRes.id}`) : undefined}
        onDelete={undefined}
        hasSelected={!!selectedRes}
        onRefresh={() => refetchRes()}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        search={search}
        onSearchChange={onSearchChange}
        plantFilter={{ value: plantFilterValue, onChange: setPlantFilterValue, options: plantFilterOptions }}
      />
      <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto p-3 m-0 bg-white dark:bg-slate-900">
            {loading ? <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading resources...</div>
            : filtered.length === 0 ? (
              <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><Dumbbell className="h-5 w-5 stroke-current" /></div>
                <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>No resources</h3><p className={`mt-1 text-xs ${theme.textSecondary}`}>No resources match your criteria.</p>
              </div>
            ) : (
              <div className="space-y-px">{filtered.map((r: any) => (
                <EntityCard key={r.id} icon={<Dumbbell className="h-5 w-5 stroke-current text-gray-600 dark:text-gray-400" />} iconBg="bg-gray-50 dark:bg-gray-500/10"
                  name={r.name} code={r.code} status={r.status} subtitle={r.groupName ? `${r.groupName}${r.plantName ? ` · ${r.plantName}` : ""}` : undefined}
                  metrics={[{ label: "Type", value: r.resourceType || r.type || "-" }, { label: "Utilization", value: r.utilization != null ? `${r.utilization}%` : "-" }]}
                  selected={selectedId === r.id} onClick={() => onSelect(r.id)} selectedClass="bg-gray-100/60 dark:bg-gray-900/30" />
              ))}</div>
            )}
          </div>
        </div>
        <div onMouseDown={handleDetailDividerDown} className="flex shrink-0 cursor-col-resize items-center justify-center bg-slate-200/60 hover:bg-blue-300/60 dark:bg-slate-700/60 dark:hover:bg-blue-500/30 transition-colors" style={{ width: 4 }}>
          <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flexBasis: `${detailPct}%`, minWidth: 0 }}>
          <DetailColumnContent
            selectedEntity={selectedRes}
            selectedNode={selectedNode}
            selectedPath={selectedPath}
            selectedNodeKey={selectedNodeKey}
            onClose={() => onSelect(null)}
            emptyMessage="Select a resource"
          />
        </div>
      </div>
      <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]">
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

function CompanyViewMode({ onSelectPlant }: { onSelectPlant?: (id: string) => void }) {
  return <CompanyDetailView onSelectPlant={onSelectPlant} />;
}

function LandmarkIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18" /><path d="M6 18v-7" /><path d="M10 18v-7" /><path d="M14 18v-7" /><path d="M18 18v-7" /><path d="M12 2l-9 5h18z" /></svg>;
}

export function ProductionComponents() {
  const navigate = useNavigate();
  const { data: companyData } = useQuery<any>(COMPANY_QUERY);
  const companyName = companyData?.company?.name || "";
  const [activeEntity, setActiveEntity] = useState("company");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sharedSearch, setSharedSearch] = useState("");
  const [sharedStatusFilter, setSharedStatusFilter] = useState("all");

  const { plants, saveLoading, savePlant, archivePlant } = usePlants();

  const HIERARCHY_ITEMS = [
    { key: "company", label: companyName || "Company", Icon: ENTITY_CONFIG.company.icon, colorActive: "text-white", bgActive: "bg-emerald-400 dark:bg-emerald-500", colorInactive: "text-emerald-600 dark:text-emerald-400", bgInactive: "bg-emerald-50 dark:bg-emerald-900/30" },
    { key: "plant", label: "Plants", Icon: ENTITY_CONFIG.plant.icon, colorActive: "text-white", bgActive: "bg-blue-400 dark:bg-blue-500", colorInactive: "text-blue-600 dark:text-blue-400", bgInactive: "bg-blue-50 dark:bg-blue-900/30" },
    { key: "productionLine", label: "Line", Icon: ENTITY_CONFIG.productionLine.icon, colorActive: "text-white", bgActive: "bg-amber-400 dark:bg-amber-500", colorInactive: "text-amber-600 dark:text-amber-400", bgInactive: "bg-amber-50 dark:bg-amber-900/30" },
    { key: "department", label: "Dept", Icon: ENTITY_CONFIG.department.icon, colorActive: "text-white", bgActive: "bg-purple-400 dark:bg-purple-500", colorInactive: "text-purple-600 dark:text-purple-400", bgInactive: "bg-purple-50 dark:bg-purple-900/30" },
    { key: "resourceGroup", label: "RG", Icon: ENTITY_CONFIG.resourceGroup.icon, colorActive: "text-white", bgActive: "bg-rose-400 dark:bg-rose-500", colorInactive: "text-rose-600 dark:text-rose-400", bgInactive: "bg-rose-50 dark:bg-rose-900/30" },
    { key: "resource", label: "Resource", Icon: ENTITY_CONFIG.resource.icon, colorActive: "text-white", bgActive: "bg-slate-500 dark:bg-slate-400", colorInactive: "text-slate-600 dark:text-slate-400", bgInactive: "bg-slate-50 dark:bg-slate-800/40" },
  ];

  const switchEntity = (key: string) => { setActiveEntity(key); setSelectedItemId(null); setSharedSearch(""); setSharedStatusFilter("all"); };

  const openEdit = (plant: Plant) => {
    setEditingId(plant.id); setSaveError(null);
    setForm({ entityIcon: "plant", name: plant.name || "", code: plant.code || "", status: plant.status || "active",
      building: plant.building || "", address: plant.address || "", city: plant.city || "", state: plant.state || "", country: plant.country || "", zipcode: plant.zipcode || "", timezone: plant.timezone || "",
      latitude: plant.latitude || "", longitude: plant.longitude || "",
      plantType: plant.plantType || "", operatingSince: plant.operatingSince || "",
      managerName: plant.managerName || "", managerEmail: plant.managerEmail || "", managerPhone: plant.managerPhone || "",
      defaultCalendar: plant.defaultCalendar || "", defaultShiftModel: plant.defaultShiftModel || "",
      weekStartDay: plant.weekStartDay || "", defaultSchedule: plant.defaultSchedule || "",
      manufacturingFocus: plant.manufacturingFocus || "",
      description: plant.description || "" });
    setSelectedItemId(plant.id); setModalOpen(true);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (editingId && form.entityIcon) saveEntityConfig("plant", editingId, form.entityIcon);
    const result = await savePlant({ ...EMPTY_FORM, ...form, status: (form.status || "active") as "active" | "inactive" }, editingId);
    if (result.ok) setModalOpen(false); else { const msgs = result.errors ? Object.values(result.errors).join("; ") : "Failed to save plant."; setSaveError(msgs); }
  };

  const handleDelete = async () => {
    if (!plantToDelete) return;
    const result = await archivePlant(plantToDelete.id);
    if (result.inUse) alert(result.message);
    setConfirmOpen(false); setPlantToDelete(null); setModalOpen(false);
    if (selectedItemId === plantToDelete.id) setSelectedItemId(null);
  };

  const selectedPlant = selectedItemId ? plants.find((p) => p.id === selectedItemId) ?? null : null;
  const editingPlant = editingId ? plants.find((p) => p.id === editingId) : null;

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <PageHeader icon={<Factory className="h-5 w-5 stroke-current" />} iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" title="Production Structure - Components" subtitle={activeEntity === "company" ? "Company root profile, global defaults, and production structure overview." : "Facilities, locations, and production sites."} />

      <div className="flex flex-1 overflow-hidden p-0 m-0">
        {/* ── COL 1: Colored Label Tabs ── */}
        <div className="flex flex-col shrink-0 w-6">
          {HIERARCHY_ITEMS.map((item) => {
            const Icon = item.Icon;
            const isActiveTab = activeEntity === item.key;
            return (
              <button key={item.key} type="button" onClick={() => switchEntity(item.key)}
                className={`flex items-center justify-center transition-all duration-150 font-['Segoe_UI',system-ui,sans-serif] ${isActiveTab ? `${item.bgActive} ${item.colorActive} rounded-l-lg shadow-sm z-10` : `${item.bgInactive} ${item.colorInactive} hover:brightness-95 dark:hover:brightness-125`}`}
                style={{ flex: "1 0 auto", ...(isActiveTab ? { marginLeft: -1, clipPath: "inset(0 0 0 0 round 8px 0 0 8px)" } : {}) }}
              >
                <div className="flex items-center gap-1" style={{ transform: "rotate(-90deg)", transformOrigin: "center", whiteSpace: "nowrap" }}>
                  <span className={`flex items-center justify-center w-3.5 h-3.5 ${isActiveTab ? "text-white" : item.colorInactive}`}>
                    <Icon className="h-3 w-3 stroke-current" />
                  </span>
                  <span className={`text-[9px] font-semibold ${isActiveTab ? "text-white" : item.colorInactive}`}>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── DIVIDER 1 ── */}
        <div className="shrink-0 bg-slate-200/60 dark:bg-slate-700/60" style={{ width: 1 }} />

        {/* ── COL 2+3: Browser Window ── */}
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: 1, minWidth: 0 }}>
          {activeEntity === "company" && <CompanyViewMode onSelectPlant={(id) => { setActiveEntity("plant"); setSelectedItemId(id); }} />}
          {activeEntity === "plant" && (
            <PlantsViewMode
              selectedId={selectedItemId} onSelect={setSelectedItemId} onEdit={openEdit}
              detailItem={selectedPlant}
              search={sharedSearch} onSearchChange={setSharedSearch} statusFilter={sharedStatusFilter} onStatusFilterChange={setSharedStatusFilter}
              onNavigateToLine={(lineId) => { setActiveEntity("productionLine"); setSelectedItemId(lineId); }}
            />
          )}
          {activeEntity === "productionLine" && <LinesViewMode selectedId={selectedItemId} onSelect={setSelectedItemId} search={sharedSearch} onSearchChange={setSharedSearch} statusFilter={sharedStatusFilter} onStatusFilterChange={setSharedStatusFilter} plants={plants} />}
          {activeEntity === "department" && <DeptsViewMode selectedId={selectedItemId} onSelect={setSelectedItemId} search={sharedSearch} onSearchChange={setSharedSearch} statusFilter={sharedStatusFilter} onStatusFilterChange={setSharedStatusFilter} plants={plants} />}
          {activeEntity === "resourceGroup" && <RGViewMode selectedId={selectedItemId} onSelect={setSelectedItemId} search={sharedSearch} onSearchChange={setSharedSearch} statusFilter={sharedStatusFilter} onStatusFilterChange={setSharedStatusFilter} plants={plants} />}
          {activeEntity === "resource" && <ResViewMode selectedId={selectedItemId} onSelect={setSelectedItemId} search={sharedSearch} onSearchChange={setSharedSearch} statusFilter={sharedStatusFilter} onStatusFilterChange={setSharedStatusFilter} plants={plants} />}
        </div>
      </div>

      <UnifiedModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Plant" : "Add Plant"} fields={[
        { key: "entityIcon", label: "Production Structure", type: "entityicon" },
        { key: "name", label: "Plant Name", required: true, placeholder: "e.g. Main Plant" },
        { key: "building", label: "Location / Building", placeholder: "e.g. Building A" },
        { key: "city", label: "City", placeholder: "e.g. Santa Fe Springs" },
        { key: "state", label: "State", placeholder: "e.g. CA" },
        { key: "country", label: "Country", placeholder: "e.g. USA" },
        { key: "timezone", label: "Timezone", type: "select", required: true, placeholder: "Select timezone", options: TIMEZONE_OPTIONS },
        { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
      ]} values={form} onChange={(k, v) => { setForm((prev) => ({ ...prev, [k]: v })); setSaveError(null); }} onSave={handleSave}
        onDelete={editingId ? () => { setPlantToDelete(plants.find((p) => p.id === editingId) ?? null); setConfirmOpen(true); } : undefined}
        saving={saveLoading} summary={<>{saveError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{saveError}</div>}<PlantSummary lines={editingPlant?.lineCount ?? 0} departments={editingPlant?.departmentCount ?? 0} groups={editingPlant?.groupCount ?? 0} resources={editingPlant?.resourceCount ?? 0} /></>}
        onConfigureStructure={editingId ? () => { const p = plants.find((pl) => pl.id === editingId); navigate(`/system/production-structure/structure?plant=${encodeURIComponent(p?.name ?? "")}`); } : undefined}
      />
      <ConfirmDialog open={confirmOpen} onClose={() => { setConfirmOpen(false); setPlantToDelete(null); }} title={`Delete plant ${plantToDelete?.name ?? ""}?`} message="This action cannot be undone." onConfirm={handleDelete} />
    </div>
  );
}
