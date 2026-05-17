import type { ReactNode } from "react";
import { theme } from "../../styles/themeTokens";

interface PageHeaderProps {
  icon: ReactNode;
  iconClass?: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

export function PageHeader({ icon, iconClass, title, subtitle, children }: PageHeaderProps) {
  return (
    <header className={`flex h-16 shrink-0 items-center justify-between px-5 ${theme.header}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex-none ${iconClass || "text-primary"}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className={`text-lg font-bold tracking-tight leading-none ${theme.textPrimary}`}>{title}</h1>
          <p className={`mt-0.5 text-sm ${theme.textSecondary} truncate`}>{subtitle}</p>
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </header>
  );
}
