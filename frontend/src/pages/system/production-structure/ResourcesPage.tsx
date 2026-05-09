import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, X } from "lucide-react";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { UnifiedModal } from "./components/UnifiedModal";
import type { ModalField } from "./components/UnifiedModal";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { usePageSize } from "@/hooks/usePageSize";
import { getEntityIconProps, saveEntityConfig } from "./entityDisplay";
import { PageHeader } from "@/pages/shared/PageHeader";

type OpStatus = "Running" | "Idle" | "Down" | "Maintenance";
type ResType = "Machine" | "Workstation" | "Inspection Station" | "Material Handling" | "Tool";

interface ResourceNode {
  id: string; name: string; resourceType: ResType; code: string;
  groupName: string; departmentName: string;
  status: "active" | "inactive"; opStatus: OpStatus;
  utilization: number; shift: string; lastActivity: string; flowPosition: string; plantName: string;
}

interface ResourcesQueryData { resources: ResourceNode[]; }

const STATUS_OPTIONS: FilterOption[] = [
  { label: "All Types", value: "all" }, { label: "Machine", value: "Machine" },
  { label: "Workstation", value: "Workstation" }, { label: "Inspection", value: "Inspection Station" },
  { label: "M. Handling", value: "Material Handling" }, { label: "Tool", value: "Tool" },
];

const RESOURCE_TYPE_OPTIONS = [
  { label: "Machine", value: "Machine" }, { label: "Workstation", value: "Workstation" },
  { label: "Inspection Station", value: "Inspection Station" },
  { label: "Material Handling", value: "Material Handling" }, { label: "Tool", value: "Tool" },
];

const MODAL_FIELDS: ModalField[] = [
  { key: "entityIcon", label: "Production Structure", type: "entityicon" },
  { key: "name", label: "Resource Name", required: true, placeholder: "e.g. CNC-01" },
  { key: "code", label: "Code", placeholder: "e.g. CNC-001" },
  { key: "resourceType", label: "Type", type: "select", options: RESOURCE_TYPE_OPTIONS },
  { key: "groupName", label: "Resource Group", placeholder: "e.g. Machining Group" },
  { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

export function ResourcesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceNode | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { containerRef, cardRef, perPage } = usePageSize(56, 8, 1);

  const { data, loading, error } = useQuery<ResourcesQueryData>(RESOURCES_QUERY, {
    variables: { search: search || undefined, status: undefined },
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });

  const resources = useMemo(() => {
    const rows = data?.resources ?? [];
    if (typeFilter === "all") return rows;
    return rows.filter((r) => r.resourceType === typeFilter);
  }, [data?.resources, typeFilter]);

  const paginatedResources = resources.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [search, typeFilter, perPage]);

  const openEdit = (resource: ResourceNode) => {
    setEditingResource(resource); setSaveError(null);
    setForm({ entityIcon: "resource", name: resource.name, code: resource.code || "", resourceType: resource.resourceType, groupName: resource.groupName || "", status: resource.status });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (editingResource?.id && form.entityIcon) {
      saveEntityConfig("resource", editingResource.id, form.entityIcon);
    }
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!resourceToDelete) return;
    setConfirmOpen(false); setResourceToDelete(null); setModalOpen(false);
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <PageHeader
        icon={<Dumbbell className="h-5 w-5 stroke-current" />}
        iconClass="bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400"
        title="Resources"
        subtitle="Machines, workstations, tools, and production resources from the database."
      >
        <button type="button" onClick={() => navigate("/system/production-structure")}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/60">
          <X className="h-4 w-4 stroke-current" />Close
        </button>
      </PageHeader>

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search resources..."
        statusFilter={typeFilter}
        onStatusFilterChange={setTypeFilter}
        statusOptions={STATUS_OPTIONS}
      />

      <div ref={containerRef} className={`flex-1 ${theme.page} p-4`}>
        {loading && !data ? (
          <div className={`py-16 text-center text-sm ${theme.textMuted}`}>Loading resources...</div>
        ) : error && !data?.resources ? (
          <div className={`py-16 text-center text-sm ${theme.textCritical}`}>Unable to load resources from the database.</div>
        ) : resources.length === 0 ? (
          <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center ${theme.card}`}>
            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}>
              <Dumbbell className="h-6 w-6 stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>
              {search ? "No resources match your search" : "No resources found"}
            </h3>
            <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Create resources in the backend data source to see them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginatedResources.map((res, idx) => {
              const { Icon, textColor, bgColor } = getEntityIconProps("resource", res.id);
              const isConfigured = !!res.name && !!res.code && !!res.groupName;
              return (
                <div key={res.id} ref={idx === 0 ? cardRef : undefined}>
                  <DataCard
                    icon={<Icon className={`h-5 w-5 stroke-current ${textColor}`} />}
                    iconBg={bgColor}
                    name={res.name}
                    code={res.code}
                    status={res.status}
                    parentContext={[res.groupName, res.departmentName].filter(Boolean).join(" · ")}
                    primaryMetrics={[{ label: "Type", value: res.resourceType }]}
                    metrics={[
                      { label: "Op Status", value: res.opStatus },
                      { label: "Util", value: `${res.utilization}%` },
                      ...(res.shift ? [{ label: "Shift", value: res.shift }] : []),
                    ]}
                    readiness={[{ label: "Configured", ready: isConfigured }]}
                    onEdit={() => openEdit(res)}
                    onOpen={() => navigate(`/system/production-structure/resources/${res.id}`)}
                    isLowestLevel
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3">
          <Pagination page={page} total={resources.length} perPage={perPage} onChange={setPage} />
        </div>
      </div>

      <UnifiedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingResource ? "Edit Resource" : "Add Resource"}
        fields={MODAL_FIELDS}
        values={form}
        onChange={(k, v) => { setForm((prev) => ({ ...prev, [k]: v })); setSaveError(null); }}
        onSave={handleSave}
        onDelete={editingResource ? () => { setResourceToDelete(editingResource.id); setConfirmOpen(true); } : undefined}
        summary={saveError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{saveError}</div> : undefined}
        onConfigureStructure={editingResource ? () => navigate(`/system/production-structure/structure?resource=${encodeURIComponent(editingResource.name)}`) : undefined}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setResourceToDelete(null); }}
        title="Delete resource?"
        message="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
