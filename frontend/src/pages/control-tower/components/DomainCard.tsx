interface DomainCardProps {
  title: string;
  rows: Array<{ label: string; value: string | number }>;
}

export function DomainCard({ title, rows }: DomainCardProps) {
  return (
    <article className="ct-domain-card">
      <h3 className="ct-domain-card__title">{title}</h3>
      <dl className="ct-domain-card__rows">
        {rows.map((row) => (
          <div key={row.label} className="ct-domain-card__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
