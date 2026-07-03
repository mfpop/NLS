import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { ShieldCheck, Users, AlertTriangle, Plus, Pencil, X, Trash2, RefreshCw, CheckCircle2, Clock, Shield, UserRound, UserPlus, Loader2 } from "lucide-react";
import { RecordListPanel, RecordListItem } from "@/components/layout/RecordListPanel";
import { ResizableSplitPane } from "@/components/layout/ResizableSplitPane";
import { ToolbarButton, ToolbarDropdown } from "@/components/layout/PageToolbar";
import { useToolbar } from "./toolbarContext";
import { ROLES_QUERY, USER_ROLES_ALL_QUERY, PERMISSIONS_QUERY, USER_PROFILES_QUERY, COMPANIES_LIST_QUERY } from "@/graphql/administrationQueries";
import { ARCHIVE_ROLE, ASSIGN_PERMISSION_TO_ROLE, REMOVE_PERMISSION_FROM_ROLE, CREATE_ROLE, UPDATE_ROLE, ASSIGN_ROLE_TO_USER } from "@/graphql/administrationMutations";
import { REFERENCE_OPTIONS_QUERY } from "@/hooks/useReferenceTables";

type ScopeLevel = "global" | "company" | "plant" | "department";
type RolePageMode = "view" | "editRole" | "createRole" | "assignPermissions" | "assignUsers";

interface PermissionNode { id: string; code: string; name: string; description: string; module: string; action: string; isActive: boolean; }
interface RoleNode { id: string; code: string; name: string; description: string; isSystemRole: boolean; isActive: boolean; createdAt: string; updatedAt: string; permissions: PermissionNode[]; }
interface ReferenceOptionValue { id: string; code: string; name: string; isActive: boolean; metadata?: unknown; }
interface UserRoleNode {
  id: string; userProfileId: string; roleId: string; roleName: string;
  username: string; fullName: string; isActive: boolean;
}
interface UserProfileNode { id: string; userId: string; username: string; email: string; fullName: string; isActive: boolean; }

const MODULE_ORDER = ["System", "Manufacturing Structure", "Plan", "Execute", "Check", "Improve", "Standardize", "Maintenance", "Safety", "Documentation"];
const ACTION_COLUMNS = ["view", "create", "edit", "delete", "approve", "admin"] as const;

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

const hdr = "h-8 border-b border-slate-200 bg-slate-50 px-3 flex items-center";
const secTitle = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
const scopeBadgeMap: Record<ScopeLevel, string> = {
  global: "border-blue-400/60 text-blue-600 bg-blue-50",
  company: "border-indigo-400/60 text-indigo-600 bg-indigo-50",
  plant: "border-purple-400/60 text-purple-600 bg-purple-50",
  department: "border-cyan-400/60 text-cyan-600 bg-cyan-50",
};
const scopeLabelMap: Record<ScopeLevel, string> = { global: "Global", company: "Company", plant: "Plant", department: "Department" };

function ModulePermissionsGrid({ permissions, allPermissions, mode, selectedPermIds, canAssign, onStartAssign, onTogglePerm }: {
  permissions: PermissionNode[]; allPermissions?: PermissionNode[]; mode: RolePageMode;
  selectedPermIds?: Set<string>; canAssign?: boolean; onStartAssign?: () => void; onTogglePerm?: (permId: string) => void;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, PermissionNode[]>();
    const source = mode === "assignPermissions" && allPermissions ? allPermissions : permissions;
    source.forEach((p) => {
      const mod = p.module ? capitalize(p.module) : "Other";
      if (!m.has(mod)) m.set(mod, []);
      m.get(mod)!.push(p);
    });
    return m;
  }, [permissions, allPermissions, mode]);

  const modules = Array.from(grouped.keys()).sort((a, b) => {
    const ia = MODULE_ORDER.indexOf(a);
    const ib = MODULE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-3 text-xs text-slate-400">
        <Shield className="h-4 w-4" />
        <span>No permissions assigned to this role.</span>
        {canAssign && mode === "view" && (
          <button type="button" onClick={onStartAssign}
            className="inline-flex items-center gap-1 rounded border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50">
            <Pencil className="h-3 w-3" />Assign permissions
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {modules.map((mod) => {
        const perms = grouped.get(mod)!;
        const permByAction = new Map<string, PermissionNode>();
        perms.forEach((p) => permByAction.set(p.action.toLowerCase(), p));
        return (
          <div key={mod} className="px-3 py-1.5 hover:bg-slate-50/40">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] font-medium text-slate-600 capitalize">{mod}</span>
              <span className="text-[10px] text-slate-400">({perms.length})</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {ACTION_COLUMNS.map((action) => {
                const perm = permByAction.get(action);
                const hasAction = !!perm;
                const isSelected = selectedPermIds && perm ? selectedPermIds.has(perm.id) : false;
                const actionLabel = action === "admin" ? "Admin" : capitalize(action);
                if (mode === "assignPermissions") {
                  const toggle = () => perm && onTogglePerm && onTogglePerm(perm.id);
                  return (
                    <button key={action} type="button" onClick={toggle}
                      className={`flex items-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-300 font-medium"
                          : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300"
                      }`}>
                      {isSelected ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <span className="w-3 text-center text-slate-300">—</span>}
                      <span className="truncate">{actionLabel}</span>
                    </button>
                  );
                }
                return (
                  <div key={action} className={`flex items-center gap-1 rounded border px-1.5 py-1 text-[11px] ${
                    hasAction
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 font-medium"
                      : "bg-white text-slate-400 border-slate-200"
                  }`}>
                    {hasAction ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <span className="w-3 text-center text-slate-300">—</span>}
                    <span className="truncate">{actionLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RolesTab() {
  const [mode, setMode] = useState<RolePageMode>("view");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [permError, setPermError] = useState<string | null>(null);
  const [isSavingPerms, setIsSavingPerms] = useState(false);
  // Form state for create/edit role
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsSystemRole, setFormIsSystemRole] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  // Assign users state
  const [assignUserSearch, setAssignUserSearch] = useState("");
  const [assignUserAssignedIds, setAssignUserAssignedIds] = useState<Set<string>>(new Set());
  const [assignUserSubmitting, setAssignUserSubmitting] = useState<string | null>(null);
  const [assignCompanyId, setAssignCompanyId] = useState("");
  const [assignPlantId, setAssignPlantId] = useState("");
  const [assignDeptId, setAssignDeptId] = useState("");
  const { data: roleData, refetch: refetchRoles } = useQuery<{ roles: RoleNode[] }>(ROLES_QUERY, { variables: { isActive: true }, fetchPolicy: "cache-and-network" });
  const { data: allPermsData } = useQuery<{ permissions: PermissionNode[] }>(PERMISSIONS_QUERY, { skip: mode !== "assignPermissions", fetchPolicy: "cache-and-network" });
  const { data: assignmentData } = useQuery<{ userRoles: UserRoleNode[] }>(USER_ROLES_ALL_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: referenceData } = useQuery<{ referenceOptions: Array<{ categoryCode: string; values: ReferenceOptionValue[] }> }>(REFERENCE_OPTIONS_QUERY, { variables: { types: ["role"] }, fetchPolicy: "cache-and-network" });

  const [archiveRoleMut] = useMutation(ARCHIVE_ROLE);
  const [assignPermissionMut] = useMutation(ASSIGN_PERMISSION_TO_ROLE);
  const [removePermissionMut] = useMutation(REMOVE_PERMISSION_FROM_ROLE);
  const [createRoleMut] = useMutation(CREATE_ROLE);
  const [updateRoleMut] = useMutation(UPDATE_ROLE);
  const [assignRoleToUserMut] = useMutation(ASSIGN_ROLE_TO_USER);
  const { data: userProfilesData } = useQuery<{ userProfiles: UserProfileNode[] }>(USER_PROFILES_QUERY, {
    skip: mode !== "assignUsers",
    fetchPolicy: "cache-and-network",
  });
  const { data: companiesData } = useQuery<{ companies: Array<{ id: string; name: string }> }>(COMPANIES_LIST_QUERY, {
    skip: mode !== "assignUsers",
    fetchPolicy: "cache-and-network",
  });

  const assignments = (assignmentData?.userRoles ?? []).filter((a) => a.isActive);
  const allPermissions = allPermsData?.permissions ?? [];

  const roleByCode = useMemo(() => {
    const m = new Map<string, ReferenceOptionValue>();
    const values = referenceData?.referenceOptions?.find((opt) => opt.categoryCode === "role")?.values?.filter((v) => v.isActive) ?? [];
    values.forEach((v) => m.set(v.code.toLowerCase(), v));
    return m;
  }, [referenceData]);

  const roleCatalog = useMemo(() => {
    return (roleData?.roles ?? []).filter((r) => r.isActive).map((role) => {
      const refRole = roleByCode.get(role.code.toLowerCase()) ?? null;
      const meta = refRole?.metadata ? (typeof refRole.metadata === "object" ? refRole.metadata as Record<string, unknown> : null) : null;
      const scopeStr = String(meta?.scope ?? meta?.level ?? "");
      let scope: ScopeLevel = "global";
      if (["company", "site"].includes(scopeStr.toLowerCase())) scope = "company";
      else if (["plant", "factory"].includes(scopeStr.toLowerCase())) scope = "plant";
      else if (["department", "dept"].includes(scopeStr.toLowerCase())) scope = "department";
      const probe = `${role.code} ${role.name}`.toLowerCase();
      if (scope === "global" && (probe.includes("department") || probe.includes("dept"))) scope = "department";
      if (scope === "global" && (probe.includes("plant") || probe.includes("factory"))) scope = "plant";
      if (scope === "global" && probe.includes("company")) scope = "company";
      return { ...role, renderLabel: refRole?.name || role.name, scope };
    });
  }, [roleData, roleByCode]);

  const visibleRoles = useMemo(() => {
    let filtered = roleCatalog;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) => r.renderLabel.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }
    if (scopeFilter !== "all") filtered = filtered.filter((r) => r.scope === scopeFilter);
    return filtered;
  }, [roleCatalog, search, scopeFilter]);



  const selectedRole = useMemo(() => visibleRoles.find((r) => r.id === selectedRoleId) ?? null, [visibleRoles, selectedRoleId]);
  const userCountByRole = useMemo(() => {
    const m = new Map<string, number>();
    assignments.forEach((a) => { m.set(a.roleId, (m.get(a.roleId) ?? 0) + 1); });
    return m;
  }, [assignments]);

  const assignedUsersByRole = useMemo(() => {
    const m = new Map<string, UserRoleNode[]>();
    assignments.forEach((a) => { const list = m.get(a.roleId) ?? []; list.push(a); m.set(a.roleId, list); });
    return m;
  }, [assignments]);

  const isAdminLevel = (role: typeof selectedRole) => {
    if (!role) return false;
    return role.permissions.some((p) => p.action.toLowerCase() === "admin" || p.code.toLowerCase().includes("admin"));
  };

  // Capability flags (backend-driven in future)
  const capabilities = useMemo(() => ({
    canCreateRole: true, canEditRole: true, canAssignPermissions: true, canAssignUsers: true,
    canDeactivateRole: selectedRole ? !selectedRole.isSystemRole : true,
  }), [selectedRole]);

  const startAssignPermissions = useCallback(() => {
    if (!selectedRole) return;
    setMode("assignPermissions");
    setPermError(null);
    setSelectedPermIds(new Set(selectedRole.permissions.map((p) => p.id)));
  }, [selectedRole]);

  const cancelAssignPermissions = useCallback(() => {
    setMode("view"); setSelectedPermIds(new Set()); setPermError(null);
  }, []);

  const togglePermission = async (permId: string) => {
    if (!selectedRole) return;
    const isCurrentlyAssigned = selectedRole.permissions.some((p) => p.id === permId);
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return next;
    });
    try {
      if (isCurrentlyAssigned) {
        await removePermissionMut({ variables: { roleId: selectedRole.id, permissionId: permId } });
      } else {
        await assignPermissionMut({ variables: { roleId: selectedRole.id, permissionId: permId } });
      }
    } catch (error) {
      setPermError(error instanceof Error ? error.message : "Failed to update permission.");
      setSelectedPermIds((prev) => {
        const next = new Set(prev);
        if (next.has(permId)) next.delete(permId); else next.add(permId);
        return next;
      });
    }
  };

  const savePermissions = useCallback(async () => {
    if (!selectedRole) return;
    setIsSavingPerms(true); setPermError(null);
    try {
      const currentIds = new Set(selectedRole.permissions.map((p) => p.id));
      const toAdd = [...selectedPermIds].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !selectedPermIds.has(id));
      for (const id of toAdd) await assignPermissionMut({ variables: { roleId: selectedRole.id, permissionId: id } });
      for (const id of toRemove) await removePermissionMut({ variables: { roleId: selectedRole.id, permissionId: id } });
      await refetchRoles();
      setMode("view");
    } catch (error) {
      setPermError(error instanceof Error ? error.message : "Failed to save permissions.");
    } finally { setIsSavingPerms(false); }
  }, [selectedRole, selectedPermIds, assignPermissionMut, removePermissionMut, refetchRoles]);

  const openCreateRole = useCallback(() => {
    setFormCode("");
    setFormName("");
    setFormDescription("");
    setFormIsSystemRole(false);
    setFormError(null);
    setMode("createRole");
  }, []);

  const openEditRole = useCallback(() => {
    if (!selectedRole) return;
    setFormCode(selectedRole.code);
    setFormName(selectedRole.renderLabel);
    setFormDescription(selectedRole.description);
    setFormIsSystemRole(selectedRole.isSystemRole);
    setFormError(null);
    setMode("editRole");
  }, [selectedRole]);

  const openAssignUsers = useCallback(() => {
    if (!selectedRole) return;
    setAssignUserSearch("");
    setAssignUserAssignedIds(new Set());
    setAssignCompanyId("");
    setAssignPlantId("");
    setAssignDeptId("");
    setMode("assignUsers");
  }, [selectedRole]);

  const handleCreateRole = useCallback(async () => {
    setFormError(null);
    const trimmedCode = formCode.trim();
    const trimmedName = formName.trim();
    if (!trimmedCode) { setFormError("Code is required."); return; }
    if (!trimmedName) { setFormError("Name is required."); return; }
    setFormSubmitting(true);
    try {
      const res = await createRoleMut({ variables: { input: { code: trimmedCode, name: trimmedName, description: formDescription.trim(), isSystemRole: formIsSystemRole } } });
      const data = (res.data as { createRole?: { errors?: Array<{ message: string }> } } | undefined)?.createRole;
      if (data?.errors?.length) {
        setFormError(data.errors.map((e: { message: string }) => e.message).join("; "));
      } else {
        await refetchRoles();
        setMode("view");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to create role.");
    } finally { setFormSubmitting(false); }
  }, [formCode, formName, formDescription, formIsSystemRole, createRoleMut, refetchRoles]);

  const handleUpdateRole = useCallback(async () => {
    if (!selectedRole) return;
    setFormError(null);
    const trimmedCode = formCode.trim();
    const trimmedName = formName.trim();
    if (!trimmedCode) { setFormError("Code is required."); return; }
    if (!trimmedName) { setFormError("Name is required."); return; }
    setFormSubmitting(true);
    try {
      const res = await updateRoleMut({
        variables: {
          id: selectedRole.id,
          input: { code: trimmedCode, name: trimmedName, description: formDescription.trim() || null, isActive: true },
        },
      });
      const data = (res.data as { updateRole?: { errors?: Array<{ message: string }> } } | undefined)?.updateRole;
      if (data?.errors?.length) {
        setFormError(data.errors.map((e: { message: string }) => e.message).join("; "));
      } else {
        await refetchRoles();
        setSelectedRoleId(selectedRole.id);
        setMode("view");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to update role.");
    } finally { setFormSubmitting(false); }
  }, [selectedRole, formCode, formName, formDescription, updateRoleMut, refetchRoles]);

  const handleAssignUser = async (userProfileId: string) => {
    if (!selectedRole) return;
    setFormError(null);
    setAssignUserSubmitting(userProfileId);
    const scope = selectedRole.scope;
    try {
      const res = await assignRoleToUserMut({
        variables: {
          input: {
            userProfileId,
            roleId: selectedRole.id,
            companyId: scope !== "global" ? assignCompanyId || null : null,
            plantId: scope === "plant" || scope === "department" ? assignPlantId || null : null,
            administrativeDepartmentId: scope === "department" ? assignDeptId || null : null,
          },
        },
      });
      const payloadErrors = (res.data as { assignRoleToUser?: { errors?: Array<{ message: string }> } } | undefined)?.assignRoleToUser?.errors;
      if (payloadErrors?.length) {
        setFormError(payloadErrors.map((e: { message: string }) => e.message).join("; "));
        setAssignUserSubmitting(null);
        return;
      }
      setAssignUserAssignedIds((prev) => new Set(prev).add(userProfileId));
      await refetchRoles();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to assign user.");
    } finally { setAssignUserSubmitting(null); }
  };

  const confirmArchive = useCallback(async () => {
    if (!selectedRole || !archiveConfirmId) return;
    setIsArchiving(true);
    try {
      await archiveRoleMut({ variables: { id: selectedRole.id } });
      await refetchRoles();
      setSelectedRoleId(null);
      setArchiveConfirmId(null);
    } catch (error) {
      setPermError(error instanceof Error ? error.message : "Failed to archive role.");
      setArchiveConfirmId(null);
    } finally { setIsArchiving(false); }
  }, [selectedRole, archiveConfirmId, archiveRoleMut, refetchRoles]);

  const toolbarFilters = useMemo(() => (
    <div className="flex items-center gap-2">
      <ToolbarDropdown value={scopeFilter} onChange={setScopeFilter} options={[
        { value: "all", label: "All scopes" },
        { value: "global", label: "Global" },
        { value: "company", label: "Company scoped" },
        { value: "plant", label: "Plant scoped" },
        { value: "department", label: "Department scoped" },
      ]} className="w-40" />
    </div>
  ), [scopeFilter]);

  const refreshRoles = useCallback(() => { refetchRoles(); }, [refetchRoles]);

  const toolbarActions = useMemo(() => {
    if (mode === "assignPermissions") {
      return (<>
        <ToolbarButton icon={CheckCircle2 as any} label={isSavingPerms ? "Saving..." : "Save Permissions"} onClick={savePermissions} disabled={isSavingPerms} variant="edit" />
        <ToolbarButton icon={X} label="Cancel" onClick={cancelAssignPermissions} variant="danger" />
        <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshRoles} variant="neutral" />
      </>);
    }
    if (mode === "createRole" || mode === "editRole") {
      return (<>
        <ToolbarButton icon={CheckCircle2 as any} label={formSubmitting ? "Saving..." : "Save"} onClick={mode === "createRole" ? handleCreateRole : handleUpdateRole} disabled={formSubmitting} variant="edit" />
        <ToolbarButton icon={X} label="Cancel" onClick={() => setMode("view")} variant="danger" />
        <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshRoles} variant="neutral" />
      </>);
    }
    if (mode === "assignUsers") {
      return (<>
        <ToolbarButton icon={X} label="Done" onClick={() => { setMode("view"); refreshRoles(); }} />
        <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshRoles} variant="neutral" />
      </>);
    }
    return (<>
      {mode === "view" ? (<>
        {capabilities.canEditRole && <ToolbarButton icon={Pencil} label="Edit Role" onClick={openEditRole} disabled={!selectedRole} variant="edit" />}
        {capabilities.canAssignPermissions && <ToolbarButton icon={ShieldCheck as any} label="Assign Permissions" onClick={startAssignPermissions} disabled={!selectedRole} variant="create" />}
        {capabilities.canAssignUsers && <ToolbarButton icon={Users as any} label="Assign Users" onClick={openAssignUsers} disabled={!selectedRole} variant="create" />}
        <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />
        {capabilities.canDeactivateRole && selectedRole && (
          archiveConfirmId ? (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-red-600 font-medium">Archive role?</span>
              <button type="button" onClick={confirmArchive} disabled={isArchiving} className="inline-flex h-7 items-center rounded bg-red-600 px-2 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-60">{isArchiving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}Yes</button>
              <button type="button" onClick={() => setArchiveConfirmId(null)} className="inline-flex h-7 items-center rounded border border-slate-300 bg-white px-2 text-[10px] text-slate-600 hover:bg-slate-50">No</button>
            </div>
          ) : (
            <ToolbarButton icon={Trash2 as any} label={selectedRole.isSystemRole ? "Protected" : "Deactivate"} onClick={() => setArchiveConfirmId(selectedRole.id)} variant={selectedRole.isSystemRole ? undefined : "danger"} disabled={selectedRole.isSystemRole} />
          )
        )}
        <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />
      </>) : null}
      {capabilities.canCreateRole && <ToolbarButton icon={Plus} label="New Role" onClick={openCreateRole} variant="create" />}
      <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshRoles} variant="neutral" />
    </>);
  }, [mode, selectedRole, archiveConfirmId, isArchiving, isSavingPerms, formSubmitting, capabilities, savePermissions, cancelAssignPermissions, handleCreateRole, handleUpdateRole, openEditRole, startAssignPermissions, openAssignUsers, openCreateRole, confirmArchive, refreshRoles]);

  const { setToolbar, setFooter } = useToolbar();
  const toolbarActionsRef = useRef<ReactNode>(null);
  toolbarActionsRef.current = toolbarActions;
  const toolbarFiltersRef = useRef<ReactNode>(null);
  toolbarFiltersRef.current = toolbarFilters;

  useEffect(() => {
    setToolbar({
      searchValue: search,
      onSearchChange: setSearch,
      searchPlaceholder: "Search roles",
      leftWidthClass: undefined,
      filters: toolbarFiltersRef.current,
      actions: <div className="flex items-center gap-2">{toolbarActionsRef.current}</div>,
    });
    setFooter(
      <span className="flex items-center gap-4 text-xs text-slate-500">
        <span>{roleCatalog.length} role{roleCatalog.length !== 1 ? "s" : ""}</span>
        {selectedRole && <><span className="h-4 w-px bg-slate-200" /><span>{selectedRole.renderLabel}</span></>}
        {selectedRole && <><span className="h-4 w-px bg-slate-200" /><span>{selectedRole.permissions.length} permission{selectedRole.permissions.length !== 1 ? "s" : ""}</span></>}
        {selectedRole && <><span className="h-4 w-px bg-slate-200" /><span>{userCountByRole.get(selectedRole.id) ?? 0} user{(userCountByRole.get(selectedRole.id) ?? 0) !== 1 ? "s" : ""}</span></>}
      </span>
    );
    return () => { setToolbar(null); setFooter(null); };
  }, [search, scopeFilter, mode, selectedRole?.id, roleCatalog.length, selectedRole?.permissions?.length, (userCountByRole.get(selectedRole?.id ?? "") ?? 0), archiveConfirmId, isArchiving, isSavingPerms, formSubmitting]);

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <ResizableSplitPane
            left={<RecordListPanel
              title="Roles" count={visibleRoles.length}
              autoPageSize
              rowHeight={56}
              items={visibleRoles}
              renderItem={(role) => {
                const sel = role.id === selectedRoleId;
                const userCount = userCountByRole.get(role.id) ?? 0;
                const permCount = role.permissions.length;
                return (
                  <RecordListItem
                    key={role.id}
                    active={sel}
                    onClick={() => { setSelectedRoleId(role.id); setMode("view"); setArchiveConfirmId(null); setPermError(null); }}
                    title={
                      <span className="flex items-center justify-between gap-1.5">
                        <span className={`truncate ${sel ? "font-semibold" : "font-medium"}`}>{role.renderLabel}</span>
                        {role.isSystemRole && <span className="inline-flex items-center rounded border border-amber-300/50 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold text-amber-700">System</span>}
                      </span>
                    }
                    subtitle={
                      <>
                        <span className={`inline-flex rounded border px-1 py-0.5 text-[10px] ${scopeBadgeMap[role.scope]}`}>{scopeLabelMap[role.scope]}</span>
                        <span>{userCount} user{userCount !== 1 ? "s" : ""}</span>
                        {permCount > 0 && <span>{permCount} perm{permCount !== 1 ? "s" : ""}</span>}
                      </>
                    }
                  />
                );
              }}
              emptyState={
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  <span className="text-sm font-medium text-slate-500">No roles found</span>
                </div>
              }
            />
          }
          storageKey="lmd:roles-split"
          right={<>
          {/* Right: Role detail */}
            {mode === "createRole" ? (
              <div className="h-full overflow-y-auto">
                <div className="shrink-0 border-b border-slate-300 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Create New Role</h2>
                  <p className="mt-0.5 text-[12px] text-slate-500">Fill in the details to create a new role.</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {formError && <div className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] text-red-700">{formError}</div>}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Code *</label>
                    <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. plant_manager"
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Name *</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Plant Manager"
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Description</label>
                    <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description of this role" rows={3}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formIsSystemRole} onChange={(e) => setFormIsSystemRole(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200" />
                    <span className="text-[13px] text-slate-700">System role</span>
                  </label>
                </div>
              </div>
            ) : mode === "assignUsers" && selectedRole ? (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="shrink-0 border-b border-slate-300 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Assign Users — {selectedRole.renderLabel}</h2>
                  <p className="mt-0.5 text-[12px] text-slate-500">Select users to assign this role.</p>
                  {selectedRole.scope !== "global" && (
                    <div className="mt-2 flex items-center gap-2">
                      {selectedRole.scope === "company" || selectedRole.scope === "plant" || selectedRole.scope === "department" ? (
                        <select value={assignCompanyId} onChange={(e) => { setAssignCompanyId(e.target.value); setAssignPlantId(""); setAssignDeptId(""); }}
                          className="h-7 rounded border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-400">
                          <option value="">Select company...</option>
                          {(companiesData?.companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : null}
                      {(selectedRole.scope === "plant" || selectedRole.scope === "department") && assignCompanyId && (
                        <select value={assignPlantId} onChange={(e) => { setAssignPlantId(e.target.value); setAssignDeptId(""); }}
                          className="h-7 rounded border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-400">
                          <option value="">Select plant...</option>
                        </select>
                      )}
                      {selectedRole.scope === "department" && assignPlantId && (
                        <select value={assignDeptId} onChange={(e) => setAssignDeptId(e.target.value)}
                          className="h-7 rounded border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-400">
                          <option value="">Select department...</option>
                        </select>
                      )}
                      {!assignCompanyId && (
                        <span className="text-[11px] text-amber-600">Select a company to enable user assignment.</span>
                      )}
                    </div>
                  )}
                  <div className="mt-2">
                    <input type="text" value={assignUserSearch} onChange={(e) => setAssignUserSearch(e.target.value)} placeholder="Search users..."
                      className="h-7 w-full max-w-xs rounded border border-slate-300 bg-white px-2 text-[12px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200" />
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {formError && <div className="px-4 py-1.5 text-[11px] text-red-600 bg-red-50 border-b border-red-100">{formError}</div>}
                  {(() => {
                    const allUsers = (userProfilesData?.userProfiles ?? []).filter((u) => u.isActive);
                    const alreadyAssigned = new Set(assignedUsersByRole.get(selectedRole.id)?.map((a) => a.userProfileId) ?? []);
                    const filtered = assignUserSearch.trim()
                      ? allUsers.filter((u) => (u.fullName || u.username).toLowerCase().includes(assignUserSearch.toLowerCase()))
                      : allUsers;
                    const toShow = filtered.filter((u) => !alreadyAssigned.has(u.id) && !assignUserAssignedIds.has(u.id));
                    if (toShow.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-400">
                          <Users className="h-5 w-5 mb-1" />
                          <span>{assignUserSearch.trim() ? "No users match your search." : "All users are already assigned this role."}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="divide-y divide-slate-100">
                        {toShow.map((u) => {
                          const submitting = assignUserSubmitting === u.id;
                          return (
                            <div key={u.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50/60">
                              <div className="min-w-0 flex-1">
                                <span className="text-[13px] font-medium text-slate-800">{u.fullName || u.username}</span>
                                {u.email && <span className="ml-2 text-[11px] text-slate-400">{u.email}</span>}
                              </div>
                              <button type="button" onClick={() => handleAssignUser(u.id)} disabled={submitting}
                                className="inline-flex h-7 items-center gap-1 rounded border border-blue-200 px-2.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors">
                                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                                Assign
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <div className="shrink-0 h-9 border-t border-slate-200 bg-slate-50 px-4 flex items-center text-[11px] text-slate-500">
                  <span>{assignUserAssignedIds.size} user{assignUserAssignedIds.size !== 1 ? "s" : ""} assigned this session</span>
                </div>
              </div>
            ) : mode === "editRole" && selectedRole ? (
              <div className="h-full overflow-y-auto">
                <div className="shrink-0 border-b border-slate-300 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Edit Role — {selectedRole.renderLabel}</h2>
                  <p className="mt-0.5 text-[12px] text-slate-500">Update the role details.</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {formError && <div className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] text-red-700">{formError}</div>}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Code *</label>
                    <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. plant_manager"
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Name *</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Plant Manager"
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Description</label>
                    <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description of this role" rows={3}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none" />
                  </div>
                  {selectedRole.isSystemRole && (
                    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
                      <AlertTriangle className="h-3 w-3 inline-block mr-1" />This is a system role. Some fields may be protected.
                    </div>
                  )}
                </div>
              </div>
            ) : !selectedRole ? (
              <div className="flex h-full items-center justify-center px-8">
                <div className="max-w-lg text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-blue-500" />
                  <h3 className="mt-3 text-base font-semibold text-foreground">Select a role to view permissions</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a role from the catalog to see its permission matrix and assigned users.
                  </p>
                </div>
              </div>
            ) : (
              /* Detail panel — view or assignPermissions mode with a selected role */
              <div className="h-full flex flex-col overflow-hidden">
                {/* Role Summary Strip */}
                <div className="shrink-0 border-b border-slate-300 px-4 py-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-slate-900">{selectedRole.renderLabel}</h2>
                        <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${scopeBadgeMap[selectedRole.scope]}`}>{scopeLabelMap[selectedRole.scope]}</span>
                        {selectedRole.isSystemRole && <span className="inline-flex items-center rounded border border-amber-300/50 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">System</span>}
                        {isAdminLevel(selectedRole) && <span className="inline-flex items-center gap-1 rounded border border-amber-400/50 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"><AlertTriangle className="h-3 w-3" />Admin</span>}
                      </div>
                      {selectedRole.description && <p className="mt-0.5 text-[12px] text-slate-500">{selectedRole.description}</p>}
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                        <span><span className="font-medium text-slate-600">{userCountByRole.get(selectedRole.id) ?? 0}</span> assigned user{(userCountByRole.get(selectedRole.id) ?? 0) !== 1 ? "s" : ""}</span>
                        <span><span className="font-medium text-slate-600">{selectedRole.permissions.length}</span> permission{selectedRole.permissions.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  {permError && <div className="px-4 py-1.5 text-xs text-red-600 bg-red-50 border-b border-red-100">{permError}</div>}

                  {/* Access Scope */}
                  <div className="border-b border-slate-200">
                    <div className={hdr}><span className={secTitle}>Access Scope</span></div>
                    <div className="px-3 py-1.5 text-[12px] text-slate-600">
                      {selectedRole.scope === "global" ? (
                        <span>This role applies globally — no company, plant, or department restrictions.</span>
                      ) : selectedRole.scope === "company" ? (
                        <span>This role is scoped to a <strong className="text-slate-800">company</strong> level. Assign with a specific company.</span>
                      ) : selectedRole.scope === "plant" ? (
                        <span>This role is scoped to a <strong className="text-slate-800">plant</strong> level. Assign with a specific plant.</span>
                      ) : (
                        <span>This role is scoped to a <strong className="text-slate-800">department</strong> level. Assign with a specific department.</span>
                      )}
                    </div>
                  </div>

                  {/* Permission Matrix */}
                  <div className="border-b border-slate-200">
                    <div className={hdr}><span className={secTitle}>Permission Matrix</span></div>
                    {mode === "assignPermissions" ? (
                      <ModulePermissionsGrid
                        permissions={selectedRole.permissions}
                        allPermissions={allPermissions}
                        mode="assignPermissions"
                        selectedPermIds={selectedPermIds}
                        onTogglePerm={togglePermission}
                      />
                    ) : (
                      <ModulePermissionsGrid permissions={selectedRole.permissions} mode="view" canAssign={capabilities.canAssignPermissions} onStartAssign={startAssignPermissions} />
                    )}
                  </div>

                  {/* Assigned Users */}
                  <div className="border-b border-slate-200">
                    <div className={hdr}><span className={secTitle}>Assigned Users</span></div>
                    {(() => {
                      const users = assignedUsersByRole.get(selectedRole.id) ?? [];
                      if (users.length === 0) {
                        return (
                          <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
                            <Users className="h-4 w-4" />
                            <span>No users assigned to this role.</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-1 px-3 py-1.5">
                          {users.map((u: UserRoleNode) => (
                            <span key={u.id} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50">
                              <UserRound className="h-3 w-3 text-slate-400" />
                              <span className="max-w-[120px] truncate">{u.fullName || u.username}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Audit Note */}
                  <div className="border-b border-slate-200">
                    <div className={hdr}><span className={secTitle}>Audit Note</span></div>
                    <div className="px-3 py-1.5 space-y-1 text-[12px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>Created: <span className="font-medium text-slate-700">{fmtDate(selectedRole.createdAt)}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 text-slate-400" />
                        <span>Last updated: <span className="font-medium text-slate-700">{fmtDate(selectedRole.updatedAt)}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Admin warning */}
                  {isAdminLevel(selectedRole) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/50 border-b border-amber-100">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="text-[11px] text-amber-700">This role has admin-level access. Review assignments carefully.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
    </>}
  />
</div>
  );
}
