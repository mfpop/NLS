import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import {
  LayoutDashboard, RefreshCw, AlertTriangle, Calendar,
  ListChecks, Clock, ArrowUpRight, CheckCircle2,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { Toolbar, ToolbarDropdown, ToolbarButton } from "@/components/shared/Toolbar";
import { theme } from "@/styles/themeTokens";
import { MY_WORKSPACE_DASHBOARD_QUERY } from "@/graphql/workspaceQueries";

/* ── Types ── */

interface DashboardItem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  sourceType: string;
  sourceId: number | null;
  sourceTitle: string;
  sourceModule: string;
  dueDate: string | null;
  taskType: string;
}

interface DashboardSummary {
  openTasks: number;
  overdueTasks: number;
  dueToday: number;
  inProgress: number;
  completedToday: number;
  waiting: number;
  highPriority: number;
  total: number;
  priorityWork: DashboardItem[];
  dueSoon: DashboardItem[];
  recentActivity: DashboardItem[];
}

/* ── Helpers ── */

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  WAITING: "bg-slate-100 text-slate-600",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const PRIORITY_DOTS: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function statusLabel(s: string): string {
  const m: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In Progress", WAITING: "Waiting", COMPLETED: "Completed", CANCELLED: "Cancelled" };
  return m[s] || s;
}

function sourceModuleLabel(s: string): string {
  const m: Record<string, string> = { SAFETY: "Safety", QUALITY: "Quality", MAINTENANCE: "Maintenance", IMPROVE: "Improve", CHECK: "Check", MER: "MER", MANUAL: "Manual" };
  return m[s] || s;
}

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "approval", label: "Approvals" },
  { value: "finding", label: "Findings" },
];

/* ── Sub-components ── */

function KpiCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="border border-border/60 bg-card p-3 flex items-center gap-3">
      {icon && <div className={`shrink-0 ${color}`}>{icon}</div>}
      <div className="min-w-0">
        <p className={`text-[10px] font-medium ${theme.textMuted} uppercase tracking-wide truncate`}>{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function ItemRow({ item }: { item: DashboardItem }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer border-b border-border/30 last:border-b-0 min-h-0">
      <span className={`h-2 w-2 shrink-0 rounded-full mt-1 ${PRIORITY_DOTS[item.priority] || "bg-slate-400"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-medium text-foreground" title={item.title}>{item.title}</span>
          {isOverdue(item.dueDate, item.status) && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${STATUS_STYLES[item.status] || ""}`}>{statusLabel(item.status)}</span>
          {item.sourceModule && <span className="text-[10px] text-muted-foreground">{sourceModuleLabel(item.sourceModule)}</span>}
          {item.dueDate && (
            <span className={`text-[10px] ${isOverdue(item.dueDate, item.status) ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
              <Calendar className="inline h-2.5 w-2.5 mr-0.5 stroke-current" />{item.dueDate}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 mt-1" />
    </div>
  );
}

/* ── Main Component ── */

export function MyDashboardPage() {
  const [filter, setFilter] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const initialized = useRef(false);

  const { data, loading, refetch } = useQuery<{ myWorkspaceDashboard: DashboardSummary }>(
    MY_WORKSPACE_DASHBOARD_QUERY,
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

  const dashboard = data?.myWorkspaceDashboard;

  /* ── Filter items by category ── */
  const filterPredicate = (item: DashboardItem) => !filter || item.taskType === filter;

  return (
    <AppPageLayout
      title="Personal Dashboard"
      subtitle="Your assigned work, alerts, approvals, and recent activity across LeanSync."
      icon={<LayoutDashboard />}
      iconClass={theme.iconBoxBrand}
      toolbar={
        <Toolbar
          right={
            <div className="flex items-center gap-2 w-full">
              <ToolbarDropdown value={filter} onChange={setFilter} options={FILTER_OPTIONS} className="w-28" />

              <div className="flex-1" />
              <ToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />
            </div>
          }
        />
      }
      footer={
        <span className={`flex items-center gap-4 text-xs ${theme.textMuted}`}>
          <span className="font-medium">Personal Dashboard</span>
          {lastUpdated && <span>Updated: {lastUpdated}</span>}
          <span className="flex-1" />
          {dashboard ? `${dashboard.total} items · ${dashboard.openTasks} open · ${dashboard.overdueTasks} overdue` : ""}
        </span>
      }
    >
      {loading && !dashboard ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading dashboard...
        </div>
      ) : !dashboard ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <LayoutDashboard className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className={`text-sm font-medium ${theme.textMuted}`}>No assigned work right now.</p>
          <p className={`text-xs ${theme.textMuted} mt-1`}>When tasks are assigned from any module, they will appear here.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* KPI Strip */}
            <div className="grid grid-cols-6 gap-3">
              <KpiCard label="Open Tasks" value={dashboard.openTasks} color="text-blue-600" icon={<ListChecks className="h-4 w-4 stroke-current" />} />
              <KpiCard label="In Progress" value={dashboard.inProgress} color="text-amber-600" icon={<Clock className="h-4 w-4 stroke-current" />} />
              <KpiCard label="Overdue" value={dashboard.overdueTasks} color={dashboard.overdueTasks > 0 ? "text-red-600" : "text-foreground"} icon={<AlertTriangle className="h-4 w-4 stroke-current" />} />
              <KpiCard label="Due Today" value={dashboard.dueToday} color={dashboard.dueToday > 0 ? "text-orange-600" : "text-foreground"} icon={<Calendar className="h-4 w-4 stroke-current" />} />
              <KpiCard label="High Priority" value={dashboard.highPriority} color={dashboard.highPriority > 0 ? "text-red-600" : "text-foreground"} icon={<ArrowUpRight className="h-4 w-4 stroke-current" />} />
              <KpiCard label="Completed Today" value={dashboard.completedToday} color="text-green-600" icon={<CheckCircle2 className="h-4 w-4 stroke-current" />} />
            </div>

            {/* Main grid: 3 columns */}
            <div className="grid grid-cols-3 gap-4 min-h-0">
              {/* Left: Priority Work */}
              <div className="border border-border/50 bg-card flex flex-col min-h-0">
                <div className="shrink-0 h-8 border-b border-border/50 flex items-center px-3 bg-muted/50">
                  <span className="text-xs font-semibold text-foreground">{dashboard.highPriority > 0 ? "My Priority Work" : "Priority Work"}</span>
                  <span className={`ml-auto text-[10px] font-mono ${theme.textMuted}`}>{dashboard.priorityWork.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/30">
                  {dashboard.priorityWork.filter(filterPredicate).length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
                      {filter ? "No priority items for this filter" : "No priority work"}
                    </div>
                  ) : (
                    dashboard.priorityWork.filter(filterPredicate).map((item) => <ItemRow key={item.id} item={item} />)
                  )}
                </div>
              </div>

              {/* Middle: Due Today / This Week */}
              <div className="border border-border/50 bg-card flex flex-col min-h-0">
                <div className="shrink-0 h-8 border-b border-border/50 flex items-center px-3 bg-muted/50">
                  <span className="text-xs font-semibold text-foreground">{dashboard.dueToday > 0 ? "Due Today / This Week" : "Upcoming"}</span>
                  <span className={`ml-auto text-[10px] font-mono ${theme.textMuted}`}>{dashboard.dueSoon.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/30">
                  {dashboard.dueSoon.filter(filterPredicate).length === 0 && dashboard.dueToday === 0 ? (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
                      {filter ? "No due items for this filter" : "No items due this week"}
                    </div>
                  ) : (
                    <>
                      {dashboard.dueToday > 0 && dashboard.dueToday <= 3 && (
                        <div className="px-3 py-1.5 bg-orange-50 border-b border-orange-200 text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 stroke-current" />
                          {dashboard.dueToday} item{dashboard.dueToday !== 1 ? "s" : ""} due today
                        </div>
                      )}
                      {dashboard.dueSoon.filter(filterPredicate).map((item) => <ItemRow key={item.id} item={item} />)}
                    </>
                  )}
                </div>
              </div>

              {/* Right: Recent Activity */}
              <div className="border border-border/50 bg-card flex flex-col min-h-0">
                <div className="shrink-0 h-8 border-b border-border/50 flex items-center px-3 bg-muted/50">
                  <span className="text-xs font-semibold text-foreground">Recent Activity</span>
                  <span className={`ml-auto text-[10px] font-mono ${theme.textMuted}`}>{dashboard.recentActivity.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/30">
                  {dashboard.recentActivity.filter(filterPredicate).length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
                      {filter ? "No recent activity for this filter" : "No recent activity"}
                    </div>
                  ) : (
                    dashboard.recentActivity.filter(filterPredicate).slice(0, 8).map((item) => (
                      <div key={item.id} className="flex items-start gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer border-b border-border/30 last:border-b-0 min-h-0">
                        <span className={`h-2 w-2 shrink-0 rounded-full mt-1 ${PRIORITY_DOTS[item.priority] || "bg-slate-400"}`} />
                        <div className="min-w-0 flex-1">
                          <span className="min-w-0 truncate text-sm font-medium text-foreground block" title={item.title}>{item.title}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-medium border ${STATUS_STYLES[item.status] || ""}`}>{statusLabel(item.status)}</span>
                            {item.sourceModule && <span className="text-[10px] text-muted-foreground">{sourceModuleLabel(item.sourceModule)}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppPageLayout>
  );
}
