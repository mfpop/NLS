import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Sparkles, Plus, Pencil, RefreshCw, X, Check, Printer,
  Play, CheckCircle, XCircle, GitBranch, Ban,
  AlertTriangle,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarDropdown, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { useTargetEntities, resolveTargetLabel } from "@/hooks/useTargetEntities";
import { KAIZENS_QUERY, SUGGESTIONS_QUERY } from "@/graphql/improvementQueries";
import {
  CREATE_KAIZEN_MUTATION,
  UPDATE_KAIZEN_MUTATION,
  START_KAIZEN_MUTATION,
  COMPLETE_KAIZEN_MUTATION,
  CANCEL_KAIZEN_MUTATION,
  ADD_KAIZEN_ACTION_MUTATION,
  COMPLETE_KAIZEN_ACTION_MUTATION,
  CANCEL_KAIZEN_ACTION_MUTATION,
  CREATE_A3_FROM_KAIZEN_MUTATION,
} from "@/graphql/improvementMutations";

/* ── CONSTANTS ── */

const STATUS_STYLES: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
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

const SOURCE_OPTIONS = [
  { value: "MANUAL", label: "Manual" }, { value: "SUGGESTION", label: "Suggestion" },
  { value: "GEMBA", label: "Gemba Walk" }, { value: "AUDIT", label: "Audit" },
  { value: "PROCESS_ISSUE", label: "Process Issue" }, { value: "MER", label: "Engineering Request" },
];

const TARGET_OPTIONS = [
  { value: "Plant", label: "Plant" }, { value: "ProductionLine", label: "Production Line" },
  { value: "Department", label: "Department" }, { value: "ResourceGroup", label: "Resource Group" },
  { value: "Resource", label: "Resource" },
];

const VIEW_PHASES = ["PLANNED", "IN_PROGRESS", "COMPLETED"];

/* ── TYPES ── */

interface KaizenActionNode {
  id: number; title: string; owner: string; dueDate: string | null;
  status: string; description: string;
}
interface KaizenNode {
  id: number; title: string; kaizenCode: string; problemStatement: string;
  targetType: string; targetId: number | null; currentCondition: string; targetCondition: string;
  owner: string; priority: string; sourceType: string; sourceSuggestionId: number | null;
  startDate: string | null; dueDate: string | null; completedDate: string | null;
  status: string; resultSummary: string; actions: KaizenActionNode[];
  createdAt: string; updatedAt: string;
}
interface FormState {
  title: string; problemStatement: string;
  targetType: string; targetId: string; currentCondition: string; targetCondition: string;
  owner: string; priority: string; sourceType: string;
  startDate: string; dueDate: string; resultSummary: string;
  sourceSuggestionId: string;
}

/* ── HELPERS ── */

function statusLabel(s: string): string {
  if (s === "IN_PROGRESS") return "In Progress";
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}
function actionProgress(actions: KaizenActionNode[]): { done: number; total: number } {
  const total = actions.length;
  const done = actions.filter((a) => a.status === "DONE").length;
  return { done, total };
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

function ActionProgressBar({ actions }: { actions: KaizenActionNode[] }) {
  const { done, total } = actionProgress(actions);
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-1.5" title={`${done}/${total} actions completed`}>
      <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-green-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[8px] text-muted-foreground font-mono">{done}/{total}</span>
    </div>
  );
}

/* ── MAIN COMPONENT ── */

export function KaizenPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "", problemStatement: "",
    targetType: "Plant", targetId: "", currentCondition: "", targetCondition: "",
    owner: "", priority: "MEDIUM", sourceType: "MANUAL",
    startDate: "", dueDate: "", resultSummary: "", sourceSuggestionId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);
  const [resultSummary, setResultSummary] = useState("");
  const [actTitle, setActTitle] = useState("");
  const [actOwner, setActOwner] = useState("");
  const [actDue, setActDue] = useState("");
  const [actDescription, setActDescription] = useState("");

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

  const { data, loading, refetch } = useQuery<{ kaizens: KaizenNode[] }>(KAIZENS_QUERY, {
    variables: { status: filterStatus || undefined, search: search || undefined },
    fetchPolicy: "cache-and-network",
  });
  const kaizens: KaizenNode[] = data?.kaizens || [];
  const { targetOptions, allEntities } = useTargetEntities(form.targetType);
  const targetLabel = resolveTargetLabel(allEntities, form.targetId);

  const { data: suggestionsData } = useQuery<{ suggestions: { id: number; title: string }[] }>(SUGGESTIONS_QUERY, {
    variables: { status: "ACCEPTED" }, fetchPolicy: "cache-and-network",
  });
  const acceptedSuggestions = Array.isArray(suggestionsData?.suggestions) ? suggestionsData.suggestions : [];

  const [createKaizen] = useMutation(CREATE_KAIZEN_MUTATION);
  const [updateKaizen] = useMutation(UPDATE_KAIZEN_MUTATION);
  const [startKaizen] = useMutation(START_KAIZEN_MUTATION);
  const [completeKaizen] = useMutation(COMPLETE_KAIZEN_MUTATION);
  const [cancelKaizen] = useMutation(CANCEL_KAIZEN_MUTATION);
  const [addKaizenAction] = useMutation(ADD_KAIZEN_ACTION_MUTATION);
  const [completeKaizenAction] = useMutation(COMPLETE_KAIZEN_ACTION_MUTATION);
  const [cancelKaizenAction] = useMutation(CANCEL_KAIZEN_ACTION_MUTATION);
  const [createA3FromKaizen] = useMutation(CREATE_A3_FROM_KAIZEN_MUTATION);

  const sel = selectedId ? kaizens.find((k) => k.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  useEffect(() => {
    if (kaizens.length === 0) return;
    if (selectedId && kaizens.some((k) => k.id === selectedId)) return;
    if (!initialLoad) return;
    setInitialLoad(false);
    setSelectedId(kaizens[0].id);
  }, [kaizens, selectedId, initialLoad]);

  const g = (k: keyof FormState) => String(form[k] ?? "");
  const sf = (k: keyof FormState, v: unknown) => { setIsDirty(true); setForm((p) => ({ ...p, [k]: v })); };

  const clearForm = useCallback(() => {
    setForm({ title: "", problemStatement: "",
      targetType: "Plant", targetId: "", currentCondition: "", targetCondition: "",
      owner: "", priority: "MEDIUM", sourceType: "MANUAL",
      startDate: "", dueDate: "", resultSummary: "", sourceSuggestionId: "" });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const loadForm = useCallback((item: KaizenNode) => {
    setForm({
      title: item.title, problemStatement: item.problemStatement,
      targetType: item.targetType || "Plant", targetId: String(item.targetId ?? ""),
      currentCondition: item.currentCondition, targetCondition: item.targetCondition,
      owner: item.owner, priority: item.priority || "MEDIUM", sourceType: item.sourceType || "MANUAL",
      startDate: item.startDate || "", dueDate: item.dueDate || "", resultSummary: item.resultSummary || "",
      sourceSuggestionId: String(item.sourceSuggestionId ?? ""),
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
        const vars: Record<string, unknown> = { id: sel.id };
        if (form.title !== sel.title) vars.title = form.title.trim();
        if (form.problemStatement !== sel.problemStatement) vars.problemStatement = form.problemStatement;
        if (form.currentCondition !== sel.currentCondition) vars.currentCondition = form.currentCondition;
        if (form.targetCondition !== sel.targetCondition) vars.targetCondition = form.targetCondition;
        if (form.owner !== sel.owner) vars.owner = form.owner;
        if (form.priority !== sel.priority) vars.priority = form.priority;
        if (form.sourceType !== sel.sourceType) vars.sourceType = form.sourceType;
        const newSugId = form.sourceSuggestionId ? parseInt(form.sourceSuggestionId) : null;
        if (newSugId !== (sel.sourceSuggestionId ?? null)) vars.sourceSuggestionId = newSugId;
        const r = await updateKaizen({ variables: vars });
        if (r.error) { setMutationError(r.error.message || "Save failed"); return; }
        setSuccessMsg("Kaizen updated"); setIsDirty(false); refetch(); setMode("view");
      } else {
        const r = await createKaizen({ variables: {
          title: form.title.trim(), problemStatement: form.problemStatement,
          targetType: form.targetType, targetId: form.targetId ? parseInt(form.targetId) : null,
          currentCondition: form.currentCondition, targetCondition: form.targetCondition,
          owner: form.owner, priority: form.priority, sourceType: form.sourceType,
          startDate: form.startDate || null, dueDate: form.dueDate || null,
          sourceSuggestionId: form.sourceSuggestionId ? parseInt(form.sourceSuggestionId) : null,
        } });
        if (r.error) { setMutationError(r.error.message || "Create failed"); return; }
        setSuccessMsg("Kaizen created"); setIsDirty(false); refetch(); setMode("view");
      }
    } catch (e: unknown) { setMutationError(e instanceof Error ? e.message : "Save failed"); }
  }, [form, mode, sel, createKaizen, updateKaizen, refetch]);

  const hStart = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await startKaizen({ variables: { id: sel.id } });
    if (r.error) { setMutationError(r.error.message || "Start failed"); return; }
    setSuccessMsg("Kaizen started"); refetch();
  }, [sel, startKaizen, refetch]);

  const hComplete = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await completeKaizen({ variables: { id: confirmAction.id, resultSummary } });
    if (r.error) { setMutationError(r.error.message || "Complete failed"); setConfirmAction(null); return; }
    setSuccessMsg("Kaizen completed"); setConfirmAction(null); setResultSummary(""); refetch();
  }, [confirmAction, resultSummary, completeKaizen, refetch]);

  const hCancelKaizen = useCallback(async () => {
    if (!confirmAction) return; setMutationError(null);
    const r = await cancelKaizen({ variables: { id: confirmAction.id } });
    if (r.error) { setMutationError(r.error.message || "Cancel failed"); setConfirmAction(null); return; }
    setSuccessMsg("Kaizen cancelled"); setConfirmAction(null); refetch();
  }, [confirmAction, cancelKaizen, refetch]);

  const hAddAction = useCallback(async () => {
    if (!sel || !actTitle.trim()) return; setMutationError(null);
    const r = await addKaizenAction({ variables: {
      kaizenId: sel.id, title: actTitle.trim(), owner: actOwner,
      dueDate: actDue || null, description: actDescription,
    } });
    if (r.error) { setMutationError(r.error.message || "Add action failed"); return; }
    setSuccessMsg("Action added"); setActTitle(""); setActOwner(""); setActDue(""); setActDescription(""); refetch();
  }, [sel, actTitle, actOwner, actDue, actDescription, addKaizenAction, refetch]);

  const hCompleteAction = useCallback(async (id: number) => {
    setMutationError(null);
    const r = await completeKaizenAction({ variables: { id } });
    if (r.error) { setMutationError(r.error.message || "Complete action failed"); return; }
    setSuccessMsg("Action completed"); refetch();
  }, [completeKaizenAction, refetch]);

  const hCancelAction = useCallback(async (id: number) => {
    setMutationError(null);
    const r = await cancelKaizenAction({ variables: { id } });
    if (r.error) { setMutationError(r.error.message || "Cancel action failed"); return; }
    setSuccessMsg("Action cancelled"); refetch();
  }, [cancelKaizenAction, refetch]);

  const hCreateA3 = useCallback(async () => {
    if (!sel) return; setMutationError(null);
    const r = await createA3FromKaizen({ variables: { kaizenId: sel.id } });
    if (r.error) { setMutationError(r.error.message || "Create A3 failed"); return; }
    setSuccessMsg("A3/PDCA created from this Kaizen"); refetch();
  }, [sel, createA3FromKaizen, refetch]);

  const iCls = `h-7 w-full bg-card border border-gray-300 text-foreground placeholder:text-muted-foreground px-2 text-sm outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
  const sCls = iCls;

  const renderHtmlBlock = (content: string, fallback = "Not defined") => (
    content ? (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm leading-snug"
        dangerouslySetInnerHTML={{ __html: content }} />
    ) : <p className={`text-xs italic ${theme.textMuted}`}>{fallback}</p>
  );

  const renderActionItem = (a: KaizenActionNode) => (
    <div key={a.id} className={`group/action flex items-start gap-1.5 py-0.5 transition-colors hover:bg-muted/20 ${a.status === "DONE" ? "opacity-50" : ""}`}>
      <div className="mt-0.5 shrink-0">
        {a.status === "DONE" ? <CheckCircle className="h-3 w-3 text-green-500 stroke-current" />
          : a.status === "CANCELLED" ? <Ban className="h-3 w-3 text-red-400 stroke-current" />
          : <div className="h-3 w-3 rounded-full border-2 border-amber-400 dark:border-amber-500" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`min-w-0 text-xs font-medium ${a.status === "DONE" ? "line-through text-muted-foreground" : theme.textPrimary}`}>{a.title}</span>
          <span className={`inline-flex items-center px-1 py-px text-[9px] font-semibold border shrink-0 ${a.status === "DONE" ? "bg-green-100 text-green-700 border-green-200" : "bg-blue-100 text-blue-700 border-blue-200"}`}>
            {a.status === "DONE" ? "Done" : "Open"}
          </span>
        </div>
        {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
        <div className="flex items-center gap-2 mt-0.5">
          {a.owner && <span className="text-xs text-muted-foreground">{a.owner}</span>}
          {a.dueDate && (
            <span className={`text-xs flex items-center gap-0.5 ${isOverdue(a.dueDate) && a.status !== "DONE" ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
              {isOverdue(a.dueDate) && a.status !== "DONE" && <AlertTriangle className="h-2 w-2 stroke-current" />}
              {a.dueDate}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/action:opacity-100 transition-opacity">
        {a.status === "OPEN" && (
          <button type="button" onClick={() => hCompleteAction(a.id)}
            className="inline-flex h-5 w-5 items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Done">
            <Check className="h-3 w-3 stroke-current" />
          </button>
        )}
        {(a.status === "OPEN" || a.status === "IN_PROGRESS") && (
          <button type="button" onClick={() => hCancelAction(a.id)}
            className="inline-flex h-5 w-5 items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Cancel">
            <Ban className="h-3 w-3 stroke-current" />
          </button>
        )}
      </div>
    </div>
  );

  /* ── Form ── */
  const renderForm = () => (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[20%_80%] gap-6 px-5 py-3 min-w-0">
        <div className="min-w-0 overflow-y-auto space-y-3">
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
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Priority</p>
                <select value={g("priority")} onChange={(e) => sf("priority", e.target.value)} className={sCls}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div><p className={`text-[10px] font-medium ${theme.textMuted} mb-0.5`}>Source</p>
                <select value={g("sourceType")} onChange={(e) => sf("sourceType", e.target.value)} className={sCls}>
                  {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
            </div>
          </SectionCard>
          <SectionCard title="Owner & Dates">
            <div className="space-y-1.5">
              <input type="text" value={g("owner")} onChange={(e) => sf("owner", e.target.value)} placeholder="Owner" className={iCls} />
              <input type="date" value={g("startDate")} onChange={(e) => sf("startDate", e.target.value)} className={iCls} />
              <input type="date" value={g("dueDate")} onChange={(e) => sf("dueDate", e.target.value)} className={iCls} />
            </div>
          </SectionCard>
          <SectionCard title="Source Suggestion">
            <select value={g("sourceSuggestionId")} onChange={(e) => sf("sourceSuggestionId", e.target.value)} className={sCls}>
              <option value="">None</option>
              {acceptedSuggestions.map((s: { id: number; title: string }) => (
                <option key={s.id} value={String(s.id)}>{s.title}</option>
              ))}
            </select>
          </SectionCard>
        </div>
        <div className="min-w-0 min-h-0 h-full flex flex-col overflow-hidden mr-6 pb-6">
          <SectionCard title="Title">
            <input type="text" value={g("title")} onChange={(e) => sf("title", e.target.value)} placeholder="Kaizen title *" className={`${iCls} w-full min-w-0`} />
            {errors.title && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.title}</p>}
          </SectionCard>
          <div className="flex-1 min-h-0 overflow-y-auto mt-2 space-y-3">
            <SectionCard title="Problem / Opportunity">
              <RichTextEditor content={g("problemStatement")} onChange={(html) => sf("problemStatement", html)}
                placeholder="Describe the problem or improvement opportunity..." />
            </SectionCard>
            <div className="grid grid-cols-2 gap-3">
              <SectionCard title="Current Condition">
                <RichTextEditor content={g("currentCondition")} onChange={(html) => sf("currentCondition", html)}
                  placeholder="Describe the current state..." />
              </SectionCard>
              <SectionCard title="Target Condition">
                <RichTextEditor content={g("targetCondition")} onChange={(html) => sf("targetCondition", html)}
                  placeholder="Describe the desired future state..." />
              </SectionCard>
            </div>
            {sel?.status === "COMPLETED" && (
              <SectionCard title="Result Summary">
                <RichTextEditor content={g("resultSummary")} onChange={(html) => sf("resultSummary", html)}
                  placeholder="Results after completion..." />
              </SectionCard>
            )}
            <SectionCard title="Action Items">
              {sel?.actions && sel.actions.length > 0 && <div className="space-y-1">{sel.actions.map(renderActionItem)}</div>}
              <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border/10">
                <input type="text" value={actTitle} onChange={(e) => setActTitle(e.target.value)} placeholder="Task title *"
                  className="h-6 min-w-0 flex-1 rounded border border-border/40 bg-muted/50 px-1.5 text-xs outline-none text-foreground focus:border-amber-400 transition-colors" />
                <input type="text" value={actOwner} onChange={(e) => setActOwner(e.target.value)} placeholder="Owner"
                  className="h-6 w-16 rounded border border-border/40 bg-muted/50 px-1.5 text-xs outline-none text-foreground focus:border-amber-400 transition-colors" />
                <input type="date" value={actDue} onChange={(e) => setActDue(e.target.value)}
                  className="h-6 w-24 rounded border border-border/40 bg-muted/50 px-1.5 text-xs outline-none text-foreground focus:border-amber-400 transition-colors" />
                <button type="button" onClick={hAddAction} disabled={!actTitle.trim()}
                  className={`inline-flex h-6 items-center gap-0.5 rounded px-2 text-[10px] font-semibold transition-all ${actTitle.trim() ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                  <Plus className="h-3 w-3 stroke-current" /> Add
                </button>
              </div>
              <input type="text" value={actDescription} onChange={(e) => setActDescription(e.target.value)} placeholder="Description (optional)"
                className="h-5 w-full rounded border border-border/40 bg-muted/50 px-1.5 text-xs outline-none text-foreground focus:border-amber-400 transition-colors mt-1" />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── View / Detail ── */
  const renderDetail = () => {
    if (mode === "create" && !sel) return <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderForm()}</div>;
    if (!sel) {
      const total = kaizens.length;
      const planned = kaizens.filter((k) => k.status === "PLANNED").length;
      const inProgress = kaizens.filter((k) => k.status === "IN_PROGRESS").length;
      const completed = kaizens.filter((k) => k.status === "COMPLETED").length;
      const cancelled = kaizens.filter((k) => k.status === "CANCELLED").length;
      const overdue = kaizens.filter((k) => k.dueDate && isOverdue(k.dueDate) && k.status !== "COMPLETED").length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-4 space-y-5">
            <SectionCard title="Kaizen" action={overdue > 0 ? (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">{overdue} overdue</span>
            ) : undefined}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button type="button" onClick={() => setFilterStatus("")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Total</p>
                  <p className={`text-lg font-bold ${theme.textPrimary}`}>{total}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("PLANNED")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Planned</p>
                  <p className={`text-lg font-bold text-blue-600 dark:text-blue-400`}>{planned}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("IN_PROGRESS")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>In Progress</p>
                  <p className={`text-lg font-bold text-amber-600 dark:text-amber-400`}>{inProgress}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("COMPLETED")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Completed</p>
                  <p className={`text-lg font-bold text-green-600 dark:text-green-400`}>{completed}</p>
                </button>
                <button type="button" onClick={() => setFilterStatus("CANCELLED")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-amber-300/50 transition-colors">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Cancelled</p>
                  <p className={`text-lg font-bold ${theme.textMuted}`}>{cancelled}</p>
                </button>
                <div className="rounded-sm border border-border/60 bg-card p-3">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Overdue</p>
                  <p className={`text-lg font-bold text-red-600 dark:text-red-400`}>{overdue}</p>
                </div>
                <div className="rounded-sm border border-border/60 bg-card p-3">
                  <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Completion Rate</p>
                  <p className={`text-lg font-bold ${theme.textMuted}`}>{completionRate}%</p>
                </div>
              </div>
            </SectionCard>

            {/* Status Breakdown */}
            <SectionCard title="Status Breakdown">
              {total === 0 ? (
                <div className={`flex items-center justify-center h-16 text-xs italic ${theme.textMuted}`}>No kaizens yet. Create your first improvement.</div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>Planned</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{planned} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(planned / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${total > 0 ? (planned / total) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>In Progress</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{inProgress} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(inProgress / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-amber-500" style={{ width: `${total > 0 ? (inProgress / total) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>Completed</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{completed} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(completed / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-green-500" style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>Cancelled</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{cancelled} <span className={`${theme.textMuted} font-normal`}>({total > 0 ? Math.round(cancelled / total * 100) : 0}%)</span></span></div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gray-400" style={{ width: `${total > 0 ? (cancelled / total) * 100 : 0}%` }} /></div>
                  </div>
                </div>
              )}
            </SectionCard>

            <div className="flex justify-center pt-2">
              <button type="button" onClick={hNew}
                className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
                <Plus className="h-3.5 w-3.5 stroke-current" /> New Kaizen
              </button>
            </div>
          </div>
        </div>
      );
    }
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
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {sel.owner && <span className={`text-xs ${theme.textMuted}`}>Owner: {sel.owner}</span>}
                  {sel.sourceType && <span className={`text-xs ${theme.textMuted}`}>Source: {sel.sourceType}</span>}
                  {sel.startDate && <span className={`text-xs ${theme.textMuted}`}>Start: {sel.startDate}</span>}
                  {sel.dueDate && (
                    <span className={`text-xs ${isOverdue(sel.dueDate) && sel.status !== "COMPLETED" ? "text-red-500 font-semibold" : theme.textMuted}`}>
                      {isOverdue(sel.dueDate) && sel.status !== "COMPLETED" && <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5 stroke-current" />}
                      Due: {sel.dueDate}
                    </span>
                  )}
                  {sel.completedDate && <span className="text-xs text-green-600">Completed: {sel.completedDate}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {sel.status === "PLANNED" && (
                  <button type="button" onClick={hStart} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <Play className="h-2.5 w-2.5 stroke-current" />Start
                  </button>
                )}
                {sel.status === "IN_PROGRESS" && (
                  <button type="button" onClick={() => { setResultSummary(""); setConfirmAction({ id: sel.id, action: "complete" }); }} className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                    <CheckCircle className="h-2.5 w-2.5 stroke-current" />Complete
                  </button>
                )}
                {sel.status !== "COMPLETED" && sel.status !== "CANCELLED" && (
                  <button type="button" onClick={() => setConfirmAction({ id: sel.id, action: "cancel" })} className="inline-flex h-7 items-center gap-1 border border-red-200 dark:border-red-800 px-2 text-[10px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap">
                    <XCircle className="h-2.5 w-2.5 stroke-current" />Cancel
                  </button>
                )}
                <button type="button" onClick={hCreateA3} className="inline-flex h-7 items-center gap-1 border border-indigo-200 dark:border-indigo-800 px-2 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all whitespace-nowrap">
                  <GitBranch className="h-2.5 w-2.5 stroke-current" />A3/PDCA
                </button>
                <button type="button" onClick={() => window.print()} className="inline-flex h-7 items-center gap-1 border border-border/40 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-border/70 transition-all whitespace-nowrap">
                  <Printer className="h-2.5 w-2.5 stroke-current" />
                </button>
              </div>
            </div>
            {/* Status Progress Bar */}
            <div className="flex items-center border-b border-border/20 bg-muted/20 px-3 py-1.5">
              {VIEW_PHASES.map((phase, idx) => {
                const statusOrder = VIEW_PHASES;
                const isActive = sel.status === phase;
                const isPast = statusOrder.indexOf(sel.status) >= idx && sel.status !== phase;
                return (
                  <div key={phase} className="flex items-center gap-0.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 transition-colors ${isActive ? (STATUS_STYLES[phase] || "") + " font-bold ring-1 ring-amber-300/50" : sel.status === "CANCELLED" ? "text-muted-foreground" : isPast ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "text-muted-foreground"}`}>
                      {isPast && sel.status !== "CANCELLED" ? "\u2713 " : ""}{statusLabel(phase)}
                    </span>
                    {idx < VIEW_PHASES.length - 1 && <span className={`text-[10px] mx-0.5 ${statusOrder.indexOf(sel.status) > idx ? "text-green-400" : "text-muted-foreground/30"}`}>{"\u2192"}</span>}
                  </div>
                );
              })}
              {(sel.status === "CANCELLED") && (
                <>
                  <span className="text-[10px] mx-0.5 text-muted-foreground/30">{"\u2192"}</span>
                  <span className={`text-[10px] px-2 py-0.5 font-semibold ${STATUS_STYLES[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
                </>
              )}
              {sel.actions && sel.actions.length > 0 && <div className="ml-auto"><ActionProgressBar actions={sel.actions} /></div>}
            </div>
            {/* View Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 mr-6">
              <div className="grid grid-cols-2 gap-6 auto-rows-min">
                <div className="space-y-4">
                  <SectionCard title="Problem / Opportunity">
                    <p className={`text-sm font-semibold ${theme.textPrimary} mb-2`}>{sel.title}</p>
                    {renderHtmlBlock(sel.problemStatement, "No problem statement defined.")}
                  </SectionCard>
                </div>
                <div className="space-y-4">
                  <SectionCard title="Current Condition">
                    {renderHtmlBlock(sel.currentCondition)}
                  </SectionCard>
                  <SectionCard title="Target Condition">
                    {renderHtmlBlock(sel.targetCondition)}
                  </SectionCard>
                  <SectionCard title="Action Items">
                    {sel.actions && sel.actions.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1">{sel.actions.map(renderActionItem)}</div>
                    ) : <p className={`text-xs italic ${theme.textMuted}`}>No action items yet.</p>}
                  </SectionCard>
                </div>
              </div>
              {sel.resultSummary && (
                <div className="mt-4">
                  <SectionCard title="Result Summary">{renderHtmlBlock(sel.resultSummary)}</SectionCard>
                </div>
              )}
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
          <PageHeader icon={<Sparkles className="h-5 w-5 stroke-current" />}
            iconClass="bg-amber-500/10 text-amber-600"
            title="Kaizen" subtitle="Manage structured improvement actions and events." />
        </div>
        <div className="print-ignore">
          <Toolbar left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search kaizens..." />}
            right={<>
              <ToolbarDropdown value={filterStatus} onChange={setFilterStatus}
                options={[{ value: "", label: "All Statuses" }, { value: "PLANNED", label: "Planned" }, { value: "IN_PROGRESS", label: "In Progress" }, { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }]}
                className="w-40" />

              <div className="flex-1" />
              <div className="flex items-center gap-2 shrink-0">
                {isForm ? (
                  <><ToolbarButton icon={Check} label="Save" onClick={hSave} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={hCancel} /></>
                ) : (
                  <><ToolbarButton icon={Plus} label="New" onClick={hNew} /><ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel} />
                    <span className="h-5 w-px shrink-0 bg-border/25" />
                    <ToolbarButton icon={Printer} label="Print" onClick={() => window.print()} disabled={!sel} />
                    <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} /></>
                )}
              </div>
            </>} />
        </div>
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          <div className="print-ignore flex flex-col min-h-0 overflow-hidden bg-card/40 border-r border-border/20" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
              <span className={`text-sm font-medium ${theme.textMuted}`}>Kaizens</span>
              <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{kaizens.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
              {loading && kaizens.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
              ) : kaizens.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No kaizens</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-amber-600/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-600/20 dark:text-amber-400 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> Create kaizen</button>
                </div>
              ) : (
                <div>{kaizens.map((k) => {
                  const progress = actionProgress(k.actions);
                  return (
                    <div key={k.id}
                      onClick={() => { if (isForm && isDirty && mode === "edit") { if (!confirm("Unsaved changes. Discard?")) return; } setSelectedId(k.id); clearForm(); setIsDirty(false); setMode("view"); }}
                      className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedId === k.id ? "bg-table-selected border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                          <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{k.title}</span>
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[k.status] || ""}`}>
                              {k.status === "IN_PROGRESS" ? "Active" : statusLabel(k.status)}</span>
                            {k.priority && k.priority !== "MEDIUM" && <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${PRIORITY_STYLES[k.priority] || ""}`}>{k.priority}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {k.owner && <span className={`text-xs ${theme.textMuted}`}>{k.owner}</span>}
                          {k.targetType && <><span className={`text-[10px] ${theme.textMuted}`}>{"\u00B7"}</span><span className={`text-xs ${theme.textMuted}`}>{k.targetType}</span></>}
                          {k.dueDate && <span className={`text-[10px] ${isOverdue(k.dueDate) && k.status !== "COMPLETED" ? "text-red-500 font-semibold" : theme.textMuted}`}>{isOverdue(k.dueDate) && k.status !== "COMPLETED" && <AlertTriangle className="inline h-2 w-2 mr-px stroke-current" />}Due: {k.dueDate}</span>}
                          {progress.total > 0 && <ActionProgressBar actions={k.actions} />}
                        </div>
                      </div>
                    </div>
                  );
                })}</div>
              )}
            </div>
            <div className="shrink-0 h-8 flex items-center border-t border-border/50 bg-muted px-4">
              <span className={`text-xs ${theme.textMuted}`}>{kaizens.length} kaizen{kaizens.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div onMouseDown={handleSplitMouseDown} className="print-ignore flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-amber-500/10" style={{ width: 2 }} />
          <div className={`print-area flex flex-col min-h-0 min-w-0 ${isForm ? "" : "mode-enter"}`} style={{ flex: 1 }}>{renderDetail()}</div>
        </div>
        <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span>Kaizen</span><span className="flex-1" />
          {sel && <><span>Created: {sel.createdAt?.slice(0, 10) || "-"}</span><span>Updated: {sel.updatedAt?.slice(0, 10) || "-"}</span></>}
        </div>
      </div>
      <ConfirmDialog open={confirmAction !== null} onClose={() => setConfirmAction(null)}
        onConfirm={confirmAction?.action === "complete" ? hComplete : hCancelKaizen}
        title={`${confirmAction?.action === "cancel" ? "Cancel" : "Complete"} Kaizen`}
        message={confirmAction?.action === "cancel" ? "Cancel this kaizen?" : "Mark this kaizen as completed?"}
        confirmLabel={confirmAction?.action === "complete" ? "Complete" : "Yes, Cancel"}
        danger={confirmAction?.action === "cancel"}>
        {confirmAction?.action === "complete" && (
          <div className="mt-3">
            <label className={`block text-xs font-semibold ${theme.textMuted} mb-1`}>Result Summary</label>
            <textarea placeholder="Describe the outcomes..." value={resultSummary} onChange={(e) => setResultSummary(e.target.value)}
              className="h-24 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-amber-400 transition-colors" />
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
