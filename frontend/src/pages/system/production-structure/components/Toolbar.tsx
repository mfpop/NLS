import { Search, X, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { theme } from "../../../../styles/themeTokens";

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

  /* Close / back navigation */
  closePath?: string;
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
  closePath,
}: ToolbarProps) {
  const navigate = useNavigate();
  return (
    <div className="flex shrink-0 items-center justify-between bg-white border-b border-slate-200 px-5 py-3 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 stroke-current" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={`h-9 w-[280px] rounded-lg border pl-9 pr-3 text-xs transition-colors ${theme.input} ${theme.focusRing}`}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4 stroke-current" />
            </button>
          )}
        </div>

        {/* Parent filter */}
        {parentFilter && (
          <div className="relative">
            <select
              value={parentFilter.value}
              onChange={(e) => parentFilter.onChange(e.target.value)}
              className={`h-9 rounded-lg border px-3 pr-8 text-xs appearance-none cursor-pointer transition-colors ${theme.input} ${theme.focusRing}`}
            >
              {parentFilter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-100 p-0.5 dark:border-slate-700">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilterChange(opt.value)}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-gray-50 text-slate-500 hover:bg-gray-100 dark:bg-gray-600 dark:text-slate-200"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {closePath && (
          <button
            type="button"
            onClick={() => navigate(closePath)}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4 stroke-current" />
            Close
          </button>
        )}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-slate-800 px-4 text-xs font-semibold text-white hover:bg-slate-700 transition-all active:scale-[0.97] dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Plus className="h-4 w-4 stroke-current" />
            {addLabel || "Add"}
          </button>
        )}
      </div>
    </div>
  );
}
