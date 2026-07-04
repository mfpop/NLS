/* ── Shared Safety Form Tokens ── */

export const INPUT = "h-10 w-full bg-background border border-border px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary";
export const TEXTAREA = "w-full bg-background border border-border px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-none";
export const ROUNDED_TEXTAREA = "w-full bg-background border border-border px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-none rounded-md";
export const SELECT = "h-10 w-full bg-background border border-border px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary";
export const CHECKBOX = "h-4 w-4 rounded-[2px] border-border text-primary focus-visible:ring-1 focus-visible:ring-primary";

export const LABEL = "block text-xs font-medium text-muted-foreground mb-1";
export const HELP = "text-xs text-muted-foreground";

/** Compact required indicator: "• Required" */
export function RequiredBadge() {
  return <span className="ml-1 text-[10px] font-medium text-destructive">• Required</span>;
}

/** Section divider: icon + title + optional subtitle */
export function SectionHeading({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-2 pb-2 border-b border-border">
      {icon && <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>}
      <div className="min-w-0">
        <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

/** Form section wrapper with bottom divider */
export function FormSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-b border-border last:border-b-0 ${className}`}>{children}</div>;
}

/** Status badge style map — key: uppercase status, value: Tailwind classes */
export function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  OPEN: "bg-info/10 text-info border-info/20",
  REPORTED: "bg-info/10 text-info border-info/20",
  UNDER_REVIEW: "bg-warning/10 text-warning border-warning/20",
  ACTION_REQUIRED: "bg-warning/10 text-warning border-warning/20",
  IN_PROGRESS: "bg-accent/10 text-accent-foreground border-accent/20",
  MONITORING: "bg-warning/10 text-warning border-warning/20",
  RETURNED_TO_WORK: "bg-success/10 text-success border-success/20",
  PENDING_EFFECTIVENESS: "bg-accent/10 text-accent-foreground border-accent/20",
  EFFECTIVE: "bg-success/10 text-success border-success/20",
  INEFFECTIVE: "bg-danger/10 text-danger border-danger/20",
  WAITING_INFO: "bg-warning/10 text-warning border-warning/20",
  CLOSED: "bg-success/10 text-success border-success/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export function statusBadge(s: string) {
  return `${STATUS_BADGE[s] || STATUS_BADGE.DRAFT} inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border`;
}

export const SEVERITY_BADGE: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-warning/10 text-warning border-warning/20",
  HIGH: "bg-warning/10 text-warning border-warning/20",
  CRITICAL: "bg-danger/10 text-danger border-danger/20",
};

export function severityBadge(s: string) {
  return `${SEVERITY_BADGE[s] || SEVERITY_BADGE.LOW} inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border`;
}

export function severityDot(s: string) {
  const colors: Record<string, string> = {
    LOW: "bg-muted-foreground",
    MEDIUM: "bg-warning",
    HIGH: "bg-warning",
    CRITICAL: "bg-danger",
  };
  return colors[s] || "bg-muted-foreground";
}

export const ACTION_BTN = "h-10 px-4 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5";
export const ACTION_BTN_PRIMARY = `${ACTION_BTN} bg-primary text-primary-foreground hover:bg-primary/90`;
export const ACTION_BTN_OUTLINE = `${ACTION_BTN} border border-border bg-card text-foreground hover:bg-muted`;
export const ACTION_BTN_GHOST = `${ACTION_BTN} text-muted-foreground hover:text-foreground hover:bg-muted`;
export const ACTION_BTN_DANGER = `${ACTION_BTN} bg-danger text-danger-foreground hover:bg-danger/90`;
export const ACTION_BTN_SUCCESS = `${ACTION_BTN} bg-success text-success-foreground hover:bg-success/90`;
