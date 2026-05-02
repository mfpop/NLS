import type { ReactNode } from "react";

interface ModulePageProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function ModulePage({ title, description, icon }: ModulePageProps) {
  return (
    <section className="module-page">
      <header className="module-page__header">
        <div className="module-page__icon">{icon}</div>
        <div>
          <h1 className="module-page__title">{title}</h1>
          <p className="module-page__description">{description}</p>
        </div>
      </header>
    </section>
  );
}
