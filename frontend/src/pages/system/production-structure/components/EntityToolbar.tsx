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
  variant?: "default" | "splitListDetail";
}

const DEFAULT_STATUS_OPTIONS: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function EntityToolbar({
  onBack, onAdd, onEdit, onDelete, onRefresh, hasSelected,
  statusFilter, onStatusFilterChange, statusOptions = DEFAULT_STATUS_OPTIONS,
  search, onSearchChange, searchPlaceholder = "Search...", plantFilter, variant = "default",
}: EntityToolbarProps) {
  const filters = (
    <>
      {plantFilter && (
        <select value={plantFilter.value} onChange={(e) => plantFilter.onChange(e.target.value)}
          className="h-7 rounded border border-slate-300 bg-white px-2 text-xs outline-none text-slate-600 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {plantFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {onSearchChange && (
        <SearchInput value={search || ""} onChange={onSearchChange} placeholder={searchPlaceholder} className={variant === "splitListDetail" ? "w-full" : "w-full max-w-xs"} />
      )}
      <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}
        className="h-6 w-24 shrink-0 rounded border border-slate-300 bg-white px-2 text-[11px] outline-none text-slate-600 cursor-pointer dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </>
  );
  const actions = (
    <>
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 px-3 py-1 rounded text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4 stroke-current" />
          <span>Back</span>
        </button>
      )}
      {onAdd && (
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 px-3 py-1 rounded text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors">
          <Plus className="h-4 w-4 stroke-current" />
          <span>Add</span>
        </button>
      )}
      {hasSelected && onEdit && (
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 px-3 py-1 rounded text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors">
          <Pencil className="h-4 w-4 stroke-current" />
          <span>Edit</span>
        </button>
      )}
      {hasSelected && onDelete && (
        <button type="button" title="Delete" onClick={onDelete} className="inline-flex items-center justify-center h-7 w-7 rounded text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 className="h-3.5 w-3.5 stroke-current" />
        </button>
      )}
      {onRefresh && (
        <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1 px-3 py-1 rounded text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors">
          <RefreshCw className="h-4 w-4 stroke-current" />
          <span>Refresh</span>
        </button>
      )}
    </>
  );
  if (variant === "splitListDetail") {
    return (
      <div className="flex shrink-0 items-center border-b border-slate-200 bg-slate-50/80 px-0 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]" style={{ height: 40 }}>
        <div className="flex min-w-0 items-center gap-2 px-3" style={{ flex: "0 0 20%", minWidth: 200 }}>
          {filters}
        </div>
        <span className="h-full w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
        <div className="flex flex-1 items-center gap-1 px-3">
          {actions}
          {hasSelected && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">1 selected</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]" style={{ height: 40 }}>
      {actions}

      {/* Separator */}
      <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />

      {/* Plant filter */}
      <div className="flex-1 flex justify-center">
        <div className="flex w-full max-w-sm items-center gap-2">{filters}</div>
      </div>
    </div>
  );
}
