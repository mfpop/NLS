import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AlertTriangle, Calendar, Clock, Factory, Globe, Info, MapPin, Phone, Search, User } from "lucide-react";
import { usePlants, EMPTY_FORM, validatePlantForm } from "@/hooks/usePlants";
import type { Plant } from "@/types/plant";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, DetailSection, type FormMode } from "./components/EntityWorkspacePage";
import { PlantDetailView } from "./components/PlantDetailView";
import { ConfirmDialog } from "./shared";
import { ReferenceSelect, ReferenceMultiSelect } from "./components/ReferenceSelect";
import { formatAppDate } from "@/utils/dateFormat";

const PER_PAGE = 10;
type PlantForm = typeof EMPTY_FORM;

function normalizeStatus(value?: string | null): string {
  return (value || "active").trim().toLowerCase();
}

function getPlantStatus(plant?: Plant | null): { value: string; label: string; isActive: boolean } {
  const rawLabel = plant?.statusRef?.name || plant?.status || "Active";
  const rawValue = plant?.statusRef?.code || plant?.status || "ACTIVE";
  const normalized = normalizeStatus(rawValue);
  const labelNormalized = normalizeStatus(rawLabel);
  if (normalized === "active" || labelNormalized === "active") return { value: "active", label: "Active", isActive: true };
  if (normalized === "archived" || labelNormalized === "archived") return { value: "archived", label: "Archived", isActive: false };
  return { value: "inactive", label: "Inactive", isActive: false };
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="group flex items-center gap-2.5 py-[3px]">
      {icon && <span className="w-3.5 shrink-0 text-slate-400 group-hover:text-slate-500 transition-colors">{icon}</span>}
      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 w-24 shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{value ?? <span className="text-slate-300 dark:text-slate-600">-</span>}</span>
    </div>
  );
}

function Badge({ label, variant = "default" }: { label: string; variant?: "active" | "inactive" | "new" | "default" }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
    inactive: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
    new: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
    default: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${styles[variant]}`}>
      {normalizeStatus(label) === "active" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
      {label}
    </span>
  );
}

const inputCls = "h-7 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[11px] outline-none text-slate-700 placeholder-slate-400 transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20";

export function PlantsPage() {
  const { search, statusFilter, setFooterContent, setToolbarVariant } = useToolbar();
  const registerActions = useRegisterActions();
  const { plants, loading, savePlant, archivePlant, refetch } = usePlants();

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<PlantForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingPlantId, setPendingPlantId] = useState<string | null>(null);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [editState, setEditState] = useState({ dirty: false, valid: true, saving: false });
  const plantDetailRef = useRef<{ save: () => Promise<boolean>; cancel: () => void; isDirty: () => boolean }>(null);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = plants.filter((p) => statusFilter === "all" || getPlantStatus(p).value === normalizeStatus(statusFilter))
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? plants.find((p) => p.id === selectedId) ?? null : null;
  const createDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(EMPTY_FORM), [form]);
  const createValid = useMemo(() => Object.keys(validatePlantForm(form, plants, null)).length === 0, [form, plants]);

  const clearForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, timezone: "" });
    setErrors({});
    setMutationError(null);
  }, []);

  const loadForm = useCallback((p: Plant) => {
    setForm({
      name: p.name || "", code: p.code || "", status: p.status || "active", statusId: p.statusId || "",
      plantType: p.plantType || "", description: p.description || "",
      plantTypeId: p.plantTypeId || "",
      building: p.building || "", address: p.address || "",
      city: p.city || "", state: p.state || "", country: p.country || "", countryId: p.countryId || "",
      zipcode: p.zipcode || "", timezone: p.timezone || "", timezoneId: p.timezoneId || "",
      latitude: p.latitude || "", longitude: p.longitude || "",
      operatingSince: p.operatingSince || "",
      managerName: p.managerName || "", managerEmail: p.managerEmail || "", managerPhone: p.managerPhone || "",
      defaultCalendar: p.defaultCalendar || "", defaultCalendarId: p.defaultCalendarId || "",
      defaultShiftModel: p.defaultShiftModel || "", defaultShiftModelId: p.defaultShiftModelId || "",
      weekStartDay: p.weekStartDay || "", weekStartDayId: p.weekStartDayId || "",
      defaultSchedule: p.defaultSchedule || "", defaultScheduleId: p.defaultScheduleId || "",
      manufacturingFocus: p.manufacturingFocus || "",
      manufacturingFocusIds: p.manufacturingFocusRefs?.map((ref) => ref.id) ?? [],
    });
    setErrors({});
    setMutationError(null);
  }, []);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => {
    if (mode === "edit" && sel) {
      plantDetailRef.current?.cancel();
      setMode("view");
      return;
    }
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
  }, [mode, sel, loadForm, clearForm]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    if (mode === "edit" && selectedId) {
      const saved = await plantDetailRef.current?.save();
      if (saved) await refetch();
      return;
    }
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = "Name is required";
    if (!form.code?.trim()) errs.code = "Code is required";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const result = await savePlant({ ...EMPTY_FORM, ...form, status: (form.status || "active") as "active" | "inactive" }, mode === "edit" ? selectedId : null);
    if (result.ok) {
      await refetch();
      if (mode === "create" && result.plant) setSelectedId(result.plant.id);
      setMode("view");
      return;
    }
    setErrors(result.errors ?? {});
    setMutationError(result.errors?._form || "Plant could not be saved.");
  }, [form, mode, selectedId, savePlant, refetch]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setMutationError(null);
    const result = await archivePlant(confirmDelete);
    if (!result.success) {
      setMutationError(result.message || "Plant could not be archived.");
      setConfirmDelete(null);
      return;
    }
    setSelectedId(null); await refetch(); setConfirmDelete(null);
  }, [confirmDelete, archivePlant, refetch]);

  const hasUnsavedChanges = useCallback(() => {
    if (mode === "edit") return !!plantDetailRef.current?.isDirty();
    if (mode === "create") return createDirty;
    return false;
  }, [createDirty, mode]);

  const selectPlant = useCallback((plantId: string) => {
    if (plantId === selectedId) return;
    if (hasUnsavedChanges()) {
      setPendingPlantId(plantId);
      return;
    }
    setSelectedId(plantId);
    if (mode === "create") {
      clearForm();
      setMode("view");
    }
  }, [clearForm, hasUnsavedChanges, mode, selectedId]);

  const confirmPlantSwitch = useCallback(() => {
    if (!pendingPlantId) return;
    plantDetailRef.current?.cancel();
    clearForm();
    setMode("view");
    setSelectedId(pendingPlantId);
    setPendingPlantId(null);
  }, [clearForm, pendingPlantId]);

  const confirmLineNavigation = useCallback(() => {
    if (!pendingLineId) return;
    plantDetailRef.current?.cancel();
    setMode("view");
    setPendingLineId(null);
  }, [pendingLineId]);

  const selectedIndex = useMemo(() => paginated.findIndex((p) => p.id === selectedId), [paginated, selectedId]);
  useEffect(() => {
    if (mode !== "view") return;
    const h = (e: KeyboardEvent) => {
      const plantCount = paginated.length;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedId(paginated[Math.min(selectedIndex + 1, plantCount - 1)]?.id ?? null); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedId(paginated[Math.max(selectedIndex - 1, 0)]?.id ?? null); }
      if (e.key === "Enter" && selectedId) { e.preventDefault(); hEdit(); }
      if (e.key === "Delete" && selectedId) { e.preventDefault(); setConfirmDelete(selectedId); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode, paginated, selectedIndex, selectedId, hEdit]);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (mode === "edit" || mode === "create") {
      registerActions({ onSave: hSave, onCancel: hCancel, isDirty: mode === "create" ? createDirty : editState.dirty, isSaving: editState.saving });
    } else {
      registerActions({
        onAdd: hNew, onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmDelete(sel.id) : undefined,
        onRefresh: () => refetch(), hasSelected: !!sel,
      });
    }
    setFooterContent(`${filtered.length} plant${filtered.length !== 1 ? "s" : ""}`);
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, registerActions, refetch, editState, createDirty, createValid, setToolbarVariant]);

  const g = (k: keyof PlantForm) => form[k] ?? "";
  const s = (k: keyof PlantForm, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const isForm = mode === "edit" || mode === "create";

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-500/10">
              <Factory className="h-6 w-6 text-teal-400 dark:text-teal-300 stroke-current" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Plant Details</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">Select a plant from the list or create a new one to view its configuration and operational details.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Plant" : sel!.name;
    const code = mode !== "create" ? sel!.code : undefined;
    const isNew = mode === "create";
    const selectedStatus = getPlantStatus(sel);

    if (mode !== "create" && sel) {
      return (
        <PlantDetailView
          ref={plantDetailRef}
          plantId={sel.id}
          editing={mode === "edit"}
          onEditToggle={(editing) => setMode(editing ? "edit" : "view")}
          onError={setMutationError}
          onEditStateChange={setEditState}
          onSaved={async () => { await refetch(); }}
          onDirtyNavigateToLine={setPendingLineId}
        />
      );
    }

    return (
      <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 px-3 pt-2">
          <div className="flex items-start gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
              <Factory className="h-5 w-5 stroke-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h2>
                {code && <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">{code}</span>}
                <Badge label={isNew ? "New" : selectedStatus.label} variant={isNew ? "new" : (selectedStatus.isActive ? "active" : "inactive")} />
                {isForm && <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-1.5 py-0.5 rounded">Editing</span>}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Create the physical site record first; structure is added after save.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {mutationError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {mutationError}
            </div>
          )}
          <div className="grid min-h-0 grid-cols-2 gap-3">
            {/* LEFT */}
            <div className="space-y-2">
              <DetailSection title="Plant Identity">
                {isForm ? (
                  <div className="space-y-1.5">
                    <input type="text" value={g("name")} onChange={(e) => s("name", e.target.value)} placeholder="Plant name *" className={inputCls} />
                    {errors.name && <p className="text-[10px] text-red-500 ml-1">{errors.name}</p>}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <input type="text" value={g("code")} onChange={(e) => s("code", e.target.value)} placeholder="Code *" className={inputCls} />
                        {errors.code && <p className="text-[10px] text-red-500 ml-1">{errors.code}</p>}
                      </div>
                      <ReferenceSelect categoryCode="status" label="" value={g("statusId") as string} onChange={(v) => s("statusId", v)} includeInactive placeholder="Status *" error={errors.statusId} />
                    </div>
                    <ReferenceSelect categoryCode="plant_type" label="" value={g("plantTypeId") as string} onChange={(v) => s("plantTypeId", v)} placeholder="Plant type / category" />
                    <textarea value={g("description")} onChange={(e) => s("description", e.target.value)} placeholder="Description" rows={2} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] outline-none resize-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500 dark:focus:ring-teal-500/20" />
                    <ReferenceMultiSelect categoryCode="manufacturing_focus" label="" values={form.manufacturingFocusIds ?? []} onChange={(v) => setForm((p) => ({ ...p, manufacturingFocusIds: v }))} showUnselected={false} compact />
                    <p className="rounded-md bg-teal-50 px-2 py-1 text-[10px] leading-3 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                      Plant is the top physical site. Lines, departments, resource groups, and resources are created in their own component pages after the plant exists.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2.5 space-y-0.5">
                    <InfoRow label="Name" value={sel?.name} />
                    <InfoRow label="Code" value={sel?.code} />
                    <InfoRow label="Status" value={<Badge label={selectedStatus.label} variant={selectedStatus.isActive ? "active" : "inactive"} />} />
                    <InfoRow label="Type" value={sel?.plantType} />
                    <InfoRow label="Focus" value={sel?.manufacturingFocus} />
                    <InfoRow label="Description" value={sel?.description} />
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Contact">
                {isForm ? (
                  <div className="space-y-1.5">
                    <input type="text" value={g("managerName")} onChange={(e) => s("managerName", e.target.value)} placeholder="Manager name" className={inputCls} />
                    <input type="text" value={g("managerEmail")} onChange={(e) => s("managerEmail", e.target.value)} placeholder="Manager email" className={inputCls} />
                    <input type="text" value={g("managerPhone")} onChange={(e) => s("managerPhone", e.target.value)} placeholder="Manager phone" className={inputCls} />
                    {errors.managerEmail && <p className="text-[10px] text-red-500 ml-1">{errors.managerEmail}</p>}
                  </div>
                ) : (
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2.5 space-y-0.5">
                    <InfoRow label="Manager" value={sel?.managerName} icon={<User className="h-2.5 w-2.5 stroke-current" />} />
                    <InfoRow label="Email" value={sel?.managerEmail} icon={<Globe className="h-2.5 w-2.5 stroke-current" />} />
                    <InfoRow label="Phone" value={sel?.managerPhone} icon={<Phone className="h-2.5 w-2.5 stroke-current" />} />
                  </div>
                )}
              </DetailSection>
            </div>

            {/* RIGHT */}
            <div className="space-y-2">
              <DetailSection title="Location">
                {isForm ? (
                  <div className="space-y-1.5">
                    <input type="text" value={g("building")} onChange={(e) => s("building", e.target.value)} placeholder="Building" className={inputCls} />
                    <input type="text" value={g("address")} onChange={(e) => s("address", e.target.value)} placeholder="Address" className={inputCls} />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input type="text" value={g("city")} onChange={(e) => s("city", e.target.value)} placeholder="City" className={inputCls} />
                      <input type="text" value={g("state")} onChange={(e) => s("state", e.target.value)} placeholder="State" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <ReferenceSelect categoryCode="country" label="" value={g("countryId") as string} onChange={(v) => s("countryId", v)} placeholder="Country *" error={errors.countryId} />
                      <input type="text" value={g("zipcode")} onChange={(e) => s("zipcode", e.target.value)} placeholder="ZIP code" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <ReferenceSelect categoryCode="timezone" label="" value={g("timezoneId") as string} onChange={(v) => s("timezoneId", v)} placeholder="Timezone *" error={errors.timezoneId} />
                      <input type="date" value={g("operatingSince") as string} onChange={(e) => s("operatingSince", e.target.value)} placeholder="Operating since" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input type="text" value={g("latitude")} onChange={(e) => s("latitude", e.target.value)} placeholder="Latitude" className={inputCls} />
                      <input type="text" value={g("longitude")} onChange={(e) => s("longitude", e.target.value)} placeholder="Longitude" className={inputCls} />
                    </div>
                    <p className="rounded-md bg-slate-50 px-2 py-1 text-[10px] leading-3 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      Location data is site master data only. It does not drive routing, takt, capacity, or KPI calculations in this UI.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2.5 space-y-0.5">
                    <InfoRow label="Building" value={sel?.building} icon={<Factory className="h-2.5 w-2.5 stroke-current" />} />
                    <InfoRow label="Address" value={sel?.address} icon={<MapPin className="h-2.5 w-2.5 stroke-current" />} />
                    <InfoRow label="City" value={sel?.city} />
                    <InfoRow label="State" value={sel?.state} />
                    <InfoRow label="Country" value={sel?.country} icon={<Globe className="h-2.5 w-2.5 stroke-current" />} />
                    <InfoRow label="ZIP" value={sel?.zipcode} />
                    <InfoRow label="Timezone" value={sel?.timezone} icon={<Clock className="h-2.5 w-2.5 stroke-current" />} />
                    <InfoRow label="Since" value={sel?.operatingSince} icon={<Calendar className="h-2.5 w-2.5 stroke-current" />} />
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Operations">
                {isForm ? (
                  <div className="space-y-1.5">
                    <ReferenceSelect categoryCode="calendar" label="" value={g("defaultCalendarId") as string} onChange={(v) => s("defaultCalendarId", v)} placeholder="Default calendar *" error={errors.defaultCalendarId} />
                    <ReferenceSelect categoryCode="shift_model" label="" value={g("defaultShiftModelId") as string} onChange={(v) => s("defaultShiftModelId", v)} placeholder="Default shift model *" error={errors.defaultShiftModelId} />
                    <div className="grid grid-cols-2 gap-1.5">
                      <ReferenceSelect categoryCode="week_start_day" label="" value={g("weekStartDayId") as string} onChange={(v) => s("weekStartDayId", v)} placeholder="Week start day *" error={errors.weekStartDayId} />
                      <ReferenceSelect categoryCode="schedule" label="" value={g("defaultScheduleId") as string} onChange={(v) => s("defaultScheduleId", v)} placeholder="Default schedule" />
                    </div>
                    <p className="rounded-md bg-amber-50 px-2 py-1 text-[10px] leading-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      These are plant defaults for later workflows. Authoritative shift duration and calendar calculations remain in domain services.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2.5 space-y-0.5">
                    <InfoRow label="Lines" value={sel?.lineCount ?? 0} icon={<Info className="h-2.5 w-2.5 stroke-current" />} />
                    <InfoRow label="Departments" value={sel?.departmentCount ?? 0} />
                    <InfoRow label="Groups" value={sel?.groupCount ?? 0} />
                    <InfoRow label="Resources" value={sel?.resourceCount ?? 0} />
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Readiness">
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/30 p-2 dark:border-slate-700 dark:bg-slate-800/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 stroke-current" />
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">After saving this plant</p>
                      <p className="mt-0.5 text-[10px] leading-3 text-slate-500 dark:text-slate-400">
                        Add production lines, then departments, resource groups, and resources. Keep product flow and VSM modeling outside this physical-site record.
                      </p>
                    </div>
                  </div>
                </div>
              </DetailSection>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-6 text-[10px] text-slate-400 dark:text-slate-500">
            <span>Created <span className="font-medium text-slate-500 dark:text-slate-400">{formatAppDate(sel?.createdAt) || "-"}</span></span>
            <span>Updated <span className="font-medium text-slate-500 dark:text-slate-400">{formatAppDate(sel?.updatedAt) || "-"}</span></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
          title="Delete plant?"
          message={`Are you sure you want to delete "${plants.find((p) => p.id === confirmDelete)?.name || "this plant"}"? Existing structure records will be preserved.`}
          onConfirm={hDelete} />
      )}
      <ConfirmDialog open={!!pendingPlantId} onClose={() => setPendingPlantId(null)} title="Discard changes?" message="You have unsaved plant changes. Discard them and open the selected plant?" onConfirm={confirmPlantSwitch} />
      <ConfirmDialog open={!!pendingLineId} onClose={() => setPendingLineId(null)} title="Discard changes?" message="You have unsaved plant changes. Discard them before opening the selected production line?" onConfirm={confirmLineNavigation} />
      <EntityWorkspacePage
        toolbar={null}
        list={
          <>
            <div className="shrink-0 h-10 border-b border-slate-200 dark:border-slate-700 flex items-center px-3 bg-white dark:bg-slate-900">
              <Search className="h-3 w-3 text-slate-400 stroke-current mr-2" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Plants</span>
              <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-mono">{filtered.length}</span>
            </div>
            {mutationError && mode === "view" && (
              <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {mutationError}
              </div>
            )}
            <div className="flex-1 overflow-y-auto bg-white pl-2 dark:bg-slate-900">
              {loading && plants.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-xs text-slate-400">
                  <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" />Loading...</div>
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <Factory className="h-5 w-5 text-slate-300 dark:text-slate-600 mb-2 stroke-current" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">No plants</p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">Create one to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {paginated.map((plant) => (
                    <div key={plant.id}
                      role="option"
                      aria-selected={selectedId === plant.id}
                      tabIndex={selectedId === plant.id ? 0 : -1}
                      onClick={() => selectPlant(plant.id)}
                      onDoubleClick={() => { selectPlant(plant.id); if (mode === "view") hEdit(); }}
                      className={`group flex items-center gap-2.5 px-3 cursor-pointer transition-colors duration-100 h-11 ${
                        selectedId === plant.id
                          ? "bg-teal-100/80 dark:bg-teal-900/20 border-l-[3px] border-l-teal-500 dark:border-l-teal-400 shadow-sm"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/40 border-l-[3px] border-l-transparent"
                      }`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        selectedId === plant.id
                          ? "bg-teal-200/80 text-teal-700 dark:bg-teal-500/25 dark:text-teal-300"
                          : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-teal-900/30 dark:group-hover:text-teal-400"
                      }`}>
                        <Factory className="h-3.5 w-3.5 stroke-current" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold truncate ${selectedId === plant.id ? "text-teal-900 dark:text-teal-200" : "text-slate-800 dark:text-slate-200"}`}>{plant.name}</span>
                          {plant.code && <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 shrink-0">{plant.code}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-block rounded-full px-1.5 py-[1px] text-[8px] font-semibold uppercase leading-tight ${getPlantStatus(plant).isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                            {getPlantStatus(plant).label}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{[plant.city, plant.state, plant.country].filter(Boolean).join(", ") || plant.building || "No location"}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{plant.lineCount ?? 0} lines</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        }
        detail={renderDetail()}
        footer={null}
      />
    </>
  );
}
