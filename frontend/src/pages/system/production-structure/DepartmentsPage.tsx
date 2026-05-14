import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { AlertTriangle, CheckCircle, Layers, Search, User, Plus, ExternalLink, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Pagination } from "./components";
import { useDepartments } from "@/hooks/useDepartments";
import type { DepartmentNode } from "@/hooks/useDepartments";
import { useProductionLines } from "@/hooks/useProductionLines";
import { useReferenceCategory } from "@/hooks/useReferenceTables";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, type FormMode } from "./components/EntityWorkspacePage";
import { ConfirmDialog } from "./shared";
import { formatAppDate } from "@/utils/dateFormat";
import { theme } from "@/styles/themeTokens";

const PER_PAGE = 10;

const USERS_QUERY = gql`
  query DepartmentStaffUsers($search: String) {
    users(search: $search) {
      id
      name
      username
      role
      email
    }
  }
`;

type DepartmentForm = {
  name: string;
  code: string;
  status: "active" | "inactive";
  statusId: string;
  description: string;
  manager: string;
  supervisor: string;
  productionLineIds: string[];
};

type DepartmentView = DepartmentNode & { groupName?: string };

const EMPTY_FORM: DepartmentForm = {
  name: "", code: "", status: "active", statusId: "", description: "",
  manager: "", supervisor: "", productionLineIds: [],
};

const ET: Record<string, string> = {
  description: "No description", manager: "Assign now", supervisor: "Assign now",
};

type StaffOption = { id: string; name: string; username?: string; role?: string; email?: string };

function InlineRow({ label, value, action }: { label: string; value: React.ReactNode; action?: { text: string; onClick: () => void } }) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "100px 1fr auto" }}>
      <span className={`${theme.textMuted} text-[10px] font-medium truncate`}>{label}</span>
      <span className={`${theme.textPrimary} text-[12px] font-medium min-w-0 truncate`}>{value}</span>
      {action ? <button type="button" onClick={action.onClick} className={`text-[10px] font-medium ${theme.link} whitespace-nowrap text-left transition-colors`}>{action.text}</button> : null}
    </div>
  );
}

function Badge({ label, variant = "default" }: { label: string; variant?: "active" | "inactive" | "new" | "default" | "violet" }) {
  const m: Record<string, string> = {
    active: theme.badgeActive, inactive: theme.badgeInactive,
    violet: theme.typeDepartment, new: theme.typePlant, default: theme.badgeNeutral,
  };
  return <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${m[variant]}`}>{label === "active" && <span className="inline-block h-1 w-1 rounded-full bg-emerald-500 mr-1 animate-pulse" />}{label}</span>;
}

function SetupSignal({ ok, label, onClick }: { ok: boolean; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} title={ok ? "Completed" : `Action needed: ${label}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium transition-colors ${theme.focusRingNeutral} ${
        ok ? theme.badgeActive : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20 dark:hover:bg-amber-500/20"
      }`}>
      {ok ? <CheckCircle className="h-3 w-3 stroke-current shrink-0" /> : <ArrowRight className="h-3 w-3 stroke-current shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

function DeptSection({ title, children, fill = false, alert = false }: { title: string; children: React.ReactNode; fill?: boolean; alert?: boolean }) {
  return (
    <section className={`min-h-0 rounded-lg ${alert ? "ring-2 ring-amber-300 dark:ring-amber-600" : theme.cardSection} ${fill ? "flex flex-col overflow-hidden" : ""}`}>
      <div className={`shrink-0 px-2.5 py-1.5 ${theme.sectionDivider}`}>
        <h3 className={`text-[11px] font-semibold ${theme.textSecondary}`}>{title}</h3>
      </div>
      <div className={`p-2 ${fill ? "min-h-0 flex-1 overflow-hidden" : ""}`}>{children}</div>
    </section>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={`mb-0.5 block text-[10px] font-medium ${theme.textSecondary}`}>
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

export function DepartmentsPage() {
  const { search, statusFilter, setFooterContent, setToolbarVariant } = useToolbar();
  const registerActions = useRegisterActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lineIdFilter = searchParams.get("lineId");
  const { departments, loading, saveDepartment, assignDepartmentToLines, deleteDepartment, refetch } = useDepartments(lineIdFilter);
  const { lines: productionLines, refetch: refetchLines } = useProductionLines(500);
  const { values: statusValues } = useReferenceCategory("status");
  const { data: staffData } = useQuery<{ users: StaffOption[] }>(USERS_QUERY, { variables: { search: "" }, fetchPolicy: "cache-and-network" });
  const staffOptions = staffData?.users ?? [];
  const staffOptionMap = useMemo(() => new Map(staffOptions.map((staff) => [staff.id, staff])), [staffOptions]);

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<DepartmentForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editState, setEditState] = useState({ dirty: false, saving: false });
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [lineFilter, setLineFilter] = useState<"active" | "unlinked" | "all">("all");
  const [completedToast, setCompletedToast] = useState<string | null>(null);
  const identityRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const ownershipRef = useRef<HTMLDivElement>(null);
  const structureRef = useRef<HTMLDivElement>(null);
  const firstMissingRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { setDescriptionExpanded(false); }, [selectedId]);
  useEffect(() => { if (!completedToast) return; const t = setTimeout(() => setCompletedToast(null), 2000); return () => clearTimeout(t); }, [completedToast]);

  const filtered = departments.filter((d: DepartmentNode) => statusFilter === "all" || d.status === statusFilter)
    .filter((d) => !search || `${d.name} ${d.code} ${d.managerRef?.name || d.manager || ""}`.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? departments.find((d: DepartmentNode) => d.id === selectedId) ?? null : null;

  useEffect(() => {
    const departmentId = searchParams.get("departmentId");
    if (departmentId && departments.some((department: DepartmentNode) => department.id === departmentId)) {
      setSelectedId(departmentId);
      return;
    }
    if (lineIdFilter && departments.length > 0 && !departments.some((department: DepartmentNode) => department.id === selectedId)) {
      setSelectedId(departments[0].id);
    }
  }, [departments, searchParams, lineIdFilter, selectedId]);

  const clearForm = useCallback(() => { setForm(EMPTY_FORM); setErrors({}); setMutationError(null); }, []);

  const loadForm = useCallback((d: DepartmentNode) => {
    const managerId = d.managerRef?.id && staffOptionMap.has(d.managerRef.id) ? d.managerRef.id : d.manager && staffOptionMap.has(d.manager) ? d.manager : "";
    const supervisorId = d.supervisor?.id && staffOptionMap.has(d.supervisor.id) ? d.supervisor.id : "";
    setForm({
      name: d.name || "", code: d.code || "", status: d.status?.toLowerCase() === "inactive" ? "inactive" : "active",
      statusId: d.statusId || statusValues.find((v) => v.code.toLowerCase() === d.status?.toLowerCase())?.id || "",
      description: d.description || "", manager: managerId, supervisor: supervisorId,
      productionLineIds: (d.productionLines ?? []).map((line) => line.id),
    });
    setErrors({}); setMutationError(null);
  }, [staffOptionMap, statusValues]);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); setEditState({ dirty: false, saving: false }); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); setEditState({ dirty: false, saving: false }); } }, [sel, loadForm]);
  const hCancel = useCallback(() => {
    if (editState.dirty) { setConfirmCancel(true); return; }
    if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); }
    setEditState({ dirty: false, saving: false });
  }, [sel, loadForm, clearForm, editState.dirty]);
  const discardChanges = useCallback(() => {
    if (sel) loadForm(sel); else clearForm();
    setMode("view"); setEditState({ dirty: false, saving: false }); setConfirmCancel(false);
  }, [sel, loadForm, clearForm]);

  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = "Required";
    if (!form.code?.trim()) errs.code = "Required";
    const code = form.code?.trim();
    if (code && code !== code.toUpperCase()) errs.code = "Code must be uppercase";
    if (!form.statusId && !form.status) errs.statusId = "Required";
    if (!form.status) errs.status = "Required";
    const duplicate = code ? departments.find((d) => d.id !== selectedId && d.code.toLowerCase() === code.toLowerCase()) : null;
    if (duplicate) errs.code = "Code must be unique";
    if (form.manager && !staffOptionMap.has(form.manager)) errs.manager = "Manager must be a valid staff/user reference";
    if (form.supervisor && !staffOptionMap.has(form.supervisor)) errs.supervisor = "Supervisor must be a valid staff/user reference";
    const lineIds = new Set(productionLines.map((line) => line.id));
    if (form.productionLineIds.some((id) => !lineIds.has(id))) errs.productionLineIds = "Linked production lines must exist";
    return errs;
  }, [form, departments, selectedId, staffOptionMap, productionLines]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); firstMissingRef.current?.focus(); return; }
    setEditState((p) => ({ ...p, saving: true }));
    const r = await saveDepartment(form, mode === "edit" ? selectedId : null);
    if (r.ok) {
      const departmentId = r.department?.id || selectedId;
      if (departmentId) {
        const linkResult = await assignDepartmentToLines(departmentId, form.productionLineIds);
        if (!linkResult.ok) {
          setErrors(linkResult.errors ?? {});
          setMutationError(linkResult.errors?._form || linkResult.errors?.productionLineIds || "Production line links could not be saved.");
          setEditState((p) => ({ ...p, saving: false })); return;
        }
      }
      if (departmentId) setSelectedId(departmentId);
      await refetch(); await refetchLines();
      setEditState({ dirty: false, saving: false }); setMode("view");
      setToast({ message: "Department saved", type: "success" }); return;
    }
    setEditState((p) => ({ ...p, saving: false }));
    setErrors(r.errors ?? {});
    setMutationError(r.errors?._form || "Department could not be saved.");
    setToast({ message: "Department could not be saved", type: "error" });
  }, [form, mode, selectedId, saveDepartment, assignDepartmentToLines, refetch, refetchLines, validationErrors]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setMutationError(null);
    const result = await deleteDepartment(confirmDelete);
    if (result && !result.success) { setMutationError(result.message || "Department could not be deleted."); setConfirmDelete(null); return; }
    setSelectedId(null); await refetch(); setConfirmDelete(null);
  }, [confirmDelete, deleteDepartment, refetch]);

  const selectDepartment = useCallback((id: string) => {
    if (editState.dirty) { const discard = window.confirm("You have unsaved department changes. Discard them and select another department?"); if (!discard) return; discardChanges(); }
    setSelectedId(id);
    if (mode === "create") { clearForm(); setMode("view"); }
  }, [editState.dirty, mode, clearForm, discardChanges]);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3000); return () => clearTimeout(timer); }, [toast]);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (mode === "edit" || mode === "create") {
      registerActions({ onSave: hSave, onCancel: hCancel, onDiscardChanges: discardChanges, editLabel: "Editing", isDirty: editState.dirty, isValid: Object.keys(validationErrors).length === 0, isSaving: editState.saving });
    } else {
      registerActions({
        onAdd: hNew, onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmDelete(sel.id) : undefined,
        onRefresh: () => refetch(), hasSelected: !!sel,
      });
    }
    const footerParts = [`${filtered.length} dept${filtered.length !== 1 ? "s" : ""}`];
    if (sel && mode !== "create") {
      footerParts.push(`Created ${formatAppDate(sel.createdAt) || "-"}`);
      footerParts.push(`Updated ${formatAppDate(sel.updatedAt) || "-"}`);
    }
    setFooterContent(footerParts.join(" · "));
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, discardChanges, registerActions, refetch, setToolbarVariant, editState, validationErrors]);

  const g = (k: keyof DepartmentForm) => form[k] ?? "";
  const s = (k: keyof DepartmentForm, v: string | string[]) => {
    setForm((p) => ({ ...p, [k]: k === "code" && typeof v === "string" ? v.toUpperCase() : v }));
    setEditState((p) => ({ ...p, dirty: true }));
  };
  const setStatusId = (id: string) => {
    const selected = statusValues.find((value) => value.id === id);
    setForm((p) => ({ ...p, statusId: id, status: selected?.code?.toLowerCase() === "inactive" ? "inactive" : "active" }));
    setEditState((p) => ({ ...p, dirty: true }));
  };
  const isForm = mode === "edit" || mode === "create";
  useEffect(() => { if (!isForm) return; const timer = window.setTimeout(() => firstMissingRef.current?.focus(), 0); return () => window.clearTimeout(timer); }, [isForm, selectedId]);

  const ev = (k: string, v: string | null | undefined) => v?.trim() ? v : <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">{ET[k] || "-"}</span>;
  const iCls = "h-7 w-full border border-slate-200 bg-white px-2 text-[11px] outline-none text-slate-700 placeholder-slate-400 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20";
  const sCls = "h-7 w-full border border-slate-200 bg-white px-2 text-[11px] outline-none text-slate-700 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-violet-500 dark:focus:ring-violet-500/20";

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900 h-full">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-500/10">
              <Layers className="h-5 w-5 text-violet-400 dark:text-violet-300 stroke-current" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Department Details</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">Select a department or create a new one to manage its lines, staff, and resources.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Department" : sel!.name;
    const code = mode !== "create" ? sel!.code : undefined;
    const isNew = mode === "create";
    const d: Partial<DepartmentView> = sel ?? {};
    const linkedLineCount = isForm ? form.productionLineIds.length : d.productionLineCount ?? 0;
    const lineCount = linkedLineCount;
    const hasLine = lineCount > 0;
    const resourceGroupRows = d.resourceGroups ?? [];
    const groupCount = resourceGroupRows.length;
    const resourceCount = d.resourceCount ?? 0;
    const identityDefined = !!d.name && !!d.code && !!d.status;
    const ownershipDefined = !!d.managerRef || !!d.supervisor;
    const resourcesAvailable = resourceCount > 0;
    const steps = [
      { label: "Complete Identity", ok: identityDefined, ref: identityRef, edit: true },
      { label: "Assign Owner", ok: ownershipDefined, ref: ownershipRef, edit: true, blocker: true },
      { label: "Link Production Lines", ok: hasLine, ref: linesRef, edit: true },
      { label: "Add Resource Group", ok: groupCount > 0, ref: structureRef, edit: false },
      { label: "Add Resources", ok: resourcesAvailable, ref: structureRef, edit: false },
    ];
    const readyCount = steps.filter((s) => s.ok).length;
    const totalSteps = steps.length;
    const currentStepIdx = steps.findIndex((s) => !s.ok);
    const currentStep = currentStepIdx >= 0 ? currentStepIdx + 1 : totalSteps;
    const readinessPct = Math.round((readyCount / totalSteps) * 100);
    const stepsToShow = isForm ? steps : (currentStepIdx >= 0 ? steps.slice(0, Math.max(currentStepIdx + 2, 3)) : steps);
    const navigateWithDirtyCheck = (to: string) => {
      if (editState.dirty) { const discard = window.confirm("You have unsaved department changes. Discard them and continue?"); if (!discard) return; discardChanges(); }
      navigate(to);
    };
    const toggleLineLink = (lineId: string) => {
      const current = form.productionLineIds ?? [];
      s("productionLineIds", current.includes(lineId) ? current.filter((id) => id !== lineId) : [...current, lineId]);
    };
    const managerLabel = d.managerRef?.name || "";
    const supervisorLabel = d.supervisor?.name || d.supervisorName || "";
    const descriptionText = (d.description || "").trim();
    const descriptionNeedsToggle = descriptionText.length > 140 || descriptionText.includes("\n");
    const linkedLineIds = new Set(isForm ? form.productionLineIds : (d.productionLines ?? []).map((line) => line.id));
    const linkedLineMap = new Map((d.productionLines ?? []).map((line) => [line.id, line]));
    const allLineRows = (isForm ? productionLines : (d.productionLines ?? [])).map((line) => ({
      id: line.id, name: line.name, code: line.code,
      plantName: line.plantName || linkedLineMap.get(line.id)?.plantName || "",
      status: line.status || linkedLineMap.get(line.id)?.status || "active",
      linked: linkedLineIds.has(line.id),
    }));
    const linkedRows = allLineRows.filter((line) => line.linked);
    const activeLinkedRows = linkedRows.filter((line) => (line.status || "").toLowerCase() === "active");
    const lineRows = isForm
      ? allLineRows.filter((line) => lineFilter === "all" || (lineFilter === "active" && (line.status || "").toLowerCase() === "active") || (lineFilter === "unlinked" && !line.linked))
      : allLineRows;
    const linesByPlant = lineRows.reduce<Record<string, typeof lineRows>>((groups, line) => {
      const key = line.plantName || "Unassigned Plant";
      groups[key] = groups[key] ?? [];
      groups[key].push(line);
      return groups;
    }, {});
    const focusSection = (ref: React.RefObject<HTMLDivElement | null>) => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const actOnGap = (step: (typeof steps)[number]) => {
      if (step.edit && !isForm && sel) { loadForm(sel); setMode("edit"); setEditState({ dirty: false, saving: false }); window.setTimeout(() => focusSection(step.ref), 0); return; }
      focusSection(step.ref);
    };
    const completeStep = (stepLabel: string) => { setCompletedToast(`Done: ${stepLabel}`); };

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
        {/* ── Header: Action Control Panel ── */}
        <div className={`shrink-0 px-4 pt-3 pb-2 ${theme.sectionDivider}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-400 to-violet-500 text-white shadow-sm">
              <Layers className="h-4 w-4 stroke-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h2>
                {code && <span className={`rounded px-1 py-px font-mono text-[9px] ${theme.codeBadge}`}>{code}</span>}
                <Badge label={isNew ? "New" : (d.status || "active")} variant={isNew ? "new" : (d.status === "active" ? "active" : "inactive")} />
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${readinessPct >= 100 ? theme.badgeActive : theme.warningChip}`} title={`Step ${currentStep} of ${totalSteps}`}>
                  {readinessPct >= 100 ? <CheckCircle className="h-3 w-3 stroke-current" /> : <AlertCircle className="h-3 w-3 stroke-current" />}
                  {readinessPct}% Ready
                </span>
                {isForm && <Badge label="Editing" variant="violet" />}
              </div>
              <div className={`mt-1 flex flex-wrap items-center gap-1 text-[10px] ${theme.textSecondary}`}>
                {!ownershipDefined && (
                  <button type="button" onClick={() => actOnGap(steps[1])}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold ${theme.warningChip} ${theme.focusRingNeutral}`}>
                    <AlertTriangle className="h-3 w-3 stroke-current" /> Assign Owner (Required)
                  </button>
                )}
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 ${linkedRows.length ? theme.badgeActive : theme.warningChip}`}>
                  {linkedRows.length ? <CheckCircle className="h-2.5 w-2.5 stroke-current" /> : <AlertTriangle className="h-2.5 w-2.5 stroke-current" />}
                  Lines: {linkedRows.length} ({activeLinkedRows.length === linkedRows.length ? "Active" : `${activeLinkedRows.length} active`})
                </span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 ${groupCount ? theme.badgeActive : theme.warningChip}`}>
                  {groupCount ? <CheckCircle className="h-2.5 w-2.5 stroke-current" /> : <AlertTriangle className="h-2.5 w-2.5 stroke-current" />}
                  {groupCount ? `${groupCount} RG Ready` : "No Resource Groups"}
                </span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 ${resourceCount ? theme.badgeActive : theme.warningChip}`}>
                  {resourceCount ? <CheckCircle className="h-2.5 w-2.5 stroke-current" /> : <AlertTriangle className="h-2.5 w-2.5 stroke-current" />}
                  {resourceCount ? `${resourceCount} Resources Ready` : "No Resources Added"}
                </span>
              </div>
              <div className={`mt-1 flex items-center gap-2 text-[10px] ${theme.textMuted}`}>
                <span><User className="mr-0.5 inline h-2.5 w-2.5 stroke-current" />Owner: {managerLabel || "Assign now"}</span>
                {!managerLabel && !isForm && <button type="button" onClick={() => actOnGap(steps[1])} className={`${theme.link} font-medium`}>Assign now</button>}
                <span className="ml-auto">Updated {formatAppDate(d.updatedAt) || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-hidden p-2 min-h-0">
            {completedToast && (
              <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 stroke-current" /> {completedToast}
              </div>
            )}
            {mutationError && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {mutationError}
              </div>
            )}
            <div className="grid h-full min-h-0 grid-cols-2 gap-2">
              {/* LEFT */}
              <div className="flex min-h-0 flex-col gap-2 pr-1">
                {/* Identity / Overview */}
                <div ref={identityRef} className="shrink-0 scroll-mt-2">
                  <DeptSection title="Identity">
                    {isForm ? (
                      <div className="space-y-1.5">
                        <div>
                          <FieldLabel required>Name</FieldLabel>
                          <input ref={(element) => { if (!form.name) firstMissingRef.current = element; }} type="text" value={g("name") as string} onChange={(e) => { s("name", e.target.value); if (e.target.value && !form.code) window.setTimeout(() => firstMissingRef.current?.focus(), 0); }} placeholder="e.g. Assembly, Final Welding" className={iCls} />
                          {(errors.name || validationErrors.name) && <p className="text-[9px] text-red-500 mt-0.5">{errors.name || validationErrors.name}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <FieldLabel required>Code</FieldLabel>
                            <input ref={(element) => { if (form.name && !form.code) firstMissingRef.current = element; }} type="text" value={g("code") as string} onChange={(e) => { s("code", e.target.value); }} placeholder="e.g. ASSY, WELD" className={iCls} />
                            {(errors.code || validationErrors.code) && <p className="text-[9px] text-red-500 mt-0.5">{errors.code || validationErrors.code}</p>}
                          </div>
                          <div>
                            <FieldLabel required>Status</FieldLabel>
                            <select ref={(element) => { if (form.name && form.code && !form.statusId) firstMissingRef.current = element; }} value={g("statusId") as string} onChange={(e) => { setStatusId(e.target.value); completeStep("Complete Identity"); }} className={sCls}>
                              <option value="">Select status</option>
                              {statusValues.filter((value) => value.isActive).map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
                            </select>
                            {(errors.statusId || validationErrors.statusId) && <p className="text-[9px] text-red-500 mt-0.5">{errors.statusId || validationErrors.statusId}</p>}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Description</FieldLabel>
                          <textarea value={g("description") as string} onChange={(e) => s("description", e.target.value)} placeholder="Department purpose and scope" className={`${iCls} min-h-20 py-1.5 resize-none field-sizing-content`} />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2">
                        <div className="space-y-px">
                          <InlineRow label="Name" value={d.name} />
                          <InlineRow label="Code" value={d.code} />
                          <InlineRow label="Status" value={<Badge label={d.status || "active"} variant={d.status === "active" ? "active" : "inactive"} />} />
                          <div className="grid gap-2" style={{ gridTemplateColumns: "100px 1fr" }}>
                            <span className={`${theme.textMuted} truncate text-[10px] font-medium`}>Description</span>
                            <div className="min-w-0">
                              {descriptionText ? (
                                <>
                                  <p className={`${theme.textPrimary} text-[12px] font-medium leading-4 ${descriptionExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>{descriptionText}</p>
                                  {descriptionNeedsToggle && <button type="button" onClick={() => setDescriptionExpanded((value) => !value)} className={`${theme.link} mt-0.5 text-[10px] font-medium`}>{descriptionExpanded ? "Show less" : "Show more"}</button>}
                                </>
                              ) : (ev("description", d.description))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </DeptSection>
                </div>

                {/* Ownership */}
                <div ref={ownershipRef} className="shrink-0 scroll-mt-2">
                  <DeptSection title="Management & Ownership" alert={!ownershipDefined && !isForm}>
                    {isForm ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <FieldLabel>Manager</FieldLabel>
                            <select value={g("manager") as string} onChange={(e) => { s("manager", e.target.value); if (e.target.value) completeStep("Assign Owner"); }} className={sCls}>
                              <option value="">Assign now</option>
                              {staffOptions.map((user) => <option key={user.id} value={user.id}>{user.name}{user.role ? ` (${user.role})` : ""}</option>)}
                            </select>
                            {errors.manager && <p className="text-[9px] text-red-500 mt-0.5">{errors.manager}</p>}
                          </div>
                          <div>
                            <FieldLabel>Supervisor</FieldLabel>
                            <select value={g("supervisor") as string} onChange={(e) => { s("supervisor", e.target.value); }} className={sCls}>
                              <option value="">Assign now</option>
                              {staffOptions.map((user) => <option key={user.id} value={user.id}>{user.name}{user.role ? ` (${user.role})` : ""}</option>)}
                            </select>
                            {errors.supervisor && <p className="text-[9px] text-red-500 mt-0.5">{errors.supervisor}</p>}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Employees</FieldLabel>
                          <div className={`h-7 flex items-center px-2 text-[11px] font-medium ${theme.subCard} ${theme.textSecondary}`}>
                            {d.employeeCount ?? d.employees ?? 0}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`${ownershipDefined ? "" : "bg-amber-50/50 dark:bg-amber-500/5"} rounded-lg p-2`}>
                        <div className="space-y-px">
                          <InlineRow label="Manager" value={ev("manager", managerLabel)} action={!managerLabel ? { text: "Assign now", onClick: hEdit } : undefined} />
                          <InlineRow label="Supervisor" value={ev("supervisor", supervisorLabel)} action={!supervisorLabel ? { text: "Assign now", onClick: hEdit } : undefined} />
                          <InlineRow label="Employees" value={d.employeeCount ?? d.employees ?? 0} />
                        </div>
                        {!ownershipDefined && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3 stroke-current shrink-0" />
                            <span>Owner required to activate department</span>
                          </div>
                        )}
                      </div>
                    )}
                  </DeptSection>
                </div>

                {/* Production Line Links */}
                <div ref={linesRef} className="shrink-0 scroll-mt-2">
                  <DeptSection title="Production Line Links" fill>
                    {isForm && (
                      <div className={`mb-1.5 flex flex-wrap items-center gap-1 px-2 py-1 ${theme.subCard}`}>
                        <span className={`mr-1 text-[10px] font-medium ${theme.textSecondary}`}>{form.productionLineIds.length} selected | Linked to department</span>
                        <button type="button" onClick={() => s("productionLineIds", productionLines.map((line) => line.id))} className={`px-1.5 py-0.5 text-[10px] ${theme.buttonGhost}`}>Select all</button>
                        <button type="button" onClick={() => s("productionLineIds", [])} className={`px-1.5 py-0.5 text-[10px] ${theme.buttonGhost}`}>Clear</button>
                        {(["active", "unlinked", "all"] as const).map((filter) => (
                          <button key={filter} type="button" onClick={() => setLineFilter(filter)} className={`px-1.5 py-0.5 text-[10px] ${lineFilter === filter ? theme.tabActive : theme.tabInactive}`}>
                            {filter === "active" ? "Active" : filter === "unlinked" ? "Unlinked" : "All"}
                          </button>
                        ))}
                      </div>
                    )}
                    {lineRows.length === 0 ? (
                      <div className={`px-2 py-2 text-[10px] flex items-center justify-between gap-2 ${theme.panelNeutral} ${theme.textMuted}`}>
                        <span>No structure defined. Start by linking lines.</span>
                        <button type="button" onClick={() => isForm ? setLineFilter("all") : actOnGap(steps[2])} className={`${theme.link} font-semibold`}>{isForm ? "Show all lines" : "Link Lines"}</button>
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-700">
                        <table className="w-full table-fixed text-[11px]">
                          <thead className={`block ${theme.subHeader} ${theme.textMuted}`}>
                            <tr className="table w-full table-fixed">
                              {isForm && <th className="w-8 px-2 py-1 text-left font-medium">Link</th>}
                              <th className="px-2 py-1 text-left font-medium">Line</th>
                              <th className="px-2 py-1 text-left font-medium">Plant</th>
                              <th className="w-18 px-2 py-1 text-left font-medium">Status</th>
                              <th className="w-16 px-2 py-1 text-right font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody className="block max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                            {Object.entries(linesByPlant).map(([plantName, rows]) => (
                              <Fragment key={plantName}>
                                <tr className="table w-full table-fixed"><td colSpan={isForm ? 5 : 4} className={`px-2 py-1 text-[10px] font-semibold ${theme.textMuted}`}>{plantName}</td></tr>
                                {rows.map((line) => (
                                  <tr key={line.id} className="table w-full table-fixed">
                                    {isForm && <td className="px-2 py-1"><input type="checkbox" aria-label={`Link ${line.name}`} checked={line.linked} onChange={() => toggleLineLink(line.id)} className="h-3 w-3" /></td>}
                                    <td className="truncate px-2 py-1 font-medium text-slate-700 dark:text-slate-200">{line.name} <span className={theme.textMuted}>{line.code}</span></td>
                                    <td className={`truncate px-2 py-1 ${theme.textSecondary}`}>{line.plantName || "-"}</td>
                                    <td className="w-18 px-2 py-1"><Badge label={line.linked ? (line.status || "active").toLowerCase() : "unlinked"} variant={line.linked ? ((line.status || "").toLowerCase() === "inactive" ? "inactive" : "active") : "inactive"} /></td>
                                    <td className="w-16 px-2 py-1 text-right"><button type="button" onClick={() => navigateWithDirtyCheck(`/system/production-structure/components/line?productionLineId=${line.id}`)} className={theme.link}>Open</button></td>
                                  </tr>
                                ))}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {errors.productionLineIds && <p className="text-[9px] text-red-500 mt-0.5">{errors.productionLineIds}</p>}
                  </DeptSection>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex min-h-0 flex-col gap-2 pr-1">
                {/* Guided Setup Flow */}
                <div className="shrink-0">
                  <DeptSection title={`Setup Flow (Step ${currentStep} of ${totalSteps})`}>
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all duration-500" style={{ width: `${readinessPct}%` }} />
                        </div>
                        <span className={`text-[10px] font-semibold ${readinessPct >= 100 ? "text-emerald-600" : "text-violet-600 dark:text-violet-400"}`}>{readinessPct}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {stepsToShow.filter((s) => !s.ok || s.ok).map((step) => {
                        const isCurrent = !step.ok && steps.findIndex((x) => !x.ok) === steps.indexOf(step);
                        return (
                          <SetupSignal key={step.label} ok={step.ok}
                            label={step.ok ? `${step.label}` : isCurrent ? `Next: ${step.label}` : step.label}
                            onClick={() => actOnGap(step)} />
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                      {readinessPct >= 100
                        ? "All steps completed. Department is ready."
                        : `Complete Step ${currentStep} to proceed. Owner assignment unlocks full configuration.`}
                    </p>
                  </DeptSection>
                </div>

                {/* Production Structure */}
                <div ref={structureRef} className="shrink-0 scroll-mt-2">
                  <DeptSection title="Production Structure">
                    <div className={`mb-2 p-2 text-[11px] ${theme.subCard} ${theme.textSecondary}`}>
                      {groupCount === 0 && resourceCount === 0 && lineCount === 0 ? (
                        <span>No structure defined. Start by linking lines.</span>
                      ) : (
                        <span><span className="font-semibold">{groupCount}</span> RG / <span className="font-semibold">{resourceCount}</span> resources / <span className="font-semibold">{lineCount}</span> lines</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50/70 p-2 dark:bg-slate-800/40">
                        <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Resource Groups</div>
                        <div className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{groupCount}</div>
                        {groupCount === 0 && (
                          <button type="button" onClick={() => navigateWithDirtyCheck(`/system/production-structure/components/rg?departmentId=${d.id}`)} className={`mt-1 text-[9px] font-medium ${theme.link}`}>Create Resource Group</button>
                        )}
                      </div>
                      <div className="bg-slate-50/70 p-2 dark:bg-slate-800/40">
                        <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Resources</div>
                        <div className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{resourceCount}</div>
                        {resourceCount === 0 && (
                          <button type="button" onClick={() => navigateWithDirtyCheck(`/system/production-structure/components/rg?departmentId=${d.id}`)} className={`mt-1 text-[9px] font-medium ${theme.link}`}>Add Resources</button>
                        )}
                      </div>
                    </div>
                  </DeptSection>
                </div>

                {/* Resource Groups Table */}
                <div className="shrink-0">
                  <DeptSection title={`Resource Groups (${groupCount})`}>
                    {!groupCount ? (
                      <div className="flex min-h-14 items-center justify-between border border-dashed border-slate-200 bg-slate-50/30 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800/20">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">No resource groups linked.</p>
                        {isForm && <button type="button" onClick={() => navigateWithDirtyCheck(`/system/production-structure/components/rg?departmentId=${d.id}`)} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Plus className="h-2.5 w-2.5 stroke-current" /> Link</button>}
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-auto border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[11px]">
                          <thead><tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <th className="text-left px-2 py-1 font-medium">Resource Group</th>
                            <th className="text-left px-2 py-1 font-medium">Code</th>
                            <th className="text-left px-2 py-1 font-medium">Resources</th>
                            <th className="text-left px-2 py-1 font-medium">Status</th>
                            <th className="text-right px-2 py-1 font-medium w-14">Action</th>
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {resourceGroupRows.map((group) => (
                              <tr key={group.id}>
                                <td className="px-2 py-1 font-medium text-slate-700 dark:text-slate-200">{group.name}</td>
                                <td className="px-2 py-1 text-slate-400">{group.code || "-"}</td>
                                <td className="px-2 py-1 text-slate-500">{group.resourceCount}</td>
                                <td className="px-2 py-1"><Badge label={group.status.toLowerCase()} variant={group.status.toLowerCase() === "active" ? "active" : "inactive"} /></td>
                                <td className="px-2 py-1 text-right"><button type="button" onClick={() => navigateWithDirtyCheck(`/system/production-structure/components/rg?departmentId=${d.id}&resourceGroupId=${group.id}`)} className="text-violet-600 dark:text-violet-400"><ExternalLink className="h-3 w-3 stroke-current" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </DeptSection>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {toast && (
        <div className={`pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 border px-3 py-1.5 text-xs font-medium shadow-sm ${
          toast.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
        }`}>
          {toast.message}
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete department?" message="This action cannot be undone." onConfirm={hDelete} />
      )}
      {confirmCancel && (
        <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Discard changes?" message="You have unsaved department changes. Discard them?" onConfirm={discardChanges} />
      )}
      <EntityWorkspacePage
        toolbar={null}
        list={
          <>
            <div className="shrink-0 h-9 border-b border-slate-200 dark:border-slate-700 flex items-center px-3 bg-white dark:bg-slate-900">
              <Search className="h-3 w-3 text-slate-400 stroke-current mr-2 shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Departments</span>
              <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-500 font-mono">{filtered.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto bg-white pl-2 dark:bg-slate-900">
              {loading && departments.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-slate-400"><div className="h-2 w-2 rounded-full bg-violet-400 animate-bounce mr-2" />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Layers className="h-4 w-4 text-slate-300 dark:text-slate-600 mb-1.5 stroke-current" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">No departments</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {paginated.map((d: DepartmentNode) => {
                    const deptManagerName = d.managerRef?.name || "";
                    const deptOwnerOk = !!d.managerRef || !!d.supervisor;
                    const deptLinesOk = (d.productionLineCount ?? 0) > 0;
                    const deptRgOk = (d.resourceGroupCount ?? d.groupCount ?? 0) > 0;
                    const deptResOk = (d.resourceCount ?? 0) > 0;
                    const issues: string[] = [];
                    if (!deptOwnerOk) issues.push("No owner");
                    if (!deptLinesOk) issues.push("No lines");
                    if (!deptRgOk) issues.push("No RG");
                    if (!deptResOk) issues.push("No resources");
                    return (
                      <div key={d.id} onClick={() => selectDepartment(d.id)}
                        className={`group flex items-center gap-2 px-3 cursor-pointer transition-all duration-150 h-12 ${
                          selectedId === d.id ? "bg-linear-to-r from-violet-50 to-white dark:from-violet-900/15 dark:to-slate-900 border-l-[3px] border-l-violet-500 dark:border-l-violet-400" : "hover:bg-slate-50 dark:hover:bg-slate-800/30 border-l-[3px] border-l-transparent"
                        }`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${selectedId === d.id ? "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400" : "bg-slate-50 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-500 dark:bg-slate-800 dark:text-slate-500"}`}>
                          <Layers className="h-3.5 w-3.5 stroke-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className={`text-[11px] font-semibold truncate ${selectedId === d.id ? "text-violet-800 dark:text-violet-300" : "text-slate-800 dark:text-slate-200"}`}>{d.name}</span>
                            {d.code && <span className="text-[7px] font-mono text-slate-400 dark:text-slate-500 shrink-0">{d.code}</span>}
                            {issues.length > 0 && (
                              <span className="ml-auto flex items-center gap-0.5 text-[8px] text-amber-500 dark:text-amber-400 shrink-0" title={issues.join(", ")}>
                                {issues.slice(0, 2).map((iss) => (
                                  <span key={iss} className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-500/10 px-1 py-px rounded">{iss}</span>
                                ))}
                              </span>
                            )}
                            {issues.length === 0 && (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="All configured" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 mt-px">
                            <span>{d.productionLineCount || 0} lines</span>
                            <span className="text-slate-300">·</span>
                            <span>{d.resourceGroupCount ?? d.groupCount ?? 0} RG</span>
                            <span className="text-slate-300">·</span>
                            <span>{d.resourceCount ?? 0} resources</span>
                            {deptManagerName && <><span className="text-slate-300">·</span><span className="truncate">{deptManagerName}</span></>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="shrink-0 px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        }
        detail={renderDetail()}
        footer={null}
      />
    </>
  );
}
