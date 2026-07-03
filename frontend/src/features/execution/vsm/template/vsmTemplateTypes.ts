// ── Pure render model — no business logic, no API dependencies ──

export interface FactoryModel {
  label: string;
  typeLabel: string;
}

export interface ProductionControlModel {
  title: string;
  lineLabel: string;
  methodLabel: string;
  frequencyLabel: string;
  pacemakerLabel?: string;
}

export interface AvailableTimeModel {
  minutesPerShift: number;
  shiftsPerDay: number;
  label: string;
}

export interface DataRowModel {
  label: string;
  value: string;
  severity?: "normal" | "warning" | "critical";
}

export type OpportunityType = "HIGH_WIP" | "CT_ABOVE_TAKT" | "LOW_UPTIME" | "QUALITY_LOSS";

export interface ImprovementOpportunity {
  type: OpportunityType;
  severity: "minor" | "major" | "critical";
  label: string;
  message: string;
}

export interface ProcessSymbolModel {
  id: string;
  sequence: number;
  name: string;
  departmentLabel: string;
  operatorCount: number;
  isActive: boolean;
  isSelected: boolean;
  isBottleneck: boolean;
  isPacemaker: boolean;
  isAboveTakt: boolean | null;  // true=C/T>takt, false=C/T<takt, null=no takt
  /** Total WIP for this process (from backend or inventory). KPI bar owns summary. */
  wip: number;
  severity?: "normal" | "warning" | "critical";  // from worst data-row severity (uptime, etc.)
  processType?: "MANUFACTURING" | "INSPECTION" | "LOGISTICS" | "STORAGE" | "TRANSPORT" | "PACKAGING" | "SUPPORT" | "UNKNOWN";
  valueAddType?: "VALUE_ADD" | "NON_VALUE_ADD_REQUIRED" | "NON_VALUE_ADD_WASTE" | "UNKNOWN";
  dataRows: DataRowModel[];
  opportunities: ImprovementOpportunity[];
}

export interface InventoryModel {
  id: string;
  quantity: number;
  waitTimeLabel: string;
  label: string;
  type: string;
  severity: "normal" | "warning" | "critical";
}

export interface MaterialFlowModel {
  from: string;
  to: string;
  label: string | null;
  type: "PUSH" | "PULL" | "KANBAN" | "FIFO" | "SUPERMARKET" | "SHIPMENT";
  deliveryFrequency?: string | null;
  equipmentType?: string;
  equipmentLabel?: string;
  distance?: number | null;
  distanceUnit?: string;
  tripFrequency?: string;
  batchSize?: number | null;
  handlingTime?: number | null;
  handlingTimeUnit?: string;
  transportSeverity?: "NORMAL" | "WARNING" | "CRITICAL" | "UNKNOWN";
  transportCostLevel?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  isInternalTransport?: boolean;
  isTransportationWaste?: boolean;
  notes?: string;
}

export interface InformationFlowModel {
  from: "CUSTOMER" | "PC" | "SUPPLIER" | string;
  to: "CUSTOMER" | "PC" | "SUPPLIER" | string;
  label: string;
  frequency: string | null;
  flowStyle?: "MANUAL" | "ELECTRONIC" | "KANBAN" | "SCHEDULE";
  method?: string;
  transmissionType?: string;
  triggerType?: string;
  controlledProcessId?: string;
  notes?: string;
}

export interface TimelineSegmentModel {
  processId: string;
  waitTimeLabel: string | null;
  processTimeLabel: string | null;
  processLabel: string;
}

export interface TotalsModel {
  leadTimeLabel: string;
  valueAddedTimeLabel: string;
  valueAddedPercentLabel: string;
  valueAddedPercent: number;
}

export type ChartStateType = "CURRENT_STATE" | "FUTURE_STATE" | "HISTORICAL";

export interface BusinessImpactModel {
  inventoryCost: string | null;
  inventoryCostStatus?: "GOOD" | "WARNING" | "CRITICAL" | "UNKNOWN";
  inventoryTurns: string | null;
  inventoryTurnsStatus?: "GOOD" | "WARNING" | "CRITICAL" | "UNKNOWN";
  serviceLevel: string | null;
  serviceLevelStatus?: "GOOD" | "WARNING" | "CRITICAL" | "UNKNOWN";
  leadTimeReductionOpp: string | null;
  leadTimeReductionStatus?: "GOOD" | "WARNING" | "CRITICAL" | "UNKNOWN";
  wipReductionOpp: string | null;
  estimatedSavings?: string | null;
  lastCalculatedAt?: string | null;
}

export interface StandardVsmTemplateModel {
  supplier: FactoryModel;
  customer: FactoryModel;
  productionControl: ProductionControlModel | null;
  processes: ProcessSymbolModel[];
  inventories: InventoryModel[];
  materialFlows: MaterialFlowModel[];
  informationFlows: InformationFlowModel[];
  timelineSegments: TimelineSegmentModel[];
  totals: TotalsModel;
  taktTimeSeconds: number | null;
  taktTimeDisplay: string;
  taktTimeStatus: "ok" | "missing_demand" | "missing_available_time" | "not_calculated";
  taktTimeMissingReason: string | null;
  availableWorkingTime: AvailableTimeModel | null;
  chartState: ChartStateType;
  businessImpact: BusinessImpactModel | null;
  improvementOpportunities: ImprovementOpportunity[];
  /** Demand display string for KPI bar (formatted). KPI bar owns all summary values. */
  demandDisplay?: string | null;
}
