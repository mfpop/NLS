import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { AlertTriangle, CheckCircle, Layers, Plus, ExternalLink, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Pagination, EntityListItem } from "./components";
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

const PLANTS_QUERY = gql`
  query DepartmentPlants {
    plants {
      id
      name
      code
      status
    }
  }
`;

type DepartmentForm = {
  plantId: string;
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
  plantId: "", name: "", code: "", status: "active", statusId: "", description: "",
  manager: "", supervisor: "", productionLineIds: [],
};

const ET: Record<string, string> = {
  description: "No description", manager: "Select manager", supervisor: "Select supervisor",
};

type StaffOption = { id: string; name: string; username?: string; role?: string; email?: string };
type SetupStep = {
  label: string;
  ok: boolean;
  ref: React.RefObject<HTMLDivElement | null>;
  edit: boolean;
  blocker?: boolean;
  path?: string;
};

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
  return <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${m[variant]}`}>{label === "active" && <span className="inline-block h-1 w-1 rounded-full bg-success mr-1 animate-pulse" />}{label}</span>;
}

function SetupSignal({ ok, label, onClick, current = false }: { ok: boolean; label: string; onClick?: () => void; current?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={ok ? "Completed" : `Action needed: ${label}`}
      className={`inline-flex w-full items-center gap-1.5 text-left text-[10px] font-medium transition-colors ${theme.focusRingNeutral} ${
        ok
          ? `px-2 py-0.5 ${theme.textMuted}`
          : current
            ? `px-2.5 py-1.5 ${theme.warningChip} shadow-sm`
            : `px-2 py-1 ${theme.badgeWarning}`
      }`}>
      {ok ? <CheckCircle className="h-2.5 w-2.5 stroke-current shrink-0 text-muted-foreground" /> : <ArrowRight className="h-3 w-3 stroke-current shrink-0" />}
      <span className={`truncate ${ok ? "text-muted-foreground" : ""}`}>{label}</span>
    </button>
  );
}

function DeptSection({ title, children, fill = false, alert = false }: { title: string; children: React.ReactNode; fill?: boolean; alert?: boolean }) {
  return (
    <section className={`min-h-0 rounded-lg ${alert ? "ring-2 ring-warning ring-warning" : theme.cardSection} ${fill ? "flex flex-col overflow-hidden" : ""}`}>
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
      {children}{required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}

export function DepartmentsPage({ embeddedInFlow = false }: { embeddedInFlow?: boolean } = {}) {
  const { search, statusFilter, setFooterContent, setToolbarVariant, showSystemMessage } = useToolbar();
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
  const { data: plantsData } = useQuery<{ plants: Array<{ id: string; name: string; code: string; status: string }> }>(PLANTS_QUERY, { fetchPolicy: "cache-and-network" });
  const plants = plantsData?.plants ?? [];

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [plantFilter, setPlantFilter] = useState<string>("all");
  const [form, setForm] = useState<DepartmentForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editState, setEditState] = useState({ dirty: false, saving: false });
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [lineFilter, setLineFilter] = useState<"active" | "unlinked" | "all">("all");
  const identityRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const ownershipRef = useRef<HTMLDivElement>(null);
  const structureRef = useRef<HTMLDivElement>(null);
  const firstMissingRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => { setPage(1); }, [search, statusFilter, plantFilter]);
  useEffect(() => { setDescriptionExpanded(false); }, [selectedId]);

  const filtered = departments
    .filter((d: DepartmentNode) => statusFilter === "all" || d.status === statusFilter)
    .filter((d) => plantFilter === "all" || d.plantId === plantFilter)
    .filter((d) => !search || `${d.name} ${d.code} ${d.plant?.name || ""} ${d.plant?.code || ""} ${d.managerRef?.name || d.manager || ""}`.toLowerCase().includes(search.toLowerCase()));
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
      plantId: d.plantId || "", name: d.name || "", code: d.code || "", status: d.status?.toLowerCase() === "inactive" ? "inactive" : "active",
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
    if (!form.plantId && !sel?.plantId) errs.plantId = "Required";
    if (!form.name?.trim()) errs.name = "Required";
    if (!form.code?.trim()) errs.code = "Required";
    const code = form.code?.trim();
    if (code && code !== code.toUpperCase()) errs.code = "Code must be uppercase";
    if (!form.statusId && !form.status) errs.statusId = "Required";
    if (!form.status) errs.status = "Required";
    const activePlantId = form.plantId || sel?.plantId || "";
    const duplicate = code ? departments.find((d) => d.id !== selectedId && d.plantId === activePlantId && d.code.toLowerCase() === code.toLowerCase()) : null;
    if (duplicate) errs.code = "Code must be unique inside Plant";
    if (form.manager && !staffOptionMap.has(form.manager)) errs.manager = "Manager must be a valid staff/user reference";
    if (form.supervisor && !staffOptionMap.has(form.supervisor)) errs.supervisor = "Supervisor must be a valid staff/user reference";
    const lineIds = new Set(productionLines.map((line) => line.id));
    if (form.productionLineIds.some((id) => !lineIds.has(id))) errs.productionLineIds = "Linked production lines must exist";
    if (activePlantId && form.productionLineIds.some((id) => productionLines.find((line) => line.id === id)?.plantId !== activePlantId)) {
      errs.productionLineIds = "Department and Production Line must belong to the same Plant.";
    }
    return errs;
  }, [form, departments, selectedId, staffOptionMap, productionLines, sel]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showSystemMessage("Please fix the validation errors", "error");
      firstMissingRef.current?.focus();
      return;
    }
    setEditState((p) => ({ ...p, saving: true }));
    const r = await saveDepartment(form, mode === "edit" ? selectedId : null);
    if (r.ok) {
      const departmentId = r.department?.id || selectedId;
      if (departmentId) {
        const linkResult = await assignDepartmentToLines(departmentId, form.productionLineIds);
        if (!linkResult.ok) {
          setErrors(linkResult.errors ?? {});
          const message = linkResult.errors?._form || linkResult.errors?.productionLineIds || "Production line links could not be saved.";
          setMutationError(message);
          showSystemMessage(message, "error");
          setEditState((p) => ({ ...p, saving: false })); return;
        }
      }
      if (departmentId) setSelectedId(departmentId);
      await refetch(); await refetchLines();
      setEditState({ dirty: false, saving: false }); setMode("view");
      showSystemMessage("Department saved", "success"); return;
    }
    setEditState((p) => ({ ...p, saving: false }));
    setErrors(r.errors ?? {});
    const message = r.errors?._form || "Department could not be saved.";
    setMutationError(message);
    showSystemMessage(message, "error");
  }, [form, mode, selectedId, saveDepartment, assignDepartmentToLines, refetch, refetchLines, validationErrors, showSystemMessage]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setMutationError(null);
    const result = await deleteDepartment(confirmDelete);
    if (result && !result.success) {
      const message = result.message || "Department could not be deleted.";
      setMutationError(message);
      showSystemMessage(message, "error");
      setConfirmDelete(null);
      return;
    }
    setSelectedId(null); await refetch(); setConfirmDelete(null);
    showSystemMessage("Department deleted", "success");
  }, [confirmDelete, deleteDepartment, refetch, showSystemMessage]);

  const selectDepartment = useCallback((id: string) => {
    if (editState.dirty) { const discard = window.confirm("You have unsaved department changes. Discard them and select another department?"); if (!discard) return; discardChanges(); }
    setSelectedId(id);
    if (mode === "create") { clearForm(); setMode("view"); }
  }, [editState.dirty, mode, clearForm, discardChanges]);

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
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, discardChanges, registerActions, refetch, setToolbarVariant, setFooterContent, editState, validationErrors]);

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

  const ev = (k: string, v: string | null | undefined) => v?.trim() ? v : <span className={`${theme.textMuted} italic text-[11px]`}>{ET[k] || "-"}</span>;
  const iCls = `h-7 w-full px-2 text-[11px] outline-none transition-all ${theme.input} ${theme.focusRing}`;
  const sCls = `h-7 w-full px-2 text-[11px] outline-none transition-all ${theme.input} ${theme.focusRing}`;

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className="flex flex-1 items-center justify-center bg-card bg-muted h-full">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-entity-department-bg">
              <Layers className="h-5 w-5 text-entity-department stroke-current" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Department Details</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Select a department or create a new one to manage its lines, staff, and resources.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Department" : sel!.name;
    const code = mode !== "create" ? sel!.code : undefined;
    const isNew = mode === "create";
    const d: Partial<DepartmentView> = sel ?? {};
    const linkedLineCount = isForm ? form.productionLineIds.length : d.productionLineCount ?? 0;
    const hasLine = linkedLineCount > 0;
    const resourceGroupRows = d.resourceGroups ?? [];
    const groupCount = resourceGroupRows.length;
    const resourceCount = d.resourceCount ?? 0;
    const selectedPlant = plants.find((plant) => plant.id === (isForm ? form.plantId : d.plantId));
    const plantLabel = selectedPlant?.name || d.plant?.name || "";
    const selectedPlantId = isForm ? form.plantId : d.plantId || "";
    const identityDefined = !!(isForm ? form.name : d.name) && !!(isForm ? form.code : d.code) && !!(isForm ? form.status : d.status);
    const ownershipDefined = isForm ? !!form.manager || !!form.supervisor : !!d.managerRef || !!d.supervisor;
    const resourcesAvailable = resourceCount > 0;
    const plantAssigned = !!selectedPlantId;
    const linkedLineStepOk = plantAssigned && hasLine;
    const resourceGroupStepOk = plantAssigned && groupCount > 0;
    const resourcesStepOk = plantAssigned && resourcesAvailable;
    const steps: SetupStep[] = [
      { label: "Assign Plant", ok: plantAssigned, ref: identityRef, edit: true, blocker: true },
      { label: "Complete Identity", ok: identityDefined, ref: identityRef, edit: true },
      { label: "Assign Owner", ok: ownershipDefined, ref: ownershipRef, edit: true, blocker: true },
      { label: "Link Production Lines", ok: linkedLineStepOk, ref: linesRef, edit: true },
      { label: "Add Resource Group", ok: resourceGroupStepOk, ref: structureRef, edit: false },
      { label: "Add Resources", ok: resourcesStepOk, ref: structureRef, edit: false },
    ];
    const readyCount = steps.filter((s) => s.ok).length;
    const totalSteps = steps.length;
    const currentStepIdx = steps.findIndex((step) => !step.ok);
    const currentStep = currentStepIdx >= 0 ? currentStepIdx + 1 : totalSteps;
    const readinessPct = Math.round((readyCount / totalSteps) * 100);
    const currentStepLabel = currentStepIdx >= 0 ? steps[currentStepIdx].label : "";
    const stepsToShow = steps;
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
    const ownerLabel = managerLabel || supervisorLabel || "Missing";
    const gapCount = totalSteps - readyCount;
    const descriptionText = (d.description || "").trim();
    const descriptionNeedsToggle = descriptionText.length > 140 || descriptionText.includes("\n");
    const linkedLineIds = new Set(isForm ? form.productionLineIds : (d.productionLines ?? []).map((line) => line.id));
    const linkedLineMap = new Map((d.productionLines ?? []).map((line) => [line.id, line]));
    const canAddStructure = mode !== "create" && !!d.id;
    const plantLocked = isForm && mode === "edit" && (linkedLineCount > 0 || groupCount > 0 || resourceCount > 0);
    const allLineRows = (isForm ? productionLines.filter((line) => !!selectedPlantId && line.plantId === selectedPlantId) : (d.productionLines ?? [])).map((line) => ({
      id: line.id, name: line.name, code: line.code,
      plantName: line.plantName || linkedLineMap.get(line.id)?.plantName || "",
      status: line.status || linkedLineMap.get(line.id)?.status || "active",
      linked: linkedLineIds.has(line.id),
    }));
    const linkedRows = allLineRows.filter((line) => line.linked);
    const lineRows = isForm
      ? allLineRows.filter((line) => lineFilter === "all" || (lineFilter === "active" && (line.status || "").toLowerCase() === "active") || (lineFilter === "unlinked" && !line.linked))
      : allLineRows;
    const nextAction = steps.find((step) => !step.ok) ?? null;
    const focusSection = (ref: React.RefObject<HTMLDivElement | null>) => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const actOnGap = (step: (typeof steps)[number]) => {
      if (step.edit && !isForm && sel) { loadForm(sel); setMode("edit"); setEditState({ dirty: false, saving: false }); window.setTimeout(() => focusSection(step.ref), 0); return; }
      focusSection(step.ref);
    };
    const completeStep = (stepLabel: string) => { showSystemMessage(`Done: ${stepLabel}`, "success"); };

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-card bg-muted">
        {/* ── Header: Action Control Panel ── */}
        <div className={`shrink-0 px-4 pt-3 pb-2 ${theme.sectionDivider}`}>
          <div className="flex items-stretch gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center text-accent">
              <Layers className="h-4 w-4 stroke-current" />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0 justify-self-start">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-[16px] font-bold leading-5 text-muted-foreground">{title}</h2>
                  {code && <span className={`shrink-0 rounded px-1 py-px font-mono text-[9px] ${theme.codeBadge}`}>{code}</span>}
                  {plantLabel ? (
                    <span className={`shrink-0 rounded px-1 py-px text-[9px] font-medium ${theme.badgeNeutral}`}>{plantLabel}</span>
                  ) : (
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-px text-[9px] font-semibold ${theme.badgeCritical}`}><AlertTriangle className="h-2.5 w-2.5 stroke-current" /> Plant Required</span>
                  )}
                </div>
                <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] ${theme.textSecondary}`}>
                  <span>Owner: {ownerLabel}</span>
                  <span>{linkedRows.length} Lines</span>
                  <span>{groupCount} RG</span>
                  <span>{resourceCount} Resources</span>
                  {d.updatedAt && <span>Updated {formatAppDate(d.updatedAt)}</span>}
                </div>
              </div>
              <div className="flex min-h-9 items-center justify-center justify-self-center self-stretch text-center">
                {(() => {
                  if (!nextAction) return null;
                  const label = nextAction.label === "Link Production Lines" ? "Link Lines" : nextAction.label;
                  return (
                    <button type="button" onClick={() => actOnGap(nextAction)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-center text-[9px] font-semibold ${theme.warningChip} ${theme.focusRingNeutral}`}
                      title={nextAction.label === "Assign Owner" ? "Required for accountability and approvals." : "Required to proceed"}>
                      <AlertTriangle className="h-3 w-3 stroke-current" /> {label}
                    </button>
                  );
                })()}
              </div>
              <div className="flex min-h-9 min-w-0 flex-wrap items-center justify-end gap-1.5 justify-self-end self-stretch text-center">
                <Badge label={isNew ? "New" : (d.status || "active")} variant={isNew ? "new" : (d.status === "active" ? "active" : "inactive")} />
                <span className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-center text-[9px] font-semibold ${readinessPct >= 100 ? theme.badgeActive : theme.warningChip}`} title={`Step ${currentStep} of ${totalSteps}`}>
                  {readinessPct >= 100 ? <CheckCircle className="h-3 w-3 stroke-current" /> : <AlertCircle className="h-3 w-3 stroke-current" />}
                  {readinessPct}% Ready
                </span>
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-center text-[9px] font-semibold ${gapCount ? theme.warningChip : theme.badgeActive}`} title={gapCount ? "Readiness gaps remaining" : "No readiness gaps"}>
                  {gapCount} gap{gapCount !== 1 ? "s" : ""}
                </span>
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-center text-[9px] font-semibold ${linkedRows.length ? theme.badgeActive : theme.warningChip}`} title={linkedRows.length ? "Linked production lines" : "No production lines linked"}>
                  {linkedRows.length} Lines
                </span>
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-center text-[9px] font-semibold ${groupCount ? theme.badgeActive : theme.warningChip}`} title={groupCount ? "Resource groups linked" : "No resource groups linked"}>
                  {groupCount} RG
                </span>
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-center text-[9px] font-semibold ${resourceCount ? theme.badgeActive : theme.warningChip}`} title={resourceCount ? "Resources linked" : "No resources linked"}>
                  {resourceCount} Resources
                </span>
                {isForm && <Badge label="Editing" variant="violet" />}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-hidden p-2 min-h-0">
            {mutationError && isForm && <p className="mb-2 text-[10px] font-medium text-danger">{mutationError}</p>}
            <div className="grid h-full min-h-0 grid-cols-2 gap-2">
              {/* LEFT */}
              <div className="flex min-h-0 flex-col gap-2 pr-1">
                {/* Identity / Overview */}
                <div ref={identityRef} className="shrink-0 scroll-mt-2">
                  <DeptSection title="Identity">
                    {isForm ? (
                      <div className="space-y-1.5">
                        <div>
                          <FieldLabel required>Plant</FieldLabel>
                          <select ref={(element) => { if (!form.plantId) firstMissingRef.current = element; }} value={g("plantId") as string} disabled={plantLocked} onChange={(e) => { s("plantId", e.target.value); s("productionLineIds", []); completeStep("Assign Plant"); }} className={`${sCls} disabled:opacity-60`}>
                            <option value="">Select plant</option>
                            {plants.filter((p) => p.status === "ACTIVE" || p.status === "active").map((plant) => <option key={plant.id} value={plant.id}>{plant.name} ({plant.code})</option>)}
                          </select>
                          {(errors.plantId || validationErrors.plantId) && <p className="text-[9px] text-danger mt-0.5">{errors.plantId || validationErrors.plantId}</p>}
                          {plantLocked && <p className={`mt-0.5 text-[9px] ${theme.textMuted}`}>Plant is locked because this department has linked production lines/resource groups/resources.</p>}
                        </div>
                        <div>
                          <FieldLabel required>Name</FieldLabel>
                          <input ref={(element) => { if (form.plantId && !form.name) firstMissingRef.current = element; }} type="text" value={g("name") as string} onChange={(e) => { s("name", e.target.value); if (e.target.value && !form.code) window.setTimeout(() => firstMissingRef.current?.focus(), 0); }} placeholder="e.g. Assembly, Final Welding" className={iCls} />
                          {(errors.name || validationErrors.name) && <p className="text-[9px] text-danger mt-0.5">{errors.name || validationErrors.name}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <FieldLabel required>Code</FieldLabel>
                            <input ref={(element) => { if (form.plantId && form.name && !form.code) firstMissingRef.current = element; }} type="text" value={g("code") as string} onChange={(e) => { s("code", e.target.value); }} placeholder="e.g. ASSY, WELD" className={iCls} />
                            {(errors.code || validationErrors.code) && <p className="text-[9px] text-danger mt-0.5">{errors.code || validationErrors.code}</p>}
                          </div>
                          <div>
                            <FieldLabel required>Status</FieldLabel>
                            <select ref={(element) => { if (form.plantId && form.name && form.code && !form.statusId) firstMissingRef.current = element; }} value={g("statusId") as string} onChange={(e) => { setStatusId(e.target.value); completeStep("Complete Identity"); }} className={sCls}>
                              <option value="">Select status</option>
                              {statusValues.filter((value) => value.isActive).map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
                            </select>
                            {(errors.statusId || validationErrors.statusId) && <p className="text-[9px] text-danger mt-0.5">{errors.statusId || validationErrors.statusId}</p>}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Description</FieldLabel>
                          <textarea value={g("description") as string} onChange={(e) => s("description", e.target.value)} placeholder="Department purpose and scope" className={`${iCls} min-h-20 py-1.5 resize-none field-sizing-content`} />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted rounded-lg p-2">
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

                {/* Production Line Links */}
                <div ref={linesRef} className="shrink-0 scroll-mt-2">
                  <DeptSection title={selectedPlantId ? `Production Lines in ${plantLabel}` : "Production Line Links"} fill>
                    {isForm && (
                      <div className={`mb-1.5 flex flex-wrap items-center gap-1 px-2 py-1 ${theme.subCard}`}>
                        <span className={`mr-1 text-[10px] font-medium ${theme.textSecondary}`}>{form.productionLineIds.length} selected | Linked to department</span>
                        <button type="button" disabled={!selectedPlantId} onClick={() => s("productionLineIds", allLineRows.map((line) => line.id))} className={`px-1.5 py-0.5 text-[10px] ${theme.buttonGhost} disabled:opacity-40`}>Select all</button>
                        <button type="button" disabled={!selectedPlantId} onClick={() => s("productionLineIds", [])} className={`px-1.5 py-0.5 text-[10px] ${theme.buttonGhost} disabled:opacity-40`}>Clear</button>
                        {(["active", "unlinked", "all"] as const).map((filter) => (
                          <button key={filter} type="button" disabled={!selectedPlantId} onClick={() => setLineFilter(filter)} className={`px-1.5 py-0.5 text-[10px] ${lineFilter === filter ? theme.tabActive : theme.tabInactive} disabled:opacity-40`}>
                            {filter === "active" ? "Active" : filter === "unlinked" ? "Unlinked" : "All"}
                          </button>
                        ))}
                      </div>
                    )}
                    {isForm && !selectedPlantId && (
                      <p className={`mb-1.5 text-[10px] ${theme.textWarning}`}>Select Plant before linking production lines or resources.</p>
                    )}
                    {lineRows.length === 0 ? (
                      <div className={`px-2 py-2 text-[10px] flex items-center justify-between gap-2 ${theme.panelNeutral} ${theme.textMuted}`}>
                        <span>{!selectedPlantId ? "Select Plant before linking production lines." : "No production lines available for this Plant."}</span>
                        {selectedPlantId && <button type="button" onClick={() => isForm ? setLineFilter("all") : actOnGap(steps.find((step) => step.label === "Link Production Lines") || steps[0])} className={`${theme.link} font-semibold`}>{isForm ? "Show all lines" : "Link Lines"}</button>}
                      </div>
                    ) : (
                      <div className={`border ${theme.sectionDivider}`}>
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
                          <tbody className="block max-h-56 overflow-y-auto">
                            {lineRows.map((line) => (
                                  <tr key={line.id} className="table w-full table-fixed">
                                    {isForm && <td className="px-2 py-1"><input type="checkbox" aria-label={`Link ${line.name}`} checked={line.linked} disabled={!selectedPlantId} onChange={() => toggleLineLink(line.id)} className="h-3 w-3 disabled:opacity-30" /></td>}
                                    <td className="truncate px-2 py-1 font-medium text-muted-foreground">{line.name} <span className={theme.textMuted}>{line.code}</span></td>
                                    <td className={`truncate px-2 py-1 ${theme.textSecondary}`}>{line.plantName || "-"}</td>
                                    <td className="w-18 px-2 py-1"><Badge label={line.linked ? (line.status || "active").toLowerCase() : "unlinked"} variant={line.linked ? ((line.status || "").toLowerCase() === "inactive" ? "inactive" : "active") : "inactive"} /></td>
                                    <td className="w-16 px-2 py-1 text-right"><button type="button" disabled={!selectedPlantId} onClick={() => navigateWithDirtyCheck(`/system/production-structure/components/line?productionLineId=${line.id}`)} className={`${theme.link} disabled:opacity-40`}>Open</button></td>
                                  </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {errors.productionLineIds && <p className="text-[9px] text-danger mt-0.5">{errors.productionLineIds}</p>}
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
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-info rounded-full transition-all duration-500" style={{ width: `${readinessPct}%` }} />
                        </div>
                        <span className={`text-[10px] font-semibold ${readinessPct >= 100 ? "text-success" : "text-info"}`}>{readinessPct}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {stepsToShow.map((step) => {
                        const isCurrent = !step.ok && step.label === currentStepLabel;
                        return (
                          <SetupSignal key={step.label} ok={step.ok}
                            label={step.ok ? `${step.label}` : isCurrent ? `Next: ${step.label}` : step.label}
                            onClick={() => actOnGap(step)} />
                        );
                      })}
                    </div>
                    <p className={`mt-1.5 text-[10px] leading-4 ${theme.textMuted}`}>
                      {readinessPct >= 100
                        ? "All steps completed. Department is ready."
                        : currentStepLabel === "Assign Plant"
                          ? "Select Plant before linking production lines or resources."
                          : `Complete Step ${currentStep} to proceed.`}
                    </p>
                  </DeptSection>
                </div>

                {/* Management & Ownership */}
                <div ref={ownershipRef} className="shrink-0 scroll-mt-2">
                  <DeptSection title="Management & Ownership" alert={!ownershipDefined}>
                    {isForm ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <FieldLabel>Manager</FieldLabel>
                            <select value={g("manager") as string} onChange={(e) => { s("manager", e.target.value); if (e.target.value) completeStep("Assign Owner"); }} className={sCls}>
                              <option value="">Select manager</option>
                              {staffOptions.map((user) => <option key={user.id} value={user.id}>{user.name}{user.role ? ` (${user.role})` : ""}</option>)}
                            </select>
                            {errors.manager && <p className="text-[9px] text-danger mt-0.5">{errors.manager}</p>}
                          </div>
                          <div>
                            <FieldLabel>Supervisor</FieldLabel>
                            <select value={g("supervisor") as string} onChange={(e) => { s("supervisor", e.target.value); }} className={sCls}>
                              <option value="">Select supervisor</option>
                              {staffOptions.map((user) => <option key={user.id} value={user.id}>{user.name}{user.role ? ` (${user.role})` : ""}</option>)}
                            </select>
                            {errors.supervisor && <p className="text-[9px] text-danger mt-0.5">{errors.supervisor}</p>}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Employees</FieldLabel>
                          <div className={`flex h-7 items-center px-2 text-[11px] font-medium ${theme.subCard} ${theme.textSecondary}`}>
                            {d.employeeCount ?? d.employees ?? 0}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`${ownershipDefined ? theme.subCard : theme.panelWarning} rounded-lg p-2`}>
                        <div className="space-y-px">
                          <InlineRow label="Manager" value={ev("manager", managerLabel)} />
                          <InlineRow label="Supervisor" value={ev("supervisor", supervisorLabel)} />
                          <InlineRow label="Employees" value={d.employeeCount ?? d.employees ?? 0} />
                        </div>
                      </div>
                    )}
                  </DeptSection>
                </div>

                {/* Resource Groups Table */}
                <div className="shrink-0">
                  <DeptSection title={`Resource Groups (${groupCount})`}>
                    {!groupCount ? (
                      <div className="flex min-h-14 items-center justify-between border border-dashed border-border bg-muted px-2.5 py-2 border-border bg-muted">
                        <p className="text-[10px] text-muted-foreground">No resource groups linked.</p>
                        <button type="button" disabled={!canAddStructure} onClick={() => navigateWithDirtyCheck(`/system/production-structure/components/rg?departmentId=${d.id}`)} className={`inline-flex items-center gap-1 bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground disabled:opacity-40 bg-muted text-muted-foreground`}><Plus className="h-2.5 w-2.5 stroke-current" /> Add Resource Group</button>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-auto border border-border">
                        <table className="w-full text-[11px]">
                          <thead><tr className="bg-muted text-muted-foreground">
                            <th className="text-left px-2 py-1 font-medium">Resource Group</th>
                            <th className="text-left px-2 py-1 font-medium">Code</th>
                            <th className="text-left px-2 py-1 font-medium">Resources</th>
                            <th className="text-left px-2 py-1 font-medium">Status</th>
                            <th className="text-right px-2 py-1 font-medium w-14">Action</th>
                          </tr></thead>
                          <tbody>
                            {resourceGroupRows.map((group) => (
                              <tr key={group.id}>
                                <td className="px-2 py-1 font-medium text-muted-foreground">{group.name}</td>
                                <td className="px-2 py-1 text-muted-foreground">{group.code || "-"}</td>
                                <td className="px-2 py-1 text-muted-foreground">{group.resourceCount}</td>
                                <td className="px-2 py-1"><Badge label={group.status.toLowerCase()} variant={group.status.toLowerCase() === "active" ? "active" : "inactive"} /></td>
                                <td className="px-2 py-1 text-right"><button type="button" onClick={() => navigateWithDirtyCheck(`/system/production-structure/components/rg?departmentId=${d.id}&resourceGroupId=${group.id}`)} className="text-info"><ExternalLink className="h-3 w-3 stroke-current" /></button></td>
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
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete department?" message="This action cannot be undone." onConfirm={hDelete} />
      )}
      {confirmCancel && (
        <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Discard changes?" message="You have unsaved department changes. Discard them?" onConfirm={discardChanges} />
      )}
      <EntityWorkspacePage
        hideList={embeddedInFlow}
        toolbar={null}
        list={
          <>
            <div className="shrink-0 border-b border-border/35 flex h-9 items-center px-3 bg-muted">
              <select value={plantFilter} onChange={(event) => setPlantFilter(event.target.value)}
                className="h-6 w-full min-w-0 rounded border border-border/35 bg-transparent px-2 text-[11px] text-muted-foreground outline-none transition-colors focus:border-border/50 focus:bg-card focus:ring-1 focus:ring-border/20">
                <option value="all">All Plants</option>
                {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto bg-card pl-2 bg-muted">
              {loading && departments.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><div className="h-2 w-2 rounded-full bg-info animate-bounce mr-2" />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Layers className="h-4 w-4 text-muted-foreground mb-1.5 stroke-current" />
                  <p className="text-xs text-muted-foreground">No departments</p>
                </div>
              ) : (
                <div>
                  {paginated.map((d: DepartmentNode) => {
                    const deptPlantOk = !!d.plantId && !!d.plant?.name;
                    const plantName = d.plant?.name || "";
                    return (
                      <EntityListItem key={d.id}
                        name={d.name} code={d.code}
                        meta={deptPlantOk ? plantName : "Plant required"}
                        icon={<Layers className="h-3.5 w-3.5 stroke-current" />}
                        selected={selectedId === d.id}
                        status={d.status}
                        onClick={() => selectDepartment(d.id)}
                        entityType="department"
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <div className="shrink-0 flex h-7 items-center border-t border-border bg-muted px-3">
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
