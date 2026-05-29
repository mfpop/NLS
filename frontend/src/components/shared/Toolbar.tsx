import type { LucideIcon } from "lucide-react";
import { Search, X, Plus, Pencil, Trash2, RefreshCw, Check } from "lucide-react";
import { theme } from "@/styles/themeTokens";

// ── Search Input ──
interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ToolbarSearch({ value, onChange, placeholder = "Search", disabled = false }: SearchProps) {
  return (
    <div className="relative min-w-0 flex-1 mx-2">
      <Search className={`absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none ${disabled ? "opacity-40" : ""}`} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-8 w-full rounded bg-card px-3 py-1 text-xs outline-none text-muted-foreground placeholder:text-muted-foreground transition-colors focus:border-b-2 focus:border-info" />
      {value && (
        <button type="button" onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
          <X className="h-3.5 w-3.5 stroke-current" />
        </button>
      )}
    </div>
  );
}

// ── Status/Filter Select ──
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export function ToolbarSelect({ value, onChange, options, className = "" }: FilterSelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`h-8 shrink-0 cursor-pointer bg-card px-2 py-1 text-xs text-muted-foreground outline-none transition-colors focus:border-b-2 focus:border-info ${className}`}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Action Button ──
interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "success";
  active?: boolean;
}

export function ToolbarButton({ icon: Icon, label, onClick, disabled = false, title, variant = "default", active = false }: ActionButtonProps) {
  if (variant === "success") {
    return (
      <button type="button" onClick={onClick} title={title} disabled={disabled}
        className="inline-flex h-8 items-center gap-3.5 px-2 py-1 text-xs font-medium text-success select-none transition-all duration-150 bg-transparent hover:bg-success/10 active:bg-success/20 disabled:pointer-events-none disabled:opacity-50">
        <Icon className="h-4 w-4 stroke-current" />
        <span>{label}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled}
      className={`${theme.toolbarBtn} ${active ? "bg-primary/10 text-primary font-semibold" : ""}`}>
      <Icon className="h-4 w-4 stroke-current" />
      <span>{label}</span>
    </button>
  );
}

// ── Toolbar Layout ──
interface ToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  hideLeft?: boolean;
  className?: string;
}

export function Toolbar({ left, right, hideLeft = false, className = "" }: ToolbarProps) {
  return (
    <div className={`flex shrink-0 select-none items-center border-b border-border/35 bg-muted h-10 py-1 ${className}`}>
      <div className="flex h-full min-w-0 flex-1 items-center px-0">
        {!hideLeft && left && (
          <div className="flex min-w-0 flex-[2] items-center px-0">
            {left}
          </div>
        )}
        {right && (
          <div className="flex min-w-0 flex-[8] items-center ml-2 gap-2">
            {right}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Default CRUD Action Group ──
interface CrudActionsProps {
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  canNew?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canRefresh?: boolean;
  isEditMode?: boolean;
  isSaving?: boolean;
  saveDisabled?: boolean;
  hideNew?: boolean;
  hideDelete?: boolean;
}

export function ToolbarCrudActions({
  onNew, onEdit, onDelete, onRefresh,
  onSave, onCancel,
  canNew = true, canEdit = true, canDelete = true, canRefresh = true,
  isEditMode = false, isSaving = false, saveDisabled = false,
  hideNew = false, hideDelete = false,
}: CrudActionsProps) {
  if (isEditMode && onSave) {
    return (
      <>
        <ToolbarButton icon={Check} label={isSaving ? "Saving..." : "Save"} onClick={onSave} disabled={saveDisabled} variant="success" title={saveDisabled ? "Save is available after valid changes" : "Save"} />
        <ToolbarButton icon={X} label="Cancel" onClick={onCancel} title="Cancel" />
      </>
    );
  }
  return (
    <>
      {!hideNew && <ToolbarButton icon={Plus} label="New" onClick={onNew} disabled={!onNew || !canNew} title="Create new (Ctrl+N)" />}
      <ToolbarButton icon={Pencil} label="Edit" onClick={onEdit} disabled={!onEdit || !canEdit} title="Edit selected (Enter)" />
      {!hideDelete && <ToolbarButton icon={Trash2} label="Delete" onClick={onDelete} disabled={!onDelete || !canDelete} title="Delete selected (Delete)" />}
      {!hideDelete && <span className="h-5 w-px shrink-0 bg-border/25" />}
      <ToolbarButton icon={RefreshCw} label="Refresh" onClick={onRefresh} disabled={!onRefresh || !canRefresh} title="Refresh list" />
    </>
  );
}
