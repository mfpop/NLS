import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Database, Factory, Layers, Package, Search, Users, GitBranch } from "lucide-react";
import { GlobalSearchDialog } from "./data-management/shared";

const forms = [
  { label: "Plant Structure", icon: Factory, href: "/system/data-management/plant" },
  { label: "Departments",     icon: Layers,  href: "/system/data-management/departments" },
  { label: "Resource Groups", icon: Users,   href: "/system/data-management/resource-groups" },
  { label: "Reference Tables", icon: Package, href: "/system/data-management/references" },
  { label: "Full Structure View", icon: GitBranch, href: "/system/data-management/structure" },
];

export function DataManagementPage() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <section className="p-0 m-0">
      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <header className="flex items-center justify-between gap-4 border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-sm h-16">
        <div className="flex items-center gap-4">
          <div className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Data Management</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
              Configure plant structure, departments, resource groups, and manage reference tables for your production environment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Global search button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 transition-colors"
            aria-label="Search across plants, groups, tables"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Search</span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 hidden sm:inline">Ctrl+K</kbd>
          </button>

          {/* Forms dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 transition-colors"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
            >
              <Layers className="h-4 w-4" />
              Forms
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {forms.map((form) => (
                    <Link
                      key={form.href}
                      to={form.href}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <form.icon className="h-4 w-4 text-slate-400" />
                      {form.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </section>
  );
}

