import { AlertCircle, ArrowRight, CheckCircle } from "lucide-react";
import { theme } from "@/styles/themeTokens";

// ─── Input Class Constants ───

export const iCls =
  "h-8 w-full rounded-md border border-input/60 bg-card px-2.5 text-[13px] text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
export const iClsError =
  "h-8 w-full rounded-md border border-danger/60 bg-card px-2.5 text-[13px] text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground/40 focus:border-danger focus:ring-2 focus:ring-danger/20 pr-8";
export const sCls =
  "h-8 w-full rounded-md border border-input/60 bg-card px-2.5 text-[13px] text-muted-foreground outline-none transition-all duration-150 appearance-none cursor-pointer focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
export const sClsError =
  "h-8 w-full rounded-md border border-danger/60 bg-card px-2.5 text-[13px] text-muted-foreground outline-none transition-all duration-150 appearance-none cursor-pointer focus:border-danger focus:ring-2 focus:ring-danger/20";

export const labelCls = "block text-[10px] font-medium text-muted-foreground mb-0.5";
export const labelClsRequired = "block text-[10px] font-medium text-muted-foreground mb-0.5 after:content-['_*'] after:text-danger";

// ─── InlineRow ───

export function InlineRow({ label, value, action }: { label: string; value: React.ReactNode; action?: { text: string; onClick: () => void } }) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "100px 1fr auto" }}>
      <span className="truncate text-[10px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-[12px] font-medium text-foreground">{value}</span>
      {action ? <button type="button" onClick={action.onClick} className="whitespace-nowrap text-left text-[10px] font-medium text-primary hover:text-accent transition-colors">{action.text}</button> : null}
    </div>
  );
}

// ─── Badge ───

const BADGE_VARIANTS: Record<string, string> = {
  active: theme.badgeActive,
  inactive: theme.badgeInactive,
  new: theme.iconBoxBlue,
  default: theme.badgeNeutral,
  violet: theme.typeDepartment,
  amber: "bg-warning/10 text-warning border border-warning/25",
  warning: "bg-warning/10 text-warning border border-warning/25",
  rose: theme.badgeCritical,
};

type BadgeVariant = keyof typeof BADGE_VARIANTS;

export function Badge({ label, variant = "default" }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${BADGE_VARIANTS[variant] || BADGE_VARIANTS.default}`}>
      {label === "active" && <span className="inline-block h-1 w-1 rounded-full bg-success mr-1 animate-pulse" />}
      {label}
    </span>
  );
}

// ─── SectionHeader ───
// Variant "divider" (default): full-width with bottom border, optional alert badge
// Variant "chip": inline rounded chip with optional icon (Plant style)

export function SectionHeader({
  title,
  icon,
  alert,
  variant = "divider",
}: {
  title: string;
  icon?: React.ReactNode;
  alert?: boolean;
  variant?: "chip" | "divider";
}) {
  if (variant === "chip") {
    return (
      <div className="mb-2 inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
        {icon && <span className="mr-1.5 flex h-3.5 w-3.5 items-center justify-center">{icon}</span>}
        {title}
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center gap-2 border-b border-border/20 pb-1">
      <span className="inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">{title}</span>
      {alert && <span className="text-[9px] font-semibold text-warning">Incomplete</span>}
    </div>
  );
}

// ─── FieldLabel ───

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className={required ? labelClsRequired : labelCls}>
      {children}
    </span>
  );
}

// ─── ErrorText ───

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-0.5 text-[10px] text-danger flex items-center gap-1"><AlertCircle className="h-3 w-3 stroke-current" />{message}</p>;
}

// ─── ErrorFieldWrapper ───

export function ErrorFieldWrapper({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {error && (
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
          <AlertCircle className="h-4 w-4 text-danger stroke-current" />
        </div>
      )}
    </div>
  );
}

// ─── SetupSignal (Guided Setup pill) ───

export function SetupSignal({ ok, label, onClick, current = false }: { ok: boolean; label: string; onClick?: () => void; current?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={ok ? "Completed" : `Action needed: ${label}`}
      className={`inline-flex w-full items-center gap-1.5 rounded text-left text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 ${
        ok
          ? "px-2 py-0.5 text-muted-foreground hover:bg-muted/40"
          : current
            ? "px-2.5 py-1.5 border border-warning/25 bg-warning/10 text-warning shadow-sm"
            : "px-2 py-1 border border-warning/25 bg-warning/10 text-warning"
      }`}>
      {ok ? <CheckCircle className="h-2.5 w-2.5 stroke-current shrink-0 text-muted-foreground" /> : <ArrowRight className="h-3 w-3 stroke-current shrink-0" />}
      <span className={`truncate ${ok ? "text-muted-foreground" : ""}`}>{label}</span>
    </button>
  );
}
