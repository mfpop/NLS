import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
  downtimeReason: string;
  startedAt: string;
  durationMinutes: number;
  affectedResourceName: string | null;
  affectedResourceGroupName: string | null;
}

export function CloseDowntimeConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  saving,
  downtimeReason,
  startedAt,
  durationMinutes,
  affectedResourceName,
  affectedResourceGroupName,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, saving]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={saving ? undefined : onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Confirm resolve downtime"
        tabIndex={-1}
        className="w-full max-w-sm rounded-lg border border-border/50 bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle className="h-4 w-4 text-danger" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Resolve Downtime</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Are you sure you want to resolve this active downtime event?
          </p>

          <div className="rounded-md border border-border/30 bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-medium text-foreground shrink-0 w-16">Reason:</span>
              <span className="text-[10px] text-foreground">{downtimeReason}</span>
            </div>
            {affectedResourceName && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-medium text-foreground shrink-0 w-16">Resource:</span>
                <span className="text-[10px] text-muted-foreground">{affectedResourceName}</span>
              </div>
            )}
            {affectedResourceGroupName && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-medium text-foreground shrink-0 w-16">Group:</span>
                <span className="text-[10px] text-muted-foreground">{affectedResourceGroupName}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-medium text-foreground shrink-0 w-16">Started:</span>
              <span className="text-[10px] text-muted-foreground">{startedAt}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-medium text-foreground shrink-0 w-16">Duration:</span>
              <span className="text-[10px] tabular-nums font-semibold text-foreground">{durationMinutes} min</span>
            </div>
          </div>

          {saving && (
            <div className="flex items-center gap-2 text-[10px] text-accent">
              <span className="h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              Resolving downtime...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border/20 bg-muted/20 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-white bg-danger hover:bg-danger/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Resolving..." : "Resolve Downtime"}
          </button>
        </div>
      </div>
    </div>
  );
}
