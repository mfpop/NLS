import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { X, GitBranch } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";
import { EntityIconPicker } from "./EntityIconPicker";

/* ── Types ── */

export interface ModalField {
  key: string;
  label: string;
  type?: "text" | "select" | "entityicon";
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  entityType?: string;
  entityId?: string;
}

interface UnifiedModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: ModalField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void | Promise<void>;
  onDelete?: () => void;
  summary?: ReactNode;       // Read-only summary section
  onConfigureStructure?: () => void;
  saving?: boolean;
}

/* ── Component ── */

export function UnifiedModal({
  open,
  onClose,
  title,
  fields,
  values,
  onChange,
  onSave,
  onDelete,
  summary,
  onConfigureStructure,
  saving = false,
}: UnifiedModalProps) {
  const [dirty, setDirty] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDirty(false);
      setShowConfirmClose(false);
      setLocalErrors({});
    }
  }, [open]);

  const handleChange = (key: string, value: string) => {
    onChange(key, value);
    setDirty(true);
    if (localErrors[key]) {
      setLocalErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    // Basic required validation
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !values[field.key]?.trim()) {
        errors[field.key] = `${field.label} is required`;
      }
    }
    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    await onSave();
  };

  const handleClose = () => {
    if (dirty && !showConfirmClose) {
      setShowConfirmClose(true);
      return;
    }
    setShowConfirmClose(false);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className={`fixed inset-0 z-30 ${theme.overlay}`} onClick={handleClose} />
      <div className={`fixed left-1/2 top-1/2 z-40 w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-xl ${theme.modal}`} style={{ maxWidth: "520px" }}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-5 py-3.5 ${theme.subHeader}`}>
          <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>{title}</h2>
          <button type="button" onClick={handleClose} className={`rounded-lg p-1 transition-colors ${theme.buttonGhost}`}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {/* Form Fields */}
          <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
            {fields.map((f) => (
              <div key={f.key}>
                {f.type !== "entityicon" && (
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {f.label}
                    {f.required && <span className="ml-0.5 text-danger">*</span>}
                  </label>
                )}
                {f.type === "entityicon" ? (
                  <EntityIconPicker
                    value={values[f.key] ?? ""}
                    onChange={(v) => handleChange(f.key, v)}
                    entityType={f.entityType}
                    entityId={f.entityId}
                  />
                ) : f.type === "select" && f.options ? (
                  <div className="relative">
                    <select
                      value={values[f.key] ?? ""}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      className={`w-full h-10 rounded-xl border px-3 pr-8 text-xs appearance-none cursor-pointer transition-colors ${
                        localErrors[f.key]
                          ? "border-danger focus:ring-danger"
                          : `${theme.input} ${theme.focusRing}`
                      }`}
                    >
                      <option value="">{f.placeholder || "Select..."}</option>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                    {localErrors[f.key] && <p className="mt-0.5 text-[10px] text-danger">{localErrors[f.key]}</p>}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={values[f.key] ?? ""}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className={`w-full h-10 rounded-xl border px-3 text-xs transition-colors ${
                        localErrors[f.key]
                          ? "border-danger focus:ring-danger"
                          : `${theme.input} ${theme.focusRing}`
                      }`}
                    />
                    {localErrors[f.key] && <p className="mt-0.5 text-[10px] text-danger">{localErrors[f.key]}</p>}
                  </div>
                )}
              </div>
            ))}

            {/* Read-only Summary */}
            {summary && <div className="pt-2">{summary}</div>}

            {/* Configure Structure Button */}
            {onConfigureStructure && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onConfigureStructure?.(); }}
                className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-muted transition-colors"
              >
                <GitBranch className="h-3.5 w-3.5 stroke-current" />
                Configure Structure
              </button>
            )}

            {/* Confirm close warning */}
            {showConfirmClose && (
              <div className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
                You have unsaved changes.
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmClose(false)}
                    className="rounded-md border border-warning/25 bg-card px-2 py-1 text-[10px] font-medium text-warning hover:bg-warning/10 transition-colors"
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDirty(false); onClose(); }}
                    className="rounded-md bg-warning px-2 py-1 text-[10px] font-medium text-warning-foreground hover:bg-warning/90 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between border-t px-5 py-3 shrink-0 ${theme.subHeader}`}>
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onDelete?.(); }}
                  className="rounded px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger text-danger hover:bg-danger transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClose}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${theme.buttonSecondary}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-muted px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-muted transition-colors active:scale-[0.97] bg-muted hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
