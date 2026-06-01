import { FilePlus, Pencil, History, CheckCircle2, Archive } from "lucide-react";

interface StructureDocumentActionsProps {
  hasDocument: boolean;
  isMissing: boolean;
  isApproved: boolean;
  isArchived: boolean;
  onAction: (action: string) => void;
}

function ActionButton({
  icon: Icon,
  label,
  disabled,
  hidden,
  onClick,
}: {
  icon: typeof FilePlus;
  label: string;
  disabled?: boolean;
  hidden?: boolean;
  onClick: () => void;
}) {
  if (hidden) return null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] font-medium text-muted-foreground transition-colors ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-muted dark:hover:bg-muted"
      }`}
    >
      <Icon className="h-3 w-3 stroke-current" />
      {label}
    </button>
  );
}

export function StructureDocumentActions({ hasDocument, isMissing, isApproved, isArchived, onAction }: StructureDocumentActionsProps) {
  return (
    <div className="no-print shrink-0 border-t border-border bg-card h-10 px-3 flex items-center gap-1 flex-wrap">
      <ActionButton icon={FilePlus} label="Create" disabled={!isMissing} hidden={!isMissing} onClick={() => onAction("create")} />
      <ActionButton icon={Pencil} label="Edit" disabled={!hasDocument || isArchived} hidden={!hasDocument} onClick={() => onAction("edit")} />
      <ActionButton icon={CheckCircle2} label="Approve" disabled={!hasDocument || isApproved || isArchived} hidden={!hasDocument} onClick={() => onAction("approve")} />
      <ActionButton icon={Archive} label="Archive" disabled={!hasDocument || isArchived} hidden={!hasDocument || isArchived} onClick={() => onAction("archive")} />
      <ActionButton icon={History} label="History" disabled={!hasDocument} hidden={!hasDocument} onClick={() => onAction("history")} />
    </div>
  );
}
