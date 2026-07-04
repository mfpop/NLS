import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ListChecks, RefreshCw, Play, CheckCircle, XCircle,
  AlertTriangle, Calendar, ExternalLink,
  ArrowRight, Clock, ArrowUpRight, Activity, AlertOctagon,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarDropdown, ToolbarButton, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { theme } from "@/styles/themeTokens";
import {
  MY_TASKS_QUERY,
  TASK_SUMMARY_QUERY,
  START_TASK_MUTATION,
  COMPLETE_TASK_MUTATION,
  CANCEL_TASK_MUTATION,
} from "@/graphql/workspaceQueries";

/* ── Types ── */

interface WorkspaceTaskNode {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string;
  dueDate: string | null;
  sourceType: string;
  sourceId: number | null;
  sourceTitle: string;
  sourceModule: string;
  createdBy: string;
  completedAt: string | null;
  completedBy: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskSummary {
  open: number;
  inProgress: number;
  waiting: number;
  completed: number;
  overdue: number;
  dueToday: number;
  completedThisWeek: number;
  highPriority: number;
  total: number;
}

/* ── Helpers ── */

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-primary/15 text-primary dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-warning/15 text-warning dark:bg-amber-900/30 dark:text-amber-300",
  WAITING: "bg-muted text-muted-foreground dark:bg-slate-800 dark:text-muted-foreground/60",
  COMPLETED: "bg-success/15 text-success dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-muted text-muted-foreground dark:bg-slate-800 dark:text-muted-foreground/60",
};

const PRIORITY_DOTS: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-warning/100",
  CRITICAL: "bg-danger/100",
};

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-primary/100",
  IN_PROGRESS: "bg-warning/100",
  WAITING: "bg-slate-400",
  COMPLETED: "bg-success/100",
  CANCELLED: "bg-slate-300",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const OVERDUE_OPTIONS = [
  { value: "", label: "All" },
  { value: "overdue", label: "Overdue" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    OPEN: "Open", IN_PROGRESS: "In Progress", WAITING: "Waiting",
    COMPLETED: "Completed", CANCELLED: "Cancelled",
  };
  return map[s] || s;
}

function priorityLabel(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function sourceModuleLabel(s: string): string {
  const map: Record<string, string> = {
    SAFETY: "Safety", QUALITY: "Quality", MAINTENANCE: "Maintenance",
    IMPROVE: "Improve", CHECK: "Check", DOCUMENT_CONTROL: "Doc Control",
    MER: "MER", MANUAL: "Manual",
  };
  return map[s] || s;
}

/* ── Shared UI Components ── */

function MetricCell({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-3 min-w-0">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
        <p className={`text-lg font-bold tabular-nums ${color} leading-tight`}>{value}</p>
      </div>
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count?: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 h-8 flex items-center justify-between px-3 border-b border-border bg-muted">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <span className="text-sm font-semibold text-foreground truncate">{title}</span>
        </div>
        {count !== undefined && <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{count}</span>}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs italic text-muted-foreground px-3 text-center">
      {message}
    </div>
  );
}

/* ── Main Component ── */

export function MyTasksPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterOverdue, setFilterOverdue] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  /* ── Pagination ── */
  const [page, setPage] = useState(1);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [autoPageSize, setAutoPageSize] = useState(25);

  /* Auto-calculate visible rows per page */
  useEffect(() => {
    const el = scrollableRef.current;
    if (!el) return;
    const ITEM_HEIGHT = 68;
    const calc = () => {
      setAutoPageSize(Math.max(3, Math.floor(el.clientHeight / ITEM_HEIGHT)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { setPage(1); }, [filterStatus, filterPriority, filterOverdue, search]);

  /* ── GraphQL ── */
  const { data: tasksData, loading, refetch } = useQuery<{ myTasks: WorkspaceTaskNode[] }>(
    MY_TASKS_QUERY,
    {
      variables: {
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        search: search || undefined,
        isOverdue: filterOverdue === "overdue" || undefined,
      },
      fetchPolicy: "cache-and-network",
    },
  );

  const { data: summaryData } = useQuery<{ taskSummary: TaskSummary }>(TASK_SUMMARY_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const [startTask] = useMutation<{ startTask: { errors?: { field: string; code: string; message: string }[] | null } }>(START_TASK_MUTATION);
  const [completeTask] = useMutation<{ completeTask: { errors?: { field: string; code: string; message: string }[] | null } }>(COMPLETE_TASK_MUTATION);
  const [cancelTask] = useMutation<{ cancelTask: { errors?: { field: string; code: string; message: string }[] | null } }>(CANCEL_TASK_MUTATION);

  const tasks: WorkspaceTaskNode[] = tasksData?.myTasks || [];
  const summary = summaryData?.taskSummary;
  const sel = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null;

  /* ── Pagination derived values ── */
  const effectivePageSize = autoPageSize;
  const pageCount = Math.max(1, Math.ceil(tasks.length / effectivePageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedTasks = tasks.slice((safePage - 1) * effectivePageSize, safePage * effectivePageSize);

  /* ── Mutations ── */
  const hStart = useCallback(async () => {
    if (!sel) return;
    setMutationError(null);
    const res = await startTask({ variables: { id: sel.id } });
    const startErrors = res.data?.startTask?.errors;
    if (startErrors && startErrors.length > 0) {
      setMutationError(startErrors[0].message);
      return;
    }
    setSuccessMsg("Task started");
    refetch();
  }, [sel, startTask, refetch]);

  const hComplete = useCallback(async () => {
    if (!sel) return;
    setMutationError(null);
    const res = await completeTask({ variables: { id: sel.id } });
    const completeErrors = res.data?.completeTask?.errors;
    if (completeErrors && completeErrors.length > 0) {
      setMutationError(completeErrors[0].message);
      return;
    }
    setSuccessMsg("Task completed");
    refetch();
  }, [sel, completeTask, refetch]);

  const hCancel = useCallback(async () => {
    if (!sel) return;
    setMutationError(null);
    const res = await cancelTask({ variables: { id: sel.id } });
    const cancelErrors = res.data?.cancelTask?.errors;
    if (cancelErrors && cancelErrors.length > 0) {
      setMutationError(cancelErrors[0].message);
      return;
    }
    setSuccessMsg("Task cancelled");
    refetch();
  }, [sel, cancelTask, refetch]);

  const hRefresh = useCallback(() => { refetch(); }, [refetch]);

  /* ── Render helpers ── */

  const canStart = sel?.status === "OPEN";
  const canComplete = sel?.status === "IN_PROGRESS" || sel?.status === "WAITING";
  const canCancel = sel && !["COMPLETED", "CANCELLED"].includes(sel.status);

  const toolbarActions = (
    <div className="flex items-center gap-1.5">
      <ToolbarButton icon={Play} label="Start" onClick={hStart} disabled={!sel || !canStart} title="Start task" variant="warning" />
      <ToolbarButton icon={CheckCircle} label="Complete" onClick={hComplete} disabled={!sel || !canComplete} variant="edit" title="Complete task" />
      <ToolbarButton icon={XCircle} label="Cancel" onClick={hCancel} disabled={!sel || !canCancel} title="Cancel task" variant="danger" />
      <ToolbarSeparator />
      <ToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} variant="neutral" />
    </div>
  );

  /* ── Task List ── */

  const taskList = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted border-r border-border-major">
      <div className="shrink-0 h-9 border-b border-border bg-muted flex items-center justify-between px-3">
        <span className="text-sm font-semibold text-foreground">Tasks</span>
        {loading && tasks.length === 0 ? null : (
          <span className="inline-flex items-center justify-center h-[18px] min-w-[22px] px-1.5 text-[11px] font-semibold rounded-sm border border-border bg-card text-muted-foreground whitespace-nowrap">
            {tasks.length}
          </span>
        )}
      </div>
      <div ref={scrollableRef} className="flex-1 min-h-0 overflow-y-auto bg-muted">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />
            Loading...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-xs font-medium text-muted-foreground">No tasks assigned</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">Assigned tasks will appear here.</p>
          </div>
        ) : (
          <div>              {paginatedTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedId(t.id); }}
                className={`group mx-1 my-0.5 flex h-16 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${
                  selectedId === t.id
                    ? "bg-table-selected border-l-2 border-l-amber-500"
                    : "border-l-2 border-l-transparent hover:bg-table-row-hover"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    {t.priority && t.priority !== "MEDIUM" && (
                      <span className={`shrink-0 inline-block h-2 w-2 rounded-full ${t.priority === "CRITICAL" ? "bg-danger/100" : t.priority === "HIGH" ? "bg-warning/100" : "bg-slate-400"}`} />
                    )}
                    <span className={`min-w-0 truncate text-sm font-semibold text-foreground`} title={t.title}>{t.title}</span>
                    {isOverdue(t.dueDate, t.status) && (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-danger" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${STATUS_STYLES[t.status] || ""}`}>
                      {statusLabel(t.status)}
                    </span>
                    <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                    <span className="min-w-0 flex-1 truncate">{sourceModuleLabel(t.sourceModule) || "General"}</span>
                    {t.dueDate && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                        <span className={`text-[10px] ${isOverdue(t.dueDate, t.status) ? "text-danger font-semibold" : "text-muted-foreground"}`}>
                          <Calendar className="inline h-2.5 w-2.5 mr-0.5 stroke-current" />
                          {t.dueDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[t.status] || "bg-slate-400"}`} title={statusLabel(t.status)} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 h-10 border-t border-border bg-muted px-3 flex items-center gap-2 text-xs text-muted-foreground">
        {tasks.length === 0 ? (
          <span className="font-medium">0 tasks</span>
        ) : (
          <>
            <span className="font-medium whitespace-nowrap">
              {(safePage - 1) * effectivePageSize + 1}–{Math.min(safePage * effectivePageSize, tasks.length)} of {tasks.length}
            </span>
            <div className="flex-1" />
            {pageCount > 1 && (
              <div className="flex items-center gap-0.5">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)}
                  className="inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors" title="First page">
                  {"\u00AB"}
                </button>
                <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors" title="Previous page">
                  {"\u2039"}
                </button>
                <div className="flex items-center gap-0.5 mx-1">
                  {(() => {
                    const pages: (number | "...")[] = [];
                    const maxVisible = 5;
                    if (pageCount <= maxVisible + 2) {
                      for (let i = 1; i <= pageCount; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      const start = Math.max(2, safePage - 1);
                      const end = Math.min(pageCount - 1, safePage + 1);
                      if (start > 2) pages.push("...");
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (end < pageCount - 1) pages.push("...");
                      pages.push(pageCount);
                    }
                    return pages.map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center w-5 h-7 text-[10px] text-muted-foreground/60 select-none">{"\u2026"}</span>
                      ) : (
                        <button key={p} type="button" onClick={() => setPage(p)}
                          className={`inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] px-1 text-xs font-semibold transition-all ${
                            p === safePage
                              ? "bg-warning/10 border border-warning/30 text-warning"
                              : "text-muted-foreground hover:bg-muted"
                          }`}>
                          {p}
                        </button>
                      )
                    );
                  })()}
                </div>
                <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors" title="Next page">
                  {"\u203A"}
                </button>
                <button type="button" disabled={safePage >= pageCount} onClick={() => setPage(pageCount)}
                  className="inline-flex items-center justify-center h-7 min-w-7 rounded-[2px] text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors" title="Last page">
                  {"\u00BB"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  /* ── Overview sections (no task selected) ── */

  const overviewContent = useMemo(() => {
    if (!loading && !summary && tasks.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <ListChecks className="h-10 w-10 text-slate-200 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No tasks assigned to you</p>
          <p className="text-xs text-muted-foreground/60 mt-1">When tasks are assigned from any module, they will appear here.</p>
        </div>
      );
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
    const isDueSoon = (t: WorkspaceTaskNode) => {
      if (!t.dueDate || t.status === "COMPLETED" || t.status === "CANCELLED") return false;
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      return d >= today && d <= weekEnd;
    };

    const priorityWork = tasks.filter((t) =>
      ["HIGH", "CRITICAL"].includes(t.priority) &&
      ["OPEN", "IN_PROGRESS", "WAITING"].includes(t.status)
    );
    const dueSoon = tasks.filter(isDueSoon);
    const waiting = tasks.filter((t) => t.status === "WAITING");
    const recent = [...tasks].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ).slice(0, 8);

    return (
      <div className="flex-1 min-h-0 grid grid-rows-[30%_30%_40%] divide-y divide-border">
        {/* Row 1: Priority Work */}
        <Section title="Priority Work" count={priorityWork.length} icon={<ArrowUpRight className="h-3.5 w-3.5" />}>
          {priorityWork.length === 0 ? (
            <SectionEmpty message="No priority work" />
          ) : (
            priorityWork.slice(0, 6).map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedId(t.id); }}
                className="flex items-start gap-2 px-3 py-1.5 hover:bg-muted cursor-pointerborder-b border-border"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full mt-1 ${PRIORITY_DOTS[t.priority] || "bg-slate-400"}`} />
                <div className="min-w-0 flex-1">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground block" title={t.title}>{t.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border rounded-sm ${STATUS_STYLES[t.status] || ""}`}>{statusLabel(t.status)}</span>
                    <span className="text-[10px] text-muted-foreground">{sourceModuleLabel(t.sourceModule)}</span>
                    {isOverdue(t.dueDate, t.status) && <span className="text-[10px] text-danger font-semibold">Overdue</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </Section>

        {/* Row 2: Due Today / This Week */}
        <Section title="Due Today / This Week" count={dueSoon.length} icon={<Calendar className="h-3.5 w-3.5" />}>
          {dueSoon.length === 0 ? (
            <SectionEmpty message="No items due this week" />
          ) : (
            dueSoon.slice(0, 6).map((t) => {
              const overdue = isOverdue(t.dueDate, t.status);
              return (
                <div
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); }}
                  className="flex items-start gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer border-b border-border"
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                  <div className="min-w-0 flex-1">
                    <span className="min-w-0 truncate text-sm font-medium text-foreground block" title={t.title}>{t.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] ${overdue ? "text-danger font-semibold" : "text-muted-foreground"}`}>{t.dueDate}</span>
                      {overdue && <AlertTriangle className="h-3 w-3 text-danger" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Section>

        {/* Row 3: Waiting / Blocked + Recent Activity (side-by-side) */}
        <div className="min-h-0 grid grid-cols-[45%_55%] divide-x divide-border">
          <Section title="Waiting / Blocked" count={waiting.length} icon={<Clock className="h-3.5 w-3.5" />}>
            {waiting.length === 0 ? (
              <SectionEmpty message="No blocked or waiting tasks" />
            ) : (
              waiting.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); }}
                  className="flex items-start gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer border-b border-border"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full mt-1 bg-slate-400" />
                  <div className="min-w-0 flex-1">
                    <span className="min-w-0 truncate text-sm font-medium text-foreground block" title={t.title}>{t.title}</span>
                    <span className="text-[10px] text-muted-foreground">{sourceModuleLabel(t.sourceModule)}</span>
                  </div>
                </div>
              ))
            )}
          </Section>

          <Section title="Recent Activity" count={recent.length} icon={<Activity className="h-3.5 w-3.5" />}>
            {recent.length === 0 ? (
              <SectionEmpty message="No recent activity" />
            ) : (
              recent.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); }}
                  className="flex items-start gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer border-b border-border"
                >
                  <Activity className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                  <div className="min-w-0 flex-1">
                    <span className="min-w-0 truncate text-sm font-medium text-foreground block" title={t.title}>{t.title}</span>
                    <span className="text-[10px] text-muted-foreground/60">{sourceModuleLabel(t.sourceModule)} · {statusLabel(t.status)}</span>
                  </div>
                </div>
              ))
            )}
          </Section>
        </div>
      </div>
    );
  }, [summary, tasks, loading]);

  /* ── Detail ── */

  const taskDetail = sel ? (
    <div className="flex-1 min-h-0 overflow-y-auto bg-muted">
      <div className="px-5 py-4 space-y-5">
        {/* Title + badges */}
        <div>
          <div className="flex items-start gap-3">
            <h2 className="text-base font-bold text-foreground flex-1">{sel.title}</h2>
            <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border shrink-0 ${STATUS_STYLES[sel.status] || ""}`}>
              {statusLabel(sel.status)}
            </span>
          </div>
          {sel.sourceTitle && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <ExternalLink className="h-3 w-3 stroke-current" />
              {sel.sourceTitle}
              {sel.sourceModule && <span className="text-[10px]">({sourceModuleLabel(sel.sourceModule)})</span>}
            </p>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${PRIORITY_DOTS[sel.priority] || "bg-slate-400"}`} />
              <span className="text-sm text-foreground">{priorityLabel(sel.priority)}</span>
            </div>
          </div>
          {sel.dueDate && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Due Date</p>
              <p className={`text-sm flex items-center gap-1 mt-0.5 ${isOverdue(sel.dueDate, sel.status) ? "text-danger font-semibold" : "text-foreground"}`}>
                <Calendar className="h-3.5 w-3.5 stroke-current" />
                {sel.dueDate}
                {isOverdue(sel.dueDate, sel.status) && <AlertTriangle className="h-3 w-3 stroke-current" />}
              </p>
            </div>
          )}
          {sel.assignedTo && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Assigned To</p>
              <p className="text-sm mt-0.5 text-foreground">{sel.assignedTo}</p>
            </div>
          )}
          {sel.sourceModule && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Source Module</p>
              <p className="text-sm mt-0.5 text-foreground">{sourceModuleLabel(sel.sourceModule)}</p>
            </div>
          )}
          {sel.completedAt && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Completed At</p>
              <p className="text-sm mt-0.5 text-foreground">
                {new Date(sel.completedAt).toLocaleDateString()}
                {sel.completedBy ? ` by ${sel.completedBy}` : ""}
              </p>
            </div>
          )}
          {sel.createdBy && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Created By</p>
              <p className="text-sm mt-0.5 text-foreground">{sel.createdBy}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {sel.description && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{sel.description}</p>
          </div>
        )}

        {/* Notes */}
        {sel.notes && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{sel.notes}</p>
          </div>
        )}

        {/* Source Reference */}
        {sel.sourceTitle && (
          <div className="border-t border-border pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Source Reference</p>
            <div className="flex items-center gap-2 text-sm text-foreground">
              {sel.sourceType && <span className="font-mono text-[11px] text-muted-foreground/60">{sel.sourceType}#{sel.sourceId}</span>}
              <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
              <span>{sel.sourceTitle}</span>
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 border border-border">{sourceModuleLabel(sel.sourceModule || sel.sourceType)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <AppPageLayout
      title="My Tasks"
      subtitle="Track assigned work, follow-ups, approvals, and actions across your workspace."
      icon={<ListChecks />}
      iconClass={theme.iconBoxSky}
      toolbar={
        <PageToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tasks..."
          filters={<>
            <ToolbarDropdown value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} placeholder="Status" width="w-36" />
            <ToolbarDropdown value={filterPriority} onChange={setFilterPriority} options={PRIORITY_OPTIONS} placeholder="Priority" width="w-36" />
            <ToolbarDropdown value={filterOverdue} onChange={setFilterOverdue} options={OVERDUE_OPTIONS} placeholder="Overdue" width="w-28" />
          </>}
          actions={toolbarActions}
        />
      }
      leftColumn={taskList}
      leftColumnWidth="w-[20%]"
      footer={
        <span className="flex w-full items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">My Tasks</span>
          <span>
            {summary
              ? `Total: ${summary.total} | Open: ${summary.open} | Overdue: ${summary.overdue}`
              : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
          </span>
          <span className="text-muted-foreground/60">
            {tasks.length > 0
              ? `Last updated: ${new Date(Math.max(...tasks.map((t) => new Date(t.updatedAt).getTime()))).toLocaleDateString()}`
              : ""}
          </span>
        </span>
      }
    >
      <div className="h-full flex flex-col min-h-0 bg-muted">
        {/* Integrated Metrics Strip */}
        <div className="shrink-0 h-16 grid grid-cols-6 divide-x divide-border border-b border-border">
          <MetricCell label="Open" value={summary?.open ?? "—"} color="text-primary" icon={<ListChecks className="h-4 w-4 stroke-current text-primary shrink-0" />} />
          <MetricCell label="In Progress" value={summary?.inProgress ?? "—"} color="text-warning" icon={<Clock className="h-4 w-4 stroke-current text-warning shrink-0" />} />
          <MetricCell label="Due Today" value={summary?.dueToday ?? "—"} color={summary?.dueToday ? "text-warning" : "text-muted-foreground"} icon={<Calendar className="h-4 w-4 stroke-current shrink-0" />} />
          <MetricCell label="Overdue" value={summary?.overdue ?? "—"} color={(summary?.overdue ?? 0) > 0 ? "text-danger" : "text-muted-foreground"} icon={<AlertOctagon className="h-4 w-4 stroke-current shrink-0" />} />
          <MetricCell label="Completed This Week" value={summary?.completedThisWeek ?? "—"} color="text-success" icon={<CheckCircle className="h-4 w-4 stroke-current text-success shrink-0" />} />
          <MetricCell label="Total Tasks" value={summary?.total ?? "—"} color="text-muted-foreground" icon={<ListChecks className="h-4 w-4 stroke-current text-muted-foreground shrink-0" />} />
        </div>

        {mutationError && (
          <div className="shrink-0 px-4 py-1.5">
            <p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p>
          </div>
        )}
        {successMsg && (
          <div className="shrink-0 h-8 flex items-center justify-center bg-success/10 border-b border-success/20 text-sm font-semibold text-success">
            {successMsg}
          </div>
        )}

        {loading && !summary && !sel ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <span className="inline-block h-2 w-2 bg-slate-400 animate-pulse mr-2 rounded-full" />
            Loading...
          </div>
        ) : sel ? (
          taskDetail
        ) : (
          overviewContent
        )}
      </div>
    </AppPageLayout>
  );
}
