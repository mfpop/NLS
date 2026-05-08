import { Building2, GitBranch, Layers, Users, Monitor } from "lucide-react";
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
  { label: "Plants", path: "/system/production-structure/plant", icon: Building2, color: "text-blue-600 dark:text-blue-400" },
  { label: "Lines", path: "/system/production-structure/production-lines", icon: GitBranch, color: "text-amber-600 dark:text-amber-400" },
  { label: "Depts", path: "/system/production-structure/departments", icon: Layers, color: "text-purple-600 dark:text-purple-400" },
  { label: "Groups", path: "/system/production-structure/resource-groups", icon: Users, color: "text-blue-600 dark:text-blue-400" },
  { label: "Resources", path: "/system/production-structure/resources", icon: Monitor, color: "text-gray-600 dark:text-gray-400" },
];

export function GlobalNav({ counts }: GlobalNavProps) {
  const navigate = useNavigate();
  return (
    <nav className="flex flex-col min-h-0 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/60 w-14 shrink-0" aria-label="Entity navigation">
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
              className="flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group relative"
              title={`${count} ${item.label} — Click to browse`}
            >
              <Icon className={`h-4 w-4 stroke-current ${item.color}`} />
              <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{count}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
