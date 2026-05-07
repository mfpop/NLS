import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Database, Factory, Layers, Package, Search, Users,
  GitBranch, Cpu, ChevronRight,
  Building2, Circle, X, RefreshCw, Monitor, AlertCircle,
  ChevronDown, Eye, Pencil, Pointer
} from "lucide-react";
import { theme } from "../../styles/themeTokens";
import { useDataManagementOverview } from "@/hooks/useDataManagementOverview";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";
import { CompanyEditor } from "./data-management/components/CompanyEditor";
import { ReferenceTablesCard } from "./data-management/components/ReferenceTablesCard";
import { COMPANY_QUERY, UPDATE_COMPANY_MUTATION } from "@/graphql/companyQueries";

const TYPE_STYLES: Record<string, { color: string; icon: typeof Circle }> = {
  productionLine: { color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10", icon: GitBranch },
  line:           { color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10", icon: GitBranch },
  department:     { color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10", icon: Building2 },
  group:          { color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10", icon: Users },
  resourceGroup:  { color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10", icon: Users },
  resource:       { color: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10", icon: Monitor },
};

const TYPE_TITLES: Record<string, string> = {
  productionLine: "Production Line", line: "Line", department: "Department",
  resourceGroup: "Resource Group", group: "Resource Group", resource: "Resource",
};

function findNodeByKey(nodes: DataManagementTreeChild[], targetKey: string, parentKey = ""): DataManagementTreeChild | null {
  for (const n of nodes) {
    const nodeKey = parentKey ? `${parentKey}/${n.type}:${n.id}` : `${n.type}:${n.id}`;
    if (nodeKey === targetKey) return n;
    if (n.children) {
      const found = findNodeByKey(n.children, targetKey, nodeKey);
      if (found) return found;
    }
  }
  return null;
}

function findNodePathByKey(
  nodes: DataManagementTreeChild[],
  targetKey: string,
  path: DataManagementTreeChild[] = [],
  parentKey = "",
): DataManagementTreeChild[] | null {
  for (const n of nodes) {
    const nodeKey = parentKey ? `${parentKey}/${n.type}:${n.id}` : `${n.type}:${n.id}`;
    const nextPath = [...path, n];
    if (nodeKey === targetKey) return nextPath;
    if (n.children) {
      const found = findNodePathByKey(n.children, targetKey, nextPath, nodeKey);
      if (found) return found;
    }
  }
  return null;
}

function formatStatusLabel(status?: string | null) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ── TreeNode ── */
function TreeNode({ node, depth, expanded, selectedKey, onToggle, onSelect, expandedSet, nodeKey }: {
  node: DataManagementTreeChild; depth: number; expanded: boolean;
  selectedKey: string | null; onToggle: (id: string) => void;
  onSelect: (key: string | null) => void; expandedSet: Set<string>; nodeKey: string;
}) {
  const navigate = useNavigate();
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedKey === nodeKey;
  const isAncestor = expanded && hasChildren && !isSelected;
  const ts = TYPE_STYLES[node.type] || TYPE_STYLES.resource;
  const Icon = ts.icon;
  const indentPx = depth === 0 ? 8 : 24 + (depth - 1) * 16;

  const rowClass = isSelected
    ? "bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-400 border-l-4 border-l-emerald-500 ring-1 ring-emerald-200 dark:ring-emerald-700/30 shadow-sm relative z-10"
    : isAncestor
      ? "bg-emerald-50/10 dark:bg-emerald-500/[0.06] border-l border-emerald-200/20 dark:border-emerald-700/20 shadow-none ring-0"
      : "border-l border-transparent hover:bg-emerald-50/20 dark:hover:bg-emerald-500/10 shadow-none ring-0";

  return (
    <div className="relative group">
      {depth > 0 && (
        <div className="absolute left-[34px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700 pointer-events-none" style={{ height: "100%" }} />
      )}
      <div className={`flex items-center gap-2 h-9 min-h-9 rounded-md px-2.5 cursor-pointer transition-colors ${rowClass}`}
        style={{ paddingLeft: `${indentPx}px` }}
        onClick={() => { if (hasChildren) onToggle(nodeKey); onSelect(isSelected ? null : nodeKey); }}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") { if (hasChildren) onToggle(nodeKey); onSelect(isSelected ? null : nodeKey); } }}
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
        <div className="ml-8.5">
          {node.children!.map((child) => {
            const childKey = `${nodeKey}/${child.type}:${child.id}`;
            return <TreeNode key={childKey} nodeKey={childKey} node={child} depth={depth + 1}
              expanded={expandedSet.has(childKey)} selectedKey={selectedKey}
              onToggle={onToggle} onSelect={onSelect} expandedSet={expandedSet} />;
          })}
        </div>
      )}
    </div>
  );
}

/* ── KPI Cards ── */
function SummaryCards({ kpis, navCounts }: { kpis: { productionLines: number; departments: number; resourceGroups: number; resources: number; plantStatus: string } | null; navCounts?: { plants?: number; resourceGroups?: number } | null }) {
  const navigate = useNavigate();
  if (!kpis) return null;
  const cards = [
    { label: "Plants", value: String(navCounts?.plants ?? 0), icon: Factory, color: theme.iconBoxBlue, href: "/system/data-management/plant" },
    { label: "Production Lines", value: String(kpis.productionLines), icon: GitBranch, color: theme.iconBoxAmber, href: "/system/data-management/production-lines" },
    { label: "Departments", value: String(kpis.departments), icon: Layers, color: theme.iconBoxBlue, href: "/system/data-management/departments" },
    { label: "Resource Groups", value: String(kpis.resourceGroups), icon: Users, color: theme.iconBoxViolet, href: "/system/data-management/resource-groups" },
    { label: "Resources", value: String(kpis.resources), icon: Cpu, color: theme.iconBoxTeal, href: "/system/data-management/resources" },
  ];
  return (
    <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <button key={c.label} type="button" onClick={() => navigate(c.href)}
          className={`rounded-xl border p-3 h-19.5 text-left transition-all hover:shadow-sm active:scale-[0.98] ${theme.card} ${theme.cardHover}`}
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

/* ─── Main Page ─── */
export function DataManagementPage() {
  const navigate = useNavigate();
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(t); }, [searchQuery]);

  const { data: overview, loading, error, refetch } = useDataManagementOverview({
    plantId: selectedPlantId, search: debouncedSearch || undefined, status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: companyData } = useQuery<{ company: { id: string; code: string; name: string; address: string; phone: string; email: string; website: string; description: string; industryType: string; manufacturingType: string; defaultTimezone: string; defaultUnits: string; defaultShiftModel: string; productionCalendar: string; defaultLanguage: string; leanMethodology: string } }>(COMPANY_QUERY, {
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const [updateCompany] = useMutation(UPDATE_COMPANY_MUTATION);
  const [companyForm, setCompanyForm] = useState<Record<string, string>>({});
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const company = companyData?.company;

  useEffect(() => {
    if (company && Object.keys(companyForm).length === 0) {
      setCompanyForm({
        code: company.code,
        name: company.name,
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        website: company.website || "",
        description: company.description || "",
        industryType: company.industryType || "",
        manufacturingType: company.manufacturingType || "",
        defaultTimezone: company.defaultTimezone || "",
        defaultUnits: company.defaultUnits || "",
        defaultShiftModel: company.defaultShiftModel || "",
        productionCalendar: company.productionCalendar || "",
        defaultLanguage: company.defaultLanguage || "",
        leanMethodology: company.leanMethodology || "",
      });
    }
  }, [company]);

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
  const handleSelect = useCallback((key: string | null) => setSelectedNodeKey(key), []);

  const renderTree = useCallback((nodes: DataManagementTreeChild[], depth: number) =>
    nodes.map((node) => {
      const nodeKey = `${node.type}:${node.id}`;
      return <TreeNode key={nodeKey} nodeKey={nodeKey} node={node} depth={depth}
        expanded={expandedSet.has(nodeKey)} selectedKey={selectedNodeKey}
        onToggle={handleToggle} onSelect={handleSelect} expandedSet={expandedSet} />;
    }), [expandedSet, selectedNodeKey, handleToggle, handleSelect]);

  const plants = overview?.plants ?? [];
  const kpis = overview?.kpis ?? null;
  const navCounts = overview?.navigationCounts;
  const systemHealth = overview?.systemHealth;
  const treeData = overview?.tree;

  const normalizedTreeNodes = useMemo((): DataManagementTreeChild[] => {
    if (!treeData) return [];
    const isSinglePlant = !!selectedPlantId;
    const plantChildren: DataManagementTreeChild[] = isSinglePlant
      ? [{
          ...(treeData as unknown as DataManagementTreeChild),
          type: "plant",
          children: treeData.children,
          childCount: treeData.children?.reduce((s: number, c: DataManagementTreeChild) => s + 1 + (c.childCount ?? 0), 0) ?? 0,
        }]
      : (treeData.children || []);
    const totalDescendants = plantChildren.reduce((s, c) => s + 1 + (c.childCount ?? 0), 0);
    return [{
      ...(treeData as unknown as DataManagementTreeChild),
      id: "root",
      name: company?.name ?? "Company",
      type: "plant",
      children: plantChildren,
      childCount: totalDescendants,
      code: "",
      status: "active",
    } as DataManagementTreeChild];
  }, [treeData, selectedPlantId]);

  const selectedNode = useMemo((): DataManagementTreeChild | null => {
    if (!selectedNodeKey || normalizedTreeNodes.length === 0) return null;
    return findNodeByKey(normalizedTreeNodes, selectedNodeKey);
  }, [selectedNodeKey, normalizedTreeNodes]);

  const selectedPath = useMemo(() => {
    if (!selectedNodeKey || normalizedTreeNodes.length === 0) return [];
    return findNodePathByKey(normalizedTreeNodes, selectedNodeKey) || [];
  }, [selectedNodeKey, normalizedTreeNodes]);

  const pathItems = useMemo(() => (selectedPath || []).filter((n) => n.type !== "plant"), [selectedPath]);
  const ts = selectedNode ? (TYPE_STYLES[selectedNode.type] || TYPE_STYLES.resource) : null;
  const Icon = ts?.icon || Circle;
  const title = selectedNode ? (TYPE_TITLES[selectedNode.type] || selectedNode.type) : "";
  const statusLabel = selectedNode ? formatStatusLabel(selectedNode?.status) : "";

  const childGroupEntries = useMemo(() => {
    if (!selectedNode?.children) return [];
    const groups = selectedNode.children.reduce<Record<string, number>>((acc, child) => {
      const key = TYPE_TITLES[child.type] || child.type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups);
  }, [selectedNode]);

  const contextCounts = useMemo(() => {
    if (!selectedNode) return navCounts;
    const counts: Record<string, number> = {};
    const walk = (n: DataManagementTreeChild) => {
      const t = n.type;
      counts[t] = (counts[t] || 0) + 1;
      n.children?.forEach(walk);
    };
    walk(selectedNode);
    return {
      plants: counts.plant || 0,
      productionLines: counts.productionLine || counts.line || 0,
      departments: counts.department || 0,
      resourceGroups: counts.resourceGroup || counts.group || 0,
      resources: counts.resource || 0,
      referenceTables: navCounts?.referenceTables ?? 0,
    };
  }, [selectedNode, navCounts]);

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${theme.page}`}>
      {/* ── Header ── */}
      <header className={`flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3 ${theme.header}`}>
        <div className="flex items-center gap-3">
          <div className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Database className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-tight ${theme.textPrimary}`}>Data Management</h1>
            <p className={`text-[10px] ${theme.textSecondary}`}>Digital plant model with live operational context</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value="" onChange={(e) => { if (e.target.value) navigate(e.target.value); }}
            className="h-9 rounded-xl border border-emerald-300 bg-emerald-50 pl-2.5 pr-8 text-[11px] font-semibold text-emerald-700 min-w-42.5 appearance-none dark:bg-slate-900 dark:border-emerald-700 dark:text-emerald-300"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "15px" }}
          >
            <option value="" disabled>Navigate to...</option>
            <option value="/system/data-management/plant">Plants ({navCounts?.plants ?? 0})</option>
            <option value="/system/data-management/production-lines">Lines ({navCounts?.productionLines ?? 0})</option>
            <option value="/system/data-management/departments">Departments ({navCounts?.departments ?? 0})</option>
            <option value="/system/data-management/resource-groups">Resource Groups ({navCounts?.resourceGroups ?? 0})</option>
            <option value="/system/data-management/resources">Resources ({navCounts?.resources ?? 0})</option>
            <option value="/system/data-management/references">References ({navCounts?.referenceTables ?? 0})</option>
          </select>
          <button type="button" onClick={() => navigate("/control-tower")} className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500" aria-label="Close">
            <X className="h-4 w-4 stroke-current" />
          </button>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden px-3 pt-3 pb-4">

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
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(420px,48%)_minmax(0,52%)]">

          {/* ═══ LEFT COLUMN: Tree Card ═══ */}
          <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl ${theme.card}`}>
            {/* Header: title left, filters right */}
            <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-3 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="h-4 w-4 text-emerald-500 stroke-current shrink-0" />
                <div className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">Production Structure</div>
              </div>
              <div className="flex items-center gap-1.5">
                <select value={selectedPlantId === null ? "__company__" : selectedPlantId} onChange={(e) => { const v = e.target.value; if (v === "__company__") { setSelectedPlantId(null); setSelectedNodeKey("plant:root"); setExpandedSet(new Set()); } else { setSelectedPlantId(v || null); setSelectedNodeKey(null); setExpandedSet(new Set()); } }}
                  className="h-7 rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-[10px] font-medium max-w-32.5 bg-white dark:bg-slate-900">
                  <option value="__company__">{company?.name ?? "Company"}</option>
                  {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 stroke-current" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="h-7 w-35 sm:w-40 rounded-lg border border-slate-200 dark:border-slate-700 pl-7 pr-2 text-[10px] bg-white dark:bg-slate-900" />
                  {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-3 w-3 stroke-current" /></button>}
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 rounded-lg border border-slate-200 dark:border-slate-700 px-1.5 text-[10px] bg-white dark:bg-slate-900">
                  <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
                <button type="button" onClick={() => refetch()} className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors">
                  <RefreshCw className={`h-3 w-3 text-slate-500 stroke-current ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto px-3 py-2">
              {loading && !treeData ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-4"><RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" />Loading...</div>
              ) : !treeData || treeData.children.length === 0 ? (
                <div className="flex flex-col text-xs text-slate-400 gap-2 px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <Database className="h-4 w-4 stroke-current shrink-0" />
                    <span>{selectedPlantId ? "No structure data for this plant." : "Select a plant to view structure."}</span>
                  </div>
                </div>
              ) : (
                renderTree(normalizedTreeNodes, 0)
              )}
            </div>

            {/* Footer: legend left, system health right */}
            <div className="shrink-0 border-t bg-slate-50/50 dark:bg-slate-900/50 px-3 flex items-center justify-between h-9">
              <div className="flex items-center gap-3 text-[10px]">
                {[
                  { label: "Plant", dot: "bg-emerald-400" },
                  { label: "Line", dot: "bg-amber-400" },
                  { label: "Dept", dot: "bg-purple-400" },
                  { label: "Resource Group", dot: "bg-blue-400" },
                  { label: "Resource", dot: "bg-gray-400" },
                ].map((item) => (
                  <span key={item.label} className="flex items-center gap-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${item.dot}`} />
                    <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                  </span>
                ))}
              </div>
              {systemHealth && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> {systemHealth.runningLines} running
                  </span>
                  <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[9px] bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> {systemHealth.resourcesDown} down
                  </span>
                  <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> {systemHealth.highUtilizationResources} &gt;85%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT COLUMN: KPI Row + Detail Panel + Reference Tables ═══ */}
          <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto pr-1">
            <SummaryCards kpis={kpis} navCounts={navCounts} />

            {selectedNode && selectedNode.id === "root" && company ? (
              /* ── Company Editor ── */
              <div className="flex flex-col gap-3">
                <CompanyEditor form={companyForm as any} onChange={(k, v) => setCompanyForm((p) => ({ ...p, [k]: v }))}
                  onSave={async () => {
                    setCompanySaving(true); setCompanyError(null);
                    try { await updateCompany({ variables: { input: companyForm } }); setSelectedNodeKey(null); } catch (e) { setCompanyError(e instanceof Error ? e.message : "Save failed"); }
                    setCompanySaving(false);
                  }}
                  saving={companySaving}
                  onClose={() => setSelectedNodeKey(null)} />
                {companyError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{companyError}</div>
                )}
              </div>
            ) : selectedNode ? (
              /* ── Selected Node Detail ── */
              <div className="flex flex-col gap-3">
                <div className={`rounded-2xl border p-4 ${theme.card}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ts?.color || theme.iconBoxSubtle}`}>
                      <Icon className="h-4 w-4 stroke-current" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className={`text-base font-semibold ${theme.textPrimary}`}>{selectedNode.name}</h2>
                        {selectedNode.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{selectedNode.code}</span>}
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedNode.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${theme.textSecondary}`}>{title}</p>
                    </div>
                  </div>
                  {pathItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-slate-500">
                      {pathItems.map((node, i) => (
                        <span key={`${node.type}:${node.id}`} className="inline-flex items-center gap-1">
                          {i > 0 && <ChevronRight className="h-3 w-3 stroke-current text-slate-300" />}
                          <span className={`rounded-full px-2 py-0.5 ${i === pathItems.length - 1 ? "bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {node.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Structure Scope + Details grid */}
                <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                  <div className={`rounded-2xl border p-4 ${theme.card}`}>
                    <div className={`text-[10px] font-semibold uppercase tracking-wider ${theme.textSecondary}`}>Branch Summary</div>
                    <div className={`mt-1 text-sm font-semibold ${theme.textPrimary}`}>Items in this branch</div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        { icon: Factory, label: "Plants", value: String(contextCounts?.plants ?? 0), color: theme.iconBoxBlue },
                        { icon: GitBranch, label: "Lines", value: String(contextCounts?.productionLines ?? 0), color: theme.iconBoxAmber },
                        { icon: Layers, label: "Departments", value: String(contextCounts?.departments ?? 0), color: theme.iconBoxViolet },
                        { icon: Users, label: "Resource Groups", value: String(contextCounts?.resourceGroups ?? 0), color: theme.iconBoxSky },
                        { icon: Cpu, label: "Resources", value: String(contextCounts?.resources ?? 0), color: theme.iconBoxTeal },
                        { icon: Package, label: "Tables", value: String(contextCounts?.referenceTables ?? 0), color: theme.iconBoxSubtle },
                      ].map((item) => (
                        <button key={item.label} type="button" onClick={() => navigate(`/system/data-management/${item.label.toLowerCase().replace(/\s+/g, '-')}`)}
                          className="flex items-center gap-2 h-12 rounded-lg border border-slate-200/60 px-2.5 transition-all hover:border-emerald-300 hover:bg-slate-50/70 dark:border-slate-800/60 dark:hover:border-emerald-700 dark:hover:bg-slate-800/30"
                        >
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                            <item.icon className="h-3 w-3 stroke-current" />
                          </span>
                          <div className="min-w-0 leading-tight text-left">
                            <div className={`text-[9px] font-medium text-slate-400 truncate uppercase tracking-wider`}>{item.label}</div>
                            <div className={`text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none mt-0.5`}>
                              {item.value === "0" ? <span className="text-slate-300">—</span> : item.value}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className={`rounded-2xl border p-4 ${theme.card}`}>
                      <div className={`text-[10px] font-semibold uppercase tracking-wider ${theme.textSecondary}`}>Details</div>
                      <div className="mt-3 space-y-2">
                        {[
                          { label: "Type", value: title },
                          { label: "Code", value: selectedNode.code || "—", mono: true },
                          { label: "Status", value: statusLabel },
                          { label: "Children", value: String(selectedNode.childCount ?? 0) },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-slate-400 dark:text-slate-500">{row.label}</span>
                            <span className={`text-right font-medium text-slate-700 dark:text-slate-300 ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`rounded-2xl border p-4 ${theme.card} flex-1`}>
                      <div className={`text-[10px] font-semibold uppercase tracking-wider ${theme.textSecondary}`}>Composition</div>
                      {childGroupEntries.length > 0 ? (
                        <div className="mt-3 space-y-1">
                          {childGroupEntries.map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                          No child items under this node yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 text-xs text-slate-400 min-h-50">
                <Pointer className="h-8 w-8 stroke-current" />
                <span>Select a node to view details</span>
              </div>
            )}

            <ReferenceTablesCard onSelectCompany={() => setSelectedNodeKey("plant:root")} />
          </div>
        </div>
      </div>
    </div>
  );
}
