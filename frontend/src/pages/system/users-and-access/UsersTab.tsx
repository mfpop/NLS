import { useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Plus, Pencil, RefreshCw, Save, X, UserRound, Trash2, Loader2, ToggleLeft, ToggleRight, AlertTriangle, Shield, ShieldCheck, CheckCircle2 } from "lucide-react";
import { ToolbarButton, ToolbarDropdown } from "@/components/layout/PageToolbar";
import { useToolbar } from "./toolbarContext";
import { RecordListPanel, RecordListItem } from "@/components/layout/RecordListPanel";
import { ResizableSplitPane } from "@/components/layout/ResizableSplitPane";
import {
  ADMINISTRATIVE_DEPARTMENTS_QUERY,
  COMPANIES_LIST_QUERY,
  ROLES_QUERY,
  USER_PROFILES_QUERY,
  USER_ROLES_ALL_QUERY,
  USER_PERMISSIONS_QUERY,
  USERS_LIST_QUERY,
} from "@/graphql/administrationQueries";
import { ASSIGN_ROLE_TO_USER, CREATE_USER_PROFILE, REMOVE_ROLE_FROM_USER, UPDATE_USER_PROFILE, ACTIVATE_USER_PROFILE, DEACTIVATE_USER_PROFILE } from "@/graphql/administrationMutations";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { REFERENCE_OPTIONS_QUERY } from "@/hooks/useReferenceTables";

type ScopeLevel = "global" | "company" | "plant" | "department";
type PageMode = "view" | "editProfile" | "createProfile" | "assignRole";

interface UserProfileNode {
  id: string; userId: string; username: string; email: string; fullName: string;
  companyId?: string | null; companyName?: string | null;
  plantId?: string | null; plantName?: string | null;
  administrativeDepartmentId?: string | null; administrativeDepartmentName?: string | null;
  jobTitle?: string | null; phone?: string | null; isActive: boolean;
  lastLogin?: string | null; createdAt?: string; updatedAt?: string;
}
interface UserRoleNode {
  id: string; userProfileId: string; roleId: string; roleName: string;
  companyId?: string | null; companyName?: string | null;
  plantId?: string | null; plantName?: string | null;
  administrativeDepartmentId?: string | null; administrativeDepartmentName?: string | null;
  isActive: boolean;
}
interface PermissionNode { id: string; code: string; name: string; module: string; action: string; }
interface ReferenceOptionValue { id: string; code: string; name: string; isActive: boolean; metadata?: unknown; }
interface CompanyNode { id: string; name: string; }
interface PlantNode { id: string; name: string; companyId: string; }
interface DepartmentNode { id: string; name: string; companyId: string; plantId?: string | null; }
interface UserNode { id: string; username: string; fullName: string; }
interface ProfileFormState { userId: string; companyId: string; plantId: string; administrativeDepartmentId: string; jobTitle: string; phone: string; }
interface RoleFormState { roleId: string; companyId: string; plantId: string; administrativeDepartmentId: string; }

const emptyProfileForm: ProfileFormState = { userId: "", companyId: "", plantId: "", administrativeDepartmentId: "", jobTitle: "", phone: "" };
const emptyRoleForm: RoleFormState = { roleId: "", companyId: "", plantId: "", administrativeDepartmentId: "" };

function safeText(v: string | null | undefined): string { const s = v?.trim(); return s ? s : "—"; }
function asOptionalId(v: string): string | null { const s = v.trim(); return s ? s : null; }
function scopeLabel(scope: ScopeLevel): string { const m: Record<string, string> = { global: "Global", company: "Company", plant: "Plant", department: "Department" }; return m[scope] || scope; }
function scopeBadge(scope: ScopeLevel): string {
  const m: Record<ScopeLevel, string> = { global: "border-blue-400/60 text-primary", company: "border-indigo-400/60 text-primary", plant: "border-purple-400/60 text-accent-foreground", department: "border-cyan-400/60 text-cyan-600" };
  return m[scope];
}

function parseMeta(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") { try { return JSON.parse(value) as Record<string, unknown>; } catch { return null; } }
  return null;
}

function inferScope(code: string, name: string, metadata: unknown): ScopeLevel {
  const meta = parseMeta(metadata);
  const scopeStr = String(meta?.scope ?? meta?.level ?? "").toLowerCase();
  if (["company", "site"].includes(scopeStr)) return "company";
  if (["plant", "factory"].includes(scopeStr)) return "plant";
  if (["department", "dept"].includes(scopeStr)) return "department";
  const probe = `${code} ${name}`.toLowerCase();
  if (probe.includes("department") || probe.includes("dept")) return "department";
  if (probe.includes("plant") || probe.includes("factory")) return "plant";
  if (probe.includes("company")) return "company";
  return "global";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

// ── Main Component ──
export function UsersTab() {
  const [mode, setMode] = useState<PageMode>("view");
  const [selectedUserProfileId, setSelectedUserProfileId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const roleFormRef = useRef<RoleFormState>(emptyRoleForm);
  roleFormRef.current = roleForm;

  const { data: profileData, loading: loadingProfiles, refetch: refetchProfiles } = useQuery<{ userProfiles: UserProfileNode[] }>(
    USER_PROFILES_QUERY,
    { variables: { search: userSearch || undefined, isActive: statusFilter === "all" ? undefined : statusFilter === "active" }, fetchPolicy: "cache-and-network" }
  );
  const { data: roleData, refetch: refetchRoles } = useQuery<{ roles: Array<{ id: string; code: string; name: string; isSystemRole: boolean; isActive: boolean; permissions: Array<{ module: string; action: string }> }> }>(ROLES_QUERY, { variables: { isActive: true }, fetchPolicy: "cache-and-network" });
  const { data: assignmentData, refetch: refetchAssignments } = useQuery<{ userRoles: UserRoleNode[] }>(USER_ROLES_ALL_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: usersData } = useQuery<{ usersList: UserNode[] }>(USERS_LIST_QUERY);
  const { data: companiesData } = useQuery<{ companies: CompanyNode[] }>(COMPANIES_LIST_QUERY);
  const activeCompanyId = profileForm.companyId || roleForm.companyId || undefined;
  const activePlantId = profileForm.plantId || roleForm.plantId || undefined;
  const { data: plantsData } = useQuery<{ plants: PlantNode[] }>(PLANTS_QUERY, { variables: { companyId: activeCompanyId }, skip: !activeCompanyId });
  const { data: departmentsData } = useQuery<{ administrativeDepartments: DepartmentNode[] }>(ADMINISTRATIVE_DEPARTMENTS_QUERY, { variables: { companyId: activeCompanyId, plantId: activePlantId, isActive: true }, skip: !activeCompanyId });
  const { data: referenceData } = useQuery<{ referenceOptions: Array<{ categoryCode: string; values: ReferenceOptionValue[] }> }>(REFERENCE_OPTIONS_QUERY, { variables: { types: ["role"] }, fetchPolicy: "cache-and-network" });
  const [createUserProfile] = useMutation<any>(CREATE_USER_PROFILE);
  const [updateUserProfile] = useMutation<any>(UPDATE_USER_PROFILE);
  const [assignRoleToUser] = useMutation<any>(ASSIGN_ROLE_TO_USER);
  const [removeRoleFromUser] = useMutation(REMOVE_ROLE_FROM_USER);
  const [activateUserProfileMut] = useMutation(ACTIVATE_USER_PROFILE);
  const [deactivateUserProfileMut] = useMutation(DEACTIVATE_USER_PROFILE);

  const { data: permsData, loading: permsLoading } = useQuery<{ userPermissions: PermissionNode[] }>(USER_PERMISSIONS_QUERY, { variables: { userProfileId: selectedUserProfileId }, skip: !selectedUserProfileId, fetchPolicy: "cache-and-network" });

  const permissions = permsData?.userPermissions ?? [];
  const users = profileData?.userProfiles ?? [];
  const assignments = (assignmentData?.userRoles ?? []).filter((a) => a.isActive);
  const companies = companiesData?.companies ?? [];
  const plants = plantsData?.plants ?? [];
  const departments = departmentsData?.administrativeDepartments ?? [];
  const selectableUsers = usersData?.usersList ?? [];

  const refRoleValues = useMemo(() => referenceData?.referenceOptions?.find((opt) => opt.categoryCode === "role")?.values?.filter((v) => v.isActive) ?? [], [referenceData]);

  const roleCatalog = useMemo(() => {
    return (roleData?.roles ?? []).filter((r) => r.isActive).map((role) => {
      const refRole = refRoleValues.find((v) => v.code.toLowerCase() === role.code.toLowerCase()) ?? null;
      return { id: role.id, label: refRole?.name || role.name, isSystemRole: role.isSystemRole, scope: inferScope(role.code, role.name, refRole?.metadata) };
    });
  }, [roleData, refRoleValues]);

  const roleLabelById = useMemo(() => { const m = new Map<string, string>(); roleCatalog.forEach((r) => m.set(r.id, r.label)); return m; }, [roleCatalog]);
  const roleScopeById = useMemo(() => { const m = new Map<string, ScopeLevel>(); roleCatalog.forEach((r) => m.set(r.id, r.scope)); return m; }, [roleCatalog]);
  const roleIsSystemById = useMemo(() => { const m = new Map<string, boolean>(); roleCatalog.forEach((r) => m.set(r.id, r.isSystemRole)); return m; }, [roleCatalog]);

  const assignmentsByProfile = useMemo(() => {
    const m = new Map<string, UserRoleNode[]>(); assignments.forEach((a) => { const c = m.get(a.userProfileId) ?? []; c.push(a); m.set(a.userProfileId, c); }); return m;
  }, [assignments]);

  const usersView = useMemo(() => users.map((u) => {
    const userAssignments = assignmentsByProfile.get(u.id) ?? [];
    const primary = userAssignments.find((a) => !a.companyId && !a.plantId && !a.administrativeDepartmentId) ?? userAssignments[0] ?? null;
    return { ...u, primaryRole: primary ? (roleLabelById.get(primary.roleId) || primary.roleName) : "No role" };
  }), [assignmentsByProfile, roleLabelById, users]);

  const roleFilterOptions = useMemo(() => {
    const names = Array.from(new Set(usersView.map((u) => u.primaryRole).filter((n) => n !== "No role"))).sort();
    return [{ value: "all", label: "All roles" }, ...names.map((name) => ({ value: name, label: name }))];
  }, [usersView]);

  const visibleUsers = useMemo(() => roleFilter === "all" ? usersView : usersView.filter((u) => u.primaryRole === roleFilter), [roleFilter, usersView]);
  const selectedProfile = useMemo(() => users.find((u) => u.id === selectedUserProfileId) ?? null, [users, selectedUserProfileId]);
  const selectedAssignments = useMemo(() => selectedUserProfileId ? assignmentsByProfile.get(selectedUserProfileId) ?? [] : [], [assignmentsByProfile, selectedUserProfileId]);
  const selectedPrimaryRoleLabel = useMemo(() => {
    const primary = selectedAssignments.find((a) => !a.companyId && !a.plantId && !a.administrativeDepartmentId) ?? selectedAssignments[0] ?? null;
    return primary ? (roleLabelById.get(primary.roleId) || primary.roleName) : "No role";
  }, [roleLabelById, selectedAssignments]);

  // Derive access groups from role assignments (unique scope combinations)
  const accessGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: Array<{
      id: string; name: string; scope: ScopeLevel; roleCount: number; roleNames: string[];
      companyName: string | null; plantName: string | null; deptName: string | null;
    }> = [];
    selectedAssignments.forEach((a) => {
      const scope: ScopeLevel = a.administrativeDepartmentId ? "department" : a.plantId ? "plant" : a.companyId ? "company" : "global";
      const key = `${scope}|${a.companyId ?? ""}|${a.plantId ?? ""}|${a.administrativeDepartmentId ?? ""}`;
      if (seen.has(key)) {
        const existing = groups.find((g) => {
          if (g.scope !== scope) return false;
          if (scope === "global") return true;
          return g.companyName === a.companyName && g.plantName === a.plantName && g.deptName === a.administrativeDepartmentName;
        });
        if (existing) { existing.roleCount++; existing.roleNames.push(roleLabelById.get(a.roleId) || a.roleName); }
        return;
      }
      seen.add(key);
      groups.push({
        id: key, scope,
        name: scope === "global" ? "Global Access" : scope === "company" ? (a.companyName ?? "Company") : scope === "plant" ? (a.plantName ?? "Plant") : (a.administrativeDepartmentName ?? "Department"),
        roleCount: 1, roleNames: [roleLabelById.get(a.roleId) || a.roleName],
        companyName: a.companyName ?? null, plantName: a.plantName ?? null, deptName: a.administrativeDepartmentName ?? null,
      });
    });
    return groups;
  }, [selectedAssignments, roleLabelById]);

  // Group permissions by module for the summary
  const permsByModule = useMemo(() => {
    const m = new Map<string, Set<string>>();
    permissions.forEach((p) => {
      if (!m.has(p.module)) m.set(p.module, new Set());
      m.get(p.module)!.add(p.action);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const hasAdminAccess = useMemo(() => permissions.some((p) => p.action === "admin" || p.action === "manage"), [permissions]);

  const profileBaseline = useMemo<ProfileFormState>(() => {
    if (!selectedProfile) return emptyProfileForm;
    return { userId: selectedProfile.userId, companyId: selectedProfile.companyId || "", plantId: selectedProfile.plantId || "", administrativeDepartmentId: selectedProfile.administrativeDepartmentId || "", jobTitle: selectedProfile.jobTitle || "", phone: selectedProfile.phone || "" };
  }, [selectedProfile]);

  const profileMissing = useMemo(() => { const m: string[] = []; if (!profileForm.userId) m.push("userId"); if (!profileForm.companyId) m.push("companyId"); return m; }, [profileForm]);
  const profileDirty = useMemo(() => profileForm.userId !== profileBaseline.userId || profileForm.companyId !== profileBaseline.companyId || profileForm.plantId !== profileBaseline.plantId || profileForm.administrativeDepartmentId !== profileBaseline.administrativeDepartmentId || profileForm.jobTitle !== profileBaseline.jobTitle || profileForm.phone !== profileBaseline.phone, [profileBaseline, profileForm]);
  const selectedRoleScope: ScopeLevel | null = roleScopeById.get(roleForm.roleId) ?? null;

  const filteredDepartments = useMemo(() => departments.filter((d) => {
    if (roleForm.companyId && d.companyId !== roleForm.companyId) return false;
    if (roleForm.plantId && d.plantId && d.plantId !== roleForm.plantId) return false;
    return true;
  }), [departments, roleForm]);

  const accessSummary = useMemo(() => {
    let global = 0, company = 0, plant = 0, department = 0;
    selectedAssignments.forEach((a) => { if (a.administrativeDepartmentId) department++; else if (a.plantId) plant++; else if (a.companyId) company++; else global++; });
    return { global, company, plant, department, total: selectedAssignments.length };
  }, [selectedAssignments]);

  // Auto-select first visible user on load and when filters remove the currently selected user
  useEffect(() => {
    if (visibleUsers.length > 0) {
      if (!selectedUserProfileId || !visibleUsers.some((u) => u.id === selectedUserProfileId)) {
        setSelectedUserProfileId(visibleUsers[0].id);
      }
    }
  }, [visibleUsers]);

  // Capability flags (backend-driven in future)
  const capabilities = useMemo(() => ({
    canEditUser: true, canAssignRole: true, canDeactivateUser: true, canCreateUser: true,
  }), []);

  const resetRoleForm = useCallback(() => { setRoleForm(emptyRoleForm); setRoleErrors({}); }, []);
  const onSelectUser = useCallback((id: string) => { setSelectedUserProfileId(id); setMode("view"); setProfileError(null); setProfileTouched({}); resetRoleForm(); setDeactivateConfirmId(null); setRemoveConfirmId(null); }, [resetRoleForm]);
  const startCreateProfile = useCallback(() => { setSelectedUserProfileId(null); setMode("createProfile"); setProfileForm(emptyProfileForm); setProfileTouched({}); setProfileError(null); resetRoleForm(); }, [resetRoleForm]);
  const startEditProfile = useCallback(() => { if (!selectedProfile) return; setMode("editProfile"); setProfileForm(profileBaseline); setProfileTouched({}); setProfileError(null); resetRoleForm(); }, [selectedProfile, profileBaseline, resetRoleForm]);
  const startAssignRole = useCallback(() => { if (!selectedProfile) return; setMode("assignRole"); setProfileError(null); resetRoleForm(); }, [selectedProfile, resetRoleForm]);
  const cancelMode = useCallback(() => { setMode("view"); setProfileTouched({}); setProfileError(null); setDeactivateConfirmId(null); setRemoveConfirmId(null); if (selectedProfile) setProfileForm(profileBaseline); else setProfileForm(emptyProfileForm); resetRoleForm(); }, [selectedProfile, profileBaseline, resetRoleForm]);
  const refreshAll = useCallback(async () => { await Promise.all([refetchProfiles(), refetchRoles(), refetchAssignments()]); }, [refetchProfiles, refetchRoles, refetchAssignments]);
  const confirmRemoveRole = useCallback((id: string) => setRemoveConfirmId(id), []);
  const cancelRemoveRole = useCallback(() => setRemoveConfirmId(null), []);
  const removeRole = useCallback(async () => {
    if (!removeConfirmId) return;
    try {
      const res = await removeRoleFromUser({ variables: { assignmentId: removeConfirmId } });
      const payload = (res.data as { removeRoleFromUser?: { errors?: Array<{ message: string }> } } | undefined)?.removeRoleFromUser;
      if (payload?.errors?.length) {
        setRoleErrors({ form: payload.errors.map((e) => e.message).join(" ") });
        setRemoveConfirmId(null);
        return;
      }
      await refetchAssignments();
      setRemoveConfirmId(null);
    } catch (error) { setRoleErrors({ form: error instanceof Error ? error.message : "Failed to remove role." }); setRemoveConfirmId(null); }
  }, [removeConfirmId, removeRoleFromUser, refetchAssignments]);
  const assignRole = useCallback(async () => {
    const rf = roleFormRef.current;
    const scope = roleScopeById.get(rf.roleId) ?? null;
    const errors: Record<string, string> = {};
    if (!selectedUserProfileId) errors.roleId = "Select a user and role.";
    if (!rf.roleId) errors.roleId = "Select a role.";
    if (scope && scope !== "global") { if (!rf.companyId) errors.companyId = "Select company for this scope."; }
    if (scope === "plant" || scope === "department") { if (!rf.plantId) errors.plantId = "Select plant for this scope."; }
    if (scope === "department") { if (!rf.administrativeDepartmentId) errors.administrativeDepartmentId = "Select department for this scope."; }
    setRoleErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsAssigningRole(true);
    try {
      const result = await assignRoleToUser({ variables: { input: { userProfileId: selectedUserProfileId, roleId: rf.roleId, companyId: asOptionalId(rf.companyId), plantId: scope === "plant" || scope === "department" ? asOptionalId(rf.plantId) : null, administrativeDepartmentId: scope === "department" ? asOptionalId(rf.administrativeDepartmentId) : null } } });
      const payload = result.data?.assignRoleToUser;
      if (payload?.errors?.length) { setRoleErrors({ form: payload.errors.map((e: { message: string }) => e.message).join(" ") }); return; }
      await refetchAssignments(); setMode("view"); resetRoleForm();
    } catch (error) { setRoleErrors({ form: error instanceof Error ? error.message : "Failed to assign role." }); }
    finally { setIsAssigningRole(false); }
  }, [selectedUserProfileId, roleScopeById, assignRoleToUser, refetchAssignments, resetRoleForm]);

  const onProfileField = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "companyId") { next.plantId = ""; next.administrativeDepartmentId = ""; }
      if (field === "plantId") next.administrativeDepartmentId = "";
      return next;
    });
  };

  const roleFormValidation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!selectedUserProfileId) errors.roleId = "Select a user and role.";
    if (!roleForm.roleId) errors.roleId = "Select a role.";
    if (selectedRoleScope && selectedRoleScope !== "global") { if (!roleForm.companyId) errors.companyId = "Select company for this scope."; }
    if (selectedRoleScope === "plant" || selectedRoleScope === "department") { if (!roleForm.plantId) errors.plantId = "Select plant for this scope."; }
    if (selectedRoleScope === "department") { if (!roleForm.administrativeDepartmentId) errors.administrativeDepartmentId = "Select department for this scope."; }
    return errors;
  }, [selectedUserProfileId, roleForm, selectedRoleScope]);

  // Merge real-time validation (roleFormValidation) with submit/backend errors (roleErrors)
  // so the user can see why the Save Assignment button is disabled
  const roleDisplayErrors = useMemo<Record<string, string>>(() => {
    const merged: Record<string, string> = {};
    // Only show validation errors once user has selected a role (started interacting)
    if (roleForm.roleId) {
      Object.assign(merged, roleFormValidation);
    }
    // Submit/backend errors override validation errors
    Object.assign(merged, roleErrors);
    return merged;
  }, [roleForm.roleId, roleFormValidation, roleErrors]);

  const saveProfile = useCallback(async () => {
    setProfileTouched({ userId: true, companyId: true });
    if (profileMissing.length > 0) { setProfileError("Complete required fields: User and Company."); return; }
    setIsSavingProfile(true); setProfileError(null);
    try {
      if (mode === "createProfile") {
        const result = await createUserProfile({ variables: { input: { userId: profileForm.userId, companyId: asOptionalId(profileForm.companyId), plantId: asOptionalId(profileForm.plantId), administrativeDepartmentId: asOptionalId(profileForm.administrativeDepartmentId), jobTitle: profileForm.jobTitle || "", phone: profileForm.phone || "" } } });
        const payload = result.data?.createUserProfile;
        if (payload?.errors?.length) { setProfileError(payload.errors.map((e: { message: string }) => e.message).join(" ")); return; }
        const createdId = payload?.userProfile?.id || null;
        await refetchProfiles();
        if (createdId) setSelectedUserProfileId(createdId);
      } else if (selectedProfile) {
        const result = await updateUserProfile({ variables: { id: selectedProfile.id, input: { companyId: asOptionalId(profileForm.companyId), plantId: asOptionalId(profileForm.plantId), administrativeDepartmentId: asOptionalId(profileForm.administrativeDepartmentId), jobTitle: profileForm.jobTitle || "", phone: profileForm.phone || "" } } });
        const payload = result.data?.updateUserProfile;
        if (payload?.errors?.length) { setProfileError(payload.errors.map((e: { message: string }) => e.message).join(" ")); return; }
        await refetchProfiles();
      }
      setMode("view"); setProfileTouched({});
    } catch (error) { setProfileError(error instanceof Error ? error.message : "Failed to save profile."); }
    finally { setIsSavingProfile(false); }
  }, [profileForm, profileMissing, mode, selectedProfile, createUserProfile, updateUserProfile, refetchProfiles]);



  const confirmDeactivate = useCallback(async () => {
    if (!selectedProfile || !deactivateConfirmId) return;
    setIsDeactivating(true);
    const newActive = !selectedProfile.isActive;
    const action = newActive ? activateUserProfileMut : deactivateUserProfileMut;
    try {
      await action({ variables: { id: selectedProfile.id } });
      await refetchProfiles();
      setDeactivateConfirmId(null);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : `Failed to ${newActive ? "activate" : "deactivate"} user.`);
      setDeactivateConfirmId(null);
    } finally { setIsDeactivating(false); }
  }, [selectedProfile, deactivateConfirmId, activateUserProfileMut, deactivateUserProfileMut, refetchProfiles]);

  const cancelDeactivate = useCallback(() => setDeactivateConfirmId(null), []);

  const { setToolbar, setFooter } = useToolbar();

  const isProfileMode = mode === "editProfile" || mode === "createProfile";
  const isAssignMode = mode === "assignRole";
  const profileSaveDisabled = isSavingProfile || profileMissing.length > 0 || (mode === "editProfile" && !profileDirty);
  const roleAssignDisabled = isAssigningRole || Object.keys(roleFormValidation).length > 0;
  const secHdr = "h-8 border-b border-border bg-muted px-3 flex items-center";
  const secTitle = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  const kpiLabel = "text-[11px] text-muted-foreground";
  const kpiValue = "text-lg font-semibold text-foreground leading-none";
  const fieldLabel = "text-[11px] uppercase tracking-wide text-muted-foreground";

  const toolbarActions = useMemo(() => {
    if (isProfileMode) return (<><ToolbarButton icon={isSavingProfile ? Loader2 : Save as any} label={isSavingProfile ? "Saving..." : "Save Profile"} onClick={saveProfile} disabled={profileSaveDisabled} variant="edit" /><ToolbarButton icon={X} label="Cancel" onClick={cancelMode} variant="danger" /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} variant="neutral" /></>);
    if (isAssignMode) return (<><ToolbarButton icon={Plus} label={isAssigningRole ? "Saving..." : "Save Assignment"} onClick={assignRole} disabled={roleAssignDisabled} variant="edit" /><ToolbarButton icon={X} label="Cancel" onClick={cancelMode} variant="danger" /><ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} variant="neutral" /></>);
    return (<>
      {capabilities.canEditUser && <ToolbarButton icon={Pencil} label="Edit Profile" onClick={startEditProfile} disabled={!selectedProfile || mode !== "view"} variant="edit" />}
      {capabilities.canAssignRole && <ToolbarButton icon={Plus} label="Assign Role" onClick={startAssignRole} disabled={!selectedProfile || mode !== "view"} variant="create" />}
      <span className="mx-0.5 h-5 w-px shrink-0 bg-muted/80" />
      {capabilities.canDeactivateUser && (
        deactivateConfirmId ? (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-danger font-medium">{selectedProfile?.isActive ? "Deactivate" : "Activate"}?</span>
            <button type="button" onClick={confirmDeactivate} disabled={isDeactivating} className="inline-flex h-7 items-center rounded bg-danger px-2 text-[10px] font-semibold text-white hover:bg-danger/80 disabled:opacity-60">{isDeactivating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}Yes</button>
            <button type="button" onClick={cancelDeactivate} className="inline-flex h-7 items-center rounded border border-border bg-background px-2 text-[10px] text-muted-foreground hover:bg-muted">No</button>
          </div>
        ) : (
          <ToolbarButton icon={selectedProfile?.isActive ? ToggleRight : ToggleLeft} label={selectedProfile?.isActive ? "Deactivate" : "Activate"} onClick={() => { if (selectedProfile) setDeactivateConfirmId(selectedProfile.id); }} disabled={!selectedProfile || mode !== "view"} variant={selectedProfile?.isActive ? "danger" : "warning"} />
        )
      )}
      <span className="mx-0.5 h-5 w-px shrink-0 bg-muted/80" />
      {capabilities.canCreateUser && <ToolbarButton icon={Plus} label="New Profile" onClick={startCreateProfile} variant="create" />}
      <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} disabled={loadingProfiles && !profileData} variant="neutral" />
    </>);
  }, [isProfileMode, isAssignMode, selectedProfile, mode, deactivateConfirmId, loadingProfiles, profileData, profileSaveDisabled, roleAssignDisabled, isSavingProfile, isAssigningRole, isDeactivating, saveProfile, cancelMode, startEditProfile, startAssignRole, startCreateProfile, refreshAll, confirmDeactivate, cancelDeactivate, assignRole]);

  const toolbarFilters = useMemo(() => (
    <div className="flex items-center gap-3"><ToolbarDropdown value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All status" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} className="w-36" /><ToolbarDropdown value={roleFilter} onChange={setRoleFilter} options={roleFilterOptions} className="w-40" /></div>
  ), [statusFilter, roleFilter, roleFilterOptions]);

  // Refs hold latest JSX to avoid React-element deps in effects
  const toolbarActionsRef = useRef<ReactNode>(null);
  toolbarActionsRef.current = toolbarActions;
  const toolbarFiltersRef = useRef<ReactNode>(null);
  toolbarFiltersRef.current = toolbarFilters;

  // Report toolbar and footer to parent AppPageLayout
  useEffect(() => {
    setToolbar({
      searchValue: userSearch,
      onSearchChange: setUserSearch,
      searchPlaceholder: "Search users",
      leftWidthClass: undefined,
      filters: toolbarFiltersRef.current,
      actions: <div className="flex items-center gap-2">{toolbarActionsRef.current}</div>,
    });
    setFooter(
      selectedProfile ? (
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="text-muted-foreground">{safeText(selectedProfile.fullName || selectedProfile.username)}</span>
          <span className="h-4 w-px bg-muted/80" />
          <span className={selectedProfile.isActive ? "text-success" : "text-muted-foreground/60"}>{selectedProfile.isActive ? "Active" : "Inactive"}</span>
        </span>
      ) : null
    );
    return () => { setToolbar(null); setFooter(null); };
  }, [userSearch, selectedProfile?.id, selectedProfile?.isActive, mode, deactivateConfirmId, isSavingProfile, isAssigningRole, isDeactivating, statusFilter, roleFilter]);

  return (
      <div className="h-full min-h-0 overflow-hidden">
        <ResizableSplitPane
          left={<RecordListPanel title="Users" count={visibleUsers.length}
              autoPageSize
              rowHeight={56}
              items={visibleUsers}
              renderItem={(user) => {
                const sel = user.id === selectedUserProfileId;
                return (
                  <RecordListItem
                    key={user.id}
                    active={sel}
                    onClick={() => onSelectUser(user.id)}
                    title={
                      <span className="flex items-center justify-between gap-1.5">
                        <span className={`truncate ${sel ? "font-semibold" : "font-medium"}`}>{user.fullName || user.username}</span>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${user.isActive ? "bg-success" : "bg-muted-foreground/30"}`} />
                      </span>
                    }
                    subtitle={
                      <span className="text-xs text-muted-foreground">
                        <span>{safeText(user.username || user.email)}</span>
                        <span className="mx-1 text-muted-foreground/60">·</span>
                        <span className="text-primary">{safeText(user.primaryRole)}</span>
                      </span>
                    }
                  />
                );
              }}
              emptyState={
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
                  <UserRound className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                  <span className="text-sm font-medium text-muted-foreground">{userSearch || statusFilter !== "all" || roleFilter !== "all" ? "No users match filters" : "No user profiles yet"}</span>
                </div>
              }
            />
          }
          storageKey="lmd:users-split"
          right={<>
            {!selectedProfile && mode !== "createProfile" ? (
              <div className="flex h-full items-center justify-center px-8">
                <div className="max-w-lg text-center">
                  <UserRound className="mx-auto h-8 w-8 text-primary" />
                  <h3 className="mt-3 text-base font-semibold text-foreground">Select a user to view profile and access</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Choose a user from the list, or create a new profile.</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                {/* ── User Summary Strip ── */}
                <div className={`shrink-0 border-b border-border ${isProfileMode ? "px-4 h-14 flex items-center" : "px-4 py-2.5"}`}>
                  {isProfileMode ? (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{safeText(selectedProfile?.fullName || "New Profile")}</span>
                        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${selectedProfile?.isActive !== false ? "border-emerald-400/60 text-success bg-success/10" : "border-border/60 text-muted-foreground bg-muted"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${selectedProfile?.isActive !== false ? "bg-success" : "bg-muted-foreground/40"}`} />
                          {selectedProfile?.isActive !== false ? "Active" : "Inactive"}
                        </span>
                        <span className="inline-flex rounded border border-blue-400/50 px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/10">{safeText(selectedPrimaryRoleLabel)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-[11px] text-muted-foreground mt-0.5">
                        {selectedProfile?.companyName && <span><span className="font-medium text-muted-foreground">Company:</span> {safeText(selectedProfile.companyName)}</span>}
                        {selectedProfile?.plantName && <span><span className="font-medium text-muted-foreground">Plant:</span> {safeText(selectedProfile.plantName)}</span>}
                        {selectedProfile?.administrativeDepartmentName && <span><span className="font-medium text-muted-foreground">Dept:</span> {safeText(selectedProfile.administrativeDepartmentName)}</span>}
                        {selectedProfile?.jobTitle && <span><span className="font-medium text-muted-foreground">Title:</span> {safeText(selectedProfile.jobTitle)}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-foreground">{safeText(selectedProfile?.fullName || "")}</h2>
                          <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] ${selectedProfile?.isActive !== false ? "border-emerald-400/60 text-success bg-success/10" : "border-border/60 text-muted-foreground bg-muted"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${selectedProfile?.isActive !== false ? "bg-success" : "bg-muted-foreground/40"}`} />
                            {selectedProfile?.isActive !== false ? "Active" : "Inactive"}
                          </span>
                          <span className="inline-flex rounded border border-blue-400/50 px-1.5 py-0.5 text-[11px] font-medium text-primary bg-primary/10">{safeText(selectedPrimaryRoleLabel)}</span>
                        </div>
                        <div className="mt-0.5 text-[12px] text-muted-foreground">{selectedProfile ? `${safeText(selectedProfile.username)} / ${safeText(selectedProfile.email)}` : "New user profile"}</div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                          {selectedProfile?.companyName && <span><span className="font-medium text-muted-foreground">Company:</span> {safeText(selectedProfile.companyName)}</span>}
                          {selectedProfile?.plantName && <span><span className="font-medium text-muted-foreground">Plant:</span> {safeText(selectedProfile.plantName)}</span>}
                          {selectedProfile?.administrativeDepartmentName && <span><span className="font-medium text-muted-foreground">Dept:</span> {safeText(selectedProfile.administrativeDepartmentName)}</span>}
                          {selectedProfile?.jobTitle && <span><span className="font-medium text-muted-foreground">Title:</span> {safeText(selectedProfile.jobTitle)}</span>}
                          {selectedProfile?.lastLogin && <span><span className="font-medium text-muted-foreground">Last login:</span> {fmtDate(selectedProfile.lastLogin)}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isProfileMode ? (
                  <div className="flex-1 min-h-0 grid grid-cols-[55%_45%] divide-x divide-border overflow-hidden bg-muted">
                    {/* ── LEFT EDIT COLUMN: Compact Profile Form ── */}
                    <div className="overflow-y-auto">
                      <div className="border-b border-border">
                        <div className={secHdr}><span className={secTitle}>Profile</span></div>
                        {profileError && <p className="px-3 text-[11px] text-danger">{profileError}</p>}
                        <div className="divide-y divide-border/50">
                          <div className="grid grid-cols-[120px_1fr] items-center gap-3 min-h-9 px-3">
                            <label className={fieldLabel}>User *</label>
                            <div>
                              <select value={profileForm.userId} onChange={(e) => onProfileField("userId", e.target.value)} disabled={mode !== "createProfile"}
                                className={`h-7 w-full border bg-background px-2 text-xs outline-none ${profileTouched.userId && !profileForm.userId ? "border-red-400" : "border-border"} ${mode !== "createProfile" ? "opacity-70" : ""}`}>
                                <option value="">Select user</option>{selectableUsers.map((u: UserNode) => (<option key={u.id} value={u.id}>{u.fullName || u.username} ({u.username})</option>))}
                              </select>
                              {profileTouched.userId && !profileForm.userId && <p className="text-[10px] text-danger">Required</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-3 min-h-9 px-3">
                            <label className={fieldLabel}>Company *</label>
                            <div>
                              <select value={profileForm.companyId} onChange={(e) => onProfileField("companyId", e.target.value)}
                                className={`h-7 w-full border bg-background px-2 text-xs outline-none ${profileTouched.companyId && !profileForm.companyId ? "border-red-400" : "border-border"}`}>
                                <option value="">Select company</option>{companies.map((c: CompanyNode) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                              </select>
                              {profileTouched.companyId && !profileForm.companyId && <p className="text-[10px] text-danger">Required</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-3 min-h-9 px-3">
                            <label className={fieldLabel}>Plant</label>
                            <select value={profileForm.plantId} onChange={(e) => onProfileField("plantId", e.target.value)} className="h-7 w-full border border-border bg-background px-2 text-xs outline-none">
                              <option value="">Select plant</option>{plants.filter((p: PlantNode) => !profileForm.companyId || p.companyId === profileForm.companyId).map((p: PlantNode) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                            </select>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-3 min-h-9 px-3">
                            <label className={fieldLabel}>Dept</label>
                            <select value={profileForm.administrativeDepartmentId} onChange={(e) => onProfileField("administrativeDepartmentId", e.target.value)} className="h-7 w-full border border-border bg-background px-2 text-xs outline-none">
                              <option value="">Select department</option>{departments.map((d: DepartmentNode) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                            </select>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-3 min-h-9 px-3">
                            <label className={fieldLabel}>Job Title</label>
                            <input type="text" value={profileForm.jobTitle} onChange={(e) => onProfileField("jobTitle", e.target.value)} className="h-7 w-full border border-border bg-background px-2 text-xs outline-none" />
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-3 min-h-9 px-3">
                            <label className={fieldLabel}>Phone</label>
                            <input type="text" value={profileForm.phone} onChange={(e) => onProfileField("phone", e.target.value)} className="h-7 w-full border border-border bg-background px-2 text-xs outline-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* ── RIGHT EDIT COLUMN: Compact Access Context ── */}
                    <div className="overflow-y-auto">
                      {/* Access Overview Mini Strip */}
                      <div className="border-b border-border">
                        <div className={`h-7 border-b border-border bg-muted px-3 flex items-center`}><span className={secTitle}>Access Overview</span></div>
                        <div className="flex items-stretch divide-x divide-border">
                          <div className="flex flex-1 flex-col items-center justify-center gap-0 py-2">
                            <span className="text-sm font-semibold text-foreground leading-none">{accessSummary.total}</span>
                            <span className={kpiLabel}>Roles</span>
                          </div>
                          <div className="flex flex-1 flex-col items-center justify-center gap-0 py-2">
                            <span className="text-sm font-semibold text-foreground leading-none">{accessSummary.global}</span>
                            <span className={kpiLabel}>Global</span>
                          </div>
                          <div className="flex flex-1 flex-col items-center justify-center gap-0 py-2">
                            <span className="text-sm font-semibold text-foreground leading-none">{accessSummary.company + accessSummary.plant + accessSummary.department}</span>
                            <span className={kpiLabel}>Scoped</span>
                          </div>
                          <div className="flex flex-1 flex-col items-center justify-center gap-0 py-2">
                            <span className="text-sm font-semibold text-foreground leading-none">{accessGroups.length}</span>
                            <span className={kpiLabel}>Groups</span>
                          </div>
                        </div>
                      </div>
                      {/* Role Assignments Compact (max 3 rows) */}
                      <div className="border-b border-border">
                        <div className={`h-7 border-b border-border bg-muted px-3 flex items-center`}><span className={secTitle}>Role Assignments</span></div>
                        {selectedAssignments.length === 0 ? (
                          <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-muted-foreground/60">
                            <Shield className="h-3.5 w-3.5" />
                            <span>No role assignments</span>
                          </div>
                        ) : (
                          <div className="divide-y divide-border/50">
                            {selectedAssignments.slice(0, 3).map((a: UserRoleNode) => {
                              const scope: ScopeLevel = a.administrativeDepartmentId ? "department" : a.plantId ? "plant" : a.companyId ? "company" : "global";
                              return (
                                <div key={a.id} className="flex items-center gap-2 px-3 py-1 min-h-[28px]">
                                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{roleLabelById.get(a.roleId) || a.roleName}</span>
                                  <span className={`inline-flex shrink-0 rounded border px-1 py-0.5 text-[10px] ${scopeBadge(scope)}`}>{scopeLabel(scope)}</span>
                                </div>
                              );
                            })}
                            {selectedAssignments.length > 3 && (
                              <div className="px-3 py-1 text-[10px] text-primary font-medium">+{selectedAssignments.length - 3} more roles</div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Access Groups Compact (max 3 rows) */}
                      {accessGroups.length > 0 && (
                        <div className="border-b border-border">
                          <div className={`h-7 border-b border-border bg-muted px-3 flex items-center`}><span className={secTitle}>Access Groups</span></div>
                          <div className="divide-y divide-border/50">
                            {accessGroups.slice(0, 3).map((g) => (
                              <div key={g.id} className="flex items-center gap-2 px-3 py-1 min-h-[28px]">
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                                  <Shield className="h-3 w-3 text-muted-foreground/60" />
                                </div>
                                <span className="truncate text-[11px] text-muted-foreground">{g.name}</span>
                                <span className={`inline-flex shrink-0 rounded border px-1 py-0.5 text-[10px] ${scopeBadge(g.scope)}`}>{scopeLabel(g.scope)}</span>
                              </div>
                            ))}
                            {accessGroups.length > 3 && (
                              <div className="px-3 py-1 text-[10px] text-primary font-medium">+{accessGroups.length - 3} more groups</div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Account State */}
                      <div className="px-3 py-1.5">
                        <div className={`h-7 border-b border-border bg-muted px-3 flex items-center -mx-3 -mt-1.5 mb-1`}><span className={secTitle}>Account State</span></div>
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <span className={`font-medium ${selectedProfile?.isActive !== false ? "text-success" : "text-muted-foreground"}`}>{selectedProfile?.isActive !== false ? "Active" : "Inactive"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Last login</span>
                            <span className="font-medium text-muted-foreground">{fmtDate(selectedProfile?.lastLogin)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Created</span>
                            <span className="font-medium text-muted-foreground">{fmtDate(selectedProfile?.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Updated</span>
                            <span className="font-medium text-muted-foreground">{fmtDate(selectedProfile?.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {/* ── Access Overview KPIs ── */}
                    <div className="border-b border-border">
                      <div className={secHdr}><span className={secTitle}>Access Overview</span></div>
                      <div className="flex items-stretch divide-x divide-border">
                        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3">
                          <span className={kpiValue}>{accessSummary.total}</span>
                          <span className={kpiLabel}>Roles</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3">
                          <span className={kpiValue}>{accessSummary.global}</span>
                          <span className={kpiLabel}>Global</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3">
                          <span className={kpiValue}>{accessSummary.company + accessSummary.plant + accessSummary.department}</span>
                          <span className={kpiLabel}>Scoped</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3">
                          <span className={kpiValue}>{accessGroups.length}</span>
                          <span className={kpiLabel}>Groups</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3">
                          <span className={`text-lg font-semibold leading-none ${selectedProfile?.isActive !== false ? "text-success" : "text-muted-foreground/60"}`}>
                            {selectedProfile?.isActive !== false ? "Active" : "Inactive"}
                          </span>
                          <span className={kpiLabel}>Account</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Role Assignments ── */}
                    <div className="border-b border-border">
                      <div className={secHdr}><span className={secTitle}>Role Assignments</span></div>
                      {isAssignMode && (
                        <div className="border-b border-border bg-muted/50 px-3 py-2">
                          <div className="grid grid-cols-4 gap-2">
                            <div><label className={fieldLabel}>Role *</label>
                              <select value={roleForm.roleId} onChange={(e) => { setRoleForm((prev) => ({ ...prev, roleId: e.target.value, companyId: "", plantId: "", administrativeDepartmentId: "" })); setRoleErrors({}); }}
                                className={`mt-0.5 h-7 w-full border bg-background px-2 text-xs outline-none ${roleDisplayErrors.roleId ? "border-danger/30" : "border-border"}`}>
                                <option value="">Select role</option>{roleCatalog.map((role: { id: string; label: string }) => (<option key={role.id} value={role.id}>{role.label}</option>))}
                              </select>{roleDisplayErrors.roleId && <p className="text-[11px] text-danger">{roleDisplayErrors.roleId}</p>}</div>
                            <div><label className={fieldLabel}>Company</label>
                              <select value={roleForm.companyId} onChange={(e) => setRoleForm((prev) => ({ ...prev, companyId: e.target.value, plantId: "", administrativeDepartmentId: "" }))} disabled={!selectedRoleScope || selectedRoleScope === "global"}
                                className={`mt-0.5 h-7 w-full border bg-background px-2 text-xs outline-none ${roleDisplayErrors.companyId ? "border-danger/30" : "border-border"} disabled:opacity-60`}>
                                <option value="">{selectedRoleScope === "global" ? "Global" : "Select company"}</option>{companies.map((c: CompanyNode) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                              </select>{roleDisplayErrors.companyId && <p className="text-[11px] text-danger">{roleDisplayErrors.companyId}</p>}</div>
                            <div><label className={fieldLabel}>Plant</label>
                              <select value={roleForm.plantId} onChange={(e) => setRoleForm((prev) => ({ ...prev, plantId: e.target.value, administrativeDepartmentId: "" }))} disabled={!selectedRoleScope || selectedRoleScope === "global" || selectedRoleScope === "company"}
                                className={`mt-0.5 h-7 w-full border bg-background px-2 text-xs outline-none ${roleDisplayErrors.plantId ? "border-danger/30" : "border-border"} disabled:opacity-60`}>
                                <option value="">{selectedRoleScope === "plant" || selectedRoleScope === "department" ? "Select plant" : "—"}</option>{plants.filter((p: PlantNode) => !roleForm.companyId || p.companyId === roleForm.companyId).map((p: PlantNode) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                              </select>{roleDisplayErrors.plantId && <p className="text-[11px] text-danger">{roleDisplayErrors.plantId}</p>}</div>
                            <div><label className={fieldLabel}>Dept</label>
                              <select value={roleForm.administrativeDepartmentId} onChange={(e) => setRoleForm((prev) => ({ ...prev, administrativeDepartmentId: e.target.value }))} disabled={selectedRoleScope !== "department"}
                                className={`mt-0.5 h-7 w-full border bg-background px-2 text-xs outline-none ${roleDisplayErrors.administrativeDepartmentId ? "border-danger/30" : "border-border"} disabled:opacity-60`}>
                                <option value="">{selectedRoleScope === "department" ? "Select dept" : "—"}</option>{filteredDepartments.map((d: DepartmentNode) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                              </select>{roleDisplayErrors.administrativeDepartmentId && <p className="text-[11px] text-danger">{roleDisplayErrors.administrativeDepartmentId}</p>}</div>
                          </div>
                          {roleDisplayErrors.form && <p className="mt-1 text-xs text-danger">{roleDisplayErrors.form}</p>}
                        </div>
                      )}
                      {selectedAssignments.length === 0 && !isAssignMode ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground/60">
                          <Shield className="h-4 w-4" />
                          <span>No role assignments yet</span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full table-fixed text-xs">
                            <thead><tr className="border-b border-border bg-muted text-left text-[11px] font-medium text-muted-foreground">
                              <th className="w-[26%] px-3 py-1.5">Role</th>
                              <th className="w-[14%] px-3 py-1.5">Scope</th>
                              <th className="w-[18%] px-3 py-1.5">Company</th>
                              <th className="w-[18%] px-3 py-1.5">Plant</th>
                              <th className="w-[18%] px-3 py-1.5">Dept</th>
                              <th className="w-[6%] px-3 py-1.5 text-right">Act</th>
                            </tr></thead>
                            <tbody>{selectedAssignments.map((a: UserRoleNode) => {
                              const scope: ScopeLevel = a.administrativeDepartmentId ? "department" : a.plantId ? "plant" : a.companyId ? "company" : "global";
                              return (
                                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/50">
                                  <td className="truncate px-3 py-1 text-[12px] text-foreground">{roleLabelById.get(a.roleId) || a.roleName}</td>
                                  <td className="px-3 py-1"><span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] ${scopeBadge(scope)}`}>{scopeLabel(scope)}</span></td>
                                  <td className="truncate px-3 py-1 text-[11px] text-muted-foreground">{safeText(a.companyName)}</td>
                                  <td className="truncate px-3 py-1 text-[11px] text-muted-foreground">{safeText(a.plantName)}</td>
                                  <td className="truncate px-3 py-1 text-[11px] text-muted-foreground">{safeText(a.administrativeDepartmentName)}</td>
                                  <td className="px-3 py-1 text-right">
                                    {!roleIsSystemById.get(a.roleId) ? (
                                      removeConfirmId === a.id ? (
                                        <div className="flex items-center justify-end gap-0.5">
                                          <span className="text-[10px] text-danger font-medium">Remove?</span>
                                          <button type="button" onClick={removeRole} className="rounded p-0.5 text-danger hover:bg-danger/10"><CheckCircle2 className="h-3 w-3" /></button>
                                          <button type="button" onClick={cancelRemoveRole} className="rounded p-0.5 text-muted-foreground/60 hover:bg-muted"><X className="h-3 w-3" /></button>
                                        </div>
                                      ) : (
                                        <button type="button" onClick={() => confirmRemoveRole(a.id)} className="rounded p-1 text-muted-foreground/60 hover:bg-danger/10 hover:text-danger" title="Remove role"><Trash2 className="h-3 w-3" /></button>
                                      )
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground/60">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* ── Access Groups ── */}
                    {accessGroups.length > 0 && (
                      <div className="border-b border-border">
                        <div className={secHdr}><span className={secTitle}>Access Groups</span></div>
                        <div className="divide-y divide-border/50">
                          {accessGroups.map((g) => (
                            <div key={g.id} className="flex items-center gap-3 px-3 py-1.5 min-h-[30px] hover:bg-muted/50">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                                <Shield className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-[12px] font-medium text-foreground">{g.name}</span>
                                  <span className={`inline-flex rounded border px-1 py-0.5 text-[10px] ${scopeBadge(g.scope)}`}>{scopeLabel(g.scope)}</span>
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {g.roleNames.slice(0, 3).map((rn, i) => (
                                    <span key={i} className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{rn}</span>
                                  ))}
                                  {g.roleNames.length > 3 && <span className="text-[10px] text-muted-foreground/60">+{g.roleNames.length - 3} more</span>}
                                </div>
                              </div>
                              <div className="shrink-0 text-right text-[11px] text-muted-foreground">{g.roleCount} role{g.roleCount !== 1 ? "s" : ""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Effective Permissions Summary ── */}
                    {selectedProfile && (
                      <div className="border-b border-border">
                        <div className={secHdr}><span className={secTitle}>Effective Permissions</span></div>
                        {permsLoading ? (
                          <div className="flex items-center justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" /></div>
                        ) : permsByModule.length === 0 ? (
                          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground/60">
                            <ShieldCheck className="h-4 w-4" /><span>No specific permissions assigned</span>
                          </div>
                        ) : (
                          <div className="divide-y divide-border/50">
                            {hasAdminAccess && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10/50">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                                <span className="text-[11px] text-warning">User has admin/system-level access</span>
                              </div>
                            )}
                            <div className="gap-x-1 gap-y-0.5 px-3 py-1.5">
                              {permsByModule.map(([module, actions]) => (
                                <div key={module} className="flex items-center gap-2 py-0.5">
                                  <span className="w-28 shrink-0 truncate text-[11px] font-medium text-muted-foreground capitalize">{module}</span>
                                  <div className="flex flex-wrap gap-1">
                                    {Array.from(actions).sort().map((action) => (
                                      <span key={`${module}-${action}`} className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                        action === "admin" || action === "manage"
                                          ? "bg-warning/10 text-warning border border-warning/20"
                                          : "bg-muted text-muted-foreground"
                                      }`}>
                                        {action}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Account State ── */}
                    {selectedProfile && (
                      <div className="px-3 py-1.5">
                        <div className={secHdr + " -mx-3 -mt-1.5 mb-1"}><span className={secTitle}>Account State</span></div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
                          <div><span className="text-muted-foreground">Status</span><span className="ml-2 font-medium text-foreground">{selectedProfile.isActive ? "Active" : "Inactive"}</span></div>
                          <div><span className="text-muted-foreground">Last login</span><span className="ml-2 font-medium text-foreground">{fmtDate(selectedProfile.lastLogin)}</span></div>
                          <div><span className="text-muted-foreground">Created</span><span className="ml-2 font-medium text-foreground">{fmtDate(selectedProfile.createdAt)}</span></div>
                          <div><span className="text-muted-foreground">Updated</span><span className="ml-2 font-medium text-foreground">{fmtDate(selectedProfile.updatedAt)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
    </>}
  />
</div>
  );
}
