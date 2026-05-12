import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, GripVertical } from "lucide-react";
import { Pagination, EntityToolbar, NodeDetailPanel } from "./components";
import { theme } from "../../../styles/themeTokens";
import { useDepartments } from "@/hooks/useDepartments";
import type { DataManagementTreeChild } from "@/hooks/useDataManagementOverview";

const PER_PAGE = 10;

type DetailTreeNode = DataManagementTreeChild & { metadata?: Record<string, unknown> };

function useDetailContext(selectedDept: any) {
  if (!selectedDept) return { selectedNode: null, selectedPath: undefined, selectedNodeKey: null };
  const node: DetailTreeNode = {
    id: selectedDept.id,
    type: "department",
    name: selectedDept.name,
    code: selectedDept.code || "",
    status: selectedDept.status || "active",
    childCount: 0,
    children: [],
    metadata: { ...selectedDept },
  };
  return { selectedNode: node, selectedPath: [node], selectedNodeKey: `dept/${selectedDept.id}` };
}

export function DepartmentsPage() {
  const navigate = useNavigate();
  const { departments, loading, refetch } = useDepartments();
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

  const selectedDept = selectedId ? departments.find((d) => d.id === selectedId) ?? null : null;
  const filtered = departments.filter((d) => (statusFilter === "all" || d.status === statusFilter))
    .filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const { selectedNode, selectedPath, selectedNodeKey } = useDetailContext(selectedDept);

  return (
    <div className="flex flex-col overflow-hidden flex-1">
        <EntityToolbar
          onAdd={() => navigate("/system/production-structure/departments")}
          onEdit={selectedDept ? () => navigate(`/system/production-structure/departments/${selectedDept.id}`) : undefined}
          onDelete={undefined}
          hasSelected={!!selectedDept}
          onRefresh={() => refetch()}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          search={search}
          onSearchChange={setSearch}
        />
        <div ref={detailContainerRef} className="flex flex-1 overflow-hidden p-0 m-0">
          <div className="flex flex-col overflow-hidden p-0 m-0" style={{ flex: 1, minWidth: 0 }}>
            <div className="flex-1 overflow-y-auto p-3 m-0 bg-white dark:bg-slate-900">
              {loading ? <div className={`py-12 text-center text-sm ${theme.textMuted}`}>Loading departments...</div>
              : filtered.length === 0 ? (
                <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center ${theme.card}`}>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${theme.iconBoxSubtle}`}><Layers className="h-5 w-5 stroke-current" /></div>
                  <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>No departments</h3><p className={`mt-1 text-xs ${theme.textSecondary}`}>No departments match your criteria.</p>
                </div>
              ) : (
                <div className="space-y-px">{paginated.map((dept) => (
                  <div key={dept.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors ${selectedId === dept.id ? "bg-violet-100/60 dark:bg-violet-900/30" : "hover:bg-violet-50/40 dark:hover:bg-slate-800/40"}`}
                    onClick={() => setSelectedId(dept.id)}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                      <Layers className="h-5 w-5 stroke-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[13px] font-medium ${theme.textPrimary}`}>{dept.name}</span>
                        {dept.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{dept.code}</span>}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${dept.status === "active" ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dept.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />{dept.status}
                        </span>
                      </div>
                      {dept.manager && <div className={`text-[11px] truncate ${theme.textMuted}`}>Manager: {dept.manager}</div>}
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
              {selectedDept ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedDept.name}</span>
                      {selectedDept.code && <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${theme.codeBadge}`}>{selectedDept.code}</span>}
                    </div>
                  </div>
                  <NodeDetailPanel selectedNode={selectedNode} selectedNodeKey={selectedNodeKey} selectedPath={selectedPath} workspaceMode="view" />
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900">
                  <div className="text-center"><p className={`text-xs ${theme.textMuted}`}>Select a department</p></div>
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
