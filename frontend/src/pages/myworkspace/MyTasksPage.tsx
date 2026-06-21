import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ListChecks, RefreshCw, Play, CheckCircle, XCircle,
  AlertTriangle, Calendar, ExternalLink, ChevronRight,
  ArrowRight, X,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { Toolbar, ToolbarSearch, ToolbarDropdown, ToolbarButton } from "@/components/shared/Toolbar";
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
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  WAITING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const PRIORITY_DOTS: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
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

/* ── Main Component ── */

export function MyTasksPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterOverdue, setFilterOverdue] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  /* ── Split pane resize ── */
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 10), 50));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

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

  const [startTask] = useMutation(START_TASK_MUTATION);
  const [completeTask] = useMutation(COMPLETE_TASK_MUTATION);
  const [cancelTask] = useMutation(CANCEL_TASK_MUTATION);

  const tasks: WorkspaceTaskNode[] = tasksData?.myTasks || [];
  const summary = summaryData?.taskSummary;
  const sel = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null;

  /* ── Mutations ── */
  const hStart = useCallback(async () => {
    if (!sel) return;
    setMutationError(null);
    const res = await startTask({ variables: { id: sel.id } });
    if (res.data?.startTask?.errors?.length > 0) {
      setMutationError(res.data.startTask.errors[0].message);
      return;
    }
    setSuccessMsg("Task started");
    refetch();
  }, [sel, startTask, refetch]);

  const hComplete = useCallback(async () => {
    if (!sel) return;
    setMutationError(null);
    const res = await completeTask({ variables: { id: sel.id } });
    if (res.data?.completeTask?.errors?.length > 0) {
      setMutationError(res.data.completeTask.errors[0].message);
      return;
    }
    setSuccessMsg("Task completed");
    refetch();
  }, [sel, completeTask, refetch]);

  const hCancel = useCallback(async () => {
    if (!sel) return;
    setMutationError(null);
    const res = await cancelTask({ variables: { id: sel.id } });
    if (res.data?.cancelTask?.errors?.length > 0) {
      setMutationError(res.data.cancelTask.errors[0].message);
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
      {sel && (
        <>
          <ToolbarButton icon={Play} label="Start" onClick={hStart} disabled={!canStart} title="Start task" />
          <ToolbarButton icon={CheckCircle} label="Complete" onClick={hComplete} disabled={!canComplete} variant="success" title="Complete task" />
          <ToolbarButton icon={XCircle} label="Cancel" onClick={hCancel} disabled={!canCancel} title="Cancel task" />
          <span className="h-5 w-px shrink-0 bg-border/25" />
        </>
      )}
      <ToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />
    </div>
  );

  /* ── Task List ── */

  const taskList = (
    <div className="flex flex-col min-h-0 overflow-hidden h-full">
      <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
        <span className={`text-sm font-medium ${theme.textMuted}`}>Tasks</span>
        <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{tasks.length}</span>
      </div>
      <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />
            Loading...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <ListChecks className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className={`text-sm font-medium ${theme.textMuted}`}>No tasks assigned to you</p>
            <p className={`text-xs ${theme.textMuted} mt-0.5`}>When tasks are assigned, they will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedId(t.id); }}
                className={`group flex items-start gap-2.5 px-4 py-2.5 cursor-pointer transition-all duration-150 min-h-0 ${
                  selectedId === t.id
                    ? "bg-emerald-50 border-l-2 border-emerald-500"
                    : "border-l-2 border-l-transparent hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOTS[t.priority] || "bg-slate-400"}`} />
                    <span className={`min-w-0 truncate text-sm font-medium ${theme.textPrimary} ${selectedId === t.id ? "text-emerald-900" : ""}`} title={t.title}>
                      {t.title}
                    </span>
                    {isOverdue(t.dueDate, t.status) && (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${STATUS_STYLES[t.status] || ""}`}>
                      {statusLabel(t.status)}
                    </span>
                    {t.priority && t.priority !== "MEDIUM" && (
                      <span className={`text-[10px] font-medium ${t.priority === "HIGH" ? "text-orange-600" : t.priority === "CRITICAL" ? "text-red-600" : theme.textMuted}`}>
                        {priorityLabel(t.priority)}
                      </span>
                    )}
                    {t.sourceModule && (
                      <span className={`text-[10px] ${theme.textMuted}`}>
                        {sourceModuleLabel(t.sourceModule)}
                      </span>
                    )}
                    {t.dueDate && (
                      <span className={`text-[10px] ${isOverdue(t.dueDate, t.status) ? "text-red-500 font-semibold" : theme.textMuted}`}>
                        <Calendar className="inline h-2.5 w-2.5 mr-0.5 stroke-current" />
                        {t.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 ${selectedId === t.id ? "text-emerald-600" : "text-muted-foreground/30"}`} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 flex h-8 items-center border-t border-border/50 bg-muted px-4">
        <span className={`text-xs ${theme.textMuted}`}>
          {summary ? `${summary.total} total · ${summary.open} open · ${summary.overdue} overdue · ${summary.completed} completed` : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
        </span>
      </div>
    </div>
  );

  /* ── Detail ── */

  const taskDetail = sel ? (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-5 py-4 space-y-5">
        {/* Title + badges */}
        <div>
          <div className="flex items-start gap-3">
            <h2 className={`text-base font-bold ${theme.textPrimary} flex-1`}>{sel.title}</h2>
            <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border shrink-0 ${STATUS_STYLES[sel.status] || ""}`}>
              {statusLabel(sel.status)}
            </span>
          </div>
          {sel.sourceTitle && (
            <p className={`text-xs ${theme.textMuted} mt-1 flex items-center gap-1.5`}>
              <ExternalLink className="h-3 w-3 stroke-current" />
              {sel.sourceTitle}
              {sel.sourceModule && <span className="text-[10px]">({sourceModuleLabel(sel.sourceModule)})</span>}
            </p>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide`}>Priority</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${PRIORITY_DOTS[sel.priority] || "bg-slate-400"}`} />
              <span className={`text-sm ${theme.textPrimary}`}>{priorityLabel(sel.priority)}</span>
            </div>
          </div>
          {sel.dueDate && (
            <div>
              <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide`}>Due Date</p>
              <p className={`text-sm flex items-center gap-1 mt-0.5 ${isOverdue(sel.dueDate, sel.status) ? "text-red-600 font-semibold" : theme.textPrimary}`}>
                <Calendar className="h-3.5 w-3.5 stroke-current" />
                {sel.dueDate}
                {isOverdue(sel.dueDate, sel.status) && <AlertTriangle className="h-3 w-3 stroke-current" />}
              </p>
            </div>
          )}
          {sel.assignedTo && (
            <div>
              <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide`}>Assigned To</p>
              <p className={`text-sm mt-0.5 ${theme.textPrimary}`}>{sel.assignedTo}</p>
            </div>
          )}
          {sel.sourceModule && (
            <div>
              <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide`}>Source Module</p>
              <p className={`text-sm mt-0.5 ${theme.textPrimary}`}>{sourceModuleLabel(sel.sourceModule)}</p>
            </div>
          )}
          {sel.completedAt && (
            <div>
              <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide`}>Completed At</p>
              <p className={`text-sm mt-0.5 ${theme.textPrimary}`}>
                {new Date(sel.completedAt).toLocaleDateString()}
                {sel.completedBy ? ` by ${sel.completedBy}` : ""}
              </p>
            </div>
          )}
          {sel.createdBy && (
            <div>
              <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide`}>Created By</p>
              <p className={`text-sm mt-0.5 ${theme.textPrimary}`}>{sel.createdBy}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {sel.description && (
          <div>
            <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide mb-1`}>Description</p>
            <p className={`text-sm leading-relaxed ${theme.textSecondary}`}>{sel.description}</p>
          </div>
        )}

        {/* Notes */}
        {sel.notes && (
          <div>
            <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide mb-1`}>Notes</p>
            <p className={`text-sm leading-relaxed ${theme.textSecondary}`}>{sel.notes}</p>
          </div>
        )}

        {/* Source Reference */}
        {sel.sourceTitle && (
          <div className={`border-t border-border/20 pt-4`}>
            <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide mb-2`}>Source Reference</p>
            <div className={`flex items-center gap-2 text-sm ${theme.textPrimary}`}>
              {sel.sourceType && <span className="font-mono text-[11px] text-muted-foreground">{sel.sourceType}#{sel.sourceId}</span>}
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>{sel.sourceTitle}</span>
              <span className={`text-[10px] ${theme.textMuted} px-1.5 py-0.5 border`}>{sourceModuleLabel(sel.sourceModule || sel.sourceType)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : (
    /* ── Dashboard / Summary ── */
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="p-5 space-y-5">
        <div>
          <p className={`text-xs font-medium ${theme.textMuted} uppercase tracking-wide mb-3`}>Task Overview</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="border border-border/60 bg-card p-3">
              <p className={`text-[10px] font-medium ${theme.textMuted}`}>Open</p>
              <p className="text-lg font-bold text-blue-600">{summary?.open ?? "—"}</p>
            </div>
            <div className="border border-border/60 bg-card p-3">
              <p className={`text-[10px] font-medium ${theme.textMuted}`}>In Progress</p>
              <p className="text-lg font-bold text-amber-600">{summary?.inProgress ?? "—"}</p>
            </div>
            <div className="border border-border/60 bg-card p-3">
              <p className={`text-[10px] font-medium ${theme.textMuted}`}>Due Today</p>
              <p className="text-lg font-bold text-orange-600">{summary?.dueToday ?? "—"}</p>
            </div>
            <div className="border border-border/60 bg-card p-3">
              <p className={`text-[10px] font-medium ${theme.textMuted}`}>Overdue</p>
              <p className={`text-lg font-bold ${(summary?.overdue ?? 0) > 0 ? "text-red-600" : "text-foreground"}`}>{summary?.overdue ?? "—"}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border/60 bg-card p-3">
            <p className={`text-[10px] font-medium ${theme.textMuted}`}>Completed This Week</p>
            <p className="text-lg font-bold text-green-600">{summary?.completedThisWeek ?? "—"}</p>
          </div>
          <div className="border border-border/60 bg-card p-3">
            <p className={`text-[10px] font-medium ${theme.textMuted}`}>High Priority</p>
            <p className={`text-lg font-bold ${(summary?.highPriority ?? 0) > 0 ? "text-red-600" : "text-foreground"}`}>{summary?.highPriority ?? "—"}</p>
          </div>
          <div className="border border-border/60 bg-card p-3">
            <p className={`text-[10px] font-medium ${theme.textMuted}`}>Total Tasks</p>
            <p className="text-lg font-bold text-foreground">{summary?.total ?? "—"}</p>
          </div>
        </div>
        {tasks.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <ListChecks className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className={`text-sm font-medium ${theme.textMuted}`}>No tasks assigned to you</p>
            <p className={`text-xs ${theme.textMuted} mt-1`}>When tasks are assigned from any module, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppPageLayout
      title="My Tasks"
      subtitle="Track assigned work, follow-ups, approvals, and actions across your workspace."
      icon={<ListChecks />}
      iconClass={theme.iconBoxSky}
      toolbar={
        <Toolbar
          left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search tasks..." />}
          center={<>
            <ToolbarDropdown value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} className="w-32" />
            <ToolbarDropdown value={filterPriority} onChange={setFilterPriority} options={PRIORITY_OPTIONS} className="w-28" />
            <ToolbarDropdown value={filterOverdue} onChange={setFilterOverdue} options={OVERDUE_OPTIONS} className="w-24" />
          </>}
          right={toolbarActions}
        />
      }
      leftColumn={taskList}
      leftColumnWidth="w-[20%]"
      footer={
        <span className={`flex items-center gap-4 text-xs ${theme.textMuted}`}>
          <span className="font-medium">My Tasks</span>
          <span>{summary ? `${summary.total} total` : `${tasks.length} records`}</span>
          <span>{summary ? `${summary.open} open` : ""}</span>
          <span className={summary?.overdue && summary.overdue > 0 ? "text-red-500 font-semibold" : ""}>{summary ? `${summary.overdue} overdue` : ""}</span>
          <span className="flex-1" />
          {sel && <span className="font-mono text-[10px]">ID: {sel.id}</span>}
        </span>
      }
    >
      {mutationError && (
        <div className="shrink-0 px-4 pt-2">
          <p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p>
        </div>
      )}
      {successMsg && (
        <div className={`shrink-0 h-8 flex items-center justify-center ${theme.toastSuccess} text-sm font-semibold border-b`}>
          {successMsg}
        </div>
      )}
      {taskDetail}
    </AppPageLayout>
  );
}
