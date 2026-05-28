import { Database, Upload, RefreshCw, Search, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const cards = [
  { label: "ERP Import", icon: Upload, desc: "Upload files and execute ERP imports", to: "/system/erp-data/import", color: "text-violet-600", bg: "bg-violet-100" },
  { label: "ERP Patterns", icon: Briefcase, desc: "Configure import patterns and field mappings", to: "/system/erp-data/erp-patterns", color: "text-rose-600", bg: "bg-rose-100" },
];

const statCards = [
  { label: "Total Sources", value: "\u2014", color: "text-foreground" },
  { label: "Active Jobs", value: "\u2014", color: "text-emerald-600" },
  { label: "Pending", value: "\u2014", color: "text-amber-600" },
  { label: "Failed Today", value: "\u2014", color: "text-red-600" },
];

const inputClass = `h-8 w-full rounded bg-card px-3 py-1 text-xs outline-none text-muted-foreground placeholder:text-muted-foreground transition-colors focus:border-b-2 focus:border-info`;
const buttonClass = "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

export function ERPDataPage() {
  const navigate = useNavigate();
  return (
    <AppPageLayout
      title="ERP Data"
      subtitle="Configure and monitor ERP integration, file imports, and data synchronization."
      icon={<Database />}
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex h-9 items-center gap-2 border-b border-border/35 bg-muted px-3 select-none">
          <div className="relative w-72">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" placeholder="Search ERP Data..." className={inputClass} />
          </div>
          <div className="flex-1" />
          <button type="button" className={buttonClass}>
            <RefreshCw className="h-4 w-4 stroke-current" />
            <span>Refresh</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl border border-border/20 bg-card p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</div>
                <div className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} onClick={() => navigate(c.to)} className="rounded-xl border border-border/20 bg-card p-4 hover:border-border/40 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg ${c.bg}`}>
                    <c.icon className={`h-5 w-5 stroke-current ${c.color}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{c.label}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{c.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
