import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Building2, X } from "lucide-react";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { UnifiedModal } from "./components/UnifiedModal";
import type { ModalField } from "./components/UnifiedModal";
import { DepartmentSummary } from "./components/SummaryBlock";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { useDepartments } from "@/hooks/useDepartments";
import { usePlants } from "@/hooks/usePlants";
import { usePageSize } from "@/hooks/usePageSize";

interface DepartmentNode {
  id: string; name: string; code: string; status: "active" | "inactive";
  manager: string; employees: number; groupCount: number; resourceCount: number;
  plantId?: string | null; plantName: string;
}

const STATUS_OPTIONS: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Not Ready", value: "not_ready" },
];

function generateCode(): string {
  return `D${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function DepartmentsPage() {
  const navigate = useNavigate();
  const { plants } = usePlants();
  const { departments, loading, error, search, setSearch, statusFilter, setStatusFilter, saveDepartment, deleteDepartment } = useDepartments();
  const [plantFilter, setPlantFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentNode | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const { containerRef, cardRef, perPage } = usePageSize(56, 8, 1);

  const MODAL_FIELDS: ModalField[] = [
    { key: "name", label: "Department Name", required: true, placeholder: "e.g. Assembly" },
    { key: "manager", label: "Manager", placeholder: "e.g. John Smith" },
    { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  const plantOptions = useMemo<FilterOption[]>(() => (
    [{ label: "All Plants", value: "all" }].concat(
      plants.map((plant) => ({ label: plant.name, value: plant.id }))
    )
  ), [plants]);

  const filteredDepartments = useMemo(() => {
    if (plantFilter === "all") return departments;
    return departments.filter((d) => d.plantId === plantFilter);
  }, [departments, plantFilter]);

  const paginatedDepartments = filteredDepartments.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [search, statusFilter, plantFilter, perPage]);

  const openEdit = (dept: DepartmentNode) => {
    setEditingDept(dept);
    setForm({ name: dept.name, code: dept.code, manager: dept.manager || "", status: dept.status, employees: String(dept.employees) });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingDept(null);
    setForm({ name: "", code: generateCode(), manager: "", status: "active", employees: "0" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const result = await saveDepartment(form, editingDept?.id ?? null);
    if (result.ok) { setModalOpen(false); } else { alert(Object.values(result.errors ?? {}).join("; ")); }
  };

  const handleDelete = async () => {
    if (!deptToDelete) return;
    const result = await deleteDepartment(deptToDelete);
    if (result.inUse) { alert(result.message); }
    setConfirmOpen(false); setDeptToDelete(null); setModalOpen(false);
  };



  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center justify-between border-b px-6 ${theme.header}`} style={{ height: "64px" }}>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Layers className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Departments</h1>
            <p className={`text-xs ${theme.textSecondary}`}>Departments rendered from the manufacturing structure stored in the database.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/system/data-management")}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4 stroke-current" />
          Close
        </button>
      </header>

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search departments..."
        parentFilter={{ value: plantFilter, onChange: setPlantFilter, options: plantOptions }}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        onAdd={handleAdd}
        addLabel="Add Department"
      />

      <div ref={containerRef} className={`flex-1 ${theme.page} p-4`}>
        {loading ? (
          <div className={`py-16 text-center text-sm ${theme.textMuted}`}>Loading departments...</div>
        ) : error ? (
          <div className={`py-16 text-center text-sm ${theme.textCritical}`}>Unable to load departments from the database.</div>
        ) : filteredDepartments.length === 0 ? (
          <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center ${theme.card}`}>
            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}>
              <Layers className="h-6 w-6 stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>
              {search ? "No departments match your search" : "No departments found"}
            </h3>
            <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Create departments in the backend data source to see them here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedDepartments.map((dept, idx) => (
              <div key={dept.id} ref={idx === 0 ? cardRef : undefined}>
                <DataCard
                key={dept.id}
                icon={<Building2 className="h-5 w-5 stroke-current text-indigo-600" />}
                iconBg="bg-indigo-100 dark:bg-indigo-500/10"
                name={dept.name}
                code={dept.code}
                status={dept.status}
                parentContext={`${dept.plantName || "Unassigned plant"}${dept.manager ? ` · ${dept.manager}` : ""}`}
                primaryMetrics={[
                  { label: "Resource Groups", value: dept.groupCount },
                ]}
                metrics={[
                  { label: "Resources", value: dept.resourceCount },
                  { label: "Employees", value: dept.employees },
                ]}
                readiness={[
                  { label: "Groups", ready: dept.groupCount > 0 },
                  { label: "Resources", ready: dept.resourceCount > 0 },
                ]}
                onEdit={() => openEdit(dept)}
                onStructure={() => navigate(`/system/data-management/structure?department=${encodeURIComponent(dept.name)}`)}
                onOpen={() => navigate(`/system/data-management/departments/${dept.id}`)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <Pagination page={page} total={filteredDepartments.length} perPage={perPage} onChange={setPage} />
        </div>
      </div>

      <UnifiedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDept ? "Edit Department" : "Add Department"}
        fields={MODAL_FIELDS}
        values={form}
        onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
        onSave={handleSave}
        onDelete={editingDept ? () => { setDeptToDelete(editingDept.id); setConfirmOpen(true); } : undefined}
        summary={
          editingDept ? (
            <DepartmentSummary
              groups={editingDept.groupCount}
              resources={editingDept.resourceCount}
            />
          ) : undefined
        }
        onConfigureStructure={
          editingDept
            ? () => navigate(`/system/data-management/structure?department=${encodeURIComponent(editingDept.name)}`)
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeptToDelete(null); }}
        title={`Delete department?`}
        message="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
