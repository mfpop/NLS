/* ── Shared Date Formatting ──
 * Standardized 24-hour format with seconds across the application.
 * Use these functions instead of ad-hoc toLocaleString() calls.
 */

/**
 * Compact timestamp for tables/lists.
 * Shows "Jun 27, 14:30:45" for current year,
 * "Jun 27, 2025, 14:30:45" for other years.
 */
export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    if (!sameYear) opts.year = "numeric";
    return d.toLocaleString(undefined, opts);
  } catch {
    return iso;
  }
}

/**
 * Full timestamp for tooltips, CSV exports, and detail views.
 * Always includes year: "Jun 27, 2026, 14:30:45".
 */
export function formatDateFull(iso: string): string {
  try {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    return d.toLocaleString(undefined, opts);
  } catch {
    return iso;
  }
}

/**
 * Date-only format for references, footers, etc.
 * Shows "Jun 27, 2026". No time component.
 */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

/**
 * Application-standard date format for overview/detail views.
 * Shows compact date + time, designed for created/updated/activity timestamps.
 * Handles null/undefined gracefully returning "—".
 */
export function formatAppDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    if (!sameYear) opts.year = "numeric";
    return d.toLocaleString(undefined, opts);
  } catch {
    return "—";
  }
}
