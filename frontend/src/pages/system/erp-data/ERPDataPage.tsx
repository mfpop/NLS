import { Database, HardDrive, Upload, Clock, AlertTriangle, Route, Activity, Eye, GitCompare, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const cards = [
  { label: "Import Sources", icon: HardDrive, desc: "Configure file import sources and paths", to: "/system/erp-data/import-sources", color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Import Jobs", icon: Upload, desc: "View and trigger file import jobs", to: "/system/erp-data/import-jobs", color: "text-indigo-600", bg: "bg-indigo-100" },
  { label: "File Preview", icon: Eye, desc: "Preview parsed file content before import", to: "/system/erp-data/file-preview", color: "text-sky-600", bg: "bg-sky-100" },
  { label: "Mapping Rules", icon: Route, desc: "Define field mappings between ERP and system", to: "/system/erp-data/mapping-rules", color: "text-teal-600", bg: "bg-teal-100" },
  { label: "Compare Results", icon: GitCompare, desc: "Review differences before applying", to: "/system/erp-data/compare-results", color: "text-indigo-600", bg: "bg-indigo-100" },
  { label: "Validation Errors", icon: AlertTriangle, desc: "Review and resolve import validation issues", to: "/system/erp-data/validation-errors", color: "text-amber-600", bg: "bg-amber-100" },
  { label: "File History", icon: Clock, desc: "Audit log of all imported files", to: "/system/erp-data/file-history", color: "text-slate-500", bg: "bg-slate-100" },
  { label: "Integration Status", icon: Activity, desc: "Monitor integration health and connectivity", to: "/system/erp-data/integration-status", color: "text-emerald-600", bg: "bg-emerald-100" },
];

const statCards = [
  { label: "Total Sources", value: "\u2014", color: "text-foreground" },
  { label: "Active Jobs", value: "\u2014", color: "text-emerald-600" },
  { label: "Pending", value: "\u2014", color: "text-amber-600" },
  { label: "Failed Today", value: "\u2014", color: "text-red-600" },
];

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-colors`;

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
