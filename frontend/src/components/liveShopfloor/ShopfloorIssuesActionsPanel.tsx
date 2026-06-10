import { AlertCircle, ArrowRight, Plus } from "lucide-react";
import type { LiveShopfloorLinkedIssue, LiveShopfloorLinkedAction } from "@/types/liveShopfloor";

interface Props {
  issues: LiveShopfloorLinkedIssue[];
  actions: LiveShopfloorLinkedAction[];
  onNewIssue: () => void;
  onNewAction: () => void;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function ShopfloorIssuesActionsPanel({ issues, actions, onNewIssue, onNewAction }: Props) {
  const hasOverdueActions = actions.some((a) => isOverdue(a.dueDate));

  return (
    <div className="rounded-md border border-border/50 bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Issues & Actions</h3>
          {hasOverdueActions && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">Overdue</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNewIssue}
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] font-medium text-foreground hover:bg-muted transition-colors"
            title="New Issue"
          >
            <Plus className="h-3.5 w-3.5" />Issue
          </button>
          <button
            type="button"
            onClick={onNewAction}
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] font-medium text-foreground hover:bg-muted transition-colors"
            title="New Action"
          >
            <Plus className="h-3.5 w-3.5" />Action
          </button>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto">
        {issues.length === 0 && actions.length === 0 && (
          <div className="px-4 py-6 text-center text-[10px] text-muted-foreground">No open issues or actions</div>
        )}

        {issues.slice(0, 5).map((issue) => (
          <div key={issue.id} className="flex items-start gap-3 px-4 py-2 border-b border-border/10 hover:bg-muted/30 transition-colors">
            <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${
              issue.severity === "critical" ? "text-danger" : issue.severity === "high" ? "text-warning" : "text-muted-foreground"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground truncate">{issue.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                  issue.severity === "critical" ? "bg-danger/10 text-danger border-danger/20"
                    : issue.severity === "high" ? "bg-warning/10 text-warning border-warning/20"
                      : issue.severity === "medium" ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-muted text-muted-foreground border-border/50"
                }`}>{issue.displaySeverity || issue.severity}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span>{issue.displayStatus || issue.status}</span>
                {issue.owner && <><span className="w-1 h-1 rounded-full bg-border" /><span>{issue.owner}</span></>}
                {issue.linkedResourceName && <><span className="w-1 h-1 rounded-full bg-border" /><span>{issue.linkedResourceName}</span></>}
              </div>
            </div>
          </div>
        ))}

        {actions.slice(0, 5).map((action) => (
          <div key={action.id} className="flex items-start gap-3 px-4 py-2 border-b border-border/10 hover:bg-muted/30 transition-colors">
            <ArrowRight className={`h-4 w-4 shrink-0 mt-0.5 ${
              isOverdue(action.dueDate) ? "text-danger" : action.priority === "urgent" ? "text-danger"
                : action.priority === "high" ? "text-warning" : "text-muted-foreground"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground truncate">{action.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                  action.priority === "urgent" ? "bg-danger/10 text-danger border-danger/20"
                    : action.priority === "high" ? "bg-warning/10 text-warning border-warning/20"
                      : action.priority === "medium" ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-muted text-muted-foreground border-border/50"
                }`}>{action.displayPriority || action.priority}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span>{action.displayStatus || action.status}</span>
                {action.assignedTo && <><span className="w-1 h-1 rounded-full bg-border" /><span>{action.assignedTo}</span></>}
                {action.linkedResourceName && <><span className="w-1 h-1 rounded-full bg-border" /><span>{action.linkedResourceName}</span></>}
                {action.dueDate && isOverdue(action.dueDate) && (
                  <span className="text-danger font-medium">Overdue</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
