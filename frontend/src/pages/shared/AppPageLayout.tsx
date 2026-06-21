import type { ReactNode } from "react";
import { PageHeader, type SystemMessage } from "@/pages/shared/PageHeader";

interface AppPageLayoutProps {
  icon: ReactNode;
  iconClass?: string;
  title: string;
  subtitle: string;
  systemMessage?: SystemMessage | null;
  onDismissSystemMessage?: () => void;
  headerChildren?: ReactNode;
  toolbar?: ReactNode;
  leftColumn?: ReactNode;
  leftColumnWidth?: string;
  footer?: ReactNode;
  children?: ReactNode;
}

const DEFAULT_ICON_CLASS = "bg-muted text-muted-foreground";
const DEFAULT_LEFT_WIDTH = "w-72";

export function AppPageLayout({ icon, iconClass = DEFAULT_ICON_CLASS, title, subtitle, systemMessage, onDismissSystemMessage, headerChildren, toolbar, leftColumn, leftColumnWidth = DEFAULT_LEFT_WIDTH, footer, children }: AppPageLayoutProps) {
  const hasLeftColumn = !!leftColumn;

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <PageHeader icon={icon} iconClass={iconClass} title={title} subtitle={subtitle} systemMessage={systemMessage} onDismissSystemMessage={onDismissSystemMessage}>
        {headerChildren}
      </PageHeader>
      {toolbar && (
        <div className="shrink-0">
          {toolbar}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        {hasLeftColumn ? (
          <div className="flex h-full min-h-0">
            <div className={`shrink-0 border-r border-border bg-muted/30 overflow-y-auto px-2 ${leftColumnWidth}`}>
              {leftColumn}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
      {footer && (
        <div className="shrink-0 flex h-10 items-center gap-5 border-t border-border bg-muted px-4 text-xs font-medium text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
