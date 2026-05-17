import type { ReactNode } from "react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { theme } from "../../styles/themeTokens";

interface AppPageLayoutProps {
  icon: ReactNode;
  iconClass?: string;
  title: string;
  subtitle: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

const DEFAULT_ICON_CLASS = `${theme.iconBoxEmerald}`;

export function AppPageLayout({ icon, iconClass = DEFAULT_ICON_CLASS, title, subtitle, toolbar, footer, children }: AppPageLayoutProps) {
  return (
    <div className="flex flex-col overflow-hidden h-full">
      <PageHeader icon={icon} iconClass={iconClass} title={title} subtitle={subtitle} />
      {toolbar && (
        <div className="shrink-0 flex h-10 items-center gap-0.5 border-b border-border bg-card px-2 select-none">
          {toolbar}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
      {footer && (
        <div className="shrink-0 flex h-14 items-center gap-5 border-t border-border bg-muted px-5 text-xs font-medium text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
