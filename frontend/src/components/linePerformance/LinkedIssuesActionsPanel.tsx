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
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Issues & Actions</h3>
          {hasOverdueAction && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-medium text-danger border border-danger/20">
              <span className="h-1.5 w-1.5 rounded-full bg-danger/100" />
              Overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onNewIssue}
            className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium text-accent-foreground hover:bg-accent/10 transition-colors">
            <Plus className="h-3 w-3" />Issue
          </button>
          <button type="button" onClick={onNewAction}
            className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium text-accent-foreground hover:bg-accent/10 transition-colors">
            <Plus className="h-3 w-3" />Action
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {allItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No open issues or actions</p>
          </div>
        ) : (
          <>
            {visibleItems.map((entry) => {
              if (entry.type === "issue") {
                const issue = entry.item as LinkedIssue;
                return (
                  <div key={issue.id} className="flex items-start gap-2 px-3 py-1.5 border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                    <AlertCircle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                      issue.severity === "critical" ? "text-danger" : issue.severity === "high" ? "text-warning" : "text-muted-foreground/60"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground truncate">{issue.title}</span>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${
                          issue.severity === "critical" ? "bg-danger/10 text-danger border-danger/20"
                            : issue.severity === "high" ? "bg-warning/10 text-warning border-warning/20"
                              : issue.severity === "medium" ? "bg-accent/10 text-accent-foreground border-accent/20"
                                : "bg-muted text-muted-foreground border-border"
                        }`}>{issue.severity}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground leading-tight">
                        <span>{issue.status}</span>
                        {issue.owner && <><span className="text-muted-foreground/30">·</span><span className="truncate">{issue.owner}</span></>}
                        {issue.dueDate && <><span className="text-muted-foreground/30">·</span><span>Due: {issue.dueDate}</span></>}
                      </div>
                    </div>
                  </div>
                );
              }
              const action = entry.item as LinkedAction;
              return (
                <div key={action.id} className="flex items-start gap-2 px-3 py-1.5 border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                    isOverdue(action.dueDate) ? "text-danger" : action.priority === "urgent" ? "text-danger"
                      : action.priority === "high" ? "text-warning" : "text-muted-foreground/60"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground truncate">{action.title}</span>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${
                        action.priority === "urgent" ? "bg-danger/10 text-danger border-danger/20"
                          : action.priority === "high" ? "bg-warning/10 text-warning border-warning/20"
                            : action.priority === "medium" ? "bg-accent/10 text-accent-foreground border-accent/20"
                              : "bg-muted text-muted-foreground border-border"
                      }`}>{action.priority}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground leading-tight">
                      <span>{action.status}</span>
                      {action.assignedTo && <><span className="text-muted-foreground/30">·</span><span className="truncate">{action.assignedTo}</span></>}
                      {action.dueDate && (
                        <><span className="text-muted-foreground/30">·</span>
                          <span className={isOverdue(action.dueDate) ? "text-danger font-medium" : ""}>Due: {action.dueDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <button type="button" className="w-full py-1.5 text-[10px] font-medium text-accent-foreground hover:bg-muted transition-colors text-center">
                View all {allItems.length} issues & actions →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
