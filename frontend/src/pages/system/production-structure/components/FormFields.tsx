export interface FormFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function FormField({ label, value, onChange, disabled }: FormFieldProps) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">{label}</label>
      <input
        type="text"
        defaultValue={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full h-8 rounded border border-slate-200 dark:border-slate-700 px-2.5 text-[12px] bg-white dark:bg-slate-900 outline-none focus:border-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={label}
      />
    </div>
  );
}

export interface EditableFieldProps {
  label: string;
  value: string | number;
  type?: "text" | "email" | "number" | "date";
  readOnly?: boolean;
  className?: string;
}

export function EditableField({ label, value, type = "text", readOnly, className }: EditableFieldProps) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        defaultValue={value}
        readOnly={readOnly}
        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none read-only:bg-slate-50 dark:read-only:bg-slate-900"
      />
    </div>
  );
}

export interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
  required,
}: SelectFieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-[13px] bg-white dark:bg-slate-900 appearance-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 outline-none disabled:opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          backgroundSize: "14px",
          paddingRight: "36px",
        }}
      >
        <option value="">Select {label.toLowerCase()}...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
