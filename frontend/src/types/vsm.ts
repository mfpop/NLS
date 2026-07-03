// ── VSM Core Types ──

export interface VsmProcessNode {
  id: string;
  sequence: number;
  label: string;
  resourceGroupName: string;
  cycleTimeSeconds: number;
  changeoverSeconds: number;
  uptimePercent: number;
  operatorCount: number;
  wipBefore: number;
  wipAfter: number;
  defectRate: number | null;
  isBottleneck: boolean;
  isPacemaker: boolean;
  isActive: boolean;
}

export interface VsmTaktInfo {
  customerDemandRate: number | null;
  availableMinutesPerShift: number;
  chartShiftsPerDay: number;
  breakTimePerShift?: number;
  plannedDowntimePerShift?: number;
  workingDaysPerWeek?: number;
  taktTimeSeconds: number | null;
}

export interface VsmInventoryNode {
  id: string;
  label: string;
  type: "RM" | "WIP" | "FG" | "BUFFER" | "QUARANTINE";
  quantity: number;
  daysOfInventory: number;
}

export interface VsmFlowLink {
  id: string;
  fromId: string;
  toId: string;
  type: "PUSH" | "PULL" | "KANBAN" | "FIFO" | "SUPERMARKET" | "SHIPMENT";
  label: string;
  deliveryFrequency: string;
}

export interface VsmInformationFlow {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  frequency: string;
  flowStyle: string;
  method: string;
  transmissionType: string;
  triggerType: string;
  controlledProcessId: string;
  notes: string;
}

export interface VsmProductionControl {
  id: string;
  label: string;
  schedulingType: string;
  schedulingInterval: string;
}

export interface VsmTimelineEvent {
  stepName: string;
  processTimeMinutes: number;
  waitTimeMinutes: number;
  isBottleneck: boolean;
}

export interface VsmDiagram {
  lineId: string;
  lineName: string;
  productName: string;
  processNodes: VsmProcessNode[];
  inventoryNodes: VsmInventoryNode[];
  flowLinks: VsmFlowLink[];
  informationFlows: VsmInformationFlow[];
  productionControl: VsmProductionControl | null;
  timeline: VsmTimelineEvent[];
  supplierName: string;
  customerName: string;
  totalLeadTimeMinutes: number;
  totalValueAddMinutes: number;
  customerDemandRate: number | null;
  customerDemandPeriod: string;
  customerDemandUnit: string;
  availableMinutesPerShift: number;
  chartShiftsPerDay: number;
  breakTimePerShift?: number;
  plannedDowntimePerShift?: number;
  workingDaysPerWeek?: number;
  taktTimeSeconds: number | null;
  lastUpdatedAt: string | null;
}

// ── VSM Chart Model Types ──

export type VsmSourceMode = "MANUAL" | "LINKED";
export type VsmChartType = "CURRENT_STATE" | "FUTURE_STATE" | "HISTORICAL";
export type VsmChartStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type VsmFlowStyle = "MANUAL" | "ELECTRONIC" | "KANBAN";
export type VsmFlowType = "PUSH" | "PULL" | "KANBAN" | "FIFO" | "SUPERMARKET" | "SHIPMENT";

// Chart process node (model-backed, for manual/linked charts)
export interface VsmChartProcess {
  id: string;
  sequence: number;
  name: string;
  departmentName: string;
  resourceGroupName: string;
  linkedDepartmentId: string | null;
  linkedResourceGroupId: string | null;
  linkedResourceId: string | null;
  operatorCount: number;
  cycleTimeValue: number | null;
  cycleTimeUnit: string;
  changeoverTimeValue: number | null;
  changeoverTimeUnit: string;
  uptimePercent: number | null;
  yieldPercent: number | null;
  wip: number | null;
  shiftsPerDay: number;
  isBottleneck: boolean;
  isPacemaker: boolean;
  processType?: string;
  valueAddType?: string;
  cycleTimeVsTakt: "above" | "below" | "at" | null;
  targetWip: number | null;
  targetCycleTimeValue: number | null;
  notes: string;
}

export interface VsmChartInventory {
  id: string;
  sequence: number;
  label: string;
  quantity: number;
  waitTimeValue: number | null;
  waitTimeUnit: string;
  severity: string;
}

export interface VsmChartInfoFlow {
  id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  label: string;
  frequency: string;
  flowStyle: string;
  method: string;
  transmissionType: string;
  triggerType: string;
  controlledProcessId: string;
  notes: string;
}

export interface VsmChartMaterialFlow {
  id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  label: string;
  flowType: string;
  deliveryFrequency?: string | null;
  equipmentType?: string;
  equipmentLabel?: string;
  distance?: number | null;
  distanceUnit?: string;
  tripFrequency?: string;
  batchSize?: number | null;
  handlingTime?: number | null;
  handlingTimeUnit?: string;
  transportSeverity?: string;
  transportCostLevel?: string;
  isInternalTransport?: boolean;
  isTransportationWaste?: boolean;
  notes?: string;
}

export interface VsmChartTimeline {
  id: string;
  sequence: number;
  processId: string | null;
  waitTimeValue: number | null;
  waitTimeUnit: string;
  processTimeValue: number | null;
  processTimeUnit: string;
  label: string;
}

export interface VsmImprovementOpportunity {
  id: string;
  processId: string | null;
  inventoryId: string | null;
  opportunityType: string;
  severity: string;
  label: string;
  message: string;
  acknowledged: boolean;
}

/** Backend persisted VSM chart */
export interface VsmChart {
  id: string;
  name: string;
  chartType: string;
  sourceMode: VsmSourceMode;
  plantId: string | null;
  productionLineId: string | null;
  departmentId: string | null;
  supplierName: string;
  customerName: string;
  productionControlTitle: string;
  controlMethod: string;
  scheduleFrequency: string;
  customerDemandRate: number | null;
  customerDemandPeriod: string;
  customerDemandUnit: string;
  availableMinutesPerShift: number;
  chartShiftsPerDay: number;
  breakTimePerShift?: number;
  plannedDowntimePerShift?: number;
  workingDaysPerWeek?: number;
  taktTimeSeconds: number | null;
  status: string;
  processes: VsmChartProcess[];
  inventories: VsmChartInventory[];
  informationFlows: VsmChartInfoFlow[];
  materialFlows: VsmChartMaterialFlow[];
  timelineSegments: VsmChartTimeline[];
  improvementOpportunities: VsmImprovementOpportunity[];
  createdAt: string;
  updatedAt: string;
}

export interface VsmChartPayload {
  chart: VsmChart | null;
  errors: string[] | null;
}

export interface VsmChartListPayload {
  charts: VsmChart[];
  total: number;
}

// ── Query types ──

export interface VsmQueryData {
  vsmDiagram: VsmDiagram;
}

// ── Takt info added to VsmDiagram ──
// (customerDemandRate, availableMinutesPerShift, chartShiftsPerDay, taktTimeSeconds
//  are added via the VsmTaktInfo interface applied to both VsmDiagram and VsmChart)

export interface ProcessSnapshot {
  productModelCount: number;
  productVariantCount: number;
  processFlowCount: number;
  activeFlowCount: number;
}
