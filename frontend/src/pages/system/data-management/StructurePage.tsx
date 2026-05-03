import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Factory, Layers, Users, Database,
  Building2, GitBranch
} from "lucide-react";
import { Breadcrumbs, StatusBadge } from "./shared";

interface TreeNode {
  id: string;
  label: string;
  icon: typeof Factory;
  type: "plant" | "department" | "group" | "table" | "line" | "member";
  subtitle: string;
  count?: number;
  children?: TreeNode[];
  to?: string;
}

const structureTree: TreeNode[] = [
  {
    id: "P001",
    label: "Main Plant",
    icon: Factory,
    type: "plant",
    subtitle: "Building A · 3 lines",
    to: "/system/data-management/plant/P001",
    children: [
      {
        id: "ln1",
        label: "Production Lines",
        icon: GitBranch,
        type: "line",
        subtitle: "3 lines active",
        children: [
          { id: "L001", label: "Line A", icon: GitBranch, type: "line", subtitle: "C2-Cylinder Assembly", to: "/system/data-management/plant/P001" },
          { id: "L002", label: "Line B", icon: GitBranch, type: "line", subtitle: "STB Units Line", to: "/system/data-management/plant/P001" },
          { id: "L003", label: "Line C", icon: GitBranch, type: "line", subtitle: "Pipes Line", to: "/system/data-management/plant/P001" },
        ],
      },
      {
        id: "P001-dept",
        label: "Departments",
        icon: Layers,
        type: "department",
        subtitle: "4 departments",
        children: [
          {
            id: "D001",
            label: "Assembly",
            icon: Building2,
            type: "department",
            subtitle: "John Smith · 45 employees",
            to: "/system/data-management/departments/D001",
            children: [
              { id: "RG001", label: "Line Operators", icon: Users, type: "group", subtitle: "Production · Tom Wilson · 28 members", to: "/system/data-management/resource-groups/RG001" },
              { id: "RG002", label: "Setup Technicians", icon: Users, type: "group", subtitle: "Support · Lisa Park · 12 members", to: "/system/data-management/resource-groups/RG002" },
            ],
          },
          {
            id: "D002",
            label: "Machining",
            icon: Building2,
            type: "department",
            subtitle: "Sarah Chen · 32 employees",
            to: "/system/data-management/departments/D002",
            children: [
              { id: "RG003", label: "Quality Inspectors", icon: Users, type: "group", subtitle: "Quality · James Lee · 8 members", to: "/system/data-management/resource-groups/RG003" },
            ],
          },
          {
            id: "D003",
            label: "Quality Control",
            icon: Building2,
            type: "department",
            subtitle: "Mike Brown · 18 employees",
            to: "/system/data-management/departments/D003",
          },
          {
            id: "D004",
            label: "Maintenance",
            icon: Building2,
            type: "department",
            subtitle: "David Kim · 14 employees",
            to: "/system/data-management/departments/D005",
          },
        ],
      },
      {
        id: "P001-groups",
        label: "Resource Groups",
        icon: Users,
        type: "group",
        subtitle: "8 groups across departments",
        children: [
          { id: "RG001b", label: "Line Operators", icon: Users, type: "group", subtitle: "Production · 28 members", to: "/system/data-management/resource-groups/RG001" },
          { id: "RG002b", label: "Setup Technicians", icon: Users, type: "group", subtitle: "Support · 12 members", to: "/system/data-management/resource-groups/RG002" },
          { id: "RG003b", label: "Quality Inspectors", icon: Users, type: "group", subtitle: "Quality · 8 members", to: "/system/data-management/resource-groups/RG003" },
        ],
      },
    ],
  },
  {
    id: "P002",
    label: "Secondary Plant",
    icon: Factory,
    type: "plant",
    subtitle: "Building B · 2 lines",
    to: "/system/data-management/plant/P002",
    children: [
      {
        id: "P002-dept",
        label: "Departments",
        icon: Layers,
        type: "department",
        subtitle: "3 departments",
        children: [
          { id: "D004b", label: "Logistics", icon: Building2, type: "department", subtitle: "Ana Garcia · 22 employees", to: "/system/data-management/departments/D004" },
        ],
      },
      {
        id: "P002-groups",
        label: "Resource Groups",
        icon: Users,
        type: "group",
        subtitle: "5 groups",
        children: [
          { id: "RG004b", label: "Material Handlers", icon: Users, type: "group", subtitle: "Logistics · 15 members", to: "/system/data-management/resource-groups/RG004" },
          { id: "RG005b", label: "Shift Supervisors", icon: Users, type: "group", subtitle: "Management · 6 members", to: "/system/data-management/resource-groups/RG005" },
        ],
      },
    ],
  },
  {
    id: "P003",
    label: "Warehouse Plant",
    icon: Factory,
    type: "plant",
    subtitle: "Warehouse 1 · 1 line (inactive)",
    to: "/system/data-management/plant/P003",
  },
];

function TreeNodeRow({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const navigate = useNavigate();
  const hasChildren = node.children && node.children.length > 0;

  const typeColor = node.type === "plant" ? "text-blue-600 bg-blue-50" :
    node.type === "department" ? "text-indigo-600 bg-indigo-50" :
    node.type === "group" ? "text-violet-600 bg-violet-50" :
    node.type === "line" ? "text-amber-600 bg-amber-50" :
    "text-sky-600 bg-sky-50";

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50 active:scale-[0.99] ${
          depth === 0 ? "font-semibold" : ""
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => {
          if (hasChildren) setOpen(!open);
          else if (node.to) navigate(node.to);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") { if (hasChildren) setOpen(!open); else if (node.to) navigate(node.to); } }}
      >
        {/* Expand/Collapse */}
        <span className="w-4 shrink-0">
          {hasChildren ? (
            open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <span className="inline-block w-3.5" />
          )}
        </span>

        {/* Icon */}
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${typeColor}`}>
          <node.icon className="h-3.5 w-3.5" />
        </span>

        {/* Label */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${depth === 0 ? "font-semibold" : "font-medium"} text-slate-900`}>
              {node.label}
            </span>
            {node.count !== undefined && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {node.count}
              </span>
            )}
            {node.type === "plant" && <StatusBadge status={node.id === "P003" ? "inactive" : "active"} />}
          </div>
          <div className="text-[10px] text-slate-400">{node.subtitle}</div>
        </div>

        {/* Quick nav */}
        {node.to && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(node.to!); }}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 transition-colors active:scale-[0.97]"
          >
            Open
          </button>
        )}
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function StructurePage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-1)] px-5 py-3">
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Factory className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Full Structure View</h1>
          <p className="text-xs text-[var(--text-secondary)]">Hierarchical view of plants, departments, groups, lines, and reference data.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/system/data-management/plant")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]"
        >
          Back to Plants
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-[var(--page-bg)] p-4">
        <Breadcrumbs crumbs={[
          { label: "Data Management", to: "/system/data-management" },
          { label: "Full Structure" },
        ]} />

        {/* Legend */}
        <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
          <span className="font-medium uppercase tracking-wide">Legend:</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-blue-100" /> Plant</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-indigo-100" /> Department</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-violet-100" /> Group</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-amber-100" /> Line</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-sky-100" /> Table</span>
        </div>

        {/* Tree */}
        <div className="rounded-xl border border-slate-200 bg-white px-2 py-1">
          {structureTree.map((node) => (
            <TreeNodeRow key={node.id} node={node} depth={0} />
          ))}
        </div>

        {/* Reference tables section */}
        <div className="mt-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Database className="h-4 w-4 text-sky-600" />
            Reference Tables
          </h3>
          <div className="rounded-xl border border-slate-200 bg-white px-2 py-1">
            <TreeNodeRow
              node={{
                id: "tables",
                label: "All Reference Tables",
                icon: Database,
                type: "table",
                subtitle: "6 tables · 110 total entries",
                children: [
                  { id: "T001", label: "Shift Patterns", icon: Database, type: "table", subtitle: "3 entries", to: "/system/data-management/references/T001" },
                  { id: "T002", label: "Machine Types", icon: Database, type: "table", subtitle: "12 entries", to: "/system/data-management/references/T002" },
                  { id: "T003", label: "Material Categories", icon: Database, type: "table", subtitle: "24 entries", to: "/system/data-management/references/T003" },
                  { id: "T004", label: "Work Centers", icon: Database, type: "table", subtitle: "15 entries", to: "/system/data-management/references/T004" },
                  { id: "T005", label: "Operation Codes", icon: Database, type: "table", subtitle: "42 entries", to: "/system/data-management/references/T005" },
                  { id: "T006", label: "Holiday Calendar", icon: Database, type: "table", subtitle: "14 entries", to: "/system/data-management/references/T006" },
                ],
              }}
              depth={0}
            />
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">Expand/collapse nodes to navigate the full production structure.</p>
      </div>
    </div>
  );
}
