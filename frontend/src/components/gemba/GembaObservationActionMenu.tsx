import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Eye, UserPlus, Bug, Target, CheckCircle, ShieldCheck, XCircle, RotateCcw } from "lucide-react";
import type { GembaObservation, GembaObservationStatus } from "@/types/gemba";

interface Props {
  observation: GembaObservation;
  onViewDetails: (obs: GembaObservation) => void;
  onAssign: (obs: GembaObservation) => void;
  onCreateIssue: (obs: GembaObservation) => void;
  onCreateAction: (obs: GembaObservation) => void;
  onResolve: (obs: GembaObservation) => void;
  onVerify: (obs: GembaObservation) => void;
  onClose: (obs: GembaObservation) => void;
  onReopen: (obs: GembaObservation) => void;
}

const ACTIONABLE_STATUSES: GembaObservationStatus[] = [
  "OPEN", "IN_REVIEW", "ACTION_REQUIRED",
];

const CLOSABLE_STATUSES: GembaObservationStatus[] = [
  "VERIFIED",
];

const REOPENABLE_STATUSES: GembaObservationStatus[] = [
  "RESOLVED", "VERIFIED", "CLOSED",
];

function isStatus(status: GembaObservationStatus, list: GembaObservationStatus[]): boolean {
  return list.includes(status);
}

export function GembaObservationActionMenu({
  observation,
  onViewDetails,
  onAssign,
  onCreateIssue,
  onCreateAction,
  onResolve,
  onVerify,
  onClose,
  onReopen,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const handle = (fn: (obs: GembaObservation) => void) => {
    fn(observation);
    close();
  };

  const status = observation.status;

  const menuItems: Array<{
    label: string;
    icon: typeof UserPlus;
    visible: boolean;
    action: (obs: GembaObservation) => void;
  }> = [
    { label: "View details", icon: Eye, visible: true, action: onViewDetails },
    { label: "Assign", icon: UserPlus, visible: isStatus(status, ACTIONABLE_STATUSES), action: onAssign },
    { label: "Create Issue", icon: Bug, visible: isStatus(status, ACTIONABLE_STATUSES), action: onCreateIssue },
    { label: "Create Action", icon: Target, visible: isStatus(status, ACTIONABLE_STATUSES), action: onCreateAction },
    { label: "Verify", icon: ShieldCheck, visible: status === "RESOLVED", action: onVerify },
    { label: "Resolve", icon: CheckCircle, visible: isStatus(status, ACTIONABLE_STATUSES) || status === "CONVERTED_TO_ISSUE" || status === "CONVERTED_TO_ACTION", action: onResolve },
    { label: "Close", icon: XCircle, visible: isStatus(status, CLOSABLE_STATUSES), action: onClose },
    { label: "Reopen", icon: RotateCcw, visible: isStatus(status, REOPENABLE_STATUSES), action: onReopen },
  ];

  const visibleItems = menuItems.filter((item) => item.visible);

  if (visibleItems.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="flex h-6 w-6 items-center justify-center rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        title="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-0.5 w-44 rounded-[4px] border border-slate-200 bg-white py-1 shadow-md ring-1 ring-black/5">
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={(e) => { e.stopPropagation(); handle(item.action); }}
              className="flex h-8 w-full items-center gap-2.5 px-3 text-xs text-slate-700 hover:bg-slate-100 text-left"
            >
              <item.icon className="h-4 w-4 text-slate-500 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
