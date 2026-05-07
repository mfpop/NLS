import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { Factory, X, Save, RefreshCw, Plus, ChevronDown, Search } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";
import { CONFIG_OPTIONS_QUERY } from "@/graphql/companyQueries";

interface CompanyFormData {
  name: string; code: string; address: string; phone: string; email: string;
  website: string; description: string;
  industryType: string; manufacturingType: string; defaultTimezone: string;
  defaultUnits: string; defaultShiftModel: string; productionCalendar: string;
  defaultLanguage: string; leanMethodology: string;
}

function SearchableSelect({ category, formKey, label, form, onChange, options, loading }: {
  category: string; formKey: keyof CompanyFormData; label: string;
  form: CompanyFormData; onChange: (k: string, v: string) => void;
  options: Record<string, Array<{ value: string; label: string }>>;
  loading: boolean;
}) {
  const opts = options[category] ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  if (loading) {
    return (
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
        <div className={`w-full rounded-lg border px-2.5 py-1.5 text-xs flex items-center gap-2 ${theme.input}`}>
          <RefreshCw className="h-3 w-3 animate-spin text-slate-400 stroke-current" /> Loading options...
        </div>
      </div>
    );
  }

  if (opts.length === 0) {
    return (
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
        <div className={`w-full rounded-lg border px-2.5 py-1.5 text-xs flex items-center justify-between ${theme.input}`}>
          <span className="text-slate-400 italic">No options configured</span>
          <button type="button" onClick={() => window.open("/system/data-management/references", "_blank")}
            className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-500 font-medium"
          >
            <Plus className="h-3 w-3 stroke-current" /> Add
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <button type="button" onClick={() => { setIsOpen(!isOpen); setQuery(""); }}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs flex items-center justify-between gap-1 ${theme.input} ${theme.focusRing} ${!selected ? "text-slate-400" : ""}`}
      >
        <span className="truncate">{selected ? selected.label : "Select..."}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-slate-400 stroke-current transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-48 flex flex-col">
          <div className="relative border-b border-slate-100 dark:border-slate-800">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current pointer-events-none" />
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..." className="w-full h-7 pl-7 pr-2 text-[11px] bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] text-slate-400 text-center">No matches</div>
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

export function CompanyEditor({ form, onChange, onSave, onClose, saving, compact }: {
  form: CompanyFormData;
  onChange: (key: string, value: string) => void;
  onSave?: () => void;
  onClose?: () => void;
  saving?: boolean;
  compact?: boolean;
}) {
  const { data: optsData, loading: optsLoading } = useQuery<{ configOptions: Array<{ category: string; value: string; label: string }> }>(CONFIG_OPTIONS_QUERY);
  const options = useMemo(() => {
    const map: Record<string, Array<{ value: string; label: string }>> = {};
    (optsData?.configOptions ?? []).forEach((o) => {
      if (!map[o.category]) map[o.category] = [];
      map[o.category].push({ value: o.value, label: o.label });
    });
    return map;
  }, [optsData]);

  return (
    <div className={`rounded-2xl border p-4 ${theme.card}`}>
      {!compact && (
        <div className="flex items-start gap-3 mb-4">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.iconBoxEmerald}`}>
            <Factory className="h-4 w-4 stroke-current" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>Company</h2>
            <p className={`text-xs ${theme.textSecondary}`}>Operational root entity configuration</p>
          </div>
          <div className="flex items-center gap-1.5">
            {onSave && (
              <button type="button" onClick={onSave} disabled={saving}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                title="Save"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin stroke-current" /> : <Save className="h-4 w-4 stroke-current" />}
              </button>
            )}
            {onClose && (
              <button type="button" onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
              >
                <X className="h-4 w-4 stroke-current" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Company Name *</label>
          <input type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} placeholder="e.g. Lean Manufacturing Demo" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Company Code *</label>
          <input type="text" value={form.code} onChange={(e) => onChange("code", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} placeholder="e.g. LMD" />
        </div>

        <SearchableSelect category="industry_type" formKey="industryType" label="Industry Type *" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <SearchableSelect category="manufacturing_type" formKey="manufacturingType" label="Manufacturing Type *" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <SearchableSelect category="timezone" formKey="defaultTimezone" label="Timezone *" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <SearchableSelect category="units" formKey="defaultUnits" label="Units *" form={form} onChange={onChange} options={options} loading={optsLoading} />

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Phone</label>
          <input type="text" value={form.phone} onChange={(e) => onChange("phone", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Email</label>
          <input type="text" value={form.email} onChange={(e) => onChange("email", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Website</label>
          <input type="text" value={form.website} onChange={(e) => onChange("website", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} />
        </div>
        <SearchableSelect category="shift_model" formKey="defaultShiftModel" label="Default Shift Model *" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <SearchableSelect category="calendar" formKey="productionCalendar" label="Production Calendar" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <SearchableSelect category="lean_methodology" formKey="leanMethodology" label="Lean Methodology" form={form} onChange={onChange} options={options} loading={optsLoading} />

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Address</label>
          <input type="text" value={form.address} onChange={(e) => onChange("address", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Description</label>
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs resize-none min-h-[60px] max-h-[80px] overflow-y-auto ${theme.input} ${theme.focusRing}`} rows={3} />
        </div>
      </div>
    </div>
  );
}
