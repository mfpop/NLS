import type { ReactNode } from "react";
import { theme } from "../../styles/themeTokens";

interface ModulePageProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function ModulePage({ title, description, icon }: ModulePageProps) {
  return (
    <section className="p-0 m-0">
      <header className={`flex items-center gap-3 border shadow-sm h-16 ${theme.header}`}>
        <div className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>{icon}</div>
        <div>
          <h1 className={`text-xl font-semibold tracking-tight ${theme.textPrimary}`}>{title}</h1>
          <p className={`mt-0.5 max-w-3xl text-sm ${theme.textSecondary}`}>{description}</p>
        </div>
      </header>
    </section>
  );
}

