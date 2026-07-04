import type { StructureDocumentData } from "@/types/structureDocument";

const docStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-warning/10 text-warning border border-warning/20" },
  APPROVED: { label: "Approved", className: "bg-success/10 text-success border border-success/20" },
  ARCHIVED: { label: "Archived", className: "bg-badge-neutral text-badge-neutral-foreground border border-border/60" },
};

interface StructureDocumentMetadataProps {
  document: StructureDocumentData;
}

export function StructureDocumentMetadata({ document }: StructureDocumentMetadataProps) {
  const docCfg = docStatusConfig[document.status] || docStatusConfig.ARCHIVED;

  return (
    <div className="border border-border/50 p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="text-xs font-bold text-foreground">{document.title}</div>
          <div className="text-xs text-muted-foreground font-medium mt-0.5">
            {document.code} &middot; rev {document.revision}
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${docCfg.className}`}>
          {docCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <span className="block text-muted-foreground font-medium">Owner</span>
          <span className="block text-foreground font-semibold">{document.owner || "—"}</span>
        </div>
        <div>
          <span className="block text-muted-foreground font-medium">Effective</span>
          <span className="block text-foreground font-semibold">{document.effectiveFrom || "—"}</span>
        </div>
        <div>
          <span className="block text-muted-foreground font-medium">Review Date</span>
          <span className="block text-foreground font-semibold">{document.reviewDate || "—"}</span>
        </div>
        <div>
          <span className="block text-muted-foreground font-medium">Change Reason</span>
          <span className="block text-foreground font-semibold truncate">{document.changeReason || "—"}</span>
        </div>
        <div className="col-span-2">
          <span className="block text-muted-foreground font-medium">Controlled Copy</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border mt-0.5 ${
            document.isControlledCopy
              ? "bg-info/15 text-info border-info/25"
              : "bg-badge-neutral text-badge-neutral-foreground border-border/60"
          }`}>
            {document.isControlledCopy ? "Controlled Copy" : "Uncontrolled Copy"}
          </span>
        </div>
      </div>
    </div>
  );
}
