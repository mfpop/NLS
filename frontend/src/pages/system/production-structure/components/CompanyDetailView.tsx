import { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { Pencil, Check, X, Globe, Phone, MapPin, Info, Factory, TrendingUpDown, Layers, Component, Dumbbell, ChevronDown, HelpCircle } from "lucide-react";
import { ReferenceSelect, ReferenceMultiSelect } from "./ReferenceSelect";
import { ConfirmDialog } from "../shared";
import { useCompany, mapCompanyDbToForm, EMPTY_COMPANY_FORM, validateCompanyForm, isDirty, renderDisplayValue } from "@/hooks/useCompany";
import type { CompanyFormData } from "@/hooks/useCompany";
import { usePlants } from "@/hooks/usePlants";
import type { Plant } from "@/types/plant";
import { useReferenceTables } from "@/hooks/useReferenceTables";
import { theme } from "@/styles/themeTokens";

type FormMode = "view" | "edit";

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

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

// ── Field config ──

interface FieldDef {
  key: keyof CompanyFormData;
  label: string;
  type: "text" | "ref" | "date" | "tel" | "email" | "url";
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
    { key: "operatingSince", label: "Operating Since", type: "date", placeholder: "YYYY-MM-DD" },
  ],
  contact: [
    { key: "phone", label: "Main Phone", type: "tel", placeholder: "+1 (555) 000-0000" },
    { key: "email", label: "Main Email", type: "email", placeholder: "info@company.com" },
    { key: "website", label: "Website", type: "url", placeholder: "https://company.com" },
    { key: "adminName", label: "Admin Contact", type: "text", placeholder: "e.g. Jane Doe" },
    { key: "adminRole", label: "Contact Role", type: "ref", refCat: "role", placeholder: "Select role..." },
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

function CardSection({ title, icon, children, cardClass = theme.cardSection, className = "", bodyClassName = "", collapsible = false, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; cardClass?: string; className?: string; collapsible?: boolean; defaultOpen?: boolean;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-lg p-2.5 ${cardClass} ${className}`}>
      <button type="button" onClick={collapsible ? () => setOpen(!open) : undefined}
        aria-expanded={collapsible ? open : undefined}
        aria-controls={collapsible ? `section-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
        className={`flex h-7 items-center gap-2 mb-2 w-full text-left ${collapsible ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>{icon}</span>
        <h3 className={`text-sm font-bold ${theme.textPrimary} flex-1`}>{title}</h3>
        {collapsible && (
          <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-slate-500 stroke-current transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {(!collapsible || open) && <div className={bodyClassName}>{children}</div>}
    </div>
  );
}

function SubCard({ title, icon, children, className = "", bodyClassName = "", collapsible = false, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; collapsible?: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`flex flex-col rounded-lg p-2.5 h-full ${theme.subCard} ${className}`}>
      <button type="button" onClick={collapsible ? () => setOpen(!open) : undefined}
        aria-expanded={collapsible ? open : undefined}
        aria-controls={collapsible ? `sub-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
        className={`flex h-7 items-center gap-2 mb-2 w-full text-left ${collapsible ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
        <span className={`flex h-5 w-5 items-center justify-center rounded ${theme.iconBoxEmerald}`}>{icon}</span>
        <h4 className={`text-xs font-bold ${theme.textSecondary} uppercase tracking-wide flex-1`}>{title}</h4>
        {collapsible && (
          <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-slate-500 stroke-current transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {(!collapsible || open) && <div className={bodyClassName}>{children}</div>}
    </div>
  );
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 1) return `+${digits}`;
  if (digits.length <= 4) return `+${digits[0]} (${digits.slice(1)}`;
  if (digits.length <= 7) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  if (digits.length <= 11) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

function TextField({ value, onChange, readOnly, error, placeholder, ro, inputType, helper }: {
  value: string; onChange?: (v: string) => void; readOnly: boolean; error?: string; placeholder?: string; ro: string; inputType?: string; helper?: string;
}) {
  const inputMode = inputType === "tel" ? "tel" : inputType === "email" ? "email" : inputType === "url" ? "url" : inputType === "date" ? undefined : "text";
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onChange?.(inputType === "tel" ? formatPhone(raw) : raw);
  };
  return (
    <div>
      <input type={inputType === "date" ? "date" : inputType === "tel" ? "tel" : inputType === "email" ? "email" : inputType === "url" ? "url" : "text"}
        value={inputType === "date" ? (value || "") : value} readOnly={readOnly}
        onChange={handleChange}
        inputMode={inputMode}
        className={`w-full text-[13px] outline-none transition-colors ${error ? theme.fieldErrorBorder : ""} ${ro}`} placeholder={placeholder} />
      {helper && !readOnly && !error && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1"><HelpCircle className="h-3 w-3 shrink-0" />{helper}</p>}
      {error && <p className={theme.labelError + " mt-0.5"}>{error}</p>}
    </div>
  );
}

const FALLBACK_ROLES = [
  { value: "owner_founder", label: "Owner / Founder" },
  { value: "ceo", label: "CEO / President" },
  { value: "vp_operations", label: "VP of Operations" },
  { value: "plant_manager", label: "Plant Manager" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "production_manager", label: "Production Manager" },
  { value: "lean_manager", label: "Lean / Continuous Improvement Manager" },
  { value: "quality_manager", label: "Quality Manager" },
  { value: "supply_chain_manager", label: "Supply Chain Manager" },
  { value: "maintenance_manager", label: "Maintenance Manager" },
  { value: "shift_supervisor", label: "Shift Supervisor" },
  { value: "production_supervisor", label: "Production Supervisor" },
  { value: "team_lead", label: "Team Lead / Cell Lead" },
  { value: "process_engineer", label: "Process / Manufacturing Engineer" },
  { value: "industrial_engineer", label: "Industrial Engineer" },
  { value: "quality_technician", label: "Quality Technician" },
  { value: "safety_officer", label: "Safety / EHS Officer" },
  { value: "scheduler", label: "Production Scheduler" },
  { value: "inventory_specialist", label: "Inventory / Materials Specialist" },
  { value: "operator", label: "Machine Operator / Assembler" },
];

function RefField({ value, onChange, readOnly, error, categoryCode, placeholder, refLabel }: {
  value: string; onChange?: (v: string) => void; readOnly: boolean; error?: string;
  categoryCode: string; placeholder?: string; refLabel: string;
}) {
  const isRole = categoryCode === "role";
  const { byCategory } = useReferenceTables();
  const refValues = byCategory(categoryCode);
  const options = refValues.length > 0 ? refValues.map((v: any) => ({ value: v.id, label: v.name })) : (isRole ? FALLBACK_ROLES : []);

  if (readOnly) {
    const label = options.find((o: any) => o.value === value)?.label || refLabel || value;
    return <span className={`block text-[13px] ${theme.textPrimary}`}>{renderDisplayValue(label)}</span>;
  }

  return (
    <div>
      {options.length > 0 ? (
        <select value={value || ""} onChange={(e) => onChange?.(e.target.value)}
          className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-xs outline-none text-slate-700 truncate transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-500">
          <option value="">{placeholder || "Select..."}</option>
          {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <ReferenceSelect categoryCode={categoryCode} label="" value={value} onChange={(v) => onChange?.(v)} placeholder={placeholder} />
      )}
      {error && <p className={theme.labelError + " mt-0.5"}>{error}</p>}
    </div>
  );
}

function FieldSet({ configs, form, errors, isEditing, update, ro, textRefs, editMode }: {
  configs: FieldDef[]; form: CompanyFormData; errors: Record<string, string>; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; ro: string; textRefs: Record<string, string>; editMode?: boolean;
}) {
  const labelClass = editMode
    ? "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5"
    : `block ${theme.label} mb-0.5`;

  const helpers: Record<string, string> = {
    operatingSince: "Format: YYYY-MM-DD (e.g. 1995-01-15)",
    zipcode: "US: 90670, US+4: 90670-2221, Canada: A1A 1A1",
    phone: "Enter phone with country code (e.g. +1 555 000 0000)",
  };

  return (
    <div className={`grid grid-cols-2 gap-x-2 gap-y-3`}>
      {configs.map((f) => {
        const val = form[f.key] as string;
        const err = errors[f.key as string];
        return (
          <div key={f.key} className={f.key === "website" ? "col-span-2" : ""}>
            <label className={labelClass}>{f.label}{f.required ? " *" : ""}</label>
            {f.type === "ref" && f.refCat ? (
              <RefField value={val} onChange={(v) => update(f.key, v)} readOnly={!isEditing} error={err}
                categoryCode={f.refCat} placeholder={f.placeholder} refLabel={textRefs[f.key] || form[f.key.replace(/Id$/, "") as keyof CompanyFormData] as string} />
            ) : (
              <TextField value={val} onChange={(v) => update(f.key, v)} readOnly={!isEditing} error={err}
                placeholder={f.placeholder} ro={ro} inputType={f.type} helper={isEditing ? helpers[f.key] : undefined} />
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
      <FieldSet configs={FIELD_CONFIGS.identity} form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} textRefs={textRefs} editMode={isEditing} />
    </CardSection>
  );
}

function BusinessProfileCard({ form, isEditing, update, roTA, className = "" }: {
  form: CompanyFormData; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; roTA: string;
  className?: string;
}) {
  const descRef = useRef<HTMLParagraphElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);

  useEffect(() => {
    const node = descRef.current;
    if (!node || isEditing) {
      setDescOverflows(false);
      return;
    }
    setDescOverflows(node.scrollHeight > node.clientHeight + 1);
  }, [form.description, isEditing]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node || !isEditing) return;
    node.style.height = "100px";
    const nextHeight = Math.min(Math.max(node.scrollHeight, 100), 150);
    node.style.height = `${nextHeight}px`;
    node.style.overflowY = node.scrollHeight > 150 ? "auto" : "hidden";
  }, [form.description, isEditing]);

  return (
    <SubCard title="Business Profile" icon={<Info className="h-3.5 w-3.5" />} collapsible={isEditing} className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <span className={`block text-[11px] font-semibold ${theme.textSecondary} mb-1 shrink-0`}>Description</span>
          {isEditing ? (
            <div className="flex flex-col">
              <textarea ref={textareaRef} value={form.description} onChange={(e) => update("description", e.target.value)}
                className={`min-h-[100px] max-h-[150px] w-full text-[13px] outline-none transition-colors resize-none ${roTA}`}
                maxLength={500} placeholder="Brief description of the company, core products, and operational scope."
                style={{ overflowY: "hidden" }} />
              {form.description?.length >= 450 && (
                <p className={`text-right text-[11px] mt-0.5 shrink-0 ${(form.description?.length || 0) >= 500 ? "text-red-500" : "text-amber-500"}`}>
                  {form.description?.length || 0} / 500
                </p>
              )}
            </div>
          ) : (
            <div>
              <p ref={descRef} className={`min-h-[100px] max-h-[120px] overflow-hidden text-[13px] ${theme.textPrimary} leading-relaxed whitespace-pre-wrap ${descExpanded ? "max-h-none" : ""}`}>{renderDisplayValue(form.description)}</p>
              {descOverflows && (
                <button type="button" onClick={() => setDescExpanded((v) => !v)} className={`mt-1 text-[11px] font-medium ${theme.link}`}>
                  {descExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div>
            <span className={`block text-[11px] font-semibold ${theme.textSecondary} mb-1`}>Product Lines</span>
            {isEditing ? (
              <ReferenceMultiSelect categoryCode="product_line" label="" values={form.productLineIds ?? []}
                onChange={(v) => update("productLineIds", v)} showUnselected={false} compact />
            ) : (
              <BadgeList categoryCode="product_line" ids={form.productLineIds} />
            )}
          </div>
          <div>
            <span className={`block text-[11px] font-semibold ${theme.textSecondary} mb-1`}>Lean Methodology</span>
            {isEditing ? (
              <ReferenceMultiSelect categoryCode="lean_methodology" label="" values={form.leanMethodologyIds ?? []}
                onChange={(v) => update("leanMethodologyIds", v)} showUnselected={false} compact />
            ) : (
              <BadgeList categoryCode="lean_methodology" ids={form.leanMethodologyIds} />
            )}
          </div>
        </div>
      </div>
    </SubCard>
  );
}

function ContactAdminCard({ form, errors, isEditing, update, ro, className = "" }: {
  form: CompanyFormData; errors: Record<string, string>; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void; ro: string;
  className?: string;
}) {
  const contactFields = FIELD_CONFIGS.contact;
  const textRefs: Record<string, string> = {};
  const helpers: Record<string, string> = {
    phone: "Include country code (e.g. +1 555 000 0000)",
  };
  return (
    <SubCard title="Contact & Administration" icon={<Phone className="h-3.5 w-3.5" />} collapsible={isEditing} className={className}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {contactFields.map((f) => {
          const val = form[f.key] as string;
          const err = errors[f.key as string];
          const labelClass = isEditing
            ? "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5"
            : `block ${theme.label} mb-0.5`;
          return (
            <div key={f.key} className={f.key === "website" ? "col-span-2" : ""}>
              <label className={labelClass}>{f.label}{f.required ? " *" : ""}</label>
              {f.type === "ref" && f.refCat ? (
                <RefField value={val} onChange={(v) => update(f.key, v)} readOnly={!isEditing} error={err}
                  categoryCode={f.refCat} placeholder={f.placeholder} refLabel={textRefs[f.key] || form[f.key.replace(/Id$/, "") as keyof CompanyFormData] as string} />
              ) : (
                <TextField value={val} onChange={(v) => update(f.key, v)} readOnly={!isEditing} error={err}
                  placeholder={f.placeholder} ro={ro} inputType={f.type} helper={isEditing ? helpers[f.key] : undefined} />
              )}
            </div>
          );
        })}
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
  const [hqOpen, setHqOpen] = useState(true);
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

  const resolvedCountry = form.country || getLabel("country", form.countryId) || "";
  const lookupQuery = useMemo(() => {
    if (form.address && form.city) {
      return `${form.address}, ${form.zipcode || ""}, ${form.city}, ${form.state || ""}, ${resolvedCountry}`;
    }
    if (form.city) {
      return `${form.city}, ${form.state || ""}, ${resolvedCountry}`;
    }
    return "";
  }, [form.address, form.zipcode, form.city, form.state, resolvedCountry]);

  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isResolvingCoords, setIsResolvingCoords] = useState(false);

  useEffect(() => {
    if (!lookupQuery) {
      setResolvedCoords(null);
      setIsResolvingCoords(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setIsResolvingCoords(true);

    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(lookupQuery)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: Array<{ lat?: string; lon?: string }>) => {
        if (cancelled) return;
        const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        const geoLat = parseCoordinate(first?.lat);
        const geoLon = parseCoordinate(first?.lon);
        if (geoLat !== null && geoLon !== null) {
          setResolvedCoords({ lat: geoLat, lon: geoLon });
        } else {
          setResolvedCoords(null);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedCoords(null);
      })
      .finally(() => {
        if (!cancelled) setIsResolvingCoords(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lookupQuery]);

  return (
    <div className={`rounded-lg overflow-hidden ${theme.cardSection} p-0`}>
      <div className="grid grid-cols-[65fr_35fr]">
        <div className="flex flex-col">
          <button type="button" onClick={isEditing ? () => setHqOpen(!hqOpen) : undefined}
            aria-expanded={isEditing ? hqOpen : undefined}
            aria-controls={isEditing ? "section-headquarters" : undefined}
            className={`flex items-center gap-2 p-3 w-full text-left ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
              <MapPin className={`h-3.5 w-3.5 ${theme.iconAccent}`} />
            </span>
            <h3 className={`text-sm font-bold ${theme.textPrimary} flex-1`}>Headquarters / Main Location</h3>
            {isEditing && (
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-500 stroke-current transition-transform duration-200 ${hqOpen ? 'rotate-180' : ''}`} />
            )}
          </button>
          {(!isEditing || hqOpen) && (
          <div className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
              <div className="col-span-2">
                <label className={`block ${isEditing ? 'text-[11px] font-semibold text-slate-500 dark:text-slate-400' : theme.label} mb-0.5`}>Street Address</label>
                <TextField value={form.address} onChange={(v) => update("address", v)} readOnly={!isEditing} ro={ro} />
              </div>
              <div className="col-span-1">
                <label className={`block ${isEditing ? 'text-[11px] font-semibold text-slate-500 dark:text-slate-400' : theme.label} mb-0.5`}>Zip / Postal Code</label>
                <TextField value={form.zipcode} onChange={(v) => update("zipcode", v)} readOnly={!isEditing} error={errors.zipcode} ro={ro} placeholder="90670 / 90670-2221 / A1A 1A1" inputType="text" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-x-2 gap-y-2 mt-2">
              <div className="min-w-0">
                <label className={`block ${isEditing ? 'text-[11px] font-semibold text-slate-500 dark:text-slate-400' : theme.label} mb-0.5`}>City</label>
                {isEditing ? (
                  <ReferenceSelect categoryCode="city" label=""
                    value={form.cityId ?? ""} onChange={onCityChange} placeholder="Select city..."
                    filteredValues={form.stateId ? filterByMeta("city", "state_code", byCategory("state").find((s) => s.id === form.stateId)?.code ?? "") : []} />
                ) : (
                  <span className={`block text-[13px] ${theme.textPrimary} truncate`}>{form.city || "\u2014"}</span>
                )}
              </div>
              <div className="min-w-0">
                <label className={`block ${isEditing ? 'text-[11px] font-semibold text-slate-500 dark:text-slate-400' : theme.label} mb-0.5`}>State</label>
                {isEditing ? (
                  <ReferenceSelect categoryCode="state" label=""
                    value={form.stateId ?? ""} onChange={onStateChange} placeholder="Select state..."
                    filteredValues={form.countryId ? filterByMeta("state", "country_code", byCategory("country").find((c) => c.id === form.countryId)?.code ?? "") : []} />
                ) : (
                  <span className={`block text-[13px] ${theme.textPrimary} truncate`}>{form.state || "\u2014"}</span>
                )}
              </div>
              <div className="min-w-0">
                <label className={`block ${isEditing ? 'text-[11px] font-semibold text-slate-500 dark:text-slate-400' : theme.label} mb-0.5`}>Country *</label>
                {isEditing ? (
                  <ReferenceSelect categoryCode="country" label=""
                    value={form.countryId ?? ""} onChange={onCountryChange} placeholder="Select country..." />
                ) : (
                  <span className={`block text-[13px] ${theme.textPrimary} truncate`}>{form.country || "\u2014"}</span>
                )}
                {errors.countryId && <p className={theme.labelError + " mt-0.5"}>{errors.countryId}</p>}
              </div>
            </div>
          </div>)}
        </div>
        <div className="overflow-hidden border-l border-slate-200 dark:border-slate-700">
            {(() => {
              const lat = resolvedCoords?.lat ?? null;
              const lon = resolvedCoords?.lon ?? null;
              const hasCoordinates = lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

              if (hasCoordinates) {
                const delta = 0.01;
                const left = lon - delta;
                const right = lon + delta;
                const top = lat + delta;
                const bottom = lat - delta;
                const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;

                return (
                  <iframe
                    title="Company location"
                    className="w-full h-full"
                    loading="lazy"
                    src={mapSrc}
                  />
                );
              }

              if (isResolvingCoords) {
                return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 text-slate-400 text-xs">Loading map...</div>;
              }

              const mapQuery = form.address && form.city
                  ? `${form.address}, ${form.city}, ${form.state || ""}, ${form.country || ""}`
                : form.city
                  ? `${form.city}, ${form.state || ""}, ${form.country || ""}`
                  : "";

              if (!mapQuery) {
                return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 text-slate-400 text-xs">No location data</div>;
              }

              return (
                <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-900 p-2 gap-2">
                  <div className="flex items-start gap-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                    <div className="text-[11px] leading-4 text-slate-700 dark:text-slate-300 wrap-break-word">{mapQuery}</div>
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Open map
                  </a>
                </div>
              );
            })()}
          </div>
      </div>
    </div>
  );
}

function GlobalOpsCard({ form, errors, isEditing, update }: {
  form: CompanyFormData; errors: Record<string, string>; isEditing: boolean;
  update: (k: keyof CompanyFormData, v: string | string[]) => void;
}) {
  const textRefs: Record<string, string> = {
    defaultTimezoneId: form.defaultTimezone,
    defaultLanguageId: form.defaultLanguage,
    defaultCalendarId: form.defaultCalendar,
    defaultShiftModelId: form.defaultShiftModel,
    weekStartDayId: form.weekStartDay,
  };
  const rf = (key: string, cat: string, label: string, required?: boolean) => {
    const val = form[key as keyof CompanyFormData] as string;
    const err = errors[key];
    return (
      <div>
        <label className={`block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5`}>{label}{required ? " *" : ""}</label>
        <RefField value={val} onChange={(v) => update(key as any, v)} readOnly={!isEditing} error={err}
          categoryCode={cat} placeholder={`Select ${label.toLowerCase()}...`} refLabel={textRefs[key] || val} />
      </div>
    );
  };
  return (
    <SubCard title="Global Operations" icon={<Globe className={`h-3.5 w-3.5 ${theme.listMeta}`} />} collapsible={isEditing}>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {rf("defaultCalendarId", "calendar", "Working Calendar", true)}
          {rf("defaultShiftModelId", "shift_model", "Shift Model", true)}
          {rf("weekStartDayId", "week_start_day", "Week Start Day", true)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">{rf("defaultTimezoneId", "timezone", "Default Timezone", true)}</div>
          {rf("defaultLanguageId", "language_locale", "Language / Locale", false)}
        </div>
      </div>
    </SubCard>
  );
}

function ProductionSummaryCard({ plantsLoading, counts }: { plantsLoading: boolean; counts: ReturnType<typeof useCounts> }) {
  const tiles = [
    { icon: <Factory className="h-4 w-4" />, label: "Plants", value: counts.plants, color: theme.iconBoxBlue },
    { icon: <TrendingUpDown className="h-4 w-4" />, label: "Lines", value: counts.lines, color: theme.iconBoxAmber },
    { icon: <Layers className="h-4 w-4" />, label: "Departments", value: counts.depts, color: theme.iconBoxViolet },
    { icon: <Component className="h-4 w-4" />, label: "Resource Groups", value: counts.groups, color: theme.iconBoxTeal },
    { icon: <Dumbbell className="h-4 w-4" />, label: "Resources", value: counts.resources, color: theme.statIcon },
  ];
  return (
    <CardSection title="Structure Summary" icon={<Factory className="h-3.5 w-3.5" />}>
      {plantsLoading ? (
        <div className={`text-xs ${theme.textMuted} py-2 text-center`}>Loading counts...</div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className={`flex min-h-14 items-center gap-2 rounded-lg p-2 ${theme.statCard}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.color}`}>{t.icon}</span>
              <div className="leading-tight">
                <div className={`text-sm font-bold ${theme.textPrimary}`}>{t.value}</div>
                <div className={`text-[10px] ${theme.textMuted}`}>{t.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardSection>
  );
}

function RelatedPlantsCard({ plants, plantsLoading, onSelectPlant, className = "", readOnly = false }: {
  plants: Plant[]; plantsLoading: boolean; onSelectPlant?: (id: string) => void; className?: string; readOnly?: boolean;
}) {
  if (plantsLoading) {
    return (
      <CardSection title="Related Plants" icon={<Factory className="h-3.5 w-3.5" />} className={className}>
        <div className={`text-xs ${theme.textMuted} py-2 text-center`}>Loading plants...</div>
      </CardSection>
    );
  }
  if (plants.length === 0) {
    return (
      <CardSection title="Related Plants" icon={<Factory className="h-3.5 w-3.5" />} className={className}>
        <div className={`text-xs ${theme.textMuted} py-4 text-center italic`}>
          <Factory className="h-5 w-5 mx-auto mb-1 opacity-40" />
          No plants configured yet
        </div>
      </CardSection>
    );
  }
  return (
    <CardSection title="Related Plants" icon={<Factory className="h-3.5 w-3.5" />} className={`flex min-h-0 flex-col ${className}`} bodyClassName="min-h-0 flex-1">
      <div className="h-full min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
            <tr className={`text-[10px] font-semibold ${theme.textMuted} uppercase tracking-wide border-b ${theme.sectionDivider}`}>
              <th className="py-2 pr-2 font-semibold">Name</th>
              <th className="py-2 px-2 font-semibold w-[64px]">Code</th>
              <th className="py-2 px-2 font-semibold w-[180px] hidden sm:table-cell">Location</th>
              <th className="py-2 px-2 font-semibold w-[64px] text-center">Status</th>
              <th className="py-2 pl-2 font-semibold w-[44px] text-center">Lines</th>
              <th className="py-2 pl-2 w-[28px] text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {plants.map((plant: Plant) => {
              const loc = plant.city && plant.state ? `${plant.city}, ${plant.state}${plant.country ? `, ${plant.country}` : ""}` : plant.building || plant.city || "";
              const statusLabel = plant.status === "active" ? "Active" : "Inactive";
              return (
                <tr key={plant.id} className={`cursor-pointer transition-colors ${theme.tableRow}`} onClick={() => onSelectPlant?.(plant.id)} title={plant.name}>
                  <td className="py-2 pr-2 text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate max-w-0">{plant.name}</td>
                  <td className={`py-2 px-2 text-[11px] font-mono ${theme.textSecondary} truncate`}>{plant.code || "-"}</td>
                  <td className={`py-2 px-2 text-[11px] ${theme.listMeta} truncate hidden sm:table-cell max-w-0`}>{loc || "-"}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-block min-w-14 rounded-full px-2 py-0.5 text-center text-[10px] font-semibold ${plant.status === "active" ? theme.badgeActive : theme.badgeInactive}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className={`py-2 pl-2 text-center text-[11px] ${theme.textSecondary}`}>{plant.lineCount ?? 0}</td>
                  <td className={`py-2 pl-2 text-center ${readOnly ? theme.textDisabled : theme.textInverse}`}>
                    <ChevronDown className="mx-auto h-3 w-3 -rotate-90" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="h-3 shrink-0" />
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

export const CompanyDetailView = forwardRef<{ startEditing: () => void; save: () => Promise<void>; cancel: () => void }, { onSelectPlant?: (plantId: string) => void; simple?: boolean; onEditChange?: (editing: boolean) => void; onEditStateChange?: (state: { dirty: boolean; valid: boolean; saving: boolean }) => void }>(function CompanyDetailView({ onSelectPlant, simple, onEditChange, onEditStateChange }, ref) {
  const { company, loading, saving, refetch, saveCompany } = useCompany();
  const { plants, loading: plantsLoading } = usePlants();
  const { findIdByText, getLabel, filterByMeta, byCategory } = useReferenceTables();

  const [mode, setMode] = useState<FormMode>("view");
  const [form, setForm] = useState<CompanyFormData>(EMPTY_COMPANY_FORM);
  const [initialForm, setInitialForm] = useState<CompanyFormData>(EMPTY_COMPANY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingPlantId, setPendingPlantId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const dirty = useMemo(() => isDirty(form, initialForm), [form, initialForm]);
  const validationErrors = useMemo(() => validateCompanyForm(form), [form]);
  const canSave = dirty && Object.keys(validationErrors).length === 0;
  const [loadKey, setLoadKey] = useState(0);
  const counts = useCounts(plants);

  useEffect(() => {
    if (!company) return;
    const f = mapCompanyDbToForm(company, findIdByText);
    setForm(f);
    setInitialForm(f);
  }, [company, loadKey]);

  const isEditing = mode === "edit";
  const hasCompany = !!company;

  useEffect(() => {
    onEditStateChange?.({ dirty, valid: Object.keys(validationErrors).length === 0, saving });
  }, [dirty, validationErrors, saving, onEditStateChange]);

  const ro = mode === "view"
    ? `read-only border-0 bg-transparent px-0 ${theme.textPrimary} cursor-default`
    : `${theme.selectButton} ${theme.textPrimary} ${theme.focusRing}`;
  const roTA = mode === "view"
    ? `read-only border-0 bg-transparent px-0 ${theme.textPrimary} cursor-default resize-none`
    : `border border-slate-200 dark:border-slate-700 p-2 rounded bg-white dark:bg-slate-900 ${theme.textPrimary} ${theme.focusRing} resize-none`;

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

  const handleEdit = useCallback(() => {
    setMode("edit"); setLoadKey((k) => k + 1); setErrors({}); setToast(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (dirty) {
      setCancelConfirmOpen(true);
      return false;
    }
    setForm(initialForm);
    setMode("view"); setErrors({}); setToast(null);
    return true;
  }, [dirty, initialForm]);

  const confirmCancel = useCallback(() => {
    setCancelConfirmOpen(false);
    setForm(initialForm);
    setMode("view"); setErrors({}); setToast(null);
    onEditChange?.(false);
  }, [initialForm, onEditChange]);

  const handleSelectPlant = useCallback((plantId: string) => {
    if (isEditing && dirty) {
      setPendingPlantId(plantId);
      return;
    }
    onSelectPlant?.(plantId);
  }, [dirty, isEditing, onSelectPlant]);

  const confirmPlantNavigation = useCallback(() => {
    if (!pendingPlantId) return;
    setForm(initialForm);
    setMode("view");
    setErrors({});
    setToast(null);
    onEditChange?.(false);
    onSelectPlant?.(pendingPlantId);
    setPendingPlantId(null);
  }, [initialForm, onEditChange, onSelectPlant, pendingPlantId]);

  const handleSave = useCallback(async () => {
    const validation = validateCompanyForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setToast({ message: "Please fix the validation errors", type: "error" });
      return false;
    }
    setToast(null);
    const result = await saveCompany(form, false);
    if (result.ok) {
      setToast({ message: "Company saved successfully", type: "success" });
      setMode("view");
      if (result.company) {
        const f = mapCompanyDbToForm(result.company, findIdByText);
        setForm(f); setInitialForm(f);
      }
      return true;
    } else if (result.errors) {
      setErrors(result.errors);
      const msgs = Object.values(result.errors).filter(Boolean).join("; ");
      setToast({ message: msgs || "Failed to save company", type: "error" });
    }
    return false;
  }, [form, saveCompany, findIdByText]);

  useImperativeHandle(ref, () => ({
    startEditing: () => { if (company && mode === "view") { setMode("edit"); setForm(mapCompanyDbToForm(company, findIdByText)); setInitialForm(mapCompanyDbToForm(company, findIdByText)); onEditChange?.(true); } },
    save: async () => { if (mode !== "edit") return; const saved = await handleSave(); if (saved) onEditChange?.(false); },
    cancel: () => { if (handleCancel()) onEditChange?.(false); },
    refresh: async () => { await handleRefresh(); },
  }), [company, mode, findIdByText, handleSave, handleCancel, onEditChange, handleRefresh]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!simple && (
        <>
          <div className={`flex items-center h-14 px-4 shrink-0 ${theme.header} border-b ${theme.sectionDivider}`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
                <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </span>
              <div className="min-w-0">
                <h2 className={`text-base font-bold ${theme.textPrimary} truncate`}>{hasCompany ? (form.name || company?.name || "Company") : "Company"}</h2>
                <p className={`text-[11px] ${theme.textMuted} truncate`}>{hasCompany ? `${form.code || company?.code || ""}${form.code ? " \u00B7 " : ""}${form.defaultTimezone || company?.defaultTimezone || ""}` : "Register your manufacturing company"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && company && (
                <button type="button" onClick={handleEdit} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium ${theme.buttonSecondary} border ${theme.sectionDivider}`}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
          </div>

          {isEditing && (
            <div className={`flex shrink-0 items-center gap-3 px-4 ${theme.toolbarBg} border-b ${theme.sectionDivider}`} style={{ height: 40 }}>
              <span className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-semibold ${theme.badgeWarning}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Editing Company
              </span>
              {dirty && (
                <span className={`text-[11px] ${theme.textWarning} flex items-center gap-1`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
                </span>
              )}
              <div className="flex-1" />
              <button type="button" onClick={handleCancel} className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-medium border ${theme.sectionDivider} ${theme.buttonSecondary}`}>
                Cancel
              </button>
              <button type="button" disabled={saving || !canSave} onClick={handleSave}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors shadow-sm ${saving || !canSave ? `${theme.textDisabled} cursor-not-allowed ${theme.chip}` : `${theme.buttonSuccessSolid}`}`}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </>
      )}

      <div className={`flex-1 min-h-0 overflow-hidden ${theme.surfaceBg}`}>
        {loading && !hasCompany ? (
          <div className="flex items-center justify-center h-full"><div className={`text-xs ${theme.textMuted}`}>Loading company data...</div></div>
        ) : !hasCompany ? (
          <div className="flex items-center justify-center h-full">
            <div className="max-w-sm text-center">
              <Info className={`h-8 w-8 mx-auto mb-2 ${theme.listMeta}`} />
              <p className={`text-xs ${theme.textMuted}`}>No company data</p>
              <p className={`mt-1 text-[11px] leading-4 ${theme.textMuted}`}>
                The company record is a singleton master record. It must be provisioned by the setup process before this page can edit it.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-0 grid-cols-[52fr_48fr] gap-3 p-3" style={{ position: "relative" }}>
            {toast && (
              <div role="alert" aria-live="polite" className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-xs font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                <span className="flex items-center gap-1.5">{toast.type === "success" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{toast.message}</span>
                <button type="button" onClick={() => setToast(null)} className="ml-2 inline font-bold leading-none" aria-label="Dismiss">&times;</button>
              </div>
            )}

            {/* ── Left column ── */}
            <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
              <div className="shrink-0">
                <CompanyIdentityCard form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} />
              </div>
              <div className="shrink-0">
                <BusinessProfileCard form={form} isEditing={isEditing} update={update} roTA={roTA} />
              </div>
              <div className="shrink-0">
                <ContactAdminCard form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} />
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
              <div className="shrink-0">
                <HeadquartersCard form={form} errors={errors} isEditing={isEditing} update={update} ro={ro} getLabel={getLabel} filterByMeta={filterByMeta} byCategory={byCategory} />
              </div>
              <div className="shrink-0">
                <GlobalOpsCard form={form} errors={errors} isEditing={isEditing} update={update} />
              </div>
              <div className="shrink-0">
                <ProductionSummaryCard plantsLoading={plantsLoading} counts={counts} />
              </div>
              <div className="min-h-0 flex-1">
                <RelatedPlantsCard plants={plants} plantsLoading={plantsLoading} onSelectPlant={handleSelectPlant} className="h-full min-h-0" readOnly={isEditing} />
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog open={cancelConfirmOpen} onClose={() => setCancelConfirmOpen(false)}
        title="Discard changes?" message="You have unsaved changes. Are you sure you want to discard them?"
        onConfirm={confirmCancel} />
      <ConfirmDialog open={!!pendingPlantId} onClose={() => setPendingPlantId(null)}
        title="Discard changes?" message="You have unsaved company changes. Discard them and open the selected plant?"
        onConfirm={confirmPlantNavigation} />
    </div>
  );
});
