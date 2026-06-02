import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Wrench, Plus, Pencil, RefreshCw, X, Check, Trash2, Printer,
  Play, CheckCircle, XCircle, RotateCcw, GitBranch,
  AlertTriangle, Ban, Settings, Lightbulb, Cog, Clock3,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { useTargetEntities, resolveTargetLabel } from "@/hooks/useTargetEntities";
import { MER_LIST_QUERY, MER_SUMMARY_QUERY } from "@/graphql/merQueries";
import {
  CREATE_MER_MUTATION, UPDATE_MER_MUTATION,
  REVIEW_MER_MUTATION, APPROVE_MER_MUTATION, REJECT_MER_MUTATION,
  START_MER_MUTATION, COMPLETE_MER_MUTATION, CANCEL_MER_MUTATION,
  CONVERT_MER_TO_KAIZEN_MUTATION, DELETE_MER_MUTATION,
} from "@/graphql/merMutations";

/* ── CONSTANTS ── */

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" }, { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" }, { value: "CRITICAL", label: "Critical" },
];

const REQUEST_TYPE_OPTIONS = [
  { value: "ENGINEERING_CHANGE", label: "Engineering Change" },
  { value: "TOOLING", label: "Tooling Request" },
  { value: "PROCESS_IMPROVEMENT", label: "Process Improvement" },
  { value: "EQUIPMENT_MODIFICATION", label: "Equipment Modification" },
];

const TARGET_OPTIONS = [
  { value: "Plant", label: "Plant" }, { value: "ProductionLine", label: "Production Line" },
  { value: "Department", label: "Department" }, { value: "ResourceGroup", label: "Resource Group" },
  { value: "Resource", label: "Resource" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "Uncategorized" }, { value: "SAFETY", label: "Safety" },
  { value: "QUALITY", label: "Quality" }, { value: "COST", label: "Cost Reduction" },
  { value: "DELIVERY", label: "Delivery" }, { value: "PRODUCTIVITY", label: "Productivity" },
  { value: "MAINTENANCE", label: "Maintenance" }, { value: "OTHER", label: "Other" },
];

const WORKFLOW_PHASES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED"];

/* ── TYPES ── */

interface MERNode {
  id: number; merCode: string; title: string; description: string;
  requestType: string; category: string; priority: string;
  targetType: string; targetId: number | null;
  submittedBy: string; assignedTo: string; reviewer: string;
  status: string; reviewNotes: string; rejectionReason: string;
  impactCost: string; impactQuality: string; impactDelivery: string; impactSafety: string;
  estimatedCost: number | null; actualCost: number | null;
  startDate: string | null; dueDate: string | null; completedDate: string | null;
  linkedKaizenId: number | null; linkedA3Id: number | null;
  resultSummary: string; lessonsLearned: string;
  createdAt: string; updatedAt: string;
}

interface FormState {
  title: string; description: string; requestType: string; category: string; priority: string;
  targetType: string; targetId: string; submittedBy: string; assignedTo: string; reviewer: string;
  impactCost: string; impactQuality: string; impactDelivery: string; impactSafety: string;
  estimatedCost: string; startDate: string; dueDate: string;
}

/* ── HELPERS ── */

function statusLabel(s: string): string {
  if (s === "UNDER_REVIEW") return "Under Review";
  if (s === "IN_PROGRESS") return "In Progress";
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
function requestTypeLabel(t: string): string {
  return REQUEST_TYPE_OPTIONS.find((o) => o.value === t)?.label || t;
}
function targetTypeLabel(t: string): string {
  const m: Record<string, string> = { Plant: "Plant", ProductionLine: "Production Line", Department: "Department", ResourceGroup: "Resource Group", Resource: "Resource" };
  return m[t] || t;
}
function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

/* ── SUB-COMPONENTS ── */

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex min-h-6 items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-amber-500/60 rounded-full" />
          <div className="flex-1 text-sm font-bold uppercase tracking-[0.12em] text-amber-600/70 dark:text-amber-400/70">{title}</div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ImpactRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground min-h-[1.5rem]">{value || <span className="italic text-muted-foreground">Not assessed</span>}</p>
    </div>
  );
}

/* ── Dashboard Components ── */

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

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  ENGINEERING_CHANGE: { label: "Engineering Change", icon: Wrench, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800" },
  TOOLING: { label: "Tooling", icon: Settings, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" },
  PROCESS_IMPROVEMENT: { label: "Process Improvement", icon: Lightbulb, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800" },
  EQUIPMENT_MODIFICATION: { label: "Equipment Modification", icon: Cog, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800" },
};

function KpiCard({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="border border-border/60 bg-card p-3 text-left">
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium ${theme.textMuted} truncate`}>{label}</p>
        <p className={`text-lg font-bold ${muted ? theme.textMuted : theme.textPrimary}`}>{value}</p>
      </div>
    </div>
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
  return <span className={`inline-block h-2 w-2 rounded-full ${meta?.color || "bg-gray-400"}`} />;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string | null): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function MERDashboardContent({ summary, summaryLoading, merList, onNew }: {
  summary: any; summaryLoading: boolean; merList: any[]; onNew: () => void;
}) {
  const navigate = useNavigate();

  const openCount = summary ? summary.submitted + summary.underReview + summary.approved + summary.inProgress : 0;
  const pipelineTotal = summary ? summary.submitted + summary.underReview + summary.approved + summary.inProgress + summary.completed : 0;
  const completionRate = pipelineTotal > 0 ? Math.round((summary.completed / pipelineTotal) * 100) : 0;
  const rejectionRate = summary && summary.total > 0 ? Math.round((summary.rejected / summary.total) * 100) : 0;
  const totalEstimated = merList.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);

  const recentMERs = [...merList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const upcomingDeadlines = merList.filter((m) => {
    if (["COMPLETED", "CANCELLED", "REJECTED"].includes(m.status)) return false;
    if (!m.dueDate) return false;
    const days = daysUntil(m.dueDate);
    return days !== null && days >= 0 && days <= 7;
  });

  const loading = summaryLoading && !summary;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-5 p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-4xl mb-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border border-border/40 bg-card p-3 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-3 w-16 bg-muted" />
                    <div className="h-5 w-10 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Loading MER data...
            </div>
          </div>
        ) : !summary ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>No MER data yet</h3>
            <p className={`text-xs ${theme.textSecondary} leading-relaxed max-w-xs mb-4`}>
              Create manufacturing engineering requests to see the analytics dashboard here.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onNew}
                className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
                New MER
              </button>
            </div>
          </div>
        ) : (
          <>
            <SectionCard title="Key Metrics">
              <div className="grid grid-cols-2 md:grid-cols-9 gap-2">
                <KpiCard label="Submitted" value={summary.submitted} />
                <KpiCard label="Under Review" value={summary.underReview} />
                <KpiCard label="Approved" value={summary.approved} />
                <KpiCard label="In Progress" value={summary.inProgress} />
                <KpiCard label="Completed" value={summary.completed} />
                <KpiCard label="Rejected" value={summary.rejected} muted={summary.rejected === 0} />
                <KpiCard label="Cancelled" value={summary.cancelled} muted={summary.cancelled === 0} />
                <KpiCard label="Overdue" value={summary.overdue} muted={summary.overdue === 0} />
                <KpiCard label="Est. Cost" value={`$${totalEstimated.toLocaleString()}`} muted={totalEstimated === 0} />
              </div>
            </SectionCard>

            <div>
              <div className="border border-border/60 bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-4 w-0.5 bg-indigo-500/60 rounded-full" />
                  <h3 className={`text-xs font-bold uppercase tracking-[0.12em] ${theme.textMuted}`}>Breakdown</h3>
                </div>
                <div className="space-y-2.5">
                  {summary.byType.map((t: { requestType: string; count: number }) => {
                    const meta = TYPE_META[t.requestType];
                    const barColors: Record<string, string> = {
                      ENGINEERING_CHANGE: "bg-blue-500", TOOLING: "bg-amber-500",
                      PROCESS_IMPROVEMENT: "bg-green-500", EQUIPMENT_MODIFICATION: "bg-purple-500",
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
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-border/60 bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-4 w-0.5 bg-amber-500/60 rounded-full" />
                  <h3 className={`text-xs font-bold uppercase tracking-[0.12em] ${theme.textMuted}`}>Due This Week</h3>
                  {upcomingDeadlines.length > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {upcomingDeadlines.length}
                    </span>
                  )}
                </div>
                {upcomingDeadlines.length === 0 ? (
                  <div className={`flex items-center justify-center h-20 text-xs italic ${theme.textMuted}`}>No upcoming deadlines</div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {upcomingDeadlines.map((m) => {
                      const days = daysUntil(m.dueDate);
                      return (
                        <button key={m.id} type="button"
                          onClick={() => {/* select handled by parent */}}
                          className="w-full flex items-center gap-2 border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-2 text-left hover:bg-amber-100/70 dark:hover:bg-amber-900/20 transition-colors">
                          <Clock3 className="h-3 w-3 shrink-0 text-amber-500 stroke-current" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-foreground truncate">{m.title}</div>
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              {days !== null ? (days === 0 ? "Due today" : `${days}d remaining`) : "Upcoming"}
                            </div>
                          </div>
                          <StatusDot status={m.status} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border border-border/60 bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-4 w-0.5 bg-green-500/60 rounded-full" />
                  <h3 className={`text-xs font-bold uppercase tracking-[0.12em] ${theme.textMuted}`}>Recent Activity</h3>
                </div>
                {recentMERs.length === 0 ? (
                  <div className={`flex items-center justify-center h-20 text-xs italic ${theme.textMuted}`}>No recent activity</div>
                ) : (
                  <div className="space-y-1.5">
                    {recentMERs.map((m) => (
                      <div key={m.id} className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50 transition-colors">
                        <StatusDot status={m.status} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground truncate">{m.title}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{m.merCode || `MER-${m.id}`}</span>
                            <span>{"\u00B7"}</span>
                            <span>{formatDate(m.createdAt)}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${PRIORITY_META[m.priority]?.color || "text-muted-foreground"}`}>
                          {PRIORITY_META[m.priority]?.label || m.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── MAIN COMPONENT ── */

export function ManufacturingEngineeringRequestsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "", description: "", requestType: "ENGINEERING_CHANGE", category: "", priority: "MEDIUM",
    targetType: "Plant", targetId: "", submittedBy: "", assignedTo: "", reviewer: "",
    impactCost: "", impactQuality: "", impactDelivery: "", impactSafety: "",
    estimatedCost: "", startDate: "", dueDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);
  const [resultSummary, setResultSummary] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);

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

  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(null), 5000); return () => clearTimeout(t); }
  }, [successMsg]);

  const { data, loading, refetch } = useQuery<{ manufacturingEngineeringRequests: MERNode[] }>(MER_LIST_QUERY, {
    variables: {
      status: filterStatus || undefined,
      requestType: filterType || undefined,
      search: search || undefined,
    },
    fetchPolicy: "cache-and-network",
  });
  const mers: MERNode[] = data?.manufacturingEngineeringRequests || [];

  const { data: summaryData, loading: summaryLoading } = useQuery<{
    merSummary: {
      total: number; submitted: number; underReview: number; approved: number;
      inProgress: number; completed: number; rejected: number; cancelled: number;
      overdue: number; byType: { requestType: string; count: number }[];
      byPriority: { priority: string; count: number }[];
    }
  }>(MER_SUMMARY_QUERY, { fetchPolicy: "cache-and-network" });
  const summary = summaryData?.merSummary;

  const [createMer] = useMutation<{ createMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(CREATE_MER_MUTATION);
  const [updateMer] = useMutation<{ updateMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(UPDATE_MER_MUTATION);
  const [reviewMer] = useMutation<{ reviewMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(REVIEW_MER_MUTATION);
  const [approveMer] = useMutation<{ approveMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(APPROVE_MER_MUTATION);
  const [rejectMer] = useMutation<{ rejectMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(REJECT_MER_MUTATION);
  const [startMer] = useMutation<{ startMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(START_MER_MUTATION);
  const [completeMer] = useMutation<{ completeMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(COMPLETE_MER_MUTATION);
  const [cancelMer] = useMutation<{ cancelMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(CANCEL_MER_MUTATION);
  const [convertMer] = useMutation<{ convertMerToKaizen: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(CONVERT_MER_TO_KAIZEN_MUTATION);
  const [deleteMer] = useMutation<{ deleteMer: { ok: boolean; errors?: { field: string; code: string; message: string }[] | null } }>(DELETE_MER_MUTATION);

  const sel = selectedId ? mers.find((m) => m.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  const { targetOptions, allEntities } = useTargetEntities(form.targetType);
  const targetLabel = resolveTargetLabel(allEntities, form.targetId);

  const g = (k: keyof FormState) => String(form[k] ?? "");
  const sf = (k: keyof FormState, v: unknown) => { setIsDirty(true); setForm((p) => ({ ...p, [k]: v })); };

  const clearForm = useCallback(() => {
    setForm({
      title: "", description: "", requestType: "ENGINEERING_CHANGE", category: "", priority: "MEDIUM",
      targetType: "Plant", targetId: "", submittedBy: "", assignedTo: "", reviewer: "",
      impactCost: "", impactQuality: "", impactDelivery: "", impactSafety: "",
      estimatedCost: "", startDate: "", dueDate: "",
    });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const loadForm = useCallback((item: MERNode) => {
    setForm({
      title: item.title, description: item.description, requestType: item.requestType,
      category: item.category, priority: item.priority, targetType: item.targetType || "Plant",
      targetId: String(item.targetId ?? ""), submittedBy: item.submittedBy,
      assignedTo: item.assignedTo, reviewer: item.reviewer,
      impactCost: item.impactCost, impactQuality: item.impactQuality,
      impactDelivery: item.impactDelivery, impactSafety: item.impactSafety,
      estimatedCost: item.estimatedCost != null ? String(item.estimatedCost) : "",
      startDate: item.startDate || "", dueDate: item.dueDate || "",
    });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => {
    if (isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; }
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
  }, [sel, loadForm, clearForm, isDirty, mode]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    const errs: Record<string, string> = {};
    if (!form.title?.trim()) errs.title = "Required";
    if (!form.targetId?.trim()) errs.targetId = "Required";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    try {
      if (mode === "edit" && sel) {
        const vars: Record<string, unknown> = { id: sel.id, input: {
          title: form.title.trim(), description: form.description,
          requestType: form.requestType, category: form.category, priority: form.priority,
          targetType: form.targetType, targetId: form.targetId ? parseInt(form.targetId) : null,
          assignedTo: form.assignedTo, reviewer: form.reviewer,
          impactCost: form.impactCost, impactQuality: form.impactQuality,
          impactDelivery: form.impactDelivery, impactSafety: form.impactSafety,
          estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
          startDate: form.startDate || null, dueDate: form.dueDate || null,
        }};
        const r = await updateMer({ variables: vars });
        if (r.data?.updateMer?.errors?.length) { setMutationError(r.data.updateMer.errors[0].message); return; }
        setSuccessMsg("MER updated"); setIsDirty(false); refetch(); setMode("view");
      } else {
        const r = await createMer({ variables: { input: {
          title: form.title.trim(), description: form.description,
          requestType: form.requestType, category: form.category, priority: form.priority,
          targetType: form.targetType, targetId: form.targetId ? parseInt(form.targetId) : null,
          submittedBy: form.submittedBy, assignedTo: form.assignedTo, reviewer: form.reviewer,
          impactCost: form.impactCost, impactQuality: form.impactQuality,
          impactDelivery: form.impactDelivery, impactSafety: form.impactSafety,
          estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
          startDate: form.startDate || null, dueDate: form.dueDate || null,
        }}});
        if (r.data?.createMer?.errors?.length) { setMutationError(r.data.createMer.errors[0].message); return; }
        setSuccessMsg("MER created"); setIsDirty(false); refetch(); setMode("view");
      }
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : "Save failed"); }
  }, [form, mode, sel, createMer, updateMer, refetch]);

  const hReview = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await reviewMer({ variables: { id: sel.id } });
    if (r.data?.reviewMer?.errors?.length) { setMutationError(r.data.reviewMer.errors[0].message); return; }
    setSuccessMsg("MER moved to Under Review"); refetch();
  }, [sel, reviewMer, refetch]);

  const hApprove = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await approveMer({ variables: { id: sel.id, reviewNotes } });
    if (r.data?.approveMer?.errors?.length) { setMutationError(r.data.approveMer.errors[0].message); return; }
    setSuccessMsg("MER approved"); setReviewNotes(""); refetch();
  }, [sel, reviewNotes, approveMer, refetch]);

  const hReject = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await rejectMer({ variables: { id: sel.id, reason: rejectReason } });
    if (r.data?.rejectMer?.errors?.length) { setMutationError(r.data.rejectMer.errors[0].message); return; }
    setSuccessMsg("MER rejected"); setRejectReason(""); setConfirmAction(null); refetch();
  }, [sel, rejectReason, rejectMer, refetch]);

  const hStart = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await startMer({ variables: { id: sel.id } });
    if (r.data?.startMer?.errors?.length) { setMutationError(r.data.startMer.errors[0].message); return; }
    setSuccessMsg("MER started"); refetch();
  }, [sel, startMer, refetch]);

  const hComplete = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await completeMer({ variables: { id: confirmAction.id, resultSummary } });
    if (r.data?.completeMer?.errors?.length) { setMutationError(r.data.completeMer.errors[0].message); setConfirmAction(null); return; }
    setSuccessMsg("MER completed"); setConfirmAction(null); setResultSummary(""); refetch();
  }, [confirmAction, resultSummary, completeMer, refetch]);

  const hCancelMer = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await cancelMer({ variables: { id: confirmAction.id } });
    if (r.data?.cancelMer?.errors?.length) { setMutationError(r.data.cancelMer.errors[0].message); setConfirmAction(null); return; }
    setSuccessMsg("MER cancelled"); setConfirmAction(null); refetch();
  }, [confirmAction, cancelMer, refetch]);

  const hConvert = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await convertMer({ variables: { id: sel.id } });
    if (r.data?.convertMerToKaizen?.errors?.length) { setMutationError(r.data.convertMerToKaizen.errors[0].message); return; }
    setSuccessMsg("MER converted to Kaizen"); refetch();
  }, [sel, convertMer, refetch]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return; setMutationError(null);
    const r = await deleteMer({ variables: { id: confirmDelete } });
    if (r.data?.deleteMer?.errors?.length) { setMutationError(r.data.deleteMer.errors[0].message); setConfirmDelete(null); return; }
    setSuccessMsg("MER deleted"); setConfirmDelete(null); setSelectedId(null); refetch();
  }, [confirmDelete, deleteMer, refetch]);

  const iCls = `h-7 w-full bg-card border border-gray-300 text-foreground placeholder:text-muted-foreground px-2 text-sm outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
  const sCls = iCls;

  const renderHtmlBlock = (content: string, fallback = "Not defined") => (
    content ? (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm leading-snug"
        dangerouslySetInnerHTML={{ __html: content }} />
    ) : <p className={`text-xs italic ${theme.textMuted}`}>{fallback}</p>
  );

  /* ── Form ── */
  const renderForm = () => (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[20%_80%] gap-6 px-5 py-3 min-w-0">
        <div className="min-w-0 overflow-y-auto space-y-3 pr-2">
          <SectionCard title="Target">
            <div className="space-y-1.5">
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Type</p>
                <select value={g("targetType")} onChange={(e) => { sf("targetType", e.target.value); sf("targetId", ""); }} className={sCls}>
                  {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Target</p>
                <select value={g("targetId")} onChange={(e) => sf("targetId", e.target.value)} className={sCls}>
                  <option value="">Select {form.targetType}...</option>
                  {targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.targetId && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.targetId}</p>}
                {targetLabel && <p className={`text-xs ${theme.textMuted} mt-1`}>{targetLabel}</p>}
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Classification">
            <div className="space-y-1.5">
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Request Type</p>
                <select value={g("requestType")} onChange={(e) => sf("requestType", e.target.value)} className={sCls}>
                  {REQUEST_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Category</p>
                <select value={g("category")} onChange={(e) => sf("category", e.target.value)} className={sCls}>
                  {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Priority</p>
                <select value={g("priority")} onChange={(e) => sf("priority", e.target.value)} className={sCls}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
            </div>
          </SectionCard>
          <SectionCard title="People">
            <div className="space-y-1.5">
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Submitted By</p>
                <input type="text" value={g("submittedBy")} onChange={(e) => sf("submittedBy", e.target.value)} placeholder="Your name" className={iCls} /></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Assigned To</p>
                <input type="text" value={g("assignedTo")} onChange={(e) => sf("assignedTo", e.target.value)} placeholder="Engineer" className={iCls} /></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Reviewer</p>
                <input type="text" value={g("reviewer")} onChange={(e) => sf("reviewer", e.target.value)} placeholder="Reviewer" className={iCls} /></div>
            </div>
          </SectionCard>
          <SectionCard title="Dates & Cost">
            <div className="space-y-1.5">
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Start Date</p>
                <input type="date" value={g("startDate")} onChange={(e) => sf("startDate", e.target.value)} className={iCls} /></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Due Date</p>
                <input type="date" value={g("dueDate")} onChange={(e) => sf("dueDate", e.target.value)} className={iCls} /></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Estimated Cost ($)</p>
                <input type="number" step="0.01" value={g("estimatedCost")} onChange={(e) => sf("estimatedCost", e.target.value)} placeholder="0.00" className={iCls} /></div>
            </div>
          </SectionCard>
        </div>
        <div className="min-w-0 min-h-0 h-full flex flex-col overflow-hidden mr-6 pb-6">
          <SectionCard title="Title">
            <input type="text" value={g("title")} onChange={(e) => sf("title", e.target.value)} placeholder="MER title *" className={`${iCls} w-full min-w-0`} />
            {errors.title && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.title}</p>}
          </SectionCard>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden mt-3">
            <SectionCard title="Description"><span /></SectionCard>
            <div className="flex-1 min-h-0 overflow-hidden border border-gray-300">
              <div className="h-full overflow-y-auto"><RichTextEditor content={g("description")} onChange={(html) => sf("description", html)}
                placeholder="Describe the engineering request, problem, and expected outcome..." /></div>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            <SectionCard title="Impact Assessment (CQDS)">
              <div className="grid grid-cols-2 gap-3">
                <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Cost Impact</p>
                  <textarea value={g("impactCost")} onChange={(e) => sf("impactCost", e.target.value)} rows={2} placeholder="Cost implications..."
                    className="h-14 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none resize-none focus:border-amber-400 transition-colors" /></div>
                <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Quality Impact</p>
                  <textarea value={g("impactQuality")} onChange={(e) => sf("impactQuality", e.target.value)} rows={2} placeholder="Quality implications..."
                    className="h-14 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none resize-none focus:border-amber-400 transition-colors" /></div>
                <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Delivery Impact</p>
                  <textarea value={g("impactDelivery")} onChange={(e) => sf("impactDelivery", e.target.value)} rows={2} placeholder="Delivery implications..."
                    className="h-14 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none resize-none focus:border-amber-400 transition-colors" /></div>
                <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Safety Impact</p>
                  <textarea value={g("impactSafety")} onChange={(e) => sf("impactSafety", e.target.value)} rows={2} placeholder="Safety implications..."
                    className="h-14 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none resize-none focus:border-amber-400 transition-colors" /></div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── View / Detail ── */
  const renderDetail = () => {
    if (mode === "create" && !sel) return <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderForm()}</div>;
    if (!sel) return <MERDashboardContent summary={summary} summaryLoading={summaryLoading} merList={mers} onNew={hNew} />;
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {mutationError && isForm && <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>}
        {isForm ? renderForm() : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 border-b border-border/30 px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-bold ${theme.textPrimary} truncate`}>{sel.title}</div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
                  {sel.priority && sel.priority !== "MEDIUM" && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority}</span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground">{requestTypeLabel(sel.requestType)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {sel.merCode && <span className={`text-xs font-mono ${theme.textMuted}`}>{sel.merCode}</span>}
                  {sel.submittedBy && <span className={`text-xs ${theme.textMuted}`}>by {sel.submittedBy}</span>}
                  {sel.createdAt && <span className={`text-xs ${theme.textMuted}`}>{sel.createdAt.slice(0, 10)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {sel.status === "SUBMITTED" && (
                  <button type="button" onClick={hReview} className="inline-flex h-7 items-center gap-1 border border-blue-200 dark:border-blue-800 px-2 text-[10px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all whitespace-nowrap">
                    <RotateCcw className="h-2.5 w-2.5 stroke-current" />Review
                  </button>
                )}
                {(sel.status === "SUBMITTED" || sel.status === "UNDER_REVIEW") && (
                  <button type="button" onClick={() => { setReviewNotes(""); setConfirmAction({ id: sel.id, action: "approve" }); }} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <Check className="h-2.5 w-2.5 stroke-current" />Approve
                  </button>
                )}
                {(sel.status === "SUBMITTED" || sel.status === "UNDER_REVIEW") && (
                  <button type="button" onClick={() => { setRejectReason(""); setConfirmAction({ id: sel.id, action: "reject" }); }} className="inline-flex h-7 items-center gap-1 border border-red-200 dark:border-red-800 px-2 text-[10px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap">
                    <Ban className="h-2.5 w-2.5 stroke-current" />Reject
                  </button>
                )}
                {sel.status === "APPROVED" && (
                  <button type="button" onClick={hStart} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <Play className="h-2.5 w-2.5 stroke-current" />Start
                  </button>
                )}
                {sel.status === "IN_PROGRESS" && (
                  <button type="button" onClick={() => { setResultSummary(""); setConfirmAction({ id: sel.id, action: "complete" }); }} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <CheckCircle className="h-2.5 w-2.5 stroke-current" />Complete
                  </button>
                )}
                {(sel.status === "APPROVED" || sel.status === "COMPLETED") && (
                  <button type="button" onClick={hConvert} className="inline-flex h-7 items-center gap-1 border border-purple-200 dark:border-purple-800 px-2 text-[10px] font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all whitespace-nowrap">
                    <GitBranch className="h-2.5 w-2.5 stroke-current" />Kaizen
                  </button>
                )}
                {sel.status !== "COMPLETED" && sel.status !== "CANCELLED" && (
                  <button type="button" onClick={() => setConfirmAction({ id: sel.id, action: "cancel" })} className="inline-flex h-7 items-center gap-1 border border-red-200 dark:border-red-800 px-2 text-[10px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap">
                    <XCircle className="h-2.5 w-2.5 stroke-current" />Cancel
                  </button>
                )}
                <button type="button" onClick={() => window.print()} className="inline-flex h-7 items-center gap-1 border border-border/40 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-border/70 transition-all whitespace-nowrap">
                  <Printer className="h-2.5 w-2.5 stroke-current" />
                </button>
              </div>
            </div>
            {/* Workflow Progress Bar */}
            <div className="flex items-center border-b border-border/20 bg-muted/20 px-3 py-1.5">
              {WORKFLOW_PHASES.map((phase, idx) => {
                const isActive = sel.status === phase;
                const isPast = WORKFLOW_PHASES.indexOf(sel.status) >= idx && sel.status !== phase;
                return (
                  <div key={phase} className="flex items-center gap-0.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 transition-colors ${isActive ? (STATUS_STYLES[phase] || "") + " font-bold ring-1 ring-amber-300/50" : sel.status === "REJECTED" || sel.status === "CANCELLED" ? "text-muted-foreground" : isPast ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "text-muted-foreground"}`}>
                      {isPast && sel.status !== "REJECTED" && sel.status !== "CANCELLED" ? "\u2713 " : ""}{statusLabel(phase)}
                    </span>
                    {idx < WORKFLOW_PHASES.length - 1 && <span className={`text-[10px] mx-0.5 ${WORKFLOW_PHASES.indexOf(sel.status) > idx ? "text-green-400" : "text-muted-foreground/30"}`}>{"\u2192"}</span>}
                  </div>
                );
              })}
              {(sel.status === "REJECTED" || sel.status === "CANCELLED") && (
                <>
                  <span className="text-[10px] mx-0.5 text-muted-foreground/30">{"\u2192"}</span>
                  <span className={`text-[10px] px-2 py-0.5 font-semibold ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
                </>
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 mr-6">
              <div className="grid grid-cols-2 gap-6 auto-rows-min">
                <div className="space-y-4">
                  <SectionCard title="Request Details">
                    <p className={`text-sm font-semibold ${theme.textPrimary} mb-2`}>{sel.title}</p>
                    {renderHtmlBlock(sel.description, "No description provided.")}
                  </SectionCard>
                  <SectionCard title="Impact Assessment (CQDS)">
                    <div className="space-y-2">
                      <ImpactRow label="Cost" value={sel.impactCost} />
                      <ImpactRow label="Quality" value={sel.impactQuality} />
                      <ImpactRow label="Delivery" value={sel.impactDelivery} />
                      <ImpactRow label="Safety" value={sel.impactSafety} />
                    </div>
                  </SectionCard>
                </div>
                <div className="space-y-4">
                  <SectionCard title="Classification & Target">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Type</span><span className="text-foreground">{requestTypeLabel(sel.requestType)}</span></div>
                      <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Category</span><span className="text-foreground">{CATEGORY_OPTIONS.find((o) => o.value === sel.category)?.label || sel.category || "-"}</span></div>
                      <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Priority</span><span>{sel.priority ? <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority}</span> : "-"}</span></div>
                      <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Target</span><span className="text-foreground">{targetTypeLabel(sel.targetType)} {sel.targetId ? `#${sel.targetId}` : ""}</span></div>
                    </div>
                  </SectionCard>
                  <SectionCard title="People & Dates">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Submitted by</span><span className="text-foreground">{sel.submittedBy || "-"}</span></div>
                      <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Assigned to</span><span className="text-foreground">{sel.assignedTo || "-"}</span></div>
                      <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Reviewer</span><span className="text-foreground">{sel.reviewer || "-"}</span></div>
                      {sel.startDate && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Start</span><span className="text-foreground">{sel.startDate}</span></div>}
                      {sel.dueDate && (
                        <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Due</span>
                          <span className={`text-foreground ${isOverdue(sel.dueDate) && sel.status !== "COMPLETED" ? "text-red-500 font-semibold" : ""}`}>
                            {isOverdue(sel.dueDate) && sel.status !== "COMPLETED" && <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5 stroke-current" />}
                            {sel.dueDate}
                          </span>
                        </div>
                      )}
                      {sel.completedDate && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Completed</span><span className="text-green-600">{sel.completedDate}</span></div>}
                      {sel.estimatedCost != null && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Est. Cost</span><span className="text-foreground">${sel.estimatedCost.toLocaleString()}</span></div>}
                      {sel.actualCost != null && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Actual Cost</span><span className="text-foreground">${sel.actualCost.toLocaleString()}</span></div>}
                    </div>
                  </SectionCard>
                  {(sel.reviewNotes || sel.rejectionReason) && (
                    <SectionCard title={sel.status === "REJECTED" ? "Rejection Reason" : "Review Notes"}>
                      {sel.status === "REJECTED" && sel.rejectionReason ? (
                        <div className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5 stroke-current" /><p className={`text-sm ${theme.textPrimary}`}>{sel.rejectionReason}</p></div>
                      ) : <p className={`text-sm ${theme.textPrimary}`}>{sel.reviewNotes}</p>}
                    </SectionCard>
                  )}
                  {sel.resultSummary && (
                    <SectionCard title="Result Summary">{renderHtmlBlock(sel.resultSummary)}</SectionCard>
                  )}
                  {sel.lessonsLearned && (
                    <SectionCard title="Lessons Learned">{renderHtmlBlock(sel.lessonsLearned)}</SectionCard>
                  )}
                  {sel.linkedKaizenId && (
                    <SectionCard title="Linked Improvement">
                      <div className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5 text-purple-600 stroke-current" />
                        <span className="text-sm text-purple-700 font-medium">Linked to Kaizen #{sel.linkedKaizenId}</span>
                      </div>
                    </SectionCard>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── Main Render ── */
  return (
    <>
      <style>{`@media print { .print-ignore { display: none !important; } .print-area { display: block !important; max-width: 100% !important; border: none !important; } body { background: white !important; } }`}</style>
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        {successMsg && <div className={`shrink-0 h-8 flex items-center justify-center ${theme.toastSuccess} text-sm font-semibold border-b print-ignore`}>{successMsg}</div>}
        <div className="print-ignore">
          <PageHeader icon={<Wrench className="h-5 w-5 stroke-current" />}
            iconClass="bg-indigo-500/10 text-indigo-600"
            title="MER"
            subtitle="Manufacturing Engineering Requests — submit, track, and manage." />
        </div>
        <div className="print-ignore">
          <Toolbar
            left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search MERs..." />}
            right={<>
              <ToolbarSelect value={filterStatus} onChange={setFilterStatus}
                options={[{ value: "", label: "All Statuses" }, ...Object.keys(STATUS_STYLES).map((s) => ({ value: s, label: statusLabel(s) }))]}
                className="w-36" />
              <ToolbarSelect value={filterType} onChange={setFilterType}
                options={[{ value: "", label: "All Types" }, ...REQUEST_TYPE_OPTIONS]}
                className="w-44" />
              <div className="flex-1" />
              <div className="flex items-center gap-2 shrink-0">
                {isForm ? (
                  <><ToolbarButton icon={Check} label="Save" onClick={hSave} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={hCancel} /></>
                ) : (
                  <><ToolbarButton icon={Plus} label="New" onClick={hNew} /><ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel || sel.status === "COMPLETED" || sel.status === "CANCELLED"} />
                    <span className="h-5 w-px shrink-0 bg-border/25" />
                    <ToolbarButton icon={Trash2} label="Delete" onClick={() => sel && setConfirmDelete(sel.id)} disabled={!sel} />
                    <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
                  </>
                )}
              </div>
            </>} />
        </div>
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left Panel: List ── */}
          <div className="print-ignore flex flex-col min-h-0 overflow-hidden bg-card/40 border-r border-border/20" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
              <span className={`text-sm font-medium ${theme.textMuted}`}>Requests</span>
              <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{mers.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
              {loading && mers.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
              ) : mers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No engineering requests</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 dark:text-amber-400 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> Create MER</button>
                </div>
              ) : (
                <div>
                  {mers.map((m) => (
                    <div key={m.id}
                      onClick={() => {
                        if (isForm && isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; }
                        setSelectedId(m.id);
                        if (mode === "create") { clearForm(); }
                        if (isForm) { setIsDirty(false); setMode("view"); }
                      }}
                      className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedId === m.id ? "bg-table-selected border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                          <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{m.title}</span>
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[m.status] || ""}`}>
                              {m.status === "IN_PROGRESS" ? "Active" : statusLabel(m.status)}</span>
                            {m.priority && m.priority !== "MEDIUM" && <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${PRIORITY_STYLES[m.priority] || ""}`}>{m.priority}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {m.submittedBy && <span className={`text-xs ${theme.textMuted}`}>{m.submittedBy}</span>}
                          <span className={`text-[10px] ${theme.textMuted}`}>{"\u00B7"}</span>
                          <span className={`text-xs ${theme.textMuted}`}>{requestTypeLabel(m.requestType)}</span>
                          {m.createdAt && <><span className={`text-[10px] ${theme.textMuted}`}>{"\u00B7"}</span><span className={`text-xs ${theme.textMuted}`}>{m.createdAt.slice(0, 10)}</span></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
              <span className={`text-xs ${theme.textMuted}`}>{mers.length} request{mers.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div onMouseDown={handleSplitMouseDown}
            className="print-ignore flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-amber-500/10"
            style={{ width: 2 }} />
          <div className={`print-area flex flex-col min-h-0 min-w-0 ${isForm ? "" : "mode-enter"}`} style={{ flex: 1 }}>{renderDetail()}</div>
        </div>
        <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span>MER</span>
          <span className="flex-1" />
          {sel && <><span>Created: {sel.createdAt?.slice(0, 10) || "-"}</span><span>Updated: {sel.updatedAt?.slice(0, 10) || "-"}</span></>}
          {summary && <span>Total: {summary.total} | Active: {summary.inProgress} | Completed: {summary.completed}</span>}
        </div>
      </div>
      {/* ── Approve Dialog ── */}
      <ConfirmDialog open={confirmAction?.action === "approve"} onClose={() => setConfirmAction(null)}
        onConfirm={hApprove} title="Approve MER" message="Approve this Manufacturing Engineering Request to proceed to implementation?"
        confirmLabel="Approve" danger={false}>
        <div className="mt-3">
          <label className={`block text-xs font-semibold ${theme.textMuted} mb-1`}>Review Notes (optional)</label>
          <textarea placeholder="Add review notes..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
            className="h-20 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
        </div>
      </ConfirmDialog>
      {/* ── Reject Dialog ── */}
      <ConfirmDialog open={confirmAction?.action === "reject"} onClose={() => setConfirmAction(null)}
        onConfirm={hReject} title="Reject MER" message="Are you sure you want to reject this MER?"
        confirmLabel="Reject" danger={true}>
        <div className="mt-3">
          <label className={`block text-xs font-semibold ${theme.textMuted} mb-1`}>Reason for rejection</label>
          <textarea placeholder="Explain why this request is being rejected..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            className="h-20 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
        </div>
      </ConfirmDialog>
      {/* ── Complete Dialog ── */}
      <ConfirmDialog open={confirmAction?.action === "complete"} onClose={() => setConfirmAction(null)}
        onConfirm={hComplete} title="Complete MER" message="Mark this MER as completed?"
        confirmLabel="Complete" danger={false}>
        <div className="mt-3">
          <label className={`block text-xs font-semibold ${theme.textMuted} mb-1`}>Result Summary</label>
          <textarea placeholder="Describe the outcomes and results..." value={resultSummary} onChange={(e) => setResultSummary(e.target.value)}
            className="h-24 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
        </div>
      </ConfirmDialog>
      {/* ── Cancel Dialog ── */}
      <ConfirmDialog open={confirmAction?.action === "cancel"} onClose={() => setConfirmAction(null)}
        onConfirm={hCancelMer} title="Cancel MER" message="Cancel this Manufacturing Engineering Request?"
        confirmLabel="Yes, Cancel" danger={true} />
      {/* ── Delete Dialog ── */}
      <ConfirmDialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}
        onConfirm={hDelete} title="Delete MER"
        message="Are you sure you want to permanently delete this request? This action cannot be undone."
        confirmLabel="Delete" danger={true} />
    </>
  );
}
