import type { ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { theme } from "../../styles/themeTokens";

export type SystemMessageType = "error" | "success" | "info";

export interface SystemMessage {
  text: string;
  type: SystemMessageType;
}

interface PageHeaderProps {
  icon: ReactNode;
  iconClass?: string;
  title: string;
  subtitle: string;
  systemMessage?: SystemMessage | null;
  onDismissSystemMessage?: () => void;
  children?: ReactNode;
}

const SYSTEM_MESSAGE_STYLES: Record<SystemMessageType, { bg: string; border: string; text: string; icon: ReactNode }> = {
  error: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-300 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-300 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    icon: <Info className="h-4 w-4" />,
  },
};

export function PageHeader({ icon, iconClass, title, subtitle, systemMessage, onDismissSystemMessage, children }: PageHeaderProps) {
  const msgStyle = systemMessage ? SYSTEM_MESSAGE_STYLES[systemMessage.type] : null;

  return (
    <header className={`h-16 border-b border-border flex items-center ${theme.header}`}>
      <div className="flex items-center gap-3 min-w-0 pl-10 pr-4 w-full">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${iconClass || "text-muted-foreground"}`}>
          {icon}
        </div>
        <div className="flex min-w-0 flex-col items-start justify-center">
          <div className={`truncate font-semibold leading-tight ${theme.textPrimary}`}>{title}</div>
          {subtitle && <div className={`truncate text-sm leading-tight ${theme.textSecondary}`}>{subtitle}</div>}
        </div>
        {systemMessage && msgStyle && (
          <div className={`flex items-center gap-2 px-3 py-1.5 border ${msgStyle.bg} ${msgStyle.border} ${msgStyle.text}`}>
            {msgStyle.icon}
            <span className="text-xs">{systemMessage.text}</span>
            {onDismissSystemMessage && (
              <button type="button" onClick={onDismissSystemMessage}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        {children && (
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
