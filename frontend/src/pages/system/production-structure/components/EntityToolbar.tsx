import { ChevronLeft, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { SearchInput } from "./SearchInput";
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
    <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]" style={{ height: 40 }}>
      {/* Navigation group */}
      {onBack && (
        <button type="button" title="Back" onClick={onBack} className="inline-flex items-center justify-center h-7 w-7 rounded text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-700/60 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5 stroke-current" />
        </button>
      )}
      {onRefresh && (
        <button type="button" title="Refresh" onClick={onRefresh} className="inline-flex items-center justify-center h-7 w-7 rounded text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-700/60 transition-colors">
          <RefreshCw className="h-3.5 w-3.5 stroke-current" />
        </button>
      )}

      {/* Separator */}
      <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />

      {/* Actions group */}
      {onAdd && (
        <button type="button" title="Add" onClick={onAdd} className="inline-flex items-center justify-center h-7 w-7 rounded text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-700/60 transition-colors">
          <Plus className="h-3.5 w-3.5 stroke-current" />
        </button>
      )}
      {hasSelected && onEdit && (
        <button type="button" title="Edit" onClick={onEdit} className="inline-flex items-center justify-center h-7 w-7 rounded text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-700/60 transition-colors">
          <Pencil className="h-3.5 w-3.5 stroke-current" />
        </button>
      )}
      {hasSelected && onDelete && (
        <button type="button" title="Delete" onClick={onDelete} className="inline-flex items-center justify-center h-7 w-7 rounded text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 className="h-3.5 w-3.5 stroke-current" />
        </button>
      )}

      {/* Separator */}
      <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />

      {/* Plant filter */}
      {plantFilter && (
        <select value={plantFilter.value} onChange={(e) => plantFilter.onChange(e.target.value)}
          className="h-7 rounded border border-slate-300 bg-white px-2 text-xs outline-none text-slate-600 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {plantFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      {/* Search */}
      <div className="flex-1 flex justify-center">
        {onSearchChange && (
          <SearchInput value={search || ""} onChange={onSearchChange} placeholder={searchPlaceholder} className="w-full max-w-xs" />
        )}
      </div>

      {/* Status filter */}
      <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}
        className="h-6 rounded border border-slate-300 bg-white px-2 text-[11px] outline-none text-slate-600 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
