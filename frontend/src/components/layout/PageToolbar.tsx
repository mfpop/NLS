import React, { ReactNode, useState, useRef, useEffect } from "react";
import {
  Download,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LEFT_COLUMN_WIDTH_CLASS } from "./layoutWidths";

type ToolbarButtonVariant =
  | "neutral"
  | "create"
  | "edit"
  | "warning"
  | "danger";

type PageToolbarProps = {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;

  leftWidthClass?: string;
  leftSlot?: ReactNode;

  filters?: ReactNode;
  actions?: ReactNode;
  rightActions?: ReactNode;
  statusSlot?: ReactNode;

  className?: string;
};

type ToolbarSearchProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  debouncing?: boolean;
  className?: string;
};

type ToolbarButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ToolbarButtonVariant | "default" | "success" | "destructive";
  icon?: ReactNode | LucideIcon;
  /** Legacy prop — use children instead */
  label?: string;
  children?: ReactNode;
};

type ToolbarSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  widthClassName?: string;
  children: ReactNode;
};

type ToolbarDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  /** Set a fixed width for both the trigger button and dropdown panel.
   *  Accepts any valid Tailwind width class (e.g. "w-40", "w-48", "w-56").
   *  Defaults to "w-48" when not set. */
  width?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ── Variant aliases for backward compat ── */

const VARIANT_ALIASES: Record<string, ToolbarButtonVariant> = {
  default: "neutral",
  success: "edit",
  destructive: "danger",
};

function resolveVariant(variant: string): ToolbarButtonVariant {
  return VARIANT_ALIASES[variant] || (variant as ToolbarButtonVariant);
}

const buttonVariantClasses: Record<ToolbarButtonVariant, string> = {
  neutral: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  create: "text-blue-700 hover:bg-blue-50 active:bg-blue-100",
  edit: "text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100",
  warning: "text-amber-700 hover:bg-amber-50 active:bg-amber-100",
  danger: "text-red-700 hover:bg-red-50 active:bg-red-100",
};

/* ── ToolbarSearch ── */

export function ToolbarSearch({
  value,
  placeholder = "Search...",
  onChange,
  disabled,
  debouncing,
  className,
}: ToolbarSearchProps) {
  return (
    <div
      className={cn(
        "relative flex h-8 w-full items-center overflow-hidden rounded-[2px] border border-slate-300 bg-white",
        "focus-within:after:absolute focus-within:after:bottom-0 focus-within:after:left-0 focus-within:after:h-[2px] focus-within:after:w-full focus-within:after:bg-sky-500",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-full w-full bg-transparent pl-3 pr-9 text-xs text-slate-800 placeholder:text-slate-500 outline-none disabled:pointer-events-none"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange?.("")}
          className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {debouncing ? (
        <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500 animate-spin" />
      ) : (
        <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      )}
    </div>
  );
}

/* ── ToolbarButton ── */

export function ToolbarButton({
  variant = "neutral",
  icon,
  label,
  children,
  disabled,
  className,
  ...props
}: ToolbarButtonProps) {
  const resolved = resolveVariant(variant);

  const iconElement = (() => {
    if (!icon) return null;

    const isComponentRef =
      typeof icon === "function" ||
      (typeof icon === "object" && icon !== null && "render" in icon);

    if (isComponentRef) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="h-4 w-4 shrink-0 stroke-current" />;
    }

    return <span className="shrink-0 flex">{icon}</span>;
  })();

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[2px] bg-transparent px-2",
        "text-xs font-medium whitespace-nowrap transition-colors",
        buttonVariantClasses[resolved],
        disabled &&
          "cursor-not-allowed text-slate-400 opacity-50 hover:bg-transparent active:bg-transparent",
        className
      )}
      {...props}
    >
      {iconElement}
      {children ?? label ? (
        <span className="whitespace-nowrap">{children ?? label}</span>
      ) : null}
    </button>
  );
}

/* ── ToolbarSelect ── */

export function ToolbarSelect({
  widthClassName = "w-40",
  className,
  children,
  ...props
}: ToolbarSelectProps) {
  return (
    <select
      className={cn(
        "h-8 rounded-[2px] border border-slate-300 bg-white px-2",
        "text-xs text-slate-900 outline-none",
        "focus:border-blue-500",
        widthClassName,
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/* ── ToolbarDropdown ── */

export function ToolbarDropdown({
  value,
  onChange,
  options,
  placeholder = "All",
  className = "",
  width = "w-48",
}: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={cn("relative shrink-0", width, className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-[2px] border border-slate-300 bg-white px-2 text-xs text-slate-800 hover:bg-slate-50 leading-none"
      >
        <span className="truncate">{sel ? sel.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-[4px] border border-slate-200 bg-white py-1 shadow-md ring-1 ring-black/5">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                "flex h-8 w-full items-center gap-2 px-3 text-xs text-left hover:bg-slate-100",
                o.value === value ? "font-medium text-slate-950" : "text-slate-800"
              )}
            >
              {o.value === value ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
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

/* ── ToolbarSeparator ── */

export function ToolbarSeparator({ className }: { className?: string }) {
  return <div className={cn("mx-1 h-5 w-px bg-slate-200", className)} />;
}

/* ── PageToolbar ── */

export function PageToolbar({
  searchValue,
  searchPlaceholder,
  onSearchChange,

  leftWidthClass = LEFT_COLUMN_WIDTH_CLASS,
  leftSlot,

  filters,
  actions,
  rightActions,
  statusSlot,

  className,
}: PageToolbarProps) {
  const hasSearch = leftSlot !== undefined || searchValue !== undefined || onSearchChange !== undefined;

  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center overflow-hidden border-b border-slate-200 bg-slate-50",
        "font-windows text-xs select-none",
        className
      )}
    >
      {/* ── Left section: search or custom slot ── */}
      <div
        className={cn(
          "flex h-full shrink-0 items-center border-r border-slate-300 px-2",
          leftWidthClass
        )}
      >
        {leftSlot ? (
          <div className="w-full">{leftSlot}</div>
        ) : hasSearch ? (
          <div className="w-full">
            <ToolbarSearch
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={onSearchChange}
            />
          </div>
        ) : statusSlot ? (
          <div className="w-full">{statusSlot}</div>
        ) : null}
      </div>

      {/* ── Main section: filters → spacer → actions → rightActions ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 h-full">
        {statusSlot && (
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
            {statusSlot}
          </div>
        )}

        {filters && (
          <div className="flex items-center gap-2 shrink-0">{filters}</div>
        )}

        {/* Spacer — prevents filters and actions from touching */}
        {(statusSlot || filters || actions || rightActions) && (
          <div className="flex-1 min-w-0" />
        )}

        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}

        {rightActions && (
          <>
            {actions && <ToolbarSeparator />}
            <div className="flex items-center gap-2 shrink-0">{rightActions}</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── PageToolbarProps type export ── */

export type { PageToolbarProps };

/* ── Optional common icons helper ── */

export const ToolbarIcons = {
  New: <Plus className="h-4 w-4" />,
  Save: <Save className="h-4 w-4" />,
  Refresh: <RefreshCw className="h-4 w-4" />,
  Delete: <Trash2 className="h-4 w-4" />,
  Export: <Download className="h-4 w-4" />,
};
