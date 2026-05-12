import { useNavigate, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell } from "lucide-react";
import { CompanyDetailView } from "./components/CompanyDetailView";
import { PlantsPage } from "./PlantsPage";
import { DepartmentsPage } from "./DepartmentsPage";
import { ResourceGroupsPage } from "./ResourceGroupsPage";
import { ResourcesPage } from "./ResourcesPage";
import { ProductionLinesPage } from "./ProductionLinesPage";

const NAV_ITEMS = [
  { key: "company", label: "Company", to: "?tab=company", Icon: Landmark, colorActive: "text-white", bgActive: "bg-emerald-400 dark:bg-emerald-500", colorInactive: "text-emerald-600 dark:text-emerald-400", bgInactive: "bg-emerald-50 dark:bg-emerald-900/30", subtitle: "Company root profile, global defaults, and production structure overview." },
  { key: "plants", label: "Plants", to: "?tab=plants", Icon: Factory, colorActive: "text-white", bgActive: "bg-teal-400 dark:bg-teal-500", colorInactive: "text-teal-600 dark:text-teal-400", bgInactive: "bg-teal-50 dark:bg-teal-900/30", subtitle: "Facilities, locations, and production sites." },
  { key: "line", label: "Line", to: "?tab=line", Icon: TrendingUpDown, colorActive: "text-white", bgActive: "bg-amber-400 dark:bg-amber-500", colorInactive: "text-amber-600 dark:text-amber-400", bgInactive: "bg-amber-50 dark:bg-amber-900/30", subtitle: "Production lines and flow paths." },
  { key: "dept", label: "Dept", to: "?tab=dept", Icon: Layers, colorActive: "text-white", bgActive: "bg-purple-400 dark:bg-purple-500", colorInactive: "text-purple-600 dark:text-purple-400", bgInactive: "bg-purple-50 dark:bg-purple-900/30", subtitle: "Organizational departments and work centers." },
  { key: "rg", label: "RG", to: "?tab=rg", Icon: Component, colorActive: "text-white", bgActive: "bg-rose-400 dark:bg-rose-500", colorInactive: "text-rose-600 dark:text-rose-400", bgInactive: "bg-rose-50 dark:bg-rose-900/30", subtitle: "Work cells, teams, and resource groupings." },
  { key: "resource", label: "Resource", to: "?tab=resource", Icon: Dumbbell, colorActive: "text-white", bgActive: "bg-slate-500 dark:bg-slate-400", colorInactive: "text-slate-600 dark:text-slate-400", bgInactive: "bg-slate-50 dark:bg-slate-800/40", subtitle: "Machines, workstations, and production assets." },
];

function getTitle(key: string): string {
  const map: Record<string, string> = {
    company: "Production Structure - Company",
    plants: "Production Structure - Plants",
    line: "Production Lines",
    dept: "Departments",
    rg: "Resource Groups",
    resource: "Resources",
  };
  return map[key] || "Production Structure";
}

export function CompanyComponentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tab = params.get("tab") || "company";
  const currentItem = NAV_ITEMS.find((i) => i.key === tab) || NAV_ITEMS[0];

  const handleNav = (to: string) => {
    if (to.startsWith("?")) {
      navigate(location.pathname + to, { replace: true });
    } else {
      navigate(to);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <PageHeader
        icon={<currentItem.Icon className="h-5 w-5 stroke-current" />}
        iconClass={`${currentItem.bgInactive} ${currentItem.colorInactive}`}
        title={getTitle(tab)}
        subtitle={currentItem.subtitle}
      />
      <div className="flex flex-1 overflow-hidden p-0 m-0">
        {/* ── Vertical colored nav tabs ── */}
        <div className="flex flex-col shrink-0" style={{ width: 28 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.Icon;
            const isActiveTab = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNav(item.to)}
                className={`flex items-center justify-center transition-all duration-150 font-['Segoe_UI',system-ui,sans-serif] ${
                  isActiveTab
                    ? `${item.bgActive} ${item.colorActive} rounded-l-lg shadow-sm z-10`
                    : `${item.bgInactive} ${item.colorInactive} hover:brightness-95 dark:hover:brightness-125`
                }`}
                style={{ flex: "1 0 auto", minHeight: 0, ...(isActiveTab ? { marginLeft: -1, clipPath: "inset(0 0 0 0 round 8px 0 0 8px)" } : {}) }}
                title={item.label}
              >
                <div className="flex items-center gap-1" style={{ transform: "rotate(-90deg)", transformOrigin: "center", whiteSpace: "nowrap" }}>
                  <span className={`flex items-center justify-center w-3.5 h-3.5 ${isActiveTab ? "text-white" : item.colorInactive}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className={`text-[9px] font-semibold ${isActiveTab ? "text-white" : item.colorInactive}`}>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
        {/* ── Divider ── */}
        <div className="shrink-0 bg-slate-200/60 dark:bg-slate-700/60" style={{ width: 1 }} />
        {/* ── Content ── */}
        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          {tab === "plants" && <PlantsPage />}
          {tab === "line" && <ProductionLinesPage />}
          {tab === "dept" && <DepartmentsPage />}
          {tab === "rg" && <ResourceGroupsPage />}
          {tab === "resource" && <ResourcesPage />}
          {tab === "company" && <CompanyDetailView />}
        </div>
      </div>
    </div>
  );
}
