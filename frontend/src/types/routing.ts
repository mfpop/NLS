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
