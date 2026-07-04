import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import type { Ref } from "react";
import { Search, X, ChevronDown, Loader2 } from "lucide-react";

// ── Utility class ──
const FONT = "font-windows text-xs leading-tight tracking-normal";

// ── Search Input ──
interface ExplorerSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  debouncing?: boolean;
}

export const ExplorerToolbarSearch = forwardRef(function ExplorerToolbarSearch(
  { value, onChange, placeholder = "Search", disabled = false, debouncing = false }: ExplorerSearchProps,
  ref: Ref<HTMLInputElement>,
) {
  return (
    <div className="relative flex h-8 w-full items-center overflow-hidden rounded-[2px] border border-border bg-background focus-within:after:absolute focus-within:after:bottom-0 focus-within:after:left-0 focus-within:after:h-[2px] focus-within:after:w-full focus-within:after:bg-accent/100 disabled:pointer-events-none disabled:opacity-50">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`h-full w-full bg-transparent pl-3 pr-9 text-xs text-foreground placeholder:text-muted-foreground outline-none disabled:pointer-events-none ${FONT}`}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground/60 hover:text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {debouncing ? (
        <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground animate-spin" />
      ) : (
        <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
});

// ── Filter Dropdown ──
interface ExplorerDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  width?: string;
}

export function ExplorerToolbarDropdown({
  value, onChange, options, placeholder = "All", className = "", width = "min-w-[140px]",
}: ExplorerDropdownProps) {
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
        onClick={() => setOpen((p) => !p)}
        className={`flex h-8 ${width} items-center justify-between gap-2 rounded-[2px] border border-border bg-background px-2 text-xs text-foreground hover:bg-muted leading-none ${FONT}`}
      >
        <span className="truncate">{sel ? sel.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[4px] border border-border bg-background py-1 shadow-md ring-1 ring-black/5">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex h-8 w-full items-center gap-2 px-3 text-xs text-left hover:bg-muted ${o.value === value ? "font-medium text-foreground" : "text-foreground"}`}
            >
              {o.value === value ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-success/100" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Command Button ──
interface ExplorerButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "success" | "destructive";
  active?: boolean;
  className?: string;
}

export function ExplorerToolbarButton({
  icon: Icon, label, onClick, disabled = false, title, variant = "default", active = false, className = "",
}: ExplorerButtonProps) {
  const base = `inline-flex h-8 items-center gap-1.5 rounded-[2px] bg-transparent px-2 text-xs font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:text-muted-foreground/60 disabled:hover:bg-transparent ${FONT}`;

  if (variant === "success") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`${base} text-success hover:bg-success/10 active:bg-success/15 ${active ? "bg-success/10 text-success" : ""} ${className}`}
      >
        <Icon className="h-4 w-4 shrink-0 stroke-current" />
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
        <Icon className="h-4 w-4 shrink-0 stroke-current" />
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
      className={`${base} text-muted-foreground hover:bg-muted active:bg-muted/80 ${active ? "bg-muted" : ""} ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0 stroke-current" />
      <span>{label}</span>
    </button>
  );
}

// ── Vertical Separator ──
export function ExplorerToolbarSeparator({ className = "" }: { className?: string }) {
  return <span className={`mx-0.5 h-5 w-px shrink-0 bg-muted/80 ${className}`} />;
}

// ── Toolbar Layout ──
interface ExplorerToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchDebouncing?: boolean;
  searchRef?: Ref<HTMLInputElement>;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  leftWidth?: string;
}

/**
 * Windows Explorer-style toolbar.
 *
 * For simple usage with search, pass `searchValue`/`onSearchChange`/`filters`/`actions`.
 * For child-based usage, provide `children`.
 */
export function ExplorerToolbar({
  searchValue, onSearchChange, searchPlaceholder, searchDebouncing = false, searchRef,
  filters, actions, children, className = "", leftWidth = "w-[20%]",
}: ExplorerToolbarProps) {
  return (
    <div className={`flex h-10 shrink-0 items-center border-b border-border bg-muted text-xs leading-tight tracking-normal text-foreground select-none font-windows ${className}`}>
      {/* Left section — search */}
      {(searchValue !== undefined || children) && (
        <div className={`flex h-full items-center border-r border-border px-2 ${leftWidth} min-w-[240px] max-w-[360px]`}>
          {searchValue !== undefined ? (
            <div className="w-full">
              <ExplorerToolbarSearch
                value={searchValue}
                onChange={onSearchChange!}
                placeholder={searchPlaceholder}
                debouncing={searchDebouncing}
                ref={searchRef}
              />
            </div>
          ) : (
            children
          )}
        </div>
      )}
      {/* Right section — filters + actions */}
      {(filters || actions) && (
        <div className="flex h-full flex-1 min-w-0 items-center gap-2 px-2">
          {filters && <div className="flex items-center gap-2 shrink-0">{filters}</div>}
          {actions && (
            <>
              <div className="flex-1 min-w-0" />
              <div className="flex items-center gap-2 shrink-0">{actions}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
