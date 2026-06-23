import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Activity, RefreshCw, AlertTriangle, Calendar, ArrowUpRight,
  MessageSquare, FileText, Shield, Wrench,
  ClipboardCheck, Settings, BarChart3, Clock, Users, CheckCircle2,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { ExplorerToolbar, ExplorerToolbarButton, ExplorerToolbarDropdown } from "@/components/shared/ExplorerToolbar";
import { MY_TASKS_QUERY } from "@/graphql/workspaceQueries";

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
  sourceTitle: string;
  sourceModule: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

type ActivityTab = "all" | "mine" | "mentions" | "following";

/* ── Helpers ── */

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700", IN_PROGRESS: "bg-amber-100 text-amber-700",
  WAITING: "bg-slate-100 text-slate-600", COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const MODULE_ICONS: Record<string, typeof Activity> = {
  SAFETY: Shield, QUALITY: ClipboardCheck, MAINTENANCE: Wrench,
  IMPROVE: BarChart3, CHECK: CheckCircle2, DOCUMENT_CONTROL: FileText,
  MER: Settings, MANUAL: FileText, TASK: Activity,
};

const MODULE_COLORS: Record<string, string> = {
  SAFETY: "bg-amber-100 text-amber-700", QUALITY: "bg-blue-100 text-blue-700",
  MAINTENANCE: "bg-orange-100 text-orange-700", IMPROVE: "bg-purple-100 text-purple-700",
  CHECK: "bg-teal-100 text-teal-700", DOCUMENT_CONTROL: "bg-indigo-100 text-indigo-700",
  MER: "bg-rose-100 text-rose-700", MANUAL: "bg-sky-100 text-sky-700",
  TASK: "bg-slate-100 text-slate-700",
};

function statusLabel(s: string): string {
  const m: Record<string, string> = { OPEN: "Opened", IN_PROGRESS: "In Progress", WAITING: "Waiting", COMPLETED: "Completed", CANCELLED: "Cancelled" };
  return m[s] || s;
}

function moduleLabel(s: string): string {
  const map: Record<string, string> = {
    SAFETY: "Safety", QUALITY: "Quality", MAINTENANCE: "Maintenance",
    IMPROVE: "Improve", CHECK: "Check", DOCUMENT_CONTROL: "Doc Control",
    MER: "MER", MANUAL: "Manual",
  };
  return map[s] || s || "General";
}

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

/* ── Activity Row ── */

function ActivityRow({ task }: { task: WorkspaceTaskNode }) {
  const overdue = isOverdue(task.dueDate, task.status);
  const ModuleIcon = MODULE_ICONS[task.sourceModule] || Activity;

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-slate-100 hover:bg-white transition-colors min-h-0 group">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${MODULE_COLORS[task.sourceModule] || "bg-slate-100 text-slate-600"}`}>
        <ModuleIcon className="h-4 w-4 stroke-current" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{task.title}</span>
          {overdue && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-slate-500">
          <span className="font-medium">{task.assignedTo || task.createdBy || "System"}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
          <span className="text-slate-400">{moduleLabel(task.sourceModule)}</span>
          {task.dueDate && (
            <span className={`flex items-center gap-0.5 ${overdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
              <Calendar className="h-2.5 w-2.5 stroke-current" />Due {task.dueDate}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium rounded-sm ${STATUS_STYLES[task.status] || "bg-slate-50 text-slate-600"}`}>
          {statusLabel(task.status)}
        </span>
        <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDateTime(task.updatedAt)}</span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

/* ── Right Column Sections ── */

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center h-8 border-b border-slate-200 px-4">
      <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
      <div className="flex-1" />
      {action}
    </div>
  );
}

function FilterLink({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 w-full h-8 px-4 text-xs text-left transition-colors ${
        active ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-[10px] font-medium text-slate-400 tabular-nums">{count}</span>}
    </button>
  );
}

function SummaryRow({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-4 h-8 border-b border-slate-100 last:border-0">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="flex-1 text-xs text-slate-600 truncate">{label}</span>
      <span className="text-xs font-semibold text-slate-800 tabular-nums">{count}</span>
    </div>
  );
}

/* ── Main Component ── */

export function ActivityFeedPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ActivityTab>("all");
  const [filterActivity, setFilterActivity] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const initialized = useRef(false);

  const { data, loading, refetch } = useQuery<{ myTasks: WorkspaceTaskNode[] }>(
    MY_TASKS_QUERY,
    { fetchPolicy: "cache-and-network" },
  );

  useEffect(() => {
    if (data && !initialized.current) {
      initialized.current = true;
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [data]);

  const hRefresh = useCallback(() => {
    refetch().then(() => setLastUpdated(new Date().toLocaleTimeString()));
  }, [refetch]);

  const allTasks: WorkspaceTaskNode[] = data?.myTasks || [];

  /* ── Filtering ── */
  const now = new Date();
  const filteredByTime = allTasks.filter((t) => {
    if (timeRange === "all") return true;
    const updated = new Date(t.updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    if (timeRange === "24h") return diffMs <= 24 * 60 * 60 * 1000;
    if (timeRange === "7d") return diffMs <= 7 * 24 * 60 * 60 * 1000;
    if (timeRange === "30d") return diffMs <= 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const filteredByTab = activeTab === "mine"
    ? filteredByTime.filter((t) => t.assignedTo?.toLowerCase() === (data?.myTasks?.[0]?.assignedTo || "").toLowerCase())
    : activeTab === "mentions"
      ? filteredByTime.filter((t) => (t.description || "").toLowerCase().includes("@"))
      : filteredByTime;

  const searchTerm = search.toLowerCase();
  const filtered = filteredByTab.filter((t) => {
    if (searchTerm && !t.title.toLowerCase().includes(searchTerm) && !(t.description || "").toLowerCase().includes(searchTerm) && !(t.assignedTo || "").toLowerCase().includes(searchTerm)) return false;
    if (filterActivity && filterActivity !== "all") {
      if (filterActivity === "tasks" && t.sourceType !== "TASK") return false;
      if (filterActivity !== "tasks" && t.sourceModule !== filterActivity.toUpperCase()) return false;
    }
    if (filterModule && filterModule !== "all" && t.sourceModule !== filterModule.toUpperCase()) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  /* ── Summary counts (from filtered list) ── */
  const summaryCounts = {
    tasks: filtered.filter((t) => t.sourceType === "TASK" || t.sourceModule === "TASK").length,
    safety: filtered.filter((t) => t.sourceModule === "SAFETY").length,
    documents: filtered.filter((t) => t.sourceModule === "DOCUMENT_CONTROL" || t.sourceModule === "MANUAL").length,
    comments: filtered.filter((t) => (t.description || "").includes("@")).length,
    mer: filtered.filter((t) => t.sourceModule === "MER").length,
    system: filtered.filter((t) => !["SAFETY", "QUALITY", "MAINTENANCE", "IMPROVE", "CHECK", "DOCUMENT_CONTROL", "MER", "MANUAL", "TASK"].includes(t.sourceModule)).length,
  };

  /* ── Tabs ── */
  const TABS: { key: ActivityTab; label: string; count?: number }[] = [
    { key: "all", label: "All Activities", count: sorted.length },
    { key: "mine", label: "My Activities" },
    { key: "mentions", label: "Mentions" },
    { key: "following", label: "Following" },
  ];

  /* ── Activity filter options ── */
  const ACTIVITY_OPTIONS = [
    { value: "all", label: "All Activities" },
    { value: "tasks", label: "Tasks" },
    { value: "SAFETY", label: "Safety" },
    { value: "QUALITY", label: "Quality" },
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "IMPROVE", label: "Improve" },
    { value: "CHECK", label: "Check" },
    { value: "DOCUMENT_CONTROL", label: "Documents" },
    { value: "MER", label: "MER" },
    { value: "MANUAL", label: "Manual" },
  ];

  const MODULE_OPTIONS = [
    { value: "all", label: "All Modules" },
    { value: "TASK", label: "Tasks" },
    { value: "SAFETY", label: "Safety" },
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "QUALITY", label: "Quality" },
    { value: "DOCUMENT_CONTROL", label: "Documents" },
    { value: "MER", label: "MER" },
    { value: "MANUAL", label: "System" },
  ];

  const TIME_OPTIONS = [
    { value: "all", label: "All Time" },
    { value: "24h", label: "Last 24 hours" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
  ];

  /* ── Render ── */
  return (
    <AppPageLayout
      title="Activity Feed"
      subtitle="Recent activity and updates across your workspace."
      icon={<Activity />}
      iconClass="bg-primary/10 text-primary"
      toolbar={
        <ExplorerToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search activities, users, modules..."
          filters={<>
            <ExplorerToolbarDropdown value={filterActivity} onChange={setFilterActivity} options={ACTIVITY_OPTIONS} placeholder="All Activities" width="w-36" />
            <ExplorerToolbarDropdown value={filterModule} onChange={setFilterModule} options={MODULE_OPTIONS} placeholder="All Modules" width="w-36" />
          </>}
          actions={<ExplorerToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />}
        />
      }
      footer={
        <span className="flex items-center gap-4 text-xs text-slate-500">
          <span className="font-medium">Activity Feed</span>
          <span className="flex-1" />
          {sorted.length > 0 && <span>{sorted.length} activities</span>}
          {lastUpdated && <span className="text-slate-400">Updated: {lastUpdated}</span>}
        </span>
      }
    >
      <div className="flex h-full min-h-0 bg-muted">
        {/* ── Main Feed ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden" style={{ flexBasis: "68%" }}>
          {/* Tabs */}
          <div className="shrink-0 flex items-center border-b border-slate-200 bg-muted">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 h-9 px-3 text-xs font-semibold transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? "text-slate-900 border-sky-500 bg-white"
                    : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 text-[10px] font-semibold rounded-sm ${
                    activeTab === tab.key ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
            <div className="flex-1" />
            <span className="pr-3 text-[10px] text-slate-400 tabular-nums">{sorted.length} items</span>
          </div>

          {/* Activity list */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-muted">
            {loading && allTasks.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-xs text-slate-500">
                <span className="inline-block h-2 w-2 bg-slate-400 animate-pulse mr-2 rounded-full" />
                Loading activity feed...
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <Activity className="h-12 w-12 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-500">No activity yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Updates from tasks, audits, safety, documents, and improvement work will appear here.
                </p>
              </div>
            ) : (
              <div>
                {sorted.map((t) => (
                  <ActivityRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="flex flex-col shrink-0 w-[360px] border-l border-border-major bg-muted min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Activity Filters */}
            <SectionHeader label="Activity Filters" />
            {ACTIVITY_OPTIONS.slice(0, 8).map((o) => (
              <FilterLink
                key={o.value}
                label={o.label}
                active={filterActivity === o.value}
                onClick={() => setFilterActivity(o.value === filterActivity ? "" : o.value)}
              />
            ))}

            {/* Time Range */}
            <SectionHeader label="Time Range" />
            {TIME_OPTIONS.map((o) => (
              <FilterLink
                key={o.value}
                label={o.label}
                active={timeRange === o.value}
                onClick={() => setTimeRange(o.value)}
              />
            ))}

            {/* Activity Summary */}
            <SectionHeader label="Activity Summary" />
            <SummaryRow label="Tasks" count={summaryCounts.tasks} icon={<BarChart3 className="h-3.5 w-3.5" />} />
            <SummaryRow label="Safety" count={summaryCounts.safety} icon={<Shield className="h-3.5 w-3.5" />} />
            <SummaryRow label="Documents" count={summaryCounts.documents} icon={<FileText className="h-3.5 w-3.5" />} />
            <SummaryRow label="Mentions" count={summaryCounts.comments} icon={<MessageSquare className="h-3.5 w-3.5" />} />
            <SummaryRow label="MER" count={summaryCounts.mer} icon={<Wrench className="h-3.5 w-3.5" />} />
            <SummaryRow label="System" count={summaryCounts.system} icon={<Settings className="h-3.5 w-3.5" />} />

            {/* People */}
            <SectionHeader label="People" />
            <SummaryRow label="Total Users" count={allTasks.length > 0 ? new Set(allTasks.map((t) => t.assignedTo || t.createdBy).filter(Boolean)).size : 0} icon={<Users className="h-3.5 w-3.5" />} />
            <SummaryRow label="Active Now" count={0} icon={<Clock className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
