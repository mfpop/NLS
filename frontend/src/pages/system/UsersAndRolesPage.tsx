import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { ShieldCheck, Plus, Pencil, RefreshCw, Save, X, UserRound, Trash2 } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { Toolbar, ToolbarButton, ToolbarSearch, ToolbarDropdown } from "@/components/shared/Toolbar";
import { RecordListPanel } from "@/components/shared/RecordListPanel";
import {
  ADMINISTRATIVE_DEPARTMENTS_QUERY,
  COMPANIES_LIST_QUERY,
  ROLES_QUERY,
  USER_PROFILES_QUERY,
  USER_ROLES_ALL_QUERY,
  USERS_LIST_QUERY,
} from "@/graphql/administrationQueries";
import { ASSIGN_ROLE_TO_USER, CREATE_USER_PROFILE, REMOVE_ROLE_FROM_USER, UPDATE_USER_PROFILE } from "@/graphql/administrationMutations";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { REFERENCE_OPTIONS_QUERY } from "@/hooks/useReferenceTables";
import { theme } from "@/styles/themeTokens";
type ScopeLevel = "global" | "company" | "plant" | "department";
type PageMode = "view" | "editProfile" | "createProfile" | "assignRole";
interface UserProfileNode {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  companyId?: string | null;
  companyName?: string | null;
  plantId?: string | null;
  plantName?: string | null;
  administrativeDepartmentId?: string | null;
  administrativeDepartmentName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  isActive: boolean;
}
interface UserRoleNode {
  id: string;
  userProfileId: string;
  roleId: string;
  roleName: string;
  companyId?: string | null;
  companyName?: string | null;
  plantId?: string | null;
  plantName?: string | null;
  administrativeDepartmentId?: string | null;
  administrativeDepartmentName?: string | null;
  isActive: boolean;
}
interface RoleNode {
  id: string;
  code: string;
  name: string;
  isSystemRole: boolean;
  isActive: boolean;
}
interface ReferenceOptionValue {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  metadata?: unknown;
}
interface CompanyNode {
  id: string;
  name: string;
}
interface PlantNode {
  id: string;
  name: string;
  companyId: string;
}
interface DepartmentNode {
  id: string;
  name: string;
  companyId: string;
  plantId?: string | null;
}
interface UserNode {
  id: string;
  username: string;
  fullName: string;
}
interface ProfileFormState {
  userId: string;
  companyId: string;
  plantId: string;
  administrativeDepartmentId: string;
  jobTitle: string;
  phone: string;
}
interface RoleFormState {
  roleId: string;
  companyId: string;
  plantId: string;
  administrativeDepartmentId: string;
}
const emptyProfileForm: ProfileFormState = {
  userId: "",
  companyId: "",
  plantId: "",
  administrativeDepartmentId: "",
  jobTitle: "",
  phone: "",
};
const emptyRoleForm: RoleFormState = {
  roleId: "",
  companyId: "",
  plantId: "",
  administrativeDepartmentId: "",
};
function asOptionalId(value: string): string | null {
  const v = value.trim();
  return v ? v : null;
}
function safeText(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : "—";
}
function normalizeScope(value: string | null | undefined): ScopeLevel | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (["global", "all", "enterprise"].includes(v)) return "global";
  if (["company", "site"].includes(v)) return "company";
  if (["plant", "factory"].includes(v)) return "plant";
  if (["department", "dept", "administrative_department", "administrative-department"].includes(v)) return "department";
  return null;
}
function parseMeta(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}
function inferScope(role: RoleNode, refRole: ReferenceOptionValue | null): ScopeLevel {
  const meta = parseMeta(refRole?.metadata);
  const explicit = normalizeScope(String(meta?.scope ?? meta?.level ?? ""));
  if (explicit) return explicit;
  if (meta?.requiresDepartment) return "department";
  if (meta?.requiresPlant) return "plant";
  if (meta?.requiresCompany) return "company";
  const probe = `${role.code} ${role.name}`.toLowerCase();
  if (probe.includes("department") || probe.includes("dept")) return "department";
  if (probe.includes("plant") || probe.includes("factory")) return "plant";
  if (probe.includes("company")) return "company";
  return "global";
}
function scopeLabel(scope: ScopeLevel): string {
  if (scope === "global") return "Global";
  if (scope === "company") return "Company";
  if (scope === "plant") return "Plant";
  return "Department";
}
function scopeBadge(scope: ScopeLevel): string {
  if (scope === "global") return "border-blue-400/60 text-blue-600";
  if (scope === "company") return "border-indigo-400/60 text-indigo-600";
  if (scope === "plant") return "border-purple-400/60 text-purple-600";
  return "border-cyan-400/60 text-cyan-600";
}
export function UsersAndRolesPage() {
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
  const { data: profileData, loading: loadingProfiles, refetch: refetchProfiles } = useQuery<{ userProfiles: UserProfileNode[] }>(
    USER_PROFILES_QUERY,
    {
      variables: {
        search: userSearch || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      },
      fetchPolicy: "cache-and-network",
    },
  );
  const { data: roleData, refetch: refetchRoles } = useQuery<{ roles: RoleNode[] }>(ROLES_QUERY, {
    variables: { isActive: true },
    fetchPolicy: "cache-and-network",
  });
  const { data: assignmentData, refetch: refetchAssignments } = useQuery<{ userRoles: UserRoleNode[] }>(USER_ROLES_ALL_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const { data: usersData } = useQuery<{ usersList: UserNode[] }>(USERS_LIST_QUERY);
  const { data: companiesData } = useQuery<{ companies: CompanyNode[] }>(COMPANIES_LIST_QUERY);
  const activeCompanyId = profileForm.companyId || roleForm.companyId || undefined;
  const activePlantId = profileForm.plantId || roleForm.plantId || undefined;
  const { data: plantsData } = useQuery<{ plants: PlantNode[] }>(PLANTS_QUERY, {
    variables: { companyId: activeCompanyId },
    skip: !activeCompanyId,
  });
  const { data: departmentsData } = useQuery<{ administrativeDepartments: DepartmentNode[] }>(ADMINISTRATIVE_DEPARTMENTS_QUERY, {
    variables: { companyId: activeCompanyId, plantId: activePlantId, isActive: true },
    skip: !activeCompanyId,
  });
  const { data: referenceData } = useQuery<{ referenceOptions: Array<{ categoryCode: string; values: ReferenceOptionValue[] }> }>(
    REFERENCE_OPTIONS_QUERY,
    {
      variables: { types: ["role"] },
      fetchPolicy: "cache-and-network",
    },
  );
  const [createUserProfile] = useMutation<any>(CREATE_USER_PROFILE);
  const [updateUserProfile] = useMutation<any>(UPDATE_USER_PROFILE);
  const [assignRoleToUser] = useMutation<any>(ASSIGN_ROLE_TO_USER);
  const [removeRoleFromUser] = useMutation(REMOVE_ROLE_FROM_USER);
  const users = profileData?.userProfiles ?? [];
  const assignments = (assignmentData?.userRoles ?? []).filter((a) => a.isActive);
  const companies = companiesData?.companies ?? [];
  const plants = plantsData?.plants ?? [];
  const departments = departmentsData?.administrativeDepartments ?? [];
  const selectableUsers = usersData?.usersList ?? [];
  const refRoleValues = useMemo(() => {
    const roleCategory = referenceData?.referenceOptions?.find((opt) => opt.categoryCode === "role");
    return roleCategory?.values?.filter((v) => v.isActive) ?? [];
  }, [referenceData?.referenceOptions]);
  const roleByCode = useMemo(() => {
    const map = new Map<string, ReferenceOptionValue>();
    refRoleValues.forEach((v) => map.set(v.code.toLowerCase(), v));
    return map;
  }, [refRoleValues]);
  const roleCatalog = useMemo(() => {
    return (roleData?.roles ?? [])
      .filter((r) => r.isActive)
      .map((role) => {
        const refRole = roleByCode.get(role.code.toLowerCase()) ?? null;
        return {
          id: role.id,
          label: refRole?.name || role.name,
          isSystemRole: role.isSystemRole,
          scope: inferScope(role, refRole),
        };
      });
  }, [roleData?.roles, roleByCode]);
  const roleLabelById = useMemo(() => {
    const map = new Map<string, string>();
    roleCatalog.forEach((r) => map.set(r.id, r.label));
    return map;
  }, [roleCatalog]);
  const roleScopeById = useMemo(() => {
    const map = new Map<string, ScopeLevel>();
    roleCatalog.forEach((r) => map.set(r.id, r.scope));
    return map;
  }, [roleCatalog]);
  const roleIsSystemById = useMemo(() => {
    const map = new Map<string, boolean>();
    roleCatalog.forEach((r) => map.set(r.id, r.isSystemRole));
    return map;
  }, [roleCatalog]);
  const assignmentsByProfile = useMemo(() => {
    const map = new Map<string, UserRoleNode[]>();
    assignments.forEach((a) => {
      const current = map.get(a.userProfileId) ?? [];
      current.push(a);
      map.set(a.userProfileId, current);
    });
    return map;
  }, [assignments]);
  const usersView = useMemo(() => {
    return users.map((u) => {
      const userAssignments = assignmentsByProfile.get(u.id) ?? [];
      const primary = userAssignments.find((a) => !a.companyId && !a.plantId && !a.administrativeDepartmentId) ?? userAssignments[0] ?? null;
      const primaryLabel = primary ? roleLabelById.get(primary.roleId) || primary.roleName : "No role";
      return { ...u, primaryRole: primaryLabel };
    });
  }, [assignmentsByProfile, roleLabelById, users]);
  const roleFilterOptions = useMemo(() => {
    const names = Array.from(new Set(usersView.map((u) => u.primaryRole).filter((n) => n !== "No role"))).sort((a, b) => a.localeCompare(b));
    return [{ value: "all", label: "All roles" }, ...names.map((name) => ({ value: name, label: name }))];
  }, [usersView]);
  const visibleUsers = useMemo(() => {
    if (roleFilter === "all") return usersView;
    return usersView.filter((u) => u.primaryRole === roleFilter);
  }, [roleFilter, usersView]);
  const selectedProfile = useMemo(() => users.find((u) => u.id === selectedUserProfileId) ?? null, [users, selectedUserProfileId]);
  const selectedAssignments = useMemo(() => (selectedUserProfileId ? assignmentsByProfile.get(selectedUserProfileId) ?? [] : []), [assignmentsByProfile, selectedUserProfileId]);
  const selectedPrimaryRoleLabel = useMemo(() => {
    const primary = selectedAssignments.find((a) => !a.companyId && !a.plantId && !a.administrativeDepartmentId) ?? selectedAssignments[0] ?? null;
    if (!primary) return "No role";
    return roleLabelById.get(primary.roleId) || primary.roleName;
  }, [roleLabelById, selectedAssignments]);
  const profileBaseline = useMemo<ProfileFormState>(() => {
    if (!selectedProfile) return emptyProfileForm;
    return {
      userId: selectedProfile.userId,
      companyId: selectedProfile.companyId || "",
      plantId: selectedProfile.plantId || "",
      administrativeDepartmentId: selectedProfile.administrativeDepartmentId || "",
      jobTitle: selectedProfile.jobTitle || "",
      phone: selectedProfile.phone || "",
    };
  }, [selectedProfile]);
  const profileMissing = useMemo(() => {
    const missing: string[] = [];
    if (!profileForm.userId) missing.push("userId");
    if (!profileForm.companyId) missing.push("companyId");
    return missing;
  }, [profileForm.companyId, profileForm.userId]);
  const profileDirty = useMemo(() => {
    return (
      profileForm.userId !== profileBaseline.userId ||
      profileForm.companyId !== profileBaseline.companyId ||
      profileForm.plantId !== profileBaseline.plantId ||
      profileForm.administrativeDepartmentId !== profileBaseline.administrativeDepartmentId ||
      profileForm.jobTitle !== profileBaseline.jobTitle ||
      profileForm.phone !== profileBaseline.phone
    );
  }, [profileBaseline, profileForm]);
  const selectedRoleScope: ScopeLevel | null = roleScopeById.get(roleForm.roleId) ?? null;
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (roleForm.companyId && d.companyId !== roleForm.companyId) return false;
      if (roleForm.plantId && d.plantId && d.plantId !== roleForm.plantId) return false;
      return true;
    });
  }, [departments, roleForm.companyId, roleForm.plantId]);
  const accessSummary = useMemo(() => {
    let global = 0;
    let company = 0;
    let plant = 0;
    let department = 0;
    selectedAssignments.forEach((a) => {
      if (a.administrativeDepartmentId) {
        department += 1;
      } else if (a.plantId) {
        plant += 1;
      } else if (a.companyId) {
        company += 1;
      } else {
        global += 1;
      }
    });
    return { global, company, plant, department };
  }, [selectedAssignments]);
  const filtersMeta = useMemo(() => {
    const chunks: string[] = [];
    if (statusFilter !== "all") chunks.push(`status:${statusFilter}`);
    if (roleFilter !== "all") chunks.push(`role:${roleFilter}`);
    if (userSearch.trim()) chunks.push(`search:${userSearch.trim()}`);
    return chunks.length ? chunks.join(" | ") : "none";
  }, [roleFilter, statusFilter, userSearch]);
  const resetRoleForm = () => {
    setRoleForm(emptyRoleForm);
    setRoleErrors({});
  };
  const onSelectUser = (id: string) => {
    setSelectedUserProfileId(id);
    setMode("view");
    setProfileError(null);
    setProfileTouched({});
    resetRoleForm();
  };
  const startCreateProfile = () => {
    setSelectedUserProfileId(null);
    setMode("createProfile");
    setProfileForm(emptyProfileForm);
    setProfileTouched({});
    setProfileError(null);
    resetRoleForm();
  };
  const startEditProfile = () => {
    if (!selectedProfile) return;
    setMode("editProfile");
    setProfileForm(profileBaseline);
    setProfileTouched({});
    setProfileError(null);
    resetRoleForm();
  };
  const startAssignRole = () => {
    if (!selectedProfile) return;
    setMode("assignRole");
    setProfileError(null);
    resetRoleForm();
  };
  const cancelMode = () => {
    setMode("view");
    setProfileTouched({});
    setProfileError(null);
    if (selectedProfile) setProfileForm(profileBaseline);
    else setProfileForm(emptyProfileForm);
    resetRoleForm();
  };
  const refreshAll = async () => {
    await Promise.all([refetchProfiles(), refetchRoles(), refetchAssignments()]);
  };
  const onProfileField = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "companyId") {
        next.plantId = "";
        next.administrativeDepartmentId = "";
      }
      if (field === "plantId") {
        next.administrativeDepartmentId = "";
      }
      return next;
    });
  };
  const saveProfile = async () => {
    setProfileTouched({ userId: true, companyId: true });
    if (profileMissing.length > 0) {
      setProfileError("Complete required fields: User and Company.");
      return;
    }
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      if (mode === "createProfile") {
        const result = await createUserProfile({
          variables: {
            input: {
              userId: profileForm.userId,
              companyId: asOptionalId(profileForm.companyId),
              plantId: asOptionalId(profileForm.plantId),
              administrativeDepartmentId: asOptionalId(profileForm.administrativeDepartmentId),
              jobTitle: profileForm.jobTitle || "",
              phone: profileForm.phone || "",
            },
          },
        });
        const payload = result.data?.createUserProfile;
        if (payload?.errors?.length) {
          setProfileError(payload.errors.map((e: { message: string }) => e.message).join(" "));
          return;
        }
        const createdId = payload?.userProfile?.id || null;
        await refetchProfiles();
        if (createdId) setSelectedUserProfileId(createdId);
      } else if (selectedProfile) {
        const result = await updateUserProfile({
          variables: {
            id: selectedProfile.id,
            input: {
              companyId: asOptionalId(profileForm.companyId),
              plantId: asOptionalId(profileForm.plantId),
              administrativeDepartmentId: asOptionalId(profileForm.administrativeDepartmentId),
              jobTitle: profileForm.jobTitle || "",
              phone: profileForm.phone || "",
            },
          },
        });
        const payload = result.data?.updateUserProfile;
        if (payload?.errors?.length) {
          setProfileError(payload.errors.map((e: { message: string }) => e.message).join(" "));
          return;
        }
        await refetchProfiles();
      }
      setMode("view");
      setProfileTouched({});
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };
  const validateRoleForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedUserProfileId) {
      errors.roleId = "Select a user and role.";
      return errors;
    }
    if (!roleForm.roleId) errors.roleId = "Select a role.";
    if (selectedRoleScope === "company" || selectedRoleScope === "plant" || selectedRoleScope === "department") {
      if (!roleForm.companyId) errors.companyId = "Select company for this scope.";
    }
    if (selectedRoleScope === "plant" || selectedRoleScope === "department") {
      if (!roleForm.plantId) errors.plantId = "Select plant for this scope.";
    }
    if (selectedRoleScope === "department") {
      if (!roleForm.administrativeDepartmentId) errors.administrativeDepartmentId = "Select department for this scope.";
    }
    return errors;
  };
  const assignRole = async () => {
    const errors = validateRoleForm();
    setRoleErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsAssigningRole(true);
    try {
      const result = await assignRoleToUser({
        variables: {
          input: {
            userProfileId: selectedUserProfileId,
            roleId: roleForm.roleId,
            companyId: selectedRoleScope === "global" ? null : asOptionalId(roleForm.companyId),
            plantId: selectedRoleScope === "plant" || selectedRoleScope === "department" ? asOptionalId(roleForm.plantId) : null,
            administrativeDepartmentId: selectedRoleScope === "department" ? asOptionalId(roleForm.administrativeDepartmentId) : null,
          },
        },
      });
      const payload = result.data?.assignRoleToUser;
      if (payload?.errors?.length) {
        setRoleErrors({ form: payload.errors.map((e: { message: string }) => e.message).join(" ") });
        return;
      }
      await refetchAssignments();
      setMode("view");
      resetRoleForm();
    } catch (error) {
      setRoleErrors({ form: error instanceof Error ? error.message : "Failed to assign role." });
    } finally {
      setIsAssigningRole(false);
    }
  };
  const removeRole = async (assignmentId: string) => {
    if (!window.confirm("Remove this role assignment?")) return;
    try {
      await removeRoleFromUser({ variables: { assignmentId } });
      await refetchAssignments();
    } catch (error) {
      setRoleErrors({ form: error instanceof Error ? error.message : "Failed to remove role." });
    }
  };
  const isProfileMode = mode === "editProfile" || mode === "createProfile";
  const isAssignMode = mode === "assignRole";
  const profileSaveDisabled = isSavingProfile || profileMissing.length > 0 || (mode === "editProfile" && !profileDirty);
  const roleAssignDisabled = isAssigningRole || Object.keys(validateRoleForm()).length > 0;
  const toolbarActions = (() => {
    if (isProfileMode) {
      return (
        <>
          <ToolbarButton icon={Save} label={isSavingProfile ? "Saving Profile..." : "Save Profile"} onClick={saveProfile} disabled={profileSaveDisabled} variant="success" />
          <ToolbarButton icon={X} label="Cancel" onClick={cancelMode} />
          <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} />
        </>
      );
    }
    if (isAssignMode) {
      return (
        <>
          <ToolbarButton icon={Plus} label={isAssigningRole ? "Saving..." : "Save Assignment"} onClick={assignRole} disabled={roleAssignDisabled} variant="success" />
          <ToolbarButton icon={X} label="Cancel Assignment" onClick={cancelMode} />
          <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} />
        </>
      );
    }
    if (selectedProfile) {
      return (
        <>
          <ToolbarButton icon={Plus} label="New Profile" onClick={startCreateProfile} />
          <ToolbarButton icon={Pencil} label="Edit Profile" onClick={startEditProfile} />
          <ToolbarButton icon={Plus} label="Assign Role" onClick={startAssignRole} />
          <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} disabled={loadingProfiles} />
        </>
      );
    }
    return (
      <>
        <ToolbarButton icon={Plus} label="New Profile" onClick={startCreateProfile} />
        <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} disabled={loadingProfiles} />
      </>
    );
  })();
  const toolbarSearch = <ToolbarSearch value={userSearch} onChange={setUserSearch} placeholder="Search users" />;
  const toolbarFilters = (
    <div className="flex items-center gap-2">
      <ToolbarDropdown
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: "all", label: "All status" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        className="w-28"
      />

      <ToolbarDropdown value={roleFilter} onChange={setRoleFilter} options={roleFilterOptions} className="w-36" />

    </div>
  );
  const footer = (
    <>
      <span>selected user: {safeText(selectedProfile?.fullName || selectedProfile?.username)}</span>
      <span>role count: {selectedAssignments.length}</span>
      <span>status: {selectedProfile ? (selectedProfile.isActive ? "active" : "inactive") : "—"}</span>
      <span>filters: {filtersMeta}</span>
    </>
  );
  const sectionTitle = "text-[11px] font-semibold uppercase tracking-wide text-blue-600";
  const label = "text-[11px] font-medium text-muted-foreground";
  return (
    <AppPageLayout
      icon={<ShieldCheck />}
      iconClass={theme.iconBoxBrand}
      title="Users & Roles"
      subtitle="Manage profiles and scoped role assignments from a single record workspace."
      toolbar={<Toolbar left={toolbarSearch} right={<div className="flex w-full items-center justify-between">{toolbarFilters}<div className="flex items-center gap-0.5">{toolbarActions}</div></div>} />}
      footer={footer}
      leftColumn={
        <RecordListPanel
          title="Users"
          records={visibleUsers}
          selectedId={selectedUserProfileId}
          onSelect={onSelectUser}
          getId={(u) => u.id}
          renderRecord={(user, selected) => (
            <>
              <span className="flex items-center justify-between gap-1.5">
                <span className={`truncate text-[13px] leading-tight ${selected ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                  {user.fullName || user.username}
                </span>
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-300"}`} />
              </span>
              <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">{safeText(user.username || user.email)}</span>
              <span className="mt-0.5 block truncate text-[11px] leading-tight text-blue-600">{safeText(user.primaryRole)}</span>
            </>
          )}
        />
      }
      leftColumnWidth="w-[20%]"
    >
      <section className="flex min-h-0 min-w-0 flex-col bg-background">
            {!selectedProfile && mode !== "createProfile" ? (
              <div className="flex h-full items-center justify-center px-8">
                <div className="max-w-lg text-center">
                  <UserRound className="mx-auto h-8 w-8 text-blue-500" />
                  <h3 className="mt-3 text-base font-semibold text-foreground">Select a user to view profile and roles</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Choose a user from the list, or create a new profile.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-border/40 px-4 py-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">{safeText(selectedProfile?.fullName || (mode === "createProfile" ? "New Profile" : ""))}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {selectedProfile ? `${safeText(selectedProfile.username)} / ${safeText(selectedProfile.email)}` : "New user profile"}
                      </div>
                      {selectedProfile && (
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>Company: {safeText(selectedProfile.companyName)}</span>
                          <span>Plant: {safeText(selectedProfile.plantName)}</span>
                          <span>Department: {safeText(selectedProfile.administrativeDepartmentName)}</span>
                          <span>Job Title: {safeText(selectedProfile.jobTitle)}</span>
                          <span>Phone: {safeText(selectedProfile.phone)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[11px]">
                      <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${selectedProfile?.isActive !== false ? "border-green-500/50 text-green-600" : "border-gray-300/60 text-gray-400"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedProfile?.isActive !== false ? "bg-green-500" : "bg-gray-300"}`} />
                        {selectedProfile?.isActive !== false ? "Active" : "Inactive"}
                      </span>
                      {selectedProfile && (
                        <span className="inline-flex rounded border border-blue-400/50 px-2 py-0.5 text-blue-600">{safeText(selectedPrimaryRoleLabel)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="min-h-0 overflow-y-auto">
                  {isProfileMode && (
                    <div className="border-b border-border/40 px-4 py-2">
                      <h4 className={sectionTitle}>Profile</h4>
                      {profileError && <p className="mt-1 text-xs text-red-600">{profileError}</p>}
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <div>
                          <label className={label}>User *</label>
                          <select
                            value={profileForm.userId}
                            onChange={(e) => onProfileField("userId", e.target.value)}
                            disabled={mode !== "createProfile"}
                            className={`mt-0.5 h-7 w-full border bg-card px-2 text-xs outline-none ${profileTouched.userId && !profileForm.userId ? "border-red-400" : "border-input"} ${mode !== "createProfile" ? "opacity-70" : ""}`}
                          >
                            <option value="">Select user</option>
                            {selectableUsers.map((u) => (
                              <option key={u.id} value={u.id}>{u.fullName || u.username} ({u.username})</option>
                            ))}
                          </select>
                          {profileTouched.userId && !profileForm.userId && <p className="mt-0.5 text-[11px] text-red-600">Required</p>}
                        </div>
                        <div>
                          <label className={label}>Company *</label>
                          <select
                            value={profileForm.companyId}
                            onChange={(e) => onProfileField("companyId", e.target.value)}
                            className={`mt-0.5 h-7 w-full border bg-card px-2 text-xs outline-none ${profileTouched.companyId && !profileForm.companyId ? "border-red-400" : "border-input"}`}
                          >
                            <option value="">Select company</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          {profileTouched.companyId && !profileForm.companyId && <p className="mt-0.5 text-[11px] text-red-600">Required</p>}
                        </div>
                        <div>
                          <label className={label}>Plant</label>
                          <select
                            value={profileForm.plantId}
                            onChange={(e) => onProfileField("plantId", e.target.value)}
                            className="mt-0.5 h-7 w-full border border-input bg-card px-2 text-xs outline-none"
                          >
                            <option value="">Select plant</option>
                            {plants
                              .filter((p) => !profileForm.companyId || p.companyId === profileForm.companyId)
                              .map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className={label}>Admin Department</label>
                          <select
                            value={profileForm.administrativeDepartmentId}
                            onChange={(e) => onProfileField("administrativeDepartmentId", e.target.value)}
                            className="mt-0.5 h-7 w-full border border-input bg-card px-2 text-xs outline-none"
                          >
                            <option value="">Select department</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={label}>Job Title</label>
                          <input
                            type="text"
                            value={profileForm.jobTitle}
                            onChange={(e) => onProfileField("jobTitle", e.target.value)}
                            className="mt-0.5 h-7 w-full border border-input bg-card px-2 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className={label}>Phone</label>
                          <input
                            type="text"
                            value={profileForm.phone}
                            onChange={(e) => onProfileField("phone", e.target.value)}
                            className="mt-0.5 h-7 w-full border border-input bg-card px-2 text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="border-b border-border/40 px-4 py-2">
                    <h4 className={sectionTitle}>Role Assignments</h4>
                    {isAssignMode && (
                      <div className="mt-2 rounded border border-border/60 bg-card px-3 py-2">
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className={label}>Role *</label>
                            <select
                              value={roleForm.roleId}
                              onChange={(e) => {
                                setRoleForm((prev) => ({ ...prev, roleId: e.target.value, companyId: "", plantId: "", administrativeDepartmentId: "" }));
                                setRoleErrors({});
                              }}
                              className={`mt-0.5 h-7 w-full border bg-card px-2 text-xs outline-none ${roleErrors.roleId ? "border-red-400" : "border-input"}`}
                            >
                              <option value="">Select role</option>
                              {roleCatalog.map((role) => (
                                <option key={role.id} value={role.id}>{role.label}</option>
                              ))}
                            </select>
                            {roleErrors.roleId && <p className="mt-0.5 text-[11px] text-red-600">{roleErrors.roleId}</p>}
                          </div>
                          <div>
                            <label className={label}>Company</label>
                            <select
                              value={roleForm.companyId}
                              onChange={(e) => setRoleForm((prev) => ({ ...prev, companyId: e.target.value, plantId: "", administrativeDepartmentId: "" }))}
                              disabled={selectedRoleScope === "global"}
                              className={`mt-0.5 h-7 w-full border bg-card px-2 text-xs outline-none ${roleErrors.companyId ? "border-red-400" : "border-input"} disabled:opacity-60`}
                            >
                              <option value="">{selectedRoleScope === "global" ? "Global" : "Select company"}</option>
                              {companies.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            {roleErrors.companyId && <p className="mt-0.5 text-[11px] text-red-600">{roleErrors.companyId}</p>}
                          </div>
                          <div>
                            <label className={label}>Plant</label>
                            <select
                              value={roleForm.plantId}
                              onChange={(e) => setRoleForm((prev) => ({ ...prev, plantId: e.target.value, administrativeDepartmentId: "" }))}
                              disabled={selectedRoleScope === "global" || selectedRoleScope === "company"}
                              className={`mt-0.5 h-7 w-full border bg-card px-2 text-xs outline-none ${roleErrors.plantId ? "border-red-400" : "border-input"} disabled:opacity-60`}
                            >
                              <option value="">{selectedRoleScope === "plant" || selectedRoleScope === "department" ? "Select plant" : "Global"}</option>
                              {plants
                                .filter((p) => !roleForm.companyId || p.companyId === roleForm.companyId)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {roleErrors.plantId && <p className="mt-0.5 text-[11px] text-red-600">{roleErrors.plantId}</p>}
                          </div>
                          <div>
                            <label className={label}>Department</label>
                            <select
                              value={roleForm.administrativeDepartmentId}
                              onChange={(e) => setRoleForm((prev) => ({ ...prev, administrativeDepartmentId: e.target.value }))}
                              disabled={selectedRoleScope !== "department"}
                              className={`mt-0.5 h-7 w-full border bg-card px-2 text-xs outline-none ${roleErrors.administrativeDepartmentId ? "border-red-400" : "border-input"} disabled:opacity-60`}
                            >
                              <option value="">{selectedRoleScope === "department" ? "Select department" : "Global"}</option>
                              {filteredDepartments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            {roleErrors.administrativeDepartmentId && <p className="mt-0.5 text-[11px] text-red-600">{roleErrors.administrativeDepartmentId}</p>}
                          </div>
                        </div>
                        {roleErrors.form && <p className="mt-1 text-xs text-red-600">{roleErrors.form}</p>}
                      </div>
                    )}
                    {selectedAssignments.length === 0 && !isAssignMode && (
                      <p className="mt-2 text-xs text-muted-foreground">No role assignments yet. Use Assign Role to add one.</p>
                    )}
                    {selectedAssignments.length > 0 && (
                      <div className="mt-2 overflow-hidden rounded border border-border/40">
                        <table className="w-full table-fixed text-xs">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-medium">Role</th>
                              <th className="px-2 py-1.5 text-left font-medium">Scope</th>
                              <th className="px-2 py-1.5 text-left font-medium">Company</th>
                              <th className="px-2 py-1.5 text-left font-medium">Plant</th>
                              <th className="px-2 py-1.5 text-left font-medium">Department</th>
                              <th className="px-2 py-1.5 text-right font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAssignments.map((a) => {
                              const scope: ScopeLevel = a.administrativeDepartmentId ? "department" : a.plantId ? "plant" : a.companyId ? "company" : "global";
                              const userRoleLabel = roleLabelById.get(a.roleId) || a.roleName;
                              return (
                                <tr key={a.id} className="border-t border-border/20">
                                  <td className="truncate px-2 py-1.5">{userRoleLabel}</td>
                                  <td className="px-2 py-1.5">
                                    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] ${scopeBadge(scope)}`}>{scopeLabel(scope)}</span>
                                  </td>
                                  <td className="truncate px-2 py-1.5 text-muted-foreground">{safeText(a.companyName)}</td>
                                  <td className="truncate px-2 py-1.5 text-muted-foreground">{safeText(a.plantName)}</td>
                                  <td className="truncate px-2 py-1.5 text-muted-foreground">{safeText(a.administrativeDepartmentName)}</td>
                                  <td className="px-2 py-1.5 text-right">
                                    {!roleIsSystemById.get(a.roleId) ? (
                                      <button
                                        type="button"
                                        onClick={() => removeRole(a.id)}
                                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                                        title="Remove role"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        <span className="text-[11px]">Remove</span>
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2">
                    <h4 className={sectionTitle}>Access Summary</h4>
                    <div className="mt-1 text-[11px] text-muted-foreground/70">
                      Global {accessSummary.global} · Company {accessSummary.company} · Plant {accessSummary.plant} · Department {accessSummary.department}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
    </AppPageLayout>
  );
}
