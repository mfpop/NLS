import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { AlertTriangle, CheckCircle, Component, Factory, Layers, User, Calendar, Gauge, Dumbbell, AlertCircle, Activity } from "lucide-react";
import { formatAppDate } from "@/utils/dateFormat";
import { InlineRow, Badge as SharedBadge, SectionHeader, FieldLabel, ErrorFieldWrapper, iCls, iClsError, sCls, sClsError } from "./DetailComponents";
import { ReferenceSelect } from "./ReferenceSelect";

// ─── Types ───

interface Department { id: string; name: string; plantName?: string }

interface Resource {
  id: string; code?: string; name?: string; status?: string;
  resourceTypeId?: string; shiftPattern?: string; utilization?: number;
  opStatus?: string; departmentId?: string; departmentName?: string;
  resourceGroupId?: string;
}

interface ResourceGroup {
  id: string; code?: string; name?: string; description?: string;
  status?: string; statusId?: string;
  departmentId?: string; departmentName?: string; plantName?: string;
  members?: number | string; leader?: string; supervisor?: string;
  groupTypeId?: string; groupTypeRef?: { id: string; name: string } | null;
  capabilityType?: string; shiftPatternId?: string;
  shiftPatternRef?: { id: string; name: string } | null; capacityModel?: string;
  oeeTarget?: number | null; isBottleneck?: boolean; isConstraint?: boolean;
  resourceCount?: number; resourceType?: string;
  createdAt?: string; updatedAt?: string;
}

interface ResourceGroupForm {
  name: string; code: string; description: string; statusId: string;
  groupTypeId: string; departmentId: string; leader: string; supervisor: string;
  members: string; capabilityType: string; shiftPatternId: string;
  capacityModel: string; oeeTarget: string; isBottleneck: boolean; isConstraint: boolean;
}

export interface ResourceGroupDetailViewHandle {
  save: () => Promise<boolean>;
  cancel: () => void;
  isDirty: () => boolean;
}

export interface ResourceGroupDetailViewProps {
  resourceGroupId?: string | null;
  createMode?: boolean;
  editing?: boolean;
  resourceGroup: ResourceGroup | null;
  departments: Department[];
  assignedResources: Resource[];
  onEditToggle?: (editing: boolean) => void;
  onError?: (message: string | null) => void;
  onEditStateChange?: (state: { dirty: boolean; valid: boolean; saving: boolean }) => void;
  onSaved?: () => Promise<void> | void;
  onSaveResourceGroup?: (form: ResourceGroupForm, id: string | null) => Promise<{ ok: boolean; resourceGroup?: { id: string }; errors?: Record<string, string> }>;
}

const EMPTY_FORM: ResourceGroupForm = {
  name: "", code: "", description: "", statusId: "",
  groupTypeId: "", departmentId: "", leader: "", supervisor: "",
  members: "", capabilityType: "SHARED", shiftPatternId: "",
  capacityModel: "", oeeTarget: "", isBottleneck: false, isConstraint: false,
};

const ET: Record<string, string> = {
  description: "No description", groupTypeId: "No type assigned",
  departmentId: "No department assigned", members: "Not configured",
  leader: "Not assigned", supervisor: "Not assigned",
  resourceCount: "No resources assigned", capabilityType: "Not set",
  capacityModel: "Not configured", oeeTarget: "Not set",
  shiftPatternId: "Not configured",
};

const CAPABILITY_ICONS: Record<string, string> = {
  SHARED: "Shared", DEDICATED: "Dedicated", CONSTRAINT: "Constraint",
  PACEMAKER: "Pacemaker", MANUAL: "Manual", AUTOMATED: "Automated",
};

const CAPABILITY_CLS: Record<string, string> = {
  SHARED: "bg-success/10 text-success border border-success/25",
  DEDICATED: "bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200/50 dark:border-violet-700/30",
  CONSTRAINT: "bg-danger/10 text-danger border border-danger/25",
  PACEMAKER: "bg-warning/10 text-warning border border-warning/25",
  MANUAL: "bg-muted text-muted-foreground border border-border/60",
  AUTOMATED: "bg-info/10 text-info border border-info/25",
};

// ─── Local Sub‑Components ───

function CapabilityBadge({ type }: { type?: string | null }) {
  const label = (type && CAPABILITY_ICONS[type]) ? CAPABILITY_ICONS[type] : type || "Unknown";
  const cls = CAPABILITY_CLS[type || ""] || CAPABILITY_CLS.SHARED;
  return <span className={`inline-flex items-center rounded-full px-2 py-px text-[9px] font-semibold uppercase tracking-wider ${cls}`}>{label}</span>;
}

function ValidationPill({ ok, label, onClick }: { ok: boolean; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
        ok
          ? "bg-success/8 text-success border border-success/15 cursor-default"
          : "bg-warning/10 text-warning border border-warning/25 cursor-pointer hover:bg-warning/15"
      }`}>
      {ok ? <CheckCircle className="h-3 w-3 stroke-current shrink-0" /> : <AlertTriangle className="h-3 w-3 stroke-current shrink-0" />}
      {label}
    </button>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const isActive = resource.status === "active";
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/55 px-2.5 py-1.5 hover:bg-muted/70 transition-colors">
      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? "bg-success" : "bg-muted-foreground/40"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-foreground truncate">{resource.name || "-"}</span>
          {resource.code && <span className="shrink-0 font-mono text-[8px] text-muted-foreground">{resource.code}</span>}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          {resource.opStatus && <span className="flex items-center gap-0.5"><Activity className="h-2.5 w-2.5 stroke-current" />{resource.opStatus}</span>}
          {resource.utilization != null && <span className="flex items-center gap-0.5"><Gauge className="h-2.5 w-2.5 stroke-current" />{resource.utilization}%</span>}
          {resource.shiftPattern && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5 stroke-current" />{resource.shiftPattern}</span>}
        </div>
      </div>
      <SharedBadge label={resource.status || "active"} variant={resource.status === "active" ? "active" : "inactive"} />
    </div>
  );
}

// ─── Main Component ───

export const ResourceGroupDetailView = forwardRef<ResourceGroupDetailViewHandle, ResourceGroupDetailViewProps>(
function ResourceGroupDetailView({
  resourceGroupId,
  createMode = false,
  editing = false,
  resourceGroup,
  departments,
  assignedResources,
  onEditToggle,
  onError,
  onEditStateChange,
  onSaved,
  onSaveResourceGroup,
}, ref) {
  const sel = resourceGroup;
  const isNew = createMode;
  const isEditing = editing;

  const [form, setForm] = useState<ResourceGroupForm>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<ResourceGroupForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editState, setEditState] = useState({ dirty: false, saving: false });

  const departmentOptions = departments.map((d) => ({ label: d.name, value: d.id }));

  // ── Load form ──
  useEffect(() => {
    if (createMode) {
      setForm(EMPTY_FORM);
      setInitialForm(EMPTY_FORM);
      setErrors({});
      setMutationError(null);
      return;
    }
    if (!sel) return;
    const loaded: ResourceGroupForm = {
      name: sel.name || "", code: sel.code || "", description: sel.description || "",
      statusId: sel.statusId || "", groupTypeId: sel.groupTypeId || "",
      departmentId: sel.departmentId || "", leader: sel.leader || "",
      supervisor: sel.supervisor || "", members: String(sel.members ?? ""),
      capabilityType: sel.capabilityType || "SHARED",
      shiftPatternId: sel.shiftPatternId || "", capacityModel: sel.capacityModel || "",
      oeeTarget: sel.oeeTarget != null ? String(sel.oeeTarget) : "",
      isBottleneck: !!sel.isBottleneck, isConstraint: !!sel.isConstraint,
    };
    setForm(loaded);
    setInitialForm(loaded);
    setErrors({});
    setMutationError(null);
  }, [sel, createMode]);

  // ── Dirty tracking ──
  const dirty = createMode
    ? JSON.stringify(form) !== JSON.stringify(EMPTY_FORM)
    : JSON.stringify(form) !== JSON.stringify(initialForm);

  // ── Validation ──
  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = "Required";
    if (!form.code?.trim()) errs.code = "Required";
    if (!form.departmentId) errs.departmentId = "Required";
    return errs;
  }, [form]);

  const valid = Object.keys(validationErrors).length === 0;

  useEffect(() => {
    onEditStateChange?.({ dirty, valid, saving: editState.saving });
  }, [dirty, valid, editState.saving, onEditStateChange]);

  // ── Form helpers ──
  const g = (k: keyof ResourceGroupForm) => String(form[k] ?? "");
  const su = (k: keyof ResourceGroupForm, v: any) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  // ── Imperative handle ──
  useImperativeHandle(ref, () => ({
    save: async () => {
      setMutationError(null);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        onError?.("Please fix the validation errors");
        return false;
      }
      if (!onSaveResourceGroup) { onError?.("Save handler not provided"); return false; }
      setEditState((p) => ({ ...p, saving: true }));
      try {
        const r = await onSaveResourceGroup(form, isNew ? null : resourceGroupId ?? null);
        if (r.ok) {
          await onSaved?.();
          setEditState({ dirty: false, saving: false });
          return true;
        }
        setErrors(r.errors ?? {});
        const message = r.errors?._form || "Resource group could not be saved.";
        setMutationError(message);
        onError?.(message);
        setEditState((p) => ({ ...p, saving: false }));
        return false;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown save error.";
        setMutationError(message);
        onError?.(message);
        setEditState((p) => ({ ...p, saving: false }));
        return false;
      }
    },
    cancel: () => {
      if (isNew) { setForm(EMPTY_FORM); setErrors({}); setMutationError(null); return; }
      setForm(initialForm);
      setErrors({});
      setMutationError(null);
      onEditToggle?.(false);
    },
    isDirty: () => dirty,
  }), [form, validationErrors, isNew, resourceGroupId, onError,
      onSaveResourceGroup, onSaved, onEditToggle, initialForm, dirty]);

  // ── Derived data ──
  const rg: Partial<ResourceGroup> = sel ?? {};
  const code = !isNew ? rg.code : undefined;
  const title = isNew ? "New Resource Group" : rg.name || "";
  const deptName = rg.departmentName || "";
  const plantName = rg.plantName || "";
  const typeName = rg.groupTypeRef?.name || rg.groupTypeId || "";
  const resourceCount = Number(rg.resourceCount ?? 0);
  const ev = (k: string, v: string | number | null | undefined) =>
    v !== null && v !== undefined && String(v).trim()
      ? <span className="text-foreground">{String(v)}</span>
      : <span className="text-muted-foreground/40 italic text-[11px]">{ET[k] || "-"}</span>;

  const leanValid = {
    department: isEditing || isNew ? !!form.departmentId : !!rg.departmentId,
    type: isEditing || isNew ? !!form.groupTypeId : !!rg.groupTypeId,
    resources: (isEditing || isNew ? 0 : resourceCount) > 0,
    leader: isEditing || isNew ? !!form.leader : !!rg.leader,
    capability: isEditing || isNew ? !!form.capabilityType : !!rg.capabilityType,
    shift: isEditing || isNew ? !!form.shiftPatternId : !!rg.shiftPatternId,
  };

  const schedules = new Set(assignedResources.map((r) => r.shiftPattern).filter(Boolean));
  const mixedSchedule = schedules.size > 1;

  // ── Empty state ──
  if (!isNew && !sel) {
    return (
      <div className="flex flex-1 items-center justify-center bg-card h-full">
        <div className="text-center max-w-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-entity-resource-group-bg">
            <Component className="h-5 w-5 text-entity-resource-group stroke-current" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Resource Group Details</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">Select a resource group or create a new one to manage its configuration and resources.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-card">
      {/* ── HEADER ── */}
      <div className="shrink-0 border-b border-border/40 bg-card">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-entity-resource-group-bg text-entity-resource-group ring-1 ring-entity-resource-group/20">
              <Component className="h-5 w-5 stroke-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
                {code && <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">{code}</span>}
                {isNew ? (
                  <SharedBadge label="New" variant="new" />
                ) : (
                  <SharedBadge label={rg.status || "active"} variant={rg.status === "active" ? "active" : "inactive"} />
                )}
                {(isEditing || isNew) && <SharedBadge label="Editing" variant="amber" />}
              </div>
              {!isNew && (
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                  <span className="inline-flex items-center gap-1"><Factory className="h-2.5 w-2.5 stroke-current" />{plantName || "Plant N/A"}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="inline-flex items-center gap-1"><Layers className="h-2.5 w-2.5 stroke-current" />{deptName || "No department"}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{typeName}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <CapabilityBadge type={rg.capabilityType} />
                  <span className="text-muted-foreground/30">·</span>
                  <span>{resourceCount} Res</span>
                  {rg.isBottleneck && <CapabilityBadge type="CONSTRAINT" />}
                  {rg.isConstraint && <SharedBadge label="Constraint" variant="warning" />}
                  {rg.updatedAt && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="ml-auto text-[9px] text-muted-foreground/50 whitespace-nowrap">Updated {formatAppDate(rg.updatedAt)}</span>
                    </>
                  )}
                </div>
              )}
              {isNew && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Create the resource group record; resources are added after save.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 min-h-0 overflow-hidden bg-card">
        {mutationError && (isEditing || isNew) && (
          <div className="mx-4 mt-3 rounded-md border border-danger/25 bg-danger/10 px-3 py-1.5 text-[10px] font-medium text-danger flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 stroke-current shrink-0" />
            {mutationError}
          </div>
        )}
        <div key={`detail-${isNew ? "create" : isEditing ? "edit" : "view"}`} className="mode-enter grid h-full min-h-0 grid-cols-[1fr_2fr] gap-4 p-3">
          {/* LEFT */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
            {/* Identity */}
            <div>
              <SectionHeader title="Identity" />
              {isEditing || isNew ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel required>Name</FieldLabel>
                      <ErrorFieldWrapper error={errors.name || validationErrors.name}>
                        <input type="text" value={g("name")} onChange={(e) => su("name", e.target.value)} placeholder="Name" className={errors.name || validationErrors.name ? iClsError : iCls} />
                      </ErrorFieldWrapper>
                    </div>
                    <div>
                      <FieldLabel required>Code</FieldLabel>
                      <ErrorFieldWrapper error={errors.code || validationErrors.code}>
                        <input type="text" value={g("code")} onChange={(e) => su("code", e.target.value)} placeholder="Code" className={errors.code || validationErrors.code ? iClsError : iCls} />
                      </ErrorFieldWrapper>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ReferenceSelect categoryCode="status" label="Status" value={g("statusId")} onChange={(v) => su("statusId", v)} required placeholder="Select status" error={errors.statusId} />
                    <ReferenceSelect categoryCode="resource_group_type" label="Type" value={g("groupTypeId")} onChange={(v) => su("groupTypeId", v)} placeholder="Select type" error={errors.groupTypeId} />
                  </div>
                  <div>
                    <FieldLabel required>Department</FieldLabel>
                    <ErrorFieldWrapper error={errors.departmentId || validationErrors.departmentId}>
                      <select value={g("departmentId")} onChange={(e) => su("departmentId", e.target.value)}
                        className={errors.departmentId || validationErrors.departmentId ? sClsError : sCls}>
                        <option value="">Select department</option>
                        {departmentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </ErrorFieldWrapper>
                  </div>
                </div>
              ) : (
                <div className="space-y-px">
                  <InlineRow label="Name" value={ev("", rg.name)} />
                  <InlineRow label="Code" value={ev("", rg.code)} />
                  <InlineRow label="Status" value={rg.status || "Active"} />
                  <InlineRow label="Department" value={deptName} />
                  <InlineRow label="Type" value={ev("groupTypeId", rg.groupTypeRef?.name || rg.groupTypeId)} />
                  <InlineRow label="Capability" value={<CapabilityBadge type={rg.capabilityType} />} />
                </div>
              )}
            </div>

            {/* Management */}
            <div>
              <SectionHeader title="Management" />
              {isEditing || isNew ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>Leader</FieldLabel>
                      <input type="text" value={g("leader")} onChange={(e) => su("leader", e.target.value)} placeholder="Team leader" className={iCls} />
                    </div>
                    <div>
                      <FieldLabel>Supervisor</FieldLabel>
                      <input type="text" value={g("supervisor")} onChange={(e) => su("supervisor", e.target.value)} placeholder="Supervisor" className={iCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>Members</FieldLabel>
                      <input type="number" value={g("members")} onChange={(e) => su("members", e.target.value)} placeholder="Members" className={iCls} />
                    </div>
                    <ReferenceSelect categoryCode="shift_model" label="Shift" value={g("shiftPatternId")} onChange={(v) => su("shiftPatternId", v)} placeholder="Select shift" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>Capacity Model</FieldLabel>
                      <input type="text" value={g("capacityModel")} onChange={(e) => su("capacityModel", e.target.value)} placeholder="e.g. Takt, Rate" className={iCls} />
                    </div>
                    <div>
                      <FieldLabel>OEE Target (%)</FieldLabel>
                      <input type="number" value={g("oeeTarget")} onChange={(e) => su("oeeTarget", e.target.value)} placeholder="85" className={iCls} step="0.1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={!!form.isBottleneck} onChange={(e) => su("isBottleneck", e.target.checked)} className="h-3 w-3" /> Bottleneck
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={!!form.isConstraint} onChange={(e) => su("isConstraint", e.target.checked)} className="h-3 w-3" /> Constraint
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-px">
                  <InlineRow label="Leader" value={ev("leader", rg.leader)} />
                  <InlineRow label="Supervisor" value={ev("supervisor", rg.supervisor)} />
                  <InlineRow label="Members" value={rg.members ?? 0} />
                  <InlineRow label="Shift" value={rg.shiftPatternRef?.name || ev("shiftPatternId", null)} />
                  <InlineRow label="Capacity" value={ev("capacityModel", rg.capacityModel)} />
                  <InlineRow label="OEE Target" value={rg.oeeTarget != null ? `${rg.oeeTarget}%` : ev("oeeTarget", null)} />
                  {(rg.isBottleneck || rg.isConstraint) && (
                    <div className="flex gap-1.5 pt-1">
                      {rg.isBottleneck && <SharedBadge label="Bottleneck" variant="warning" />}
                      {rg.isConstraint && <SharedBadge label="Constraint" variant="warning" />}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
            {/* Lean Setup */}
            <div>
              <SectionHeader title="Lean Setup" />
              <div className="grid grid-cols-3 gap-1.5">
                <ValidationPill ok={leanValid.department} label="Department" onClick={() => { if (!isEditing && !isNew) onEditToggle?.(true); }} />
                <ValidationPill ok={leanValid.type} label="Capability Type" onClick={() => { if (!isEditing && !isNew) onEditToggle?.(true); }} />
                <ValidationPill ok={leanValid.resources} label="Resources" onClick={() => { if (!isEditing && !isNew) onEditToggle?.(true); }} />
                <ValidationPill ok={leanValid.leader} label="Ownership" onClick={() => { if (!isEditing && !isNew) onEditToggle?.(true); }} />
                <ValidationPill ok={leanValid.capability} label="Capability" />
                <ValidationPill ok={leanValid.shift} label="Schedule" onClick={() => { if (!isEditing && !isNew) onEditToggle?.(true); }} />
              </div>
            </div>

            {/* Resources */}
            <div className="flex flex-col min-h-0 flex-1">
              <SectionHeader title={`Resources (${assignedResources.length})`} />
              {assignedResources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-md">
                  <Dumbbell className="h-5 w-5 text-muted-foreground/40 mb-1.5 stroke-current" />
                  <p className="text-[10px] text-muted-foreground mb-2">No resources assigned</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  {assignedResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              )}
            </div>

            {/* Schedule warning */}
            {mixedSchedule && (
              <div>
                <SectionHeader title="Schedule" alert />
                <div className="flex items-center gap-2 rounded-md bg-warning/10 text-warning px-2 py-1 text-[10px] font-medium">
                  <AlertTriangle className="h-3 w-3 shrink-0 stroke-current" />
                  <span>Mixed Schedule — resources have {schedules.size} different shift patterns</span>
                </div>
              </div>
            )}

            {/* Timestamps */}
            {!isNew && (
              <div className="flex items-center gap-4 text-[9px] text-muted-foreground pt-1">
                <span>Created <span className="font-medium text-foreground/70">{formatAppDate(rg.createdAt) || "-"}</span></span>
                <span>Updated <span className="font-medium text-foreground/70">{formatAppDate(rg.updatedAt) || "-"}</span></span>
                {rg.leader && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5 stroke-current" />{rg.leader}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
