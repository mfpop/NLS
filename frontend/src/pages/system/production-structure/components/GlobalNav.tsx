import { Factory, TrendingUpDown, Layers, Component, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GlobalNavProps {
  counts?: {
    plants: number;
    lines: number;
    departments: number;
    groups: number;
    resources: number;
  } | null;
}

const items = [
  { label: "Plants", path: "/system/production-structure/plant", icon: Factory, color: "text-primary" },
  { label: "Lines", path: "/system/production-structure/production-lines", icon: TrendingUpDown, color: "text-warning" },
  { label: "Depts", path: "/system/production-structure/departments", icon: Layers, color: "text-info" },
  { label: "Groups", path: "/system/production-structure/resource-groups", icon: Component, color: "text-danger" },
  { label: "Resources", path: "/system/production-structure/resources", icon: Dumbbell, color: "text-muted-foreground" },
];

export function GlobalNav({ counts }: GlobalNavProps) {
  const navigate = useNavigate();
  return (
    <nav className="flex flex-col min-h-0 border-r border-border bg-muted w-14 shrink-0" aria-label="Entity navigation">
      <div className="flex flex-col items-center gap-0.5 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const count = counts
            ? item.label === "Groups"
              ? counts.groups
              : item.label === "Depts"
                ? counts.departments
                : item.label === "Resources"
                  ? counts.resources
                  : item.label === "Lines"
                    ? counts.lines
                    : item.label === "Plants"
                      ? counts.plants
                      : 0
            : 0;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-lg hover:bg-muted hover:bg-muted transition-colors group relative"
              title={`${count} ${item.label} — Click to browse`}
            >
              <Icon className={`h-4 w-4 stroke-current ${item.color}`} />
              <span className="text-[8px] font-semibold text-muted-foreground group-hover:text-muted-foreground dark:group-hover:text-muted-foreground transition-colors">{count}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
