import { useState, useCallback, type ReactNode } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  AlertTriangle, FileText, Target, User, Clock,
  Wrench, ArrowRight, ArrowLeft, Save, XCircle,
  CalendarClock, AlertCircle, Activity,
} from "lucide-react";
import { BREAKDOWNS_QUERY, WORK_ORDERS_QUERY } from "@/graphql/maintenanceQueries";
import { mockBreakdowns } from "@/demo/maintenanceMockData";
import {
  START_BREAKDOWN_REPAIR_MUTATION, COMPLETE_BREAKDOWN_REPAIR_MUTATION,
  CLOSE_BREAKDOWN_MUTATION, CANCEL_BREAKDOWN_MUTATION,
  CREATE_WO_FROM_BREAKDOWN_MUTATION, REPORT_BREAKDOWN_MUTATION,
  UPDATE_BREAKDOWN_MUTATION,
} from "@/graphql/maintenanceMutations";
import {
  BREAKDOWN_STATUS_STYLES, SEVERITY_STYLES, SEVERITY_BG,
  WORKFLOW_STEPS, wfLabel, severityIcon,
  SEVERITY_OPTIONS, PRIORITY_OPTIONS, PRIORITY_STYLES, statusDotColor,
} from "./BreakdownStatusStyles";
import type { CascadeValue } from "./TargetCascade";
import { resolveTarget } from "./TargetCascade";
import { TargetCascade } from "./TargetCascade";

// ── Types ──

export interface Breakdown {
  id: number; number: string; title: string; description: string;
  targetType: string; targetId: number | null; severity: string; status: string;
  priority: string;
  reportedBy: string; assignedTo: string; reportedAt: string;
  repairStartedAt: string | null; repairCompletedAt: string | null;
  downtimeMinutes: number | null; downtimeStart: string | null; downtimeEnd: string | null;
  rootCause: string; repairSummary: string; failureMode: string;
  safetyImpact: string; productionImpact: string; isEquipmentDown: boolean;
  temporaryContainment: string; suspectedCause: string;
  confirmedRootCause: string; correctiveAction: string;
  partsRequired: string; repairNotes: string;
  verificationResult: string; completionNotes: string;
  linkedWorkOrderId: number | null;
}

export interface ReportFormData {
  title: string; description: string; failureMode: string;
  cascade: CascadeValue;
  severity: string; priority: string;
  reportedBy: string; assignedTo: string;
  isEquipmentDown: boolean;
  safetyImpact: string; productionImpact: string;
  temporaryContainment: string;
}

export interface BreakdownSectionResult {
  items: Breakdown[];
  selectedId: number | null;
  loading: boolean;
  renderList: (selectedId: number | null, onSelect: (id: number | null) => void) => ReactNode;
  renderDetail: (id: number | null) => ReactNode;
  canResolve: boolean;
  canClose: boolean;
  canCancel: boolean;
  canCreateWO: boolean;
  canEdit: boolean;
  handleAction: (action: string) => void;
  confirmAction: { id: number; action: string } | null;
  setConfirmAction: (a: { id: number; action: string } | null) => void;
  resolveForm: { confirmedRootCause: string; correctiveAction: string; verificationResult: string; completionNotes: string; downtimeEnd: string };
  setResolveForm: (f: { confirmedRootCause: string; correctiveAction: string; verificationResult: string; completionNotes: string; downtimeEnd: string }) => void;
  confirmResolve: () => Promise<void>;
  confirmClose: () => Promise<void>;
  refetch: () => void;
  reportMode: "add" | "edit" | null;
  startAddReport: () => void;
  startEditReport: () => void;
  cancelReport: () => void;
  renderInlineForm: (isEdit: boolean) => ReactNode;
  reportForm: ReportFormData;
  setReportForm: (f: ReportFormData) => void;
  submitReport: () => Promise<void>;
  submitting: boolean;
  updateForm: { title: string; description: string; failureMode: string; severity: string; priority: string; assignedTo: string };
  setUpdateForm: (f: { title: string; description: string; failureMode: string; severity: string; priority: string; assignedTo: string }) => void;
  submitUpdate: () => Promise<void>;
  updating: boolean;
  woDialogOpen: boolean;
  openWODialog: () => void;
  closeWODialog: () => void;
  woAssignedTo: string;
  setWoAssignedTo: (v: string) => void;
  woPriority: string;
  submitWO: () => Promise<void>;
  woSubmitting: boolean;
  selBreakdown: Breakdown | null;
}

// ── Shared Styles ──

const inpCls = "h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 transition-all placeholder:text-muted-foreground/40";
const selCls = inpCls + " appearance-none";
const texCls = "min-h-[72px] w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none resize-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 transition-all placeholder:text-muted-foreground/40";

function Field({ label, children, required, error }: { label: string; children: ReactNode; required?: boolean; error?: string }) {
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

function SectionTitle({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
      {icon}{label}
    </p>
  );
}

// ── Hook ──

export function useBreakdownSection(
  search: string,
  filterStatus: string,
  filterSeverity: string,
  onMessage: (msg: string, tone?: "success" | "error") => void,
): BreakdownSectionResult {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);
  const [resolveForm, setResolveForm] = useState({ confirmedRootCause: "", correctiveAction: "", verificationResult: "", completionNotes: "", downtimeEnd: "" });

  const { data, loading, refetch } = useQuery(BREAKDOWNS_QUERY, {
    variables: { search: search || undefined, status: filterStatus || undefined, severity: filterSeverity || undefined },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [reportMode, setReportMode] = useState<"add" | "edit" | null>(null);
  const [reportForm, setReportForm] = useState<ReportFormData>({
    title: "", description: "", failureMode: "",
    cascade: { plantId: "", lineId: "", deptId: "", rgId: "", resourceId: "" },
    severity: "MEDIUM", priority: "MEDIUM",
    reportedBy: "", assignedTo: "",
    isEquipmentDown: false, safetyImpact: "", productionImpact: "", temporaryContainment: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [updateForm, setUpdateForm] = useState({ title: "", description: "", failureMode: "", severity: "", priority: "", assignedTo: "" });
  const [updating, setUpdating] = useState(false);
  const [woDialogOpen, setWoDialogOpen] = useState(false);
  const [woAssignedTo, setWoAssignedTo] = useState("");
  const [woSubmitting, setWoSubmitting] = useState(false);

  const [startRepairMut] = useMutation(START_BREAKDOWN_REPAIR_MUTATION);
  const [completeRepairMut] = useMutation(COMPLETE_BREAKDOWN_REPAIR_MUTATION);
  const [closeBDMut] = useMutation(CLOSE_BREAKDOWN_MUTATION);
  const [cancelBDMut] = useMutation(CANCEL_BREAKDOWN_MUTATION);
  const [createWOMut] = useMutation(CREATE_WO_FROM_BREAKDOWN_MUTATION, { refetchQueries: [{ query: WORK_ORDERS_QUERY }] });
  const [reportBDMut] = useMutation(REPORT_BREAKDOWN_MUTATION);
  const [updateBDMut] = useMutation(UPDATE_BREAKDOWN_MUTATION);

  const breakdowns: Breakdown[] = (data as any)?.breakdowns ?? mockBreakdowns.breakdowns;
  const sel = selectedId ? breakdowns.find((b) => b.id === selectedId) ?? null : null;

  const doAction = useCallback(async (action: string, id: number, extra?: Record<string, any>) => {
    try {
      let msg = "";
      if (action === "resolve") {
        await completeRepairMut({
          variables: {
            id,
            repairSummary: extra?.completionNotes || "",
            rootCause: extra?.confirmedRootCause || "",
          },
        });
        msg = "Breakdown resolved";
      } else if (action === "close") { await closeBDMut({ variables: { id } }); msg = "Breakdown closed"; }
      else if (action === "cancel") { await cancelBDMut({ variables: { id } }); msg = "Breakdown cancelled"; }
      onMessage(msg, "success");
      setConfirmAction(null);
      refetch();
    } catch (e: any) {
      onMessage(`Error: ${e.message}`, "error");
    }
  }, [completeRepairMut, closeBDMut, cancelBDMut, refetch, onMessage]);

  const confirmResolve = useCallback(async () => {
    if (!confirmAction) return;
    await doAction("resolve", confirmAction.id, resolveForm);
    setResolveForm({ confirmedRootCause: "", correctiveAction: "", verificationResult: "", completionNotes: "", downtimeEnd: "" });
  }, [confirmAction, doAction, resolveForm]);

  const confirmClose = useCallback(async () => {
    if (!confirmAction) return;
    await doAction("close", confirmAction.id);
  }, [confirmAction, doAction]);

  const startAddReport = useCallback(() => {
    setReportForm({
      title: "", description: "", failureMode: "",
      cascade: { plantId: "", lineId: "", deptId: "", rgId: "", resourceId: "" },
      severity: "MEDIUM", priority: "MEDIUM",
      reportedBy: "", assignedTo: "",
      isEquipmentDown: false, safetyImpact: "", productionImpact: "", temporaryContainment: "",
    });
    setReportMode("add");
  }, []);

  const startEditReport = useCallback(() => {
    if (!sel) return;
    setUpdateForm({
      title: sel.title, description: sel.description, failureMode: sel.failureMode || "",
      severity: sel.severity, priority: sel.priority || "MEDIUM", assignedTo: sel.assignedTo || "",
    });
    setReportMode("edit");
  }, [sel]);

  const cancelReport = useCallback(() => setReportMode(null), []);

  const submitReport = useCallback(async () => {
    if (!reportForm.title.trim()) { onMessage("Title is required", "error"); return; }
    if (!reportForm.description.trim()) { onMessage("Description is required", "error"); return; }
    if (!reportForm.failureMode.trim()) { onMessage("Failure mode is required", "error"); return; }
    setSubmitting(true);
    try {
      const target = resolveTarget(reportForm.cascade);
      if (!target) { onMessage("Select a target (Plant at minimum)", "error"); setSubmitting(false); return; }
      await reportBDMut({
        variables: {
          title: reportForm.title.trim(),
          targetType: target.targetType,
          targetId: target.targetId ? parseInt(target.targetId, 10) : null,
          description: reportForm.description.trim(),
          severity: reportForm.severity,
          reportedBy: reportForm.reportedBy.trim() || undefined,
        },
      });
      onMessage("Breakdown reported", "success");
      setReportMode(null);
      refetch();
    } catch (e: any) {
      onMessage(`Error: ${e.message}`, "error");
    }
    setSubmitting(false);
  }, [reportForm, reportBDMut, onMessage, refetch]);

  const submitUpdate = useCallback(async () => {
    if (!sel) return;
    if (!updateForm.title.trim()) { onMessage("Title is required", "error"); return; }
    setUpdating(true);
    try {
      await updateBDMut({
        variables: {
          id: sel.id,
          title: updateForm.title.trim(),
          description: updateForm.description.trim() || undefined,
          severity: updateForm.severity,
        },
      });
      onMessage(`BD#${sel.number} updated`, "success");
      setReportMode(null);
      refetch();
    } catch (e: any) {
      onMessage(`Error: ${e.message}`, "error");
    }
    setUpdating(false);
  }, [sel, updateForm, updateBDMut, onMessage, refetch]);

  const openWODialog = useCallback(() => { if (!sel) return; setWoAssignedTo(""); setWoDialogOpen(true); }, [sel]);
  const closeWODialog = useCallback(() => setWoDialogOpen(false), []);

  const submitWO = useCallback(async () => {
    if (!sel) return;
    setWoSubmitting(true);
    try {
      await createWOMut({ variables: { id: sel.id, assignedTo: woAssignedTo.trim() || undefined } });
      onMessage(`Work order created from BD#${sel.number}`, "success");
      setWoDialogOpen(false); setWoAssignedTo(""); refetch();
    } catch (e: any) { onMessage(`Error: ${e.message}`, "error"); }
    setWoSubmitting(false);
  }, [sel, woAssignedTo, createWOMut, onMessage, refetch]);

  const handleAction = useCallback((action: string) => {
    if (!sel) return;
    if (action === "resolve" || action === "cancel" || action === "close") {
      setConfirmAction({ id: sel.id, action });
    } else if (action === "create-wo") {
      openWODialog();
    }
  }, [sel, openWODialog]);

  const canResolve = sel?.status === "IN_PROGRESS" || sel?.status === "WAITING_PARTS";
  const canClose = sel?.status === "RESOLVED";
  const canCancel = !!(sel?.status && ["REPORTED", "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS"].includes(sel.status));
  const canCreateWO = !!(sel?.status && ["REPORTED", "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS"].includes(sel.status)) && !sel.linkedWorkOrderId;
  const canEdit = !!(sel?.status && !["RESOLVED", "CLOSED", "CANCELLED"].includes(sel.status));

  // ── List Renderer ──
  const renderList = useCallback((_selId: number | null, onSelect: (id: number | null) => void) => (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 h-8 flex items-center border-b border-border/30 bg-muted/50 px-3">
        <span className="text-xs font-medium text-muted-foreground">Breakdowns</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{breakdowns.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && breakdowns.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 bg-muted-foreground/40 animate-pulse mr-2" />Loading...
          </div>
        ) : breakdowns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-xs font-medium text-muted-foreground">No breakdowns found</p>
          </div>
        ) : (
          <div>
            {breakdowns.map((bd) => (
              <div key={bd.id} role="option" aria-selected={selectedId === bd.id}
                tabIndex={0}
                onClick={() => { onSelect(bd.id); setSelectedId(bd.id); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(bd.id);
                    setSelectedId(bd.id);
                  }
                }}
                className={`group mx-1 my-0.5 flex h-16 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${
                  selectedId === bd.id ? "bg-table-selected border-l-2 border-l-orange-500" : "border-l-2 border-l-transparent hover:bg-table-row-hover"
                }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${SEVERITY_BG[bd.severity] || "bg-muted"} ${SEVERITY_STYLES[bd.severity] || ""}`}>
                  {severityIcon(bd.severity)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">{bd.title}</span>
                    <span className={`shrink-0 text-[9px] font-bold ${PRIORITY_STYLES[bd.priority] || ""}`}>
                      {bd.priority === "CRITICAL" ? "C" : bd.priority === "HIGH" ? "H" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-mono">{bd.number}</span>
                    <span>·</span>
                    <span className="truncate">{bd.targetType}{bd.targetId ? ` #${bd.targetId}` : ""}</span>
                    {bd.downtimeMinutes != null && <><span>·</span><span>{bd.downtimeMinutes} min</span></>}
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${BREAKDOWN_STATUS_STYLES[bd.status] || ""}`}>
                  {wfLabel(bd.status)}
                </span>
                {bd.linkedWorkOrderId && (
                  <span title={`WO #${bd.linkedWorkOrderId}`}><Wrench className="h-3 w-3 shrink-0 text-muted-foreground/40 stroke-current" /></span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 h-7 flex items-center border-t border-border/30 bg-muted/50 px-3">
        <span className="text-[10px] text-muted-foreground">{breakdowns.length} breakdown{breakdowns.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  ), [breakdowns, loading, selectedId]);

  // ── Inline Form (25/75 split) ──
  const renderInlineForm = useCallback((isEdit: boolean) => (
    <div className="flex flex-1 min-h-0">
      {/* Left 25%: Target + Metadata */}
      <div className="w-[25%] min-w-50 border-r border-border/20 bg-card/30 overflow-y-auto p-4 space-y-4">
        <SectionTitle icon={<Target className="h-3 w-3" />} label="Target Location" />
        {isEdit && sel ? (
          <div className="space-y-2">
            <Field label="Target">
              <p className="text-sm text-foreground">{sel.targetType} {sel.targetId ? `#${sel.targetId}` : "—"}</p>
            </Field>
          </div>
        ) : (
          <TargetCascade value={reportForm.cascade} onChange={(v) => setReportForm({ ...reportForm, cascade: v })} plantRequired={false} />
        )}

        <SectionTitle icon={<FileText className="h-3 w-3" />} label="Response Metadata" />
        {isEdit && sel && <Field label="Number"><p className="text-sm font-mono text-foreground">{sel.number}</p></Field>}
        <Field label="Status"><p className="text-sm font-semibold text-foreground">{isEdit && sel ? wfLabel(sel.status) : "New"}</p></Field>
        <Field label="Severity *">
          <select value={isEdit ? updateForm.severity : reportForm.severity}
            onChange={(e) => isEdit ? setUpdateForm({ ...updateForm, severity: e.target.value }) : setReportForm({ ...reportForm, severity: e.target.value })}
            className={selCls}>
            {SEVERITY_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Priority *">
          {isEdit ? (
            <div className="space-y-1">
              <p className="text-sm text-foreground">{sel?.priority || "MEDIUM"}</p>
              <p className="text-[10px] text-muted-foreground">Priority updates are not persisted from Breakdown edit yet.</p>
            </div>
          ) : (
            <select value={reportForm.priority}
              onChange={(e) => setReportForm({ ...reportForm, priority: e.target.value })}
              className={selCls}>
              {PRIORITY_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Reported By *">
          <input type="text" value={isEdit ? (sel?.reportedBy || "") : reportForm.reportedBy}
            onChange={(e) => !isEdit && setReportForm({ ...reportForm, reportedBy: e.target.value })}
            className={inpCls} placeholder="Your name" disabled={isEdit} />
        </Field>
        <Field label="Assigned Technician">
          {isEdit ? (
            <div className="space-y-1">
              <p className="text-sm text-foreground">{sel?.assignedTo || "—"}</p>
              <p className="text-[10px] text-muted-foreground">Assignment updates are not persisted from Breakdown edit yet.</p>
            </div>
          ) : (
            <input type="text" value={reportForm.assignedTo}
              onChange={(e) => setReportForm({ ...reportForm, assignedTo: e.target.value })}
              className={inpCls} placeholder="Technician name" />
          )}
        </Field>
        <Field label="Reported Date/Time">
          <p className="text-sm text-foreground">{isEdit && sel ? (sel.reportedAt?.slice(0, 16) || "—") : new Date().toLocaleString()}</p>
        </Field>
        <Field label="Is Equipment Down?">
          {isEdit ? (
            <p className="text-sm text-foreground">{sel?.isEquipmentDown ? "Yes" : "No"}</p>
          ) : (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={reportForm.isEquipmentDown}
                onChange={(e) => setReportForm({ ...reportForm, isEquipmentDown: e.target.checked })}
                className="h-4 w-4 accent-orange-600 rounded" />
              <span className="text-foreground">{reportForm.isEquipmentDown ? "Yes — equipment stopped" : "No — running with issue"}</span>
            </label>
          )}
        </Field>
      </div>

      {/* Right 75%: Failure Report + Root Cause/Repair */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-5">
        {/* Failure Report */}
        <div>
          <SectionTitle icon={<AlertCircle className="h-3 w-3" />} label="Failure Report" />
          <div className="space-y-3">
            <Field label="Title *">
              <input type="text" value={isEdit ? updateForm.title : reportForm.title}
                onChange={(e) => isEdit ? setUpdateForm({ ...updateForm, title: e.target.value }) : setReportForm({ ...reportForm, title: e.target.value })}
                className={inpCls} placeholder="e.g. Conveyor belt motor failure" />
            </Field>
            <Field label="What Happened / Description *">
              <textarea value={isEdit ? updateForm.description : reportForm.description}
                onChange={(e) => isEdit ? setUpdateForm({ ...updateForm, description: e.target.value }) : setReportForm({ ...reportForm, description: e.target.value })}
                className={texCls} placeholder="Describe what happened..." />
            </Field>
            <Field label="Failure Mode / Symptom *">
              {isEdit ? (
                <div className="space-y-1">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{sel?.failureMode || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Failure mode updates are not persisted from Breakdown edit yet.</p>
                </div>
              ) : (
                <textarea value={reportForm.failureMode}
                  onChange={(e) => setReportForm({ ...reportForm, failureMode: e.target.value })}
                  className={texCls} placeholder="Observed symptoms, error codes, noise, vibration..." />
              )}
            </Field>
            {!isEdit && (
              <>
                <Field label="Safety Impact">
                  <textarea value={reportForm.safetyImpact} onChange={(e) => setReportForm({ ...reportForm, safetyImpact: e.target.value })}
                    className={texCls} placeholder="Safety concerns, hazards, LOTO requirements..." />
                </Field>
                <Field label="Production Impact">
                  <textarea value={reportForm.productionImpact} onChange={(e) => setReportForm({ ...reportForm, productionImpact: e.target.value })}
                    className={texCls} placeholder="Impact on production output, line speed, quality..." />
                </Field>
                <Field label="Temporary Containment / Workaround">
                  <textarea value={reportForm.temporaryContainment} onChange={(e) => setReportForm({ ...reportForm, temporaryContainment: e.target.value })}
                    className={texCls} placeholder="What was done to keep production running? Bypass, alternate routing, etc." />
                </Field>
              </>
            )}
          </div>
        </div>

        {/* Root Cause / Repair (shown in edit mode) */}
        {isEdit && (
          <div>
            <SectionTitle icon={<Activity className="h-3 w-3" />} label="Root Cause / Repair" />
            <div className="space-y-3 opacity-50 pointer-events-none">
              <p className="text-xs text-muted-foreground italic">Use the Resolve workflow on the detail view to complete these fields.</p>
            </div>
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/30">
          <button type="button" onClick={isEdit ? submitUpdate : submitReport}
            disabled={isEdit ? (updating || !updateForm.title.trim()) : (submitting || !reportForm.title.trim() || !reportForm.description.trim() || !reportForm.failureMode.trim())}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-600 px-4 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-40 transition-colors">
            {submitting || updating ? (
              <><span className="inline-block h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> {isEdit ? "Saving..." : "Reporting..."}</>
            ) : (
              <><Save className="h-3.5 w-3.5 stroke-current" /> {isEdit ? "Save Changes" : "Report Breakdown"}</>
            )}
          </button>
          <button type="button" onClick={cancelReport}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <XCircle className="h-3.5 w-3.5 stroke-current" /> Cancel
          </button>
        </div>
      </div>
    </div>
  ), [reportForm, updateForm, submitReport, submitUpdate, cancelReport, submitting, updating, sel]);

  // ── Detail Renderer (65/35 split) ──
  const renderDetail = useCallback((_id: number | null) => {
    if (reportMode === "edit") return renderInlineForm(true);

    if (!sel) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-xs">
            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/20 stroke-current mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No breakdown selected</h3>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">Select a breakdown from the list to view details.</p>
          </div>
        </div>
      );
    }

    const curIdx = WORKFLOW_STEPS.indexOf(sel.status);
    const isCancelled = sel.status === "CANCELLED";

    return (
      <div className="flex flex-1 min-h-0">
        {/* Left 65%: Failure + Root Cause + Repair */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="sticky top-0 bg-card z-10 border-b border-border/30 px-5 py-3">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground truncate">{sel.title}</h2>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${BREAKDOWN_STATUS_STYLES[sel.status] || ""}`}>
                    {wfLabel(sel.status)}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${SEVERITY_STYLES[sel.severity] || ""} ${SEVERITY_BG[sel.severity] || ""}`}>
                    {sel.severity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono">{sel.number}</span>
                  <span className="mx-1.5">·</span>
                  {sel.targetType} {sel.targetId ? `#${sel.targetId}` : ""}
                  {sel.reportedBy && <><span className="mx-1.5">·</span>{sel.reportedBy}</>}
                  {sel.assignedTo && <><span className="mx-1.5">→</span>{sel.assignedTo}</>}
                </p>
              </div>
            </div>
            {/* Workflow steps */}
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              {WORKFLOW_STEPS.map((step, i) => {
                const isPast = curIdx > i;
                const isCurrent = curIdx === i;
                return (
                  <div key={step} className="flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors
                      ${isCurrent ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                        isPast && !isCancelled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                        "bg-muted text-muted-foreground"}`}>
                      {isPast && !isCancelled ? "✓ " : ""}{wfLabel(step)}
                    </span>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <ArrowRight className={`h-3 w-3 ${isPast && !isCancelled ? "text-green-400" : "text-muted-foreground/30"} stroke-current`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Failure Report */}
            <div>
              <SectionTitle icon={<AlertCircle className="h-3.5 w-3.5" />} label="Failure Report" />
              <div className="space-y-3">
                <InfoRow label="Description" value={sel.description} />
                {sel.failureMode && <InfoRow label="Failure Mode" value={sel.failureMode} />}
                {sel.safetyImpact && <InfoRow label="Safety Impact" value={sel.safetyImpact} highlight />}
                {sel.productionImpact && <InfoRow label="Production Impact" value={sel.productionImpact} />}
                {sel.isEquipmentDown && <InfoRow label="Equipment Status" value="Equipment is DOWN — production affected" />}
                {sel.temporaryContainment && <InfoRow label="Temporary Containment" value={sel.temporaryContainment} />}
              </div>
            </div>

            {/* Root Cause / Repair */}
            <div>
              <SectionTitle icon={<Activity className="h-3.5 w-3.5" />} label="Root Cause / Repair" />
              <div className="space-y-3">
                {sel.suspectedCause && <InfoRow label="Suspected Cause" value={sel.suspectedCause} />}
                {sel.confirmedRootCause && <InfoRow label="Confirmed Root Cause" value={sel.confirmedRootCause} />}
                {sel.correctiveAction && <InfoRow label="Corrective Action" value={sel.correctiveAction} />}
                {sel.partsRequired && <InfoRow label="Parts Required / Used" value={sel.partsRequired} />}
                {sel.repairNotes && <InfoRow label="Repair Notes" value={sel.repairNotes} />}
                {sel.verificationResult && <InfoRow label="Verification / Test Result" value={sel.verificationResult} />}
                {sel.completionNotes && <InfoRow label="Completion Notes" value={sel.completionNotes} />}
                {!sel.confirmedRootCause && !sel.repairNotes && (
                  <p className="text-xs text-muted-foreground italic">No repair records yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 35%: Metadata sidebar */}
        <div className="w-[35%] min-w-50 border-l border-border/20 bg-card/20 overflow-y-auto p-4 space-y-4">
          <SectionTitle label="Details" />
          <div className="space-y-3">
            <MetaRow label="Status" value={<span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${BREAKDOWN_STATUS_STYLES[sel.status] || ""}`}>{wfLabel(sel.status)}</span>} />
            <MetaRow label="Priority" value={<span className={`text-sm font-semibold ${PRIORITY_STYLES[sel.priority] || ""}`}>{sel.priority || "—"}</span>} />
            <MetaRow label="Severity" value={<span className={`text-sm font-semibold ${SEVERITY_STYLES[sel.severity] || ""}`}>{sel.severity}</span>} />
            <MetaRow label="Target" value={`${sel.targetType}${sel.targetId ? ` #${sel.targetId}` : ""}`} />
            <MetaRow label="Reported By" value={sel.reportedBy || "—"} />
            <MetaRow label="Assigned To" value={sel.assignedTo || "—"} />
            <MetaRow label="Reported" value={sel.reportedAt?.slice(0, 10) || "—"} />
            {sel.repairStartedAt && <MetaRow label="Started" value={sel.repairStartedAt.slice(0, 10)} />}
            {sel.downtimeStart && <MetaRow label="Downtime Start" value={sel.downtimeStart.slice(0, 10)} />}
            {sel.downtimeEnd && <MetaRow label="Downtime End" value={sel.downtimeEnd.slice(0, 10)} />}
            <MetaRow label="Downtime" value={sel.downtimeMinutes != null ? `${sel.downtimeMinutes.toLocaleString()} min` : "—"} />
            <MetaRow label="Equipment Down" value={sel.isEquipmentDown ? "Yes" : "No"} />
            {sel.linkedWorkOrderId && (
              <MetaRow label="Linked WO" value={<a href="/maintenance/work-orders" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs font-semibold"><Wrench className="h-3 w-3 stroke-current" /> #{sel.linkedWorkOrderId}</a>} />
            )}
          </div>
          <div className="pt-2 text-[10px] text-muted-foreground">
            {sel.reportedAt && <p>Created: {sel.reportedAt.slice(0, 10)}</p>}
          </div>
        </div>
      </div>
    );
  }, [sel, reportMode, renderInlineForm]);

  return {
    items: breakdowns,
    selectedId,
    loading,
    renderList,
    renderDetail,
    canResolve,
    canClose,
    canCancel,
    canCreateWO,
    canEdit,
    handleAction,
    confirmAction,
    setConfirmAction,
    resolveForm,
    setResolveForm,
    confirmResolve,
    confirmClose,
    refetch,
    reportMode,
    startAddReport,
    startEditReport,
    cancelReport,
    renderInlineForm,
    reportForm,
    setReportForm,
    submitReport,
    submitting,
    updateForm,
    setUpdateForm,
    submitUpdate,
    updating,
    woDialogOpen,
    openWODialog,
    closeWODialog,
    woAssignedTo,
    setWoAssignedTo,
    woPriority: sel?.severity ? ({ CRITICAL: "CRITICAL", HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" }[sel.severity] || "MEDIUM") : "MEDIUM",
    submitWO,
    woSubmitting,
    selBreakdown: sel,
  };
}

// ── Helpers ──

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20 p-3 space-y-1" : ""}>
      {!highlight && <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>}
      {highlight && <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">⚠ {label}</p>}
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground">{typeof value === "string" ? <p>{value || "—"}</p> : value}</div>
    </div>
  );
}
