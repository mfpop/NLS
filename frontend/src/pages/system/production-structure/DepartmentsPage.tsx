import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, X } from "lucide-react";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { theme } from "../../../styles/themeTokens";
import { useDepartments } from "@/hooks/useDepartments";
import { usePlants } from "@/hooks/usePlants";
import { usePageSize } from "@/hooks/usePageSize";
import { getEntityIconProps } from "./entityDisplay";
import { PageHeader } from "@/pages/shared/PageHeader";
import { DepartmentEditModal } from "./components/DepartmentEditModal";

const STATUS_OPTIONS: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Not Ready", value: "not_ready" },
];

export function DepartmentsPage() {
  const navigate = useNavigate();
  const { plants } = usePlants();
  const { departments, loading, error, search, setSearch, statusFilter, setStatusFilter, refetch } = useDepartments();
  const [plantFilter, setPlantFilter] = useState("all");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { containerRef, cardRef, perPage } = usePageSize(56, 8, 1);

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

  const handleAdd = () => {
    navigate("/system/production-structure/departments/add");
  };



  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <PageHeader
        icon={<Layers className="h-5 w-5 stroke-current" />}
        iconClass="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
        title="Departments"
        subtitle="Departments rendered from the manufacturing structure stored in the database."
      >
        <button
          type="button"
          onClick={() => navigate("/system/production-structure")}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/60"
        >
          <X className="h-4 w-4 stroke-current" />
          Close
        </button>
      </PageHeader>

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
            {paginatedDepartments.map((dept, idx) => {
              const { textColor, bgColor } = getEntityIconProps("department", dept.id);
              return (
              <div key={dept.id} ref={idx === 0 ? cardRef : undefined}>
                <DataCard
                key={dept.id}
                icon={<Layers className={`h-5 w-5 stroke-current ${textColor}`} />}
                iconBg={bgColor}
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
                  { label: "Resource Groups", ready: dept.groupCount > 0 },
                  { label: "Resources", ready: dept.resourceCount > 0 },
                ]}
                onEdit={() => setEditingDeptId(dept.id)}
                onStructure={() => navigate(`/system/production-structure/structure?department=${encodeURIComponent(dept.name)}`)}
                onOpen={() => navigate(`/system/production-structure/departments/${dept.id}`)}
                />
              </div>
              );
            })}
          </div>
        )}

        <div className="mt-3">
          <Pagination page={page} total={filteredDepartments.length} perPage={perPage} onChange={setPage} />
        </div>
      </div>

      <DepartmentEditModal
        departmentId={editingDeptId}
        open={!!editingDeptId}
        onClose={() => setEditingDeptId(null)}
        onSaved={() => { setEditingDeptId(null); refetch(); }}
      />
    </div>
  );
}
