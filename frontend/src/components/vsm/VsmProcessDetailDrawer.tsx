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
      <div className="absolute right-0 top-0 bottom-0 w-[420px] z-20 bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-gradient-to-r from-muted/30 to-background">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              node.isBottleneck ? "bg-gradient-to-br from-amber-50 to-amber-100 text-warning ring-1 ring-amber-200" : "bg-gradient-to-br from-blue-50 to-primary/10 text-primary ring-1 ring-primary/20"
            }`}>
              {node.isBottleneck ? <AlertTriangle className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{node.label}</h3>
              <p className="text-xs text-muted-foreground truncate">{node.resourceGroupName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="text-muted-foreground/60 hover:text-muted-foreground shrink-0 p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/50">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
            node.isBottleneck
              ? "border-warning/20 bg-warning/10 text-warning"
              : node.isActive
                ? "border-success/20 bg-success/10 text-success"
                : "border-border bg-muted text-muted-foreground"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              node.isBottleneck ? "bg-warning/100" : node.isActive ? "bg-success/100" : "bg-muted-foreground/40"
            }`} />
            {node.isBottleneck ? "Bottleneck" : node.isActive ? "Active" : "Pure Push"}
          </span>
          {node.sequence > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border border-border bg-background text-muted-foreground">
              Step #{node.sequence}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/80">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold border-b-2 transition-all duration-150 ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-muted-foreground hover:bg-muted"
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
              <div className="flex items-center gap-4 p-3 bg-gradient-to-br from-muted/30 to-background rounded-xl border border-border">
                <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
                    <circle cx="32" cy="32" r="28" fill="none"
                      stroke={ctVsTakt === "above" ? "hsl(var(--danger))" : ctVsTakt === "below" ? "hsl(var(--success))" : "hsl(var(--primary))"}
                      strokeWidth="5"
                      strokeDasharray={`${Math.min(176, ctRatio * 88)} 176`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-extrabold tabular-nums text-muted-foreground">
                    {ctRatio.toFixed(2)}x
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-muted-foreground">C/T vs Takt</p>
                  <p className={`text-[13px] font-bold tabular-nums ${
                    ctVsTakt === "above" ? "text-danger" : ctVsTakt === "below" ? "text-success" : "text-primary"
                  }`}>
                    {node.cycleTimeSeconds}s / {taktTime}s
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {ctVsTakt === "above"
                      ? `Above by ${Math.round((ctRatio - 1) * 100)}% — needs reduction`
                      : ctVsTakt === "below"
                        ? `Below takt — within capacity`
                        : "At takt — balanced"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 items-stretch">
                <MC icon={<Clock className="h-3.5 w-3.5" />} label="Cycle Time" value={`${node.cycleTimeSeconds}s`} />
                <MC icon={<Gauge className="h-3.5 w-3.5" />} label="Takt Time" value={`${taktTime}s`}
                  color={ctVsTakt === "above" ? "text-danger" : "text-foreground"} />
                <MC icon={<Activity className="h-3.5 w-3.5" />} label="Changeover" value={fmtSeconds(node.changeoverSeconds)} />
                <MC icon={<Percent className="h-3.5 w-3.5" />} label="Uptime" value={`${node.uptimePercent}%`}
                  color={node.uptimePercent < 90 ? "text-danger" : node.uptimePercent < 95 ? "text-warning" : "text-success"} />
                <MC icon={<Users className="h-3.5 w-3.5" />} label="Operators" value={`${node.operatorCount}`} />
                <MC icon={<Package className="h-3.5 w-3.5" />} label="WIP Before" value={`${node.wipBefore}`}
                  color={node.wipBefore > 120 ? "text-danger" : "text-foreground"} />
                <MC icon={<Package className="h-3.5 w-3.5" />} label="WIP After" value={`${node.wipAfter}`}
                  color={node.wipAfter > 120 ? "text-danger" : "text-foreground"} />
                {yieldPct && (
                  <MC icon={<Activity className="h-3.5 w-3.5" />} label="Yield" value={`${yieldPct}%`}
                    color={node.defectRate! > 2 ? "text-danger" : node.defectRate! > 1 ? "text-warning" : "text-success"} />
                )}
              </div>
            </div>
          )}

          {activeTab === "insights" && (
            <div className="px-4 py-4 space-y-3 text-xs">
              {/* Primary insight card */}
              <div className={`rounded-xl border p-3.5 ${
                node.isBottleneck
                  ? "border-warning/20 bg-gradient-to-br from-amber-50 to-orange-50"
                  : node.wipAfter > 120
                    ? "border-danger/20 bg-gradient-to-br from-red-50 to-rose-50"
                    : "border-success/20 bg-gradient-to-br from-emerald-50 to-teal-50"
              }`}>
                <div className="flex items-start gap-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    node.isBottleneck ? "bg-warning/15 text-warning" : node.wipAfter > 120 ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
                  }`}>
                    {node.isBottleneck ? <AlertTriangle className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className={`text-[11px] font-bold ${
                      node.isBottleneck ? "text-warning" : node.wipAfter > 120 ? "text-danger" : "text-success"
                    }`}>
                      {node.isBottleneck ? "Bottleneck — Limits Throughput" : node.wipAfter > 120 ? "Excessive WIP" : "Process Healthy"}
                    </p>
                    <p className={`text-[11px] leading-relaxed mt-0.5 ${
                      node.isBottleneck ? "text-warning" : node.wipAfter > 120 ? "text-danger" : "text-success"
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
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Process Context</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Process Running Well</p>
                  <p className="text-xs text-muted-foreground max-w-[280px]">
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

function MC({ icon, label, value, color = "text-foreground" }: {
  icon: React.ReactNode; label: string; value: string; color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-2.5 py-2 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-muted-foreground/60">{icon}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function QuickStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-muted-foreground/60">{icon}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-[12px] font-bold tabular-nums text-primary">{value}</p>
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
    bottleneck: { border: "border-warning/20", bg: "bg-gradient-to-br from-amber-50 to-orange-50", badge: "bg-warning/15 text-warning border-warning/20" },
    uptime: { border: "border-danger/20", bg: "bg-gradient-to-br from-red-50 to-rose-50", badge: "bg-danger/15 text-danger border-danger/20" },
    wip: { border: "border-warning/20", bg: "bg-gradient-to-br from-orange-50 to-amber-50", badge: "bg-warning/15 text-orange-800 border-warning/20" },
    changeover: { border: "border-primary/20", bg: "bg-gradient-to-br from-primary/10 to-accent/10", badge: "bg-primary/15 text-primary border-primary/20" },
    quality: { border: "border-accent/20", bg: "bg-gradient-to-br from-purple-50 to-violet-50", badge: "bg-accent/15 text-purple-800 border-accent/20" },
  };
  const s = styles[type];
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-3.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] font-bold text-foreground">{title}</p>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold border ${s.badge}`}>
              {impact}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
      </div>
    </div>
  );
}
}
Name="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
      </div>
    </div>
  );
}
}
