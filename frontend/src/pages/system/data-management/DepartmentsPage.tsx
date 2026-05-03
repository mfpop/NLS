import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Layers, Pencil, Users, Cpu, ExternalLink, Trash2 } from "lucide-react";
import {
  Breadcrumbs, ContextBar, SearchBar, FilterBar, EmptyState, StatusBadge,
  BulkCheckbox, DataManagementNav, PrimaryAction, ActionsDropdown,
  CrudModal, ConfirmDialog
} from "./shared";

interface Department {
  id: string;
  name: string;
  code: string;
  manager: string;
  employees: number;
  groups: number;
  resources: number;
  lines: string[];
  status: "active" | "inactive";
  plantId: string;
  plantName: string;
}

let nextDeptId = 6;

const initialDepartments: Department[] = [
  { id: "D001", name: "Assembly", code: "ASM", manager: "John Smith", employees: 45, groups: 3, resources: 14, lines: ["C2-Cylinder Assembly", "Line A", "Line B"], status: "active", plantId: "P001", plantName: "Main Plant" },
  { id: "D002", name: "Machining", code: "MCH", manager: "Sarah Chen", employees: 32, groups: 2, resources: 10, lines: ["C2-Cylinder Assembly", "Line B"], status: "active", plantId: "P001", plantName: "Main Plant" },
  { id: "D003", name: "Quality Control", code: "QC", manager: "Mike Brown", employees: 18, groups: 2, resources: 8, lines: ["C2-Cylinder Assembly", "Line C"], status: "active", plantId: "P001", plantName: "Main Plant" },
  { id: "D004", name: "Logistics", code: "LOG", manager: "Ana Garcia", employees: 22, groups: 3, resources: 12, lines: ["Line A", "Line B", "Shared"], status: "active", plantId: "P002", plantName: "Secondary Plant" },
  { id: "D005", name: "Maintenance", code: "MTN", manager: "David Kim", employees: 14, groups: 1, resources: 4, lines: ["All Lines"], status: "inactive", plantId: "P002", plantName: "Secondary Plant" },
];

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const modalFields = [
  { key: "name", label: "Department Name", required: true, placeholder: "e.g. Assembly" },
  { key: "code", label: "Code", required: true, placeholder: "e.g. ASM" },
  { key: "manager", label: "Manager", placeholder: "e.g. John Smith" },
  { key: "employees", label: "Employees", placeholder: "e.g. 45" },
  { key: "status", label: "Status", type: "select" as const, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

export function DepartmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", code: "", manager: "", employees: "", status: "active" });
    setModalOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setForm({ name: d.name, code: d.code, manager: d.manager, employees: String(d.employees), status: d.status });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name?.trim() || !form.code?.trim()) return;
    if (editingId) {
      setDepartments((prev) => prev.map((d) => d.id === editingId ? {
        ...d, name: form.name, code: form.code, manager: form.manager || d.manager,
        employees: parseInt(form.employees) || 0, status: form.status as "active" | "inactive"
      } : d));
    } else {
      const newId = `D${String(nextDeptId++).padStart(3, "0")}`;
      setDepartments((prev) => [...prev, {
        id: newId, name: form.name, code: form.code, manager: form.manager || "", employees: parseInt(form.employees) || 0,
        groups: 0, resources: 0, lines: [], status: form.status as "active" | "inactive", plantId: "P001", plantName: "Main Plant"
      }]);
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (editingId) {
      setDepartments((prev) => prev.filter((d) => d.id !== editingId));
      setSelected((prev) => { const next = new Set(prev); next.delete(editingId); return next; });
    }
    setConfirmOpen(false);
    setModalOpen(false);
  };

  const bulkActivate = () => {
    setDepartments((prev) => prev.map((d) => selected.has(d.id) ? { ...d, status: "active" as const } : d));
    setSelected(new Set());
  };
  const bulkDeactivate = () => {
    setDepartments((prev) => prev.map((d) => selected.has(d.id) ? { ...d, status: "inactive" as const } : d));
    setSelected(new Set());
  };

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
      <header className="flex shrink-0 items-center gap-4 border-b border-(--border-soft) bg-(--surface-1) px-5 py-3">
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight text-(--text-primary)">Departments</h1>
          <p className="text-xs text-(--text-secondary)">Organize departments, production lines, and resource groups across your plants.</p>
        </div>
      </header>

      <DataManagementNav currentPath={location.pathname} />

      <div className="flex-1 overflow-y-auto bg-(--page-bg) p-4">
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Departments" }]} />
        <ContextBar segments={[{ label: "All Plants" }]} />

        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search departments..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && <span className="text-xs text-slate-500">{selected.size} selected</span>}
            <button onClick={openAdd} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]">
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
            <button onClick={bulkActivate} className="hover:underline">Activate</button>
            <span className="text-blue-400">|</span>
            <button onClick={bulkDeactivate} className="hover:underline">Deactivate</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">Clear</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title={search ? "No departments match your search" : "No departments configured"}
            description="Create departments and assign managers."
            action={{ label: "+ Add Department", onClick: openAdd }}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((dept) => {
              const isSelected = selected.has(dept.id);
              return (
                <div
                  key={dept.id}
                  className={`group rounded-xl border bg-white px-3 py-2.5 transition-all hover:border-slate-300 hover:shadow-sm ${
                    isSelected ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"
                  }`}
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
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{dept.resources} resource(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>Lines: {dept.lines.join(", ")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <PrimaryAction onClick={() => navigate(`/system/data-management/departments/${dept.id}`)} />
                      <ActionsDropdown actions={[
                        { label: "Edit", icon: <Pencil className="h-3 w-3" />, onClick: () => openEdit(dept) },
                        { label: "Delete", icon: <Trash2 className="h-3 w-3" />, onClick: () => { setEditingId(dept.id); setConfirmOpen(true); } },
                        { label: "Assign Groups", icon: <Users className="h-3 w-3" />, onClick: () => {} },
                        { label: "View Resources", icon: <Cpu className="h-3 w-3" />, onClick: () => navigate("/system/data-management/resources") },
                        { label: "View in Control Tower", icon: <ExternalLink className="h-3 w-3" />, onClick: () => navigate(`/control-tower?plant=${encodeURIComponent(dept.plantName)}&department=${encodeURIComponent(dept.name)}`) },
                      ]} />
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
      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Department" : "Add Department"} fields={modalFields} values={form} onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))} onSave={handleSave} onDelete={editingId ? () => { setConfirmOpen(true); } : undefined} />
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete Department" message={`Are you sure you want to delete "${departments.find(d => d.id === editingId)?.name}"? This action cannot be undone.`} onConfirm={confirmDelete} />
    </div>
  );
}
