// ── Status Styles (matching ProductionControlPage) ──

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border/40",
  OPEN: "bg-primary/15 text-primary border-primary/20 dark:bg-blue-950/30 dark:text-blue-300",
  COMPLETED: "bg-success/15 text-success border-success/20 dark:bg-green-900/30 dark:text-green-300",
  ARCHIVED: "bg-warning/15 text-warning border-warning/20 dark:bg-amber-950/30 dark:text-amber-300",
  IN_REVIEW: "bg-warning/15 text-warning border-warning/20 dark:bg-amber-950/30 dark:text-amber-300",
  CLOSED: "bg-success/15 text-success border-success/20 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-danger/15 text-danger border-danger/20 dark:bg-red-950/30 dark:text-red-300",
};

export const ISSUE_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  IN_REVIEW: "border-warning/30 text-warning bg-warning/10/80 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30",
  CONTAINED: "border-purple-300 text-accent-foreground bg-purple-50/80 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/30",
  CLOSED: "border-green-300 text-success bg-success/10/80 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30",
  CANCELLED: "border-danger/30 text-danger bg-danger/10/60 dark:border-red-800 dark:text-danger/80 dark:bg-red-950/20",
};

export const ACTION_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  IN_PROGRESS: "border-warning/30 text-warning bg-warning/10/80 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30",
  COMPLETED: "border-green-300 text-success bg-success/10/80 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30",
  CANCELLED: "border-danger/30 text-danger bg-danger/10/60 dark:border-red-800 dark:text-danger/80 dark:bg-red-950/20",
};

export const DMR_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  UNDER_REVIEW: "border-warning/30 text-warning bg-warning/10/80 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30",
  QUARANTINED: "border-purple-300 text-accent-foreground bg-purple-50/80 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/30",
  DISPOSITION_PENDING: "border-indigo-300 text-primary bg-indigo-50/80 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/30",
  DISPOSITION_APPROVED: "border-teal-300 text-teal-700 bg-teal-50/80 dark:border-teal-800 dark:text-teal-300 dark:bg-teal-950/30",
  IN_REWORK: "border-orange-300 text-warning bg-warning/10/80 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950/30",
  WAITING_SUPPLIER: "border-yellow-300 text-yellow-700 bg-yellow-50/80 dark:border-yellow-800 dark:text-yellow-300 dark:bg-yellow-950/30",
  CLOSED: "border-green-300 text-success bg-success/10/80 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30",
  CANCELLED: "border-danger/30 text-danger bg-danger/10/60 dark:border-red-800 dark:text-danger/80 dark:bg-red-950/20",
};

export const RMA_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  RECEIVED: "border-teal-300 text-teal-700 bg-teal-50/80 dark:border-teal-800 dark:text-teal-300 dark:bg-teal-950/30",
  UNDER_REVIEW: "border-warning/30 text-warning bg-warning/10/80 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30",
  DISPOSITIONED: "border-indigo-300 text-primary bg-indigo-50/80 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/30",
  DISPOSITION_PENDING: "border-indigo-300 text-primary bg-indigo-50/80 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/30",
  CUSTOMER_RESPONSE_PENDING: "border-purple-300 text-accent-foreground bg-purple-50/80 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/30",
  QUARANTINED: "border-purple-300 text-accent-foreground bg-purple-50/80 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/30",
  CLOSED: "border-green-300 text-success bg-success/10/80 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30",
  CANCELLED: "border-danger/30 text-danger bg-danger/10/60 dark:border-red-800 dark:text-danger/80 dark:bg-red-950/20",
};

export const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "border-danger/30 text-danger bg-danger/10/80 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30",
  HIGH: "border-orange-300 text-warning bg-warning/10/80 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950/30",
  MEDIUM: "border-primary/30 text-primary bg-primary/10/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  LOW: "border-border text-gray-600 bg-gray-50/80 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30",
};

export const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "border-danger/30 text-danger bg-danger/10/80 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30",
  HIGH: "border-orange-300 text-warning bg-warning/10/80 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950/30",
  MEDIUM: "border-primary/30 text-primary bg-primary/10/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  LOW: "border-border text-gray-600 bg-gray-50/80 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30",
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

export const SEL_INPUT = "h-8 w-full bg-background/60 dark:bg-slate-800/60 backdrop-blur-sm border border-border/50 dark:border-slate-600/50 px-2 text-sm text-foreground outline-none focus:border-primary focus:bg-background/80 dark:focus:bg-slate-800/80 focus:ring-1 focus:ring-primary/30";

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
