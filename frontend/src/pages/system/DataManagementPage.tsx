import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Database, Factory, Layers, Package, Search, Users, GitBranch, Cpu, AlertTriangle, BarChart3, Activity } from "lucide-react";
import { GlobalSearchDialog, InfoBanner } from "./data-management/shared";
import { theme } from "../../styles/themeTokens";

const structureMenu = [
  { label: "Plant Structure",     icon: Factory,   href: "/system/data-management/plant" },
  { label: "Production Lines",    icon: GitBranch, href: "/system/data-management/production-lines" },
  { label: "Departments",         icon: Layers,    href: "/system/data-management/departments" },
  { label: "Resource Groups",     icon: Users,     href: "/system/data-management/resource-groups" },
  { label: "Resources",           icon: Cpu,       href: "/system/data-management/resources" },
  { label: "Reference Tables",    icon: Package,   href: "/system/data-management/references" },
  { label: "Full Structure View",  icon: GitBranch, href: "/system/data-management/structure" },
];

const summaryCards = [
  { label: "Total Plants", value: "3", icon: Factory, sub: "2 active · 1 inactive", color: theme.iconBoxBlue, href: "/system/data-management/plant" },
  { label: "Active Lines", value: "6", icon: GitBranch, sub: "Across 2 plants", color: theme.iconBoxAmber, href: "/system/data-management/plant" },
  { label: "Total Resources", value: "12", icon: Cpu, sub: "8 running · 1 down · 1 maint", color: theme.iconBoxTeal, href: "/system/data-management/resources" },
  { label: "Avg Utilization", value: "67%", icon: Activity, sub: "3 resources >85% load", color: theme.typeDepartment, href: "/system/data-management/resources" },
];

export function DataManagementPage() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <section className={`p-0 m-0 flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <header className={`flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4 ${theme.header}`}>
        <div className="flex items-center gap-4">
          <div className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Database className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <h1 className={`text-lg font-semibold tracking-tight ${theme.textPrimary}`}>Data Management</h1>
            <p className={`text-xs ${theme.textSecondary}`}>Digital plant model with live operational context</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSearchOpen(true)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${theme.buttonSecondary}`} aria-label="Search across plants, groups, tables">
            <Search className="h-4 w-4 stroke-current" />
            <span className="hidden sm:inline text-xs">Search</span>
            <kbd className={`hidden rounded px-1.5 py-0.5 text-[10px] sm:inline ${theme.kbd}`}>Ctrl+K</kbd>
          </button>
          <div className="relative">
            <button type="button" className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${theme.buttonSecondary}`} onClick={() => setOpen(!open)} aria-expanded={open}>
              <Layers className="h-4 w-4 stroke-current" />
              Structure
              <ChevronDown className={`h-4 w-4 stroke-current transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className={`absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border py-1 shadow-lg ${theme.dropdown}`}>
                  {structureMenu.map((item) => (
                    <Link key={item.href} to={item.href} className={`flex items-center gap-3 px-4 py-2 text-sm ${theme.textPrimary} ${theme.interactiveRow} transition-colors`} onClick={() => setOpen(false)}>
                      <item.icon className={`h-4 w-4 ${theme.iconSubtle} stroke-current`} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={`flex-1 overflow-y-auto ${theme.page} p-6`}>
        <InfoBanner message="CNC Lathe 1 is DOWN — Line B flow impacted. 1 resource in maintenance." />

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <button key={card.label} type="button" onClick={() => navigate(card.href)}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm active:scale-[0.98] ${theme.card} ${theme.cardHover}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider ${theme.textSecondary}`}>{card.label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="h-4 w-4 stroke-current" />
                </span>
              </div>
              <div className={`text-2xl font-bold ${theme.textPrimary}`}>{card.value}</div>
              <div className={`mt-1 text-[11px] ${theme.textMuted}`}>{card.sub}</div>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${theme.textSecondary}`}>Production Structure</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {structureMenu.slice(0, 6).map((item) => (
              <Link key={item.href} to={item.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:shadow-sm active:scale-[0.98] ${theme.card} ${theme.cardHover}`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${theme.iconBoxSubtle}`}>
                  <item.icon className="h-4 w-4 stroke-current" />
                </div>
                <span className={`text-sm font-medium ${theme.textPrimary}`}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${theme.card}`}>
          <h3 className={`mb-2 text-xs font-semibold ${theme.textPrimary}`}>System Health Summary</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${theme.badgeActive}`}>
              <Activity className="h-4 w-4 stroke-current" />
              <span>6 lines running normally</span>
            </div>
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${theme.badgeCritical}`}>
              <AlertTriangle className="h-4 w-4 stroke-current" />
              <span>1 resource down</span>
            </div>
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${theme.badgeWarning}`}>
              <BarChart3 className="h-4 w-4 stroke-current" />
              <span>3 resources &gt;85% utilization</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
