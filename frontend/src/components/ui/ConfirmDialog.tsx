import { type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
  icon,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl border border-border/30 shadow-2xl p-5 max-h-[80vh] flex flex-col">
        <div className="flex items-start gap-3 shrink-0">
          {icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10">
              {icon}
            </div>
          ) : danger ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle className="h-5 w-5 text-danger stroke-current" />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <AlertTriangle className="h-5 w-5 text-primary stroke-current" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {message && (
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{message}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5 stroke-current" />
          </button>
        </div>

        {/* Custom children content (scrollable) */}
        {children && (
          <div className="mt-3 overflow-y-auto -mx-1 px-1 flex-1 min-h-0">
            {children}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/10 pt-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-8 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors border-0 bg-transparent disabled:pointer-events-none disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex h-8 items-center gap-1.5 px-4 rounded-lg text-xs font-semibold text-primary-foreground transition-all disabled:pointer-events-none disabled:opacity-40 shadow-sm ${
              danger
                ? "bg-danger hover:bg-danger/90"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {loading && (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
