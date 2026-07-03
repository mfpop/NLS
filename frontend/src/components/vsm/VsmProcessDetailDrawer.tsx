import { useState } from "react";
import {
  X, AlertTriangle, Clock, Users, Package, Percent, Activity,
  Lightbulb, TrendingUp, ChevronRight, BarChart3, Gauge,
} from "lucide-react";
import type { VsmProcessNode, VsmDiagram } from "@/types/vsm";
import { fmtSeconds } from "./vsmFormatters";

interface Props {
  node: VsmProcessNode;
  diagram: VsmDiagram;
  onClose: () => void;
}

type TabId = "metrics" | "insights" | "improvement";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "metrics", label: "Metrics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "insights", label: "Insights", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { id: "improvement", label: "Improvement", icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

export function VsmProcessDetailDrawer({ node, diagram, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("metrics");
  const yieldPct = node.defectRate !== null ? (100 - node.defectRate).toFixed(1) : null;
  const allCts = diagram.processNodes.map((n) => n.cycleTimeSeconds);
  const taktTime = allCts.length ? Math.min(...allCts) : node.cycleTimeSeconds;
  const ctVsTakt = node.cycleTimeSeconds > taktTime * 1.1 ? "above" : node.cycleTimeSeconds < taktTime * 0.9 ? "below" : "at";
  const ctRatio = node.cycleTimeSeconds / taktTime;

  return (
    <>
      <div className="absolute inset-0 bg-black/10 z-10 animate-fade-in" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[420px] z-20 bg-white border-l border-slate-300 shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              node.isBottleneck ? "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 ring-1 ring-amber-200" : "bg-gradient-to-br from-blue-50 to-sky-100 text-blue-700 ring-1 ring-blue-200"
            }`}>
              {node.isBottleneck ? <AlertTriangle className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 truncate">{node.label}</h3>
              <p className="text-xs text-slate-500 truncate">{node.resourceGroupName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="text-slate-400 hover:text-slate-600 shrink-0 p-1 rounded hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
            node.isBottleneck
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : node.isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              node.isBottleneck ? "bg-amber-500" : node.isActive ? "bg-emerald-500" : "bg-slate-400"
            }`} />
            {node.isBottleneck ? "Bottleneck" : node.isActive ? "Active" : "Pure Push"}
          </span>
          {node.sequence > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border border-slate-200 bg-white text-slate-600">
              Step #{node.sequence}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold border-b-2 transition-all duration-150 ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "metrics" && (
            <div className="px-4 py-4 space-y-3 text-xs">
              {/* Cycle Time comparison ring */}
              <div className="flex items-center gap-4 p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
                <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                    <circle cx="32" cy="32" r="28" fill="none"
                      stroke={ctVsTakt === "above" ? "#dc2626" : ctVsTakt === "below" ? "#16a34a" : "#3b82f6"}
                      strokeWidth="5"
                      strokeDasharray={`${Math.min(176, ctRatio * 88)} 176`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-extrabold tabular-nums text-slate-700">
                    {ctRatio.toFixed(2)}x
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700">C/T vs Takt</p>
                  <p className={`text-[13px] font-bold tabular-nums ${
                    ctVsTakt === "above" ? "text-red-600" : ctVsTakt === "below" ? "text-emerald-600" : "text-blue-600"
                  }`}>
                    {node.cycleTimeSeconds}s / {taktTime}s
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {ctVsTakt === "above"
                      ? `Above by ${Math.round((ctRatio - 1) * 100)}% — needs reduction`
                      : ctVsTakt === "below"
                        ? `Below takt — within capacity`
                        : "At takt — balanced"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MC icon={<Clock className="h-3.5 w-3.5" />} label="Cycle Time" value={`${node.cycleTimeSeconds}s`} />
                <MC icon={<Gauge className="h-3.5 w-3.5" />} label="Takt Time" value={`${taktTime}s`}
                  color={ctVsTakt === "above" ? "text-red-600" : "text-slate-800"} />
                <MC icon={<Activity className="h-3.5 w-3.5" />} label="Changeover" value={fmtSeconds(node.changeoverSeconds)} />
                <MC icon={<Percent className="h-3.5 w-3.5" />} label="Uptime" value={`${node.uptimePercent}%`}
                  color={node.uptimePercent < 90 ? "text-red-600" : node.uptimePercent < 95 ? "text-amber-600" : "text-emerald-600"} />
                <MC icon={<Users className="h-3.5 w-3.5" />} label="Operators" value={`${node.operatorCount}`} />
                <MC icon={<Package className="h-3.5 w-3.5" />} label="WIP Before" value={`${node.wipBefore}`}
                  color={node.wipBefore > 120 ? "text-red-600" : "text-slate-800"} />
                <MC icon={<Package className="h-3.5 w-3.5" />} label="WIP After" value={`${node.wipAfter}`}
                  color={node.wipAfter > 120 ? "text-red-600" : "text-slate-800"} />
                {yieldPct && (
                  <MC icon={<Activity className="h-3.5 w-3.5" />} label="Yield" value={`${yieldPct}%`}
                    color={node.defectRate! > 2 ? "text-red-600" : node.defectRate! > 1 ? "text-amber-600" : "text-emerald-600"} />
                )}
              </div>
            </div>
          )}

          {activeTab === "insights" && (
            <div className="px-4 py-4 space-y-3 text-xs">
              {/* Primary insight card */}
              <div className={`rounded-xl border p-3.5 ${
                node.isBottleneck
                  ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"
                  : node.wipAfter > 120
                    ? "border-red-200 bg-gradient-to-br from-red-50 to-rose-50"
                    : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50"
              }`}>
                <div className="flex items-start gap-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    node.isBottleneck ? "bg-amber-100 text-amber-700" : node.wipAfter > 120 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {node.isBottleneck ? <AlertTriangle className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className={`text-[11px] font-bold ${
                      node.isBottleneck ? "text-amber-800" : node.wipAfter > 120 ? "text-red-800" : "text-emerald-800"
                    }`}>
                      {node.isBottleneck ? "Bottleneck — Limits Throughput" : node.wipAfter > 120 ? "Excessive WIP" : "Process Healthy"}
                    </p>
                    <p className={`text-[11px] leading-relaxed mt-0.5 ${
                      node.isBottleneck ? "text-amber-700" : node.wipAfter > 120 ? "text-red-700" : "text-emerald-700"
                    }`}>
                      {node.isBottleneck
                        ? `CT=${node.cycleTimeSeconds}s, WIP queue=${node.wipAfter}, Uptime=${node.uptimePercent}%. Reduce cycle time or rebalance workload to downstream stations.`
                        : node.wipAfter > 120
                          ? `${node.wipAfter} units queued — increase downstream capacity or reduce batch size to improve flow.`
                          : `Process running at acceptable levels. C/T ${ctVsTakt === "above" ? "above" : "at or below"} takt, WIP within targets.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <QuickStat
                  label="Flow Efficiency"
                  value={diagram.totalLeadTimeMinutes > 0
                    ? `${Math.round((node.cycleTimeSeconds / (node.wipBefore + node.cycleTimeSeconds)) * 100)}%`
                    : "—"}
                  icon={<Gauge className="h-3 w-3" />}
                />
                <QuickStat
                  label="WIP-to-Operator Ratio"
                  value={`${(node.wipAfter / Math.max(1, node.operatorCount)).toFixed(1)}:1`}
                  icon={<Users className="h-3 w-3" />}
                />
                <QuickStat
                  label="Defect Impact"
                  value={node.defectRate !== null ? `${(node.defectRate * node.wipAfter / 100).toFixed(1)}u/cycle` : "—"}
                  icon={<Percent className="h-3 w-3" />}
                />
                <QuickStat
                  label="Changeover Frequency"
                  value={node.changeoverSeconds > 600 ? "1x/week" : node.changeoverSeconds > 300 ? "2x/week" : "Daily"}
                  icon={<Clock className="h-3 w-3" />}
                />
              </div>

              {/* Historical note */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Process Context</p>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  {node.isBottleneck
                    ? `This process is the current bottleneck at ${node.cycleTimeSeconds}s cycle time. Reducing this by 10% would increase overall throughput by ${Math.round(10 / (node.cycleTimeSeconds / taktTime) * 10)}%.`
                    : `Not a bottleneck. C/T at ${ctRatio.toFixed(2)}x takt. ${node.isPacemaker ? "This is the pacemaker process — schedule adherence is critical." : ""}`}
                </p>
              </div>
            </div>
          )}

          {activeTab === "improvement" && (
            <div className="px-4 py-4 space-y-3 text-xs">
              {/* Improvement opportunities */}
              {node.isBottleneck && (
                <OpportunityCard
                  type="bottleneck"
                  title="Bottleneck Reduction"
                  description={`Reduce ${node.label} cycle time (${node.cycleTimeSeconds}s) or add parallel capacity. Target: ${Math.round(taktTime * 0.9)}s for takt compliance.`}
                  impact={`+${Math.round((node.cycleTimeSeconds - taktTime) / node.cycleTimeSeconds * 100)}% throughput`}
                />
              )}
              {node.uptimePercent < 90 && (
                <OpportunityCard
                  type="uptime"
                  title="Uptime Improvement"
                  description={`Current uptime: ${node.uptimePercent}%. Apply TPM (Total Productive Maintenance) to reduce unplanned downtime.`}
                  impact={`+${Math.round((90 - node.uptimePercent) * 0.5)}% capacity`}
                />
              )}
              {node.wipAfter > 100 && (
                <OpportunityCard
                  type="wip"
                  title="WIP Reduction"
                  description={`Reduce batch size at ${node.label}. Current WIP: ${node.wipAfter}. Target: ${Math.round(node.wipAfter * 0.5)} units through continuous flow.`}
                  impact={`−${Math.round(node.wipAfter * 0.5)} units WIP`}
                />
              )}
              {node.changeoverSeconds > 600 && (
                <OpportunityCard
                  type="changeover"
                  title="SMED — Quick Changeover"
                  description={`Current changeover time: ${fmtSeconds(node.changeoverSeconds)}. Apply SMED to target < 10min.`}
                  impact="−60-80% changeover time"
                />
              )}
              {node.defectRate !== null && node.defectRate > 1 && (
                <OpportunityCard
                  type="quality"
                  title="Quality — Defect Reduction"
                  description={`Current defect rate: ${node.defectRate}%. Apply root cause analysis and Poka-Yoke (mistake-proofing).`}
                  impact={`−${node.defectRate.toFixed(1)}% defects`}
                />
              )}
              {!(node.isBottleneck || node.uptimePercent < 90 || node.wipAfter > 100 || node.changeoverSeconds > 600 || (node.defectRate !== null && node.defectRate > 1)) && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Process Running Well</p>
                  <p className="text-xs text-slate-500 max-w-[280px]">
                    No immediate improvement opportunities detected. Monitor C/T, WIP, and quality trends.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Subcomponents ── */

function MC({ icon, label, value, color = "text-slate-800" }: {
  icon: React.ReactNode; label: string; value: string; color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-slate-400">{icon}</span>
        <span className="text-[10px] text-slate-500">{label}</span>
      </div>
      <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function QuickStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-slate-400">{icon}</span>
        <span className="text-[10px] text-slate-500">{label}</span>
      </div>
      <p className="text-[12px] font-bold tabular-nums text-indigo-700">{value}</p>
    </div>
  );
}

function OpportunityCard({
  type, title, description, impact,
}: {
  type: "bottleneck" | "uptime" | "wip" | "changeover" | "quality";
  title: string;
  description: string;
  impact: string;
}) {
  const styles = {
    bottleneck: { border: "border-amber-200", bg: "bg-gradient-to-br from-amber-50 to-orange-50", badge: "bg-amber-100 text-amber-800 border-amber-200" },
    uptime: { border: "border-red-200", bg: "bg-gradient-to-br from-red-50 to-rose-50", badge: "bg-red-100 text-red-800 border-red-200" },
    wip: { border: "border-orange-200", bg: "bg-gradient-to-br from-orange-50 to-amber-50", badge: "bg-orange-100 text-orange-800 border-orange-200" },
    changeover: { border: "border-blue-200", bg: "bg-gradient-to-br from-blue-50 to-indigo-50", badge: "bg-blue-100 text-blue-800 border-blue-200" },
    quality: { border: "border-purple-200", bg: "bg-gradient-to-br from-purple-50 to-violet-50", badge: "bg-purple-100 text-purple-800 border-purple-200" },
  };
  const s = styles[type];
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-3.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] font-bold text-slate-800">{title}</p>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold border ${s.badge}`}>
              {impact}
            </span>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">{description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
      </div>
    </div>
  );
}
