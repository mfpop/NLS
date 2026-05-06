import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Users, X } from "lucide-react";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { UnifiedModal } from "./components/UnifiedModal";
import type { ModalField } from "./components/UnifiedModal";
import { GroupSummary } from "./components/SummaryBlock";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { RESOURCE_GROUPS_QUERY } from "@/graphql/manufacturingQueries";
import { usePlants } from "@/hooks/usePlants";
import { usePageSize } from "@/hooks/usePageSize";

interface ResourceGroupNode {
  id: string;
  name: string;
  groupType: string;
  members: number;
  leader: string;
  status: "active" | "inactive";
  department: string;
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

  const MODAL_FIELDS: ModalField[] = [
    { key: "name", label: "Group Name", required: true, placeholder: "e.g. Machining Group" },
    { key: "groupType", label: "Type", type: "select", options: TYPE_OPTIONS.filter(o => o.value !== "all").map(o => ({ label: o.label, value: o.value })) },
    { key: "leader", label: "Leader", placeholder: "e.g. Jane Doe" },
    { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  const { data, loading, error } = useQuery<ResourceGroupsQueryData>(RESOURCE_GROUPS_QUERY, {
    variables: { search: search || undefined, type: typeFilter !== "all" ? typeFilter : undefined },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

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

  const openEdit = (group: ResourceGroupNode) => {
    setEditingGroup(group); setSaveError(null);
    setForm({ name: group.name, groupType: group.groupType, leader: group.leader || "", status: group.status });
    setModalOpen(true);
  };

  const handleSave = async () => { setModalOpen(false); };

  const handleAdd = () => {
    setEditingGroup(null); setSaveError(null);
    setForm({ name: "", groupType: "Production", leader: "", status: "active" });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    setConfirmOpen(false); setGroupToDelete(null); setModalOpen(false);
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center justify-between border-b px-6 ${theme.header}`} style={{ height: "64px" }}>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
            <Users className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Resource Groups</h1>
            <p className={`text-xs ${theme.textSecondary}`}>Resource groups loaded from the manufacturing database structure.</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate("/system/data-management")}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800">
          <X className="h-4 w-4 stroke-current" />Close
        </button>
      </header>

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search groups or leaders..."
        parentFilter={{ value: plantFilter, onChange: setPlantFilter, options: plantOptions }}
        statusFilter={typeFilter}
        onStatusFilterChange={setTypeFilter}
        statusOptions={TYPE_OPTIONS}
        onAdd={handleAdd}
        addLabel="Add Group"
      />

      <div ref={containerRef} className={`flex-1 ${theme.page} p-4`}>
        {loading && !data ? (
          <div className={`py-16 text-center text-sm ${theme.textMuted}`}>Loading resource groups...</div>
        ) : error && !data?.resourceGroups ? (
          <div className={`py-16 text-center text-sm ${theme.textCritical}`}>Unable to load resource groups from the database.</div>
        ) : groups.length === 0 ? (
          <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center ${theme.card}`}>
            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}>
              <Users className="h-6 w-6 stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>
              {search ? "No resource groups match your search" : "No resource groups found"}
            </h3>
            <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Create resource groups in the backend data source to see them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginatedGroups.map((group, idx) => (
              <div key={group.id} ref={idx === 0 ? cardRef : undefined}>
                <DataCard
                  icon={<Users className="h-5 w-5 stroke-current text-violet-600" />}
                  iconBg="bg-violet-100 dark:bg-violet-500/10"
                  name={group.name}
                  code={group.groupType}
                  status={group.status}
                  parentContext={[group.plantName, group.department, group.leader || ""].filter(Boolean).join(" · ")}
                  primaryMetrics={[{ label: "Resources", value: group.resourceCount }]}
                  metrics={[{ label: "Members", value: group.members }]}
                  readiness={[{ label: "Resources", ready: group.resourceCount > 0 }]}
                  onEdit={() => openEdit(group)}
                  onStructure={() => navigate(`/system/data-management/structure?group=${encodeURIComponent(group.name)}`)}
                  onOpen={() => navigate(`/system/data-management/resource-groups/${group.id}`)}
                />
              </div>
            ))}
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
            {editingGroup ? <GroupSummary resources={editingGroup.resourceCount} /> : undefined}
          </>
        }
        onConfigureStructure={editingGroup ? () => navigate(`/system/data-management/structure?group=${encodeURIComponent(editingGroup.name)}`) : undefined}
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
