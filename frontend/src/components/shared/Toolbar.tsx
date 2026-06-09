import type { LucideIcon } from "lucide-react";
import { Search, X, Plus, Pencil, Trash2, RefreshCw, Check, Archive } from "lucide-react";

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
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-8 w-full border-0 border-b-2 border-b-transparent bg-transparent pr-7 pl-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:border-b-blue-500 focus:bg-transparent disabled:pointer-events-none disabled:opacity-50"
      />
      <Search className={`absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-current text-muted-foreground/60 pointer-events-none ${disabled ? "opacity-40" : ""}`} />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 hover:bg-muted/70 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5 stroke-current" />
        </button>
      )}
    </div>
  );
}

// ── Filter Select ──
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export function ToolbarSelect({ value, onChange, options, className = "" }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 shrink-0 cursor-pointer border-0 border-b-2 border-b-transparent bg-transparent px-1.5 text-xs text-foreground outline-none transition-colors hover:bg-muted/40 focus:border-b-blue-500 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
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
  const base = "inline-flex h-8 items-center gap-1.5 border-0 border-b-2 border-b-transparent px-2 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
  if (variant === "success") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`${base} text-emerald-600 hover:border-b-emerald-500 hover:bg-emerald-50/50 active:bg-emerald-100/60 ${active ? "border-b-emerald-500 bg-emerald-50/60" : ""}`}
      >
        <Icon className="h-4 w-4 stroke-current" />
        <span>{label}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${base} text-foreground hover:border-b-blue-500 hover:bg-muted/50 active:bg-muted/70 ${active ? "border-b-blue-500 bg-blue-50/60 text-blue-700" : ""}`}
    >
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
    <div className={`flex w-full shrink-0 select-none items-center border-b border-border/30 bg-muted/80 h-10 gap-0 ${className}`}>
      {!hideLeft && left && (
        <div className="flex min-w-0 flex-[2] items-center gap-1">
          {left}
        </div>
      )}
      {right && (
        <div className="flex min-w-0 flex-[8] items-center justify-end gap-0.5">
          {right}
        </div>
      )}
    </div>
  );
}

// ── Default CRUD Action Group ──
interface CrudActionsProps {
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeletePermanent?: () => void;
  onRefresh?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  canNew?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canDeletePermanent?: boolean;
  canRefresh?: boolean;
  isEditMode?: boolean;
  isSaving?: boolean;
  saveDisabled?: boolean;
  hideNew?: boolean;
  hideDelete?: boolean;
}

export function ToolbarCrudActions({
  onNew, onEdit, onDelete, onDeletePermanent, onRefresh,
  onSave, onCancel,
  canNew = true, canEdit = true, canDelete = true, canDeletePermanent = true, canRefresh = true,
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
      {!hideDelete && <ToolbarButton icon={Archive} label="Archive" onClick={onDelete} disabled={!onDelete || !canDelete} title="Archive selected" />}
      {!hideDelete && <ToolbarButton icon={Trash2} label="Delete" onClick={onDeletePermanent} disabled={!onDeletePermanent || !canDeletePermanent} title="Permanently delete selected" />}
      {!hideDelete && <span className="mx-0.5 h-5 w-px shrink-0 bg-border/30" />}
      <ToolbarButton icon={RefreshCw} label="Refresh" onClick={onRefresh} disabled={!onRefresh || !canRefresh} title="Refresh list" />
    </>
  );
}
