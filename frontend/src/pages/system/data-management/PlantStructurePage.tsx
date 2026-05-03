import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { type PlantDetail, getGlobalPlants, subscribePlantChanges, notifyPlantChanges } from "./PlantDetailPage";
import { Building2, Factory, Pencil, GitBranch, Cpu, ExternalLink, Trash2 } from "lucide-react";
import {
  Breadcrumbs, SearchBar, FilterBar, EmptyState, StatusBadge,
  BulkCheckbox, DataManagementNav, PrimaryAction, ActionsDropdown,
  CrudModal, ConfirmDialog
} from "./shared";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const modalFields = [
  { key: "name", label: "Plant Name", required: true, placeholder: "e.g. Main Plant" },
  { key: "code", label: "Plant Code", required: true, placeholder: "e.g. MP-01" },
  { key: "status", label: "Status", type: "select" as const, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  { key: "building", label: "Building / Site", placeholder: "e.g. Building A" },
  { key: "address", label: "Address / Location", placeholder: "e.g. 123 Industrial Blvd" },
  { key: "timezone", label: "Timezone", placeholder: "e.g. America/Detroit (EST)" },
  { key: "calendar", label: "Default Calendar / Schedule", placeholder: "e.g. Standard 5-day Week" },
  { key: "notes", label: "Description / Notes", type: "textarea" as const, placeholder: "e.g. Primary assembly facility..." },
];

/* ── Map PlantDetail → summary object for list display ── */

interface PlantSummary {
  id: string; name: string; code: string; building: string; status: "active" | "inactive";
  lines: number; departments: number; groups: number; resources: number;
}

function toSummary(p: PlantDetail): PlantSummary {
  return { id: p.id, name: p.name, code: p.code, building: p.building, status: p.status, lines: p.lines, departments: p.departments, groups: p.groups, resources: p.resources };
}

export function PlantStructurePage() {
  const navigate = useNavigate();
  const location = useLocation();

  /* ── Use a rendering counter to force updates when global data changes ── */
  const [rev, setRev] = useState(0);
  const [plants, setPlants] = useState<PlantDetail[]>(() => getGlobalPlants());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  /* ── Sync with global data ── */
  useState(() => {
    const unsub = subscribePlantChanges(() => {
      setPlants([...getGlobalPlants()]);
      setRev((r) => r + 1);
    });
    return unsub;
  });
  /* re-read on render after global change */
  const displayPlants = rev >= 0 ? getGlobalPlants() : plants;

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", code: "", status: "active", building: "", address: "", timezone: "", calendar: "", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (plant: PlantDetail) => {
    setEditingId(plant.id);
    setForm({ name: plant.name, code: plant.code, status: plant.status, building: plant.building, address: plant.address, timezone: plant.timezone, calendar: plant.calendar, notes: plant.notes });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name?.trim() || !form.code?.trim()) return;
    const plants = getGlobalPlants();
    if (editingId) {
      const idx = plants.findIndex((p) => p.id === editingId);
      if (idx >= 0) {
        plants[idx] = { ...plants[idx], name: form.name, code: form.code, status: form.status as "active" | "inactive", building: form.building || "", address: form.address || "", timezone: form.timezone || "", calendar: form.calendar || "", notes: form.notes || "" };
      }
    } else {
      const maxId = plants.reduce((max, p) => Math.max(max, parseInt(p.id.slice(1)) || 0), 0);
      const newId = `P${String(maxId + 1).padStart(3, "0")}`;
      plants.push({ id: newId, name: form.name, code: form.code, status: form.status as "active" | "inactive", building: form.building || "", address: form.address || "", timezone: form.timezone || "", calendar: form.calendar || "", notes: form.notes || "", lines: 0, departments: 0, groups: 0, resources: 0 });
    }
    notifyPlantChanges();
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setEditingId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (editingId) {
      const plants = getGlobalPlants();
      const idx = plants.findIndex((p) => p.id === editingId);
      if (idx >= 0) plants.splice(idx, 1);
      notifyPlantChanges();
      setSelected((prev) => { const next = new Set(prev); next.delete(editingId); return next; });
    }
    setConfirmOpen(false);
    setModalOpen(false);
  };

  const bulkActivate = () => {
    const plants = getGlobalPlants();
    plants.forEach((p) => { if (selected.has(p.id)) p.status = "active"; });
    notifyPlantChanges();
    setSelected(new Set());
  };
  const bulkDeactivate = () => {
    const plants = getGlobalPlants();
    plants.forEach((p) => { if (selected.has(p.id)) p.status = "inactive"; });
    notifyPlantChanges();
    setSelected(new Set());
  };

  const filtered = displayPlants.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.building.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const currentPlant = editingId ? displayPlants.find((p) => p.id === editingId) : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
      {/* Header */}
      <header className="flex shrink-0 items-center gap-4 border-b border-(--border-soft) bg-(--surface-1) px-5 py-3">
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight text-(--text-primary)">Plant Structure</h1>
          <p className="text-xs text-(--text-secondary)">Configure plants, production lines, departments, resource groups, and resources.</p>
        </div>
      </header>

      <DataManagementNav currentPath={location.pathname} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-(--page-bg) p-4">
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Plant Structure" }]} />

        {/* Toolbar */}
        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search plants..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && <span className="text-xs text-slate-500">{selected.size} selected</span>}
            <button onClick={openAdd} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]">
              + Add Plant
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span className="font-medium">{selected.size} plant(s) selected</span>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Assign to line</button>
            <span className="text-blue-400">|</span>
            <button onClick={bulkActivate} className="hover:underline">Activate</button>
            <span className="text-blue-400">|</span>
            <button onClick={bulkDeactivate} className="hover:underline">Deactivate</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">
              Clear
            </button>
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title={search ? "No plants match your search" : "No plants configured"}
            description="Add your first plant to start modeling your production structure."
            action={{ label: "+ Add Plant", onClick: openAdd }}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((plant) => {
              const s = toSummary(plant);
              const isSelected = selected.has(s.id);
              return (
                <div
                  key={s.id}
                  className={`group cursor-pointer rounded-xl border bg-white px-3 py-2.5 transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.99] ${
                    isSelected ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"
                  }`}
                  onClick={() => navigate(`/system/data-management/plant/${s.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/plant/${s.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <BulkCheckbox checked={isSelected} onChange={() => toggleOne(s.id)} />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Factory className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500">{s.code}</span>
                          <StatusBadge status={s.status} />
                          <span className="text-[10px] text-slate-400">ID: {s.id}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          <span>{s.building}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{s.lines} line(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{s.departments} dept(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{s.groups} group(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{s.resources} resource(s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <PrimaryAction onClick={() => navigate(`/system/data-management/plant/${s.id}`)} />
                      <ActionsDropdown actions={[
                        { label: "Edit", icon: <Pencil className="h-3 w-3" />, onClick: () => openEdit(plant) },
                        { label: "Delete", icon: <Trash2 className="h-3 w-3" />, onClick: () => handleDelete(s.id) },
                        { label: "Manage Lines", icon: <GitBranch className="h-3 w-3" />, onClick: () => navigate("/system/data-management/production-lines") },
                        { label: "View Resources", icon: <Cpu className="h-3 w-3" />, onClick: () => navigate("/system/data-management/resources") },
                        { label: "View in Control Tower", icon: <ExternalLink className="h-3 w-3" />, onClick: () => navigate(`/control-tower?plant=${encodeURIComponent(s.name)}`) },
                      ]} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{filtered.length} of {displayPlants.length} plant(s)</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700" />
            Select all
          </label>
        </div>
      </div>
      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Plant" : "Add Plant"}
        fields={modalFields}
        values={form}
        onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
        onSave={handleSave}
        onDelete={editingId ? () => handleDelete(editingId) : undefined}
      />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Plant"
        message={`Are you sure you want to delete "${currentPlant?.name ?? editingId}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
