import { theme } from "../../../styles/themeTokens";

interface DomainCardProps {
  title: string;
  rows: Array<{ label: string; value: string | number }>;
}

export function DomainCard({ title, rows }: DomainCardProps) {
  return (
    <article className={`rounded-xl border p-5 shadow-sm ${theme.card}`}>
      <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>{title}</h3>
      <dl className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
            <dt className={theme.textSecondary}>{row.label}</dt>
            <dd className={`font-semibold ${theme.textPrimary}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
    </article>
  );
}

