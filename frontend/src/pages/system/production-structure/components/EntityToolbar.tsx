import { ChevronLeft, Plus, Pencil, Trash2, RefreshCw, Search, X } from "lucide-react";
import type { FilterOption } from "./Toolbar";

interface PlantFilterOption { label: string; value: string; }

interface EntityToolbarProps {
  onBack?: () => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  hasSelected?: boolean;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  statusOptions?: FilterOption[];
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  plantFilter?: { value: string; onChange: (v: string) => void; options: PlantFilterOption[] };
}

const DEFAULT_STATUS_OPTIONS: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function EntityToolbar({
  onBack, onAdd, onEdit, onDelete, onRefresh, hasSelected,
  statusFilter, onStatusFilterChange, statusOptions = DEFAULT_STATUS_OPTIONS,
  search, onSearchChange, searchPlaceholder = "Search...", plantFilter,
}: EntityToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 px-2 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]" style={{ height: 44 }}>
      {onBack && (
        <button type="button" title="Back" onClick={onBack} className="inline-flex items-center justify-center h-8 w-8 rounded text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
          <ChevronLeft className="h-4 w-4 stroke-current" />
        </button>
      )}
      <span className="mx-0.5 h-5 w-px bg-slate-300 dark:bg-slate-600" />
      {onAdd && (
        <button type="button" title="Add" onClick={onAdd} className="inline-flex items-center justify-center h-8 w-8 rounded text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
          <Plus className="h-4 w-4 stroke-current" />
        </button>
      )}
      {hasSelected && onEdit && (
        <button type="button" title="Edit" onClick={onEdit} className="inline-flex items-center justify-center h-8 w-8 rounded text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
          <Pencil className="h-4 w-4 stroke-current" />
        </button>
      )}
      {hasSelected && onDelete && (
        <button type="button" title="Delete" onClick={onDelete} className="inline-flex items-center justify-center h-8 w-8 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 className="h-4 w-4 stroke-current" />
        </button>
      )}

      {/* Plant filter dropdown */}
      {plantFilter && (
        <div className="flex items-center gap-0.5">
          <span className="mx-0.5 h-5 w-px bg-slate-300 dark:bg-slate-600" />
          <select value={plantFilter.value} onChange={(e) => plantFilter.onChange(e.target.value)}
            className="h-7 rounded border border-slate-300 bg-white px-2 text-xs outline-none text-slate-600 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {plantFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* Search — Windows Explorer style (icon on right) */}
      <div className="flex-1 flex justify-center">
        {onSearchChange && (
          <div className="relative w-full max-w-xs">
            <input type="text" value={search || ""} onChange={(e) => onSearchChange(e.target.value)} placeholder={searchPlaceholder}
              className="h-7 w-full rounded-md border border-slate-300 bg-white pl-3 pr-8 text-xs outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
            {search ? (
              <button type="button" onClick={() => onSearchChange("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5 stroke-current" />
              </button>
            ) : (
              <Search className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 stroke-current" />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {onRefresh && (
          <button type="button" title="Refresh" onClick={onRefresh} className="inline-flex items-center justify-center h-8 w-8 rounded text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
            <RefreshCw className="h-4 w-4 stroke-current" />
          </button>
        )}
        <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}
          className="h-7 rounded border border-slate-300 bg-white px-2 text-xs outline-none text-slate-600 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
