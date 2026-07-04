import React, { useEffect, useRef, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  User, X, FileText, Mail, Phone, MapPin,
  Globe, Factory, Layers, Search, Loader2, Pencil, Shield,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { USER_ROLES_QUERY } from "@/graphql/administrationQueries";
import type { ProfileDraft } from "./shared";
import { ToolbarButton } from "@/components/layout/PageToolbar";
import {
  FieldShell, ReadOnlyField, MissingValue, initials,
  ProfileReadOnlyAccessRows,
  ProfileSectionHeader,
  inputClass, inputErrorClass,
  validateField, removeFieldError,
} from "./shared";

/* ── Types ──────────────────────────────────────────────────────── */

const USERS_SEARCH_QUERY = gql`
  query UsersSearch($search: String) {
    users(search: $search) {
      id
      name
      role
      email
    }
  }
`;


interface PersonalInfoColumnProps {
  draft: ProfileDraft;
  setDraft: (draft: ProfileDraft | ((prev: ProfileDraft) => ProfileDraft)) => void;
  editingSection: string | null;
  startEditing: (section: string) => void;
  fieldErrors: Record<string, string>;
  setFieldErrors: (
    errors: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  plants: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  roles: { id: string; code: string; name: string }[];
  setDeptTouched: (touched: boolean) => void;
  identityRef: React.RefObject<HTMLDivElement | null>;
  contactRef: React.RefObject<HTMLDivElement | null>;
  summaryRef: React.RefObject<HTMLDivElement | null>;
  aboutCharCount: number;
  aboutCharColor: string;
  deptError: string | undefined;
  adminProfileId: string | null;
}

/* ═══════════════════════════════════════════════════════════════════
   COLUMN 1 — Personal Information
   ═══════════════════════════════════════════════════════════════════ */
export function PersonalInfoColumn({
  draft,
  setDraft,
  editingSection,
  startEditing,
  fieldErrors,
  setFieldErrors,
  plants,
  departments,
  roles,
  setDeptTouched,
  identityRef,
  contactRef,
  summaryRef,
  aboutCharCount,
  aboutCharColor,
  deptError,
  adminProfileId,
}: PersonalInfoColumnProps) {

  /* ── User search (Reports to) ─────────────────────────────────── */
  const [userSearchText, setUserSearchText] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const userSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; role: string; email: string } | null>(null);

  const [searchUsers, { data: userData, loading: userLoading }] = useLazyQuery<{
    users: { id: string; name: string; role: string; email: string }[];
  }>(USERS_SEARCH_QUERY, { fetchPolicy: "network-only" });
  const userResults = userData?.users ?? [];

  /* ── Initialize selectedUser from profile draft reportsTo ─────── */
  useEffect(() => {
    if (draft.reportsTo && !selectedUser) {
      setSelectedUser({ id: "", name: draft.reportsTo, role: "", email: "" });
    }
    if (!draft.reportsTo) {
      setSelectedUser(null);
    }
  }, [draft.reportsTo]);

  /* ── Click-outside: user dropdown ─────────────────────────────── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    };
  }, []);

  /* ── Handlers ─────────────────────────────────────────────────── */
  const handleUserSearchInput = (text: string) => {
    setUserSearchText(text);
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    userSearchTimeout.current = setTimeout(() => {
      searchUsers({ variables: { search: text || undefined } });
    }, 300);
  };

  const handleUserSelect = (user: { id: string; name: string; role: string; email: string }) => {
    setSelectedUser(user);
    setDraft((prev: ProfileDraft) => ({ ...prev, reportsTo: user.name }));
    setShowUserDropdown(false);
    setUserSearchText("");
  };

  const handleUserClear = () => {
    setSelectedUser(null);
    setDraft((prev: ProfileDraft) => ({ ...prev, reportsTo: "" }));
    setUserSearchText("");
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("[data-reports-to-input]");
      input?.focus();
    }, 0);
  };

  return (
    <div className="flex flex-col min-h-0 overflow-hidden border-r border-border-major">
      <ProfileSectionHeader
        icon={User}
        iconColor="text-accent-foreground"
        title="Personal information"
        subtitle="Core identity and contact details"
      />

      <div className={`divide-y divide-border overflow-y-auto`}>
        {/* ── Identity fields ──────────────────────────────────────── */}
        <div ref={identityRef} className="grid md:grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
          <FieldShell label="First name" error={fieldErrors.firstName}>
            {editingSection === "profile" ? (
              <input
                data-field="firstName"
                value={draft.firstName}
                onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, firstName: e.target.value }))}
                className={fieldErrors.firstName ? inputErrorClass : inputClass}
                placeholder="First name"
              />
            ) : (
              <ReadOnlyField>{draft.firstName || <MissingValue />}</ReadOnlyField>
            )}
          </FieldShell>

          <FieldShell label="Last name" error={fieldErrors.lastName}>
            {editingSection === "profile" ? (
              <input
                data-field="lastName"
                value={draft.lastName}
                onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, lastName: e.target.value }))}
                className={fieldErrors.lastName ? inputErrorClass : inputClass}
                placeholder="Last name"
              />
            ) : (
              <ReadOnlyField>{draft.lastName || <MissingValue />}</ReadOnlyField>
            )}
          </FieldShell>

          <FieldShell label="Position" error={fieldErrors.role}>
            {editingSection === "profile" ? (
              <select
                data-field="position"
                value={draft.role}
                onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, role: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select position...</option>
                {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            ) : (
              <ReadOnlyField>{draft.role || <MissingValue />}</ReadOnlyField>
            )}
          </FieldShell>

          <FieldShell label="Reports to">
            {editingSection === "profile" ? (
              <div className="relative" ref={userDropdownRef}>
                <div className="flex items-start gap-2">
                  <User className={`mt-2.5 h-4 w-4 shrink-0 ${theme.icon}`} />
                  {selectedUser ? (
                    <div className={`flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2 py-1 text-sm`}>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-[9px] font-bold text-success-foreground">
                        {initials(selectedUser.name)}
                      </span>
                      <span className={`text-sm ${theme.textPrimary}`}>{selectedUser.name}</span>
                      {selectedUser.role && (
                        <span className={`text-[11px] ${theme.textMuted}`}>({selectedUser.role})</span>
                      )}
                      <button type="button" onClick={handleUserClear} className="ml-1 rounded p-0.5 text-muted-foreground hover:text-danger">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        data-reports-to-input
                        type="text"
                        value={userSearchText}
                        onChange={(e) => { handleUserSearchInput(e.target.value); setShowUserDropdown(true); }}
                        onFocus={() => setShowUserDropdown(true)}
                        className={`w-full border-0 border-b border-border bg-transparent pl-5 pr-0 py-1.5 text-sm ${theme.textPrimary} transition placeholder:text-muted-foreground hover:border-border-major focus:border-success focus:outline-none focus:ring-0`}
                        placeholder="Search by name or role..."
                      />
                    </div>
                  )}
                </div>
                {showUserDropdown && !selectedUser && (
                  <div className={`absolute left-7 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-md border border-border-major ${theme.dropdown}`}>
                    {userLoading ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                      </div>
                    ) : userResults.length > 0 ? (
                      userResults.map((u) => (
                        <button key={u.id} type="button" onClick={() => handleUserSelect(u)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${theme.interactiveRow}`}
                        >
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground">
                            {initials(u.name)}
                          </span>
                          <div className="min-w-0">
                            <div className={`truncate ${theme.textPrimary}`}>{u.name}</div>
                            {u.role && <div className={`text-[11px] truncate ${theme.textMuted}`}>{u.role}</div>}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <ReadOnlyField>
                <div className="flex items-center gap-2">
                  {draft.reportsTo ? <User className={`h-4 w-4 ${theme.icon}`} /> : null}
                  {draft.reportsTo || <MissingValue />}
                </div>
              </ReadOnlyField>
            )}
          </FieldShell>

          <FieldShell label="Plant">
            {editingSection === "profile" ? (
              <select
                data-field="plant"
                value={draft.plant}
                onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, plant: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select plant...</option>
                {plants.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            ) : (
              <ReadOnlyField>
                <div className="flex items-center gap-2">
                  {draft.plant ? <Factory className={`h-4 w-4 ${theme.icon}`} /> : null}
                  {draft.plant || <MissingValue />}
                </div>
              </ReadOnlyField>
            )}
          </FieldShell>

          <FieldShell label="Department" error={deptError} required>
            {editingSection === "profile" ? (
              <select
                data-field="department"
                value={draft.department}
                onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, department: e.target.value }))}
                onBlur={() => setDeptTouched(true)}
                className={deptError ? inputErrorClass : inputClass}
              >
                <option value="">Select department...</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            ) : (
              <ReadOnlyField>
                <div className="flex items-center gap-2">
                  {draft.department ? <Layers className={`h-4 w-4 ${theme.icon}`} /> : null}
                  {draft.department || <MissingValue />}
                </div>
              </ReadOnlyField>
            )}
          </FieldShell>

          <FieldShell label="Languages" className="md:col-span-2">
            {editingSection === "profile" ? (
              <div className="flex items-start gap-2">
                <Globe className={`mt-2.5 h-4 w-4 shrink-0 ${theme.icon}`} />
                <input
                  data-field="language"
                  value={draft.language}
                  onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, language: e.target.value }))}
                  className={inputClass}
                  placeholder="English, Romanian"
                />
              </div>
            ) : (
              <ReadOnlyField>
                <div className="flex items-center gap-2">
                  {draft.language ? <Globe className={`h-4 w-4 ${theme.icon}`} /> : null}
                  {draft.language || <MissingValue />}
                </div>
              </ReadOnlyField>
            )}
          </FieldShell>
        </div>

        {/* ── Contact fields ────────────────────────────────────────── */}
        <div ref={contactRef} className="grid md:grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
          <FieldShell label="Email" error={fieldErrors.email}>
            {editingSection === "profile" ? (
              <div className="flex items-start gap-2">
                <Mail className={`mt-2.5 h-4 w-4 shrink-0 ${theme.icon}`} />
                <input
                  data-field="email"
                  value={draft.email}
                  onChange={(e) => {
                    const next = { ...draft, email: e.target.value };
                    setDraft(next);
                    setFieldErrors((prev) => {
                      const err = validateField("email", next);
                      return err ? { ...prev, email: err } : removeFieldError(prev, "email");
                    });
                  }}
                  className={`${fieldErrors.email ? inputErrorClass : inputClass}`}
                  placeholder="name@company.com"
                />
              </div>
            ) : (
              <ReadOnlyField>
                <div className="flex items-center gap-2">
                  {draft.email ? <Mail className={`h-4 w-4 ${theme.icon}`} /> : null}
                  {draft.email || <MissingValue />}
                </div>
              </ReadOnlyField>
            )}
          </FieldShell>

          <FieldShell label="Phone" error={fieldErrors.phone}>
            {editingSection === "profile" ? (
              <div className="flex items-start gap-2">
                <Phone className={`mt-2.5 h-4 w-4 shrink-0 ${theme.icon}`} />
                <input
                  data-field="phone"
                  value={draft.phone}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 11);
                    let formatted = "";
                    if (raw.length > 0) formatted = "+1";
                    if (raw.length > 1) formatted += " (" + raw.slice(1, Math.min(4, raw.length));
                    if (raw.length > 1) formatted += raw.length > 4 ? ") " + raw.slice(4, Math.min(7, raw.length)) : "";
                    if (raw.length > 7) formatted += "-" + raw.slice(7, 11);
                    setDraft((prev: ProfileDraft) => ({ ...prev, phone: formatted }));
                    if (formatted && !/^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/.test(formatted)) {
                      setFieldErrors((prev) => ({ ...prev, phone: "Use format +1 (555) 123-4567" }));
                    } else {
                      setFieldErrors((prev) => removeFieldError(prev, "phone"));
                    }
                  }}
                  className={`${fieldErrors.phone ? inputErrorClass : inputClass}`}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            ) : (
              <ReadOnlyField>
                <div className="flex items-center gap-2">
                  {draft.phone ? <Phone className={`h-4 w-4 ${theme.icon}`} /> : null}
                  {draft.phone || <MissingValue />}
                </div>
              </ReadOnlyField>
            )}
          </FieldShell>

          <FieldShell label="Full address" className="md:col-span-2">
            {editingSection === "profile" ? (
              <div className="flex items-start gap-2">
                <MapPin className={`mt-2.5 h-4 w-4 shrink-0 ${theme.icon}`} />
                <input
                  data-field="location"
                  value={draft.location}
                  onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, location: e.target.value }))}
                  className={inputClass}
                  placeholder="123 Main St, Detroit, MI 48201"
                />
              </div>
            ) : (
              <ReadOnlyField>
                <div className="flex items-center gap-2">
                  {draft.location ? <MapPin className={`h-4 w-4 ${theme.icon}`} /> : null}
                  {draft.location || <MissingValue />}
                </div>
              </ReadOnlyField>
            )}
          </FieldShell>
        </div>

        {/* ── About / Summary ────────────────────────────────────────── */}
        <div ref={summaryRef} className="border-t border-border">
          <ProfileSectionHeader
            icon={FileText}
            iconColor="text-indigo-500"
            title="About"
            subtitle="Professional summary and expertise"
          />
          {editingSection === "profile" ? (
            <div className="relative flex flex-col">
              <textarea
                data-field="about"
                value={draft.about}
                onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, about: e.target.value }))}
                className={`w-full border border-border bg-card p-2.5 text-sm ${theme.textPrimary} placeholder:text-muted-foreground focus:border-success focus:outline-none rounded`}
                placeholder="Summarize your role and expertise"
                maxLength={500}
                style={{ minHeight: "60px", resize: "vertical" }}
              />
              <div className={`mt-1 self-end text-xs ${aboutCharColor}`} role="status" aria-live="polite">
                {aboutCharCount} / 500
              </div>
            </div>
          ) : draft.about ? (
            <ul className="space-y-1.5">
              {draft.about.split(/\n+|(?<=[.!])\s*/).filter((b) => b.trim().length > 0).map((b, i) => (
                <li key={i} className={`flex items-start gap-2 text-sm leading-5 ${theme.textPrimary}`}>
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-success" />
                  {b.trim()}
                </li>
              ))}
            </ul>
          ) : (
            <div className={`flex flex-col items-center justify-center py-5 text-center rounded border border-dashed border-border-major bg-muted/40`}>
              <FileText className="h-5 w-5 text-muted-foreground/40 mb-2" />
              <p className={`text-xs ${theme.textMuted}`}>No summary added yet.</p>
              <ToolbarButton icon={Pencil} label="Add Summary" onClick={() => startEditing("profile")} variant="default" className="mt-2 !h-7 !px-2.5 !text-[11px] text-success hover:!bg-success/10" />
            </div>
          )}
          {fieldErrors.about && <div className={`mt-1 text-xs ${theme.textCritical}`}>{fieldErrors.about}</div>}
        </div>

        {/* ── Account & Access ─────────────────────────────────────── */}
        <AccountAccessBlock adminProfileId={adminProfileId} />

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACCOUNT & ACCESS
   ═══════════════════════════════════════════════════════════════════ */
function AccountAccessBlock({ adminProfileId }: { adminProfileId: string | null }) {
  const { data, loading } = useQuery<{
    userRoles: { id: string; roleName: string; roleCode: string; accessLevel: string; isActive: boolean }[];
  }>(USER_ROLES_QUERY, {
    variables: { userProfileId: adminProfileId || "" },
    skip: !adminProfileId,
    fetchPolicy: "cache-and-network",
  });

  const roles = data?.userRoles ?? [];
  const activeRoles = roles.filter((r) => r.isActive);
  const accessLevel = activeRoles.some((r) => r.accessLevel === "Admin")
    ? "Admin"
    : activeRoles.length > 0
      ? "Staff"
      : roles.some((r) => r.accessLevel === "Admin")
        ? "Admin (inactive)"
        : roles.length > 0
          ? "Staff (inactive)"
          : "";
  const status = roles.length > 0 ? (activeRoles.length > 0 ? "Active" : "Inactive") : "";

  return (
    <div className="border-t border-border">
      <div className="relative">
        <ProfileSectionHeader
          icon={Shield}
          iconColor="text-violet-500"
          title="Account &amp; Access"
          subtitle="Roles, permissions, and account status"
        />
        {loading && <Loader2 className="absolute right-4 top-4 h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {!adminProfileId ? (
        <div className="px-4 py-3">
          <span className="text-sm text-muted-foreground/60 italic">Profile not linked to a system user account.</span>
        </div>
      ) : (
        <ProfileReadOnlyAccessRows
          roles={roles}
          accessLevel={accessLevel}
          status={status}
          loading={loading}
          canEditAccess={false}
        />
      )}
    </div>
  );
}
