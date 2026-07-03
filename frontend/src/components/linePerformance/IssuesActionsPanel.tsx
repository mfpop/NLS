import { useState } from "react";
import { ListChecks, AlertCircle, ArrowRight, Plus, User, Calendar } from "lucide-react";
import type { LinkedIssue, LinkedAction } from "@/types/linePerformance";

interface Props {
  issues: LinkedIssue[];
  actions: LinkedAction[];
  onNewIssue: () => void;
  onNewAction: () => void;
}

const MAX_ROWS = 5;

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function priorityScore(item: { type: "issue"; item: LinkedIssue } | { type: "action"; item: LinkedAction }): number {
  if (item.type === "issue") {
    const sev = item.item.severity;
    if (sev === "critical") return 0;
    if (sev === "high") return 1;
    if (sev === "medium") return 2;
    return 3;
  }
  const pri = item.item.priority;
  if (pri === "urgent") return 0;
  if (pri === "high") return 1;
  if (pri === "medium") return 2;
  return 3;
}

export function IssuesActionsPanel({ issues, actions, onNewIssue, onNewAction }: Props) {
  const [showAll, setShowAll] = useState(false);

  const allItems = [
    ...issues.map((i) => ({ type: "issue" as const, item: i })),
    ...actions.map((a) => ({ type: "action" as const, item: a })),
  ].sort((a, b) => priorityScore(a) - priorityScore(b));

  const visibleItems = showAll ? allItems : allItems.slice(0, MAX_ROWS);
  const hasMore = allItems.length > MAX_ROWS;
  const hasOverdue = actions.some((a) => isOverdue(a.dueDate));

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Issues & Actions</h3>
          {hasOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-700 border border-red-200">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Overdue
            </span>
          )}
          <span className="text-[10px] text-slate-400 tabular-nums">{allItems.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onNewIssue}
            className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium text-sky-700 hover:bg-sky-50 transition-colors">
            <Plus className="h-3 w-3" />Issue
          </button>
          <button type="button" onClick={onNewAction}
            className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium text-sky-700 hover:bg-sky-50 transition-colors">
            <Plus className="h-3 w-3" />Action
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {allItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-500">No open issues or actions</p>
          </div>
        ) : (
          <>
            {visibleItems.map((entry) => {
              if (entry.type === "issue") {
                const issue = entry.item;
                const sevColor = issue.severity === "critical" ? "border-red-200 bg-red-50 text-red-700"
                  : issue.severity === "high" ? "border-amber-200 bg-amber-50 text-amber-700"
                    : issue.severity === "medium" ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-slate-100 text-slate-600";
                const dotColor = issue.severity === "critical" ? "text-red-500"
                  : issue.severity === "high" ? "text-amber-500"
                    : issue.severity === "medium" ? "text-sky-500" : "text-slate-400";
                return (
                  <div key={issue.id} className="group flex items-start gap-2 px-3 py-1.5 border-b border-slate-100 last:border-b-0 hover:bg-white transition-colors">
                    <AlertCircle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-medium text-slate-800 truncate leading-tight">{issue.title}</span>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border leading-tight ${sevColor}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                        <span>{issue.status === "open" ? "Open" : issue.status === "in_progress" ? "In Progress" : "Overdue"}</span>
                        {issue.owner && <><span className="text-slate-300">·</span><User className="h-2.5 w-2.5" /><span className="truncate max-w-[100px]">{issue.owner}</span></>}
                        {issue.dueDate && <><span className="text-slate-300">·</span><Calendar className="h-2.5 w-2.5" /><span className={isOverdue(issue.dueDate) ? "text-red-600 font-medium" : ""}>{issue.dueDate}</span></>}
                      </div>
                      {/* Quick actions */}
                      <div className="hidden group-hover:flex items-center gap-1 mt-1">
                        <button type="button" className="text-[9px] text-sky-700 hover:bg-sky-50 rounded px-1.5 py-0.5 font-medium transition-colors">Assign</button>
                        <button type="button" className="text-[9px] text-amber-700 hover:bg-amber-50 rounded px-1.5 py-0.5 font-medium transition-colors">Escalate</button>
                        <button type="button" className="text-[9px] text-slate-600 hover:bg-slate-100 rounded px-1.5 py-0.5 font-medium transition-colors">Snooze</button>
                      </div>
                    </div>
                  </div>
                );
              }
              const action = entry.item;
              const overdue = isOverdue(action.dueDate);
              const priColor = overdue || action.priority === "urgent" ? "border-red-200 bg-red-50 text-red-700"
                : action.priority === "high" ? "border-amber-200 bg-amber-50 text-amber-700"
                  : action.priority === "medium" ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-100 text-slate-600";
              const dotColor = overdue || action.priority === "urgent" ? "text-red-500"
                : action.priority === "high" ? "text-amber-500"
                  : action.priority === "medium" ? "text-sky-500" : "text-slate-400";
              return (
                <div key={action.id} className="group flex items-start gap-2 px-3 py-1.5 border-b border-slate-100 last:border-b-0 hover:bg-white transition-colors">
                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-medium text-slate-800 truncate leading-tight">{action.title}</span>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border leading-tight ${priColor}`}>
                        {overdue ? "OVERDUE" : action.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                      <span>{action.status === "open" ? "Open" : action.status === "in_progress" ? "In Progress" : "Completed"}</span>
                      {action.assignedTo && <><span className="text-slate-300">·</span><User className="h-2.5 w-2.5" /><span className="truncate max-w-[100px]">{action.assignedTo}</span></>}
                      {action.dueDate && <><span className="text-slate-300">·</span><Calendar className="h-2.5 w-2.5" /><span className={overdue ? "text-red-600 font-medium" : ""}>{action.dueDate}</span></>}
                    </div>
                    {/* Quick actions */}
                    <div className="hidden group-hover:flex items-center gap-1 mt-1">
                      <button type="button" className="text-[9px] text-sky-700 hover:bg-sky-50 rounded px-1.5 py-0.5 font-medium transition-colors">Assign</button>
                      <button type="button" className="text-[9px] text-amber-700 hover:bg-amber-50 rounded px-1.5 py-0.5 font-medium transition-colors">Escalate</button>
                      <button type="button" className="text-[9px] text-slate-600 hover:bg-slate-100 rounded px-1.5 py-0.5 font-medium transition-colors">Snooze</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore && !showAll && (
              <button type="button" onClick={() => setShowAll(true)}
                className="w-full py-1.5 text-[10px] font-medium text-sky-700 hover:bg-sky-50 transition-colors text-center">
                View all {allItems.length} issues & actions →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
