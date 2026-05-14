import type { ReactNode } from "react";

interface EntityWorkspacePageProps {
  toolbar: ReactNode;
  list: ReactNode;
  detail: ReactNode;
  footer?: ReactNode;
}

export function EntityWorkspacePage({ toolbar, list, detail, footer }: EntityWorkspacePageProps) {
  return (
    <div className="flex flex-col overflow-hidden h-full p-0 m-0">
      {toolbar}
      <div className="flex flex-1 min-h-0 overflow-hidden p-0 m-0">
        <div className="flex flex-col overflow-hidden min-w-0" style={{ flex: "0 0 280px", width: 280 }}>
          {list}
        </div>
        <div onMouseDown={() => {}} className="flex shrink-0 cursor-col-resize items-center justify-center bg-slate-200/60 hover:bg-blue-300/60 dark:bg-slate-700/60 dark:hover:bg-blue-500/30 transition-colors" style={{ width: 4 }}>
          <svg className="h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/></svg>
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {detail}
        </div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center px-5 text-xs text-slate-500 dark:text-slate-300 font-medium h-10">
          {footer}
        </div>
      )}
    </div>
  );
}

export type FormMode = "view" | "edit" | "create";

export interface EntityField<T = string> {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea" | "readonly";
  required?: boolean;
  options?: { label: string; value: T }[];
  placeholder?: string;
  render?: (value: any) => ReactNode;
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-28 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-sm text-slate-900 dark:text-slate-100 min-w-0">{children}</div>
    </div>
  );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 pb-1 border-b border-slate-200 dark:border-slate-700">{title}</h3>
      {children}
    </div>
  );
}

export function FormField({ field, value, onChange, mode, error }: {
  field: EntityField;
  value: any;
  onChange: (key: string, value: any) => void;
  mode: FormMode;
  error?: string;
}) {
  const isEditable = mode === "edit" || mode === "create";
  const baseInput = "h-8 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none text-slate-700 placeholder-slate-400 transition-colors focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-400";

  if (field.type === "readonly" || (!isEditable && field.type !== "select")) {
    const val = value ?? "";
    return (
      <DetailRow label={field.label}>
        {field.render ? field.render(val) : <span className="text-sm text-slate-900 dark:text-slate-100">{val || "-"}</span>}
      </DetailRow>
    );
  }

  if (field.type === "textarea") {
    return (
      <DetailRow label={field.label}>
        {isEditable ? (
          <textarea value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder}
            className="h-20 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none text-slate-700 placeholder-slate-400 resize-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-400" />
        ) : (
          <span className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{value || "-"}</span>
        )}
      </DetailRow>
    );
  }

  if (field.type === "select") {
    return (
      <DetailRow label={field.label}>
        {isEditable ? (
          <select value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)}
            className={baseInput}>
            <option value="">Select...</option>
            {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <span className="text-sm text-slate-900 dark:text-slate-100">{field.options?.find((o) => o.value === value)?.label || value || "-"}</span>
        )}
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </DetailRow>
    );
  }

  return (
    <DetailRow label={field.label}>
      {isEditable ? (
        <input type="text" value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder}
          className={baseInput} />
      ) : (
        <span className="text-sm text-slate-900 dark:text-slate-100">{value || "-"}</span>
      )}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </DetailRow>
  );
}
