interface KpiTileProps {
  label: string;
  value: string | number;
  sub?: string;
  status?: "ok" | "warn" | "idle";
}

export function KpiTile({ label, value, sub, status = "idle" }: KpiTileProps) {
  return (
    <div className={"ct-kpi-tile ct-kpi-tile--" + status}>
      <span className="ct-kpi-tile__label">{label}</span>
      <span className="ct-kpi-tile__value">{value}</span>
      {sub && <span className="ct-kpi-tile__sub">{sub}</span>}
    </div>
  );
}
