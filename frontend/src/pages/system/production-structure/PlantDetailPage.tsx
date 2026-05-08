import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2, Factory, Cpu, Pencil, ExternalLink, Trash2,
  X, ChevronLeft, GitBranch, Layers, Users, Activity, Database
} from "lucide-react";
import { CrudModal, ConfirmDialog } from "./shared";
import { usePlants, EMPTY_FORM } from "@/hooks/usePlants";
import type { Plant } from "@/types/plant";

/* ── Global plant store (shared across hooks) ── */

let globalPlantsCache: Plant[] = [];

export function getGlobalPlants(): Plant[] {
  return globalPlantsCache;
}

/* ── Plant Detail Page ── */

export function PlantDetailPage() {
  const navigate = useNavigate();
  const { plantId } = useParams<{ plantId: string }>();
  const {
    plants, loading, savePlant, deletePlant,
  } = usePlants();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY_FORM });

  const plant = plants.find((p) => p.id === plantId);

  if (loading && !plant) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-slate-100" style={{ minHeight: 0 }}>
        <div className="flex items-center justify-center flex-1 text-xs text-slate-500">Loading plant details...</div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-slate-100" style={{ minHeight: 0 }}>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-6">
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Building2 className="h-5 w-5 stroke-current" />
          </div>
          <h1 className="text-sm font-semibold text-slate-900">Plant Not Found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">Plant "{plantId}" does not exist.</div>
      </div>
    );
  }

  const handleEdit = () => {
    setEditingId(plant.id);
    setForm({
      name: plant.name,
      code: plant.code,
      status: plant.status,
      building: plant.building || "",
      address: plant.address || "",
      timezone: plant.timezone || "",
      managerName: plant.managerName || "",
      managerEmail: plant.managerEmail || "",
      description: plant.description || "",
      defaultCalendarId: plant.defaultCalendarId || "",
      defaultScheduleId: plant.defaultScheduleId || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const result = await savePlant({
      ...EMPTY_FORM,
      ...form,
      status: (form.status || "active") as "active" | "inactive",
    }, editingId);
    if (result.ok) {
      setModalOpen(false);
    }
  };

  const handleDelete = async () => {
    await deletePlant(plant.id);
    navigate("/system/production-structure/plant");
  };

  const isActive = plant.status === "active";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100" style={{ minHeight: 0 }}>
      {/* HEADER */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6" style={{ height: "56px" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/system/production-structure/plant")}
            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4 stroke-current" />
          </button>
          <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Factory className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900">{plant.name}</h1>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-500">{plant.code}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-xs text-slate-500">ID: {plant.id} &middot; {plant.building || "No building"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all duration-150 ease-in-out"
          >
            <Pencil className="h-4 w-4 stroke-current" />
            Edit
          </button>
          <button
            onClick={() => navigate("/system/production-structure/plant")}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-all duration-150 ease-in-out"
          >
            <X className="w-4 h-4 stroke-current" />
            Close
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-slate-100 px-6 py-5">
        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard icon={GitBranch} label="Production Lines" value={plant.lineCount} color="bg-amber-100 text-amber-600" />
          <SummaryCard icon={Layers} label="Departments" value={plant.departmentCount} color="bg-indigo-100 text-indigo-600" />
          <SummaryCard icon={Users} label="Resource Groups" value={plant.groupCount} color="bg-violet-100 text-violet-600" />
          <SummaryCard icon={Cpu} label="Resources" value={plant.resourceCount} color="bg-teal-100 text-teal-600" />
        </div>

        {/* General Information */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">General Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoField icon={Building2} label="Building / Site" value={plant.building || "Not set"} />
            <InfoField icon={Activity} label="Status" value={isActive ? "Active" : "Inactive"} />
            <InfoField icon={Database} label="Timezone" value={plant.timezone || "Not set"} />
            <InfoField icon={ExternalLink} label="Address" value={plant.address || "Not set"} />
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoField icon={Users} label="Manager" value={plant.managerName || "Not set"} />
            <InfoField icon={ExternalLink} label="Manager Email" value={plant.managerEmail || "Not set"} />
          </div>
        </div>

        {/* Description */}
        {plant.description && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Description / Notes</h2>
            <p className="text-sm text-slate-700">{plant.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={GitBranch} label="View Production Lines" onClick={() => navigate("/system/production-structure/production-lines")} />
            <ActionBtn icon={Layers} label="View Departments" onClick={() => navigate("/system/production-structure/departments")} />
            <ActionBtn icon={Users} label="View Resource Groups" onClick={() => navigate("/system/production-structure/resource-groups")} />
            <ActionBtn icon={Cpu} label="View Resources" onClick={() => navigate("/system/production-structure/resources")} />
            <ActionBtn icon={ExternalLink} label="Open in Control Tower" onClick={() => navigate(`/control-tower?plant=${encodeURIComponent(plant.name)}`)} />
          </div>
        </div>

        {/* Timestamps */}
        <div className="mb-6 flex gap-4 text-[11px] text-slate-400">
          <span>Created: {new Date(plant.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(plant.updatedAt).toLocaleDateString()}</span>
        </div>

        {/* Delete section */}
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-red-600">Delete this plant</p>
            <p className="text-[11px] text-red-500">This action cannot be undone.</p>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 transition-colors active:scale-[0.97]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Plant"
        fields={[
          { key: "name", label: "Plant Name", required: true, placeholder: "e.g. Main Plant" },
          { key: "code", label: "Plant Code", required: true, placeholder: "e.g. MP-01" },
          { key: "status", label: "Status", type: "select" as const, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
          { key: "building", label: "Building / Site", placeholder: "e.g. Building A" },
          { key: "address", label: "Address / Location", placeholder: "e.g. 123 Industrial Blvd" },
          { key: "managerName", label: "Manager Name", placeholder: "e.g. Jane Doe" },
          { key: "managerEmail", label: "Manager Email", placeholder: "e.g. jane@company.com" },
          { key: "description", label: "Description / Notes", placeholder: "Primary assembly facility" },
        ]}
        values={form}
        onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Delete plant ${plant.name}?`}
        message="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ── Helper Components ── */

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4 stroke-current" />
        </span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-slate-500">{label}</div>
        <div className="text-sm text-slate-900">{value || <span className="italic text-slate-400">Not set</span>}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </button>
  );
}
