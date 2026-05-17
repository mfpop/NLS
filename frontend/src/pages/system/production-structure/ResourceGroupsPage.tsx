import { useState, useEffect, useCallback } from "react";
import { theme } from "../../../styles/themeTokens";
import { AlertTriangle, CheckCircle, Search, Component, Users, User, Dumbbell, Calendar, Factory, Layers, Plus, Activity, Gauge } from "lucide-react";
import { Pagination, EntityListItem } from "./components";
import { useQuery, useMutation } from "@apollo/client/react";
import { DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { CREATE_RESOURCE_GROUP, UPDATE_RESOURCE_GROUP, DELETE_RESOURCE_GROUP } from "@/graphql/dataManagementMutations";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, type FormMode } from "./components/EntityWorkspacePage";
import { ConfirmDialog } from "./shared";
import { ReferenceSelect } from "./components/ReferenceSelect";
import { formatAppDate } from "@/utils/dateFormat";

const PER_PAGE = 10;

type EntityRef = { id: string; name: string; code?: string; isActive?: boolean };

type ListResult<T> = T[] | { items?: T[] };

interface Department { id: string; name: string; plantName?: string }

interface Resource {
  id: string; code?: string; name?: string; status?: string;
  resourceTypeId?: string; shiftPattern?: string; utilization?: number;
  opStatus?: string; departmentId?: string; departmentName?: string;
  resourceGroupId?: string;
}

interface ResourceGroup {
  id: string; code?: string; name?: string; description?: string;
  status?: string; statusId?: string; statusRef?: EntityRef | null;
  departmentId?: string; departmentName?: string; plantName?: string;
  members?: number | string; leader?: string; supervisor?: string;
  groupTypeId?: string; groupTypeRef?: EntityRef | null;
  capabilityType?: string; shiftPatternId?: string;
  shiftPatternRef?: EntityRef | null; capacityModel?: string;
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

interface MutationError { field?: string | null; code?: string; message: string }
interface ResourceGroupPayload { ok: boolean; resourceGroup?: ResourceGroup | null; errors?: MutationError[] }

interface ResourceGroupInput {
  departmentId: string; code: string; name: string; description: string;
  statusId: string; members: number; leader: string; supervisor: string;
  groupTypeId: string | null; capabilityType: string; shiftPatternId: string | null;
  capacityModel: string; oeeTarget: number | null; isBottleneck: boolean; isConstraint: boolean;
}

const CAPABILITY_ICONS: Record<string, string> = {
  SHARED: "Shared", DEDICATED: "Dedicated", CONSTRAINT: "Constraint",
  PACEMAKER: "Pacemaker", MANUAL: "Manual", AUTOMATED: "Automated",
};

const CAPABILITY_COLORS: Record<string, string> = {
  SHARED: theme.badgeActive,
  DEDICATED: theme.iconBoxViolet,
  CONSTRAINT: theme.badgeCritical,
  PACEMAKER: theme.badgeWarning,
  MANUAL: theme.chip,
  AUTOMATED: theme.badgeActive,
};

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

const ET: Record<string, string> = {
  description: "No description", groupTypeId: "No type assigned",
  departmentId: "No department assigned", members: "Not configured",
  leader: "Not assigned", supervisor: "Not assigned",
  resourceCount: "No resources assigned", capabilityType: "Not set",
  capacityModel: "Not configured", oeeTarget: "Not set",
  shiftPatternId: "Not configured",
};

function CapabilityBadge({ type }: { type?: string | null }) {
  const label = (type && CAPABILITY_ICONS[type]) ? CAPABILITY_ICONS[type] : type || "Unknown";
  const color = CAPABILITY_COLORS[type || ""] || CAPABILITY_COLORS.SHARED;
  return <span className={`inline-flex items-center rounded-full px-2 py-px text-[9px] font-semibold uppercase tracking-wider border ${color}`}>{label}</span>;
}

function ValidationPill({ ok, label, onClick }: { ok: boolean; label: string; onClick?: () => void }) {
  const colors = ok
    ? "bg-success/8 text-success border border-success/15"
    : `${theme.badgeWarning}`;
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${colors} ${onClick ? "cursor-pointer hover:bg-success/10" : "cursor-default"}`}>
      {ok ? <CheckCircle className="h-3 w-3 stroke-current shrink-0" /> : <AlertTriangle className="h-3 w-3 stroke-current shrink-0" />}
      {label}
    </button>
  );
}

function InlineRow({ label, value, icon, action }: { label: string; value: React.ReactNode; icon?: React.ReactNode; action?: { text: string; onClick: () => void; icon?: React.ReactNode } }) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "110px minmax(0,1fr) auto" }}>
      <span className={`flex items-center gap-1 text-[10px] font-medium ${theme.textMuted} truncate`}>
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </span>
      <span className={`text-[12px] font-medium ${theme.textPrimary} min-w-0 truncate`}>{value}</span>
      {action ? (
        <button type="button" onClick={action.onClick} className={`inline-flex items-center gap-1 text-[10px] font-medium ${theme.textCritical} hover:text-danger whitespace-nowrap transition-colors`}>
          {action.icon}{action.text}
        </button>
      ) : <span />}
    </div>
  );
}

function Badge({ label, variant = "default" }: { label: string; variant?: "active" | "inactive" | "new" | "default" | "rose" | "warning" }) {
  const m: Record<string, string> = {
    active: `${theme.badgeActive}`,
    inactive: `${theme.badgeInactive}`,
    rose: `${theme.badgeCritical}`,
    warning: `${theme.badgeWarning}`,
    new: `${theme.iconBoxBlue}`,
    default: `${theme.badgeInactive}`,
  };
  return <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${m[variant]}`}>{label === "active" && <span className={`inline-block h-1 w-1 rounded-full ${theme.statusActive} mr-1 animate-pulse`} />}{label}</span>;
}

function SectionCard({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border/50 ${theme.surfaceBg} p-2 shadow-sm shadow-foreground/5 ${className}`}>
      <div className="mb-1.5 flex min-h-6 items-center gap-2">
        <h3 className={`flex-1 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SecondaryActionButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex h-6 items-center gap-1 rounded border border-border/60 ${theme.surfaceBg} px-2 text-[10px] font-medium ${theme.textSecondary} transition-colors ${theme.interactiveRow} disabled:cursor-not-allowed disabled:opacity-50`}>
      {children}
    </button>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const statusDot = resource.status === "active"
    ? theme.statusActive : resource.status === "inactive"
    ? theme.statusInactive : theme.statusInactive;
  return (
    <div className={`flex items-center gap-2 rounded-lg bg-muted/55 px-2.5 py-1.5 ${theme.interactiveRow}`}>
      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-semibold ${theme.textPrimary} truncate`}>{resource.name || "-"}</span>
          {resource.code && <span className={`shrink-0 font-mono text-[8px] ${theme.textMuted}`}>{resource.code}</span>}
        </div>
        <div className={`flex items-center gap-2 text-[9px] ${theme.textMuted}`}>
          {resource.opStatus && <span className="flex items-center gap-0.5"><Activity className="h-2.5 w-2.5" />{resource.opStatus}</span>}
          {resource.utilization != null && <span className="flex items-center gap-0.5"><Gauge className="h-2.5 w-2.5" />{resource.utilization}%</span>}
          {resource.shiftPattern && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{resource.shiftPattern}</span>}
        </div>
      </div>
      <Badge label={resource.status || "active"} variant={resource.status === "active" ? "active" : "inactive"} />
    </div>
  );
}

export function ResourceGroupsPage({ embeddedInFlow = false }: { embeddedInFlow?: boolean } = {}) {
  const { search, statusFilter, setFooterContent, setToolbarVariant, showSystemMessage } = useToolbar();
  const registerActions = useRegisterActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const departmentFilterId = searchParams.get("departmentId") || "";
  const urlResourceGroupId = searchParams.get("resourceGroupId");

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<ResourceGroupForm>({
    name: "", code: "", description: "", statusId: "",
    groupTypeId: "", departmentId: "", leader: "", supervisor: "",
    members: "", capabilityType: "SHARED", shiftPatternId: "",
    capacityModel: "", oeeTarget: "", isBottleneck: false, isConstraint: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, loading, refetch: refetchRG } = useQuery<{ resourceGroups: ListResult<ResourceGroup> }>(RESOURCE_GROUPS_QUERY);
  const { data: departmentsData } = useQuery<{ departments: ListResult<Department> }>(DEPARTMENTS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: resourcesData, loading: resourcesLoading } = useQuery<{ resources: ListResult<Resource> }>(RESOURCES_QUERY, {
    variables: { resourceGroupId: selectedId || undefined },
    skip: !selectedId, fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const [createRG] = useMutation<{ createResourceGroup: ResourceGroupPayload }, { input: ResourceGroupInput }>(CREATE_RESOURCE_GROUP);
  const [updateRG] = useMutation<{ updateResourceGroup: ResourceGroupPayload }, { id: string; input: ResourceGroupInput }>(UPDATE_RESOURCE_GROUP);
  const [deleteRG] = useMutation<{ archiveResourceGroup: ResourceGroupPayload }, { id: string }>(DELETE_RESOURCE_GROUP);

  const groups = listItems(data?.resourceGroups);
  const departments = listItems(departmentsData?.departments);
  const assignedResources = listItems(resourcesData?.resources);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    if (!embeddedInFlow || !urlResourceGroupId || groups.length === 0) return;
    const exists = groups.some((group) => group.id === urlResourceGroupId);
    if (!exists) return;
    setSelectedId(urlResourceGroupId);
    setMode("view");
  }, [embeddedInFlow, urlResourceGroupId, groups]);

  const filtered = groups.filter((g) => !departmentFilterId || g.departmentId === departmentFilterId)
    .filter((g) => statusFilter === "all" || g.status === statusFilter)
    .filter((g) => !search || (g.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? groups.find((g) => g.id === selectedId) ?? null : null;
  const departmentOptions = departments.map((d) => ({ label: d.name, value: d.id }));

  const clearForm = useCallback(() => {
    setForm({
      name: "", code: "", description: "", statusId: "",
      groupTypeId: "", departmentId: "", leader: "", supervisor: "",
      members: "", capabilityType: "SHARED", shiftPatternId: "",
      capacityModel: "", oeeTarget: "", isBottleneck: false, isConstraint: false,
    });
    setErrors({}); setMutationError(null);
  }, []);

  const loadForm = useCallback((g: ResourceGroup) => {
    setForm({
      name: g.name || "", code: g.code || "", description: g.description || "",
      statusId: g.statusId || "", groupTypeId: g.groupTypeId || "",
      departmentId: g.departmentId || "", leader: g.leader || "",
      supervisor: g.supervisor || "", members: String(g.members ?? ""),
      capabilityType: g.capabilityType || "SHARED",
      shiftPatternId: g.shiftPatternId || "", capacityModel: g.capacityModel || "",
      oeeTarget: g.oeeTarget != null ? String(g.oeeTarget) : "",
      isBottleneck: !!g.isBottleneck, isConstraint: !!g.isConstraint,
    });
    setErrors({}); setMutationError(null);
  }, []);

  const hNew = useCallback(() => { clearForm(); setSelectedId(null); setMode("create"); }, [clearForm]);
  const hEdit = useCallback(() => { if (sel) { loadForm(sel); setMode("edit"); } }, [sel, loadForm]);
  const hCancel = useCallback(() => { if (sel) { loadForm(sel); setMode("view"); } else { clearForm(); setMode("view"); } }, [sel, loadForm, clearForm]);

  const hSave = useCallback(async () => {
    setMutationError(null);
    const errs: Record<string, string> = {};
    if (!form.name?.trim()) errs.name = "Required";
    if (!form.code?.trim()) errs.code = "Required";
    if (!form.departmentId) errs.departmentId = "Required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs); showSystemMessage("Please fix the validation errors", "error"); return;
    }
    const input: ResourceGroupInput = {
      departmentId: form.departmentId, code: form.code.trim(), name: form.name.trim(),
      description: form.description || "", statusId: form.statusId,
      members: Number(form.members) || 0, leader: form.leader || "",
      supervisor: form.supervisor || "", groupTypeId: form.groupTypeId || null,
      capabilityType: form.capabilityType || "SHARED",
      shiftPatternId: form.shiftPatternId || null,
      capacityModel: form.capacityModel || "",
      oeeTarget: form.oeeTarget ? Number(form.oeeTarget) : null,
      isBottleneck: form.isBottleneck, isConstraint: form.isConstraint,
    };
    let payload: ResourceGroupPayload | undefined;
    if (mode === "edit" && selectedId) {
      const result = await updateRG({ variables: { id: selectedId, input } });
      payload = result.data?.updateResourceGroup;
    } else {
      const result = await createRG({ variables: { input } });
      payload = result.data?.createResourceGroup;
    }
    if (!payload?.ok) {
      const nextErrors: Record<string, string> = {};
      for (const err of payload?.errors ?? []) { if (err.field) nextErrors[err.field] = err.message; }
      setErrors(nextErrors);
      const message = payload?.errors?.[0]?.message || "Resource group could not be saved.";
      setMutationError(message); showSystemMessage(message, "error"); return;
    }
    if (payload.resourceGroup?.id) setSelectedId(payload.resourceGroup.id);
    await refetchRG(); setMode("view"); showSystemMessage("Resource group saved", "success");
  }, [form, mode, selectedId, createRG, updateRG, refetchRG, showSystemMessage]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setMutationError(null);
    const result = await deleteRG({ variables: { id: confirmDelete } });
    const payload = result.data?.archiveResourceGroup;
    if (!payload?.ok) {
      const message = payload?.errors?.[0]?.message || "Resource group could not be archived.";
      setMutationError(message); showSystemMessage(message, "error"); setConfirmDelete(null); return;
    }
    setSelectedId(null); await refetchRG(); setConfirmDelete(null);
    showSystemMessage("Resource group archived", "success");
  }, [confirmDelete, deleteRG, refetchRG, showSystemMessage]);

  useEffect(() => {
    setToolbarVariant("splitListDetail");
    if (mode === "edit" || mode === "create") {
      registerActions({ onSave: hSave, onCancel: hCancel });
    } else {
      registerActions({
        onAdd: hNew, onEdit: sel ? hEdit : undefined,
        onDelete: sel ? () => setConfirmDelete(sel.id) : undefined,
        onRefresh: () => refetchRG(), hasSelected: !!sel,
      });
    }
    setFooterContent(`${filtered.length} RG${filtered.length !== 1 ? "s" : ""}`);
  }, [mode, sel, filtered.length, hSave, hCancel, hNew, hEdit, registerActions, refetchRG, setToolbarVariant]);

  const g = (k: keyof ResourceGroupForm) => String(form[k] ?? "");
  const s = (k: keyof ResourceGroupForm, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const isForm = mode === "edit" || mode === "create";
  const ev = (k: string, v: string | number | null | undefined) =>
    v !== null && v !== undefined && String(v).trim()
      ? <span className={`${theme.textPrimary}`}>{String(v)}</span>
      : <span className={`${theme.textMuted} italic text-[11px]`}>{ET[k] || "-"}</span>;
  const mkAct = (msg: string, icon?: React.ReactNode) => ({ text: msg, icon, onClick: () => { if (!isForm) hEdit(); } });

  const iCls = `h-7 w-full rounded-md ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} transition-all ${theme.focusRingCritical}`;
  const sCls = `h-7 w-full rounded-md ${theme.input} px-2 text-[11px] outline-none ${theme.textPrimary} transition-all ${theme.focusRingCritical}`;

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className={`flex flex-1 items-center justify-center ${theme.page} h-full`}>
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-entity-resource-group-bg">
              <Component className="h-5 w-5 text-entity-resource-group stroke-current" />
            </div>
            <h3 className={`text-sm font-semibold ${theme.textPrimary} mb-1`}>Resource Group Details</h3>
            <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>Select a resource group or create a new one to manage its configuration and resources.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Resource Group" : sel!.name;
    const code = mode !== "create" ? sel!.code : undefined;
    const rg: Partial<ResourceGroup> = sel ?? {};
    const deptName = rg.departmentName || "";
    const plantName = rg.plantName || "";
    const typeName = rg.groupTypeRef?.name || rg.groupTypeId || "";
    const resourceCount = Number(rg.resourceCount ?? 0);

    const leanValid = {
      department: !!rg.departmentId,
      type: !!rg.groupTypeId,
      resources: resourceCount > 0,
      leader: !!rg.leader,
      capability: !!rg.capabilityType,
      shift: !!rg.shiftPatternId,
    };

    const schedules = new Set(assignedResources.map((r) => r.shiftPattern).filter(Boolean));
    const mixedSchedule = schedules.size > 1;

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${theme.surfaceBg}`}>
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/50">
          <div className="flex items-stretch gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-entity-resource-group-bg text-entity-resource-group shadow-sm">
              <Component className="h-4 w-4 stroke-current" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className={`truncate text-[16px] font-bold leading-5 ${theme.textPrimary}`}>{title}</h2>
                {code && <span className={`shrink-0 rounded px-1.5 py-px font-mono text-[9px] ${theme.codeBadge}`}>{code}</span>}
              </div>
              <div className={`mt-1 flex flex-wrap items-center gap-1.5 text-[10px] ${theme.textMuted}`}>
                <span className="flex items-center gap-0.5"><Factory className="h-2.5 w-2.5 stroke-current" />{plantName || "Plant N/A"}</span>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-0.5"><Layers className="h-2.5 w-2.5 stroke-current" />{deptName || "No department"}</span>
                <span className="text-muted-foreground">·</span>
                <span>{typeName}</span>
                <span className="text-muted-foreground">·</span>
                <CapabilityBadge type={rg.capabilityType} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`rounded ${theme.codeBadge} px-1.5 py-0.5 text-[9px] font-medium`}>{resourceCount} Res</span>
              {rg.isBottleneck && <CapabilityBadge type="CONSTRAINT" />}
              {rg.isConstraint && <Badge label="Constraint" variant="warning" />}
              <Badge label={rg.status || "active"} variant={rg.status === "active" ? "active" : "inactive"} />
              {isForm && <Badge label="Editing" variant="rose" />}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {mutationError && mode !== "view" && (
            <div className="shrink-0 px-4 pt-2">
              <p className={`text-[10px] font-medium ${theme.textCritical}`}>{mutationError}</p>
            </div>
          )}

          <div className="flex-1 flex min-h-0 overflow-hidden p-3 gap-3">
            {/* ── LEFT COLUMN ── */}
            <div className="flex flex-col min-h-0 w-1/3 gap-2 overflow-y-auto">
              <SectionCard title="Identity">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div><input type="text" value={g("name")} onChange={(e) => s("name", e.target.value)} placeholder="Name *" className={iCls} />{errors.name && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.name}</p>}</div>
                      <div><input type="text" value={g("code")} onChange={(e) => s("code", e.target.value)} placeholder="Code *" className={iCls} />{errors.code && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.code}</p>}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <ReferenceSelect categoryCode="status" label="Status" value={g("statusId")} onChange={(v) => s("statusId", v)} required placeholder="Select status" error={errors.statusId} />
                      <ReferenceSelect categoryCode="resource_group_type" label="Type" value={g("groupTypeId")} onChange={(v) => s("groupTypeId", v)} required placeholder="Select type" error={errors.groupTypeId} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold ${theme.textSecondary} mb-1`}>Department<span className={`ml-0.5 ${theme.textCritical}`}>*</span></label>
                      <select value={g("departmentId")} onChange={(e) => s("departmentId", e.target.value)} className={sCls}>
                        <option value="">Select department</option>
                        {departmentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {errors.departmentId && <p className={`text-[9px] ${theme.textCritical} mt-0.5`}>{errors.departmentId}</p>}
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      <InlineRow label="Name" value={rg.name} />
                      <InlineRow label="Code" value={rg.code} />
                      <InlineRow label="Status" value={rg.statusRef?.name || rg.status || "Active"} />
                      <InlineRow label="Department" value={deptName} icon={<Layers className="h-2.5 w-2.5" />} />
                      <InlineRow label="Type" value={ev("groupTypeId", rg.groupTypeRef?.name || rg.groupTypeId)} />
                      <InlineRow label="Capability" value={<CapabilityBadge type={rg.capabilityType} />} />
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Management">
                {isForm ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div><input type="text" value={g("leader")} onChange={(e) => s("leader", e.target.value)} placeholder="Team leader" className={iCls} /></div>
                      <div><input type="text" value={g("supervisor")} onChange={(e) => s("supervisor", e.target.value)} placeholder="Supervisor" className={iCls} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div><input type="number" value={g("members")} onChange={(e) => s("members", e.target.value)} placeholder="Members" className={iCls} /></div>
                      <ReferenceSelect categoryCode="shift_model" label="Shift" value={g("shiftPatternId")} onChange={(v) => s("shiftPatternId", v)} placeholder="Select shift" />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>Capacity Model</label>
                        <input type="text" value={g("capacityModel")} onChange={(e) => s("capacityModel", e.target.value)} placeholder="e.g. Takt, Rate" className={iCls} />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${theme.textSecondary} mb-0.5`}>OEE Target (%)</label>
                        <input type="number" value={g("oeeTarget")} onChange={(e) => s("oeeTarget", e.target.value)} placeholder="85" className={iCls} step="0.1" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className={`flex items-center gap-1.5 text-[10px] ${theme.textSecondary}`}>
                        <input type="checkbox" checked={!!form.isBottleneck} onChange={(e) => s("isBottleneck", e.target.checked)} className="h-3 w-3" /> Bottleneck
                      </label>
                      <label className={`flex items-center gap-1.5 text-[10px] ${theme.textSecondary}`}>
                        <input type="checkbox" checked={!!form.isConstraint} onChange={(e) => s("isConstraint", e.target.checked)} className="h-3 w-3" /> Constraint
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-2 ${theme.subCard}`}>
                    <div className="space-y-px">
                      <InlineRow label="Leader" value={ev("leader", rg.leader)} icon={<User className="h-2.5 w-2.5" />} action={!rg.leader ? mkAct("Assign", <User className="h-2.5 w-2.5" />) : undefined} />
                      <InlineRow label="Supervisor" value={ev("supervisor", rg.supervisor)} icon={<User className="h-2.5 w-2.5" />} />
                      <InlineRow label="Members" value={rg.members ?? 0} icon={<Users className="h-2.5 w-2.5" />} />
                      <InlineRow label="Shift" value={rg.shiftPatternRef?.name || ev("shiftPatternId", null)} icon={<Calendar className="h-2.5 w-2.5" />} />
                      <InlineRow label="Capacity" value={ev("capacityModel", rg.capacityModel)} icon={<Gauge className="h-2.5 w-2.5" />} />
                      <InlineRow label="OEE Target" value={rg.oeeTarget != null ? `${rg.oeeTarget}%` : ev("oeeTarget", null)} />
                      <div className="flex gap-1.5 pt-1">
                        {rg.isBottleneck && <Badge label="Bottleneck" variant="warning" />}
                        {rg.isConstraint && <Badge label="Constraint" variant="rose" />}
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Used In Production Flows">
                <div className={`rounded-lg p-2 ${theme.subCard}`}>
                  <p className={`text-[10px] ${theme.textMuted}`}>Referenced by routing steps across production lines.</p>
                  <p className={`mt-1 text-[10px] ${theme.textMuted}`}>Open routing editor to view full step assignments.</p>
                </div>
              </SectionCard>

              <SectionCard title="Capacity">
                <div className={`rounded-lg p-2 text-[10px] ${theme.textMuted} space-y-1 ${theme.subCard}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${theme.textSecondary} w-24`}>Model:</span>
                    <span>{rg.capacityModel || "Not configured"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${theme.textSecondary} w-24`}>OEE Target:</span>
                    <span>{rg.oeeTarget != null ? `${rg.oeeTarget}%` : "Not set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${theme.textSecondary} w-24`}>Resources:</span>
                    <span>{resourceCount} assigned</span>
                  </div>
                </div>
              </SectionCard>

              {mixedSchedule && (
                <SectionCard title="Schedule">
                  <div className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] ${theme.badgeWarning}`}>
                    <AlertTriangle className="h-3 w-3 shrink-0 stroke-current" />
                    <span>Mixed Schedule — resources have {schedules.size} different shift patterns</span>
                  </div>
                </SectionCard>
              )}
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="flex flex-col min-h-0 flex-1 gap-2">
              <SectionCard title="Lean Setup">
                <div className={`rounded-lg p-2 ${theme.subCard}`}>
                  <div className="grid grid-cols-3 gap-1.5">
                    <ValidationPill ok={leanValid.department} label="Department" onClick={() => { if (!isForm) hEdit(); }} />
                    <ValidationPill ok={leanValid.type} label="Capability Type" onClick={() => { if (!isForm) hEdit(); }} />
                    <ValidationPill ok={leanValid.resources} label="Resources" onClick={() => { if (!isForm) hEdit(); }} />
                    <ValidationPill ok={leanValid.leader} label="Ownership" onClick={() => { if (!isForm) hEdit(); }} />
                    <ValidationPill ok={leanValid.capability} label="Capability" />
                    <ValidationPill ok={leanValid.shift} label="Schedule" onClick={() => { if (!isForm) hEdit(); }} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title={`Resources (${assignedResources.length})`} className="flex-1 flex flex-col min-h-0"
                action={
                  <SecondaryActionButton onClick={() => navigate("/system/production-structure/components/resource")}>
                    <Dumbbell className="h-3 w-3 stroke-current" /> Manage
                  </SecondaryActionButton>
                }>
                {resourcesLoading ? (
                  <div className={`flex items-center justify-center py-8 text-xs ${theme.textMuted}`}>
                    <div className={`h-2 w-2 rounded-full ${theme.iconAccent} animate-bounce mr-2`} />Loading...
                  </div>
                ) : assignedResources.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-8 text-center rounded-lg ${theme.subCard}`}>
                    <Dumbbell className={`h-5 w-5 ${theme.icon} mb-1.5 stroke-current`} />
                    <p className={`text-[10px] ${theme.textMuted} mb-2`}>No resources assigned</p>
                    <SecondaryActionButton onClick={() => navigate("/system/production-structure/components/resource")}>
                      <Plus className="h-3 w-3 stroke-current" /> Add Resources
                    </SecondaryActionButton>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                    {assignedResources.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>

          <div className={`shrink-0 border-t border-border/50 px-4 py-1.5 flex items-center gap-4 text-[9px] ${theme.textMuted}`}>
            <span>Created <span className={`font-medium ${theme.textSecondary}`}>{formatAppDate(rg.createdAt) || "-"}</span></span>
            <span>Updated <span className={`font-medium ${theme.textSecondary}`}>{formatAppDate(rg.updatedAt) || "-"}</span></span>
            {rg.leader && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5 stroke-current" />{rg.leader}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Archive resource group?" message="This action cannot be undone." onConfirm={hDelete} />
      )}
      <EntityWorkspacePage
        hideList={embeddedInFlow}
        toolbar={null}
        list={
          <>
            <div className="shrink-0 border-b border-border/50 flex items-center p-3 bg-muted">
              <Search className={`h-3 w-3 ${theme.icon} stroke-current mr-2 shrink-0`} />
              <span className={`text-[11px] font-medium ${theme.textMuted}`}>Resource Groups</span>
              <span className={`ml-auto text-[9px] ${theme.textMuted} font-mono`}>{filtered.length}</span>
            </div>
            <div className={`flex-1 overflow-y-auto ${theme.surfaceBg} pl-2`}>
              {loading && groups.length === 0 ? (
                <div className={`flex items-center justify-center h-24 text-xs ${theme.textMuted}`}><div className={`h-2 w-2 rounded-full ${theme.iconAccent} animate-bounce mr-2`} />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Component className={`h-4 w-4 ${theme.icon} mb-1.5 stroke-current`} />
                  <p className={`text-xs ${theme.textMuted}`}>No resource groups</p>
                </div>
              ) : (
                <div>
                  {paginated.map((g) => (
                    <EntityListItem key={g.id}
                      name={g.name || ""} code={g.code}
                      meta={g.departmentName || "Department required"}
                      icon={<Component className="h-3.5 w-3.5 stroke-current" />}
                      selected={selectedId === g.id}
                      status={g.status}
                      onClick={() => { setSelectedId(g.id); if (mode === "create") { clearForm(); setMode("view"); } }}
                      entityType="resourceGroup" />
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 flex h-7 items-center border-t border-border/50 bg-muted px-3">
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
