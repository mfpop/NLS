import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

interface SplitToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  leftWidth?: string;
}

export function SplitToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
  leftWidth = "w-[20%]",
}: SplitToolbarProps) {
  return (
    <div className="flex h-10 shrink-0 items-center border-b border-border bg-white">
      <div className={`${leftWidth} min-w-[240px] max-w-[360px] border-r border-border px-2 flex items-center h-full`}>
        <div className="relative flex h-8 w-full items-center bg-slate-100 dark:bg-slate-800 rounded-[2px] overflow-hidden focus-within:after:absolute focus-within:after:bottom-0 focus-within:after:left-0 focus-within:after:h-[2px] focus-within:after:w-full focus-within:after:bg-sky-500">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-full w-full bg-transparent pl-3 pr-11 text-sm text-slate-800 placeholder:text-slate-500 outline-none"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Search className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      </div>
      <div className="flex flex-1 min-w-0 items-center gap-2 px-2 h-full">
        {filters && (
          <div className="flex items-center gap-2 shrink-0">
            {filters}
          </div>
        )}
        {actions && (
          <>
            <div className="flex-1 min-w-0" />
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          </>
        )}
      </div>
    </div>
  );
}
