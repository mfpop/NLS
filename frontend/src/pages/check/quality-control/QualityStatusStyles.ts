// ── Status Styles (matching ProductionControlPage) ──

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border/40",
  OPEN: "bg-primary/15 text-primary border-primary/20",
  COMPLETED: "bg-success/15 text-success border-success/20",
  ARCHIVED: "bg-warning/15 text-warning border-warning/20",
  IN_REVIEW: "bg-warning/15 text-warning border-warning/20",
  CLOSED: "bg-success/15 text-success border-success/20",
  CANCELLED: "bg-danger/15 text-danger border-danger/20",
};

export const ISSUE_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10/80",
  IN_REVIEW: "border-warning/30 text-warning bg-warning/10/80",
  CONTAINED: "border-accent/30 text-accent-foreground bg-accent/10",
  CLOSED: "border-success/30 text-success bg-success/10/80",
  CANCELLED: "border-danger/30 text-danger bg-danger/10/60",
};

export const ACTION_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10/80",
  IN_PROGRESS: "border-warning/30 text-warning bg-warning/10/80",
  COMPLETED: "border-success/30 text-success bg-success/10/80",
  CANCELLED: "border-danger/30 text-danger bg-danger/10/60",
};

export const DMR_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10/80",
  UNDER_REVIEW: "border-warning/30 text-warning bg-warning/10/80",
  QUARANTINED: "border-accent/30 text-accent-foreground bg-accent/10",
  DISPOSITION_PENDING: "border-accent/30 text-primary bg-accent/10",
  DISPOSITION_APPROVED: "border-primary/30 text-primary bg-primary/10",
  IN_REWORK: "border-warning/30 text-warning bg-warning/10/80",
  WAITING_SUPPLIER: "border-warning/30 text-warning bg-warning/10/80",
  CLOSED: "border-success/30 text-success bg-success/10/80",
  CANCELLED: "border-danger/30 text-danger bg-danger/10/60",
};

export const RMA_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10/80",
  RECEIVED: "border-primary/30 text-primary bg-primary/10",
  UNDER_REVIEW: "border-warning/30 text-warning bg-warning/10/80",
  DISPOSITIONED: "border-accent/30 text-primary bg-accent/10",
  DISPOSITION_PENDING: "border-accent/30 text-primary bg-accent/10",
  CUSTOMER_RESPONSE_PENDING: "border-accent/30 text-accent-foreground bg-accent/10",
  QUARANTINED: "border-accent/30 text-accent-foreground bg-accent/10",
  CLOSED: "border-success/30 text-success bg-success/10/80",
  CANCELLED: "border-danger/30 text-danger bg-danger/10/60",
};

export const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "border-danger/30 text-danger bg-danger/10/80",
  HIGH: "border-warning/30 text-warning bg-warning/10/80",
  MEDIUM: "border-primary/30 text-primary bg-primary/10/80",
  LOW: "border-border text-muted-foreground bg-muted/30",
};

export const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "border-danger/30 text-danger bg-danger/10/80",
  HIGH: "border-warning/30 text-warning bg-warning/10/80",
  MEDIUM: "border-primary/30 text-primary bg-primary/10/80",
  LOW: "border-border text-muted-foreground bg-muted/30",
};

export const DMR_DISPOSITION_OPTIONS = [
  { value: "HOLD", label: "Hold / Quarantine" },
  { value: "USE_AS_IS", label: "Use As Is" },
  { value: "REWORK", label: "Rework" },
  { value: "SCRAP", label: "Scrap" },
  { value: "RETURN_TO_SUPPLIER", label: "Return to Supplier" },
  { value: "SORT_INSPECT", label: "Sort / Inspect" },
  { value: "REPLACE_MATERIAL", label: "Replace Material" },
  { value: "RECLASSIFY", label: "Reclassify" },
];

export const RMA_DISPOSITION_OPTIONS = [
  { value: "REPLACE", label: "Replace" },
  { value: "REPAIR", label: "Repair" },
  { value: "CREDIT", label: "Credit" },
  { value: "REJECT_RETURN", label: "Reject Return" },
  { value: "SCRAP", label: "Scrap" },
  { value: "RETURN_TO_CUSTOMER", label: "Return to Customer" },
];

export const DEFECT_CATEGORY_OPTIONS = [
  { value: "DIMENSIONAL", label: "Dimensional" },
  { value: "VISUAL", label: "Visual" },
  { value: "FUNCTIONAL", label: "Functional" },
  { value: "MATERIAL", label: "Material" },
  { value: "LABELING", label: "Labeling / Traceability" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "SUPPLIER_DEFECT", label: "Supplier Defect" },
  { value: "PROCESS_DEFECT", label: "Process Defect" },
  { value: "UNKNOWN", label: "Unknown / Other" },
];

export const CUSTOMER_RESPONSE_OPTIONS = [
  { value: "NOT_REQUIRED", label: "Not Required" },
  { value: "PENDING", label: "Pending" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CLOSED", label: "Closed" },
];

export const SEL_INPUT = "h-8 w-full bg-background/60 backdrop-blur-sm border border-border/50 px-2 text-sm text-foreground outline-none focus:border-primary focus:bg-background/80 focus:ring-1 focus:ring-primary/30";

export function statusLabel(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

export function scoreGrade(s: number | null) {
  if (s === null) return { label: "N/A", cls: "bg-muted text-muted-foreground border-border/40" };
  if (s >= 90) return { label: "Excellent", cls: "bg-success/15 text-success border-success/20" };
  if (s >= 75) return { label: "Pass", cls: "bg-primary/15 text-primary border-primary/20" };
  if (s >= 60) return { label: "Needs Improvement", cls: "bg-warning/15 text-warning border-warning/20" };
  return { label: "Fail", cls: "bg-danger/15 text-danger border-danger/20" };
}

export function isFailed(rt: string, v: string) {
  return (rt === "PASS_FAIL_NA" && v === "FAIL") || (rt === "YES_NO_NA" && v === "NO");
}
