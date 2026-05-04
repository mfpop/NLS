import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Database, Pencil, Download } from "lucide-react";
import {
  Breadcrumbs, SearchBar, FilterBar, EmptyState, StatusBadge,
  BulkCheckbox, DataManagementNav, PrimaryAction, ActionsDropdown
} from "./shared";
import { theme } from "../../../styles/themeTokens";

interface ReferenceTable {
  id: string;
  name: string;
  entries: number;
  updated: string;
  status: "active" | "inactive";
  description: string;
}

const tables: ReferenceTable[] = [
  { id: "T001", name: "Shift Patterns", entries: 3, updated: "2025-06-10", status: "active", description: "Standard shift schedules" },
  { id: "T002", name: "Machine Types", entries: 12, updated: "2025-06-08", status: "active", description: "Equipment taxonomy" },
  { id: "T003", name: "Material Categories", entries: 24, updated: "2025-06-05", status: "active", description: "Raw material classifications" },
  { id: "T004", name: "Work Centers", entries: 15, updated: "2025-05-28", status: "active", description: "Production work center definitions" },
  { id: "T005", name: "Operation Codes", entries: 42, updated: "2025-05-20", status: "active", description: "Manufacturing operation identifiers" },
  { id: "T006", name: "Holiday Calendar", entries: 14, updated: "2025-04-15", status: "inactive", description: "Non-working day schedule" },
];

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function ReferencesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = tables.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center gap-4 border-b px-5 py-3 ${theme.header}`}>
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
          <Database className="h-5 w-5 stroke-current" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Reference Tables</h1>
          <p className={`text-xs ${theme.textSecondary}`}>Lookup tables, taxonomies, and configuration data.</p>
        </div>
      </header>

      <DataManagementNav currentPath={location.pathname} />

      <div className={`flex-1 overflow-y-auto ${theme.page} p-4`}>
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Reference Tables" }]} />
        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search tables..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && <span className={`text-xs ${theme.textSecondary}`}>{selected.size} selected</span>}
            <button className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors active:scale-[0.97] ${theme.buttonSecondary}`}>
              + New Table
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            <span className="font-medium">{selected.size} table(s) selected</span>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Export</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Activate</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Deactivate</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">Clear</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon={<Database className="h-6 w-6 stroke-current" />} title={search ? "No tables match your search" : "No reference tables configured"} description="Create reference tables for your production configuration." action={{ label: "+ New Table", onClick: () => {} }} />
        ) : (
          <div className="space-y-2">
            {filtered.map((table) => {
              const isSelected = selected.has(table.id);
              return (
                <div
                  key={table.id}
                  className={`group cursor-pointer rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm active:scale-[0.99] ${
                    isSelected ? theme.rowSelected : theme.row
                  } ${theme.cardHover}`}
                  onClick={() => navigate(`/system/data-management/references/${table.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/references/${table.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <BulkCheckbox checked={isSelected} onChange={() => toggleOne(table.id)} />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                        <Database className="h-4.5 w-4.5 stroke-current" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${theme.textPrimary}`}>{table.name}</span>
                          <StatusBadge status={table.status} />
                        </div>
                        <div className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] ${theme.textMuted}`}>
                          <span>{table.entries} entries</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Updated {table.updated}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span className="truncate max-w-50">{table.description}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <PrimaryAction onClick={() => navigate(`/system/data-management/references/${table.id}`)} />
                      <ActionsDropdown actions={[
                        { label: "Edit", icon: <Pencil className="h-3 w-3 stroke-current" />, onClick: () => {} },
                        { label: "Export", icon: <Download className="h-3 w-3 stroke-current" />, onClick: () => {} },
                      ]} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={`mt-3 flex items-center justify-between text-[11px] ${theme.textMuted}`}>
          <span>{filtered.length} of {tables.length} table(s)</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300" />
            Select all
          </label>
        </div>
      </div>
    </div>
  );
}
