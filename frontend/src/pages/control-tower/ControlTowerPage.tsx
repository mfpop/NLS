import { Monitor, Plus, GitBranch, Footprints, FileSpreadsheet } from "lucide-react";

const controlTowerData = {
  activeLine: "C2-Cylinder Assembly",
  status: "At risk",
  primaryAlert: {
    title: "Output behind plan (45 units)",
    message: "Output behind plan (45 units) - flow at risk",
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
      meta: "Shift impact - Action required",
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
    { label: "BOTTLENECK", value: "-", sub: "", highlight: false },
    { label: "OUTPUT", value: "55 / 100", sub: "gap 45", highlight: true },
    { label: "WIP", value: "0", sub: "at risk", highlight: false },
    { label: "LEAD TIME", value: "14.5 d", sub: "", highlight: false },
    { label: "QUALITY", value: "0%", sub: "", highlight: false },
  ],
  problems: [
    {
      group: "PRIMARY",
      severity: "critical",
      title: "Output behind plan (45 units)",
      meta: "Impact: delivery risk - Owner: Production",
    },
    {
      group: "SYSTEM",
      severity: "warning",
      title: "WIP below buffer (0 / 9 u)",
      meta: "Flow starvation risk",
    },
    {
      group: "SYSTEM",
      severity: "warning",
      title: "No bottleneck detected",
      meta: "Possible stop or missing cycle data",
    },
    {
      group: "DATA",
      severity: "info",
      title: "Cycle time = 0s",
      meta: "Machine stopped or data issue",
    },
    {
      group: "DATA",
      severity: "info",
      title: "Quality = 0%",
      meta: "Check inspection system",
    },
  ],
  myWork: {
    overdue: [
      {
        title: "Re-check SPC subgroups after tool offset",
        meta: "+132 min delay",
        action: "Open",
      },
      {
        title: "Fix assembly bottleneck (Station 4)",
        meta: "+47 min delay",
        action: "Open",
      },
    ],
    inProgress: [
      {
        title: "Gemba walk - line walkthrough C2",
        meta: "Due in 60 min",
        action: "Continue",
      },
      {
        title: "Review output gap vs morning plan",
        meta: "Due in 180 min",
        action: "Continue",
      },
    ],
    next: [
      {
        title: "Validate screen sample at QC gate",
        meta: "Normal priority",
        action: "Start",
      },
    ],
  },
};

function severityBorder(severity: string) {
  switch (severity) {
    case "critical": return "border-l-red-600";
    case "warning": return "border-l-amber-500";
    case "info": return "border-l-slate-400";
    default: return "border-l-slate-400";
  }
}

function severityActionBtn(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500";
    case "warning": return "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400";
    default: return "bg-slate-950 hover:bg-slate-800 focus-visible:ring-slate-500";
  }
}

export function ControlTowerPage() {
  const { primaryAlert, alerts, priorityActions, kpis, problems, myWork } = controlTowerData;

  return (
    <>
      {/* HEADER */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Monitor className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Control Tower</h1>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">At risk</span>
            </div>
            <p className="text-sm text-slate-500">Line command center for live priorities, KPI risk, and supervisor actions.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            aria-label="Create new Kaizen"
          >
            <Plus className="h-4 w-4" /> Kaizen
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            aria-label="Open value stream map"
          >
            <GitBranch className="h-4 w-4" /> VSM
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            aria-label="Start Gemba walk"
          >
            <Footprints className="h-4 w-4" /> Walk
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            aria-label="Log activity"
          >
            <FileSpreadsheet className="h-4 w-4" /> Log
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
        <div className="grid h-full grid-cols-[minmax(0,1fr)_340px] gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_340px] max-lg:grid-cols-1">
          {/* LEFT COLUMN */}
          <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
            {/* 1. PRIMARY ALERT BAR */}
            <div className="flex h-11 shrink-0 items-center justify-between rounded-lg border-l-4 border-l-red-600 bg-red-50 px-3 shadow-sm">
              <span className="text-sm font-semibold text-slate-900">{primaryAlert.message}</span>
              <button
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                aria-label="Investigate output behind plan alert"
              >
                {primaryAlert.action}
              </button>
            </div>

            {/* 2. ALERTS COMPACT ROW */}
            {alerts.count > 0 && (
              <section className="shrink-0">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Alerts</div>
                <div className="flex h-8 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
                  <span className="text-xs text-slate-600">{alerts.count} warnings active</span>
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    aria-label="View all alerts"
                  >
                    View
                  </button>
                </div>
              </section>
            )}

            {/* 3. PRIORITY ACTIONS */}
            <section className="shrink-0">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Priority Actions</div>
              <div className="flex flex-col gap-1.5">
                {priorityActions.map((action, i) => {
                  const borderMap: Record<string, string> = {
                    critical: "border-l-red-600 bg-red-50 border-red-200",
                    warning: "border-l-amber-500 bg-white border-slate-200",
                    info: "border-l-slate-400 bg-white border-slate-200",
                  };
                  const cls = borderMap[action.severity] || borderMap.info;
                  const btnColor = severityActionBtn(action.severity);
                  return (
                    <div key={i} className={"flex min-h-10 items-center justify-between rounded-lg border bg-white px-3 py-2 border-l-4 shadow-sm " + cls}>
                      <div className="flex flex-col gap-0">
                        <span className="text-sm font-semibold text-slate-900">{action.title}</span>
                        <span className="text-xs text-slate-500">{action.meta}</span>
                      </div>
                      <button
                        className={"shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " + btnColor}
                        aria-label={action.action + " for " + action.title}
                      >
                        {action.action}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. KPI GRID */}
            <section className="shrink-0">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">KPIs</div>
              <div className="grid grid-cols-3 gap-2">
                {kpis.map((kpi, i) => (
                  <div key={i} className={"min-h-[76px] rounded-lg border px-3 py-2 shadow-sm " + (kpi.highlight ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white")}>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{kpi.label}</div>
                    <div className="text-lg font-bold leading-tight text-slate-900">{kpi.value}</div>
                    <div className="text-xs text-slate-400">{kpi.sub || "\u00a0"}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. PROBLEMS */}
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Problems</div>
              <div className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="h-full overflow-y-auto p-2">
                  {(() => {
                    let lastGroup = "";
                    return problems.map((problem, i) => {
                      const showGroup = problem.group !== lastGroup;
                      lastGroup = problem.group;
                      return (
                        <div key={i}>
                          {showGroup && (
                            <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 first:mt-0">
                              {problem.group}
                            </div>
                          )}
                          <div className={"border-l-4 " + severityBorder(problem.severity) + " px-3 py-2 mt-1"}>
                            <div className="text-sm font-semibold text-slate-900">{problem.title}</div>
                            <div className="text-xs text-slate-500">{problem.meta}</div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </section>
          </section>

          {/* RIGHT COLUMN - MY WORK */}
          <aside className="flex min-h-0 flex-col max-lg:hidden">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">My Work</div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              {myWork.overdue.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-red-600">Overdue</div>
                  {myWork.overdue.map((task, i) => (
                    <div key={i} className="mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 border-l-4 border-l-red-600">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                        <div className="text-xs text-slate-500">{task.meta}</div>
                      </div>
                      <button
                        className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        aria-label={"Open " + task.title}
                      >
                        {task.action}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {myWork.inProgress.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">In Progress</div>
                  {myWork.inProgress.map((task, i) => (
                    <div key={i} className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                        <div className="text-xs text-slate-500">{task.meta}</div>
                      </div>
                      <button
                        className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                        aria-label={"Continue " + task.title}
                      >
                        {task.action}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {myWork.next.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Next</div>
                  {myWork.next.map((task, i) => (
                    <div key={i} className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                        <div className="text-xs text-slate-500">{task.meta}</div>
                      </div>
                      <button
                        className="shrink-0 rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        aria-label={"Start " + task.title}
                      >
                        {task.action}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}