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
        <div className="shrink-0 flex items-center gap-0.5 border-b border-slate-300 bg-white px-2 dark:border-slate-600 dark:bg-slate-900 h-10 select-none">
          {toolbar}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center gap-5 px-5 text-xs text-slate-500 dark:text-slate-300 font-medium h-10">
          {footer}
        </div>
      )}
    </div>
  );
}
