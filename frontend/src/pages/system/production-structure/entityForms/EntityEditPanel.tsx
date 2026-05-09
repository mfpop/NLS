import { type ReactNode } from "react";
import { theme } from "@/styles/themeTokens";

interface EntityEditPanelProps {
  children: ReactNode;
  loading?: boolean;
  notFound?: boolean;
  error?: string | null;
}

export function EntityEditPanel({ children, loading, notFound }: EntityEditPanelProps) {
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${theme.page}`}>
        <div className="text-xs text-slate-400 dark:text-slate-500">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={`flex items-center justify-center h-full ${theme.page}`}>
        <div className="text-xs text-red-500">Entity not found.</div>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${theme.page}`}>
      {children}
    </div>
  );
}
