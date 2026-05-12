import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell } from "lucide-react";
import { CompanyDetailView } from "./components/CompanyDetailView";

const NAV_ITEMS = [
  { key: "company", label: "Company", to: "/system/production-structure/components", Icon: Landmark, colorActive: "text-white", bgActive: "bg-emerald-400 dark:bg-emerald-500", colorInactive: "text-emerald-600 dark:text-emerald-400", bgInactive: "bg-emerald-50 dark:bg-emerald-900/30" },
  { key: "plants", label: "Plants", to: "/system/production-structure/plants", Icon: Factory, colorActive: "text-white", bgActive: "bg-teal-400 dark:bg-teal-500", colorInactive: "text-teal-600 dark:text-teal-400", bgInactive: "bg-teal-50 dark:bg-teal-900/30" },
  { key: "line", label: "Line", to: "/system/production-structure/flow", Icon: TrendingUpDown, colorActive: "text-white", bgActive: "bg-amber-400 dark:bg-amber-500", colorInactive: "text-amber-600 dark:text-amber-400", bgInactive: "bg-amber-50 dark:bg-amber-900/30" },
  { key: "dept", label: "Dept", to: "/system/production-structure/departments", Icon: Layers, colorActive: "text-white", bgActive: "bg-purple-400 dark:bg-purple-500", colorInactive: "text-purple-600 dark:text-purple-400", bgInactive: "bg-purple-50 dark:bg-purple-900/30" },
  { key: "rg", label: "RG", to: "/system/production-structure/resource-groups", Icon: Component, colorActive: "text-white", bgActive: "bg-rose-400 dark:bg-rose-500", colorInactive: "text-rose-600 dark:text-rose-400", bgInactive: "bg-rose-50 dark:bg-rose-900/30" },
  { key: "resource", label: "Resource", to: "/system/production-structure/resources", Icon: Dumbbell, colorActive: "text-white", bgActive: "bg-slate-500 dark:bg-slate-400", colorInactive: "text-slate-600 dark:text-slate-400", bgInactive: "bg-slate-50 dark:bg-slate-800/40" },
];

export function CompanyComponentsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentKey = NAV_ITEMS.find((item) => location.pathname === item.to)?.key || "company";

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <PageHeader
        icon={<Landmark className="h-5 w-5 stroke-current" />}
        iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        title="Production Structure - Company"
        subtitle="Company root profile, global defaults, and production structure overview."
      />
      <div className="flex flex-1 overflow-hidden p-0 m-0">
        {/* ── Vertical colored nav tabs ── */}
        <div className="flex flex-col shrink-0" style={{ width: 28 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.Icon;
            const isActiveTab = currentKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.to)}
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
          <CompanyDetailView />
        </div>
      </div>
    </div>
  );
}
