import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Pencil, GitBranch, Cpu, ExternalLink } from "lucide-react";
import {
  Breadcrumbs, ContextBar, SearchBar, FilterBar, EmptyState, StatusBadge,
  BulkCheckbox, StructureShortcuts, PrimaryAction, ActionsDropdown
} from "./shared";

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
    <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
      <header className="flex shrink-0 items-center gap-4 border-b border-(--border-soft) bg-(--surface-1) px-5 py-3">
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight text-(--text-primary)">Resource Groups</h1>
          <p className="text-xs text-(--text-secondary)">Define teams, assign leaders, and link resources to production groups.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-(--page-bg) p-4">
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Resource Groups" }]} />
        <ContextBar segments={[{ label: "All Plants" }]} />
        <StructureShortcuts />

        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search groups or leaders..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && <span className="text-xs text-slate-500">{selected.size} selected</span>}
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]">
              + Add Group
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span className="font-medium">{selected.size} group(s) selected</span>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Assign leader</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Link to line</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Activate</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Deactivate</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">Clear</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title={search ? "No groups match your search" : "No resource groups configured"} description="Create resource groups and assign leaders." action={{ label: "+ Add Group", onClick: () => {} }} />
        ) : (
          <div className="space-y-2">
            {filtered.map((group) => {
              const isSelected = selected.has(group.id);
              return (
                <div
                  key={group.id}
                  className={`group cursor-pointer rounded-xl border bg-white px-3 py-2.5 transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.99] ${
                    isSelected ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"
                  }`}
                  onClick={() => navigate(`/system/data-management/resource-groups/${group.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/resource-groups/${group.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <BulkCheckbox checked={isSelected} onChange={() => toggleOne(group.id)} />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <Users className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{group.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{group.type}</span>
                          <StatusBadge status={group.status} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          <span>{group.plantName}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>Dept: {group.department}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>Leader: {group.leader}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{group.members} member(s)</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                          <span>{group.resources} resource(s)</span>
                          {group.linkedLines.length > 0 && (
                            <>
                              <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                              <span>Lines: {group.linkedLines.join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <PrimaryAction onClick={() => navigate(`/system/data-management/resource-groups/${group.id}`)} />
                      <ActionsDropdown actions={[
                        { label: "Edit", icon: <Pencil className="h-3 w-3" />, onClick: () => {} },
                        { label: "Link to Line", icon: <GitBranch className="h-3 w-3" />, onClick: () => {} },
                        { label: "View Resources", icon: <Cpu className="h-3 w-3" />, onClick: () => navigate("/system/data-management/resources") },
                        { label: "View in Control Tower", icon: <ExternalLink className="h-3 w-3" />, onClick: () => navigate(`/control-tower?plant=${encodeURIComponent(group.plantName)}&department=${encodeURIComponent(group.department)}`) },
                      ]} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{filtered.length} of {groups.length} resource group(s)</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700" />
            Select all
          </label>
        </div>
      </div>
    </div>
  );
}
