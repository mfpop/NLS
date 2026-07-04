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
    <div className="flex flex-col h-full bg-muted">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Issues & Actions</h3>
          {hasOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-medium text-danger border border-danger/20">
              <span className="h-1.5 w-1.5 rounded-full bg-danger/100" />
              Overdue
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">{allItems.length}</span>
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

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {allItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No open issues or actions</p>
          </div>
        ) : (
          <>
            {visibleItems.map((entry) => {
              if (entry.type === "issue") {
                const issue = entry.item;
                const sevColor = issue.severity === "critical" ? "border-danger/20 bg-danger/10 text-danger"
                  : issue.severity === "high" ? "border-warning/20 bg-warning/10 text-warning"
                    : issue.severity === "medium" ? "border-accent/20 bg-accent/10 text-accent-foreground"
                      : "border-border bg-muted text-muted-foreground";
                const dotColor = issue.severity === "critical" ? "text-danger"
                  : issue.severity === "high" ? "text-warning"
                    : issue.severity === "medium" ? "text-accent-foreground" : "text-muted-foreground/60";
                return (
                  <div key={issue.id} className="group flex items-start gap-2 px-3 py-1.5 border-b border-border/50 last:border-b-0 hover:bg-background transition-colors">
                    <AlertCircle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-medium text-foreground truncate leading-tight">{issue.title}</span>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border leading-tight ${sevColor}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{issue.status === "open" ? "Open" : issue.status === "in_progress" ? "In Progress" : "Overdue"}</span>
                        {issue.owner && <><span className="text-muted-foreground/30">·</span><User className="h-2.5 w-2.5" /><span className="truncate max-w-[100px]">{issue.owner}</span></>}
                        {issue.dueDate && <><span className="text-muted-foreground/30">·</span><Calendar className="h-2.5 w-2.5" /><span className={isOverdue(issue.dueDate) ? "text-danger font-medium" : ""}>{issue.dueDate}</span></>}
                      </div>
                      {/* Quick actions */}
                      <div className="hidden group-hover:flex items-center gap-1 mt-1">
                        <button type="button" className="text-[9px] text-accent-foreground hover:bg-accent/10 rounded px-1.5 py-0.5 font-medium transition-colors">Assign</button>
                        <button type="button" className="text-[9px] text-warning hover:bg-warning/10 rounded px-1.5 py-0.5 font-medium transition-colors">Escalate</button>
                        <button type="button" className="text-[9px] text-muted-foreground hover:bg-muted rounded px-1.5 py-0.5 font-medium transition-colors">Snooze</button>
                      </div>
                    </div>
                  </div>
                );
              }
              const action = entry.item;
              const overdue = isOverdue(action.dueDate);
              const priColor = overdue || action.priority === "urgent" ? "border-danger/20 bg-danger/10 text-danger"
                : action.priority === "high" ? "border-warning/20 bg-warning/10 text-warning"
                  : action.priority === "medium" ? "border-accent/20 bg-accent/10 text-accent-foreground"
                    : "border-border bg-muted text-muted-foreground";
              const dotColor = overdue || action.priority === "urgent" ? "text-danger"
                : action.priority === "high" ? "text-warning"
                  : action.priority === "medium" ? "text-accent-foreground" : "text-muted-foreground/60";
              return (
                <div key={action.id} className="group flex items-start gap-2 px-3 py-1.5 border-b border-border/50 last:border-b-0 hover:bg-background transition-colors">
                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-medium text-foreground truncate leading-tight">{action.title}</span>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border leading-tight ${priColor}`}>
                        {overdue ? "OVERDUE" : action.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{action.status === "open" ? "Open" : action.status === "in_progress" ? "In Progress" : "Completed"}</span>
                      {action.assignedTo && <><span className="text-muted-foreground/30">·</span><User className="h-2.5 w-2.5" /><span className="truncate max-w-[100px]">{action.assignedTo}</span></>}
                      {action.dueDate && <><span className="text-muted-foreground/30">·</span><Calendar className="h-2.5 w-2.5" /><span className={overdue ? "text-danger font-medium" : ""}>{action.dueDate}</span></>}
                    </div>
                    {/* Quick actions */}
                    <div className="hidden group-hover:flex items-center gap-1 mt-1">
                      <button type="button" className="text-[9px] text-accent-foreground hover:bg-accent/10 rounded px-1.5 py-0.5 font-medium transition-colors">Assign</button>
                      <button type="button" className="text-[9px] text-warning hover:bg-warning/10 rounded px-1.5 py-0.5 font-medium transition-colors">Escalate</button>
                      <button type="button" className="text-[9px] text-muted-foreground hover:bg-muted rounded px-1.5 py-0.5 font-medium transition-colors">Snooze</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore && !showAll && (
              <button type="button" onClick={() => setShowAll(true)}
                className="w-full py-1.5 text-[10px] font-medium text-accent-foreground hover:bg-accent/10 transition-colors text-center">
                View all {allItems.length} issues & actions →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
