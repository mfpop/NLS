import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { Factory, X, Save, RefreshCw, Plus } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";
import { CONFIG_OPTIONS_QUERY } from "@/graphql/companyQueries";

interface CompanyFormData {
  name: string; code: string; address: string; phone: string; email: string;
  website: string; description: string;
  industryType: string; manufacturingType: string; defaultTimezone: string;
  defaultUnits: string; defaultShiftModel: string; productionCalendar: string;
  defaultLanguage: string; leanMethodology: string;
}

function RefSelect({ category, formKey, label, form, onChange, options, loading }: {
  category: string; formKey: keyof CompanyFormData; label: string;
  form: CompanyFormData; onChange: (k: string, v: string) => void;
  options: Record<string, Array<{ value: string; label: string }>>;
  loading: boolean;
}) {
  const opts = options[category] ?? [];
  const hasValue = !!form[formKey];

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
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <select value={(form[formKey] as string) ?? ""} onChange={(e) => onChange(formKey, e.target.value)}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing} ${!hasValue ? "text-slate-400" : ""}`}
      >
        <option value="">Select...</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value} className="text-slate-900 dark:text-slate-100">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function CompanyEditor({ form, onChange, onSave, onClose, saving }: {
  form: CompanyFormData;
  onChange: (key: string, value: string) => void;
  onSave?: () => void;
  onClose?: () => void;
  saving?: boolean;
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
    <div className={`rounded-2xl border p-5 ${theme.card}`}>
      <div className="flex items-start gap-3 mb-5">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.iconBoxEmerald}`}>
          <Factory className="h-4 w-4 stroke-current" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>Manufacturing Organization</h2>
          <p className={`text-xs ${theme.textSecondary}`}>Operational manufacturing configuration and standards</p>
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

      <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Company Name *</label>
          <input type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} placeholder="e.g. Lean Manufacturing Demo" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Company Code *</label>
          <input type="text" value={form.code} onChange={(e) => onChange("code", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} placeholder="e.g. LMD" />
        </div>

        <RefSelect category="industry_type" formKey="industryType" label="Industry Type *" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <RefSelect category="manufacturing_type" formKey="manufacturingType" label="Manufacturing Type *" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <RefSelect category="timezone" formKey="defaultTimezone" label="Timezone *" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <RefSelect category="units" formKey="defaultUnits" label="Units *" form={form} onChange={onChange} options={options} loading={optsLoading} />

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Phone</label>
          <input type="text" value={form.phone} onChange={(e) => onChange("phone", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Email</label>
          <input type="text" value={form.email} onChange={(e) => onChange("email", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Website</label>
          <input type="text" value={form.website} onChange={(e) => onChange("website", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} />
        </div>
        <RefSelect category="shift_model" formKey="defaultShiftModel" label="Default Shift Model *" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <RefSelect category="calendar" formKey="productionCalendar" label="Production Calendar" form={form} onChange={onChange} options={options} loading={optsLoading} />
        <RefSelect category="lean_methodology" formKey="leanMethodology" label="Lean Methodology" form={form} onChange={onChange} options={options} loading={optsLoading} />

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Address</label>
          <input type="text" value={form.address} onChange={(e) => onChange("address", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${theme.input} ${theme.focusRing}`} rows={2} />
        </div>
      </div>
    </div>
  );
}
