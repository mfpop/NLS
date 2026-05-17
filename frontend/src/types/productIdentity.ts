export interface ProductFamily {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  isActive: boolean;
}

export interface ProductModel {
  id: string;
  familyId?: string | null;
  familyName?: string | null;
  code: string;
  name: string;
  description?: string;
  status: string;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  modelId: string;
  modelName: string;
  code: string;
  name: string;
  configurationSummary?: string;
  status: string;
  isActive: boolean;
}

export interface PartNumber {
  id: string;
  familyId: string;
  familyName: string;
  modelId: string;
  modelName: string;
  variantId?: string | null;
  variantName?: string | null;
  partNumber: string;
  description: string;
  revision: string;
  uom: string;
  status: string;
  isActive: boolean;
}

export interface BOMItem {
  id: string;
  materialId?: string;
  materialCode?: string;
  materialName?: string;
  quantity: number;
  scrapFactor?: number;
}

export interface BOM {
  id: string;
  partNumberId?: string;
  partNumber?: string;
  version: string;
  status: string;
  notes?: string;
  items?: BOMItem[];
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutingStep {
  id: string;
  sequence: number;
  departmentId?: string;
  departmentName?: string;
  resourceGroupId?: string;
  resourceGroupName?: string;
  resourceId?: string;
  resourceName?: string;
  cycleTimeSec: number;
  setupTimeSec?: number;
  changeoverTimeSec?: number;
  requiredOperators?: number;
  scheduleSource?: string;
  bufferType?: string;
  wipMin?: number;
  wipMax?: number;
  qualityCheckpoint?: boolean;
  reworkAllowed?: boolean;
  notes?: string;
}

export interface RoutingAssignment {
  id: string;
  productionLineId: string;
  productionLineName: string;
  productModelId?: string;
  productModelName?: string;
  partNumberId?: string;
  partNumber?: string;
  partDescription?: string;
  version: string;
  status: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
  stepCount?: number;
  steps?: RoutingStep[];
  createdAt?: string;
  updatedAt?: string;
}
