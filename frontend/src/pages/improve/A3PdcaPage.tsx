import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ClipboardList, Plus, Pencil, RefreshCw, X, Check, Printer,
  ArrowRight, FileText, Ban, PlusCircle, CheckCircle, XCircle,
  AlertTriangle,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { applyA3Template, applyPDCATemplate } from "./generateA3Template";
import { useTargetEntities, resolveTargetLabel } from "@/hooks/useTargetEntities";
import { A3_PDCA_RECORDS_QUERY } from "@/graphql/improvementQueries";
import {
  CREATE_A3_PDCA_MUTATION,
  UPDATE_A3_PDCA_MUTATION,
  MOVE_A3_PDCA_TO_PLAN_MUTATION,
  MOVE_A3_PDCA_TO_DO_MUTATION,
  MOVE_A3_PDCA_TO_CHECK_MUTATION,
  MOVE_A3_PDCA_TO_ACT_MUTATION,
  COMPLETE_A3_PDCA_MUTATION,
  CANCEL_A3_PDCA_MUTATION,
  ADD_A3_PDCA_ACTION_MUTATION,
  COMPLETE_A3_PDCA_ACTION_MUTATION,
  CANCEL_A3_PDCA_ACTION_MUTATION,
} from "@/graphql/improvementMutations";

/* ──────────────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────────────── */

const PHASE_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  PLAN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  DO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  CHECK: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  ACT: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const ACTION_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
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

const PHASES = ["DRAFT", "PLAN", "DO", "CHECK", "ACT", "COMPLETED"];

/* ──────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────── */

interface A3PDCAActionNode {
  id: number; a3PdcaId: number; phase: string; title: string;
  description: string; owner: string; dueDate: string | null;
  status: string; notes: string; createdAt: string; updatedAt: string;
}

interface A3Node {
  id: number; title: string; a3Code: string; sourceType: string;
  sourceKaizenId: number | null; targetType: string; targetId: number | null;
  owner: string; priority: string; background: string; problemStatement: string;
  currentCondition: string; targetCondition: string; rootCauseAnalysis: string;
  countermeasures: string; implementationPlan: string; doNotes: string;
  blockers: string; resultValidation: string; beforeAfterComparison: string;
  effectivenessCheck: string; standardizationActions: string; lessonsLearned: string;
  followUpPlan: string; resultSummary: string; status: string;
  startDate: string | null; dueDate: string | null; completedDate: string | null;
  actions: A3PDCAActionNode[]; createdAt: string; updatedAt: string;
}

interface FormState {
  title: string; background: string; problemStatement: string;
  currentCondition: string; targetCondition: string;
  rootCauseAnalysis: string; countermeasures: string; implementationPlan: string;
  targetType: string; targetId: string; owner: string;
  priority: string; startDate: string; dueDate: string;
}

type TemplateMethod = "A3" | "PDCA";

/* ──────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────── */

function phaseLabel(s: string): string {
  if (s === "COMPLETED") return "Completed";
  if (s === "CANCELLED") return "Cancelled";
  return s.charAt(0) + s.slice(1).toLowerCase();
}
function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}
function actionProgress(actions: A3PDCAActionNode[]): { done: number; total: number } {
  const total = actions.length;
  const done = actions.filter((a) => a.status === "DONE").length;
  return { done, total };
}

/* ──────────────────────────────────────────────────────
   SUB-COMPONENTS
   ────────────────────────────────────────────────────── */

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex min-h-6 items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-indigo-500/60 rounded-full" />
          <div className="flex-1 text-sm font-bold uppercase tracking-[0.12em] text-indigo-600/70 dark:text-indigo-400/70">{title}</div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MethodToggle({ value, onChange }: { value: TemplateMethod; onChange: (v: TemplateMethod) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-muted p-0.5">
      {(["A3", "PDCA"] as const).map((method) => (
        <button key={method} type="button" onClick={() => onChange(method)}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[10px] font-semibold transition-all ${value === method ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {method === "A3" ? <FileText className="h-3 w-3 stroke-current" /> : <RefreshCw className="h-3 w-3 stroke-current" />}
          {method}
        </button>
      ))}
    </div>
  );
}

function ActionProgressBar({ actions }: { actions: A3PDCAActionNode[] }) {
  const { done, total } = actionProgress(actions);
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-1.5" title={`${done}/${total} actions completed`}>
      <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-green-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">{done}/{total}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────── */

export function A3PdcaPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [templateMethod, setTemplateMethod] = useState<TemplateMethod>("A3");
  const [form, setForm] = useState<FormState>({
    title: "", background: "", problemStatement: "", currentCondition: "", targetCondition: "",
    rootCauseAnalysis: "", countermeasures: "", implementationPlan: "",
    targetType: "Plant", targetId: "", owner: "", priority: "MEDIUM", startDate: "", dueDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmTransition, setConfirmTransition] = useState<{ id: number; phase: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);

  // Action form state
  const [newActionPhase, setNewActionPhase] = useState("PLAN");
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionOwner, setNewActionOwner] = useState("");
  const [newActionDueDate, setNewActionDueDate] = useState("");
  const [newActionDescription, setNewActionDescription] = useState("");

  // Unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Split pane
  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);

  const { targetOptions, allEntities } = useTargetEntities(form.targetType);
  const targetLabel = resolveTargetLabel(allEntities, form.targetId);

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
  const { data, loading, refetch } = useQuery<{ a3PdcaRecords: A3Node[] }>(A3_PDCA_RECORDS_QUERY, {
    variables: { status: filterStatus || undefined, search: search || undefined },
    fetchPolicy: "cache-and-network",
  });
  const records: A3Node[] = data?.a3PdcaRecords || [];

  const sel = selectedId ? records.find((r) => r.id === selectedId) ?? null : null;
  const isForm = mode === "edit" || mode === "create";

  useEffect(() => {
    if (records.length === 0) return;
    if (selectedId && records.some((r) => r.id === selectedId)) return;
    if (!initialLoad) return;
    setInitialLoad(false);
    setSelectedId(records[0].id);
  }, [records, selectedId, initialLoad]);

  const [createA3Pdca] = useMutation(CREATE_A3_PDCA_MUTATION);
  const [updateA3Pdca] = useMutation(UPDATE_A3_PDCA_MUTATION);
  const [moveToPlan] = useMutation(MOVE_A3_PDCA_TO_PLAN_MUTATION);
  const [moveToDo] = useMutation(MOVE_A3_PDCA_TO_DO_MUTATION);
  const [moveToCheck] = useMutation(MOVE_A3_PDCA_TO_CHECK_MUTATION);
  const [moveToAct] = useMutation(MOVE_A3_PDCA_TO_ACT_MUTATION);
  const [completeA3Pdca] = useMutation(COMPLETE_A3_PDCA_MUTATION);
  const [cancelA3Pdca] = useMutation(CANCEL_A3_PDCA_MUTATION);
  const [addA3Action] = useMutation(ADD_A3_PDCA_ACTION_MUTATION);
  const [completeA3Action] = useMutation(COMPLETE_A3_PDCA_ACTION_MUTATION);
  const [cancelA3Action] = useMutation(CANCEL_A3_PDCA_ACTION_MUTATION);

  const g = (k: keyof FormState) => String(form[k] ?? "");
  const sf = (k: keyof FormState, v: unknown) => {
    setIsDirty(true);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const applyTemplate = useCallback((method: TemplateMethod) => {
    const tpl = method === "A3" ? applyA3Template() : applyPDCATemplate();
    setIsDirty(true);
    setForm((p) => ({
      ...p, title: tpl.title, background: tpl.background,
      problemStatement: tpl.problemStatement, currentCondition: tpl.currentCondition,
      targetCondition: tpl.targetCondition, rootCauseAnalysis: tpl.rootCauseAnalysis,
      countermeasures: tpl.countermeasures, implementationPlan: tpl.implementationPlan,
    }));
  }, []);

  const clearForm = useCallback(() => {
    setForm({
      title: "", background: "", problemStatement: "", currentCondition: "", targetCondition: "",
      rootCauseAnalysis: "", countermeasures: "", implementationPlan: "",
      targetType: "Plant", targetId: "", owner: "", priority: "MEDIUM", startDate: "", dueDate: "",
    });
    setErrors({}); setMutationError(null); setIsDirty(false);
  }, []);

  const loadForm = useCallback((item: A3Node) => {
    setForm({
      title: item.title, background: item.background,
      problemStatement: item.problemStatement, currentCondition: item.currentCondition,
      targetCondition: item.targetCondition, rootCauseAnalysis: item.rootCauseAnalysis,
      countermeasures: item.countermeasures, implementationPlan: item.implementationPlan,
      targetType: item.targetType || "Plant", targetId: String(item.targetId ?? ""),
      owner: item.owner, priority: item.priority || "MEDIUM",
      startDate: item.startDate || "", dueDate: item.dueDate || "",
    });
    setErrors({}); setMutationError(null); setIsDirty(false);
    setTemplateMethod(item.background?.includes("PDCA") ? "PDCA" : "A3");
  }, []);

  /* ── Mode transitions ── */
  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); setTemplateMethod("A3"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => {
    if (isDirty && mode === "edit") {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
  }, [sel, loadForm, clearForm, isDirty, mode]);

  /* ── Mutations ── */
  const hSave = useCallback(async () => {
    setMutationError(null);
    const errs: Record<string, string> = {};
    if (!form.title?.trim()) errs.title = "Required";
    if (!form.targetId?.trim()) errs.targetId = "Required";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (mode === "edit" && sel) {
      const vars: Record<string, unknown> = { id: sel.id };
      if (form.title !== sel.title) vars.title = form.title.trim();
      if (form.background !== sel.background) vars.background = form.background;
      if (form.problemStatement !== sel.problemStatement) vars.problemStatement = form.problemStatement;
      if (form.currentCondition !== sel.currentCondition) vars.currentCondition = form.currentCondition;
      if (form.targetCondition !== sel.targetCondition) vars.targetCondition = form.targetCondition;
      if (form.rootCauseAnalysis !== sel.rootCauseAnalysis) vars.rootCauseAnalysis = form.rootCauseAnalysis;
      if (form.countermeasures !== sel.countermeasures) vars.countermeasures = form.countermeasures;
      if (form.implementationPlan !== sel.implementationPlan) vars.implementationPlan = form.implementationPlan;
      if (form.owner !== sel.owner) vars.owner = form.owner;
      if (form.priority !== sel.priority) vars.priority = form.priority;
      const res = await updateA3Pdca({ variables: vars });
      if (res.error) { setMutationError(res.error?.message || "Save failed"); return; }
      setSuccessMsg("A3/PDCA updated"); setIsDirty(false); refetch(); setMode("view");
    } else {
      const res = await createA3Pdca({
        variables: {
          title: form.title.trim(), background: form.background,
          problemStatement: form.problemStatement, currentCondition: form.currentCondition,
          targetCondition: form.targetCondition, rootCauseAnalysis: form.rootCauseAnalysis,
          countermeasures: form.countermeasures, implementationPlan: form.implementationPlan,
          targetType: form.targetType, targetId: form.targetId ? parseInt(form.targetId) : null,
          owner: form.owner, priority: form.priority, sourceType: "MANUAL",
          startDate: form.startDate || null, dueDate: form.dueDate || null,
        },
      });
      if (res.error) { setMutationError(res.error?.message || "Create failed"); return; }
      setSuccessMsg("A3/PDCA created"); setIsDirty(false); refetch(); setMode("view");
    }
  }, [form, mode, sel, createA3Pdca, updateA3Pdca, refetch]);

  const hTransition = useCallback(async () => {
    if (!confirmTransition) return;
    setMutationError(null);
    let res;
    switch (confirmTransition.phase) {
      case "PLAN": res = await moveToPlan({ variables: { id: confirmTransition.id } }); break;
      case "DO": res = await moveToDo({ variables: { id: confirmTransition.id } }); break;
      case "CHECK": res = await moveToCheck({ variables: { id: confirmTransition.id } }); break;
      case "ACT": res = await moveToAct({ variables: { id: confirmTransition.id } }); break;
      case "COMPLETED": res = await completeA3Pdca({ variables: { id: confirmTransition.id } }); break;
      default: return;
    }
    if (res!.error) { setMutationError(res!.error?.message || "Transition failed"); setConfirmTransition(null); return; }
    setSuccessMsg(`Moved to ${phaseLabel(confirmTransition.phase)}`);
    setConfirmTransition(null); refetch();
  }, [confirmTransition, moveToPlan, moveToDo, moveToCheck, moveToAct, completeA3Pdca, refetch]);

  const hCancelA3 = useCallback(async () => {
    if (!confirmCancel) return;
    setMutationError(null);
    const res = await cancelA3Pdca({ variables: { id: confirmCancel } });
    if (res.error) { setMutationError(res.error?.message || "Cancel failed"); setConfirmCancel(null); return; }
    setSuccessMsg("A3/PDCA cancelled"); setConfirmCancel(null); refetch();
  }, [confirmCancel, cancelA3Pdca, refetch]);

  const hAddAction = useCallback(async () => {
    if (!sel || !newActionTitle.trim()) return;
    setMutationError(null);
    const res = await addA3Action({
      variables: {
        a3PdcaId: sel.id, title: newActionTitle.trim(), phase: newActionPhase,
        description: newActionDescription, owner: newActionOwner, dueDate: newActionDueDate || null,
      },
    });
    if (res.error) { setMutationError(res.error?.message || "Add action failed"); return; }
    setSuccessMsg("Action added");
    setNewActionTitle(""); setNewActionOwner(""); setNewActionDueDate(""); setNewActionDescription("");
    refetch();
  }, [sel, newActionTitle, newActionPhase, newActionDescription, newActionOwner, newActionDueDate, addA3Action, refetch]);

  const hCompleteAction = useCallback(async (actionId: number) => {
    setMutationError(null);
    const res = await completeA3Action({ variables: { id: actionId } });
    if (res.error) { setMutationError(res.error?.message || "Complete action failed"); return; }
    setSuccessMsg("Action completed"); refetch();
  }, [completeA3Action, refetch]);

  const hCancelAction = useCallback(async (actionId: number) => {
    setMutationError(null);
    const res = await cancelA3Action({ variables: { id: actionId } });
    if (res.error) { setMutationError(res.error?.message || "Cancel action failed"); return; }
    setSuccessMsg("Action cancelled"); refetch();
  }, [cancelA3Action, refetch]);

  const hPrint = useCallback(() => { window.print(); }, []);

  const nextPhase = (status: string): string | null => {
    const idx = PHASES.indexOf(status);
    if (idx === -1 || idx >= PHASES.length - 1) return null;
    return PHASES[idx + 1];
  };

  const iCls = `h-7 w-full bg-card border border-gray-300 text-foreground placeholder:text-muted-foreground px-2 text-sm outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
  const sCls = iCls;

  /* ── Render helpers ── */

  const renderRichField = (label: string, field: keyof FormState) => (
    <div>
      <p className={`text-[10px] font-medium ${theme.textMuted} mb-1`}>{label}</p>
      <RichTextEditor content={g(field)} onChange={(html) => sf(field, html)}
        placeholder={`Enter ${label.toLowerCase()}...`} />
    </div>
  );

  const renderHtmlBlock = (content: string, fallback: string = "Not defined") => (
    content ? (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm leading-snug"
        dangerouslySetInnerHTML={{ __html: content }} />
    ) : (
      <p className={`text-xs italic ${theme.textMuted}`}>{fallback}</p>
    )
  );

  const renderDocSection = (title: string, content: string, fallback?: string) => (
    <div className="border-t border-border/20">
      <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} px-2 py-1 bg-muted/30 flex items-center gap-1`}>
        <div className="w-0.5 h-2.5 bg-indigo-400/60 dark:bg-indigo-500/50 rounded-full shrink-0" />
        {title}
      </div>
      <div className="px-2 py-1.5">{renderHtmlBlock(content, fallback)}</div>
    </div>
  );

  const renderPhaseActions = (phase: string, actions: A3PDCAActionNode[] | undefined) => {
    const phaseActions = actions?.filter((a) => a.phase === phase) || [];
    return (
      <div className="border-t border-border/20">
        <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} px-2 py-1 bg-muted/30 border-b border-border/20 flex items-center gap-1`}>
          <div className="w-0.5 h-2.5 bg-indigo-400/60 dark:bg-indigo-500/50 rounded-full shrink-0" />
          <span>Actions</span>
          {phaseActions.length > 0 && <ActionProgressBar actions={phaseActions} />}
          <div className="ml-auto">
            <button type="button"
              onClick={() => { setNewActionPhase(phase); setNewActionTitle(""); setNewActionOwner(""); setNewActionDueDate(""); setNewActionDescription(""); }}
              className="inline-flex h-5 items-center gap-0.5 px-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors">
              <PlusCircle className="h-2.5 w-2.5 stroke-current" /> Add
            </button>
          </div>
        </div>
        <div className="px-2 py-1.5">
          {phaseActions.length === 0 && newActionPhase !== phase ? (
            <p className={`text-xs italic ${theme.textMuted}`}>No actions.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">{phaseActions.map((action) => (
              <div key={action.id} className={`group/action flex items-start gap-1.5 py-0.5 transition-colors hover:bg-muted/20 ${action.status === "DONE" ? "opacity-50" : ""}`}>
                <div className="mt-0.5 shrink-0">
                  {action.status === "DONE" ? (<CheckCircle className="h-3 w-3 text-green-500 stroke-current" />)
                    : action.status === "CANCELLED" ? (<Ban className="h-3 w-3 text-red-400 stroke-current" />)
                    : (<div className="h-3 w-3 rounded-full border-2 border-indigo-400 dark:border-indigo-500" />)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`min-w-0 text-xs font-medium ${action.status === "DONE" ? "line-through text-muted-foreground" : theme.textPrimary}`}>{action.title}</span>
                    <span className={`inline-flex items-center px-1 py-px text-[9px] font-semibold border shrink-0 ${ACTION_STATUS_STYLES[action.status] || ""}`}>
                      {action.status === "IN_PROGRESS" ? "Doing" : action.status.charAt(0) + action.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  {action.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    {action.owner && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-muted-foreground/40" />{action.owner}</span>}
                    {action.dueDate && (
                      <span className={`text-xs flex items-center gap-0.5 ${isOverdue(action.dueDate) && action.status !== "DONE" ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                        {isOverdue(action.dueDate) && action.status !== "DONE" && <AlertTriangle className="h-2 w-2 stroke-current" />}
                        {action.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/action:opacity-100 transition-opacity">
                  {action.status === "OPEN" && (
                    <button type="button" onClick={() => hCompleteAction(action.id)}
                      className="inline-flex h-5 w-5 items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Mark as done">
                      <Check className="h-3 w-3 stroke-current" />
                    </button>
                  )}
                  {(action.status === "OPEN" || action.status === "IN_PROGRESS") && (
                    <button type="button" onClick={() => hCancelAction(action.id)}
                      className="inline-flex h-5 w-5 items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Cancel action">
                      <Ban className="h-3 w-3 stroke-current" />
                    </button>
                  )}
                </div>
              </div>
            ))}</div>
          )}
          {newActionPhase === phase && (
            <div className="pt-1.5 border-t border-border/10 mt-1 space-y-1">
              <div className="flex items-center gap-1">
                <input type="text" value={newActionTitle} onChange={(e) => setNewActionTitle(e.target.value)}
                  placeholder="Title *" className="h-6 min-w-0 flex-1 rounded border border-border/40 bg-muted/50 px-1.5 text-xs outline-none text-foreground focus:border-indigo-400 transition-colors" />
                <input type="text" value={newActionOwner} onChange={(e) => setNewActionOwner(e.target.value)}
                  placeholder="Owner" className="h-6 w-16 rounded border border-border/40 bg-muted/50 px-1.5 text-xs outline-none text-foreground focus:border-indigo-400 transition-colors" />
                <input type="date" value={newActionDueDate} onChange={(e) => setNewActionDueDate(e.target.value)}
                  className="h-6 w-24 rounded border border-border/40 bg-muted/50 px-1.5 text-xs outline-none text-foreground focus:border-indigo-400 transition-colors" />
                <button type="button" onClick={hAddAction} disabled={!newActionTitle.trim()}
                  className={`inline-flex h-6 items-center gap-0.5 rounded px-2 text-[10px] font-semibold transition-all ${newActionTitle.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                  <Plus className="h-3 w-3 stroke-current" /> Add
                </button>
              </div>
              <input type="text" value={newActionDescription} onChange={(e) => setNewActionDescription(e.target.value)}
                placeholder="Description (optional)"
                className="h-5 w-full rounded border border-border/40 bg-muted/50 px-1.5 text-xs outline-none text-foreground focus:border-indigo-400 transition-colors" />
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Form content (shared by create and edit) ── */
  const renderForm = (isCreate: boolean) => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {mutationError && <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="text" value={g("title")} onChange={(e) => sf("title", e.target.value)} placeholder="Title *"
              className={`${iCls} flex-1`} />
            {errors.title && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.title}</p>}
            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold border ${templateMethod === "A3" ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800" : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"}`}>
              {templateMethod}
            </span>
          </div>
          <SectionCard title={`${templateMethod} — Problem Definition`}
            action={isCreate ? (
              <button type="button" onClick={() => applyTemplate(templateMethod)}
                className="inline-flex h-5 items-center gap-1 px-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors">
                <FileText className="h-3 w-3 stroke-current" /> Apply {templateMethod} Template
              </button>
            ) : undefined}>
            <div className="space-y-2">
              {renderRichField("Background", "background")}
              {renderRichField("Problem Statement", "problemStatement")}
            </div>
          </SectionCard>
          <SectionCard title="Current vs Target">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col h-full">{renderRichField("Current Condition", "currentCondition")}</div>
              <div className="flex flex-col h-full">{renderRichField("Target Condition", "targetCondition")}</div>
            </div>
          </SectionCard>
          {isCreate ? (
            <>
              <SectionCard title="Analysis">
                {renderRichField("Root Cause Analysis", "rootCauseAnalysis")}
              </SectionCard>
              <SectionCard title="Countermeasures">
                {renderRichField("Proposed Countermeasures", "countermeasures")}
                <div className="mt-2">{renderRichField("Implementation Plan", "implementationPlan")}</div>
              </SectionCard>
            </>
          ) : (
            <SectionCard title="Analysis & Countermeasures">
              {renderRichField("Root Cause Analysis", "rootCauseAnalysis")}
              <div className="mt-2">{renderRichField("Countermeasures", "countermeasures")}</div>
              <div className="mt-2">{renderRichField("Implementation Plan", "implementationPlan")}</div>
            </SectionCard>
          )}
          <SectionCard title="Target & Classification">
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <select value={g("targetType")} onChange={(e) => { sf("targetType", e.target.value); sf("targetId", ""); }} className={sCls}>
                  {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={g("priority")} onChange={(e) => sf("priority", e.target.value)} className={sCls}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <select value={g("targetId")} onChange={(e) => sf("targetId", e.target.value)} className={sCls}>
                <option value="">Select {form.targetType}...</option>
                {targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.targetId && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.targetId}</p>}
              {targetLabel && <p className={`text-xs ${theme.textMuted} mt-0.5`}>{targetLabel}</p>}
            </div>
          </SectionCard>
          <SectionCard title="Owner & Dates">
            <div className="grid grid-cols-3 gap-1.5">
              <input type="text" value={g("owner")} onChange={(e) => sf("owner", e.target.value)} placeholder="Owner" className={iCls} />
              <input type="date" value={g("startDate")} onChange={(e) => sf("startDate", e.target.value)} className={iCls} />
              <input type="date" value={g("dueDate")} onChange={(e) => sf("dueDate", e.target.value)} className={iCls} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );

  /* ── Main render ── */
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
          <PageHeader icon={<ClipboardList className="h-5 w-5 stroke-current" />}
            iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
            title="A3 / PDCA" subtitle="Advanced problem-solving and root-cause improvement cycles." />
        </div>
        <div className="print-ignore">
          <Toolbar
            left={isForm && mode === "create" ? (
              <div className="flex items-center gap-3">
                <MethodToggle value={templateMethod} onChange={(m) => { setTemplateMethod(m); applyTemplate(m); }} />
              </div>
            ) : isForm ? <div /> : (
              <div className="flex items-center gap-3">
                <ToolbarSearch value={search} onChange={setSearch} placeholder="Search A3/PDCA records..." />
                <ToolbarSelect value={filterStatus} onChange={setFilterStatus}
                  options={[
                    { value: "", label: "All Phases" }, { value: "DRAFT", label: "Draft" },
                    { value: "PLAN", label: "Plan" }, { value: "DO", label: "Do" },
                    { value: "CHECK", label: "Check" }, { value: "ACT", label: "Act" },
                    { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" },
                  ]}
                  className="w-40" />
              </div>
            )}
            right={<>
              {isForm ? (
                <><ToolbarButton icon={Check} label="Save" onClick={hSave} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={hCancel} /></>
              ) : (
                <><ToolbarButton icon={Plus} label="New" onClick={hNew} /><ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel} />
                  <span className="h-5 w-px shrink-0 bg-border/25" />
                  <ToolbarButton icon={Printer} label="Print" onClick={hPrint} disabled={!sel} />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
                </>
              )}
            </>}
          />
        </div>
        {mutationError && isForm && (
          <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>
        )}
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left panel — list */}
          <div className="print-ignore flex flex-col min-h-0 overflow-hidden bg-card/40 border-r border-border/20"
            style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 h-8 border-b border-border/50 flex items-center bg-muted px-4">
              <span className={`text-sm font-medium ${theme.textMuted}`}>A3 / PDCA</span>
              <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{records.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg}`}>
              {loading && records.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No A3/PDCA records</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Create one from a Kaizen or manually.</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-indigo-600/10 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-600/20 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> Create A3/PDCA</button>
                </div>
              ) : (
                <div>
                  {records.map((r) => {
                    const progress = actionProgress(r.actions);
                    return (
                      <div key={r.id}
                        onClick={() => {
                          if (isForm && isDirty && mode === "edit") {
                            if (!confirm("You have unsaved changes. Discard them?")) return;
                          }
                          setSelectedId(r.id); clearForm(); setIsDirty(false);
                          setNewActionTitle(""); setNewActionOwner(""); setNewActionDueDate(""); setNewActionDescription("");
                          setMode("view");
                        }}
                        className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${selectedId === r.id ? "bg-table-selected border-l-2 border-l-indigo-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                            <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{r.title}</span>
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PHASE_STYLES[r.status] || ""}`}>{phaseLabel(r.status)}</span>
                              {r.priority && r.priority !== "MEDIUM" && (
                                <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${PRIORITY_STYLES[r.priority] || ""}`}>{r.priority}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {r.owner && <span className={`text-xs ${theme.textMuted}`}>{r.owner}</span>}
                            {r.dueDate && (
                              <span className={`text-[10px] ${isOverdue(r.dueDate) && r.status !== "COMPLETED" ? "text-red-500 font-semibold" : theme.textMuted}`}>
                                {isOverdue(r.dueDate) && r.status !== "COMPLETED" && <AlertTriangle className="inline h-2 w-2 mr-px stroke-current" />}
                                Due: {r.dueDate}
                              </span>
                            )}
                            {progress.total > 0 && <ActionProgressBar actions={r.actions} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="shrink-0 flex h-8 items-center border-t border-border/50 bg-muted px-4">
              <span className={`text-xs ${theme.textMuted}`}>{records.length} record{records.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          {/* Divider */}
          <div onMouseDown={handleSplitMouseDown}
            className="print-ignore flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-indigo-500/10"
            style={{ width: 2 }} />
          {/* Right panel */}
          <div className={`print-area flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden ${isForm ? "" : "mode-enter"}`}>
            {!sel && !isForm ? (
              <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
                <div className="text-center max-w-xs">
                  <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>No A3/PDCA selected</h3>
                  <p className={`text-xs ${theme.textSecondary} leading-relaxed mb-4`}>Select a record from the list or create a new one.</p>
                  <button type="button" onClick={hNew}
                    className="inline-flex h-8 items-center gap-1.5 bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                    <Plus className="h-3.5 w-3.5 stroke-current" /> New A3/PDCA
                  </button>
                </div>
              </div>
            ) : isForm ? (
              renderForm(mode === "create")
            ) : sel && (
              /* ── VIEW MODE — Paper A3 Document Layout ── */
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-4xl mx-auto border-x border-b border-border/20 bg-card shadow-sm" style={{ maxWidth: "100%" }}>
                  {/* Document Header */}
                  <div className="border-b-2 border-indigo-200 dark:border-indigo-800 px-3 py-2.5 flex items-start gap-3 print-area-header">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className={`text-sm font-bold leading-tight ${theme.textPrimary}`}>{sel.title}</h2>
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PHASE_STYLES[sel.status] || ""}`}>{phaseLabel(sel.status)}</span>
                        {sel.priority && sel.priority !== "MEDIUM" && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority}</span>
                        )}
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">{templateMethod}</span>
                      </div>
                      <div className={`flex flex-wrap items-center gap-x-2 gap-y-0 text-xs ${theme.textMuted} leading-tight mt-0.5`}>
                        {sel.a3Code && <span className="font-mono font-semibold">{sel.a3Code}</span>}
                        {sel.owner && <span className="font-medium">{sel.owner}</span>}
                        {sel.sourceType && <span>Source: {sel.sourceType}</span>}
                        {sel.targetType && (
                          <span>{(() => {
                            const found = allEntities.find((e) => e.id === String(sel.targetId));
                            return found ? `${sel.targetType}: ${found.name}` : `${sel.targetType} #${sel.targetId}`;
                          })()}</span>
                        )}
                        {sel.startDate && <span>Start: {sel.startDate}</span>}
                        {sel.dueDate && <span className={isOverdue(sel.dueDate) && sel.status !== "COMPLETED" ? "text-red-500 font-semibold" : ""}>
                          {isOverdue(sel.dueDate) && sel.status !== "COMPLETED" && <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5 stroke-current" />}
                          Due: {sel.dueDate}
                        </span>}
                        {sel.completedDate && <span className="text-green-600 dark:text-green-400">Completed: {sel.completedDate}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {["COMPLETED", "CANCELLED"].includes(sel.status) ? (
                        <button type="button" onClick={hPrint}
                          className="inline-flex h-7 items-center gap-1 border border-border/40 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-border/70 transition-all whitespace-nowrap">
                          <Printer className="h-2.5 w-2.5 stroke-current" />
                        </button>
                      ) : (
                        <>
                          {nextPhase(sel.status) && (
                            <button type="button" onClick={() => setConfirmTransition({ id: sel.id, phase: nextPhase(sel.status)! })}
                              className={`inline-flex h-7 items-center gap-1 border px-2 text-[10px] font-semibold transition-all whitespace-nowrap ${sel.status === "DRAFT" ? "border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20" : "border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"}`}>
                              <ArrowRight className="h-2.5 w-2.5 stroke-current" />{phaseLabel(nextPhase(sel.status)!)}
                            </button>
                          )}
                          <button type="button" onClick={() => setConfirmCancel(sel.id)}
                            className="inline-flex h-7 items-center gap-1 border border-red-200 dark:border-red-800 px-2 text-[10px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap">
                            <XCircle className="h-2.5 w-2.5 stroke-current" />Cancel
                          </button>
                          <button type="button" onClick={hPrint}
                            className="inline-flex h-7 items-center gap-1 border border-border/40 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-border/70 transition-all whitespace-nowrap">
                            <Printer className="h-2.5 w-2.5 stroke-current" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Phase Progress Bar */}
                  <div className="flex items-center border-b border-border/20 bg-muted/20 px-3 py-1.5">
                    {PHASES.map((phase, idx) => {
                      const isActive = sel.status === phase;
                      const isPast = PHASES.indexOf(sel.status) >= idx && sel.status !== phase;
                      const isCancelled = sel.status === "CANCELLED";
                      return (
                        <div key={phase} className="flex items-center gap-0.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 transition-colors ${isActive ? (PHASE_STYLES[phase] || "") + " font-bold ring-1 ring-indigo-300/50 dark:ring-indigo-600/50" : isCancelled ? "text-muted-foreground line-through" : isPast ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "text-muted-foreground"}`}>
                        {isPast && !isCancelled ? "✓ " : ""}{phaseLabel(phase)}
                      </span>
                      {idx < PHASES.length - 1 && <span className={`text-[10px] mx-0.5 ${PHASES.indexOf(sel.status) > idx ? "text-green-400" : "text-muted-foreground/30"}`}>→</span>}
                        </div>
                      );
                    })}
                    {sel.actions && sel.actions.length > 0 && <div className="ml-auto"><ActionProgressBar actions={sel.actions} /></div>}
                  </div>

                  {/* Document Body — A3-style 2-Column Layout */}
                  <div className="grid grid-cols-[1fr_1fr] auto-rows-min divide-x divide-border/20">
                    <div className="divide-y divide-border/20">
                      {renderDocSection("1. Background", sel.background)}
                      {renderDocSection("2. Problem Statement", sel.problemStatement)}
                      {renderDocSection("3. Current Condition", sel.currentCondition)}
                      {renderDocSection("5. Root Cause Analysis", sel.rootCauseAnalysis)}
                    </div>
                    <div className="divide-y divide-border/20">
                      {renderDocSection("4. Target Condition", sel.targetCondition)}
                      {renderDocSection("6. Countermeasures", sel.countermeasures)}
                    </div>
                    <div className="col-span-full divide-y divide-border/20 border-t border-border/20">
                      {renderDocSection("7. Implementation Plan", sel.implementationPlan)}
                    </div>
                    {/* DO Section */}
                    <div className="divide-y divide-border/20 border-t border-border/20">
                      <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} px-2 py-1 bg-amber-50/50 dark:bg-amber-950/10 border-b border-border/20 flex items-center gap-1`}>
                        <div className="w-0.5 h-2.5 bg-amber-400/60 dark:bg-amber-500/50 rounded-full shrink-0" />
                        DO Phase
                      </div>
                      {renderDocSection("Notes", sel.doNotes)}
                      {renderDocSection("Blockers", sel.blockers)}
                      {renderPhaseActions("DO", sel.actions)}
                    </div>
                    {/* CHECK Section */}
                    <div className="divide-y divide-border/20 border-t border-border/20">
                      <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} px-2 py-1 bg-purple-50/50 dark:bg-purple-950/10 border-b border-border/20 flex items-center gap-1`}>
                        <div className="w-0.5 h-2.5 bg-purple-400/60 dark:bg-purple-500/50 rounded-full shrink-0" />
                        CHECK Phase
                      </div>
                      {renderDocSection("Result Validation", sel.resultValidation)}
                      {renderDocSection("Before/After", sel.beforeAfterComparison)}
                      {renderDocSection("Effectiveness", sel.effectivenessCheck)}
                      {renderPhaseActions("CHECK", sel.actions)}
                    </div>
                    {/* ACT — Full width */}
                    <div className="col-span-full border-t-2 border-border/30">
                      <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} px-2 py-1 bg-indigo-50/50 dark:bg-indigo-950/10 border-b border-border/20 flex items-center gap-1`}>
                        <div className="w-0.5 h-2.5 bg-indigo-400/60 dark:bg-indigo-500/50 rounded-full shrink-0" />
                        ACT Phase
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-border/20">
                        <div className="divide-y divide-border/20">
                          {renderDocSection("Standardization", sel.standardizationActions)}
                          {renderDocSection("Lessons Learned", sel.lessonsLearned)}
                        </div>
                        <div className="divide-y divide-border/20">
                          {renderDocSection("Follow-up Plan", sel.followUpPlan)}
                        </div>
                      </div>
                      {renderPhaseActions("ACT", sel.actions)}
                    </div>
                    {/* PLAN Actions — Full width */}
                    <div className="col-span-full divide-y divide-border/20 border-t border-border/20">
                      {renderPhaseActions("PLAN", sel.actions)}
                    </div>
                    {/* Result Summary */}
                    {sel.resultSummary && (
                      <div className="col-span-full border-t-2 border-green-200 dark:border-green-800">
                        <div className={`text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400 px-2 py-1 bg-green-50/50 dark:bg-green-950/10 border-b border-green-200/50 dark:border-green-800/50 flex items-center gap-1`}>
                          <CheckCircle className="h-2.5 w-2.5 stroke-current shrink-0" /> Result Summary
                        </div>
                        <div className="px-2 py-2">{renderHtmlBlock(sel.resultSummary)}</div>
                      </div>
                    )}
                    {sel.completedDate && (
                      <div className="col-span-full border-t border-border/20 px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-2.5 w-2.5 text-green-500 stroke-current" /> Completed on {sel.completedDate}
                      </div>
                    )}
                  </div>

                  {/* Document Footer */}
                  <div className="border-t border-border/20 bg-muted/20 px-2 py-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold">A3 / PDCA Report</span>
                    <span>Created: {sel.createdAt?.slice(0, 10) || "—"} · Updated: {sel.updatedAt?.slice(0, 10) || "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1.5">A3 / PDCA</span>
          <span className="flex-1" />
          {sel && (
            <>
              {sel.a3Code && <span className="font-mono text-[10px]">{sel.a3Code}</span>}
              <span>Created: {sel.createdAt?.slice(0, 10) || "—"}</span>
              <span>Updated: {sel.updatedAt?.slice(0, 10) || "—"}</span>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog open={confirmTransition !== null} onClose={() => setConfirmTransition(null)}
        onConfirm={hTransition} title={`Move to ${confirmTransition ? phaseLabel(confirmTransition.phase) : ""}`}
        message={`Advance this A3/PDCA to the ${confirmTransition ? phaseLabel(confirmTransition.phase) : ""} phase?`}
        confirmLabel="Move" />
      <ConfirmDialog open={confirmCancel !== null} onClose={() => setConfirmCancel(null)}
        onConfirm={hCancelA3} title="Cancel A3/PDCA"
        message="Cancel this A3/PDCA? This action cannot be undone." confirmLabel="Yes, Cancel" danger={true} />
    </>
  );
}
