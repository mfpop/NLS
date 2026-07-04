import { type ReactNode } from "react";
import { PageToolbar, type PageToolbarProps } from "@/components/layout/PageToolbar";
import { RecordListPanel, type RecordListPanelProps } from "@/components/shared/RecordListPanel";
import { LEFT_COLUMN_WIDTH_CLASS } from "./layoutWidths";

/* ── Page Header ── */

interface PageHeaderSlotProps {
  icon?: ReactNode;
  iconClass?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

function PageHeaderSlot({ icon, iconClass, title, subtitle, children }: PageHeaderSlotProps) {
  return (
    <header className="h-16 shrink-0 border-b border-border bg-muted flex items-center px-4">
      <div className="flex items-center gap-3 min-w-0 w-full">
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconClass || "bg-primary/10 text-primary"}`}>
            {icon}
          </div>
        )}
        <div className="flex min-w-0 flex-col items-start justify-center">
          <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-2 shrink-0 ml-auto">{children}</div>}
      </div>
    </header>
  );
}

/* ── TwoColumnPageTemplate ── */

interface TwoColumnPageTemplateProps<T> {
  /** Page title shown in header */
  title: string;
  /** Page subtitle shown below title */
  subtitle?: string;
  /** Optional icon element shown before title */
  icon?: ReactNode;
  /** CSS classes for the icon wrapper (e.g. "bg-accent/15 text-accent-foreground") */
  iconClass?: string;
  /** Props forwarded to PageToolbar. If omitted, no toolbar is shown. */
  toolbarProps?: PageToolbarProps;
  /** Props forwarded to RecordListPanel for the left column. If omitted, no left column. */
  leftPanelProps?: RecordListPanelProps<T>;
  /** Custom left column children. When provided, replaces RecordListPanel in the left column. */
  leftChildren?: ReactNode;
  /** Width class for the left column (default "w-[20%]") */
  leftWidthClass?: string;
  /** Optional header content shown at the top of the right column */
  rightHeader?: ReactNode;
  /** Main right column content (alias for children) */
  rightContent?: ReactNode;
  /** Main right column content */
  children?: ReactNode;
  /** Optional footer content at the bottom of the right column */
  rightFooter?: ReactNode;
  /** Left section of the page footer */
  footerLeft?: ReactNode;
  /** Center section of the page footer */
  footerCenter?: ReactNode;
  /** Right section of the page footer */
  footerRight?: ReactNode;
  /** Additional CSS classes for the root element */
  className?: string;
}

export function TwoColumnPageTemplate<T>({
  title,
  subtitle,
  icon,
  iconClass,
  toolbarProps,
  leftPanelProps,
  leftChildren,
  leftWidthClass = LEFT_COLUMN_WIDTH_CLASS,
  rightHeader,
  rightContent,
  children,
  rightFooter,
  footerLeft,
  footerCenter,
  footerRight,
  className = "",
}: TwoColumnPageTemplateProps<T>) {
  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden bg-muted ${className}`}>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* Page Header */}
      <PageHeaderSlot icon={icon} iconClass={iconClass} title={title} subtitle={subtitle} />

      {/* Page Toolbar — leftWidth matches the left column */}
      {toolbarProps && (
        <div className="shrink-0">
          <PageToolbar
            {...toolbarProps}
            leftWidthClass={toolbarProps.leftWidthClass ?? leftWidthClass}
          />
        </div>
      )}

      {/* 2-Column Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-muted">
        {/* Left Column - RecordListPanel or custom children */}
        {(leftPanelProps || leftChildren) && (
          <div className={`border-r border-border bg-muted overflow-hidden ${leftWidthClass}`}>
            {leftChildren ?? (
              <RecordListPanel
                {...leftPanelProps!}
                className="border-r-0 bg-muted"
              />
            )}
          </div>
        )}

        {/* Right Column - Detail Content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted">
          {rightHeader && (
            <div className="shrink-0 border-b border-border bg-muted px-3 py-2">
              {rightHeader}
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-auto bg-muted">
            {rightContent ?? children}
          </div>
          {rightFooter && (
            <div className="shrink-0 border-t border-border bg-muted px-3 py-2">
              {rightFooter}
            </div>
          )}
        </div>
      </div>

      {/* Page Footer */}
      {(footerLeft || footerCenter || footerRight) && (
        <div className="h-10 shrink-0 border-t border-border bg-muted px-3 text-xs text-muted-foreground flex items-center justify-between">
          <span>{footerLeft}</span>
          <span>{footerCenter}</span>
          <span>{footerRight}</span>
        </div>
      )}
    </div>
  );
}
