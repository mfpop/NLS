import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { GembaObservation, GembaCategory, GembaObservationStatus } from "@/types/gemba";
import { GembaObservationActionMenu } from "./GembaObservationActionMenu";

interface Props {
  observation: GembaObservation;
  onSelect: (obs: GembaObservation) => void;
  onAssign: (obs: GembaObservation) => void;
  onCreateIssue: (obs: GembaObservation) => void;
  onCreateAction: (obs: GembaObservation) => void;
  onResolve: (obs: GembaObservation) => void;
  onVerify: (obs: GembaObservation) => void;
  onClose: (obs: GembaObservation) => void;
  onReopen: (obs: GembaObservation) => void;
}

const SEVERITY_STYLES: Record<string, { icon: typeof AlertCircle; color: string }> = {
  CRITICAL: { icon: AlertCircle, color: "text-danger" },
  HIGH: { icon: AlertTriangle, color: "text-warning" },
  MEDIUM: { icon: Info, color: "text-warning" },
  LOW: { icon: Info, color: "text-accent-foreground" },
  INFO: { icon: Info, color: "text-muted-foreground" },
};

const CATEGORY_STYLES: Record<string, string> = {
  SAFETY: "text-danger bg-danger/10 border-danger/20",
  QUALITY: "text-warning bg-warning/10 border-warning/20",
  PRODUCTIVITY: "text-success bg-success/10 border-success/20",
  FIVE_S: "text-accent-foreground bg-accent/10 border-accent/20",
  MAINTENANCE: "text-yellow-700 bg-yellow-50 border-warning/20",
  MATERIAL: "text-accent-foreground bg-purple-50 border-accent/20",
  MORALE: "text-violet-700 bg-violet-50 border-violet-200",
  OTHER: "text-muted-foreground bg-muted border-border",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "text-danger bg-danger/10 border-danger/20",
  IN_REVIEW: "text-warning bg-warning/10 border-warning/20",
  ACTION_REQUIRED: "text-warning bg-warning/10 border-warning/20",
  CONVERTED_TO_ACTION: "text-accent-foreground bg-accent/10 border-accent/20",
  CONVERTED_TO_ISSUE: "text-primary bg-primary/10 border-primary/20",
  RESOLVED: "text-success bg-success/10 border-success/20",
  VERIFIED: "text-success bg-success/10 border-success/20",
  REOPENED: "text-warning bg-warning/10 border-warning/20",
  CLOSED: "text-muted-foreground bg-muted border-border",
  CANCELLED: "text-muted-foreground/60 bg-muted border-border",
};

function categoryLabel(cat: GembaCategory): string {
  return cat === "FIVE_S" ? "5S" : cat;
}

function statusLabel(status: GembaObservationStatus): string {
  const map: Record<string, string> = {
    OPEN: "open",
    IN_REVIEW: "review",
    ACTION_REQUIRED: "action needed",
    CONVERTED_TO_ACTION: "→ action",
    CONVERTED_TO_ISSUE: "→ issue",
    RESOLVED: "resolved",
    VERIFIED: "verified",
    CLOSED: "closed",
    REOPENED: "reopened",
    CANCELLED: "cancelled",
  };
  return map[status] ?? status.toLowerCase();
}

export function GembaObservationRow({
  observation: obs,
  onSelect,
  onAssign,
  onCreateIssue,
  onCreateAction,
  onResolve,
  onVerify,
  onClose,
  onReopen,
}: Props) {
  const SevIcon = SEVERITY_STYLES[obs.severity]?.icon ?? Info;
  const sevColor = SEVERITY_STYLES[obs.severity]?.color ?? "text-muted-foreground";
  const catClass = CATEGORY_STYLES[obs.category] ?? CATEGORY_STYLES.OTHER;
  const statusClass = STATUS_STYLES[obs.status] ?? STATUS_STYLES.CLOSED;

  return (
    <div
      className="grid grid-cols-[28px_1fr_auto_24px] gap-2 px-3 py-2.5 hover:bg-background transition-colors cursor-pointer border-b border-border/50 last:border-b-0"
      onClick={() => onSelect(obs)}
    >
      {/* Severity icon */}
      <div className={`shrink-0 mt-1 ${sevColor}`}>
        <SevIcon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{obs.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 leading-snug mt-0.5">{obs.description || obs.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
          {/* Structured location: primary label + compact breadcrumb */}
          <span className="font-medium text-muted-foreground truncate max-w-[200px]" title={obs.locationPath || obs.area}>
            {obs.locationLabel || obs.area}
          </span>
          {obs.locationPath && obs.locationPath !== obs.locationLabel && (
            <span className="text-[10px] text-muted-foreground/60 truncate max-w-[180px]" title={obs.locationPath}>
              {obs.locationPath}
            </span>
          )}
          <span className="text-muted-foreground/30">·</span>
          <span className="font-medium text-muted-foreground">{obs.createdByName ?? "—"}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="tabular-nums">{new Date(obs.createdAt).toLocaleDateString()}</span>
          {obs.linkedResourceText && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="truncate max-w-[140px]">{obs.linkedResourceText}</span>
            </>
          )}
          {obs.ownerName && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-muted-foreground">Owner: {obs.ownerName}</span>
            </>
          )}
          {obs.dueDate && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-warning">Due: {obs.dueDate}</span>
            </>
          )}
          {obs.createdIssueId && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-primary font-medium">Issue #{obs.createdIssueId}</span>
            </>
          )}
          {obs.createdActionId && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-accent-foreground font-medium">Action #{obs.createdActionId}</span>
            </>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-col items-end gap-1 shrink-0 pt-1">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${catClass}`}>
          {categoryLabel(obs.category)}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${statusClass}`}>
          {statusLabel(obs.status)}
        </span>
      </div>

      {/* Action menu */}
      <GembaObservationActionMenu
        observation={obs}
        onViewDetails={onSelect}
        onAssign={onAssign}
        onCreateIssue={onCreateIssue}
        onCreateAction={onCreateAction}
        onResolve={onResolve}
        onVerify={onVerify}
        onClose={onClose}
        onReopen={onReopen}
      />
    </div>
  );
}
