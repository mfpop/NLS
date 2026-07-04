import type { ReactNode } from "react";
import { ToolbarSearch } from "./Toolbar";

interface SplitToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchDebouncing?: boolean;
  filters?: ReactNode;
  actions?: ReactNode;
  leftWidth?: string;
  className?: string;
}

export function SplitToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchDebouncing = false,
  filters,
  actions,
  leftWidth = "w-[20%]",
  className = "",
}: SplitToolbarProps) {
  return (
    <div className={`flex h-10 shrink-0 items-center border-b border-border-major bg-muted select-none ${className}`}>
      <div className={`${leftWidth} min-w-[240px] max-w-[360px] border-r border-border-major dark:border-muted/30 px-2 flex items-center h-full`}>
        <div className="w-full">
          <ToolbarSearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            debouncing={searchDebouncing}
          />
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
