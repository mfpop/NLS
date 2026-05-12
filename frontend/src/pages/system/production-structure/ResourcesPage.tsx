import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Dumbbell, GripVertical } from "lucide-react";
import { Pagination, EntityToolbar, NodeDetailPanel } from "./components";
import { theme } from "../../../styles/themeTokens";
import { RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { PageHeader } from "@/pages/shared/PageHeader";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";

const PER_PAGE = 10;

type DetailTreeNode = DataManagementTreeChild & { metadata?: Record<string, unknown> };

function useDetailContext(selectedRes: any) {
  if (!selectedRes) return { selectedNode: null, selectedPath: undefined, selectedNodeKey: null };
  const node: DetailTreeNode = {
    id: selectedRes.id,
    type: "resource",
    name: selectedRes.name,
    code: selectedRes.code || "",
    status: selectedRes.status || "active",
    childCount: 0,
    children: [],
    metadata: { ...selectedRes },
  };
  return { selectedNode: node, selectedPath: [node], selectedNodeKey: `res/${selectedRes.id}` };
}

export function ResourcesPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<any>(RESOURCES_QUERY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [detailPct, setDetailPct] = useState(75);
  const detailContainerRef = useRef<HTMLDivElement>(null);

  const handleDetailDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = detailContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { const pct = ((ev.clientX - rect.left) / rect.width) * 100; setDetailPct(Math.min(Math.max(100 - pct, 15), 85)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const resources = data?.resources || [];
  const selectedRes = selectedId ? resources.find((r: any) => r.id === selectedId) ?? null : null;
  const filtered = resources.filter((r: any) => (statusFilter === "all" || r.status === statusFilter))
    .filter((r: any) => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const { selectedNode, selectedPath, selectedNodeKey } = useDetailContext(selectedRes);

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <PageHeader
        icon={<Dumbbell className="h-5 w-5 stroke-current" />}
        iconClass="bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400"
        title="Resources"
        subtitle="Machines, workstations, and production assets."
      />
      <div className="flex flex-col overflow-hidden flex-1">
        <EntityToolbar
          onBack={() => navigate("/system/production-structure")}
          onAdd={() => navigate("/system/production-structure/resources")}
          onEdit={selectedRes ? () => navigate(`/system/production-structure/resources/${selectedRes.id}`) : undefined}
          onDelete={undefined}
          hasSelected={!!selectedRes}
          onRefresh={() => refetch()}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          search={search}
          onSearchChange={setSearch}
        />
        <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
          <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: 1, minWidth: 0 }}>
            <div className="flex-1 overflow-y-auto p-3 m-0 bg-white dark:bg-slate-900">
              {loading ? <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading resources...</div>
              : filtered.length === 0 ? (
                <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><Dumbbell className="h-5 w-5 stroke-current" /></div>
                  <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>No resources</h3><p className={`mt-1 text-xs ${theme.textSecondary}`}>No resources match your criteria.</p>
                </div>
              ) : (
                <div className="space-y-px">{paginated.map((r: any) => (
                  <div key={r.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors ${selectedId === r.id ? "bg-gray-100/60 dark:bg-gray-900/30" : "hover:bg-gray-50/40 dark:hover:bg-slate-800/40"}`}
                    onClick={() => setSelectedId(r.id)}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400">
                      <Dumbbell className="h-5 w-5 stroke-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[13px] font-medium ${theme.textPrimary}`}>{r.name}</span>
                        {r.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{r.code}</span>}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${r.status === "active" ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${r.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />{r.status}
                        </span>
                      </div>
                      {r.groupName && <div className={`text-[11px] truncate ${theme.textMuted}`}>{r.groupName}{r.plantName ? ` · ${r.plantName}` : ""}</div>}
                    </div>
                  </div>
                ))}</div>
              )}
              <div className="mt-3"><Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} /></div>
            </div>
          </div>
          <div onMouseDown={handleDetailDividerDown} className="flex shrink-0 cursor-col-resize items-center justify-center bg-slate-200/60 hover:bg-slate-300/60 dark:bg-slate-700/60 dark:hover:bg-slate-600/30 transition-colors" style={{ width: 4 }}>
            <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>
          <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flexBasis: `${detailPct}%`, minWidth: 0 }}>
            <div className="flex-1 overflow-y-auto p-4 m-0 bg-white dark:bg-slate-900">
              {selectedRes ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedRes.name}</span>
                      {selectedRes.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{selectedRes.code}</span>}
                    </div>
                  </div>
                  <NodeDetailPanel selectedNode={selectedNode} selectedNodeKey={selectedNodeKey} selectedPath={selectedPath} workspaceMode="view" />
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900">
                  <div className="text-center"><p className={`text-xs ${theme.textMuted}`}>Select a resource</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]">
          <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
