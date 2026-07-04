import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarClock, Plus, RefreshCw, Play, Pause, Archive,
  Calendar, Target, User, AlertTriangle, CheckCircle, FileText,
  Save, XCircle, ClipboardList, Wrench, Pencil,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { PageToolbar, ToolbarDropdown, ToolbarButton } from "@/components/layout/PageToolbar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PM_PLANS_QUERY, DUE_PM_QUERY, WORK_ORDERS_QUERY } from "@/graphql/maintenanceQueries";
import { PmDashboard } from "./pm/PmDashboard";
import {
  mockPmPlans,
  mockDuePmPlans,
  mockMaintenanceWorkOrders,
} from "@/demo/maintenanceMockData";
import {
  CREATE_PM_MUTATION, UPDATE_PM_MUTATION,
  ACTIVATE_PM_MUTATION, PAUSE_PM_MUTATION, ARCHIVE_PM_MUTATION, GENERATE_WO_FROM_PM_MUTATION,
} from "@/graphql/maintenanceMutations";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/manufacturingQueries";
import { useActiveLine } from "@/hooks/useActiveLine";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
];

const FREQ_OPTIONS = [
  { value: "", label: "All Frequencies" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "USAGE_BASED", label: "Usage Based" },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const FREQ_CREATE_OPTIONS = FREQ_OPTIONS.filter((o) => o.value !== "");

const TARGET_TYPE_OPTIONS = [
  { value: "PLANT", label: "Plant" },
  { value: "PRODUCTION_LINE", label: "Production Line" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "RESOURCE_GROUP", label: "Resource Group" },
  { value: "RESOURCE", label: "Resource" },
];

interface PMPlan {
  id: number; code: string; title: string; description: string;
  targetType: string; targetId: number | null; frequency: string;
  intervalValue: number | null; nextDueDate: string | null;
  lastCompletedDate: string | null; assignedTo: string;
  priority: string; status: string; checklistJson: string | null;
  notes: string;
}

interface ChecklistItem {
  id: string;
  task: string;
  required: boolean;
  instructions: string;
}

function freqLabel(f: string): string {
  const m: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Yearly", USAGE_BASED: "Usage Based" };
  return m[f] || f;
}

function statusLabel(s: string): string {
  const m: Record<string, string> = { ACTIVE: "Active", PAUSED: "Paused", ARCHIVED: "Archived" };
  return m[s] || s;
}

function cls(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}

function Fld({ label, children, required, error }: { label: string; children: React.ReactNode; required?: boolean; error?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-danger mt-0.5">{error}</p>}
    </div>
  );
}

const inpCls = "h-8 w-full bg-background/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2.5 text-sm text-foreground outline-none focus:border-purple-500 transition-colors placeholder:text-muted-foreground/40";
const selCls = inpCls + " appearance-none";

function TargetSelector({
  targetType, setTargetType,
  targetId, setTargetId,
  disabled,
}: {
  targetType: string; setTargetType: (v: string) => void;
  targetId: number | null; setTargetId: (v: number | null) => void;
  disabled?: boolean;
}) {
  const { activePlantId } = useActiveLine();
  const { data: plants } = useQuery(PLANTS_QUERY, { errorPolicy: "all" });
  const plantList: { id: string; name: string }[] = (plants as any)?.plants || [];
  const { data: lines } = useQuery(PRODUCTION_LINES_QUERY, {
    variables: { plantId: activePlantId ? String(activePlantId) : undefined },
    skip: !activePlantId,
    errorPolicy: "all",
  });
  const lineList: { id: string; name: string }[] = (lines as any)?.productionLines || [];
  const baseCls = "h-8 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 text-xs text-foreground outline-none focus:border-purple-500 transition-colors disabled:opacity-40";

  return (
    <div className="space-y-2">
      <Fld label="Target Type" required>
        <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setTargetId(null); }}
          disabled={disabled} className={selCls}>
          <option value="">Select target type...</option>
          {TARGET_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Fld>
      {targetType === "PLANT" && (
        <Fld label="Plant" required>
          <select value={targetId ?? ""} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled} className={baseCls}>
            <option value="">Select plant...</option>
            {plantList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Fld>
      )}
      {targetType === "PRODUCTION_LINE" && (
        <Fld label="Production Line" required>
          <select value={targetId ?? ""} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled || !activePlantId} className={baseCls}>
            <option value="">Select line...</option>
            {lineList.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Fld>
      )}
      {(targetType === "DEPARTMENT" || targetType === "RESOURCE_GROUP" || targetType === "RESOURCE") && (
        <Fld label="Target ID">
          <input type="number" value={targetId ?? ""} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled} className={inpCls} placeholder={`Enter ${targetType.toLowerCase()} ID...`} />
        </Fld>
      )}
    </div>
  );
}

export function PreventiveMaintenancePage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFreq, setFilterFreq] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [selId, setSelId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [view, setView] = useState<"dashboard" | "detail" | "form">("dashboard");
  const [editMode, setEditMode] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);

  // ── Read initial filter from URL params ──
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam === "OVERDUE") {
      setFilterStatus("ACTIVE");
      // Filter overdue PMs (nextDueDate < today) is handled client-side in the list
    } else if (statusParam === "DUE_THIS_WEEK") {
      setFilterStatus("ACTIVE");
    } else if (statusParam) {
      setFilterStatus(statusParam);
    }
  }, []); // only on mount

  const msg = (m: string) => { setSuccessMsg(m); setErrorMsg(""); setTimeout(() => setSuccessMsg(""), 4000); };
  const err = (m: string) => { setErrorMsg(m); setSuccessMsg(""); setTimeout(() => setErrorMsg(""), 6000); };

  const { data, loading, refetch } = useQuery(PM_PLANS_QUERY, {
    variables: {
      search: search || undefined,
      status: filterStatus || undefined,
      frequency: filterFreq || undefined,
      priority: filterPriority || undefined,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const { data: dueData } = useQuery(DUE_PM_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });

  const [createPM] = useMutation(CREATE_PM_MUTATION, { refetchQueries: [{ query: PM_PLANS_QUERY }, { query: DUE_PM_QUERY }] });
  const [updatePM] = useMutation(UPDATE_PM_MUTATION);
  const [activatePM] = useMutation(ACTIVATE_PM_MUTATION);
  const [pausePM] = useMutation(PAUSE_PM_MUTATION);
  const [archivePM] = useMutation(ARCHIVE_PM_MUTATION);
  const [generateWO] = useMutation(GENERATE_WO_FROM_PM_MUTATION, { refetchQueries: [{ query: WORK_ORDERS_QUERY }] });

  const plans: PMPlan[] = (data as any)?.preventiveMaintenancePlans ?? mockPmPlans.preventiveMaintenancePlans;
  const duePlans: PMPlan[] = (dueData as any)?.duePreventiveMaintenance ?? mockDuePmPlans.duePreventiveMaintenance;

  const sel = useMemo(() => {
    if (!selId) return null;
    return plans.find((p) => p.id === selId) ?? null;
  }, [selId, plans]);

  const { data: linkedWOsData } = useQuery(WORK_ORDERS_QUERY, {
    variables: { search: sel?.code || undefined },
    skip: !selId || !sel,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const linkedWOs: any[] = (linkedWOsData as any)?.maintenanceWorkOrders ?? mockMaintenanceWorkOrders.maintenanceWorkOrders;

  const [form, setForm] = useState({
    title: "",
    description: "",
    targetType: "RESOURCE",
    targetId: null as number | null,
    frequency: "WEEKLY",
    intervalValue: "",
    nextDueDate: "",
    assignedTo: "",
    priority: "MEDIUM",
    notes: "",
    checklistItems: [] as ChecklistItem[],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const hNew = useCallback(() => {
    setForm({
      title: "", description: "", targetType: "RESOURCE", targetId: null,
      frequency: "WEEKLY", intervalValue: "", nextDueDate: "",
      assignedTo: "", priority: "MEDIUM", notes: "", checklistItems: [],
    });
    setFormErrors({});
    setEditMode(false);
    setView("form");
  }, []);

  const hEdit = useCallback(() => {
    if (!sel) return;
    let checklist: ChecklistItem[] = [];
    try {
      if (sel.checklistJson) checklist = JSON.parse(sel.checklistJson);
    } catch {}
    setForm({
      title: sel.title,
      description: sel.description,
      targetType: sel.targetType,
      targetId: sel.targetId,
      frequency: sel.frequency,
      intervalValue: sel.intervalValue?.toString() || "",
      nextDueDate: sel.nextDueDate?.slice(0, 10) || "",
      assignedTo: sel.assignedTo,
      priority: sel.priority,
      notes: sel.notes || "",
      checklistItems: checklist,
    });
    setFormErrors({});
    setEditMode(true);
    setView("form");
  }, [sel]);

  const hCancelForm = useCallback(() => {
    setView("detail");
    setEditMode(false);
  }, []);

  const validateForm = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.frequency) e.frequency = "Required";
    if (!form.targetType) e.targetType = "Required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const hSave = useCallback(async () => {
    if (!validateForm()) return;
    try {
      const checklistJson = form.checklistItems.length > 0 ? JSON.stringify(form.checklistItems) : undefined;
      if (editMode && sel) {
        await updatePM({
          variables: {
            id: sel.id,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            frequency: form.frequency,
            intervalValue: form.intervalValue ? Number(form.intervalValue) : undefined,
            assignedTo: form.assignedTo.trim() || undefined,
            priority: form.priority,
            notes: form.notes.trim() || undefined,
            targetType: form.targetType,
            targetId: form.targetId,
            nextDueDate: form.nextDueDate || undefined,
            checklistJson,
          },
        });
        msg("PM plan updated");
      } else {
        await createPM({
          variables: {
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            frequency: form.frequency,
            targetType: form.targetType,
            targetId: form.targetId,
            intervalValue: form.intervalValue ? Number(form.intervalValue) : undefined,
            nextDueDate: form.nextDueDate || undefined,
            assignedTo: form.assignedTo.trim() || undefined,
            priority: form.priority,
            notes: form.notes.trim() || undefined,
            checklistJson,
          },
        });
        msg("PM plan created");
      }
      setFormErrors({});
      setView("detail");
      setEditMode(false);
      refetch();
    } catch (e: any) {
      err(e.message || "Save failed");
    }
  }, [form, editMode, sel, validateForm, createPM, updatePM, refetch]);

  const doAction = useCallback(async (action: string, id: number) => {
    try {
      let m = "";
      if (action === "activate") { await activatePM({ variables: { id } }); m = "PM plan activated"; }
      else if (action === "pause") { await pausePM({ variables: { id } }); m = "PM plan paused"; }
      else if (action === "archive") { await archivePM({ variables: { id } }); m = "PM plan archived"; }
      else if (action === "generate") { await generateWO({ variables: { id } }); m = "Work order generated from PM"; }
      setConfirmAction(null);
      msg(m);
      refetch();
    } catch (e: any) {
      err(e.message || "Action failed");
    }
  }, [activatePM, pausePM, archivePM, generateWO, refetch]);

  const addChecklistItem = useCallback(() => {
    setForm((f) => ({
      ...f,
      checklistItems: [...f.checklistItems, { id: crypto.randomUUID(), task: "", required: false, instructions: "" }],
    }));
  }, []);

  const removeChecklistItem = useCallback((id: string) => {
    setForm((f) => ({ ...f, checklistItems: f.checklistItems.filter((i) => i.id !== id) }));
  }, []);

  const updateChecklistItem = useCallback((id: string, field: keyof ChecklistItem, value: string | boolean) => {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    }));
  }, []);

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-success/15 text-success border-success/20 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
    PAUSED: "bg-warning/15 text-warning border-warning/20 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    ARCHIVED: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  };

  const priorityStyles: Record<string, string> = {
    LOW: "text-gray-500", MEDIUM: "text-primary", HIGH: "text-warning", CRITICAL: "text-danger",
  };

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (d: string | null) => d && d <= today;

  const canActivate = sel && (sel.status === "PAUSED" || sel.status === "ARCHIVED");
  const canPause = sel?.status === "ACTIVE";
  const canArchive = sel?.status === "ACTIVE" || sel?.status === "PAUSED";
  const canGenerate = sel?.status === "ACTIVE";
  const canEdit = sel?.status === "ACTIVE" || sel?.status === "PAUSED";

  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { setLeftPct(Math.min(Math.max(((ev.clientX - rect.left) / rect.width) * 100, 20), 55)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);

  // ── Dashboard ──
  const renderDashboard = () => (
    <PmDashboard
      plans={plans}
      duePlans={duePlans}
      onNavigateView={(v) => setView(v)}
      onNavigateTo={(path) => navigate(path)}
    />
  );

  const renderForm = () => (
    <div className="flex flex-1 min-h-0">
      <div className="w-[25%] min-w-[200px] border-r border-border bg-card/30 overflow-y-auto p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> Plan Info
        </p>
        {editMode && sel && (
          <Fld label="PM Code"><p className="text-sm font-mono text-foreground">{sel.code}</p></Fld>
        )}
        <Fld label="Status">
          <p className="text-sm font-semibold text-foreground">
            {editMode && sel ? statusLabel(sel.status) : "New Plan"}
          </p>
        </Fld>
        <Fld label="Frequency" required error={formErrors.frequency}>
          <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={selCls}>
            {FREQ_CREATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Fld>
        <Fld label="Interval (days)">
          <input type="number" value={form.intervalValue} onChange={(e) => setForm({ ...form, intervalValue: e.target.value })}
            className={inpCls} placeholder="e.g. 7" min="1" />
        </Fld>
        <Fld label="Priority" required>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selCls}>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Fld>
        <Fld label="Next Due Date">
          <input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} className={inpCls} />
        </Fld>
        <Fld label="Assigned To">
          <input type="text" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            className={inpCls} placeholder="Technician name" />
        </Fld>

        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 flex items-center gap-1.5">
          <Target className="h-3 w-3" /> Target
        </p>
        <TargetSelector
          targetType={form.targetType} setTargetType={(v) => setForm({ ...form, targetType: v, targetId: null })}
          targetId={form.targetId} setTargetId={(v) => setForm({ ...form, targetId: v })}          disabled={editMode}        />
        </div>
        
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> Task Details & Safety
        </p>
        <Fld label="Title" required error={formErrors.title}>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inpCls} placeholder="e.g. Weekly conveyor inspection" />
        </Fld>
        <Fld label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="h-20 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-purple-500 placeholder:text-muted-foreground/40"
            placeholder="Describe the maintenance plan..." />
        </Fld>
        <Fld label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="h-20 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-purple-500"
            placeholder="Additional notes, safety precautions, references..." />
        </Fld>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist Items</p>
            <button type="button" onClick={addChecklistItem}
              className="inline-flex h-6 items-center gap-1 bg-purple-600/10 px-2 text-[10px] font-semibold text-accent-foreground hover:bg-purple-600/20 dark:text-purple-400 transition-colors">
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>
          {form.checklistItems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No checklist items. Add tasks to standardize this PM.</p>
          ) : (
            <div className="space-y-2">
              {form.checklistItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/30 bg-card/40 p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input type="text" value={item.task} onChange={(e) => updateChecklistItem(item.id, "task", e.target.value)}
                        className="h-7 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 text-xs outline-none focus:border-purple-500"
                        placeholder="Task description..." />
                      <input type="text" value={item.instructions} onChange={(e) => updateChecklistItem(item.id, "instructions", e.target.value)}
                        className="h-7 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 text-xs outline-none focus:border-purple-500"
                        placeholder="Instructions / notes..." />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pt-1">
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={item.required} onChange={(e) => updateChecklistItem(item.id, "required", e.target.checked)}
                          className="h-3 w-3 accent-purple-600" />
                        Req
                      </label>
                      <button type="button" onClick={() => removeChecklistItem(item.id)}
                        className="flex h-5 w-5 items-center justify-center text-danger/80 hover:text-danger hover:bg-danger/10 dark:hover:bg-red-950/30 transition-colors">
                        <XCircle className="h-3 w-3 stroke-current" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!sel) return null;
    let checklist: ChecklistItem[] = [];
    try { if (sel.checklistJson) checklist = JSON.parse(sel.checklistJson); } catch {}

    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="sticky top-0 bg-card z-10 border-b border-border px-5 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground truncate">{sel.title}</h2>
                <span className={cls("inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border", statusColors[sel.status])}>
                  {statusLabel(sel.status)}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${priorityStyles[sel.priority] || "text-muted-foreground"}`}>
                  {sel.priority}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-mono">{sel.code}</span>
                <span className="mx-1.5">·</span>
                {freqLabel(sel.frequency)}{sel.intervalValue ? ` (every ${sel.intervalValue} days)` : ""}
                <span className="mx-1.5">·</span>
                {sel.targetType} {sel.targetId ? `#${sel.targetId}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0" style={{ height: "calc(100% - 57px)" }}>
          {/* Left 65%: Summary, Tasks, Schedule, History */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-5" style={{ flexBasis: "65%" }}>
            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Plan Summary</h3>
              <p className="text-sm text-foreground">{sel.description || <span className="italic text-muted-foreground/60">No description</span>}</p>
            </div>

            {/* Schedule */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 stroke-current" /> Schedule
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className={cls("border p-3", isOverdue(sel.nextDueDate) && sel.status === "ACTIVE" ? "border-danger/20 bg-danger/10 dark:border-red-900/30 dark:bg-red-950/20" : "border-border/30 bg-card/50")}>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Next Due</p>
                  <p className={cls("mt-1 text-lg font-bold", isOverdue(sel.nextDueDate) && sel.status === "ACTIVE" ? "text-danger" : "text-foreground")}>
                    {sel.nextDueDate?.slice(0, 10) || "—"}
                  </p>
                  {sel.nextDueDate && isOverdue(sel.nextDueDate) && sel.status === "ACTIVE" && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-danger">
                      <AlertTriangle className="h-3 w-3 stroke-current" /> Overdue
                    </p>
                  )}
                </div>
                <div className="border border-border/30 bg-card/50 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Last Completed</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{sel.lastCompletedDate?.slice(0, 10) || "—"}</p>
                  {sel.lastCompletedDate && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-success">
                      <CheckCircle className="h-3 w-3 stroke-current" /> Completed
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist / Task Steps */}
            {checklist.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 stroke-current" /> Task Steps ({checklist.length})
                </h3>
                <div className="space-y-1.5">
                  {checklist.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-start gap-2.5 border border-border/30 bg-card/40 px-3 py-2">
                      <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[9px] font-bold text-accent-foreground dark:bg-purple-900/40 dark:text-purple-300">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{item.task}</p>
                        {item.instructions && <p className="text-xs text-muted-foreground mt-0.5">{item.instructions}</p>}
                      </div>
                      {item.required && (
                        <span className="shrink-0 text-[9px] font-semibold text-danger uppercase">Required</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {sel.notes && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes / Safety</h3>
                <div className="border border-border/30 bg-card/50 p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{sel.notes}</p>
                </div>
              </div>
            )}

            {/* History (placeholder for now) */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">History</h3>
              <p className="text-xs text-muted-foreground italic">Completion history will show here as PMs are completed.</p>
            </div>
          </div>

          {/* Right 35%: Status, Target, Frequency, Technician, Linked WOs */}
          <div className="border-l border-border bg-card/20 p-5 space-y-5" style={{ flexBasis: "35%", minWidth: 240 }}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Details</h3>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
                  <span className={cls("mt-0.5 inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold border", statusColors[sel.status])}>
                    {statusLabel(sel.status)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Target</p>
                  <p className="text-sm font-medium text-foreground">{sel.targetType} {sel.targetId ? `#${sel.targetId}` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Frequency</p>
                  <p className="text-sm font-medium text-foreground">{freqLabel(sel.frequency)}{sel.intervalValue ? ` (every ${sel.intervalValue}d)` : ""}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Technician</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1">
                    <User className="h-3 w-3 stroke-current text-muted-foreground" />
                    {sel.assignedTo || <span className="italic text-muted-foreground/60">Unassigned</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Next Due</p>
                  <p className={cls("text-sm font-bold", isOverdue(sel.nextDueDate) && sel.status === "ACTIVE" ? "text-danger" : "text-foreground")}>
                    {sel.nextDueDate?.slice(0, 10) || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Linked Work Orders */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 stroke-current" /> Linked WOs
              </h3>
              {linkedWOs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No linked work orders</p>
              ) : (
                <div className="space-y-1">
                  {linkedWOs.map((wo: any) => (
                    <div key={wo.id} className="flex items-center gap-2 border border-border/30 bg-card/40 px-2 py-1.5 text-xs">
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        wo.status === "COMPLETED" ? "bg-success/100" :
                        wo.status === "IN_PROGRESS" ? "bg-warning/100" :
                        wo.status === "CANCELLED" ? "bg-muted-foreground/40" : "bg-primary/100"
                      }`} />
                      <span className="font-mono text-muted-foreground shrink-0">{wo.number}</span>
                      <span className="font-semibold text-foreground flex-1 min-w-0 truncate">{wo.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {(successMsg || errorMsg) && (
        <div className={cls(
          "shrink-0 h-8 flex items-center justify-center text-sm font-semibold border-b",
          errorMsg
            ? "bg-danger/10 text-danger border-danger/20 dark:bg-red-950/30 dark:text-red-300"
            : "bg-success/10 text-success border-success/20 dark:bg-green-950/30 dark:text-green-300",
        )}>
          {errorMsg ? <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
          {errorMsg || successMsg}
        </div>
      )}
      <PageHeader
        icon={<CalendarClock className="h-5 w-5 stroke-current" />}
        iconClass="bg-accent/15 text-accent-foreground dark:bg-purple-900/40 dark:text-purple-400"
        title="Preventive Maintenance"
        subtitle="Schedule and manage preventive maintenance plans — TPM framework"
      >
        {duePlans.length > 0 && (
          <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-1 text-[10px] font-semibold text-danger dark:bg-red-900/30 dark:text-danger/80">
            <AlertTriangle className="h-3 w-3 stroke-current" />
            {duePlans.length} due
          </span>
        )}
      </PageHeader>
      <div className="print-ignore">
        <PageToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search PM plans..."
          filters={view !== "dashboard" && view !== "form" ? (
            <>
              <ToolbarDropdown value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} className="w-28" />
              <ToolbarDropdown value={filterFreq} onChange={setFilterFreq} options={FREQ_OPTIONS} className="w-32" />
              <ToolbarDropdown value={filterPriority} onChange={setFilterPriority} options={PRIORITY_FILTER_OPTIONS} className="w-28" />
            </>
          ) : undefined}
          actions={
            <div className="flex items-center gap-1 shrink-0">
              {view === "form" ? (
                <>
                  <ToolbarButton icon={Save} label={editMode ? "Update" : "Create"}
                    onClick={hSave} variant="success" />
                  <ToolbarButton icon={XCircle} label="Cancel" onClick={hCancelForm} />
                </>
              ) : view === "dashboard" ? (
                <>
                  <ToolbarButton icon={Plus} label="New PM" onClick={hNew} />
                  <ToolbarButton icon={ClipboardList} label="All Plans" onClick={() => { setFilterStatus(""); setView("detail"); }} />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
                </>
              ) : (
                <>
                  <ToolbarButton icon={CalendarClock} label="Dashboard" onClick={() => { setSelId(null); setView("dashboard"); }} />
                  <ToolbarButton icon={Plus} label="New PM" onClick={hNew} />
                  {sel && canEdit && <ToolbarButton icon={Pencil} label="Edit" onClick={hEdit} />}
                  {sel && canActivate && <ToolbarButton icon={Play} label="Activate" onClick={() => doAction("activate", sel.id)} />}
                  {sel && canPause && <ToolbarButton icon={Pause} label="Pause" onClick={() => doAction("pause", sel.id)} />}
                  {sel && canArchive && <ToolbarButton icon={Archive} label="Archive" onClick={() => doAction("archive", sel.id)} />}
                  {sel && canGenerate && <ToolbarButton icon={Plus} label="Generate WO" onClick={() => setConfirmAction({ id: sel.id, action: "generate" })} variant="success" />}
                  <span className="h-5 w-px shrink-0 bg-border/25 mx-1" />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
                </>
              )}
            </div>
          }        />
        </div>

      {view === "dashboard" ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left 20%: PM Plans Records Panel */}
          <div className="flex flex-col min-h-0 overflow-hidden border-r border-border bg-card/30" style={{ flexBasis: "20%", minWidth: 200 }}>
            <div className="shrink-0 h-8 flex items-center border-b border-border bg-muted/50 px-3">
              <span className="text-xs font-medium text-muted-foreground">PM Plans</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{plans.length}</span>
            </div>
            <div className="shrink-0 px-2 py-1.5 border-b border-border/10 space-y-1.5">
              {/* Search */}
              <div className="relative">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search PM plans..."
                  className="h-7 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 pr-6 text-[11px] text-foreground outline-none focus:border-purple-500 transition-colors placeholder:text-muted-foreground/40" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <XCircle className="h-3 w-3 stroke-current" />
                  </button>
                )}
              </div>
              {/* Filters */}
              <div className="flex gap-1">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-6 flex-1 min-w-0 bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-1.5 text-[10px] text-muted-foreground outline-none focus:border-purple-500 transition-colors appearance-none">
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <select value={filterFreq} onChange={(e) => setFilterFreq(e.target.value)}
                  className="h-6 flex-1 min-w-0 bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-1.5 text-[10px] text-muted-foreground outline-none focus:border-purple-500 transition-colors appearance-none">
                  <option value="">All Freq</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && plans.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...
                </div>
              ) : plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No PM plans created</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/60">Create the first PM plan to start preventive maintenance.</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-purple-600/10 px-3 text-xs font-semibold text-accent-foreground hover:bg-purple-600/20 dark:text-purple-400 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> New PM Plan
                  </button>
                </div>
              ) : (
                <div>
                  {plans.map((pm) => (
                    <div key={pm.id} role="option" aria-selected={selId === pm.id}
                      onClick={() => { setSelId(pm.id); setView("detail"); }}
                      className={cls(
                        "group mx-1 my-0.5 flex h-16 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150",
                        selId === pm.id ? "bg-table-selected border-l-2 border-l-purple-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover",
                      )}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0 truncate text-sm font-semibold text-foreground">{pm.title}</span>
                          {pm.nextDueDate && isOverdue(pm.nextDueDate) && pm.status === "ACTIVE" && (
                            <span className="shrink-0" title="Overdue">
                              <AlertTriangle className="h-3 w-3 text-danger stroke-current" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-mono">{pm.code}</span>
                          <span>·</span>
                          <span>{freqLabel(pm.frequency)}</span>
                          {pm.priority && (
                            <><span>·</span><span className={priorityStyles[pm.priority] || ""}>{pm.priority}</span></>
                          )}
                          {pm.nextDueDate && (
                            <><span>·</span>
                              <span className={isOverdue(pm.nextDueDate) && pm.status === "ACTIVE" ? "text-danger font-semibold" : ""}>
                                Due {pm.nextDueDate.slice(0, 10)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={cls("shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border", statusColors[pm.status])}>
                        {pm.status === "ARCHIVED" ? "Arch" : pm.status.charAt(0) + pm.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 h-7 flex items-center border-t border-border bg-muted/50 px-3">
              <span className="text-[10px] text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "s" : ""}</span>
              {filterStatus && (
                <span className="ml-auto text-[10px] text-muted-foreground">{statusLabel(filterStatus)}</span>
              )}
            </div>
          </div>
          {/* Right 80%: PM Dashboard */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            {renderDashboard()}
          </div>
        </div>
      ) : (
      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: List */}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-border bg-card/30"
          style={{ flexBasis: `${leftPct}%`, minWidth: 220 }}>
          <div className="shrink-0 h-8 flex items-center border-b border-border bg-muted/50 px-3">
            <span className="text-xs font-medium text-muted-foreground">PM Plans</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{plans.length}</span>
          </div>
          {view === "form" ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-[180px]">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/20 stroke-current mb-2" />
                <p className="text-xs text-muted-foreground">Creating/editing PM plan</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {loading && plans.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...
                </div>
              ) : plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs font-medium text-muted-foreground">No PM plans found</p>
                  <button type="button" onClick={hNew}
                    className="mt-2 inline-flex h-7 items-center gap-1 bg-purple-600/10 px-3 text-xs font-semibold text-accent-foreground hover:bg-purple-600/20 dark:text-purple-400 transition-colors">
                    <Plus className="h-3 w-3 stroke-current" /> New PM Plan
                  </button>
                </div>
              ) : (
                <div>
                  {plans.map((pm) => (
                    <div key={pm.id} role="option" aria-selected={selId === pm.id}
                      onClick={() => { setSelId(pm.id); setView("detail"); }}
                      className={cls(
                        "group mx-1 my-0.5 flex h-16 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150",
                        selId === pm.id ? "bg-table-selected border-l-2 border-l-purple-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover",
                      )}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0 truncate text-sm font-semibold text-foreground">{pm.title}</span>
                          {pm.nextDueDate && isOverdue(pm.nextDueDate) && pm.status === "ACTIVE" && (
                            <span className="shrink-0" title="Overdue">
                              <AlertTriangle className="h-3 w-3 text-danger stroke-current" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-mono">{pm.code}</span>
                          <span>·</span>
                          <span>{freqLabel(pm.frequency)}</span>
                          {pm.priority && (
                            <><span>·</span><span className={priorityStyles[pm.priority] || ""}>{pm.priority}</span></>
                          )}
                          {pm.nextDueDate && (
                            <><span>·</span>
                              <span className={isOverdue(pm.nextDueDate) && pm.status === "ACTIVE" ? "text-danger font-semibold" : ""}>
                                Due {pm.nextDueDate.slice(0, 10)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={cls("shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border", statusColors[pm.status])}>
                        {pm.status === "ARCHIVED" ? "Arch" : pm.status.charAt(0) + pm.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="shrink-0 h-7 flex items-center border-t border-border bg-muted/50 px-3">
            <span className="text-[10px] text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "s" : ""}</span>
            {duePlans.length > 0 && (
              <span className="ml-auto text-[10px] font-semibold text-danger">{duePlans.length} due</span>
            )}
          </div>
        </div>

        {/* Resizer */}
        {view !== "form" && (
          <div onMouseDown={handleSplitMouseDown}
            className="flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-accent/100/10"
            style={{ width: 2 }} />
        )}

        {/* Right: Detail / Form */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {view === "form" ? renderForm() : !sel ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center max-w-xs">
                <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/20 stroke-current mb-2" />
                <h3 className="text-sm font-semibold text-foreground mb-1">No PM plan selected</h3>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  Select a PM plan from the list or create a new one.
                </p>
              </div>
            </div>
          ) : renderDetail()}
        </div>
      </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-3 px-4 text-[10px] text-muted-foreground font-medium">
        <span className="font-semibold text-foreground">Preventive Maintenance</span>
        <span className="mx-1 h-3 w-px bg-border/30" />
        <span>{plans.length} plan{plans.length !== 1 ? "s" : ""}</span>
        {filterStatus && (
          <><span className="mx-1 h-3 w-px bg-border/30" /><span className="text-muted-foreground">{statusLabel(filterStatus)}</span></>
        )}
        {filterFreq && (
          <><span className="mx-1 h-3 w-px bg-border/30" /><span className="text-muted-foreground">{freqLabel(filterFreq)}</span></>
        )}
        <span className="flex-1" />
        {view !== "dashboard" && sel && (
          <>
            <span>{sel.code}</span>
            <span>·</span>
            <span>{freqLabel(sel.frequency)}</span>
            <span>·</span>
            <span className={priorityStyles[sel.priority] || ""}>{sel.priority}</span>
            {sel.nextDueDate && (
              <><span>·</span><span>Due {sel.nextDueDate.slice(0, 10)}</span></>
            )}
          </>
        )}
      </div>

      {/* Confirm Generate WO Dialog */}
      <ConfirmDialog open={confirmAction?.action === "generate"} onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && doAction("generate", confirmAction.id)}
        title="Generate Work Order"
        message="This will create a new Work Order from this PM plan. Continue?"
        confirmLabel="Generate" danger={false} />

      {/* Confirm Archive Dialog */}
      <ConfirmDialog open={confirmAction?.action === "archive"} onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && doAction("archive", confirmAction.id)}
        title="Archive PM Plan"
        message="Are you sure you want to archive this PM plan? Archived plans cannot generate work orders."
        confirmLabel="Archive" danger={true} />
    </div>
  );
}
