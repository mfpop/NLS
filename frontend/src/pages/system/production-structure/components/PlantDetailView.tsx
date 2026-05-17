import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "../../../../styles/themeTokens";
import { Phone, MapPin, Info, Factory, TrendingUpDown, Layers, Component, Dumbbell, Globe, Tag } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PLANT_QUERY, UPDATE_PLANT_MUTATION } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { COMPANY_QUERY } from "@/graphql/companyQueries";
import type { Plant } from "@/types/plant";
import { ReferenceSelect, ReferenceMultiSelect } from "./ReferenceSelect";
import { useReferenceTables } from "@/hooks/useReferenceTables";
import { formatAppDate } from "@/utils/dateFormat";

type PlantMutationError = { field?: string | null; message: string };
type UpdatePlantResult = { updatePlant?: { errors?: PlantMutationError[] } };



function Stat({ icon, label, value, color, to }: { icon: React.ReactNode; label: string; value: string | number; color: string; to?: string }) {
  const navigate = useNavigate();
  const hasValue = typeof value === "number" ? value > 0 : !!value;
  return (
    <button type="button" title={hasValue ? `View ${label.toLowerCase()}` : `No ${label.toLowerCase()}`} onClick={hasValue && to ? () => navigate(to) : undefined} className={`flex items-center gap-1 rounded-lg border p-1.5 transition-colors ${hasValue ? `border-border ${theme.interactiveRow} cursor-pointer` : `border-border ${theme.toolbarBg} cursor-not-allowed`}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded ${hasValue ? color : `${theme.codeBadge}`}`}>{icon}</span>
      <div className="text-left">
        <div className={`text-[11px] font-semibold ${theme.textPrimary}`}>{value}</div>
        <div className={`text-[9px] ${theme.textMuted}`}>{label}</div>
      </div>
    </button>
  );
}

function Panel({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-h-0 rounded-lg border border-border ${theme.surfaceBg} p-1.5 shadow-sm ${className}`}>
      <div className="mb-1 flex items-center gap-1">
        <span className={`flex h-5 w-5 items-center justify-center rounded ${theme.iconBoxBlue}`}>{icon}</span>
        <h3 className={`text-xs font-semibold ${theme.textPrimary}`}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

interface PlantDetailViewProps {
  plantId: string;
  editing?: boolean;
  onEditToggle?: (editing: boolean) => void;
  onNavigateToLine?: (lineId: string) => void;
  onError?: (message: string | null) => void;
  onEditStateChange?: (state: { dirty: boolean; valid: boolean; saving: boolean }) => void;
  onSaved?: () => Promise<void> | void;
  onDirtyNavigateToLine?: (lineId: string) => void;
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
type PlantDetailDto = PlantDetailForm;

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
): PlantDetailDto {
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
  if (form.latitude && !Number.isFinite(Number(form.latitude))) errors.latitude = "Latitude must be numeric";
  if (form.longitude && !Number.isFinite(Number(form.longitude))) errors.longitude = "Longitude must be numeric";
  return errors;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || "inactive";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${normalized === "active" ? `${theme.badgeActive}` : `${theme.badgeInactive}`}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${normalized === "active" ? `${theme.statusActive}` : `${theme.statusInactive}`}`} />{status || "Inactive"}
    </span>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className={`mt-0.5 text-[10px] ${theme.textCritical}`}>{message}</p>;
}

export const PlantDetailView = forwardRef<{ save: () => Promise<boolean>; cancel: () => void; isDirty: () => boolean }, PlantDetailViewProps>(
function PlantDetailView({ plantId, editing = false, onEditToggle, onNavigateToLine, onError, onEditStateChange, onSaved, onDirtyNavigateToLine }, ref) {
  const { data, loading, refetch } = useQuery<any>(PLANT_QUERY, { variables: { id: plantId } });
  const plant: Plant | undefined = data?.plant;
  const { data: companyData } = useQuery<any>(COMPANY_QUERY);
  const companyName = companyData?.company?.name || "";
  const { getLabel, getCode, findIdByText } = useReferenceTables();

  const { data: linesData } = useQuery<any>(PRODUCTION_LINES_QUERY, {
    variables: { plantId },
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const lines = linesData?.productionLines?.items || linesData?.productionLines || [];

  const [updatePlant, updateState] = useMutation<UpdatePlantResult>(UPDATE_PLANT_MUTATION);

  const [readOnly, setReadOnly] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => { setReadOnly(!editing); }, [editing]);
  const [form, setForm] = useState<PlantDetailForm>({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
  const [initialForm, setInitialForm] = useState<PlantDetailForm>({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
    setInitialForm({ ...EMPTY_PLANT_FORM, manufacturingFocusIds: [] });
    setErrors({});
  }, [plantId]);

  useEffect(() => {
    if (!plant || plant.id !== plantId) return;
    const normalized = normalizePlantForm(plant, getLabel, findIdByText);
    setForm(normalized);
    setInitialForm(normalized);
    setErrors({});
  }, [plant, plantId, getLabel, findIdByText]);

  const dirty = isPlantFormDirty(form, initialForm);
  const validation = validatePlantDetailForm(form);
  const valid = Object.keys(validation).length === 0;

  useEffect(() => {
    onEditStateChange?.({ dirty, valid, saving: updateState.loading });
  }, [dirty, valid, updateState.loading, onEditStateChange]);

  const update = (key: keyof PlantDetailForm, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const resolvedCountry = form.country || getLabel("country", form.countryId) || "";
  const locationLabel = [form.streetAddress, form.city, form.state, resolvedCountry].filter(Boolean).join(", ");
  const backendLatitude = Number(form.latitude);
  const backendLongitude = Number(form.longitude);
  const hasBackendCoordinates = Number.isFinite(backendLatitude) && Number.isFinite(backendLongitude) && Math.abs(backendLatitude) <= 90 && Math.abs(backendLongitude) <= 180;

  const ro = readOnly
    ? "read-only border-0 bg-transparent px-0 ${theme.textPrimary} cursor-default"
    : "border border-border px-2 py-0.5 rounded ${theme.surfaceBg} ${theme.textPrimary} ${theme.focusRingSuccess}";
  const roTA = readOnly
    ? "read-only border-0 bg-transparent px-0 ${theme.textPrimary} cursor-default resize-none"
    : "border border-border p-2 rounded ${theme.surfaceBg} ${theme.textPrimary} ${theme.focusRingSuccess} resize-none";

  useImperativeHandle(ref, () => ({
    save: async () => {
      const nextErrors = validatePlantDetailForm(form);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        onError?.("Please fix the validation errors before saving.");
        return false;
      }
      try {
        const input = {
          name: form.name,
          code: form.code,
          status: form.statusId ? getCode("status", form.statusId) || form.status || undefined : form.status || undefined,
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
      setForm(initialForm);
      setErrors({});
      onError?.(null);
      setReadOnly(true);
      onEditToggle?.(false);
    },
    isDirty: () => isPlantFormDirty(form, initialForm),
  }), [updatePlant, plantId, form, getLabel, getCode, findIdByText, refetch, plant, onError, onEditToggle, onSaved, initialForm]);

  if (loading && !plant) {
    return (
      <div className="flex flex-col overflow-hidden flex-1">
        <div className={`flex items-center justify-center flex-1 ${theme.surfaceBg}`}>
          <div className={`text-xs ${theme.textMuted}`}>Loading plant...</div>
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="flex flex-col overflow-hidden flex-1">
        <div className="flex items-center justify-center flex-1 bg-card">
          <div className="text-center">
            <Info className="h-8 w-8 mx-auto mb-2 ${theme.icon} stroke-current" />
            <p className="text-xs text-muted-foreground">Plant not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <div className={`flex-1 min-h-0 overflow-hidden ${theme.surfaceBg}`}>
        <div className="grid h-full min-h-0 grid-cols-2 gap-2 p-1.5">
          {/* ── Left column ── */}
            <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
            {/* 1. Plant Identity */}
            <Panel title="Plant Identity" icon={<Factory className={`h-3 w-3 ${theme.iconAccent} stroke-current`} />}>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={`block text-[10px] font-medium ${theme.textMuted} mb-0.5 uppercase tracking-wide`}>Plant Name</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.name || <span className={`${theme.textMuted} italic`}>Not set</span>}</span>
                  ) : (
                    <>
                      <input type="text" value={form.name || ""} onChange={(e) => update("name", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                      <ErrorText message={errors.name} />
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Plant Code</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.code || <span className="text-muted-foreground italic">Not set</span>}</span>
                  ) : (
                    <>
                      <input type="text" value={form.code || ""} onChange={(e) => update("code", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                      <ErrorText message={errors.code} />
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Status</label>
                  {readOnly ? (
                    <StatusBadge status={form.status} />
                  ) : (
                    <ReferenceSelect categoryCode="status" label=""
                      value={form.statusId ?? ""} onChange={(v) => update("statusId", v)}
                      includeInactive placeholder="Select status..." error={errors.statusId} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Parent Company</label>
                  <span className="block text-[13px] text-muted-foreground">{companyName || <span className="text-muted-foreground italic">Not set</span>}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Plant Type / Category</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.plantType || <span className="text-muted-foreground italic">Not set</span>}</span>
                  ) : (
                    <ReferenceSelect categoryCode="plant_type" label=""
                      value={form.plantTypeId ?? ""} onChange={(v) => update("plantTypeId", v)}
                      placeholder="Select type..." />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Operating Since</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{formatAppDate(form.operatingSince) || <span className="text-muted-foreground italic">Not set</span>}</span>
                  ) : (
                    <>
                      <input type="date" value={form.operatingSince || ""} onChange={(e) => update("operatingSince", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                      <ErrorText message={errors.operatingSince} />
                    </>
                  )}
                </div>
              </div>
            </Panel>

            {/* 2. Contact */}
            <Panel title="Contact" icon={<Phone className={`h-3 w-3 ${theme.iconAccent} stroke-current`} />}>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Manager Name</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.managerName || <span className="text-muted-foreground italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.managerName || ""} onChange={(e) => update("managerName", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Manager Email</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.managerEmail || <span className="text-muted-foreground italic">Not set</span>}</span>
                  ) : (
                    <>
                      <input type="email" value={form.managerEmail || ""} onChange={(e) => update("managerEmail", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                      <ErrorText message={errors.managerEmail} />
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Manager Phone</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.managerPhone || <span className="text-muted-foreground italic">Not set</span>}</span>
                  ) : (
                    <>
                      <input type="tel" value={form.managerPhone || ""} onChange={(e) => update("managerPhone", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                      <ErrorText message={errors.managerPhone} />
                    </>
                  )}
                </div>
              </div>
            </Panel>

            {/* 3. Operations */}
            <Panel title="Operations" icon={<Globe className="h-3 w-3 ${theme.iconAccent} stroke-current" />}>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Default Calendar</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.defaultCalendar || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="calendar" label=""
                      value={form.defaultCalendarId ?? ""} onChange={(v) => update("defaultCalendarId", v)}
                      placeholder="Select calendar..." error={errors.defaultCalendarId} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Default Shift Model</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.defaultShiftModel || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="shift_model" label=""
                      value={form.defaultShiftModelId ?? ""} onChange={(v) => update("defaultShiftModelId", v)}
                      placeholder="Select shift model..." error={errors.defaultShiftModelId} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Week Start Day</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.weekStartDay || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="week_start_day" label=""
                      value={form.weekStartDayId ?? ""} onChange={(v) => update("weekStartDayId", v)}
                      placeholder="Select day..." error={errors.weekStartDayId} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Default Schedule</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.defaultSchedule || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="schedule" label=""
                      value={form.defaultScheduleId ?? ""} onChange={(v) => update("defaultScheduleId", v)}
                      placeholder="Select schedule..." />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Timezone</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-muted-foreground">{form.timezone || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="timezone" label=""
                      value={form.timezoneId ?? ""} onChange={(v) => update("timezoneId", v)}
                      placeholder="Select timezone..." error={errors.timezoneId} />
                  )}
                </div>
              </div>
            </Panel>

            {/* 4. Manufacturing Focus */}
            {(form.manufacturingFocus || !readOnly) ? (
              <Panel title="Manufacturing Focus" icon={<Tag className="h-3 w-3 ${theme.iconAccent} stroke-current" />}>
                {readOnly ? (
                  <div className="flex flex-wrap gap-1">
                    {(form.manufacturingFocus || "").split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                      <span key={t} className={`inline-block rounded-full ${theme.badgeActive} px-2 py-0.5 text-[10px] font-medium`}>{t}</span>
                    ))}
                    {!form.manufacturingFocus && <span className={`text-[12px] ${theme.textMuted} italic`}>No manufacturing focus set</span>}
                  </div>
                ) : (
                  <ReferenceMultiSelect categoryCode="manufacturing_focus" label=""
                    values={form.manufacturingFocusIds ?? []}
                    onChange={(v: string[]) => update("manufacturingFocusIds", v)} emptyLabel="No focus tags selected" compact />
                )}
              </Panel>
            ) : null}

            {/* 5. Description */}
            <Panel title="Description" icon={<Info className="h-3 w-3 ${theme.iconAccent} stroke-current" />}>
              {readOnly ? (
                <div className="min-h-0 overflow-y-auto">
                  {form.description ? (
                    <>
                      <p className={`text-[13px] text-muted-foreground leading-relaxed ${!descExpanded ? "line-clamp-2" : ""}`}>{form.description}</p>
                      {form.description.length > 120 && (
                        <button type="button" onClick={() => setDescExpanded(!descExpanded)} className={`text-[11px] font-medium ${theme.textSuccess} hover:text-success mt-0.5 transition-colors`}>
                          {descExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-[12px] text-muted-foreground italic">No description</span>
                  )}
                </div>
              ) : (
                <textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)} className={`min-h-[72px] max-h-[140px] w-full text-[13px] outline-none transition-colors ${roTA}`} style={{ overflowY: "auto" }} maxLength={1000} placeholder="Plant description" />
              )}
            </Panel>
          </div>

          {/* ── Right column ── */}
          <div className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
            {/* 4. Location */}
            <section className={`min-h-[220px] overflow-hidden rounded-lg border border-border ${theme.surfaceBg} shadow-sm`}>
              <div className="grid h-full grid-cols-[65fr_35fr]">
                <div className="flex min-h-0 flex-col">
                  <div className="flex items-center gap-2 p-3 pb-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${theme.iconBoxBlue}`}>
                      <MapPin className={`h-3.5 w-3.5 ${theme.iconAccent} stroke-current`} />
                    </span>
                    <h3 className="flex-1 text-sm font-bold text-muted-foreground">Location</h3>
                  </div>
                  <div className="p-3 pt-0">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Building / Site</label>
                        {readOnly ? (
                          <span className="block truncate text-[13px] text-muted-foreground">{form.buildingSite || "—"}</span>
                        ) : (
                          <input type="text" value={form.building || ""} onChange={(e) => update("building", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Zip / Postal Code</label>
                        {readOnly ? (
                          <span className="block truncate text-[13px] text-muted-foreground">{form.postalCode || "—"}</span>
                        ) : (
                          <input type="text" value={form.zipcode || ""} onChange={(e) => update("zipcode", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Street Address</label>
                        {readOnly ? (
                          <span className="block truncate text-[13px] text-muted-foreground">{form.streetAddress || "—"}</span>
                        ) : (
                          <input type="text" value={form.address || ""} onChange={(e) => update("address", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2">
                      <div className="min-w-0">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">City</label>
                        {readOnly ? (
                          <span className="block truncate text-[13px] text-muted-foreground">{form.city || "—"}</span>
                        ) : (
                          <input type="text" value={form.city || ""} onChange={(e) => update("city", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">State</label>
                        {readOnly ? (
                          <span className="block truncate text-[13px] text-muted-foreground">{form.state || "—"}</span>
                        ) : (
                          <input type="text" value={form.state || ""} onChange={(e) => update("state", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Country</label>
                        {readOnly ? (
                          <span className="block truncate text-[13px] text-muted-foreground">{form.country || getLabel("country", form.countryId) || "—"}</span>
                        ) : (
                          <ReferenceSelect categoryCode="country" label=""
                            value={form.countryId ?? ""} onChange={(v) => update("countryId", v)}
                            placeholder="Select country..." error={errors.countryId} />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2">
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Latitude</label>
                        {readOnly ? (
                          <span className="block truncate text-[13px] text-muted-foreground">{form.latitude || "—"}</span>
                        ) : (
                          <>
                            <input type="text" value={form.latitude || ""} onChange={(e) => update("latitude", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                            <ErrorText message={errors.latitude} />
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Longitude</label>
                        {readOnly ? (
                          <span className="block truncate text-[13px] text-muted-foreground">{form.longitude || "—"}</span>
                        ) : (
                          <>
                            <input type="text" value={form.longitude || ""} onChange={(e) => update("longitude", e.target.value)} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                            <ErrorText message={errors.longitude} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 overflow-hidden border-l border-border">
                    {(() => {
                      if (hasBackendCoordinates) {
                        const lat = backendLatitude;
                        const lon = backendLongitude;
                        const delta = 0.01;
                        const left = lon - delta;
                        const right = lon + delta;
                        const top = lat + delta;
                        const bottom = lat - delta;
                        const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;

                        return (
                          <iframe
                            title="Plant location"
                            className="w-full h-full"
                            loading="lazy"
                            src={mapSrc}
                          />
                        );
                      }

                      const mapQuery = locationLabel;

                      if (!mapQuery) {
                        return <div className={`flex items-center justify-center h-full ${theme.toolbarBg} ${theme.textMuted} text-xs`}>No location data</div>;
                      }

                      return (
                        <div className={`flex h-full flex-col ${theme.toolbarBg} p-2 gap-2`}>
                          <div className={`flex items-start gap-2 rounded border border-border bg-card p-2`}>
                            <MapPin className={`h-4 w-4 mt-0.5 ${theme.textCritical} shrink-0`} />
                            <div className={`text-[11px] leading-4 ${theme.textSecondary} wrap-break-word`}>{mapQuery}</div>
                          </div>
                          <a
                            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(mapQuery)}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-auto inline-flex items-center justify-center rounded border border-border bg-card px-2 py-1 text-[11px] font-medium ${theme.textSecondary} ${theme.interactiveRow} transition-colors`}
                          >
                            Open map
                          </a>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </section>

            {/* 5. Structure Summary */}
            <Panel title="Structure Summary" icon={<TrendingUpDown className="h-3 w-3 ${theme.iconAccent} stroke-current" />}>
              <div className="grid grid-cols-2 gap-1 mb-1">
                <Stat icon={<TrendingUpDown className="h-3 w-3 stroke-current" />} label="Lines" value={plant.lineCount ?? 0} color={`${theme.iconBoxAmber}`} to="/system/production-structure/components/line" />
                <Stat icon={<Layers className="h-3 w-3 stroke-current" />} label="Depts" value={plant.departmentCount ?? 0} color={`${theme.iconBoxViolet}`} to="/system/production-structure/components/dept" />
                <Stat icon={<Component className="h-3 w-3 stroke-current" />} label="Groups" value={plant.groupCount ?? 0} color={`${theme.iconBoxRose}`} to="/system/production-structure/components/rg" />
                <Stat icon={<Dumbbell className="h-3 w-3 stroke-current" />} label="Resources" value={plant.resourceCount ?? 0} color={`${theme.iconBoxSubtle}`} to="/system/production-structure/components/resource" />
              </div>
            </Panel>

            {/* 6. Related Production Lines */}
            <Panel title="Production Lines" icon={<TrendingUpDown className="h-3 w-3 ${theme.iconAccent} stroke-current" />} className="flex flex-1 flex-col overflow-hidden">
              {lines.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">No production lines</div>
              ) : (
                <div className="min-h-0 w-full flex-1 overflow-y-auto text-xs">
                  <div className={`flex items-center gap-1 px-2 py-0.5 border-b border-border text-[9px] font-semibold ${theme.textMuted} uppercase tracking-wide`}>
                    <span className="flex-2 min-w-0">Name</span>
                    <span className="w-14 shrink-0 text-center hidden sm:block">Code</span>
                    <span className="w-12 shrink-0 text-center">Status</span>
                    <span className="w-4 shrink-0" />
                  </div>
                  {lines.map((line: any) => (
                    <div key={line.id} className={`flex items-center gap-1 px-2 py-1 border-b border-border ${theme.interactiveRow} transition-colors cursor-pointer last:border-0`}
                      onClick={() => {
                        if (dirty) {
                          onDirtyNavigateToLine?.(line.id);
                          return;
                        }
                        onNavigateToLine?.(line.id);
                      }}
                    >
                      <span className="flex-2 min-w-0 truncate font-semibold text-muted-foreground" title={line.name}>{line.name}</span>
                      <span className="w-14 shrink-0 text-center ${theme.textMuted} font-mono hidden sm:block">{line.code || "-"}</span>
                      <span className="w-12 shrink-0 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${line.status === "active" ? `${theme.badgeActive}` : `${theme.badgeInactive}`}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${line.status === "active" ? `${theme.statusActive}` : `${theme.statusInactive}`}`} />
                        </span>
                      </span>
                      <span className={`w-4 shrink-0 flex items-center justify-center ${theme.textMuted} hover:text-muted-foreground transition-colors`}>
                        <svg className="h-3 w-3 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>


          </div>
        </div>
      </div>
    </div>
  );
});

