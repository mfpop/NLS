import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUpDown, GripVertical } from "lucide-react";
import { Pagination, EntityToolbar, NodeDetailPanel } from "./components";
import { theme } from "../../../styles/themeTokens";
import { useProductionLines } from "@/hooks/useProductionLines";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";

const PER_PAGE = 10;

type DetailTreeNode = DataManagementTreeChild & { metadata?: Record<string, unknown> };

function useDetailContext(selectedLine: any) {
  if (!selectedLine) return { selectedNode: null, selectedPath: undefined, selectedNodeKey: null };
  const node: DetailTreeNode = {
    id: selectedLine.id,
    type: "productionLine",
    name: selectedLine.name,
    code: selectedLine.code || "",
    status: selectedLine.status || "active",
    childCount: 0,
    children: [],
    metadata: { ...selectedLine },
  };
  return { selectedNode: node, selectedPath: [node], selectedNodeKey: `line/${selectedLine.id}` };
}

export function ProductionLinesPage() {
  const navigate = useNavigate();
  const { lines, loading, refetch } = useProductionLines();
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

  const selectedLine = selectedId ? lines.find((l: any) => l.id === selectedId) ?? null : null;
  const filtered = lines.filter((l: any) => (statusFilter === "all" || l.status === statusFilter))
    .filter((l: any) => !search || l.name.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const { selectedNode, selectedPath, selectedNodeKey } = useDetailContext(selectedLine);

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <EntityToolbar
        onAdd={() => navigate("/system/production-structure/production-lines")}
        onEdit={selectedLine ? () => navigate(`/system/production-structure/production-lines/${selectedLine.id}`) : undefined}
        onDelete={undefined}
        hasSelected={!!selectedLine}
        onRefresh={() => refetch()}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
      />
      <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
        <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto p-3 m-0 bg-white dark:bg-slate-900">
            {loading ? <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading lines...</div>
            : filtered.length === 0 ? (
              <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><TrendingUpDown className="h-5 w-5" /></div>
                <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>No production lines</h3><p className={`mt-1 text-xs ${theme.textSecondary}`}>No lines match your criteria.</p>
              </div>
            ) : (
              <div className="space-y-px">{paginated.map((line: any) => (
                <div key={line.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors ${selectedId === line.id ? "bg-amber-100/60 dark:bg-amber-900/30" : "hover:bg-amber-50/40 dark:hover:bg-slate-800/40"}`}
                  onClick={() => setSelectedId(line.id)}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <TrendingUpDown className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[13px] font-medium ${theme.textPrimary}`}>{line.name}</span>
                      {line.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{line.code}</span>}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${line.status === "active" ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${line.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />{line.status}
                      </span>
                    </div>
                    {line.plantName && <div className={`text-[11px] truncate ${theme.textMuted}`}>Plant: {line.plantName}</div>}
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
            {selectedLine ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLine.name}</span>
                    {selectedLine.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{selectedLine.code}</span>}
                  </div>
                </div>
                <NodeDetailPanel selectedNode={selectedNode} selectedNodeKey={selectedNodeKey} selectedPath={selectedPath} workspaceMode="view" />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900">
                <div className="text-center"><p className={`text-xs ${theme.textMuted}`}>Select a line to view details</p></div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]">
        <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
