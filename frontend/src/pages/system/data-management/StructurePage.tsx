import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Factory, Layers, Users, Database,
  GitBranch, Monitor
} from "lucide-react";
import { Breadcrumbs, ResourceStatusBadge, AlertBanner } from "./shared";
import { theme } from "../../../styles/themeTokens";
import { usePlants } from "@/hooks/usePlants";
import { useProductionStructureTree, type ProductionStructureNode } from "@/hooks/useProductionStructureTree";
import { REFERENCE_TABLES_QUERY } from "@/graphql/manufacturingQueries";

interface StructureTreeNode {
  id: string;
  label: string;
  icon: typeof Factory;
  type: "plant" | "department" | "group" | "resource" | "table" | "line";
  subtitle: string;
  status?: string;
  children?: StructureTreeNode[];
  to?: string;
}

interface ReferenceTablesQueryData {
  referenceTables: Array<{ id: string; name: string; entryCount: number }>;
}

function TreeNodeRow({ node, depth = 0 }: { node: StructureTreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const navigate = useNavigate();
  const hasChildren = !!node.children?.length;

  const typeColor =
    node.type === "plant" ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10" :
    node.type === "department" ? "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10" :
    node.type === "group" ? "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10" :
    node.type === "line" ? "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" :
    node.type === "resource" ? "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-500/10" :
    "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/10";

  return (
    <div>
      <div
        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.99]"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => { if (hasChildren) setOpen(!open); else if (node.to) navigate(node.to); }}
        role="button"
        tabIndex={0}
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
            {node.status && <ResourceStatusBadge status={node.status as any} />}
          </div>
          <div className={`text-[10px] ${theme.textMuted}`}>{node.subtitle}</div>
        </div>
        {node.to && (
          <button type="button" onClick={(e) => { e.stopPropagation(); navigate(node.to!); }} className="shrink-0 h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.97]">
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

function buildTree(tree: ProductionStructureNode | null): StructureTreeNode[] {
  if (!tree) return [];
  return [{
    id: tree.id,
    label: tree.name,
    icon: Factory,
    type: "plant",
    subtitle: `${tree.productionLines.length} line(s) · ${tree.departments.length} department(s)`,
    to: `/system/data-management/plant/${tree.id}`,
    children: [
      ...tree.productionLines.map((line) => ({
        id: `line-${line.id}`,
        label: line.name,
        icon: GitBranch,
        type: "line" as const,
        subtitle: `${line.departments.length} department(s)`,
        to: `/system/data-management/production-lines/${line.id}`,
      })),
      ...tree.departments.map((department) => ({
        id: `dept-${department.id}`,
        label: department.name,
        icon: Layers,
        type: "department" as const,
        subtitle: `${department.resourceGroups.length} group(s)`,
        to: `/system/data-management/departments/${department.id}`,
        children: department.resourceGroups.map((group) => ({
          id: `group-${group.id}`,
          label: group.name,
          icon: Users,
          type: "group" as const,
          subtitle: `${group.resources.length} resource(s)`,
          to: `/system/data-management/resource-groups/${group.id}`,
          children: group.resources.map((resource) => ({
            id: `resource-${resource.id}`,
            label: resource.name,
            icon: Monitor,
            type: "resource" as const,
            subtitle: resource.code || "No code",
            status: resource.status === "active" ? "Running" : "Idle",
            to: `/system/data-management/resources/${resource.id}`,
          })),
        })),
      })),
    ],
  }];
}

export function StructurePage() {
  const navigate = useNavigate();
  const { plants } = usePlants();
  const [selectedPlantId, setSelectedPlantId] = useState("");

  useEffect(() => {
    if (!selectedPlantId && plants.length > 0) {
      setSelectedPlantId(plants[0].id);
    }
  }, [plants, selectedPlantId]);

  const { data: structure, loading, error } = useProductionStructureTree(selectedPlantId);
  const { data: tablesData } = useQuery<ReferenceTablesQueryData>(REFERENCE_TABLES_QUERY, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const structureTree = useMemo(() => buildTree(structure), [structure]);
  const referenceTables = tablesData?.referenceTables ?? [];

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      <header className={`flex shrink-0 items-center gap-4 border-b px-5 py-3 ${theme.header}`}>
        <div className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Factory className="h-5 w-5 stroke-current" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Full Structure View</h1>
          <p className={`text-xs ${theme.textSecondary}`}>Hierarchy rendered from database-backed manufacturing structure.</p>
        </div>
        <select
          value={selectedPlantId}
          onChange={(e) => setSelectedPlantId(e.target.value)}
          className={`h-9 rounded-lg border px-3 text-xs ${theme.input} ${theme.focusRing}`}
        >
          {plants.map((plant) => (
            <option key={plant.id} value={plant.id}>{plant.name}</option>
          ))}
        </select>
      </header>

      <div className={`flex-1 overflow-y-auto ${theme.page} p-4`}>
        <Breadcrumbs crumbs={[{ label: "Data Management", to: "/system/data-management" }, { label: "Full Structure" }]} />

        <AlertBanner
          message={selectedPlantId ? "Structure view is reading the current plant hierarchy from the database." : "Select a plant to load structure data."}
          cta="View in CT"
          ctaOnClick={() => navigate("/control-tower")}
        />

        <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="font-medium uppercase tracking-wide">Legend:</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-blue-100 dark:bg-blue-500/20" /> Plant</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-amber-100 dark:bg-amber-500/20" /> Line</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-indigo-100 dark:bg-indigo-500/20" /> Department</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-violet-100 dark:bg-violet-500/20" /> Group</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-teal-100 dark:bg-teal-500/20" /> Resource</span>
        </div>

        <div className={`rounded-xl border px-2 py-1 ${theme.card}`}>
          {loading && !structure ? (
            <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading structure...</div>
          ) : error && !structure ? (
            <div className={`py-12 text-center text-sm ${theme.textCritical}`}>Unable to load structure from the database.</div>
          ) : structureTree.length === 0 ? (
            <div className={`py-12 text-center text-sm ${theme.textMuted}`}>No structure found for the selected plant.</div>
          ) : (
            structureTree.map((node) => <TreeNodeRow key={node.id} node={node} depth={0} />)
          )}
        </div>

        <div className="mt-4">
          <h3 className={`mb-2 flex items-center gap-2 text-xs font-semibold ${theme.textPrimary}`}>
            <Database className="h-4 w-4 text-sky-600 dark:text-sky-400 stroke-current" />
            Reference Tables
          </h3>
          <div className={`rounded-xl border px-2 py-1 ${theme.card}`}>
            <TreeNodeRow
              node={{
                id: "tables",
                label: "All Reference Tables",
                icon: Database,
                type: "table",
                subtitle: `${referenceTables.length} table(s)`,
                children: referenceTables.map((table) => ({
                  id: `table-${table.id}`,
                  label: table.name,
                  icon: Database,
                  type: "table",
                  subtitle: `${table.entryCount} entries`,
                  to: `/system/data-management/references/${table.id}`,
                })),
              }}
              depth={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
