import { theme } from "../../../../styles/themeTokens";

/* ── Types ── */

interface SummaryItem {
  label: string;
  value: string | number;
}

interface SummaryBlockProps {
  items: SummaryItem[];
}

/* ── Component ── */

export function SummaryBlock({ items }: SummaryBlockProps) {
  return (
    <div className={`rounded-lg border px-3 py-1.5 ${theme.card}`}>
      <h3 className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${theme.textSecondary}`}>
        Structure Summary
      </h3>
      <div className="text-xs text-muted-foreground">
        {items.map((item, idx) => (
          <span key={idx}>
            {idx > 0 && <span className="mx-1.5 text-muted-foreground">|</span>}
            {item.label}: <span className="font-medium text-muted-foreground">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Convenience presets ── */

export function PlantSummary({ lines, departments, groups, resources }: {
  lines: number; departments: number; groups: number; resources: number;
}) {
  return (
    <SummaryBlock items={[
      { label: "Lines", value: lines },
      { label: "Departments", value: departments },
      { label: "Resource Groups", value: groups },
      { label: "Resources", value: resources },
    ]} />
  );
}

export function LineSummary({ departments, groups, resources, models }: {
  departments: number; groups: number; resources: number; models: number;
}) {
  return (
    <SummaryBlock items={[
      { label: "Departments", value: departments },
      { label: "Resource Groups", value: groups },
      { label: "Resources", value: resources },
      { label: "Models", value: models },
    ]} />
  );
}

export function DepartmentSummary({ groups, resources }: {
  groups: number; resources: number;
}) {
  return (
    <SummaryBlock items={[
      { label: "Resource Groups", value: groups },
      { label: "Resources", value: resources },
    ]} />
  );
}

export function GroupSummary({ resources }: { resources: number }) {
  return (
    <SummaryBlock items={[
      { label: "Resources", value: resources },
    ]} />
  );
}
