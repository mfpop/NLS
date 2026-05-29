import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { AlertTriangle, Layers, AlertCircle, ExternalLink } from "lucide-react";
import type { DepartmentNode } from "@/hooks/useDepartments";
import { formatAppDate } from "@/utils/dateFormat";
import { InlineRow, Badge, SetupSignal, SectionHeader, FieldLabel, ErrorText, ErrorFieldWrapper, iCls, iClsError, sCls, sClsError } from "./DetailComponents";

// ─── Types ───

interface DepartmentForm {
  plantId: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  statusId: string;
  description: string;
  manager: string;
  supervisor: string;
  productionLineIds: string[];
}

type PlantOption = { id: string; name: string; code: string; status: string };
type StaffOption = { id: string; name: string; username?: string; role?: string; email?: string };
type StatusValue = { id: string; name: string; code: string; isActive: boolean };
type LineOption = { id: string; name: string; code: string; plantId: string; plantName?: string; status: string };

interface SetupStep {
  label: string;
  ok: boolean;
  ref: React.RefObject<HTMLDivElement | null>;
  edit: boolean;
  blocker?: boolean;
}

export interface DepartmentDetailViewHandle {
  save: () => Promise<boolean>;
  cancel: () => void;
  isDirty: () => boolean;
}

export interface DepartmentDetailViewProps {
  departmentId?: string | null;
  createMode?: boolean;
  editing?: boolean;
  department: DepartmentNode | null;
  plants: PlantOption[];
  staffOptions: StaffOption[];
  productionLines: LineOption[];
  statusValues: StatusValue[];
  departments: DepartmentNode[];
  onEditToggle?: (editing: boolean) => void;
  onError?: (message: string | null) => void;
  onEditStateChange?: (state: { dirty: boolean; valid: boolean; saving: boolean }) => void;
  onSaved?: () => Promise<void> | void;
  onNavigateToLine?: (lineId: string) => void;
  showSystemMessage?: (message: string, type: "success" | "error" | "info") => void;
  onSaveDepartment?: (form: DepartmentForm, id: string | null) => Promise<{ ok: boolean; department?: { id: string }; errors?: Record<string, string> }>;
  onAssignDepartmentToLines?: (departmentId: string, lineIds: string[]) => Promise<{ ok: boolean; errors?: Record<string, string> }>;
  refetch?: () => Promise<void>;
}

// ─── Constants ───

const ET: Record<string, string> = {
  description: "No description", manager: "Select manager", supervisor: "Select supervisor",
};

const EMPTY_FORM: DepartmentForm = {
  plantId: "", name: "", code: "", status: "active", statusId: "", description: "",
  manager: "", supervisor: "", productionLineIds: [],
};

// ─── Main Component ───

export const DepartmentDetailView = forwardRef<DepartmentDetailViewHandle, DepartmentDetailViewProps>(
function DepartmentDetailView({
  departmentId,
  createMode = false,
  editing = false,
  department,
  plants,
  staffOptions,
  productionLines,
  statusValues,
  departments,
  onEditToggle,
  onError,
  onEditStateChange,
  onSaved,
  onNavigateToLine,
  showSystemMessage,
  onSaveDepartment,
  onAssignDepartmentToLines,
}, ref) {
  // ── Derived state ──
  const sel = department;
  const isNew = createMode;
  const isEditing = editing;

  // ── Form state ──
  const [form, setForm] = useState<DepartmentForm>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<DepartmentForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editState, setEditState] = useState({ dirty: false, saving: false });
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // ── Guided setup refs ──
  const identityRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const ownershipRef = useRef<HTMLDivElement>(null);
  const structureRef = useRef<HTMLDivElement>(null);
  const firstMissingRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Reset description expanded on department change
  useEffect(() => { setDescriptionExpanded(false); }, [departmentId]);

  // ── Load form from department data ──
  useEffect(() => {
    if (createMode) {
      setForm(EMPTY_FORM);
      setInitialForm(EMPTY_FORM);
      setErrors({});
      setMutationError(null);
      return;
    }
    if (!sel) return;
    const staffOptionMap = new Map(staffOptions.map((s) => [s.id, s]));
    const managerId = sel.managerRef?.id && staffOptionMap.has(sel.managerRef.id) ? sel.managerRef.id
      : sel.manager && staffOptionMap.has(sel.manager) ? sel.manager : "";
    const supervisorId = sel.supervisor?.id && staffOptionMap.has(sel.supervisor.id) ? sel.supervisor.id : "";
    const loaded: DepartmentForm = {
      plantId: sel.plantId || "",
      name: sel.name || "",
      code: sel.code || "",
      status: sel.status?.toLowerCase() === "inactive" ? "inactive" : "active",
      statusId: sel.statusId || statusValues.find((v) => v.code.toLowerCase() === sel.status?.toLowerCase())?.id || "",
      description: sel.description || "",
      manager: managerId,
      supervisor: supervisorId,
      productionLineIds: (sel.productionLines ?? []).map((line: any) => line.id),
    };
    setForm(loaded);
    setInitialForm(loaded);
    setErrors({});
    setMutationError(null);
  }, [sel, createMode, staffOptions, statusValues]);

  // ── Dirty tracking ──
  const dirty = createMode
    ? JSON.stringify(form) !== JSON.stringify(EMPTY_FORM)
    : JSON.stringify(form) !== JSON.stringify(initialForm);

  // ── Validation ──
  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    const staffOptionMap = new Map(staffOptions.map((s) => [s.id, s]));
    if (!form.plantId && !sel?.plantId) errs.plantId = "Required";
    if (!form.name?.trim()) errs.name = "Required";
    if (!form.code?.trim()) errs.code = "Required";
    const code = form.code?.trim();
    if (code && code !== code.toUpperCase()) errs.code = "Code must be uppercase";
    if (!form.statusId && !form.status) errs.statusId = "Required";
    if (!form.status) errs.status = "Required";
    const activePlantId = form.plantId || sel?.plantId || "";
    const duplicate = code ? departments.find((d) => d.id !== departmentId && d.plantId === activePlantId && d.code.toLowerCase() === code.toLowerCase()) : null;
    if (duplicate) errs.code = "Code must be unique inside Plant";
    if (form.manager && !staffOptionMap.has(form.manager)) errs.manager = "Manager must be a valid staff/user reference";
    if (form.supervisor && !staffOptionMap.has(form.supervisor)) errs.supervisor = "Supervisor must be a valid staff/user reference";
    const lineIdsSet = new Set(productionLines.map((line) => line.id));
    if (form.productionLineIds.some((id) => !lineIdsSet.has(id))) errs.productionLineIds = "Linked production lines must exist";
    if (activePlantId && form.productionLineIds.some((id) => productionLines.find((line) => line.id === id)?.plantId !== activePlantId)) {
      errs.productionLineIds = "Department and Production Line must belong to the same Plant.";
    }
    return errs;
  }, [form, departments, departmentId, staffOptions, productionLines, sel]);

  const valid = Object.keys(validationErrors).length === 0;

  // ── Notify parent of state changes ──
  useEffect(() => {
    onEditStateChange?.({ dirty, valid, saving: editState.saving });
  }, [dirty, valid, editState.saving, onEditStateChange]);

  // ── Focus first missing field when entering edit/create ──
  useEffect(() => {
    if (!isEditing && !isNew) return;
    const timer = window.setTimeout(() => firstMissingRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isEditing, isNew, departmentId]);

  // ── Form helpers ──
  const g = (k: keyof DepartmentForm) => form[k] ?? "";
  const s = (k: keyof DepartmentForm, v: string | string[]) => {
    setForm((p) => ({ ...p, [k]: k === "code" && typeof v === "string" ? v.toUpperCase() : v }));
    setEditState((p) => ({ ...p, dirty: true }));
    setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  const setStatusId = (id: string) => {
    const selected = statusValues.find((value) => value.id === id);
    setForm((p) => ({ ...p, statusId: id, status: selected?.code?.toLowerCase() === "inactive" ? "inactive" : "active" }));
    setEditState((p) => ({ ...p, dirty: true }));
  };

  const ev = (k: string, v: string | null | undefined) =>
    v?.trim() ? v : <span className="text-muted-foreground/40 italic text-[11px]">{ET[k] || "—"}</span>;

  // ── Imperative save/cancel/isDirty ──
  useImperativeHandle(ref, () => ({
    save: async () => {
      setMutationError(null);
      const currentValidationErrors = validationErrors;
      if (Object.keys(currentValidationErrors).length > 0) {
        setErrors(currentValidationErrors);
        showSystemMessage?.("Please fix the validation errors", "error");
        firstMissingRef.current?.focus();
        return false;
      }
      if (!onSaveDepartment) {
        onError?.("Save handler not provided.");
        return false;
      }
      setEditState((p) => ({ ...p, saving: true }));
      try {
        const currentForm = form;
        const r = await onSaveDepartment(currentForm, isNew ? null : departmentId ?? null);
        if (r.ok) {
          const newDepartmentId = r.department?.id || departmentId;
          if (newDepartmentId && onAssignDepartmentToLines) {
            const linkResult = await onAssignDepartmentToLines(newDepartmentId, currentForm.productionLineIds);
            if (!linkResult.ok) {
              setErrors(linkResult.errors ?? {});
              const message = linkResult.errors?._form || linkResult.errors?.productionLineIds || "Production line links could not be saved.";
              setMutationError(message);
              onError?.(message);
              showSystemMessage?.(message, "error");
              setEditState((p) => ({ ...p, saving: false }));
              return false;
            }
          }
          await onSaved?.();
          setEditState({ dirty: false, saving: false });
          showSystemMessage?.("Department saved", "success");
          return true;
        }
        setErrors(r.errors ?? {});
        const message = r.errors?._form || "Department could not be saved.";
        setMutationError(message);
        onError?.(message);
        showSystemMessage?.(message, "error");
        setEditState((p) => ({ ...p, saving: false }));
        return false;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown save error.";
        setMutationError(message);
        onError?.(message);
        showSystemMessage?.(message, "error");
        setEditState((p) => ({ ...p, saving: false }));
        return false;
      }
    },
    cancel: () => {
      if (isNew) {
        setForm(EMPTY_FORM);
        setErrors({});
        setMutationError(null);
        return;
      }
      setForm(initialForm);
      setErrors({});
      setMutationError(null);
      onEditToggle?.(false);
    },
    isDirty: () => dirty,
  }), [form, validationErrors, isNew, departmentId, showSystemMessage, onError,
      onSaveDepartment, onAssignDepartmentToLines, onSaved, onEditToggle, initialForm, dirty]);

  // ── Derived view data ──
  const d: Record<string, any> = sel ?? {};
  const linkedLineCount = isEditing || isNew ? form.productionLineIds.length : d.productionLineCount ?? 0;
  const linkedLineIds = new Set(isEditing || isNew ? form.productionLineIds : (d.productionLines ?? []).map((line: any) => line.id));
  const linkedLineMap = new Map((d.productionLines ?? []).map((line: any) => [line.id, line]));
  const hasLine = linkedLineCount > 0;
  const resourceGroupRows = d.resourceGroups ?? [];
  const groupCount = resourceGroupRows.length;
  const resourceCount = d.resourceCount ?? 0;
  const selectedPlant = plants.find((plant) => plant.id === (isEditing || isNew ? form.plantId : d.plantId));
  const plantLabel = selectedPlant?.name || d.plant?.name || "";
  const selectedPlantId = isEditing || isNew ? form.plantId : d.plantId || "";
  const plantLocked = isEditing && !isNew && (linkedLineCount > 0 || groupCount > 0 || resourceCount > 0);

  const identityDefined = !!(isEditing || isNew ? form.name : d.name) && !!(isEditing || isNew ? form.code : d.code) && !!(isEditing || isNew ? form.status : d.status);
  const ownershipDefined = isEditing || isNew ? !!form.manager || !!form.supervisor : !!d.managerRef || !!d.supervisor;
  const resourcesAvailable = resourceCount > 0;
  const plantAssigned = !!selectedPlantId;
  const linkedLineStepOk = plantAssigned && hasLine;
  const resourceGroupStepOk = plantAssigned && groupCount > 0;
  const resourcesStepOk = plantAssigned && resourcesAvailable;

  const steps: SetupStep[] = [
    { label: "Assign Plant", ok: plantAssigned, ref: identityRef, edit: true, blocker: true },
    { label: "Complete Identity", ok: identityDefined, ref: identityRef, edit: true },
    { label: "Assign Owner", ok: ownershipDefined, ref: ownershipRef, edit: true, blocker: true },
    { label: "Review Line Usage", ok: linkedLineStepOk, ref: linesRef, edit: true },
    { label: "Add Resource Group", ok: resourceGroupStepOk, ref: structureRef, edit: false },
    { label: "Add Resources", ok: resourcesStepOk, ref: structureRef, edit: false },
  ];

  const readyCount = steps.filter((s) => s.ok).length;
  const totalSteps = steps.length;
  const currentStepIdx = steps.findIndex((step) => !step.ok);
  const readinessPct = Math.round((readyCount / totalSteps) * 100);
  const currentStepLabel = currentStepIdx >= 0 ? steps[currentStepIdx].label : "";

  const allLineRows = (isEditing || isNew
    ? productionLines.filter((line) => !!selectedPlantId && line.plantId === selectedPlantId)
    : (d.productionLines ?? [])
  ).map((line: any) => ({
    id: line.id, name: line.name, code: line.code,
    plantName: line.plantName || (linkedLineMap.get(line.id) as any)?.plantName || "",
    status: line.status || (linkedLineMap.get(line.id) as any)?.status || "active",
    linked: linkedLineIds.has(line.id),
  }));

  const linkedRows = allLineRows.filter((line: any) => line.linked);
  const lineRows = allLineRows;
  const managerLabel = d.managerRef?.name || "";
  const supervisorLabel = d.supervisor?.name || d.supervisorName || "";
  const ownerLabel = managerLabel || supervisorLabel || "Missing";
  const descriptionText = (d.description || "").trim();
  const descriptionNeedsToggle = descriptionText.length > 140 || descriptionText.includes("\n");
  const codeVal = !isNew ? d.code : undefined;
  const title = isNew ? "New Department" : d.name || "";

  const focusSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const actOnGap = (step: SetupStep) => {
    if (step.edit && !isEditing && !isNew && sel) {
      onEditToggle?.(true);
      window.setTimeout(() => focusSection(step.ref), 0);
      return;
    }
    focusSection(step.ref);
  };

  const completeStep = (stepLabel: string) => {
    showSystemMessage?.(`Done: ${stepLabel}`, "success");
  };

  // ── Empty state ──
  if (!isNew && !sel) {
    return (
      <div className="flex flex-1 items-center justify-center bg-card h-full">
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

  // ── Render ──
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-card">
      {/* ── HEADER ── */}
      <div className="shrink-0 border-b border-border/40 bg-card">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-entity-department-bg text-entity-department ring-1 ring-entity-department/20">
              <Layers className="h-5 w-5 stroke-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
                {codeVal && <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">{codeVal}</span>}
                {plantLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-px text-[9px] font-medium text-muted-foreground border border-border/60">{plantLabel}</span>
                ) : (isEditing || isNew) ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 text-danger border border-danger/20 px-1.5 py-px text-[9px] font-semibold"><AlertTriangle className="h-2.5 w-2.5 stroke-current" /> Plant Required</span>
                ) : null}
                {isNew ? (
                  <Badge label="New" variant="new" />
                ) : (
                  <Badge label={d.status || "active"} variant={d.status === "active" ? "active" : "inactive"} />
                )}
                {(isEditing || isNew) && <Badge label="Editing" variant="amber" />}
              </div>
              {!isNew && (
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                  <span className="font-medium">Owner: <span className="font-semibold text-foreground/80">{ownerLabel}</span></span>
                  <span className="text-muted-foreground/30">·</span>
                  <span title="Production lines using resource groups from this department.">{linkedRows.length} Lines</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span title="Resource groups belonging to this department.">{groupCount} RG</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{resourceCount} Resources</span>
                  {d.updatedAt && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="ml-auto text-[9px] text-muted-foreground/50 whitespace-nowrap">
                        Updated {formatAppDate(d.updatedAt)}
                      </span>
                    </>
                  )}
                </div>
              )}
              {isNew && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Create the department record; structure is added after save.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-hidden min-h-0">
          {mutationError && (isEditing || isNew) && (
            <div className="mx-4 mt-3 rounded-md border border-danger/25 bg-danger/10 px-3 py-1.5 text-[10px] font-medium text-danger flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 stroke-current shrink-0" />
              {mutationError}
            </div>
          )}
          <div key={`detail-${isNew ? "create" : isEditing ? "edit" : "view"}`} className="mode-enter grid h-full min-h-0 grid-cols-2 gap-4 p-3">
            {/* LEFT */}
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
              {/* Identity / Overview */}
              <div ref={identityRef} className="shrink-0 scroll-mt-2">
                <SectionHeader title="Identity" />
                <div>
                  {(isEditing || isNew) ? (
                    <div className="space-y-2">
                      <div>
                        <FieldLabel required>Plant</FieldLabel>
                        <ErrorFieldWrapper error={errors.plantId || validationErrors.plantId}>
                          <select ref={(el) => { if (!form.plantId) firstMissingRef.current = el; }} value={g("plantId") as string} disabled={plantLocked} onChange={(e) => { s("plantId", e.target.value); s("productionLineIds", []); completeStep("Assign Plant"); }}
                            className={`${errors.plantId || validationErrors.plantId ? sClsError : sCls} disabled:opacity-60`}>
                            <option value="">Select plant</option>
                            {plants.filter((p) => p.status === "ACTIVE" || p.status === "active").map((plant) => <option key={plant.id} value={plant.id}>{plant.name} ({plant.code})</option>)}
                          </select>
                        </ErrorFieldWrapper>
                        <ErrorText message={errors.plantId || validationErrors.plantId} />
                        {plantLocked && <p className="mt-0.5 text-[9px] text-muted-foreground">Plant is locked because this department has linked production lines/resource groups/resources.</p>}
                      </div>
                      <div>
                        <FieldLabel required>Name</FieldLabel>
                        <ErrorFieldWrapper error={errors.name || validationErrors.name}>
                          <input ref={(el) => { if (form.plantId && !form.name) firstMissingRef.current = el; }} type="text" value={g("name") as string} onChange={(e) => { s("name", e.target.value); if (e.target.value && !form.code) window.setTimeout(() => firstMissingRef.current?.focus(), 0); }} placeholder="e.g. Assembly, Final Welding"
                            className={errors.name || validationErrors.name ? iClsError : iCls} />
                        </ErrorFieldWrapper>
                        <ErrorText message={errors.name || validationErrors.name} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <FieldLabel required>Code</FieldLabel>
                          <ErrorFieldWrapper error={errors.code || validationErrors.code}>
                            <input ref={(el) => { if (form.plantId && form.name && !form.code) firstMissingRef.current = el; }} type="text" value={g("code") as string} onChange={(e) => { s("code", e.target.value); }} placeholder="e.g. ASSY, WELD"
                              className={errors.code || validationErrors.code ? iClsError : iCls} />
                          </ErrorFieldWrapper>
                          <ErrorText message={errors.code || validationErrors.code} />
                        </div>
                        <div>
                          <FieldLabel required>Status</FieldLabel>
                          <ErrorFieldWrapper error={errors.statusId || validationErrors.statusId}>
                            <select ref={(el) => { if (form.plantId && form.name && form.code && !form.statusId) firstMissingRef.current = el; }} value={g("statusId") as string} onChange={(e) => { setStatusId(e.target.value); completeStep("Complete Identity"); }}
                              className={errors.statusId || validationErrors.statusId ? sClsError : sCls}>
                              <option value="">Select status</option>
                              {statusValues.filter((value) => value.isActive).map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
                            </select>
                          </ErrorFieldWrapper>
                          <ErrorText message={errors.statusId || validationErrors.statusId} />
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Description</FieldLabel>
                        <textarea value={g("description") as string} onChange={(e) => s("description", e.target.value)} placeholder="Department purpose and scope"
                          className="h-8 min-h-[72px] max-h-[140px] w-full rounded-md border border-input/60 bg-card px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 resize-none field-sizing-content" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-px">
                      <InlineRow label="Name" value={d.name || <span className="text-muted-foreground/40 italic">—</span>} />
                      <InlineRow label="Code" value={d.code || <span className="text-muted-foreground/40 italic">—</span>} />
                      <InlineRow label="Status" value={<Badge label={d.status || "active"} variant={d.status === "active" ? "active" : "inactive"} />} />
                      <div className="grid gap-2" style={{ gridTemplateColumns: "100px 1fr" }}>
                        <span className="truncate text-[10px] font-medium text-muted-foreground">Description</span>
                        <div className="min-w-0">
                          {descriptionText ? (
                            <>
                              <p className={`text-[13px] text-foreground/80 leading-relaxed ${descriptionExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>{descriptionText}</p>
                              {descriptionNeedsToggle && <button type="button" onClick={() => setDescriptionExpanded((value) => !value)} className="mt-0.5 text-[11px] font-medium text-primary hover:text-accent transition-colors">{descriptionExpanded ? "Show less" : "Show more"}</button>}
                            </>
                          ) : (ev("description", d.description))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Management & Ownership */}
              <div ref={ownershipRef} className="scroll-mt-2">
                <SectionHeader title="Management & Ownership" alert={!ownershipDefined} />
                {(isEditing || isNew) ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <FieldLabel>Manager</FieldLabel>
                        <ErrorFieldWrapper error={errors.manager}>
                          <select value={g("manager") as string} onChange={(e) => { s("manager", e.target.value); if (e.target.value) completeStep("Assign Owner"); }}
                            className={errors.manager ? sClsError : sCls}>
                            <option value="">Select manager</option>
                            {staffOptions.map((user) => <option key={user.id} value={user.id}>{user.name}{user.role ? ` (${user.role})` : ""}</option>)}
                          </select>
                        </ErrorFieldWrapper>
                        <ErrorText message={errors.manager} />
                      </div>
                      <div>
                        <FieldLabel>Supervisor</FieldLabel>
                        <ErrorFieldWrapper error={errors.supervisor}>
                          <select value={g("supervisor") as string} onChange={(e) => { s("supervisor", e.target.value); }}
                            className={errors.supervisor ? sClsError : sCls}>
                            <option value="">Select supervisor</option>
                            {staffOptions.map((user) => <option key={user.id} value={user.id}>{user.name}{user.role ? ` (${user.role})` : ""}</option>)}
                          </select>
                        </ErrorFieldWrapper>
                        <ErrorText message={errors.supervisor} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Employees</FieldLabel>
                      <div className="flex h-8 items-center rounded-md border border-input/60 bg-card px-2.5 text-[13px] font-medium text-muted-foreground">
                        {d.employeeCount ?? d.employees ?? 0}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-px">
                    <InlineRow label="Manager" value={ev("manager", managerLabel)} />
                    <InlineRow label="Supervisor" value={ev("supervisor", supervisorLabel)} />
                    <InlineRow label="Employees" value={d.employeeCount ?? d.employees ?? 0} />
                  </div>
                )}
              </div>

              {/* Resource Groups */}
              <div>
                <SectionHeader title={`Resource Groups (${groupCount})`} />
                {!groupCount ? (
                  <div className="flex min-h-14 items-center justify-between bg-muted/30 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">No resource groups linked.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <div className="grid gap-px text-[11px]">
                      <div className="grid grid-cols-[1fr_1fr_80px_80px_50px] items-center gap-2 bg-muted/50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Resource Group</span>
                        <span>Code</span>
                        <span>Resources</span>
                        <span>Status</span>
                        <span className="text-right">Action</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {resourceGroupRows.map((group: any) => (
                          <div key={group.id} className="grid grid-cols-[1fr_1fr_80px_80px_50px] items-center gap-2 px-2 py-1.5 border-b border-border/10 hover:bg-muted/30 transition-colors">
                            <span className="font-medium text-foreground">{group.name}</span>
                            <span className="text-muted-foreground">{group.code || "-"}</span>
                            <span className="text-muted-foreground">{group.resourceCount}</span>
                            <span><Badge label={group.status.toLowerCase()} variant={group.status.toLowerCase() === "active" ? "active" : "inactive"} /></span>
                            <span className="text-right"><button type="button" onClick={() => {}} className="text-info"><ExternalLink className="h-3 w-3 stroke-current" /></button></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex min-h-0 flex-col gap-4 pr-1 overflow-y-auto">
              {/* Guided Setup Flow */}
              <div>
                <SectionHeader title={`Setup Flow (Step ${currentStepIdx >= 0 ? currentStepIdx + 1 : totalSteps} of ${totalSteps})`} />
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-info rounded-full transition-all duration-500" style={{ width: `${readinessPct}%` }} />
                    </div>
                    <span className={`text-[10px] font-semibold ${readinessPct >= 100 ? "text-success" : "text-info"}`}>{readinessPct}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {steps.map((step) => {
                    const isCurrent = !step.ok && step.label === currentStepLabel;
                    return (
                      <SetupSignal key={step.label} ok={step.ok}
                        label={step.ok ? step.label : isCurrent ? `Next: ${step.label}` : step.label}
                        onClick={() => actOnGap(step)} />
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
                  {readinessPct >= 100
                    ? "All steps completed. Department is ready."
                    : currentStepLabel === "Assign Plant"
                      ? "Select Plant before linking production lines or resources."
                      : `Complete Step ${currentStepIdx >= 0 ? currentStepIdx + 1 : totalSteps} to proceed.`}
                </p>
              </div>

              {/* Production Line Usage */}
              <div ref={linesRef} className="scroll-mt-2">
                <SectionHeader title="Production Line Usage" />
                {!selectedPlantId ? (
                  <p className="text-[10px] text-muted-foreground">Select a plant to see which production lines use this department's resource groups.</p>
                ) : lineRows.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No production lines currently use resource groups from this department.</p>
                ) : (
                  <div className="overflow-hidden">
                    <div className="grid gap-px text-[11px]">
                      <div className="grid grid-cols-[1fr_1fr_80px_60px] items-center gap-2 bg-muted/50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Line</span>
                        <span>Plant</span>
                        <span>Status</span>
                        <span className="text-right">Action</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {lineRows.map((line: any) => (
                          <div key={line.id} className="grid grid-cols-[1fr_1fr_80px_60px] items-center gap-2 px-2 py-1.5 border-b border-border/10 hover:bg-muted/30 transition-colors">
                            <span className="truncate font-medium text-foreground">{line.name} <span className="text-muted-foreground">{line.code}</span></span>
                            <span className="truncate text-muted-foreground">{line.plantName || "—"}</span>
                            <span><Badge label={line.status?.toLowerCase() === "inactive" ? "inactive" : "active"} variant={line.status?.toLowerCase() === "inactive" ? "inactive" : "active"} /></span>
                            <span className="text-right"><button type="button" onClick={() => onNavigateToLine?.(line.id)} className="text-primary hover:text-accent text-[10px] font-medium">Open</button></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
