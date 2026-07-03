import { ListChecks, AlertCircle, Plus, ArrowRight } from "lucide-react";
import type { LinkedIssue, LinkedAction } from "@/types/linePerformance";

interface Props {
  issues: LinkedIssue[];
  actions: LinkedAction[];
  onNewIssue: () => void;
  onNewAction: () => void;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

const MAX_ROWS = 5;

export function LinkedIssuesActionsPanel({ issues, actions, onNewIssue, onNewAction }: Props) {
  const hasOverdueAction = actions.some((a) => isOverdue(a.dueDate));
  const allItems = [
    ...issues.map((i) => ({ type: "issue" as const, item: i })),
    ...actions.map((a) => ({ type: "action" as const, item: a })),
  ];
  const visibleItems = allItems.slice(0, MAX_ROWS);
  const hasMore = allItems.length > MAX_ROWS;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Issues & Actions</h3>
          {hasOverdueAction && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-700 border border-red-200">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Overdue
            </span>
          )}
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

      <div className="flex-1 min-h-0 overflow-y-auto">
        {allItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-500">No open issues or actions</p>
          </div>
        ) : (
          <>
            {visibleItems.map((entry) => {
              if (entry.type === "issue") {
                const issue = entry.item as LinkedIssue;
                return (
                  <div key={issue.id} className="flex items-start gap-2 px-3 py-1.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                    <AlertCircle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                      issue.severity === "critical" ? "text-red-500" : issue.severity === "high" ? "text-amber-500" : "text-slate-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-800 truncate">{issue.title}</span>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${
                          issue.severity === "critical" ? "bg-red-50 text-red-700 border-red-200"
                            : issue.severity === "high" ? "bg-amber-50 text-amber-700 border-amber-200"
                              : issue.severity === "medium" ? "bg-sky-50 text-sky-700 border-sky-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>{issue.severity}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 leading-tight">
                        <span>{issue.status}</span>
                        {issue.owner && <><span className="text-slate-300">·</span><span className="truncate">{issue.owner}</span></>}
                        {issue.dueDate && <><span className="text-slate-300">·</span><span>Due: {issue.dueDate}</span></>}
                      </div>
                    </div>
                  </div>
                );
              }
              const action = entry.item as LinkedAction;
              return (
                <div key={action.id} className="flex items-start gap-2 px-3 py-1.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                    isOverdue(action.dueDate) ? "text-red-500" : action.priority === "urgent" ? "text-red-500"
                      : action.priority === "high" ? "text-amber-500" : "text-slate-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-800 truncate">{action.title}</span>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${
                        action.priority === "urgent" ? "bg-red-50 text-red-700 border-red-200"
                          : action.priority === "high" ? "bg-amber-50 text-amber-700 border-amber-200"
                            : action.priority === "medium" ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>{action.priority}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 leading-tight">
                      <span>{action.status}</span>
                      {action.assignedTo && <><span className="text-slate-300">·</span><span className="truncate">{action.assignedTo}</span></>}
                      {action.dueDate && (
                        <><span className="text-slate-300">·</span>
                          <span className={isOverdue(action.dueDate) ? "text-red-600 font-medium" : ""}>Due: {action.dueDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <button type="button" className="w-full py-1.5 text-[10px] font-medium text-sky-700 hover:bg-slate-50 transition-colors text-center">
                View all {allItems.length} issues & actions →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
