import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Database, Landmark, Factory, Users, Shield, ShieldCheck, RefreshCw, ChevronDown, ChevronRight, UserPlus, UserX, Briefcase, Trash2, CheckCircle2, Loader2, X } from "lucide-react";
import { RecordListPanel, RecordListItem } from "@/components/layout/RecordListPanel";
import { ResizableSplitPane } from "@/components/layout/ResizableSplitPane";
import { ToolbarButton } from "@/components/layout/PageToolbar";
import { useToolbar } from "./toolbarContext";
import { COMPANIES_LIST_QUERY, USER_PROFILES_QUERY, USER_ROLES_ALL_QUERY, ROLES_QUERY } from "@/graphql/administrationQueries";
import { ASSIGN_ROLE_TO_USER, REMOVE_ROLE_FROM_USER } from "@/graphql/administrationMutations";
import { PLANTS_QUERY } from "@/graphql/plantQueries";

interface CompanyNode { id: string; code: string; name: string; }
interface PlantNode { id: string; name: string; companyId: string; }
interface UserProfileNode { id: string; userId: string; username: string; email: string; fullName: string; companyId?: string | null; companyName?: string | null; plantId?: string | null; plantName?: string | null; isActive: boolean; }
interface UserRoleNode { id: string; userProfileId: string; roleId: string; roleName: string; roleCode: string; username: string; fullName: string; companyId?: string | null; companyName?: string | null; plantId?: string | null; plantName?: string | null; accessLevel?: string; isActive: boolean; }
interface RoleNode { id: string; code: string; name: string; isSystemRole: boolean; permissions: Array<{ module: string; action: string }>; }

type ScopeLevel = "global" | "company" | "plant" | "department";
type AccessGroupMode = "view" | "assignUser" | "assignRole" | "removeUser" | "removeRole";

function safeText(v: string | null | undefined): string { const s = v?.trim(); return s ? s : "—"; }

const hdr = "h-8 border-b border-border bg-muted px-3 flex items-center";
const secTitle = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
const scopeBadgeMap: Record<ScopeLevel, string> = {
  global: "border-blue-400/60 text-primary bg-primary/10",
  company: "border-indigo-400/60 text-primary bg-indigo-50",
  plant: "border-purple-400/60 text-accent-foreground bg-purple-50",
  department: "border-cyan-400/60 text-cyan-600 bg-cyan-50",
};
const scopeLabelMap: Record<ScopeLevel, string> = { global: "Global", company: "Company", plant: "Plant", department: "Department" };

function inferAccessScope(roleCode: string, roleName: string): ScopeLevel {
  const probe = `${roleCode} ${roleName}`.toLowerCase();
  if (probe.includes("department") || probe.includes("dept")) return "department";
  if (probe.includes("plant") || probe.includes("factory")) return "plant";
  if (probe.includes("company")) return "company";
  return "global";
}

export function AccessGroupsTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [mode, setMode] = useState<AccessGroupMode>("view");
  const [assignFormRoleId, setAssignFormRoleId] = useState("");
  const [assignFormUserId, setAssignFormUserId] = useState("");
  const [assignFormError, setAssignFormError] = useState<string | null>(null);
  const [assignFormSubmitting, setAssignFormSubmitting] = useState(false);
  const [removeConfirmTarget, setRemoveConfirmTarget] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const { data: companiesData, refetch: refetchCompanies } = useQuery<{ companies: CompanyNode[] }>(COMPANIES_LIST_QUERY);
  const { data: plantsData, refetch: refetchPlants } = useQuery<{ plants: PlantNode[] }>(PLANTS_QUERY);
  const { data: profileData, refetch: refetchProfiles } = useQuery<{ userProfiles: UserProfileNode[] }>(USER_PROFILES_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: assignmentData, refetch: refetchAssignments } = useQuery<{ userRoles: UserRoleNode[] }>(USER_ROLES_ALL_QUERY, { fetchPolicy: "cache-and-network" });
  const { data: roleData } = useQuery<{ roles: RoleNode[] }>(ROLES_QUERY, { variables: { isActive: true }, fetchPolicy: "cache-and-network" });

  const companies = companiesData?.companies ?? [];
  const plants = plantsData?.plants ?? [];
  const users = profileData?.userProfiles ?? [];
  const [assignRoleToUserMut] = useMutation(ASSIGN_ROLE_TO_USER);
  const [removeRoleFromUserMut] = useMutation(REMOVE_ROLE_FROM_USER);

  const assignments = (assignmentData?.userRoles ?? []).filter((a) => a.isActive);
  const roleCatalog = roleData?.roles ?? [];

  const [orgPage, setOrgPage] = useState(1);
  const ORG_PAGE_SIZE = 25;
  const orgPageCount = Math.max(1, Math.ceil(companies.length / ORG_PAGE_SIZE));
  const safeOrgPage = Math.min(orgPage, orgPageCount);
  const paginatedCompanies = companies.slice((safeOrgPage - 1) * ORG_PAGE_SIZE, safeOrgPage * ORG_PAGE_SIZE);

  // Capability flags (backend-driven in future)
  const capabilities = useMemo(() => ({
    canAssignUser: true, canRemoveUser: true, canAssignRole: true, canRemoveRole: true, canViewEffectiveAccess: true,
  }), []);

  const selectedCompany = useMemo(() => companies.find((c) => c.id === selectedCompanyId) ?? null, [companies, selectedCompanyId]);
  const companyPlants = useMemo(() => {
    if (!selectedCompanyId) return [];
    return plants.filter((p) => p.companyId === selectedCompanyId);
  }, [plants, selectedCompanyId]);

  const companyUsers = useMemo(() => {
    if (!selectedCompanyId) return [];
    let filtered = users.filter((u) => u.companyId === selectedCompanyId);
    if (selectedPlantId) filtered = filtered.filter((u) => u.plantId === selectedPlantId);
    if (search.trim()) { const q = search.toLowerCase(); filtered = filtered.filter((u) => (u.fullName || u.username).toLowerCase().includes(q)); }
    return filtered;
  }, [users, selectedCompanyId, selectedPlantId, search]);

  const plantUserCounts = useMemo(() => {
    const m = new Map<string, number>();
    if (!selectedCompanyId) return m;
    users.filter((u) => u.companyId === selectedCompanyId && u.plantId).forEach((u) => { m.set(u.plantId!, (m.get(u.plantId!) ?? 0) + 1); });
    return m;
  }, [users, selectedCompanyId]);

  const userRolesMap = useMemo(() => {
    const m = new Map<string, UserRoleNode[]>();
    assignments.forEach((a) => {
      const list = m.get(a.userProfileId) ?? [];
      list.push(a);
      m.set(a.userProfileId, list);
    });
    return m;
  }, [assignments]);

  // Roles in the selected scope, grouped by scope level
  const scopeRoles = useMemo(() => {
    const profileIds = new Set(companyUsers.map((u) => u.id));
    const roleCounts = new Map<string, { roleName: string; roleCode: string; count: number; scope: ScopeLevel }>();
    assignments.filter((a) => profileIds.has(a.userProfileId)).forEach((a) => {
      const key = a.roleId;
      if (!roleCounts.has(key)) {
        const catRole = roleCatalog.find((r) => r.id === a.roleId);
        const scope = catRole ? inferAccessScope(catRole.code, catRole.name) : "global";
        roleCounts.set(key, { roleName: a.roleName, roleCode: a.roleCode, count: 0, scope });
      }
      roleCounts.get(key)!.count++;
    });
    const grouped: Record<ScopeLevel, Array<{ roleName: string; roleCode: string; count: number }>> = { global: [], company: [], plant: [], department: [] };
    roleCounts.forEach((v) => { grouped[v.scope].push({ roleName: v.roleName, roleCode: v.roleCode, count: v.count }); });
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => b.count - a.count));
    return grouped;
  }, [companyUsers, assignments, roleCatalog]);

  const scopeRolesTotal = Object.values(scopeRoles).reduce((sum, arr) => sum + arr.length, 0);

  const visibleMembers = useMemo(() => {
    if (showAllMembers) return companyUsers;
    return companyUsers.slice(0, 7);
  }, [companyUsers, showAllMembers]);

  const hasMoreMembers = companyUsers.length > 7;

  const scopeSummary = useMemo(() => {
    let company = 0, plant = 0;
    if (selectedCompanyId) {
      company = users.filter((u) => u.companyId === selectedCompanyId).length;
      plant = companyPlants.reduce((sum, p) => sum + (plantUserCounts.get(p.id) ?? 0), 0);
    }
    return { company, plant, unassigned: company - plant };
  }, [selectedCompanyId, companyPlants, plantUserCounts, users]);

  const refreshAll = () => { Promise.all([refetchCompanies(), refetchPlants(), refetchProfiles(), refetchAssignments()]); };

  const { setToolbar, setFooter } = useToolbar();

  const handleAssignUserOrRole = useCallback(async () => {
    if (!selectedCompany || !assignFormUserId || !assignFormRoleId) return;
    setAssignFormError(null);
    setAssignFormSubmitting(true);
    try {
      const res = await assignRoleToUserMut({
        variables: {
          input: {
            userProfileId: assignFormUserId,
            roleId: assignFormRoleId,
            companyId: selectedCompany?.id || null,
            plantId: selectedPlantId || null,
          },
        },
      });
      const payload = (res.data as { assignRoleToUser?: { errors?: Array<{ message: string }> } } | undefined)?.assignRoleToUser;
      if (payload?.errors?.length) {
        setAssignFormError(payload.errors.map((e: { message: string }) => e.message).join("; "));
      } else {
        await refetchAssignments();
        setMode("view");
        setAssignFormUserId("");
        setAssignFormRoleId("");
      }
    } catch (error) {
      setAssignFormError(error instanceof Error ? error.message : "Failed to assign.");
    } finally { setAssignFormSubmitting(false); }
  }, [selectedCompany, selectedPlantId, assignFormUserId, assignFormRoleId, assignRoleToUserMut, refetchAssignments]);

  const handleRemoveUser = useCallback(async () => {
    if (!removeConfirmTarget || !selectedCompany) return;
    setIsRemoving(true);
    try {
      const userAssignments = assignments.filter((a) => a.userProfileId === removeConfirmTarget);
      for (const a of userAssignments) {
        await removeRoleFromUserMut({ variables: { assignmentId: a.id } });
      }
      await refetchAssignments();
      setRemoveConfirmTarget(null);
      setMode("view");
    } catch (error) {
      setAssignFormError(error instanceof Error ? error.message : "Failed to remove user.");
      setRemoveConfirmTarget(null);
    } finally { setIsRemoving(false); }
  }, [removeConfirmTarget, selectedCompany, assignments, removeRoleFromUserMut, refetchAssignments]);

  const handleRemoveRole = useCallback(async () => {
    if (!removeConfirmTarget || !selectedCompany) return;
    setIsRemoving(true);
    try {
      const scopeProfileIds = new Set(companyUsers.map((u) => u.id));
      // removeConfirmTarget stores the roleName, so find matching assignments by name
      const roleAssignments = assignments.filter((a) => {
        if (!scopeProfileIds.has(a.userProfileId)) return false;
        return a.roleName === removeConfirmTarget;
      });
      for (const a of roleAssignments) {
        await removeRoleFromUserMut({ variables: { assignmentId: a.id } });
      }
      await refetchAssignments();
      setRemoveConfirmTarget(null);
      setMode("view");
    } catch (error) {
      setAssignFormError(error instanceof Error ? error.message : "Failed to remove role.");
      setRemoveConfirmTarget(null);
    } finally { setIsRemoving(false); }
  }, [removeConfirmTarget, selectedCompany, companyUsers, assignments, removeRoleFromUserMut, refetchAssignments]);

  const openAssignUser = () => {
    setAssignFormUserId("");
    setAssignFormRoleId("");
    setAssignFormError(null);
    setMode("assignUser");
  };

  const openAssignRole = () => {
    setAssignFormUserId("");
    setAssignFormRoleId("");
    setAssignFormError(null);
    setMode("assignRole");
  };

  const toolbarActions = useMemo(() => (
    <div className="flex items-center gap-0.5">
      {(mode === "assignUser" || mode === "assignRole") ? (<>
        <ToolbarButton icon={CheckCircle2 as any} label={assignFormSubmitting ? "Saving..." : "Save"} onClick={handleAssignUserOrRole} disabled={assignFormSubmitting || !assignFormUserId || !assignFormRoleId} variant="edit" />
        <ToolbarButton icon={X} label="Cancel" onClick={() => setMode("view")} variant="danger" />
        <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} variant="neutral" />
      </>) : (<>
        {capabilities.canAssignUser && <ToolbarButton icon={UserPlus as any} label="Assign User" onClick={openAssignUser} disabled={!selectedCompany} variant="create" />}
        {capabilities.canAssignRole && <ToolbarButton icon={Briefcase as any} label="Assign Role" onClick={openAssignRole} disabled={!selectedCompany} variant="create" />}
        {selectedCompany && mode === "removeUser" ? (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-danger font-medium">Remove this user?</span>
            <button type="button" onClick={handleRemoveUser} disabled={isRemoving} className="inline-flex h-7 items-center rounded bg-danger px-2 text-[10px] font-semibold text-white hover:bg-danger/80 disabled:opacity-60">{isRemoving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}Yes</button>
            <button type="button" onClick={() => setMode("view")} className="inline-flex h-7 items-center rounded border border-border bg-background px-2 text-[10px] text-muted-foreground hover:bg-muted">No</button>
          </div>
        ) : (
          capabilities.canRemoveUser && <ToolbarButton icon={UserX as any} label="Remove User" onClick={() => { setMode("removeUser"); setRemoveConfirmTarget(null); }} disabled={!selectedCompany || mode === "removeRole"} variant="danger" />
        )}
        {selectedCompany && mode === "removeRole" ? (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-danger font-medium">Remove this role?</span>
            <button type="button" onClick={handleRemoveRole} disabled={isRemoving} className="inline-flex h-7 items-center rounded bg-danger px-2 text-[10px] font-semibold text-white hover:bg-danger/80 disabled:opacity-60">{isRemoving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}Yes</button>
            <button type="button" onClick={() => setMode("view")} className="inline-flex h-7 items-center rounded border border-border bg-background px-2 text-[10px] text-muted-foreground hover:bg-muted">No</button>
          </div>
        ) : (
          capabilities.canRemoveRole && <ToolbarButton icon={Trash2 as any} label="Remove Role" onClick={() => { setMode("removeRole"); setRemoveConfirmTarget(null); }} disabled={!selectedCompany || mode === "removeUser"} variant="danger" />
        )}
        {selectedCompany && mode === "view" && <span className="mx-0.5 h-5 w-px shrink-0 bg-muted/80" />}
        <ToolbarButton icon={RefreshCw} label="Refresh" onClick={refreshAll} variant="neutral" />
      </>)}
    </div>
  ), [mode, capabilities, selectedCompany, assignFormSubmitting, assignFormUserId, assignFormRoleId, handleAssignUserOrRole, refreshAll, isRemoving, handleRemoveUser, handleRemoveRole]);

  const toolbarActionsRef = useRef<ReactNode>(null);
  toolbarActionsRef.current = toolbarActions;

  useEffect(() => {
    setToolbar({
      searchValue: search,
      onSearchChange: setSearch,
      searchPlaceholder: "Search users in scope",
      leftWidthClass: undefined,
      actions: toolbarActionsRef.current,
    });
    setFooter(
      selectedCompany ? (
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{companyUsers.length} user{companyUsers.length !== 1 ? "s" : ""} in scope</span>
          <span className="h-4 w-px bg-muted/80" />
          <span>{companyPlants.length} plant{companyPlants.length !== 1 ? "s" : ""}</span>
          <span className="h-4 w-px bg-muted/80" />
          <span>{scopeRolesTotal} role{scopeRolesTotal !== 1 ? "s" : ""}</span>
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">{users.length} total users</span>
      )
    );
    return () => { setToolbar(null); setFooter(null); };
  }, [search, mode, selectedCompany?.id, companyUsers.length, companyPlants.length, scopeRolesTotal, users.length, assignFormSubmitting, assignFormUserId, assignFormRoleId, isRemoving, removeConfirmTarget]);

  return (
    <ResizableSplitPane
          left={<RecordListPanel title="Organizations" count={companies.length}
              pagination={companies.length > 0 ? {
                start: (safeOrgPage - 1) * ORG_PAGE_SIZE + 1,
                end: Math.min(safeOrgPage * ORG_PAGE_SIZE, companies.length),
                total: companies.length,
                page: safeOrgPage,
                totalPages: orgPageCount,
                onPageChange: (p: number) => setOrgPage(p),
              } : undefined}
              emptyState={
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
                  <Database className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                  <span className="text-sm font-medium text-muted-foreground">No companies configured</span>
                </div>
              }
            >
              {paginatedCompanies.map((company) => {
                const sel = company.id === selectedCompanyId;
                const companyUserCount = users.filter((u) => u.companyId === company.id).length;
                const companyPlantCount = plants.filter((p) => p.companyId === company.id).length;
                return (
                  <div key={company.id}>
                    <RecordListItem
                      active={sel}
                      onClick={() => { setSelectedCompanyId(sel ? null : company.id); setSelectedPlantId(null); setShowAllMembers(false); }}
                      leading={<Landmark className="h-3.5 w-3.5 shrink-0 text-primary stroke-current" />}
                      title={
                        <span className={`truncate ${sel ? "font-semibold" : "font-medium"}`}>{company.name}</span>
                      }
                      subtitle={
                        <>
                          <span className="inline-flex rounded border border-indigo-400/60 px-1 py-0.5 text-[10px] text-primary bg-indigo-50">Company</span>
                          <span>{companyUserCount} user{companyUserCount !== 1 ? "s" : ""}</span>
                          <span>{companyPlantCount} plant{companyPlantCount !== 1 ? "s" : ""}</span>
                        </>
                      }
                    />
                    {sel && (
                      <div className="border-b border-border/50">
                        {companyPlants.length === 0 ? (
                          <div className="px-4 py-1.5 text-[10px] text-muted-foreground italic">No plants configured</div>
                        ) : (
                          companyPlants.map((plant) => {
                            const plantSel = plant.id === selectedPlantId;
                            const plantCount = plantUserCounts.get(plant.id) ?? 0;
                            return (
                              <button key={plant.id} type="button" onClick={() => setSelectedPlantId(plantSel ? null : plant.id)}
                                className={`flex w-full items-center gap-2 pl-[36px] pr-3 py-2 border-b border-border/50 text-left transition-all ${plantSel ? "bg-muted/50 text-primary" : "hover:bg-background text-muted-foreground"}`}>
                                <Factory className="h-3 w-3 shrink-0 text-success stroke-current" />
                                <span className={`truncate text-xs ${plantSel ? "font-semibold" : ""}`}>{plant.name}</span>
                                <span className="ml-auto text-[10px] font-medium text-muted-foreground">{plantCount}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </RecordListPanel>}
          storageKey="lmd:access-groups-split"
          right={<>
            {mode === "assignUser" && selectedCompany ? (
              <div className="h-full overflow-y-auto">
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Assign User — {selectedCompany.name}</h2>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">Select a user and role to assign within this scope.</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {assignFormError && <div className="rounded border border-danger/20 bg-danger/10 px-3 py-1.5 text-[12px] text-danger">{assignFormError}</div>}
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">User *</label>
                    <select value={assignFormUserId} onChange={(e) => setAssignFormUserId(e.target.value)}
                      className="h-8 w-full rounded border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-primary">
                      <option value="">Select user</option>
                      {users.filter((u) => u.isActive).filter((u) => !selectedPlantId || u.plantId === selectedPlantId).map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName || u.username}{u.companyName ? ` — ${u.companyName}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Role *</label>
                    <select value={assignFormRoleId} onChange={(e) => setAssignFormRoleId(e.target.value)}
                      className="h-8 w-full rounded border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-primary">
                      <option value="">Select role</option>
                      {roleCatalog.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : mode === "assignRole" && selectedCompany ? (
              <div className="h-full overflow-y-auto">
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Assign Role — {selectedCompany.name}</h2>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">Select a role and user to assign within this scope.</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {assignFormError && <div className="rounded border border-danger/20 bg-danger/10 px-3 py-1.5 text-[12px] text-danger">{assignFormError}</div>}
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Role *</label>
                    <select value={assignFormRoleId} onChange={(e) => setAssignFormRoleId(e.target.value)}
                      className="h-8 w-full rounded border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-primary">
                      <option value="">Select role</option>
                      {roleCatalog.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">User *</label>
                    <select value={assignFormUserId} onChange={(e) => setAssignFormUserId(e.target.value)}
                      className="h-8 w-full rounded border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-primary">
                      <option value="">Select user</option>
                      {users.filter((u) => u.isActive).filter((u) => !selectedPlantId || u.plantId === selectedPlantId).map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName || u.username}{u.companyName ? ` — ${u.companyName}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : mode === "removeUser" && selectedCompany ? (
              <div className="h-full overflow-y-auto">
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Remove User — {selectedCompany.name}</h2>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">Select a user to remove from this scope.</p>
                </div>
                {companyUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground/60">
                    <Users className="h-5 w-5 mb-1" />
                    <span>No users in this scope to remove.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {companyUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/60">
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] font-medium text-foreground">{u.fullName || u.username}</span>
                          {u.email && <span className="ml-2 text-[11px] text-muted-foreground/60">{u.email}</span>}
                        </div>
                        <button type="button" onClick={() => setRemoveConfirmTarget(u.id)}
                          className={`inline-flex h-7 items-center gap-1 rounded px-2.5 text-[11px] font-medium transition-colors ${
                            removeConfirmTarget === u.id
                              ? "bg-danger text-white"
                              : "border border-danger/20 text-danger hover:bg-danger/10"
                          }`}>
                          {removeConfirmTarget === u.id ? "Selected, confirm in toolbar" : "Remove"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : mode === "removeRole" && selectedCompany ? (
              <div className="h-full overflow-y-auto">
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Remove Role — {selectedCompany.name}</h2>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">Select a role to remove from users in this scope.</p>
                </div>
                {(() => {
                  const allScopeRoleEntries = Object.values(scopeRoles).flat();
                  if (allScopeRoleEntries.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground/60">
                        <Shield className="h-5 w-5 mb-1" />
                        <span>No roles assigned in this scope.</span>
                      </div>
                    );
                  }
                  return (
                    <div className="divide-y divide-border/50">
                      {allScopeRoleEntries.map((r) => (
                        <div key={r.roleName} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/60">
                          <div className="min-w-0 flex-1">
                            <span className="text-[13px] font-medium text-foreground">{r.roleName}</span>
                            <span className="ml-2 text-[11px] text-muted-foreground/60">({r.count} user{r.count !== 1 ? 's' : ''})</span>
                          </div>
                          <button type="button" onClick={() => setRemoveConfirmTarget(r.roleName)}
                            className={`inline-flex h-7 items-center gap-1 rounded px-2.5 text-[11px] font-medium transition-colors ${
                              removeConfirmTarget === r.roleName
                                ? "bg-danger text-white"
                                : "border border-danger/20 text-danger hover:bg-danger/10"
                            }`}>
                            {removeConfirmTarget === r.roleName ? "Selected, confirm in toolbar" : "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : !selectedCompany ? (
              <div className="flex h-full items-center justify-center px-8">
                <div className="max-w-lg text-center">
                  <Landmark className="mx-auto h-8 w-8 text-primary" />
                  <h3 className="mt-3 text-base font-semibold text-foreground">Select an organization</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Choose a company or plant from the hierarchy to view access groups, members, and roles.</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                {/* Summary Strip */}
                <div className="shrink-0 border-b border-border px-4 py-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-primary stroke-current shrink-0" />
                        <h2 className="truncate text-sm font-semibold text-foreground">{selectedCompany.name}</h2>
                        {selectedPlantId && (() => {
                          const plant = companyPlants.find((p) => p.id === selectedPlantId);
                          return plant ? <><span className="text-muted-foreground/30">/</span><span className="truncate text-sm font-semibold text-foreground">{plant.name}</span></> : null;
                        })()}
                        <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${selectedPlantId ? scopeBadgeMap["plant"] : scopeBadgeMap["company"]}`}>
                          {selectedPlantId ? "Plant" : "Company"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span><span className="font-medium text-muted-foreground">{selectedPlantId ? scopeSummary.plant : scopeSummary.company}</span> user{selectedPlantId ? scopeSummary.plant !== 1 ? "s" : "" : scopeSummary.company !== 1 ? "s" : ""}</span>
                        <span><span className="font-medium text-muted-foreground">{selectedPlantId ? 0 : companyPlants.length}</span> plant{selectedPlantId ? "" : companyPlants.length !== 1 ? "s" : ""}</span>
                        <span><span className="font-medium text-muted-foreground">{scopeRolesTotal}</span> role{scopeRolesTotal !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  {/* Assigned Roles grouped by scope */}
                  <div className="border-b border-border">
                    <div className={hdr}><span className={secTitle}>Assigned Roles</span></div>
                    {scopeRolesTotal === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground/60">
                        <Shield className="h-4 w-4" />
                        <span>No roles assigned in this scope.</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {(Object.entries(scopeRoles) as [ScopeLevel, Array<{ roleName: string; count: number }>][]).map(([scope, roles]) => {
                          if (roles.length === 0) return null;
                          return (
                            <div key={scope} className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`inline-flex rounded border px-1 py-0.5 text-[10px] ${scopeBadgeMap[scope]}`}>{scopeLabelMap[scope]}</span>
                                <span className="text-[10px] text-muted-foreground/60">({roles.length} role{roles.length !== 1 ? "s" : ""})</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {roles.map((r) => (
                                  <span key={r.roleName} className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                                    <ShieldCheck className="h-3 w-3 text-blue-400" />
                                    <span>{r.roleName}</span>
                                    <span className="text-muted-foreground/60 ml-0.5">({r.count})</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Members */}
                  <div className="border-b border-border">
                    <div className={hdr}><span className={secTitle}>Members</span></div>
                    {companyUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground/60">
                        <Users className="h-4 w-4" />
                        <span>No users in this scope.</span>
                        {capabilities.canAssignUser && (
                          <button type="button" onClick={() => {}}
                            className="inline-flex items-center gap-1 rounded border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10">
                            <UserPlus className="h-3 w-3" />Assign user
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {visibleMembers.map((u) => {
                          const userRoles = userRolesMap.get(u.id) ?? [];
                          const primaryRole = userRoles[0]?.roleName;
                          return (
                            <div key={u.id}
                              onClick={() => navigate("/system/users-and-roles", { state: { selectedUserId: u.id } })}
                              className="flex cursor-pointer items-center gap-3 px-4 py-1.5 hover:bg-muted/60 transition-colors min-h-9">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${u.isActive ? "bg-success/100" : "bg-slate-300"}`} />
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <span className="truncate text-[13px] font-medium text-foreground">{u.fullName || u.username}</span>
                                <span className="truncate text-[11px] text-muted-foreground/60">{u.email || u.username}</span>
                                {u.plantName && selectedPlantId !== u.plantId && <span className="shrink-0 text-[10px] text-muted-foreground/60">· {u.plantName}</span>}
                              </div>
                              {primaryRole && (
                                <span className="shrink-0 inline-flex rounded border border-primary/20/60 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  {safeText(primaryRole)}
                                </span>
                              )}
                              {userRoles.length > 1 && (
                                <span className="shrink-0 text-[10px] text-muted-foreground/60">+{userRoles.length - 1}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {hasMoreMembers && !showAllMembers && (
                      <button type="button" onClick={() => setShowAllMembers(true)}
                        className="flex w-full items-center justify-center gap-1 px-4 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/10/40 transition-colors">
                        <ChevronDown className="h-3 w-3" />Show all {companyUsers.length} members
                      </button>
                    )}
                    {showAllMembers && companyUsers.length > 7 && (
                      <button type="button" onClick={() => setShowAllMembers(false)}
                        className="flex w-full items-center justify-center gap-1 px-4 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
                        <ChevronRight className="h-3 w-3" />Show fewer
                      </button>
                    )}
                  </div>

                  {/* Effective Access */}
                  {capabilities.canViewEffectiveAccess && (
                    <div className="border-b border-border">
                      <div className={hdr}><span className={secTitle}>Effective Access</span></div>
                      <div className="divide-y divide-border/50 text-[12px] text-muted-foreground">
                        <div className="flex items-center gap-3 px-3 py-1.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Landmark className="h-3 w-3 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Company Access</div>
                            <div className="text-[11px] text-muted-foreground/60">
                              {selectedPlantId
                                ? `Users inherit access from ${selectedCompany.name} through ${companyPlants.filter((p) => p.id === selectedPlantId).map((p) => p.name).join(", ")}.`
                                : `All users under ${selectedCompany.name} have access through ${companyPlants.length} plant${companyPlants.length !== 1 ? "s" : ""}.`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-1.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                            <Factory className="h-3 w-3 text-success" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Plant Access</div>
                            <div className="text-[11px] text-muted-foreground/60">
                              {selectedPlantId
                                ? `${companyUsers.length} user${companyUsers.length !== 1 ? "s" : ""} assigned to this plant.`
                                : `${scopeSummary.plant} user${scopeSummary.plant !== 1 ? "s" : ""} assigned across ${companyPlants.length} plant${companyPlants.length !== 1 ? "s" : ""}.`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-1.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/10">
                            <Shield className="h-3 w-3 text-warning" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Role-based Access</div>
                            <div className="text-[11px] text-muted-foreground/60">
                              {scopeRolesTotal > 0
                                ? `${scopeRolesTotal} distinct role${scopeRolesTotal !== 1 ? "s" : ""} providing permissions across modules.`
                                : "No roles assigned — users have only default access."}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scope Coverage */}
                  <div className="border-b border-border">
                    <div className={hdr}><span className={secTitle}>Scope Coverage</span></div>
                    <div className="flex items-start gap-4 px-3 py-2">
                      <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                        <span className="text-lg font-semibold text-foreground leading-none">{scopeSummary.company}</span>
                        <span className="text-[11px] text-muted-foreground">Company</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                        <span className="text-lg font-semibold text-foreground leading-none">{scopeSummary.plant}</span>
                        <span className="text-[11px] text-muted-foreground">Plant</span>
                      </div>
                      {scopeSummary.unassigned > 0 && (
                        <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                          <span className="text-lg font-semibold text-warning leading-none">{scopeSummary.unassigned}</span>
                          <span className="text-[11px] text-muted-foreground">Unassigned to plant</span>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                        <span className="text-lg font-semibold text-foreground leading-none">{companyPlants.length}</span>
                        <span className="text-[11px] text-muted-foreground">Plant{companyPlants.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                        <span className="text-lg font-semibold text-foreground leading-none">{scopeRolesTotal}</span>
                        <span className="text-[11px] text-muted-foreground">Role{scopeRolesTotal !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role distribution chips (compact bottom) */}
                  {(Object.entries(scopeRoles) as [ScopeLevel, Array<{ roleName: string; count: number }>][]).some(([, roles]) => roles.length > 0) && (
                    <div className="flex flex-wrap gap-1 px-3 py-2">
                      {(Object.entries(scopeRoles) as [ScopeLevel, Array<{ roleName: string; count: number }>][]).map(([scope, roles]) =>
                        roles.slice(0, 4).map((r) => (
                          <span key={`${scope}-${r.roleName}`} className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${scopeBadgeMap[scope]} opacity-70`}>
                            {r.roleName} ({r.count})
                          </span>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
    </>}
  />
  );
}
