import { useReferenceCategory, type ReferenceValueNode } from "@/hooks/useReferenceTables";
import { theme } from "@/styles/themeTokens";

interface ReferenceSelectProps {
  categoryCode: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  includeInactive?: boolean;
}

export function ReferenceSelect({
  categoryCode, label, value, onChange, required, disabled, error, placeholder, includeInactive,
}: ReferenceSelectProps) {
  const { values, loading } = useReferenceCategory(categoryCode);

  const options = includeInactive
    ? values
    : values.filter((v) => v.isActive);

  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className={`w-full h-9 rounded-lg border px-3 text-sm outline-none transition-colors appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          error ? "border-red-300 focus:ring-2 focus:ring-red-200" : `${theme.input} ${theme.focusRing}`
        } ${disabled ? "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400" : ""}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {loading && <option value="" disabled>Loading...</option>}
        {!loading && options.length === 0 && <option value="" disabled>No reference values configured</option>}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
        {includeInactive && value && !options.find((o) => o.id === value) && (
          <option value={value} disabled>Inactive value</option>
        )}
      </select>
      {error && <p className="mt-0.5 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

interface ReferenceMultiSelectProps {
  categoryCode: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  error?: string;
}

export function ReferenceMultiSelect({
  categoryCode, label, values, onChange, disabled, error,
}: ReferenceMultiSelectProps) {
  const { values: allOptions, loading } = useReferenceCategory(categoryCode);

  const activeOptions = allOptions.filter((v) => v.isActive);

  const toggle = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id));
    } else {
      onChange([...values, id]);
    }
  };

  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      {loading && (
        <div className="h-9 flex items-center text-xs text-slate-400">Loading...</div>
      )}
      {!loading && activeOptions.length === 0 && (
        <div className="h-9 flex items-center text-xs text-slate-400">No reference values configured</div>
      )}
      {!loading && activeOptions.length > 0 && (
        <div className="flex flex-nowrap gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "thin" }}>
          {activeOptions.map((opt) => {
            const selected = values.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(opt.id)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors border whitespace-nowrap shrink-0 ${
                  selected
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="mt-0.5 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

interface ReferenceBadgeProps {
  value: ReferenceValueNode | null | undefined;
  size?: "sm" | "md";
}

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  blue: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  amber: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  purple: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  rose: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  gray: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20",
  slate: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20",
  violet: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
  orange: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  pink: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20",
  teal: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20",
};

const DOT_COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  rose: "bg-rose-500",
  gray: "bg-gray-500",
  slate: "bg-slate-400",
  indigo: "bg-indigo-500",
  cyan: "bg-cyan-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
};

export function ReferenceBadge({ value, size = "sm" }: ReferenceBadgeProps) {
  if (!value) return null;

  const colorKey = value.metadata?.color as string ?? "slate";
  const style = COLOR_MAP[colorKey] ?? COLOR_MAP.slate;
  const dotColor = DOT_COLOR_MAP[colorKey] ?? DOT_COLOR_MAP.slate;
  const isInactive = !value.isActive;
  const px = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const textSize = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide ${px} ${textSize} ${style} ${
        isInactive ? "opacity-50 line-through" : ""
      }`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {value.name}
    </span>
  );
}

interface ReferenceBadgeListProps {
  values: ReferenceValueNode[];
  size?: "sm" | "md";
}

export function ReferenceBadgeList({ values, size = "sm" }: ReferenceBadgeListProps) {
  if (!values || values.length === 0) return <span className="text-xs text-slate-400">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <ReferenceBadge key={v.id} value={v} size={size} />
      ))}
    </div>
  );
}

interface ReferenceColorBadgeProps {
  colorKey: string;
  label: string;
}

export function ReferenceColorBadge({ colorKey, label }: ReferenceColorBadgeProps) {
  const style = COLOR_MAP[colorKey] ?? COLOR_MAP.slate;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${style}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_COLOR_MAP[colorKey] ?? "bg-slate-400"}`} />
      {label}
    </span>
  );
}
