import type { ReactNode } from "react";

interface ListColumnPanelProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ListColumnPanel({ children, className = "", style }: ListColumnPanelProps) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden border-r border-border-major bg-muted ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

interface ListColumnHeaderProps {
  title: string;
  count?: number | string;
  children?: ReactNode;
}

export function ListColumnHeader({ title, count, children }: ListColumnHeaderProps) {
  return (
    <div className="shrink-0 flex h-9 items-center gap-2 border-b border-slate-200 px-3">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-300 truncate">{title}</span>
      {count !== undefined && (
        <span className="inline-flex items-center justify-center h-[18px] min-w-[22px] px-1.5 text-[11px] font-semibold rounded-sm border border-border bg-card text-muted-foreground whitespace-nowrap">
          {count}
        </span>
      )}
      {children}
    </div>
  );
}

interface ListColumnBodyProps {
  children: ReactNode;
  className?: string;
}

export function ListColumnBody({ children, className = "" }: ListColumnBodyProps) {
  return (
    <div className={`flex-1 min-h-0 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

interface ListColumnFooterProps {
  children?: ReactNode;
  className?: string;
}

export function ListColumnFooter({ children, className = "" }: ListColumnFooterProps) {
  return (
    <div className={`shrink-0 flex h-9 items-center gap-2 border-t border-slate-200 bg-muted px-3 text-xs text-slate-600 dark:text-slate-400 ${className}`}>
      {children}
    </div>
  );
}

interface ListColumnEmptyProps {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
}

export function ListColumnEmpty({ icon, message, action }: ListColumnEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-center px-4">
      {icon && <div className="text-slate-300 dark:text-slate-600 mb-2">{icon}</div>}
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
