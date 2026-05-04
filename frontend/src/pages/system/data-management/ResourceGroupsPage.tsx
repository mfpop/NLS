import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, Pencil, GitBranch, Cpu, ExternalLink } from "lucide-react";
import {
  Breadcrumbs, ContextBar, SearchBar, FilterBar, EmptyState, StatusBadge,
  BulkCheckbox, DataManagementNav, PrimaryAction, ActionsDropdown
} from "./shared";
import { theme } from "../../../styles/themeTokens";

interface ResourceGroup {
  id: string;
  name: string;
  type: string;
  members: number;
  leader: string;
  status: "active" | "inactive";
  linkedLines: string[];
  department: string;
  resources: number;
  plantName: string;
}

const groups: ResourceGroup[] = [
  { id: "RG001", name: "Line Operators", type: "Production", members: 28, leader: "Tom Wilson", status: "active", linkedLines: ["C2-Cylinder Assembly", "Line A", "Line B"], department: "Assembly", resources: 12, plantName: "Main Plant" },
  { id: "RG002", name: "Setup Technicians", type: "Support", members: 12, leader: "Lisa Park", status: "active", linkedLines: ["C2-Cylinder Assembly", "Line B"], department: "Machining", resources: 6, plantName: "Main Plant" },
  { id: "RG003", name: "Quality Inspectors", type: "Quality", members: 8, leader: "James Lee", status: "active", linkedLines: ["C2-Cylinder Assembly", "Line C"], department: "Quality Control", resources: 5, plantName: "Main Plant" },
  { id: "RG004", name: "Material Handlers", type: "Logistics", members: 15, leader: "Maria Santos", status: "active", linkedLines: ["Line A", "Line B", "Shared"], department: "Logistics", resources: 8, plantName: "Secondary Plant" },
  { id: "RG005", name: "Shift Supervisors", type: "Management", members: 6, leader: "Robert Chen", status: "active", linkedLines: ["All Lines"], department: "Management", resources: 3, plantName: "Secondary Plant" },
];

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Production", value: "Production" },
  { label: "Support", value: "Support" },
  { label: "Management", value: "Management" },
  { label: "Quality", value: "Quality" },
];

export function ResourceGroupsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = groups.filter((g) => {
    if (filter !== "all" && g.type !== filter) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase()) && !g.leader.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((g) => g.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center gap-4 border-b px-5 py-3 ${theme.header}`}>
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
          <Users className="h-5 w-5 stroke-current" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Resource Groups</h1>
          <p className={`text-xs ${theme.textSecondary}`}>Define teams, assign leaders, and link resources to production groups.</p>
        </div>
      </header>

      <DataManagementNav currentPath={location.pathname} />

      <div className={`flex-1 overflow-y-auto ${theme.page} p-4`}>
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Resource Groups" }]} />
        <ContextBar segments={[{ label: "All Plants" }]} />
        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search groups or leaders..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && <span className={`text-xs ${theme.textSecondary}`}>{selected.size} selected</span>}
            <button className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors active:scale-[0.97] ${theme.buttonSecondary}`}>
              + Add Group
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-2 text-xs">
            <span className="font-medium text-slate-900 dark:text-slate-100">{selected.size} group(s) selected</span>
            <span className="text-slate-400 dark:text-slate-500">|</span>
            <button className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">Activate</button>
            <span className="text-slate-400 dark:text-slate-500">|</span>
            <button className="text-xs text-amber-600 hover:underline dark:text-amber-400">Deactivate</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Clear</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6 stroke-current" />} title={search ? "No groups match your search" : "No resource groups configured"} description="Create resource groups and assign leaders." action={{ label: "+ Add Group", onClick: () => {} }} />
        ) : (
          <div className="space-y-2">
            {filtered.map((group) => {
              const isSelected = selected.has(group.id);
              return (
                <div
                  key={group.id}
                  className={`group cursor-pointer rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm active:scale-[0.99] ${
                    isSelected ? theme.rowSelected : theme.row
                  } ${theme.cardHover}`}
                  onClick={() => navigate(`/system/data-management/resource-groups/${group.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/resource-groups/${group.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <BulkCheckbox checked={isSelected} onChange={() => toggleOne(group.id)} />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                        <Users className="h-4.5 w-4.5 stroke-current" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${theme.textPrimary}`}>{group.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${theme.badgeInactive}`}>{group.type}</span>
                          <StatusBadge status={group.status} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <span>{group.plantName}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Dept: {group.department}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Leader: {group.leader}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>{group.members} member(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>{group.resources} resource(s)</span>
                          {group.linkedLines.length > 0 && (
                            <>
                              <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                              <span>Lines: {group.linkedLines.join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <PrimaryAction onClick={() => navigate(`/system/data-management/resource-groups/${group.id}`)} />
                      <ActionsDropdown actions={[
                        { label: "Edit", icon: <Pencil className="h-3 w-3 stroke-current" />, onClick: () => {} },
                        { label: "Link to Line", icon: <GitBranch className="h-3 w-3 stroke-current" />, onClick: () => {} },
                        { label: "View Resources", icon: <Cpu className="h-3 w-3 stroke-current" />, onClick: () => navigate("/system/data-management/resources") },
                        { label: "View in Control Tower", icon: <ExternalLink className="h-3 w-3 stroke-current" />, onClick: () => navigate(`/control-tower?plant=${encodeURIComponent(group.plantName)}&department=${encodeURIComponent(group.department)}`) },
                      ]} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={`mt-3 flex items-center justify-between text-[11px] ${theme.textMuted}`}>
          <span>{filtered.length} of {groups.length} resource group(s)</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300" />
            Select all
          </label>
        </div>
      </div>
    </div>
  );
}
