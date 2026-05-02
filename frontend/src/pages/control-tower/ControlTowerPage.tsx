import { Monitor, Plus, GitBranch, Footprints, FileSpreadsheet } from "lucide-react";

const controlTowerData = {
  activeLine: "C2-Cylinder Assembly",
  status: "At risk",
  primaryAlert: {
    title: "Output behind plan (45 units)",
    message: "Output behind plan (45 units) — flow at risk",
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
    {
      group: "PRIMARY",
      severity: "critical",
      title: "Output behind plan (45 units)",
      meta: "Impact: delivery risk · Owner: Production",
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
        title: "Gemba walk – line walkthrough C2",
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
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Kaizen
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
            <GitBranch className="h-4 w-4" /> VSM
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
            <Footprints className="h-4 w-4" /> Walk
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            <FileSpreadsheet className="h-4 w-4" /> Log
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
        <div className="grid h-full grid-cols-[minmax(0,1fr)_340px] gap-3 p-3">
          {/* LEFT COLUMN */}
          <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
            {/* 1. PRIMARY ALERT BAR */}
            <div className="flex h-11 shrink-0 items-center justify-between rounded-lg border-l-4 border-l-red-600 bg-red-50 px-3">
              <span className="text-sm font-semibold text-slate-900">{primaryAlert.message}</span>
              <button className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                {primaryAlert.action}
              </button>
            </div>

            {/* 2. ALERTS COMPACT ROW */}
            {alerts.count > 0 && (
              <section className="shrink-0">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Alerts</div>
                <div className="flex h-8 items-center justify-between rounded-lg border border-slate-200 bg-white px-3">
                  <span className="text-xs text-slate-600">{alerts.count} warnings active</span>
                  <button className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">View</button>
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
                  return (
                    <div key={i} className={"flex min-h-10 items-center justify-between rounded-lg border bg-white px-3 py-2 border-l-4 " + cls}>
                      <div className="flex flex-col gap-0">
                        <span className="text-sm font-semibold text-slate-900">{action.title}</span>
                        <span className="text-xs text-slate-500">{action.meta}</span>
                      </div>
                      <button className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
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
                  <div key={i} className={"min-h-12 rounded-lg border px-3 py-2 " + (kpi.highlight ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white")}>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{kpi.label}</div>
                    <div className="text-lg font-bold leading-tight text-slate-900">{kpi.value}</div>
                    {kpi.sub && <div className="text-xs text-slate-400">{kpi.sub}</div>}
                  </div>
                ))}
              </div>
            </section>

            {/* 5. PROBLEMS */}
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Problems</div>
              <div className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white">
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
          <aside className="flex min-h-0 flex-col">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">My Work</div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              {myWork.overdue.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-red-600">Overdue</div>
                  {myWork.overdue.map((task, i) => (
                    <div key={i} className="mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 border-l-4 border-l-red-600">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                        <div className="text-xs text-slate-500">{task.meta}</div>
                      </div>
                      <button className="shrink-0 rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
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
                      <button className="shrink-0 rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
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
                      <button className="shrink-0 rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
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