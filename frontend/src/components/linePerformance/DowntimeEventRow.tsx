import { Clock } from "lucide-react";
import type { DowntimeEvent } from "@/types/linePerformance";

interface Props {
  event: DowntimeEvent;
  onOpenDetail?: (id: string) => void;
  onCreateIssue?: (id: string) => void;
  onCreateAction?: (id: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-danger/10 text-danger border border-danger/20",
  resolved: "bg-success/10 text-success border border-success/20",
  closed: "bg-muted text-muted-foreground border border-border/50",
};

export function DowntimeEventRow({ event, onOpenDetail, onCreateIssue, onCreateAction }: Props) {
  const statusStyle = STATUS_STYLES[event.status] || STATUS_STYLES.closed;

  return (
    <div className="flex items-start gap-3 px-3 py-2 border-b border-border/10 hover:bg-muted/30 transition-colors">
      <div className="shrink-0 mt-0.5">
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground truncate">{event.reason}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle}`}>
            {event.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <span>{event.startTime}</span>
          {event.endTime && (
            <>
              <span>→</span>
              <span>{event.endTime}</span>
            </>
          )}
          <span className="font-medium text-foreground">{event.durationMinutes}m</span>
          {event.resourceName && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{event.resourceName}</span>
            </>
          )}
        </div>
        {event.description && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{event.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {onOpenDetail && (
            <button type="button" onClick={() => onOpenDetail(event.id)} className="text-[10px] text-accent hover:underline">Detail</button>
          )}
          {onCreateIssue && !event.linkedIssueId && (
            <button type="button" onClick={() => onCreateIssue(event.id)} className="text-[10px] text-accent hover:underline">Create Issue</button>
          )}
          {onCreateAction && !event.linkedActionId && (
            <button type="button" onClick={() => onCreateAction(event.id)} className="text-[10px] text-accent hover:underline">Create Action</button>
          )}
          {event.linkedIssueId && <span className="text-[10px] text-muted-foreground">Issue linked</span>}
          {event.linkedActionId && <span className="text-[10px] text-muted-foreground">Action linked</span>}
        </div>
      </div>
    </div>
  );
}
