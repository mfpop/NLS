import type { ReactNode } from "react";

interface ModulePageProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function ModulePage({ title, description, icon }: ModulePageProps) {
  return (
    <section className="p-6">
      <header className="flex items-start gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-sm">
        <div className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </header>
    </section>
  );
}
