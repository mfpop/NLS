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
    <header className={`flex shrink-0 items-center justify-between border-b px-6 ${theme.header}`} style={{ height: "64px" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg ${iconClass || theme.iconBoxEmerald}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>{title}</h1>
          <p className={`text-xs ${theme.textSecondary} truncate`}>{subtitle}</p>
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
