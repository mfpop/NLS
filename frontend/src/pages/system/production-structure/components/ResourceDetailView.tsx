import { useState } from "react";
import { AlertTriangle, CheckCircle, Dumbbell, Component, Activity, BarChart, Cpu, Wrench, Info } from "lucide-react";
import { formatAppDate } from "@/utils/dateFormat";
import { InlineRow, Badge, SectionHeader } from "./DetailComponents";

// ─── Types ───

interface Resource {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  status?: string;
  statusId?: string;
  resourceGroupId?: string;
  resourceGroupName?: string;
  resourceTypeId?: string;
  utilization?: number | null;
  opStatus?: string;
  lastActivity?: string;
  shiftPattern?: string;
  defaultCalendar?: string;
  timezone?: string;
  capacityBasis?: string;
  uom?: string;
  standardCapacity?: string;
  cycleTime?: string;
  bottleneck?: string;
  isConstraint?: string;
  assetNumber?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  maintenanceRequired?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceDetailViewProps {
  resource: Resource | null;
}

// ─── Helpers ───

function computeReadiness(r: Resource): { level: "ready" | "partial" | "incomplete"; label: string } {
  const hasSchedule = !!r.shiftPattern || !!r.defaultCalendar;
  const hasCapacity = !!r.capacityBasis || !!r.standardCapacity;
  const hasTech = !!r.assetNumber || !!r.manufacturer || !!r.model;
  if (hasSchedule && hasCapacity && hasTech) return { level: "ready", label: "Ready" };
  if (hasSchedule || hasCapacity || hasTech) return { level: "partial", label: "Partially Configured" };
  return { level: "incomplete", label: "Incomplete" };
}

function ReadinessBadge({ level }: { level: "ready" | "partial" | "incomplete" }) {
  const styles = {
    ready: "bg-success/10 text-success border border-success/25",
    partial: "bg-warning/10 text-warning border border-warning/25",
    incomplete: "bg-muted text-muted-foreground border border-border/40",
  };
  const icons = {
    ready: <CheckCircle className="h-3 w-3 stroke-current mr-1" />,
    partial: <AlertTriangle className="h-3 w-3 stroke-current mr-1" />,
    incomplete: <Info className="h-3 w-3 stroke-current mr-1" />,
  };
  const labels = { ready: "Ready", partial: "Partial", incomplete: "Incomplete" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${styles[level]}`}>
      {icons[level]}{labels[level]}
    </span>
  );
}

function MissingBlock({ label, action }: { label: string; action: string }) {
  return (
    <div className="flex items-center gap-1.5 py-[2px]">
      <AlertTriangle className="h-3 w-3 text-warning stroke-current shrink-0" />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="text-[11px] font-semibold text-foreground ml-auto">{action}</span>
    </div>
  );
}

// ─── Main Component ───

export function ResourceDetailView({ resource }: ResourceDetailViewProps) {
  const [descExpanded, setDescExpanded] = useState(false);

  // ── Empty state ──
  if (!resource) {
    return (
      <div className="flex flex-1 items-center justify-center bg-card h-full">
        <div className="text-center max-w-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-entity-resource-bg">
            <Dumbbell className="h-5 w-5 text-entity-resource stroke-current" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Resource Details</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">Select a machine, workstation, fixture, tool, or labor pool to view its execution-readiness context.</p>
        </div>
      </div>
    );
  }

  const r = resource;
  const rgName = r.resourceGroupName || "";
  const readiness = computeReadiness(r);
  const hasSchedule = !!r.shiftPattern || !!r.defaultCalendar;
  const hasCapacity = !!r.capacityBasis || !!r.standardCapacity;
  const hasTech = !!r.assetNumber || !!r.manufacturer || !!r.model;
  const missingCount = [!hasSchedule, !hasCapacity, !hasTech].filter(Boolean).length;
  const allConfigured = missingCount === 0;

  // Description
  const descriptionText = (r.description || "").trim();
  const descriptionNeedsToggle = descriptionText.length > 140 || descriptionText.includes("\n");

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-card">
      {/* ── HEADER ── */}
      <div className="shrink-0 border-b border-border/40 bg-card">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-entity-resource-bg text-entity-resource ring-1 ring-entity-resource/20">
              <Dumbbell className="h-5 w-5 stroke-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm font-bold text-foreground truncate">{r.name || "Unnamed Resource"}</h2>
                {r.code && <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">{r.code}</span>}
                <Badge label={r.status || "active"} variant={r.status === "active" ? "active" : "inactive"} />
                <ReadinessBadge level={readiness.level} />
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                <span><Component className="h-2.5 w-2.5 inline stroke-current mr-0.5" />{rgName || "No RG"}</span>
                <span className="text-muted-foreground/30">·</span>
                <span><Activity className="h-2.5 w-2.5 inline stroke-current mr-0.5" />{r.utilization != null ? `${r.utilization}% activity` : "No activity data"}</span>
                <span className="text-muted-foreground/30">·</span>
                <span>{r.resourceTypeId || "No type"}</span>
                {missingCount > 0 && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning border border-warning/25 px-1.5 py-px text-[9px] font-semibold">
                      <AlertTriangle className="h-2.5 w-2.5 stroke-current" /> {missingCount} gap{missingCount !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
                {r.updatedAt && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="ml-auto text-[9px] text-muted-foreground/50 whitespace-nowrap">Updated {formatAppDate(r.updatedAt)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 min-h-0 overflow-hidden bg-card">
        <div className="grid min-h-0 h-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 overflow-y-auto p-3">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
            {/* Overview */}
            <div>
              <SectionHeader title="Overview" />
              <div className="space-y-px">
                {!allConfigured && (
                  <div className="mb-1.5 space-y-px border-b border-border/20 pb-1.5">
                    {!hasSchedule && <MissingBlock label="No schedule visible" action="Managed by schedule assignment" />}
                    {!hasCapacity && <MissingBlock label="No capacity visible" action="Managed by capacity workflow" />}
                    {!hasTech && <MissingBlock label="No asset info visible" action="Managed by resource master data" />}
                  </div>
                )}
                <InlineRow label="Name" value={r.name} />
                <InlineRow label="Code" value={r.code} />
                <InlineRow label="Status" value={<Badge label={r.status || "active"} variant={r.status === "active" ? "active" : "inactive"} />} />
                <InlineRow label="RG" value={rgName || <span className="text-muted-foreground/40 italic">Not assigned</span>} />
                <InlineRow label="Type" value={r.resourceTypeId || <span className="text-muted-foreground/40 italic">No type</span>} />
              </div>
            </div>

            {/* Technical / Asset */}
            <div>
              <SectionHeader title="Technical / Asset" />
              {!hasTech ? (
                <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/20 rounded-md">
                  <Cpu className="h-5 w-5 text-muted-foreground/40 mb-1.5 stroke-current" />
                  <p className="text-[10px] text-muted-foreground mb-1">No asset information recorded</p>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground border border-border/40">
                    <Wrench className="h-2.5 w-2.5 stroke-current" /> Master data required
                  </span>
                </div>
              ) : (
                <div className="space-y-px">
                  <InlineRow label="Asset" value={r.assetNumber || <span className="text-muted-foreground/40 italic">—</span>} />
                  <InlineRow label="Manufacturer" value={r.manufacturer || <span className="text-muted-foreground/40 italic">—</span>} />
                  <InlineRow label="Model" value={r.model || <span className="text-muted-foreground/40 italic">—</span>} />
                  <InlineRow label="Serial" value={r.serialNumber || <span className="text-muted-foreground/40 italic">—</span>} />
                  <InlineRow label="Location" value={r.location || <span className="text-muted-foreground/40 italic">Not assigned</span>} />
                  <InlineRow label="Maintenance" value={r.maintenanceRequired === "true" ? <span className="text-warning font-semibold">Required</span> : <span className="text-muted-foreground/60">Not required</span>} />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
            {/* Capacity & Schedule */}
            <div>
              <SectionHeader title="Capacity & Schedule" />
              {hasCapacity ? (
                <div className="space-y-px">
                  <InlineRow label="Capacity" value={r.capacityBasis || <span className="text-muted-foreground/40 italic">Not set</span>} />
                  <InlineRow label="UoM" value={r.uom || <span className="text-muted-foreground/40 italic">Not set</span>} />
                  <InlineRow label="Std Capacity" value={r.standardCapacity || <span className="text-muted-foreground/40 italic">Not set</span>} />
                  <InlineRow label="Cycle Time" value={r.cycleTime || <span className="text-muted-foreground/40 italic">N/A</span>} />
                  <InlineRow label="Bottleneck" value={r.bottleneck === "yes" ? <span className="text-warning font-semibold">Yes</span> : "No"} />
                  <InlineRow label="Constraint" value={r.isConstraint === "yes" ? <span className="text-warning font-semibold">Yes</span> : "No"} />
                </div>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <BarChart className="h-4 w-4 text-muted-foreground/40 stroke-current shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">No capacity defined</p>
                    <p className="text-[9px] text-muted-foreground/60">Capacity is not exposed in this read model.</p>
                  </div>
                </div>
              )}
              <div className="mt-2 space-y-px border-t border-border/20 pt-2">
                {hasSchedule ? (
                  <>
                    <InlineRow label="Calendar" value={r.defaultCalendar || <span className="text-muted-foreground/40 italic">Not assigned</span>} />
                    <InlineRow label="Shift" value={r.shiftPattern || <span className="text-muted-foreground/40 italic">Not set</span>} />
                    <InlineRow label="Timezone" value={r.timezone || <span className="text-muted-foreground/40 italic">Default</span>} />
                    <div className="pt-0.5 text-[9px] text-muted-foreground/50">{r.shiftPattern ? "Resource override" : "RG default"}</div>
                  </>
                ) : (
                  <MissingBlock label="No schedule configured" action="Assign Schedule" />
                )}
              </div>
            </div>

            {/* Activity & Trends */}
            <div>
              <SectionHeader title="Activity & Trends" />
              <div className="space-y-px">
                <InlineRow label="Activity" value={r.utilization != null ? <span className="flex items-center gap-1"><Activity className="h-2.5 w-2.5 stroke-current" /> {r.utilization}%</span> : <span className="text-muted-foreground/40 italic">Not exposed</span>} />
                <InlineRow label="Last Active" value={formatAppDate(r.lastActivity) || <span className="text-muted-foreground/40 italic">No activity</span>} />
                <InlineRow label="Op. Status" value={r.opStatus || <span className="text-muted-foreground/40 italic">Unknown</span>} />
              </div>
            </div>

            {/* Description */}
            {descriptionText && (
              <div>
                <SectionHeader title="Description" />
                <div>
                  <p className={`text-[13px] text-foreground/80 leading-relaxed ${!descExpanded ? "line-clamp-2" : ""}`}>{descriptionText}</p>
                  {descriptionNeedsToggle && (
                    <button type="button" onClick={() => setDescExpanded(!descExpanded)}
                      className="text-[11px] font-medium text-primary hover:text-accent mt-1 transition-colors">
                      {descExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-[9px] text-muted-foreground pt-1">
              <span>Created <span className="font-medium text-foreground/70">{formatAppDate(r.createdAt) || "—"}</span></span>
              <span>Updated <span className="font-medium text-foreground/70">{formatAppDate(r.updatedAt) || "—"}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
