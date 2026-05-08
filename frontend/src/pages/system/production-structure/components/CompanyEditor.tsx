import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { X, RefreshCw, Plus, ChevronDown, Search } from "lucide-react";
import { CONFIG_OPTIONS_QUERY } from "@/graphql/companyQueries";

interface CompanyFormData {
  name: string; code: string; address: string; phone: string; email: string;
  website: string; description: string;
  industryType: string; manufacturingType: string; defaultTimezone: string;
  defaultUnits: string; defaultShiftModel: string; productionCalendar: string;
  defaultLanguage: string; leanMethodology: string;
}

function HelpButton({ content }: { content: { purpose: string; affects: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-4 h-4 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-[11px] font-bold leading-none"
        title="Help"
      >
        ?
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-[260px] bg-white border shadow-lg rounded-lg p-3 z-50 dark:bg-slate-900 dark:border-slate-700">
          <p className="text-[10px] text-slate-700 dark:text-slate-300 mb-1">
            <span className="font-semibold">Purpose:</span> {content.purpose}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Affects:</span> {content.affects}
          </p>
        </div>
      )}
    </span>
  );
}

function StyledSelect({ value, onChange, options, label, required, touched, onBlur, placeholder, id }: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  label: React.ReactNode;
  required?: boolean;
  touched?: boolean;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
}) {
  const invalid = required && touched && !value?.toString().trim();
  return (
    <div>
      <label className="block text-[8px] font-medium text-slate-400 mb-px">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          title={options.find(o => o.value === value)?.label || ""}
          className={'w-full border-0 border-b border-slate-200 dark:border-slate-700 px-0 py-0.5 text-[11px] bg-transparent appearance-none cursor-pointer focus:border-emerald-400 focus:ring-0 transition-colors' + (invalid ? ' border-red-300' : '')}
        >
          <option value="">{placeholder || "Select..."}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current" />
      </div>
      {invalid && <p className="text-[7px] text-red-500">Required</p>}
    </div>
  );
}

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
  const filtered = query
    ? opts.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : opts;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    setHighlighted(-1);
  }, [query]);

  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      onBlur?.();
    }
    prevOpen.current = isOpen;
  }, [isOpen, onBlur]);

  const invalid = required && touched && !form[formKey]?.toString().trim();

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlighted >= 0 ? highlighted : 0;
      if (filtered[idx]) {
        onChange(formKey, filtered[idx].value);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  if (loading) {
    return (
      <div>
        <label className="block text-[8px] font-medium text-slate-400 mb-px">{label}</label>
        <div className="w-full border-0 border-b border-slate-200 dark:border-slate-700 px-0 py-0.5 text-[11px] flex items-center gap-1">
          <RefreshCw className="h-2.5 w-2.5 animate-spin text-slate-400 stroke-current" /> Loading options...
        </div>
      </div>
    );
  }

  if (opts.length === 0) {
    return (
      <div>
        <label className="block text-[8px] font-medium text-slate-400 mb-px">{label}</label>
        <div className="w-full border-0 border-b border-slate-200 dark:border-slate-700 px-0 py-0.5 text-[11px] flex items-center justify-between">
          <span className="text-slate-400 italic">No options configured</span>
          <button type="button" onClick={() => window.open("/system/production-structure/references", "_blank")}
            className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-500 font-medium"
          >
            <Plus className="h-2.5 w-2.5 stroke-current" /> Add
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-[8px] font-medium text-slate-400 mb-px">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <button id={id} type="button" onClick={() => { setIsOpen(!isOpen); setQuery(""); }}
        title={selected ? selected.label : "Select..."}
        className={'w-full border-0 border-b border-slate-200 dark:border-slate-700 px-0 py-0.5 text-[11px] flex items-center justify-between gap-1 bg-transparent focus:border-emerald-400 focus:ring-0 transition-colors' + (invalid ? ' border-red-300' : '') + (!selected ? ' text-slate-400' : '')}
      >
        <span className="truncate">{selected ? selected.label : "Select..."}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {selected && (
            <span onClick={(e) => { e.stopPropagation(); onChange(formKey, ""); setQuery(""); setIsOpen(true); }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-3 w-3 stroke-current" />
            </span>
          )}
          <ChevronDown className={'h-3 w-3 text-slate-400 stroke-current transition-transform duration-150' + (isOpen ? ' rotate-180' : '')} />
        </span>
      </button>
      {invalid && <p className="mt-0.5 text-[9px] text-red-500">This field is required</p>}
      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-48 flex flex-col">
          <div className="relative border-b border-slate-100 dark:border-slate-800">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current pointer-events-none" />
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search..." className="w-full h-7 pl-7 pr-2 text-[11px] bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] text-slate-400 text-center">No results for &lsquo;{query}&rsquo;</div>
            ) : (
              filtered.map((o, i) => (
                <button key={o.value} type="button" onClick={() => { onChange(formKey, o.value); setIsOpen(false); }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`w-full text-left px-2.5 py-1.5 text-[11px] transition-colors ${
                    o.value === form[formKey]
                      ? "bg-sky-50 text-sky-700 font-medium dark:bg-sky-500/10 dark:text-sky-300"
                      : highlighted === i
                        ? "bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const HELP_CONTENT: Record<string, { purpose: string; affects: string }> = {
  industryType: {
    purpose: "Configures industry-specific defaults and compliance report templates.",
    affects: "Standardize > Templates \u00b7 Check > Audit types",
  },
  defaultShiftModel: {
    purpose: "Sets the shift template applied when auto-scheduling production runs.",
    affects: "Execute > Work Orders \u00b7 Plan > Capacity Planning",
  },
  leanMethodology: {
    purpose: "Defines the improvement framework used in audits and standardization workflows.",
    affects: "Improve > Kaizen \u00b7 Standardize > SOPs",
  },
  productionCalendar: {
    purpose: "Controls which days count as working days for scheduling and reporting.",
    affects: "Plan > Production Schedule \u00b7 Execute > Work Orders",
  },
  defaultUnits: {
    purpose: "Sets the measurement system for all quantities across the plant.",
    affects: "Material Flow \u00b7 Execute \u00b7 all numeric fields",
  },
};

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
  // used by parent callers
  void onSave; void onClose; void saving; void compact;
  const { data: optsData, loading: optsLoading } = useQuery<{ configOptions: Array<{ category: string; value: string; label: string }> }>(CONFIG_OPTIONS_QUERY);

  const options = useMemo(() => {
    const map: Record<string, Array<{ value: string; label: string }>> = {};
    (optsData?.configOptions ?? []).forEach((o) => {
      if (!map[o.category]) map[o.category] = [];
      map[o.category].push({ value: o.value, label: o.label });
    });
    return map;
  }, [optsData]);

  const touch = (key: string) => {
    if (setTouched) setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const isInvalid = (key: string, required?: boolean) => {
    if (!required) return false;
    return touchedFields?.[key] && !form[key as keyof CompanyFormData]?.toString().trim();
  };

  const descLen = form.description?.length || 0;

  const renderRow = (cells: React.ReactNode[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
      {cells.map((c, i) => (
        <div key={i} className={cells.length === 1 && i === 0 ? "sm:col-span-2" : ""}>{c}</div>
      ))}
    </div>
  );

  const sectionHeading = (text: string) => (
    <p className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">{text}</p>
  );

  const divider = <div className="border-t border-slate-100 dark:border-slate-800/50 my-2.5" />;

  const inputClass = (invalid = false) =>
    'w-full border-0 border-b border-slate-200 dark:border-slate-700 px-0 py-0.5 text-[11px] bg-transparent focus:border-emerald-400 focus:ring-0 transition-colors' + (invalid ? ' border-red-300' : '');

  return (
    <div className="px-4 py-2.5">

      {sectionHeading("Identity")}
      {renderRow([
        <div key="name">
          <label className="block text-[8px] font-medium text-slate-400 mb-px">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input id="company-field-name" type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)}
            onBlur={() => touch("name")}
            className={inputClass(isInvalid("name", true))} placeholder="e.g. Lean Manufacturing Demo" />
          {isInvalid("name", true) && <p className="text-[7px] text-red-500">Required</p>}
        </div>,
        <div key="code">
          <label className="block text-[8px] font-medium text-slate-400 mb-px">
            Company Code <span className="text-red-500">*</span>
          </label>
          <input id="company-field-code" type="text" value={form.code} onChange={(e) => onChange("code", e.target.value)}
            onBlur={() => touch("code")}
            className={inputClass(isInvalid("code", true))} placeholder="e.g. LMD" />
          {isInvalid("code", true) && <p className="text-[7px] text-red-500">Required</p>}
        </div>,
      ])}
      {renderRow([
        <StyledSelect key="industryType" id="company-field-industryType" value={form.industryType}
          onChange={(v) => onChange("industryType", v)} options={options["industry_type"] ?? []}
          label={<span>Industry Type <HelpButton content={HELP_CONTENT.industryType} /></span>}
          required touched={touchedFields?.industryType} onBlur={() => touch("industryType")}
          placeholder="Select industry type..." />,
        <StyledSelect key="manufacturingType" value={form.manufacturingType}
          onChange={(v) => onChange("manufacturingType", v)} options={options["manufacturing_type"] ?? []}
          label={<span className="text-[9px]">Manufacturing Type</span>} required touched={touchedFields?.manufacturingType}
          onBlur={() => touch("manufacturingType")} placeholder="Select manufacturing type..." />,
      ])}

      {divider}
      {sectionHeading("Operations")}
      {renderRow([
        <SearchableSelect key="timezone" category="timezone" formKey="defaultTimezone"
          label={<span className="text-[9px]">Timezone</span>} form={form} onChange={onChange} options={options} loading={optsLoading}
          required touched={touchedFields?.defaultTimezone} onBlur={() => touch("defaultTimezone")} />,
        <StyledSelect key="units" value={form.defaultUnits}
          onChange={(v) => onChange("defaultUnits", v)} options={options["units"] ?? []}
          label={<span className="text-[9px]">Units <HelpButton content={HELP_CONTENT.defaultUnits} /></span>}
          required touched={touchedFields?.defaultUnits}
          onBlur={() => touch("defaultUnits")} placeholder="Select units..." />,
      ])}
      {renderRow([
        <StyledSelect key="shiftModel" value={form.defaultShiftModel}
          onChange={(v) => onChange("defaultShiftModel", v)} options={options["shift_model"] ?? []}
          label={<span className="text-[9px]">Shift Model <HelpButton content={HELP_CONTENT.defaultShiftModel} /></span>}
          required touched={touchedFields?.defaultShiftModel}
          onBlur={() => touch("defaultShiftModel")} placeholder="Select shift model..." />,
        <SearchableSelect key="calendar" category="calendar" formKey="productionCalendar"
          label={<span className="text-[9px]">Calendar<span className="ml-1 inline-flex items-center rounded-full px-1 py-0.5 text-[7px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Recommended</span></span>}
          form={form} onChange={onChange} options={options} loading={optsLoading} />,
      ])}
      {renderRow([
        <StyledSelect key="leanMethodology" value={form.leanMethodology}
          onChange={(v) => onChange("leanMethodology", v)} options={options["lean_methodology"] ?? []}
          label={<span className="text-[9px]">Lean Methodology <HelpButton content={HELP_CONTENT.leanMethodology} /><span className="ml-1 inline-flex items-center rounded-full px-1 py-0.5 text-[7px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Recommended</span></span>}
          placeholder="Select lean methodology..." />,
      ])}
      {renderRow([
        <SearchableSelect key="language" category="language" formKey="defaultLanguage"
          label={<span className="text-[9px]">Language</span>} form={form} onChange={onChange} options={options} loading={optsLoading} />,
      ])}

      {divider}
      {sectionHeading("Contact")}
      {renderRow([
        <div key="phone">
          <label className="block text-[8px] font-medium text-slate-400 mb-px">Phone</label>
          <input type="text" value={form.phone} onChange={(e) => onChange("phone", e.target.value)}
            className={inputClass()} placeholder="+1 (555) 000-0000" />
        </div>,
        <div key="email">
          <label className="block text-[8px] font-medium text-slate-400 mb-px">Email</label>
          <input type="text" value={form.email} onChange={(e) => onChange("email", e.target.value)}
            className={inputClass()} placeholder="e.g. info@company.com" />
        </div>,
      ])}
      {renderRow([
        <div key="website">
          <label className="block text-[8px] font-medium text-slate-400 mb-px">Website</label>
          <input type="text" value={form.website} onChange={(e) => onChange("website", e.target.value)}
            className={inputClass()} placeholder="e.g. https://company.com" />
        </div>,
      ])}

      {divider}
      {sectionHeading("Location")}
      {renderRow([
        <div key="address">
          <label className="block text-[8px] font-medium text-slate-400 mb-px">Address</label>
          <input type="text" value={form.address} onChange={(e) => onChange("address", e.target.value)}
            className={inputClass()} placeholder="e.g. 123 Industrial Blvd, Suite 100" />
        </div>,
      ])}
      {renderRow([
        <div key="description">
          <label className="block text-[8px] font-medium text-slate-400 mb-px">Description</label>
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)}
            className="w-full border-0 border-b border-slate-200 dark:border-slate-700 px-0 py-0.5 text-[11px] bg-transparent resize-none min-h-[30px] max-h-[48px] focus:border-emerald-400 focus:ring-0 transition-colors rounded-none"
            rows={1} maxLength={500} placeholder="Describe this company's manufacturing focus and operations" />
          <p className={`text-right text-[9px] mt-0.5 ${descLen >= 500 ? "text-red-500" : descLen >= 450 ? "text-amber-500" : "text-slate-400"}`}>
            {descLen} / 500
          </p>
        </div>,
      ])}
    </div>
  );
}
