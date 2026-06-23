import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  CircleAlert, Plus, Pencil, RefreshCw, X, Check, Eye,
  ShieldAlert, Ban, ClipboardX,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarDropdown, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { PROBLEMS_QUERY } from "@/graphql/checkQueries";
import {
  CREATE_PROBLEM_MUTATION,
  UPDATE_PROBLEM_MUTATION,
  REVIEW_PROBLEM_MUTATION,
  CONTAIN_PROBLEM_MUTATION,
  CLOSE_PROBLEM_MUTATION,
  CANCEL_PROBLEM_MUTATION,
} from "@/graphql/checkMutations";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  CONTAINED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  CLOSED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PROBLEM_TYPE_STYLES: Record<string, string> = {
  PRODUCTION: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  QUALITY: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  SAFETY: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  MATERIAL: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  GENERAL: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
};

const PROBLEM_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "PRODUCTION", label: "Production" },
  { value: "QUALITY", label: "Quality" },
  { value: "SAFETY", label: "Safety" },
  { value: "MATERIAL", label: "Material" },
  { value: "GENERAL", label: "General" },
];

const PROBLEM_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "CONTAINED", label: "Contained" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const TARGET_TYPE_OPTIONS = [
  { value: "PLANT", label: "Plant" },
  { value: "PRODUCTION_LINE", label: "Production Line" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "RESOURCE_GROUP", label: "Resource Group" },
  { value: "RESOURCE", label: "Resource" },
];

const VIEW_PHASES = ["OPEN", "IN_REVIEW", "CONTAINED", "CLOSED"];

interface ProblemNode {
  id: number; title: string; description: string; problemType: string;
  targetType: string; targetId: number | null; severity: string; status: string;
  reportedBy: string; reportedAt: string; sourceType: string; sourceId: number | null;
  notes: string; createdAt: string; updatedAt: string;
}

interface FormState {
  title: string; description: string; problemType: string;
  targetType: string; targetId: string; severity: string;
  reportedBy: string; sourceType: string; sourceId: string; notes: string;
}

function statusLabel(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

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

export function ProblemsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProblemType, setFilterProblemType] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "", description: "", problemType: "GENERAL",
    targetType: "PLANT", targetId: "", severity: "MEDIUM",
    reportedBy: "", sourceType: "", sourceId: "", notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);

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

  const { data, loading, refetch } = useQuery<{ problems: ProblemNode[] }>(PROBLEMS_QUERY, {
    variables: { status: filterStatus || undefined, problemType: filterProblemType || undefined, search: search || undefined },
    fetchPolicy: "cache-and-network",
  });
  const problems: ProblemNode[] = data?.problems || [];

  const sel = selectedId ? problems.find((p) => p.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  useEffect(() => {
    if (problems.length === 0) return;
    if (selectedId && problems.some((p) => p.id === selectedId)) return;
    if (!initialLoad) return;
    setInitialLoad(false);
    setSelectedId(problems[0].id);
  }, [problems, selectedId, initialLoad]);

  const g = (k: keyof FormState) => String(form[k] ?? "");
  const sf = (k: keyof FormState, v: unknown) => { setIsDirty(true); setForm((p) => ({ ...p, [k]: v })); };

  const clearForm = useCallback(() => {
    setForm({ title: "", description: "", problemType: "GENERAL", targetType: "PLANT", targetId: "", severity: "MEDIUM", reportedBy: "", sourceType: "", sourceId: "", notes: "" });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const loadForm = useCallback((item: ProblemNode) => {
    setForm({
      title: item.title, description: item.description, problemType: item.problemType || "GENERAL",
      targetType: item.targetType || "PLANT", targetId: String(item.targetId ?? ""),
      severity: item.severity || "MEDIUM", reportedBy: item.reportedBy,
      sourceType: item.sourceType || "", sourceId: String(item.sourceId ?? ""), notes: item.notes,
    });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => {
    if (isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; }
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
  }, [sel, loadForm, clearForm, isDirty, mode]);

  const [createProblem] = useMutation(CREATE_PROBLEM_MUTATION);
  const [updateProblem] = useMutation(UPDATE_PROBLEM_MUTATION);
  const [reviewProblem] = useMutation(REVIEW_PROBLEM_MUTATION);
  const [containProblem] = useMutation(CONTAIN_PROBLEM_MUTATION);
  const [closeProblem] = useMutation(CLOSE_PROBLEM_MUTATION);
  const [cancelProblem] = useMutation(CANCEL_PROBLEM_MUTATION);

  const hSave = useCallback(async () => {
    setMutationError(null);
    const errs: Record<string, string> = {};
    if (!form.title?.trim()) errs.title = "Required";
    if (!form.targetId?.trim()) errs.targetId = "Required";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    try {
      if (mode === "edit" && sel) {
        const vars: Record<string, unknown> = { id: sel.id };
        if (form.title !== sel.title) vars.title = form.title.trim();
        if (form.description !== (sel.description || "")) vars.description = form.description;
        if (form.severity !== sel.severity) vars.severity = form.severity;
        if (form.notes !== (sel.notes || "")) vars.notes = form.notes;
        const r = await updateProblem({ variables: vars });
        if (r.error) { setMutationError(r.error.message || "Save failed"); return; }
        setSuccessMsg("Problem updated"); setIsDirty(false); refetch(); setMode("view");
      } else {
        const r = await createProblem({ variables: {
          title: form.title.trim(), description: form.description,
          problemType: form.problemType, targetType: form.targetType,
          targetId: form.targetId ? parseInt(form.targetId) : null,
          severity: form.severity, reportedBy: form.reportedBy,
          sourceType: form.sourceType || null,
          sourceId: form.sourceId ? parseInt(form.sourceId) : null,
          notes: form.notes,
        } });
        if (r.error) { setMutationError(r.error.message || "Create failed"); return; }
        setSuccessMsg("Problem created"); setIsDirty(false); refetch(); setMode("view");
      }
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : "Save failed"); }
  }, [form, mode, sel, createProblem, updateProblem, refetch]);

  const hReview = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await reviewProblem({ variables: { id: sel.id } });
    if (r.error) { setMutationError(r.error.message || "Review failed"); return; }
    setSuccessMsg("Problem moved to In Review"); refetch();
  }, [sel, reviewProblem, refetch]);

  const hContain = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await containProblem({ variables: { id: confirmAction.id } });
    if (r.error) { setMutationError(r.error.message || "Contain failed"); setConfirmAction(null); return; }
    setSuccessMsg("Problem contained"); setConfirmAction(null); refetch();
  }, [confirmAction, containProblem, refetch]);

  const hClose = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await closeProblem({ variables: { id: confirmAction.id } });
    if (r.error) { setMutationError(r.error.message || "Close failed"); setConfirmAction(null); return; }
    setSuccessMsg("Problem closed"); setConfirmAction(null); refetch();
  }, [confirmAction, closeProblem, refetch]);

  const hCancelProblem = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await cancelProblem({ variables: { id: confirmAction.id } });
    if (r.error) { setMutationError(r.error.message || "Cancel failed"); setConfirmAction(null); return; }
    setSuccessMsg("Problem cancelled"); setConfirmAction(null); refetch();
  }, [confirmAction, cancelProblem, refetch]);

  const iCls = `h-7 w-full bg-card border border-gray-300 text-foreground placeholder:text-muted-foreground px-2 text-sm outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
  const sCls = iCls;

  const renderHtmlBlock = (content: string, fallback = "Not defined") => (
    content ? (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm leading-snug"
        dangerouslySetInnerHTML={{ __html: content }} />
    ) : <p className={`text-xs italic ${theme.textMuted}`}>{fallback}</p>
  );

  const renderForm = () => (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[20%_80%] gap-6 px-5 py-3 min-w-0">
        <div className="min-w-0 overflow-y-auto space-y-3">
          <SectionCard title="Classification">
            <div className="space-y-1.5">
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Problem Type</p>
                <select value={g("problemType")} onChange={(e) => sf("problemType", e.target.value)} className={sCls}>
                  {PROBLEM_TYPE_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Severity</p>
                <select value={g("severity")} onChange={(e) => sf("severity", e.target.value)} className={sCls}>
                  {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
            </div>
          </SectionCard>
          <SectionCard title="Target">
            <div className="space-y-1.5">
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Type</p>
                <select value={g("targetType")} onChange={(e) => { sf("targetType", e.target.value); sf("targetId", ""); }} className={sCls}>
                  {TARGET_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Target ID</p>
                <input type="number" value={g("targetId")} onChange={(e) => sf("targetId", e.target.value)} placeholder="Enter ID..." className={iCls} />
                {errors.targetId && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.targetId}</p>}
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Details">
            <div className="space-y-1.5">
              <input type="text" value={g("reportedBy")} onChange={(e) => sf("reportedBy", e.target.value)} placeholder="Reported by" className={iCls} />
              <input type="text" value={g("sourceType")} onChange={(e) => sf("sourceType", e.target.value)} placeholder="Source type" className={iCls} />
              <input type="number" value={g("sourceId")} onChange={(e) => sf("sourceId", e.target.value)} placeholder="Source ID" className={iCls} />
            </div>
          </SectionCard>
        </div>
        <div className="min-w-0 min-h-0 h-full flex flex-col overflow-hidden mr-6 pb-6">
          <SectionCard title="Title">
            <input type="text" value={g("title")} onChange={(e) => sf("title", e.target.value)} placeholder="Problem title *" className={`${iCls} w-full min-w-0`} />
            {errors.title && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.title}</p>}
          </SectionCard>
          <div className="flex-1 min-h-0 overflow-y-auto mt-2 space-y-3">
            <SectionCard title="Description">
              <RichTextEditor content={g("description")} onChange={(html) => sf("description", html)}
                placeholder="Describe the problem..." />
            </SectionCard>
            <SectionCard title="Notes">
              <RichTextEditor content={g("notes")} onChange={(html) => sf("notes", html)}
                placeholder="Additional notes..." />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (mode === "create" && !sel) return <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderForm()}</div>;
    if (!sel) return (
      <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
        <div className="text-center max-w-xs">
          <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1.5`}>No problem selected</h3>
          <p className={`text-xs ${theme.textSecondary} leading-relaxed mb-4`}>Select a problem or create a new one.</p>
          <button type="button" onClick={hNew}
            className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
            <Plus className="h-3.5 w-3.5 stroke-current" /> New Problem
          </button>
        </div>
      </div>
    );
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {mutationError && isForm && <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>}
        {isForm ? renderForm() : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-bold ${theme.textPrimary} truncate`}>{sel.title}</div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PROBLEM_TYPE_STYLES[sel.problemType] || ""}`}>{sel.problemType}</span>
                  {sel.severity && sel.severity !== "MEDIUM" && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${SEVERITY_STYLES[sel.severity] || ""}`}>{sel.severity}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {sel.reportedBy && <span className={`text-xs ${theme.textMuted}`}>Reported by: {sel.reportedBy}</span>}
                  {sel.targetType && <span className={`text-xs ${theme.textMuted}`}>Target: {sel.targetType} #{sel.targetId}</span>}
                  {sel.reportedAt && <span className={`text-xs ${theme.textMuted}`}>Reported: {sel.reportedAt?.slice(0, 10)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {sel.status === "OPEN" && (
                  <button type="button" onClick={hReview} className="inline-flex h-7 items-center gap-1 border border-blue-200 dark:border-blue-800 px-2 text-[10px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all whitespace-nowrap">
                    <Eye className="h-2.5 w-2.5 stroke-current" />Review
                  </button>
                )}
                {sel.status === "IN_REVIEW" && (
                  <button type="button" onClick={() => setConfirmAction({ id: sel.id, action: "contain" })} className="inline-flex h-7 items-center gap-1 border border-indigo-200 dark:border-indigo-800 px-2 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all whitespace-nowrap">
                    <ShieldAlert className="h-2.5 w-2.5 stroke-current" />Contain
                  </button>
                )}
                {sel.status !== "CLOSED" && sel.status !== "CANCELLED" && sel.status !== "OPEN" && (
                  <button type="button" onClick={() => setConfirmAction({ id: sel.id, action: "close" })} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <ClipboardX className="h-2.5 w-2.5 stroke-current" />Close
                  </button>
                )}
                {sel.status !== "CLOSED" && sel.status !== "CANCELLED" && (
                  <button type="button" onClick={() => setConfirmAction({ id: sel.id, action: "cancel" })} className="inline-flex h-7 items-center gap-1 border border-red-200 dark:border-red-800 px-2 text-[10px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap">
                    <Ban className="h-2.5 w-2.5 stroke-current" />Cancel
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center border-b border-slate-200 bg-muted/20 px-3 py-1.5">
              {VIEW_PHASES.map((phase, idx) => {
                const isActive = sel.status === phase;
                const isPast = VIEW_PHASES.indexOf(sel.status) >= idx && sel.status !== phase;
                return (
                  <div key={phase} className="flex items-center gap-0.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 transition-colors ${isActive ? (STATUS_STYLES[phase] || "") + " font-bold ring-1 ring-amber-300/50" : sel.status === "CANCELLED" ? "text-muted-foreground" : isPast ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "text-muted-foreground"}`}>
                      {isPast && sel.status !== "CANCELLED" ? "\u2713 " : ""}{statusLabel(phase)}
                    </span>
                    {idx < VIEW_PHASES.length - 1 && <span className={`text-[10px] mx-0.5 ${VIEW_PHASES.indexOf(sel.status) > idx ? "text-green-400" : "text-muted-foreground/30"}`}>{"\u2192"}</span>}
                  </div>
                );
              })}
              {(sel.status === "CANCELLED") && (
                <><span className="text-[10px] mx-0.5 text-muted-foreground/30">{"\u2192"}</span><span className={`text-[10px] px-2 py-0.5 font-semibold ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span></>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 mr-6">
              <div className="grid grid-cols-2 gap-6 auto-rows-min">
                <div className="space-y-4">
                  <SectionCard title="Description">
                    <p className={`text-sm font-semibold ${theme.textPrimary} mb-2`}>{sel.title}</p>
                    {renderHtmlBlock(sel.description, "No description provided.")}
                  </SectionCard>
                </div>
                <div className="space-y-4">
                  <SectionCard title="Details">
                    <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 text-xs">
                      <span className={theme.textMuted}>Problem Type</span><span className="font-medium">{sel.problemType}</span>
                      <span className={theme.textMuted}>Severity</span><span className="font-medium">{sel.severity}</span>
                      <span className={theme.textMuted}>Status</span><span className="font-medium">{statusLabel(sel.status)}</span>
                      <span className={theme.textMuted}>Target</span><span className="font-medium">{sel.targetType} #{sel.targetId}</span>
                      <span className={theme.textMuted}>Reported By</span><span className="font-medium">{sel.reportedBy || "-"}</span>
                      <span className={theme.textMuted}>Source</span><span className="font-medium">{sel.sourceType || "-"}{sel.sourceId ? ` #${sel.sourceId}` : ""}</span>
                    </div>
                  </SectionCard>
                  {sel.notes && (
                    <SectionCard title="Notes">{renderHtmlBlock(sel.notes)}</SectionCard>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        {successMsg && <div className={`shrink-0 h-8 flex items-center justify-center ${theme.toastSuccess} text-sm font-semibold border-b`}>{successMsg}</div>}
        <div>
          <PageHeader icon={<CircleAlert className="h-5 w-5 stroke-current" />}
            iconClass="bg-amber-500/10 text-amber-600"
            title="Problems" subtitle="Surface abnormalities, blockers, and deviations that require immediate production attention." />
        </div>
        <div>
          <Toolbar left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search problems..." />}
            center={<>
              <ToolbarDropdown value={filterProblemType} onChange={setFilterProblemType}
                options={PROBLEM_TYPE_OPTIONS} className="w-36" />
              <ToolbarDropdown value={filterStatus} onChange={setFilterStatus}
                options={PROBLEM_STATUS_OPTIONS} className="w-32" />
            </>}
            right={<div className="flex items-center gap-2 shrink-0">
                {isForm ? (
                  <><ToolbarButton icon={Check} label="Save" onClick={hSave} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={hCancel} /></>
                ) : (
                  <><ToolbarButton icon={Plus} label="New" onClick={hNew} /><ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel} />
                    <span className="h-5 w-px shrink-0 bg-border/25" />
                    <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>
                )}
              </div>}
          />
        </div>
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col min-h-0 overflow-hidden bg-muted border-r border-border-major" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 h-8 border-b border-slate-200 flex items-center px-4">
              <span className={`text-sm font-medium ${theme.textMuted}`}>Problems</span>
              <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{problems.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && problems.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
              ) : problems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No problems</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 dark:text-amber-400 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> Create problem</button>
                </div>
              ) : (
                <div>{problems.map((p) => (
                  <div key={p.id}
                    onClick={() => { if (isForm && isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; } setSelectedId(p.id); clearForm(); setIsDirty(false); setMode("view"); }}
                    className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedId === p.id ? "bg-table-selected border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                        <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{p.title}</span>
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[p.status] || ""}`}>{statusLabel(p.status)}</span>
                          {p.severity && p.severity !== "MEDIUM" && <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${SEVERITY_STYLES[p.severity] || ""}`}>{p.severity}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${PROBLEM_TYPE_STYLES[p.problemType] || ""}`}>{p.problemType}</span>
                        {p.reportedBy && <><span className={`text-[10px] ${theme.textMuted}`}>{"\u00B7"}</span><span className={`text-xs ${theme.textMuted}`}>{p.reportedBy}</span></>}
                      </div>
                    </div>
                  </div>
                ))}</div>
              )}
            </div>
            <div className="shrink-0 h-8 flex items-center border-t border-slate-200 bg-muted px-4">
              <span className={`text-xs ${theme.textMuted}`}>{problems.length} problem{problems.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div onMouseDown={handleSplitMouseDown} className="flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-amber-500/10" style={{ width: 2 }} />
          <div className={`flex flex-col min-h-0 min-w-0 ${isForm ? "" : "mode-enter"}`} style={{ flex: 1 }}>{renderDetail()}</div>
        </div>
        <div className="shrink-0 border-t border-border-major bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span>Problems</span><span className="flex-1" />
          {sel && <><span>Created: {sel.createdAt?.slice(0, 10) || "-"}</span><span>Updated: {sel.updatedAt?.slice(0, 10) || "-"}</span></>}
        </div>
      </div>
      <ConfirmDialog open={confirmAction !== null} onClose={() => setConfirmAction(null)}
        onConfirm={confirmAction?.action === "contain" ? hContain : confirmAction?.action === "close" ? hClose : hCancelProblem}
        title={`${confirmAction?.action === "cancel" ? "Cancel" : confirmAction?.action === "contain" ? "Contain" : "Close"} Problem`}
        message={`${confirmAction?.action === "cancel" ? "Cancel this problem?" : confirmAction?.action === "contain" ? "Mark this problem as contained?" : "Close this problem?"}`}
        confirmLabel={confirmAction?.action === "cancel" ? "Yes, Cancel" : confirmAction?.action === "contain" ? "Contain" : "Close"}
        danger={confirmAction?.action === "cancel"} />
    </>
  );
}
