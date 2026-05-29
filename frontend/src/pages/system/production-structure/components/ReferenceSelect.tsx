import { theme } from "../../../../styles/themeTokens";
import { useReferenceCategory, type ReferenceValueNode } from "@/hooks/useReferenceTables";

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
  filteredValues?: Array<{ id: string; name: string }>;
  selectClass?: string;
  id?: string;
  name?: string;
}

export function ReferenceSelect({
  categoryCode, label, value, onChange, required, disabled, error, placeholder, includeInactive, filteredValues, selectClass,
  id, name
}: ReferenceSelectProps) {
  const { values, loading } = useReferenceCategory(categoryCode);

  const rawOptions = filteredValues ?? values;
  const options = includeInactive
    ? rawOptions
    : rawOptions.filter((v) => "isActive" in v ? (v as any).isActive : true);

  const defaultSelectClass = `w-full rounded border px-2 py-0.5 text-[13px] outline-none transition-colors appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
    error ? "border-danger focus:ring-2 focus:ring-danger" : "border-border bg-card bg-muted text-muted-foreground focus:ring-2 focus:ring-success focus:border-success"
  } ${disabled ? "bg-muted text-muted-foreground" : ""}`;

  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold text-muted-foreground mb-1">
        {label}{required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className={selectClass || defaultSelectClass}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {loading && <option value="" disabled>Loading...</option>}
        {!loading && options.length === 0 && <option value="" disabled>No options available</option>}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
        {includeInactive && value && !options.find((o) => o.id === value) && (
          <option value={value} disabled>Inactive value</option>
        )}
      </select>
      {error && <p className="mt-0.5 text-[10px] text-danger">{error}</p>}
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
  showUnselected?: boolean;
  emptyLabel?: string;
}

export function ReferenceMultiSelect({
  categoryCode, label, values, onChange, disabled, error, showUnselected = true, compact, emptyLabel = "None",
}: ReferenceMultiSelectProps & { compact?: boolean }) {
  const { values: allOptions, loading } = useReferenceCategory(categoryCode);

  const safeValues = values ?? [];
  const activeOptions = allOptions.filter((v) => v.isActive);
  const selectedOptions = activeOptions.filter((v) => safeValues.includes(v.id));
  const unselectedOptions = activeOptions.filter((v) => !safeValues.includes(v.id));

  const toggle = (id: string) => {
    if (safeValues.includes(id)) {
      onChange(safeValues.filter((v) => v !== id));
    } else {
      onChange([...safeValues, id]);
    }
  };

  return (
    <div>
      <label className={`block text-[11px] font-semibold ${theme.textSecondary} mb-1`}>
        {label}
      </label>
      {loading && (
        <div className={`h-9 flex items-center text-xs ${theme.textMuted}`}>Loading...</div>
      )}
      {!loading && activeOptions.length === 0 && (
        <div className={`h-9 flex items-center text-xs ${theme.textMuted}`}>No options available</div>
      )}
      {!loading && activeOptions.length > 0 && (
        <div>
          {/* Selected badges */}
          <div className="flex flex-wrap gap-1 mb-1">
            {selectedOptions.length === 0 && (
              <span className={`text-xs ${theme.textMuted} italic`}>{emptyLabel}</span>
            )}
            {selectedOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(opt.id)}
                className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors border whitespace-nowrap shrink-0 ${compact ? "h-6 text-xs px-2" : "px-2 py-0.5 text-[10px]"} ${theme.badgeActive} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {opt.name}
                {!disabled && <span className={`${compact ? "text-[10px]" : "text-xs"} ml-0.5 text-success hover:text-success`}>&times;</span>}
              </button>
            ))}
          </div>
          {/* Unselected options */}
          {showUnselected && unselectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {unselectedOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(opt.id)}
                  className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors border whitespace-nowrap shrink-0 ${compact ? "h-6 text-xs px-2" : "px-2 py-0.5 text-[10px]"} ${theme.chip} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  + {opt.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className={`mt-0.5 text-[10px] ${theme.textCritical}`}>{error}</p>}
    </div>
  );
}

interface ReferenceBadgeProps {
  value: ReferenceValueNode | null | undefined;
  size?: "sm" | "md";
}

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-success text-success border-success bg-success text-success border-success",
  blue: "bg-primary text-primary border-primary bg-primary text-primary border-primary",
  amber: "bg-warning text-warning border-warning bg-warning text-warning border-warning",
  purple: "bg-info text-info border-info bg-info text-info border-info",
  rose: "bg-danger text-danger border-danger bg-danger text-danger border-danger",
  gray: "bg-muted text-muted-foreground border-border bg-muted text-muted-foreground border-border",
  slate: "bg-muted text-muted-foreground border-border bg-muted text-muted-foreground border-border",
  indigo: "bg-info text-info border-info bg-info text-info border-info",
  cyan: "bg-info text-info border-info bg-info text-info border-info",
  violet: "bg-info text-info border-info bg-info text-info border-info",
  orange: "bg-warning text-warning border-warning bg-warning text-warning border-warning",
  pink: "bg-info text-info border-info bg-info text-info border-info",
  teal: "bg-success text-success border-success bg-success text-success border-success",
};

const DOT_COLOR_MAP: Record<string, string> = {
  emerald: "bg-success",
  blue: "bg-primary",
  amber: "bg-warning",
  purple: "bg-info",
  rose: "bg-danger",
  gray: "bg-muted",
  slate: "bg-muted",
  indigo: "bg-info",
  cyan: "bg-info",
  violet: "bg-info",
  orange: "bg-warning",
  pink: "bg-info",
  teal: "bg-success",
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
  if (!values || values.length === 0) return <span className="text-xs text-muted-foreground">None</span>;
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
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_COLOR_MAP[colorKey] ?? "bg-muted"}`} />
      {label}
    </span>
  );
}
