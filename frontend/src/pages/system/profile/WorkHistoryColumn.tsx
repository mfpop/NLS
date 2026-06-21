import React from "react";
import { Pencil, Check, X, Plus, Trash2, Briefcase, Loader2 } from "lucide-react";
import { theme } from "@/styles/themeTokens";
import type { WorkHistoryEntry } from "@/types/profile";
import {
  FieldShell, MissingValue, EmptyBlock,
  inputClass, extractPeriodYear,
  editIconButtonClass, saveIconButtonClass, dangerIconButtonClass,
} from "./shared";

interface WorkHistoryColumnProps {
  workDraft: WorkHistoryEntry[];
  setWorkDraft: (draft: WorkHistoryEntry[] | ((prev: WorkHistoryEntry[]) => WorkHistoryEntry[])) => void;
  editingSection: string | null;
  startEditing: (section: string) => void;
  cancelEditing: () => void;
  handleSave: () => Promise<void>;
  saving: boolean;
  fieldErrors: Record<string, string>;
  experienceRef: React.RefObject<HTMLDivElement | null>;
  normalized: {
    roles: { bullets: string[] }[];
    highlights: string[];
    score: { value: number; label: string };
    summary: string[];
    tenure: string;
    plants: number;
    lines: number;
  };
}

/* ═══════════════════════════════════════════════════════════════════
   COLUMN 2 — Work History
   ═══════════════════════════════════════════════════════════════════ */
export function WorkHistoryColumn({
  workDraft,
  setWorkDraft,
  editingSection,
  startEditing,
  cancelEditing,
  handleSave,
  saving,
  fieldErrors,
  experienceRef,
  normalized,
}: WorkHistoryColumnProps) {
  return (
    <div ref={experienceRef} className={`flex flex-col min-h-0 overflow-hidden border-r border-border/70 ${theme.card}`}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className={`flex h-12 items-center justify-between border-b border-border/70 px-4 shrink-0`}>
        <div>
          <h2 className={`text-sm font-semibold ${theme.textPrimary}`}>Work history</h2>
          <p className={`text-[11px] ${theme.textMuted} leading-5`}>Roles, companies, and measurable impact</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {editingSection === "work" ? (
            <>
              <button type="button" onClick={handleSave} title="Save section" disabled={saving} className={saveIconButtonClass}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setWorkDraft((prev) => [{ id: `w${Date.now()}`, role: "", company: "", period: "", description: "" }, ...prev])}
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
            <button type="button" onClick={() => startEditing("work")} className={editIconButtonClass} title="Edit work history">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className={`divide-y divide-border/70 overflow-y-auto`}>
        {workDraft.length > 0 ? (
          [...workDraft].sort((a, b) => {
            const yearA = extractPeriodYear(a.period);
            const yearB = extractPeriodYear(b.period);
            if (!yearA) return 1;
            if (!yearB) return -1;
            return yearB - yearA;
          }).map((job, index) => (
            <div
              key={job.id}
              className={`px-4 py-3 transition-colors ${editingSection === "work" ? "bg-success/5" : theme.interactiveRow}`}
            >
              {editingSection === "work" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>
                      <Briefcase className="h-3.5 w-3.5" />
                      Experience {index + 1}
                    </div>
                    <button
                      type="button"
                      title="Remove this experience"
                      onClick={() => setWorkDraft((prev) => prev.filter((item) => item.id !== job.id))}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-danger transition hover:bg-danger/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldShell label="Role" error={fieldErrors[`work-${index}-role`]}>
                      <input
                        value={job.role}
                        onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, role: e.target.value } : item)))}
                        className={inputClass}
                        placeholder="Plant manager"
                      />
                    </FieldShell>
                    <FieldShell label="Company" error={fieldErrors[`work-${index}-company`]}>
                      <input
                        value={job.company}
                        onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, company: e.target.value } : item)))}
                        className={inputClass}
                        placeholder="Company name"
                      />
                    </FieldShell>
                  </div>

                  <div className="sm:w-64">
                    <FieldShell label="Period">
                      <input
                        value={job.period}
                        onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, period: e.target.value } : item)))}
                        className={inputClass}
                        placeholder="2023 - Present"
                      />
                    </FieldShell>
                  </div>

                  <div>
                    <FieldShell label="Impact statement">
                      <textarea
                        value={job.description}
                        onChange={(e) => setWorkDraft((prev) => prev.map((item) => (item.id === job.id ? { ...item, description: e.target.value } : item)))}
                        className={`w-full rounded border border-border/70 bg-muted/40 p-2.5 text-sm ${theme.textPrimary} transition placeholder:text-muted-foreground focus:border-success focus:outline-none`}
                        rows={4}
                        placeholder="Describe results, process improvements, or business impact."
                      />
                    </FieldShell>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 group/row">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded ${theme.entityIconBg}`}>
                    <Briefcase className={`h-3.5 w-3.5 ${theme.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${theme.textPrimary} leading-5`}>
                      {job.role || <MissingValue label="Untitled role" />}
                    </div>
                    <div className={`text-xs ${theme.textMuted} leading-5`}>
                      {job.company}
                      {job.period ? <span className="ml-1.5">({job.period})</span> : null}
                    </div>
                    {normalized.roles[index]?.bullets?.length ? (
                      <ul className="mt-1.5 space-y-1">
                        {normalized.roles[index].bullets.map((point, i) => (
                          <li key={i} className={`flex items-start gap-2 text-sm ${theme.textPrimary} leading-5`}>
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-border" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="px-4 py-3">
            <EmptyBlock
              icon={Briefcase}
              title="No work experience"
              description="Add your professional history to complete your profile."
              action="Add Experience"
              onAction={() => startEditing("work")}
            />
          </div>
        )}


      </div>
    </div>
  );
}
