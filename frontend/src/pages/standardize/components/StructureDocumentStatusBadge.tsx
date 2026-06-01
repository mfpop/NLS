const statusConfig: Record<string, { label: string; className: string }> = {
  LOCAL: { label: "Local", className: "bg-success/10 text-success border border-success/20" },
  INHERITED: { label: "Inherited", className: "bg-info/15 text-info border border-info/25" },
  MISSING: { label: "Missing", className: "bg-badge-neutral text-badge-neutral-foreground border border-border/60" },
  DRAFT: { label: "Draft", className: "bg-warning/10 text-warning border border-warning/20" },
  APPROVED: { label: "Approved", className: "bg-success/10 text-success border border-success/20" },
  ARCHIVED: { label: "Archived", className: "bg-badge-neutral text-badge-neutral-foreground border border-border/60" },
};

export function StructureDocumentStatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
