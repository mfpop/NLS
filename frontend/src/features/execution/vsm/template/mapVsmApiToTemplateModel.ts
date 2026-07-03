import type {
  StandardVsmTemplateModel, FactoryModel, ProductionControlModel,
  ProcessSymbolModel, InventoryModel, MaterialFlowModel,
  InformationFlowModel, TimelineSegmentModel, TotalsModel, DataRowModel,
} from "./vsmTemplateTypes";
import { detectOpportunities } from "./VsmKaizenBurst";
import type { VsmDiagram } from "@/types/vsm";
import { fmtSeconds, fmtCO, fmtMinutes, v } from "@/components/vsm/vsmFormatters";

/**
 * Maps the raw GraphQL VsmDiagram into the pure render model.
 * No business calculations — only null-safe formatting and structural mapping.
 */
export function mapVsmApiToTemplateModel(diagram: VsmDiagram): StandardVsmTemplateModel {
  const supplier: FactoryModel = {
    label: diagram.supplierName || "RM Supply",
    typeLabel: "Supplier",
  };

  const customer: FactoryModel = {
    label: diagram.customerName || "FG Customer",
    typeLabel: "Customer",
  };

  const productionControl: ProductionControlModel | null = diagram.productionControl
    ? {
        title: diagram.productionControl.label || "Production Control",
        lineLabel: "",
        methodLabel: diagram.productionControl.schedulingType || "",
        frequencyLabel: diagram.productionControl.schedulingInterval || "",
        pacemakerLabel: diagram.processNodes?.find((p) => p.isPacemaker)?.label || undefined,
      }
    : null;

  const processes: ProcessSymbolModel[] = diagram.processNodes.map((pn) => {
    const rows: DataRowModel[] = [];

    if (pn.cycleTimeSeconds != null) {
      rows.push({ label: "C/T", value: v(fmtSeconds(pn.cycleTimeSeconds)) });
    }
    if (pn.changeoverSeconds != null) {
      rows.push({ label: "C/O", value: v(fmtCO(pn.changeoverSeconds)) });
    }
    if (pn.uptimePercent != null) {
      const uptimeSev = pn.uptimePercent < 70 ? "critical" as const : pn.uptimePercent < 85 ? "warning" as const : "normal" as const;
      rows.push({ label: "Uptime", value: v(pn.uptimePercent, "%"), severity: uptimeSev });
    }
    // Always show operators
    rows.push({ label: "Operators", value: String(pn.operatorCount) });

    // WIP removed from default rows — KPI bar owns total WIP. Detail/Metrics toggle may add it.
    // (Local WIP belongs to inventory triangles, total WIP belongs to KPI bar)

    if (pn.defectRate != null) {
      const yieldPct = (100 - pn.defectRate).toFixed(1);
      rows.push({ label: "Yield", value: `${yieldPct}%` });
    }
    rows.push({ label: "Shift", value: `${diagram.chartShiftsPerDay ?? 1}/day` });
    // Yield row omitted when data is missing — do not show blank rows

    // Compute C/T vs takt for derived diagram
    let isAboveTakt: boolean | null = null;
    if (diagram.taktTimeSeconds != null && pn.cycleTimeSeconds != null) {
      const ratio = pn.cycleTimeSeconds / diagram.taktTimeSeconds;
      if (ratio < 0.9) isAboveTakt = false;
      else if (ratio > 1.1) isAboveTakt = true;
      else isAboveTakt = false; // "at" takt is fine
    }

    const opportunities = detectOpportunities({
      wip: pn.wipAfter,
      isAboveTakt,
      uptimePercent: pn.uptimePercent,
      defectRate: pn.defectRate,
    });

    // Compute severity from data rows (worst wins)
    const rowSevs = rows.map((r) => r.severity).filter(Boolean);
    const worstSev = rowSevs.includes("critical") ? "critical" as const
      : rowSevs.includes("warning") ? "warning" as const
      : undefined;

    return {
      id: pn.id,
      sequence: pn.sequence,
      name: pn.label,
      departmentLabel: pn.resourceGroupName,
      operatorCount: pn.operatorCount,
      isActive: pn.isActive,
      isSelected: false,
      isBottleneck: pn.isBottleneck || (isAboveTakt === true && pn.cycleTimeSeconds != null),
      isPacemaker: pn.isPacemaker,
      isAboveTakt,
      wip: pn.wipAfter || 0,
      severity: worstSev,
      dataRows: rows,
      opportunities,
    };
  });

  // Build material flows from flowLinks
  const materialFlows: MaterialFlowModel[] = diagram.flowLinks
    .filter((fl) => fl.fromId && fl.toId)
    .map((fl) => {
      // Assign default equipment type based on flow type
      const defEquip = fl.type === "SHIPMENT" ? "TRUCK" : fl.type === "PUSH" || fl.type === "FIFO" ? "CONVEYOR" : "FORKLIFT";
      return {
        from: fl.fromId,
        to: fl.toId,
        label: fl.label || null,
        type: fl.type as MaterialFlowModel["type"],
        deliveryFrequency: fl.deliveryFrequency || fl.label?.match(/\b(daily|weekly|monthly|2x\/week)\b/i)?.[0] || null,
        equipmentType: defEquip,
        equipmentLabel: defEquip === "TRUCK" ? "Truck" : defEquip === "CONVEYOR" ? "Conveyor" : "Forklift",
        distance: null as null,
        distanceUnit: "m",
        tripFrequency: fl.deliveryFrequency || undefined,
        batchSize: null as null,
        handlingTime: null as null,
        handlingTimeUnit: "min",
        transportSeverity: "NORMAL" as const,
        transportCostLevel: "MEDIUM" as const,
        isInternalTransport: fl.type !== "SHIPMENT",
        isTransportationWaste: false,
        notes: "",
      };
    });

  // ── Normalize info-flow entity reference ──
  // Maps DB UUIDs / prefixed IDs / loose strings to canonical entity names
  // (SUPPLIER, CUSTOMER, PC) so the SVG renderer can route info-flow paths
  // through the correct anchor points.
  // Backend sends IDs like "PC-001", "PN-001", "SUPPLIER", "CUSTOMER", etc.
  function normalizeInfoFlowEntity(id: string | null | undefined): string {
    if (!id) return "";
    const upper = id.toUpperCase();
    // Exact canonical match
    if (upper === "SUPPLIER" || upper === "CUSTOMER" || upper === "PC") return upper;
    // Prefixed IDs: "PC-001", "SUPP-001", "CUST-001", "PROD_CONTROL"
    if (upper.startsWith("PC-") || upper.startsWith("PROD_CONTROL-") || upper.includes("CONTROL")) return "PC";
    if (upper.startsWith("SUPP-") || upper.includes("SUPPLIER") || upper.includes("RM_SUPPL")) return "SUPPLIER";
    if (upper.startsWith("CUST-") || upper.includes("CUSTOMER") || upper.includes("FG_CUST")) return "CUSTOMER";
    // Process IDs like "PN-001", "PN-002" pass through — the renderer looks them
    // up in anchors.processes which is keyed by the same IDs
    return id;
  }

  // If demand quantity exists, label is "Customer demand"; otherwise "Customer orders"
  const demandExists = diagram.customerDemandRate != null && diagram.customerDemandRate > 0;

  // Information flows — source from backend, supplemented with per-process schedule signals
  // for any active process that the backend doesn't explicitly link.
  const apiFlows: InformationFlowModel[] = diagram.informationFlows?.length
    ? diagram.informationFlows.map((api) => ({
        from: normalizeInfoFlowEntity(api.fromId) || "CUSTOMER",
        to: normalizeInfoFlowEntity(api.toId) || "PC",
        label: api.label,
        frequency: api.frequency || null,
        flowStyle: (api.flowStyle || "MANUAL") as InformationFlowModel["flowStyle"],
        method: api.method || "",
        transmissionType: api.transmissionType || "MANUAL",
        triggerType: api.triggerType || "",
        controlledProcessId: api.controlledProcessId || "",
        notes: api.notes || "",
      }))
    : [];

  // Active processes that already have a PC → process info flow
  const pcToProcessTargets = new Set(
    apiFlows
      .filter((f) => f.from === "PC")
      .map((f) => f.to),
  );

  // Supplement with schedule-signal flows for every active process not yet covered
  const scheduleFlows: InformationFlowModel[] = diagram.processNodes
    .filter((p) => p.isActive && !pcToProcessTargets.has(p.id))
    .map((p) => ({
      from: "PC" as const,
      to: p.id,
      label: p.isPacemaker ? "Production schedule" : "Schedule signal",
      frequency: "Daily",
      flowStyle: (p.isPacemaker ? "SCHEDULE" : "ELECTRONIC") as InformationFlowModel["flowStyle"],
      method: p.isPacemaker ? "Dispatch list" : "Kanban / Pull",
      transmissionType: p.isPacemaker ? "MANUAL" : "ELECTRONIC",
      triggerType: "PRODUCTION_SCHEDULE" as const,
      controlledProcessId: p.id,
      notes: "",
    }));

  // Push-only (inactive) processes get an explicit no-signal notation for transparency
  const pushFlows: InformationFlowModel[] = diagram.processNodes
    .filter((p) => !p.isActive)
    .map((p) => ({
      from: "PC" as const,
      to: p.id,
      label: "Push — no schedule signal",
      frequency: "—",
      flowStyle: "MANUAL" as const,
      method: "None (push flow)" as const,
      transmissionType: "NONE" as const,
      triggerType: "PUSH" as const,
      controlledProcessId: p.id,
      notes: "",
    }));

  // Core flows (Customer↔PC↔Supplier) — use API when present, else fallback
  const hasCoreFlows = apiFlows.some(
    (f) => f.from === "CUSTOMER" || f.to === "SUPPLIER",
  );
  const coreFlows: InformationFlowModel[] = hasCoreFlows
    ? []
    : [
        { from: "CUSTOMER", to: "PC", label: demandExists ? "Customer demand" : "Customer orders", frequency: "Daily", flowStyle: "ELECTRONIC", method: "EDI", transmissionType: "ELECTRONIC", triggerType: "CUSTOMER_ORDER", controlledProcessId: "", notes: "" },
        { from: "PC", to: "SUPPLIER", label: "Release schedule", frequency: "Weekly", flowStyle: "ELECTRONIC", method: "ERP email", transmissionType: "ELECTRONIC", triggerType: "RELEASE_SCHEDULE", controlledProcessId: "", notes: "" },
      ];

  const informationFlows: InformationFlowModel[] = [...apiFlows, ...coreFlows, ...scheduleFlows, ...pushFlows]
    .filter((f) => f.to && f.to !== "");

  // Timeline segments — match by index (timeline and processNodes are both ordered by sequence)
  const timelineSegments: TimelineSegmentModel[] = diagram.timeline.map((ev, i) => {
    const matchedProc = diagram.processNodes[i];
    return {
      processId: matchedProc?.id ?? `step-${ev.stepName}-${i}`,
      waitTimeLabel: ev.waitTimeMinutes != null
        ? (ev.waitTimeMinutes === 0 ? null : fmtMinutes(ev.waitTimeMinutes))
        : null,
      processTimeLabel: ev.processTimeMinutes != null
        ? (ev.processTimeMinutes === 0 ? null : fmtMinutes(ev.processTimeMinutes))
        : null,
      processLabel: ev.stepName,
    };
  });

  // Totals
  const vaPct = diagram.totalLeadTimeMinutes > 0
    ? Math.round((diagram.totalValueAddMinutes / diagram.totalLeadTimeMinutes) * 100)
    : 0;

  const totals: TotalsModel = {
    leadTimeLabel: fmtMinutes(diagram.totalLeadTimeMinutes),
    valueAddedTimeLabel: fmtMinutes(diagram.totalValueAddMinutes),
    valueAddedPercentLabel: `VA = ${vaPct}%`,
    valueAddedPercent: vaPct,
  };

  // Inventories
  const inventories: InventoryModel[] = diagram.inventoryNodes.map((inv) => ({
    id: inv.id,
    quantity: inv.quantity,
    waitTimeLabel: inv.daysOfInventory != null ? `${inv.daysOfInventory}d` : "\u2014",
    label: inv.label,
    type: inv.type,
    severity: inv.type === "WIP" && inv.quantity > 120
      ? "critical"
      : inv.type === "WIP" && inv.quantity > 60
        ? "warning"
        : "normal" as const,
  }));

  // Available working time
  const mins = diagram.availableMinutesPerShift ?? 450;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const timeStr = m > 0 ? `${h}h ${m}m / shift` : `${h}h / shift`;
  const availableWorkingTime = {
    minutesPerShift: mins,
    shiftsPerDay: diagram.chartShiftsPerDay ?? 1,
    label: timeStr,
  };

  // Business impact (computed) — null when no data
  const totalWip = diagram.processNodes.reduce((sum, pn) => sum + pn.wipAfter, 0);
  const totalInvQty = diagram.inventoryNodes.reduce((sum, inv) => sum + inv.quantity, 0);
  const hasImpactData = totalInvQty > 0 || totalWip > 0;
  const businessImpact = hasImpactData ? {
    inventoryCost: totalInvQty > 0 ? `$${(totalInvQty * 50).toLocaleString()}` : null,
    inventoryTurns: totalInvQty > 0 ? `${(totalInvQty > 0 ? (diagram.customerDemandRate ?? 100) / totalInvQty : 0).toFixed(1)}x` : null,
    serviceLevel: totals.valueAddedPercent > 0 ? `${Math.min(100, totals.valueAddedPercent + 80)}%` : null,
    leadTimeReductionOpp: totals.valueAddedPercent < 10 ? `${(100 - totals.valueAddedPercent)}%` : totals.valueAddedPercent < 30 ? `${(50 - totals.valueAddedPercent / 2)}%` : null,
    wipReductionOpp: totalWip > 200 ? `${Math.round((totalWip - 100) / totalWip * 100)}%` : totalWip > 100 ? "~50%" : null,
  } : null;

  // ── Takt time status ──
  let taktTimeStatus: "ok" | "missing_demand" | "missing_available_time" | "not_calculated" = "not_calculated";
  let taktTimeDisplay = "—";
  let taktTimeMissingReason: string | null = "Not calculated";

  if (diagram.customerDemandRate == null) {
    taktTimeStatus = "missing_demand";
    taktTimeMissingReason = "Demand missing";
  } else if (diagram.availableMinutesPerShift == null) {
    taktTimeStatus = "missing_available_time";
    taktTimeMissingReason = "Available time missing";
  } else if (diagram.taktTimeSeconds != null) {
    taktTimeStatus = "ok";
    taktTimeMissingReason = null;
    const takt = diagram.taktTimeSeconds;
    taktTimeDisplay = takt < 60
      ? `${takt.toFixed(1)} s/unit`
      : `${(takt / 60).toFixed(1)} min/unit`;
  }

  return {
    supplier, customer, productionControl,
    processes, inventories, materialFlows, informationFlows,
    timelineSegments, totals,
    taktTimeSeconds: diagram.taktTimeSeconds ?? null,
    taktTimeDisplay,
    taktTimeStatus,
    taktTimeMissingReason,
    availableWorkingTime,
    chartState: "CURRENT_STATE" as const,
    businessImpact,
    improvementOpportunities: [],
    demandDisplay: diagram.customerDemandRate != null
      ? `${diagram.customerDemandRate} ${diagram.customerDemandUnit || "units"}/${diagram.customerDemandPeriod || "day"}`
      : null,
  };
}
