import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ClipboardList, Plus, RefreshCw, Play, CheckCircle, XCircle,
  CalendarClock, ArrowLeft, Clock, User, Target, FileText,
  Pencil, Wrench, Package, AlertTriangle, Save,
  Archive, Eye, AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { ToolbarDropdown, ToolbarButton } from "@/components/shared/Toolbar";
import { SplitToolbar } from "@/components/shared/SplitToolbar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useActiveLine } from "@/hooks/useActiveLine";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/manufacturingQueries";
import { DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY } from "@/graphql/manufacturingQueries";
import {
  WORK_ORDERS_QUERY, WORK_ORDER_DASHBOARD_QUERY, SPARE_PARTS_QUERY, SPARE_PART_USAGES_QUERY,
  BREAKDOWNS_QUERY, DUE_PM_QUERY, LOW_STOCK_SPARE_PARTS_QUERY,
} from "@/graphql/maintenanceQueries";
import { MaintenanceDashboard } from "./work-orders/MaintenanceDashboard";
import {
  mockWorkOrderDashboard,
  mockMaintenanceWorkOrders,
  mockSpareParts,
  mockBreakdowns,
  mockDuePmPlans,
  mockLowStockSpareParts,
  mockSparePartUsages,
} from "@/demo/maintenanceMockData";
import {
  CREATE_WORK_ORDER_MUTATION, UPDATE_WORK_ORDER_MUTATION,
  SUBMIT_WORK_ORDER_MUTATION, ASSIGN_WORK_ORDER_MUTATION,
  START_WORK_ORDER_MUTATION, HOLD_WORK_ORDER_FOR_PARTS_MUTATION,
  RESUME_WORK_ORDER_FROM_PARTS_MUTATION,
  SUBMIT_WORK_ORDER_FOR_APPROVAL_MUTATION, APPROVE_WORK_ORDER_MUTATION,
  COMPLETE_WORK_ORDER_MUTATION, CANCEL_WORK_ORDER_MUTATION,
  ARCHIVE_WORK_ORDER_MUTATION,
  RECORD_SPARE_PART_USAGE_MUTATION,
} from "@/graphql/maintenanceMutations";

// ── Constants ──

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "CORRECTIVE", label: "CM - Corrective" },
  { value: "PREVENTIVE", label: "PM - Preventive" },
  { value: "BREAKDOWN", label: "BD - Breakdown" },
  { value: "INSPECTION", label: "INSP - Inspection" },
  { value: "CALIBRATION", label: "CAL - Calibration" },
  { value: "IMPROVEMENT", label: "IMP - Improvement" },
  { value: "SAFETY", label: "SFT - Safety" },
  { value: "TOOLING", label: "TLG - Tooling" },
  { value: "OTHER", label: "Other" },
];

const CREATE_TYPE_OPTIONS = TYPE_OPTIONS.filter((o) => o.value !== "");

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_PARTS", label: "Waiting Parts" },
  { value: "WAITING_APPROVAL", label: "Waiting Approval" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ARCHIVED", label: "Archived" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

// ── Types ──

interface WorkOrder {
  id: number; number: string; title: string; description: string;
  workOrderType: string; targetType: string; targetId: number | null;
  plantId: number | null; productionLineId: number | null;
  departmentId: number | null; resourceGroupId: number | null; resourceId: number | null;
  priority: string; status: string; requestedBy: string; assignedTo: string;
  dateOpened: string | null; dueDate: string | null;
  plannedStartDate: string | null; plannedEndDate: string | null;
  actualStartDate: string | null; actualEndDate: string | null;
  downtimeMinutes: number | null;
  workInstructions: string; failureMode: string; safetyNotes: string;
  requiredTools: string;
  laborEstimate: number | null; actualLaborHours: number | null;
  workPerformed: string; completionNotes: string; partsUsedNotes: string;
  rootCause: string; correctiveAction: string; verificationResult: string;
  sparePartsRequired: string | null; attachments: string | null;
  linkedPmId: number | null; linkedBreakdownId: number | null; linkedMerId: number | null;
  createdAt?: string; updatedAt?: string;
}

interface DashboardData {
  openWorkOrders: number; inProgress: number; overdue: number;
  completed: number; preventive: number; correctiveBreakdown: number;
  waitingParts: number; dueThisWeek: number; totalDowntimeMinutes: number;
  lastUpdated: string;
}

interface SparePart { id: number; partNumber: string; name: string; quantityOnHand: number; uom: string; }

// ── Helpers ──

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    DRAFT: "Draft", OPEN: "Open", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress",
    WAITING_PARTS: "Waiting Parts", WAITING_APPROVAL: "Waiting Approval",
    COMPLETED: "Completed", CANCELLED: "Cancelled", ARCHIVED: "Archived",
  };
  return m[s] || s;
}

function typeLabel(t: string): string {
  return TYPE_OPTIONS.find((o) => o.value === t)?.label?.split(" - ")[1] || t;
}

function formatMaybeJson(v: string | null | undefined): string {
  if (!v) return "";
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed) || (parsed && typeof parsed === "object")) {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Keep the original string when it is not valid JSON.
  }
  return v;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  OPEN: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800",
  IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  WAITING_PARTS: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
  WAITING_APPROVAL: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
  COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  ARCHIVED: "bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-900 dark:text-gray-500 dark:border-gray-800",
};

const priorityStyles: Record<string, string> = {
  LOW: "text-gray-500", MEDIUM: "text-blue-500", HIGH: "text-orange-500", CRITICAL: "text-red-500",
};

const statusDot = (s: string) => {
  const m: Record<string, string> = {
    DRAFT: "bg-gray-400", OPEN: "bg-blue-500", ASSIGNED: "bg-indigo-500",
    IN_PROGRESS: "bg-amber-500", WAITING_PARTS: "bg-orange-500",
    WAITING_APPROVAL: "bg-purple-500", COMPLETED: "bg-green-500",
    CANCELLED: "bg-gray-400", ARCHIVED: "bg-gray-300",
  };
  return m[s] || "bg-gray-300";
};

// ── Inline Field ──

function Fld({ label, children, required, error }: { label: string; children: ReactNode; required?: boolean; error?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

const inpCls = "h-8 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2.5 text-sm text-foreground outline-none focus:border-indigo-500 transition-colors placeholder:text-muted-foreground/40";
const selCls = inpCls + " appearance-none";

// ── Target Selector ──

function TargetSelector({
  plantId, setPlantId,
  lineId, setLineId,
  deptId, setDeptId,
  rgId, setRgId,
  resourceId, setResourceId,
  disabled,
  plantError,
}: {
  plantId: number | null; setPlantId: (v: number | null) => void;
  lineId: number | null; setLineId: (v: number | null) => void;
  deptId: number | null; setDeptId: (v: number | null) => void;
  rgId: number | null; setRgId: (v: number | null) => void;
  resourceId: number | null; setResourceId: (v: number | null) => void;
  disabled?: boolean;
  plantError?: string;
}) {
  const { data: plants } = useQuery(PLANTS_QUERY, { errorPolicy: "all" });
  const plantList: { id: string; name: string }[] = (plants as any)?.plants || [];
  const { data: lines } = useQuery(PRODUCTION_LINES_QUERY, { variables: { plantId: plantId?.toString() }, skip: !plantId, errorPolicy: "all" });
  const lineList: { id: string; name: string }[] = (lines as any)?.productionLines || [];
  const { data: depts } = useQuery(DEPARTMENTS_QUERY, { variables: { status: "active" }, skip: !plantId, errorPolicy: "all" });
  const deptList: { id: string; name: string }[] = (depts as any)?.departments?.filter((d: any) => d.plantId === plantId?.toString()) || [];
  const { data: rgs } = useQuery(RESOURCE_GROUPS_QUERY, { variables: { departmentId: deptId?.toString() }, skip: !deptId, errorPolicy: "all" });
  const rgList: { id: string; name: string }[] = (rgs as any)?.resourceGroups || [];

  const baseCls = "h-8 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 text-xs text-foreground outline-none focus:border-indigo-500 transition-colors disabled:opacity-40";

  // Deepest selected level becomes the WO target (names, not raw IDs)
  const plantName = plantList.find((p) => p.id === plantId?.toString())?.name || "";
  const lineName = lineList.find((l: any) => l.id === lineId?.toString())?.name || "";
  const deptName = deptList.find((d: any) => d.id === deptId?.toString())?.name || "";
  const rgName = rgList.find((rg: any) => rg.id === rgId?.toString())?.name || "";

  const effectiveTarget = resourceId ? `Resource #${resourceId}`
    : rgName ? `RG: ${rgName}`
    : deptName ? `Dept: ${deptName}`
    : lineName ? `Line: ${lineName}`
    : plantName ? `Plant: ${plantName}`
    : null;

  return (
    <div className="space-y-2">
      <Fld label="Plant" required error={plantError}>
        <select value={plantId ?? ""} onChange={(e) => { setPlantId(e.target.value ? Number(e.target.value) : null); setLineId(null); setDeptId(null); setRgId(null); setResourceId(null); }}
          disabled={disabled} className={baseCls}>
          <option value="">Select plant...</option>
          {plantList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Fld>
      <Fld label="Production Line">
        <select value={lineId ?? ""} onChange={(e) => { setLineId(e.target.value ? Number(e.target.value) : null); setDeptId(null); setRgId(null); setResourceId(null); }}
          disabled={disabled || !plantId} className={baseCls}>
          <option value="">Select line...</option>
          {lineList.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Fld>
      <Fld label="Department">
        <select value={deptId ?? ""} onChange={(e) => { setDeptId(e.target.value ? Number(e.target.value) : null); setRgId(null); setResourceId(null); }}
          disabled={disabled || !plantId} className={baseCls}>
          <option value="">Select department...</option>
          {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Fld>
      <Fld label="Resource Group">
        <select value={rgId ?? ""} onChange={(e) => { setRgId(e.target.value ? Number(e.target.value) : null); setResourceId(null); }}
          disabled={disabled || !deptId} className={baseCls}>
          <option value="">Select resource group...</option>
          {rgList.map((rg: any) => <option key={rg.id} value={rg.id}>{rg.name}</option>)}
        </select>
      </Fld>
      <Fld label="Resource / Asset">
        <input type="number" value={resourceId ?? ""} onChange={(e) => setResourceId(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled || !rgId} className={baseCls} placeholder="Resource ID..." />
      </Fld>
      {effectiveTarget && (
        <p className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400">
          Target: {effectiveTarget}
        </p>
      )}
    </div>
  );
}

// ── Main Component ──

export function WorkOrdersPage() {
  const [view, setView] = useState<"dashboard" | "form">("dashboard");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [selId, setSelId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);

  // ── Read initial filter from URL params ──
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam === "OVERDUE") {
      setFilterOverdue(true);
      setFilterStatus("");
    } else if (statusParam) {
      const statuses = statusParam.split(",");
      setFilterStatus(statuses.length > 1 ? "" : statuses[0]);
      setFilterOverdue(false);
    }
  }, []); // only on mount

  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => { setLeftPct(Math.min(Math.max(((ev.clientX - rect.left) / rect.width) * 100, 10), 50)); };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const msg = (m: string) => { setSuccessMsg(m); setErrorMsg(""); setTimeout(() => setSuccessMsg(""), 4000); };
  const err = (m: string) => { setErrorMsg(m); setSuccessMsg(""); setTimeout(() => setErrorMsg(""), 6000); };

  const { productionLineId, activePlantId } = useActiveLine();

  // ── Queries ──
  const { data: dashData } = useQuery(WORK_ORDER_DASHBOARD_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const dash: DashboardData = (dashData as any)?.workOrderDashboard ?? mockWorkOrderDashboard.workOrderDashboard;

  const { data: listData, loading: listLoading, refetch } = useQuery(WORK_ORDERS_QUERY, {
    variables: { search: search || undefined, workOrderType: filterType || undefined, status: filterStatus || undefined, overdue: filterOverdue || undefined },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const workOrders: WorkOrder[] = (listData as any)?.maintenanceWorkOrders ?? mockMaintenanceWorkOrders.maintenanceWorkOrders;
  const sel = useMemo(() => selId ? workOrders.find((w) => w.id === selId) ?? null : null, [selId, workOrders]);

  const { data: partsData } = useQuery(SPARE_PARTS_QUERY, { variables: { status: "ACTIVE" }, fetchPolicy: "cache-first", errorPolicy: "all" });
  const spareParts: SparePart[] = (partsData as any)?.spareParts ?? mockSpareParts.spareParts;

  const { data: bdData } = useQuery(BREAKDOWNS_QUERY, { fetchPolicy: "cache-first", errorPolicy: "all" });
  const breakdowns: any[] = (bdData as any)?.breakdowns ?? mockBreakdowns.breakdowns;

  const { data: duePMData } = useQuery(DUE_PM_QUERY, { fetchPolicy: "cache-first", errorPolicy: "all" });
  const duePlans: any[] = (duePMData as any)?.duePreventiveMaintenance ?? mockDuePmPlans.duePreventiveMaintenance;

  const { data: lowStockData } = useQuery(LOW_STOCK_SPARE_PARTS_QUERY, { fetchPolicy: "cache-first", errorPolicy: "all" });
  const lowStockParts: any[] = (lowStockData as any)?.lowStockSpareParts ?? mockLowStockSpareParts.lowStockSpareParts;

  const { data: usageData } = useQuery(SPARE_PART_USAGES_QUERY, { variables: { workOrderId: selId || undefined }, skip: !selId, fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const partUsages: any[] = (usageData as any)?.sparePartUsages ?? mockSparePartUsages.sparePartUsages;

  // ── Mutations ──
  const [createWO] = useMutation(CREATE_WORK_ORDER_MUTATION);
  const [updateWO] = useMutation(UPDATE_WORK_ORDER_MUTATION);
  const [submitWO] = useMutation(SUBMIT_WORK_ORDER_MUTATION);
  const [assignWO] = useMutation(ASSIGN_WORK_ORDER_MUTATION);
  const [startWO] = useMutation(START_WORK_ORDER_MUTATION);
  const [holdParts] = useMutation(HOLD_WORK_ORDER_FOR_PARTS_MUTATION);
  const [resumeParts] = useMutation(RESUME_WORK_ORDER_FROM_PARTS_MUTATION);
  const [submitApproval] = useMutation(SUBMIT_WORK_ORDER_FOR_APPROVAL_MUTATION);
  const [approveWO] = useMutation(APPROVE_WORK_ORDER_MUTATION);
  const [completeWO] = useMutation(COMPLETE_WORK_ORDER_MUTATION);
  const [cancelWO] = useMutation(CANCEL_WORK_ORDER_MUTATION);
  const [archiveWO] = useMutation(ARCHIVE_WORK_ORDER_MUTATION);
  const [recordUsage] = useMutation(RECORD_SPARE_PART_USAGE_MUTATION);

  // ── Form State ──
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", workOrderType: "PREVENTIVE",
    plantId: null as number | null, productionLineId: null as number | null,
    departmentId: null as number | null, resourceGroupId: null as number | null,
    resourceId: null as number | null,
    priority: "MEDIUM", requestedBy: "", assignedTo: "",
    dueDate: "", plannedStartDate: "", plannedEndDate: "",
    workInstructions: "", failureMode: "", safetyNotes: "",
    requiredTools: "", laborEstimate: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [completeForm, setCompleteForm] = useState({
    workPerformed: "", completionNotes: "", downtimeMinutes: "",
    actualEndDate: todayStr, actualLaborHours: "",
    rootCause: "", correctiveAction: "", verificationResult: "",
    partsUsedNotes: "",
  });

  const [sparePartId, setSparePartId] = useState("");
  const [sparePartQty, setSparePartQty] = useState("1");
  const [sparePartNotes, setSparePartNotes] = useState("");

  // ── Handlers ──

  const doAction = useCallback(async (action: string, id: number, extra?: Record<string, any>) => {
    try {
      if (action === "submit") { await submitWO({ variables: { id } }); msg("Submitted → Open"); }
      else if (action === "assign") { await assignWO({ variables: { id, assignedTo: extra?.to || "" } }); msg("Assigned"); }
      else if (action === "start") { await startWO({ variables: { id } }); msg("Started"); }
      else if (action === "hold_parts") { await holdParts({ variables: { id } }); msg("On hold — waiting parts"); }
      else if (action === "resume") { await resumeParts({ variables: { id } }); msg("Resumed"); }
      else if (action === "submit_approval") { await submitApproval({ variables: { id } }); msg("Submitted for approval"); }
      else if (action === "approve") { await approveWO({ variables: { id } }); msg("Approved & completed"); }
      else if (action === "complete") { await completeWO({ variables: { id, ...extra } }); msg("Completed"); }
      else if (action === "cancel") { await cancelWO({ variables: { id } }); msg("Cancelled"); }
      else if (action === "archive") { await archiveWO({ variables: { id } }); msg("Archived"); }
      setConfirmAction(null);
      setCompleteForm({ workPerformed: "", completionNotes: "", downtimeMinutes: "", actualEndDate: todayStr, actualLaborHours: "", rootCause: "", correctiveAction: "", verificationResult: "", partsUsedNotes: "" });
      refetch();
    } catch (e: any) { err(e.message || "Action failed"); }
  }, [submitWO, assignWO, startWO, holdParts, resumeParts, submitApproval, approveWO, completeWO, cancelWO, archiveWO, refetch, todayStr]);

  const validateForm = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.workOrderType) e.workOrderType = "Required";
    if (!form.priority) e.priority = "Required";
    if (!form.requestedBy.trim()) e.requestedBy = "Required";
    if (!form.assignedTo.trim()) e.assignedTo = "Required";
    if (!form.plantId) e.plantId = "Plant is required";
    if (!form.dueDate) e.dueDate = "Required";
    if (!form.description.trim()) e.description = "Required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const hCreate = useCallback(async () => {
    if (!validateForm()) return;
    try {
      const r = await createWO({
        variables: {
          title: form.title.trim(), workOrderType: form.workOrderType,
          plantId: form.plantId, productionLineId: form.productionLineId,
          departmentId: form.departmentId, resourceGroupId: form.resourceGroupId,
          resourceId: form.resourceId,
          description: form.description.trim() || undefined,
          priority: form.priority, requestedBy: form.requestedBy.trim() || undefined,
          assignedTo: form.assignedTo.trim() || undefined,
          dueDate: form.dueDate || undefined,
          plannedStartDate: form.plannedStartDate || undefined,
          plannedEndDate: form.plannedEndDate || undefined,
          workInstructions: form.workInstructions.trim() || undefined,
          failureMode: form.failureMode.trim() || undefined,
          safetyNotes: form.safetyNotes.trim() || undefined,
          requiredTools: form.requiredTools.trim() || undefined,
          labourEstimate: form.laborEstimate ? Number(form.laborEstimate) : undefined,
        },
      });
      const res = (r.data as any)?.createWorkOrder;
      if (res?.ok) { msg(`Created: ${res.number}`); setView("dashboard"); setFormErrors({}); setEditMode(false); setSelId(res.workOrderId || null); refetch(); }
      else { err(res?.message || "Create failed"); }
    } catch (e: any) { err(e.message || "Create failed"); }
  }, [form, validateForm, createWO, refetch]);

  const hUpdate = useCallback(async () => {
    if (!selId || !form.title.trim()) return;
    try {
      await updateWO({
        variables: {
          id: selId,
          title: form.title.trim(),
          description: form.description.trim(),
          workOrderType: form.workOrderType,
          priority: form.priority, assignedTo: form.assignedTo.trim(),
          requestedBy: form.requestedBy.trim(),
          plantId: form.plantId, productionLineId: form.productionLineId,
          departmentId: form.departmentId, resourceGroupId: form.resourceGroupId,
          resourceId: form.resourceId,
          dueDate: form.dueDate || undefined,
          plannedStartDate: form.plannedStartDate || null,
          plannedEndDate: form.plannedEndDate || null,
          workInstructions: form.workInstructions.trim(),
          failureMode: form.failureMode.trim(),
          safetyNotes: form.safetyNotes.trim(),
          requiredTools: form.requiredTools.trim(),
          labourEstimate: form.laborEstimate ? Number(form.laborEstimate) : null,
          workPerformed: completeForm.workPerformed.trim(),
          completionNotes: completeForm.completionNotes.trim(),
          partsUsedNotes: completeForm.partsUsedNotes.trim(),
          downtimeMinutes: completeForm.downtimeMinutes ? Number(completeForm.downtimeMinutes) : null,
          rootCause: completeForm.rootCause.trim(),
          correctiveAction: completeForm.correctiveAction.trim(),
          verificationResult: completeForm.verificationResult.trim(),
          actualEndDate: completeForm.actualEndDate || null,
          actualLaborHours: completeForm.actualLaborHours ? Number(completeForm.actualLaborHours) : null,
        },
      });
      msg("Updated"); setView("dashboard"); setEditMode(false); refetch();
    } catch (e: any) { err(e.message || "Update failed"); }
  }, [selId, form, completeForm, updateWO, refetch]);

  const hStartEdit = useCallback(() => {
    if (!sel) return;
    setForm({
      title: sel.title, description: sel.description, workOrderType: sel.workOrderType,
      plantId: sel.plantId, productionLineId: sel.productionLineId,
      departmentId: sel.departmentId, resourceGroupId: sel.resourceGroupId,
      resourceId: sel.resourceId,
      priority: sel.priority, requestedBy: sel.requestedBy, assignedTo: sel.assignedTo,
      dueDate: sel.dueDate?.slice(0, 10) || "",
      plannedStartDate: sel.plannedStartDate?.slice(0, 10) || "",
      plannedEndDate: sel.plannedEndDate?.slice(0, 10) || "",
      workInstructions: sel.workInstructions,
      failureMode: sel.failureMode, safetyNotes: sel.safetyNotes,
      requiredTools: sel.requiredTools || "", laborEstimate: sel.laborEstimate?.toString() || "",
    });
    setCompleteForm({
      workPerformed: sel.workPerformed || "",
      completionNotes: sel.completionNotes || "",
      downtimeMinutes: sel.downtimeMinutes != null ? sel.downtimeMinutes.toString() : "",
      actualEndDate: sel.actualEndDate?.slice(0, 10) || todayStr,
      actualLaborHours: sel.actualLaborHours != null ? sel.actualLaborHours.toString() : "",
      rootCause: sel.rootCause || "",
      correctiveAction: sel.correctiveAction || "",
      verificationResult: sel.verificationResult || "",
      partsUsedNotes: sel.partsUsedNotes || "",
    });
    setFormErrors({}); setEditMode(true); setView("form");
  }, [sel, todayStr]);

  const hNewWO = useCallback(() => {
    setSelId(null);
    setForm({
      title: "", description: "", workOrderType: "PREVENTIVE",
      plantId: activePlantId ? Number(activePlantId) : null,
      productionLineId: productionLineId && productionLineId !== "all" ? Number(productionLineId) : null,
      departmentId: null, resourceGroupId: null, resourceId: null,
      priority: "MEDIUM", requestedBy: "", assignedTo: "",
      dueDate: "", plannedStartDate: "", plannedEndDate: "",
      workInstructions: "", failureMode: "", safetyNotes: "",
      requiredTools: "", laborEstimate: "",
    });
    setFormErrors({}); setEditMode(false); setView("form");
  }, [activePlantId, productionLineId]);

  const hRecordSpare = useCallback(async () => {
    if (!selId || !sparePartId) return;
    try {
      await recordUsage({
        variables: { partId: Number(sparePartId), workOrderId: selId, quantity: Number(sparePartQty) || 1, notes: sparePartNotes || undefined },
      });
      msg("Spare part recorded");
      setSparePartId(""); setSparePartQty("1"); setSparePartNotes("");
      refetch();
    } catch (e: any) { err(e.message || "Record failed"); }
  }, [selId, sparePartId, sparePartQty, sparePartNotes, recordUsage, refetch]);

  // ── Derived ──
  const isEditable = !!(sel?.status && !["ARCHIVED"].includes(sel.status));
  const isInProg = sel?.status && ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_APPROVAL"].includes(sel.status);
  const isCompleteCancel = sel?.status && ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(sel.status);

  // ── Validation for toolbar ──
  const missingFields = useMemo(() => {
    const m: string[] = [];
    if (!form.title.trim()) m.push("Title");
    if (!form.description.trim()) m.push("Description");
    if (!form.workOrderType) m.push("Type");
    if (!form.priority) m.push("Priority");
    if (!form.requestedBy.trim()) m.push("Requested By");
    if (!form.assignedTo.trim()) m.push("Technician");
    if (!form.plantId) m.push("Plant");
    if (!form.dueDate) m.push("Due Date");
    return m;
  }, [form]);

  // ── Dashboard Navigation ──
  const handleFilterView = useCallback((statusFilter?: string) => {
    setFilterOverdue(false);
    if (statusFilter === "OVERDUE") {
      setFilterOverdue(true);
      setFilterStatus("");
      setSearch("");
    } else if (statusFilter) {
      const statuses = statusFilter.split(",");
      setFilterStatus(statuses.length > 1 ? "" : statuses[0]);
    } else {
      // Clear all filters ("" or undefined)
      setFilterStatus("");
    }
  }, []);

  const handleNavigateTo = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // ── Dashboard ──
  const renderDashboard = () => (
    <MaintenanceDashboard
      dash={dash}
      workOrders={workOrders}
      breakdowns={breakdowns}
      duePlans={duePlans}
      lowStockParts={lowStockParts}
      onFilterView={handleFilterView}
      onNewWO={hNewWO}
      onNavigateTo={handleNavigateTo}
    />
  );

  // ── Toolbar ──
  const isDashboardState = !selId && view !== "form";
  const isDetailState = !!selId && view !== "form";

  const renderToolbar = () => (
    <>
      {/* Left side: search/filters in detail state */}
      {isDashboardState && <div />}
      {isDetailState && <div />}
      {view === "form" && <div />}

      {/* Right side: action buttons */}
      <>
        <span className="flex-1" />
        <div className="flex items-center gap-1 shrink-0">
          {isDashboardState && (
            <>
              <ToolbarButton icon={Plus} label="New WO" onClick={hNewWO} />
              <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
            </>
          )}
          {isDetailState && (
            <>
              <ToolbarButton icon={Plus} label="New WO" onClick={hNewWO} />
              {sel && sel.status === "DRAFT" && <ToolbarButton icon={CheckCircle} label="Submit" onClick={() => doAction("submit", sel.id)} />}
              {sel && sel.status === "OPEN" && <ToolbarButton icon={User} label="Assign" onClick={() => doAction("assign", sel.id, { to: sel.assignedTo })} />}
              {sel && isEditable && <ToolbarButton icon={Pencil} label="Edit" onClick={hStartEdit} />}
              {sel && sel.status === "ASSIGNED" && <ToolbarButton icon={Play} label="Start" onClick={() => doAction("start", sel.id)} />}
              {sel && sel.status === "IN_PROGRESS" && <>
                <ToolbarButton icon={AlertCircle} label="Hold Parts" onClick={() => doAction("hold_parts", sel.id)} />
                <ToolbarButton icon={CheckCircle} label="Complete" onClick={() => {
                  if (!completeForm.completionNotes.trim()) { err("Add completion notes first"); return; }
                  if (!completeForm.actualEndDate) { err("Set actual end date first"); return; }
                  setConfirmAction({ id: sel.id, action: "complete" });
                }} variant="success" />
                <ToolbarButton icon={Eye} label="Submit Appr." onClick={() => doAction("submit_approval", sel.id)} />
              </>}
              {sel && sel.status === "WAITING_PARTS" && <ToolbarButton icon={Play} label="Resume" onClick={() => doAction("resume", sel.id)} />}
              {sel && sel.status === "WAITING_APPROVAL" && <ToolbarButton icon={CheckCircle} label="Approve" onClick={() => doAction("approve", sel.id)} variant="success" />}
              {sel && isInProg && <ToolbarButton icon={XCircle} label="Cancel WO" onClick={() => setConfirmAction({ id: sel.id, action: "cancel" })} />}
              {sel && isCompleteCancel && <ToolbarButton icon={Archive} label="Archive" onClick={() => doAction("archive", sel.id)} />}
              {sel && isCompleteCancel && <ToolbarButton icon={ArrowLeft} label="Back" onClick={() => { setSelId(null); }} />}
              <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
            </>
          )}
          {view === "form" && (
            <>
              {!editMode && missingFields.length > 0 && (
                <span className="text-red-500 font-medium text-[10px]" title={missingFields.join(", ")}>
                  {missingFields.length} required
                </span>
              )}
              <ToolbarButton icon={Save} label="Save WO"
                onClick={editMode ? hUpdate : hCreate}
                disabled={missingFields.length > 0}
                variant="success"
              />
              <ToolbarButton icon={XCircle} label="Cancel" onClick={() => { setView("dashboard"); setSelId(selId || null); setEditMode(false); }} />
              <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} />
            </>
          )}
        </div>
      </>
    </>
  );

  // ── Form ──
  const renderForm = () => {
    const missingFields = [];
    if (!form.title.trim()) missingFields.push("Title");
    if (!form.description.trim()) missingFields.push("Description");
    if (!form.workOrderType) missingFields.push("Type");
    if (!form.priority) missingFields.push("Priority");
    if (!form.requestedBy.trim()) missingFields.push("Requested By");
    if (!form.assignedTo.trim()) missingFields.push("Assigned Technician");
    if (!form.plantId) missingFields.push("Plant");
    if (!form.dueDate) missingFields.push("Due Date");

    const canSave = missingFields.length === 0;

    return (
      <div className="flex flex-1 min-h-0">
        {/* Left column: Target → Metadata → Schedule — scrolls independently */}
        <div className="w-[25%] min-w-55 max-w-70 border-r border-border/20 bg-card/30 overflow-y-auto">
          <div className="p-3 space-y-2">
            {/* 1. Target */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                <Target className="h-3 w-3" /> Target
              </p>
              <TargetSelector
                plantId={form.plantId} setPlantId={(v) => { setForm({ ...form, plantId: v }); setFormErrors({}); }}
                lineId={form.productionLineId} setLineId={(v) => setForm({ ...form, productionLineId: v })}
                deptId={form.departmentId} setDeptId={(v) => setForm({ ...form, departmentId: v })}
                rgId={form.resourceGroupId} setRgId={(v) => setForm({ ...form, resourceGroupId: v })}
                resourceId={form.resourceId} setResourceId={(v) => setForm({ ...form, resourceId: v })}
                disabled={false}
                plantError={formErrors.plantId}
              />
            </div>

            {/* 2. Metadata */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                <FileText className="h-3 w-3" /> Metadata
              </p>
              <div className="space-y-1.5">
                {editMode && <Fld label="WO Number"><p className="text-sm font-mono text-foreground">{sel?.number}</p></Fld>}
                <Fld label="Status"><p className="text-sm font-semibold">{editMode && sel ? statusLabel(sel.status) : "New"}</p></Fld>
                <Fld label="Type" required error={formErrors.workOrderType}>
                  <select value={form.workOrderType} onChange={(e) => setForm({ ...form, workOrderType: e.target.value })} className={selCls}>
                    {CREATE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label.split(" - ")[1]}</option>)}
                  </select>
                </Fld>
                <Fld label="Priority" required error={formErrors.priority}>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selCls}>
                    {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Fld>
                <Fld label="Requested By" required error={formErrors.requestedBy}>
                  <input type="text" value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} className={inpCls} placeholder="Requester name" />
                </Fld>
                <Fld label="Assigned Technician" required error={formErrors.assignedTo}>
                  <input type="text" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className={inpCls} placeholder="Technician name" />
                </Fld>
              </div>
            </div>

            {/* 3. Schedule */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                <CalendarClock className="h-3 w-3" /> Schedule
              </p>
              <div className="space-y-1.5">
                <Fld label="Date Opened" required>
                  <p className="text-sm text-foreground">{todayStr}</p>
                </Fld>
                <Fld label="Due Date" required error={formErrors.dueDate}>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inpCls} />
                </Fld>
                <Fld label="Planned Start">
                  <input type="date" value={form.plannedStartDate} onChange={(e) => setForm({ ...form, plannedStartDate: e.target.value })} className={inpCls} />
                </Fld>
                <Fld label="Planned End">
                  <input type="date" value={form.plannedEndDate} onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })} className={inpCls} />
                </Fld>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Work Details → Execution Plan → Spare Parts → Impact → Completion Evidence */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-3 space-y-3">
            {/* 1. Work Details */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                <FileText className="h-3 w-3" /> Work Details
              </p>
              <div className="space-y-2">
                <Fld label="Title" required error={formErrors.title}>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inpCls} placeholder="e.g. Lubricate press brake #3" />
                </Fld>
                <Fld label="Problem / Request Description" required error={formErrors.description}>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500 placeholder:text-muted-foreground/40"
                    placeholder="Describe the problem or work requested..." />
                </Fld>
                <Fld label="Failure Mode / Symptom">
                  <textarea value={form.failureMode} onChange={(e) => setForm({ ...form, failureMode: e.target.value })}
                    className="h-14 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                    placeholder="Observed symptoms, error codes, failure indicators..." />
                </Fld>
              </div>
            </div>

            {/* 2. Execution Plan */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                <ClipboardList className="h-3 w-3" /> Execution Plan
              </p>
              <div className="space-y-2">
                <Fld label="Work Instructions / Job Plan">
                  <textarea value={form.workInstructions} onChange={(e) => setForm({ ...form, workInstructions: e.target.value })}
                    className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                    placeholder="Step-by-step work instructions or reference to job plan..." />
                </Fld>
                <Fld label="Safety Notes / LOTO Required">
                  <textarea value={form.safetyNotes} onChange={(e) => setForm({ ...form, safetyNotes: e.target.value })}
                    className="h-14 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                    placeholder="Safety precautions, LOTO, PPE requirements..." />
                </Fld>
                <Fld label="Required Tools">
                  <input type="text" value={form.requiredTools} onChange={(e) => setForm({ ...form, requiredTools: e.target.value })}
                    className={inpCls} placeholder="Tool list, special equipment..." />
                </Fld>
              </div>
            </div>

            {/* 3. Spare Parts Required */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                <Package className="h-3 w-3" /> Spare Parts Required
              </p>
              {spareParts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No spare parts catalog. Add parts to enable selection.</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_60px_60px_40px] gap-1 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Part</span>
                    <span className="text-right">Qty Req</span>
                    <span className="text-right">On Hand</span>
                    <span></span>
                  </div>
                  {spareParts.filter((p) => p.quantityOnHand > 0).slice(0, 8).map((p) => {
                    const isLow = p.quantityOnHand <= 5;
                    return (
                      <div key={p.id} className="grid grid-cols-[1fr_60px_60px_40px] gap-1 items-center rounded px-2 py-1 text-xs border border-border/20 bg-card/40">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{p.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground font-mono">{p.partNumber}</p>
                        </div>
                        <span className="text-right text-muted-foreground">—</span>
                        <span className={`text-right font-semibold ${isLow ? "text-amber-500" : "text-foreground"}`}>
                          {p.quantityOnHand} {p.uom}
                        </span>
                        <button onClick={() => {
                          setSparePartId(p.id.toString());
                          setSparePartQty("1");
                        }}
                          className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors">
                          {selId ? "Use" : "—"}
                        </button>
                      </div>
                    );
                  })}
                  {selId && sparePartId && (
                    <div className="flex items-center gap-2 mt-1 p-2 rounded border border-indigo-200/30 bg-indigo-50/30 dark:bg-indigo-950/20">
                      <input type="number" value={sparePartQty} onChange={(e) => setSparePartQty(e.target.value)}
                        className="h-7 w-16 bg-white/50 dark:bg-slate-800/50 border border-white/30 px-2 text-xs outline-none" min="1" />
                      <button onClick={hRecordSpare}
                        className="inline-flex h-7 items-center gap-1 bg-teal-600 px-2.5 text-[10px] font-semibold text-white hover:bg-teal-700 transition-colors">
                        <Plus className="h-3 w-3" /> Record
                      </button>
                      <button onClick={() => { setSparePartId(""); setSparePartQty("1"); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Impact / Estimates */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                <Clock className="h-3 w-3" /> Impact / Estimates
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Labor / Time Estimate (hrs)">
                  <input type="number" value={form.laborEstimate} onChange={(e) => setForm({ ...form, laborEstimate: e.target.value })}
                    className={inpCls} placeholder="e.g. 4" min="0" step="0.5" />
                </Fld>
                <Fld label="Downtime Impact">
                  <p className="text-sm text-muted-foreground pt-1">Calculated at completion</p>
                </Fld>
              </div>
            </div>

            {/* 5. Completion Evidence */}
            {editMode && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                  <CheckCircle className="h-3 w-3" /> Completion Evidence
                </p>
                <div className="space-y-2">
                  <Fld label="Work Performed">
                    <textarea value={completeForm.workPerformed} onChange={(e) => setCompleteForm({ ...completeForm, workPerformed: e.target.value })}
                      className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                      placeholder="Describe the work that was actually performed..." />
                  </Fld>
                  <Fld label="Root Cause">
                    <textarea value={completeForm.rootCause} onChange={(e) => setCompleteForm({ ...completeForm, rootCause: e.target.value })}
                      className="h-14 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                      placeholder="Identify the root cause — 5 Whys for breakdowns..." />
                  </Fld>
                  <Fld label="Corrective Action">
                    <textarea value={completeForm.correctiveAction} onChange={(e) => setCompleteForm({ ...completeForm, correctiveAction: e.target.value })}
                      className="h-14 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                      placeholder="Action taken to prevent recurrence..." />
                  </Fld>
                  <Fld label="Verification / Test Result" required>
                    <textarea value={completeForm.verificationResult} onChange={(e) => setCompleteForm({ ...completeForm, verificationResult: e.target.value })}
                      className="h-14 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                      placeholder="Test run, quality inspection, sign-off..." />
                  </Fld>
                  <Fld label="Completion Notes" required>
                    <textarea value={completeForm.completionNotes} onChange={(e) => setCompleteForm({ ...completeForm, completionNotes: e.target.value })}
                      className="h-14 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                      placeholder="Summarize results, parts used, recommendations..." />
                  </Fld>
                  <div className="grid grid-cols-3 gap-3">
                    <Fld label="Actual Finish Date" required>
                      <input type="date" value={completeForm.actualEndDate} onChange={(e) => setCompleteForm({ ...completeForm, actualEndDate: e.target.value })}
                        className={inpCls} />
                    </Fld>
                    <Fld label="Actual Labor Hours">
                      <input type="number" value={completeForm.actualLaborHours} onChange={(e) => setCompleteForm({ ...completeForm, actualLaborHours: e.target.value })}
                        className={inpCls} placeholder="e.g. 3.5" min="0" step="0.5" />
                    </Fld>
                    <Fld label="Downtime (min)">
                      <input type="number" value={completeForm.downtimeMinutes} onChange={(e) => setCompleteForm({ ...completeForm, downtimeMinutes: e.target.value })}
                        className={inpCls} placeholder="e.g. 45" />
                    </Fld>
                  </div>
                  <Fld label="Parts Used">
                    <textarea value={completeForm.partsUsedNotes} onChange={(e) => setCompleteForm({ ...completeForm, partsUsedNotes: e.target.value })}
                      className="h-14 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-500"
                      placeholder="List parts used, quantities, and part numbers..." />
                  </Fld>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Validation summary when save is disabled */}
        {!canSave && (
          <div className="absolute bottom-0 left-[25%] right-0 z-10 border-t border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/30 px-3 py-1.5 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
            <span className="text-[10px] text-red-600 dark:text-red-400">
              Missing: {missingFields.join(", ")}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ── Detail (65/35 layout) ──
  const renderDetail = () => {
    if (!sel) return null;
    return (
      <div className="flex flex-1 min-h-0">
        {/* Left 65% */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Summary</p>
              <p className="text-sm text-foreground">{sel.description || <span className="italic text-muted-foreground/60">No description</span>}</p>
            </div>
            {sel.failureMode && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Failure Mode / Symptom</p>
                <p className="text-sm text-foreground">{sel.failureMode}</p>
              </div>
            )}
            {sel.workInstructions && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Work Instructions / Job Plan</p>
                <div className="rounded-lg bg-card/50 border border-border/30 p-3"><p className="text-sm text-foreground whitespace-pre-wrap">{sel.workInstructions}</p></div>
              </div>
            )}
            {sel.requiredTools && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Required Tools</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{sel.requiredTools}</p>
              </div>
            )}
            {sel.safetyNotes && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 mb-1">⚠ Safety Notes</p>
                <p className="text-sm text-orange-800 dark:text-orange-200">{sel.safetyNotes}</p>
              </div>
            )}
            {sel.completionNotes && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Work Performed</p>
                <div className="rounded-lg bg-card/50 border border-border/30 p-3"><p className="text-sm text-foreground whitespace-pre-wrap">{sel.completionNotes}</p></div>
              </div>
            )}
            {sel.workPerformed && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Detailed Work Performed</p>
                <div className="rounded-lg bg-card/50 border border-border/30 p-3"><p className="text-sm text-foreground whitespace-pre-wrap">{sel.workPerformed}</p></div>
              </div>
            )}
            {sel.rootCause && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Root Cause</p>
                <p className="text-sm text-foreground">{sel.rootCause}</p>
              </div>
            )}
            {sel.correctiveAction && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Corrective Action</p>
                <p className="text-sm text-foreground">{sel.correctiveAction}</p>
              </div>
            )}
            {sel.verificationResult && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Verification / Test Result</p>
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-950/20 p-3">
                  <p className="text-sm text-green-800 dark:text-green-200">{sel.verificationResult}</p>
                </div>
              </div>
            )}
            {partUsages.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Package className="h-3 w-3" /> Spare Parts Used
                </p>
                <div className="space-y-1">
                  {partUsages.map((u: any) => {
                    const part = spareParts.find((p) => p.id === u.partId);
                    return (
                      <div key={u.id} className="flex items-center gap-3 rounded-lg bg-card/50 border border-border/30 px-3 py-2 text-xs">
                        <span className="font-mono text-muted-foreground">{part?.partNumber || `#${u.partId}`}</span>
                        <span className="font-semibold text-foreground flex-1">{part?.name || "Unknown"}</span>
                        <span className="text-muted-foreground">x{u.quantity} {part?.uom || ""}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Spare Parts Required</p>
              {sel.sparePartsRequired ? (
                <div className="rounded-lg bg-card/50 border border-border/30 p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap font-mono">{formatMaybeJson(sel.sparePartsRequired)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Attachments</p>
              {sel.attachments ? (
                <div className="rounded-lg bg-card/50 border border-border/30 p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap font-mono">{formatMaybeJson(sel.attachments)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Labor</p>
                <p className="text-sm text-foreground">
                  {sel.laborEstimate != null ? `${sel.laborEstimate} hrs est.` : "—"}
                  {sel.actualLaborHours != null ? ` / ${sel.actualLaborHours} hrs actual` : ""}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Downtime</p>
                <p className="text-sm font-semibold text-foreground">{sel.downtimeMinutes != null ? `${sel.downtimeMinutes.toLocaleString()} min` : "—"}</p>
              </div>
            </div>
            {sel.partsUsedNotes && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Parts Used Notes</p>
                <div className="rounded-lg bg-card/50 border border-border/30 p-3"><p className="text-sm text-foreground whitespace-pre-wrap">{sel.partsUsedNotes}</p></div>
              </div>
            )}
            {sel.status === "IN_PROGRESS" && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Package className="h-3 w-3" /> Record Spare Part Usage
                </p>
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-muted-foreground">Part</label>
                    <select value={sparePartId} onChange={(e) => setSparePartId(e.target.value)}
                      className="h-7 bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 text-xs outline-none min-w-40">
                      <option value="">Select part...</option>
                      {spareParts.filter((p) => p.quantityOnHand > 0).map((p) => (
                        <option key={p.id} value={p.id}>{p.partNumber} - {p.name} ({p.quantityOnHand} {p.uom})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-muted-foreground">Qty</label>
                    <input type="number" value={sparePartQty} onChange={(e) => setSparePartQty(e.target.value)} min="1" className="h-7 w-16 bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 text-xs outline-none" />
                  </div>
                  <button onClick={hRecordSpare} disabled={!sparePartId}
                    className="inline-flex h-7 items-center gap-1 bg-teal-600 px-2.5 text-[10px] font-semibold text-white hover:bg-teal-700 disabled:opacity-40 transition-colors">
                    <Plus className="h-3 w-3" /> Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Right 35%: Status → Priority → Type → Target → Requested By → Assigned To → Schedule → Linked */}
        <div className="w-[35%] min-w-50 max-w-70 border-l border-border/20 bg-card/20 overflow-y-auto">
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] text-muted-foreground">Status</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${statusColors[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Priority</p>
                <p className={`text-sm font-semibold ${priorityStyles[sel.priority] || ""}`}>{sel.priority}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Type</p>
                <p className="text-sm font-semibold text-foreground">{typeLabel(sel.workOrderType)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Target Type</p>
                <p className="text-sm text-foreground">{sel.targetType || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Target ID</p>
                <p className="text-sm text-foreground">{sel.targetId != null ? `#${sel.targetId}` : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Target</p>
                <div className="space-y-0.5">
                  {sel.plantId && <p className="text-xs text-foreground">Plant #{sel.plantId}</p>}
                  {sel.productionLineId && <p className="text-xs text-foreground">Line #{sel.productionLineId}</p>}
                  {sel.departmentId && <p className="text-xs text-foreground">Dept #{sel.departmentId}</p>}
                  {sel.resourceGroupId && <p className="text-xs text-foreground">RG #{sel.resourceGroupId}</p>}
                  {sel.resourceId && <p className="text-xs font-semibold text-indigo-600">Resource #{sel.resourceId}</p>}
                </div>
                {!sel.plantId && <p className="text-sm text-muted-foreground">—</p>}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Requested By</p>
                <p className="text-sm font-semibold text-foreground">{sel.requestedBy || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Assigned To</p>
                <p className="text-sm font-semibold text-foreground">{sel.assignedTo || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Schedule</p>
                <div className="space-y-0.5 text-xs text-foreground">
                  <p>Opened: {sel.dateOpened?.slice(0, 10) || "—"}</p>
                  <p>Due: {sel.dueDate?.slice(0, 10) || "—"}</p>
                  {sel.plannedStartDate && <p>Planned Start: {sel.plannedStartDate.slice(0, 10)}</p>}
                  {sel.plannedEndDate && <p>Planned End: {sel.plannedEndDate.slice(0, 10)}</p>}
                  {sel.actualStartDate && <p className="text-green-700 dark:text-green-400">Actual Start: {sel.actualStartDate.slice(0, 10)}</p>}
                  {sel.actualEndDate && <p className="text-green-700 dark:text-green-400">Actual End: {sel.actualEndDate.slice(0, 10)}</p>}
                </div>
              </div>
            </div>
            {(sel.linkedPmId || sel.linkedBreakdownId) && (
              <div className="border-t border-border/20 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Linked</p>
                <div className="flex flex-wrap gap-1">
                  {sel.linkedPmId && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">PM #{sel.linkedPmId}</span>}
                  {sel.linkedBreakdownId && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">BD #{sel.linkedBreakdownId}</span>}
                  {sel.linkedMerId && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">MER #{sel.linkedMerId}</span>}
                </div>
              </div>
            )}
            <div className="border-t border-border/20 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Metadata</p>
              <div className="space-y-0.5 text-xs text-foreground">
                <p>Record ID: {sel.id}</p>
                <p>WO Number: {sel.number || "—"}</p>
                <p>Created At: {sel.createdAt ? sel.createdAt.replace("T", " ").slice(0, 19) : "—"}</p>
                <p>Updated At: {sel.updatedAt ? sel.updatedAt.replace("T", " ").slice(0, 19) : "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Main Content ──
  const renderMain = () => {
    // Always 20/80 split: left=WO records list, right=dashboard/detail/form
    const rightContent = view === "form" ? renderForm() : sel ? renderDetail() : renderDashboard();

    return (
      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left 20%: Work Order Records List — always visible */}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-border/20 bg-card/30"
          style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
          <div className="shrink-0 h-8 flex items-center border-b border-border/30 bg-muted/50 px-3">
            <span className="text-xs font-medium text-muted-foreground">Work Orders</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{workOrders.length}</span>
          </div>
          {/* Records list */}
          <div className="flex-1 overflow-y-auto">
            {listLoading && workOrders.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...</div>
            ) : workOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <ClipboardList className="h-6 w-6 text-muted-foreground/30 mb-1" />
                <p className="text-xs font-medium text-muted-foreground">No work orders recorded</p>
                <button onClick={hNewWO} className="mt-2 inline-flex h-7 items-center gap-1 bg-indigo-600/10 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-600/20 dark:text-indigo-400 transition-colors">
                  <Plus className="h-3 w-3" /> New WO
                </button>
              </div>
            ) : (
              <div>{workOrders.map((wo) => (
                <div key={wo.id} role="option" aria-selected={selId === wo.id}
                  tabIndex={0}
                  onClick={() => { setSelId(wo.id); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelId(wo.id);
                    }
                  }}
                  className={`group mx-1 my-0.5 flex h-14 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${
                    selId === wo.id ? "bg-table-selected border-l-2 border-l-indigo-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"
                  }`}>
                  <span className={`shrink-0 inline-block h-2 w-2 rounded-full ${statusDot(wo.status)} ${["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(wo.status) ? "animate-pulse" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">{wo.title}</span>
                      <span className={`shrink-0 text-[10px] font-bold ${priorityStyles[wo.priority] || "text-muted-foreground"}`}>
                        {wo.priority === "HIGH" ? "H" : wo.priority === "CRITICAL" ? "C" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono">{wo.number}</span><span>·</span>
                      <span>{typeLabel(wo.workOrderType)}</span>
                      {wo.assignedTo && <><span>·</span><span>{wo.assignedTo}</span></>}
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${statusColors[wo.status] || ""}`}>{statusLabel(wo.status)}</span>
                </div>
              ))}</div>
            )}
          </div>
          {/* Footer inside left panel */}
          <div className="shrink-0 h-7 flex items-center border-t border-border/30 bg-muted/50 px-3">
            <span className="text-[10px] text-muted-foreground">{workOrders.length} WO{workOrders.length !== 1 ? "s" : ""}</span>
            <span className="ml-auto flex gap-2">
              <span className="text-[9px] text-blue-600">{workOrders.filter((w) => ["OPEN", "ASSIGNED"].includes(w.status)).length} open</span>
              <span className="text-[9px] text-amber-600">{workOrders.filter((w) => w.status === "IN_PROGRESS").length} active</span>
              <span className="text-[9px] text-green-600">{workOrders.filter((w) => w.status === "COMPLETED").length} done</span>
              {workOrders.filter((w) => w.dueDate && w.dueDate < todayStr && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)).length > 0 && (
                <span className="text-[9px] text-red-600">{workOrders.filter((w) => w.dueDate && w.dueDate < todayStr && !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(w.status)).length} overdue</span>
              )}
            </span>
          </div>
        </div>

        {/* Resizer */}
        {view !== "form" && selId && (
          <div onMouseDown={handleSplitMouseDown}
            className="flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-indigo-500/10"
            style={{ width: 2 }} />
        )}

        {/* Right 80%: Dashboard / Detail / Form */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {rightContent}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      {(successMsg || errorMsg) && (
        <div role={errorMsg ? "alert" : "status"} aria-live={errorMsg ? "assertive" : "polite"} className={`shrink-0 h-8 flex items-center justify-center text-sm font-semibold border-b ${
          errorMsg
            ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-300"
            : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300"
        }`}>
          {errorMsg ? <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
          {errorMsg || successMsg}
        </div>
      )}
      <PageHeader
        icon={<Wrench className="h-5 w-5 stroke-current" />}
        iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
        title="Work Orders"
        subtitle="Lean maintenance: plan → execute → complete with spare parts tracking"
      />
      <div className="print-ignore">
        <SplitToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search WOs..."
          filters={selId && view !== "form" ? (
            <>
              <ToolbarDropdown value={filterType} onChange={setFilterType} options={TYPE_OPTIONS} className="w-36" />

              <ToolbarDropdown value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} className="w-32" />

            </>
          ) : undefined}
          actions={<div className="flex items-center gap-1 shrink-0">{renderToolbar()}</div>}
        />
      </div>
      {renderMain()}
      {/* Page footer — state-specific metadata */}
      <div className="shrink-0 border-t border-border bg-muted flex h-10 items-center gap-3 px-4 text-[10px] text-muted-foreground font-medium">
        {view === "form" ? (
          <>
            <span className="font-semibold text-foreground">Work Orders</span>
            <span className="flex-1" />
            {!editMode && missingFields.length > 0 && (
              <span className="text-red-500 font-medium">{missingFields.length} required fields missing</span>
            )}
            {editMode && <span className="text-amber-500 italic">Editing — unsaved changes</span>}
            {!editMode && missingFields.length === 0 && <span className="text-green-600">New work order — ready to save</span>}
          </>
        ) : sel ? (
          <>
            <span className="font-semibold text-foreground">{sel.number}</span>
            <span className="text-muted-foreground">·</span>
            <span>{typeLabel(sel.workOrderType)}</span>
            <span className="text-muted-foreground">·</span>
            <span className={`font-semibold ${priorityStyles[sel.priority] || ""}`}>{sel.priority}</span>
            <span className="text-muted-foreground">·</span>
            <span className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold border ${statusColors[sel.status] || ""}`}>{statusLabel(sel.status)}</span>
            <span className="flex-1" />
            <span>Created: {sel.dateOpened?.slice(0, 10) || "—"}</span>
            <span className="text-muted-foreground">·</span>
            <span>Updated: {sel.updatedAt?.slice(0, 10) || "—"}</span>
          </>
        ) : (
          <>
            <span className="font-semibold text-foreground">Maintenance Dashboard</span>
            <span className="flex-1" />
            <span className="text-blue-600">{workOrders.filter((w) => ["OPEN", "ASSIGNED"].includes(w.status)).length} open WOs</span>
            <span className="text-orange-600">{breakdowns.filter((b: any) => ["REPORTED", "UNDER_REPAIR"].includes(b.status)).length} active BD</span>
            <span className="text-purple-600">{duePlans.length} PM due</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{dash.totalDowntimeMinutes.toLocaleString()} min downtime</span>
            <span className="flex-1" />
            <span className="text-[9px]">Last updated: {dash.lastUpdated?.slice(0, 16).replace("T", " ") || "—"}</span>
          </>
        )}
      </div>

      <ConfirmDialog open={confirmAction?.action === "complete"} onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          if (!completeForm.completionNotes.trim()) { err("Completion notes are required"); return; }
          if (!completeForm.actualEndDate) { err("Actual end date is required"); return; }
          doAction("complete", confirmAction.id, {
            workPerformed: completeForm.workPerformed || undefined,
            completionNotes: completeForm.completionNotes || undefined,
            downtimeMinutes: completeForm.downtimeMinutes ? Number(completeForm.downtimeMinutes) : null,
            rootCause: completeForm.rootCause || undefined,
            correctiveAction: completeForm.correctiveAction || undefined,
            verificationResult: completeForm.verificationResult || undefined,
            actualEndDate: completeForm.actualEndDate || undefined,
            actualLaborHours: completeForm.actualLaborHours ? Number(completeForm.actualLaborHours) : null,
            partsUsedNotes: completeForm.partsUsedNotes || undefined,
          });
        }}
        title="Complete Work Order"
        message="Record completion details including work performed, downtime, and verification."
        confirmLabel="Complete" danger={false}
      >
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Work Performed *</label>
            <textarea placeholder="Describe the work that was actually performed, findings, and observations..."
              value={completeForm.workPerformed} onChange={(e) => setCompleteForm({ ...completeForm, workPerformed: e.target.value })}
              className="h-16 w-full border border-border bg-background px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Completion Notes *</label>
            <textarea placeholder="Summarize results, spare parts used, and recommendations..."
              value={completeForm.completionNotes} onChange={(e) => setCompleteForm({ ...completeForm, completionNotes: e.target.value })}
              className="h-16 w-full border border-border bg-background px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-400 transition-colors" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Actual Finish Date</label>
              <input type="date" value={completeForm.actualEndDate} onChange={(e) => setCompleteForm({ ...completeForm, actualEndDate: e.target.value })}
                className="h-8 w-full border border-border bg-background px-2.5 text-sm outline-none focus:border-indigo-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Actual Labor Hours</label>
              <input type="number" placeholder="e.g. 3.5" value={completeForm.actualLaborHours} onChange={(e) => setCompleteForm({ ...completeForm, actualLaborHours: e.target.value })}
                className="h-8 w-full border border-border bg-background px-2.5 text-sm outline-none focus:border-indigo-400 transition-colors" min="0" step="0.5" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Downtime (minutes)</label>
              <input type="number" placeholder="e.g. 45" value={completeForm.downtimeMinutes} onChange={(e) => setCompleteForm({ ...completeForm, downtimeMinutes: e.target.value })}
                className="h-8 w-full border border-border bg-background px-2.5 text-sm outline-none focus:border-indigo-400 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Verification / Test Result *</label>
            <textarea placeholder="Describe how the work was verified — test run, quality inspection, sign-off..."
              value={completeForm.verificationResult} onChange={(e) => setCompleteForm({ ...completeForm, verificationResult: e.target.value })}
              className="h-16 w-full border border-border bg-background px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Root Cause (required for BD/CM)</label>
            <textarea placeholder="Identify the root cause — apply 5 Whys for breakdowns..."
              value={completeForm.rootCause} onChange={(e) => setCompleteForm({ ...completeForm, rootCause: e.target.value })}
              className="h-16 w-full border border-border bg-background px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Corrective Action</label>
            <textarea placeholder="Describe the corrective action taken to prevent recurrence..."
              value={completeForm.correctiveAction} onChange={(e) => setCompleteForm({ ...completeForm, correctiveAction: e.target.value })}
              className="h-16 w-full border border-border bg-background px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Parts Used</label>
            <textarea placeholder="List parts used, quantities, and part numbers..."
              value={completeForm.partsUsedNotes} onChange={(e) => setCompleteForm({ ...completeForm, partsUsedNotes: e.target.value })}
              className="h-12 w-full border border-border bg-background px-2.5 py-1.5 text-sm outline-none resize-none focus:border-indigo-400 transition-colors" />
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog open={confirmAction?.action === "cancel"} onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && doAction("cancel", confirmAction.id)}
        title="Cancel Work Order"
        message="Are you sure you want to cancel this work order?"
        confirmLabel="Yes, Cancel" danger={true} />
    </div>
  );
}
