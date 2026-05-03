import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type PlantDetail, getGlobalPlants, subscribePlantChanges, notifyPlantChanges } from "./PlantDetailPage";
import { Building2, Factory, Cpu, ExternalLink, Trash2, Pencil, X, Plus, GitBranch } from "lucide-react";
import { ActionsDropdown } from "./shared";

/* ── Inline Modal & Confirm ── */

interface CrudModalField {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea";
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
}

function CrudModal({ open, onClose, title, fields, values, onChange, onSave, onDelete }: {
  open: boolean; onClose: () => void; title: string;
  fields: CrudModalField[]; values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void; onDelete?: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-3 p-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {f.label}{f.required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {f.type === "select" && f.options ? (
                <select value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="">Select...</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder}
                  className="w-full min-h-[60px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500" />
              ) : (
                <input type="text" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500" />
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <div>
              {onDelete && (
                <button type="button" onClick={onDelete}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">Delete</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">Cancel</button>
              <button type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm">Save</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

function ConfirmDialog({ open, onClose, title, message, onConfirm }: {
  open: boolean; onClose: () => void; title: string; message: string; onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{message}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          <button type="button" onClick={() => { onConfirm(); onClose(); }}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors">Delete</button>
        </div>
      </div>
    </>
  );
}

/* ── Constants ── */

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const modalFields: CrudModalField[] = [
  { key: "name", label: "Plant Name", required: true, placeholder: "e.g. Main Plant" },
  { key: "code", label: "Plant Code", required: true, placeholder: "e.g. MP-01" },
  { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  { key: "building", label: "Building / Site", placeholder: "e.g. Building A" },
  { key: "address", label: "Address / Location", placeholder: "e.g. 123 Industrial Blvd" },
  { key: "timezone", label: "Timezone", placeholder: "e.g. America/Detroit (EST)" },
  { key: "calendar", label: "Default Calendar / Schedule", placeholder: "e.g. Standard 5-day Week" },
  { key: "notes", label: "Description / Notes", type: "textarea", placeholder: "e.g. Primary assembly facility..." },
];

interface PlantSummary {
  id: string; name: string; code: string; building: string; status: "active" | "inactive";
  lines: number; departments: number; groups: number; resources: number;
}

function toSummary(p: PlantDetail): PlantSummary {
  return { id: p.id, name: p.name, code: p.code, building: p.building, status: p.status, lines: p.lines, departments: p.departments, groups: p.groups, resources: p.resources };
}

function BulkCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <input type="checkbox" checked={checked} onChange={onChange}
      className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-emerald-500/40 cursor-pointer dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
      onClick={(e) => e.stopPropagation()} />
  );
}

/* ── Component ── */

export function PlantStructurePage() {
  const navigate = useNavigate();

  const [rev, setRev] = useState(0);
  const [plants, setPlants] = useState<PlantDetail[]>(() => getGlobalPlants());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  useState(() => {
    const unsub = subscribePlantChanges(() => {
      setPlants([...getGlobalPlants()]);
      setRev((r) => r + 1);
    });
    return unsub;
  });
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
    const local = getGlobalPlants();
    if (editingId) {
      const idx = local.findIndex((p) => p.id === editingId);
      if (idx >= 0) local[idx] = { ...local[idx], name: form.name, code: form.code, status: form.status as "active" | "inactive", building: form.building || "", address: form.address || "", timezone: form.timezone || "", calendar: form.calendar || "", notes: form.notes || "" };
    } else {
      const maxId = local.reduce((max, p) => Math.max(max, parseInt(p.id.slice(1)) || 0), 0);
      const newId = `P${String(maxId + 1).padStart(3, "0")}`;
      local.push({ id: newId, name: form.name, code: form.code, status: form.status as "active" | "inactive", building: form.building || "", address: form.address || "", timezone: form.timezone || "", calendar: form.calendar || "", notes: form.notes || "", lines: 0, departments: 0, groups: 0, resources: 0 });
    }
    notifyPlantChanges();
    setModalOpen(false);
  };

  const handleDelete = (id: string) => { setEditingId(id); setConfirmOpen(true); };

  const confirmDelete = () => {
    if (editingId) {
      const local = getGlobalPlants();
      const idx = local.findIndex((p) => p.id === editingId);
      if (idx >= 0) local.splice(idx, 1);
      notifyPlantChanges();
      setSelected((prev) => { const next = new Set(prev); next.delete(editingId); return next; });
    }
    setConfirmOpen(false);
    setModalOpen(false);
  };

  const bulkActivate = () => {
    const local = getGlobalPlants();
    local.forEach((p) => { if (selected.has(p.id)) p.status = "active"; });
    notifyPlantChanges();
    setSelected(new Set());
  };

  const bulkDeactivate = () => {
    const local = getGlobalPlants();
    local.forEach((p) => { if (selected.has(p.id)) p.status = "inactive"; });
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
    <div className="flex h-full flex-col overflow-hidden bg-slate-100 dark:bg-slate-950" style={{ minHeight: 0 }}>
      {/* ═══════ LAYER 1: HEADER ═══════ */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Plant Structure</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure plants, locations, and defaults.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/system/data-management")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-transparent px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </header>

      {/* ═══════ LAYER 2: ACTION BAR ═══════ */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plants..."
            className="h-10 w-[320px] rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500"
          />
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-slate-900 text-white dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{selected.size} selected</span>
          )}
          <button
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            Add Plant
          </button>
        </div>
      </div>

      {/* ═══════ LAYER 2b: BULK ACTION BAR ═══════ */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 border-y border-slate-200 bg-slate-50 px-6 py-2 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{selected.size} plant(s) selected</span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button onClick={bulkActivate} className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">Activate</button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button onClick={bulkDeactivate} className="text-xs text-amber-600 hover:underline dark:text-amber-400">Deactivate</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Clear</button>
        </div>
      )}

      {/* ═══════ LAYER 3: CONTENT ═══════ */}
      <div className="flex-1 overflow-y-auto bg-slate-100 px-6 py-4 dark:bg-slate-950">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 dark:bg-slate-800">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {search ? "No plants match your search" : "No plants configured"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add your first plant to start modeling your production structure.</p>
            <button onClick={openAdd} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Add Plant
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filtered.map((plant) => {
                const s = toSummary(plant);
                const isSelected = selected.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-3 transition-all hover:bg-slate-50 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 ${
                      isSelected
                        ? "border-emerald-500/40 ring-1 ring-emerald-500/40 bg-emerald-50 dark:bg-slate-800"
                        : "border-slate-200"
                    }`}
                  >
                    <BulkCheckbox checked={isSelected} onChange={() => toggleOne(s.id)} />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Factory className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.name}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{s.code}</span>
                        {s.status === "active" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500">ID: {s.id}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{s.building}</span>
                        <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{s.lines} line(s)</span>
                        <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{s.departments} dept(s)</span>
                        <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{s.groups} group(s)</span>
                        <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{s.resources} resource(s)</span>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate("/system/data-management/plant/" + s.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors active:scale-[0.97]"
                      >
                        Details
                      </button>
                      <ActionsDropdown actions={[
                        { label: "Edit", icon: <Pencil className="h-3 w-3" />, onClick: () => openEdit(plant) },
                        { label: "Delete", icon: <Trash2 className="h-3 w-3" />, onClick: () => handleDelete(s.id) },
                        { label: "Manage Lines", icon: <GitBranch className="h-3 w-3" />, onClick: () => navigate("/system/data-management/production-lines") },
                        { label: "View Resources", icon: <Cpu className="h-3 w-3" />, onClick: () => navigate("/system/data-management/resources") },
                        { label: "View in Control Tower", icon: <ExternalLink className="h-3 w-3" />, onClick: () => navigate("/control-tower?plant=" + encodeURIComponent(s.name)) },
                      ]} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <span>{filtered.length} of {displayPlants.length} plant(s)</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300" />
                Select all
              </label>
            </div>
          </>
        )}
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
