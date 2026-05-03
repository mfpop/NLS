import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Layers, MoreHorizontal, Eye, Pencil, Users } from "lucide-react";
import {
  Breadcrumbs, ContextBar, SearchBar, FilterBar, EmptyState, StatusBadge, QuickAction,
  BulkCheckbox, StructureShortcuts, ControlTowerLink
} from "./shared";

interface Department {
  id: string;
  name: string;
  code: string;
  manager: string;
  employees: number;
  groups: number;
  status: "active" | "inactive";
  plantId: string;
  plantName: string;
}

const departments: Department[] = [
  { id: "D001", name: "Assembly", code: "ASM", manager: "John Smith", employees: 45, groups: 3, status: "active", plantId: "P001", plantName: "Main Plant" },
  { id: "D002", name: "Machining", code: "MCH", manager: "Sarah Chen", employees: 32, groups: 2, status: "active", plantId: "P001", plantName: "Main Plant" },
  { id: "D003", name: "Quality Control", code: "QC", manager: "Mike Brown", employees: 18, groups: 2, status: "active", plantId: "P001", plantName: "Main Plant" },
  { id: "D004", name: "Logistics", code: "LOG", manager: "Ana Garcia", employees: 22, groups: 3, status: "active", plantId: "P002", plantName: "Secondary Plant" },
  { id: "D005", name: "Maintenance", code: "MTN", manager: "David Kim", employees: 14, groups: 1, status: "inactive", plantId: "P002", plantName: "Secondary Plant" },
];

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function DepartmentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = departments.filter((d) => {
    if (filter !== "all" && d.status !== filter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((d) => d.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-1)] px-5 py-3">
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Departments</h1>
          <p className="text-xs text-[var(--text-secondary)]">Organize departments across your plants.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[var(--page-bg)] p-4">
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Departments" }]} />
        <ContextBar segments={[{ label: "All Plants" }]} />
        <StructureShortcuts />

        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search departments..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && <span className="text-xs text-slate-500">{selected.size} selected</span>}
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]">
              + Add Department
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span className="font-medium">{selected.size} dept(s) selected</span>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Assign manager</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Activate</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Deactivate</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">Clear</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title={search ? "No departments match your search" : "No departments configured"}
            description="Create departments and assign managers."
            action={{ label: "+ Add Department", onClick: () => {} }}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((dept) => {
              const isSelected = selected.has(dept.id);
              return (
                <div
                  key={dept.id}
                  className={`group cursor-pointer rounded-xl border bg-white px-3 py-2.5 transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.99] ${
                    isSelected ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"
                  }`}
                  onClick={() => navigate(`/system/data-management/departments/${dept.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/departments/${dept.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <BulkCheckbox checked={isSelected} onChange={() => toggleOne(dept.id)} />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Building2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{dept.name}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500">{dept.code}</span>
                          <StatusBadge status={dept.status} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          <span>{dept.plantName}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>Manager: {dept.manager}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{dept.employees} employees</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{dept.groups} group(s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-1.5 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <QuickAction label="View Groups" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => navigate(`/system/data-management/departments/${dept.id}`)} />
                      <QuickAction label="Edit" icon={<Pencil className="h-3.5 w-3.5" />} />
                      <QuickAction label="Assign Groups" icon={<Users className="h-3.5 w-3.5" />} />
                      <ControlTowerLink plantName={dept.plantName} />
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-slate-400 hover:text-slate-600 transition-colors active:scale-[0.97]" aria-label="More actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{filtered.length} of {departments.length} department(s)</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700" />
            Select all
          </label>
        </div>
      </div>
    </div>
  );
}
