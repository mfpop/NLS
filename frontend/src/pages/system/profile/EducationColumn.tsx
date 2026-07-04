import React, { useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { X, Plus, Pencil, Trash2, BookOpen, Loader2, Award, ShieldCheck, AlertTriangle } from "lucide-react";
import { ToolbarButton } from "@/components/layout/PageToolbar";
import { theme } from "@/styles/themeTokens";
import type { EducationEntry, ProfileSkill } from "@/types/profile";
import {
  FieldShell, MissingValue, EmptyBlock, ProfileSectionHeader,
  inputClass, extractPeriodYear,
} from "./shared";
import {
  PROFILE_SKILLS_QUERY,
  CREATE_PROFILE_SKILL_MUTATION,
  UPDATE_PROFILE_SKILL_MUTATION,
  DELETE_PROFILE_SKILL_MUTATION,
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

const FIELD_CLASS = `rounded border border-border bg-background px-2.5 py-1 text-xs ${theme.textPrimary} placeholder:text-muted-foreground focus:border-success focus:outline-none`;
const DATE_CLASS = `rounded border border-border bg-background px-2 py-1 text-xs ${theme.textPrimary} focus:border-success focus:outline-none`;

interface EducationColumnProps {
  adminProfileId: string | null;
  eduDraft: EducationEntry[];
  setEduDraft: (draft: EducationEntry[] | ((prev: EducationEntry[]) => EducationEntry[])) => void;
  editingSection: string | null;
  startEditing: (section: string) => void;
  fieldErrors: Record<string, string>;
  educationRef: React.RefObject<HTMLDivElement | null>;
}

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
  const [newSkillEvaluationScore, setNewSkillEvaluationScore] = useState("");
  const [newSkillIsCertification, setNewSkillIsCertification] = useState(false);
  const [newSkillNotes, setNewSkillNotes] = useState("");
  const profileId = adminProfileId || "auto";

  const { data: skillsData, loading: skillsLoading, refetch: refetchSkills } = useQuery<{
    profileSkills: ProfileSkill[];
  }>(PROFILE_SKILLS_QUERY, {
    variables: { userProfileId: profileId },
    fetchPolicy: "cache-and-network",
  });
  const skills = skillsData?.profileSkills ?? [];

  const [createSkillMut, { loading: creatingSkill }] = useMutation(CREATE_PROFILE_SKILL_MUTATION);
  const [updateSkillMut, { loading: updatingSkill }] = useMutation(UPDATE_PROFILE_SKILL_MUTATION);
  const [deleteSkillMut, { loading: deletingSkill }] = useMutation(DELETE_PROFILE_SKILL_MUTATION);

  /* ── Error state ── */
  const [skillError, setSkillError] = useState<string | null>(null);

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
  const [editSkillEvaluationScore, setEditSkillEvaluationScore] = useState("");
  const [editSkillIsCertification, setEditSkillIsCertification] = useState(false);
  const [editSkillNotes, setEditSkillNotes] = useState("");

  const handleStartEditSkill = useCallback((skill: ProfileSkill) => {
    setEditingSkillId(skill.id);
    setEditSkillName(skill.name);
    setEditSkillCategory(skill.category);
    setEditSkillLevel(skill.level || "");
    setEditSkillIssuer(skill.issuer || "");
    setEditSkillIssuedDate(skill.issuedDate ? skill.issuedDate.slice(0, 10) : "");
    setEditSkillExpiresDate(skill.expiresDate ? skill.expiresDate.slice(0, 10) : "");
    setEditSkillEvaluationScore(skill.evaluationScore != null ? String(skill.evaluationScore) : "");
    setEditSkillIsCertification(skill.isCertification);
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
    setEditSkillEvaluationScore("");
    setEditSkillIsCertification(false);
    setEditSkillNotes("");
  }, []);

  const handleSaveEditSkill = useCallback(async () => {
    if (!editingSkillId || !editSkillName.trim()) return;
    setSkillError(null);
    try {
      const input: Record<string, unknown> = {
        name: editSkillName.trim(),
        category: editSkillCategory,
      };
      if (editSkillLevel.trim()) input.level = editSkillLevel.trim();
      if (editSkillIssuer.trim()) input.issuer = editSkillIssuer.trim();
      if (editSkillIssuedDate.trim()) input.issuedDate = editSkillIssuedDate.trim();
      if (editSkillExpiresDate.trim()) input.expiresDate = editSkillExpiresDate.trim();
      if (editSkillEvaluationScore.trim()) input.evaluationScore = parseFloat(editSkillEvaluationScore.trim());
      input.isCertification = editSkillIsCertification;
      if (editSkillNotes.trim()) input.notes = editSkillNotes.trim();
      const { data } = await updateSkillMut({ variables: { id: editingSkillId, input } });
      const result = data as { updateProfileSkill?: { errors?: Array<{ field: string; message: string }> } } | undefined;
      if (result?.updateProfileSkill?.errors?.length) {
        setSkillError(result.updateProfileSkill.errors[0].message);
        return;
      }
      handleCancelEditSkill();
      refetchSkills();
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : "Failed to update skill");
    }
  }, [editingSkillId, editSkillName, editSkillCategory, editSkillLevel, editSkillIssuer, editSkillIssuedDate, editSkillExpiresDate, editSkillEvaluationScore, editSkillIsCertification, editSkillNotes, updateSkillMut, handleCancelEditSkill, refetchSkills]);

  const handleAddSkill = useCallback(async () => {
    if (!newSkillName.trim()) return;
    setSkillError(null);
    try {
      const input: Record<string, unknown> = {
        userProfileId: profileId,
        name: newSkillName.trim(),
        category: newSkillCategory,
      };
      if (newSkillLevel.trim()) input.level = newSkillLevel.trim();
      if (newSkillIssuer.trim()) input.issuer = newSkillIssuer.trim();
      if (newSkillIssuedDate.trim()) input.issuedDate = newSkillIssuedDate.trim();
      if (newSkillExpiresDate.trim()) input.expiresDate = newSkillExpiresDate.trim();
      if (newSkillEvaluationScore.trim()) input.evaluationScore = parseFloat(newSkillEvaluationScore.trim());
      input.isCertification = newSkillIsCertification;
      if (newSkillNotes.trim()) input.notes = newSkillNotes.trim();
      const { data } = await createSkillMut({ variables: { input } });
      const result = data as { createProfileSkill?: { errors?: Array<{ field: string; message: string }> } } | undefined;
      if (result?.createProfileSkill?.errors?.length) {
        setSkillError(result.createProfileSkill.errors[0].message);
        return;
      }
      setNewSkillName("");
      setNewSkillCategory("SKILL");
      setNewSkillLevel("");
      setNewSkillIssuer("");
      setNewSkillIssuedDate("");
      setNewSkillExpiresDate("");
      setNewSkillEvaluationScore("");
      setNewSkillIsCertification(false);
      setNewSkillNotes("");
      setShowSkillForm(false);
      refetchSkills();
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : "Failed to create skill");
    }
  }, [newSkillName, newSkillCategory, newSkillLevel, newSkillIssuer, newSkillIssuedDate, newSkillExpiresDate, newSkillEvaluationScore, newSkillIsCertification, newSkillNotes, profileId, createSkillMut, refetchSkills]);

  const handleDeleteSkill = useCallback(async (skillId: string) => {
    setSkillError(null);
    try {
      const { data } = await deleteSkillMut({ variables: { id: skillId } });
      const result = data as { deleteProfileSkill?: { errors?: Array<{ field: string; message: string }> } } | undefined;
      if (result?.deleteProfileSkill?.errors?.length) {
        setSkillError(result.deleteProfileSkill.errors[0].message);
        return;
      }
      setDeleteConfirmId(null);
      refetchSkills();
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : "Failed to delete skill");
      setDeleteConfirmId(null);
    }
  }, [deleteSkillMut, refetchSkills]);

  const handleCancelDelete = useCallback(() => setDeleteConfirmId(null), []);

  const showCertFields = newSkillCategory === "CERTIFICATION" || newSkillCategory === "LICENSE";

  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      {/* ── Education section ── */}
      <div ref={educationRef}>
        <ProfileSectionHeader
          icon={BookOpen}
          iconColor="text-success"
          title="Education"
          subtitle="Formal training and credentials"
        />

        <div className={`divide-y divide-border overflow-y-auto`}>
          {eduDraft.length > 0 ? (
            [...eduDraft].sort((a, b) => {
              const ya = extractPeriodYear(a.period);
              const yb = extractPeriodYear(b.period);
              if (!ya) return 1;
              if (!yb) return -1;
              return yb - ya;
            }).map((edu, index) => (
              <div key={edu.id}
                className={`px-4 py-3 transition-colors ${editingSection === "edu" ? "bg-success/5" : theme.interactiveRow}`}>
                {editingSection === "edu" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        Education {index + 1}
                      </div>
                      <button type="button" onClick={() => setEduDraft((prev) => prev.filter((item) => item.id !== edu.id))}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-danger transition hover:bg-danger/10">
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldShell label="Degree" error={fieldErrors[`edu-${index}-degree`]}>
                        <input value={edu.degree} onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, degree: e.target.value } : item)))}
                          className={inputClass} placeholder="M.Sc. Industrial Engineering" />
                      </FieldShell>
                      <FieldShell label="School" error={fieldErrors[`edu-${index}-school`]}>
                        <input value={edu.school} onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, school: e.target.value } : item)))}
                          className={inputClass} placeholder="University name" />
                      </FieldShell>
                    </div>
                    <div className="sm:w-64">
                      <FieldShell label="Period">
                        <input value={edu.period} onChange={(e) => setEduDraft((prev) => prev.map((item) => (item.id === edu.id ? { ...item, period: e.target.value } : item)))}
                          className={inputClass} placeholder="2015 - 2017" />
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
                        {edu.school}{edu.period ? <span className="ml-1.5">({edu.period})</span> : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-4 py-3">
              <EmptyBlock icon={BookOpen} title="No education added" description="Add your educational background." action="Add Education" onAction={() => startEditing("edu")} />
            </div>
          )}
        </div>
      </div>

      {/* ── Skills & Certifications ── */}
      <div className="border-t border-border">
        <div>
          <ProfileSectionHeader
            icon={ShieldCheck}
            iconColor="text-cyan-500"
            title="Skills &amp; Certifications"
            subtitle="Competencies, training, and credentials"
          />

          {skillsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : skills.length > 0 ? (
            <div className="divide-y divide-border/50">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-start gap-3 px-4 py-3 group/row hover:bg-muted transition-colors">
                  {/* Icon */}
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded ${theme.entityIconBg}`}>
                    <Award className={`h-3.5 w-3.5 ${theme.icon}`} />
                  </div>

                  {editingSkillId === skill.id ? (
                    /* ── Inline edit mode ── */
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <input value={editSkillName} onChange={(e) => setEditSkillName(e.target.value)}
                          className={`flex-1 ${FIELD_CLASS}`} placeholder="Skill or certification name" />
                        <select value={editSkillCategory} onChange={(e) => setEditSkillCategory(e.target.value)} className={DATE_CLASS}>
                          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input value={editSkillLevel} onChange={(e) => setEditSkillLevel(e.target.value)}
                          className={`flex-1 ${FIELD_CLASS}`} placeholder="Level (Basic, Intermediate, Advanced, Expert)" />
                        <input value={editSkillIssuer} onChange={(e) => setEditSkillIssuer(e.target.value)}
                          className={`flex-1 ${FIELD_CLASS}`} placeholder="Issuer" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] text-muted-foreground mb-0.5">Issued Date</label>
                          <input type="date" value={editSkillIssuedDate} onChange={(e) => setEditSkillIssuedDate(e.target.value)} className={`w-full ${DATE_CLASS}`} />
                        </div>
                        {(editSkillCategory === "CERTIFICATION" || editSkillCategory === "LICENSE") && (
                          <div className="flex-1">
                            <label className="block text-[10px] text-muted-foreground mb-0.5">Expiry Date</label>
                            <input type="date" value={editSkillExpiresDate} onChange={(e) => setEditSkillExpiresDate(e.target.value)} className={`w-full ${DATE_CLASS}`} />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] text-muted-foreground mb-0.5">Evaluation Score</label>
                          <input type="number" step="0.1" min="0" max="10" value={editSkillEvaluationScore} onChange={(e) => setEditSkillEvaluationScore(e.target.value)}
                            className={`w-full ${DATE_CLASS}`} placeholder="e.g. 8.5" />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={editSkillIsCertification} onChange={(e) => setEditSkillIsCertification(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-border text-cyan-600 focus:ring-cyan-500" />
                            <span className="text-[10px] text-muted-foreground font-medium">Certification</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Notes</label>
                        <textarea value={editSkillNotes} onChange={(e) => setEditSkillNotes(e.target.value)}
                          className={`w-full resize-none ${FIELD_CLASS}`} rows={2} placeholder="Optional notes..." />
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={handleCancelEditSkill}
                          className="inline-flex h-7 items-center rounded px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                        <button type="button" onClick={handleSaveEditSkill} disabled={!editSkillName.trim() || updatingSkill}
                          className="inline-flex h-7 items-center rounded px-2.5 text-xs font-semibold text-success hover:bg-success/10 disabled:opacity-40 disabled:pointer-events-none transition-colors">{updatingSkill ? "Saving..." : "Save"}</button>
                      </div>
                      {skillError && (
                        <p className="text-[11px] text-danger mt-1">{skillError}</p>
                      )}
                    </div>
                  ) : (
                    /* ── View mode — structured rows ── */
                    <div className="min-w-0 flex-1">
                      {/* Title row: name + badge */}
                      <div className="flex items-center gap-1.5 flex-wrap leading-5">
                        <span className={`text-sm font-medium ${theme.textPrimary}`}>{skill.name}</span>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[skill.category] || "bg-muted text-muted-foreground"}`}>
                          {CATEGORY_OPTIONS.find((c) => c.value === skill.category)?.label || skill.category}
                        </span>
                      </div>
                      {/* Meta row: level, issuer, dates */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {skill.level && (
                          <span className="text-[11px] text-muted-foreground">
                            <span className="font-medium text-muted-foreground">Level:</span> {skill.level}
                          </span>
                        )}
                        {skill.issuer && (
                          <span className="text-[11px] text-muted-foreground">
                            <span className="font-medium text-muted-foreground">Issuer:</span> {skill.issuer}
                          </span>
                        )}
                        {skill.issuedDate && (
                          <span className="text-[11px] text-muted-foreground">
                            <span className="font-medium text-muted-foreground">Issued:</span> {new Date(skill.issuedDate).toLocaleDateString()}
                          </span>
                        )}
                        {skill.expiresDate && (
                          <span className={`text-[11px] ${new Date(skill.expiresDate) < new Date() ? "text-warning font-medium" : "text-muted-foreground"}`}>
                            <span className="font-medium text-muted-foreground">Expires:</span> {new Date(skill.expiresDate).toLocaleDateString()}
                          </span>
                        )}
                        {skill.evaluationScore != null && (
                          <span className="text-[11px] text-muted-foreground">
                            <span className="font-medium text-muted-foreground">Score:</span> {skill.evaluationScore}
                          </span>
                        )}
                        {skill.isCertification && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-success/15 text-success">
                            Certification
                          </span>
                        )}
                      </div>
                      {/* Notes row */}
                      {skill.notes && (
                        <p className={`text-[11px] ${theme.textMuted} mt-0.5 italic leading-relaxed`}>{skill.notes}</p>
                      )}
                    </div>
                  )}

                  {/* ── Action buttons ── */}
                  {deleteConfirmId === skill.id ? (
                    <div className="flex items-center gap-1 shrink-0 mt-1">
                      <span className="text-[10px] text-danger font-medium flex items-center gap-0.5">
                        <AlertTriangle className="h-3 w-3" />Delete?
                      </span>
                      <button type="button" onClick={() => handleDeleteSkill(skill.id)} disabled={deletingSkill}
                        className="inline-flex h-6 items-center rounded px-1.5 text-[10px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-40 transition-colors">
                        {deletingSkill ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
                      </button>
                      <button type="button" onClick={handleCancelDelete}
                        className="inline-flex h-6 items-center rounded px-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors">No</button>
                    </div>
                  ) : editingSkillId !== skill.id ? (
                    <div className="flex items-center gap-0.5 shrink-0 mt-1">
                      <button type="button" onClick={() => handleStartEditSkill(skill)}
                        className="opacity-0 group-hover/row:opacity-100 rounded p-0.5 text-muted-foreground transition-all hover:text-accent-foreground" title="Edit skill">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setDeleteConfirmId(skill.id)}
                        className="opacity-0 group-hover/row:opacity-100 rounded p-0.5 text-muted-foreground transition-all hover:text-danger" title="Delete skill">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* ── Empty state + Add button ── */}
          {!skillsLoading && skills.length === 0 && !showSkillForm && (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${theme.entityIconBg} mb-2`}>
                <Award className={`h-5 w-5 ${theme.icon}`} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No skills or certifications added.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add your competencies, training, and credentials.</p>
              <ToolbarButton icon={Plus} label="Add Skill" onClick={() => setShowSkillForm(true)}
                variant="success" className="mt-3 !h-7 !px-2.5 !text-xs" />
            </div>
          )}

          {/* ── Add skill form ── */}
          {showSkillForm && (
            <div className={`mx-3 my-3 space-y-2 rounded border border-border bg-muted/40 p-3`}>
              <div className="flex items-start gap-2">
                <input value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)}
                  className={`flex-1 ${FIELD_CLASS} text-sm`} placeholder="Skill or certification name" />
                <select value={newSkillCategory} onChange={(e) => setNewSkillCategory(e.target.value)} className={`${DATE_CLASS} text-sm`}>
                  {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input value={newSkillLevel} onChange={(e) => setNewSkillLevel(e.target.value)}
                  className={`flex-1 ${FIELD_CLASS} text-sm`} placeholder="Level (Basic, Intermediate, Advanced, Expert)" />
                <input value={newSkillIssuer} onChange={(e) => setNewSkillIssuer(e.target.value)}
                  className={`flex-1 ${FIELD_CLASS} text-sm`} placeholder="Issuer (optional)" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Issued Date</label>
                  <input type="date" value={newSkillIssuedDate} onChange={(e) => setNewSkillIssuedDate(e.target.value)} className={`w-full ${DATE_CLASS}`} />
                </div>
                {(newSkillCategory === "CERTIFICATION" || newSkillCategory === "LICENSE") && (
                  <div className="flex-1">
                    <label className="block text-[10px] text-muted-foreground mb-0.5">Expiry Date</label>
                    <input type="date" value={newSkillExpiresDate} onChange={(e) => setNewSkillExpiresDate(e.target.value)} className={`w-full ${DATE_CLASS}`} />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Evaluation Score</label>
                  <input type="number" step="0.1" min="0" max="10" value={newSkillEvaluationScore} onChange={(e) => setNewSkillEvaluationScore(e.target.value)}
                    className={`w-full ${DATE_CLASS}`} placeholder="e.g. 8.5" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={newSkillIsCertification} onChange={(e) => setNewSkillIsCertification(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border text-cyan-600 focus:ring-cyan-500" />
                    <span className="text-[10px] text-muted-foreground font-medium">Certification</span>
                  </label>
                </div>
              </div>
              {showCertFields && (
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Notes</label>
                  <textarea value={newSkillNotes} onChange={(e) => setNewSkillNotes(e.target.value)}
                    className={`w-full resize-none ${FIELD_CLASS} text-sm`} rows={2} placeholder="Optional notes..." />
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <ToolbarButton icon={X} label="Cancel" onClick={() => { setShowSkillForm(false); setNewSkillName(""); }}
                  variant="default" className="!h-7 !px-2.5 !text-xs" />
                <ToolbarButton icon={creatingSkill ? Loader2 : Plus} label={creatingSkill ? "Adding..." : "Add"}
                  onClick={handleAddSkill} disabled={!newSkillName.trim() || creatingSkill}
                  variant="success" className="!h-7 !px-2.5 !text-xs" />
              </div>
            </div>
          )}

          {/* ── Add button when skills exist ── */}
          {!skillsLoading && skills.length > 0 && !showSkillForm && (
            <div className="px-4 py-2">
              <ToolbarButton icon={Plus} label="Add Skill" onClick={() => setShowSkillForm(true)}
                variant="default" className="!h-7 !px-2.5 !text-[11px] text-success hover:!bg-success/10" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
