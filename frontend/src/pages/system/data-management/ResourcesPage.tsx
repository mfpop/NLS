import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Cpu, GitBranch, Monitor, Wrench, Truck, ClipboardCheck, Pencil, ExternalLink } from "lucide-react";
import {
  Breadcrumbs, ContextBar, SearchBar, FilterBar, EmptyState,
  BulkCheckbox, DataManagementNav, ResourceStatusBadge, LoadBar,
  PrimaryAction, ActionsDropdown, AlertBanner
} from "./shared";
import { theme } from "../../../styles/themeTokens";

type OpStatus = "Running" | "Idle" | "Down" | "Maintenance";
type ResType = "Machine" | "Workstation" | "Inspection Station" | "Material Handling" | "Tool";

interface Resource {
  id: string; name: string; type: ResType; code: string;
  groupId: string; groupName: string; departmentName: string; lineName: string;
  status: "active" | "inactive";
  opStatus: OpStatus;
  utilization: number;
  shift: string;
  lastActivity: string;
  flowPosition: string;
  plantName: string;
}

const resources: Resource[] = [
  { id: "RES-WELD-02", name: "Welding Station 2", type: "Workstation", code: "WS-002", groupId: "RG001", groupName: "Line Operators", departmentName: "Assembly", lineName: "C2-Cylinder Assembly", status: "active", opStatus: "Running", utilization: 94, shift: "Morning", lastActivity: "12 min ago", flowPosition: "Step 4/12", plantName: "Main Plant" },
  { id: "RES-CNC-01", name: "CNC Mill 1", type: "Machine", code: "CNC-MILL-01", groupId: "RG002", groupName: "Setup Technicians", departmentName: "Machining", lineName: "C2-Cylinder Assembly", status: "active", opStatus: "Running", utilization: 87, shift: "Morning", lastActivity: "5 min ago", flowPosition: "Step 2/12", plantName: "Main Plant" },
  { id: "RES-QC-01", name: "QC Gate 1", type: "Inspection Station", code: "QC-GATE-01", groupId: "RG003", groupName: "Quality Inspectors", departmentName: "Quality Control", lineName: "C2-Cylinder Assembly", status: "active", opStatus: "Idle", utilization: 42, shift: "Morning", lastActivity: "2h ago", flowPosition: "Step 8/12", plantName: "Main Plant" },
  { id: "RES-FORK-03", name: "Forklift 3", type: "Material Handling", code: "FORKLIFT-03", groupId: "RG004", groupName: "Material Handlers", departmentName: "Logistics", lineName: "Shared", status: "active", opStatus: "Running", utilization: 65, shift: "Afternoon", lastActivity: "3 min ago", flowPosition: "Material Trans", plantName: "Secondary Plant" },
  { id: "RES-ASSY-01", name: "Assembly Station A1", type: "Workstation", code: "WS-A1", groupId: "RG001", groupName: "Line Operators", departmentName: "Assembly", lineName: "Line A", status: "active", opStatus: "Running", utilization: 78, shift: "Morning", lastActivity: "8 min ago", flowPosition: "Step 5/12", plantName: "Main Plant" },
  { id: "RES-ASSY-02", name: "Assembly Station A2", type: "Workstation", code: "WS-A2", groupId: "RG001", groupName: "Line Operators", departmentName: "Assembly", lineName: "Line B", status: "active", opStatus: "Idle", utilization: 55, shift: "Morning", lastActivity: "45 min ago", flowPosition: "Step 5/12", plantName: "Main Plant" },
  { id: "RES-LATHE-01", name: "CNC Lathe 1", type: "Machine", code: "CNC-LATHE-01", groupId: "RG002", groupName: "Setup Technicians", departmentName: "Machining", lineName: "Line B", status: "active", opStatus: "Down", utilization: 0, shift: "Morning", lastActivity: "3h ago", flowPosition: "Step 3/12", plantName: "Main Plant" },
  { id: "RES-TORQUE-01", name: "Torque Tool Set", type: "Tool", code: "TQ-001", groupId: "RG001", groupName: "Line Operators", departmentName: "Assembly", lineName: "Line A", status: "active", opStatus: "Running", utilization: 100, shift: "Morning", lastActivity: "1 min ago", flowPosition: "Step 5/12", plantName: "Main Plant" },
  { id: "RES-QC-02", name: "QC Gate 2", type: "Inspection Station", code: "QC-GATE-02", groupId: "RG003", groupName: "Quality Inspectors", departmentName: "Quality Control", lineName: "Line C", status: "active", opStatus: "Maintenance", utilization: 0, shift: "Afternoon", lastActivity: "1h ago", flowPosition: "Step 8/12", plantName: "Main Plant" },
  { id: "RES-FORK-01", name: "Forklift 1", type: "Material Handling", code: "FORKLIFT-01", groupId: "RG004", groupName: "Material Handlers", departmentName: "Logistics", lineName: "Line A", status: "active", opStatus: "Running", utilization: 72, shift: "Afternoon", lastActivity: "10 min ago", flowPosition: "Material Trans", plantName: "Secondary Plant" },
  { id: "RES-FORK-02", name: "Forklift 2", type: "Material Handling", code: "FORKLIFT-02", groupId: "RG004", groupName: "Material Handlers", departmentName: "Logistics", lineName: "Line B", status: "active", opStatus: "Running", utilization: 81, shift: "Morning", lastActivity: "7 min ago", flowPosition: "Material Trans", plantName: "Secondary Plant" },
  { id: "RES-SUPER-01", name: "Supervisor Tablet", type: "Tool", code: "TAB-SUP-01", groupId: "RG005", groupName: "Shift Supervisors", departmentName: "Management", lineName: "All Lines", status: "active", opStatus: "Running", utilization: 35, shift: "All", lastActivity: "15 min ago", flowPosition: "Mgmt", plantName: "Secondary Plant" },
];

const FILTERS = [
  { label: "All", value: "all" }, { label: "Machines", value: "Machine" },
  { label: "Workstations", value: "Workstation" }, { label: "Inspection", value: "Inspection Station" },
  { label: "M. Handling", value: "Material Handling" },
  { label: "Running", value: "Running" }, { label: "Down", value: "Down" },
  { label: "Inactive", value: "inactive" },
];

const typeStyles: Record<ResType, { icon: any; bg: string; badge: string }> = {
  Machine: { icon: <Cpu className="h-4.5 w-4.5 stroke-current" />, bg: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400", badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
  Workstation: { icon: <Monitor className="h-4.5 w-4.5 stroke-current" />, bg: "bg-teal-100 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400", badge: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400" },
  "Inspection Station": { icon: <ClipboardCheck className="h-4.5 w-4.5 stroke-current" />, bg: "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400", badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" },
  "Material Handling": { icon: <Truck className="h-4.5 w-4.5 stroke-current" />, bg: "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" },
  Tool: { icon: <Wrench className="h-4.5 w-4.5 stroke-current" />, bg: "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400", badge: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" },
};

export function ResourcesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = resources.filter((r) => {
    if (filter !== "all") {
      if (["Running", "Idle", "Down", "Maintenance"].includes(filter)) { if (r.opStatus !== filter) return false; }
      else if (filter === "inactive") { if (r.status !== "inactive") return false; }
      else if (r.type !== filter) return false;
    }
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(filtered.map((r) => r.id))); };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const downResources = resources.filter((r) => r.opStatus === "Down");

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center gap-4 border-b px-5 py-3 ${theme.header}`}>
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Cpu className="h-5 w-5 stroke-current" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Resources</h1>
          <p className={`text-xs ${theme.textSecondary}`}>Manage machines, workstations, cells, tools, and production resources with live operational status.</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /><span className={`${theme.textSecondary}`}>Running</span>
          <span className="inline-block h-2 w-2 rounded-full bg-slate-400" /><span className={`${theme.textSecondary}`}>Idle</span>
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /><span className={`${theme.textSecondary}`}>Down</span>
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /><span className={`${theme.textSecondary}`}>Maint</span>
        </div>
      </header>

      <DataManagementNav currentPath={location.pathname} />

      <div className={`flex-1 overflow-y-auto ${theme.page} p-4`}>
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Resources" }]} />
        <ContextBar segments={[{ label: "All Resources" }]} />
        {downResources.length > 0 && (
          <AlertBanner
            message={`${downResources.length} resource(s) down - affecting flow`}
            cta="View impacted lines"
            ctaOnClick={() => navigate("/system/data-management/structure")}
          />
        )}

        <div className="mb-3 flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search resources, machines, workstations..." />
          <FilterBar tabs={FILTERS} active={filter} onChange={setFilter} />
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && <span className={`text-xs ${theme.textSecondary}`}>{selected.size} selected</span>}
            <button className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors active:scale-[0.97] ${theme.buttonSecondary}`}>+ Add Resource</button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            <span className="font-medium">{selected.size} resource(s) selected</span>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Assign to group</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Activate</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Deactivate</button>
            <span className="text-blue-400">|</span>
            <button className="hover:underline">Move to group</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-blue-500 hover:text-blue-700 font-medium">Clear</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon={<Cpu className="h-6 w-6 stroke-current" />} title={search ? "No resources match your search" : "No resources configured"} description="Add machines, workstations, tools, and production resources." action={{ label: "+ Add Resource", onClick: () => {} }} />
        ) : (
          <div className="space-y-2">
            {filtered.map((res) => {
              const isSelected = selected.has(res.id);
              const ts = typeStyles[res.type];
              const isBottleneck = res.utilization > 90 && res.opStatus === "Running";
              return (
                <div
                  key={res.id}
                  className={`group cursor-pointer rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm active:scale-[0.99] ${isSelected ? theme.rowSelected : isBottleneck ? `border-l-4 border-l-red-400 ${theme.row}` : theme.row} ${theme.cardHover}`}
                  onClick={() => navigate(`/system/data-management/resources/${res.id}`)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/system/data-management/resources/${res.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <BulkCheckbox checked={isSelected} onChange={() => toggleOne(res.id)} />
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ts.bg}`}>{ts.icon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${theme.textPrimary}`}>{res.name}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ts.badge}`}>{res.type}</span>
                          <ResourceStatusBadge status={res.opStatus} />
                          {isBottleneck && <span className="text-[10px] font-bold text-red-600 dark:text-red-400">BOTTLENECK</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{res.code}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Flow: {res.flowPosition}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Group: {res.groupName}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Line: {res.lineName}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Shift: {res.shift}</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Last: {res.lastActivity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <LoadBar pct={res.utilization} />
                      <PrimaryAction onClick={() => navigate(`/system/data-management/resources/${res.id}`)} />
                      <ActionsDropdown actions={[
                        { label: "Edit", icon: <Pencil className="h-3 w-3 stroke-current" />, onClick: () => {} },
                        { label: "Assign to group", icon: <ExternalLink className="h-3 w-3 stroke-current" />, onClick: () => {} },
                        { label: "View in VSM", icon: <GitBranch className="h-3 w-3 stroke-current" />, onClick: () => navigate(`/execution/vsm?resource=${res.id}`) },
                        { label: "View in Control Tower", icon: <ExternalLink className="h-3 w-3 stroke-current" />, onClick: () => navigate(`/control-tower?resource=${encodeURIComponent(res.name)}&plant=${encodeURIComponent(res.plantName)}&line=${encodeURIComponent(res.lineName)}`) },
                      ]} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={`mt-3 flex items-center justify-between text-[11px] ${theme.textMuted}`}>
          <span>{filtered.length} of {resources.length} resource(s) · {resources.filter(r => r.opStatus === "Running").length} running · {resources.filter(r => r.opStatus === "Down").length} down</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300" />
            Select all
          </label>
        </div>
      </div>
    </div>
  );
}
