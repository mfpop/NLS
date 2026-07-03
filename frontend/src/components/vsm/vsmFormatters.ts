// ── VSM Formatting Utilities ──

/** Format seconds into a human-readable time string. */
export function fmtSeconds(seconds: number): string {
  if (seconds === 0) return "0s";
  if (!seconds && seconds !== 0) return "\u2014";
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)}min`;
  return `${seconds}s`;
}

/** Changeover seconds — no compressed concatenation like "30min/C/O". */
export function fmtCO(seconds: number): string {
  if (!seconds && seconds !== 0) return "\u2014";
  if (seconds === 0) return "0";
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)}min`;
  return `${seconds}s`;
}

/** Format minutes into a human-readable time string. */
export function fmtMinutes(minutes: number): string {
  if (!minutes && minutes !== 0) return "\u2014";
  if (minutes >= 1440) return `${(minutes / 1440).toFixed(1)}d`;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (minutes >= 1) return `${Math.round(minutes)}m`;
  return `${Math.round(minutes * 60)}s`;
}

/**
 * Format a value that may be null/undefined — returns em-dash for missing values.
 * Guards against undefined/null leaking into visible labels.
 */
export function v(val: unknown, suffix = ""): string {
  if (val === null || val === undefined || val === "undefined" || val === "") return "\u2014";
  return `${val}${suffix}`;
}

// ── Layout Constants ──
// Canvas: unified SVG, standard classical VSM proportions
export const CANVAS_W = 1600;
export const CANVAS_H = 900;

// Factory entity (Supplier / Customer) — sawtooth roof factory shape
export const FAC_W = 210;
export const FAC_H = 95;
export const FAC_ROOF = 28;

// Production Control box — standard VSM control box with header band
export const PC_W = 260;
export const PC_H = 100;
export const PC_HEADER = 28;

// Process boxes — identity only (name, department, operators)
export const PROC_W = 155;
export const PROC_H = 78;
export const PROC_Y = 318;

// Material flow Y — center of process boxes
export const MAT_Y = PROC_Y + PROC_H / 2;

// Data boxes — stacked table rows under each process
export const DATA_Y = PROC_Y + PROC_H + 16;
export const DATA_ROW_H = 17;
export const DATA_ROWS = 6;


// Inventory triangles
export const INV_SIZE = 48;
export const INV_HALF = INV_SIZE / 2;

// Timeline & Totals
export const TIMELINE_Y = 690;

// Process gap helpers
export const GAP_MIN = 200;
export const GAP_MAX = 300;

