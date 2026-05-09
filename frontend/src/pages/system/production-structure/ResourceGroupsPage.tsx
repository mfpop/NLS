import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate, useParams } from "react-router-dom";
import { Component, X } from "lucide-react";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { RESOURCE_GROUPS_QUERY } from "@/graphql/manufacturingQueries";
import { DELETE_RESOURCE_GROUP } from "@/graphql/dataManagementMutations";
import { usePlants } from "@/hooks/usePlants";
import { usePageSize } from "@/hooks/usePageSize";
import { getEntityIconProps } from "./entityDisplay";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ResourceGroupForm } from "./entityForms";

interface ResourceGroupNode {
  id: string;
  code: string;
  name: string;
  groupType: string;
  members: number;
  leader: string;
  status: "active" | "inactive";
  departmentId?: string | null;
  departmentName: string;
  plantName: string;
  plantId?: string | null;
  resourceCount: number;
}

interface ResourceGroupsQueryData {
  resourceGroups: ResourceGroupNode[];
}

const TYPE_OPTIONS: FilterOption[] = [
  { label: "All Types", value: "all" },
  { label: "Production", value: "Production" },
  { label: "Support", value: "Support" },
  { label: "Management", value: "Management" },
  { label: "Quality", value: "Quality" },
  { label: "Logistics", value: "Logistics" },
];

export function ResourceGroupsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { plants } = usePlants();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [plantFilter, setPlantFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ResourceGroupNode | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { containerRef, cardRef, perPage } = usePageSize(56, 8, 1);

  const { data, loading, error, refetch } = useQuery<ResourceGroupsQueryData>(RESOURCE_GROUPS_QUERY, {
    variables: { search: search || undefined, type: typeFilter !== "all" ? typeFilter : undefined },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [deleteMutation] = useMutation(DELETE_RESOURCE_GROUP);

  const plantOptions = useMemo<FilterOption[]>(() => (
    [{ label: "All Plants", value: "all" }].concat(plants.map((plant) => ({ label: plant.name, value: plant.id })))
  ), [plants]);

  const groups = useMemo(() => {
    const rows = data?.resourceGroups ?? [];
    if (plantFilter === "all") return rows;
    return rows.filter((group) => group.plantId === plantFilter);
  }, [data?.resourceGroups, plantFilter]);

  const paginatedGroups = groups.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [search, typeFilter, plantFilter, perPage]);

  useEffect(() => {
    if (groupId && data?.resourceGroups && !editingGroup) {
      const group = data.resourceGroups.find((g) => g.id === groupId);
      if (group) setEditingGroup(group);
    }
  }, [groupId, data?.resourceGroups]);

  const openEdit = (group: ResourceGroupNode) => {
    setEditingGroup(group);
  };

  const handleAdd = () => {
    setEditingGroup(null);
  };

  const handleDelete = useCallback(async () => {
    if (!groupToDelete) return;
    try {
      await deleteMutation({ variables: { id: groupToDelete } });
      await refetch();
    } catch { /* ignore */ }
    setConfirmOpen(false); setGroupToDelete(null);
  }, [groupToDelete, deleteMutation, refetch]);

  if (editingGroup) {
    return (
      <ResourceGroupForm
        groupId={editingGroup.id}
        onClose={() => { setEditingGroup(null); refetch(); }}
        onSaved={() => { setEditingGroup(null); refetch(); }}
      />
    );
  }

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <PageHeader
        icon={<Component className="h-5 w-5 stroke-current" />}
        iconClass="bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        title="Resource Groups"
        subtitle="Resource groups loaded from the manufacturing database structure."
      >
        <button type="button" onClick={() => navigate("/system/production-structure")}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/60">
          <X className="h-4 w-4 stroke-current" />Close
        </button>
      </PageHeader>

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search groups or leaders..."
        parentFilter={{ value: plantFilter, onChange: setPlantFilter, options: plantOptions }}
        statusFilter={typeFilter}
        onStatusFilterChange={setTypeFilter}
        statusOptions={TYPE_OPTIONS}
        onAdd={handleAdd}
        addLabel="Add Resource Group"
      />

      <div ref={containerRef} className={`flex-1 ${theme.page} p-4`}>
        {loading && !data ? (
          <div className={`py-16 text-center text-sm ${theme.textMuted}`}>Loading resource groups...</div>
        ) : error && !data?.resourceGroups ? (
          <div className={`py-16 text-center text-sm ${theme.textCritical}`}>Unable to load resource groups from the database.</div>
        ) : groups.length === 0 ? (
          <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center ${theme.card}`}>
            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}>
              <Component className="h-6 w-6 stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>
              {search ? "No resource groups match your search" : "No resource groups found"}
            </h3>
            <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Create resource groups in the backend data source to see them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginatedGroups.map((group, idx) => {
              const { Icon, textColor, bgColor } = getEntityIconProps("resourceGroup", group.id);
              return (
              <div key={group.id} ref={idx === 0 ? cardRef : undefined}>
                <DataCard
                  icon={<Icon className={`h-5 w-5 stroke-current ${textColor}`} />}
                  iconBg={bgColor}
                  name={group.name}
                  code={group.groupType}
                  status={group.status}
                  parentContext={[group.plantName, group.departmentName, group.leader || ""].filter(Boolean).join(" · ")}
                  primaryMetrics={[{ label: "Resources", value: group.resourceCount }]}
                  metrics={[{ label: "Members", value: group.members }]}
                  readiness={[{ label: "Resources", ready: group.resourceCount > 0 }]}
                  onEdit={() => openEdit(group)}
                  onStructure={() => navigate(`/system/production-structure/structure?group=${encodeURIComponent(group.name)}`)}
                  onOpen={() => navigate(`/system/production-structure/resource-groups/${group.id}`)}
                />
              </div>
              );
            })}
          </div>
        )}

        <div className="mt-3">
          <Pagination page={page} total={groups.length} perPage={perPage} onChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setGroupToDelete(null); }}
        title="Delete resource group?"
        message="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
