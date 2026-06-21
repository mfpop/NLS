import React from "react";
import { Pencil, Check, X, Plus, Trash2, BookOpen, Loader2 } from "lucide-react";
import { theme } from "@/styles/themeTokens";
import type { EducationEntry } from "@/types/profile";
import {
  FieldShell, MissingValue, EmptyBlock,
  inputClass, extractPeriodYear,
  editIconButtonClass, saveIconButtonClass, dangerIconButtonClass,
} from "./shared";

interface EducationColumnProps {
  eduDraft: EducationEntry[];
  setEduDraft: (draft: EducationEntry[] | ((prev: EducationEntry[]) => EducationEntry[])) => void;
  editingSection: string | null;
  startEditing: (section: string) => void;
  cancelEditing: () => void;
  handleSave: () => Promise<void>;
  saving: boolean;
  fieldErrors: Record<string, string>;
  educationRef: React.RefObject<HTMLDivElement | null>;
}

/* ═══════════════════════════════════════════════════════════════════
   COLUMN 3 — Education
   ═══════════════════════════════════════════════════════════════════ */
export function EducationColumn({
  eduDraft,
  setEduDraft,
  editingSection,
  startEditing,
  cancelEditing,
  handleSave,
  saving,
  fieldErrors,
  educationRef,
}: EducationColumnProps) {
  return (
    <div ref={educationRef} className={`flex flex-col min-h-0 overflow-hidden ${theme.card}`}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className={`flex h-12 items-center justify-between border-b border-border/70 px-4 shrink-0`}>
        <div>
          <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>Education</h2>
          <p className={`text-[11px] ${theme.textMuted} leading-5`}>Formal training and credentials</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {editingSection === "edu" ? (
            <>
              <button type="button" onClick={handleSave} title="Save section" disabled={saving} className={saveIconButtonClass}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setEduDraft((prev) => [{ id: `e${Date.now()}`, degree: "", school: "", period: "" }, ...prev])}
                className={saveIconButtonClass}
                title="Add entry"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={cancelEditing} className={dangerIconButtonClass}>
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => startEditing("edu")} className={editIconButtonClass} title="Edit education">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className={`divide-y divide-border/70 overflow-y-auto`}>
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
  );
}
