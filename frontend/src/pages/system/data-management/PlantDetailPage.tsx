import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Factory, GitBranch, Cpu, Users, Layers, Globe, MapPin, Clock, FileText, ChevronLeft, ExternalLink, Trash2, X } from "lucide-react";
import { theme } from "../../../styles/themeTokens";

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

export const initialPlantDetails: PlantDetail[] = [
  { id: "P001", name: "Main Plant", code: "MP-01", status: "active", building: "Building A", address: "123 Industrial Blvd, Detroit, MI 48201", timezone: "America/Detroit (EST)", calendar: "Standard 5-day Week", notes: "Primary assembly facility for cylinder and STB unit production.", lines: 3, departments: 4, groups: 8, resources: 42 },
  { id: "P002", name: "Secondary Plant", code: "SP-01", status: "active", building: "Building B", address: "456 Manufacturing Dr, Toledo, OH 43601", timezone: "America/New_York (EST)", calendar: "Standard 5-day Week", notes: "Harnesses and pipes fabrication supporting main plant assembly.", lines: 2, departments: 3, groups: 5, resources: 18 },
  { id: "P003", name: "Warehouse Plant", code: "WP-01", status: "inactive", building: "Warehouse 1", address: "789 Logistics Ave, Chicago, IL 60601", timezone: "America/Chicago (CST)", calendar: "Standard 5-day Week", notes: "Storage and kitting facility. Currently inactive pending reconfiguration.", lines: 1, departments: 1, groups: 2, resources: 6 },
];

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

export function PlantDetailPage() {
  const navigate = useNavigate();
  const { plantId } = useParams<{ plantId: string }>();
  const [plant, setPlant] = useState<PlantDetail | undefined>(() => globalPlants.find((p) => p.id === plantId));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const unsub = subscribePlantChanges(() => {
      setPlant(globalPlants.find((p) => p.id === plantId));
    });
    return unsub;
  }, [plantId]);

  if (!plant) {
    return (




      <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
        <header className={`flex h-16 shrink-0 items-center gap-3 border-b px-6 ${theme.header}`}>
          <div className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg ${theme.iconBoxBlue}`}>
            <Building2 className="h-5 w-5 stroke-current" />
          </div>

          <h1 className={`text-sm font-semibold ${theme.textPrimary}`}>Plant Not Found</h1>
        </header>

        <div className={`flex-1 flex items-center justify-center text-xs ${theme.textSecondary}`}>Plant "{plantId}" does not exist.</div>
      </div>
    );
  }

  const handleDelete = () => {
    const idx = globalPlants.findIndex((p) => p.id === plant.id);
    if (idx >= 0) globalPlants.splice(idx, 1);
    notifyPlantChanges();
    navigate("/system/data-management/plant");
  };

  return (

    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      {/* ═══════ LAYER 1: HEADER ═══════ */}

      <header className={`flex h-16 shrink-0 items-center justify-between border-b px-6 ${theme.header}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/system/data-management/plant")}

            className={`rounded-lg p-1.5 transition-colors ${theme.buttonGhost}`}
            aria-label="Back"
          >

            <ChevronLeft className="h-4 w-4 stroke-current" />
          </button>


          <div className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Factory className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">

              <h1 className={`text-sm font-semibold ${theme.textPrimary}`}>{plant.name}</h1>
              {plant.status === "active" ? (

                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${theme.badgeActive}`}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (

                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${theme.badgeInactive}`}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Inactive
                </span>
              )}
            </div>
            <p className={`text-xs ${theme.textSecondary}`}>ID: {plant.id} &middot; {plant.building}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/system/data-management")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${theme.buttonGhost}`}
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </header>

      {/* ═══════ LAYER 2: CONTENT ═══════ */}
      <div className={`flex-1 overflow-y-auto ${theme.page} px-6 py-5`}>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* General Information */}
          <div className={`rounded-xl border p-4 shadow-sm ${theme.card}`}>
            <h2 className={`mb-3 text-[11px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>General Information</h2>
            <div className="space-y-3">
              <Field icon={Building2} label="Building / Site" value={plant.building} />
              <Field icon={MapPin} label="Address / Location" value={plant.address} />
              <Field icon={Globe} label="Timezone" value={plant.timezone} />
              <Field icon={Clock} label="Default Calendar / Schedule" value={plant.calendar} />
            </div>
          </div>
          {/* Summary Counters */}
          <div className={`rounded-xl border p-4 shadow-sm ${theme.card}`}>
            <h2 className={`mb-3 text-[11px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>Summary Counters</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Production Lines" value={plant.lines} icon={GitBranch} onClick={() => navigate("/system/data-management/production-lines")} />
              <StatCard label="Departments" value={plant.departments} icon={Layers} onClick={() => navigate("/system/data-management/departments")} />
              <StatCard label="Resource Groups" value={plant.groups} icon={Users} onClick={() => navigate("/system/data-management/resource-groups")} />
              <StatCard label="Resources" value={plant.resources} icon={Cpu} onClick={() => navigate("/system/data-management/resources")} />
            </div>
          </div>
        </div>

        {/* Notes */}
        {plant.notes && (
          <div className={`mb-6 rounded-xl border p-4 shadow-sm ${theme.card}`}>
            <h2 className={`mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
              <FileText className="h-3.5 w-3.5" />
              Description / Notes
            </h2>
            <p className={`text-xs leading-relaxed ${theme.textSecondary}`}>{plant.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className={`rounded-xl border p-4 shadow-sm ${theme.card}`}>
          <h2 className={`mb-3 text-[11px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>Actions</h2>
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={GitBranch} label="Manage Production Lines" onClick={() => navigate("/system/data-management/production-lines")} />
            <ActionBtn icon={Layers} label="View Departments" onClick={() => navigate("/system/data-management/departments")} />
            <ActionBtn icon={Users} label="View Resource Groups" onClick={() => navigate("/system/data-management/resource-groups")} />
            <ActionBtn icon={Cpu} label="View Resources" onClick={() => navigate("/system/data-management/resources")} />
            <ActionBtn icon={Building2} label="View Full Structure" onClick={() => navigate("/system/data-management/structure")} />
            <ActionBtn icon={ExternalLink} label="Open in Control Tower" onClick={() => navigate("/control-tower?plant=" + encodeURIComponent(plant.name))} />
          </div>
        </div>

        {/* Delete section */}
        <div className={`mt-6 flex items-center justify-between rounded-xl px-4 py-3 ${theme.dangerPanel}`}>
          <div>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">Delete this plant</p>
            <p className="text-[11px] text-red-500 dark:text-red-500">This action cannot be undone. All associated data will be removed.</p>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 transition-colors active:scale-[0.97]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <>
          <div className={`fixed inset-0 z-30 ${theme.overlay}`} onClick={() => setConfirmDelete(false)} />
          <div className={`fixed left-1/2 top-1/2 z-40 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-4 shadow-xl ${theme.modal}`}>
            <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>Delete Plant</h3>
            <p className={`mt-2 text-xs ${theme.textSecondary}`}>Are you sure you want to delete "{plant.name}"? This action cannot be undone.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${theme.buttonSecondary}`}>Cancel</button>
              <button onClick={handleDelete}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Helpers ── */

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${theme.iconBoxSubtle}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className={`text-[11px] font-medium ${theme.textSecondary}`}>{label}</div>
        <div className={`text-sm ${theme.textPrimary}`}>{value || <span className={`italic ${theme.textMuted}`}>Not set</span>}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, onClick }: { label: string; value: number; icon: any; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-lg border p-2.5 text-left transition-all active:scale-[0.98] ${theme.row} ${theme.cardHover}`}>
      <div className="flex items-center justify-between">
        <Icon className={`h-3.5 w-3.5 ${theme.iconSubtle}`} />
        <span className={`text-base font-bold ${theme.textPrimary}`}>{value}</span>
      </div>
      <div className={`mt-1 text-[10px] ${theme.textSecondary}`}>{label}</div>
    </button>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] ${theme.buttonSecondary}`}>
      <Icon className={`h-3.5 w-3.5 ${theme.iconSubtle}`} />
      {label}
    </button>
  );
}
