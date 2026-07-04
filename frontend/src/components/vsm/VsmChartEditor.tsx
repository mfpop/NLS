import { useState, useMemo } from "react";
import {
  X, Plus, Trash2, Save, GitBranch, Settings,
  ChevronRight, ChevronDown, Info, Truck, Clock,
} from "lucide-react";
import type {
  VsmChart, VsmChartProcess, VsmChartInventory,
  VsmChartInfoFlow, VsmChartMaterialFlow, VsmChartTimeline,
} from "@/types/vsm";

interface Props {
  chart: VsmChart;
  onClose: () => void;
  onSaveChart: (name: string, supplier: string, customer: string, taktOpts?: { customerDemandRate?: number | null; availableMinutesPerShift?: number; chartShiftsPerDay?: number }) => void;
  onAddProcess: (proc: Partial<VsmChartProcess>) => void;
  onUpdateProcess: (id: string, proc: Partial<VsmChartProcess>) => void;
  onDeleteProcess: (id: string) => void;
  onAddInventory: (inv: Partial<VsmChartInventory>) => void;
  onDeleteInventory: (id: string) => void;
  onAddInfoFlow: (flow: Partial<VsmChartInfoFlow>) => void;
  onDeleteInfoFlow: (id: string) => void;
  onAddMaterialFlow: (flow: Partial<VsmChartMaterialFlow>) => void;
  onUpdateMaterialFlow: (id: string, flow: Partial<VsmChartMaterialFlow>) => void;
  onDeleteMaterialFlow: (id: string) => void;
  onAddTimeline: (seg: Partial<VsmChartTimeline>) => void;
  onDeleteTimeline: (id: string) => void;
  onDeleteChart?: () => void;
  onSyncFromLine?: () => void;
  saving?: boolean;
}

const FIELD = "w-full h-8 border border-border bg-background text-sm px-2 rounded-sm";

const DELIVERY_FREQ_OPTIONS = ["Daily", "Weekly", "Monthly", "2x per week"] as const;
type DelFreqPreset = (typeof DELIVERY_FREQ_OPTIONS)[number];

/** Map a stored delivery frequency to its dropdown value. Returns preset string or "CUSTOM". */
function resolveDelFreqSelect(val: string | undefined | null): string {
  if (!val) return "";
  return (DELIVERY_FREQ_OPTIONS as readonly string[]).includes(val) ? val : "CUSTOM";
}
const LABEL = "block text-[10px] uppercase tracking-wide font-medium text-muted-foreground mb-0.5";

export function VsmChartEditor({
  chart, onClose, onSaveChart,
  onAddProcess, onUpdateProcess, onDeleteProcess,
  onAddInventory, onDeleteInventory,
  onAddInfoFlow, onDeleteInfoFlow,
  onAddMaterialFlow, onUpdateMaterialFlow, onDeleteMaterialFlow,
  onAddTimeline, onDeleteTimeline,
  onDeleteChart, onSyncFromLine, saving,
}: Props) {
  const [name, setName] = useState(chart.name);
  const [supplier, setSupplier] = useState(chart.supplierName);
  const [customer, setCustomer] = useState(chart.customerName);
  const [demandRate, setDemandRate] = useState(chart.customerDemandRate?.toString() ?? "");
  const [availMinutes, setAvailMinutes] = useState(chart.availableMinutesPerShift?.toString() ?? "450");
  const [shiftsPerDay, setShiftsPerDay] = useState(chart.chartShiftsPerDay?.toString() ?? "1");
  const [expandedSection, setExpandedSection] = useState<string | null>("chart");
  const [showAddProcess, setShowAddProcess] = useState(false);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [showAddInfoFlow, setShowAddInfoFlow] = useState(false);
  const [showAddMatFlow, setShowAddMatFlow] = useState(false);
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [newProc, setNewProc] = useState({
    name: "", operatorCount: "1", cycleTimeValue: "",
    changeoverTimeValue: "", uptimePercent: "", yieldPercent: "",
    wip: "", shiftsPerDay: "1", isBottleneck: false,
  });
  const [newInv, setNewInv] = useState({ label: "", quantity: "0", waitTimeValue: "" });
  const [newInfo, setNewInfo] = useState({ fromType: "CUSTOMER", toType: "PC", label: "", frequency: "", flowStyle: "ELECTRONIC", method: "", transmissionType: "ELECTRONIC" });
  const [newMat, setNewMat] = useState({ fromType: "SUPPLIER", toType: "CUSTOMER", label: "", flowType: "PUSH", deliveryFrequency: "", delFreqSelect: "", delFreqCustom: "" });
  const [newTimeline, setNewTimeline] = useState({ label: "", waitDays: "", processSec: "" });
  const [editingProc, setEditingProc] = useState<string | null>(null);
  const [editProcVals, setEditProcVals] = useState<Record<string, string>>({});
  const [editingMatFlow, setEditingMatFlow] = useState<string | null>(null);
  const [editMatVals, setEditMatVals] = useState<Record<string, string>>({});

  const toggleSection = (s: string) => {
    setExpandedSection(expandedSection === s ? null : s);
  };

  const handleSaveChart = () => {
    const parsedDemand = parseFloat(demandRate);
    const taktOpts = {
      customerDemandRate: demandRate && !isNaN(parsedDemand) ? parsedDemand : null,
      availableMinutesPerShift: parseFloat(availMinutes) || 450,
      chartShiftsPerDay: parseInt(shiftsPerDay) || 1,
    };
    onSaveChart(name, supplier, customer, taktOpts);
  };

  // Compute takt preview
  const taktPreview = useMemo(() => {
    const d = parseFloat(demandRate);
    const a = parseFloat(availMinutes) || 450;
    const s = parseInt(shiftsPerDay) || 1;
    if (d > 0) {
      const taktSec = (a * 60 * s) / d;
      return taktSec < 60 ? `${taktSec.toFixed(1)}s` : `${(taktSec / 60).toFixed(1)}min`;
    }
    return null;
  }, [demandRate, availMinutes, shiftsPerDay]);

  const handleAddProcess = () => {
    onAddProcess({
      name: newProc.name,
      operatorCount: Number(newProc.operatorCount) || 1,
      cycleTimeValue: newProc.cycleTimeValue ? Number(newProc.cycleTimeValue) : null,
      changeoverTimeValue: newProc.changeoverTimeValue ? Number(newProc.changeoverTimeValue) : null,
      uptimePercent: newProc.uptimePercent ? Number(newProc.uptimePercent) : null,
      yieldPercent: newProc.yieldPercent ? Number(newProc.yieldPercent) : null,
      wip: newProc.wip ? Number(newProc.wip) : null,
      shiftsPerDay: Number(newProc.shiftsPerDay) || 1,
      isBottleneck: newProc.isBottleneck,
    });
    setNewProc({ name: "", operatorCount: "1", cycleTimeValue: "", changeoverTimeValue: "", uptimePercent: "", yieldPercent: "", wip: "", shiftsPerDay: "1", isBottleneck: false });
    setShowAddProcess(false);
  };

  const handleUpdateProcess = (id: string) => {
    onUpdateProcess(id, {
      name: editProcVals[`name-${id}`] || "",
      operatorCount: Number(editProcVals[`ops-${id}`]) || 1,
      cycleTimeValue: editProcVals[`ct-${id}`] ? Number(editProcVals[`ct-${id}`]) : null,
      wip: editProcVals[`wip-${id}`] ? Number(editProcVals[`wip-${id}`]) : null,
      uptimePercent: editProcVals[`up-${id}`] ? Number(editProcVals[`up-${id}`]) : null,
      yieldPercent: editProcVals[`yl-${id}`] ? Number(editProcVals[`yl-${id}`]) : null,
      shiftsPerDay: editProcVals[`sh-${id}`] ? Number(editProcVals[`sh-${id}`]) : 1,
    });
    setEditingProc(null);
  };

  const handleAddInventory = () => {
    onAddInventory({
      label: newInv.label,
      quantity: Number(newInv.quantity) || 0,
      waitTimeValue: newInv.waitTimeValue ? Number(newInv.waitTimeValue) : null,
    });
    setNewInv({ label: "", quantity: "0", waitTimeValue: "" });
    setShowAddInventory(false);
  };

  const handleAddInfoFlow = () => {
    onAddInfoFlow({
      fromType: newInfo.fromType, toType: newInfo.toType,
      label: newInfo.label, frequency: newInfo.frequency,
      flowStyle: newInfo.flowStyle, method: newInfo.method,
      transmissionType: newInfo.transmissionType,
    });
    setNewInfo({ fromType: "CUSTOMER", toType: "PC", label: "", frequency: "", flowStyle: "ELECTRONIC", method: "", transmissionType: "" });
    setShowAddInfoFlow(false);
  };

  const handleAddMaterialFlow = () => {
    const delFreq = newMat.delFreqSelect === "CUSTOM"
      ? newMat.delFreqCustom
      : newMat.delFreqSelect;
    onAddMaterialFlow({
      fromType: newMat.fromType, toType: newMat.toType,
      label: newMat.label, flowType: newMat.flowType,
      deliveryFrequency: delFreq || "",
    });
    setNewMat({ fromType: "SUPPLIER", toType: "CUSTOMER", label: "", flowType: "PUSH", deliveryFrequency: "", delFreqSelect: "", delFreqCustom: "" });
    setShowAddMatFlow(false);
  };

  const handleUpdateMaterialFlow = (id: string) => {
    const flow = chart.materialFlows.find((f) => f.id === id);
    const delFreqSel = editMatVals[`delFreqSel-${id}`] ?? resolveDelFreqSelect(flow?.deliveryFrequency);
    const delFreq = delFreqSel === "CUSTOM"
      ? (editMatVals[`delFreqCustom-${id}`] ?? (
          flow?.deliveryFrequency && !(DELIVERY_FREQ_OPTIONS as readonly string[]).includes(flow.deliveryFrequency)
            ? flow.deliveryFrequency
            : ""
        ))
      : delFreqSel;
    onUpdateMaterialFlow(id, {
      fromType: editMatVals[`fromType-${id}`] || flow?.fromType || "",
      toType: editMatVals[`toType-${id}`] || flow?.toType || "",
      label: editMatVals[`label-${id}`] || "",
      flowType: editMatVals[`flowType-${id}`] || "PUSH",
      deliveryFrequency: delFreq || "",
    });
    setEditingMatFlow(null);
  };

  const handleAddTimeline = () => {
    onAddTimeline({
      label: newTimeline.label,
      waitTimeValue: newTimeline.waitDays ? Number(newTimeline.waitDays) : null,
      processTimeValue: newTimeline.processSec ? Number(newTimeline.processSec) : null,
    });
    setNewTimeline({ label: "", waitDays: "", processSec: "" });
    setShowAddTimeline(false);
  };

  return (
    <>
      <div className="absolute right-0 top-0 bottom-0 w-[400px] z-20 bg-background border-l border-border shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">Edit Chart</h3>
              <p className="text-[10px] text-muted-foreground truncate">{chart.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {chart.sourceMode === "LINKED" && onSyncFromLine && (
              <button type="button" onClick={onSyncFromLine}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15">
                <GitBranch className="h-3 w-3" /> Sync
              </button>
            )}
            <button type="button" onClick={handleSaveChart} disabled={saving}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-success/20 bg-success/10 text-success hover:bg-success/15 disabled:opacity-50">
              <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={onClose} className="text-muted-foreground/60 hover:text-muted-foreground ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto text-xs">
          {/* ═══ Chart Settings ═══ */}
          <SectionToggle label="Chart Settings" isOpen={expandedSection === "chart"} onClick={() => toggleSection("chart")} />
          {expandedSection === "chart" && (
            <div className="px-4 py-3 space-y-2.5 border-b border-border/50">
              <div>
                <label className={LABEL}>Chart Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
              </div>
              {chart.sourceMode === "LINKED" && (
                <div className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 px-2 py-1.5 rounded-sm border border-primary/20">
                  <GitBranch className="h-3 w-3 shrink-0" />
                  <span>Linked to line — supplier/customer editable</span>
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={LABEL}>Supplier</label>
                  <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className={FIELD} />
                </div>
                <div className="flex-1">
                  <label className={LABEL}>Customer</label>
                  <input value={customer} onChange={(e) => setCustomer(e.target.value)} className={FIELD} />
                </div>
              </div>

              {/* ── Demand / Takt section ── */}
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Demand &amp; Takt</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={LABEL}>Demand Rate (units/day)</label>
                    <input type="number" min="0" step="1"
                      value={demandRate}
                      onChange={(e) => setDemandRate(e.target.value)}
                      className={FIELD} placeholder="e.g. 500" />
                  </div>
                  <div className="w-20">
                    <label className={LABEL}>Shifts</label>
                    <input type="number" min="1" max="5"
                      value={shiftsPerDay}
                      onChange={(e) => setShiftsPerDay(e.target.value)}
                      className={FIELD} />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Available Minutes / Shift</label>
                  <input type="number" min="60" max="600"
                    value={availMinutes}
                    onChange={(e) => setAvailMinutes(e.target.value)}
                    className={FIELD} placeholder="450" />
                </div>
                {taktPreview && (
                  <div className="flex items-center gap-1.5 mt-1 px-2 py-1.5 bg-primary/10 rounded-sm border border-primary/20">
                    <span className="text-[10px] text-primary font-bold uppercase">Takt:</span>
                    <span className="text-[12px] text-primary font-extrabold tabular-nums">{taktPreview}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ Processes ═══ */}
          <SectionToggle label={`Processes (${chart.processes.length})`} isOpen={expandedSection === "processes"} onClick={() => toggleSection("processes")} />
          {expandedSection === "processes" && (
            <div className="border-b border-border/50">
              {chart.processes.length === 0 && !showAddProcess && (
                <div className="px-4 py-3 text-[11px] text-muted-foreground/60 text-center">No processes yet</div>
              )}
              {chart.processes.map((p) => (
                <div key={p.id} className="px-4 py-2.5 border-b border-border/30 hover:bg-muted">
                  {editingProc === p.id ? (
                    <div className="space-y-1.5">
                      <input value={editProcVals[`name-${p.id}`] ?? p.name}
                        onChange={(e) => setEditProcVals((v) => ({ ...v, [`name-${p.id}`]: e.target.value }))}
                        className={FIELD} placeholder="Name" />
                      <div className="flex gap-2">
                        <input type="number" value={editProcVals[`ops-${p.id}`] ?? p.operatorCount}
                          onChange={(e) => setEditProcVals((v) => ({ ...v, [`ops-${p.id}`]: e.target.value }))}
                          className="w-16 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Ops" />
                        <input type="number" value={editProcVals[`ct-${p.id}`] ?? p.cycleTimeValue ?? ""}
                          onChange={(e) => setEditProcVals((v) => ({ ...v, [`ct-${p.id}`]: e.target.value }))}
                          className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="C/T" />
                        <input type="number" value={editProcVals[`wip-${p.id}`] ?? p.wip ?? ""}
                          onChange={(e) => setEditProcVals((v) => ({ ...v, [`wip-${p.id}`]: e.target.value }))}
                          className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="WIP" />
                      </div>
                      <div className="flex gap-2">
                        <input type="number" value={editProcVals[`up-${p.id}`] ?? p.uptimePercent ?? ""}
                          onChange={(e) => setEditProcVals((v) => ({ ...v, [`up-${p.id}`]: e.target.value }))}
                          className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Uptime %" />
                        <input type="number" value={editProcVals[`yl-${p.id}`] ?? p.yieldPercent ?? ""}
                          onChange={(e) => setEditProcVals((v) => ({ ...v, [`yl-${p.id}`]: e.target.value }))}
                          className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Yield %" />
                        <input type="number" value={editProcVals[`sh-${p.id}`] ?? p.shiftsPerDay ?? ""}
                          onChange={(e) => setEditProcVals((v) => ({ ...v, [`sh-${p.id}`]: e.target.value }))}
                          className="w-16 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Shifts" />
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <button type="button" onClick={() => handleUpdateProcess(p.id)}
                          className="px-2 py-0.5 text-[10px] font-medium rounded bg-accent/10 text-accent-foreground border border-accent/20 hover:bg-primary/15">Save</button>
                        <button type="button" onClick={() => setEditingProc(null)}
                          className="px-2 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground border border-border hover:bg-muted">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.operatorCount} op{p.operatorCount !== 1 ? "s" : ""}
                          {p.cycleTimeValue != null ? ` · CT: ${p.cycleTimeValue}s` : ""}
                          {p.wip != null ? ` · WIP: ${p.wip}` : ""}
                          · Shifts: {p.shiftsPerDay ?? 1}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 ml-2">
                        <button type="button" onClick={() => { setEditingProc(p.id); setEditProcVals({}); }}
                          className="p-0.5 text-muted-foreground/60 hover:text-accent-foreground">
                          <Settings className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => onDeleteProcess(p.id)}
                          className="p-0.5 text-muted-foreground/60 hover:text-danger">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="px-4 py-2.5">
                {showAddProcess ? (
                  <AddForm onAdd={handleAddProcess} onCancel={() => setShowAddProcess(false)}
                    fields={
                      <div className="space-y-1.5">
                        <input value={newProc.name} onChange={(e) => setNewProc((v) => ({ ...v, name: e.target.value }))}
                          className={FIELD} placeholder="Process name" />
                        <div className="flex gap-2">
                          <input type="number" value={newProc.operatorCount} onChange={(e) => setNewProc((v) => ({ ...v, operatorCount: e.target.value }))}
                            className="w-14 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Ops" />
                          <input type="number" value={newProc.cycleTimeValue} onChange={(e) => setNewProc((v) => ({ ...v, cycleTimeValue: e.target.value }))}
                            className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="C/T (sec)" />
                          <input type="number" value={newProc.changeoverTimeValue} onChange={(e) => setNewProc((v) => ({ ...v, changeoverTimeValue: e.target.value }))}
                            className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="C/O (sec)" />
                        </div>
                        <div className="flex gap-2">
                          <input type="number" value={newProc.uptimePercent} onChange={(e) => setNewProc((v) => ({ ...v, uptimePercent: e.target.value }))}
                            className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Uptime %" />
                          <input type="number" value={newProc.yieldPercent} onChange={(e) => setNewProc((v) => ({ ...v, yieldPercent: e.target.value }))}
                            className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Yield %" />
                          <input type="number" value={newProc.wip} onChange={(e) => setNewProc((v) => ({ ...v, wip: e.target.value }))}
                            className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="WIP" />
                          <input type="number" min="1" value={newProc.shiftsPerDay} onChange={(e) => setNewProc((v) => ({ ...v, shiftsPerDay: e.target.value }))}
                            className="w-14 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Shifts" />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={newProc.isBottleneck} onChange={(e) => setNewProc((v) => ({ ...v, isBottleneck: e.target.checked }))}
                            className="h-3.5 w-3.5 rounded border-border text-warning focus:ring-amber-500" />
                          <span className="text-[10px] font-medium text-muted-foreground">Bottleneck</span>
                        </label>
                      </div>
                    } />
                ) : (
                  <AddButton label="Add Process" onClick={() => setShowAddProcess(true)} />
                )}
              </div>
            </div>
          )}

          {/* ═══ Inventories ═══ */}
          <SectionToggle label={`Inventories (${chart.inventories.length})`} isOpen={expandedSection === "inventories"} onClick={() => toggleSection("inventories")} />
          {expandedSection === "inventories" && (
            <div className="border-b border-border/50">
              {chart.inventories.length === 0 && !showAddInventory && (
                <div className="px-4 py-3 text-[11px] text-muted-foreground/60 text-center">No inventory points</div>
              )}
              {chart.inventories.map((inv) => (
                <ListItem key={inv.id} label={inv.label || "Inventory"}
                  meta={`Qty: ${inv.quantity}${inv.waitTimeValue != null ? ` · ${inv.waitTimeValue} ${inv.waitTimeUnit}` : ""}`}
                  onDelete={() => onDeleteInventory(inv.id)} />
              ))}
              <div className="px-4 py-2.5">
                {showAddInventory ? (
                  <AddForm onAdd={handleAddInventory} onCancel={() => setShowAddInventory(false)}
                    fields={
                      <div className="space-y-1.5">
                        <input value={newInv.label} onChange={(e) => setNewInv((v) => ({ ...v, label: e.target.value }))}
                          className={FIELD} placeholder="Label" />
                        <div className="flex gap-2">
                          <input type="number" value={newInv.quantity} onChange={(e) => setNewInv((v) => ({ ...v, quantity: e.target.value }))}
                            className="w-20 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Qty" />
                          <input type="number" value={newInv.waitTimeValue} onChange={(e) => setNewInv((v) => ({ ...v, waitTimeValue: e.target.value }))}
                            className="w-24 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Wait time" />
                        </div>
                      </div>
                    } />
                ) : (
                  <AddButton label="Add Inventory Point" onClick={() => setShowAddInventory(true)} />
                )}
              </div>
            </div>
          )}

          {/* ═══ Information Flows ═══ */}
          <SectionToggle icon={<Info className="h-3 w-3" />}
            label={`Info Flows (${chart.informationFlows.length})`}
            isOpen={expandedSection === "infoflows"} onClick={() => toggleSection("infoflows")} />
          {expandedSection === "infoflows" && (
            <div className="border-b border-border/50">
              {/* Kanban/Pull validation warning */}
              {chart.productionControlTitle && chart.controlMethod?.toLowerCase().includes('kanban') &&
                !chart.informationFlows.some(f => f.flowStyle === 'KANBAN') && (
                <div className="mx-3 mt-2 mb-1 px-2.5 py-1.5 rounded-sm border border-warning/20 bg-warning/10">
                  <p className="text-[10px] font-semibold text-warning">⚠ Kanban/Pull mismatch</p>
                  <p className="text-[9px] text-warning mt-0.5 leading-relaxed">
                    Production Control says Kanban/Pull, but no Kanban/Pull information flow is defined.
                  </p>
                </div>
              )}
              {chart.informationFlows.length === 0 && !showAddInfoFlow && (
                <div className="px-4 py-3 text-[11px] text-muted-foreground/60 text-center">No information flows</div>
              )}
              {chart.informationFlows.map((f) => {
                const styleColors: Record<string, string> = {
                  MANUAL: '#334155',
                  ELECTRONIC: '#2563eb',
                  KANBAN: '#7c3aed',
                  SCHEDULE: '#475569',
                };
                const styleLabels: Record<string, string> = {
                  MANUAL: 'Manual',
                  ELECTRONIC: 'EDI',
                  KANBAN: 'Kanban',
                  SCHEDULE: 'Schedule',
                };
                const styleColor = styleColors[f.flowStyle] || '#94a3b8';
                const styleLabel = styleLabels[f.flowStyle] || f.flowStyle;
                return (
                  <div key={f.id} className="flex items-center justify-between px-4 py-2 border-b border-border/30 hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0`} style={{ backgroundColor: styleColor }} />
                        <p className="text-[12px] font-medium text-foreground truncate">
                          {f.fromType === 'CUSTOMER' ? 'Customer' : f.fromType === 'PC' ? 'Prod. Control' : f.fromType === 'SUPPLIER' ? 'Supplier' : f.fromType} → {f.toType === 'PC' ? 'Prod. Control' : f.toType === 'CUSTOMER' ? 'Customer' : f.toType === 'SUPPLIER' ? 'Supplier' : f.toType}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        <span style={{ color: styleColor }} className="font-semibold">{styleLabel}</span>
                        {f.label ? ` · ${f.label}` : ''}
                        {f.frequency ? ` · ${f.frequency}` : ''}
                        {f.method ? ` · ${f.method}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={() => onDeleteInfoFlow(f.id)}
                      className="p-0.5 text-muted-foreground/60 hover:text-danger shrink-0 ml-2">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              <div className="px-4 py-2.5">
                {showAddInfoFlow ? (
                  <AddForm onAdd={handleAddInfoFlow} onCancel={() => setShowAddInfoFlow(false)}
                    fields={
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <select value={newInfo.fromType} onChange={(e) => setNewInfo((v) => ({ ...v, fromType: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                            <option value="CUSTOMER">Customer</option>
                            <option value="PC">Production Control</option>
                            <option value="SUPPLIER">Supplier</option>
                          </select>
                          <span className="text-muted-foreground/60 self-center">→</span>
                          <select value={newInfo.toType} onChange={(e) => setNewInfo((v) => ({ ...v, toType: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                            <option value="PC">Production Control</option>
                            <option value="SUPPLIER">Supplier</option>
                            <option value="CUSTOMER">Customer</option>
                          </select>
                        </div>
                        <input value={newInfo.label} onChange={(e) => setNewInfo((v) => ({ ...v, label: e.target.value }))}
                          className={FIELD} placeholder="Label (e.g. Customer orders, Release schedule)" />
                        <div className="flex gap-2">
                          <input value={newInfo.frequency} onChange={(e) => setNewInfo((v) => ({ ...v, frequency: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Frequency (e.g. Daily, Weekly)" />
                          <input value={newInfo.method} onChange={(e) => setNewInfo((v) => ({ ...v, method: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Method (e.g. EDI, Email)" />
                        </div>
                        <div className="flex gap-2">
                          <select value={newInfo.flowStyle} onChange={(e) => setNewInfo((v) => ({ ...v, flowStyle: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                            <option value="ELECTRONIC">Electronic / EDI</option>
                            <option value="MANUAL">Manual</option>
                            <option value="KANBAN">Kanban / Pull signal</option>
                            <option value="SCHEDULE">Production schedule</option>
                          </select>
                          <select value={newInfo.transmissionType} onChange={(e) => setNewInfo((v) => ({ ...v, transmissionType: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                            <option value="ELECTRONIC">Electronic</option>
                            <option value="MANUAL">Manual</option>
                            <option value="NONE">None</option>
                          </select>
                        </div>
                      </div>
                    } />
                ) : (
                  <AddButton label="Add Info Flow" onClick={() => setShowAddInfoFlow(true)} />
                )}
              </div>
            </div>
          )}

          {/* ═══ Material Flows ═══ */}
          <SectionToggle icon={<Truck className="h-3 w-3" />}
            label={`Material Flows (${chart.materialFlows.length})`}
            isOpen={expandedSection === "matflows"} onClick={() => toggleSection("matflows")} />
          {expandedSection === "matflows" && (
            <div className="border-b border-border/50">
              {chart.materialFlows.length === 0 && !showAddMatFlow && (
                <div className="px-4 py-3 text-[11px] text-muted-foreground/60 text-center">No material flows</div>
              )}
              {chart.materialFlows.map((f) => (
                editingMatFlow === f.id ? (
                  <div key={f.id} className="px-4 py-2.5 border-b border-border/30 hover:bg-muted">
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <select value={editMatVals[`fromType-${f.id}`] ?? f.fromType}
                          onChange={(e) => setEditMatVals((v) => ({ ...v, [`fromType-${f.id}`]: e.target.value }))}
                          className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                          <option value="SUPPLIER">Supplier</option>
                          <option value="CUSTOMER">Customer</option>
                          <option value="PROCESS">Process</option>
                          <option value="INVENTORY">Inventory</option>
                        </select>
                        <span className="text-muted-foreground/60 self-center">→</span>
                        <select value={editMatVals[`toType-${f.id}`] ?? f.toType}
                          onChange={(e) => setEditMatVals((v) => ({ ...v, [`toType-${f.id}`]: e.target.value }))}
                          className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                          <option value="CUSTOMER">Customer</option>
                          <option value="PROCESS">Process</option>
                          <option value="INVENTORY">Inventory</option>
                          <option value="SUPPLIER">Supplier</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input value={editMatVals[`label-${f.id}`] ?? f.label}
                          onChange={(e) => setEditMatVals((v) => ({ ...v, [`label-${f.id}`]: e.target.value }))}
                          className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Label" />
                        <select value={editMatVals[`flowType-${f.id}`] ?? f.flowType}
                          onChange={(e) => setEditMatVals((v) => ({ ...v, [`flowType-${f.id}`]: e.target.value }))}
                          className="w-28 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                          <option value="PUSH">Push</option>
                          <option value="PULL">Pull</option>
                          <option value="FIFO">FIFO</option>
                          <option value="KANBAN">Kanban</option>
                          <option value="SUPERMARKET">Supermarket</option>
                          <option value="SHIPMENT">Shipment</option>
                        </select>
                      </div>
                      <select value={editMatVals[`delFreqSel-${f.id}`] ?? resolveDelFreqSelect(f.deliveryFrequency)}
                        onChange={(e) => setEditMatVals((v) => ({ ...v, [`delFreqSel-${f.id}`]: e.target.value }))}
                        className={FIELD}>
                        <option value="">— No frequency</option>
                        {DELIVERY_FREQ_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="CUSTOM">Custom...</option>
                      </select>
                      {(editMatVals[`delFreqSel-${f.id}`] ?? resolveDelFreqSelect(f.deliveryFrequency)) === "CUSTOM" && (
                        <input value={editMatVals[`delFreqCustom-${f.id}`] ?? (
                          DELIVERY_FREQ_OPTIONS.includes(f.deliveryFrequency as DelFreqPreset) ? "" : f.deliveryFrequency || ""
                        )}
                          onChange={(e) => setEditMatVals((v) => ({ ...v, [`delFreqCustom-${f.id}`]: e.target.value }))}
                          className={FIELD} placeholder="Type custom frequency" />
                      )}
                      <div className="flex gap-1.5 pt-1">
                        <button type="button" onClick={() => handleUpdateMaterialFlow(f.id)}
                          className="px-2 py-0.5 text-[10px] font-medium rounded bg-accent/10 text-accent-foreground border border-accent/20 hover:bg-primary/15">Save</button>
                        <button type="button" onClick={() => setEditingMatFlow(null)}
                          className="px-2 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground border border-border hover:bg-muted">Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={f.id} className="flex items-center justify-between px-4 py-2 border-b border-border/30 hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-foreground truncate">{f.fromType} → {f.toType}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {f.flowType}{f.label ? ` · ${f.label}` : ""}{f.deliveryFrequency ? ` · Freq: ${f.deliveryFrequency}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 ml-2">
                      <button type="button" onClick={() => { setEditingMatFlow(f.id); setEditMatVals({}); }}
                        className="p-0.5 text-muted-foreground/60 hover:text-accent-foreground">
                        <Settings className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => onDeleteMaterialFlow(f.id)}
                        className="p-0.5 text-muted-foreground/60 hover:text-danger">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              ))}
              <div className="px-4 py-2.5">
                {showAddMatFlow ? (
                  <AddForm onAdd={handleAddMaterialFlow} onCancel={() => setShowAddMatFlow(false)}
                    fields={
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <select value={newMat.fromType} onChange={(e) => setNewMat((v) => ({ ...v, fromType: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                            <option value="SUPPLIER">Supplier</option>
                            <option value="CUSTOMER">Customer</option>
                            <option value="PROCESS">Process</option>
                            <option value="INVENTORY">Inventory</option>
                          </select>
                          <span className="text-muted-foreground/60 self-center">→</span>
                          <select value={newMat.toType} onChange={(e) => setNewMat((v) => ({ ...v, toType: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                            <option value="CUSTOMER">Customer</option>
                            <option value="PROCESS">Process</option>
                            <option value="INVENTORY">Inventory</option>
                            <option value="SUPPLIER">Supplier</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <input value={newMat.label} onChange={(e) => setNewMat((v) => ({ ...v, label: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Label (e.g. Kanban = 40)" />
                          <select value={newMat.flowType} onChange={(e) => setNewMat((v) => ({ ...v, flowType: e.target.value }))}
                            className="w-28 h-8 border border-border bg-background text-sm px-2 rounded-sm">
                            <option value="PUSH">Push</option>
                            <option value="PULL">Pull</option>
                            <option value="FIFO">FIFO</option>
                            <option value="KANBAN">Kanban</option>
                            <option value="SUPERMARKET">Supermarket</option>
                            <option value="SHIPMENT">Shipment</option>
                          </select>
                        </div>
                        <select value={newMat.delFreqSelect}
                          onChange={(e) => setNewMat((v) => ({ ...v, delFreqSelect: e.target.value }))}
                          className={FIELD}>
                          <option value="">— No frequency</option>
                          {DELIVERY_FREQ_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="CUSTOM">Custom...</option>
                        </select>
                        {newMat.delFreqSelect === "CUSTOM" && (
                          <input value={newMat.delFreqCustom}
                            onChange={(e) => setNewMat((v) => ({ ...v, delFreqCustom: e.target.value }))}
                            className={FIELD} placeholder="Type custom frequency" />
                        )}
                      </div>
                    } />
                ) : (
                  <AddButton label="Add Material Flow" onClick={() => setShowAddMatFlow(true)} />
                )}
              </div>
            </div>
          )}

          {/* ═══ Timeline Segments ═══ */}
          <SectionToggle icon={<Clock className="h-3 w-3" />}
            label={`Timeline (${chart.timelineSegments.length})`}
            isOpen={expandedSection === "timeline"} onClick={() => toggleSection("timeline")} />
          {expandedSection === "timeline" && (
            <div className="border-b border-border/50">
              {chart.timelineSegments.length === 0 && !showAddTimeline && (
                <div className="px-4 py-3 text-[11px] text-muted-foreground/60 text-center">No timeline segments</div>
              )}
              {chart.timelineSegments.map((seg) => (
                <ListItem key={seg.id}
                  label={seg.label || `Segment ${seg.sequence}`}
                  meta={`Wait: ${seg.waitTimeValue ?? "—"} ${seg.waitTimeUnit} · Proc: ${seg.processTimeValue ?? "—"} ${seg.processTimeUnit === "sec" ? "s" : seg.processTimeUnit}`}
                  onDelete={() => onDeleteTimeline(seg.id)} />
              ))}
              <div className="px-4 py-2.5">
                {showAddTimeline ? (
                  <AddForm onAdd={handleAddTimeline} onCancel={() => setShowAddTimeline(false)}
                    fields={
                      <div className="space-y-1.5">
                        <input value={newTimeline.label} onChange={(e) => setNewTimeline((v) => ({ ...v, label: e.target.value }))}
                          className={FIELD} placeholder="Process label" />
                        <div className="flex gap-2">
                          <input type="number" value={newTimeline.waitDays} onChange={(e) => setNewTimeline((v) => ({ ...v, waitDays: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Wait time (days)" />
                          <input type="number" value={newTimeline.processSec} onChange={(e) => setNewTimeline((v) => ({ ...v, processSec: e.target.value }))}
                            className="flex-1 h-8 border border-border bg-background text-sm px-2 rounded-sm" placeholder="Process time (sec)" />
                        </div>
                      </div>
                    } />
                ) : (
                  <AddButton label="Add Timeline Segment" onClick={() => setShowAddTimeline(true)} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-muted px-4 py-2 flex flex-col gap-2 text-[10px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{chart.sourceMode === "LINKED" ? "Linked to production line" : "Manual chart"}</span>
            <span>
              {chart.processes.length} proc · {chart.inventories.length} inv · {chart.informationFlows.length} info · {chart.materialFlows.length} mat · {chart.timelineSegments.length} tl
            </span>
          </div>
          {onDeleteChart && (
            <button type="button" onClick={onDeleteChart}
              className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-medium rounded border border-danger/20 bg-danger/10 text-danger hover:bg-danger/15 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
              Delete Chart
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Subcomponents ── */

function SectionToggle({ label, isOpen, onClick, icon }: {
  label: string; isOpen: boolean; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-2 text-[11px] font-semibold text-muted-foreground bg-muted hover:bg-muted border-b border-border/50">
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
    </button>
  );
}

function ListItem({ label, meta, onDelete }: {
  label: string; meta: string; onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 hover:bg-muted">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{meta}</p>
      </div>
      <button type="button" onClick={onDelete}
        className="p-0.5 text-muted-foreground/60 hover:text-danger shrink-0 ml-2">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1 text-[10px] font-medium text-accent-foreground hover:text-accent-foreground">
      <Plus className="h-3 w-3" /> {label}
    </button>
  );
}

function AddForm({ onAdd, onCancel, fields }: {
  onAdd: () => void; onCancel: () => void; fields: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 border border-border rounded-sm p-2 bg-muted">
      {fields}
      <div className="flex gap-1.5 pt-0.5">
        <button type="button" onClick={onAdd}
          className="px-2 py-0.5 text-[10px] font-medium rounded bg-accent/10 text-accent-foreground border border-accent/20 hover:bg-primary/15">Add</button>
        <button type="button" onClick={onCancel}
          className="px-2 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground border border-border hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}
