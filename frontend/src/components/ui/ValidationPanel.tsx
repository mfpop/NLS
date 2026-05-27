import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

export interface ValidationResultItem {
  id: string;
  severity: string;
  entity: string;
  fieldName: string;
  rowNumber: number | null;
  ruleCode: string;
  message: string;
  recommendedAction: string;
}

export interface ValidationPanelProps {
  items: ValidationResultItem[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  /** When true, shows a retry/suggestion link in the empty state */
  showRunHint?: boolean;
  /** Optional action button rendered in the header */
  headerAction?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────

export function ValidationPanel({
  items,
  loading = false,
  emptyMessage = "No validation results.",
  className = "",
  showRunHint = true,
  headerAction,
}: ValidationPanelProps) {
  return (
    <div className={`w-[260px] shrink-0 border-l border-border/20 flex flex-col bg-card/30 ${className}`}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-muted/40">
        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground stroke-current" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Validation</span>
        {loading && <Loader2 className="h-3 w-3 text-muted-foreground animate-spin stroke-current ml-auto" />}
        {headerAction && <span className="ml-auto">{headerAction}</span>}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <ShieldCheck className="h-6 w-6 text-muted-foreground/30 mb-1 stroke-current" />
            <p className="text-[10px] text-muted-foreground">
              {loading ? "Loading..." : showRunHint ? `${emptyMessage} Click Validate to run.` : emptyMessage}
            </p>
          </div>
        ) : (
          items.map((v, i) => {
            const isError = v.severity === "ERROR";
            const isWarn = v.severity === "WARNING";
            return (
              <div
                key={v.id || i}
                className={`flex items-start gap-2 text-[11px] p-2 rounded-lg border ${
                  isError
                    ? "bg-danger/5 border-danger/20"
                    : isWarn
                      ? "bg-warning/5 border-warning/20"
                      : "bg-info/5 border-info/20"
                }`}
              >
                {isError ? (
                  <XCircle className="h-3.5 w-3.5 text-danger stroke-current shrink-0 mt-0.5" />
                ) : isWarn ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning stroke-current shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-success stroke-current shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <span className="font-semibold text-foreground truncate block">{v.ruleCode}</span>
                  <span className="text-muted-foreground block leading-tight">{v.message}</span>
                  {v.fieldName && (
                    <span className="text-[9px] text-muted-foreground/60 mt-0.5 block">
                      Field: {v.fieldName}{v.entity ? ` · ${v.entity}` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
