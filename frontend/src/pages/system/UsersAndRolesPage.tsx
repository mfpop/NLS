import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Users, Shield, Key, Plus, RefreshCw, Archive, Info, Search, Check, X, UserPlus, Trash2, Eye, EyeOff, Loader2, TriangleAlert, Pencil } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { USER_PROFILES_QUERY, ROLES_QUERY, PERMISSIONS_QUERY, USER_ROLES_QUERY, COMPANIES_LIST_QUERY, USERS_LIST_QUERY } from "@/graphql/administrationQueries";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { CREATE_USER_PROFILE, UPDATE_USER_PROFILE, ACTIVATE_USER_PROFILE, DEACTIVATE_USER_PROFILE, CREATE_ROLE, UPDATE_ROLE, ARCHIVE_ROLE, ASSIGN_PERMISSION_TO_ROLE, REMOVE_PERMISSION_FROM_ROLE, ASSIGN_ROLE_TO_USER, REMOVE_ROLE_FROM_USER } from "@/graphql/administrationMutations";
import { REFERENCE_OPTIONS_QUERY } from "@/hooks/useReferenceTables";
import { theme } from "@/styles/themeTokens";

interface UserProfile {
  id: string; userId: string; username: string; email: string; fullName: string;
  companyId?: string | null; companyName?: string | null;
  plantId?: string | null; plantName?: string | null;
  administrativeDepartmentId?: string | null; administrativeDepartmentName?: string | null;
  jobTitle: string; phone: string; isActive: boolean;
  createdAt: string; updatedAt: string;
}
interface Role {
  id: string; code: string; name: string; description: string;
  isSystemRole: boolean; isActive: boolean; permissions: Permission[];
}
interface Permission {
  id: string; code: string; name: string; description: string;
  module: string; action: string; isActive: boolean;
}
interface UserRoleAssignment {
  id: string; userProfileId: string; username: string; fullName: string;
  roleId: string; roleCode: string; roleName: string;
  companyId?: string | null; companyName?: string | null;
  plantId?: string | null; plantName?: string | null;
  administrativeDepartmentId?: string | null; administrativeDepartmentName?: string | null;
  isActive: boolean; assignedAt: string;
}
interface CompanyOption { id: string; code: string; name: string; }
interface PlantOption { id: string; name: string; code: string; companyId: string; }
interface UserOption { id: string; username: string; fullName: string; }

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/30 bg-card p-8 text-center text-xs text-muted-foreground shadow-sm">
      <Icon className="mb-2 h-8 w-8 stroke-current opacity-40" />
      {message}
    </div>
  );
}

function TabButton({ active, label, icon: Icon, count, onClick }: { active: boolean; label: string; icon: React.ComponentType<{ className?: string }>; count?: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-[10px] font-semibold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
      {count !== undefined && <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 text-[9px]">{count}</span>}
    </button>
  );
}

function Select({ value, onChange, options, placeholder, label }: { value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; placeholder: string; label: string; }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

export function UsersAndRolesPage() {
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "permissions">("users");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ userId: "", companyId: "", plantId: "", administrativeDepartmentId: "", jobTitle: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [userRoleForm, setUserRoleForm] = useState({ roleId: "", companyId: "", plantId: "", administrativeDepartmentId: "" });
  const [assigningRole, setAssigningRole] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<string | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({ code: "", name: "", description: "" });
  const [savingRole, setSavingRole] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [roleStatusFilter, setRoleStatusFilter] = useState<"all" | "active" | "inactive" | "system" | "custom">("all");
  const [roleSort, setRoleSort] = useState<"nameAsc" | "nameDesc" | "permDesc">("nameAsc");
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "deactivate" | "removeRole"; id: string; label: string } | null>(null);

  const { data: profilesData, loading: profilesLoading, error: profilesError, refetch: refetchProfiles } = useQuery<{ userProfiles: UserProfile[] }>(USER_PROFILES_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: rolesData, loading: rolesLoading, refetch: refetchRoles } = useQuery<{ roles: Role[] }>(ROLES_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: permsData, refetch: refetchPerms } = useQuery<{ permissions: Permission[] }>(PERMISSIONS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: companiesData } = useQuery<{ companies: CompanyOption[] }>(COMPANIES_LIST_QUERY);
  const { data: usersData } = useQuery<{ usersList: UserOption[] }>(USERS_LIST_QUERY);
  const { data: plantsData } = useQuery<{ plants: PlantOption[] }>(PLANTS_QUERY, {
    variables: { companyId: userForm.companyId || undefined },
    skip: !userForm.companyId,
  });
  const { data: userRolesData, refetch: refetchUserRoles } = useQuery<{ userRoles: UserRoleAssignment[] }>(USER_ROLES_QUERY, {
    variables: { userProfileId: selectedUserForRoles || "" },
    skip: !selectedUserForRoles,
  });
  const { data: plantsForRoleData } = useQuery<{ plants: PlantOption[] }>(PLANTS_QUERY, {
    variables: { companyId: userRoleForm.companyId || undefined },
    skip: !userRoleForm.companyId,
  });
  const { data: refData } = useQuery<{ referenceOptions: { categoryCode: string; values: { id: string; name: string }[] }[] }>(REFERENCE_OPTIONS_QUERY, {
    variables: { types: ["admin_department", "role"] },
  });

  const adminDeptRefs = (refData?.referenceOptions?.find((r) => r.categoryCode === "admin_department")?.values ?? []);
  const jobTitleRefs = (refData?.referenceOptions?.find((r) => r.categoryCode === "role")?.values ?? []);

  const [createProfile] = useMutation(CREATE_USER_PROFILE, { refetchQueries: [USER_PROFILES_QUERY] });
  const [updateProfile] = useMutation(UPDATE_USER_PROFILE, { refetchQueries: [USER_PROFILES_QUERY] });
  const [activateProfile] = useMutation(ACTIVATE_USER_PROFILE, { refetchQueries: [USER_PROFILES_QUERY] });
  const [deactivateProfile] = useMutation(DEACTIVATE_USER_PROFILE, { refetchQueries: [USER_PROFILES_QUERY] });
  const [createRole] = useMutation(CREATE_ROLE, { refetchQueries: [ROLES_QUERY] });
  const [archiveRole] = useMutation(ARCHIVE_ROLE, { refetchQueries: [ROLES_QUERY] });
  const [assignPerm] = useMutation(ASSIGN_PERMISSION_TO_ROLE, { refetchQueries: [ROLES_QUERY] });
  const [removePerm] = useMutation(REMOVE_PERMISSION_FROM_ROLE, { refetchQueries: [ROLES_QUERY] });
  const [assignRole] = useMutation(ASSIGN_ROLE_TO_USER, { refetchQueries: [USER_ROLES_QUERY] });
  const [removeRole] = useMutation(REMOVE_ROLE_FROM_USER, { refetchQueries: [USER_ROLES_QUERY] });

  const profiles = profilesData?.userProfiles ?? [];
  const roles = rolesData?.roles ?? [];
  const permissions = permsData?.permissions ?? [];
  const companies = companiesData?.companies ?? [];
  const usersList = usersData?.usersList ?? [];
  const plants = plantsData?.plants ?? [];
  const userRoleAssignments = userRolesData?.userRoles ?? [];
  const plantsForRole = plantsForRoleData?.plants ?? [];
  const selectedRole = roles.find((r) => r.id === selectedRoleForPerms);
  const statusMessageIsError = /fail|error|required/i.test(statusMessage || "");

  const filteredProfiles = profiles.filter((p) =>
    !search || p.fullName.toLowerCase().includes(search.toLowerCase()) || p.username.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPermissions = useMemo(() => {
    if (!permSearch) return permissions;
    const q = permSearch.toLowerCase();
    return permissions.filter((p) =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.module.toLowerCase().includes(q) || p.action.toLowerCase().includes(q)
    );
  }, [permissions, permSearch]);

  const roleStats = useMemo(() => ({
    total: roles.length,
    active: roles.filter((r) => r.isActive).length,
    system: roles.filter((r) => r.isSystemRole).length,
  }), [roles]);

  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    const matches = roles.filter((r) => {
      if (roleStatusFilter === "active" && !r.isActive) return false;
      if (roleStatusFilter === "inactive" && r.isActive) return false;
      if (roleStatusFilter === "system" && !r.isSystemRole) return false;
      if (roleStatusFilter === "custom" && r.isSystemRole) return false;
      if (!query) return true;
      return r.name.toLowerCase().includes(query)
        || r.code.toLowerCase().includes(query)
        || (r.description || "").toLowerCase().includes(query);
    });

    return [...matches].sort((a, b) => {
      if (roleSort === "permDesc") {
        const diff = (b.permissions?.length || 0) - (a.permissions?.length || 0);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }
      if (roleSort === "nameDesc") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });
  }, [roles, roleSearch, roleStatusFilter, roleSort]);

  const offeredRoles = useMemo(() => {
    const assignedIds = new Set(userRoleAssignments.map((a) => a.roleId));
    return roles
      .filter((r) => r.isActive && !assignedIds.has(r.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roles, userRoleAssignments]);

  const buttonClass = "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";
  const inputClass = "h-7 w-full rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-colors";
  const selectClass = "h-7 w-full rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

  const resetUserForm = useCallback(() => {
    setUserForm({ userId: "", companyId: "", plantId: "", administrativeDepartmentId: "", jobTitle: "", phone: "" });
    setEditingProfileId(null);
    setShowUserForm(false);
    setSavingProfile(false);
  }, []);

  const openEditProfile = (p: UserProfile) => {
    setUserForm({
      userId: p.userId,
      companyId: p.companyId || "",
      plantId: p.plantId || "",
      administrativeDepartmentId: p.administrativeDepartmentId || "",
      jobTitle: p.jobTitle || "",
      phone: p.phone || "",
    });
    setEditingProfileId(p.id);
    setShowUserForm(true);
  };

  const handleSaveProfile = async () => {
    if (!userForm.userId) { setStatusMessage("Select a user."); return; }
    setSavingProfile(true);
    const vars = { userId: userForm.userId, companyId: userForm.companyId || null, plantId: userForm.plantId || null, administrativeDepartmentId: userForm.administrativeDepartmentId || null, jobTitle: userForm.jobTitle, phone: userForm.phone };
    try {
      const { data: result } = editingProfileId
        ? await updateProfile({ variables: { id: editingProfileId, input: vars } })
        : await createProfile({ variables: { input: vars } });
      const payload = editingProfileId ? (result as any)?.updateUserProfile : (result as any)?.createUserProfile;
      if (payload?.errors?.length) {
        setStatusMessage(payload.errors.map((e: { message: string }) => e.message).join(", "));
        setSavingProfile(false);
        return;
      }
      setStatusMessage(editingProfileId ? "Profile updated." : "Profile created.");
      resetUserForm();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Save failed.");
      setSavingProfile(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const profile = profiles.find((p) => p.id === id);
    if (current && !confirmAction) {
      setConfirmAction({ type: "deactivate", id, label: `Deactivate ${profile?.fullName || "user"}?` });
      return;
    }
    setConfirmAction(null);
    await (current ? deactivateProfile : activateProfile)({ variables: { id } });
    setStatusMessage(current ? "User deactivated." : "User activated.");
  };

  const handleCreateRole = async () => {
    if (!roleForm.code.trim() || !roleForm.name.trim()) { setStatusMessage("Code and name are required."); return; }
    setSavingRole(true);
    try {
      const { data: result } = await createRole({ variables: { input: { code: roleForm.code.trim(), name: roleForm.name.trim(), description: roleForm.description } } });
      if ((result as any)?.createRole?.errors?.length) {
        setStatusMessage((result as any)?.createRole?.errors?.map((e: { message: string }) => e.message)?.join(", ") || "Save failed.");
        setSavingRole(false);
        return;
      }
      setStatusMessage("Role created.");
      setShowRoleForm(false);
      setRoleForm({ code: "", name: "", description: "" });
      setSavingRole(false);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Save failed.");
      setSavingRole(false);
    }
  };

  const handleArchiveRole = async (id: string) => {
    setConfirmAction(null);
    await archiveRole({ variables: { id } });
    setStatusMessage("Role archived.");
  };

  const handleTogglePermission = async (roleId: string, permission: Permission, isAssigned: boolean) => {
    if (isAssigned) {
      const { data: result } = await removePerm({ variables: { roleId, permissionId: permission.id } });
      if ((result as any)?.removePermissionFromRole?.errors?.length) return;
    } else {
      const { data: result } = await assignPerm({ variables: { roleId, permissionId: permission.id } });
      if ((result as any)?.assignPermissionToRole?.errors?.length) return;
    }
    refetchRoles();
  };

  const handleAssignRole = async (profileId: string) => {
    if (!userRoleForm.roleId) { setStatusMessage("Select a role."); return; }
    setAssigningRole(true);
    try {
      const { data: result } = await assignRole({
        variables: { input: { userProfileId: profileId, roleId: userRoleForm.roleId, companyId: userRoleForm.companyId || null, plantId: userRoleForm.plantId || null, administrativeDepartmentId: userRoleForm.administrativeDepartmentId || null } },
      });
      if ((result as any)?.assignRoleToUser?.errors?.length) {
        setStatusMessage((result as any)?.assignRoleToUser?.errors?.map((e: { message: string }) => e.message)?.join(", ") || "Save failed.");
        setAssigningRole(false);
        return;
      }
      setStatusMessage("Role assigned.");
      setUserRoleForm({ roleId: "", companyId: "", plantId: "", administrativeDepartmentId: "" });
      setAssigningRole(false);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Save failed.");
      setAssigningRole(false);
    }
  };

  const handleRemoveRole = (assignmentId: string, label: string) => {
    setConfirmAction({ type: "removeRole", id: assignmentId, label: `Remove role "${label}"?` });
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    setConfirmAction(null);
    if (type === "removeRole") {
      await removeRole({ variables: { assignmentId: id } });
      setStatusMessage("Role removed.");
    }
  };

  const tabContent = () => {
    switch (activeTab) {
      case "users":
        return (
          <div className="space-y-2">
            {statusMessage && (
              <div className={`flex items-center gap-2 rounded border px-3 py-1.5 text-[10px] ${statusMessageIsError ? "border-danger/20 bg-danger/10 text-danger" : "border-info/20 bg-info/10 text-info"}`}>
                <Info className="h-3.5 w-3.5 shrink-0 stroke-current" />
                <span className="flex-1">{statusMessage}</span>
                <button onClick={() => setStatusMessage(null)} className="shrink-0"><X className="h-3 w-3" /></button>
              </div>
            )}
            {confirmAction && confirmAction.type === "deactivate" && (
              <div className="flex items-center gap-2 rounded border border-warning/20 bg-warning/10 px-3 py-2 text-[10px] text-warning">
                <TriangleAlert className="h-4 w-4 shrink-0 stroke-current" />
                <span className="flex-1">{confirmAction.label}</span>
                <button type="button" onClick={() => handleToggleActive(confirmAction.id, true)} className="inline-flex h-6 items-center rounded bg-warning px-2 text-[10px] font-semibold text-warning-foreground">Confirm</button>
                <button type="button" onClick={() => setConfirmAction(null)} className="inline-flex h-6 items-center rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground">Cancel</button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="h-7 w-full rounded border border-input bg-card pl-7 pr-2 text-[11px] text-foreground outline-none focus:border-ring" />
              </div>
              <button type="button" onClick={() => refetchProfiles()} className={buttonClass} disabled={profilesLoading}><RefreshCw className={`h-3.5 w-3.5 ${profilesLoading ? "animate-spin" : ""}`} /> Refresh</button>
              <button type="button" onClick={() => { resetUserForm(); setShowUserForm(!showUserForm); }} className="inline-flex h-8 items-center gap-1.5 rounded bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"><UserPlus className="h-3.5 w-3.5" /> New Profile</button>
            </div>

            {showUserForm && (
              <div className="rounded-lg border border-border/10 bg-card p-3 shadow-md">
                <h3 className="mb-2 text-[11px] font-bold text-foreground">{editingProfileId ? "Edit User Profile" : "New User Profile"}</h3>
                <div className="grid grid-cols-4 gap-2">
                  <Select value={userForm.userId} onChange={(v) => setUserForm({ ...userForm, userId: v })} options={usersList.map((u) => ({ id: u.id, name: `${u.fullName} (${u.username})` }))} placeholder="Select user" label="User" />
                  <Select value={userForm.companyId} onChange={(v) => setUserForm({ ...userForm, companyId: v, plantId: "", administrativeDepartmentId: "" })} options={companies} placeholder="Select company" label="Company Scope" />
                  <Select value={userForm.plantId} onChange={(v) => setUserForm({ ...userForm, plantId: v })} options={plants} placeholder="Select plant" label="Plant Scope" />
                  <Select value={userForm.administrativeDepartmentId} onChange={(v) => setUserForm({ ...userForm, administrativeDepartmentId: v })} options={adminDeptRefs} placeholder="Select department" label="Admin Department" />
                  <Select value={userForm.jobTitle} onChange={(v) => setUserForm({ ...userForm, jobTitle: v })} options={jobTitleRefs} placeholder="Select job title" label="Job Title" />
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Phone</label>
                    <input type="text" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className={inputClass} />
                  </div>
                  <div className="flex items-end gap-1">
                    <button type="button" onClick={handleSaveProfile} disabled={savingProfile}
                      className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
                      {savingProfile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} {savingProfile ? "Saving..." : "Save"}</button>
                    <button type="button" onClick={resetUserForm} disabled={savingProfile}
                      className="inline-flex h-7 items-center gap-1 rounded bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground"><X className="h-3 w-3" /> Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1">
                {profilesLoading && !profilesData && <EmptyState icon={Users} message="Loading user profiles..." />}
                {profilesError && <div className="rounded border border-danger/25 bg-danger/10 px-3 py-2 text-[10px] text-danger">{profilesError.message}</div>}
                {!profilesLoading && filteredProfiles.length === 0 && <EmptyState icon={Users} message="No user profiles found." />}
                {filteredProfiles.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-border/10">
                    <table className="w-full text-[11px]">
                      <thead><tr className="bg-muted/50 text-left text-[10px] font-semibold text-muted-foreground">
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Company Scope</th>
                        <th className="px-3 py-2">Admin Dept</th>
                        <th className="px-3 py-2">Job Title</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr></thead>
                      <tbody>
                        {filteredProfiles.map((p) => (
                          <tr key={p.id} className="border-t border-border/10 text-foreground transition-colors hover:bg-muted/30">
                            <td className="px-3 py-2"><div className="font-semibold">{p.fullName}</div><div className="text-[10px] text-muted-foreground">{p.username}</div></td>
                            <td className="px-3 py-2 text-muted-foreground">{p.companyName || "-"}{p.plantName ? ` / ${p.plantName}` : ""}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.administrativeDepartmentName || "-"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.jobTitle || "-"}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${p.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${p.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                                {p.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-0.5">
                                <button type="button" onClick={() => openEditProfile(p)} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => handleToggleActive(p.id, p.isActive)} className="rounded p-1 text-muted-foreground hover:bg-muted" title={p.isActive ? "Deactivate" : "Activate"}>
                                  {p.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button" onClick={() => setSelectedUserForRoles(selectedUserForRoles === p.id ? null : p.id)} className={`rounded p-1 ${selectedUserForRoles === p.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`} title="Manage roles">
                                  <Shield className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedUserForRoles && (
                <div className="w-80 shrink-0 rounded-lg border border-border/10 bg-card p-3 shadow-md max-h-[70vh] overflow-y-auto">
                  <h3 className="mb-2 text-[11px] font-bold text-foreground">Role Assignments</h3>
                  {confirmAction?.type === "removeRole" && (
                    <div className="mb-2 flex items-center gap-2 rounded border border-warning/20 bg-warning/10 px-2 py-1.5 text-[10px] text-warning">
                      <TriangleAlert className="h-3.5 w-3.5 shrink-0 stroke-current" />
                      <span className="flex-1">{confirmAction.label}</span>
                      <button type="button" onClick={executeConfirm} className="rounded bg-warning px-1.5 py-0.5 text-[9px] font-semibold text-warning-foreground">Remove</button>
                      <button type="button" onClick={() => setConfirmAction(null)} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">Keep</button>
                    </div>
                  )}
                  <div className="mb-2 space-y-1.5">
                    <select value={userRoleForm.roleId} onChange={(e) => setUserRoleForm({ ...userRoleForm, roleId: e.target.value })} className={selectClass}>
                      <option value="">Select role</option>
                      {offeredRoles.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                    </select>
                    {offeredRoles.length === 0 && <p className="text-[10px] text-muted-foreground">All active roles are already assigned to this user.</p>}
                    <select value={userRoleForm.companyId} onChange={(e) => setUserRoleForm({ ...userRoleForm, companyId: e.target.value, plantId: "", administrativeDepartmentId: "" })} className={selectClass}>
                      <option value="">All Companies</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={userRoleForm.plantId} onChange={(e) => setUserRoleForm({ ...userRoleForm, plantId: e.target.value })} className={selectClass}>
                      <option value="">All Plants</option>
                      {plantsForRole.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={userRoleForm.administrativeDepartmentId} onChange={(e) => setUserRoleForm({ ...userRoleForm, administrativeDepartmentId: e.target.value })} className={selectClass}>
                      <option value="">All Departments</option>
                      {adminDeptRefs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button type="button" onClick={() => handleAssignRole(selectedUserForRoles)} disabled={assigningRole}
                      className="h-7 w-full rounded bg-primary text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
                      {assigningRole ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}Assign Role</button>
                  </div>
                  {userRoleAssignments.length === 0 && <p className="text-[10px] text-muted-foreground">No roles assigned.</p>}
                  {userRoleAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1.5">
                      <div>
                        <span className="text-[10px] font-semibold text-foreground">{a.roleName}</span>
                        <span className="ml-1 text-[9px] text-muted-foreground">({a.roleCode})</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveRole(a.id, a.roleName)} className="rounded p-0.5 text-muted-foreground hover:text-danger"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "roles":
        return (
          <div className="space-y-2">
            {statusMessage && (
              <div className={`flex items-center gap-2 rounded border px-3 py-1.5 text-[10px] ${statusMessageIsError ? "border-danger/20 bg-danger/10 text-danger" : "border-info/20 bg-info/10 text-info"}`}>
                <Info className="h-3.5 w-3.5 shrink-0 stroke-current" />
                <span className="flex-1">{statusMessage}</span>
                <button onClick={() => setStatusMessage(null)} className="shrink-0"><X className="h-3 w-3" /></button>
              </div>
            )}
            {confirmAction?.type === "deactivate" && confirmAction.label.startsWith("Archive") && (
              <div className="flex items-center gap-2 rounded border border-warning/20 bg-warning/10 px-3 py-2 text-[10px] text-warning">
                <TriangleAlert className="h-4 w-4 shrink-0 stroke-current" />
                <span className="flex-1">{confirmAction.label}</span>
                <button type="button" onClick={() => handleArchiveRole(confirmAction.id)} className="inline-flex h-6 items-center rounded bg-warning px-2 text-[10px] font-semibold text-warning-foreground">Archive</button>
                <button type="button" onClick={() => setConfirmAction(null)} className="inline-flex h-6 items-center rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground">Cancel</button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded border border-border/30 bg-card/60 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Total Roles</p>
                <p className="text-sm font-semibold text-foreground">{roleStats.total}</p>
              </div>
              <div className="rounded border border-success/20 bg-success/5 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Active</p>
                <p className="text-sm font-semibold text-success">{roleStats.active}</p>
              </div>
              <div className="rounded border border-info/20 bg-info/5 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">System</p>
                <p className="text-sm font-semibold text-info">{roleStats.system}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} placeholder="Search roles by name, code, description"
                  className="h-7 w-full rounded border border-input bg-card pl-7 pr-2 text-[11px] text-foreground outline-none focus:border-ring" />
              </div>
              <select value={roleStatusFilter} onChange={(e) => setRoleStatusFilter(e.target.value as "all" | "active" | "inactive" | "system" | "custom")} className={selectClass}>
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                <option value="system">System roles</option>
                <option value="custom">Custom roles</option>
              </select>
              <select value={roleSort} onChange={(e) => setRoleSort(e.target.value as "nameAsc" | "nameDesc" | "permDesc")} className={selectClass}>
                <option value="nameAsc">Sort: Name A-Z</option>
                <option value="nameDesc">Sort: Name Z-A</option>
                <option value="permDesc">Sort: Most permissions</option>
              </select>
              <button type="button" onClick={() => refetchRoles()} className={buttonClass} disabled={rolesLoading}><RefreshCw className={`h-3.5 w-3.5 ${rolesLoading ? "animate-spin" : ""}`} /> Refresh</button>
              <button type="button" onClick={() => { setShowRoleForm(!showRoleForm); setRoleForm({ code: "", name: "", description: "" }); }}
                className="inline-flex h-8 items-center gap-1.5 rounded bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> New Role</button>
            </div>
            {showRoleForm && (
              <div className="rounded-lg border border-border/10 bg-card p-3 shadow-md">
                <h3 className="mb-2 text-[11px] font-bold text-foreground">New Role</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Code <span className="text-danger">*</span></label>
                    <input type="text" value={roleForm.code} onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Name <span className="text-danger">*</span></label>
                    <input type="text" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} className={inputClass} />
                  </div>
                  <div className="flex items-end gap-1">
                    <button type="button" onClick={handleCreateRole} disabled={savingRole}
                      className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
                      {savingRole ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} {savingRole ? "Saving..." : "Save"}</button>
                    <button type="button" onClick={() => setShowRoleForm(false)} disabled={savingRole}
                      className="inline-flex h-7 items-center gap-1 rounded bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground"><X className="h-3 w-3" /> Cancel</button>
                  </div>
                  <div className="col-span-3">
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Description</label>
                    <input type="text" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} className={inputClass} />
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                {rolesLoading && <EmptyState icon={Shield} message="Loading roles..." />}
                {!rolesLoading && roles.length === 0 && <EmptyState icon={Shield} message="No roles defined." />}
                {!rolesLoading && roles.length > 0 && filteredRoles.length === 0 && <EmptyState icon={Search} message="No roles match the current filters." />}
                {filteredRoles.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-border/10">
                    <table className="w-full text-[11px]">
                      <thead><tr className="bg-muted/50 text-left text-[10px] font-semibold text-muted-foreground">
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Permissions</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">System</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr></thead>
                      <tbody>
                        {filteredRoles.map((r) => (
                          <tr key={r.id} className="border-t border-border/10 text-foreground transition-colors hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono text-[10px] font-bold">{r.code}</td>
                            <td className="px-3 py-2 font-semibold">{r.name}</td>
                            <td className="max-w-sm px-3 py-2 text-muted-foreground">{r.description || "-"}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{r.permissions?.length || 0}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${r.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${r.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                                {r.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{r.isSystemRole ? "Yes" : "No"}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-0.5">
                                <button type="button" onClick={() => setSelectedRoleForPerms(selectedRoleForPerms === r.id ? null : r.id)} className={`rounded p-1 ${selectedRoleForPerms === r.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`} title="Manage permissions">
                                  <Key className="h-3.5 w-3.5" />
                                </button>
                                {r.isActive && !r.isSystemRole && (
                                  <button type="button" onClick={() => setConfirmAction({ type: "deactivate", id: r.id, label: `Archive role "${r.name}"?` })} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Archive"><Archive className="h-3.5 w-3.5" /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {selectedRoleForPerms && selectedRole && (
                <div className="w-80 shrink-0 rounded-lg border border-border/10 bg-card p-3 shadow-md max-h-[70vh] overflow-y-auto">
                  <h3 className="mb-2 text-[11px] font-bold text-foreground">Permissions: {selectedRole.name}</h3>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" value={permSearch} onChange={(e) => setPermSearch(e.target.value)} placeholder="Filter permissions..."
                      className="h-7 w-full rounded border border-input bg-card pl-7 pr-2 text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring/30" />
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto">
                    {filteredPermissions.length === 0 && <p className="text-[10px] text-muted-foreground">No matching permissions.</p>}
                    {filteredPermissions.map((perm) => {
                      const isAssigned = selectedRole.permissions?.some((p) => p.id === perm.id) ?? false;
                      return (
                        <label key={perm.id} className="flex cursor-pointer items-center gap-2 rounded bg-muted/30 px-2 py-1.5 hover:bg-muted/60">
                          <input type="checkbox" checked={isAssigned} onChange={() => handleTogglePermission(selectedRole.id, perm, isAssigned)} className="h-3.5 w-3.5 accent-primary" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[10px] font-semibold text-foreground">{perm.name}</div>
                            <div className="truncate text-[9px] text-muted-foreground">{perm.module}.{perm.action}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "permissions":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => refetchPerms()} className={buttonClass}><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
            </div>
            {permissions.length === 0 && <EmptyState icon={Key} message="No permissions defined." />}
            {permissions.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border/10">
                <table className="w-full text-[11px]">
                  <thead><tr className="bg-muted/50 text-left text-[10px] font-semibold text-muted-foreground">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Module</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {permissions.map((p) => (
                      <tr key={p.id} className="border-t border-border/10 text-foreground transition-colors hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-[10px] font-bold">{p.code}</td>
                        <td className="px-3 py-2 font-semibold">{p.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.module}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.action}</td>
                        <td className="px-3 py-2 max-w-xs truncate text-muted-foreground">{p.description}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.isActive ? "Active" : "Inactive"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <AppPageLayout
      icon={<Users />}
      iconClass={theme.iconBoxBrand}
      title="Users & Roles"
      subtitle="Manage user profiles, roles, permissions, and access assignments."
      toolbar={
        <div className="flex w-full items-center gap-1">
          <TabButton active={activeTab === "users"} label="Users" icon={Users} count={profiles.length} onClick={() => setActiveTab("users")} />
          <span className="mx-1 h-5 w-px shrink-0 bg-muted" />
          <TabButton active={activeTab === "roles"} label="Roles" icon={Shield} count={roles.length} onClick={() => setActiveTab("roles")} />
          <span className="mx-1 h-5 w-px shrink-0 bg-muted" />
          <TabButton active={activeTab === "permissions"} label="Permissions" icon={Key} count={permissions.length} onClick={() => setActiveTab("permissions")} />
        </div>
      }
    >
      <div className="h-full overflow-y-auto p-2">
        {tabContent()}
      </div>
    </AppPageLayout>
  );
}
