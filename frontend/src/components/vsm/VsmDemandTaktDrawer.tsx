import { useState, useEffect, useCallback } from "react";
import { X, AlertTriangle, Save, Gauge, Clock, Calendar } from "lucide-react";

interface DemandTaktData {
  customerDemandRate?: number | null;
  customerDemandUnit?: string;
  customerDemandPeriod?: string;
  availableMinutesPerShift?: number;
  breakTimePerShift?: number;
  plannedDowntimePerShift?: number;
  chartShiftsPerDay?: number;
  workingDaysPerWeek?: number;
  taktTimeSeconds?: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  chartId: string;
  initialData: DemandTaktData | null;
  onSave: (chartId: string, input: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
}

const FIELD = "w-full h-8 border border-slate-300 bg-white text-sm px-2 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-shadow";
const LABEL = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

/** ── Takt Gauge: visual radial gauge showing takt time ── */
function TaktGauge({ taktSec, netAvailMin, demandPerDay }: {
  taktSec: number | null;
  netAvailMin: number;
  demandPerDay: number | null;
}) {
  const gaugeValue = taktSec ? Math.min(1, taktSec / 120) : 0;
  const strokeDash = gaugeValue * 283; // 283 = circumference of r=45 circle
  const isHealthy = taktSec != null && taktSec >= 30 && taktSec <= 120;
  const isWarning = taktSec != null && (taktSec < 30 || taktSec > 120);
  const strokeColor = isHealthy ? "#16a34a" : isWarning ? "#f59e0b" : "#94a3b8";
  const bgColor = isHealthy ? "#dcfce7" : isWarning ? "#fef3c7" : "#f1f5f9";

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white">
      <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke={bgColor} strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none"
            stroke={strokeColor} strokeWidth="8"
            strokeDasharray={`${strokeDash} 283`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-extrabold tabular-nums text-slate-800 leading-none">
            {taktSec ? (taktSec < 60 ? taktSec.toFixed(0) : (taktSec / 60).toFixed(1)) : "—"}
          </span>
          <span className="text-[9px] font-semibold text-slate-500 mt-0.5">
            {taktSec && taktSec < 60 ? "sec/unit" : "min/unit"}
          </span>
        </div>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-semibold text-slate-700">Takt Time</p>
        <p className={`text-[15px] font-bold tabular-nums ${
          isHealthy ? "text-emerald-700" : isWarning ? "text-amber-700" : "text-slate-500"
        }`}>
          {taktSec != null
            ? taktSec < 60 ? `${taktSec.toFixed(1)}s / unit` : `${(taktSec / 60).toFixed(1)}min / unit`
            : "Not calculated"}
        </p>
        <p className="text-[10px] text-slate-500">
          {demandPerDay != null
            ? `${demandPerDay.toFixed(0)} units/day · ${netAvailMin > 0 ? `${Math.floor(netAvailMin / 60)}h ${netAvailMin % 60}m net` : "—"}`
            : "Set demand and work time to calculate"}
        </p>
      </div>
    </div>
  );
}

/** ── Summary stat card ── */
function StatCard({ icon, label, value, tone = "default" }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const tones = {
    default: "text-slate-800 bg-slate-50 border-slate-200",
    good: "text-emerald-800 bg-emerald-50 border-emerald-200",
    warn: "text-amber-800 bg-amber-50 border-amber-200",
    bad: "text-red-800 bg-red-50 border-red-200",
  };
  return (
    <div className={`rounded-lg border p-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-slate-400">{icon}</span>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[13px] font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function VsmDemandTaktDrawer({ open, onClose, chartId, initialData, onSave }: Props) {
  const [demandQty, setDemandQty] = useState("");
  const [demandUnit, setDemandUnit] = useState("units");
  const [demandPeriod, setDemandPeriod] = useState("day");
  const [availWorkTime, setAvailWorkTime] = useState("450");
  const [breakTime, setBreakTime] = useState("0");
  const [downtime, setDowntime] = useState("0");
  const [shifts, setShifts] = useState("1");
  const [workDays, setWorkDays] = useState("5");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Initialize from chart data
  useEffect(() => {
    if (!initialData) return;
    setDemandQty(initialData.customerDemandRate?.toString() ?? "");
    setDemandUnit(initialData.customerDemandUnit || "units");
    setDemandPeriod(initialData.customerDemandPeriod || "day");
    setAvailWorkTime(initialData.availableMinutesPerShift?.toString() ?? "450");
    setBreakTime(initialData.breakTimePerShift?.toString() ?? "0");
    setDowntime(initialData.plannedDowntimePerShift?.toString() ?? "0");
    setShifts(initialData.chartShiftsPerDay?.toString() ?? "1");
    setWorkDays(initialData.workingDaysPerWeek?.toString() ?? "5");
    setSaveResult(null);
    setErrors([]);
    setShowResults(false);
  }, [initialData, open]);

  // Computed values
  const availMin = parseFloat(availWorkTime) || 0;
  const breakMin = parseFloat(breakTime) || 0;
  const downMin = parseFloat(downtime) || 0;
  const netAvail = Math.max(0, availMin - breakMin - downMin);
  const shiftsNum = parseInt(shifts) || 1;
  const availPerDay = netAvail * shiftsNum;
  const availDisplay = availPerDay > 0
    ? `${Math.floor(availPerDay / 60)}h ${availPerDay % 60}m`
    : "—";

  const dQty = parseFloat(demandQty) || 0;
  const periodDays = demandPeriod === "week" ? (parseInt(workDays) || 5) : demandPeriod === "month" ? (parseInt(workDays) || 5) * 4 : 1;
  const demandPerDay = dQty > 0 && periodDays > 0 ? dQty / periodDays : null;

  const taktSec = demandPerDay && demandPerDay > 0 && availPerDay > 0
    ? (availPerDay * 60) / demandPerDay
    : null;
  const taktDisplay = taktSec && taktSec > 0
    ? taktSec < 60 ? `${taktSec.toFixed(1)}s/unit` : `${(taktSec / 60).toFixed(1)}min/unit`
    : "—";

  const netAvailDisplay = netAvail > 0
    ? `${Math.floor(netAvail / 60)}h ${netAvail % 60}m`
    : "—";

  // Auto-show results when data is entered
  useEffect(() => {
    if (dQty > 0 && netAvail > 0) {
      setShowResults(true);
    }
  }, [dQty, netAvail]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setErrors([]);
    try {
      const input: Record<string, unknown> = {
        customerDemandQuantity: dQty > 0 ? dQty : null,
        customerDemandUnit: demandUnit,
        customerDemandPeriod: demandPeriod,
        availableWorkTimePerShift: availWorkTime ? parseFloat(availWorkTime) : null,
        breakTimePerShift: parseFloat(breakTime) || 0,
        plannedDowntimePerShift: parseFloat(downtime) || 0,
        shiftsPerDay: parseInt(shifts) || 1,
        workingDaysPerWeek: parseInt(workDays) || 5,
      };
      const result = await onSave(chartId, input);
      if (result) {
        setSaveResult(result);
        if (result.errors && Array.isArray(result.errors)) {
          setErrors(result.errors as string[]);
        }
      }
    } catch {
      setErrors(["Save failed — unexpected error"]);
    } finally {
      setSaving(false);
    }
  }, [chartId, dQty, demandUnit, demandPeriod, availWorkTime, breakTime, downtime, shifts, workDays, onSave]);

  if (!open) return null;

  const taktStatus = saveResult?.taktStatus as string | undefined;
  const demandSummary = saveResult?.demandSummary as string | undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-200">
              <Gauge className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Demand &amp; Takt</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-[13px]">

          {/* Takt gauge — always visible when enough data */}
          {showResults && (
            <div className="animate-fade-in">
              <TaktGauge taktSec={taktSec} netAvailMin={netAvail} demandPerDay={demandPerDay} />
            </div>
          )}

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg space-y-0.5 animate-slide-down">
              {errors.map((e, i) => (
                <p key={i} className="text-[12px] text-red-700 font-medium flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                  {e}
                </p>
              ))}
            </div>
          )}

          {/* Save confirmation */}
          {saveResult && !errors.length && (
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg animate-slide-down">
              <p className="text-[12px] text-emerald-700 font-semibold flex items-center gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Saved — {taktStatus === "ok" ? `Takt: ${saveResult.taktTimeDisplay as string}` : taktStatus === "missing_demand" ? "Demand not set" : "Takt unavailable"}
              </p>
            </div>
          )}

          {/* ── Customer Demand ── */}
          <fieldset>
            <legend className={LABEL + " mb-2 flex items-center gap-1.5"}>
              <Clock className="h-3 w-3 text-slate-400" />
              Customer Demand
            </legend>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-[10px] text-slate-400">Quantity</label>
                <input type="number" min="0" step="1" value={demandQty}
                  onChange={(e) => setDemandQty(e.target.value)}
                  className={FIELD} placeholder="e.g. 500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Unit</label>
                <select value={demandUnit} onChange={(e) => setDemandUnit(e.target.value)}
                  className={FIELD}>
                  <option value="units">units</option>
                  <option value="pieces">pieces</option>
                  <option value="kg">kg</option>
                  <option value="liters">liters</option>
                  <option value="boxes">boxes</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Period</label>
                <select value={demandPeriod} onChange={(e) => setDemandPeriod(e.target.value)}
                  className={FIELD}>
                  <option value="day">per day</option>
                  <option value="shift">per shift</option>
                  <option value="week">per week</option>
                  <option value="month">per month</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── Available Work Time ── */}
          <fieldset>
            <legend className={LABEL + " mb-2 flex items-center gap-1.5"}>
              <Calendar className="h-3 w-3 text-slate-400" />
              Work Time per Shift (minutes)
            </legend>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Available</label>
                <input type="number" min="0" step="5" value={availWorkTime}
                  onChange={(e) => setAvailWorkTime(e.target.value)}
                  className={FIELD} placeholder="450" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Break</label>
                <input type="number" min="0" step="5" value={breakTime}
                  onChange={(e) => setBreakTime(e.target.value)}
                  className={FIELD} placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Downtime</label>
                <input type="number" min="0" step="5" value={downtime}
                  onChange={(e) => setDowntime(e.target.value)}
                  className={FIELD} placeholder="0" />
              </div>
            </div>
          </fieldset>

          {/* ── Schedule ── */}
          <fieldset>
            <legend className={LABEL + " mb-2 flex items-center gap-1.5"}>
              <Clock className="h-3 w-3 text-slate-400" />
              Schedule
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Shifts / Day</label>
                <input type="number" min="1" max="5" value={shifts}
                  onChange={(e) => setShifts(e.target.value)}
                  className={FIELD} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Work Days / Week</label>
                <input type="number" min="1" max="7" value={workDays}
                  onChange={(e) => setWorkDays(e.target.value)}
                  className={FIELD} />
              </div>
            </div>
          </fieldset>

          {/* ── Calculated Results ── */}
          <div className={`transition-all duration-300 ${showResults ? "opacity-100" : "opacity-50"}`}>
            <fieldset>
              <legend className={LABEL + " mb-2"}>Calculated Results</legend>
              <div className="grid grid-cols-2 gap-2">
                <StatCard icon={<Clock className="h-3 w-3" />} label="Net/Shift" value={netAvailDisplay} />
                <StatCard icon={<Calendar className="h-3 w-3" />} label="Available/Day" value={availDisplay} />
                <StatCard icon={<Gauge className="h-3 w-3" />} label="Demand/Day"
                  value={demandPerDay != null ? `${demandPerDay.toFixed(0)} ${demandUnit}` : "—"}
                  tone={demandPerDay != null ? "good" : "warn"} />
                <StatCard icon={<Gauge className="h-3 w-3" />} label="Takt Time"
                  value={taktDisplay}
                  tone={taktSec != null && taktSec >= 30 ? "good" : taktSec != null ? "warn" : "default"} />
              </div>
            </fieldset>
          </div>

          {/* ── Last Save Summary ── */}
          {saveResult && !errors.length && (
            <div className="text-[11px] text-slate-400 space-y-0.5 px-1 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Save</p>
              <p>Net work time: {saveResult.availableProductionTimePerShift as string || netAvailDisplay}</p>
              <p>Demand: {demandSummary || (demandPerDay != null ? `${demandPerDay.toFixed(0)}/${demandPeriod}` : "—")}</p>
              <p>Takt: {saveResult.taktTimeDisplay as string || taktDisplay}</p>
              <p>Status: {taktStatus === "ok" ? "✓ Calculated" : taktStatus === "missing_demand" ? "⚠ Demand not set" : taktStatus === "missing_available_time" ? "⚠ Time not set" : "—"}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all duration-150 shadow-sm active:scale-[0.98]">
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
