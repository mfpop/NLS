import { Monitor } from "lucide-react";

/* ── Sample data ── */
const controlTowerData = {
  activeLine: "C2-Cylinder Assembly",
  status: "At risk",
  primaryAlert: {
    title: "Output behind plan (45 units)",
    message: "Flow at risk — output behind plan by 45 units",
    action: "Investigate",
  },
  alerts: {
    count: 4,
    label: "4 warnings active",
  },
  priorityActions: [
    {
      severity: "critical",
      title: "Output behind plan (45 units)",
      meta: "Shift impact · Action required",
      action: "Review KPI",
    },
    {
      severity: "warning",
      title: "WIP below buffer minimum",
      meta: "Flow starvation risk",
      action: "Start walk",
    },
    {
      severity: "info",
      title: "Gemba walk not logged today",
      meta: "Standard work missing",
      action: "Start walk",
    },
  ],
  kpis: [
    { label: "TAKT VS CYCLE", value: "0 / 288s", sub: "(-288s)", highlight: false },
    { label: "BOTTLENECK", value: "—", sub: "", highlight: false },
    { label: "OUTPUT", value: "55 / 100", sub: "gap 45", highlight: true },
    { label: "WIP", value: "0", sub: "at risk", highlight: false },
    { label: "LEAD TIME", value: "14.5 d", sub: "", highlight: false },
    { label: "QUALITY", value: "0%", sub: "", highlight: false },
  ],
  problems: [
    { group: "PRIMARY",   severity: "critical", title: "Output behind plan (45 units)",       meta: "Impact: delivery risk · Owner: Production" },
    { group: "SYSTEM",    severity: "warning",  title: "WIP below buffer (0 / 9 u)",          meta: "Flow starvation risk" },
    { group: "SYSTEM",    severity: "warning",  title: "No bottleneck detected",              meta: "Possible stop or missing cycle data" },
    { group: "DATA",      severity: "info",     title: "Cycle time = 0s",                     meta: "Machine stopped or data issue" },
    { group: "DATA",      severity: "info",     title: "Quality = 0%",                        meta: "Check inspection system" },
  ],
  myWork: {
    overdue: [
      { title: "Re-check SPC subgroups after tool offset", meta: "+132 min delay", action: "Open" },
      { title: "Fix assembly bottleneck (Station 4)",       meta: "+47 min delay",  action: "Open" },
    ],
    inProgress: [
      { title: "Gemba walk — line walkthrough C2",          meta: "Due in 60 min",  action: "Continue" },
      { title: "Review output gap vs morning plan",          meta: "Due in 180 min", action: "Continue" },
    ],
    next: [
      { title: "Validate screen sample at QC gate",         meta: "Normal priority", action: "Start" },
    ],
  },
};

/* ── Helpers ──
 * Color = signal only (borders, badges, icons). NOT backgrounds.
 * Semantic palette:
 *   Critical:  #991B1B text, #DC2626 border, #FEE2E2 badge
 *   Warning:   #92400E text, #F59E0B border, #FEF3C7 badge
 *   Info:      #334155 text, #94A3B8 border, #E2E8F0 badge
 ──*/

function sevBorder(sev: string) {
  switch (sev) {
    case "critical": return "border-l-red-600";
    case "warning":  return "border-l-amber-500";
    default:         return "border-l-slate-400";
  }
}

/* Button hierarchy:
   Primary   (alert bar only)  = bg-red-600 text-white
   Secondary (critical action) = bg-slate-900 text-white
   Tertiary  (default)          = bg-white border border-slate-300 text-slate-900
──*/
function sevBtn(sev: string) {
  switch (sev) {
    case "critical": return "rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 focus-visible:ring-slate-400";
    case "warning":  return "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300";
    default:         return "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300";
  }
}

/* Badges — soft, readable, uppercase */
function sevBadge(sev: string) {
  switch (sev) {
    case "critical": return "bg-red-100 text-red-700";
    case "warning":  return "bg-amber-100 text-amber-700";
    default:         return "bg-slate-100 text-slate-600";
  }
}

/* ── Reusable sub-components ── */

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {children}
    </div>
  );
}

function ActionButton({ label, className }: { label: string; className?: string }) {
  return (
    <button
      className={
        "shrink-0 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-150 " +
        (className ?? "rounded-lg bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-600 focus-visible:ring-slate-400")
      }
      aria-label={label}
    >
      {label}
    </button>
  );
}

/* ── Page component ── */

export function ControlTowerPage() {
  const { primaryAlert, alerts, priorityActions, kpis, problems, myWork } = controlTowerData;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ minHeight: 0 }}>
      {/* ── HEADER ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-1)] px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Control Tower</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                At risk
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 md:inline-flex">
                C2-Cylinder Assembly
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Live priorities, KPI risk, and supervisor actions
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            ● Live
          </span>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-[var(--page-bg)]">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
          {/* ════ LEFT COLUMN ════ */}
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:overflow-hidden">
            {/* 1. PRIMARY ALERT BAR — red left border, danger action button */}
            {primaryAlert && (
              <div className="flex h-11 items-center justify-between gap-3 rounded-lg border border-red-200 border-l-4 border-l-red-600 bg-red-50 px-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white" aria-hidden="true">!</span>
                  <p className="text-sm font-semibold text-slate-900">{primaryAlert.message}</p>
                </div>
                <button
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 transition-colors"
                  aria-label={primaryAlert.action}
                >
                  {primaryAlert.action}
                </button>
              </div>
            )}

            {/* 2. ALERTS ROW — soft badges, readable */}
            {alerts.count > 0 && (
              <section>
                <SectionLabel>Alerts</SectionLabel>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {alerts.count}
                    </span>
                    <span className="text-sm text-slate-500">{alerts.count} warnings active</span>
                  </div>
                  <div className="hidden sm:flex gap-1.5">
                    {["Downtime", "Quality", "Flow", "Schedule"].map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 transition-colors"
                    aria-label="View all alerts"
                  >
                    View
                  </button>
                </div>
              </section>
            )}

            {/* 3. PRIORITY CARDS — white, left border only, no tint */}
            <section>
              <SectionLabel>Priority Actions</SectionLabel>
              <div className="flex flex-col gap-2">
                {priorityActions.map((a, i) => (
                  <div
                    key={i}
                    className={
                      "flex items-center justify-between gap-2 rounded-lg border border-l-4 px-3 py-2.5 " +
                      "border-slate-200 bg-white " +
                      sevBorder(a.severity)
                    }
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-900">{a.title}</span>
                      <span className="text-xs text-slate-500">{a.meta}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={"rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + sevBadge(a.severity)}>
                        {a.severity}
                      </span>
                      <ActionButton label={a.action} className={sevBtn(a.severity)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. KPI GRID — only OUTPUT highlighted */}
            <section>
              <SectionLabel>KPIs</SectionLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {kpis.map((kpi, i) => (
                  <div
                    key={i}
                    className={
                      "flex min-h-[72px] flex-col justify-center rounded-lg border px-3 py-2 " +
                      (kpi.highlight
                        ? "border-amber-300 bg-amber-50"
                        : "border-slate-200 bg-white")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-500">{kpi.label}</span>
                      {kpi.highlight && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          At risk
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-lg font-bold leading-none text-slate-900">{kpi.value}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{kpi.sub || "\u00a0"}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. PROBLEMS — white rows, severity left border, no tint */}
            <section className="flex min-h-0 flex-1 flex-col">
              <SectionLabel>Problems</SectionLabel>
              <div className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white">
                <div className="h-full overflow-y-auto p-2.5">
                  {(() => {
                    let lastGroup = "";
                    return problems.map((p, i) => {
                      const showGroup = p.group !== lastGroup;
                      lastGroup = p.group;
                      return (
                        <div key={i} className={showGroup && i > 0 ? "mt-2.5" : ""}>
                          {showGroup && (
                            <div className="flex items-center gap-2 pb-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">{p.group}</span>
                              <span className="flex-1 border-t border-slate-100" />
                            </div>
                          )}
                          <div
                            className={
                              "rounded-lg border border-slate-200 border-l-4 bg-white px-3 py-2 " +
                              "mb-1.5 last:mb-0 " +
                              sevBorder(p.severity)
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900">{p.title}</span>
                              <span className={"shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + sevBadge(p.severity)}>
                                {p.severity}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">{p.meta}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </section>
          </div>

          {/* ════ RIGHT COLUMN — MY WORK ════ */}
          <aside className="flex min-h-0 flex-col max-lg:hidden">
            <SectionLabel>My Work</SectionLabel>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
              {/* OVERDUE */}
              {myWork.overdue.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                      {myWork.overdue.length}
                    </span>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Overdue</h4>
                  </div>
                  {myWork.overdue.map((t, i) => (
                    <div key={i} className="mb-1.5 rounded-lg border border-red-200 border-l-4 border-l-red-600 bg-white px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                          <div className="text-xs text-slate-500">{t.meta}</div>
                        </div>
                        <button
                          className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 transition-colors"
                          aria-label={"Open " + t.title}
                        >
                          {t.action}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* IN PROGRESS */}
              {myWork.inProgress.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {myWork.inProgress.length}
                    </span>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">In Progress</h4>
                  </div>
                  {myWork.inProgress.map((t, i) => (
                    <div key={i} className="mb-1.5 rounded-lg border border-amber-200 border-l-4 border-l-amber-500 bg-white px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                          <div className="text-xs text-slate-500">{t.meta}</div>
                        </div>
                        <button
                          className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 transition-colors"
                          aria-label={"Continue " + t.title}
                        >
                          {t.action}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NEXT */}
              {myWork.next.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Next</h4>
                  </div>
                  {myWork.next.map((t, i) => (
                    <div key={i} className="mb-1.5 rounded-lg border border-slate-200 border-l-4 border-l-slate-400 bg-white px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                          <div className="text-xs text-slate-500">{t.meta}</div>
                        </div>
                        <button
                          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 transition-colors"
                          aria-label={"Start " + t.title}
                        >
                          {t.action}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}