import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Pencil, Check, X, Trash2, RefreshCw, Globe, Phone, MapPin, Info, Factory, TrendingUpDown, Layers, Component, Dumbbell, Calendar } from "lucide-react";
import { CompanyOverview } from "./CompanyOverview";
import { ReferenceSelect, ReferenceMultiSelect } from "./ReferenceSelect";
import { ConfirmDialog } from "../shared";
import { useCompany, mapCompanyDbToForm, EMPTY_COMPANY_FORM, validateCompanyForm, isDirty, renderDisplayValue } from "@/hooks/useCompany";
import type { CompanyFormData } from "@/hooks/useCompany";
import { usePlants } from "@/hooks/usePlants";
import type { Plant } from "@/types/plant";
import { useNavigate } from "react-router-dom";
import { useReferenceTables } from "@/hooks/useReferenceTables";
import { theme } from "@/styles/themeTokens";

type FormMode = "view" | "edit" | "create";

// ── Shared display helpers ──

function Pill({ label }: { label: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${theme.badgeActive}`}>{label}</span>;
}

function RefPill({ categoryCode, valueId }: { categoryCode: string; valueId: string }) {
  const { getLabel } = useReferenceTables();
  const label = getLabel(categoryCode, valueId) || valueId;
  return <Pill label={label} />;
}

function BadgeList({ categoryCode, ids }: { categoryCode: string; ids: string[] }) {
  if (!ids || ids.length === 0) return <span className={`text-[12px] ${theme.textMuted} italic`}>None</span>;
  return (<div className="flex flex-wrap gap-1">{ids.map((id) => <RefPill key={id} categoryCode={categoryCode} valueId={id} />)}</div>);
}

function Stat({ icon, label, value, color, to }: { icon: React.ReactNode; label: string; value: string | number; color: string; to?: string }) {
  const navigate = useNavigate();
  const hasValue = typeof value === "number" ? value > 0 : !!value;
  return (
    <button type="button" title={hasValue ? `View ${label.toLowerCase()}` : `No ${label.toLowerCase()}`} onClick={hasValue && to ? () => navigate(to) : undefined}
      className={`flex items-center gap-1 rounded-lg border p-1.5 transition-colors ${hasValue ? `${theme.statCard} cursor-pointer` : `${theme.statCardDisabled} cursor-not-allowed`}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded ${hasValue ? color : theme.statIcon}`}>{icon}</span>
      <div className="text-left">
        <div className={`text-[11px] font-semibold ${theme.textPrimary}`}>{value}</div>
        <div className={`text-[9px] ${theme.textMuted}`}>{label}</div>
      </div>
    </button>
  );
}

// ── Field config ──

interface FieldDef {
  key: keyof CompanyFormData;
  label: string;
  type: "text" | "ref";
  refCat?: string;
  required?: boolean;
  placeholder?: string;
}

const FIELD_CONFIGS: Record<string, FieldDef[]> = {
  identity: [
    { key: "name", label: "Company Name", type: "text", required: true, placeholder: "e.g. Lean Manufacturing Demo" },
    { key: "code", label: "Company Code", type: "text", required: true, placeholder: "e.g. LMD" },
    { key: "legalName", label: "Legal / Display Name", type: "text", placeholder: "e.g. Lean Manufacturing Corp." },
    { key: "industryTypeId", label: "Industry / Business Type", type: "ref", refCat: "industry_type", placeholder: "Select industry..." },
    { key: "statusId", label: "Status", type: "ref", refCat: "status", required: true, placeholder: "Select status..." },
    { key: "operatingSince", label: "Operating Since", type: "text", placeholder: "YYYY-MM-DD" },
  ],
  contact: [
    { key: "phone", label: "Main Phone", type: "text", placeholder: "+1 (555) 000-0000" },
    { key: "email", label: "Main Email", type: "text", placeholder: "info@company.com" },
    { key: "website", label: "Website", type: "text", placeholder: "https://company.com" },
    { key: "adminName", label: "Admin Contact", type: "text", placeholder: "e.g. Jane Doe" },
    { key: "adminRole", label: "Contact Role", type: "text", placeholder: "e.g. Operations Manager" },
  ],
  operations: [
    { key: "defaultTimezoneId", label: "Default Timezone", type: "ref", refCat: "timezone", required: true, placeholder: "Select timezone..." },
    { key: "defaultLanguageId", label: "Language / Locale", type: "ref", refCat: "language_locale", placeholder: "Select language..." },
    { key: "defaultCalendarId", label: "Working Calendar", type: "ref", refCat: "calendar", required: true, placeholder: "Select calendar..." },
    { key: "defaultShiftModelId", label: "Shift Model", type: "ref", refCat: "shift_model", required: true, placeholder: "Select shift model..." },
    { key: "weekStartDayId", label: "Week Start Day", type: "ref", refCat: "week_start_day", required: true, placeholder: "Select day..." },
  ],
};

// ── Card components ──

function CardSection({ title, icon, children, cardClass = theme.cardSection }: { title: string; icon: React.ReactNode; children: React.ReactNode; cardClass?: string }) {
  return (
    <div className={`rounded-lg p-2 ${cardClass}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`flex h-5 w-5 items-center justify-center rounded ${theme.iconBoxEmerald}`}>{icon}</span>
        <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SubCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg p-2.5 ${theme.subCard}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <h4 className={`text-[10px] font-semibold ${theme.textSecondary} uppercase tracking-wide`}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function TextField({ value, onChange, readOnly, error, placeholder, ro }: {
  value: string; onChange?: (v: string) => void; readOnly: boolean; error?: string; placeholder?: string; ro: string;
}) {
  return (
    <div>
      <input type="text" value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)}
        className={`w-full text-[13px] outline-none transition-colors ${error ? theme.fieldErrorBorder : ""} ${ro}`} placeholder={placeholder} />
      {error && <p className={theme.labelError + " mt-0.5"}>{error}</p>}
    </div>
  );
}

function RefField({ value, onChange, readOnly, error, categoryCode, placeholder, refLabel }: {
  value: string; onChange?: (v: string) => void; readOnly: boolean; error?: string;
  categoryCode: string; placeholder?: string; refLabel: string;
}) {
  return readOnly ? (
    <span className={`block text-[13px] ${theme.textPrimary}`}>{renderDisplayValue(refLabel)}</span>
  ) : (
    <div>
      <ReferenceSelect categoryCode={categoryCode} label="" value={value} onChange={(v) => onChange?.(v)} placeholder={placeholder} />
      {error && <p className={theme.labelError + " mt-0.5"}>{error}</p>}
    </div>
  );
}

function FieldSet({ configs, form, errors, isEditing, update, ro, textRefs }: {
  configs: FieldDef[]; form: CompanyFormData; errors: Record<string, string>; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; ro: string; textRefs: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {configs.map((f) => {
        const val = form[f.key] as string;
        const err = errors[f.key as string];
        return (
          <div key={f.key} className={f.key === "website" ? "col-span-2" : ""}>
            <label className={`block ${theme.label} mb-0.5`}>{f.label}{f.required ? " *" : ""}</label>
            {f.type === "ref" && f.refCat ? (
              <RefField value={val} onChange={(v) => update(f.key, v)} readOnly={!isEditing} error={err}
                categoryCode={f.refCat} placeholder={f.placeholder} refLabel={textRefs[f.key] || form[f.key.replace(/Id$/, "") as keyof CompanyFormData] as string} />
            ) : (
              <TextField value={val} onChange={(v) => update(f.key, v)} readOnly={!isEditing} error={err}
                placeholder={f.placeholder} ro={ro} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompanyIdentityCard({ form, errors, isEditing, update, ro }: {
  form: CompanyFormData; errors: Record<string, string>; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; ro: string;
}) {
  const textRefs: Record<string, string> = {
    industryTypeId: form.industryType,
    statusId: form.status === "active" ? "Active" : form.status,
  };
  return (
    <CardSection title="Company Identity" icon={
      <svg className={`h-3 w-3 ${theme.iconAccent}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l-9 5h18z"/></svg>
    }>
      <FieldSet configs={FIELD_CONFIGS.identity} form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} textRefs={textRefs} />
    </CardSection>
  );
}

function BusinessProfileCard({ form, isEditing, update, roTA, descExpanded, setDescExpanded }: {
  form: CompanyFormData; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; roTA: string;
  descExpanded: boolean; setDescExpanded: (v: boolean) => void;
}) {
  return (
    <SubCard title="Business Profile" icon={<Info className={`h-3.5 w-3.5 ${theme.listMeta}`} />}>
      <div className="space-y-2">
        <div>
          <span className={`block ${theme.label} mb-0.5`}>Description</span>
          {isEditing ? (
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
              className={`w-full text-[13px] outline-none transition-colors resize-y min-h-[120px] ${roTA}`}
              maxLength={500} placeholder="Brief description of the company, core products, and operational scope." />
          ) : (
            <div>
              <p className={`text-[13px] ${theme.textPrimary} leading-relaxed ${!descExpanded ? "line-clamp-2" : ""}`}>{renderDisplayValue(form.description)}</p>
              {(form.description?.length ?? 0) > 150 && (
                <button type="button" onClick={() => setDescExpanded(!descExpanded)} className={`text-[11px] font-medium ${theme.link} mt-0.5`}>
                  {descExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>
        <div>
          <span className={`block ${theme.label} mb-0.5`}>Product Lines</span>
          {isEditing ? (
            <ReferenceMultiSelect categoryCode="product_line" label="" values={form.productLineIds ?? []}
              onChange={(v) => update("productLineIds", v)} showUnselected={false} />
          ) : (
            <BadgeList categoryCode="product_line" ids={form.productLineIds} />
          )}
        </div>
        <div>
          <span className={`block ${theme.label} mb-0.5`}>Lean Methodology</span>
          {isEditing ? (
            <ReferenceMultiSelect categoryCode="lean_methodology" label="" values={form.leanMethodologyIds ?? []}
              onChange={(v) => update("leanMethodologyIds", v)} showUnselected={false} />
          ) : (
            <BadgeList categoryCode="lean_methodology" ids={form.leanMethodologyIds} />
          )}
        </div>
      </div>
    </SubCard>
  );
}

function ContactAdminCard({ form, errors, isEditing, update, ro }: {
  form: CompanyFormData; errors: Record<string, string>; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; ro: string;
}) {
  return (
    <SubCard title="Contact & Administration" icon={<Phone className={`h-3.5 w-3.5 ${theme.listMeta}`} />}>
      <div className="grid grid-cols-2 gap-1">
        <FieldSet configs={FIELD_CONFIGS.contact} form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} textRefs={{}} />
      </div>
    </SubCard>
  );
}

function HeadquartersCard({ form, errors, isEditing, update, ro, getLabel, filterByMeta, byCategory }: {
  form: CompanyFormData; errors: Record<string, string>; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; ro: string;
  getLabel: (cat: string, id: string) => string;
  filterByMeta: (cat: string, key: string, val: string) => Array<{ id: string; name: string; code: string; isActive: boolean }>;
  byCategory: (cat: string) => Array<{ id: string; code: string; name: string }>;
}) {
  const onCountryChange = (value: string) => {
    update("countryId", value);
    update("country", getLabel("country", value) || value);
    update("stateId", "");
    update("state", "");
    update("cityId", "");
    update("city", "");
  };
  const onStateChange = (value: string) => {
    update("stateId", value);
    update("state", getLabel("state", value) || value);
    update("cityId", "");
    update("city", "");
  };
  const onCityChange = (value: string) => {
    update("cityId", value);
    update("city", getLabel("city", value) || value);
  };

  return (
    <CardSection title="Headquarters / Main Location" icon={<MapPin className={`h-3 w-3 ${theme.iconAccent}`} />}>
      <div className="flex gap-2">
        <div className="w-[65%]">
          <div className="grid grid-cols-2 gap-1">
            <div className="col-span-2">
              <label className={`block ${theme.label} mb-0.5`}>Street Address</label>
              <TextField value={form.address} onChange={(v) => update("address", v)} readOnly={!isEditing} ro={ro} />
            </div>
            <div>
              <label className={`block ${theme.label} mb-0.5`}>Zip / Postal Code</label>
              <TextField value={form.zipcode} onChange={(v) => update("zipcode", v)} readOnly={!isEditing} error={errors.zipcode} ro={ro} placeholder="e.g. 90670" />
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-1">
              <div>
                <label className={`block ${theme.label} mb-0.5`}>City</label>
                {isEditing ? (
                  <ReferenceSelect categoryCode="city" label=""
                    value={form.cityId ?? ""} onChange={onCityChange} placeholder="Select city..."
                    filteredValues={form.stateId ? filterByMeta("city", "state_code", byCategory("state").find((s) => s.id === form.stateId)?.code ?? "") : []} />
                ) : (
                  <span className={`block text-[13px] ${theme.textPrimary}`}>{form.city || "\u2014"}</span>
                )}
              </div>
              <div>
                <label className={`block ${theme.label} mb-0.5`}>State</label>
                {isEditing ? (
                  <ReferenceSelect categoryCode="state" label=""
                    value={form.stateId ?? ""} onChange={onStateChange} placeholder="Select state..."
                    filteredValues={form.countryId ? filterByMeta("state", "country_code", byCategory("country").find((c) => c.id === form.countryId)?.code ?? "") : []} />
                ) : (
                  <span className={`block text-[13px] ${theme.textPrimary}`}>{form.state || "\u2014"}</span>
                )}
              </div>
              <div>
                <label className={`block ${theme.label} mb-0.5`}>Country *</label>
                {isEditing ? (
                  <ReferenceSelect categoryCode="country" label=""
                    value={form.countryId ?? ""} onChange={onCountryChange} placeholder="Select country..." />
                ) : (
                  <span className={`block text-[13px] ${theme.textPrimary}`}>{form.country || "\u2014"}</span>
                )}
                {errors.countryId && <p className={theme.labelError + " mt-0.5"}>{errors.countryId}</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="w-[35%]">
          <div className={`rounded-lg overflow-hidden border h-full min-h-[100px] ${theme.sectionDivider}`}>
            {form.address && form.city ? (
              <iframe title="Company location" className="w-full h-full" loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.address}, ${form.zipcode || ""}, ${form.city}, ${form.state}, ${form.country}`)}&output=embed&z=14`} />
            ) : form.city ? (
              <iframe title="Company location" className="w-full h-full" loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.city}, ${form.state || ""}, ${form.country || ""}`)}&output=embed&z=14`} />
            ) : (
              <div className={theme.mapPlaceholder + " text-xs"}>No address provided</div>
            )}
          </div>
        </div>
      </div>
    </CardSection>
  );
}

function GlobalOpsCard({ form, errors, isEditing, update, ro }: {
  form: CompanyFormData; errors: Record<string, string>; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; ro: string;
}) {
  const textRefs: Record<string, string> = {
    defaultTimezoneId: form.defaultTimezone,
    defaultLanguageId: form.defaultLanguage,
    defaultCalendarId: form.defaultCalendar,
    defaultShiftModelId: form.defaultShiftModel,
    weekStartDayId: form.weekStartDay,
  };
  return (
    <SubCard title="Global Operations" icon={<Globe className={`h-3.5 w-3.5 ${theme.listMeta}`} />}>
      <div className="grid grid-cols-2 gap-1">
        <FieldSet configs={FIELD_CONFIGS.operations} form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} textRefs={textRefs} />
      </div>
    </SubCard>
  );
}

function ProductionSummaryCard({ plantsLoading, counts }: { plantsLoading: boolean; counts: ReturnType<typeof useCounts> }) {
  return (
    <CardSection title="Production Structure Summary" icon={<Factory className={`h-3 w-3 ${theme.iconAccent}`} />}>
      {plantsLoading ? (
        <div className={`text-xs ${theme.textMuted} py-1`}>Loading counts...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1 mb-1.5">
            <Stat icon={<Factory className="h-3 w-3" />} label="Plants" value={counts.plants} color={theme.iconBoxBlue} to="/system/production-structure/components" />
            <Stat icon={<TrendingUpDown className="h-3 w-3" />} label="Lines" value={counts.lines} color={theme.iconBoxAmber} />
            <Stat icon={<Layers className="h-3 w-3" />} label="Depts" value={counts.depts} color={theme.iconBoxViolet} />
            <Stat icon={<Component className="h-3 w-3" />} label="Groups" value={counts.groups} color={theme.iconBoxTeal} />
            <Stat icon={<Dumbbell className="h-3 w-3" />} label="Resources" value={counts.resources} color={theme.statIcon} />
            <Stat icon={<Calendar className="h-3 w-3" />} label="Schedules" value={0} color={theme.iconBoxSky} />
          </div>
          <div className={`flex items-center gap-2 text-[9px] ${theme.textMuted}`}>
            <span className="flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-emerald-500" /> {counts.active} active</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" /> {counts.inactive} inactive</span>
          </div>
        </>
      )}
    </CardSection>
  );
}

function RelatedPlantsCard({ plants, plantsLoading, onSelectPlant }: {
  plants: Plant[]; plantsLoading: boolean; onSelectPlant?: (id: string) => void;
}) {
  return (
    <CardSection title="Related Plants" icon={<Factory className={`h-3 w-3 ${theme.iconAccent}`} />}>
      {plantsLoading ? (
        <div className={`text-xs ${theme.textMuted} py-1`}>Loading plants...</div>
      ) : plants.length === 0 ? (
        <div className={`text-xs ${theme.textMuted} py-1 text-center`}>No plants configured</div>
      ) : (
        <div className="w-full text-xs">
          <div className={`flex items-center gap-1 ${theme.tableHeader}`}>
            <span className="flex-[2] min-w-0">Name</span>
            <span className="w-14 shrink-0 text-center hidden sm:block">Code</span>
            <span className="w-28 shrink-0 text-center hidden sm:block">Location</span>
            <span className="w-12 shrink-0 text-center">Status</span>
            <span className="w-10 shrink-0 text-center">Lns</span>
            <span className="w-6 shrink-0" />
          </div>
          {plants.slice(0, 3).map((plant: Plant) => (
            <div key={plant.id} className={`flex items-center gap-1 ${theme.tableRow} cursor-pointer last:border-0`} onClick={() => onSelectPlant?.(plant.id)}>
              <span className="flex-[2] min-w-0 truncate font-semibold text-slate-900 dark:text-slate-100" title={plant.name}>{plant.name}</span>
              <span className={`w-14 shrink-0 text-center font-mono hidden sm:block ${theme.textSecondary}`}>{plant.code || "-"}</span>
              <span className={`w-28 shrink-0 text-left truncate hidden sm:block ${theme.listMeta}`} title={`${plant.city ? `${plant.city}${plant.state ? `, ${plant.state}` : ""}${plant.country ? `, ${plant.country}` : ""}` : plant.building || ""}`}>{plant.city && plant.state ? `${plant.city}, ${plant.state}${plant.country ? `, ${plant.country}` : ""}` : plant.building || plant.city || "-"}</span>
              <span className="w-12 shrink-0 text-center">
                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${plant.status === "active" ? theme.statusActive : theme.statusInactive}`} title={plant.status}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${plant.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                </span>
              </span>
              <span className={`w-10 shrink-0 text-center ${theme.textSecondary}`}>{plant.lineCount ?? 0}</span>
              <span className={`w-6 shrink-0 flex items-center justify-center transition-colors ${theme.textInverse}`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </span>
            </div>
          ))}
        </div>
      )}
    </CardSection>
  );
}

// ── Hook for counts ──

function useCounts(plants: Plant[]) {
  return useMemo(() => {
    if (!plants.length) return { plants: 0, lines: 0, depts: 0, groups: 0, resources: 0, active: 0, inactive: 0 };
    let lines = 0, depts = 0, groups = 0, resources = 0, active = 0, inactive = 0;
    plants.forEach((p: any) => {
      if (p.status === "active") active++; else inactive++;
      lines += p.lineCount ?? 0;
      depts += p.departmentCount ?? 0;
      groups += p.groupCount ?? 0;
      resources += p.resourceCount ?? 0;
    });
    return { plants: plants.length, lines, depts, groups, resources, active, inactive };
  }, [plants]);
}

// ── Main component ──

export function CompanyDetailView({ onSelectPlant }: { onSelectPlant?: (plantId: string) => void }) {
  const { company, loading, saving, refetch, saveCompany, deleteCompany } = useCompany();
  const { plants, loading: plantsLoading } = usePlants();
  const { findIdByText, getLabel, filterByMeta, byCategory } = useReferenceTables();

  const [mode, setMode] = useState<FormMode>("view");
  const [form, setForm] = useState<CompanyFormData>(EMPTY_COMPANY_FORM);
  const [initialForm, setInitialForm] = useState<CompanyFormData>(EMPTY_COMPANY_FORM);
  const [descExpanded, setDescExpanded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const dirty = useMemo(() => isDirty(form, initialForm), [form, initialForm]);
  const [loadKey, setLoadKey] = useState(0);
  const counts = useCounts(plants);

  useEffect(() => {
    if (!company || mode === "create") return;
    const f = mapCompanyDbToForm(company, findIdByText);
    setForm(f);
    setInitialForm(f);
  }, [company, loadKey]);

  const isEditing = mode === "edit" || mode === "create";
  const hasCompany = !!company || mode === "create";

  const ro = mode === "view"
    ? `read-only border-0 bg-transparent px-0 ${theme.textPrimary} cursor-default`
    : `${theme.selectButton} ${theme.textPrimary} ${theme.focusRing}`;
  const roTA = mode === "view"
    ? `read-only border-0 bg-transparent px-0 ${theme.textPrimary} cursor-default resize-none`
    : `border border-slate-200 dark:border-slate-700 p-2 rounded-lg bg-white dark:bg-slate-900 ${theme.textPrimary} ${theme.focusRing} resize-none`;

  const update = useCallback((key: keyof CompanyFormData, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const handleRefresh = useCallback(async () => {
    setMode("view"); setErrors({}); setToast(null);
    const { data } = await refetch({ fetchPolicy: "network-only" });
    if (data?.company) {
      const f = mapCompanyDbToForm(data.company, findIdByText);
      setForm(f); setInitialForm(f);
    }
    setLoadKey((k) => k + 1);
  }, [refetch, findIdByText]);

  const handleNew = useCallback(() => {
    setMode("create"); setForm(EMPTY_COMPANY_FORM); setInitialForm(EMPTY_COMPANY_FORM); setErrors({}); setToast(null);
  }, []);

  const handleEdit = useCallback(() => {
    setMode("edit"); setLoadKey((k) => k + 1); setErrors({}); setToast(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (mode === "create") {
      setMode("view");
      if (company) {
        const f = mapCompanyDbToForm(company, findIdByText);
        setForm(f); setInitialForm(f);
      }
      return;
    }
    setForm(initialForm); setMode("view"); setErrors({}); setToast(null);
  }, [mode, initialForm, company, findIdByText]);

  const handleSave = useCallback(async () => {
    const validation = validateCompanyForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setToast({ message: "Please fix the validation errors", type: "error" });
      return;
    }
    setToast(null);
    const result = await saveCompany(form, mode === "create");
    if (result.ok) {
      setToast({ message: mode === "create" ? "Company created successfully" : "Company saved successfully", type: "success" });
      setMode("view");
      if (result.company) {
        const f = mapCompanyDbToForm(result.company, findIdByText);
        setForm(f); setInitialForm(f);
      }
    } else if (result.errors) {
      setErrors(result.errors);
      const msgs = Object.values(result.errors).filter(Boolean).join("; ");
      setToast({ message: msgs || "Failed to save company", type: "error" });
    }
  }, [form, mode, saveCompany, findIdByText]);

  const handleDelete = useCallback(async () => {
    setDeleteConfirmOpen(false);
    const result = await deleteCompany();
    if (result.ok) {
      setToast({ message: "Company deleted", type: "success" });
      setMode("view"); setForm(EMPTY_COMPANY_FORM); setInitialForm(EMPTY_COMPANY_FORM);
      await refetch({ fetchPolicy: "network-only" });
    } else {
      setToast({ message: result.message || "Failed to delete company", type: "error" });
    }
  }, [deleteCompany, refetch]);

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <div className={`flex items-center h-10 px-3 shrink-0 ${theme.header}`}>
        <CompanyOverview company={hasCompany ? { name: form.name || company?.name || "", code: form.code || company?.code || "", defaultTimezone: form.defaultTimezone || company?.defaultTimezone || "", phone: form.phone || company?.phone || "", email: form.email || company?.email || "", address: form.address || company?.address || "" } : null} />
      </div>

      <div className={`flex shrink-0 items-center gap-1 px-3 font-['Segoe_UI',system-ui,sans-serif] ${theme.toolbarBg} border-b ${theme.sectionDivider}`} style={{ height: 40 }}>
        <button type="button" title="Refresh" onClick={handleRefresh} className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium ${theme.buttonSecondary}`}>
          <RefreshCw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Refresh</span>
        </button>
        <span className={`mx-1 h-4 ${theme.dividerVertical}`} />
        <button type="button" title="New company" onClick={handleNew} disabled={!!company && mode !== "create"}
          className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium transition-colors ${!company ? theme.buttonSecondary : `${theme.textDisabled} cursor-not-allowed`}`}>
          <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">New</span>
        </button>
        {mode === "view" && company && (
          <button type="button" title="Edit" onClick={handleEdit} className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium ${theme.buttonSecondary}`}>
            <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Edit</span>
          </button>
        )}
        {isEditing ? (
          <>
            <button type="button" title="Save" disabled={saving || !dirty} onClick={handleSave}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium transition-colors ${saving || !dirty ? `${theme.textDisabled} cursor-not-allowed` : theme.buttonSuccessSolid}`}>
              <Check className="h-3.5 w-3.5" /><span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
            </button>
            <button type="button" title="Cancel" onClick={handleCancel} className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium ${theme.buttonSecondary}`}>
              <X className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cancel</span>
            </button>
          </>
        ) : null}
        <span className={`mx-1 h-4 ${theme.dividerVertical}`} />
        <button type="button" title={plants.length > 0 ? "Cannot delete: company has plants" : "Delete company"}
          disabled={plants.length > 0 || !company} onClick={() => setDeleteConfirmOpen(true)}
          className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium transition-colors ${plants.length > 0 || !company ? `${theme.textDisabled} cursor-not-allowed` : theme.buttonDanger}`}>
          <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Delete</span>
        </button>
        <span className={`mx-1 h-4 ${theme.dividerVertical}`} />
        <button type="button" title="More" disabled className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium ${theme.textDisabled} cursor-not-allowed`}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          <span className="hidden sm:inline">More</span>
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
        {loading && !hasCompany ? (
          <div className="flex items-center justify-center h-full"><div className={`text-xs ${theme.textMuted}`}>Loading company data...</div></div>
        ) : !hasCompany ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Info className={`h-8 w-8 mx-auto mb-2 ${theme.listMeta}`} />
              <p className={`text-xs ${theme.textMuted}`}>No company data</p>
              <button type="button" onClick={handleNew} className={`mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${theme.buttonSuccessSolid}`}>
                <Plus className="h-3.5 w-3.5" /> Create Company
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0 min-h-0">
            {toast && (
              <div className={`col-span-2 px-3 py-1.5 text-xs font-medium border-b ${toast.type === "success" ? theme.toastSuccess : theme.toastError}`}>
                {toast.message}
                <button type="button" onClick={() => setToast(null)} className="ml-2 inline font-bold">&times;</button>
              </div>
            )}

            {/* ── Left column ── */}
            <div className={`border-r p-2 flex flex-col gap-3 h-full ${theme.sectionDivider}`}>
              <CompanyIdentityCard form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} />
              <BusinessProfileCard form={form} isEditing={isEditing} update={update} roTA={roTA} descExpanded={descExpanded} setDescExpanded={setDescExpanded} />
              <ContactAdminCard form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} />
            </div>

            {/* ── Right column ── */}
            <div className="p-2 flex flex-col gap-3">
              <HeadquartersCard form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} getLabel={getLabel} filterByMeta={filterByMeta} byCategory={byCategory} />
              <GlobalOpsCard form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} />
              <ProductionSummaryCard plantsLoading={plantsLoading} counts={counts} />
              <RelatedPlantsCard plants={plants} plantsLoading={plantsLoading} onSelectPlant={onSelectPlant} />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}
        title="Delete company?" message="Are you sure you want to delete this company? This action cannot be undone."
        onConfirm={handleDelete} />
    </div>
  );
}
