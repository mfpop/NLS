import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database, Factory, Layers, Package, Search, Users,
  GitBranch, Cpu, AlertTriangle, BarChart3, Activity, ChevronRight,
  Building2, Circle, X, RefreshCw, Monitor, AlertCircle,
  ChevronDown, Plus, Eye, Pencil
} from "lucide-react";
import { theme } from "../../styles/themeTokens";
import { useDataManagementOverview } from "@/hooks/useDataManagementOverview";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";

const TYPE_STYLES: Record<string, { color: string; icon: typeof Circle }> = {
  productionLine: { color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10", icon: GitBranch },
  line:           { color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10", icon: GitBranch },
  department:     { color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10", icon: Building2 },
  group:          { color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10", icon: Users },
  resourceGroup:  { color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10", icon: Users },
  resource:       { color: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10", icon: Monitor },
};



/* ── TreeNode ── */
function TreeNode({ node, depth, expanded, selectedId, onToggle, onSelect, expandedSet, nodeKey }: {
  node: DataManagementTreeChild; depth: number; expanded: boolean;
  selectedId: string | null; onToggle: (id: string) => void;
  onSelect: (id: string | null) => void; expandedSet: Set<string>; nodeKey: string;
}) {
  const navigate = useNavigate();
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const ts = TYPE_STYLES[node.type] || TYPE_STYLES.resource;
  const Icon = ts.icon;
  const indentPx = depth === 0 ? 8 : 24 + (depth - 1) * 16;

  return (
    <div className="relative group">
      {/* Vertical connector line */}
      {depth > 0 && (
        <div className="absolute left-[34px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700 pointer-events-none" style={{ height: "100%" }} />
      )}
      <div className={`flex items-center gap-2 h-9 min-h-9 rounded-md px-2.5 cursor-pointer transition-all ${
        isSelected ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
      }`}
        style={{ paddingLeft: `${indentPx}px` }}
        onClick={() => { if (hasChildren) onToggle(nodeKey); onSelect(isSelected ? null : node.id); }}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") { if (hasChildren) onToggle(nodeKey); onSelect(isSelected ? null : node.id); } }}
      >
        <span className="w-4 shrink-0 flex items-center justify-center">
          {hasChildren ? (expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 stroke-current" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 stroke-current" />) : <span className="w-3.5" />}
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${ts.color}`}><Icon className="h-3 w-3 stroke-current" /></span>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${theme.textPrimary}`}>{node.name}</span>
          {node.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{node.code}</span>}
          <span className={`inline-block h-2 w-2 rounded-full ${node.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
          {(node.childCount ?? 0) > 0 && <span className={`text-[11px] ${theme.textMuted}`}>· {node.childCount}</span>}
        </div>
        {/* Hover actions */}
        <div className="hidden group-hover:flex items-center gap-1 shrink-0 transition-all duration-150">
          <button type="button" onClick={(e) => { e.stopPropagation(); 
            const routes: Record<string, string> = { productionLine: "/system/data-management/production-lines/", line: "/system/data-management/production-lines/", department: "/system/data-management/departments/", group: "/system/data-management/resource-groups/", resourceGroup: "/system/data-management/resource-groups/", resource: "/system/data-management/resources/" }; 
            const base = routes[node.type]; if (base) navigate(base + node.id); }}
            className="h-6 w-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" title="View">
            <Eye className="h-3 w-3 stroke-current" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); }}
            className="h-6 w-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Edit">
            <Pencil className="h-3 w-3 stroke-current" />
          </button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="ml-[34px]">
          {node.children!.map((child) => {
            const childKey = `${nodeKey}/${child.type}:${child.id}`;
            return <TreeNode key={childKey} nodeKey={childKey} node={child} depth={depth + 1}
              expanded={expandedSet.has(childKey)} selectedId={selectedId}
              onToggle={onToggle} onSelect={onSelect} expandedSet={expandedSet} />;
          })}
        </div>
      )}
    </div>
  );
}

/* ── KPI Cards ── */
function SummaryCards({ kpis }: { kpis: { productionLines: number; departments: number; resources: number; plantStatus: string } | null }) {
  const navigate = useNavigate();
  if (!kpis) return null;
  const cards = [
    { label: "Production Lines", value: String(kpis.productionLines), icon: GitBranch, color: theme.iconBoxAmber, href: "/system/data-management/production-lines" },
    { label: "Departments", value: String(kpis.departments), icon: Layers, color: theme.iconBoxBlue, href: "/system/data-management/departments" },
    { label: "Resources", value: String(kpis.resources), icon: Cpu, color: theme.iconBoxTeal, href: "/system/data-management/resources" },
    { label: "Plant Status", value: kpis.plantStatus, icon: Activity, color: kpis.plantStatus === "Active" ? theme.iconBoxEmerald : theme.iconBoxSubtle, href: "/system/data-management/plant" },
  ];
  return (
    <div className="grid grid-cols-4 gap-3 shrink-0">
      {cards.map((c) => (
        <button key={c.label} type="button" onClick={() => navigate(c.href)}
          className={`rounded-xl border p-3 h-[78px] text-left transition-all hover:shadow-sm active:scale-[0.98] ${theme.card} ${theme.cardHover}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${theme.textSecondary}`}>{c.label}</span>
            <span className={`flex h-5 w-5 items-center justify-center rounded-lg ${c.color}`}><c.icon className="h-2.5 w-2.5 stroke-current" /></span>
          </div>
          <div className={`text-lg font-bold ${theme.textPrimary}`}>{c.value}</div>
        </button>
      ))}
    </div>
  );
}

/* ─── Nav Card ─── */
function NavCard({ icon: Icon, label, href, count }: { icon: any; label: string; href: string; count?: number }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(href)}
      className={`flex items-center gap-2 h-11 rounded-lg border px-3 transition-all hover:shadow-sm active:scale-[0.98] ${theme.card} ${theme.cardHover}`}
    >
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${theme.iconBoxSubtle}`}>
        <Icon className="h-3 w-3 stroke-current" />
      </div>
      <div className="min-w-0 flex-1 text-left leading-tight">
        <div className={`text-[13px] font-medium ${theme.textPrimary}`}>{label}</div>
        {count !== undefined && <div className={`text-xs ${theme.textMuted}`}>{count}</div>}
      </div>
    </button>
  );
}

/* ─── Health Badge ─── */
function HealthBadge({ icon: Icon, label, className }: { icon: any; label: string; className: string }) {
  return (
    <div className={`flex items-center gap-2 h-8 rounded-lg px-3 text-xs ${className}`}>
      <Icon className="h-3.5 w-3.5 stroke-current shrink-0" />
      <span>{label}</span>
    </div>
  );
}

/* ─── Main Page ─── */
export function DataManagementPage() {
  const navigate = useNavigate();
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery]);

  const { data: overview, loading, error, refetch } = useDataManagementOverview({
    plantId: selectedPlantId, search: debouncedSearch || undefined, status: statusFilter !== "all" ? statusFilter : undefined,
  });

  useEffect(() => { if (!selectedPlantId && overview?.plants?.length) setSelectedPlantId(overview.plants[0].id); }, [overview?.plants, selectedPlantId]);
  useEffect(() => { if (overview?.tree && expandedSet.size === 0) setExpandedSet(new Set(overview.tree.children.map((c) => `${c.type}:${c.id}`))); }, [overview?.tree]);
  useEffect(() => {
    if (debouncedSearch && overview?.tree) {
      const ids = new Set<string>();
      const walk = (n: DataManagementTreeChild, pk: string) => { const k = `${pk}/${n.type}:${n.id}`; ids.add(k); n.children?.forEach((c) => walk(c, k)); };
      overview.tree.children.forEach((c) => { const k = `${c.type}:${c.id}`; ids.add(k); c.children?.forEach((ch) => walk(ch, k)); });
      setExpandedSet(ids);
    }
  }, [debouncedSearch, overview?.tree]);

  const handleToggle = useCallback((id: string) => setExpandedSet((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const handleSelect = useCallback((id: string | null) => setSelectedNodeId(id), []);

  const renderTree = useCallback((nodes: DataManagementTreeChild[], depth: number) =>
    nodes.map((node) => {
      const nodeKey = `${node.type}:${node.id}`;
      return <TreeNode key={nodeKey} nodeKey={nodeKey} node={node} depth={depth}
        expanded={expandedSet.has(nodeKey)} selectedId={selectedNodeId}
        onToggle={handleToggle} onSelect={handleSelect} expandedSet={expandedSet} />;
    }), [expandedSet, selectedNodeId, handleToggle, handleSelect]);

  const plants = overview?.plants ?? [];
  const kpis = overview?.kpis ?? null;
  const navCounts = overview?.navigationCounts;
  const systemHealth = overview?.systemHealth;
  const treeData = overview?.tree;
  const selectedPlant = overview?.selectedPlant;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className={`flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3 ${theme.header}`}>
        <div className="flex items-center gap-3">
          <div className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Database className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <h1 className={`text-base font-semibold tracking-tight ${theme.textPrimary}`}>Data Management</h1>
            <p className={`text-[10px] ${theme.textSecondary}`}>Digital plant model with live operational context</p>
          </div>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex-1 flex flex-col gap-3 px-3 pt-3 pb-4 overflow-hidden">

        {/* KPI Row */}
        <SummaryCards kpis={kpis} />

        {/* Error state */}
        {error && !treeData && (
          <div className={`rounded-xl border p-3 shrink-0 ${theme.dangerPanel}`}>
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 stroke-current shrink-0" />
              <span>Failed to load production data.</span>
              <button type="button" onClick={() => refetch()} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 transition-colors"><RefreshCw className="h-3 w-3 stroke-current" /> Retry</button>
            </div>
          </div>
        )}

        {/* ─── 2-Column Grid ─── */}
        <div className="grid grid-cols-[3fr_1fr] grid-rows-[1fr] gap-3 flex-1 min-h-0">

          {/* ═══ LEFT COLUMN: Tree Card ═══ */}
          <div className="flex flex-col rounded-xl border overflow-hidden h-full min-h-0" style={{ backgroundColor: theme.card.split(" ")[0] }}>
            {/* Tree Header + Filters */}
            <div className="h-12 shrink-0 px-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="h-4 w-4 text-slate-500 stroke-current shrink-0" />
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${theme.textPrimary}`}>Production Structure</div>
                  {selectedPlant?.name && <div className={`text-[9px] truncate ${theme.textMuted}`}>{selectedPlant.name}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <select value={selectedPlantId ?? ""} onChange={(e) => { setSelectedPlantId(e.target.value || null); setSelectedNodeId(null); setExpandedSet(new Set()); }}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-[10px] font-medium max-w-[130px] bg-white dark:bg-slate-900">
                  {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="h-8 w-[160px] rounded-lg border border-slate-200 dark:border-slate-700 pl-7 pr-2 text-[10px] bg-white dark:bg-slate-900" />
                  {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-3 w-3 stroke-current" /></button>}
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 px-1.5 text-[10px] bg-white dark:bg-slate-900">
                  <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
                <button type="button" onClick={() => refetch()} className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors">
                  <RefreshCw className={`h-3 w-3 text-slate-500 stroke-current ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Tree Body */}
            <div className="flex-1 min-h-0 overflow-auto px-3 py-2">
              {loading && !treeData ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-4"><RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" />Loading...</div>
              ) : !treeData || treeData.children.length === 0 ? (
                <div className="flex flex-col text-xs text-slate-400 gap-2 px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <Database className="h-4 w-4 stroke-current shrink-0" />
                    <span>{selectedPlantId ? "No structure data for this plant." : "Select a plant to view structure."}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Add departments or expand structure</span>
                </div>
              ) : (
                renderTree(treeData.children, 0)
              )}
            </div>

            {/* Legend */}
            <div className="h-6 shrink-0 px-3 border-t flex items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500">
              {Object.entries({ productionLine: "Line", department: "Dept", resourceGroup: "Group", resource: "Resource" }).map(([type, label]) => {
                const s = TYPE_STYLES[type];
                return <span key={type} className="flex items-center gap-1"><span className={`inline-block h-1.5 w-1.5 rounded ${s?.color.split(" ")[1] || "bg-gray-100"}`} />{label}</span>;
              })}
            </div>
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div className="grid grid-rows-[auto_auto_auto_1fr_auto] gap-2 h-full min-h-0">

            {/* Quick Actions */}
            <div className={`rounded-xl border p-3 ${theme.card}`}>
              <div className={`text-[11px] uppercase font-semibold pb-6 ${theme.textSecondary}`}>Quick Actions</div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {[
                  { label: "Add Line", icon: GitBranch, href: "/system/data-management/production-lines", primary: true },
                  { label: "Link Dept", icon: Layers, href: "/system/data-management/departments" },
                  { label: "Add Group", icon: Users, href: "/system/data-management/resource-groups" },
                  { label: "Add Resource", icon: Cpu, href: "/system/data-management/resources" },
                ].map((a) => (
                  <button key={a.label} type="button" onClick={() => navigate(a.href)}
                    className={`flex items-center gap-2 h-8 rounded-lg border px-2.5 text-xs font-medium transition-all hover:shadow-sm active:scale-[0.98] ${
                      a.primary
                        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}>
                    <Plus className={`h-3.5 w-3.5 stroke-current ${a.primary ? "text-white" : "text-slate-400"}`} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Structure Navigation */}
            <div className={`rounded-xl border p-3 ${theme.card}`}>
              <div className={`text-[11px] uppercase font-semibold pb-6 ${theme.textSecondary}`}>Structure Navigation</div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <NavCard icon={Factory} label="Plants" href="/system/data-management/plant" count={navCounts?.plants} />
                <NavCard icon={GitBranch} label="Lines" href="/system/data-management/production-lines" count={navCounts?.productionLines} />
                <NavCard icon={Layers} label="Departments" href="/system/data-management/departments" count={navCounts?.departments} />
                <NavCard icon={Users} label="Groups" href="/system/data-management/resource-groups" count={navCounts?.resourceGroups} />
                <NavCard icon={Cpu} label="Resources" href="/system/data-management/resources" count={navCounts?.resources} />
              </div>
            </div>

            {/* Configuration */}
            <div className={`rounded-xl border p-3 ${theme.card}`}>
              <div className={`text-[11px] uppercase font-semibold pb-6 ${theme.textSecondary}`}>Configuration</div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <NavCard icon={Package} label="Reference Tables" href="/system/data-management/references" count={navCounts?.referenceTables} />
              </div>
            </div>

            {/* Spacer */}
            <div />

            {/* System Health */}
            {systemHealth && (
              <div className={`rounded-xl border p-2.5 ${theme.card}`}>
                <div className={`text-[11px] uppercase font-semibold pb-6 ${theme.textSecondary}`}>System Health</div>
                <div className="flex flex-col gap-4">
                  <HealthBadge icon={Activity} label={`${systemHealth.runningLines} running`} className={theme.badgeActive} />
                  <HealthBadge icon={AlertTriangle} label={`${systemHealth.resourcesDown} down`} className={theme.badgeCritical} />
                  <HealthBadge icon={BarChart3} label={`${systemHealth.highUtilizationResources} >85% util`} className={theme.badgeWarning} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
