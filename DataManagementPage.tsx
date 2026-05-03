import { useState } from ""react"";
import { Link, useNavigate } from ""react-router-dom"";
import { ChevronDown, Database, Factory, Layers, Package, Search, Users, GitBranch, Cpu, AlertTriangle, BarChart3, Activity } from ""lucide-react"";
import { GlobalSearchDialog, InfoBanner } from ""./data-management/shared"";

const forms = [
  { label: ""Plant Structure"",     icon: Factory,   href: ""/system/data-management/plant"" },
  { label: ""Production Lines"",    icon: GitBranch, href: ""/system/data-management/plant"" },
  { label: ""Departments"",         icon: Layers,    href: ""/system/data-management/departments"" },
  { label: ""Resource Groups"",     icon: Users,     href: ""/system/data-management/resource-groups"" },
  { label: ""Resources"",           icon: Cpu,       href: ""/system/data-management/resources"" },
  { label: ""Reference Tables"",    icon: Package,   href: ""/system/data-management/references"" },
  { label: ""Full Structure View"",  icon: GitBranch, href: ""/system/data-management/structure"" },
];

const summaryCards = [
  { label: ""Total Plants"", value: ""3"", icon: Factory, sub: ""2 active · 1 inactive"", color: ""bg-blue-50 text-blue-600"", href: ""/system/data-management/plant"" },
  { label: ""Active Lines"", value: ""6"", icon: GitBranch, sub: ""Across 2 plants"", color: ""bg-amber-50 text-amber-600"", href: ""/system/data-management/plant"" },
  { label: ""Total Resources"", value: ""12"", icon: Cpu, sub: ""8 running · 1 down · 1 maint"", color: ""bg-teal-50 text-teal-600"", href: ""/system/data-management/resources"" },
  { label: ""Avg Utilization"", value: ""67%"", icon: Activity, sub: ""3 resources >85% load"", color: ""bg-indigo-50 text-indigo-600"", href: ""/system/data-management/resources"" },
];

export function DataManagementPage() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <section className=""p-0 m-0 flex h-full flex-col overflow-hidden"" style={{ minHeight: 0 }}>
      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <header className=""flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-1)] px-6 py-4"">
        <div className=""flex items-center gap-4"">
          <div className=""inline-flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"">
            <Database className=""h-5 w-5"" />
          </div>
          <div>
            <h1 className=""text-lg font-semibold tracking-tight text-[var(--text-primary)]"">Data Management</h1>
            <p className=""text-xs text-[var(--text-secondary)]"">Digital plant model with live operational context</p>
          </div>
        </div>
        <div className=""flex items-center gap-2"">
          <button type=""button"" onClick={() => setSearchOpen(true)} className=""flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"" aria-label=""Search across plants, groups, tables"">
            <Search className=""h-4 w-4"" />
            <span className=""hidden sm:inline text-xs"">Search</span>
            <kbd className=""rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 hidden sm:inline"">Ctrl+K</kbd>
          </button>
          <div className=""relative"">
            <button type=""button"" className=""flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"" onClick={() => setOpen(!open)} aria-expanded={open}>
              <Layers className=""h-4 w-4"" />
              Forms
              <ChevronDown className={""h-4 w-4 transition-transform "" + (open ? ""rotate-180"" : """")} />
            </button>
            {open && (
              <>
                <div className=""fixed inset-0 z-10"" onClick={() => setOpen(false)} />
                <div className=""absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"">
                  {forms.map((form) => (
                    <Link key={form.href} to={form.href} className=""flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"" onClick={() => setOpen(false)}>
                      <form.icon className=""h-4 w-4 text-slate-400"" />
                      {form.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className=""flex-1 overflow-y-auto bg-[var(--page-bg)] p-6"">
        <InfoBanner message=""CNC Lathe 1 is DOWN — Line B flow impacted. 1 resource in maintenance."" />

        <div className=""mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4"">
          {summaryCards.map((card) => (
            <button
              key={card.label}
              type=""button""
              onClick={() => navigate(card.href)}
              className=""rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.98]""
            >
              <div className=""mb-2 flex items-center justify-between"">
                <span className=""text-xs font-semibold uppercase tracking-wider text-slate-500"">{card.label}</span>
                <span className={""flex h-8 w-8 items-center justify-center rounded-lg "" + card.color}>
                  <card.icon className=""h-4 w-4"" />
                </span>
              </div>
              <div className=""text-2xl font-bold text-slate-900"">{card.value}</div>
              <div className=""mt-1 text-[11px] text-slate-400"">{card.sub}</div>
            </button>
          ))}
        </div>

        <div className=""mb-6"">
          <h2 className=""mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600"">Production Structure</h2>
          <div className=""grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"">
            {forms.slice(0, 6).map((form) => (
              <Link
                key={form.href}
                to={form.href}
                className=""flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.98]""
              >
                <div className=""flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"">
                  <form.icon className=""h-4 w-4"" />
                </div>
                <span className=""text-sm font-medium text-slate-800"">{form.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className=""rounded-xl border border-slate-200 bg-white p-4"}>
          <h3 className=""mb-2 text-xs font-semibold text-slate-700"">System Health Summary</h3>
          <div className=""grid grid-cols-1 gap-2 sm:grid-cols-3"">
            <div className=""flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"">
              <Activity className=""h-4 w-4"" />
              <span>6 lines running normally</span>
            </div>
            <div className=""flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"">
              <AlertTriangle className=""h-4 w-4"" />
              <span>1 resource down</span>
            </div>
            <div className=""flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"">
              <BarChart3 className=""h-4 w-4"" />
              <span>3 resources >85% utilization</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}