import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, ClipboardList, Clock3,
  Wrench, Settings, Lightbulb, Cog,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { CompactPagination } from "@/components/shared/CompactPagination";
import { ExplorerToolbar, ExplorerToolbarButton } from "@/components/shared/ExplorerToolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { MER_SUMMARY_QUERY, MER_LIST_QUERY } from "@/graphql/merQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/* ── Types ── */

interface MERSummaryData {
  total: number;
  submitted: number;
  underReview: number;
  approved: number;
  inProgress: number;
  completed: number;
  rejected: number;
  cancelled: number;
  overdue: number;
  byType: { requestType: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

interface MERItem {
  id: number;
  merCode: string;
  title: string;
  requestType: string;
  priority: string;
  status: string;
  submittedBy: string;
  assignedTo: string;
  dueDate: string | null;
  completedDate: string | null;
  estimatedCost: number | null;
  createdAt: string;
}

/* ── Constants ── */

const TYPE_META: Record<string, { label: string; icon: typeof Wrench; color: string; bg: string; border: string }> = {
  ENGINEERING_CHANGE: { label: "Engineering Change", icon: Wrench, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800" },
  TOOLING: { label: "Tooling", icon: Settings, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" },
  PROCESS_IMPROVEMENT: { label: "Process Improvement", icon: Lightbulb, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800" },
  EQUIPMENT_MODIFICATION: { label: "Equipment Modification", icon: Cog, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: "Submitted", color: "bg-blue-500" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-yellow-500" },
  APPROVED: { label: "Approved", color: "bg-emerald-500" },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-500" },
  COMPLETED: { label: "Completed", color: "bg-green-600" },
  REJECTED: { label: "Rejected", color: "bg-red-500" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-400" },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: "Critical", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
  HIGH: { label: "High", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
  MEDIUM: { label: "Medium", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  LOW: { label: "Low", color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-900/20" },
};

/* ── Sub-components ── */

function SectionCard({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">{title}</h3>
        <div className="flex-1" />
        {badge}
      </div>
      {children}
    </section>
  );
}

interface KpiCardProps {
  label: string;
  value: ReactNode;
  onClick?: () => void;
  badge?: { text: string; color: string };
  muted?: boolean;
  icon?: ReactNode;
}

function KpiCard({ label, value, onClick, badge, muted, icon }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col gap-0.5 px-3 py-2 min-w-0 text-left hover:bg-slate-50 transition-colors ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate`}>{label}</p>
          <p className={`text-lg font-bold tabular-nums leading-none ${muted ? "text-slate-400" : "text-slate-900"}`}>{value}</p>
        </div>
        {icon && <span className="ml-1 opacity-50 group-hover:opacity-80 transition-opacity">{icon}</span>}
        {badge && (
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
    </button>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColor = color || "bg-indigo-500/60";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs ${theme.textPrimary}`}>{label}</span>
        <span className={`text-xs font-semibold ${theme.textPrimary}`}>{count} <span className={`${theme.textMuted} font-normal`}>({pct}%)</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${meta?.color || "bg-gray-400"}`} />
  );
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── MER Recent Activity (paginated) ── */

function MERRecentActivity({ items }: { items: MERItem[] }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ITEM_HEIGHT = 52;
    const calc = () => { setPageSize(Math.max(3, Math.floor(el.clientHeight / ITEM_HEIGHT))); };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="flex flex-col min-h-0">
      <div className="shrink-0 flex items-center gap-2 px-3 h-8 border-b border-slate-200">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Recent Activity</h3>
        {items.length > 0 && (
          <span className="ml-auto text-[10px] font-mono text-slate-400 shrink-0">{items.length}</span>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-12 text-xs text-slate-400 italic">No recent activity</div>
        ) : (
          paginatedItems.map((m) => (
            <button key={m.id} type="button"
              onClick={() => navigate("/plan/mer")}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors">
              <StatusDot status={m.status} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-900 truncate">{m.title}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span>{m.merCode || `MER-${m.id}`}</span>
                  <span>·</span>
                  <span>{formatDate(m.createdAt)}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${PRIORITY_META[m.priority]?.color || "text-muted-foreground"}`}>
                {PRIORITY_META[m.priority]?.label || m.priority}
              </span>
            </button>
          ))
        )}
      </div>
      <div className="shrink-0 flex items-center h-8 px-3 border-t border-slate-200">
        <CompactPagination
          currentPage={safePage}
          totalItems={items.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function MERDashboardPage() {
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [chartView, setChartView] = useState<"type" | "priority">("type");

  // Ctrl+F / Cmd+F focuses the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { data: summaryData, loading: summaryLoading, refetch: refetchSummary } = useQuery<{ merSummary: MERSummaryData }>(MER_SUMMARY_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const { data: listData, loading: listLoading, refetch: refetchList } = useQuery<{ manufacturingEngineeringRequests: MERItem[] }>(MER_LIST_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const summary = summaryData?.merSummary || null;
  const debouncedSearch = useDebouncedValue(search, 250);
  const merList = (listData?.manufacturingEngineeringRequests || []).filter((m) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.merCode.toLowerCase().includes(q) ||
      m.submittedBy.toLowerCase().includes(q) ||
      m.requestType.toLowerCase().includes(q)
    );
  });

  // Derived metrics
  const pipelineTotal = summary ? summary.submitted + summary.underReview + summary.approved + summary.inProgress + summary.completed : 0;
  const completionRate = pipelineTotal > 0 ? Math.round((summary!.completed / pipelineTotal) * 100) : 0;
  const rejectionRate = summary && summary.total > 0 ? Math.round((summary.rejected / summary.total) * 100) : 0;

  // Recent activity (paginated by creation date)
  const allRecentMERs = [...merList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Upcoming deadlines (due within 7 days, not overdue)
  const upcomingDeadlines = merList.filter((m) => {
    if (["COMPLETED", "CANCELLED", "REJECTED"].includes(m.status)) return false;
    if (!m.dueDate) return false;
    const days = daysUntil(m.dueDate);
    return days !== null && days >= 0 && days <= 7;
  });

  // Cost summary
  const totalEstimated = merList.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);

  const hRefresh = useCallback(async () => {
    await Promise.all([refetchSummary(), refetchList()]);
    setSuccessMsg("Data refreshed");
    setTimeout(() => setSuccessMsg(null), 3000);
  }, [refetchSummary, refetchList]);

  const loading = summaryLoading && listLoading && !summary;
  const noData = !summaryLoading && !summary;

  return (
    <>
      <style>{`@media print { .print-ignore { display: none !important; } .print-area { display: block !important; max-width: 100% !important; border: none !important; } body { background: white !important; } }`}</style>
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        {successMsg && <div className={`shrink-0 h-8 flex items-center justify-center ${theme.toastSuccess} text-sm font-semibold border-b print-ignore`}>{successMsg}</div>}
        <div className="print-ignore">
          <PageHeader icon={<ClipboardList className="h-5 w-5 stroke-current" />}
            iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
            title="MER Dashboard" subtitle="Manufacturing Engineering Requests — analytics and overview" />
        </div>
        <div className="print-ignore">
          <ExplorerToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by title, code, or requester..."
            searchDebouncing={search !== debouncedSearch}
            searchRef={searchRef}
            actions={<ExplorerToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />}
          />
        </div>

        <div className="print-area flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-5 p-4">
            {loading ? (
              /* Loading Skeleton */
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-4xl mb-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="border border-slate-200 bg-white p-3 animate-pulse">
                      <div className="space-y-2">
                        <div className="h-3 w-16 rounded bg-slate-100" />
                        <div className="h-5 w-10 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-current" />
                  Loading MER data...
                </div>
              </div>
            ) : noData ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>No MER data yet</h3>
                <p className={`text-xs ${theme.textSecondary} leading-relaxed max-w-xs mb-4`}>
                  Create manufacturing engineering requests to see the analytics dashboard here.
                </p>
                <div className="flex gap-2">
                    <button type="button" onClick={() => navigate("/plan/mer")}
                      className="inline-flex h-8 items-center gap-1.5 bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                      New MER
                    </button>
                    <button type="button" onClick={hRefresh}
                      className="inline-flex h-8 items-center gap-1.5 border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                    <RefreshCw className="h-3 w-3 stroke-current" /> Refresh
                  </button>
                </div>
              </div>
            ) : summary ? (
              <>
                {/* ═══ ROW 1: KEY METRICS ═══ */}
                <SectionCard title="Key Metrics">
                  <div className="grid grid-cols-2 md:grid-cols-9 gap-2">
                    <KpiCard label="Submitted" value={summary.submitted}
                      onClick={() => navigate("/plan/mer")} />
                    <KpiCard label="Under Review" value={summary.underReview}
                      badge={summary.underReview > 0 ? { text: "Needs attention", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" } : undefined} />
                    <KpiCard label="Approved" value={summary.approved} />
                    <KpiCard label="In Progress" value={summary.inProgress} />
                    <KpiCard label="Completed" value={summary.completed}
                      badge={completionRate > 0 ? { text: `${completionRate}% rate`, color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" } : undefined} />
                    <KpiCard label="Rejected" value={summary.rejected} muted={summary.rejected === 0}
                      badge={rejectionRate > 0 ? { text: `${rejectionRate}%`, color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" } : undefined} />
                    <KpiCard label="Cancelled" value={summary.cancelled} muted={summary.cancelled === 0} />
                    <KpiCard label="Overdue" value={summary.overdue} muted={summary.overdue === 0} />
                    <KpiCard label="Est. Cost" value={`$${totalEstimated.toLocaleString()}`} muted={totalEstimated === 0} />
                  </div>
                </SectionCard>

                {/* ═══ ROW 3: BREAKDOWN + COST ═══ */}
                <div>
                  <div className="bg-white border border-slate-200 divide-y divide-slate-200">
                    <div className="flex items-center gap-2 px-3 h-8">
                    <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Breakdown</h3>
                      <div className="ml-auto flex items-center gap-0.5 bg-slate-100 p-0.5">
                        <button type="button" onClick={() => setChartView("type")}
                          className={`inline-flex h-6 items-center px-2 text-[10px] font-semibold transition-all ${chartView === "type" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                          By Type
                        </button>
                        <button type="button" onClick={() => setChartView("priority")}
                          className={`inline-flex h-6 items-center px-2 text-[10px] font-semibold transition-all ${chartView === "priority" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                          By Priority
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                    {chartView === "type" ? (
                      summary.byType.length === 0 ? (
                        <div className={`flex items-center justify-center h-24 text-xs italic ${theme.textMuted}`}>No data by type</div>
                      ) : (
                        <div className="space-y-2.5">
                            {summary.byType.map((t) => {
                              const meta = TYPE_META[t.requestType];
                              const barColors: Record<string, string> = {
                                ENGINEERING_CHANGE: "bg-blue-500",
                                TOOLING: "bg-amber-500",
                                PROCESS_IMPROVEMENT: "bg-green-500",
                                EQUIPMENT_MODIFICATION: "bg-purple-500",
                              };
                              return (
                                <div key={t.requestType} className="flex items-center gap-2">
                                  {meta && <meta.icon className={`h-3.5 w-3.5 shrink-0 ${meta.color} stroke-current`} />}
                                  <div className="flex-1">
                                    <BarRow label={meta?.label || t.requestType} count={t.count} total={summary.total}
                                      color={barColors[t.requestType] || "bg-indigo-500"} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                      )
                    ) : (
                      summary.byPriority.length === 0 ? (
                        <div className={`flex items-center justify-center h-24 text-xs italic ${theme.textMuted}`}>No data by priority</div>
                      ) : (
                        <div className="space-y-2.5">
                            {summary.byPriority.map((p) => {
                              const meta = PRIORITY_META[p.priority];
                              const barColors: Record<string, string> = {
                                CRITICAL: "bg-red-500",
                                HIGH: "bg-orange-500",
                                MEDIUM: "bg-blue-500",
                                LOW: "bg-gray-400",
                              };
                              return (
                                <BarRow key={p.priority} label={meta?.label || p.priority} count={p.count} total={summary.total}
                                  color={barColors[p.priority] || "bg-indigo-500"} />
                              );
                            })}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                </div>

                {/* ═══ ROW 4: UPCOMING + RECENT ACTIVITY ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-200 border border-slate-200 bg-white">

                  {/* Upcoming deadlines */}
                  <div className="flex flex-col min-h-0">
                    <div className="shrink-0 flex items-center gap-2 px-3 h-8 border-b border-slate-200">
                      <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Due This Week</h3>
                      {upcomingDeadlines.length > 0 && (
                        <span className="ml-auto text-[10px] font-mono text-amber-700 font-medium">
                          {upcomingDeadlines.length}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
                    {upcomingDeadlines.length === 0 ? (
                      <div className="flex items-center justify-center h-12 text-xs text-slate-400 italic">No upcoming deadlines</div>
                    ) : (
                      upcomingDeadlines.map((m) => {
                          const days = daysUntil(m.dueDate);
                          return (
                            <button key={m.id} type="button"
                              onClick={() => navigate("/plan/mer")}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors">
                              <Clock3 className="h-3 w-3 shrink-0 text-amber-500 stroke-current" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-slate-900 truncate">{m.title}</div>
                                <div className="text-[10px] text-amber-600 font-medium">
                                  {days !== null ? (days === 0 ? "Due today" : `${days}d remaining`) : "Upcoming"}
                                </div>
                              </div>
                              <StatusDot status={m.status} />
                            </button>
                          );
                        })
                    )}
                    </div>
                  </div>

                  {/* Recent Activity (paginated) */}
                  <MERRecentActivity items={allRecentMERs} />
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center px-4 text-xs text-muted-foreground font-medium">
          <span>MER Dashboard</span>
        </div>
      </div>
    </>
  );
}
