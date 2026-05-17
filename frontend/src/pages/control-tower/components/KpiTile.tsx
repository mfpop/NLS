import { theme } from "../../../styles/themeTokens";

interface KpiTileProps {
  label: string;
  value: string | number;
  sub?: string;
  status?: "ok" | "warn" | "idle";
}

export function KpiTile({ label, value, sub, status = "idle" }: KpiTileProps) {
  const tone =
    status === "ok"
      ? `border-success ${theme.iconBoxEmerald}`
      : status === "warn"
        ? `border-warning ${theme.badgeWarning}`
        : `${theme.card}`;
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tone}`}>
      <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${theme.textMuted}`}>{label}</span>
      <span className={`mt-2 block text-2xl font-semibold ${theme.textPrimary}`}>{value}</span>
      {sub && <span className={`mt-1 block text-xs ${theme.textSecondary}`}>{sub}</span>}
    </div>
  );
}

