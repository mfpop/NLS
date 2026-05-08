import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Factory, X } from "lucide-react";
import { DataCard, Pagination } from "./components";
import { Toolbar } from "./components/Toolbar";
import type { FilterOption } from "./components/Toolbar";
import { UnifiedModal } from "./components/UnifiedModal";
import type { ModalField } from "./components/UnifiedModal";
import { PlantSummary } from "./components/SummaryBlock";
import { ConfirmDialog } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { usePlants, EMPTY_FORM, TIMEZONE_OPTIONS } from "@/hooks/usePlants";
import { getEntityIconProps, saveEntityConfig } from "./entityDisplay";
import { PageHeader } from "@/pages/shared/PageHeader";
import type { Plant } from "@/types/plant";

const PER_PAGE = 10;

const STATUS_OPTIONS: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Not Ready", value: "not_ready" },
];

const MODAL_FIELDS: ModalField[] = [
  { key: "entityIcon", label: "Icon & Color", type: "entityicon" },
  { key: "name", label: "Plant Name", required: true, placeholder: "e.g. Main Plant" },
  { key: "building", label: "Location / Building", placeholder: "e.g. Building A" },
  { key: "timezone", label: "Timezone", type: "select", required: true, placeholder: "Select timezone", options: TIMEZONE_OPTIONS },
  { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

function generateCode(): string {
  return `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function PlantStructurePage() {
  const navigate = useNavigate();
  const {
    plants, loading, saveLoading, search, setSearch, statusFilter, setStatusFilter,
    savePlant, deletePlant,
  } = usePlants();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY_FORM });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const paginatedPlants = plants.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => {
    setEditingId(null);
    setSaveError(null);
    setForm({ ...EMPTY_FORM, code: generateCode(), entityIcon: "plant" });
    setModalOpen(true);
  };

  const openEdit = (plant: Plant) => {
    setEditingId(plant.id);
    setSaveError(null);
    setForm({
      entityIcon: "plant",
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
    setSaveError(null);
    if (editingId && form.entityIcon) {
      saveEntityConfig("plant", editingId, form.entityIcon);
    }
    const result = await savePlant({
      ...EMPTY_FORM,
      ...form,
      status: (form.status || "active") as "active" | "inactive",
    }, editingId);
    if (result.ok) {
      setModalOpen(false);
    } else {
      const messages = result.errors
        ? Object.values(result.errors).join("; ")
        : "Failed to save plant.";
      setSaveError(messages);
    }
  };

  const handleDelete = async () => {
    if (!plantToDelete) return;
    const result = await deletePlant(plantToDelete.id);
    if (result.inUse) {
      alert(result.message);
    }
    setConfirmOpen(false);
    setPlantToDelete(null);
    setModalOpen(false);
  };

  const editingPlant = editingId ? plants.find((p) => p.id === editingId) : null;

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <PageHeader
        icon={<Factory className="h-5 w-5 stroke-current" />}
        iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        title="Plants"
        subtitle="Plant structure — facilities, locations, and production sites."
      >
        <button type="button" onClick={() => navigate("/system/production-structure")}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/60"
        >
          <X className="h-4 w-4 stroke-current" />
          Close
        </button>
      </PageHeader>

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search plants..."
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        onAdd={openAdd}
        addLabel="Add Plant"
      />

      <div className={`flex-1 ${theme.page} p-4`}>
        {loading && plants.length === 0 ? (
          <div className={`py-16 text-center text-sm ${theme.textMuted}`}>Loading plants...</div>
        ) : plants.length === 0 ? (
          <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center ${theme.card}`}>
            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}>
              <Factory className="h-6 w-6 stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>
              {search ? "No plants match your search" : "No plants configured"}
            </h3>
            <p className={`mt-1 max-w-xs text-xs ${theme.textSecondary}`}>Add your first plant to start modeling your production structure.</p>
            {!search && (
              <button type="button" onClick={openAdd} className={`mt-4 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${theme.buttonSecondary}`}>
                Add Plant
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedPlants.map((plant) => {
              const { textColor, bgColor } = getEntityIconProps("plant", plant.id);
              return (
              <DataCard
                key={plant.id}
                icon={<Factory className={`h-5 w-5 stroke-current ${textColor}`} />}
                iconBg={bgColor}
                name={plant.name}
                code={plant.code}
                status={plant.status}
                parentContext={plant.building || "No location set"}
                primaryMetrics={[
                  { label: "Lines", value: plant.lineCount },
                ]}
                metrics={[
                  { label: "Departments", value: plant.departmentCount },
                  { label: "Resource Groups", value: plant.groupCount },
                  { label: "Resources", value: plant.resourceCount },
                ]}
                readiness={[
                  { label: "Departments", ready: plant.departmentCount > 0 },
                  { label: "Lines", ready: plant.lineCount > 0 },
                  { label: "Resources", ready: plant.resourceCount > 0 },
                ]}
                onEdit={() => openEdit(plant)}
                onStructure={() => navigate(`/system/production-structure/structure?plant=${encodeURIComponent(plant.name)}`)}
                onOpen={() => navigate(`/system/production-structure/plant/${plant.id}`)}
              />
              );
            })}
          </div>
        )}

        <div className="mt-3">
          <Pagination page={page} total={plants.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </div>

      <UnifiedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Plant" : "Add Plant"}
        fields={MODAL_FIELDS}
        values={form}
        onChange={(k, v) => { setForm((prev) => ({ ...prev, [k]: v })); setSaveError(null); }}
        onSave={handleSave}
        onDelete={editingId ? () => { setPlantToDelete(plants.find((p) => p.id === editingId) ?? null); setConfirmOpen(true); } : undefined}
        saving={saveLoading}
        summary={
          <>
            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {saveError}
              </div>
            )}
            <PlantSummary
              lines={editingPlant?.lineCount ?? 0}
              departments={editingPlant?.departmentCount ?? 0}
              groups={editingPlant?.groupCount ?? 0}
              resources={editingPlant?.resourceCount ?? 0}
            />
          </>
        }
        onConfigureStructure={
          editingId
            ? () => { const p = plants.find((pl) => pl.id === editingId); navigate(`/system/production-structure/structure?plant=${encodeURIComponent(p?.name ?? "")}`); }
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPlantToDelete(null); }}
        title={`Delete plant ${plantToDelete?.name ?? ""}?`}
        message="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
