import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { LayoutDashboard, RefreshCw, AlertTriangle, Calendar,
  ListChecks, Clock, ArrowUpRight, CheckCircle2,
  Bell, Activity, PieChart, AlertOctagon,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { ExplorerToolbar, ExplorerToolbarDropdown, ExplorerToolbarButton } from "@/components/shared/ExplorerToolbar";
import { MY_WORKSPACE_DASHBOARD_QUERY } from "@/graphql/workspaceQueries";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

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
  createdAt: string;
}

interface SourceBreakdownItem {
  sourceModule: string;
  count: number;
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
  alertsApprovals: DashboardItem[];
  sourceBreakdown: SourceBreakdownItem[];
}

/* ── Helpers ── */

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  WAITING: "bg-slate-100 text-slate-600 border-slate-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const PRIORITY_DOTS: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const MODULE_LABELS: Record<string, string> = {
  SAFETY: "Safety", QUALITY: "Quality", MAINTENANCE: "Maintenance",
  IMPROVE: "Improve", CHECK: "Check", MER: "MER",
  DOCUMENT_CONTROL: "Documents", MANUAL: "Manual", DOCUMENTS: "Documents",
};

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function statusLabel(s: string): string {
  const m: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In Progress", WAITING: "Waiting", COMPLETED: "Completed", CANCELLED: "Cancelled" };
  return m[s] || s;
}

function moduleLabel(s: string): string {
  return MODULE_LABELS[s] || s || "General";
}

const MODULE_COLORS: Record<string, string> = {
  SAFETY: "text-red-600 bg-red-50 border-red-200",
  QUALITY: "text-blue-600 bg-blue-50 border-blue-200",
  MAINTENANCE: "text-amber-600 bg-amber-50 border-amber-200",
  IMPROVE: "text-emerald-600 bg-emerald-50 border-emerald-200",
  CHECK: "text-violet-600 bg-violet-50 border-violet-200",
  MER: "text-cyan-600 bg-cyan-50 border-cyan-200",
  DOCUMENTS: "text-slate-600 bg-slate-100 border-slate-200",
  DOCUMENT_CONTROL: "text-slate-600 bg-slate-100 border-slate-200",
  MANUAL: "text-slate-600 bg-slate-100 border-slate-200",
};

function moduleBadge(s: string) {
  const cls = MODULE_COLORS[s] || "text-slate-600 bg-slate-100 border-slate-200";
  return `inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-sm ${cls}`;
}

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "approval", label: "Approvals" },
  { value: "alert", label: "Alerts" },
  { value: "safety", label: "Safety" },
  { value: "quality", label: "Quality" },
  { value: "maintenance", label: "Maintenance" },
  { value: "mer", label: "MER" },
  { value: "documents", label: "Documents" },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ── Helpers ── */

function computeDailyCounts(items: DashboardItem[]): { day: string; count: number }[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const days: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", { weekday: "short" });
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const count = items.filter((item) => {
      const ts = item.createdAt ? new Date(item.createdAt) : null;
      return ts && ts >= start && ts <= end;
    }).length;
    days.push({ day: key, count });
  }
  return days;
}

function buildTrendPath(data: { count: number }[], w: number, h: number): string {
  const max = Math.max(...data.map((d) => d.count), 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (w - 20) + 10;
    const y = h - 10 - ((d.count / max) * (h - 20));
    return `${x},${y}`;
  });
  return "M" + pts.join(" L");
}

/* ── Metrics Strip Cell ── */

function MetricCell({ label, value, color, icon, subtext, onClick }: { label: string; value: number | string; color: string; icon: React.ReactNode; subtext?: string; onClick?: () => void }) {
  const isClickable = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`flex items-center gap-2.5 px-3 h-full min-w-0 ${isClickable ? "cursor-pointer hover:bg-slate-50 transition-colors" : "cursor-default"}`}
    >
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
        <p className={`text-lg font-bold tabular-nums ${color} leading-tight`}>{value}</p>
        {subtext !== undefined && (
          <p className="text-[10px] text-slate-400 leading-tight truncate">{subtext}</p>
        )}
      </div>
    </button>
  );
}

/* ── Item Row ── */

function ItemRow({ item, alertStyle }: { item: DashboardItem; alertStyle?: boolean }) {
  const navigate = useNavigate();
  const overdue = isOverdue(item.dueDate, item.status);

  const handleClick = () => {
    if (item.sourceType && item.sourceId) {
      const route = getSourceRoute(item.sourceType, item.sourceId);
      if (route) navigate(route);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer min-h-0 border-b border-slate-100 transition-colors ${alertStyle ? "border-l-2 border-amber-400/50 bg-amber-50/15" : ""}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full mt-1.5 ${PRIORITY_DOTS[item.priority] || "bg-slate-400"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-medium text-slate-900" title={item.title}>{item.title}</span>
          {overdue && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-sm ${STATUS_STYLES[item.status] || "bg-slate-50 text-slate-600"}`}>
            {statusLabel(item.status)}
          </span>
          <span className={moduleBadge(item.sourceModule)}>{moduleLabel(item.sourceModule)}</span>
          {item.dueDate && (
            <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? "text-red-500 font-semibold" : "text-slate-500"}`}>
              <Calendar className="h-2.5 w-2.5 stroke-current" />
              {formatDate(item.dueDate)}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 mt-1" />
    </div>
  );
}

function getSourceRoute(sourceType: string, sourceId: number): string | null {
  const routes: Record<string, string> = {
    WORK_ORDER: `/maintenance/work-orders/${sourceId}`,
    AUDIT: `/check/production-control`,
    SAFETY_EVENT: `/safety/incidents`,
    SAFETY_AUDIT: `/check/safety-audits`,
    KAIZEN: `/improve/kaizen`,
    A3: `/improve/a3-pdca`,
    SUGGESTION: `/improve/suggestions`,
    DOCUMENT: `/standardize/document-control`,
    MER: `/plan/mer-dashboard`,
    QUALITY: `/check/quality-control`,
  };
  return routes[sourceType] || null;
}

/* ── Flat Section Shell ── */

function Section({ title, count, icon, children }: { title: string; count?: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-0 overflow-hidden scroll-section">
      <div className="shrink-0 h-8 flex items-center gap-2 px-3 border-b border-slate-200 bg-muted">
        {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
        <span className="text-xs font-semibold text-slate-800 truncate">{title}</span>
        {count !== undefined && <span className="ml-auto text-[10px] font-mono text-slate-400 shrink-0">{count}</span>}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 scroll-thin">
        {children}
      </div>
    </div>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-slate-400 italic px-3 text-center">
      {message}
    </div>
  );
}

/* ── Workspace Analytics Section (composed grid) ── */

function WorkspaceAnalyticsSection({
  sourceData,
  riskMix,
  activityItems,
}: {
  sourceData: SourceBreakdownItem[];
  riskMix: { open: number; inProgress: number; overdue: number; completed: number };
  activityItems: DashboardItem[];
}) {
  const totalSource = sourceData.reduce((s, d) => s + d.count, 0);
  const riskTotal = riskMix.open + riskMix.inProgress + riskMix.overdue + riskMix.completed;
  const dailyCounts = computeDailyCounts(activityItems);
  const hasTrend = activityItems.length > 0 && dailyCounts.some((d) => d.count > 0);
  const svgW = 180, svgH = 56;
  const trendPath = hasTrend ? buildTrendPath(dailyCounts, svgW, svgH) : "";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden scroll-section">
      <div className="h-8 shrink-0 border-b border-slate-200 bg-muted px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-800">Workspace Analytics</span>
        </div>
      </div>
      <div className="grid flex-1 min-h-0 grid-cols-[42%_58%] divide-x divide-slate-200 overflow-hidden">
        {/* Left: Module Distribution */}
        <div className="flex flex-col min-h-0 overflow-hidden px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 shrink-0">Module Distribution</p>
          {sourceData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">No analytics available yet</div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 scroll-thin">
              {sourceData.map((s) => {
                const pct = totalSource > 0 ? Math.round((s.count / totalSource) * 100) : 0;
                return (
                  <div key={s.sourceModule} className="flex items-center gap-2 h-7">
                    <span className="w-[68px] shrink-0 text-xs text-slate-600 truncate" title={moduleLabel(s.sourceModule)}>{moduleLabel(s.sourceModule)}</span>
                    <div className="flex-1 h-3 bg-slate-200/70 rounded-sm overflow-hidden">
                      <div className="h-full bg-emerald-400/80 rounded-sm transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 w-7 text-right tabular-nums">{s.count}</span>
                    <span className="text-[10px] text-slate-400 w-8 text-right tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Workload Trend + Risk Mix */}
        <div className="grid grid-rows-[60%_40%] divide-y divide-slate-200 min-h-0 overflow-hidden">
          {/* Workload Trend */}
          <div className="flex flex-col min-h-0 overflow-hidden px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 shrink-0">Workload Trend</p>
            <div className="flex-1 flex items-center justify-center min-h-0">
              {!hasTrend ? (
                <div className="flex flex-col items-center gap-2">
                  <Activity className="h-5 w-5 text-slate-300 shrink-0" />
                  <p className="text-[10px] text-slate-400 italic text-center leading-tight">Trend available after more activity is recorded.</p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-1">
                  <svg className="w-full max-w-[180px] h-14 text-emerald-500" viewBox={`0 0 ${svgW} ${svgH}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${trendPath}`} fill="none" stroke="currentColor" strokeOpacity="0.8" />
                    <path d={`${trendPath} L${svgW - 10} ${svgH - 10} L10 ${svgH - 10} Z`} fill="url(#trend-fill)" />
                    <circle cx={trendPath.split(" ").filter(p => p.includes(",")).pop()?.split(",")[0] || "170"} cy={trendPath.split(" ").filter(p => p.includes(",")).pop()?.split(",")[1] || "14"} r="2" fill="currentColor" />
                  </svg>
                  <div className="flex gap-1.5 text-[9px] text-slate-400 tabular-nums w-full justify-between px-1 max-w-[180px]">
                    {dailyCounts.map((d) => (
                      <span key={d.day} className="text-center" title={`${d.day}: ${d.count}`}>{d.day}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Risk Mix */}
          <div className="flex flex-col min-h-0 overflow-hidden px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 shrink-0">Risk Mix</p>
            {riskTotal === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">No risk data</div>
            ) : (
              <div className="flex flex-col justify-center flex-1 gap-1.5">
                <div className="flex h-3.5 rounded-sm overflow-hidden">
                  {riskMix.open > 0 && <div className="bg-blue-500" style={{ width: `${(riskMix.open / riskTotal) * 100}%` }} />}
                  {riskMix.inProgress > 0 && <div className="bg-amber-500" style={{ width: `${(riskMix.inProgress / riskTotal) * 100}%` }} />}
                  {riskMix.overdue > 0 && <div className="bg-red-500" style={{ width: `${(riskMix.overdue / riskTotal) * 100}%` }} />}
                  {riskMix.completed > 0 && <div className="bg-emerald-500" style={{ width: `${(riskMix.completed / riskTotal) * 100}%` }} />}
                </div>
                <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                  {riskMix.open > 0 && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full bg-blue-500 inline-block shrink-0" />
                      Open {riskMix.open}
                      <span className="text-slate-400">({Math.round((riskMix.open / riskTotal) * 100)}%)</span>
                    </span>
                  )}
                  {riskMix.inProgress > 0 && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full bg-amber-500 inline-block shrink-0" />
                      In Progress {riskMix.inProgress}
                      <span className="text-slate-400">({Math.round((riskMix.inProgress / riskTotal) * 100)}%)</span>
                    </span>
                  )}
                  {riskMix.overdue > 0 && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full bg-red-500 inline-block shrink-0" />
                      Overdue {riskMix.overdue}
                      <span className="text-slate-400">({Math.round((riskMix.overdue / riskTotal) * 100)}%)</span>
                    </span>
                  )}
                  {riskMix.completed > 0 && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                      Completed {riskMix.completed}
                      <span className="text-slate-400">({Math.round((riskMix.completed / riskTotal) * 100)}%)</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Recent Activity Section (timeline, scrollable) ── */

function RecentActivitySection({ items, filter }: { items: DashboardItem[]; filter: string }) {
  const navigate = useNavigate();

  const filtered = filter ? items.filter((i) => i.taskType === filter) : items;
  const display = filtered.slice(0, 10);

  return (
    <div className="flex flex-col min-h-0 overflow-hidden scroll-section">
      <div className="shrink-0 h-8 flex items-center gap-2 px-3 border-b border-slate-200 bg-muted">
        <Activity className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span className="text-xs font-semibold text-slate-800 truncate">Recent Activity</span>
        {filtered.length > 0 && <span className="ml-auto text-[10px] font-mono text-slate-400 shrink-0">{filtered.length}</span>}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 scroll-thin">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-400 italic px-3 text-center">
            {filter ? "No recent activity for this filter" : "No recent activity"}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[87px] top-2 bottom-2 w-px bg-slate-100" />
            {display.map((item) => {
              const overdue = isOverdue(item.dueDate, item.status);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.sourceType && item.sourceId) {
                      const route = getSourceRoute(item.sourceType, item.sourceId);
                      if (route) navigate(route);
                    }
                  }}
                  className="relative flex items-start hover:bg-slate-50 cursor-pointer min-h-0 border-b border-slate-100 transition-colors"
                >
                  <div className="w-[72px] shrink-0 pt-2.5 text-center">
                    <span className={`text-[10px] leading-tight block ${overdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>{formatDate(item.dueDate)}</span>
                  </div>
                  <div className="shrink-0 relative z-10 pt-2.5">
                    <div className={`h-2 w-2 rounded-full ${overdue ? "bg-red-400" : PRIORITY_DOTS[item.priority] || "bg-slate-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1 px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="min-w-0 truncate text-xs font-medium text-slate-900" title={item.title}>{item.title}</span>
                      {overdue && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-sm ${STATUS_STYLES[item.status] || "bg-slate-50 text-slate-600"}`}>
                        {statusLabel(item.status)}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        {moduleLabel(item.sourceModule)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="shrink-0 h-8 border-t border-slate-200 bg-muted px-3 flex items-center justify-end">
        <button
          onClick={() => navigate("/myworkspace/tasks")}
          className="text-[10px] font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
        >
          View All Activity
          <ArrowUpRight className="h-3 w-3 stroke-current" />
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function MyDashboardPage() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const initialized = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
  const debouncedSearch = useDebouncedValue(search, 250);

  const filterPredicate = (item: DashboardItem) => !filter || item.taskType === filter;

  const searchPredicate = (item: DashboardItem) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.sourceTitle.toLowerCase().includes(q)
    );
  };

  const combine = (items: DashboardItem[]) => items.filter(filterPredicate).filter(searchPredicate);

  const priorityItems = combine(dashboard?.priorityWork || []);
  const dueItems = combine(dashboard?.dueSoon || []);
  const alertItems = combine(dashboard?.alertsApprovals || []);
  const activityItems = combine(dashboard?.recentActivity || []).sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
  });
  const sourceData = dashboard?.sourceBreakdown || [];

  // Compute risk mix from all items
  const allItems = [
    ...priorityItems,
    ...dueItems,
    ...alertItems,
    ...activityItems,
  ];
  const totalVisible = allItems.length;
  const openVisible = allItems.filter((i) => i.status === "OPEN").length;
  const overdueVisible = allItems.filter((i) => isOverdue(i.dueDate, i.status)).length;
  const riskMix = {
    open: allItems.filter((i) => i.status === "OPEN").length,
    inProgress: allItems.filter((i) => i.status === "IN_PROGRESS").length,
    overdue: allItems.filter((i) => isOverdue(i.dueDate, i.status)).length,
    completed: allItems.filter((i) => i.status === "COMPLETED").length,
  };

  const hKpiNavigate = (label: string) => {
    navigate(`/myworkspace/tasks?status=${encodeURIComponent(label)}`);
  };

  return (
    <AppPageLayout
      title="Personal Dashboard"
      subtitle="Your assigned work, alerts, approvals, and recent activity across LeanSynk."
      icon={<LayoutDashboard />}
      iconClass="bg-primary/10 text-primary"
      toolbar={
        <ExplorerToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tasks, modules..."
          searchDebouncing={search !== debouncedSearch}
          searchRef={searchRef}
          filters={<ExplorerToolbarDropdown value={filter} onChange={setFilter} options={FILTER_OPTIONS} placeholder="Filter" width="w-28" />}
          actions={<ExplorerToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />}
        />
      }
      footer={
        <span className="flex items-center gap-4 text-xs text-slate-500">
          <span className="font-medium">Personal Dashboard</span>
          {lastUpdated && <span>Updated: {lastUpdated}</span>}
          <span className="flex-1" />
          {totalVisible > 0 ? `${totalVisible} items · ${openVisible} open · ${overdueVisible} overdue` : ""}
        </span>
      }
    >
      {loading && !dashboard ? (
        <div className="h-full flex items-center justify-center text-sm text-slate-500">
          <span className="inline-block h-2 w-2 bg-slate-400 animate-pulse mr-2 rounded-full" />
          Loading dashboard...
        </div>
      ) : !dashboard ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-8">
          <LayoutDashboard className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-500">No assigned work right now.</p>
          <p className="text-xs text-slate-400 mt-1">When tasks are assigned from any module, they will appear here.</p>
        </div>
      ) : (          <div className="h-full min-h-0 overflow-hidden flex flex-col">
          {/* Integrated KPI Metrics Strip */}
          <div className="shrink-0 h-16 grid grid-cols-6 divide-x divide-slate-200 border-b border-slate-200">
            <MetricCell label="Open Tasks" value={dashboard.openTasks} color="text-blue-600" icon={<ListChecks className="h-4 w-4 stroke-current text-blue-600 shrink-0" />} onClick={() => hKpiNavigate("OPEN")} />
            <MetricCell label="In Progress" value={dashboard.inProgress} color="text-amber-600" icon={<Clock className="h-4 w-4 stroke-current text-amber-600 shrink-0" />} onClick={() => hKpiNavigate("IN_PROGRESS")} />
            <MetricCell label="Overdue" value={dashboard.overdueTasks} color={dashboard.overdueTasks > 0 ? "text-red-600" : "text-slate-700"} icon={<AlertOctagon className={`h-4 w-4 stroke-current shrink-0 ${dashboard.overdueTasks > 0 ? "text-red-600" : "text-slate-400"}`} />} onClick={() => hKpiNavigate("OVERDUE")} />
            <MetricCell label="Due Today" value={dashboard.dueToday} color={dashboard.dueToday > 0 ? "text-orange-600" : "text-slate-700"} icon={<Calendar className={`h-4 w-4 stroke-current shrink-0 ${dashboard.dueToday > 0 ? "text-orange-600" : "text-slate-400"}`} />} onClick={() => hKpiNavigate("DUE_TODAY")} />
            <MetricCell label="High Priority" value={dashboard.highPriority} color={dashboard.highPriority > 0 ? "text-red-600" : "text-slate-700"} icon={<ArrowUpRight className={`h-4 w-4 stroke-current shrink-0 ${dashboard.highPriority > 0 ? "text-red-600" : "text-slate-400"}`} />} onClick={() => hKpiNavigate("HIGH_PRIORITY")} />
            <MetricCell label="Completed Today" value={dashboard.completedToday} color="text-emerald-600" icon={<CheckCircle2 className="h-4 w-4 stroke-current text-emerald-600 shrink-0" />} onClick={() => hKpiNavigate("COMPLETED")} />
          </div>

          {/* Integrated Dashboard Grid */}
          <div className="flex-1 min-h-0 grid grid-rows-[43%_57%] divide-y divide-slate-200">
            {/* Top row: 3 sections */}
            <div className="min-h-0 grid grid-cols-[42%_28%_30%] divide-x divide-slate-200">
              {/* Priority Work */}
              <Section title="Priority Work" count={priorityItems.length} icon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                {priorityItems.length === 0 ? (
                  <SectionEmpty message={filter ? "No priority items for this filter" : "No priority work"} />
                ) : (
                  priorityItems.map((item) => <ItemRow key={item.id} item={item} />)
                )}
              </Section>

              {/* Upcoming — grouped by date band */}
              <Section title="Upcoming" count={dueItems.length} icon={<Calendar className="h-3.5 w-3.5" />}>
                {dueItems.length === 0 ? (
                  <SectionEmpty message={filter ? "No due items for this filter" : "No items due this week"} />
                ) : (
                  (() => {
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
                    const toDate = (s: string | null) => { if (!s) return null; const d = new Date(s); d.setHours(0, 0, 0, 0); return d; };
                    const bands: { label: string; items: DashboardItem[] }[] = [
                      { label: "Today", items: [] },
                      { label: "Tomorrow", items: [] },
                      { label: "This Week", items: [] },
                    ];
                    dueItems.forEach((item) => {
                      const d = toDate(item.dueDate);
                      if (!d) { bands[2].items.push(item); return; }
                      if (d.getTime() === today.getTime()) { bands[0].items.push(item); }
                      else if (d.getTime() === tomorrow.getTime()) { bands[1].items.push(item); }
                      else if (d >= tomorrow && d <= weekEnd) { bands[2].items.push(item); }
                    });
                    return bands.map((band) =>
                      band.items.length > 0 ? (
                        <div key={band.label}>
                          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/50 border-b border-slate-100">{band.label}</div>
                          {band.items.map((item) => <ItemRow key={item.id} item={item} />)}
                        </div>
                      ) : null
                    );
                  })()
                )}
              </Section>

              {/* Alerts & Approvals — split into two internal sub-sections */}
              <Section title="Alerts & Approvals" count={alertItems.length} icon={<Bell className="h-3.5 w-3.5" />}>
                {alertItems.length === 0 ? (
                  <SectionEmpty message={filter ? "No alerts for this filter" : "No alerts or pending approvals"} />
                ) : (
                  (() => {
                    const approvals = alertItems.filter((i) => i.taskType === "approval");
                    const alerts = alertItems.filter((i) => i.taskType !== "approval");
                    return (
                      <>
                        {approvals.length > 0 && (
                          <div>
                            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/50 border-b border-slate-100">Approvals</div>
                            {approvals.map((item) => <ItemRow key={item.id} item={item} />)}
                          </div>
                        )}
                        {alerts.length > 0 && (
                          <div>
                            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-amber-700 uppercase tracking-wide bg-amber-50/30 border-b border-amber-200/50">Alerts</div>
                            {alerts.map((item) => <ItemRow key={item.id} item={item} alertStyle />)}
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </Section>
            </div>

            {/* Bottom row: 2 sections */}
            <div className="min-h-0 grid grid-cols-[40%_60%] divide-x divide-slate-200">
              <RecentActivitySection items={activityItems} filter={filter} />
              <WorkspaceAnalyticsSection sourceData={sourceData} riskMix={riskMix} activityItems={activityItems} />
            </div>
          </div>
        </div>
      )}
    </AppPageLayout>
  );
}
