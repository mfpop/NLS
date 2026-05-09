import { Check, X, Trash2 } from "lucide-react";
import { theme } from "@/styles/themeTokens";

interface EntityFormActionsProps {
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  hasChanges: boolean;
  deleteConfirm?: boolean;
  onDeleteConfirm?: () => void;
  onDeleteCancel?: () => void;
  deleting?: boolean;
}

export function EntityFormActions({
  onSave, onCancel, onDelete,
  saving, hasChanges,
  deleteConfirm, onDeleteConfirm, onDeleteCancel,
  deleting,
}: EntityFormActionsProps) {
  return (
    <div className={`shrink-0 border-t px-6 py-3 ${theme.subHeader} sticky bottom-0 bg-white dark:bg-slate-950`}>
      <div className="mx-auto flex items-center justify-between" style={{ maxWidth: "1000px" }}>
        <div>
          {onDelete && !deleteConfirm && (
            <button type="button" onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors">
              <Trash2 className="h-3.5 w-3.5 stroke-current" />
              Delete
            </button>
          )}
          {deleteConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">Confirm delete?</span>
              <button type="button" onClick={onDeleteConfirm} disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button type="button" onClick={onDeleteCancel}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
            <X className="h-3.5 w-3.5 stroke-current" />
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={!hasChanges || saving || deleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
            <Check className="h-3.5 w-3.5 stroke-current" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
