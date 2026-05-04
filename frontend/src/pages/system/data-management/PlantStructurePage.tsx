import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Factory, Cpu, ExternalLink, Trash2, Pencil, X, Plus, GitBranch, Search } from "lucide-react";
import {
  CrudModal, ConfirmDialog, ActionsDropdown
} from "./shared";
import {
  type PlantDetail, getGlobalPlants, subscribePlantChanges, notifyPlantChanges
} from "./PlantDetailPage";

/* ── Constants ── */

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const TIMEZONE_OPTIONS = [
  { label: "America/Detroit (EST)", value: "America/Detroit (EST)" },
  { label: "America/New_York (EST)", value: "America/New_York (EST)" },
  { label: "America/Chicago (CST)", value: "America/Chicago (CST)" },
  { label: "America/Denver (MST)", value: "America/Denver (MST)" },
  { label: "America/Los_Angeles (PST)", value: "America/Los_Angeles (PST)" },
  { label: "America/Anchorage (AKST)", value: "America/Anchorage (AKST)" },
  { label: "Pacific/Honolulu (HST)", value: "Pacific/Honolulu (HST)" },
  { label: "America/Toronto (EST)", value: "America/Toronto (EST)" },
  { label: "America/Vancouver (PST)", value: "America/Vancouver (PST)" },
  { label: "America/Mexico_City (CST)", value: "America/Mexico_City (CST)" },
  { label: "America/Monterrey (CST)", value: "America/Monterrey (CST)" },
  { label: "America/Tijuana (PST)", value: "America/Tijuana (PST)" },
  { label: "America/Sao_Paulo (BRT)", value: "America/Sao_Paulo (BRT)" },
  { label: "Europe/London (GMT)", value: "Europe/London (GMT)" },
  { label: "Europe/Berlin (CET)", value: "Europe/Berlin (CET)" },
  { label: "Europe/Paris (CET)", value: "Europe/Paris (CET)" },
  { label: "Europe/Madrid (CET)", value: "Europe/Madrid (CET)" },
  { label: "Europe/Rome (CET)", value: "Europe/Rome (CET)" },
  { label: "Europe/Stockholm (CET)", value: "Europe/Stockholm (CET)" },
  { label: "Europe/Warsaw (CET)", value: "Europe/Warsaw (CET)" },
  { label: "Europe/Moscow (MSK)", value: "Europe/Moscow (MSK)" },
  { label: "Europe/Istanbul (TRT)", value: "Europe/Istanbul (TRT)" },
  { label: "Asia/Dubai (GST)", value: "Asia/Dubai (GST)" },
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata (IST)" },
  { label: "Asia/Shanghai (CST)", value: "Asia/Shanghai (CST)" },
  { label: "Asia/Singapore (SGT)", value: "Asia/Singapore (SGT)" },
  { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo (JST)" },
  { label: "Asia/Seoul (KST)", value: "Asia/Seoul (KST)" },
  { label: "Australia/Sydney (AEDT)", value: "Australia/Sydney (AEDT)" },
  { label: "Australia/Melbourne (AEDT)", value: "Australia/Melbourne (AEDT)" },
  { label: "Pacific/Auckland (NZDT)", value: "Pacific/Auckland (NZDT)" },
  { label: "UTC", value: "UTC" },
];

const modalFields = [
  { key: "name", label: "Plant Name", required: true, placeholder: "e.g. Main Plant" },
  { key: "code", label: "Plant Code", required: true, placeholder: "e.g. MP-01" },
  { key: "status", label: "Status", type: "select" as const, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  { key: "building", label: "Building / Site", placeholder: "e.g. Building A" },
  { key: "address", label: "Address / Location", placeholder: "e.g. 123 Industrial Blvd" },
  { key: "timezone", label: "Timezone", type: "select" as const, options: TIMEZONE_OPTIONS },
  { key: "calendar", label: "Default Calendar / Schedule", placeholder: "e.g. Standard 5-day Week" },
  { key: "notes", label: "Description / Notes", type: "textarea" as const, placeholder: "e.g. Primary assembly facility..." },
];

/* ── Component ── */

export function PlantStructurePage() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<PlantDetail[]>(() => getGlobalPlants());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  // Subscribe to plant data changes
  useState(() => {
    const unsub = subscribePlantChanges(() => setPlants([...getGlobalPlants()]));
    return unsub;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", code: "", status: "active", building: "", address: "", timezone: "", calendar: "", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (plant: PlantDetail) => {
    setEditingId(plant.id);
    setForm({
      name: plant.name, code: plant.code, status: plant.status,
      building: plant.building, address: plant.address, timezone: plant.timezone,
      calendar: plant.calendar, notes: plant.notes,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name?.trim() || !form.code?.trim()) return;
    const local = getGlobalPlants();
    if (editingId) {
      const idx = local.findIndex((p) => p.id === editingId);
      if (idx >= 0) {
        local[idx] = {
          ...local[idx],
          name: form.name, code: form.code,
          status: form.status as "active" | "inactive",
          building: form.building || "", address: form.address || "",
          timezone: form.timezone || "", calendar: form.calendar || "",
          notes: form.notes || "",
        };
      }
    } else {
      const maxId = local.reduce((max, p) => Math.max(max, parseInt(p.id.slice(1)) || 0), 0);
      const newId = `P${String(maxId + 1).padStart(3, "0")}`;
      local.push({
        id: newId, name: form.name, code: form.code,
        status: form.status as "active" | "inactive",
        building: form.building || "", address: form.address || "",
        timezone: form.timezone || "", calendar: form.calendar || "",
        notes: form.notes || "",
        lines: 0, departments: 0, groups: 0, resources: 0,
      });
    }
    notifyPlantChanges();
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (editingId) {
      const local = getGlobalPlants();
      const idx = local.findIndex((p) => p.id === editingId);
      if (idx >= 0) local.splice(idx, 1);
      notifyPlantChanges();
    }
    setConfirmOpen(false);
    setModalOpen(false);
  };

  const filtered = plants.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const currentPlant = editingId ? plants.find((p) => p.id === editingId) : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100" style={{ minHeight: 0 }}>
      {/* ── HEADER ── */}
      <header className="flex shrink-0 items-center justify-between bg-white border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Building2 className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">Plant Structure</h1>
            <p className="text-xs text-slate-500">Configure plants, locations, and defaults.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/system/data-management")}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4 stroke-current" />
          Close
        </button>
      </header>

      {/* ── ACTION BAR ── */}
      <div className="flex shrink-0 items-center justify-between bg-white border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-current" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plants..."
              className="h-10 w-[320px] rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          {/* Filter tabs */}
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`h-8 rounded-md px-3 text-xs font-medium transition-all duration-150 ${
                  filter === f.value
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 transition-all duration-150 shadow-sm"
        >
          <Plus className="h-4 w-4 stroke-current" />
          Add Plant
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto bg-slate-100 p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
              <Building2 className="h-6 w-6 stroke-current" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {search ? "No plants match your search" : "No plants configured"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">Add your first plant to start modeling your production structure.</p>
            <button onClick={openAdd} className="mt-4 inline-flex items-center gap-1.5 h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 transition-all duration-150 shadow-sm">
              <Plus className="h-4 w-4 stroke-current" />
              Add Plant
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((plant) => (
              <div
                key={plant.id}
                className="group flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 transition-all duration-150 hover:shadow-sm"
              >
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Factory className="h-5 w-5 stroke-current" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-slate-900">{plant.name}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-500">{plant.code}</span>
                    {plant.status === "active" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span>{plant.building}</span>
                    <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                    <span>{plant.lines} line(s)</span>
                    <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                    <span>{plant.departments} dept(s)</span>
                    <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                    <span>{plant.groups} group(s)</span>
                    <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                    <span>{plant.resources} resource(s)</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate("/system/data-management/plant/" + plant.id)}
                    className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all duration-150"
                  >
                    Details
                  </button>
                  <ActionsDropdown
                    buttonClass="w-9 h-9 rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 transition-all duration-150 inline-flex items-center justify-center"
                    actions={[
                      { label: "Edit", icon: <Pencil className="w-4 h-4 stroke-current" />, onClick: () => openEdit(plant) },
                      { label: "Delete", icon: <Trash2 className="w-4 h-4 stroke-current" />, onClick: () => { setEditingId(plant.id); setConfirmOpen(true); }, danger: true },
                      { label: "Manage Lines", icon: <GitBranch className="w-4 h-4 stroke-current" />, onClick: () => navigate("/system/data-management/production-lines") },
                      { label: "View Resources", icon: <Cpu className="w-4 h-4 stroke-current" />, onClick: () => navigate("/system/data-management/resources") },
                      { label: "View in Control Tower", icon: <ExternalLink className="w-4 h-4 stroke-current" />, onClick: () => navigate("/control-tower?plant=" + encodeURIComponent(plant.name)) },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Plant" : "Add Plant"}
        fields={modalFields}
        values={form}
        onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
        onSave={handleSave}
        onDelete={editingId ? () => { setConfirmOpen(true); } : undefined}
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
