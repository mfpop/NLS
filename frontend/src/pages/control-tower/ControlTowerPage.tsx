import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Gauge,
  Monitor,
  Package,
  Route,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { theme } from "../../styles/themeTokens";

/* ── Sample data ── */
const controlTowerData = {
  activeLine: "C2-Cylinder Assembly",
  status: "At risk",
  situation: {
    severity: "critical",
    output: "-45 units",
    rootCause: "No WIP + stopped machine",
    risk: "Delivery delay",
    nextAction: "Restart flow at Station 4",
    action: "Fix Bottleneck",
  },
  primaryActions: [
    { label: "Fix Bottleneck", variant: "primary", target: "root-cause view" },
    { label: "Investigate Output Gap", variant: "secondary", target: "trend chart" },
    { label: "Add WIP", variant: "tertiary", target: "line/station breakdown" },
  ],
  priorityActions: [
    {
      severity: "critical",
      type: "Critical issue",
      impact: "45 units short",
      owner: "Production",
      nextAction: "Restart Station 4",
    },
    {
      severity: "warning",
      type: "Flow risk",
      impact: "WIP = 0",
      owner: "Line Lead",
      nextAction: "Add WIP",
    },
    {
      severity: "info",
      type: "Standard work gap",
      impact: "Gemba not logged",
      owner: "Supervisor",
      nextAction: "Start walk",
    },
  ],
  kpiGroups: [
    {
      title: "FLOW",
      icon: Route,
      items: [
        { label: "WIP", value: "0", trend: "↓", state: "critical", drillDown: "line/station breakdown" },
        { label: "Lead Time", value: "14.5 d", trend: "→", state: "neutral", drillDown: "trend chart" },
      ],
    },
    {
      title: "PERFORMANCE",
      icon: Gauge,
      items: [
        { label: "Output vs Plan", value: "55 / 100", trend: "↓", state: "critical", drillDown: "trend chart" },
        { label: "Takt vs Cycle", value: "0 / 288s", trend: "↓", state: "warning", drillDown: "root-cause view" },
      ],
    },
    {
      title: "QUALITY",
      icon: CheckCircle2,
      items: [
        { label: "Quality %", value: "0%", trend: "→", state: "warning", drillDown: "line/station breakdown" },
      ],
    },
  ],
  problems: [
    {
      group: "Operational",
      severity: "critical",
      title: "Output behind plan",
      chain: ["WIP = 0", "Cycle time = 0", "Machine stopped"],
      drillDown: "root-cause view",
    },
    {
      group: "System",
      severity: "warning",
      title: "No bottleneck detected",
      chain: ["No active constraint", "Cycle signal missing"],
      drillDown: "line/station breakdown",
    },
    {
      group: "Data",
      severity: "warning",
      title: "Quality signal missing",
      chain: ["Quality = 0%", "Check inspection system"],
      drillDown: "trend chart",
    },
  ],
  myWork: {
    doNow: [
      { title: "Fix assembly bottleneck", meta: "2h 12m overdue", action: "Open" },
      { title: "Re-check SPC subgroups", meta: "47m overdue", action: "Open" },
    ],
    next: [
      { title: "Review output gap", meta: "Due in 60m", action: "Continue" },
      { title: "Gemba walk C2", meta: "Due in 3h", action: "Continue" },
    ],
    later: [
      { title: "Validate QC screen sample", meta: "Later today", action: "Start" },
    ],
  },
};

/* ── Helpers ── */

function sevBorder(sev: string) {
  switch (sev) {
    case "critical": return "border-l-danger/45";
    case "warning":  return "border-l-warning/45";
    default:         return "border-l-transparent";
  }
}

const CT_CARD = "border-border/35 bg-card shadow-sm shadow-foreground/6";
const CT_CARD_SOFT = "border-border/30 bg-card shadow-sm shadow-foreground/5";
const CT_SECONDARY = "text-muted-foreground";
const CT_MUTED = "text-muted-foreground";
const CT_WORK_CARD = "border-border/40 shadow-sm shadow-foreground/5";
const WORK_BUTTON = "inline-flex h-7 min-w-[74px] shrink-0 items-center justify-center rounded-md border px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70";
const WORK_BUTTON_NEUTRAL = `${WORK_BUTTON} border-border bg-card text-foreground hover:bg-muted`;
const CT_BUTTON_PRIMARY = "inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20";
const CT_BUTTON_SECONDARY = "inline-flex h-8 items-center justify-center rounded-md border border-border/70 bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20";
const CT_BUTTON_TERTIARY = "inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20";

/* Badges — clean, readable, uppercase */
function sevBadge(sev: string) {
  switch (sev) {
    case "critical": return theme.badgeCritical;
    case "warning":  return theme.badgeWarning;
    default:         return theme.badgeInactive;
  }
}

function stateTone(state: string) {
  switch (state) {
    case "critical": return "text-danger bg-danger/10 border-danger/15";
    case "warning": return "text-warning bg-warning/10 border-warning/20";
    default: return "text-muted-foreground bg-muted border-border/40";
  }
}

function priorityActionTone(sev: string) {
  switch (sev) {
    case "critical": return "border-danger/15 border-l-danger/45 bg-card";
    case "warning": return "border-warning/20 border-l-warning/45 bg-card";
    default: return "border-primary/15 border-l-primary/35 bg-card";
  }
}

function trendIcon(trend: string) {
  if (trend === "↑") return <ArrowUp className="h-3 w-3 stroke-current" />;
  if (trend === "↓") return <ArrowDown className="h-3 w-3 stroke-current" />;
  return <ArrowRight className="h-3 w-3 stroke-current" />;
}

/* ── Reusable sub-components ── */

function SectionLabel({ children }: { children: string }) {
  return (
    <div className={`mb-1.5 text-[11px] font-bold uppercase tracking-wider ${CT_SECONDARY}`}>
      {children}
    </div>
  );
}

function PrimaryActionButton({ label, variant, target, onOpen }: { label: string; variant: string; target: string; onOpen: (target: string) => void }) {
  const className = variant === "primary" ? CT_BUTTON_PRIMARY : variant === "secondary" ? CT_BUTTON_SECONDARY : CT_BUTTON_TERTIARY;
  return (
    <button type="button" onClick={() => onOpen(target)} className={className} aria-label={`${label} opens ${target}`}>
      {label}
    </button>
  );
}

function DrillDownPanel({ target, onClose }: { target: string; onClose: () => void }) {
  const detail =
    target === "trend chart"
      ? { icon: BarChart3, title: "Trend Chart", body: "Output trend, plan gap, and recovery pace for the current shift." }
      : target === "line/station breakdown"
        ? { icon: Package, title: "Line / Station Breakdown", body: "Station 4 is stopped, WIP is empty, and upstream flow needs restart." }
        : { icon: AlertTriangle, title: "Root-Cause View", body: "Output behind plan → WIP = 0 → Cycle time = 0 → Machine stopped." };
  const DetailIcon = detail.icon;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/20 p-4">
      <div className={`w-full max-w-md rounded-xl border p-4 ${theme.modal}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DetailIcon className="h-4 w-4 stroke-current" />
            </span>
            <div>
              <div className="text-sm font-bold text-foreground">{detail.title}</div>
              <div className="text-xs font-medium text-muted-foreground">Control Tower drill-down</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className={CT_BUTTON_TERTIARY} aria-label="Close drill-down">
            Close
          </button>
        </div>
        <div className="rounded-lg border border-border/40 bg-muted/45 p-3 text-sm font-medium text-foreground">
          {detail.body}
        </div>
      </div>
    </div>
  );
}

/* ── Page component ── */

export function ControlTowerPage() {
  const { situation, primaryActions, priorityActions, kpiGroups, problems, myWork } = controlTowerData;
  const [drillDownTarget, setDrillDownTarget] = useState<string | null>(null);

  return (
        <div className={`relative flex h-full flex-col overflow-hidden ${theme.page}`} style={{ minHeight: 0 }}>
      {/* ── HEADER ── */}
      <header className={`flex shrink-0 items-center justify-between border-b px-5 py-3 ${theme.header}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.iconBoxEmerald}`}>
            <Monitor className="h-5 w-5 stroke-current" />
          </div>
          <div>
            <div className="flex items-center gap-10">
              <h1 className={`text-lg font-bold tracking-tight leading-none ${theme.textPrimary}`}>Control Tower</h1>
              <span className="rounded-full border border-warning/15 bg-warning/10 px-2 py-0.5 text-xs font-semibold leading-none text-warning">
                At risk
              </span>
            </div>
            <p className={`mt-0.5 text-sm ${theme.textSecondary}`}>
              Live priorities, KPI risk, and supervisor actions
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            ● Live
          </span>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className={`flex min-h-0 flex-1 overflow-hidden ${theme.page}`}>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
          {/* ════ LEFT COLUMN ════ */}
          <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto lg:overflow-hidden">
            {/* 1. SITUATION SUMMARY — action-first */}
            <section className="ct-section">
              <div className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-danger/15 border-l-2 border-l-danger/45 bg-danger/5 px-3 py-2 shadow-sm shadow-foreground/5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <AlertTriangle className="h-4 w-4 stroke-current" />
                  </span>
                  <div className="grid min-w-0 gap-x-4 gap-y-1 sm:grid-cols-[auto_auto_auto]">
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-danger">Status</div>
                      <div className="truncate text-sm font-bold text-foreground">Output: {situation.output}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Root cause</div>
                      <div className="truncate text-xs font-semibold text-foreground">{situation.rootCause}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Next action</div>
                      <div className="truncate text-xs font-semibold text-foreground">{situation.nextAction}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. PRIMARY ACTIONS */}
            <section className="ct-section">
              <SectionLabel>Primary Action</SectionLabel>
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${CT_CARD_SOFT}`}>
                <Wrench className="h-4 w-4 shrink-0 text-primary stroke-current" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground">Resolve flow interruption before next pitch</div>
                  <div className="truncate text-[11px] font-medium text-muted-foreground">Station 4 · WIP empty · machine stopped</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {primaryActions.slice(0, 3).map((action) => (
                    <PrimaryActionButton key={action.label} {...action} onOpen={setDrillDownTarget} />
                  ))}
                </div>
              </div>
            </section>

            {/* 3. KPI GROUPS */}
            <section className="ct-section">
              <SectionLabel>KPIs</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {kpiGroups.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.title} className={`rounded-lg border p-2 ${CT_CARD}`}>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <GroupIcon className="h-3.5 w-3.5 text-foreground stroke-current" />
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">{group.title}</span>
                      </div>
                      <div className="grid gap-1">
                        {group.items.map((kpi) => (
                          <button
                            key={kpi.label}
                            type="button"
                            onClick={() => setDrillDownTarget(kpi.drillDown)}
                            className={`flex h-[52px] items-center justify-between rounded-md border px-2.5 text-left transition-colors hover:bg-muted/70 ${stateTone(kpi.state)}`}
                            aria-label={`${kpi.label} opens ${kpi.drillDown}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[10px] font-bold uppercase tracking-wide opacity-80">{kpi.label}</span>
                              <span className="block truncate text-lg font-bold leading-5 text-foreground">{kpi.value}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold">
                              {trendIcon(kpi.trend)}
                              <ChevronRight className="h-3 w-3 stroke-current opacity-60" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. PRIORITY ACTIONS */}
            <section className="ct-section">
              <SectionLabel>Priority Actions</SectionLabel>
              <div className="grid gap-1.5">
                {priorityActions.map((a, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setDrillDownTarget("root-cause view")}
                    className={
                      "ct-priority-card grid h-12 grid-cols-[minmax(0,1.15fr)_0.7fr_0.9fr_auto] items-center gap-2 rounded-lg border border-l-2 px-3 text-left shadow-sm shadow-foreground/5 transition-colors hover:bg-muted/70 " +
                      priorityActionTone(a.severity)
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-foreground">{a.type}</span>
                      <span className="block truncate text-[10px] font-medium text-muted-foreground">Impact: {a.impact}</span>
                    </span>
                    <span className="truncate text-[11px] font-semibold text-muted-foreground">Owner: {a.owner}</span>
                    <span className="truncate text-[11px] font-semibold text-foreground">{a.nextAction}</span>
                    <span className={"rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + sevBadge(a.severity)}>
                      {a.severity}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="ct-section flex min-h-0 flex-1 flex-col">
              <SectionLabel>Problems</SectionLabel>
              <div className={`min-h-0 flex-1 rounded-lg border ${CT_CARD}`}>
                <div className="grid h-full grid-rows-3 gap-1 p-1">
                  {problems.map((p) => (
                    <button
                      key={p.title}
                      type="button"
                      onClick={() => setDrillDownTarget(p.drillDown)}
                      className={"flex min-h-0 items-center gap-2 rounded-md bg-muted/55 px-3 py-1 text-left transition-colors hover:bg-muted/80 " + sevBorder(p.severity)}
                      aria-label={`${p.title} opens ${p.drillDown}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground">
                        {p.severity === "critical" ? <AlertTriangle className="h-3.5 w-3.5 text-danger stroke-current" /> : <CircleDot className="h-3.5 w-3.5 stroke-current" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{p.group}</span>
                        <span className="block truncate text-xs font-bold text-foreground">{p.title}</span>
                        <span className="block truncate text-[10px] font-medium text-muted-foreground">
                          {p.chain.map((step, index) => `${index === 0 ? "" : "→ "}${step}`).join(" ")}
                        </span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground stroke-current" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* ════ RIGHT COLUMN — MY WORK ════ */}
          <aside className="ct-section flex min-h-0 flex-col max-lg:hidden">
            <SectionLabel>My Work</SectionLabel>
            <div className={`min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/30 bg-card p-2.5 shadow-sm shadow-foreground/5`}>
              {/* DO NOW */}
              {myWork.doNow.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-danger/10 text-[10px] font-bold text-danger">
                      {myWork.doNow.length}
                    </span>
                    <h4 className={`text-[10px] font-semibold uppercase tracking-wider ${CT_SECONDARY}`}>Do Now</h4>
                  </div>
                  {myWork.doNow.map((t, i) => (
                    <button key={i} type="button" onClick={() => setDrillDownTarget("root-cause view")} className={`mb-2 w-full rounded-lg border border-l-2 border-danger/15 border-l-danger/45 bg-danger/5 px-2.5 py-2 text-left ${CT_WORK_CARD}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold ${theme.textPrimary}`}>{t.title}</div>
                          <div className={`text-xs font-medium ${CT_MUTED}`}>{t.meta}</div>
                        </div>
                        <span className={WORK_BUTTON_NEUTRAL} aria-hidden="true">
                          {t.action}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* NEXT */}
              {myWork.next.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning/10 text-[10px] font-bold text-warning">
                      {myWork.next.length}
                    </span>
                    <h4 className={`text-[10px] font-semibold uppercase tracking-wider ${CT_SECONDARY}`}>Next</h4>
                  </div>
                  {myWork.next.map((t, i) => (
                    <button key={i} type="button" onClick={() => setDrillDownTarget("line/station breakdown")} className={`mb-2 w-full rounded-lg border px-2.5 py-2 text-left ${CT_WORK_CARD} border-warning/15 bg-warning/5`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold ${theme.textPrimary}`}>{t.title}</div>
                          <div className={`text-xs font-medium ${CT_MUTED}`}>{t.meta}</div>
                        </div>
                        <span className={`${WORK_BUTTON} border-warning/25 bg-warning/10 text-warning hover:bg-warning/15`} aria-hidden="true">
                          {t.action}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* LATER */}
              {myWork.later.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <Clock3 className="h-3 w-3 text-muted-foreground stroke-current" />
                    <h4 className={`text-[10px] font-semibold uppercase tracking-wider ${CT_SECONDARY}`}>Later</h4>
                  </div>
                  {myWork.later.map((t, i) => (
                    <button key={i} type="button" onClick={() => setDrillDownTarget("trend chart")} className={`mb-2 w-full rounded-lg border bg-card px-2.5 py-2 text-left ${CT_WORK_CARD}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold ${theme.textPrimary}`}>{t.title}</div>
                          <div className={`text-xs font-medium ${CT_MUTED}`}>{t.meta}</div>
                        </div>
                        <span className={WORK_BUTTON_NEUTRAL} aria-hidden="true">
                          {t.action}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
      {drillDownTarget && <DrillDownPanel target={drillDownTarget} onClose={() => setDrillDownTarget(null)} />}
    </div>
  );
}
