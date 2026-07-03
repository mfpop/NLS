import type {
  StandardVsmTemplateModel, FactoryModel, ProductionControlModel,
  ProcessSymbolModel, InventoryModel, MaterialFlowModel,
  InformationFlowModel, TimelineSegmentModel, TotalsModel, DataRowModel,
  ImprovementOpportunity,
} from "./vsmTemplateTypes";
import { detectOpportunities } from "./VsmKaizenBurst";
import type { VsmChart } from "@/types/vsm";

/**
 * Maps a persisted VsmChart into the pure render model for StandardVsmTemplate.
 */
export function mapVsmChartToTemplateModel(chart: VsmChart): StandardVsmTemplateModel {
  const supplier: FactoryModel = {
    label: chart.supplierName || "RM Supply",
    typeLabel: "Supplier",
  };

  const customer: FactoryModel = {
    label: chart.customerName || "FG Customer",
    typeLabel: "Customer",
  };

  const productionControl: ProductionControlModel | null = {
    title: chart.productionControlTitle || "Production Control",
    lineLabel: "",
    methodLabel: chart.controlMethod || "",
    frequencyLabel: chart.scheduleFrequency || "",
    pacemakerLabel: chart.processes?.find((p) => p.isPacemaker)?.name
      || undefined,
  };

  const processes: ProcessSymbolModel[] = [...chart.processes]
    .sort((a, b) => a.sequence - b.sequence)
    .map((p) => {
      const rows: DataRowModel[] = [];

      if (p.cycleTimeValue != null) {
        rows.push({ label: "C/T", value: `${p.cycleTimeValue}${p.cycleTimeUnit === "sec" ? "s" : p.cycleTimeUnit}` });
      }
      if (p.changeoverTimeValue != null) {
        rows.push({ label: "C/O", value: `${p.changeoverTimeValue}${p.changeoverTimeUnit === "sec" ? "s" : p.changeoverTimeUnit}` });
      }
      if (p.uptimePercent != null) {
        const uptimeSev = p.uptimePercent < 70 ? "critical" as const : p.uptimePercent < 85 ? "warning" as const : "normal" as const;
        rows.push({ label: "Uptime", value: `${p.uptimePercent}%`, severity: uptimeSev });
      }
      rows.push({ label: "Operators", value: String(p.operatorCount ?? 1) });
      // WIP removed from default rows — KPI bar owns total WIP. Detail/Metrics toggle may add it.
      if (p.yieldPercent != null) {
        rows.push({ label: "Yield", value: `${p.yieldPercent}%` });
      }
      rows.push({ label: "Shift", value: `${p.shiftsPerDay ?? 1}/day` });

      // Merge backend improvement opportunities with detected ones
      const backendOpps: ImprovementOpportunity[] = (chart.improvementOpportunities || [])
        .filter((o) => o.processId === p.id)
        .map((o) => ({
          type: o.opportunityType as ImprovementOpportunity["type"],
          severity: o.severity.toLowerCase() as "minor" | "major" | "critical",
          label: o.label,
          message: o.message,
        }));
      const detectedOpps = detectOpportunities({
        wip: p.wip,
        cycleTimeVsTakt: p.cycleTimeVsTakt,
        uptimePercent: p.uptimePercent,
        yieldPercent: p.yieldPercent,
      });
      const opportunities = [...backendOpps, ...detectedOpps.filter(
        (d) => !backendOpps.find((b) => b.type === d.type && b.severity === d.severity)
      )];

      // Compute severity from data rows (worst wins)
      const rowSevs = rows.map((r) => r.severity).filter(Boolean);
      const worstSev = rowSevs.includes("critical") ? "critical" as const
        : rowSevs.includes("warning") ? "warning" as const
        : undefined;

      return {
        id: p.id,
        sequence: p.sequence,
        name: p.name,
        departmentLabel: p.departmentName || p.resourceGroupName || "",
        operatorCount: p.operatorCount ?? 1,
        isActive: true,
        isSelected: false,
        isBottleneck: p.isBottleneck || (p.cycleTimeVsTakt === "above" && p.cycleTimeValue != null),
        isPacemaker: p.isPacemaker,
        isAboveTakt: p.cycleTimeVsTakt === "above" ? true : p.cycleTimeVsTakt === "below" ? false : null,
        wip: p.wip ?? 0,
        severity: worstSev,
        processType: (p.processType || "MANUFACTURING") as ProcessSymbolModel["processType"],
        valueAddType: (p.valueAddType || "VALUE_ADD") as ProcessSymbolModel["valueAddType"],
        dataRows: rows,
        opportunities,
      };
    });

  // Build material flows
  const materialFlows: MaterialFlowModel[] = chart.materialFlows.map((f) => ({
    from: f.fromId || f.fromType,
    to: f.toId || f.toType,
    label: f.label || null,
    type: f.flowType as MaterialFlowModel["type"],
    deliveryFrequency: f.label?.match(/\b(daily|weekly|monthly|2x\/week)\b/i)?.[0] ?? null,
    equipmentType: f.equipmentType || undefined,
    equipmentLabel: f.equipmentLabel || undefined,
    distance: f.distance ?? undefined,
    distanceUnit: f.distanceUnit || undefined,
    tripFrequency: f.tripFrequency || undefined,
    batchSize: f.batchSize ?? undefined,
    handlingTime: f.handlingTime ?? undefined,
    handlingTimeUnit: f.handlingTimeUnit || undefined,
    transportSeverity: (f.transportSeverity as MaterialFlowModel["transportSeverity"]) || undefined,
    transportCostLevel: (f.transportCostLevel as MaterialFlowModel["transportCostLevel"]) || undefined,
    isInternalTransport: f.isInternalTransport ?? undefined,
    isTransportationWaste: f.isTransportationWaste ?? undefined,
    notes: f.notes || undefined,
  }));

  // If demand quantity exists, label is "Customer demand"; otherwise "Customer orders"
  const demandExists = chart.customerDemandRate != null && chart.customerDemandRate > 0;

  // Build information flows — fallback when none defined
  const hasInfoFlows = chart.informationFlows.length > 0;
  const informationFlows: InformationFlowModel[] = hasInfoFlows
    ? chart.informationFlows.map((f) => ({
        from: f.fromType === "CUSTOMER" ? "CUSTOMER" : f.fromId || f.fromType,
        to: f.toType === "PC" ? "PC" : f.toId || f.toType,
        label: f.label,
        frequency: f.frequency || null,
        flowStyle: (f.flowStyle || "MANUAL") as "MANUAL" | "ELECTRONIC" | "KANBAN" | "SCHEDULE",
        method: f.method || "",
        transmissionType: f.transmissionType || "MANUAL",
        triggerType: f.triggerType || "",
        controlledProcessId: f.controlledProcessId || "",
        notes: f.notes || "",
      }))
    : [
        { from: "CUSTOMER", to: "PC", label: demandExists ? "Customer demand" : "Customer orders", frequency: "Daily", flowStyle: "ELECTRONIC" as const, method: "EDI", transmissionType: "ELECTRONIC", triggerType: "CUSTOMER_ORDER" },
        { from: "PC", to: "SUPPLIER", label: "Release schedule", frequency: "Weekly", flowStyle: "ELECTRONIC" as const, method: "ERP email", transmissionType: "ELECTRONIC", triggerType: "RELEASE_SCHEDULE" },
        ...chart.processes.filter((p) => p.sequence > 0).map((p) => ({
          from: "PC" as const,
          to: p.id,
          label: p.isPacemaker ? "Production schedule" : "Schedule signal",
          frequency: "Daily",
          flowStyle: "SCHEDULE" as const,
          method: "Dispatch list",
          transmissionType: "MANUAL",
          triggerType: "PRODUCTION_SCHEDULE" as const,
        })),
      ];

  // Build timeline segments
  const timelineSegments: TimelineSegmentModel[] = [...chart.timelineSegments]
    .sort((a, b) => a.sequence - b.sequence)
    .map((seg) => {
      const proc = chart.processes.find((p) => p.id === seg.processId);
      return {
        processId: seg.processId || `seg-${seg.sequence}`,
        waitTimeLabel: seg.waitTimeValue != null ? `${seg.waitTimeValue} ${seg.waitTimeUnit}` : null,
        processTimeLabel: seg.processTimeValue != null ? `${seg.processTimeValue} ${seg.processTimeUnit === "sec" ? "s" : seg.processTimeUnit}` : null,
        processLabel: seg.label || proc?.name || "",
      };
    });

  // Calculate totals from processes + timeline
  const totalWait = timelineSegments.reduce((sum, s) => {
    if (!s.waitTimeLabel) return sum;
    const val = parseFloat(s.waitTimeLabel);
    return isNaN(val) ? sum : sum + val;
  }, 0);
  const totalVa = timelineSegments.reduce((sum, s) => {
    if (!s.processTimeLabel) return sum;
    const val = parseFloat(s.processTimeLabel);
    return isNaN(val) ? sum : sum + val;
  }, 0);
  const vaPct = (totalWait + totalVa) > 0
    ? Math.round((totalVa / (totalWait + totalVa)) * 100)
    : 0;

  const totals: TotalsModel = {
    leadTimeLabel: totalWait > 0 ? `${totalWait}d` : "—",
    valueAddedTimeLabel: totalVa > 0 ? `${totalVa}s` : "—",
    valueAddedPercentLabel: `VA = ${vaPct}%`,
    valueAddedPercent: vaPct,
  };

  // Build inventories
  const inventories: InventoryModel[] = [...chart.inventories]
    .sort((a, b) => a.sequence - b.sequence)
    .map((inv, i, arr) => ({
      id: inv.id,
      quantity: inv.quantity,
      waitTimeLabel: inv.waitTimeValue != null ? `${inv.waitTimeValue}${inv.waitTimeUnit === "days" ? "d" : inv.waitTimeUnit}` : "—",
      label: inv.label || "Inventory",
      type: i === 0 ? "RM" : i === arr.length - 1 ? "FG" : "WIP",
      severity: inv.severity === "CRITICAL" ? "critical" : inv.severity === "WARNING" ? "warning" : "normal" as const,
    }));

  // Available working time
  const mins = chart.availableMinutesPerShift ?? 450;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const timeStr = m > 0 ? `${h}h ${m}m / shift` : `${h}h / shift`;
  const availableWorkingTime = {
    minutesPerShift: mins,
    shiftsPerDay: chart.chartShiftsPerDay ?? 1,
    label: timeStr,
  };

  // Business impact (computed from data, optional) — null when no data
  const totalWip = chart.processes.reduce((sum, p) => sum + (p.wip ?? 0), 0);
  const totalInvQty = chart.inventories.reduce((sum, i) => sum + i.quantity, 0);
  const hasImpactData = totalInvQty > 0 || totalWip > 0;
  const businessImpact = hasImpactData ? {
    inventoryCost: totalInvQty > 0 ? `$${(totalInvQty * 50).toLocaleString()}` : null,
    inventoryTurns: totalInvQty > 0 ? `${(totalInvQty > 0 ? (chart.customerDemandRate ?? 100) / totalInvQty : 0).toFixed(1)}x` : null,
    serviceLevel: totals.valueAddedPercent > 0 ? `${Math.min(100, totals.valueAddedPercent + 80)}%` : null,
    leadTimeReductionOpp: totals.valueAddedPercent < 10 ? `${(100 - totals.valueAddedPercent)}%` : totals.valueAddedPercent < 30 ? `${(50 - totals.valueAddedPercent / 2)}%` : null,
    wipReductionOpp: totalWip > 200 ? `${Math.round((totalWip - 100) / totalWip * 100)}%` : totalWip > 100 ? "~50%" : null,
  } : null;

  // ── Takt time status ──
  let taktTimeStatus: "ok" | "missing_demand" | "missing_available_time" | "not_calculated" = "not_calculated";
  let taktTimeDisplay = "—";
  let taktTimeMissingReason: string | null = "Not calculated";

  if (chart.customerDemandRate == null) {
    taktTimeStatus = "missing_demand";
    taktTimeMissingReason = "Demand missing";
  } else if (chart.availableMinutesPerShift == null) {
    taktTimeStatus = "missing_available_time";
    taktTimeMissingReason = "Available time missing";
  } else if (chart.taktTimeSeconds != null) {
    taktTimeStatus = "ok";
    taktTimeMissingReason = null;
    const takt = chart.taktTimeSeconds;
    taktTimeDisplay = takt < 60
      ? `${takt.toFixed(1)} s/unit`
      : `${(takt / 60).toFixed(1)} min/unit`;
  }

  return {
    supplier, customer, productionControl,
    processes, inventories, materialFlows, informationFlows,
    timelineSegments, totals,
    taktTimeSeconds: chart.taktTimeSeconds ?? null,
    taktTimeDisplay,
    taktTimeStatus,
    taktTimeMissingReason,
    availableWorkingTime,
    chartState: (chart.chartType || "CURRENT_STATE") as "CURRENT_STATE" | "FUTURE_STATE" | "HISTORICAL",
    businessImpact,
    improvementOpportunities: (chart.improvementOpportunities || []).map((o) => ({
      type: o.opportunityType as ImprovementOpportunity["type"],
      severity: o.severity.toLowerCase() as "minor" | "major" | "critical",
      label: o.label,
      message: o.message,
    })),
    demandDisplay: chart.customerDemandRate != null
      ? `${chart.customerDemandRate} ${chart.customerDemandUnit || "units"}/${chart.customerDemandPeriod || "day"}`
      : null,
  };
}
