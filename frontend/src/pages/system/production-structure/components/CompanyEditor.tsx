import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { X, ChevronDown, Search, RefreshCw, Plus, HelpCircle } from "lucide-react";
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
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      <div className="w-full rounded border border-border px-2.5 py-1.5 text-[13px] flex items-center gap-1.5 bg-card bg-muted">
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground stroke-current" /> Loading options...
      </div>
    </div>
  );
  if (opts.length === 0) return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      <div className="w-full rounded border border-border px-2.5 py-1.5 text-[13px] flex items-center justify-between bg-card bg-muted">
        <span className="text-muted-foreground italic">No options configured</span>
        <button type="button" onClick={() => window.open("/system/production-structure/references", "_blank")} className="inline-flex items-center gap-0.5 text-success hover:text-success font-medium text-xs"><Plus className="h-3 w-3 stroke-current" /> Add</button>
      </div>
    </div>
  );
  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}{required && <span className="ml-0.5 text-danger">*</span>}</label>
      <button id={id} type="button" onClick={() => { setIsOpen(!isOpen); setQuery(""); }}
        className={'w-full h-8 rounded border border-border px-2.5 text-[13px] flex items-center justify-between gap-1 bg-card bg-muted focus:border-success focus:ring-2 focus:ring-success outline-none transition-colors' + (invalid ? ' border-danger' : '') + (!selected ? ' text-muted-foreground' : '')}>
        <span className="truncate">{selected ? selected.label : "Select..."}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {selected && <span onClick={(e) => { e.stopPropagation(); onChange(formKey as string, ""); setQuery(""); setIsOpen(true); }} className="text-muted-foreground hover:text-muted-foreground transition-colors"><X className="h-3.5 w-3.5 stroke-current" /></span>}
          <ChevronDown className={'h-3.5 w-3.5 text-muted-foreground stroke-current transition-transform duration-150' + (isOpen ? ' rotate-180' : '')} />
        </span>
      </button>
      {invalid && <p className="text-[11px] text-danger mt-0.5">This field is required</p>}
      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg border-border bg-muted max-h-48 flex flex-col">
          <div className="relative border-b border-border">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleInputKeyDown}
              placeholder="Search..." className="w-full h-8 pl-8 pr-2.5 text-[12px] bg-transparent outline-none text-muted-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-muted-foreground text-center">No results</div>
            ) : filtered.map((o, i) => (
              <button key={o.value} type="button" onClick={() => { onChange(formKey as string, o.value); setIsOpen(false); }} onMouseEnter={() => setHighlighted(i)}
                className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${o.value === form[formKey] ? "bg-info text-info font-medium bg-info text-info" : highlighted === i ? "bg-muted text-muted-foreground bg-muted text-muted-foreground" : "text-muted-foreground"}`}>{o.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({ id, label, value, onChange, onBlur, required, placeholder, invalid, helper }: {
  id?: string; label: string; value: string; onChange: (v: string) => void; onBlur?: () => void;
  required?: boolean; placeholder?: string; invalid?: boolean; helper?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}{required && <span className="ml-0.5 text-danger">*</span>}</label>
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded border border-border px-2.5 py-1.5 text-[13px] bg-card bg-muted outline-none transition-colors ${invalid ? "border-danger" : "border-border"} focus:border-success focus:ring-2 focus:ring-success`} />
      {helper && !invalid && <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><HelpCircle className="h-3 w-3 shrink-0" />{helper}</p>}
      {invalid && <p className="text-[11px] text-danger mt-0.5">Required</p>}
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

  function Section({ title, children, collapsible = false, defaultOpen = true }: { title: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="bg-muted rounded-lg p-4 mb-5">
        <button type="button" onClick={collapsible ? () => setOpen(!open) : undefined}
          aria-expanded={collapsible ? open : undefined}
          className={`flex items-center gap-2 w-full text-left ${collapsible ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
          <h3 className="text-sm font-bold text-muted-foreground flex-1">{title}</h3>
          {collapsible && (
            <ChevronDown className={`h-4 w-4 text-muted-foreground stroke-current transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          )}
        </button>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">Changes here affect all plants, lines, and resources.</p>
        {(!collapsible || open) && <>{children}</>}
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
            label={<span>Status <span className="text-muted-foreground font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <TextField label="Operating Since" value={form.operatingSince}
            onChange={(v) => onChange("operatingSince", v)} placeholder="e.g. 1995-01-01"
            helper="Format: YYYY-MM-DD" />
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

      <Section title="Global Operations" collapsible defaultOpen={false}>
        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
          <SearchableSelect category="timezone" formKey="defaultTimezone"
            label="Timezone" form={form} onChange={onChange} options={options} loading={optsLoading}
            required touched={touchedFields?.defaultTimezone} onBlur={() => touch("defaultTimezone")} />
          <SearchableSelect category="language" formKey="defaultLanguage"
            label={<span>Language <span className="text-muted-foreground font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <SearchableSelect category="calendar" formKey="defaultCalendar"
            label={<span>Calendar <span className="text-muted-foreground font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <SearchableSelect category="shift_model" formKey="defaultShiftModel"
            label={<span>Shift Model <span className="text-muted-foreground font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <SearchableSelect category="week_start_day" formKey="weekStartDay"
            label={<span>Week Start Day <span className="text-muted-foreground font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <TextField label="Default Units" value={form.defaultUnits}
            onChange={(v) => onChange("defaultUnits", v)} placeholder="e.g. Imperial, Metric" />
        </div>
      </Section>

      <Section title="Contact & Administration">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <TextField label="Phone" value={form.phone}
            onChange={(v) => onChange("phone", v)} placeholder="+1 (555) 000-0000"
            helper="Include country code (e.g. +1 555 000 0000)" />
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

      <Section title="Location" collapsible defaultOpen={false}>
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
            label={<span>Country <span className="text-muted-foreground font-normal">(ref)</span></span>}
            form={form} onChange={onChange} options={options} loading={optsLoading} />
          <TextField label="Zip Code" value={form.zipcode}
            onChange={(v) => onChange("zipcode", v)} placeholder="e.g. 90670"
            helper="US: 90670, US+4: 90670-2221, Canada: A1A 1A1" />
        </div>
      </Section>

      <Section title="Description">
        <div>
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)}
            className="w-full rounded border border-border p-2.5 text-[13px] bg-card bg-muted outline-none focus:border-success focus:ring-2 focus:ring-success transition-colors resize-y min-h-[60px]"
            maxLength={500} placeholder="Brief description of the company, core products, and operational scope." />
          <p className={`text-right text-[11px] mt-1 ${(form.description?.length || 0) >= 500 ? "text-danger" : (form.description?.length || 0) >= 450 ? "text-warning" : "text-muted-foreground"}`}>
            {form.description?.length || 0} / 500
          </p>
        </div>
      </Section>
    </div>
  );
}
