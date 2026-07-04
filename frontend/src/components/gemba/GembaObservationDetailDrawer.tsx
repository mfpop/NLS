import { useEffect } from "react";
import { X, User, AlertTriangle, AlertCircle, Info, Clock, Bug, Target, CheckCircle, ShieldCheck, RotateCcw, UserPlus, XCircle } from "lucide-react";
import type { GembaObservation } from "@/types/gemba";

interface Props {
  observation: GembaObservation | null;
  onClose: () => void;
  onAssign: (obs: GembaObservation) => void;
  onCreateIssue: (obs: GembaObservation) => void;
  onCreateAction: (obs: GembaObservation) => void;
  onResolve: (obs: GembaObservation) => void;
  onVerify: (obs: GembaObservation) => void;
  onCloseObs: (obs: GembaObservation) => void;
  onReopen: (obs: GembaObservation) => void;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertCircle; color: string; label: string }> = {
  CRITICAL: { icon: AlertCircle, color: "text-danger", label: "Critical" },
  HIGH: { icon: AlertTriangle, color: "text-warning", label: "High" },
  MEDIUM: { icon: Info, color: "text-warning", label: "Medium" },
  LOW: { icon: Info, color: "text-accent-foreground", label: "Low" },
  INFO: { icon: Info, color: "text-muted-foreground", label: "Info" },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  URGENT: { color: "text-danger", label: "Urgent" },
  HIGH: { color: "text-warning", label: "High" },
  MEDIUM: { color: "text-muted-foreground", label: "Medium" },
  LOW: { color: "text-muted-foreground", label: "Low" },
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_REVIEW: "In Review",
  ACTION_REQUIRED: "Action Required",
  CONVERTED_TO_ACTION: "Converted to Action",
  CONVERTED_TO_ISSUE: "Converted to Issue",
  RESOLVED: "Resolved",
  VERIFIED: "Verified",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

const ACTIONABLE_STATUSES = ["OPEN", "IN_REVIEW", "ACTION_REQUIRED"];
const VERIFIABLE_STATUSES = ["RESOLVED"];
const CLOSABLE_STATUSES = ["VERIFIED"];
const REOPENABLE_STATUSES = ["RESOLVED", "VERIFIED", "CLOSED"];

function isActive(status: string, list: string[]): boolean {
  return list.includes(status);
}

export function GembaObservationDetailDrawer({
  observation: obs,
  onClose,
  onAssign,
  onCreateIssue,
  onCreateAction,
  onResolve,
  onVerify,
  onCloseObs,
  onReopen,
}: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!obs) return null;

  const sevCfg = SEVERITY_CONFIG[obs.severity] ?? SEVERITY_CONFIG.INFO;
  const prioCfg = PRIORITY_CONFIG[obs.priority] ?? PRIORITY_CONFIG.MEDIUM;
  const SevIcon = sevCfg.icon;

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-[400px] z-50 flex flex-col bg-background border-l border-border shadow-lg overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-border bg-muted">
          <h3 className="text-sm font-semibold text-foreground truncate">Observation Detail</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Title + status */}
          <div className="px-4 pt-3 pb-2 border-b border-border/50">
            <div className="flex items-start gap-2.5">
              <SevIcon className={`h-5 w-5 mt-0.5 shrink-0 ${sevCfg.color}`} />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground leading-snug">{obs.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{obs.locationLabel || obs.area}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                obs.status === "OPEN" ? "text-danger bg-danger/10 border-danger/20" :
                obs.status === "RESOLVED" ? "text-success bg-success/10 border-success/20" :
                obs.status === "VERIFIED" ? "text-success bg-success/10 border-success/20" :
                obs.status === "CLOSED" ? "text-muted-foreground bg-muted border-border" :
                "text-warning bg-warning/10 border-warning/20"
              }`}>
                {STATUS_LABELS[obs.status] ?? obs.status}
              </span>
              {obs.priority !== "MEDIUM" && (
                <span className={`text-[10px] font-semibold uppercase ${prioCfg.color}`}>
                  {prioCfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {obs.description && (
            <div className="px-4 py-3 border-b border-border/50">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Description</h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{obs.description}</p>
            </div>
          )}

          {/* Key details */}
          <div className="px-4 py-3 border-b border-border/50">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Details</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <DetailItem label="Category" value={obs.category === "FIVE_S" ? "5S" : obs.category} />
              <DetailItem label="Severity" value={sevCfg.label} />
              <DetailItem label="Priority" value={prioCfg.label} />
              <DetailItem label="Observer" value={obs.createdByName ?? "—"} />
              <DetailItem label="Focus" value={obs.focus || "—"} />
              <DetailItem label="Date" value={new Date(obs.createdAt).toLocaleDateString()} />
              <DetailItem label="Resource" value={obs.linkedResourceText || "—"} />
              {obs.dueDate && <DetailItem label="Due Date" value={obs.dueDate} />}
              {obs.ownerName && <DetailItem label="Owner" value={obs.ownerName} />}
            </div>
            {/* Structured location path */}
            {obs.locationPath && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Location</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {obs.locationPath}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium text-muted-foreground">
                    {obs.targetType === "PRODUCTION_LINE" ? "Production Line"
                      : obs.targetType === "RESOURCE_GROUP" ? "Resource Group"
                      : obs.targetType === "RESOURCE" ? "Resource"
                      : obs.targetType === "DEPARTMENT" ? "Department"
                      : obs.targetType === "PLANT" ? "Plant"
                      : obs.targetType}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Linked items */}
          {(obs.createdIssueId || obs.createdActionId) && (
            <div className="px-4 py-3 border-b border-border/50">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Linked Items</h4>
              <div className="flex flex-col gap-1.5">
                {obs.createdIssueId && (
                  <div className="flex items-center gap-2 text-xs">
                    <Bug className="h-3.5 w-3.5 text-primary" />
                    <span className="text-primary font-medium">Issue #{obs.createdIssueId}</span>
                  </div>
                )}
                {obs.createdActionId && (
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="h-3.5 w-3.5 text-accent-foreground" />
                    <span className="text-accent-foreground font-medium">Action #{obs.createdActionId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolution note */}
          {obs.resolutionNote && (
            <div className="px-4 py-3 border-b border-border/50">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Resolution Note</h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{obs.resolutionNote}</p>
              {obs.resolvedAt && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Resolved: {new Date(obs.resolvedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Verification note */}
          {obs.verificationNote && (
            <div className="px-4 py-3 border-b border-border/50">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Verification Note</h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{obs.verificationNote}</p>
              {obs.verifiedAt && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Verified: {new Date(obs.verifiedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Activity hint */}
          <div className="px-4 py-3 border-b border-border/50">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Activity</h4>
            <div className="space-y-2">
              <ActivityItem
                icon={<User className="h-3 w-3" />}
                text={`Created by ${obs.createdByName ?? "—"}`}
                time={obs.createdAt}
              />
              {obs.resolvedAt && (
                <ActivityItem
                  icon={<CheckCircle className="h-3 w-3 text-success" />}
                  text="Status changed to Resolved"
                  time={obs.resolvedAt}
                />
              )}
              {obs.verifiedAt && (
                <ActivityItem
                  icon={<ShieldCheck className="h-3 w-3 text-success" />}
                  text="Status changed to Verified"
                  time={obs.verifiedAt}
                />
              )}
              {obs.closedAt && (
                <ActivityItem
                  icon={<X className="h-3 w-3 text-muted-foreground" />}
                  text="Status changed to Closed"
                  time={obs.closedAt}
                />
              )}
              {(obs.status === "OPEN" || obs.status === "IN_REVIEW" || obs.status === "ACTION_REQUIRED") && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                  <Clock className="h-3 w-3" />
                  <span>Awaiting action</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-3 border-t border-border bg-muted">
          {isActive(obs.status, ACTIONABLE_STATUSES) && (
            <>
              <ActionButton icon={<UserPlus />} label="Assign" onClick={() => onAssign(obs)} variant="neutral" />
              <ActionButton icon={<Bug />} label="Issue" onClick={() => onCreateIssue(obs)} variant="neutral" />
              <ActionButton icon={<Target />} label="Action" onClick={() => onCreateAction(obs)} variant="neutral" />
              <ActionButton icon={<CheckCircle />} label="Resolve" onClick={() => onResolve(obs)} variant="edit" />
            </>
          )}
          {(obs.status === "CONVERTED_TO_ISSUE" || obs.status === "CONVERTED_TO_ACTION") && (
            <ActionButton icon={<CheckCircle />} label="Resolve" onClick={() => onResolve(obs)} variant="edit" />
          )}
          {isActive(obs.status, VERIFIABLE_STATUSES) && (
            <ActionButton icon={<ShieldCheck />} label="Verify" onClick={() => onVerify(obs)} variant="edit" />
          )}
          {isActive(obs.status, CLOSABLE_STATUSES) && (
            <ActionButton icon={<XCircle />} label="Close" onClick={() => onCloseObs(obs)} variant="danger" />
          )}
          {isActive(obs.status, REOPENABLE_STATUSES) && (
            <ActionButton icon={<RotateCcw />} label="Reopen" onClick={() => onReopen(obs)} variant="warning" />
          )}
        </div>
      </div>
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function ActivityItem({ icon, text, time }: { icon: React.ReactNode; text: string; time: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{text}</span>
      <span className="text-muted-foreground/60 tabular-nums">{new Date(time).toLocaleString()}</span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant: "neutral" | "edit" | "danger" | "warning";
}) {
  const variantClasses = {
    neutral: "text-muted-foreground hover:bg-muted active:bg-muted/80",
    edit: "text-success hover:bg-success/10 active:bg-success/15",
    danger: "text-danger hover:bg-danger/10 active:bg-danger/15",
    warning: "text-warning hover:bg-warning/10 active:bg-warning/15",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] font-medium transition-colors ${variantClasses[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}
