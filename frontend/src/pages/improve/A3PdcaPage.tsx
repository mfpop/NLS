import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ClipboardList, Plus, Pencil, RefreshCw, X, Check, Printer,
  ArrowRight, FileText, Ban, CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { PageToolbar, ToolbarDropdown, ToolbarButton } from "@/components/layout/PageToolbar";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { applyA3Template, applyPDCATemplate } from "./generateA3Template";
import { useTargetEntities } from "@/hooks/useTargetEntities";
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
} from "@/graphql/improvementMutations";

/* ──────────────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────────────── */

const PHASE_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PLAN: "bg-primary/15 text-primary",
  DO: "bg-warning/15 text-warning",
  CHECK: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  ACT: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  COMPLETED: "bg-success/15 text-success",
  CANCELLED: "bg-danger/15 text-danger",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-primary/15 text-primary",
  HIGH: "bg-warning/15 text-warning",
  CRITICAL: "bg-danger/15 text-danger",
};

const ACTION_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-primary/15 text-primary",
  IN_PROGRESS: "bg-warning/15 text-warning",
  DONE: "bg-success/15 text-success",
  CANCELLED: "bg-danger/15 text-danger",
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

function FlatSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="min-w-0 w-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3.5 w-0.5 bg-indigo-400/50 rounded-full" />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-600/60 dark:text-indigo-400/60">{title}</span>
      </div>
      {content ? (
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none w-full min-w-0 text-sm leading-snug"
          dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <p className="text-xs italic text-muted-foreground">Not defined</p>
      )}
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
  

  // Unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Split pane
  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);

  const { targetOptions } = useTargetEntities(form.targetType);

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

  const hPrint = useCallback(() => { window.print(); }, []);

  const nextPhase = (status: string): string | null => {
    const idx = PHASES.indexOf(status);
    if (idx === -1 || idx >= PHASES.length - 1) return null;
    return PHASES[idx + 1];
  };

  const iCls = `h-7 w-full bg-card border border-gray-300 text-foreground placeholder:text-muted-foreground px-2 text-sm outline-none ${theme.textPrimary} transition-all ${theme.focusRing}`;
  const sCls = iCls;

  /* ── Render helpers ── */

  /* ── Form content (shared by create and edit) ── */
  const renderForm = (_isCreate: boolean) => {
    const richField = (label: string, field: keyof FormState) => (
      <div className="min-w-0 w-full">
        <p className={`text-[10px] font-medium ${theme.textMuted} mb-1`}>{label}</p>
        <RichTextEditor content={g(field)} onChange={(html) => sf(field, html)}
          placeholder={`Enter ${label.toLowerCase()}...`} />
      </div>
    );
    return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-hidden">
      {mutationError && <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>}
      <div className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden px-4 py-3">
        {errors.title && <p className={`text-[10px] ${theme.textCritical} mb-2`}>{errors.title}</p>}
        {/* Title row (always full-width) */}
        <div className="flex items-center gap-2 mb-4 w-full min-w-0">
          <input type="text" value={g("title")} onChange={(e) => sf("title", e.target.value)} placeholder="Title *"
            className={`${iCls} flex-1`} />
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold border shrink-0 ${templateMethod === "A3" ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800" : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"}`}>
            {templateMethod}
          </span>
          <button type="button" onClick={() => applyTemplate(templateMethod)}
            className="inline-flex h-6 items-center gap-1 px-2 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors rounded shrink-0">
            <FileText className="h-3 w-3 stroke-current" /> Template
          </button>
        </div>

        {/* Row 1: Background (left) + Metadata (right) — aligned bottoms */}
        <div className="grid grid-cols-[65%_35%] gap-5 min-w-0 w-full mb-4">
          <div className="min-w-0 w-full flex flex-col">
            <p className={`text-[10px] font-medium ${theme.textMuted} mb-1`}>Background</p>
            <div className="flex-1 min-h-0 border border-border/30 rounded-sm overflow-y-auto">
              <RichTextEditor content={g("background")} onChange={(html) => sf("background", html)}
                placeholder="Enter background..." />
            </div>
          </div>
          <div className="min-w-0 space-y-4 flex flex-col justify-between">
            <SectionCard title="Target & Classification">
              <div className="space-y-2">
                <select value={g("targetType")} onChange={(e) => { sf("targetType", e.target.value); sf("targetId", ""); }} className={sCls}>
                  {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={g("priority")} onChange={(e) => sf("priority", e.target.value)} className={sCls}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={g("targetId")} onChange={(e) => sf("targetId", e.target.value)} className={sCls}>
                  <option value="">Select {form.targetType}...</option>
                  {targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.targetId && <p className={`text-[10px] ${theme.textCritical} mt-0.5`}>{errors.targetId}</p>}
              </div>
            </SectionCard>
            <SectionCard title="Owner & Dates">
              <div className="space-y-2">
                <input type="text" value={g("owner")} onChange={(e) => sf("owner", e.target.value)} placeholder="Owner" className={iCls} />
                <input type="date" value={g("startDate")} onChange={(e) => sf("startDate", e.target.value)} className={iCls} />
                <input type="date" value={g("dueDate")} onChange={(e) => sf("dueDate", e.target.value)} className={iCls} />
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Problem Statement — full width */}
        <div className="mb-4 w-full min-w-0">
          {richField("Problem Statement", "problemStatement")}
        </div>

        {/* Current Condition | Target Condition — full width 2-col, equal height */}
        <div className="grid grid-cols-2 gap-4 mb-4 w-full min-w-0">
          <div className="flex flex-col min-w-0">
            <p className={`text-[10px] font-medium ${theme.textMuted} mb-1`}>Current Condition</p>
            <div className="flex-1"><RichTextEditor content={g("currentCondition")} onChange={(html) => sf("currentCondition", html)} placeholder="Enter current condition..." /></div>
          </div>
          <div className="flex flex-col min-w-0">
            <p className={`text-[10px] font-medium ${theme.textMuted} mb-1`}>Target Condition</p>
            <div className="flex-1"><RichTextEditor content={g("targetCondition")} onChange={(html) => sf("targetCondition", html)} placeholder="Enter target condition..." /></div>
          </div>
        </div>

        {/* Root Cause Analysis — full width */}
        <div className="mb-4 w-full min-w-0">
          {richField("Root Cause Analysis", "rootCauseAnalysis")}
        </div>

        {/* Countermeasures — full width */}
        <div className="mb-4 w-full min-w-0">
          {richField("Countermeasures", "countermeasures")}
        </div>

        {/* Implementation Plan — full width */}
        <div className="mb-4 w-full min-w-0">
          {richField("Implementation Plan", "implementationPlan")}
        </div>
      </div>
    </div>
    );
  };

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
          <PageToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search A3/PDCA..."
            filters={!isForm ? (
              <ToolbarDropdown value={filterStatus} onChange={setFilterStatus}
                options={[
                  { value: "", label: "All Phases" }, { value: "DRAFT", label: "Draft" },
                  { value: "PLAN", label: "Plan" }, { value: "DO", label: "Do" },
                  { value: "CHECK", label: "Check" }, { value: "ACT", label: "Act" },
                  { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" },
                ]}
                className="w-36" />
            ) : undefined}
            actions={
              <>
                {isForm && mode === "create" && (
                  <MethodToggle value={templateMethod} onChange={(m) => { setTemplateMethod(m); applyTemplate(m); }} />
                )}
                {isForm ? (
                  <><ToolbarButton icon={Check} label="Save" onClick={hSave} variant="edit" /><ToolbarButton icon={X} label="Cancel" onClick={hCancel} variant="danger" /></>
                ) : (
                  <><ToolbarButton icon={Plus} label="New" onClick={hNew} variant="create" /><ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} disabled={!sel} variant="edit" />
                    <span className="h-5 w-px shrink-0 bg-border/25" />
                    <ToolbarButton icon={Printer} label="Print" onClick={hPrint} disabled={!sel} />
                    <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
                  </>
                )}
              </>
            }
          />
        </div>
        {mutationError && isForm && (
          <div className="shrink-0 px-4 pt-2"><p className={`text-xs font-medium ${theme.textCritical}`}>{mutationError}</p></div>
        )}
        <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left panel — list */}
          <div className="print-ignore flex flex-col min-h-0 overflow-hidden bg-muted border-r border-border-major"
            style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
            <div className="shrink-0 h-8 border-b border-slate-200 flex items-center px-4">
              <span className={`text-sm font-medium ${theme.textMuted}`}>A3 / PDCA</span>
              <span className={`ml-auto text-[10px] ${theme.textMuted} font-mono`}>{records.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
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
            <div className="shrink-0 flex h-8 items-center border-t border-slate-200 bg-muted px-4">
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
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                <div className="p-4 space-y-5">
                  <SectionCard title="A3 / PDCA">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button type="button" onClick={() => setFilterStatus("")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-indigo-300/50 transition-colors">
                        <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Total</p>
                        <p className={`text-lg font-bold ${theme.textPrimary}`}>{records.length}</p>
                      </button>
                      <button type="button" onClick={() => setFilterStatus("")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-indigo-300/50 transition-colors">
                        <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Active</p>
                        <p className={`text-lg font-bold text-indigo-600 dark:text-indigo-400`}>{records.filter((r) => !["COMPLETED", "CANCELLED"].includes(r.status)).length}</p>
                      </button>
                      <button type="button" onClick={() => setFilterStatus("COMPLETED")} className="rounded-sm border border-border/60 bg-card p-3 text-left w-full cursor-pointer hover:bg-card/60 hover:border-indigo-300/50 transition-colors">
                        <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Completed</p>
                        <p className={`text-lg font-bold text-green-600 dark:text-green-400`}>{records.filter((r) => r.status === "COMPLETED").length}</p>
                      </button>
                      <div className="rounded-sm border border-border/60 bg-card p-3">
                        <p className={`text-xs font-medium ${theme.textMuted} truncate`}>Overdue</p>
                        <p className={`text-lg font-bold text-red-600 dark:text-red-400`}>{records.filter((r) => r.dueDate && isOverdue(r.dueDate) && r.status !== "COMPLETED").length}</p>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Phase Breakdown */}
                  <SectionCard title="Phase Breakdown">
                    {records.length === 0 ? (
                      <div className={`flex items-center justify-center h-16 text-xs italic ${theme.textMuted}`}>No A3/PDCA records yet.</div>
                    ) : (
                      <div className="space-y-2">{[{ phase: "DRAFT", label: "Draft", color: "bg-gray-400" }, { phase: "PLAN", label: "Plan", color: "bg-blue-500" }, { phase: "DO", label: "Do", color: "bg-yellow-500" }, { phase: "CHECK", label: "Check", color: "bg-purple-500" }, { phase: "ACT", label: "Act", color: "bg-indigo-500" }, { phase: "COMPLETED", label: "Completed", color: "bg-green-500" }, { phase: "CANCELLED", label: "Cancelled", color: "bg-gray-400" }].map((p) => {
                        const count = records.filter((r) => r.status === p.phase).length;
                        return (
                          <div key={p.phase}>
                            <div className="flex items-center justify-between"><span className={`text-xs ${theme.textPrimary}`}>{p.label}</span><span className={`text-xs font-semibold ${theme.textPrimary}`}>{count} <span className={`${theme.textMuted} font-normal`}>({records.length > 0 ? Math.round(count / records.length * 100) : 0}%)</span></span></div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1"><div className={`h-full rounded-full ${p.color}`} style={{ width: `${records.length > 0 ? (count / records.length) * 100 : 0}%` }} /></div>
                          </div>
                        );
                      })}</div>
                    )}
                  </SectionCard>

                  <div className="flex justify-center pt-2">
                    <button type="button" onClick={hNew}
                      className="inline-flex h-8 items-center gap-1.5 bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                      <Plus className="h-3.5 w-3.5 stroke-current" /> New A3/PDCA
                    </button>
                  </div>
                </div>
              </div>
            ) : isForm ? (
              renderForm(mode === "create")
            ) : sel && (
              /* ── VIEW MODE — App View ── */
              <div className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden">
                {/* Header */}
                <div className="shrink-0 px-4 py-2.5 flex items-start gap-3 border-b border-border/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-foreground">{sel.title}</h2>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PHASE_STYLES[sel.status] || ""}`}>{phaseLabel(sel.status)}</span>
                      {sel.priority && sel.priority !== "MEDIUM" && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground mt-0.5">
                      {sel.a3Code && <span className="font-mono">{sel.a3Code}</span>}
                      {sel.owner && <span>{sel.owner}</span>}
                      {sel.targetType && <span>{sel.targetType} #{sel.targetId}</span>}
                      {sel.startDate && <span>Start: {sel.startDate}</span>}
                      {sel.dueDate && (
                        <span className={isOverdue(sel.dueDate) && sel.status !== "COMPLETED" ? "text-red-500 font-semibold" : ""}>
                          {isOverdue(sel.dueDate) && sel.status !== "COMPLETED" && <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5 stroke-current" />}
                          Due: {sel.dueDate}
                        </span>
                      )}
                      {sel.completedDate && <span className="text-green-600">Completed: {sel.completedDate}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {nextPhase(sel.status) && !["COMPLETED", "CANCELLED"].includes(sel.status) && (
                      <button type="button" onClick={() => setConfirmTransition({ id: sel.id, phase: nextPhase(sel.status)! })}
                        className="inline-flex h-7 items-center gap-1 border border-green-200 dark:border-green-800 px-2 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all whitespace-nowrap">
                        <ArrowRight className="h-2.5 w-2.5 stroke-current" />{phaseLabel(nextPhase(sel.status)!)}
                      </button>
                    )}
                    <button type="button" onClick={hPrint}
                      className="inline-flex h-7 items-center gap-1 border border-border/40 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all whitespace-nowrap">
                      <Printer className="h-2.5 w-2.5 stroke-current" />
                    </button>
                  </div>
                </div>

                {/* Phase stepper */}
                <div className="flex items-center px-4 py-1.5 border-b border-border/20 bg-muted/20">
                  {PHASES.map((phase, idx) => {
                    const isActive = sel.status === phase;
                    const isPast = PHASES.indexOf(sel.status) >= idx && sel.status !== phase;
                    const isCancelled = sel.status === "CANCELLED";
                    return (
                      <div key={phase} className="flex items-center gap-0.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 ${isActive ? (PHASE_STYLES[phase] || "") + " font-bold ring-1 ring-indigo-300/50" : isCancelled ? "text-muted-foreground line-through" : isPast ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "text-muted-foreground"}`}>
                          {isPast && !isCancelled ? "✓ " : ""}{phaseLabel(phase)}
                        </span>
                        {idx < PHASES.length - 1 && <span className={`text-[10px] mx-0.5 ${PHASES.indexOf(sel.status) > idx ? "text-green-400" : "text-muted-foreground/30"}`}>→</span>}
                      </div>
                    );
                  })}
                  <div className="ml-auto"><ActionProgressBar actions={sel.actions} /></div>
                </div>

                {/* Body — flat 60/40 layout */}
                <div className="p-4 w-full min-w-0">
                  <div className="grid grid-cols-[3fr_2fr] gap-6 w-full min-w-0">
                    {/* Left column */}
                    <div className="space-y-5">
                      <FlatSection title="Background" content={sel.background} />
                      <FlatSection title="Problem Statement" content={sel.problemStatement} />
                      <FlatSection title="Current Condition" content={sel.currentCondition} />
                      <FlatSection title="Root Cause Analysis" content={sel.rootCauseAnalysis} />
                      <FlatSection title="Implementation Plan" content={sel.implementationPlan} />
                    </div>
                    {/* Right column */}
                    <div className="space-y-5">
                      <FlatSection title="Target Condition" content={sel.targetCondition} />
                      <FlatSection title="Countermeasures" content={sel.countermeasures} />
                      <FlatSection title="Result Validation" content={sel.resultValidation} />
                      <FlatSection title="Before / After" content={sel.beforeAfterComparison} />
                      <FlatSection title="Effectiveness Check" content={sel.effectivenessCheck} />
                      <FlatSection title="Follow-up Plan" content={sel.followUpPlan} />
                    </div>
                  </div>

                  {/* Full-width sections */}
                  <div className="mt-6 space-y-5">
                    <FlatSection title="Do — Notes" content={sel.doNotes} />
                    <FlatSection title="Blockers" content={sel.blockers} />
                    <FlatSection title="Standardization Actions" content={sel.standardizationActions} />
                    <FlatSection title="Lessons Learned" content={sel.lessonsLearned} />
                    {sel.resultSummary && <FlatSection title="Result Summary" content={sel.resultSummary} />}
                  </div>

                  {/* PDCA Actions */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-4 w-0.5 bg-indigo-400/60 rounded-full" />
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-600/70 dark:text-indigo-400/70">PDCA Actions</span>
                    </div>
                    {sel.actions && sel.actions.length > 0 ? (
                      <div className="space-y-1">
                        {sel.actions.map((action) => (
                          <div key={action.id} className="flex items-center gap-2 px-3 py-1.5 border border-border/30 bg-card text-sm">
                            <div className="shrink-0">
                              {action.status === "DONE" ? <CheckCircle className="h-3.5 w-3.5 text-green-500 stroke-current" />
                                : action.status === "CANCELLED" ? <Ban className="h-3.5 w-3.5 text-red-400 stroke-current" />
                                : <div className="h-3.5 w-3.5 rounded-full border-2 border-indigo-400" />}
                            </div>
                            <span className="min-w-0 flex-1 truncate font-medium text-foreground">{action.title}</span>
                            {action.owner && <span className="text-xs text-muted-foreground">{action.owner}</span>}
                            {action.dueDate && (
                              <span className={`text-xs ${isOverdue(action.dueDate) && action.status !== "DONE" ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                                {isOverdue(action.dueDate) && action.status !== "DONE" && <AlertTriangle className="inline h-2 w-2 mr-0.5 stroke-current" />}
                                {action.dueDate}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${ACTION_STATUS_STYLES[action.status] || ""}`}>
                              {action.status === "IN_PROGRESS" ? "Doing" : action.status.charAt(0) + action.status.slice(1).toLowerCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">No actions yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="print-ignore shrink-0 border-t border-border-major bg-muted flex h-10 items-center gap-5 px-4 text-xs text-muted-foreground font-medium">
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
