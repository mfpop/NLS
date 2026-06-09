// ── Shared status styles and helpers for Production Control ──

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border/40",
  OPEN: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  ARCHIVED: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
  IN_PROGRESS: "border-amber-300 text-amber-700 bg-amber-50/80 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30",
  CLOSED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300",
};

export const ISSUE_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-blue-300 text-blue-700 bg-blue-50/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  IN_PROGRESS: "border-amber-300 text-amber-700 bg-amber-50/80 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30",
  RESOLVED: "border-green-300 text-green-700 bg-green-50/80 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30",
  CLOSED: "border-green-300 text-green-700 bg-green-50/80 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30",
  CANCELLED: "border-red-300 text-red-600 bg-red-50/60 dark:border-red-800 dark:text-red-400 dark:bg-red-950/20",
};

export const ACTION_STATUS_STYLES: Record<string, string> = {
  OPEN: "border-blue-300 text-blue-700 bg-blue-50/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  IN_PROGRESS: "border-amber-300 text-amber-700 bg-amber-50/80 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30",
  COMPLETED: "border-green-300 text-green-700 bg-green-50/80 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30",
  CANCELLED: "border-red-300 text-red-600 bg-red-50/60 dark:border-red-800 dark:text-red-400 dark:bg-red-950/20",
};

export const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "border-red-300 text-red-700 bg-red-50/80 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30",
  HIGH: "border-orange-300 text-orange-700 bg-orange-50/80 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950/30",
  MEDIUM: "border-blue-300 text-blue-700 bg-blue-50/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  LOW: "border-gray-300 text-gray-600 bg-gray-50/80 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30",
};

export const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "border-red-300 text-red-700 bg-red-50/80 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30",
  HIGH: "border-orange-300 text-orange-700 bg-orange-50/80 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950/30",
  MEDIUM: "border-blue-300 text-blue-700 bg-blue-50/80 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30",
  LOW: "border-gray-300 text-gray-600 bg-gray-50/80 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30",
};

export const SEL_INPUT = "h-8 w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-border/50 dark:border-slate-600/50 px-2 text-sm text-foreground outline-none focus:border-blue-500 focus:bg-white/80 dark:focus:bg-slate-800/80 focus:ring-1 focus:ring-blue-500/30";
export const WARN = "text-amber-700 dark:text-amber-300";

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
  if (s >= 90) return { label: "Excellent", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (s >= 75) return { label: "Pass", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (s >= 60) return { label: "Needs Improvement", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Fail", cls: "bg-red-100 text-red-700 border-red-200" };
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
    if (o === "PASS" || o === "YES") return "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300";
    if (o === "FAIL" || o === "NO") return "bg-red-100/80 text-red-800 dark:bg-red-900/80 dark:text-red-300";
    if (o === "N_A") return "bg-amber-100/80 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300";
    return "bg-blue-100/80 text-blue-800 dark:bg-blue-900/80 dark:text-blue-300";
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
