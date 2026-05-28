import { CheckCircle, XCircle, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

export type SyncStatus = "ok" | "error" | "loading" | null;

export interface SyncLogBannerProps {
  status: SyncStatus;
  /** Custom success message. Default: "Record staged successfully." */
  successMessage?: string;
  /** Custom error message. Default: "Sync failed. Please try again." */
  errorMessage?: string;
  /** Custom loading message. Default: "Syncing..." */
  loadingMessage?: string;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────

export function SyncLogBanner({
  status,
  successMessage = "Record staged successfully.",
  errorMessage = "Sync failed. Please try again.",
  loadingMessage = "Syncing...",
  className = "",
}: SyncLogBannerProps) {
  if (!status) return null;

  if (status === "ok") {
    return (
      <div className={`mb-3 px-3 py-1.5 bg-success/10 text-success rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-success/20 ${className}`}>
        <CheckCircle className="h-3.5 w-3.5 stroke-current shrink-0" />
        {successMessage}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`mb-3 px-3 py-1.5 bg-danger/10 text-danger rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-danger/20 ${className}`}>
        <XCircle className="h-3.5 w-3.5 stroke-current shrink-0" />
        {errorMessage}
      </div>
    );
  }

  // loading
  return (
    <div className={`mb-3 px-3 py-1.5 bg-info/10 text-info rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-info/20 ${className}`}>
      <Loader2 className="h-3.5 w-3.5 stroke-current shrink-0 animate-spin" />
      {loadingMessage}
    </div>
  );
}
