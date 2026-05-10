import { Plus } from "lucide-react";
import { SearchInput } from "./SearchInput";

/* ── Types ── */

export interface FilterOption {
  label: string;
  value: string;
}

interface ToolbarProps {
  /* Search */
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  /* Parent filter (Plant / Line / Department) */
  parentFilter?: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    label?: string;
  };

  /* Status filter */
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions?: FilterOption[];

  /* Add button */
  onAdd?: () => void;
  addLabel?: string;

  /* Render status as dropdown instead of tabs */
  statusAsDropdown?: boolean;
}

/* ── Status Filter Tabs ── */

const DEFAULT_STATUS_OPTIONS: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Not Ready", value: "not_ready" },
];

/* ── Component ── */

export function Toolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  parentFilter,
  statusFilter,
  onStatusFilterChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  onAdd,
  addLabel,
  statusAsDropdown = false,
}: ToolbarProps) {
  return (
    <div className="flex shrink-0 items-center bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800" style={{ height: "40px" }}>
      {/* Search - fills all available space */}
      <div className="flex-1 h-full flex items-center">
        <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} className="w-full max-w-xs" />
      </div>

      {/* Parent filter */}
      {parentFilter && (
        <div className="relative shrink-0 h-full border-l border-slate-200 dark:border-slate-700">
          <select
            value={parentFilter.value}
            onChange={(e) => parentFilter.onChange(e.target.value)}
            className="h-full border-0 bg-transparent px-3 pr-7 text-xs appearance-none cursor-pointer outline-none text-slate-600 dark:text-slate-300"
          >
            {parentFilter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Status filter: dropdown or tabs */}
      {statusAsDropdown ? (
        <div className="relative shrink-0 h-full border-l border-slate-200 dark:border-slate-700">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="h-full border-0 bg-transparent px-3 pr-7 text-xs appearance-none cursor-pointer outline-none text-slate-600 dark:text-slate-300"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 shrink-0 h-full border-l border-slate-200 dark:border-slate-700 px-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilterChange(opt.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-700"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Right side */}
      <div className="flex items-center shrink-0 h-full border-l border-slate-200 dark:border-slate-700 px-1">
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 h-7 px-2 rounded text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 stroke-current" />
            {addLabel || "Add"}
          </button>
        )}
      </div>
    </div>
  );
}
