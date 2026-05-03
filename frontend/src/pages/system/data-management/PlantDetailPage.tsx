import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Building2, Factory, GitBranch, Cpu, Users, Layers, Globe, MapPin, Clock, FileText, ChevronLeft, ExternalLink, Trash2, Pencil } from "lucide-react";
import { Breadcrumbs, DataManagementNav, CrudModal, ConfirmDialog, StatusBadge } from "./shared";

/* ── Plant interface with enriched fields ── */

export interface PlantDetail {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  building: string;
  address: string;
  timezone: string;
  calendar: string;
  notes: string;
  lines: number;
  departments: number;
  groups: number;
  resources: number;
}

/* ── Standalone data source (shared with PlantStructurePage) ── */

export const initialPlantDetails: PlantDetail[] = [
  { id: "P001", name: "Main Plant", code: "MP-01", status: "active", building: "Building A", address: "123 Industrial Blvd, Detroit, MI 48201", timezone: "America/Detroit (EST)", calendar: "Standard 5-day Week", notes: "Primary assembly facility for cylinder and STB unit production.", lines: 3, departments: 4, groups: 8, resources: 42 },
  { id: "P002", name: "Secondary Plant", code: "SP-01", status: "active", building: "Building B", address: "456 Manufacturing Dr, Toledo, OH 43601", timezone: "America/New_York (EST)", calendar: "Standard 5-day Week", notes: "Harnesses and pipes fabrication supporting main plant assembly.", lines: 2, departments: 3, groups: 5, resources: 18 },
  { id: "P003", name: "Warehouse Plant", code: "WP-01", status: "inactive", building: "Warehouse 1", address: "789 Logistics Ave, Chicago, IL 60601", timezone: "America/Chicago (CST)", calendar: "Standard 5-day Week", notes: "Storage and kitting facility. Currently inactive pending reconfiguration.", lines: 1, departments: 1, groups: 2, resources: 6 },
];

/* ── State holder so PlantStructurePage mutations reflect here too ── */

let globalPlants: PlantDetail[] = [...initialPlantDetails];
let listeners: Array<() => void> = [];

export function subscribePlantChanges(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function notifyPlantChanges() {
  listeners.forEach((fn) => fn());
}

export function getGlobalPlants() {
  return globalPlants;
}

/* ── Modal field definitions ── */

const editFields = [
  { key: "name", label: "Plant Name", required: true, placeholder: "e.g. Main Plant" },
  { key: "code", label: "Plant Code", required: true, placeholder: "e.g. MP-01" },
  { key: "status", label: "Status", type: "select" as const, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  { key: "building", label: "Building / Site", placeholder: "e.g. Building A" },
  { key: "address", label: "Address / Location", placeholder: "e.g. 123 Industrial Blvd" },
  { key: "timezone", label: "Timezone", placeholder: "e.g. America/Detroit (EST)" },
  { key: "calendar", label: "Default Calendar / Schedule", placeholder: "e.g. Standard 5-day Week" },
  { key: "notes", label: "Description / Notes", type: "textarea" as const, placeholder: "e.g. Primary assembly facility..." },
];

/* ── Component ── */

export function PlantDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { plantId } = useParams<{ plantId: string }>();
  const [plant, setPlant] = useState<PlantDetail | undefined>(() => globalPlants.find((p) => p.id === plantId));
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  /* ── Sync with global state ── */
  useState(() => {
    const unsub = subscribePlantChanges(() => {
      setPlant(globalPlants.find((p) => p.id === plantId));
    });
    return unsub;
  });

  if (!plant) {
    return (
      <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <header className="flex shrink-0 items-center gap-4 border-b border-(--border-soft) bg-(--surface-1) px-5 py-3">
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-(--text-primary)">Plant Not Found</h1>
          </div>
        </header>
        <DataManagementNav currentPath={location.pathname} />
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">Plant &ldquo;{plantId}&rdquo; does not exist.</div>
      </div>
    );
  }

  const openEdit = () => {
    setForm({ name: plant.name, code: plant.code, status: plant.status, building: plant.building, address: plant.address, timezone: plant.timezone, calendar: plant.calendar, notes: plant.notes });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name?.trim() || !form.code?.trim()) return;
    globalPlants = globalPlants.map((p) =>
      p.id === plant.id ? { ...p, name: form.name, code: form.code, status: form.status as "active" | "inactive", building: form.building || "", address: form.address || "", timezone: form.timezone || "", calendar: form.calendar || "", notes: form.notes || "" } : p
    );
    setPlant(globalPlants.find((p) => p.id === plant.id));
    setModalOpen(false);
    notifyPlantChanges();
  };

  const handleDelete = () => {
    const idx = globalPlants.findIndex((p) => p.id === plant.id);
    if (idx >= 0) {
      globalPlants.splice(idx, 1);
      notifyPlantChanges();
    }
    setConfirmOpen(false);
    navigate("/system/data-management/plant");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
      <header className="flex shrink-0 items-center gap-4 border-b border-(--border-soft) bg-(--surface-1) px-5 py-3">
        <button type="button" onClick={() => navigate("/system/data-management/plant")} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 transition-colors" aria-label="Back to plant list">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Factory className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-(--text-primary)">{plant.name}</h1>
            <StatusBadge status={plant.status} />
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500">{plant.code}</span>
          </div>
          <p className="text-xs text-(--text-secondary)">ID: {plant.id} &middot; {plant.building}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openEdit} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]">
            <Pencil className="h-3.5 w-3.5 inline mr-1" />
            Edit
          </button>
          <button type="button" onClick={() => setConfirmOpen(true)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors active:scale-[0.97]">
            <Trash2 className="h-3.5 w-3.5 inline mr-1" />
            Delete
          </button>
        </div>
      </header>

      <DataManagementNav currentPath={location.pathname} />

      <div className="flex-1 overflow-y-auto bg-(--page-bg) p-5">
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Plants", to: "/system/data-management/plant" }, { label: plant.name }]} />

        {/* ── Detail fields ── */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">General Information</h2>
            <div className="space-y-3">
              <Field icon={Building2} label="Building / Site" value={plant.building} />
              <Field icon={MapPin} label="Address / Location" value={plant.address} />
              <Field icon={Globe} label="Timezone" value={plant.timezone} />
              <Field icon={Clock} label="Default Calendar / Schedule" value={plant.calendar} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Summary Counters</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Production Lines" value={plant.lines} icon={GitBranch} href="/system/data-management/production-lines" navigate={navigate} />
              <StatCard label="Departments" value={plant.departments} icon={Layers} href="/system/data-management/departments" navigate={navigate} />
              <StatCard label="Resource Groups" value={plant.groups} icon={Users} href="/system/data-management/resource-groups" navigate={navigate} />
              <StatCard label="Resources" value={plant.resources} icon={Cpu} href="/system/data-management/resources" navigate={navigate} />
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {plant.notes && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <FileText className="h-3.5 w-3.5" />
              Description / Notes
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">{plant.notes}</p>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</h2>
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={GitBranch} label="Manage Production Lines" onClick={() => navigate("/system/data-management/production-lines")} />
            <ActionBtn icon={Layers} label="View Departments" onClick={() => navigate("/system/data-management/departments")} />
            <ActionBtn icon={Users} label="View Resource Groups" onClick={() => navigate("/system/data-management/resource-groups")} />
            <ActionBtn icon={Cpu} label="View Resources" onClick={() => navigate("/system/data-management/resources")} />
            <ActionBtn icon={Building2} label="View Full Structure" onClick={() => navigate("/system/data-management/structure")} />
            <ActionBtn icon={ExternalLink} label="Open in Control Tower" onClick={() => navigate(`/control-tower?plant=${encodeURIComponent(plant.name)}`)} />
          </div>
        </div>
      </div>

      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Plant"
        fields={editFields}
        values={form}
        onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
        onSave={handleSave}
        onDelete={() => { setModalOpen(false); setConfirmOpen(true); }}
      />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Plant"
        message={`Are you sure you want to delete "${plant.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ── Small helpers ── */

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-slate-500">{label}</div>
        <div className="text-sm text-slate-900">{value || <span className="italic text-slate-300">Not set</span>}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, href, navigate }: { label: string; value: number; icon: any; href: string; navigate: any }) {
  return (
    <button type="button" onClick={() => navigate(href)} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-left transition-all hover:border-slate-200 hover:bg-slate-100 active:scale-[0.98]">
      <div className="flex items-center justify-between">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-base font-bold text-slate-900">{value}</span>
      </div>
      <div className="mt-1 text-[10px] text-slate-500">{label}</div>
    </button>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </button>
  );
}
