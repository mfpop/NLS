import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { X, ChevronDown, Search, RefreshCw, Plus } from "lucide-react";
import { CONFIG_OPTIONS_QUERY } from "@/graphql/companyQueries";

export type CompanyFormData = {
  name: string; code: string; legalName: string; industryType: string;
  status: string; operatingSince: string;
  manufacturingFocus: string; productLines: string; leanMethodology: string;
  description: string; defaultTimezone: string; defaultLanguage: string;
  defaultCalendar: string; defaultShiftModel: string; weekStartDay: string;
  phone: string; email: string; website: string;
  adminName: string; adminRole: string;
  address: string; city: string; state: string; country: string; zipcode: string;
  statusId: string; industryTypeId: string; defaultTimezoneId: string;
  defaultLanguageId: string; defaultCalendarId: string; defaultShiftModelId: string;
  weekStartDayId: string; manufacturingType: string; defaultUnits: string; productionCalendar: string;
};

function SearchableSelect({ category, formKey, label, form, onChange, options, loading, required, touched, onBlur, id }: {
  category: string;
  formKey: keyof CompanyFormData;
  label: React.ReactNode;
  form: CompanyFormData;
  onChange: (k: string, v: string) => void;
  options: Record<string, Array<{ value: string; label: string }>>;
  loading: boolean;
  required?: boolean;
  touched?: boolean;
  onBlur?: () => void;
  id?: string;
}) {
  const opts = options[category] ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevOpen = useRef(isOpen);
  const selected = opts.find((o) => o.value === form[formKey]);
  const filtered = query ? opts.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : opts;

  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);
  useEffect(() => { setHighlighted(-1); }, [query]);
  useEffect(() => { if (prevOpen.current && !isOpen) onBlur?.(); prevOpen.current = isOpen; }, [isOpen, onBlur]);

  const invalid = required && touched && !form[formKey]?.toString().trim();
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((p) => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const idx = highlighted >= 0 ? highlighted : 0; if (filtered[idx]) { onChange(formKey as string, filtered[idx].value); setIsOpen(false); } }
    else if (e.key === "Escape") { e.preventDefault(); setIsOpen(false); }
  };

  if (loading) return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <div className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] flex items-center gap-1.5 bg-white dark:bg-slate-900">
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400 stroke-current" /> Loading options...
      </div>
    </div>
  );
  if (opts.length === 0) return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <div className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] flex items-center justify-between bg-white dark:bg-slate-900">
        <span className="text-slate-400 italic">No options configured</span>
        <button type="button" onClick={() => window.open("/system/production-structure/references", "_blank")} className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-500 font-medium text-xs"><Plus className="h-3 w-3 stroke-current" /> Add</button>
      </div>
    </div>
  );
  return (
    <div ref={ref} className="relative">
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</label>
      <button id={id} type="button" onClick={() => { setIsOpen(!isOpen); setQuery(""); }}
        className={'w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] flex items-center justify-between gap-1 bg-white dark:bg-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none transition-colors' + (invalid ? ' border-red-300' : '') + (!selected ? ' text-slate-400' : '')}>
        <span className="truncate">{selected ? selected.label : "Select..."}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {selected && <span onClick={(e) => { e.stopPropagation(); onChange(formKey as string, ""); setQuery(""); setIsOpen(true); }} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-3.5 w-3.5 stroke-current" /></span>}
          <ChevronDown className={'h-3.5 w-3.5 text-slate-400 stroke-current transition-transform duration-150' + (isOpen ? ' rotate-180' : '')} />
        </span>
      </button>
      {invalid && <p className="text-[11px] text-red-500 mt-0.5">This field is required</p>}
      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-48 flex flex-col">
          <div className="relative border-b border-slate-100 dark:border-slate-800">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 stroke-current pointer-events-none" />
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleInputKeyDown}
              placeholder="Search..." className="w-full h-8 pl-8 pr-2.5 text-[12px] bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-slate-400 text-center">No results</div>
            ) : filtered.map((o, i) => (
              <button key={o.value} type="button" onClick={() => { onChange(formKey as string, o.value); setIsOpen(false); }} onMouseEnter={() => setHighlighted(i)}
                className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${o.value === form[formKey] ? "bg-sky-50 text-sky-700 font-medium dark:bg-sky-500/10 dark:text-sky-300" : highlighted === i ? "bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}>{o.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({ id, label, value, onChange, onBlur, required, placeholder, invalid }: {
  id?: string; label: string; value: string; onChange: (v: string) => void; onBlur?: () => void;
  required?: boolean; placeholder?: string; invalid?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</label>
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full h-9 rounded-lg border px-3 text-[13px] bg-white dark:bg-slate-900 outline-none transition-colors ${invalid ? "border-red-300" : "border-slate-200 dark:border-slate-700"} focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50`} />
      {invalid && <p className="text-[11px] text-red-500 mt-0.5">Required</p>}
    </div>
  );
}

export function CompanyEditor({ form, onChange, onSave, onClose, saving, compact, touchedFields, setTouched }: {
  form: CompanyFormData;
  onChange: (key: string, value: string) => void;
  onSave?: () => void;
  onClose?: () => void;
  saving?: boolean;
  compact?: boolean;
  touchedFields?: Record<string, boolean>;
  setTouched?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  void onSave; void onClose; void saving; void compact;
  const { data: optsData, loading: optsLoading } = useQuery<{ configOptions: Array<{ category: string; value: string; label: string }> }>(CONFIG_OPTIONS_QUERY);

  const options = useMemo(() => {
    const map: Record<string, Array<{ value: string; label: string }>> = {};
    (optsData?.configOptions ?? []).forEach((o) => { if (!map[o.category]) map[o.category] = []; map[o.category].push({ value: o.value, label: o.label }); });
    return map;
  }, [optsData]);

  const touch = (key: string) => { if (setTouched) setTouched((p) => ({ ...p, [key]: true })); };
  const isInvalid = (key: string, required?: boolean) => required ? (touchedFields?.[key] && !form[key as keyof CompanyFormData]?.toString().trim()) : false;

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="bg-[#F9FAFB] dark:bg-slate-900/60 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 mb-4">Changes here affect all plants, lines, and resources.</p>
        {children}
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <Section title="Identity">
        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
          <TextField id="company-field-name" label="Company Name" value={form.name}
            onChange={(v) => onChange("name", v)} onBlur={() => touch("name")}
            required placeholder="e.g. Lean Manufacturing Demo" invalid={isInvalid("name", true)} />
          <TextField id="company-field-code" label="Company Code" value={form.code}
            onChange={(v) => onChange("code", v)} onBlur={() => touch("code")}
            required placeholder="e.g. LMD" invalid={isInvalid("code", true)} />
          <TextField label="Legal Name" value={form.legalName}
            onChange={(v) => onChange("legalName", v)} placeholder="e.g. Lean Manufacturing Corp." />
          <TextField label="Industry Type" value={form.industryType}
            onChange={(v) => onChange("industryType", v)} placeholder="e.g. Automotive" />
          <SearchableSelect category="status" formKey="statusId"
            label={<span>Status <span className="text-slate-400 font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <TextField label="Operating Since" value={form.operatingSince}
            onChange={(v) => onChange("operatingSince", v)} placeholder="e.g. 1995-01-01" />
        </div>
      </Section>

      <Section title="Business Profile">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <TextField label="Manufacturing Focus" value={form.manufacturingFocus}
            onChange={(v) => onChange("manufacturingFocus", v)} placeholder="Comma-separated, e.g. Lean, TPS, Kaizen" />
          <TextField label="Product Lines" value={form.productLines}
            onChange={(v) => onChange("productLines", v)} placeholder="Comma-separated, e.g. Light Duty, Railift" />
          <TextField label="Lean Methodology" value={form.leanMethodology}
            onChange={(v) => onChange("leanMethodology", v)} placeholder="e.g. Lean, Six Sigma, Kaizen" />
          <TextField label="Manufacturing Type" value={form.manufacturingType}
            onChange={(v) => onChange("manufacturingType", v)} placeholder="e.g. Discrete Manufacturing" />
        </div>
      </Section>

      <Section title="Global Operations">
        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
          <SearchableSelect category="timezone" formKey="defaultTimezone"
            label="Timezone" form={form} onChange={onChange} options={options} loading={optsLoading}
            required touched={touchedFields?.defaultTimezone} onBlur={() => touch("defaultTimezone")} />
          <SearchableSelect category="language" formKey="defaultLanguage"
            label={<span>Language <span className="text-slate-400 font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <SearchableSelect category="calendar" formKey="defaultCalendar"
            label={<span>Calendar <span className="text-slate-400 font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <SearchableSelect category="shift_model" formKey="defaultShiftModel"
            label={<span>Shift Model <span className="text-slate-400 font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <SearchableSelect category="week_start_day" formKey="weekStartDay"
            label={<span>Week Start Day <span className="text-slate-400 font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <TextField label="Default Units" value={form.defaultUnits}
            onChange={(v) => onChange("defaultUnits", v)} placeholder="e.g. Imperial, Metric" />
        </div>
      </Section>

      <Section title="Contact & Administration">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <TextField label="Phone" value={form.phone}
            onChange={(v) => onChange("phone", v)} placeholder="+1 (555) 000-0000" />
          <TextField label="Email" value={form.email}
            onChange={(v) => onChange("email", v)} placeholder="e.g. info@company.com" />
          <TextField label="Website" value={form.website}
            onChange={(v) => onChange("website", v)} placeholder="e.g. https://company.com" />
          <TextField label="Admin Name" value={form.adminName}
            onChange={(v) => onChange("adminName", v)} placeholder="e.g. Jane Doe" />
          <TextField label="Admin Role" value={form.adminRole}
            onChange={(v) => onChange("adminRole", v)} placeholder="e.g. Operations Manager" />
        </div>
      </Section>

      <Section title="Location">
        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
          <div className="col-span-3">
            <TextField label="Address" value={form.address}
              onChange={(v) => onChange("address", v)} placeholder="e.g. 123 Industrial Blvd, Suite 100" />
          </div>
          <TextField label="City" value={form.city}
            onChange={(v) => onChange("city", v)} placeholder="e.g. Santa Fe Springs" />
          <TextField label="State" value={form.state}
            onChange={(v) => onChange("state", v)} placeholder="e.g. CA" />
          <SearchableSelect category="country" formKey="country"
            label={<span>Country <span className="text-slate-400 font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <TextField label="Zip Code" value={form.zipcode}
            onChange={(v) => onChange("zipcode", v)} placeholder="e.g. 90670" />
        </div>
      </Section>

      <Section title="Description">
        <div>
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-[13px] bg-white dark:bg-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 transition-colors resize-y min-h-[96px] max-h-[240px]"
            maxLength={500} placeholder="Brief description of the company, core products, and operational scope." />
          <p className={`text-right text-[11px] mt-1 ${(form.description?.length || 0) >= 500 ? "text-red-500" : (form.description?.length || 0) >= 450 ? "text-amber-500" : "text-slate-400"}`}>
            {form.description?.length || 0} / 500
          </p>
        </div>
      </Section>
    </div>
  );
}
