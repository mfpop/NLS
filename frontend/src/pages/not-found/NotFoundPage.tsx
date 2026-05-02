import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Page Not Found</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">The page you requested does not exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-hover)]"
        >
          Go to Control Tower
        </Link>
      </div>
    </section>
  );
}
