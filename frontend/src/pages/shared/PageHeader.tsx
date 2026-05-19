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
    icon: <AlertCircle className="h-4 w-4 stroke-current shrink-0" />,
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-300 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: <CheckCircle className="h-4 w-4 stroke-current shrink-0" />,
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    icon: <Info className="h-4 w-4 stroke-current shrink-0" />,
  },
};

export function PageHeader({ icon, iconClass, title, subtitle, systemMessage, onDismissSystemMessage, children }: PageHeaderProps) {
  const msgStyle = systemMessage ? SYSTEM_MESSAGE_STYLES[systemMessage.type] : null;

  return (
    <header className={`flex h-16 shrink-0 items-center justify-between px-4 ${theme.header}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={`flex-none ${iconClass || "text-primary"}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className={`text-base font-bold tracking-tight leading-none ${theme.textPrimary}`}>{title}</h1>
          <p className={`mt-0 text-sm ${theme.textSecondary} truncate`}>{subtitle}</p>
        </div>
      </div>

      {systemMessage && msgStyle && (
        <div className={`flex-1 flex justify-center px-4`}>
          <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 ${msgStyle.bg} ${msgStyle.border} ${msgStyle.text}`}>
            {msgStyle.icon}
            <span className="text-[12px] font-medium">{systemMessage.text}</span>
            {onDismissSystemMessage && (
              <button type="button" onClick={onDismissSystemMessage} className="ml-1 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <X className="h-3 w-3 stroke-current" />
              </button>
            )}
          </div>
        </div>
      )}

      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}


    </header>
  );
}
