import { theme } from "@/styles/themeTokens";

export type StatusVariant = "active" | "inactive" | "draft" | "archived" | "maintenance";

const STATUS_STYLES: Record<StatusVariant, string> = {
  active: theme.badgeActive,
  inactive: theme.badgeInactive,
  draft: theme.badgeNeutral,
  archived: "bg-muted/60 text-muted-foreground border border-border/50",
  maintenance: theme.badgeWarning,
};

const STATUS_DOTS: Record<StatusVariant, string> = {
  active: "bg-success",
  inactive: "bg-muted-foreground/40",
  draft: "bg-border-strong",
  archived: "bg-border",
  maintenance: "bg-warning",
};

const STATUS_LABELS: Record<StatusVariant, string> = {
  active: "Active",
  inactive: "Inactive",
  draft: "Draft",
  archived: "Archived",
  maintenance: "Maintenance",
};

interface StatusBadgeProps {
  variant?: StatusVariant;
  label?: string;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ variant = "active", label, dot = true, className = "" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[variant]} ${className}`}>
      {dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOTS[variant]} mr-1`} />}
      {label ?? STATUS_LABELS[variant]}
    </span>
  );
}
