interface DomainCardProps {
  title: string;
  rows: Array<{ label: string; value: string | number }>;
}

export function DomainCard({ title, rows }: DomainCardProps) {
  return (
    <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <dl className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
            <dt className="text-[var(--text-secondary)]">{row.label}</dt>
            <dd className="font-semibold text-[var(--text-primary)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
