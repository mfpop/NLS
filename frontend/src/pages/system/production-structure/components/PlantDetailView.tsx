import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, MapPin, Info, Factory, TrendingUpDown, Layers, Component, Dumbbell, Globe, Tag } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PLANT_QUERY, UPDATE_PLANT_MUTATION } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import { COMPANY_QUERY } from "@/graphql/companyQueries";
import type { Plant } from "@/types/plant";
import { ReferenceSelect, ReferenceMultiSelect } from "./ReferenceSelect";



function Stat({ icon, label, value, color, to }: { icon: React.ReactNode; label: string; value: string | number; color: string; to?: string }) {
  const navigate = useNavigate();
  const hasValue = typeof value === "number" ? value > 0 : !!value;
  return (
    <button type="button" title={hasValue ? `View ${label.toLowerCase()}` : `No ${label.toLowerCase()}`} onClick={hasValue && to ? () => navigate(to) : undefined} className={`flex items-center gap-1 rounded-lg border p-1.5 transition-colors ${hasValue ? "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer" : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 cursor-not-allowed"}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded ${hasValue ? color : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>{icon}</span>
      <div className="text-left">
        <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">{value}</div>
        <div className="text-[9px] text-slate-400 dark:text-slate-500">{label}</div>
      </div>
    </button>
  );
}

interface PlantDetailViewProps {
  plantId: string;
  editing?: boolean;
  onEditToggle?: (editing: boolean) => void;
  onNavigateToLine?: (lineId: string) => void;
}

export const PlantDetailView = forwardRef<{ save: () => Promise<void>; cancel: () => void }, PlantDetailViewProps>(
function PlantDetailView({ plantId, editing = false, onEditToggle, onNavigateToLine }, ref) {
  const { data, loading, refetch } = useQuery<any>(PLANT_QUERY, { variables: { id: plantId } });
  const plant: Plant | undefined = data?.plant;
  const { data: companyData } = useQuery<any>(COMPANY_QUERY);
  const companyName = companyData?.company?.name || "";

  const { data: linesData } = useQuery<any>(PRODUCTION_LINES_QUERY, {
    variables: { plantId },
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const lines = linesData?.productionLines?.items || linesData?.productionLines || [];

  const [updatePlant] = useMutation(UPDATE_PLANT_MUTATION, {
    onCompleted: () => { setReadOnly(true); onEditToggle?.(false); refetch(); },
    onError: (err) => { alert(`Save failed: ${err.message}`); },
  });

  const [readOnly, setReadOnly] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => { setReadOnly(!editing); }, [editing]);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!plant || Object.keys(form).length > 0) return;
    const p = plant as any;
    setForm({
      name: p.name || "",
      code: p.code || "",
      status: p.status || "active",
      statusId: p.statusId || "",
      plantType: p.plantType || "",
      plantTypeId: p.plantTypeId || "",
      operatingSince: p.operatingSince || "",
      building: p.building || "",
      address: p.address || "",
      city: p.city || "",
      state: p.state || "",
      stateId: p.stateId || "",
      country: p.country || "",
      countryId: p.countryId || "",
      zipcode: p.zipcode || "",
      timezone: p.timezone || "",
      timezoneId: p.timezoneId || "",
      latitude: p.latitude || "",
      longitude: p.longitude || "",
      managerName: p.managerName || "",
      managerEmail: p.managerEmail || "",
      managerPhone: p.managerPhone || "",
      defaultCalendar: p.defaultCalendar || "",
      defaultCalendarId: p.defaultCalendarId || "",
      defaultShiftModel: p.defaultShiftModel || "",
      defaultShiftModelId: p.defaultShiftModelId || "",
      weekStartDay: p.weekStartDay || "",
      weekStartDayId: p.weekStartDayId || "",
      defaultSchedule: p.defaultSchedule || "",
      defaultScheduleId: p.defaultScheduleId || "",
      manufacturingFocus: p.manufacturingFocus || "",
      manufacturingFocusIds: [],
      description: p.description || "",
    });
  }, [plant]);

  const ro = readOnly
    ? "read-only border-0 bg-transparent px-0 text-slate-900 dark:text-slate-100 cursor-default"
    : "border border-slate-200 dark:border-slate-700 px-3 h-9 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50";
  const roTA = readOnly
    ? "read-only border-0 bg-transparent px-0 text-slate-900 dark:text-slate-100 cursor-default resize-none"
    : "border border-slate-200 dark:border-slate-700 p-2 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 resize-none";

  useImperativeHandle(ref, () => ({
    save: async () => {
      try {
        const input = {
          name: form.name,
          code: form.code,
          status: form.status,
          building: form.building || undefined,
          address: form.address || undefined,
          timezone: form.timezone || undefined,
          defaultCalendarId: form.defaultCalendarId || undefined,
          defaultScheduleId: form.defaultScheduleId || undefined,
          managerName: form.managerName || undefined,
          managerEmail: form.managerEmail || undefined,
          description: form.description || undefined,
        };
        await updatePlant({ variables: { id: plantId, input } });
      } catch (e: any) {
        alert(`Save failed: ${e.message}`);
      }
    },
    cancel: () => { setReadOnly(true); onEditToggle?.(false); },
  }), [updatePlant, plantId, form]);

  if (loading && !plant) {
    return (
      <div className="flex flex-col overflow-hidden flex-1">
        <div className="flex items-center justify-center flex-1 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-400">Loading plant...</div>
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="flex flex-col overflow-hidden flex-1">
        <div className="flex items-center justify-center flex-1 bg-white dark:bg-slate-900">
          <div className="text-center">
            <Info className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-current" />
            <p className="text-xs text-slate-400">Plant not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-0 min-h-0">
          {/* ── Left column ── */}
            <div className="p-1.5 flex flex-col gap-2 h-full">
            {/* 1. Plant Identity */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-1.5">
              <div className="flex items-center gap-1 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
                  <Factory className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-current" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Plant Identity</h3>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Plant Name</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.name || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Plant Code</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.code || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.code || ""} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Status</label>
                  {readOnly ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${form.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${form.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />{form.status}</span>
                  ) : (
                    <ReferenceSelect categoryCode="status" label=""
                      value={form.statusId ?? ""} onChange={(v) => setForm((p) => ({ ...p, statusId: v }))}
                      includeInactive placeholder="Select status..." />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Parent Company</label>
                  <span className="block text-[13px] text-slate-900 dark:text-slate-100">{companyName || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Plant Type / Category</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.plantType || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <ReferenceSelect categoryCode="plant_type" label=""
                      value={form.plantTypeId ?? ""} onChange={(v) => setForm((p) => ({ ...p, plantTypeId: v }))}
                      placeholder="Select type..." />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Operating Since</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.operatingSince || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.operatingSince || ""} onChange={(e) => setForm((p) => ({ ...p, operatingSince: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
              </div>
            </div>

            {/* 2. Contact */}
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
                  <Phone className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-current" />
                </span>
                <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contact</h4>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Manager Name</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.managerName || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.managerName || ""} onChange={(e) => setForm((p) => ({ ...p, managerName: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Manager Email</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.managerEmail || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.managerEmail || ""} onChange={(e) => setForm((p) => ({ ...p, managerEmail: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Manager Phone</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.managerPhone || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.managerPhone || ""} onChange={(e) => setForm((p) => ({ ...p, managerPhone: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
              </div>
            </div>

            {/* 3. Operations */}
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
                  <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-current" />
                </span>
                <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Operations</h4>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Default Calendar</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.defaultCalendar || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="calendar" label=""
                      value={form.defaultCalendarId ?? ""} onChange={(v) => setForm((p) => ({ ...p, defaultCalendarId: v }))}
                      placeholder="Select calendar..." />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Default Shift Model</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.defaultShiftModel || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="shift_model" label=""
                      value={form.defaultShiftModelId ?? ""} onChange={(v) => setForm((p) => ({ ...p, defaultShiftModelId: v }))}
                      placeholder="Select shift model..." />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Week Start Day</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.weekStartDay || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="week_start_day" label=""
                      value={form.weekStartDayId ?? ""} onChange={(v) => setForm((p) => ({ ...p, weekStartDayId: v }))}
                      placeholder="Select day..." />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Default Schedule</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.defaultSchedule || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="schedule" label=""
                      value={form.defaultScheduleId ?? ""} onChange={(v) => setForm((p) => ({ ...p, defaultScheduleId: v }))}
                      placeholder="Select schedule..." />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Timezone</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.timezone || "\u2014"}</span>
                  ) : (
                    <ReferenceSelect categoryCode="timezone" label=""
                      value={form.timezoneId ?? ""} onChange={(v) => setForm((p) => ({ ...p, timezoneId: v }))}
                      placeholder="Select timezone..." />
                  )}
                </div>
              </div>
            </div>

            {/* 4. Manufacturing Focus */}
            {(form.manufacturingFocus || !readOnly) ? (
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
                  <Tag className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-current" />
                </span>
                <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Manufacturing Focus</h4>
              </div>
                {readOnly ? (
                  <div className="flex flex-wrap gap-1">
                    {(form.manufacturingFocus || "").split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                      <span key={t} className="inline-block rounded-full border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">{t}</span>
                    ))}
                    {!form.manufacturingFocus && <span className="text-[12px] text-slate-400 dark:text-slate-500 italic">No manufacturing focus set</span>}
                  </div>
                ) : (
                  <ReferenceMultiSelect categoryCode="manufacturing_focus" label=""
                    values={form.manufacturingFocusIds ?? []}
                    onChange={(v: string[]) => setForm((p: any) => ({ ...p, manufacturingFocusIds: v }))} />
                )}
              </div>
            ) : null}

            {/* 5. Description */}
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
                  <Info className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-current" />
                </span>
                <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Description</h4>
              </div>
              {readOnly ? (
                <div>
                  {form.description ? (
                    <>
                      <p className={`text-[13px] text-slate-900 dark:text-slate-100 leading-relaxed ${!descExpanded ? "line-clamp-2" : ""}`}>{form.description}</p>
                      {form.description.length > 120 && (
                        <button type="button" onClick={() => setDescExpanded(!descExpanded)} className="text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 mt-0.5 transition-colors">
                          {descExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-[12px] text-slate-400 dark:text-slate-500 italic">No description</span>
                  )}
                </div>
              ) : (
                <textarea value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${roTA}`} maxLength={1000} placeholder="Plant description" />
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="p-1.5 flex flex-col gap-2 h-full">
            {/* 4. Location */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-1.5">
              <div className="flex items-center gap-1 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
                  <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-current" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Location</h3>
              </div>
              <div className="grid grid-cols-2 gap-1 mb-1.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Building / Site</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.building || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.building || ""} onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Street Address</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.address || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.address || ""} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Zip / Postal Code</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.zipcode || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.zipcode || ""} onChange={(e) => setForm((p) => ({ ...p, zipcode: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-1">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">City</label>
                    {readOnly ? (
                      <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.city || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                    ) : (
                      <input type="text" value={form.city || ""} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">State</label>
                    {readOnly ? (
                      <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.state || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                    ) : (
                      <input type="text" value={form.state || ""} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                    )}
                  </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Country</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.country || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <ReferenceSelect categoryCode="country" label=""
                      value={form.countryId ?? ""} onChange={(v) => setForm((p) => ({ ...p, countryId: v }))}
                      placeholder="Select country..." />
                  )}
                </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Latitude</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.latitude || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.latitude || ""} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Longitude</label>
                  {readOnly ? (
                    <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.longitude || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                  ) : (
                    <input type="text" value={form.longitude || ""} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  )}
                </div>
              </div>
              <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-16">
                {form.latitude && form.longitude ? (
                  <iframe title="Plant location" className="w-full h-full" loading="lazy"
                    src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&output=embed&z=14`} />
                ) : form.address && form.city ? (
                  <iframe title="Plant location" className="w-full h-full" loading="lazy"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.address}, ${form.city}, ${form.state || ""}, ${form.country || ""}`)}&output=embed&z=14`} />
                ) : form.city ? (
                  <iframe title="Plant location" className="w-full h-full" loading="lazy"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.city}, ${form.state || ""}, ${form.country || ""}`)}&output=embed&z=14`} />
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 text-slate-400 text-xs">No location data</div>
                )}
              </div>
            </div>

            {/* 5. Structure Summary */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
                  <TrendingUpDown className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-current" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Structure Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-1 mb-1">
                <Stat icon={<TrendingUpDown className="h-3 w-3 stroke-current" />} label="Lines" value={plant.lineCount ?? 0} color="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" to="/system/production-structure/components?entity=productionLine" />
                <Stat icon={<Layers className="h-3 w-3 stroke-current" />} label="Depts" value={plant.departmentCount ?? 0} color="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" to="/system/production-structure/components?entity=department" />
                <Stat icon={<Component className="h-3 w-3 stroke-current" />} label="Groups" value={plant.groupCount ?? 0} color="bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" to="/system/production-structure/components?entity=resourceGroup" />
                <Stat icon={<Dumbbell className="h-3 w-3 stroke-current" />} label="Resources" value={plant.resourceCount ?? 0} color="bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" to="/system/production-structure/components?entity=resource" />
              </div>
            </div>

            {/* 6. Related Production Lines */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-1.5">
              <div className="flex items-center gap-1 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
                  <TrendingUpDown className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-current" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Production Lines</h3>
              </div>
              {lines.length === 0 ? (
                <div className="text-xs text-slate-400 py-1 text-center">No production lines</div>
              ) : (
                <div className="w-full text-xs">
                  <div className="flex items-center gap-1 px-2 py-0.5 border-b border-slate-100 dark:border-slate-800 text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    <span className="flex-[2] min-w-0">Name</span>
                    <span className="w-14 shrink-0 text-center hidden sm:block">Code</span>
                    <span className="w-12 shrink-0 text-center">Status</span>
                    <span className="w-4 shrink-0" />
                  </div>
                  {lines.slice(0, 5).map((line: any) => (
                    <div key={line.id} className="flex items-center gap-1 px-2 py-1 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer last:border-0"
                      onClick={() => onNavigateToLine?.(line.id)}
                    >
                      <span className="flex-[2] min-w-0 truncate font-semibold text-slate-900 dark:text-slate-100" title={line.name}>{line.name}</span>
                      <span className="w-14 shrink-0 text-center text-slate-500 dark:text-slate-400 font-mono hidden sm:block">{line.code || "-"}</span>
                      <span className="w-12 shrink-0 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${line.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${line.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                        </span>
                      </span>
                      <span className="w-4 shrink-0 flex items-center justify-center text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors">
                        <svg className="h-3 w-3 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
});

