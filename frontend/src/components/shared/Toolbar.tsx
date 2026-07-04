import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import type { Ref } from "react";
import { Search, X, Plus, Pencil, Trash2, RefreshCw, Check, Archive, ChevronDown, Loader2 } from "lucide-react";

// ── Search Input ──
interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  debouncing?: boolean;
}

export const ToolbarSearch = forwardRef(function ToolbarSearch({ value, onChange, placeholder = "Search", disabled = false, debouncing = false }: SearchProps, ref: Ref<HTMLInputElement>) {
  return (
    <div className="relative flex h-8 w-full items-center bg-background rounded-[2px] overflow-hidden focus-within:bg-muted focus-within:after:absolute focus-within:after:bottom-0 focus-within:after:left-0 focus-within:after:h-[2px] focus-within:after:w-full focus-within:after:bg-primary disabled:pointer-events-none disabled:opacity-50">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder || "Search"}
        className="h-full w-full bg-transparent pl-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:pointer-events-none"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {debouncing ? (
        <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-primary animate-spin pointer-events-none" />
      ) : (
        <Search className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      )}
    </div>
  );
});

// ── Filter Select ──
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export function ToolbarSelect({ value, onChange, options, className = "" }: FilterSelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={selectedLabel || options[0]?.label || "Filter"}
      className={`h-8 shrink-0 cursor-pointer border-0 bg-transparent rounded-sm px-2 text-sm text-foreground outline-none transition-colors disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Toolbar Dropdown ──
interface ToolbarDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

export function ToolbarDropdown({ value, onChange, options, placeholder = "All", className = "" }: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = options.find((o) => o.value === value);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  return (
    <div className={`relative shrink-0 ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}        className={`h-8 min-w-[140px] px-2 rounded-[2px] text-sm text-foreground flex items-center justify-between gap-2 leading-none bg-transparent hover:bg-muted active:bg-muted/80`}
        >
          <span className="truncate">{sel ? sel.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[4px] border border-border bg-card shadow-md py-1">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex h-8 w-full items-center gap-2 px-3 text-sm text-left hover:bg-muted ${o.value === value ? "font-medium text-foreground" : "text-muted-foreground"}`}
              >
                {o.value === value ? <span className="h-2 w-2 shrink-0 rounded-full bg-success" /> : <span className="w-3.5 shrink-0" />}
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
      )}
    </div>
  );
}

// ── Action Button ──
interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "success" | "destructive" | "primary";
  active?: boolean;
  className?: string;
}

export function ToolbarButton({ icon: Icon, label, onClick, disabled = false, title, variant = "default", active = false, className = "" }: ActionButtonProps) {
  const base = "inline-flex h-8 items-center gap-1.5 px-3 text-sm font-medium rounded-[2px] whitespace-nowrap transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent";
  const activeToken = active ? "bg-muted" : "";
  if (variant === "success") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`${base} text-success hover:bg-success/10 active:bg-success/15 ${active ? "bg-success/10 text-success" : ""} ${className}`}
      >
        <Icon className="h-4 w-4 stroke-current" />
        <span>{label}</span>
      </button>
    );
  }
  if (variant === "destructive") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`${base} text-danger hover:bg-danger/10 active:bg-danger/15 ${active ? "bg-danger/10 text-danger" : ""} ${className}`}
      >
        <Icon className="h-4 w-4 stroke-current" />
        <span>{label}</span>
      </button>
    );
  }
  if (variant === "primary") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`${base} text-success bg-transparent hover:bg-success/10 active:bg-success/15 ${active ? "bg-success/10" : ""} ${className}`}
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
      className={`${base} text-muted-foreground hover:bg-muted active:bg-muted/80 ${activeToken} ${className}`}
    >
      <Icon className="h-4 w-4 stroke-current" />
      <span>{label}</span>
    </button>
  );
}

// ── Toolbar Layout ──
interface ToolbarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  leftWidth?: string;
}

export function Toolbar({ left, center, right, className = "", leftWidth = "w-[20%]" }: ToolbarProps) {
  return (
    <div className={`flex h-10 shrink-0 items-center border-b border-border-major bg-muted select-none ${className}`}>
      <div className={`${leftWidth} min-w-[240px] max-w-[360px] border-r border-border-major px-2 flex items-center h-full`}>
        {left && <div className="w-full">{left}</div>}
      </div>
      <div className="flex flex-1 min-w-0 items-center gap-2 px-2 h-full">
        {center && <div className="flex items-center gap-2 shrink-0">{center}</div>}
        {right && (
          <>
            <div className="flex-1 min-w-0" />
            <div className="flex items-center gap-2 shrink-0">{right}</div>
          </>
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
      {!hideDelete && <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />}
      <ToolbarButton icon={RefreshCw} label="Refresh" onClick={onRefresh} disabled={!onRefresh || !canRefresh} title="Refresh list" />
    </>
  );
}
