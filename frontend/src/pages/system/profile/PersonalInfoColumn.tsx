import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLazyQuery, useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  User, Pencil, Check, X, FileText, Mail, Phone, MapPin,
  Globe, ShieldCheck, Factory, Layers, Search, Loader2,
  Plus, Award,
} from "lucide-react";
import { theme } from "@/styles/themeTokens";
import type { ProfileDraft } from "./shared";
import type { ProfileSkill } from "@/types/profile";
import {
  FieldShell, ReadOnlyField, MissingValue, initials,
  inputClass, inputErrorClass,
  editIconButtonClass, saveIconButtonClass, dangerIconButtonClass,
  validateField, removeFieldError,
} from "./shared";
import {
  PROFILE_SKILLS_QUERY,
  CREATE_PROFILE_SKILL_MUTATION,
  ARCHIVE_PROFILE_SKILL_MUTATION,
} from "@/graphql/profileQueries";

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

const CATEGORY_OPTIONS = [
  { value: "SKILL", label: "Skill" },
  { value: "CERTIFICATION", label: "Certification" },
  { value: "LICENSE", label: "License" },
  { value: "TRAINING", label: "Training" },
];

const CATEGORY_COLORS: Record<string, string> = {
  SKILL: "bg-info/15 text-info",
  CERTIFICATION: "bg-success/15 text-success",
  LICENSE: "bg-warning/15 text-warning",
  TRAINING: "bg-accent/15 text-accent",
};

interface PersonalInfoColumnProps {
  profileId: string | null;
  draft: ProfileDraft;
  setDraft: (draft: ProfileDraft | ((prev: ProfileDraft) => ProfileDraft)) => void;
  editingSection: string | null;
  startEditing: (section: string) => void;
  cancelEditing: () => void;
  handleSave: () => Promise<void>;
  saving: boolean;
  fieldErrors: Record<string, string>;
  setFieldErrors: (
    errors: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  plants: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  setDeptTouched: (touched: boolean) => void;
  identityRef: React.RefObject<HTMLDivElement | null>;
  contactRef: React.RefObject<HTMLDivElement | null>;
  summaryRef: React.RefObject<HTMLDivElement | null>;
  aboutCharCount: number;
  aboutCharColor: string;
  deptError: string | undefined;
}

/* ═══════════════════════════════════════════════════════════════════
   COLUMN 1 — Personal Information
   ═══════════════════════════════════════════════════════════════════ */
export function PersonalInfoColumn({
  profileId,
  draft,
  setDraft,
  editingSection,
  startEditing,
  cancelEditing,
  handleSave,
  saving,
  fieldErrors,
  setFieldErrors,
  plants,
  departments,
  setDeptTouched,
  identityRef,
  contactRef,
  summaryRef,
  aboutCharCount,
  aboutCharColor,
  deptError,
}: PersonalInfoColumnProps) {
  /* ── Skills state ──────────────────────────────────────────────── */
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("SKILL");
  const [newSkillLevel, setNewSkillLevel] = useState("");
  const [newSkillIssuer, setNewSkillIssuer] = useState("");

  const { data: skillsData, loading: skillsLoading, refetch: refetchSkills } = useQuery<{
    profileSkills: ProfileSkill[];
  }>(PROFILE_SKILLS_QUERY, {
    variables: { userProfileId: profileId },
    skip: !profileId,
    fetchPolicy: "cache-and-network",
  });
  const skills = skillsData?.profileSkills ?? [];

  const [createSkillMut, { loading: creatingSkill }] = useMutation(CREATE_PROFILE_SKILL_MUTATION);
  const [archiveSkillMut, { loading: archivingSkill }] = useMutation(ARCHIVE_PROFILE_SKILL_MUTATION);

  const handleAddSkill = useCallback(async () => {
    if (!newSkillName.trim() || !profileId) return;
    try {
      await createSkillMut({
        variables: {
          input: {
            userProfileId: profileId,
            name: newSkillName.trim(),
            category: newSkillCategory,
            level: newSkillLevel.trim() || undefined,
            issuer: newSkillIssuer.trim() || undefined,
          },
        },
      });
      setNewSkillName("");
      setNewSkillCategory("SKILL");
      setNewSkillLevel("");
      setNewSkillIssuer("");
      setShowSkillForm(false);
      refetchSkills();
    } catch (err) {
      console.error("Failed to create skill:", err);
    }
  }, [newSkillName, newSkillCategory, newSkillLevel, newSkillIssuer, profileId, createSkillMut, refetchSkills]);

  const handleRemoveSkill = useCallback(async (skillId: string) => {
    try {
      await archiveSkillMut({ variables: { id: skillId } });
      refetchSkills();
    } catch (err) {
      console.error("Failed to archive skill:", err);
    }
  }, [archiveSkillMut, refetchSkills]);

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
    <div className={`flex flex-col min-h-0 overflow-hidden border-r border-border/70 ${theme.card}`}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className={`flex h-12 items-center justify-between border-b border-border/70 px-4 shrink-0`}>
        <div>
          <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>Personal information</h2>
          <p className={`text-[11px] ${theme.textMuted} leading-5`}>Core identity and contact details</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {editingSection === "profile" ? (
            <>
              <button type="button" onClick={handleSave} title="Save section" disabled={saving} className={saveIconButtonClass}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={cancelEditing} className={dangerIconButtonClass}>
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => startEditing("profile")} className={editIconButtonClass} title="Edit personal information">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className={`divide-y divide-border/70 overflow-y-auto`}>
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

          <FieldShell label="Role" error={fieldErrors.role}>
            {editingSection === "profile" ? (
              <input
                data-field="role"
                value={draft.role}
                onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, role: e.target.value }))}
                className={inputClass}
                placeholder="Role or title"
              />
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
                    <div className={`flex items-center gap-1.5 rounded border border-border/70 bg-muted/30 px-2 py-1 text-sm`}>
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
                        className={`w-full border-0 border-b border-border/70 bg-transparent pl-5 pr-0 py-1.5 text-sm ${theme.textPrimary} transition placeholder:text-muted-foreground hover:border-border focus:border-success focus:outline-none focus:ring-0`}
                        placeholder="Search by name or role..."
                      />
                    </div>
                  )}
                </div>
                {showUserDropdown && !selectedUser && (
                  <div className={`absolute left-7 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-md border border-border ${theme.dropdown}`}>
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
        <div ref={summaryRef} className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className={`h-3.5 w-3.5 ${theme.icon}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>About</span>
          </div>
          {editingSection === "profile" ? (
            <div className="relative flex flex-col">
              <textarea
                data-field="about"
                value={draft.about}
                onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, about: e.target.value }))}
                className={`w-full border border-border/70 bg-card p-2.5 text-sm ${theme.textPrimary} placeholder:text-muted-foreground focus:border-success focus:outline-none rounded`}
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
            <div className={`flex flex-col items-center justify-center py-5 text-center rounded border border-dashed border-border/50 bg-muted/40`}>
              <FileText className="h-5 w-5 text-muted-foreground/40 mb-2" />
              <p className={`text-xs ${theme.textMuted}`}>No summary added yet.</p>
              <button type="button" onClick={() => startEditing("profile")}
                className={`mt-2 inline-flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium text-success transition-colors hover:bg-success/10`}
              >
                <Pencil className="h-3 w-3" />
                Add Summary
              </button>
            </div>
          )}
          {fieldErrors.about && <div className={`mt-1 text-xs ${theme.textCritical}`}>{fieldErrors.about}</div>}
        </div>

        {/* ── Skills & Certifications ────────────────────────────────── */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className={`h-3.5 w-3.5 ${theme.icon}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>Skills &amp; Certifications</span>
          </div>

          {skillsLoading && profileId ? (
            <div className="flex items-center justify-center py-5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : skills.length > 0 ? (
            <div className="space-y-2">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-start gap-2 group/row">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${theme.entityIconBg}`}>
                    <Award className={`h-3.5 w-3.5 ${theme.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-medium ${theme.textPrimary}`}>{skill.name}</span>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[skill.category] || "bg-muted text-muted-foreground"}`}>
                        {CATEGORY_OPTIONS.find((c) => c.value === skill.category)?.label || skill.category}
                      </span>
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] ${theme.textMuted} mt-0.5`}>
                      {skill.level && <span>{skill.level}</span>}
                      {skill.issuer && <span>by {skill.issuer}</span>}
                      {skill.expiresDate && (
                        <span className={new Date(skill.expiresDate) < new Date() ? "text-warning font-medium" : ""}>
                          Expires {new Date(skill.expiresDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {archivingSkill ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0 mt-1" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="opacity-0 group-hover/row:opacity-100 shrink-0 mt-1 rounded p-0.5 text-muted-foreground transition-all hover:text-danger"
                      title="Remove skill"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {!profileId ? (
            <div className={`flex flex-col items-center justify-center py-5 text-center rounded border border-dashed border-border/50 bg-muted/40`}>
              <ShieldCheck className="h-5 w-5 text-muted-foreground/40 mb-2" />
              <p className={`text-xs ${theme.textMuted}`}>Skills require a user profile.</p>
            </div>
          ) : showSkillForm ? (
            <div className={`space-y-2 mt-2 rounded border border-border/70 bg-muted/40 p-3`}>
              <div className="flex items-start gap-2">
                <input
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className={`flex-1 rounded border border-border/70 bg-card px-2.5 py-1.5 text-sm ${theme.textPrimary} placeholder:text-muted-foreground focus:border-success focus:outline-none`}
                  placeholder="Skill or certification name"
                />
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className={`rounded border border-border/70 bg-card px-2 py-1.5 text-xs ${theme.textPrimary} focus:border-success focus:outline-none`}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(e.target.value)}
                  className={`flex-1 rounded border border-border/70 bg-card px-2.5 py-1.5 text-sm ${theme.textPrimary} placeholder:text-muted-foreground focus:border-success focus:outline-none`}
                  placeholder="Level (e.g. Expert, Advanced)"
                />
                <input
                  value={newSkillIssuer}
                  onChange={(e) => setNewSkillIssuer(e.target.value)}
                  className={`flex-1 rounded border border-border/70 bg-card px-2.5 py-1.5 text-sm ${theme.textPrimary} placeholder:text-muted-foreground focus:border-success focus:outline-none`}
                  placeholder="Issuer (optional)"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSkillForm(false); setNewSkillName(""); }}
                  className={`rounded px-2.5 py-1 text-xs font-medium ${theme.textMuted} transition hover:bg-muted`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!newSkillName.trim() || creatingSkill}
                  className="inline-flex items-center gap-1 rounded bg-success px-2.5 py-1 text-xs font-semibold text-success-foreground transition hover:bg-success/90 disabled:opacity-50"
                >
                  {creatingSkill ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add
                </button>
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center py-5 text-center rounded border border-dashed border-border/50 bg-muted/40`}>
              <Award className="h-5 w-5 text-muted-foreground/40 mb-2" />
              <p className={`text-xs ${theme.textMuted}`}>
                {skills.length === 0 ? "No skills or certifications added." : ""}
              </p>
              <button
                type="button"
                onClick={() => setShowSkillForm(true)}
                className={`mt-2 inline-flex items-center gap-1 h-7 px-2.5 rounded text-[11px] font-medium text-success transition-colors hover:bg-success/10`}
              >
                <Plus className="h-3 w-3" />
                Add Skills
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
