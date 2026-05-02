import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="p-0 m-0 space-y-6">
      <header className="border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-sm h-16 flex items-center">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">404 — Page Not Found</h1>
      </header>
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-8 text-center shadow-sm">
          <p className="text-sm text-[var(--text-secondary)]">The page you requested does not exist.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-hover)]"
          >
            Go to Control Tower
          </Link>
        </div>
      </div>
    </section>
  );
}

