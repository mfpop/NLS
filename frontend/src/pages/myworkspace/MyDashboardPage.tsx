import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { LayoutDashboard, RefreshCw, AlertTriangle, Calendar,
  ListChecks, Clock, ArrowUpRight, CheckCircle2,
  Bell, Activity, PieChart, AlertOctagon, ArrowRight,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarDropdown, ToolbarButton } from "@/components/layout/PageToolbar";
import { MY_WORKSPACE_DASHBOARD_QUERY } from "@/graphql/workspaceQueries";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDateShort } from "@/utils/dateFormat";

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/* ── Types ── */

interface DashboardItem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  severity: string;
  isOverdue: boolean;
  sourceType: string;
  sourceId: number | null;
  sourceTitle: string;
  sourceModule: string;
  dueDate: string | null;
  taskType: string;
  createdAt: string;
}

interface SourceBreakdownItem { sourceModule: string; count: number; }
interface WorkloadTrendItem { day: string; count: number; }
interface RiskMixData { open: number; inProgress: number; overdue: number; completed: number; }
interface AnalyticsData { workloadTrend: WorkloadTrendItem[]; riskMix: RiskMixData; }

interface DashboardSummary {
  openTasks: number; overdueTasks: number; dueToday: number; inProgress: number;
  completedToday: number; waiting: number; highPriority: number; total: number;
  lastUpdated: string; priorityWork: DashboardItem[]; dueSoon: DashboardItem[];
  recentActivity: DashboardItem[]; alerts: DashboardItem[]; approvals: DashboardItem[];
  analytics: AnalyticsData; sourceBreakdown: SourceBreakdownItem[];
}

/* ── Constants ── */

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-primary/10 text-primary border-primary/20",
  IN_PROGRESS: "bg-warning/10 text-warning border-warning/20",
  WAITING: "bg-muted text-muted-foreground border-border",
  COMPLETED: "bg-success/10 text-success border-success/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

const SEVERITY_DOTS: Record<string, string> = {
  LOW: "bg-muted-foreground/50", MEDIUM: "bg-warning", HIGH: "bg-warning/100", CRITICAL: "bg-danger",
};

const SEVERITY_PULSE: Record<string, string> = {
  CRITICAL: "animate-pulse ring-2 ring-red-500/30",
};

const MODULE_LABELS: Record<string, string> = {
  SAFETY: "Safety", QUALITY: "Quality", MAINTENANCE: "Maintenance",
  IMPROVE: "Improve", CHECK: "Check", MER: "MER",
  DOCUMENT_CONTROL: "Documents", MANUAL: "Manual", DOCUMENTS: "Documents",
};

const MODULE_COLORS: Record<string, string> = {
  SAFETY: "text-danger bg-danger/10 border-danger/20",
  QUALITY: "text-primary bg-primary/10 border-primary/20",
  MAINTENANCE: "text-warning bg-warning/10 border-warning/20",
  IMPROVE: "text-success bg-success/10 border-success/20",
  CHECK: "text-accent bg-accent/10 border-accent/20",
  MER: "text-info bg-info/10 border-info/20",
  DOCUMENTS: "text-muted-foreground bg-muted border-border",
  DOCUMENT_CONTROL: "text-muted-foreground bg-muted border-border",
  MANUAL: "text-muted-foreground bg-muted border-border",
};

const MODULE_BAR_COLORS: Record<string, string> = {
  SAFETY: "bg-red-400", QUALITY: "bg-blue-400", MAINTENANCE: "bg-amber-400",
  IMPROVE: "bg-emerald-400", CHECK: "bg-violet-400", MER: "bg-cyan-400",
};

const FILTER_OPTIONS = [
  { value: "", label: "All" }, { value: "task", label: "Tasks" },
  { value: "approval", label: "Approvals" }, { value: "alert", label: "Alerts" },
  { value: "safety", label: "Safety" }, { value: "quality", label: "Quality" },
  { value: "maintenance", label: "Maintenance" }, { value: "mer", label: "MER" },
  { value: "documents", label: "Documents" },
];

const statusLabel = (s: string) => ({ OPEN: "Open", IN_PROGRESS: "In Progress", WAITING: "Waiting", COMPLETED: "Completed", CANCELLED: "Cancelled" }[s] || s);
const moduleLabel = (s: string) => MODULE_LABELS[s] || s || "General";
const moduleBadge = (s: string) => `inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-sm ${MODULE_COLORS[s] || "text-muted-foreground bg-muted border-border"}`;

const formatDate = (s: string | null) => s ? (formatDateShort(s) || s) : "";

const getSourceRoute = (sourceType: string, sourceId: number): string | null => ({
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
}[sourceType] || null);

/* ── SVG helpers ── */

const buildSmoothTrend = (data: { count: number }[], w: number, h: number) => {
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * (w - 24) + 12,
    y: h - 8 - ((d.count / max) * (h - 18)),
  }));
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
};

/* ── Animated Counter ── */

function AnimatedValue({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.transform = "scale(1.08)";
    const timer = setTimeout(() => { el.style.transform = "scale(1)"; }, 150);
    return () => clearTimeout(timer);
  }, [value]);
  return <span ref={ref} className={cn("inline-block transition-transform duration-200", className)}>{value}</span>;
}

/* ── KPI Metric Cell ── */

function MetricCell({ label, value, color, icon, urgent, onClick }: {
  label: string; value: number; color: string; icon: React.ReactNode; urgent?: boolean; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cn(
        "relative flex items-center gap-2.5 px-3 h-full min-w-0 transition-all duration-150 group",
        onClick ? "cursor-pointer hover:bg-background/60" : "cursor-default",
        urgent ? "bg-danger/10/40" : "",
      )}
    >
      {urgent && <div className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-red-400" />}
      <span className={cn("shrink-0 transition-transform duration-150 group-hover:scale-110", urgent ? "drop-shadow-sm ring-2 ring-danger/20" : "")}>{icon}</span>
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
        <p className={cn("text-xl font-bold tabular-nums leading-tight transition-colors", color)}>
          <AnimatedValue value={value} />
        </p>
      </div>
    </button>
  );
}

/* ── Dashboard Item Row ── */

function DashboardItemRow({ item, compact }: { item: DashboardItem; compact?: boolean }) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (item.sourceType && item.sourceId) {
      const route = getSourceRoute(item.sourceType, item.sourceId);
      if (route) navigate(route);
    }
  };

  return (
    <div onClick={handleClick}
      className={cn(
        "relative flex items-start gap-2.5 px-3 cursor-pointer min-h-0 border-b border-border/50 transition-all duration-150 group hover:bg-muted hover:border-l-2 hover:border-l-blue-400 hover:pl-[10px]",
        compact ? "py-1" : "py-1.5",
      )}
    >
      <span className={cn(
        "h-2.5 w-2.5 shrink-0 rounded-full mt-1.5 transition-transform duration-150 group-hover:scale-125",
        SEVERITY_DOTS[item.severity] || SEVERITY_DOTS[item.priority] || "bg-slate-400",
        SEVERITY_PULSE[item.severity] || "",
      )} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:text-foreground transition-colors" title={item.title}>{item.title}</span>
          {item.isOverdue && <AlertTriangle className="h-3 w-3 shrink-0 text-danger animate-pulse" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-sm", STATUS_STYLES[item.status] || "bg-muted text-muted-foreground")}>
            {statusLabel(item.status)}
          </span>
          <span className={moduleBadge(item.sourceModule)}>{moduleLabel(item.sourceModule)}</span>
          {item.dueDate && (
            <span className={cn("text-[10px] flex items-center gap-0.5", item.isOverdue ? "text-danger font-semibold" : "text-muted-foreground")}>
              <Calendar className="h-2.5 w-2.5 stroke-current" />
              {formatDate(item.dueDate)}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 mt-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
    </div>
  );
}

/* ── Panel Components ── */

function PanelHeader({ title, count, icon, iconColor }: { title: string; count?: number; icon?: React.ReactNode; iconColor?: string }) {
  return (
    <div className="shrink-0 h-9 flex items-center gap-2 px-3 border-b border-border bg-muted/80">
      {icon && <span className={cn("shrink-0", iconColor || "text-muted-foreground")}>{icon}</span>}
      <span className="text-xs font-semibold text-foreground truncate tracking-wide">{title}</span>
      {count !== undefined && <span className="ml-auto text-[10px] font-mono text-muted-foreground/60 shrink-0 tabular-nums">{count} total</span>}
    </div>
  );
}

function PanelScroller({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto min-h-0 scroll-thin">{children}</div>;
}

function PanelEmpty({ icon, title, message }: { icon?: React.ReactNode; title?: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60px] px-4 text-center">
      {icon && <div className="text-slate-200 mb-1.5">{icon}</div>}
      {title && <p className="text-xs font-medium text-muted-foreground/60 mb-0.5">{title}</p>}
      <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed">{message}</p>
    </div>
  );
}

/* ── Priority Work Panel ── */

function PriorityWorkPanel({ items }: { items: DashboardItem[] }) {
  const visible = items.slice(0, 5);
  return (
    <div className="flex flex-col min-h-0 overflow-hidden scroll-section">
      <PanelHeader title="Priority Work" count={items.length} icon={<ArrowUpRight className="h-3.5 w-3.5" />} iconColor="text-warning" />
      <PanelScroller>
        {visible.length === 0 ? (
          <PanelEmpty icon={<ListChecks className="h-5 w-5" />} message="No priority items right now" />
        ) : (
          visible.map((item) => <DashboardItemRow key={item.id} item={item} />)
        )}
      </PanelScroller>
    </div>
  );
}

/* ── Upcoming Panel ── */

function UpcomingPanel({ items }: { items: DashboardItem[] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
  const toDate = (s: string | null) => { if (!s) return null; const d = new Date(s); d.setHours(0, 0, 0, 0); return d; };
  const bands: { label: string; items: DashboardItem[] }[] = [
    { label: "Today", items: [] }, { label: "This Week", items: [] }, { label: "Later", items: [] },
  ];
  items.forEach((item) => {
    const d = toDate(item.dueDate);
    if (!d) { bands[2].items.push(item); return; }
    if (d.getTime() === today.getTime()) bands[0].items.push(item);
    else if (d > today && d <= weekEnd) bands[1].items.push(item);
    else bands[2].items.push(item);
  });
  const hasAny = bands.some((b) => b.items.length > 0);

  return (
    <div className="flex flex-col min-h-0 overflow-hidden scroll-section">
      <PanelHeader title="Upcoming" count={items.length} icon={<Calendar className="h-3.5 w-3.5" />} iconColor="text-primary" />
      <PanelScroller>
        {!hasAny ? (
          <PanelEmpty icon={<Calendar className="h-5 w-5" />} message="No upcoming items" />
        ) : bands.map((band) =>
          band.items.length > 0 ? (
            <div key={band.label}>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70 border-b border-border/50">
                <span className={band.label === "Today" ? "text-primary" : band.label === "This Week" ? "text-muted-foreground" : "text-muted-foreground/60"}>
                  {band.label}
                </span>
                <span className="text-muted-foreground/60 font-normal">({band.items.length})</span>
              </div>
              {band.items.slice(0, 2).map((item) => <DashboardItemRow key={item.id} item={item} compact />)}
            </div>
          ) : null
        )}
      </PanelScroller>
    </div>
  );
}

/* ── Alerts & Approvals Panel ── */

function AlertsApprovalsPanel({ alerts, approvals }: { alerts: DashboardItem[]; approvals: DashboardItem[] }) {
  const visibleAlerts = alerts.slice(0, 4);
  const visibleApprovals = approvals.slice(0, 4);
  const total = alerts.length + approvals.length;

  return (
    <div className="flex flex-col min-h-0 overflow-hidden scroll-section">
      <PanelHeader title="Alerts & Approvals" count={total} icon={<Bell className="h-3.5 w-3.5" />} iconColor="text-warning" />
      <PanelScroller>
        {total === 0 ? (
          <PanelEmpty icon={<Bell className="h-5 w-5" />} message="No alerts or pending approvals" />
        ) : (
          <>
            {visibleAlerts.length > 0 && (
              <div>
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-warning/10/40 border-b border-warning/20/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning/100 animate-pulse shrink-0" />
                  <span className="text-warning">Alerts</span>
                  {alerts.length > 4 && <span className="text-amber-400 font-normal">({alerts.length})</span>}
                </div>
                {visibleAlerts.map((item) => <DashboardItemRow key={item.id} item={item} />)}
              </div>
            )}
            {visibleApprovals.length > 0 && (
              <div>
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-muted/70 border-b border-border/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-muted-foreground">Approvals</span>
                  {approvals.length > 4 && <span className="text-muted-foreground/60 font-normal">({approvals.length})</span>}
                </div>
                {visibleApprovals.map((item) => <DashboardItemRow key={item.id} item={item} />)}
              </div>
            )}
          </>
        )}
      </PanelScroller>
    </div>
  );
}

/* ── Recent Activity Section ── */

function RecentActivitySection({ items }: { items: DashboardItem[] }) {
  const navigate = useNavigate();
  const display = items.slice(0, 10);

  return (
    <div className="flex flex-col min-h-0 overflow-hidden scroll-section">
      <PanelHeader title="Recent Activity" count={items.length} icon={<Activity className="h-3.5 w-3.5" />} iconColor="text-violet-500" />
      <div className="flex-1 overflow-y-auto min-h-0 scroll-thin">
        {display.length === 0 ? (
          <PanelEmpty icon={<Activity className="h-5 w-5" />} message="No recent activity" />
        ) : (
          <div className="relative px-3">
            <div className="absolute left-[75px] top-3 bottom-3 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
            {display.map((item, idx) => (
              <div key={item.id} onClick={() => {
                if (item.sourceType && item.sourceId) { const r = getSourceRoute(item.sourceType, item.sourceId); if (r) navigate(r); }
              }} className="relative flex items-start hover:bg-muted cursor-pointer min-h-0 border-b border-border/50 transition-all duration-150 group">
                <div className="w-[64px] shrink-0 pt-2.5 text-center">
                  <span className="text-[9px] leading-tight block text-muted-foreground/60 font-medium tabular-nums">{formatDate(item.createdAt)}</span>
                </div>
                <div className="shrink-0 relative z-10 pt-2.5 flex items-center justify-center">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full ring-2 ring-white transition-transform duration-150 group-hover:scale-125",
                    item.isOverdue ? "bg-red-400" : SEVERITY_DOTS[item.severity] || "bg-slate-400",
                    item.isOverdue ? "animate-pulse" : "",
                  )} />
                  {idx < display.length - 1 && <div className="absolute top-4 left-1/2 -translate-x-1/2 w-px h-[calc(100%+4px)] bg-muted -z-10" />}
                </div>
                <div className="min-w-0 flex-1 px-2.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate text-xs font-medium text-foreground group-hover:text-muted-foreground transition-colors" title={item.title}>{item.title}</span>
                    {item.isOverdue && <AlertTriangle className="h-3 w-3 shrink-0 text-danger" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-sm", STATUS_STYLES[item.status] || "bg-muted text-muted-foreground")}>
                      {statusLabel(item.status)}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">{moduleLabel(item.sourceModule)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 h-8 border-t border-border bg-muted px-3 flex items-center justify-end">
        <button onClick={() => navigate("/myworkspace/tasks")}
          className="text-[10px] font-medium text-muted-foreground hover:text-muted-foreground transition-colors flex items-center gap-1 group/btn">
          View All Activity
          <ArrowRight className="h-3 w-3 stroke-current transition-transform duration-150 group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Workspace Analytics Section ── */

function WorkspaceAnalyticsSection({ sourceData, analyticsData }: { sourceData: SourceBreakdownItem[]; analyticsData: AnalyticsData }) {
  const totalSource = sourceData.reduce((s, d) => s + d.count, 0);
  const dailyCounts = analyticsData.workloadTrend;
  const hasTrend = dailyCounts.some((d) => d.count > 0);
  const svgW = 200, svgH = 52;
  const trendPath = useMemo(() => hasTrend ? buildSmoothTrend(dailyCounts, svgW, svgH) : "", [dailyCounts, hasTrend]);
  const trendAreaPath = useMemo(() => {
    if (!trendPath) return "";
    const lastPt = dailyCounts.length > 0 ? ((i: number) => ({ x: (i / Math.max(dailyCounts.length - 1, 1)) * (svgW - 24) + 12, y: svgH - 8 }))(dailyCounts.length - 1) : { x: svgW - 12, y: svgH - 8 };
    return `${trendPath} L${lastPt.x} ${svgH - 8} L12 ${svgH - 8} Z`;
  }, [trendPath, dailyCounts.length]);

  const riskMix = analyticsData.riskMix;
  const riskTotal = riskMix.open + riskMix.inProgress + riskMix.overdue;
  const chartCx = 28, chartCy = 28, chartR = 24, chartInnerR = 14;

  const riskSlices = useMemo(() => {
    const slices: { value: number; color: string }[] = [];
    if (riskMix.open > 0) slices.push({ value: riskMix.open, color: "var(--color-primary)" });
    if (riskMix.inProgress > 0) slices.push({ value: riskMix.inProgress, color: "var(--color-warning)" });
    if (riskMix.overdue > 0) slices.push({ value: riskMix.overdue, color: "var(--color-danger)" });
    return slices;
  }, [riskMix]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden scroll-section">
      <PanelHeader title="Workspace Analytics" icon={<PieChart className="h-3.5 w-3.5" />} iconColor="text-success" />
      <div className="grid flex-1 min-h-0 grid-cols-[42%_58%] divide-x divide-border overflow-hidden">
        {/* Module Distribution */}
        <div className="flex flex-col min-h-0 overflow-hidden px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 shrink-0">Module Distribution</p>
          {sourceData.length === 0 ? (
            <PanelEmpty icon={<PieChart className="h-5 w-5" />} message="No data yet" />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 scroll-thin">
              {sourceData.map((s) => {
                const pct = totalSource > 0 ? Math.round((s.count / totalSource) * 100) : 0;
                const barColor = MODULE_BAR_COLORS[s.sourceModule] || "bg-emerald-400";
                return (
                  <div key={s.sourceModule} className="flex items-center gap-2 h-6 group/bar">
                    <span className="w-[70px] shrink-0 text-[11px] text-muted-foreground truncate font-medium" title={moduleLabel(s.sourceModule)}>{moduleLabel(s.sourceModule)}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700 ease-out group-hover/bar:opacity-80", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-7 text-right tabular-nums">{s.count}</span>
                    <span className="text-[10px] text-muted-foreground/60 w-8 text-right tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Workload Trend + Risk Mix */}
        <div className="grid grid-rows-[auto_1fr] divide-y divide-border min-h-0 overflow-hidden">
          {/* Workload Trend */}
          <div className="flex flex-col min-h-0 overflow-hidden px-3 py-2 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 shrink-0">Workload Trend</p>
            {!hasTrend ? (
              <div className="flex items-center gap-2 py-1">
                <Activity className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                <p className="text-[10px] text-muted-foreground/60 italic">Trend data pending</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <svg className="w-full max-w-[200px] h-[52px]" viewBox={`0 0 ${svgW} ${svgH}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" style={{ stopColor: 'var(--color-emerald-500)' }} stopOpacity="0.25" />
                      <stop offset="100%" style={{ stopColor: 'var(--color-emerald-500)' }} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="12" y1="14" x2={svgW - 12} y2="14" className="stroke-slate-200" strokeWidth="0.5" />
                  <line x1="12" y1="30" x2={svgW - 12} y2="30" className="stroke-slate-200" strokeWidth="0.5" />
                  {/* Fill area */}
                  {trendAreaPath && <path d={trendAreaPath} fill="url(#trend-grad)" />}
                  {/* Trend line */}
                  {trendPath && <path d={trendPath} className="stroke-emerald-500" strokeOpacity="0.9" />}
                  {/* End dot */}
                  {trendPath && (() => {
                    const pts = dailyCounts;
                    const lastI = pts.length - 1;
                    const lx = (lastI / Math.max(pts.length - 1, 1)) * (svgW - 24) + 12;
                    const max = Math.max(...pts.map(d => d.count), 1);
                    const ly = svgH - 8 - ((pts[lastI].count / max) * (svgH - 18));
                    return <circle cx={lx} cy={ly} r="3" className="fill-emerald-500 stroke-white" strokeWidth="2" />;
                  })()}
                </svg>
                <div className="flex gap-1.5 text-[9px] text-muted-foreground/60 tabular-nums w-full justify-between px-1 max-w-[200px]">
                  {dailyCounts.map((d) => (<span key={d.day} className="text-center">{d.day}</span>))}
                </div>
              </div>
            )}
          </div>

          {/* Risk Mix Donut */}
          <div className="flex flex-col min-h-0 overflow-hidden px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 shrink-0">Risk Mix</p>
            {riskTotal === 0 ? (
              <div className="flex items-center gap-2 py-1">
                <AlertTriangle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                <p className="text-[10px] text-muted-foreground/60 italic">No risk data</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 flex-1 min-h-0">
                {/* Donut chart */}
                <svg className="shrink-0" width="56" height="56" viewBox="0 0 56 56">
                  {(() => {
                    const total = riskSlices.reduce((s, v) => s + v.value, 0);
                    if (riskSlices.length === 1) {
                      return (
                        <>
                          <circle cx={chartCx} cy={chartCy} r={chartR} fill={riskSlices[0].color} />
                          <circle cx={chartCx} cy={chartCy} r={chartInnerR} className="fill-white" />
                          <text x={chartCx} y={chartCy} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" className="fill-slate-800">{total}</text>
                        </>
                      );
                    }
                    let currentAngle = 0;
                    const sliceEls = riskSlices.map((s) => {
                      const angle = (s.value / total) * 360;
                      const startRad = ((currentAngle - 90) * Math.PI) / 180;
                      const endRad = ((currentAngle + angle - 90) * Math.PI) / 180;
                      const x1 = chartCx + chartR * Math.cos(startRad);
                      const y1 = chartCy + chartR * Math.sin(startRad);
                      const x2 = chartCx + chartR * Math.cos(endRad);
                      const y2 = chartCy + chartR * Math.sin(endRad);
                      const largeArc = angle > 180 ? 1 : 0;
                      const d = `M ${chartCx} ${chartCy} L ${x1} ${y1} A ${chartR} ${chartR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                      currentAngle += angle;
                      return <path key={s.color} d={d} fill={s.color} stroke="white" strokeWidth="1" />;
                    });
                    return <>{sliceEls}<circle cx={chartCx} cy={chartCy} r={chartInnerR} className="fill-white" /><text x={chartCx} y={chartCy} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="800" className="fill-slate-800" fontFamily="ui-monospace,monospace">{total}</text></>;
                  })()}
                </svg>
                {/* Legend */}
                <div className="flex flex-col gap-1 min-w-0">
                  {riskMix.open > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary/100 ring-1 ring-blue-200" />
                      <span className="font-medium">Open</span>
                      <span className="font-semibold tabular-nums text-foreground">{riskMix.open}</span>
                      <span className="text-muted-foreground/60">({Math.round((riskMix.open / riskTotal) * 100)}%)</span>
                    </span>
                  )}
                  {riskMix.inProgress > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-warning/100 ring-1 ring-amber-200" />
                      <span className="font-medium">In Prog</span>
                      <span className="font-semibold tabular-nums text-foreground">{riskMix.inProgress}</span>
                      <span className="text-muted-foreground/60">({Math.round((riskMix.inProgress / riskTotal) * 100)}%)</span>
                    </span>
                  )}
                  {riskMix.overdue > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-danger/100 ring-1 ring-red-200 animate-pulse" />
                      <span className="font-medium">Overdue</span>
                      <span className="font-semibold tabular-nums text-foreground">{riskMix.overdue}</span>
                      <span className="text-muted-foreground/60">({Math.round((riskMix.overdue / riskTotal) * 100)}%)</span>
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

/* ── Skeleton Loading ── */

function DashboardSkeleton() {
  return (
    <div className="h-full flex flex-col animate-pulse">
      {/* KPI skeleton */}
      <div className="shrink-0 h-16 grid grid-cols-6 divide-x divide-border border-b border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3">
            <div className="h-4 w-4 rounded bg-muted/80" />
            <div className="space-y-1.5">
              <div className="h-2.5 bg-muted/80 rounded w-16" />
              <div className="h-4 bg-muted/80 rounded w-8" />
            </div>
          </div>
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="flex-1 grid grid-rows-[42%_58%] divide-y divide-border">
        <div className="grid grid-cols-[36%_28%_36%] divide-x divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="h-9 border-b border-border bg-muted/80 px-3 flex items-center">
                <div className="h-3 bg-muted/80 rounded w-24" />
              </div>
              <div className="flex-1 space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-muted/80 mt-1" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-muted/80 rounded w-3/4" />
                      <div className="h-3 bg-muted/80 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[42%_58%] divide-x divide-border">
          <div className="flex flex-col">
            <div className="h-9 border-b border-border bg-muted/80 px-3 flex items-center">
              <div className="h-3 bg-muted/80 rounded w-20" />
            </div>
            <div className="flex-1 space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted/80 mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted/80 rounded w-2/3" />
                    <div className="h-3 bg-muted/80 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="h-9 border-b border-border bg-muted/80 px-3 flex items-center">
              <div className="h-3 bg-muted/80 rounded w-28" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function MyDashboardPage() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { data, loading, refetch } = useQuery<{ myWorkspaceDashboard: DashboardSummary }>(
    MY_WORKSPACE_DASHBOARD_QUERY, { fetchPolicy: "cache-and-network" },
  );

  const hRefresh = useCallback(() => { refetch(); }, [refetch]);
  const dashboard = data?.myWorkspaceDashboard;
  const debouncedSearch = useDebouncedValue(search, 250);

  const filterPredicate = (item: DashboardItem) => !filter || item.taskType === filter;
  const searchPredicate = (item: DashboardItem) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.sourceTitle.toLowerCase().includes(q);
  };
  const combine = (items: DashboardItem[]) => items.filter(filterPredicate).filter(searchPredicate);

  const priorityItems = combine(dashboard?.priorityWork || []);
  const dueItems = combine(dashboard?.dueSoon || []);
  const alertItems = combine(dashboard?.alerts || []);
  const approvalItems = combine(dashboard?.approvals || []);
  const activityItems = combine(dashboard?.recentActivity || []);
  const analyticsData = dashboard?.analytics || { workloadTrend: [], riskMix: { open: 0, inProgress: 0, overdue: 0, completed: 0 } };
  const sourceData = dashboard?.sourceBreakdown || [];

  const hKpiNavigate = (label: string) => navigate(`/myworkspace/tasks?status=${encodeURIComponent(label)}`);
  const footerText = dashboard ? `${dashboard.total} items \u00B7 ${dashboard.openTasks} open \u00B7 ${dashboard.overdueTasks} overdue` : "";

  return (
    <AppPageLayout
      title="Personal Dashboard"
      subtitle="Your assigned work, alerts, approvals, and recent activity across LeanSynk."
      icon={<LayoutDashboard />}
      iconClass="bg-primary/10 text-primary"
      toolbar={
        <PageToolbar
          searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search tasks, modules..."
          filters={<ToolbarDropdown value={filter} onChange={setFilter} options={FILTER_OPTIONS} placeholder="Filter" width="w-28" />}
          actions={<ToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} />}
        />
      }
      footer={
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Personal Dashboard</span>
          {dashboard?.lastUpdated && <span>Updated: {new Date(dashboard.lastUpdated).toLocaleTimeString()}</span>}
          <span className="flex-1" />
          {footerText}
        </span>
      }
    >
      <div className="h-full min-h-0 overflow-hidden flex flex-col bg-muted">
        {loading && !dashboard ? (
          <DashboardSkeleton />
        ) : !dashboard ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 animate-[fadeIn_0.3s_ease-out]">
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <LayoutDashboard className="h-14 w-14 text-slate-200 mb-4" />
            <p className="text-base font-semibold text-muted-foreground">No assigned work right now</p>
            <p className="text-sm text-muted-foreground/60 mt-1 max-w-sm">When tasks are assigned from any module within LeanSynk, they will appear here for quick access.</p>
          </div>
        ) : (
          <>
            {/* KPI Strip */}
            <div className="shrink-0 h-16 grid grid-cols-6 divide-x divide-border border-b border-border bg-background/50">
              <MetricCell label="Open Tasks" value={dashboard.openTasks} color="text-primary" icon={<ListChecks className="h-4 w-4 stroke-current text-primary shrink-0" />} onClick={() => hKpiNavigate("OPEN")} />
              <MetricCell label="In Progress" value={dashboard.inProgress} color="text-warning" icon={<Clock className="h-4 w-4 stroke-current text-warning shrink-0" />} onClick={() => hKpiNavigate("IN_PROGRESS")} />
              <MetricCell label="Overdue" value={dashboard.overdueTasks} color={dashboard.overdueTasks > 0 ? "text-danger" : "text-muted-foreground"} icon={<AlertOctagon className={`h-4 w-4 stroke-current shrink-0 ${dashboard.overdueTasks > 0 ? "text-danger" : "text-muted-foreground/60"}`} />} onClick={() => hKpiNavigate("OVERDUE")} urgent={dashboard.overdueTasks > 0} />
              <MetricCell label="Due Today" value={dashboard.dueToday} color={dashboard.dueToday > 0 ? "text-warning" : "text-muted-foreground"} icon={<Calendar className={`h-4 w-4 stroke-current shrink-0 ${dashboard.dueToday > 0 ? "text-warning" : "text-muted-foreground/60"}`} />} onClick={() => hKpiNavigate("DUE_TODAY")} />
              <MetricCell label="High Priority" value={dashboard.highPriority} color={dashboard.highPriority > 0 ? "text-danger" : "text-muted-foreground"} icon={<ArrowUpRight className={`h-4 w-4 stroke-current shrink-0 ${dashboard.highPriority > 0 ? "text-danger" : "text-muted-foreground/60"}`} />} onClick={() => hKpiNavigate("HIGH_PRIORITY")} />
              <MetricCell label="Completed Today" value={dashboard.completedToday} color="text-success" icon={<CheckCircle2 className="h-4 w-4 stroke-current text-success shrink-0" />} onClick={() => hKpiNavigate("COMPLETED")} />
            </div>

            {/* Dashboard Grid */}
            <div className="flex-1 min-h-0 overflow-hidden grid grid-rows-[42%_58%] divide-y divide-border">
              {/* Top row */}
              <div className="min-h-0 overflow-hidden grid grid-cols-[36%_28%_36%] divide-x divide-border">
                <PriorityWorkPanel items={priorityItems} />
                <UpcomingPanel items={dueItems} />
                <AlertsApprovalsPanel alerts={alertItems} approvals={approvalItems} />
              </div>
              {/* Bottom row */}
              <div className="min-h-0 overflow-hidden grid grid-cols-[42%_58%] divide-x divide-border">
                <RecentActivitySection items={activityItems} />
                <WorkspaceAnalyticsSection sourceData={sourceData} analyticsData={analyticsData} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppPageLayout>
  );
}
