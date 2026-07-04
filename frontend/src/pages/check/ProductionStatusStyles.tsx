// ── Shared status styles and helpers for Production Control ──

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border/40",
  OPEN: "bg-primary/15 text-primary border-primary/20",
  COMPLETED: "bg-success/15 text-success border-success/20",
  ARCHIVED: "bg-warning/15 text-warning border-warning/20",
  IN_PROGRESS: "border-warning/40 text-warning bg-warning/10",
  CLOSED: "bg-success/15 text-success border-success/20",
  CANCELLED: "bg-danger/15 text-danger border-danger/20",
};

export const ISSUE_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10",
  IN_PROGRESS: "border-warning/40 text-warning bg-warning/10",
  RESOLVED: "border-success/30 text-success bg-success/10",
  CLOSED: "border-success/30 text-success bg-success/10",
  CANCELLED: "border-danger/30 text-danger/80 bg-danger/8",
};

export const ACTION_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-primary/30 text-primary bg-primary/10",
  IN_PROGRESS: "border-warning/40 text-warning bg-warning/10",
  COMPLETED: "border-success/30 text-success bg-success/10",
  CANCELLED: "border-danger/30 text-danger/80 bg-danger/8",
};

export const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "border-danger/30 text-danger bg-danger/10",
  HIGH: "border-warning/30 text-warning bg-warning/10",
  MEDIUM: "border-primary/30 text-primary bg-primary/10",
  LOW: "border-border/60 text-muted-foreground bg-muted/60",
};

export const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "border-danger/30 text-danger bg-danger/10",
  HIGH: "border-warning/30 text-warning bg-warning/10",
  MEDIUM: "border-primary/30 text-primary bg-primary/10",
  LOW: "border-border/60 text-muted-foreground bg-muted/60",
};

export const SEL_INPUT = "h-8 w-full bg-background/60 backdrop-blur-sm border border-border/50 px-2 text-sm text-foreground outline-none focus:border-primary focus:bg-background/80 focus:ring-1 focus:ring-primary/30";
export const WARN = "text-warning";

export const auditTypeLabels: Record<string, string> = {
  FIVE_S: "5S Audit",
  TPM_EQUIPMENT_CHECK: "TPM / Equipment Check",
  STANDARD_WORK_CHECK: "Standard Work Audit",
  PROCESS_CHECK: "Process Compliance Check",
  KANBAN_PULL_CHECK: "Kanban / Pull System Check",
  QC_PRODUCT_CHECK: "Product Quality Check",
  QC_PROCESS_AUDIT: "Process Quality Audit",
  QC_FIRST_PIECE: "First Piece Check",
  QC_FINAL_INSPECTION: "Final Inspection Audit",
  QC_DMR_REVIEW: "DMR Review Check",
  QC_RMA_REVIEW: "RMA Review Check",
  SAFETY_INSPECTION: "Safety Inspection",
  SAFETY_AUDIT: "Safety Audit",
  HAZARD_ASSESSMENT: "Hazard Assessment",
  MATERIAL_AUDIT: "Material Audit",
  FIFO_CHECK: "FIFO Compliance Check",
  WAREHOUSE_AUDIT: "Warehouse Audit",
};

export function statusLabel(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

export function targetTypeLabel(t: string): string {
  const map: Record<string, string> = {
    PLANT: "Plant",
    PRODUCTION_LINE: "Production Line",
    DEPARTMENT: "Department",
    RESOURCE_GROUP: "Resource Group",
    RESOURCE: "Resource",
  };
  return map[t] || t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function auditTypeLabel(t: string): string {
  return auditTypeLabels[t] || t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scoreGrade(s: number | null): { label: string; cls: string } {
  if (s === null) return { label: "N/A", cls: "bg-muted text-muted-foreground border-border/40" };
  if (s >= 90) return { label: "Excellent", cls: "bg-success/15 text-success border-success/20" };
  if (s >= 75) return { label: "Pass", cls: "bg-primary/15 text-primary border-primary/20" };
  if (s >= 60) return { label: "Needs Improvement", cls: "bg-warning/15 text-warning border-warning/20" };
  return { label: "Fail", cls: "bg-danger/15 text-danger border-danger/20" };
}

export function isFailed(rt: string, v: string): boolean {
  return (rt === "PASS_FAIL_NA" && v === "FAIL") || (rt === "YES_NO_NA" && v === "NO");
}

// ── Segmented Control ──

export function SegCtl({ rt, val, onChange, disabled }: { rt: string; val: string; onChange: (v: string) => void; disabled?: boolean }) {
  if (disabled) {
    const dCls = "h-16 w-full bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-white/10 dark:border-slate-700/10 px-2 py-1 text-xs resize-none outline-none text-muted-foreground/50 cursor-not-allowed";
    const dInp = "h-7 w-full bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-white/10 dark:border-slate-700/10 px-2 text-xs outline-none text-muted-foreground/50 cursor-not-allowed";
    if (rt === "TEXT") return <textarea disabled className={dCls} />;
    if (rt === "NUMBER") return <input type="number" disabled className={dInp} />;
    return <div className="inline-flex h-7 overflow-hidden rounded border border-white/10 dark:border-slate-700/10 opacity-40 cursor-not-allowed">
      {optsFor(rt).map((o) => <span key={o} className="min-w-11 border-r border-white/10 dark:border-slate-700/10 px-2 text-xs font-medium text-muted-foreground/40 last:border-r-0">{o === "N_A" ? "N/A" : o}</span>)}
    </div>;
  }
  if (rt === "PASS_FAIL_NA") return <Seg opts={["PASS", "FAIL", "N_A"]} val={val} onChange={onChange} />;
  if (rt === "YES_NO_NA") return <Seg opts={["YES", "NO", "N_A"]} val={val} onChange={onChange} />;
  if (rt === "SCORE_1_5") return <Seg opts={["1", "2", "3", "4", "5"]} val={val} onChange={onChange} />;
  if (rt === "TEXT") return <textarea value={val} onChange={(e) => onChange(e.target.value)} className="h-16 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs resize-none outline-none focus:border-blue-500" />;
  if (rt === "NUMBER") return <input type="number" value={val} onChange={(e) => onChange(e.target.value)} className="h-7 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2 text-xs outline-none focus:border-blue-500" />;
  return null;
}

function optsFor(rt: string): string[] {
  if (rt === "PASS_FAIL_NA") return ["PASS", "FAIL", "N_A"];
  if (rt === "YES_NO_NA") return ["YES", "NO", "N_A"];
  if (rt === "SCORE_1_5") return ["1", "2", "3", "4", "5"];
  return [];
}

export function Seg({ opts, val, onChange }: { opts: string[]; val: string; onChange: (v: string) => void }) {
  const cls = (a: boolean, o: string) => {
    if (!a) return "bg-white/50 dark:bg-slate-800/50 text-muted-foreground hover:bg-white/80 dark:hover:bg-slate-700/80";
    if (o === "PASS" || o === "YES") return "bg-success/20 text-success";
    if (o === "FAIL" || o === "NO") return "bg-danger/20 text-danger";
    if (o === "N_A") return "bg-warning/20 text-warning";
    return "bg-primary/20 text-primary";
  };
  return <div className="inline-flex h-7 overflow-hidden rounded border border-white/30 dark:border-slate-700/30">{opts.map((o) => <button key={o} onClick={() => onChange(o)} className={`min-w-11 border-r border-white/30 dark:border-slate-700/30 px-2 text-xs font-medium last:border-r-0 transition-colors ${cls(val === o, o)}`}>{o === "N_A" ? "N/A" : o}</button>)}</div>;
}

// ── Findings Table ──

import type { AuditFindingData } from "@/types/audit";

export function FindingsTable({ findings, onClose }: { findings: AuditFindingData[]; onClose: (id: string | null) => void }) {
  const fStatusStyles: Record<string, string> = { OPEN: "border-blue-300 text-blue-700 bg-blue-50/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30", CLOSED: "border-green-300 text-green-700 bg-green-50/80 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30" };
  return (
    <div className="p-4"><table className="w-full text-xs"><thead><tr className="border-b border-white/20 dark:border-slate-700/20"><th className="text-left font-semibold text-foreground py-1.5 px-2">Finding</th><th className="text-left font-semibold text-foreground py-1.5 px-2">Severity</th><th className="text-left font-semibold text-foreground py-1.5 px-2">Status</th><th className="text-left font-semibold text-foreground py-1.5 px-2">Owner</th><th className="text-left font-semibold text-foreground py-1.5 px-2">Due</th><th className="py-1.5 px-2" /></tr></thead>
      <tbody>{findings.map((f) => <tr key={f.id} className="border-b border-white/10 dark:border-slate-700/10 hover:bg-white/30 dark:hover:bg-slate-800/30"><td className="py-1.5 px-2 text-foreground">{f.description}</td><td className="py-1.5 px-2"><span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${SEVERITY_STYLES[f.severity] || ""}`}>{f.severity}</span></td><td className="py-1.5 px-2"><span className={`inline-flex items-center px-1 py-0.5 text-[10px] font-medium border ${fStatusStyles[f.status] || ""}`}>{statusLabel(f.status)}</span></td><td className="py-1.5 px-2 text-muted-foreground">{f.owner || "-"}</td><td className="py-1.5 px-2 text-muted-foreground">{f.dueDate || "-"}</td><td className="py-1.5 px-2">{f.status === "OPEN" && <button onClick={() => onClose(f.id)} className="inline-flex items-center px-1.5 py-0.5 border border-green-200 text-[10px] font-semibold text-green-700 hover:bg-green-50">Close</button>}</td></tr>)}</tbody></table></div>
  );
}

// ── Section Header ──

export function SectionH({ label }: { label: string }) {
  return <div className="flex items-center gap-2 mb-2"><span className="w-1 h-4 bg-amber-500 shrink-0" /><span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span></div>;
}
