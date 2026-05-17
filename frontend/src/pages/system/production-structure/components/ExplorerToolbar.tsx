import { ChevronLeft, Plus, Pencil, Trash2, RefreshCw, Funnel } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";
import { useState } from "react";

interface ExplorerToolbarProps {
  onBack?: () => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  hasSelected?: boolean;
  search?: string;
  onSearchChange?: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
}

export function ExplorerToolbar({
  onBack, onAdd, onEdit, onDelete, onRefresh, hasSelected,
  search, onSearchChange, statusFilter, onStatusFilterChange
}: ExplorerToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className={`flex items-center ${theme.subHeader} px-3 h-10 gap-2`}>
      {onBack && (
        <button
          onClick={onBack}
          className={`flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-semibold ${theme.buttonGhost} transition-colors`}
        >
          <ChevronLeft className="h-4 w-4 stroke-current" />
          Back
        </button>
      )}

      {onAdd && (
        <button
          onClick={onAdd}
          className={`flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-semibold ${theme.buttonGhost} transition-colors`}
        >
          <Plus className="h-4 w-4 stroke-current" />
          New
        </button>
      )}

      {hasSelected && onEdit && (
        <button
          onClick={onEdit}
          className={`flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-semibold ${theme.buttonGhost} transition-colors`}
        >
          <Pencil className="h-4 w-4 stroke-current" />
          Edit
        </button>
      )}

      {hasSelected && onDelete && (
        <button
          onClick={onDelete}
          className={`flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-semibold ${theme.buttonGhost} transition-colors`}
        >
          <Trash2 className="h-4 w-4 stroke-current" />
          Delete
        </button>
      )}

      {onRefresh && (
        <button
          onClick={onRefresh}
          className={`flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-semibold ${theme.buttonGhost} transition-colors ml-auto`}
        >
          <RefreshCw className="h-4 w-4 stroke-current" />
          Refresh
        </button>
      )}

      <input
        type="search"
        placeholder="Search..."
        value={search || ""}
        onChange={(e) => onSearchChange?.(e.target.value)}
        className={`ml-2 flex-grow max-w-xs rounded ${theme.input} px-2 text-sm outline-none`}
      />

      <button
        onClick={() => setFilterOpen(!filterOpen)}
        className={`flex items-center gap-1 px-3 py-1 rounded-sm text-sm font-semibold ${theme.buttonGhost} transition-colors`}
        title="Toggle Filter"
      >
        <Funnel className="h-4 w-4 stroke-current" />
        Filter
      </button>

      {filterOpen && (
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className={`absolute top-10 right-2 z-50 rounded ${theme.input} p-1 text-sm outline-none`}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      )}
    </div>
  );
}
