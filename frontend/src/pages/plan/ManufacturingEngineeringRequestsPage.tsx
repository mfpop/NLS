import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";

import { useQuery, useMutation } from "@apollo/client/react";
import {
  Wrench, Plus, Pencil, RefreshCw, X, Check, Trash2, Printer,
  Play, CheckCircle, XCircle, RotateCcw, GitBranch,
  AlertTriangle, Ban, Settings, Lightbulb, Cog, Clock3,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { PageToolbar, ToolbarDropdown, ToolbarButton, ToolbarSeparator } from "@/components/layout/PageToolbar";
import { LEFT_COLUMN_WIDTH_CLASS } from "@/components/layout/layoutWidths";
import { RecordListPanel, RecordListItem } from "@/components/layout/RecordListPanel";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { useTargetEntities } from "@/hooks/useTargetEntities";
import { formatDateShort } from "@/utils/dateFormat";
import { MER_LIST_QUERY, MER_SUMMARY_QUERY } from "@/graphql/merQueries";
import {
  CREATE_MER_MUTATION, UPDATE_MER_MUTATION,
  REVIEW_MER_MUTATION, APPROVE_MER_MUTATION, REJECT_MER_MUTATION,
  START_MER_MUTATION, COMPLETE_MER_MUTATION, CANCEL_MER_MUTATION,
  CONVERT_MER_TO_KAIZEN_MUTATION, DELETE_MER_MUTATION,
} from "@/graphql/merMutations";

/* ── CONSTANTS ── */  const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-primary/15 text-primary",
  UNDER_REVIEW: "bg-warning/15 text-warning",
  APPROVED: "bg-success/15 text-success",
  IN_PROGRESS: "bg-warning/15 text-warning",
  COMPLETED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
  CANCELLED: "bg-muted text-foreground dark:bg-muted/40 dark:text-muted-foreground/30",
};

const STATUS_DOT: Record<string, string> = {
  SUBMITTED: "bg-primary/100",
  UNDER_REVIEW: "bg-warning/100",
  APPROVED: "bg-success/100",
  IN_PROGRESS: "bg-warning/100",
  COMPLETED: "bg-success",
  REJECTED: "bg-danger/100",
  CANCELLED: "bg-muted-foreground/40",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-primary/15 text-primary",
  HIGH: "bg-warning/15 text-warning",
  CRITICAL: "bg-danger/15 text-danger",
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
  submittedBy: string; owner: string; assignedTo: string; reviewer: string;
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
  targetType: string; targetId: string; owner: string; assignedTo: string; reviewer: string;
  impactCost: string; impactQuality: string; impactDelivery: string; impactSafety: string;
  estimatedCost: string; startDate: string; dueDate: string;
}

/* ── HELPERS ── */

function statusLabel(s: string): string {
  if (s === "SUBMITTED") return "Sub.";
  if (s === "UNDER_REVIEW") return "Review";
  if (s === "APPROVED") return "Appr.";
  if (s === "IN_PROGRESS") return "Active";
  if (s === "COMPLETED") return "Done";
  if (s === "REJECTED") return "Rej.";
  if (s === "CANCELLED") return "Canc.";
  return s;
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

function MERDetailSkeleton() {
  const s = "bg-muted rounded animate-pulse";
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header skeleton */}
      <div className="shrink-0 border-b border-border/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className={`h-5 w-56 ${s}`} />
          <div className={`h-5 w-12 ${s}`} />
          <div className={`h-5 w-16 ${s}`} />
          <div className={`h-5 w-28 ${s}`} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className={`h-3 w-24 ${s}`} />
          <div className={`h-3 w-20 ${s}`} />
        </div>
      </div>
      {/* Action buttons bar skeleton */}
      <div className="shrink-0 border-b border-border/20 bg-muted/20 px-4 py-2 flex items-center gap-2">
        <div className={`h-6 w-16 ${s}`} />
        <div className={`h-6 w-16 ${s}`} />
        <div className={`h-6 w-16 ${s}`} />
      </div>
      {/* Workflow progress skeleton */}
      <div className="shrink-0 flex items-center gap-1 border-b border-border/20 bg-muted/20 px-3 py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-4 w-14 ${s}`} />
        ))}
      </div>
      {/* 2-column content skeleton */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 mr-6">
        <div className="grid grid-cols-[3fr_2fr] gap-8">
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className={`h-4 w-32 ${s}`} />
                <div className={`h-3 w-full ${s}`} />
                <div className={`h-3 w-3/4 ${s}`} />
                <div className={`h-3 w-2/4 ${s}`} />
              </div>
            ))}
          </div>
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className={`h-4 w-28 ${s}`} />
                <div className={`h-3 w-full ${s}`} />
                <div className={`h-3 w-3/4 ${s}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlatSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="h-8 border-b border-border px-3 flex items-center">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{title}</span>
      </div>
      <div className="px-3 py-2">
        {children}
      </div>
    </section>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <section>
      <div className="h-8 border-b border-border px-0 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{title}</span>
        {action}
      </div>
      {children && <div className="pt-2">{children}</div>}
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
  SUBMITTED: { label: "Submitted", color: "bg-primary/100" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-warning/100" },
  APPROVED: { label: "Approved", color: "bg-success/100" },
  IN_PROGRESS: { label: "In Progress", color: "bg-warning/100" },
  COMPLETED: { label: "Completed", color: "bg-success" },
  REJECTED: { label: "Rejected", color: "bg-danger/100" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-400" },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: "Critical", color: "text-danger", bg: "bg-danger/10" },
  HIGH: { label: "High", color: "text-warning", bg: "bg-warning/10" },
  MEDIUM: { label: "Medium", color: "text-primary", bg: "bg-primary/10" },
  LOW: { label: "Low", color: "text-muted-foreground", bg: "bg-muted" },
};

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  ENGINEERING_CHANGE: { label: "Engineering Change", icon: Wrench, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  TOOLING: { label: "Tooling", icon: Settings, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  PROCESS_IMPROVEMENT: { label: "Process Improvement", icon: Lightbulb, color: "text-success", bg: "bg-success/10", border: "border-success/20" },
  EQUIPMENT_MODIFICATION: { label: "Equipment Modification", icon: Cog, color: "text-accent-foreground", bg: "bg-accent/10", border: "border-accent/20" },
};

function KpiCell({ label, value, muted, dotClass, icon }: { label: string; value: ReactNode; muted?: boolean; dotClass?: string; icon?: ReactNode }) {
  return (
    <div className="px-3 py-2 text-left min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground truncate flex items-center gap-1.5">
        {icon ? icon : dotClass ? <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} /> : null}
        {label}
      </p>
      <p className={`text-lg font-bold ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColor = color || "bg-primary/60";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-foreground">{label}</span>
        <span className="text-[11px] font-semibold text-foreground">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted/80 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const meta = STATUS_META[status];
  return <span className={`inline-block h-2 w-2 rounded-full ${meta?.color || "bg-muted-foreground/40"}`} />;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string | null): string {
  if (!d) return "\u2014";
  return formatDateShort(d) || "";
}

function MERDashboardContent({ summary, summaryLoading, merList, onNew }: {
  summary: any; summaryLoading: boolean; merList: any[]; onNew: () => void;
}) {

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
                <div key={i} className="border border-border bg-muted p-3 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-3 w-16 bg-muted/80" />
                    <div className="h-5 w-10 bg-muted/80" />
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
                className="inline-flex h-8 items-center gap-1.5 bg-warning px-3 text-sm font-semibold text-white hover:bg-warning/80 transition-colors">
                New MER
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border bg-muted">
              <div className="px-3 h-8 flex items-center border-b border-border">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Key Metrics</span>
              </div>
              <div className="grid grid-cols-8 divide-x divide-border">
                <KpiCell label="Submitted" value={summary.submitted} dotClass={STATUS_DOT.SUBMITTED} />
                <KpiCell label="Under Review" value={summary.underReview} dotClass={STATUS_DOT.UNDER_REVIEW} />
                <KpiCell label="Approved" value={summary.approved} dotClass={STATUS_DOT.APPROVED} />
                <KpiCell label="In Progress" value={summary.inProgress} dotClass={STATUS_DOT.IN_PROGRESS} />
                <KpiCell label="Completed" value={summary.completed} dotClass={STATUS_DOT.COMPLETED} />
                <KpiCell label="Rejected" value={summary.rejected} muted={summary.rejected === 0} dotClass={STATUS_DOT.REJECTED} />
                <KpiCell label="Cancelled" value={summary.cancelled} muted={summary.cancelled === 0} dotClass={STATUS_DOT.CANCELLED} />
                <KpiCell label="Overdue" value={summary.overdue} muted={summary.overdue === 0} icon={<AlertTriangle className="h-3.5 w-3.5 text-warning stroke-current shrink-0" />} />
              </div>
            </div>

              <div className="border-b border-border">
                <div className="h-8 border-b border-border px-3 flex items-center">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Breakdown by Type</span>
                </div>
                <div className="px-3 py-2 space-y-2">
                  {summary.byType.map((t: { requestType: string; count: number }) => {
                    const meta = TYPE_META[t.requestType];
                    const barColors: Record<string, string> = {
                      ENGINEERING_CHANGE: "bg-primary/100", TOOLING: "bg-warning/100",
                      PROCESS_IMPROVEMENT: "bg-success/100", EQUIPMENT_MODIFICATION: "bg-accent",
                    };
                    return (
                      <div key={t.requestType} className="flex items-center gap-2">
                        {meta && <meta.icon className={`h-3.5 w-3.5 shrink-0 ${meta.color} stroke-current`} />}
                        <div className="flex-1">
                          <BarRow label={meta?.label || t.requestType} count={t.count} total={summary.total}
                            color={barColors[t.requestType] || "bg-primary"} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            <div className="border-t border-border">
              <div className="flex divide-x divide-border">
                <div className="w-[40%] min-w-0">
                  <div className="h-8 border-b border-border px-3 flex items-center">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Due This Week</span>
                  </div>
                  <div className="px-3 py-2">
                    {upcomingDeadlines.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">No upcoming deadlines</p>
                    ) : (
                      <div className="space-y-1">
                        {upcomingDeadlines.map((m) => {
                          const days = daysUntil(m.dueDate);
                          return (
                            <div key={m.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                              <Clock3 className="h-3 w-3 shrink-0 text-warning stroke-current" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-foreground truncate">{m.title}</div>
                                <div className="text-xs text-warning">
                                  {days !== null ? (days === 0 ? "Due today" : `${days}d remaining`) : "Upcoming"}
                                </div>
                              </div>
                              <StatusDot status={m.status} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-8 border-b border-border px-3 flex items-center">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Recent Activity</span>
                  </div>
                  <div className="px-3 py-2">
                    {recentMERs.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">No recent activity</p>
                    ) : (
                      <div className="space-y-1">
                        {recentMERs.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <StatusDot status={m.status} />
                                <div className="text-xs font-semibold text-foreground truncate">{m.title}</div>
                              </div>
                              <div className="text-xs text-muted-foreground ml-4">
                                {m.merCode || `MER-${m.id}`} {"\u00B7"} {formatDate(m.createdAt)}
                              </div>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_META[m.priority]?.color || "text-muted-foreground"}`}>
                              {PRIORITY_META[m.priority]?.label || m.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
  const [filterAssignee, setFilterAssignee] = useState("");
  const [autoPageSize, setAutoPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "", description: "", requestType: "ENGINEERING_CHANGE", category: "", priority: "MEDIUM",
    targetType: "Plant", targetId: "", owner: "", assignedTo: "", reviewer: "",
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

  const listContainerRef = useRef<HTMLDivElement>(null);
  const paginatedMersRef = useRef<MERNode[]>([]);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  /* ── Selection transition skeleton ── */
  const [showSkeleton, setShowSkeleton] = useState(false);
  const prevSelIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevSelIdRef.current !== selectedId && selectedId !== null) {
      setShowSkeleton(true);
      const t = setTimeout(() => setShowSkeleton(false), 300);
      prevSelIdRef.current = selectedId;
      return () => clearTimeout(t);
    }
    prevSelIdRef.current = selectedId;
  }, [selectedId]);

  /* ── Auto-page-size derived from RecordListPanel's body height ── */
  const handlePageSizeChange = useCallback((size: number) => {
    setAutoPageSize(Math.max(3, size));
  }, []);

  const effectivePageSize = autoPageSize;

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
  const filteredMers = filterAssignee
    ? mers.filter((m) => m.assignedTo === filterAssignee)
    : mers;
  const pageCount = Math.max(1, Math.ceil(filteredMers.length / effectivePageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedMers = filteredMers.slice((safePage - 1) * effectivePageSize, safePage * effectivePageSize);
  paginatedMersRef.current = paginatedMers;

  /* ── Keyboard navigation for list ── */
  const scrollItemIntoView = useCallback((id: number) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-mer-id="${id}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 0);
  }, []);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (mode !== "view") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const items = paginatedMersRef.current;
      if (items.length === 0) return;
      const currentIdx = selectedIdRef.current
        ? items.findIndex((m) => m.id === selectedIdRef.current)
        : -1;
      if (e.key === "ArrowDown") {
        const nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
        const nextId = items[nextIdx].id;
        setSelectedId(nextId);
        scrollItemIntoView(nextId);
      } else {
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        const prevId = items[prevIdx].id;
        setSelectedId(prevId);
        scrollItemIntoView(prevId);
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [mode, scrollItemIntoView]);

  useEffect(() => { setPage(1); }, [filterStatus, filterType, filterAssignee, search]);

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

  const { targetOptions } = useTargetEntities(form.targetType);

  const g = (k: keyof FormState) => String(form[k] ?? "");
  const sf = (k: keyof FormState, v: unknown) => { setIsDirty(true); setForm((p) => ({ ...p, [k]: v })); };

  const clearForm = useCallback(() => {
    setForm({
      title: "", description: "", requestType: "ENGINEERING_CHANGE", category: "", priority: "MEDIUM",
      targetType: "Plant", targetId: "", owner: "", assignedTo: "", reviewer: "",
      impactCost: "", impactQuality: "", impactDelivery: "", impactSafety: "",
      estimatedCost: "", startDate: "", dueDate: "",
    });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const loadForm = useCallback((item: MERNode) => {
    setForm({
      title: item.title, description: item.description, requestType: item.requestType,
      category: item.category, priority: item.priority, targetType: item.targetType || "Plant",
      targetId: String(item.targetId ?? ""), owner: item.owner || item.submittedBy,
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
          owner: form.owner, assignedTo: form.assignedTo, reviewer: form.reviewer,
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
          submittedBy: form.owner, owner: form.owner, assignedTo: form.assignedTo, reviewer: form.reviewer,
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

  const iCls = `h-7 w-full bg-card border border-border text-foreground placeholder:text-muted-foreground px-2 text-sm outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
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
      <div className="grid h-full min-h-0 grid-cols-[25%_75%] gap-6 px-5 py-3 min-w-0">
        <div className="min-w-0 overflow-y-auto space-y-3">
          <SectionCard title="Request Type">
            <select value={g("requestType")} onChange={(e) => sf("requestType", e.target.value)} className={sCls}>
              {REQUEST_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </SectionCard>
          <SectionCard title="Status">
            <div className="text-sm text-foreground font-medium">{mode === "create" ? "New" : sel?.status ? statusLabel(sel.status) : ""}</div>
          </SectionCard>
          <SectionCard title="Priority">
            <select value={g("priority")} onChange={(e) => sf("priority", e.target.value)} className={sCls}>
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </SectionCard>
          <SectionCard title="Target">
            <div className="space-y-1.5">
              <select value={g("targetType")} onChange={(e) => { sf("targetType", e.target.value); sf("targetId", ""); }} className={sCls}>
                {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={g("targetId")} onChange={(e) => sf("targetId", e.target.value)} className={sCls}>
                <option value="">Select {targetTypeLabel(form.targetType)}...</option>
                {targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.targetId && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.targetId}</p>}
            </div>
          </SectionCard>
          <SectionCard title="Owner">
            <input type="text" value={g("owner")} onChange={(e) => sf("owner", e.target.value)} placeholder="Accountable owner" className={iCls} />
          </SectionCard>
          <SectionCard title="Assigned Engineer">
            <input type="text" value={g("assignedTo")} onChange={(e) => sf("assignedTo", e.target.value)} placeholder="Engineer assigned to execute" className={iCls} />
          </SectionCard>
          <SectionCard title="Reviewer">
            <input type="text" value={g("reviewer")} onChange={(e) => sf("reviewer", e.target.value)} placeholder="Person responsible for review" className={iCls} />
          </SectionCard>
          <SectionCard title="Due Date">
            <input type="date" value={g("dueDate")} onChange={(e) => sf("dueDate", e.target.value)} className={iCls} />
          </SectionCard>
          <SectionCard title="Est. Cost ($)">
            <input type="number" step="0.01" value={g("estimatedCost")} onChange={(e) => sf("estimatedCost", e.target.value)} placeholder="0.00" className={iCls} />
          </SectionCard>
        </div>
        <div className="min-w-0 min-h-0 h-full flex flex-col overflow-hidden mr-6 pb-6">
          <SectionCard title="Title">
            <input type="text" value={g("title")} onChange={(e) => sf("title", e.target.value)} placeholder="MER title *" className={`${iCls} w-full min-w-0`} />
            {errors.title && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.title}</p>}
          </SectionCard>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden mt-3">
            <SectionCard title="Description" />
            <div className="flex-1 min-h-0 overflow-hidden border border-border">
              <div className="h-full overflow-y-auto"><RichTextEditor content={g("description")} onChange={(html) => sf("description", html)}
                placeholder="Describe the engineering request, problem, and expected outcome..." /></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <SectionCard title="Justification">
              <textarea value={g("impactCost")} onChange={(e) => sf("impactCost", e.target.value)} rows={3}
                placeholder="Why is this request needed?" className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
            </SectionCard>
            <SectionCard title="Expected Outcome">
              <textarea value={g("impactQuality")} onChange={(e) => sf("impactQuality", e.target.value)} rows={3}
                placeholder="What will change?" className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
            </SectionCard>
          </div>
          <div className="mt-3">
            <SectionCard title="Notes">
              <textarea value={g("impactDelivery")} onChange={(e) => sf("impactDelivery", e.target.value)} rows={2}
                placeholder="Additional notes..." className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
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
    if (showSkeleton && mode === "view") return <MERDetailSkeleton />;
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {mutationError && isForm && <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>}
        {isForm ? renderForm() : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 border-b border-border-major px-5 py-3 flex items-center gap-3">
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
                  <button type="button" onClick={hReview} className="inline-flex h-7 items-center gap-1 border border-primary/20 dark:border-blue-800 px-2 text-[10px] font-semibold text-primary dark:text-blue-400 hover:bg-primary/10 dark:hover:bg-blue-900/20 transition-all whitespace-nowrap">
                    <RotateCcw className="h-2.5 w-2.5 stroke-current" />Review
                  </button>
                )}
                {(sel.status === "SUBMITTED" || sel.status === "UNDER_REVIEW") && (
                  <button type="button" onClick={() => { setReviewNotes(""); setConfirmAction({ id: sel.id, action: "approve" }); }} className="inline-flex h-7 items-center gap-1 border border-success/20 dark:border-green-800 px-2 text-[10px] font-semibold text-success dark:text-success/80 hover:bg-success/10 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <Check className="h-2.5 w-2.5 stroke-current" />Approve
                  </button>
                )}
                {(sel.status === "SUBMITTED" || sel.status === "UNDER_REVIEW") && (
                  <button type="button" onClick={() => { setRejectReason(""); setConfirmAction({ id: sel.id, action: "reject" }); }} className="inline-flex h-7 items-center gap-1 border border-danger/20 dark:border-red-800 px-2 text-[10px] font-semibold text-danger dark:text-danger/80 hover:bg-danger/10 dark:hover:bg-red-900/20 transition-all whitespace-nowrap">
                    <Ban className="h-2.5 w-2.5 stroke-current" />Reject
                  </button>
                )}
                {sel.status === "APPROVED" && (
                  <button type="button" onClick={hStart} className="inline-flex h-7 items-center gap-1 border border-success/20 dark:border-green-800 px-2 text-[10px] font-semibold text-success dark:text-success/80 hover:bg-success/10 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <Play className="h-2.5 w-2.5 stroke-current" />Start
                  </button>
                )}
                {sel.status === "IN_PROGRESS" && (
                  <button type="button" onClick={() => { setResultSummary(""); setConfirmAction({ id: sel.id, action: "complete" }); }} className="inline-flex h-7 items-center gap-1 border border-success/20 dark:border-green-800 px-2 text-[10px] font-semibold text-success dark:text-success/80 hover:bg-success/10 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <CheckCircle className="h-2.5 w-2.5 stroke-current" />Complete
                  </button>
                )}
                {(sel.status === "APPROVED" || sel.status === "COMPLETED") && (
                  <button type="button" onClick={hConvert} className="inline-flex h-7 items-center gap-1 border border-accent/20 dark:border-purple-800 px-2 text-[10px] font-semibold text-accent-foreground dark:text-purple-400 hover:bg-accent/10 dark:hover:bg-purple-900/20 transition-all whitespace-nowrap">
                    <GitBranch className="h-2.5 w-2.5 stroke-current" />Kaizen
                  </button>
                )}
                {sel.status !== "COMPLETED" && sel.status !== "CANCELLED" && (
                  <button type="button" onClick={() => setConfirmAction({ id: sel.id, action: "cancel" })} className="inline-flex h-7 items-center gap-1 border border-danger/20 dark:border-red-800 px-2 text-[10px] font-semibold text-danger dark:text-danger/80 hover:bg-danger/10 dark:hover:bg-red-900/20 transition-all whitespace-nowrap">
                    <XCircle className="h-2.5 w-2.5 stroke-current" />Cancel
                  </button>
                )}
                <button type="button" onClick={() => window.print()} className="inline-flex h-7 items-center gap-1 border border-border/40 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-border/70 transition-all whitespace-nowrap">
                  <Printer className="h-2.5 w-2.5 stroke-current" />
                </button>
              </div>
            </div>
            {/* Workflow Progress Bar */}
            <div className="flex items-center border-b border-border-major bg-muted/20 px-3 py-1.5">
              {WORKFLOW_PHASES.map((phase, idx) => {
                const isActive = sel.status === phase;
                const isPast = WORKFLOW_PHASES.indexOf(sel.status) >= idx && sel.status !== phase;
                return (
                  <div key={phase} className="flex items-center gap-0.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 transition-colors ${isActive ? (STATUS_STYLES[phase] || "") + " font-bold ring-1 ring-amber-300/50" : sel.status === "REJECTED" || sel.status === "CANCELLED" ? "text-muted-foreground" : isPast ? "bg-success/15 text-success dark:bg-green-900/30 dark:text-green-300" : "text-muted-foreground"}`}>
                      {isPast && sel.status !== "REJECTED" && sel.status !== "CANCELLED" ? "\u2713 " : ""}{statusLabel(phase)}
                    </span>
                    {idx < WORKFLOW_PHASES.length - 1 && <span className={`text-[10px] mx-0.5 ${WORKFLOW_PHASES.indexOf(sel.status) > idx ? "text-success/80" : "text-muted-foreground/30"}`}>{"\u2192"}</span>}
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
            {/* Content — Flat 2-column */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 mr-6">
              <div className="grid grid-cols-[3fr_2fr] gap-8">
                <div className="space-y-5">
                  <FlatSection title="Request Summary">
                    <div className="space-y-2">
                      <p className={`text-sm font-semibold ${theme.textPrimary}`}>{sel.title}</p>
                      {renderHtmlBlock(sel.description, "No description provided.")}
                    </div>
                  </FlatSection>
                  <FlatSection title="Engineering Details">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Type</span><span className="text-foreground font-medium">{requestTypeLabel(sel.requestType)}</span></div>
                      <ImpactRow label="Cost Impact" value={sel.impactCost} />
                      <ImpactRow label="Quality Impact" value={sel.impactQuality} />
                      <ImpactRow label="Delivery Impact" value={sel.impactDelivery} />
                      <ImpactRow label="Safety Impact" value={sel.impactSafety} />
                    </div>
                  </FlatSection>
                  {(sel.impactCost || sel.impactQuality) && (
                    <div className="grid grid-cols-2 gap-4">
                      {sel.impactCost && (
                        <FlatSection title="Justification">
                          <p className="text-sm text-foreground">{sel.impactCost}</p>
                        </FlatSection>
                      )}
                      {sel.impactQuality && (
                        <FlatSection title="Expected Outcome">
                          <p className="text-sm text-foreground">{sel.impactQuality}</p>
                        </FlatSection>
                      )}
                    </div>
                  )}
                  <FlatSection title="Notes / Activity">
                    <div className="space-y-3 text-sm">
                      {(sel.reviewNotes || sel.rejectionReason) && (
                        <div className={sel.status === "REJECTED" ? "border-l-2 border-red-400 pl-3 py-1" : "border-l-2 border-blue-400 pl-3 py-1"}>
                          <p className={`text-xs font-semibold ${theme.textMuted} mb-1`}>{sel.status === "REJECTED" ? "Rejection Reason" : "Review Notes"}</p>
                          {sel.status === "REJECTED" && sel.rejectionReason ? (
                            <div className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5 stroke-current" /><p className={`text-sm ${theme.textPrimary}`}>{sel.rejectionReason}</p></div>
                          ) : <p className={`text-sm ${theme.textPrimary}`}>{sel.reviewNotes}</p>}
                        </div>
                      )}
                      {sel.resultSummary && (
                        <div><p className={`text-xs font-semibold ${theme.textMuted} mb-1`}>Result Summary</p>{renderHtmlBlock(sel.resultSummary)}</div>
                      )}
                      {sel.lessonsLearned && (
                        <div><p className={`text-xs font-semibold ${theme.textMuted} mb-1`}>Lessons Learned</p>{renderHtmlBlock(sel.lessonsLearned)}</div>
                      )}
                      {sel.linkedKaizenId && (
                        <div className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5 text-accent-foreground stroke-current" /><span className="text-sm text-accent-foreground font-medium">Kaizen #{sel.linkedKaizenId}</span></div>
                      )}
                    </div>
                  </FlatSection>
                </div>
                <div className="space-y-5">
                  <FlatSection title="Status & Actions">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
                      {sel.priority && <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority}</span>}
                    </div>
                  </FlatSection>
                  <FlatSection title="Target / Area">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Target</span><span className="text-foreground">{targetTypeLabel(sel.targetType)} {sel.targetId ? `#${sel.targetId}` : ""}</span></div>
                      <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Category</span><span className="text-foreground">{CATEGORY_OPTIONS.find((o) => o.value === sel.category)?.label || sel.category || "-"}</span></div>
                    </div>
                  </FlatSection>
                  <FlatSection title="Cost / Effort">
                    <div className="space-y-1.5 text-sm">
                      {sel.estimatedCost != null ? <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Est. Cost</span><span className="text-foreground font-semibold">${sel.estimatedCost.toLocaleString()}</span></div> : null}
                      {sel.actualCost != null ? <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Actual Cost</span><span className="text-foreground font-semibold">${sel.actualCost.toLocaleString()}</span></div> : null}
                      {sel.estimatedCost == null && sel.actualCost == null ? <p className={`text-xs italic ${theme.textMuted}`}>No cost data</p> : null}
                    </div>
                  </FlatSection>
                  <FlatSection title="People / Dates">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Owner</span><span className="text-foreground">{sel.owner || sel.submittedBy || "-"}</span></div>
                      <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Assigned Engineer</span><span className="text-foreground">{sel.assignedTo || "-"}</span></div>
                      {sel.reviewer ? <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Reviewer</span><span className="text-foreground">{sel.reviewer}</span></div> : null}
                      {sel.startDate ? <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Start</span><span className="text-foreground">{sel.startDate}</span></div> : null}
                      {sel.dueDate ? (
                        <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Due</span>
                          <span className={`text-foreground ${isOverdue(sel.dueDate) && sel.status !== "COMPLETED" ? "text-danger font-semibold" : ""}`}>
                            {isOverdue(sel.dueDate) && sel.status !== "COMPLETED" ? <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5 stroke-current" /> : null}
                            {sel.dueDate}
                          </span>
                        </div>
                      ) : null}
                      {sel.completedDate ? <div className="flex items-center gap-2"><span className="text-muted-foreground w-28 shrink-0">Completed</span><span className="text-success">{sel.completedDate}</span></div> : null}
                    </div>
                  </FlatSection>
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
        {successMsg && <div className={`shrink-0 h-8 flex items-center justify-center ${theme.toastSuccess} text-sm font-semibold border-b border-border-major print-ignore`}>{successMsg}</div>}
        <div className="print-ignore">
          <PageHeader icon={<Wrench className="h-5 w-5 stroke-current" />}
            iconClass="bg-primary/10 text-primary"
            title="MER"
            subtitle="Manufacturing Engineering Requests — submit, track, and manage." />
        </div>
        <div className="print-ignore">
          <PageToolbar
            leftWidthClass={LEFT_COLUMN_WIDTH_CLASS}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search MERs..."
            filters={<>
              <ToolbarDropdown value={filterStatus} onChange={setFilterStatus}
                options={[{ value: "", label: "All Statuses" }, ...Object.keys(STATUS_STYLES).map((s) => ({ value: s, label: statusLabel(s) }))]}
                className="w-36" />
              <ToolbarDropdown value={filterType} onChange={setFilterType}
                options={[{ value: "", label: "All Types" }, ...REQUEST_TYPE_OPTIONS]}
                className="w-36" />
              <ToolbarDropdown value={filterAssignee} onChange={setFilterAssignee}
                options={[
                  { value: "", label: "All Engineers" },
                  ...Array.from(new Set(mers.map((m) => m.assignedTo).filter(Boolean))).map((a) => ({ value: a, label: a })),
                ]}
                className="w-36" />
            </>}
            actions={<>
              {isForm ? (
                <div className="flex items-center gap-1.5"><ToolbarButton icon={Check} label="Save" onClick={hSave} variant="edit" /><ToolbarButton icon={X} label="Cancel" onClick={hCancel} variant="danger" /></div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <ToolbarButton icon={Plus} label="New" onClick={hNew} variant="create" />
                  <ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel || sel.status === "COMPLETED" || sel.status === "CANCELLED"} variant="edit" />
                  <ToolbarSeparator />
                  <ToolbarButton icon={Trash2} label="Delete" onClick={() => sel && setConfirmDelete(sel.id)} disabled={!sel} variant="danger" />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} variant="neutral" />
                </div>
              )}
            </>} />
        </div>
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left Panel: List ── */}
          <div className="print-ignore" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            {loading && mers.length === 0 ? (
              <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted border-r border-border">
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...
                </div>
              </div>
            ) : (
              <RecordListPanel title="Requests" count={filteredMers.length}
                autoPageSize={true}
                rowHeight={56}
                onPageSizeChange={handlePageSizeChange}
                pagination={filteredMers.length > 0 ? {
                  start: (safePage - 1) * effectivePageSize + 1,
                  end: Math.min(safePage * effectivePageSize, filteredMers.length),
                  total: filteredMers.length,
                  page: safePage,
                  totalPages: pageCount,
                  onPageChange: (p: number) => setPage(p),
                } : undefined}
                emptyState={
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <p className="text-xs font-medium text-muted-foreground">{filterAssignee ? "No requests match filter" : "No engineering requests"}</p>
                    <button type="button" onClick={hNew}
                      className="mt-2 inline-flex h-7 items-center gap-1 bg-warning/10 px-3 text-xs font-semibold text-warning hover:bg-warning/20 transition-colors">
                      <Plus className="h-3 w-3 stroke-current" /> Create MER</button>
                  </div>
                }
              >
                <div ref={listContainerRef} tabIndex={0} className="outline-none">
                  {paginatedMers.map((m) => (
                    <RecordListItem
                      key={m.id}
                      active={m.id === selectedId}
                      onClick={() => {
                        if (isForm && isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; }
                        setSelectedId(m.id);
                        if (mode === "create") { clearForm(); }
                        if (isForm) { setIsDirty(false); setMode("view"); }
                      }}
                      title={
                        <span className="flex items-center gap-1.5">
                          {m.priority && m.priority !== "MEDIUM" && (
                            <span className={`shrink-0 inline-block h-2 w-2 rounded-full ${m.priority === "CRITICAL" ? "bg-danger/100" : m.priority === "HIGH" ? "bg-warning/100" : "bg-muted-foreground/40"}`} />
                          )}
                          <span className="truncate" title={m.title}>{m.title}</span>
                        </span>
                      }
                      subtitle={
                        <>
                          <span>{requestTypeLabel(m.requestType)}</span>
                          <span>{m.owner || m.submittedBy || "-"}</span>
                        </>
                      }
                      trailing={
                        <span className={`inline-block h-2.5 w-2.5 ${STATUS_DOT[m.status] || "bg-muted-foreground/40"}`} title={statusLabel(m.status)} />
                      }
                    />
                  ))}
                </div>
              </RecordListPanel>
            )}
          </div>
          <div onMouseDown={handleSplitMouseDown}
            className="print-ignore flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-warning/100/10"
            style={{ width: 2 }} />
          <div className={`print-area flex flex-col min-h-0 min-w-0 ${isForm ? "" : "mode-enter"}`} style={{ flex: 1 }}>{renderDetail()}</div>
        </div>
        <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-3">
            {Object.entries(STATUS_DOT).map(([status, dotClass]) => (
              <span key={status} className="flex items-center gap-1">
                <span className={`inline-block h-2 w-2 ${dotClass}`} />
                {statusLabel(status)}
              </span>
            ))}
          </div>
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
