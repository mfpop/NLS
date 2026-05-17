import { useState, useRef, useCallback, type ReactNode } from "react";
import { masterListTokens } from "@/components/sidebar/sidebarStyles";
import { theme } from "../../../../styles/themeTokens";

interface EntityWorkspacePageProps {
  toolbar: ReactNode;
  list: ReactNode;
  detail: ReactNode;
  footer?: ReactNode;
  hideList?: boolean;
}

export function EntityWorkspacePage({ toolbar, list, detail, footer, hideList = false }: EntityWorkspacePageProps) {
  const [leftWidth, setLeftWidth] = useState(280);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const newWidth = Math.max(180, Math.min(500, startWidth + (ev.clientX - startX)));
      setLeftWidth(newWidth);
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [leftWidth]);

  return (
    <div className="flex flex-col overflow-hidden h-full p-0 m-0">
      {toolbar}
      <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden p-0 m-0">
        {!hideList && (
          <>
            <div className={`flex flex-col overflow-hidden min-w-0 ${masterListTokens.columnBorder}`} style={{ flex: "0 0 auto", width: leftWidth }}>
              {list}
            </div>
            <div onMouseDown={handleMouseDown} className={`flex shrink-0 cursor-col-resize items-center justify-center ${theme.dividerVertical} transition-colors`} style={{ width: 4 }}>
              <svg className={`h-3 w-3 ${theme.icon} pointer-events-none`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/></svg>
            </div>
          </>
        )}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {detail}
        </div>
      </div>
      {footer && (
        <div className={`shrink-0 border-t border-border ${theme.subHeader} flex h-10 items-center px-5 text-xs font-medium ${theme.textSecondary}`}>
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
      <span className={`text-xs font-semibold ${theme.textSecondary} w-28 shrink-0 pt-0.5`}>{label}</span>
      <div className={`flex-1 text-sm ${theme.textPrimary} min-w-0`}>{children}</div>
    </div>
  );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} mb-2 pb-1 ${theme.sectionDivider}`}>{title}</h3>
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
  const baseInput = `h-8 w-full ${theme.input} ${theme.focusRingSuccess}`;

  if (field.type === "readonly" || (!isEditable && field.type !== "select")) {
    const val = value ?? "";
    return (
      <DetailRow label={field.label}>
        {field.render ? field.render(val) : <span className={`text-sm ${theme.textPrimary}`}>{val || "-"}</span>}
      </DetailRow>
    );
  }

  if (field.type === "textarea") {
    return (
      <DetailRow label={field.label}>
        {isEditable ? (
          <textarea value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder}
            className={`h-20 w-full ${theme.input} ${theme.focusRingSuccess} px-3 py-1.5 text-xs outline-none resize-none`} />
        ) : (
          <span className={`text-sm ${theme.textPrimary} whitespace-pre-wrap`}>{value || "-"}</span>
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
          <span className={`text-sm ${theme.textPrimary}`}>{field.options?.find((o) => o.value === value)?.label || value || "-"}</span>
        )}
        {error && <p className={`text-xs ${theme.textCritical} mt-0.5`}>{error}</p>}
      </DetailRow>
    );
  }

  return (
    <DetailRow label={field.label}>
      {isEditable ? (
        <input type="text" value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder}
          className={baseInput} />
      ) : (
        <span className={`text-sm ${theme.textPrimary}`}>{value || "-"}</span>
      )}
      {error && <p className={`text-xs ${theme.textCritical} mt-0.5`}>{error}</p>}
    </DetailRow>
  );
}
