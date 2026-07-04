export const BREAKDOWN_STATUS_STYLES: Record<string, string> = {
  REPORTED: "bg-danger/15 text-danger border-danger/20 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
  OPEN: "bg-primary/15 text-primary border-primary/20 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  ASSIGNED: "bg-primary/15 text-primary border-primary/20 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800",
  IN_PROGRESS: "bg-warning/15 text-warning border-warning/20 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  WAITING_PARTS: "bg-warning/15 text-warning border-warning/20 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
  RESOLVED: "bg-success/15 text-success border-success/20 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  CLOSED: "bg-success/15 text-success border-success/20 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

export const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-gray-500", MEDIUM: "text-primary", HIGH: "text-warning", CRITICAL: "text-danger",
};

export const SEVERITY_STYLES: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-primary",
  HIGH: "text-warning",
  CRITICAL: "text-danger",
};

export const SEVERITY_BG: Record<string, string> = {
  LOW: "bg-gray-100 dark:bg-gray-800",
  MEDIUM: "bg-primary/15 dark:bg-blue-900/30",
  HIGH: "bg-warning/15 dark:bg-orange-900/30",
  CRITICAL: "bg-danger/15 dark:bg-red-900/30",
};

export const SEVERITY_OPTIONS = [
  { value: "", label: "All Severities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "REPORTED", label: "Reported" },
  { value: "OPEN", label: "Open" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_PARTS", label: "Waiting Parts" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const WORKFLOW_STEPS = ["REPORTED", "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "RESOLVED", "CLOSED"];

export function wfLabel(s: string): string {
  const m: Record<string, string> = {
    REPORTED: "Reported", OPEN: "Open", ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts",
    RESOLVED: "Resolved", CLOSED: "Closed", CANCELLED: "Cancelled",
  };
  return m[s] || s;
}

export function severityIcon(sev: string): string {
  if (sev === "CRITICAL") return "C!";
  if (sev === "HIGH") return "H";
  if (sev === "MEDIUM") return "M";
  return "L";
}

export function statusDotColor(s: string): string {
  const m: Record<string, string> = {
    REPORTED: "bg-danger/100", OPEN: "bg-primary/100", ASSIGNED: "bg-primary",
    IN_PROGRESS: "bg-warning/100", WAITING_PARTS: "bg-warning/100",
    RESOLVED: "bg-success/100", CLOSED: "bg-success/100", CANCELLED: "bg-muted-foreground/40",
  };
  return m[s] || "bg-gray-300";
}
