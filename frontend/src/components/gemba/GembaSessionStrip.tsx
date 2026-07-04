import { Clock } from "lucide-react";
import type { GembaWalkSession } from "@/types/gemba";

interface Props {
  session: GembaWalkSession | null;
  observationCount: number;
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  PLANNED: { label: "Planned", classes: "bg-sky-100 text-accent-foreground border-accent/20" },
  IN_PROGRESS: { label: "In Progress", classes: "bg-success/15 text-success border-success/20" },
  COMPLETED: { label: "Completed", classes: "bg-muted text-muted-foreground border-border" },
  CANCELLED: { label: "Cancelled", classes: "bg-danger/10 text-danger border-danger/20" },
};

export function GembaSessionStrip({ session, observationCount, loading }: Props) {
  if (loading) {
    return (
      <div className="h-8 shrink-0 flex items-center gap-2 px-3 bg-accent/10/50 border-b border-accent/20 text-xs text-muted-foreground">
        <div className="h-3 w-3 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-8 shrink-0 flex items-center gap-2 px-3 bg-muted border-b border-border text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
        No active Gemba Walk session
      </div>
    );
  }

  const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.CANCELLED;

  return (
    <div className="h-8 shrink-0 flex items-center gap-3 px-3 bg-accent/10/50 border-b border-accent/20 text-xs text-muted-foreground overflow-hidden">
      {/* Status badge */}
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border shrink-0 ${cfg.classes}`}>
        {cfg.label}
      </span>

      <span className="text-muted-foreground/30 shrink-0">|</span>

      {/* Shift */}
      <span className="shrink-0 font-medium text-muted-foreground">Shift: {session.shiftName || "DAY"}</span>

      {session.walkDate && (
        <>
          <span className="text-muted-foreground/30 shrink-0">|</span>
          <span className="shrink-0">{session.walkDate}</span>
        </>
      )}

      {session.startedAt && (
        <>
          <span className="text-muted-foreground/30 shrink-0">|</span>
          <span className="shrink-0">
            Started: {new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </>
      )}

      {session.observer && (
        <>
          <span className="text-muted-foreground/30 shrink-0">|</span>
          <span className="shrink-0">{session.observer}</span>
        </>
      )}

      {/* Observation count — right-aligned */}
      <span className="ml-auto text-muted-foreground/60 shrink-0">
        {observationCount} observation{observationCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
