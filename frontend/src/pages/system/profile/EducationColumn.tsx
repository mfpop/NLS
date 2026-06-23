import React, { useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { X, Plus, Pencil, Trash2, BookOpen, Loader2, Award, ShieldCheck, Shield, AlertTriangle } from "lucide-react";
import { USER_ROLES_QUERY } from "@/graphql/administrationQueries";
import { ToolbarButton } from "@/components/shared/Toolbar";
import { theme } from "@/styles/themeTokens";
import type { EducationEntry, ProfileSkill } from "@/types/profile";
import {
  FieldShell, MissingValue, EmptyBlock,
  inputClass, extractPeriodYear,
} from "./shared";
import {
  PROFILE_SKILLS_QUERY,
  CREATE_PROFILE_SKILL_MUTATION,
  UPDATE_PROFILE_SKILL_MUTATION,
  DELETE_PROFILE_SKILL_MUTATION,
  PROFILE_SKILL_CAPABILITIES_QUERY,
} from "@/graphql/profileQueries";

/* ── Skill constants ── */
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

/* ── Shared form classes ── */
const FIELD_CLASS = `rounded border border-slate-200 bg-white px-2.5 py-1 text-xs ${theme.textPrimary} placeholder:text-muted-foreground focus:border-success focus:outline-none`;
const DATE_CLASS = `rounded border border-slate-200 bg-white px-2 py-1 text-xs ${theme.textPrimary} focus:border-success focus:outline-none`;

interface EducationColumnProps {
  adminProfileId: string | null;
  eduDraft: EducationEntry[];
  setEduDraft: (draft: EducationEntry[] | ((prev: EducationEntry[]) => EducationEntry[])) => void;
  editingSection: string | null;
  startEditing: (section: string) => void;
  fieldErrors: Record<string, string>;
  educationRef: React.RefObject<HTMLDivElement | null>;
}

/* ═══════════════════════════════════════════════════════════════════
   COLUMN 3 — Education
   ═══════════════════════════════════════════════════════════════════ */
export function EducationColumn({
  adminProfileId,
  eduDraft,
  setEduDraft,
  editingSection,
  startEditing,
  fieldErrors,
  educationRef,
}: EducationColumnProps) {
  /* ── Skills state ── */
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("SKILL");
  const [newSkillLevel, setNewSkillLevel] = useState("");
  const [newSkillIssuer, setNewSkillIssuer] = useState("");
  const [newSkillIssuedDate, setNewSkillIssuedDate] = useState("");
  const [newSkillExpiresDate, setNewSkillExpiresDate] = useState("");
  const [newSkillNotes, setNewSkillNotes] = useState("");
  const [newSkillIsCert, setNewSkillIsCert] = useState(false);

  const { data: skillsData, loading: skillsLoading, refetch: refetchSkills } = useQuery<{
    profileSkills: ProfileSkill[];
  }>(PROFILE_SKILLS_QUERY, {
    variables: { userProfileId: adminProfileId },
    skip: !adminProfileId,
    fetchPolicy: "cache-and-network",
  });
  const skills = skillsData?.profileSkills ?? [];

  const [createSkillMut, { loading: creatingSkill }] = useMutation(CREATE_PROFILE_SKILL_MUTATION);
  const [updateSkillMut] = useMutation(UPDATE_PROFILE_SKILL_MUTATION);
  const [deleteSkillMut, { loading: deletingSkill }] = useMutation(DELETE_PROFILE_SKILL_MUTATION);

  /* ── Capabilities ── */
  const { data: capsData } = useQuery<{
    profileSkillCapabilities: { canAddSkill: boolean; canEditSkill: boolean; canDeleteSkill: boolean };
  }>(PROFILE_SKILL_CAPABILITIES_QUERY, {
    variables: { userProfileId: adminProfileId },
    skip: !adminProfileId,
    fetchPolicy: "cache-and-network",
  });
  const caps = capsData?.profileSkillCapabilities;
  const canAdd = caps?.canAddSkill ?? true;
  const canEdit = caps?.canEditSkill ?? true;
  const canDelete = caps?.canDeleteSkill ?? true;

  /* ── Delete confirmation state ── */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /* ── Edit skill state ── */
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillCategory, setEditSkillCategory] = useState("SKILL");
  const [editSkillLevel, setEditSkillLevel] = useState("");
  const [editSkillIssuer, setEditSkillIssuer] = useState("");
  const [editSkillIssuedDate, setEditSkillIssuedDate] = useState("");
  const [editSkillExpiresDate, setEditSkillExpiresDate] = useState("");
  const [editSkillNotes, setEditSkillNotes] = useState("");

  const handleStartEditSkill = useCallback((skill: ProfileSkill) => {
    setEditingSkillId(skill.id);
    setEditSkillName(skill.name);
    setEditSkillCategory(skill.category);
    setEditSkillLevel(skill.level || "");
    setEditSkillIssuer(skill.issuer || "");
    setEditSkillIssuedDate(skill.issuedDate ? skill.issuedDate.slice(0, 10) : "");
    setEditSkillExpiresDate(skill.expiresDate ? skill.expiresDate.slice(0, 10) : "");
    setEditSkillNotes(skill.notes || "");
  }, []);

  const handleCancelEditSkill = useCallback(() => {
    setEditingSkillId(null);
    setEditSkillName("");
    setEditSkillCategory("SKILL");
    setEditSkillLevel("");
    setEditSkillIssuer("");
    setEditSkillIssuedDate("");
    setEditSkillExpiresDate("");
    setEditSkillNotes("");
  }, []);

  const handleSaveEditSkill = useCallback(async () => {
    if (!editingSkillId || !editSkillName.trim()) return;
    try {
      const input: Record<string, unknown> = {
        name: editSkillName.trim(),
        category: editSkillCategory,
      };
      if (editSkillLevel.trim()) input.level = editSkillLevel.trim();
      if (editSkillIssuer.trim()) input.issuer = editSkillIssuer.trim();
      if (editSkillIssuedDate.trim()) input.issuedDate = editSkillIssuedDate.trim();
      if (editSkillExpiresDate.trim()) input.expiresDate = editSkillExpiresDate.trim();
      if (editSkillNotes.trim()) input.notes = editSkillNotes.trim();
      await updateSkillMut({
        variables: {
          id: editingSkillId,
          input,
        },
      });
      handleCancelEditSkill();
      refetchSkills();
    } catch (err) {
      console.error("Failed to update skill:", err);
    }
  }, [editingSkillId, editSkillName, editSkillCategory, editSkillLevel, editSkillIssuer, editSkillIssuedDate, editSkillExpiresDate, editSkillNotes, updateSkillMut, handleCancelEditSkill, refetchSkills]);

  const handleAddSkill = useCallback(async () => {
    if (!newSkillName.trim() || !adminProfileId) return;
    try {
      const input: Record<string, unknown> = {
        userProfileId: adminProfileId,
        name: newSkillName.trim(),
        category: newSkillCategory,
      };
      if (newSkillLevel.trim()) input.level = newSkillLevel.trim();
      if (newSkillIssuer.trim()) input.issuer = newSkillIssuer.trim();
      if (newSkillIssuedDate.trim()) input.issuedDate = newSkillIssuedDate.trim();
      if (newSkillExpiresDate.trim()) input.expiresDate = newSkillExpiresDate.trim();
      if (newSkillNotes.trim()) input.notes = newSkillNotes.trim();
      await createSkillMut({
        variables: { input },
      });
      setNewSkillName("");
      setNewSkillCategory("SKILL");
      setNewSkillLevel("");
      setNewSkillIssuer("");
      setNewSkillIssuedDate("");
      setNewSkillExpiresDate("");
      setNewSkillNotes("");
      setNewSkillIsCert(false);
      setShowSkillForm(false);
      refetchSkills();
    } catch (err) {
      console.error("Failed to create skill:", err);
    }
  }, [newSkillName, newSkillCategory, newSkillLevel, newSkillIssuer, newSkillIssuedDate, newSkillExpiresDate, newSkillNotes, adminProfileId, createSkillMut, refetchSkills]);

  const handleDeleteSkill = useCallback(async (skillId: string) => {
    try {
      await deleteSkillMut({ variables: { id: skillId } });
      setDeleteConfirmId(null);
      refetchSkills();
    } catch (err) {
      console.error("Failed to delete skill:", err);
      setDeleteConfirmId(null);
    }
  }, [deleteSkillMut, refetchSkills]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  /* ── Certification fields visible when category is CERTIFICATION or LICENSE ── */
  const showCertFields = newSkillCategory === "CERTIFICATION" || newSkillCategory === "LICENSE";
  const showEditCertFields = editSkillCategory === "CERTIFICATION" || editSkillCategory === "LICENSE";

  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      {/* ── Education section ──────────────────────────────────────── */}
      <div ref={educationRef}>
        <header className={`flex h-12 items-center justify-between border-b border-border-major px-4 shrink-0`}>
          <div>
            <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>Education</h2>
            <p className={`text-[11px] ${theme.textMuted} leading-5`}>Formal training and credentials</p>
          </div>
        </header>

        <div className={`divide-y divide-slate-200 overflow-y-auto`}>
          {eduDraft.length > 0 ? (
            [...eduDraft].sort((a, b) => {
              const yearA = extractPeriodYear(a.period);
              const yearB = extractPeriodYear(b.period);
              if (!yearA) return 1;
              if (!yearB) return -1;
              return yearB - yearA;
            }).map((edu, index) => (
              <div
                key={edu.id}
                className={`px-4 py-3 transition-colors ${editingSection === "edu" ? "bg-success/5" : theme.interactiveRow}`}
              >
                {editingSection === "edu" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        Education {index + 1}
                      </div>
                      <button
                        type="button"
                        title="Remove this education"
                        onClick={() => setEduDraft((prev) => prev.filter((item) => item.id !== edu.id))}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-danger transition hover:bg-danger/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldShell label="Degree" error={fieldErrors[`edu-${index}-degree`]}>
                        <input
                          value={edu.degree}
                          onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, degree: e.target.value } : item)))}
                          className={inputClass}
                          placeholder="M.Sc. Industrial Engineering"
                        />
                      </FieldShell>
                      <FieldShell label="School" error={fieldErrors[`edu-${index}-school`]}>
                        <input
                          value={edu.school}
                          onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, school: e.target.value } : item)))}
                          className={inputClass}
                          placeholder="University name"
                        />
                      </FieldShell>
                    </div>
                    <div className="sm:w-64">
                      <FieldShell label="Period">
                        <input
                          value={edu.period}
                          onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, period: e.target.value } : item)))}
                          className={inputClass}
                          placeholder="2015 - 2017"
                        />
                      </FieldShell>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 group/row">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded ${theme.entityIconBg}`}>
                      <BookOpen className={`h-3.5 w-3.5 ${theme.icon}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${theme.textPrimary} leading-5`}>
                        {edu.degree || <MissingValue label="Untitled degree" />}
                      </div>
                      <div className={`text-xs ${theme.textMuted} leading-5`}>
                        {edu.school}
                        {edu.period ? <span className="ml-1.5">({edu.period})</span> : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-4 py-3">
              <EmptyBlock
                icon={BookOpen}
                title="No education added"
                description="Add your educational background."
                action="Add Education"
                onAction={() => startEditing("edu")}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Skills & Certifications ──────────────────────────────── */}
      <div className="border-t border-border-major">
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <ShieldCheck className={`h-3.5 w-3.5 ${theme.icon}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>Skills &amp; Certifications</span>
        </div>

        {!adminProfileId ? (
          <div className={`flex flex-col items-center justify-center py-5 text-center rounded border border-dashed border-border-major bg-muted/40`}>
            <ShieldCheck className="h-5 w-5 text-muted-foreground/40 mb-2" />
            <p className={`text-xs ${theme.textMuted}`}>Skills are restricted.</p>
          </div>
        ) : skillsLoading ? (
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
                {editingSkillId === skill.id ? (
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <input
                        value={editSkillName}
                        onChange={(e) => setEditSkillName(e.target.value)}
                        className={`flex-1 ${FIELD_CLASS}`}
                        placeholder="Skill or certification name"
                      />
                      <select
                        value={editSkillCategory}
                        onChange={(e) => setEditSkillCategory(e.target.value)}
                        className={DATE_CLASS}
                      >
                        {CATEGORY_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={editSkillLevel}
                        onChange={(e) => setEditSkillLevel(e.target.value)}
                        className={`flex-1 ${FIELD_CLASS}`}
                        placeholder="Level (e.g. Expert)"
                      />
                      <input
                        value={editSkillIssuer}
                        onChange={(e) => setEditSkillIssuer(e.target.value)}
                        className={`flex-1 ${FIELD_CLASS}`}
                        placeholder="Issuer"
                      />
                    </div>
                    {showEditCertFields && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Issued Date</label>
                          <input
                            type="date"
                            value={editSkillIssuedDate}
                            onChange={(e) => setEditSkillIssuedDate(e.target.value)}
                            className={`w-full ${DATE_CLASS}`}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Expiry Date</label>
                          <input
                            type="date"
                            value={editSkillExpiresDate}
                            onChange={(e) => setEditSkillExpiresDate(e.target.value)}
                            className={`w-full ${DATE_CLASS}`}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Notes</label>
                      <textarea
                        value={editSkillNotes}
                        onChange={(e) => setEditSkillNotes(e.target.value)}
                        className={`w-full resize-none ${FIELD_CLASS}`}
                        rows={2}
                        placeholder="Optional notes..."
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <button type="button" onClick={handleCancelEditSkill} className={`inline-flex h-6 items-center rounded px-2 text-[10px] font-medium ${theme.textSecondary} hover:bg-slate-100 transition-colors`}>Cancel</button>
                      <button type="button" onClick={handleSaveEditSkill} disabled={!editSkillName.trim()} className="inline-flex h-6 items-center rounded px-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:pointer-events-none transition-colors">Save</button>
                    </div>
                  </div>
                ) : (
                  /* ── Skill view mode ── */
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
                      {skill.issuedDate && (
                        <span>Issued {new Date(skill.issuedDate).toLocaleDateString()}</span>
                      )}
                      {skill.expiresDate && (
                        <span className={new Date(skill.expiresDate) < new Date() ? "text-warning font-medium" : ""}>
                          Expires {new Date(skill.expiresDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {skill.notes && (
                      <p className={`text-[11px] ${theme.textMuted} mt-0.5 italic`}>{skill.notes}</p>
                    )}
                  </div>
                )}
                {/* ── Action buttons / delete confirmation ── */}
                {deleteConfirmId === skill.id ? (
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    <span className="text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      Delete?
                    </span>
                    <button type="button" onClick={() => handleDeleteSkill(skill.id)} disabled={deletingSkill} className="inline-flex h-6 items-center rounded px-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors">
                      {deletingSkill ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
                    </button>
                    <button type="button" onClick={handleCancelDelete} className="inline-flex h-6 items-center rounded px-1.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors">
                      No
                    </button>
                  </div>
                ) : editingSkillId !== skill.id && canEdit ? (
                  <div className="flex items-center gap-0.5 shrink-0 mt-1">
                    {canEdit && (
                      <button type="button" onClick={() => handleStartEditSkill(skill)} className="opacity-0 group-hover/row:opacity-100 rounded p-0.5 text-muted-foreground transition-all hover:text-sky-600" title="Edit skill">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" onClick={() => setDeleteConfirmId(skill.id)} className="opacity-0 group-hover/row:opacity-100 rounded p-0.5 text-muted-foreground transition-all hover:text-danger" title="Delete skill">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Add skill form or empty state (only when admin profile exists) ── */}
        {adminProfileId && (showSkillForm ? (
          <div className={`space-y-2 mt-2 rounded border border-slate-200 bg-muted/40 p-3`}>
            <div className="flex items-start gap-2">
              <input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                className={`flex-1 ${FIELD_CLASS} text-sm`}
                placeholder="Skill or certification name"
              />
              <select
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
                className={`${DATE_CLASS} text-sm`}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {showCertFields && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSkillIsCert}
                  onChange={(e) => setNewSkillIsCert(e.target.checked)}
                  className="rounded border-slate-300 text-success focus:ring-success"
                />
                <span className="text-[11px] text-slate-600">This is a certification</span>
              </label>
            )}
            <div className="flex gap-2">
              <input
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value)}
                className={`flex-1 ${FIELD_CLASS} text-sm`}
                placeholder="Level (e.g. Expert, Advanced)"
              />
              <input
                value={newSkillIssuer}
                onChange={(e) => setNewSkillIssuer(e.target.value)}
                className={`flex-1 ${FIELD_CLASS} text-sm`}
                placeholder="Issuer (optional)"
              />
            </div>
            {showCertFields && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 mb-0.5">Issued Date</label>
                  <input
                    type="date"
                    value={newSkillIssuedDate}
                    onChange={(e) => setNewSkillIssuedDate(e.target.value)}
                    className={`w-full ${DATE_CLASS}`}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 mb-0.5">Expiry Date</label>
                  <input
                    type="date"
                    value={newSkillExpiresDate}
                    onChange={(e) => setNewSkillExpiresDate(e.target.value)}
                    className={`w-full ${DATE_CLASS}`}
                  />
                </div>
              </div>
            )}
            {showCertFields && (
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Notes</label>
                <textarea
                  value={newSkillNotes}
                  onChange={(e) => setNewSkillNotes(e.target.value)}
                  className={`w-full resize-none ${FIELD_CLASS} text-sm`}
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <ToolbarButton icon={X} label="Cancel" onClick={() => { setShowSkillForm(false); setNewSkillName(""); }} variant="default" className="!h-7 !px-2.5 !text-xs" />
              <ToolbarButton icon={creatingSkill ? Loader2 : Plus} label={creatingSkill ? "Adding..." : "Add"} onClick={handleAddSkill} disabled={!newSkillName.trim() || creatingSkill} variant="success" className="!h-7 !px-2.5 !text-xs" />
            </div>
          </div>
        ) : skills.length > 0 && canAdd ? (
          <div className="mt-2">
            <ToolbarButton icon={Plus} label="Add Skill" onClick={() => setShowSkillForm(true)} variant="default" className="!h-7 !px-2.5 !text-[11px] text-success hover:!bg-success/10" />
          </div>
        ) : skills.length === 0 && canAdd ? (
          /* ── Empty state with add action ── */
          <div className={`flex flex-col items-center justify-center py-5 text-center rounded border border-dashed border-border-major bg-muted/40`}>
            <Award className="h-5 w-5 text-muted-foreground/40 mb-2" />
            <p className={`text-xs ${theme.textMuted} mb-2`}>No skills or certifications added.</p>
            <ToolbarButton icon={Plus} label="Add Skills" onClick={() => setShowSkillForm(true)} variant="default" className="!h-7 !px-2.5 !text-[11px] text-success hover:!bg-success/10" />
          </div>
        ) : skills.length === 0 && !canAdd ? (
          /* ── Read-only empty state ── */
          <div className={`flex flex-col items-center justify-center py-5 text-center rounded border border-dashed border-border-major bg-muted/40`}>
            <Award className="h-5 w-5 text-muted-foreground/40 mb-2" />
            <p className={`text-xs ${theme.textMuted}`}>No skills or certifications recorded.</p>
          </div>
        ) : null)}
        </div>
      </div>

      {/* ── Account & Access (compact summary) ──────────────────────── */}
      <div className="border-t border-border-major">
        <AccountAccessSummary adminProfileId={adminProfileId} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACCOUNT & ACCESS — compact summary
   ═══════════════════════════════════════════════════════════════════ */
function AccountAccessSummary({ adminProfileId }: { adminProfileId: string | null }) {
  const { data, loading } = useQuery<{ userRoles: { id: string; roleName: string; roleCode: string; accessLevel: string; isActive: boolean }[] }>(USER_ROLES_QUERY, {
    variables: { userProfileId: adminProfileId },
    skip: !adminProfileId,
    fetchPolicy: "cache-and-network",
  });

  const roles = data?.userRoles ?? [];
  const activeRoles = roles.filter((r) => r.isActive);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-3">
        <Shield className={`h-3.5 w-3.5 ${theme.icon}`} />
        <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>Account &amp; Access</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="space-y-2.5">
        {adminProfileId ? (
          <>
            {/* ── System Roles ── */}
            <div className="flex items-start justify-between py-1.5">
              <span className="text-xs text-slate-500">Roles</span>
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0 mt-0.5" />
              ) : roles.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No system roles assigned</span>
              ) : (
                <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                  {roles.map((r) => (
                    <span
                      key={r.id}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        r.isActive
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      <Shield className={`h-2.5 w-2.5 ${r.isActive ? "text-sky-500" : "text-slate-300"}`} />
                      {r.roleName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Access Level ── */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-500">Access Level</span>
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : roles.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Not assigned</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
                  <Shield className="h-3.5 w-3.5 text-sky-500" />
                  {activeRoles[0]?.accessLevel || roles[0].accessLevel}
                </span>
              )}
            </div>

            {/* ── Status ── */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-500">Status</span>
              {activeRoles.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300" />
                  Inactive
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-400 italic pt-1">Role assignments can be changed in System &gt; Users &amp; Roles with admin rights.</p>
          </>
        ) : (
          <>
            {/* ── Roles (restricted) ── */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-500">Roles</span>
              <span className="text-xs text-slate-400 italic">Restricted</span>
            </div>
            {/* ── Access Level (restricted) ── */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-500">Access Level</span>
              <span className="text-xs text-slate-400 italic">Restricted</span>
            </div>
            <p className="text-[10px] text-slate-400 italic pt-1">Requires an admin profile to view detailed access and permissions.</p>
          </>
        )}
      </div>
    </div>
  );
}
