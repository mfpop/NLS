export interface CapacityWarning {
  message: string;
}

export interface CapacityLoadRow {
  level: string;
  area: string;
  availableCapacityMinutes: number;
  requiredCapacityMinutes: number;
  utilizationPercent: number;
  gapMinutes: number;
  status: "OK" | "NEAR_CAPACITY" | "OVERLOADED" | "MISSING_DATA" | string;
}

export interface CapacityConstraint {
  severity: "CRITICAL" | "WARNING" | "INFO" | string;
  source: string;
  type: string;
  message: string;
  affected: string;
  recommendedAction: string;
  action: string;
}

export interface CapacityYamazumiItem {
  stepId: string;
  sequence: number;
  departmentName: string;
  resourceGroupName: string;
  resourceName: string;
  standardWorkName: string;
  operator: number;
  cycleTimeSeconds: number;
  manualTimeSeconds: number;
  autoTimeSeconds: number;
  setupInclusiveSeconds: number;
  workContentSeconds: number;
  taktTimeSeconds: number;
  loadPercent: number;
  isBottleneck: boolean;
  isOverloaded: boolean;
}

export interface CapacityYamazumi {
  metric: string;
  taktTimeSeconds: number;
  balanceLossPercent: number;
  items: CapacityYamazumiItem[];
}

export interface CapacityPlanInput {
  id: string;
  capacityPlanId: string;
  plannedQuantity: number;
  availableTimeMinutes: number;
  breakTimeMinutes: number;
  plannedDowntimeMinutes: number;
  netAvailableTimeMinutes: number;
  operatorsAvailable: number;
  efficiencyFactor: number;
  taktTimeSeconds: number;
}

export interface CapacityPlanResult {
  id: string;
  capacityPlanId: string;
  totalWorkContentSeconds: number;
  requiredCapacityMinutes: number;
  availableCapacityMinutes: number;
  capacityUtilizationPercent: number;
  bottleneckStepId?: string | null;
  bottleneckStepName: string;
  bottleneckResourceId?: string | null;
  bottleneckResourceName: string;
  balanceLossPercent: number;
  operatorsRequired: number;
  feasibilityStatus: string;
  warnings: CapacityWarning[];
  loadRows: CapacityLoadRow[];
  yamazumi: CapacityYamazumi;
  constraints: CapacityConstraint[];
}

export interface CapacityScenario {
  id: string;
  capacityPlanId: string;
  name: string;
  assumptionsJson: Record<string, any>;
  resultJson: Record<string, any>;
  isBaseline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CapacityPlan {
  id: string;
  plantId: string;
  plantName: string;
  productionLineId: string;
  productionLineName: string;
  productModelId: string;
  productModelName: string;
  routingVersionId: string;
  routingVersion: string;
  planningHorizonStart: string;
  planningHorizonEnd: string;
  status: "DRAFT" | "CALCULATED" | "HAS_WARNINGS" | "APPROVED" | "ARCHIVED" | string;
  createdByName: string;
  updatedByName: string;
  calculatedAt?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  inputs?: CapacityPlanInput | null;
  result?: CapacityPlanResult | null;
  warnings: CapacityWarning[];
  constraints: CapacityConstraint[];
}

export interface CapacityPlanCreateInput {
  plantId: string;
  productionLineId: string;
  productModelId: string;
  routingVersionId: string;
  planningHorizonStart: string;
  planningHorizonEnd: string;
}

export interface CapacityPlanInputUpdateInput {
  capacityPlanId: string;
  plannedQuantity: number;
  efficiencyFactor: number;
}
