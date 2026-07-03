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
  CRITICAL: { icon: AlertCircle, color: "text-red-600", label: "Critical" },
  HIGH: { icon: AlertTriangle, color: "text-amber-600", label: "High" },
  MEDIUM: { icon: Info, color: "text-orange-600", label: "Medium" },
  LOW: { icon: Info, color: "text-sky-600", label: "Low" },
  INFO: { icon: Info, color: "text-slate-600", label: "Info" },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  URGENT: { color: "text-red-700", label: "Urgent" },
  HIGH: { color: "text-amber-700", label: "High" },
  MEDIUM: { color: "text-slate-700", label: "Medium" },
  LOW: { color: "text-slate-500", label: "Low" },
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
      <div className="absolute right-0 top-0 bottom-0 w-[400px] z-50 flex flex-col bg-white border-l border-slate-200 shadow-lg overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900 truncate">Observation Detail</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Title + status */}
          <div className="px-4 pt-3 pb-2 border-b border-slate-100">
            <div className="flex items-start gap-2.5">
              <SevIcon className={`h-5 w-5 mt-0.5 shrink-0 ${sevCfg.color}`} />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-slate-900 leading-snug">{obs.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{obs.locationLabel || obs.area}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                obs.status === "OPEN" ? "text-red-700 bg-red-50 border-red-200" :
                obs.status === "RESOLVED" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                obs.status === "VERIFIED" ? "text-green-700 bg-green-50 border-green-200" :
                obs.status === "CLOSED" ? "text-slate-600 bg-slate-100 border-slate-200" :
                "text-amber-700 bg-amber-50 border-amber-200"
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
            <div className="px-4 py-3 border-b border-slate-100">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Description</h4>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{obs.description}</p>
            </div>
          )}

          {/* Key details */}
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Details</h4>
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
              <div className="mt-2 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Location</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {obs.locationPath}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span className="text-slate-500">Type:</span>
                  <span className="font-medium text-slate-700">
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
            <div className="px-4 py-3 border-b border-slate-100">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Linked Items</h4>
              <div className="flex flex-col gap-1.5">
                {obs.createdIssueId && (
                  <div className="flex items-center gap-2 text-xs">
                    <Bug className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-blue-700 font-medium">Issue #{obs.createdIssueId}</span>
                  </div>
                )}
                {obs.createdActionId && (
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="h-3.5 w-3.5 text-sky-600" />
                    <span className="text-sky-700 font-medium">Action #{obs.createdActionId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolution note */}
          {obs.resolutionNote && (
            <div className="px-4 py-3 border-b border-slate-100">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Resolution Note</h4>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{obs.resolutionNote}</p>
              {obs.resolvedAt && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Resolved: {new Date(obs.resolvedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Verification note */}
          {obs.verificationNote && (
            <div className="px-4 py-3 border-b border-slate-100">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Verification Note</h4>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{obs.verificationNote}</p>
              {obs.verifiedAt && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Verified: {new Date(obs.verifiedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Activity hint */}
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Activity</h4>
            <div className="space-y-2">
              <ActivityItem
                icon={<User className="h-3 w-3" />}
                text={`Created by ${obs.createdByName ?? "—"}`}
                time={obs.createdAt}
              />
              {obs.resolvedAt && (
                <ActivityItem
                  icon={<CheckCircle className="h-3 w-3 text-emerald-600" />}
                  text="Status changed to Resolved"
                  time={obs.resolvedAt}
                />
              )}
              {obs.verifiedAt && (
                <ActivityItem
                  icon={<ShieldCheck className="h-3 w-3 text-green-600" />}
                  text="Status changed to Verified"
                  time={obs.verifiedAt}
                />
              )}
              {obs.closedAt && (
                <ActivityItem
                  icon={<X className="h-3 w-3 text-slate-500" />}
                  text="Status changed to Closed"
                  time={obs.closedAt}
                />
              )}
              {(obs.status === "OPEN" || obs.status === "IN_REVIEW" || obs.status === "ACTION_REQUIRED") && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>Awaiting action</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
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
      <span className="text-slate-500">{label}:</span>{" "}
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function ActivityItem({ icon, text, time }: { icon: React.ReactNode; text: string; time: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{text}</span>
      <span className="text-slate-400 tabular-nums">{new Date(time).toLocaleString()}</span>
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
    neutral: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
    edit: "text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100",
    danger: "text-red-700 hover:bg-red-50 active:bg-red-100",
    warning: "text-amber-700 hover:bg-amber-50 active:bg-amber-100",
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
