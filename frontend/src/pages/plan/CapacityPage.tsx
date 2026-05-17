import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, CheckCircle2, ExternalLink, RotateCw, Save, X } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { usePlants } from "@/hooks/usePlants";
import { useProductionLines } from "@/hooks/useProductionLines";
import { useRoutings } from "@/hooks/useRouting";
import { useCapacityPlanMutations, useCapacityPlans, useCapacityScenarios } from "@/hooks/useCapacityPlanning";
import type { CapacityConstraint, CapacityLoadRow, CapacityPlan, CapacityYamazumiItem } from "@/types/capacity";
import type { ProductionLine } from "@/types/productionLine";
import { theme } from "@/styles/themeTokens";

type TabKey = "overview" | "load" | "yamazumi" | "constraints" | "scenarios";

const tabs: Array<{ key: TabKey; label: string; path: string }> = [
  { key: "overview", label: "Overview", path: "/plan/capacity" },
  { key: "load", label: "Capacity Load", path: "/plan/capacity/load" },
  { key: "yamazumi", label: "Yamazumi", path: "/plan/capacity/yamazumi" },
  { key: "constraints", label: "Constraints", path: "/plan/capacity/constraints" },
  { key: "scenarios", label: "Scenarios", path: "/plan/capacity/scenarios" },
];

const inputClass = `h-8 rounded border px-2 text-xs outline-none ${theme.input} ${theme.focusRing}`;
const buttonClass = `inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-medium ${theme.buttonSecondary} ${theme.focusRingNeutral}`;

function activeTabFromPath(pathname: string): TabKey {
  const found = tabs.find((tab) => tab.path !== "/plan/capacity" && pathname.endsWith(tab.path.replace("/plan/capacity", "")));
  return found?.key ?? "overview";
}

function fmtMinutes(value?: number | null) {
  const minutes = Number(value || 0);
  if (!minutes) return "-";
  return `${minutes.toFixed(1)} min`;
}

function fmtSeconds(value?: number | null) {
  const seconds = Number(value || 0);
  if (!seconds) return "-";
  return seconds >= 60 ? `${(seconds / 60).toFixed(1)} min` : `${seconds.toFixed(1)} sec`;
}

function fmtPercent(value?: number | null) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function labelize(value?: string | null) {
  return (value || "").split("_").join(" ");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "APPROVED" ? theme.badgeActive : status === "HAS_WARNINGS" ? theme.badgeWarning : status === "ARCHIVED" ? theme.badgeInactive : theme.badgeNeutral;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{labelize(status)}</span>;
}

function Stat({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${theme.card}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wide ${theme.textMuted}`}>{label}</div>
      <div className={`mt-1 text-lg font-bold ${warn ? theme.textWarning : theme.textPrimary}`}>{value}</div>
      {hint ? <div className={`mt-1 text-[11px] ${theme.textSecondary}`}>{hint}</div> : null}
    </div>
  );
}

function Message({ type, children }: { type: "warning" | "ok" | "info"; children: React.ReactNode }) {
  const cls = type === "ok" ? theme.badgeActive : type === "warning" ? theme.warningChip : theme.infoBanner;
  return <div className={`rounded-lg px-3 py-2 text-xs font-medium ${cls}`}>{children}</div>;
}

function OverviewTab({ plan }: { plan?: CapacityPlan | null }) {
  const inputs = plan?.inputs;
  const result = plan?.result;
  const warnings = plan?.warnings ?? [];
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className={`rounded-xl p-4 ${theme.card}`}>
          <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>Planning Context</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs lg:grid-cols-3">
            <Stat label="Plant" value={plan?.plantName || "-"} />
            <Stat label="Line" value={plan?.productionLineName || "-"} />
            <Stat label="Model" value={plan?.productModelName || "-"} />
            <Stat label="Routing" value={plan ? `v${plan.routingVersion}` : "-"} />
            <Stat label="Horizon" value={plan ? `${plan.planningHorizonStart} → ${plan.planningHorizonEnd}` : "-"} />
            <Stat label="Status" value={labelize(plan?.status) || "-"} />
          </div>
        </section>
        <section className={`rounded-xl p-4 ${theme.card}`}>
          <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>Input Summary</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Planned Quantity" value={inputs?.plannedQuantity ? String(inputs.plannedQuantity) : "-"} />
            <Stat label="Net Available" value={fmtMinutes(inputs?.netAvailableTimeMinutes)} />
            <Stat label="Takt Time" value={fmtSeconds(inputs?.taktTimeSeconds)} warn={!inputs?.taktTimeSeconds} />
            <Stat label="Available Capacity" value={fmtMinutes(result?.availableCapacityMinutes)} />
          </div>
        </section>
        <section className={`rounded-xl p-4 ${theme.card}`}>
          <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>Result Summary</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Utilization" value={result ? fmtPercent(result.capacityUtilizationPercent) : "-"} warn={(result?.capacityUtilizationPercent ?? 0) >= 85} />
            <Stat label="Bottleneck" value={result?.bottleneckResourceName || result?.bottleneckStepName || "-"} />
            <Stat label="Operators Required" value={result ? String(result.operatorsRequired) : "-"} />
            <Stat label="Feasibility" value={labelize(result?.feasibilityStatus) || "-"} warn={result?.feasibilityStatus !== "FEASIBLE"} />
          </div>
        </section>
      </div>
      <section className={`rounded-xl p-4 ${theme.card}`}>
        <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>Warnings</h3>
        <div className="mt-3 space-y-2">
          {!plan ? <Message type="info">Create or select a capacity plan.</Message> : null}
          {plan && !plan.routingVersionId ? <Message type="warning">Missing routing.</Message> : null}
          {plan && !inputs?.taktTimeSeconds ? <Message type="warning">Missing takt.</Message> : null}
          {warnings.length ? warnings.map((warning) => <Message key={warning.message} type="warning">{warning.message}</Message>) : null}
          {plan && !warnings.length && inputs?.taktTimeSeconds ? <Message type="ok">No active warnings.</Message> : null}
        </div>
      </section>
    </div>
  );
}

function CapacityLoadTab({ rows }: { rows: CapacityLoadRow[] }) {
  return (
    <div className={`overflow-hidden rounded-xl ${theme.card}`}>
      <table className="min-w-full text-left text-xs">
        <thead className={theme.toolbarBg}>
          <tr>
            {["Area", "Available Capacity", "Required Capacity", "Utilization", "Gap", "Status"].map((head) => (
              <th key={head} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.level}-${row.area}`} className={`border-t ${theme.sectionDivider} ${theme.interactiveRow}`} tabIndex={0}>
              <td className="px-3 py-2"><div className="font-semibold">{row.area}</div><div className={theme.textMuted}>{row.level}</div></td>
              <td className="px-3 py-2">{fmtMinutes(row.availableCapacityMinutes)}</td>
              <td className="px-3 py-2">{fmtMinutes(row.requiredCapacityMinutes)}</td>
              <td className="px-3 py-2">{fmtPercent(row.utilizationPercent)}</td>
              <td className="px-3 py-2">{fmtMinutes(row.gapMinutes)}</td>
              <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
            </tr>
          ))}
          {!rows.length ? <tr><td className={`px-3 py-8 text-center ${theme.textMuted}`} colSpan={6}>Calculate capacity to populate load rows.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function YamazumiTab({ plan, metric }: { plan?: CapacityPlan | null; metric: string }) {
  const result = plan?.result;
  const items = result?.yamazumi?.items ?? [];
  const maxWork = Math.max(...items.map((item) => item.workContentSeconds), result?.yamazumi?.taktTimeSeconds ?? 0, 1);
  if (!plan?.inputs?.taktTimeSeconds) return <Message type="warning">Complete capacity inputs before Yamazumi analysis.</Message>;
  if (!items.length) return <Message type="warning">Complete routing in Manufacturing Structure → Flow.</Message>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Takt" value={fmtSeconds(result?.yamazumi.taktTimeSeconds)} />
        <Stat label="Balance Loss" value={fmtPercent(result?.balanceLossPercent)} warn={(result?.balanceLossPercent ?? 0) > 20} />
        <Stat label="Operators Required" value={String(result?.operatorsRequired ?? "-")} />
      </div>
      <div className={`rounded-xl p-4 ${theme.card}`}>
        <div className={`mb-3 text-xs ${theme.textSecondary}`}>Metric: {labelize(metric)}</div>
        <div className="space-y-3">
          {items.map((item: CapacityYamazumiItem) => {
            const width = Math.min(100, (item.workContentSeconds / maxWork) * 100);
            const taktLeft = Math.min(100, ((result?.yamazumi.taktTimeSeconds ?? 0) / maxWork) * 100);
            return (
              <div key={item.stepId} className="grid grid-cols-[180px_1fr_80px] items-center gap-3">
                <div className="min-w-0">
                  <div className={`truncate text-xs font-semibold ${theme.textPrimary}`}>{item.standardWorkName || item.resourceGroupName || `Step ${item.sequence}`}</div>
                  <div className={`truncate text-[10px] ${theme.textMuted}`}>Op {item.operator} · {item.departmentName || "No department"}</div>
                </div>
                <div className={`relative h-8 rounded ${theme.loadTrack}`}>
                  <div className="absolute inset-y-0 border-l border-dashed border-success" style={{ left: `${taktLeft}%` }} />
                  <div className={`h-8 rounded ${item.isOverloaded ? "bg-warning" : item.isBottleneck ? "bg-accent0" : "bg-success"}`} style={{ width: `${width}%` }} />
                </div>
                <div className={`text-right text-xs font-semibold ${theme.textPrimary}`}>{fmtSeconds(item.workContentSeconds)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConstraintsTab({ constraints }: { constraints: CapacityConstraint[] }) {
  return (
    <div className="space-y-2">
      {constraints.map((constraint) => (
        <div key={`${constraint.type}-${constraint.message}`} className={`rounded-lg p-3 ${constraint.severity === "CRITICAL" ? theme.panelCritical : theme.panelWarning}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">{constraint.message}</div>
            <StatusBadge status={constraint.severity} />
          </div>
          <div className={`mt-1 text-xs ${theme.textSecondary}`}>{constraint.source} · {constraint.affected}</div>
          <div className={`mt-2 text-xs ${theme.textPrimary}`}>{constraint.recommendedAction}</div>
          <div className="mt-2 flex gap-2">
            {["Open Routing", "Open Resource", "Adjust Scenario", "Create Improvement"].map((action) => (
              <button key={action} type="button" className={buttonClass}>{action}</button>
            ))}
          </div>
        </div>
      ))}
      {!constraints.length ? <Message type="ok">No constraints detected after calculation.</Message> : null}
    </div>
  );
}

function ScenariosTab({ planId, onCreateScenario }: { planId?: string | null; onCreateScenario: (name: string) => void }) {
  const { scenarios } = useCapacityScenarios(planId);
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-4 ${theme.card}`}>
        <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>What-if Scenario</h3>
        <div className="mt-3 flex gap-2">
          <input className={`${inputClass} w-72`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Scenario name" />
          <button type="button" className={buttonClass} disabled={!planId || !name.trim()} onClick={() => { onCreateScenario(name); setName(""); }}>Save Scenario</button>
        </div>
        <p className={`mt-2 text-xs ${theme.textMuted}`}>Scenario assumptions are saved separately and do not overwrite approved plans.</p>
      </div>
      <div className={`rounded-xl ${theme.card}`}>
        {scenarios.map((scenario) => (
          <div key={scenario.id} className={`flex items-center justify-between border-b px-4 py-3 ${theme.sectionDivider}`}>
            <div>
              <div className={`text-sm font-semibold ${theme.textPrimary}`}>{scenario.name}</div>
              <div className={`text-xs ${theme.textMuted}`}>{scenario.isBaseline ? "Baseline" : "What-if"} · {scenario.updatedAt}</div>
            </div>
            <StatusBadge status={scenario.isBaseline ? "BASELINE" : "SCENARIO"} />
          </div>
        ))}
        {!scenarios.length ? <div className={`px-4 py-8 text-center text-xs ${theme.textMuted}`}>No scenarios saved.</div> : null}
      </div>
    </div>
  );
}

export function CapacityPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = activeTabFromPath(location.pathname);
  const [plantId, setPlantId] = useState("");
  const [lineId, setLineId] = useState("");
  const [modelId, setModelId] = useState("");
  const [routingId, setRoutingId] = useState("");
  const [horizonStart, setHorizonStart] = useState(todayIso());
  const [horizonEnd, setHorizonEnd] = useState(addDaysIso(7));
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState({
    plannedQuantity: 0,
    efficiencyFactor: 1,
  });
  const [yamazumiMetric, setYamazumiMetric] = useState("SETUP_INCLUSIVE");

  const { plants } = usePlants();
  const { lines, loading: linesLoading } = useProductionLines(500);
  const { plans, loading: plansLoading, refetch } = useCapacityPlans({ plantId, productionLineId: lineId, productModelId: modelId, status: statusFilter });
  const selectedLine = lines.find((line) => line.id === lineId) as ProductionLine | undefined;
  const modelOptions = selectedLine?.productModels ?? [];
  const { routings } = useRoutings(lineId || null, modelId || null);
  const { createPlan, updateInputs, calculatePlan, approvePlan, createScenario, calculating } = useCapacityPlanMutations();

  const lineOptions = useMemo(() => lines.filter((line) => !plantId || line.plantId === plantId), [lines, plantId]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const planReadOnly = selectedPlan?.status === "APPROVED" || selectedPlan?.status === "ARCHIVED";
  const saveEnabled = !!plantId && !!lineId && !!modelId && !!routingId && inputs.plannedQuantity > 0 && !planReadOnly;

  useEffect(() => {
    if (!plantId && plants[0]?.id) setPlantId(plants[0].id);
  }, [plantId, plants]);

  useEffect(() => {
    if (!lineOptions.some((line) => line.id === lineId)) setLineId(lineOptions[0]?.id ?? "");
  }, [lineId, lineOptions]);

  useEffect(() => {
    if (!selectedLine) return;
    if (!modelOptions.some((model) => model.id === modelId)) {
      setModelId(selectedLine.primaryProductModel?.id || selectedLine.primaryModelId || modelOptions.find((model) => model.isPrimary)?.id || modelOptions[0]?.id || "");
    }
  }, [modelId, modelOptions, selectedLine]);

  useEffect(() => {
    if (!routings.some((routing) => routing.id === routingId)) {
      setRoutingId(routings.find((routing) => routing.status === "ACTIVE")?.id || routings[0]?.id || "");
    }
  }, [routingId, routings]);

  useEffect(() => {
    if (!selectedPlan) return;
    setSelectedPlanId(selectedPlan.id);
    setPlantId(selectedPlan.plantId);
    setLineId(selectedPlan.productionLineId);
    setModelId(selectedPlan.productModelId);
    setRoutingId(selectedPlan.routingVersionId);
    setHorizonStart(selectedPlan.planningHorizonStart);
    setHorizonEnd(selectedPlan.planningHorizonEnd);
    if (selectedPlan.inputs) {
      setInputs({
        plannedQuantity: selectedPlan.inputs.plannedQuantity,
        efficiencyFactor: selectedPlan.inputs.efficiencyFactor,
      });
    }
  }, [selectedPlan?.id]);

  const setInput = (key: keyof typeof inputs, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setEditing(true);
  };

  const chooseTab = (tab: TabKey) => {
    if (dirty && !window.confirm("Discard unsaved capacity planning changes?")) return;
    navigate(tabs.find((item) => item.key === tab)?.path ?? "/plan/capacity");
  };

  const handleSave = async () => {
    setErrors({});
    let plan = selectedPlan;
    if (!plan) {
      const created = await createPlan({ plantId, productionLineId: lineId, productModelId: modelId, routingVersionId: routingId, planningHorizonStart: horizonStart, planningHorizonEnd: horizonEnd });
      if (!created.ok || !created.plan) { setErrors(created.errors); return; }
      plan = created.plan;
      setSelectedPlanId(plan.id);
    }
    const saved = await updateInputs({ capacityPlanId: plan.id, ...inputs });
    if (!saved.ok) { setErrors(saved.errors); return; }
    setDirty(false);
    setEditing(false);
    setMessage("Capacity plan saved");
    await refetch();
  };

  const handleCalculate = async () => {
    if (!selectedPlan) return;
    const result = await calculatePlan(selectedPlan.id);
    if (!result.ok) { setErrors(result.errors); return; }
    setMessage("Capacity calculated");
    await refetch();
  };

  const handleApprove = async () => {
    if (!selectedPlan) return;
    const result = await approvePlan(selectedPlan.id);
    if (!result.ok) { setErrors(result.errors); return; }
    setMessage("Plan approved");
    await refetch();
  };

  const toolbar = (
    <div className="flex w-full items-center gap-1">
      <button type="button" className={buttonClass} onClick={() => { setSelectedPlanId(null); setEditing(true); setDirty(true); }}>New Plan</button>
      <button type="button" className={buttonClass} disabled={!selectedPlan || planReadOnly} onClick={() => setEditing(true)}>Edit</button>
      <button type="button" className={buttonClass} disabled={!saveEnabled} onClick={handleSave}><Save className="h-3.5 w-3.5" /> Save</button>
      <button type="button" className={buttonClass} disabled={!selectedPlan || calculating || dirty} onClick={handleCalculate}><RotateCw className="h-3.5 w-3.5" /> Calculate</button>
      <button type="button" className={buttonClass} disabled={!selectedPlan?.result || selectedPlan.status === "APPROVED" || selectedPlan.constraints.some((c) => c.severity === "CRITICAL")} onClick={handleApprove}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
      <button type="button" className={buttonClass} onClick={() => refetch()}>Refresh</button>
      <button type="button" className={buttonClass} onClick={() => navigate("/plan/production-plan")}><X className="h-3.5 w-3.5" /> Close</button>
      <div className={`ml-auto text-xs ${dirty ? theme.textWarning : theme.textMuted}`}>{editing ? "Editing" : "Viewing"} {dirty ? "· unsaved" : ""}</div>
    </div>
  );

  const footer = (
    <>
      <span>Selected: {selectedPlan ? `${selectedPlan.productionLineName} / ${selectedPlan.productModelName}` : "New plan"}</span>
      <span>Status: {selectedPlan?.status || "DRAFT"}</span>
      <span>Last calculated: {selectedPlan?.calculatedAt || "-"}</span>
      <span>Updated: {selectedPlan?.updatedAt || "-"}</span>
    </>
  );

  const renderActiveTab = () => {
    if (activeTab === "load") return <CapacityLoadTab rows={selectedPlan?.result?.loadRows ?? []} />;
    if (activeTab === "yamazumi") return <YamazumiTab plan={selectedPlan} metric={yamazumiMetric} />;
    if (activeTab === "constraints") return <ConstraintsTab constraints={selectedPlan?.constraints ?? []} />;
    if (activeTab === "scenarios") return <ScenariosTab planId={selectedPlan?.id} onCreateScenario={async (name) => { if (!selectedPlan) return; const result = await createScenario(selectedPlan.id, name, { plannedQuantity: inputs.plannedQuantity }); if (result.ok) { setMessage("Scenario saved"); } }} />;
    return <OverviewTab plan={selectedPlan} />;
  };

  return (
    <AppPageLayout title="Capacity Planning" subtitle="Calculate capacity, takt, constraints, and Yamazumi from production structure and plan data." icon={<BarChart3 />} toolbar={toolbar} footer={footer}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted bg-background">
        <div className={`shrink-0 border-b px-3 py-2 ${theme.subHeader}`}>
          <div className="flex flex-wrap items-center gap-2">
            <select className={inputClass} value={plantId} onChange={(event) => { setPlantId(event.target.value); setDirty(true); }}><option value="">Plant</option>{plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}</select>
            <select className={inputClass} value={lineId} onChange={(event) => { setLineId(event.target.value); setDirty(true); }}><option value="">Line</option>{lineOptions.map((line) => <option key={line.id} value={line.id}>{line.name}</option>)}</select>
            <select className={inputClass} value={modelId} onChange={(event) => { setModelId(event.target.value); setDirty(true); }}><option value="">Model</option>{modelOptions.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select>
            <select className={inputClass} value={routingId} onChange={(event) => { setRoutingId(event.target.value); setDirty(true); }}><option value="">Routing</option>{routings.map((routing) => <option key={routing.id} value={routing.id}>v{routing.version} · {routing.status}</option>)}</select>
            <input className={inputClass} type="date" value={horizonStart} onChange={(event) => { setHorizonStart(event.target.value); setDirty(true); }} />
            <input className={inputClass} type="date" value={horizonEnd} onChange={(event) => { setHorizonEnd(event.target.value); setDirty(true); }} />
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {["ALL", "DRAFT", "CALCULATED", "HAS_WARNINGS", "APPROVED", "ARCHIVED"].map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3">
            <input className={inputClass} type="number" placeholder="Planned qty" value={inputs.plannedQuantity || ""} onChange={(event) => setInput("plannedQuantity", Number(event.target.value || 0))} />
            <input className={inputClass} type="number" step="0.01" placeholder="Efficiency" value={inputs.efficiencyFactor || ""} onChange={(event) => setInput("efficiencyFactor", Number(event.target.value || 1))} />
            <div className={`flex h-8 items-center rounded border px-2 text-xs ${theme.infoBanner}`}>Schedule capacity is backend-calculated.</div>
          </div>
        </div>
        <div className={`shrink-0 border-b px-3 ${theme.subHeader}`}>
          <div className="flex h-10 items-center gap-1">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => chooseTab(tab.key)} className={`h-8 rounded px-3 text-xs font-semibold ${activeTab === tab.key ? theme.tabActive : theme.tabInactive}`}>{tab.label}</button>
            ))}
            {activeTab === "yamazumi" ? (
              <select className={`${inputClass} ml-auto`} value={yamazumiMetric} onChange={(event) => setYamazumiMetric(event.target.value)}>
                <option value="CYCLE_TIME">Cycle Time</option>
                <option value="MANUAL_TIME">Manual Time</option>
                <option value="AUTO_TIME">Auto Time</option>
                <option value="SETUP_INCLUSIVE">Setup-inclusive</option>
              </select>
            ) : null}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {message ? <div className="mb-3"><Message type="ok">{message}</Message></div> : null}
          {Object.values(errors).length ? <div className="mb-3"><Message type="warning">{Object.values(errors)[0]}</Message></div> : null}
          {linesLoading || plansLoading ? <Message type="info">Loading capacity planning data...</Message> : renderActiveTab()}
          {selectedPlan?.productionLineId ? (
            <Link className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${theme.link}`} to={`/system/production-structure/flow/routing/${selectedPlan.productionLineId}/${selectedPlan.routingVersionId}`}>
              Open Manufacturing Structure → Flow <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </AppPageLayout>
  );
}
