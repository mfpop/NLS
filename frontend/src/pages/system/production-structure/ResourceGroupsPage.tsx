import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate, useParams } from "react-router-dom";
import { Component, X } from "lucide-react";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { UnifiedModal } from "./components/UnifiedModal";
import type { ModalField } from "./components/UnifiedModal";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { RESOURCE_GROUPS_QUERY } from "@/graphql/manufacturingQueries";
import { CREATE_RESOURCE_GROUP, UPDATE_RESOURCE_GROUP, DELETE_RESOURCE_GROUP } from "@/graphql/dataManagementMutations";
import { DEPARTMENTS_QUERY } from "@/graphql/manufacturingQueries";
import { usePlants } from "@/hooks/usePlants";
import { usePageSize } from "@/hooks/usePageSize";
import { getEntityIconProps, saveEntityConfig } from "./entityDisplay";
import { PageHeader } from "@/pages/shared/PageHeader";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ResourceGroupNode | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { containerRef, cardRef, perPage } = usePageSize(56, 8, 1);

  const { data: deptData } = useQuery<{ departments: { id: string; name: string }[] }>(DEPARTMENTS_QUERY, {
    fetchPolicy: "cache-first",
  });
  const departments = deptData?.departments ?? [];

  const departmentOptions = useMemo(() =>
    departments.map((d: { id: string; name: string }) => ({ label: d.name, value: d.id })), [departments]);

  const MODAL_FIELDS: ModalField[] = [
    { key: "entityIcon", label: "Icon & Color", type: "entityicon" },
    { key: "name", label: "Resource Group Name", required: true, placeholder: "e.g. Welding Operators" },
    { key: "code", label: "Code", placeholder: "e.g. WELD-01" },
    { key: "departmentId", label: "Department", type: "select", options: departmentOptions, required: true },
    { key: "groupType", label: "Type", type: "select", options: TYPE_OPTIONS.filter(o => o.value !== "all").map(o => ({ label: o.label, value: o.value })) },
    { key: "leader", label: "Leader", placeholder: "e.g. Jane Doe" },
    { key: "members", label: "Members", placeholder: "e.g. 12" },
    { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  const { data, loading, error, refetch } = useQuery<ResourceGroupsQueryData>(RESOURCE_GROUPS_QUERY, {
    variables: { search: search || undefined, type: typeFilter !== "all" ? typeFilter : undefined },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [createMutation] = useMutation(CREATE_RESOURCE_GROUP);
  const [updateMutation] = useMutation(UPDATE_RESOURCE_GROUP);
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
    if (groupId && data?.resourceGroups) {
      const group = data.resourceGroups.find((g) => g.id === groupId);
      if (group && !editingGroup) {
        setEditingGroup(group);
        setSaveError(null);
        setForm({
          entityIcon: "resourceGroup",
          name: group.name,
          code: group.code || "",
          departmentId: group.departmentId || "",
          groupType: group.groupType,
          leader: group.leader || "",
          members: String(group.members ?? ""),
          status: group.status,
        });
        setModalOpen(true);
      }
    }
  }, [groupId, data?.resourceGroups]);

  const openEdit = (group: ResourceGroupNode) => {
    setEditingGroup(group); setSaveError(null);
    setForm({
      entityIcon: "resourceGroup",
      name: group.name,
      code: group.code || "",
      departmentId: group.departmentId || "",
      groupType: group.groupType,
      leader: group.leader || "",
      members: String(group.members ?? ""),
      status: group.status,
    });
    setModalOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name?.trim()) { setSaveError("Name is required"); return; }
    if (!form.departmentId?.trim()) { setSaveError("Department is required"); return; }

    if (editingGroup?.id && form.entityIcon) {
      saveEntityConfig("resourceGroup", editingGroup.id, form.entityIcon);
    }

    const members = form.members ? parseInt(form.members, 10) : undefined;
    const common = {
      code: form.code || "",
      status: form.status || "active",
      groupType: form.groupType || "Production",
      members: members && !isNaN(members) ? members : undefined,
      leader: form.leader || "",
    };

    try {
      if (editingGroup?.id) {
        await updateMutation({
          variables: { id: editingGroup.id, input: { name: form.name, ...common } },
        });
      } else {
        await createMutation({
          variables: { name: form.name, departmentId: form.departmentId, ...common },
        });
      }
      await refetch();
      setModalOpen(false);
    } catch {
      setSaveError("Failed to save resource group.");
    }
  }, [form, editingGroup, createMutation, updateMutation, refetch]);

  const handleAdd = () => {
    setEditingGroup(null); setSaveError(null);
    const firstDeptId = departments[0]?.id || "";
    setForm({ entityIcon: "resourceGroup", name: "", code: "", groupType: "Production", leader: "", members: "", status: "active", departmentId: firstDeptId });
    setModalOpen(true);
  };

  const handleDelete = useCallback(async () => {
    if (!groupToDelete) return;
    try {
      await deleteMutation({ variables: { id: groupToDelete } });
      await refetch();
    } catch { /* ignore */ }
    setConfirmOpen(false); setGroupToDelete(null); setModalOpen(false);
  }, [groupToDelete, deleteMutation, refetch]);

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

      <UnifiedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGroup ? "Edit Resource Group" : "Add Resource Group"}
        fields={MODAL_FIELDS}
        values={form}
        onChange={(k, v) => { setForm((prev) => ({ ...prev, [k]: v })); setSaveError(null); }}
        onSave={handleSave}
        onDelete={editingGroup ? () => { setGroupToDelete(editingGroup.id); setConfirmOpen(true); } : undefined}
        summary={
          <>
            {saveError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 mb-2 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{saveError}</div>}
            {editingGroup && (
              <div className="rounded-lg border px-3 py-2 text-xs space-y-1 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Department</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{editingGroup.departmentName}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Plant</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{editingGroup.plantName}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Resources</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{editingGroup.resourceCount}</span>
                </div>
              </div>
            )}
          </>
        }
        onConfigureStructure={editingGroup ? () => navigate(`/system/production-structure/structure?group=${encodeURIComponent(editingGroup.name)}`) : undefined}
      />

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
