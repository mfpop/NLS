import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle, Component, Layers, Search, Users, User, Dumbbell, Plus } from "lucide-react";
import { Pagination } from "./components";
import { useQuery, useMutation } from "@apollo/client/react";
import { DEPARTMENTS_QUERY, RESOURCE_GROUPS_QUERY, RESOURCES_QUERY } from "@/graphql/manufacturingQueries";
import { CREATE_RESOURCE_GROUP, UPDATE_RESOURCE_GROUP, DELETE_RESOURCE_GROUP } from "@/graphql/dataManagementMutations";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToolbar, useRegisterActions } from "./components/ToolbarContext";
import { EntityWorkspacePage, DetailSection, type FormMode } from "./components/EntityWorkspacePage";
import { ConfirmDialog } from "./shared";
import { ReferenceSelect } from "./components/ReferenceSelect";
import { formatAppDate } from "@/utils/dateFormat";

const PER_PAGE = 10;

type EntityRef = {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
};

type ListResult<T> = T[] | { items?: T[] };

interface Department {
  id: string;
  name: string;
  plantName?: string;
}

interface Resource {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  resourceTypeId?: string;
  shiftPattern?: string;
}

interface ResourceGroup {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  status?: string;
  statusId?: string;
  statusRef?: EntityRef | null;
  departmentId?: string;
  departmentName?: string;
  plantName?: string;
  members?: number | string;
  leader?: string;
  groupTypeId?: string;
  groupTypeRef?: EntityRef | null;
  resourceCount?: number;
  resourceType?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ResourceGroupForm {
  name: string;
  code: string;
  description: string;
  statusId: string;
  groupTypeId: string;
  departmentId: string;
  leader: string;
  members: string;
}

interface MutationError {
  field?: string | null;
  code?: string;
  message: string;
}

interface ResourceGroupPayload {
  ok: boolean;
  resourceGroup?: ResourceGroup | null;
  errors?: MutationError[];
}

interface ResourceGroupInput {
  departmentId: string;
  code: string;
  name: string;
  description: string;
  statusId: string;
  members: number;
  leader: string;
  groupTypeId: string | null;
}

function listItems<T>(value: ListResult<T> | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}

const ET: Record<string, string> = {
  description: "No description",
  groupTypeId: "No type assigned",
  departmentId: "No department assigned",
  members: "Not configured",
  leader: "Not assigned",
  resourceCount: "No resources assigned",
  defaultCalendar: "No calendar assigned",
  shiftModel: "Not configured",
  weekStartDay: "Not configured",
  timezone: "Department default",
  capacityBasis: "Not configured",
  uom: "Not configured",
  standardCapacity: "Not set",
  effectiveFrom: "Not configured",
  effectiveTo: "Not configured",
  bottleneck: "No bottleneck assigned",
  isConstraint: "No",
};

function InlineRow({ label, value, icon, action }: { label: string; value: React.ReactNode; icon?: React.ReactNode; action?: { text: string; onClick: () => void; icon?: React.ReactNode } }) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "120px minmax(0,1fr) auto" }}>
      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </span>
      <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200 min-w-0 truncate">{value}</span>
      {action ? (
        <button type="button" onClick={action.onClick} className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 whitespace-nowrap text-left transition-colors">
          {action.icon}
          {action.text}
        </button>
      ) : <span />}
    </div>
  );
}

function Badge({ label, variant = "default" }: { label: string; variant?: "active" | "inactive" | "new" | "default" | "rose" | "warning" }) {
  const m: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
    inactive: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20",
    warning: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20",
    new: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
    default: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
  };
  return <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${m[variant]}`}>{label === "active" && <span className="inline-block h-1 w-1 rounded-full bg-emerald-500 mr-1 animate-pulse" />}{label}</span>;
}

function SetupSignal({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${
      ok
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
    }`}>
      {ok ? <CheckCircle className="h-3 w-3 stroke-current" /> : <AlertTriangle className="h-3 w-3 stroke-current" />}
      {label}
    </span>
  );
}

export function ResourceGroupsPage() {
  const { search, statusFilter, setFooterContent, setToolbarVariant } = useToolbar();
  const registerActions = useRegisterActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const departmentFilterId = searchParams.get("departmentId") || "";

  const [mode, setMode] = useState<FormMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<ResourceGroupForm>({
    name: "",
    code: "",
    description: "",
    statusId: "",
    groupTypeId: "",
    departmentId: "",
    leader: "",
    members: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, loading, refetch: refetchRG } = useQuery<{ resourceGroups: ListResult<ResourceGroup> }>(RESOURCE_GROUPS_QUERY);
  const { data: departmentsData } = useQuery<{ departments: ListResult<Department> }>(DEPARTMENTS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: resourcesData, loading: resourcesLoading } = useQuery<{ resources: ListResult<Resource> }>(RESOURCES_QUERY, {
    variables: { resourceGroupId: selectedId || undefined },
    skip: !selectedId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [createRG] = useMutation<{ createResourceGroup: ResourceGroupPayload }, { input: ResourceGroupInput }>(CREATE_RESOURCE_GROUP);
  const [updateRG] = useMutation<{ updateResourceGroup: ResourceGroupPayload }, { id: string; input: ResourceGroupInput }>(UPDATE_RESOURCE_GROUP);
  const [deleteRG] = useMutation<{ archiveResourceGroup: ResourceGroupPayload }, { id: string }>(DELETE_RESOURCE_GROUP);

  const groups = listItems(data?.resourceGroups);
  const departments = listItems(departmentsData?.departments);
  const assignedResources = listItems(resourcesData?.resources);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = groups.filter((g) => !departmentFilterId || g.departmentId === departmentFilterId)
    .filter((g) => statusFilter === "all" || g.status === statusFilter)
    .filter((g) => !search || (g.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = selectedId ? groups.find((g) => g.id === selectedId) ?? null : null;

  const departmentOptions = departments.map((d) => ({ label: d.name, value: d.id }));

  const clearForm = useCallback(() => {
    setForm({
      name: "",
      code: "",
      description: "",
      statusId: "",
      groupTypeId: "",
      departmentId: "",
      leader: "",
      members: "",
    });
    setErrors({});
    setMutationError(null);
  }, []);

  const loadForm = useCallback((g: ResourceGroup) => {
    setForm({
      name: g.name || "",
      code: g.code || "",
      description: g.description || "",
      statusId: g.statusId || "",
      groupTypeId: g.groupTypeId || "",
      departmentId: g.departmentId || "",
      leader: g.leader || "", members: String(g.members ?? ""),
    });
    setErrors({});
    setMutationError(null);
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
    if (!form.groupTypeId?.trim()) errs.groupTypeId = "Required";
    if (!form.statusId?.trim()) errs.statusId = "Required";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const input = {
      departmentId: form.departmentId,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description || "",
      statusId: form.statusId,
      members: Number(form.members) || 0,
      leader: form.leader || "",
      groupTypeId: form.groupTypeId || null,
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
      for (const err of payload?.errors ?? []) {
        if (err.field) nextErrors[err.field] = err.message;
      }
      setErrors(nextErrors);
      setMutationError(payload?.errors?.[0]?.message || "Resource group could not be saved.");
      return;
    }
    if (payload.resourceGroup?.id) setSelectedId(payload.resourceGroup.id);
    await refetchRG();
    setMode("view");
  }, [form, mode, selectedId, createRG, updateRG, refetchRG]);

  const hDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setMutationError(null);
    const result = await deleteRG({ variables: { id: confirmDelete } });
    const payload = result.data?.archiveResourceGroup;
    if (!payload?.ok) {
      setMutationError(payload?.errors?.[0]?.message || "Resource group could not be archived.");
      setConfirmDelete(null);
      return;
    }
    setSelectedId(null); await refetchRG(); setConfirmDelete(null);
  }, [confirmDelete, deleteRG, refetchRG]);

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

  const g = (k: keyof ResourceGroupForm) => form[k] ?? "";
  const s = (k: keyof ResourceGroupForm, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const isForm = mode === "edit" || mode === "create";
  const ev = (k: string, v: string | number | null | undefined) =>
    v !== null && v !== undefined && String(v).trim()
      ? <span className="text-slate-800 dark:text-slate-200">{String(v)}</span>
      : <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">{ET[k] || "-"}</span>;
  const mkAct = (msg: string, icon?: React.ReactNode) => ({ text: msg, icon, onClick: () => { if (!isForm) hEdit(); } });

  const iCls = "h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] outline-none text-slate-700 placeholder-slate-400 transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-rose-500 dark:focus:ring-rose-500/20";
  const sCls = "h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] outline-none text-slate-700 transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-rose-500 dark:focus:ring-rose-500/20";

  const renderDetail = () => {
    if (mode !== "create" && !sel) {
      return (
        <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-900 h-full">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
              <Component className="h-5 w-5 text-rose-400 dark:text-rose-300 stroke-current" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Resource Group Details</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">Select a resource group or create a new one to manage its configuration and resources.</p>
          </div>
        </div>
      );
    }

    const title = mode === "create" ? "New Resource Group" : sel!.name;
    const code = mode !== "create" ? sel!.code : undefined;
    const rg: Partial<ResourceGroup> = sel ?? {};
    const deptName = rg.departmentName || "";
    const typeName = rg.groupTypeRef?.name || (rg.groupTypeId ? rg.groupTypeId : ET.groupTypeId);
    const statusName = rg.statusRef?.name || (rg.status === "active" ? "Active" : "Inactive");
    const membersCount = Number(rg.members ?? 0);
    const resourceCount = Number(rg.resourceCount ?? 0);
    const configType = rg.groupTypeId ? "Configured" : "Missing";
    const configDept = rg.departmentId ? "Configured" : "Missing";
    const configResources = resourceCount > 0 ? "Configured" : "Missing";
    const selectedDepartment = departments.find((d) => d.id === (isForm ? form.departmentId : rg.departmentId));
    const hierarchyPlant = rg.plantName || selectedDepartment?.plantName || "Resolved through department";
    const persistedMasterFields = mode === "create"
      ? "Create the capability record first. Resource assignment and schedule/capacity configuration are managed in their dedicated workflows."
      : "This form saves identity, department, type, leader, and member count. Resource assignment and schedule/capacity defaults are managed in their dedicated workflows.";

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-sm">
              <Component className="h-4 w-4 stroke-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h2>
                {code && <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 px-1 py-px rounded text-slate-400 dark:text-slate-500">{code}</span>}
                {isForm && <Badge label="Editing" variant="rose" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                <span><Layers className="h-2.5 w-2.5 inline stroke-current mr-0.5" />{deptName || "No department"}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{typeName}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{statusName}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{resourceCount} Res</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{membersCount} Members</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px]">
                <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider">Master data readiness</span>
                <Badge label={configType} variant={configType === "Configured" ? "active" : "inactive"} />
                <Badge label={configDept} variant={configDept === "Configured" ? "active" : "inactive"} />
                <Badge label={configResources} variant={configResources === "Configured" ? "active" : "warning"} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="p-3 pb-0 flex flex-col flex-1 min-h-0">
            {mutationError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {mutationError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
              {/* LEFT */}
              <div className="flex flex-col min-h-0" style={{ gap: 8 }}>
                <div className="shrink-0">
                  <DetailSection title="Identity">
                    {isForm ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <input type="text" value={g("name")} onChange={(e) => s("name", e.target.value)} placeholder="Name *" className={iCls} />
                            {errors.name && <p className="text-[9px] text-red-500 mt-0.5">{errors.name}</p>}
                          </div>
                          <div>
                            <input type="text" value={g("code")} onChange={(e) => s("code", e.target.value)} placeholder="Code *" className={iCls} />
                            {errors.code && <p className="text-[9px] text-red-500 mt-0.5">{errors.code}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <ReferenceSelect categoryCode="status" label="Status" value={g("statusId")} onChange={(v) => s("statusId", v)} required placeholder="Select status" error={errors.statusId} />
                          <ReferenceSelect categoryCode="resource_group_type" label="Type" value={g("groupTypeId")} onChange={(v) => s("groupTypeId", v)} required placeholder="Select type" error={errors.groupTypeId} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Department<span className="ml-0.5 text-red-500">*</span></label>
                          <select value={g("departmentId")} onChange={(e) => s("departmentId", e.target.value)} className={sCls}>
                            <option value="">Select department</option>
                            {departmentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          {errors.departmentId && <p className="text-[9px] text-red-500 mt-0.5">{errors.departmentId}</p>}
                        </div>
                        <textarea
                          value={g("description")}
                          onChange={(e) => s("description", e.target.value)}
                          placeholder="Description"
                          rows={2}
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none resize-none transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        />
                        <p className="rounded-md bg-slate-50 px-2 py-1 text-[10px] leading-4 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                          {persistedMasterFields}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2">
                        <div className="space-y-px">
                          <InlineRow label="Name" value={rg.name} />
                          <InlineRow label="Code" value={rg.code} />
                          <InlineRow label="Status" value={rg.statusRef?.name || rg.status || "Active"} />
                          <InlineRow label="Department" value={deptName || ev("departmentId", null)} action={!deptName ? mkAct("Assign", <Plus className="h-2.5 w-2.5" />) : undefined} />
                          <InlineRow label="Type" value={ev("groupTypeId", rg.groupTypeRef?.name || rg.groupTypeId)} action={!rg.groupTypeId ? mkAct("Assign", <Plus className="h-2.5 w-2.5" />) : undefined} />
                          <InlineRow label="Description" value={rg.description?.trim() ? rg.description : <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">No description</span>} action={!rg.description?.trim() ? mkAct("Add", <Plus className="h-2.5 w-2.5" />) : undefined} />
                        </div>
                      </div>
                    )}
                  </DetailSection>
                </div>

                <div className="shrink-0">
                  <DetailSection title="Management">
                    {isForm ? (
                      <div className="space-y-1.5">
                        <input type="text" value={g("leader")} onChange={(e) => s("leader", e.target.value)} placeholder="Team leader" className={iCls} />
                        <input type="number" value={g("members")} onChange={(e) => s("members", e.target.value)} placeholder="Members" className={iCls} />
                      </div>
                    ) : (
                      <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2">
                        <div className="space-y-px">
                          <InlineRow label="Leader" value={ev("leader", rg.leader)} icon={<User className="h-2.5 w-2.5" />} />
                          <InlineRow label="Members" value={rg.members ?? 0} icon={<Users className="h-2.5 w-2.5" />} />
                        </div>
                      </div>
                    )}
                  </DetailSection>
                </div>

                <div className="flex-1 min-h-0">
                  <DetailSection title="Hierarchy / Flow">
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2">
                      <div className="space-y-px">
                        <InlineRow label="Plant" value={hierarchyPlant} />
                        <InlineRow label="Department" value={deptName || "-"} />
                        <InlineRow label="Resources" value={rg.resourceCount ?? 0} />
                        <InlineRow label="Physical capability" value={resourceCount > 0 ? "Defined by assigned resources" : "Not usable until resources are assigned"} />
                      </div>
                    </div>
                  </DetailSection>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col min-h-0" style={{ gap: 8 }}>
                <div className="shrink-0">
                  <DetailSection title="Lean Setup">
                    <div className="rounded-lg bg-slate-50/50 p-2 dark:bg-slate-800/30">
                      <div className="grid grid-cols-2 gap-2">
                        <SetupSignal ok={!!rg.departmentId} label="Department linked" />
                        <SetupSignal ok={!!rg.groupTypeId} label="Capability typed" />
                        <SetupSignal ok={resourceCount > 0} label="Resources assigned" />
                        <SetupSignal ok={!!rg.leader || membersCount > 0} label="Ownership defined" />
                      </div>
                      <p className="mt-2 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                        Resource groups represent shared physical capability. Product routing should reference this capability through process-step assignments, while execution remains traceable to the actual resource.
                      </p>
                    </div>
                  </DetailSection>
                </div>

                <div className="flex-1 min-h-0">
                  <DetailSection title="Resources">
                    {resourcesLoading ? (
                      <div className="flex h-24 items-center justify-center rounded-lg bg-slate-50/50 text-xs text-slate-400 dark:bg-slate-800/30">
                        Loading assigned resources...
                      </div>
                    ) : !rg.resourceCount ? (
                      <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-2.5 text-center bg-slate-50/30 dark:bg-slate-800/20" style={{ minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">No resources assigned. Add resources to define the group capability.</p>
                        <button type="button" onClick={() => navigate("/system/production-structure/components/resource")} className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-rose-500 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm"><Dumbbell className="h-2.5 w-2.5 stroke-current" /> Manage Resources</button>
                      </div>
                    ) : assignedResources.length === 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[10px] leading-4 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        The group reports {resourceCount} assigned resource{resourceCount !== 1 ? "s" : ""}, but the resource list is not available from the current read model. Open Resources to verify assignments.
                        <button type="button" onClick={() => navigate("/system/production-structure/components/resource")} className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-amber-700 transition-colors">
                          <Dumbbell className="h-2.5 w-2.5 stroke-current" /> Open Resources
                        </button>
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <table className="w-full text-[11px]">
                          <thead><tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <th className="text-left px-2 py-1 font-medium">Resource</th>
                            <th className="text-left px-2 py-1 font-medium">Code</th>
                            <th className="text-left px-2 py-1 font-medium">Type</th>
                            <th className="text-left px-2 py-1 font-medium">Status</th>
                            <th className="text-right px-2 py-1 font-medium w-16">Act.</th>
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {assignedResources.slice(0, 5).map((resource) => (
                              <tr key={resource.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-2 py-1 font-medium text-slate-800 dark:text-slate-200">{resource.name || "-"}</td>
                                <td className="px-2 py-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">{resource.code || "-"}</td>
                                <td className="px-2 py-1 text-slate-500 dark:text-slate-400">{resource.resourceTypeId || "-"}</td>
                                <td className="px-2 py-1"><Badge label={resource.status || "active"} variant={resource.status === "active" ? "active" : "inactive"} /></td>
                                <td className="px-2 py-1 text-right text-slate-400">{resource.shiftPattern ? "Scheduled" : "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {assignedResources.length > 5 && (
                          <button type="button" onClick={() => navigate("/system/production-structure/components/resource")} className="w-full border-t border-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800">
                            View all {assignedResources.length} resources
                          </button>
                        )}
                      </div>
                    )}
                  </DetailSection>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-2 pb-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[9px] text-slate-400 dark:text-slate-500">
              <span>Created <span className="font-medium text-slate-500 dark:text-slate-400">{formatAppDate(rg.createdAt) || "-"}</span></span>
              <span>Updated <span className="font-medium text-slate-500 dark:text-slate-400">{formatAppDate(rg.updatedAt) || "-"}</span></span>
              {rg.leader && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5 stroke-current" />{rg.leader}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete resource group?" message="This action cannot be undone." onConfirm={hDelete} />
      )}
      <EntityWorkspacePage
        toolbar={null}
        list={
          <>
            <div className="shrink-0 h-9 border-b border-slate-200 dark:border-slate-700 flex items-center px-3 bg-white dark:bg-slate-900">
              <Search className="h-3 w-3 text-slate-400 stroke-current mr-2 shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Resource Groups</span>
              <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-500 font-mono">{filtered.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto bg-white pl-2 dark:bg-slate-900">
              {loading && groups.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-slate-400"><div className="h-2 w-2 rounded-full bg-rose-400 animate-bounce mr-2" />Loading...</div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Component className="h-4 w-4 text-slate-300 dark:text-slate-600 mb-1.5 stroke-current" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">No resource groups</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {paginated.map((g) => (
                    <div
                      key={g.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(g.id);
                          if (mode === "create") { clearForm(); setMode("view"); }
                        }
                      }}
                      onClick={() => { setSelectedId(g.id); if (mode === "create") { clearForm(); setMode("view"); } }}
                      className={`group flex items-center gap-2 px-3 cursor-pointer transition-all duration-150 h-11 outline-none ${
                        selectedId === g.id
                          ? "bg-gradient-to-r from-rose-50 to-white dark:from-rose-900/15 dark:to-slate-900 border-l-[3px] border-l-rose-500 dark:border-l-rose-400 ring-1 ring-rose-100 dark:ring-rose-500/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30 border-l-[3px] border-l-transparent"
                      }`}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${selectedId === g.id ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400" : "bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 dark:bg-slate-800 dark:text-slate-500"}`}>
                        <Component className="h-3.5 w-3.5 stroke-current" />
                      </div>
                      <div className="min-w-0 flex-1 grid items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,0.9fr) auto auto" }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`text-[11px] font-semibold truncate ${selectedId === g.id ? "text-rose-800 dark:text-rose-300" : "text-slate-800 dark:text-slate-200"}`}>{g.name}</span>
                            {g.code && <span className="text-[7px] font-mono text-slate-400 dark:text-slate-500 shrink-0">{g.code}</span>}
                          </div>
                        </div>
                        <div className="min-w-0 text-[9px] text-slate-400 dark:text-slate-500 truncate">
                          {g.departmentName || "No department"}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          {g.groupTypeId ? <Badge label={g.groupTypeRef?.name || "Typed"} variant="default" /> : <Badge label="Type missing" variant="warning" />}
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap text-right">{g.resourceCount ?? 0} Res</span>
                      </div>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${g.status === "active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                    </div>
                  ))}
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
