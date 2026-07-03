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
  CRITICAL: { icon: AlertCircle, color: "text-red-600" },
  HIGH: { icon: AlertTriangle, color: "text-amber-600" },
  MEDIUM: { icon: Info, color: "text-orange-600" },
  LOW: { icon: Info, color: "text-sky-600" },
  INFO: { icon: Info, color: "text-slate-600" },
};

const CATEGORY_STYLES: Record<string, string> = {
  SAFETY: "text-red-700 bg-red-50 border-red-200",
  QUALITY: "text-amber-700 bg-amber-50 border-amber-200",
  PRODUCTIVITY: "text-emerald-700 bg-emerald-50 border-emerald-200",
  FIVE_S: "text-sky-700 bg-sky-50 border-sky-200",
  MAINTENANCE: "text-yellow-700 bg-yellow-50 border-yellow-200",
  MATERIAL: "text-purple-700 bg-purple-50 border-purple-200",
  MORALE: "text-violet-700 bg-violet-50 border-violet-200",
  OTHER: "text-slate-700 bg-slate-100 border-slate-200",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "text-red-700 bg-red-50 border-red-200",
  IN_REVIEW: "text-amber-700 bg-amber-50 border-amber-200",
  ACTION_REQUIRED: "text-orange-700 bg-orange-50 border-orange-200",
  CONVERTED_TO_ACTION: "text-sky-700 bg-sky-50 border-sky-200",
  CONVERTED_TO_ISSUE: "text-blue-700 bg-blue-50 border-blue-200",
  RESOLVED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  VERIFIED: "text-green-700 bg-green-50 border-green-200",
  REOPENED: "text-amber-700 bg-amber-50 border-amber-200",
  CLOSED: "text-slate-600 bg-slate-100 border-slate-200",
  CANCELLED: "text-slate-400 bg-slate-50 border-slate-200",
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
  const sevColor = SEVERITY_STYLES[obs.severity]?.color ?? "text-slate-500";
  const catClass = CATEGORY_STYLES[obs.category] ?? CATEGORY_STYLES.OTHER;
  const statusClass = STATUS_STYLES[obs.status] ?? STATUS_STYLES.CLOSED;

  return (
    <div
      className="grid grid-cols-[28px_1fr_auto_24px] gap-2 px-3 py-2.5 hover:bg-white transition-colors cursor-pointer border-b border-slate-100 last:border-b-0"
      onClick={() => onSelect(obs)}
    >
      {/* Severity icon */}
      <div className={`shrink-0 mt-1 ${sevColor}`}>
        <SevIcon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{obs.title}</p>
        <p className="text-xs text-slate-700 line-clamp-1 leading-snug mt-0.5">{obs.description || obs.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 flex-wrap">
          {/* Structured location: primary label + compact breadcrumb */}
          <span className="font-medium text-slate-600 truncate max-w-[200px]" title={obs.locationPath || obs.area}>
            {obs.locationLabel || obs.area}
          </span>
          {obs.locationPath && obs.locationPath !== obs.locationLabel && (
            <span className="text-[10px] text-slate-400 truncate max-w-[180px]" title={obs.locationPath}>
              {obs.locationPath}
            </span>
          )}
          <span className="text-slate-300">·</span>
          <span className="font-medium text-slate-600">{obs.createdByName ?? "—"}</span>
          <span className="text-slate-300">·</span>
          <span className="tabular-nums">{new Date(obs.createdAt).toLocaleDateString()}</span>
          {obs.linkedResourceText && (
            <>
              <span className="text-slate-300">·</span>
              <span className="truncate max-w-[140px]">{obs.linkedResourceText}</span>
            </>
          )}
          {obs.ownerName && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600">Owner: {obs.ownerName}</span>
            </>
          )}
          {obs.dueDate && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-amber-600">Due: {obs.dueDate}</span>
            </>
          )}
          {obs.createdIssueId && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-blue-600 font-medium">Issue #{obs.createdIssueId}</span>
            </>
          )}
          {obs.createdActionId && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-sky-600 font-medium">Action #{obs.createdActionId}</span>
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
