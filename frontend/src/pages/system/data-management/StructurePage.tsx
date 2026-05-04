import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Factory, Layers, Users, Database,
  Building2, GitBranch, Monitor, Wrench, Truck
} from "lucide-react";
import { Breadcrumbs, ResourceStatusBadge, LoadBar, AlertBanner } from "./shared";
import { theme } from "../../../styles/themeTokens";

interface TreeNode {
  id: string; label: string; icon: typeof Factory;
  type: "plant" | "department" | "group" | "resource" | "table" | "line" | "member";
  subtitle: string; loadPct?: number; opStatus?: string;
  count?: number; children?: TreeNode[]; to?: string;
  isBottleneck?: boolean;
}

const structureTree: TreeNode[] = [
  {
    id: "P001", label: "Main Plant", icon: Factory, type: "plant",
    subtitle: "Building A · 3 lines · 42 resources", loadPct: 72,
    to: "/system/data-management/plant/P001",
    children: [
      {
        id: "ln1", label: "Production Lines", icon: GitBranch, type: "line",
        subtitle: "3 lines · 1 bottleneck", loadPct: 78,
        children: [
          { id: "L001", label: "C2-Cylinder Assembly", icon: GitBranch, type: "line", subtitle: "Assembly · 4 groups · 18 resources", loadPct: 94, isBottleneck: true, to: "/system/data-management/plant/P001" },
          { id: "L002", label: "Line B (STB Units)", icon: GitBranch, type: "line", subtitle: "Assembly, Machining · 3 groups · 12 resources", loadPct: 68, to: "/system/data-management/plant/P001" },
          { id: "L003", label: "Line C (Pipes)", icon: GitBranch, type: "line", subtitle: "Quality Control · 2 groups · 8 resources", loadPct: 45, to: "/system/data-management/plant/P001" },
        ],
      },
      {
        id: "P001-dept", label: "Departments", icon: Layers, type: "department", subtitle: "4 departments · 14 resources",
        children: [
          {
            id: "D001", label: "Assembly", icon: Building2, type: "department", subtitle: "John Smith · 45 emp · 14 resources", loadPct: 78, to: "/system/data-management/departments/D001",
            children: [
              {
                id: "RG001", label: "Line Operators", icon: Users, type: "group", subtitle: "Production · 28 members · 12 resources", loadPct: 85, isBottleneck: true, to: "/system/data-management/resource-groups/RG001",
                children: [
                  { id: "RES-ASSY-01", label: "Assembly Station A1", icon: Monitor, type: "resource", subtitle: "Workstation · WS-A1", loadPct: 78, opStatus: "Running", to: "/system/data-management/resources/RES-ASSY-01" },
                  { id: "RES-ASSY-02", label: "Assembly Station A2", icon: Monitor, type: "resource", subtitle: "Workstation · WS-A2", loadPct: 55, opStatus: "Idle", to: "/system/data-management/resources/RES-ASSY-02" },
                  { id: "RES-WELD-02", label: "Welding Station 2", icon: Monitor, type: "resource", subtitle: "Workstation · WS-002", loadPct: 94, opStatus: "Running", isBottleneck: true, to: "/system/data-management/resources/RES-WELD-02" },
                  { id: "RES-TORQUE-01", label: "Torque Tool Set", icon: Wrench, type: "resource", subtitle: "Tool · TQ-001", loadPct: 100, opStatus: "Running", isBottleneck: true, to: "/system/data-management/resources/RES-TORQUE-01" },
                ],
              },
              { id: "RG002", label: "Setup Technicians", icon: Users, type: "group", subtitle: "Support · 12 members · 6 resources", loadPct: 62, to: "/system/data-management/resource-groups/RG002" },
            ],
          },
          { id: "D002", label: "Machining", icon: Building2, type: "department", subtitle: "Sarah Chen · 32 emp · 10 resources", loadPct: 92, to: "/system/data-management/departments/D002" },
          { id: "D003", label: "Quality Control", icon: Building2, type: "department", subtitle: "Mike Brown · 18 emp · 8 resources", loadPct: 55, to: "/system/data-management/departments/D003" },
          { id: "D004", label: "Maintenance", icon: Building2, type: "department", subtitle: "David Kim · 14 emp", loadPct: 30, to: "/system/data-management/departments/D004" },
        ],
      },
    ],
  },
  {
    id: "P002", label: "Secondary Plant", icon: Factory, type: "plant", subtitle: "Building B · 2 lines · 18 resources", loadPct: 45, to: "/system/data-management/plant/P002",
    children: [
      {
        id: "P002-dept", label: "Departments", icon: Layers, type: "department", subtitle: "3 departments",
        children: [
          {
            id: "D004b", label: "Logistics", icon: Building2, type: "department", subtitle: "Ana Garcia · 22 emp · 12 resources", loadPct: 65, to: "/system/data-management/departments/D004",
            children: [
              { id: "RG004", label: "Material Handlers", icon: Users, type: "group", subtitle: "Logistics · 15 members · 8 resources", loadPct: 72, to: "/system/data-management/resource-groups/RG004",
                children: [
                  { id: "RES-FORK-03", label: "Forklift 3", icon: Truck, type: "resource", subtitle: "Mat. Handling · FORKLIFT-03", loadPct: 65, opStatus: "Running", to: "/system/data-management/resources/RES-FORK-03" },
                  { id: "RES-FORK-01", label: "Forklift 1", icon: Truck, type: "resource", subtitle: "Mat. Handling · FORKLIFT-01", loadPct: 72, opStatus: "Running", to: "/system/data-management/resources/RES-FORK-01" },
                  { id: "RES-FORK-02", label: "Forklift 2", icon: Truck, type: "resource", subtitle: "Mat. Handling · FORKLIFT-02", loadPct: 81, opStatus: "Running", to: "/system/data-management/resources/RES-FORK-02" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "P003", label: "Warehouse Plant", icon: Factory, type: "plant", subtitle: "Warehouse 1 · 1 line · 6 resources (inactive)", loadPct: 0, to: "/system/data-management/plant/P003",
  },
];

function TreeNodeRow({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const navigate = useNavigate();
  const hasChildren = node.children && node.children.length > 0;

  const typeColor =
    node.type === "plant" ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10" :
    node.type === "department" ? "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10" :
    node.type === "group" ? "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10" :
    node.type === "line" ? "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" :
    node.type === "resource" ? "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-500/10" :
    "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/10";

  return (
    <div className={`${node.isBottleneck ? "border-l-2 border-l-red-400 pl-2" : ""}`}>
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.99]`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => { if (hasChildren) setOpen(!open); else if (node.to) navigate(node.to); }}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") { if (hasChildren) setOpen(!open); else if (node.to) navigate(node.to); } }}
      >
        <span className="w-4 shrink-0">
          {hasChildren ? (open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 stroke-current" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 stroke-current" />) : <span className="inline-block w-3.5" />}
        </span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${typeColor}`}>
          <node.icon className="h-3.5 w-3.5 stroke-current" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${depth === 0 ? "font-semibold" : "font-medium"} ${theme.textPrimary}`}>{node.label}</span>
            {node.isBottleneck && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">BN</span>}
            {node.opStatus && <ResourceStatusBadge status={node.opStatus as any} />}
          </div>
          <div className={`text-[10px] ${theme.textMuted}`}>{node.subtitle}</div>
        </div>
        {node.loadPct !== undefined && <LoadBar pct={node.loadPct} />}
        {node.to && (
          <button type="button" onClick={(e) => { e.stopPropagation(); navigate(node.to!); }}
            className="shrink-0 h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors active:scale-[0.97]">
            Details
          </button>
        )}
      </div>
      {open && hasChildren && (
        <div>
          {node.children!.map((child) => <TreeNodeRow key={child.id} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export function StructurePage() {
  const navigate = useNavigate();

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center gap-4 border-b px-5 py-3 ${theme.header}`}>
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Factory className="h-5 w-5 stroke-current" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Full Structure View</h1>
          <p className={`text-xs ${theme.textSecondary}`}>Hierarchical view with live load, utilization, and bottleneck detection.</p>
        </div>
        <button type="button" onClick={() => navigate("/system/data-management/structure")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
          Back to Plants
        </button>
      </header>

      <div className={`flex-1 overflow-y-auto ${theme.page} p-4`}>
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Full Structure" }]} />

        <AlertBanner message="Bottleneck: C2-Cylinder Assembly at 94% · Welding Station 2 at 94%" cta="View in CT" ctaOnClick={() => navigate("/control-tower?bottleneck=true")} />

        <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="font-medium uppercase tracking-wide">Legend:</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-blue-100 dark:bg-blue-500/20" /> Plant</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-amber-100 dark:bg-amber-500/20" /> Line</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-indigo-100 dark:bg-indigo-500/20" /> Department</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-violet-100 dark:bg-violet-500/20" /> Group</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-teal-100 dark:bg-teal-500/20" /> Resource</span>
          <span className="ml-2 flex items-center gap-1"><span className="inline-block h-3 w-2 border-l-2 border-l-red-400 rounded bg-slate-100 dark:bg-slate-800" /> Bottleneck</span>
        </div>

        <div className={`rounded-xl border px-2 py-1 ${theme.card}`}>
          {structureTree.map((node) => <TreeNodeRow key={node.id} node={node} depth={0} />)}
        </div>

        <div className="mt-4">
          <h3 className={`mb-2 flex items-center gap-2 text-xs font-semibold ${theme.textPrimary}`}>
            <Database className="h-4 w-4 text-sky-600 dark:text-sky-400 stroke-current" />
            Reference Tables
          </h3>
          <div className={`rounded-xl border px-2 py-1 ${theme.card}`}>
            <TreeNodeRow node={{ id: "tables", label: "All Reference Tables", icon: Database, type: "table", subtitle: "6 tables · 110 total entries", children: [
              { id: "T001", label: "Shift Patterns", icon: Database, type: "table", subtitle: "3 entries", to: "/system/data-management/references/T001" },
              { id: "T002", label: "Machine Types", icon: Database, type: "table", subtitle: "12 entries", to: "/system/data-management/references/T002" },
              { id: "T003", label: "Material Categories", icon: Database, type: "table", subtitle: "24 entries", to: "/system/data-management/references/T003" },
              { id: "T004", label: "Work Centers", icon: Database, type: "table", subtitle: "15 entries", to: "/system/data-management/references/T004" },
              { id: "T005", label: "Operation Codes", icon: Database, type: "table", subtitle: "42 entries", to: "/system/data-management/references/T005" },
              { id: "T006", label: "Holiday Calendar", icon: Database, type: "table", subtitle: "14 entries", to: "/system/data-management/references/T006" },
            ]}} depth={0} />
          </div>
        </div>

        <p className={`mt-3 text-[11px] ${theme.textMuted}`}>Expand/collapse nodes. Red left border = bottleneck. Load bars show utilization. Red = overload.</p>
      </div>
    </div>
  );
}
