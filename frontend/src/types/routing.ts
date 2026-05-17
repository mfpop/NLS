export interface MaterialFlowItem {
  id?: string;
  materialId?: string | null;
  materialCode?: string | null;
  materialName?: string | null;
  quantity: number;
  materialState?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  binId?: string | null;
  binCode?: string | null;
  binName?: string | null;
}

export interface MaterialMovementRule {
  id?: string;
  ruleType?: string | null;
  sourceLocationId?: string | null;
  sourceLocationName?: string | null;
  destinationLocationId?: string | null;
  destinationLocationName?: string | null;
  sourceBinId?: string | null;
  sourceBinName?: string | null;
  destinationBinId?: string | null;
  destinationBinName?: string | null;
  notes?: string;
}

export interface RoutingStep {
  id: string;
  routingId: string;
  sequence: number;
  departmentId?: string | null;
  departmentName?: string | null;
  resourceGroupId?: string | null;
  resourceGroupName?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
  standardWorkId?: string | null;
  standardWorkName?: string | null;
  cycleTimeSec: number;
  setupTimeSec?: number | null;
  changeoverTimeSec?: number | null;
  requiredOperators?: number | null;
  scheduleSource: string;
  bufferType?: string | null;
  wipMin?: number | null;
  wipMax?: number | null;
  qualityCheckpoint: boolean;
  reworkAllowed: boolean;
  notes: string;
  materialInputs: MaterialFlowItem[];
  materialOutputs: MaterialFlowItem[];
  movementRule?: MaterialMovementRule | null;
  createdAt: string;
  updatedAt: string;
}

export interface Routing {
  id: string;
  productionLineId: string;
  productionLineName: string;
  productFamilyId?: string | null;
  productFamilyName?: string | null;
  productModelId?: string | null;
  productModelName?: string | null;
  partNumberId?: string | null;
  partNumber?: string | null;
  partDescription?: string | null;
  version: string;
  status: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes: string;
  steps: RoutingStep[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutingSummary {
  routingId?: string | null;
  status: string;
  version?: string | null;
  routingScope?: string | null;
  message?: string | null;
  sequenceCount: number;
  firstDepartmentName?: string | null;
  lastDepartmentName?: string | null;
  bottleneckStepName?: string | null;
  bottleneckResourceGroupName?: string | null;
  constraintStatus?: string | null;
  updatedAt?: string | null;
}

export interface StepCapacity {
  sequence: number;
  departmentName?: string | null;
  cycleTimeSec: number;
  availableTimeSec: number;
  demandUnits: number;
  taktTimeSec: number;
  capacityUnits: number;
  loadPercent: number;
  capacityGapUnits: number;
  isBottleneck: boolean;
}

export interface YamazumiStep {
  sequence: number;
  departmentName?: string | null;
  resourceGroupName?: string | null;
  resourceName?: string | null;
  standardWorkName?: string | null;
  cycleTimeSec: number;
  setupTimeSec: number;
  changeoverTimeSec: number;
  workContentSec: number;
  taktTimeSec: number;
  loadPercent: number;
  requiredOperators: number;
  isBottleneck: boolean;
  isOverloaded: boolean;
}

export interface YamazumiAnalysis {
  ok: boolean;
  message: string;
  routingId?: string | null;
  routingStatus: string;
  routingVersion: string;
  productionLineId?: string | null;
  productModelId?: string | null;
  plannedQuantity: number;
  netAvailableTimeSec: number;
  taktTimeSec: number;
  totalWorkContentSec: number;
  bottleneckStepName: string;
  balanceLossPercent: number;
  operatorsRequired: number;
  overloadedResources: string[];
  steps: YamazumiStep[];
}

export interface MutationError {
  field?: string | null;
  code: string;
  message: string;
}

export interface RoutingPayload {
  ok: boolean;
  routing?: Routing | null;
  errors?: MutationError[] | null;
}

export interface RoutingStepPayload {
  ok: boolean;
  step?: RoutingStep | null;
  errors?: MutationError[] | null;
}

export interface RoutingListPayload {
  ok: boolean;
  routings: Routing[];
  errors?: MutationError[] | null;
}

export interface RoutingInput {
  productionLineId: string;
  productFamilyId?: string | null;
  productModelId?: string | null;
  partNumberId?: string | null;
  version?: string;
  status?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string;
}

export interface RoutingStepInput {
  routingId?: string | null;
  sequence: number;
  departmentId?: string | null;
  resourceGroupId?: string | null;
  resourceId?: string | null;
  standardWorkId?: string | null;
  cycleTimeSec: number;
  setupTimeSec?: number | null;
  changeoverTimeSec?: number | null;
  requiredOperators?: number | null;
  scheduleSource?: string;
  bufferType?: string | null;
  wipMin?: number | null;
  wipMax?: number | null;
  qualityCheckpoint?: boolean;
  reworkAllowed?: boolean;
  notes?: string;
}

export interface ReorderStepsInput {
  routingId: string;
  orderedStepIds: string[];
}
