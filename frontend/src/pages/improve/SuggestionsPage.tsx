import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Lightbulb, Plus, Pencil, RefreshCw, X, Check, Trash2, Printer,
  ThumbsUp, ThumbsDown, RotateCcw, MessageSquare, AlertTriangle,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { useTargetEntities, resolveTargetLabel } from "@/hooks/useTargetEntities";
import { SUGGESTIONS_QUERY } from "@/graphql/improvementQueries";
import {
  CREATE_SUGGESTION_MUTATION,
  UPDATE_SUGGESTION_MUTATION,
  REVIEW_SUGGESTION_MUTATION,
  ACCEPT_SUGGESTION_MUTATION,
  REJECT_SUGGESTION_MUTATION,
  CONVERT_SUGGESTION_TO_KAIZEN_MUTATION,
  DELETE_SUGGESTION_MUTATION,
} from "@/graphql/improvementMutations";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CONVERTED_TO_KAIZEN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
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
const TARGET_OPTIONS = [
  { value: "Plant", label: "Plant" }, { value: "ProductionLine", label: "Production Line" },
  { value: "Department", label: "Department" }, { value: "ResourceGroup", label: "Resource Group" },
  { value: "Resource", label: "Resource" },
];
const CATEGORY_OPTIONS = [
  { value: "", label: "Uncategorized" }, { value: "SAFETY", label: "Safety Improvement" },
  { value: "QUALITY", label: "Quality Improvement" }, { value: "COST", label: "Cost Reduction" },
  { value: "PRODUCTIVITY", label: "Productivity" }, { value: "5S", label: "5S / Workplace Organization" },
  { value: "STANDARD_WORK", label: "Standard Work" }, { value: "MATERIAL_FLOW", label: "Material Flow" },
  { value: "MAINTENANCE", label: "Equipment / Maintenance" }, { value: "TRAINING", label: "Skills / Training" },
  { value: "OTHER", label: "Other" },
];

interface SuggestionNode {
  id: number; title: string; description: string; submittedBy: string;
  targetType: string; targetId: number | null; category: string;
  priority: string; status: string; decision: string; comments: string;
  createdAt: string; updatedAt: string;
}
interface FormState {
  title: string; description: string; submittedBy: string;
  targetType: string; targetId: string; category: string; priority: string;
}

function statusLabel(s: string): string {
  if (s === "CONVERTED_TO_KAIZEN") return "Converted to Kaizen";
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
function targetTypeLabel(t: string): string {
  const m: Record<string, string> = { Plant: "Plant", ProductionLine: "Production Line", Department: "Department", ResourceGroup: "Resource Group", Resource: "Resource" };
  return m[t] || t;
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex min-h-6 items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-amber-500/60" />
          <div className="flex-1 text-sm font-bold uppercase tracking-[0.12em] text-amber-600/70 dark:text-amber-400/70">{title}</div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function SuggestionsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "", description: "", submittedBy: "", targetType: "Plant", targetId: "", category: "", priority: "MEDIUM",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [decisionText, setDecisionText] = useState("");
  const [confirmReject, setConfirmReject] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const { targetOptions, allEntities } = useTargetEntities(form.targetType);
  const targetLabel = resolveTargetLabel(allEntities, form.targetId);
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

  const { data, loading, refetch } = useQuery<{ suggestions: SuggestionNode[] }>(SUGGESTIONS_QUERY, {
    variables: { status: filterStatus || undefined, search: search || undefined },
    fetchPolicy: "cache-and-network",
  });
  const suggestions: SuggestionNode[] = data?.suggestions || [];

  const [createSuggestion] = useMutation(CREATE_SUGGESTION_MUTATION);
  const [updateSuggestion] = useMutation(UPDATE_SUGGESTION_MUTATION);
  const [reviewSuggestion] = useMutation(REVIEW_SUGGESTION_MUTATION);
  const [acceptSuggestion] = useMutation(ACCEPT_SUGGESTION_MUTATION);
  const [rejectSuggestion] = useMutation(REJECT_SUGGESTION_MUTATION);
  const [convertSuggestion] = useMutation(CONVERT_SUGGESTION_TO_KAIZEN_MUTATION);
  const [deleteSuggestion] = useMutation(DELETE_SUGGESTION_MUTATION);

  const sel = selectedId ? suggestions.find((s) => s.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  useEffect(() => {
    if (suggestions.length === 0) return;
    if (selectedId && suggestions.some((s) => s.id === selectedId)) return;
    if (!initialLoad) return;
    setInitialLoad(false);
    setSelectedId(suggestions[0].id);
  }, [suggestions, selectedId, initialLoad]);

  const g = (k: keyof FormState) => String(form[k] ?? "");
  const sf = (k: keyof FormState, v: unknown) => { setIsDirty(true); setForm((p) => ({ ...p, [k]: v })); };
  const clearForm = useCallback(() => {
    setForm({ title: "", description: "", submittedBy: "", targetType: "Plant", targetId: "", category: "", priority: "MEDIUM" });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);
  const loadForm = useCallback((item: SuggestionNode) => {
    setForm({ title: item.title, description: item.description, submittedBy: item.submittedBy,
      targetType: item.targetType || "Plant", targetId: String(item.targetId ?? ""),
      category: item.category || "", priority: item.priority || "MEDIUM" });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => {
    if (isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; }
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
  }, [sel, loadForm, clearForm, isDirty, mode]);

  const hAccept = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const res = await acceptSuggestion({ variables: { id: sel.id, decision: "" } });
    if (res.error) { setMutationError(res.error?.message || "Accept failed"); return; }
    setSuccessMsg("Suggestion accepted"); refetch();
  }, [sel, acceptSuggestion, refetch]);
  const hRejectConfirm = useCallback(async () => {
    if (!confirmReject) return; setMutationError(null);
    const res = await rejectSuggestion({ variables: { id: confirmReject, decision: decisionText } });
    if (res.error) { setMutationError(res.error?.message || "Reject failed"); setConfirmReject(null); return; }
    setSuccessMsg("Suggestion rejected"); setConfirmReject(null); setDecisionText(""); refetch();
  }, [confirmReject, decisionText, rejectSuggestion, refetch]);
  const hReview = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const res = await reviewSuggestion({ variables: { id: sel.id } });
    if (res.error) { setMutationError(res.error?.message || "Review failed"); return; }
    setSuccessMsg("Suggestion moved to Under Review"); refetch();
  }, [sel, reviewSuggestion, refetch]);
  const hConvert = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const res = await convertSuggestion({ variables: { id: sel.id } });
    if (res.error) { setMutationError(res.error?.message || "Convert failed"); return; }
    setSuccessMsg("Suggestion converted to Kaizen"); refetch();
  }, [sel, convertSuggestion, refetch]);
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
        if (form.description !== sel.description) vars.description = form.description;
        if (form.submittedBy !== sel.submittedBy) vars.submittedBy = form.submittedBy;
        if (form.category !== sel.category) vars.category = form.category;
        if (form.priority !== sel.priority) vars.priority = form.priority;
        const res = await updateSuggestion({ variables: vars });
        if (res.error) { setMutationError(res.error?.message || "Save failed"); return; }
        setSuccessMsg("Suggestion updated"); refetch(); setIsDirty(false); setMode("view");
      } else {
        const res = await createSuggestion({ variables: {
          title: form.title.trim(), description: form.description || "", submittedBy: form.submittedBy || "",
          targetType: form.targetType || "", targetId: form.targetId ? parseInt(form.targetId) : null,
          category: form.category || "", priority: form.priority || "MEDIUM",
        } });
        if (res.error) { setMutationError(res.error?.message || "Create failed"); return; }
        setSuccessMsg("Suggestion created"); refetch(); setIsDirty(false); setMode("view");
      }
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : "Save failed"); }
  }, [form, mode, sel, createSuggestion, updateSuggestion, refetch]);
  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      const res = await deleteSuggestion({ variables: { id: confirmDelete } });
      if (res.error) { setMutationError(res.error?.message || "Delete failed"); setConfirmDelete(null); return; }
      setSuccessMsg("Suggestion deleted"); setConfirmDelete(null); setSelectedId(null); refetch();
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : "Delete failed"); setConfirmDelete(null); }
  }, [confirmDelete, deleteSuggestion, refetch]);

  const iCls = `h-7 w-full bg-card border border-gray-300 text-foreground placeholder:text-muted-foreground px-2 text-sm outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
  const sCls = iCls;

  const renderHtmlBlock = (content: string, fallback = "Not defined") => (
    content ? (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm leading-snug"
        dangerouslySetInnerHTML={{ __html: content }} />
    ) : (
      <p className={`text-sm italic ${theme.textMuted}`}>{fallback}</p>
    )
  );

  const renderForm = () => (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[20%_80%] gap-6 px-5 py-3 overflow-hidden">
        <div className="min-w-0 overflow-y-auto pr-2 space-y-3">
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
          <SectionCard title="Submitted By">
            <input type="text" value={g("submittedBy")} onChange={(e) => sf("submittedBy", e.target.value)} placeholder="Your name" className={iCls} />
          </SectionCard>
        </div>
        <div className="min-w-0 min-h-0 h-full flex flex-col overflow-hidden mr-6 pb-6">
          <SectionCard title="Title">
            <input type="text" value={g("title")} onChange={(e) => sf("title", e.target.value)} placeholder="Suggestion title *" className={`${iCls} w-full min-w-0`} />
            {errors.title && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.title}</p>}
          </SectionCard>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden mt-3">
            <SectionCard title="Description" />
            <div className="flex-1 min-h-0 overflow-hidden border border-gray-300">
              <div className="h-full overflow-y-auto"><RichTextEditor content={g("description")} onChange={(html) => sf("description", html)}
                placeholder="Describe the improvement idea, current issue, or opportunity..." /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (mode === "create" && !sel) return <div className="flex-1 flex flex-col overflow-hidden">{mutationError && <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>}{renderForm()}</div>;
    if (!sel) {
      const total = suggestions.length;
      const newCount = suggestions.filter((s) => s.status === "NEW").length;
      const reviewCount = suggestions.filter((s) => s.status === "UNDER_REVIEW").length;
      const acceptedCount = suggestions.filter((s) => s.status === "ACCEPTED").length;
      const rejectedCount = suggestions.filter((s) => s.status === "REJECTED").length;
      const convertedCount = suggestions.filter((s) => s.status === "CONVERTED_TO_KAIZEN").length;
      const conversionRate = total > 0 ? Math.round((convertedCount / total) * 100) : 0;

      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-4 space-y-5">
            <SectionCard title="Suggestions" action={conversionRate > 0 ? (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">{conversionRate}% conversion</span>
            ) : undefined}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button type="button" onClick={() => setFilterStatus("")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Total</p>
                  <p className={`text-lg font-bold ${theme.textPrimary}`}>{total}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("NEW")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>New</p>
                  <p className={`text-lg font-bold text-blue-600 dark:text-blue-400`}>{newCount}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("UNDER_REVIEW")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Under Review</p>
                  <p className={`text-lg font-bold text-yellow-600 dark:text-yellow-400`}>{reviewCount}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("ACCEPTED")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Accepted</p>
                  <p className={`text-lg font-bold text-green-600 dark:text-green-400`}>{acceptedCount}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("REJECTED")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Rejected</p>
                  <p className={`text-lg font-bold ${theme.textMuted}`}>{rejectedCount}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("CONVERTED_TO_KAIZEN")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Converted</p>
                  <p className={`text-lg font-bold text-purple-600 dark:text-purple-400`}>{convertedCount}</p>
                </button>
              </div>
            </SectionCard>

            {/* Status Breakdown */}
            <SectionCard title="Status Breakdown">
              {total === 0 ? (
                <div className={`flex items-center justify-center h-16 text-xs italic ${theme.textMuted}`}>No suggestions yet. Create your first one to get started.</div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>New</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{newCount} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(newCount / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${total > 0 ? (newCount / total) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>Under Review</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{reviewCount} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(reviewCount / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-yellow-500" style={{ width: `${total > 0 ? (reviewCount / total) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>Accepted</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{acceptedCount} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(acceptedCount / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-green-500" style={{ width: `${total > 0 ? (acceptedCount / total) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>Rejected</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{rejectedCount} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(rejectedCount / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gray-400" style={{ width: `${total > 0 ? (rejectedCount / total) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>Converted to Kaizen</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{convertedCount} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(convertedCount / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-purple-500" style={{ width: `${total > 0 ? (convertedCount / total) * 100 : 0}%` }} /></div>
                  </div>
                </div>
              )}
            </SectionCard>

            <div className="flex justify-center pt-2">
              <button type="button" onClick={hNew}
                className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
                <Plus className="h-3.5 w-3.5 stroke-current" /> New Suggestion
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {mutationError && isForm && <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>}
        {isForm ? renderForm() : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="shrink-0 border-b border-border/30 px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-bold ${theme.textPrimary} truncate`}>{sel.title}</div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border  ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
                  {sel.priority && sel.priority !== "MEDIUM" && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border  ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {sel.submittedBy && <span className={`text-xs ${theme.textMuted}`}>by {sel.submittedBy}</span>}
                  {sel.createdAt && <span className={`text-xs ${theme.textMuted}`}>{sel.createdAt.slice(0, 10)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {sel.status === "NEW" && (
                  <button type="button" onClick={hReview} className="inline-flex h-7 items-center gap-1 border border-blue-200 dark:border-blue-800 px-2 text-[10px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20  transition-all whitespace-nowrap">
                    <RotateCcw className="h-2.5 w-2.5 stroke-current" />Review
                  </button>
                )}
                {(sel.status === "NEW" || sel.status === "UNDER_REVIEW") && (
                  <button type="button" onClick={hAccept} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20  transition-all whitespace-nowrap">
                    <ThumbsUp className="h-2.5 w-2.5 stroke-current" />Accept
                  </button>
                )}
                {(sel.status === "NEW" || sel.status === "UNDER_REVIEW") && (
                  <button type="button" onClick={() => { setDecisionText(""); setConfirmReject(sel.id); }} className="inline-flex h-7 items-center gap-1 border border-red-200 dark:border-red-800 px-2 text-[10px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20  transition-all whitespace-nowrap">
                    <ThumbsDown className="h-2.5 w-2.5 stroke-current" />Reject
                  </button>
                )}
                {sel.status === "ACCEPTED" && (
                  <button type="button" onClick={hConvert} className="inline-flex h-7 items-center gap-1 border border-purple-200 dark:border-purple-800 px-2 text-[10px] font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20  transition-all whitespace-nowrap">
                    <MessageSquare className="h-2.5 w-2.5 stroke-current" />Convert to Kaizen
                  </button>
                )}
                <button type="button" onClick={() => window.print()} className="inline-flex h-7 items-center gap-1 border border-border/40 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-border/70  transition-all whitespace-nowrap">
                  <Printer className="h-2.5 w-2.5 stroke-current" />
                </button>
              </div>
            </div>
            <div className="flex items-center border-b border-border/20 bg-muted/20 px-3 py-1.5">
              {["NEW", "UNDER_REVIEW", "ACCEPTED"].map((phase, idx) => {
                const statusOrder = ["NEW", "UNDER_REVIEW", "ACCEPTED"];
                const isActive = sel.status === phase;
                const isPast = statusOrder.indexOf(sel.status) >= idx && sel.status !== phase;
                return (
                  <div key={phase} className="flex items-center gap-0.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5  transition-colors ${isActive ? (STATUS_STYLES[phase] || "") + " font-bold ring-1 ring-amber-300/50" : sel.status === "REJECTED" || sel.status === "CONVERTED_TO_KAIZEN" ? "text-muted-foreground" : isPast ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "text-muted-foreground"}`}>
                      {isPast && sel.status !== "REJECTED" && sel.status !== "CONVERTED_TO_KAIZEN" ? "\u2713 " : ""}{statusLabel(phase)}
                    </span>
                    {idx < 2 && <span className={`text-[10px] mx-0.5 ${statusOrder.indexOf(sel.status) > idx ? "text-green-400" : "text-muted-foreground/30"}`}>{"\u2192"}</span>}
                  </div>
                );
              })}
              {(sel.status === "REJECTED" || sel.status === "CONVERTED_TO_KAIZEN") && (
                <>
                  <span className="text-[10px] mx-0.5 text-muted-foreground/30">{"\u2192"}</span>
                  <span className={`text-[10px] px-2 py-0.5 font-semibold  ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
                </>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4 mr-6">
              <SectionCard title="Idea Summary">
                <p className={`text-sm font-semibold ${theme.textPrimary} mb-2`}>{sel.title}</p>
                {renderHtmlBlock(sel.description, "No description provided.")}
              </SectionCard>
              <SectionCard title="Target & Classification">
                <div className="space-y-1.5 text-sm">
                  <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground">Type</span><span className="text-foreground">{targetTypeLabel(sel.targetType) || "-"}</span></div>
                  <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground">Target</span><span className="text-foreground">{sel.targetId ? (allEntities.find((e) => e.id === String(sel.targetId))?.name || `${targetTypeLabel(sel.targetType)} #${sel.targetId}`) : "-"}</span></div>
                  <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground">Category</span><span className="text-foreground">{CATEGORY_OPTIONS.find((o) => o.value === sel.category)?.label || sel.category || "-"}</span></div>
                  <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground">Priority</span><span className="text-foreground">{sel.priority ? <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority}</span> : "-"}</span></div>
                  <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground">Submitted</span><span className="text-foreground">{sel.submittedBy || "-"}</span></div>
                  {sel.createdAt && <div className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground">Date</span><span className="text-foreground">{sel.createdAt.slice(0, 10)}</span></div>}
                </div>
              </SectionCard>
              {sel.decision && sel.status !== "REJECTED" && (<SectionCard title="Review Notes"><p className={`text-sm ${theme.textPrimary}`}>{sel.decision}</p></SectionCard>)}
              {sel.status === "REJECTED" && sel.decision && (<SectionCard title="Rejection Reason">
                <div className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5 stroke-current" /><p className={`text-sm ${theme.textPrimary}`}>{sel.decision}</p></div></SectionCard>
              )}
              <SectionCard title="Status">
                {sel.status === "CONVERTED_TO_KAIZEN" ? (
                  <div className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-purple-600 stroke-current" /><span className="text-sm text-purple-700 font-medium">Converted to Kaizen</span></div>
                ) : sel.status === "ACCEPTED" ? (
                  <div className="space-y-2"><p className={`text-sm ${theme.textPrimary}`}>Accepted — ready for Kaizen conversion.</p>
                    <button type="button" onClick={hConvert} className="inline-flex h-6 items-center gap-1 border border-purple-200 px-2 text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors whitespace-nowrap"><MessageSquare className="h-3 w-3 stroke-current" /> Convert to Kaizen</button></div>
                ) : sel.status === "REJECTED" ? (<p className={`text-sm italic ${theme.textMuted}`}>Not accepted for conversion.</p>) : (<p className={`text-sm italic ${theme.textMuted}`}>Accept this suggestion to enable Kaizen conversion.</p>)}
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media print {
          .print-ignore { display: none !important; }
          .print-area { display: block !important; max-width: 100% !important; border: none !important; box-shadow: none !important; }
          .print-area .print-area-header { border-bottom: 2px solid #d4d4d4 !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
        {successMsg && (
          <div className={`shrink-0 h-8 flex items-center justify-center ${theme.toastSuccess} text-sm font-semibold border-b print-ignore`}>
            {successMsg}
          </div>
        )}
        <div className="print-ignore">
          <PageHeader icon={<Lightbulb className="h-5 w-5 stroke-current" />}
            iconClass="bg-amber-500/10 text-amber-600"
            title="Suggestions" subtitle="Collect, review, and implement improvement ideas." />
        </div>
        <div className="print-ignore">
          <Toolbar
            left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search suggestions..." />}
            right={<>
              <ToolbarSelect value={filterStatus} onChange={setFilterStatus}
                options={[{ value: "", label: "All Statuses" }, { value: "NEW", label: "New" }, { value: "UNDER_REVIEW", label: "Under Review" }, { value: "ACCEPTED", label: "Accepted" }, { value: "REJECTED", label: "Rejected" }, { value: "CONVERTED_TO_KAIZEN", label: "Converted" }]}
                className="w-40" />
              <div className="flex-1" />
              <div className="flex items-center gap-2 shrink-0">
                {isForm ? (
                  <><ToolbarButton icon={Check} label="Save" onClick={hSave} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={hCancel} /></>
                ) : (
                  <><ToolbarButton icon={Plus} label="New" onClick={hNew} /><ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel || sel.status === "CONVERTED_TO_KAIZEN"} />
                    <span className="h-5 w-px shrink-0 bg-border/25" />
                    <ToolbarButton icon={Printer} label="Print" onClick={() => window.print()} disabled={!sel} />
                    <ToolbarButton icon={Trash2} label="Delete" onClick={() => sel && setConfirmDelete(sel.id)} disabled={!sel} />
                    <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
                  </>
                )}
              </div>
            </>}
          />
        </div>
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          <div className="print-ignore flex flex-col min-h-0 overflow-hidden bg-card/40 border-r border-border/20" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
              <span className={`text-sm font-medium ${theme.textMuted}`}>Suggestions</span>
              <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{suggestions.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
              {loading && suggestions.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
              ) : suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No suggestions</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 dark:text-amber-400  transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> Create suggestion</button>
                </div>
              ) : (
                <div>
                  {suggestions.map((s) => (
                    <div key={s.id}
                      onClick={() => {
                        if (isForm && isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; }
                        setSelectedId(s.id);
                        if (mode === "create") { clearForm(); }
                        if (isForm) { setIsDirty(false); setMode("view"); }
                      }}
                      className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5  px-3 transition-all duration-150 ${selectedId === s.id ? "bg-table-selected border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                          <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{s.title}</span>
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border  ${STATUS_STYLES[s.status] || ""}`}>
                              {s.status === "CONVERTED_TO_KAIZEN" ? "Kaizen" : s.status === "UNDER_REVIEW" ? "Review" : statusLabel(s.status)}</span>
                            {s.priority && s.priority !== "MEDIUM" && (
                              <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border  ${PRIORITY_STYLES[s.priority] || ""}`}>{s.priority}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {s.submittedBy && <span className={`text-xs ${theme.textMuted}`}>{s.submittedBy}</span>}
                          {s.category && <><span className={`text-[10px] ${theme.textMuted}`}>{"\u00B7"}</span><span className={`text-xs ${theme.textMuted}`}>{CATEGORY_OPTIONS.find((o) => o.value === s.category)?.label || s.category}</span></>}
                          {s.createdAt && <><span className={`text-[10px] ${theme.textMuted}`}>{"\u00B7"}</span><span className={`text-xs ${theme.textMuted}`}>{s.createdAt.slice(0, 10)}</span></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
              <span className={`text-xs ${theme.textMuted}`}>{suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div onMouseDown={handleSplitMouseDown}
            className="print-ignore flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-amber-500/10"
            style={{ width: 2 }} />
          <div className={`print-area flex flex-col min-h-0 min-w-0 ${isForm ? "" : "mode-enter"}`} style={{ flex: 1 }}>
            {renderDetail()}
          </div>
        </div>
        <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span>Suggestions</span>
          <span className="flex-1" />
          {sel && (
            <>
              <span>Created: {sel.createdAt?.slice(0, 10) || "-"}</span>
              <span>Updated: {sel.updatedAt?.slice(0, 10) || "-"}</span>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog open={confirmReject !== null} onClose={() => setConfirmReject(null)}
        onConfirm={hRejectConfirm} title="Reject Suggestion"
        message="Are you sure you want to reject this suggestion?" confirmLabel="Reject" danger={true}>
        <div className="mt-3">
          <label className={`block text-xs font-semibold ${theme.textMuted} mb-1`}>Reason for rejection</label>
          <textarea placeholder="Explain why this suggestion is being rejected..."
            value={decisionText} onChange={(e) => setDecisionText(e.target.value)}
            className="h-20 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
        </div>
      </ConfirmDialog>
      <ConfirmDialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}
        onConfirm={hDelete} title="Delete Suggestion"
        message="Are you sure you want to delete this suggestion? This action cannot be undone."
        confirmLabel="Delete" danger={true} />
    </>
  );
}
