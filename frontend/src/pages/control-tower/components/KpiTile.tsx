interface KpiTileProps {
  label: string;
  value: string | number;
  sub?: string;
  status?: "ok" | "warn" | "idle";
}

export function KpiTile({ label, value, sub, status = "idle" }: KpiTileProps) {
  const tone =
    status === "ok"
      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
      : status === "warn"
        ? "border-[var(--warning)] bg-[var(--surface-2)]"
        : "border-[var(--border-soft)] bg-[var(--surface-1)]";

  return (
    <div className={"rounded-xl border p-4 shadow-sm " + tone}>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</span>
      <span className="mt-2 block text-2xl font-semibold text-[var(--text-primary)]">{value}</span>
      {sub && <span className="mt-1 block text-xs text-[var(--text-secondary)]">{sub}</span>}
    </div>
  );
}
