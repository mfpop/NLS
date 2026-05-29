import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Phone, MapPin, Info, Factory, TrendingUpDown, Globe, Tag } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PLANT_QUERY, UPDATE_PLANT_MUTATION } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { COMPANY_QUERY } from "@/graphql/companyQueries";
import type { Plant, PlantInput } from "@/types/plant";
import { ReferenceSelect, ReferenceMultiSelect } from "./ReferenceSelect";
import { useReferenceTables } from "@/hooks/useReferenceTables";
import { formatAppDate } from "@/utils/dateFormat";
import { SectionHeader as SharedSectionHeader, ErrorFieldWrapper, ErrorText, iCls, iClsError, sCls, sClsError, labelCls, labelClsRequired } from "./DetailComponents";

type PlantMutationError = { field?: string | null; message: string };
type UpdatePlantResult = { updatePlant?: { errors?: PlantMutationError[] } };

function FlatStat({ label, value, title }: { label: string; value: React.ReactNode; title?: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-muted/20 px-3 py-2" title={title}>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
      <span className="text-[13px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ── SectionHeader wraps the shared component with "chip" variant ──
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <SharedSectionHeader icon={icon} title={title} variant="chip" />;
}

interface PlantDetailViewProps {
  plantId?: string | null;
  createMode?: boolean;
  editing?: boolean;
  onEditToggle?: (editing: boolean) => void;
  onNavigateToLine?: (lineId: string) => void;
  onError?: (message: string | null) => void;
  onEditStateChange?: (state: { dirty: boolean; valid: boolean; saving: boolean }) => void;
  onSaved?: () => Promise<void> | void;
  onDirtyNavigateToLine?: (lineId: string) => void;
  onCreatePlant?: (input: PlantInput) => Promise<{ ok: boolean; plant?: Plant; errors?: Record<string, string> }>;
}

const EMPTY_PLANT_FORM = {
  name: "",
  code: "",
  status: "active",
  statusId: "",
  plantType: "",
  plantTypeId: "",
  operatingSince: "",
  building: "",
  buildingSite: "",
  address: "",
  streetAddress: "",
  city: "",
  state: "",
  stateId: "",
  country: "",
  countryId: "",
  zipcode: "",
  postalCode: "",
  timezone: "",
  timezoneId: "",
  latitude: "",
  longitude: "",
  managerName: "",
  managerEmail: "",
  managerPhone: "",
  defaultCalendar: "",
  defaultCalendarId: "",
  defaultShiftModel: "",
  defaultShiftModelId: "",
  weekStartDay: "",
  weekStartDayId: "",
  defaultSchedule: "",
  defaultScheduleId: "",
  manufacturingFocus: "",
  manufacturingFocusIds: [] as string[],
  description: "",
};

type PlantDetailForm = typeof EMPTY_PLANT_FORM;

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

function normalizePlantForm(
  plant: Plant | undefined,
  getLabel: (categoryCode: string, id: string | null | undefined) => string,
  findIdByText: (categoryCode: string, text: string) => string,
): PlantDetailForm {
  if (!plant) return { ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] };
  const resolvedId = (category: string, id: string | null | undefined, fallback: string | null | undefined) => id || findIdByText(category, fallback || "");
  const label = (category: string, id: string | null | undefined, fallback: string | null | undefined) => getLabel(category, id) || fallback || "";
  const statusId = resolvedId("status", plant.statusId, plant.status);
  const plantTypeId = resolvedId("plant_type", plant.plantTypeId, plant.plantType);
  const countryId = resolvedId("country", plant.countryId, plant.country);
  const timezoneId = resolvedId("timezone", plant.timezoneId, plant.timezone);
  const defaultCalendarId = resolvedId("calendar", plant.defaultCalendarId, plant.defaultCalendar);
  const defaultShiftModelId = resolvedId("shift_model", plant.defaultShiftModelId, plant.defaultShiftModel);
  const weekStartDayId = resolvedId("week_start_day", plant.weekStartDayId, plant.weekStartDay);
  const defaultScheduleId = resolvedId("schedule", plant.defaultScheduleId, plant.defaultSchedule);
  const buildingSite = plant.building || "";
  const streetAddress = plant.address || "";
  const postalCode = plant.zipcode || "";
  return {
    name: plant.name || "",
    code: plant.code || "",
    status: label("status", statusId, plant.status || "active"),
    statusId,
    plantType: label("plant_type", plantTypeId, plant.plantType),
    plantTypeId,
    operatingSince: toDateInputValue(plant.operatingSince),
    building: buildingSite,
    address: streetAddress,
    city: plant.city || "",
    state: plant.state || "",
    stateId: (plant as any).stateId || "",
    country: label("country", countryId, plant.country),
    countryId,
    zipcode: postalCode,
    timezone: label("timezone", timezoneId, plant.timezone),
    timezoneId,
    latitude: plant.latitude || "",
    longitude: plant.longitude || "",
    managerName: plant.managerName || "",
    managerEmail: plant.managerEmail || "",
    managerPhone: plant.managerPhone || "",
    defaultCalendar: label("calendar", defaultCalendarId, plant.defaultCalendar),
    defaultCalendarId,
    defaultShiftModel: label("shift_model", defaultShiftModelId, plant.defaultShiftModel),
    defaultShiftModelId,
    weekStartDay: label("week_start_day", weekStartDayId, plant.weekStartDay),
    weekStartDayId,
    defaultSchedule: label("schedule", defaultScheduleId, plant.defaultSchedule),
    defaultScheduleId,
    manufacturingFocus: plant.manufacturingFocusRefs?.map((ref) => ref.name).filter(Boolean).join(", ") || plant.manufacturingFocus || "",
    manufacturingFocusIds: plant.manufacturingFocusRefs?.map((ref) => ref.id) ?? [],
    description: plant.description || "",
    buildingSite,
    streetAddress,
    postalCode,
  };
}

function normalizeForCompare(form: PlantDetailForm): PlantDetailForm {
  return {
    ...form,
    name: form.name.trim(),
    code: form.code.trim(),
    managerEmail: form.managerEmail.trim(),
    managerPhone: form.managerPhone.trim(),
    operatingSince: toDateInputValue(form.operatingSince),
    buildingSite: form.building.trim(),
    streetAddress: form.address.trim(),
    postalCode: form.zipcode.trim(),
    latitude: String(form.latitude || "").trim(),
    longitude: String(form.longitude || "").trim(),
    manufacturingFocusIds: [...(form.manufacturingFocusIds ?? [])].sort(),
  };
}

function isPlantFormDirty(form: PlantDetailForm, initial: PlantDetailForm): boolean {
  return JSON.stringify(normalizeForCompare(form)) !== JSON.stringify(normalizeForCompare(initial));
}

function validatePlantDetailForm(form: PlantDetailForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Plant name is required";
  if (!form.code.trim()) errors.code = "Plant code is required";
  if (!form.statusId.trim()) errors.statusId = "Status is required";
  if (!form.countryId.trim()) errors.countryId = "Country is required";
  if (!form.defaultCalendarId.trim()) errors.defaultCalendarId = "Default calendar is required";
  if (!form.defaultShiftModelId.trim()) errors.defaultShiftModelId = "Default shift model is required";
  if (!form.weekStartDayId.trim()) errors.weekStartDayId = "Week start day is required";
  if (!form.timezoneId.trim()) errors.timezoneId = "Timezone is required";
  if (form.managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.managerEmail)) errors.managerEmail = "Invalid email format";
  if (form.managerPhone && !/^[\d\s+\-()]+$/.test(form.managerPhone)) errors.managerPhone = "Invalid phone format";
  if (form.operatingSince && !/^\d{4}-\d{2}-\d{2}$/.test(form.operatingSince)) errors.operatingSince = "Use YYYY-MM-DD format";
  if (form.latitude && !Number.isFinite(Number(form.latitude))) errors.latitude = "Must be numeric";
  if (form.longitude && !Number.isFinite(Number(form.longitude))) errors.longitude = "Must be numeric";
  return errors;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || "inactive";
  const isActive = normalized === "active";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? "bg-success/10 text-success border border-success/20" : "bg-muted text-muted-foreground border border-border/60"}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-success" : "bg-muted-foreground/40"}`} />
      {status || "Inactive"}
    </span>
  );
}



function buildPlantInput(form: PlantDetailForm, getLabel: (c: string, id: string | null | undefined) => string, getCode: (c: string, id: string) => string): PlantInput {
  return {
    name: form.name || "",
    code: form.code || "",
    status: (form.statusId ? getCode("status", form.statusId) || form.status : form.status) || "active",
    statusId: form.statusId || undefined,
    plantType: form.plantTypeId ? getLabel("plant_type", form.plantTypeId) || form.plantType || undefined : form.plantType || undefined,
    plantTypeId: form.plantTypeId || undefined,
    operatingSince: form.operatingSince || undefined,
    building: form.building || undefined,
    address: form.address || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    country: form.countryId ? getLabel("country", form.countryId) || form.country || undefined : form.country || undefined,
    countryId: form.countryId || undefined,
    zipcode: form.zipcode || undefined,
    timezone: form.timezoneId ? getLabel("timezone", form.timezoneId) || form.timezone || undefined : form.timezone || undefined,
    timezoneId: form.timezoneId || undefined,
    latitude: form.latitude || undefined,
    longitude: form.longitude || undefined,
    defaultCalendar: form.defaultCalendarId ? getLabel("calendar", form.defaultCalendarId) || form.defaultCalendar || undefined : form.defaultCalendar || undefined,
    defaultCalendarId: form.defaultCalendarId || undefined,
    defaultShiftModel: form.defaultShiftModelId ? getLabel("shift_model", form.defaultShiftModelId) || form.defaultShiftModel || undefined : form.defaultShiftModel || undefined,
    defaultShiftModelId: form.defaultShiftModelId || undefined,
    weekStartDay: form.weekStartDayId ? getLabel("week_start_day", form.weekStartDayId) || form.weekStartDay || undefined : form.weekStartDay || undefined,
    weekStartDayId: form.weekStartDayId || undefined,
    defaultSchedule: form.defaultScheduleId ? getLabel("schedule", form.defaultScheduleId) || form.defaultSchedule || undefined : form.defaultSchedule || undefined,
    defaultScheduleId: form.defaultScheduleId || undefined,
    manufacturingFocus: form.manufacturingFocus || undefined,
    manufacturingFocusIds: form.manufacturingFocusIds?.length ? form.manufacturingFocusIds : undefined,
    managerName: form.managerName || undefined,
    managerEmail: form.managerEmail || undefined,
    managerPhone: form.managerPhone || undefined,
    description: form.description || undefined,
  };
}

/** Renders a value cell for view mode with consistent styling */
function ViewValue({ children, missing }: { children: React.ReactNode; missing?: boolean }) {
  return (
    <span className={`block text-[13px] ${missing ? "text-muted-foreground/40 italic" : "text-foreground font-medium"}`}>
      {children}
    </span>
  );
}

/** Field renderer for edit-mode fields */
function EditField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={required ? labelClsRequired : labelCls}>{label}</label>
      <div className="min-h-[32px] flex items-start">
        {children}
      </div>
      <ErrorText message={error} />
    </div>
  );
}

/** View-only field with label and value */
function ViewField({ label, value, missing }: { label: string; value: React.ReactNode; missing?: boolean }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <ViewValue missing={missing}>{value}</ViewValue>
    </div>
  );
}

export const PlantDetailView = forwardRef<{ save: () => Promise<boolean>; cancel: () => void; isDirty: () => boolean }, PlantDetailViewProps>(
function PlantDetailView({ plantId, createMode = false, editing = false, onEditToggle, onNavigateToLine, onError, onEditStateChange, onSaved, onDirtyNavigateToLine, onCreatePlant }, ref) {
  const { data, loading, refetch } = useQuery<any>(PLANT_QUERY, {
    variables: { id: plantId },
    skip: createMode || !plantId,
  });
  const plant: Plant | undefined = data?.plant;
  const { data: companyData } = useQuery<any>(COMPANY_QUERY);
  const companyName = companyData?.company?.name || "";
  const { getLabel, getCode, findIdByText } = useReferenceTables();

  const { data: linesData } = useQuery<any>(PRODUCTION_LINES_QUERY, {
    variables: { plantId },
    fetchPolicy: "cache-and-network", errorPolicy: "all",
    skip: createMode || !plantId,
  });
  const lines = linesData?.productionLines?.items || linesData?.productionLines || [];

  const [updatePlant, updateState] = useMutation<UpdatePlantResult>(UPDATE_PLANT_MUTATION);

  const [readOnly, setReadOnly] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (createMode) {
      setReadOnly(false);
      return;
    }
    setReadOnly(!editing);
  }, [editing, createMode]);

  const [form, setForm] = useState<PlantDetailForm>({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
  const [initialForm, setInitialForm] = useState<PlantDetailForm>({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createSaving, setCreateSaving] = useState(false);

  useEffect(() => {
    setForm({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
    setInitialForm({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
    setErrors({});
  }, [plantId]);

  useEffect(() => {
    if (createMode) {
      const empty = { ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] };
      setForm(empty);
      setInitialForm(empty);
      setErrors({});
      return;
    }
    if (!plant || plant.id !== plantId) return;
    const normalized = normalizePlantForm(plant, getLabel, findIdByText);
    setForm(normalized);
    setInitialForm(normalized);
    setErrors({});
  }, [plant, plantId, getLabel, findIdByText, createMode]);

  const dirty = isPlantFormDirty(form, initialForm);
  const validation = validatePlantDetailForm(form);
  const valid = Object.keys(validation).length === 0;
  const saving = updateState.loading || createSaving;

  useEffect(() => {
    onEditStateChange?.({ dirty, valid, saving });
  }, [dirty, valid, saving, onEditStateChange]);

  const update = (key: keyof PlantDetailForm, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const resolvedCountry = form.country || getLabel("country", form.countryId) || "";
  const backendLatitude = Number(form.latitude);
  const backendLongitude = Number(form.longitude);
  const hasBackendCoordinates = Number.isFinite(backendLatitude) && Number.isFinite(backendLongitude) && Math.abs(backendLatitude) <= 90 && Math.abs(backendLongitude) <= 180;

  const roTA = readOnly
    ? "read-only border-0 bg-transparent px-0 text-foreground font-medium cursor-default resize-none text-[13px] h-auto min-h-0"
    : "min-h-[72px] max-h-[140px] w-full rounded-md border border-input/60 bg-card px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 resize-none";

  useImperativeHandle(ref, () => ({
    save: async () => {
      const nextErrors = validatePlantDetailForm(form);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        onError?.("Please fix the validation errors before saving.");
        return false;
      }

      if (createMode) {
        if (!onCreatePlant) {
          onError?.("Create handler not provided.");
          return false;
        }
        setCreateSaving(true);
        try {
          const input = buildPlantInput(form, getLabel, getCode);
          const result = await onCreatePlant(input);
          setCreateSaving(false);
          if (result.ok) {
            onError?.(null);
            setForm({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
            setInitialForm({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
            await onSaved?.();
            return true;
          }
          const fieldErrors: Record<string, string> = {};
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, msg]) => { fieldErrors[field] = msg; });
          }
          setErrors(fieldErrors);
          onError?.(result.errors?._form || result.errors?.name || "Plant could not be created.");
          return false;
        } catch (e) {
          setCreateSaving(false);
          const message = e instanceof Error ? e.message : "Unknown create error.";
          onError?.(`Create failed: ${message}`);
          return false;
        }
      }

      try {
        const input = buildPlantInput(form, getLabel, getCode);
        const result = await updatePlant({ variables: { id: plantId, input } });
        const response = result.data?.updatePlant;
        if (response?.errors?.length) {
          const fieldErrors: Record<string, string> = {};
          response.errors.forEach((error) => {
            if (error.field) fieldErrors[error.field] = error.message;
          });
          setErrors(fieldErrors);
          onError?.(response.errors.map((error) => error.message).join("; "));
          return false;
        }
        onError?.(null);
        const refreshed = await refetch();
        const refreshedPlant = refreshed.data?.plant as Plant | undefined;
        const normalized = normalizePlantForm(refreshedPlant ?? plant, getLabel, findIdByText);
        setForm(normalized);
        setInitialForm(normalized);
        await onSaved?.();
        setReadOnly(true);
        onEditToggle?.(false);
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown save error.";
        onError?.(`Save failed: ${message}`);
        return false;
      }
    },
    cancel: () => {
      if (createMode) {
        setForm({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
        setErrors({});
        onError?.(null);
        return;
      }
      setForm(initialForm);
      setErrors({});
      onError?.(null);
      setReadOnly(true);
      onEditToggle?.(false);
    },
    isDirty: () => isPlantFormDirty(form, initialForm),
  }), [updatePlant, plantId, form, getLabel, getCode, findIdByText, refetch, plant, onError, onEditToggle, onSaved, initialForm, createMode, onCreatePlant]);

  // ── Loading state ──
  if (!createMode && loading && !plant) {
    return (
      <div className="flex flex-col overflow-hidden flex-1">
        <div className="flex items-center justify-center flex-1 bg-card">
          <div className="text-xs text-muted-foreground">Loading plant...</div>
        </div>
      </div>
    );
  }

  // ── Not found state ──
  if (!createMode && !plant) {
    return (
      <div className="flex flex-col overflow-hidden flex-1">
        <div className="flex items-center justify-center flex-1 bg-card">
          <div className="text-center">
            <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground stroke-current" />
            <p className="text-xs text-muted-foreground">Plant not found</p>
          </div>
        </div>
      </div>
    );
  }

  const isNew = createMode;
  const isEditing = !readOnly;
  const modeKey = isNew ? "create" : isEditing ? "edit" : "view";

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      {/* ── HEADER ── */}
      <div className="shrink-0 border-b border-border/40 bg-card">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200/50 dark:ring-amber-700/30">
              <Factory className="h-5 w-5 stroke-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm font-bold text-foreground truncate">
                  {isNew ? "New Plant" : (form.name || plant?.name || "Plant Details")}
                </h2>
                {form.code && !isNew && (
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">{form.code}</span>
                )}
                {isNew ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 text-[10px] font-semibold">New</span>
                ) : (
                  <StatusBadge status={form.status || plant?.status || "active"} />
                )}
                {isEditing && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning border border-warning/25 px-2 py-0.5 text-[10px] font-semibold">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                    Editing
                  </span>
                )}
              </div>
              {!isNew && (
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                  <span className="inline-flex items-center gap-1"><Info className="h-3 w-3 stroke-current" />{companyName || "Standalone"}</span>
                  {plant?.lineCount !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <TrendingUpDown className="h-3 w-3 stroke-current" />{plant.lineCount} line{plant.lineCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {plant?.departmentCount !== undefined && (
                    <span>{plant.departmentCount} dept{plant.departmentCount !== 1 ? "s" : ""}</span>
                  )}
                  <span className="ml-auto text-[9px] text-muted-foreground/50 whitespace-nowrap">
                    Created {formatAppDate(plant?.createdAt) || "—"} · Updated {formatAppDate(plant?.updatedAt) || "—"}
                  </span>
                </div>
              )}
              {isNew && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Create the physical site record; structure is added after save.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 min-h-0 overflow-hidden bg-card">
        <div key={modeKey} className="mode-enter grid min-h-0 items-start gap-4 overflow-hidden grid-cols-[1fr_1fr]">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-4 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
            {/* 1. Plant Identity */}
            {readOnly ? (
              <div>
                <SectionHeader icon={<Factory className="h-3 w-3 stroke-current text-muted-foreground" />} title="Identity" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <ViewField label="Plant Name" value={form.name} missing={!form.name} />
                  <ViewField label="Plant Code" value={form.code} missing={!form.code} />
                  <div>
                    <span className={labelCls}>Status</span>
                    <StatusBadge status={form.status} />
                  </div>
                  <ViewField label="Parent Company" value={companyName || "Standalone"} missing={!companyName} />
                  <ViewField label="Plant Type / Category" value={form.plantType} missing={!form.plantType} />
                  <ViewField label="Operating Since" value={formatAppDate(form.operatingSince)} missing={!form.operatingSince} />
                </div>
              </div>
            ) : (
              <div>
                <SectionHeader icon={<Factory className="h-3 w-3 stroke-current text-muted-foreground" />} title="Identity" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <EditField label="Plant Name" required error={errors.name}>
                    <ErrorFieldWrapper error={errors.name}>
                      <input id="pdv-name" name="name" type="text" value={form.name || ""}
                        onChange={(e) => update("name", e.target.value)}
                        className={errors.name ? iClsError : iCls}
                        placeholder="Plant name" />
                    </ErrorFieldWrapper>
                  </EditField>
                  <EditField label="Plant Code" required error={errors.code}>
                    <ErrorFieldWrapper error={errors.code}>
                      <input id="pdv-code" name="code" type="text" value={form.code || ""}
                        onChange={(e) => update("code", e.target.value)}
                        className={errors.code ? iClsError : iCls}
                        placeholder="Plant code" />
                    </ErrorFieldWrapper>
                  </EditField>
                  <EditField label="Status" required error={errors.statusId}>
                    <ReferenceSelect categoryCode="status" label="" selectClass={errors.statusId ? sClsError : sCls}
                      value={form.statusId ?? ""} onChange={(v) => update("statusId", v)}
                      includeInactive placeholder="Select status..." id="pdv-status" />
                  </EditField>
                  <ViewField label="Parent Company" value={companyName || "Standalone"} missing={!companyName} />
                  <EditField label="Plant Type / Category">
                    <ReferenceSelect categoryCode="plant_type" label="" selectClass={sCls} id="pdv-type"
                      value={form.plantTypeId ?? ""} onChange={(v) => update("plantTypeId", v)}
                      placeholder="Select type..." />
                  </EditField>
                  <EditField label="Operating Since" error={errors.operatingSince}>
                    <ErrorFieldWrapper error={errors.operatingSince}>
                      <input id="pdv-operatingSince" name="operatingSince" type="date" value={form.operatingSince || ""}
                        onChange={(e) => update("operatingSince", e.target.value)}
                        className={errors.operatingSince ? iClsError : iCls} />
                    </ErrorFieldWrapper>
                  </EditField>
                </div>
              </div>            )}

            {/* 2. Contact */}
            {readOnly ? (
              ((form.managerName || form.managerEmail || form.managerPhone) ? (
                <div>
                  <SectionHeader icon={<Phone className="h-3 w-3 stroke-current text-muted-foreground" />} title="Contact" />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <ViewField label="Manager Name" value={form.managerName} missing={!form.managerName} />
                    <ViewField label="Manager Phone" value={form.managerPhone} missing={!form.managerPhone} />
                    <div className="col-span-2">
                      <ViewField label="Manager Email" value={form.managerEmail} missing={!form.managerEmail} />
                    </div>
                  </div>
                </div>
              ) : null)
            ) : (
              <div>
                <SectionHeader icon={<Phone className="h-3 w-3 stroke-current text-muted-foreground" />} title="Contact" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <EditField label="Manager Name">
                    <input id="pdv-managerName" name="managerName" type="text" value={form.managerName || ""}
                      onChange={(e) => update("managerName", e.target.value)}
                      className={iCls} placeholder="Manager name" />
                  </EditField>
                  <EditField label="Manager Phone" error={errors.managerPhone}>
                    <ErrorFieldWrapper error={errors.managerPhone}>
                      <input id="pdv-managerPhone" name="managerPhone" type="tel" value={form.managerPhone || ""}
                        onChange={(e) => update("managerPhone", e.target.value)}
                        className={errors.managerPhone ? iClsError : iCls}
                        placeholder="+1 (555) 000-0000" />
                    </ErrorFieldWrapper>
                  </EditField>
                  <div className="col-span-2">
                    <EditField label="Manager Email" error={errors.managerEmail}>
                      <ErrorFieldWrapper error={errors.managerEmail}>
                        <input id="pdv-managerEmail" name="managerEmail" type="email" value={form.managerEmail || ""}
                          onChange={(e) => update("managerEmail", e.target.value)}
                          className={errors.managerEmail ? iClsError : iCls}
                          placeholder="manager@company.com" />
                      </ErrorFieldWrapper>
                    </EditField>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Schedule & Calendar */}
            {readOnly ? (
              <div>
                <SectionHeader icon={<Globe className="h-3 w-3 stroke-current text-muted-foreground" />} title="Schedule & Calendar" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <ViewField label="Default Calendar" value={form.defaultCalendar} missing={!form.defaultCalendar} />
                  <ViewField label="Default Shift Model" value={form.defaultShiftModel} missing={!form.defaultShiftModel} />
                  <ViewField label="Week Start Day" value={form.weekStartDay} missing={!form.weekStartDay} />
                  <ViewField label="Default Schedule" value={form.defaultSchedule} missing={!form.defaultSchedule} />
                  <div className="col-span-2">
                    <ViewField label="Timezone" value={form.timezone} missing={!form.timezone} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <SectionHeader icon={<Globe className="h-3 w-3 stroke-current text-muted-foreground" />} title="Schedule & Calendar" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <EditField label="Default Calendar" required error={errors.defaultCalendarId}>
                    <ReferenceSelect categoryCode="calendar" label="" selectClass={errors.defaultCalendarId ? sClsError : sCls} id="pdv-calendar"
                      value={form.defaultCalendarId ?? ""} onChange={(v) => update("defaultCalendarId", v)}
                      placeholder="Select calendar..." />
                  </EditField>
                  <EditField label="Default Shift Model" required error={errors.defaultShiftModelId}>
                    <ReferenceSelect categoryCode="shift_model" label="" selectClass={errors.defaultShiftModelId ? sClsError : sCls} id="pdv-shiftModel"
                      value={form.defaultShiftModelId ?? ""} onChange={(v) => update("defaultShiftModelId", v)}
                      placeholder="Select shift model..." />
                  </EditField>
                  <EditField label="Week Start Day" required error={errors.weekStartDayId}>
                    <ReferenceSelect categoryCode="week_start_day" label="" selectClass={errors.weekStartDayId ? sClsError : sCls} id="pdv-weekStartDay"
                      value={form.weekStartDayId ?? ""} onChange={(v) => update("weekStartDayId", v)}
                      placeholder="Select day..." />
                  </EditField>
                  <EditField label="Default Schedule">
                    <ReferenceSelect categoryCode="schedule" label="" selectClass={sCls} id="pdv-schedule"
                      value={form.defaultScheduleId ?? ""} onChange={(v) => update("defaultScheduleId", v)}
                      placeholder="Select schedule..." />
                  </EditField>
                  <div className="col-span-2">
                    <EditField label="Timezone" required error={errors.timezoneId}>
                      <ReferenceSelect categoryCode="timezone" label="" selectClass={errors.timezoneId ? sClsError : sCls} id="pdv-timezone"
                        value={form.timezoneId ?? ""} onChange={(v) => update("timezoneId", v)}
                        placeholder="Select timezone..." />
                    </EditField>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Manufacturing Focus */}
            {(form.manufacturingFocus || !readOnly) ? (
              readOnly ? (
                <div>
                  <SectionHeader icon={<Tag className="h-3 w-3 stroke-current text-muted-foreground" />} title="Manufacturing Focus" />
                  <div className="flex flex-wrap gap-1">
                    {(form.manufacturingFocus || "").split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                      <span key={t} className="inline-block rounded-full bg-success/10 text-success border border-success/20 px-2 py-0.5 text-[10px] font-medium">{t}</span>
                    ))}
                    {!form.manufacturingFocus && <span className="text-[12px] text-muted-foreground italic">No manufacturing focus set</span>}
                  </div>
                </div>
              ) : (
                <div>
                  <SectionHeader icon={<Tag className="h-3 w-3 stroke-current text-muted-foreground" />} title="Manufacturing Focus" />
                  <ReferenceMultiSelect categoryCode="manufacturing_focus" label=""
                    values={form.manufacturingFocusIds ?? []}
                    onChange={(v: string[]) => update("manufacturingFocusIds", v)} emptyLabel="No focus tags selected" compact />
                </div>
              )
            ) : null}

            {/* 5. Description */}
            {readOnly ? (
              (form.description ? (
                <div>
                  <SectionHeader icon={<Info className="h-3 w-3 stroke-current text-muted-foreground" />} title="Description" />
                  <div>
                    <p className={`text-[13px] text-foreground/80 leading-relaxed ${!descExpanded ? "line-clamp-2" : ""}`}>{form.description}</p>
                    {form.description.length > 120 && (
                      <button type="button" onClick={() => setDescExpanded(!descExpanded)}
                        className="text-[11px] font-medium text-primary hover:text-accent mt-1 transition-colors">
                        {descExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                </div>
              ) : null)
            ) : (
              <div>
                <SectionHeader icon={<Info className="h-3 w-3 stroke-current text-muted-foreground" />} title="Description" />
                <textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)}
                  className={roTA} maxLength={1000} placeholder="Plant description (optional)" />
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden pr-4 pt-3 pb-4">
            {/* 1. Location */}
            {readOnly ? (
              <div>
                <SectionHeader icon={<MapPin className="h-3 w-3 stroke-current text-muted-foreground" />} title="Location" />
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <ViewField label="Building / Site" value={form.buildingSite} missing={!form.buildingSite} />
                    <ViewField label="Zip / Postal Code" value={form.postalCode} missing={!form.postalCode} />
                    <div className="col-span-2">
                      <ViewField label="Street Address" value={form.streetAddress} missing={!form.streetAddress} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                    <ViewField label="City" value={form.city} missing={!form.city} />
                    <ViewField label="State" value={form.state} missing={!form.state} />
                    <ViewField label="Country" value={form.country || getLabel("country", form.countryId)} missing={!form.country && !form.countryId} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <ViewField label="Latitude" value={form.latitude || "—"} missing={!form.latitude} />
                    <ViewField label="Longitude" value={form.longitude || "—"} missing={!form.longitude} />
                  </div>
                </div>
                {renderMap()}
              </div>
            ) : (
              <div>
                <SectionHeader icon={<MapPin className="h-3 w-3 stroke-current text-muted-foreground" />} title="Location" />
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <EditField label="Building / Site">
                      <input id="pdv-building" name="building" type="text" value={form.building || ""}
                        onChange={(e) => update("building", e.target.value)}
                        className={iCls} placeholder="Building A" />
                    </EditField>
                    <EditField label="Zip / Postal Code">
                      <input id="pdv-zipcode" name="zipcode" type="text" value={form.zipcode || ""}
                        onChange={(e) => update("zipcode", e.target.value)}
                        className={iCls} placeholder="12345" />
                    </EditField>
                    <div className="col-span-2">
                      <EditField label="Street Address">
                        <input id="pdv-address" name="address" type="text" value={form.address || ""}
                          onChange={(e) => update("address", e.target.value)}
                          className={iCls} placeholder="123 Main Street" />
                      </EditField>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                    <EditField label="City">
                      <input id="pdv-city" name="city" type="text" value={form.city || ""}
                        onChange={(e) => update("city", e.target.value)}
                        className={iCls} placeholder="City" />
                    </EditField>
                    <EditField label="State">
                      <input id="pdv-state" name="state" type="text" value={form.state || ""}
                        onChange={(e) => update("state", e.target.value)}
                        className={iCls} placeholder="State" />
                    </EditField>
                    <EditField label="Country" required error={errors.countryId}>
                      <ReferenceSelect categoryCode="country" label="" selectClass={errors.countryId ? sClsError : sCls} id="pdv-country"
                        value={form.countryId ?? ""} onChange={(v) => update("countryId", v)}
                        placeholder="Select country..." />
                    </EditField>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <EditField label="Latitude" error={errors.latitude}>
                      <ErrorFieldWrapper error={errors.latitude}>
                        <input id="pdv-latitude" name="latitude" type="text" value={form.latitude || ""}
                          onChange={(e) => update("latitude", e.target.value)}
                          className={errors.latitude ? iClsError : iCls}
                          placeholder="25.7600" />
                      </ErrorFieldWrapper>
                    </EditField>
                    <EditField label="Longitude" error={errors.longitude}>
                      <ErrorFieldWrapper error={errors.longitude}>
                        <input id="pdv-longitude" name="longitude" type="text" value={form.longitude || ""}
                          onChange={(e) => update("longitude", e.target.value)}
                          className={errors.longitude ? iClsError : iCls}
                          placeholder="-80.1900" />
                      </ErrorFieldWrapper>
                    </EditField>
                  </div>
                </div>
                {renderMap()}
              </div>
            )}

            {/* 2. Structure Summary */}
            {!isNew && (
              <div>
                <SectionHeader icon={<TrendingUpDown className="h-3 w-3 stroke-current text-muted-foreground" />} title="Structure Summary" />
                {(plant?.lineCount ?? 0) + (plant?.departmentCount ?? 0) + (plant?.groupCount ?? 0) + (plant?.resourceCount ?? 0) === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 px-1">No structure data yet. Add lines, departments, and resource groups.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-px bg-border/10 rounded-md overflow-hidden">
                    <FlatStat label="Lines" value={plant?.lineCount ?? 0} title="Production lines at this plant" />
                    <FlatStat label="Departments" value={plant?.departmentCount ?? 0} title="Departments" />
                    <FlatStat label="Resource Groups" value={plant?.groupCount ?? 0} title="Resource groups across all departments" />
                    <FlatStat label="Resources" value={plant?.resourceCount ?? 0} title="Individual resources" />
                  </div>
                )}
              </div>
            )}

            {/* 3. Related Production Lines */}
            {!isNew && (
              <div>
                <SectionHeader icon={<TrendingUpDown className="h-3 w-3 stroke-current text-muted-foreground" />} title="Production Lines" />
                {renderLinesList()}
              </div>
            )}

            {/* Placeholder for create mode */}
            {isNew && (
              <div className="flex items-center justify-center flex-1 min-h-[160px] rounded-lg border border-dashed border-border/30 bg-muted/10 px-6">
                <div className="text-center">
                  <Factory className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30 stroke-current" />
                  <p className="text-xs font-semibold text-muted-foreground">Structure & lines are added after the plant is saved.</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Production lines, departments, resource groups, and resources all have their own dedicated pages.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function renderMap() {
    if (hasBackendCoordinates) {
      return (
        <div className="mt-2 overflow-hidden rounded-lg border border-border/20 shadow-sm">
          <iframe
            title="Plant location"
            className="h-24 w-full"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${backendLongitude - 0.01}%2C${backendLatitude - 0.01}%2C${backendLongitude + 0.01}%2C${backendLatitude + 0.01}&layer=mapnik&marker=${backendLatitude}%2C${backendLongitude}`}
          />
          <div className="flex items-center justify-between bg-muted/20 px-3 py-1 border-t border-border/20">
            <span className="text-[9px] text-muted-foreground/60">{form.latitude}, {form.longitude}</span>
            <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(resolvedCountry)}`}
              target="_blank" rel="noreferrer"
              className="text-[9px] font-medium text-primary hover:text-accent transition-colors">
              Open in OpenStreetMap →
            </a>
          </div>
        </div>
      );
    }
    if (resolvedCountry) {
      return (
        <div className="mt-2 rounded-lg border border-dashed border-border/30 bg-muted/10 px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{resolvedCountry}</span>
          <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(resolvedCountry)}`}
            target="_blank" rel="noreferrer"
            className="text-[10px] font-medium text-primary hover:text-accent transition-colors">
            View on map →
          </a>
        </div>
      );
    }
    return null;
  }

  function renderLinesList() {
    if (lines.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/60">
          No production lines yet
        </div>
      );
    }
    return (
      <div className="min-h-0 w-full flex-1 overflow-y-auto text-xs">
        <div className="flex items-center gap-1 px-2 py-1 border-b border-border/20 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
          <span className="flex-1 min-w-0">Name</span>
          <span className="w-14 shrink-0 text-center hidden sm:block">Code</span>
          <span className="w-16 shrink-0 text-center">Status</span>
          <span className="w-4 shrink-0" />
        </div>
        {lines.map((line: any) => (
          <div key={line.id} className="flex items-center gap-1 px-2 py-1.5 border-b border-border/10 hover:bg-muted/30 transition-colors cursor-pointer last:border-0 group"
            onClick={() => {
              if (dirty) {
                onDirtyNavigateToLine?.(line.id);
                return;
              }
              onNavigateToLine?.(line.id);
            }}
          >
            <span className="flex-1 min-w-0 truncate font-medium text-foreground group-hover:text-accent transition-colors" title={line.name}>{line.name}</span>
            <span className="w-14 shrink-0 text-center text-muted-foreground font-mono text-[10px] hidden sm:block">{line.code || "—"}</span>
            <span className="w-16 shrink-0 text-center">
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-semibold ${line.status === "active" ? "bg-success/10 text-success border border-success/20" : "bg-muted text-muted-foreground border border-border/40"}`}>
                <span className={`inline-block h-1 w-1 rounded-full ${line.status === "active" ? "bg-success" : "bg-muted-foreground/40"}`} />
                {line.status === "active" ? "Active" : "Inactive"}
              </span>
            </span>
            <span className="w-5 shrink-0 flex items-center justify-center text-muted-foreground/60 group-hover:text-foreground transition-colors">
              <svg className="h-3.5 w-3.5 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </span>
          </div>
        ))}
      </div>
    );
  }
});
