export interface ProductFamilyAssignment {
  id: string;
  name: string;
  code: string;
  isPrimary: boolean;
  status: string;
}

export interface ProductModelAssignment {
  id: string;
  name: string;
  code: string;
  familyId?: string | null;
  familyName?: string | null;
  isPrimary: boolean;
  status: string;
}

export interface ProductModelByFamily {
  id: string;
  name: string;
  code: string;
  familyId: string;
  status: string;
}

export interface AssignedResourceGroup {
  id: string;
  resourceGroupId: string;
  resourceGroupCode?: string;
  resourceGroupName?: string;
  departmentName?: string;
  sequence: number;
  isActive: boolean;
}

export interface ProductionLine {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  statusId?: string | null;
  statusRef?: { id: string; code: string; name: string } | null;
  plantName: string;
  plantId: string;
  lineType?: string;
  lineTypeId?: string | null;
  lineTypeRef?: { id: string; code: string; name: string } | null;
  shiftPattern: string;
  shiftPatternId?: string | null;
  shiftPatternRef?: { id: string; code: string; name: string } | null;
  defaultCalendar?: string;
  defaultCalendarId?: string | null;
  defaultCalendarRef?: { id: string; code: string; name: string } | null;
  weekStartDay?: string;
  weekStartDayId?: string | null;
  weekStartDayRef?: { id: string; code: string; name: string } | null;
  timezone?: string;
  timezoneId?: string | null;
  timezoneRef?: { id: string; code: string; name: string } | null;
  productFamily?: ProductFamilyAssignment | null;
  productFamilyId?: string | null;
  productFamilies: ProductFamilyAssignment[];
  productModels: ProductModelAssignment[];
  productFamilyCount: number;
  productModelCount: number;
  primaryModelId?: string | null;
  primaryProductModel?: ProductModelAssignment | null;
  bottleneckResourceGroupCalculated?: string | null;
  constraintStatus?: string;
  capacityBasis?: string;
  capacityUom?: string;
  capacityUomId?: string | null;
  capacityUomRef?: { id: string; code: string; name: string } | null;
  bottleneckResourceGroupId?: string | null;
  bottleneckResourceGroup?: string | null;
  resourceGroupOptions?: Array<{ id: string; code: string; name: string; departmentName: string }>;
  assignedResourceGroups?: AssignedResourceGroup[];
  isConstraint: boolean;
  flowRoutingStatus: string;
  activeFlowRouteId?: string | null;
  activeFlowRouteVersion?: string | null;
  departmentCount?: number;
  groupCount?: number;
  resourceCount?: number;
  departmentLinks?: Array<{
    id: string;
    sequence: number;
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    resourceGroups: number;
    resources: number;
    schedule: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionLinePage {
  items: ProductionLine[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductionLinesQueryData {
  productionLines: ProductionLine[];
}

export interface ProductionLineQueryData {
  productionLine: ProductionLine;
}

export interface ProductionLinesQueryVars {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ProductionLineQueryVars {
  id: string;
}

export interface FlowValidationMessage {
  field: string;
  code: string;
  message: string;
}

export interface InventoryLocation {
  id: string;
  code: string;
  name: string;
  locationType: string;
  status: string;
}

export interface MaterialFlowItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  materialState: string;
  locationName?: string | null;
}

export interface ProcessFlowOperation {
  sequence: number;
  departmentName?: string | null;
  resourceGroupId?: string | null;
  resourceGroupName?: string | null;
  cycleTimeSec: number;
  inputs: MaterialFlowItem[];
  outputs: MaterialFlowItem[];
}

export interface BOMItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  scrapFactor: number;
}

export interface BOMContext {
  id: string;
  version: string;
  status: string;
  items: BOMItem[];
}

export interface ProductionLineFlowContext {
  ok: boolean;
  message?: string | null;
  isBlocked: boolean;
  routing?: { id: string; version: string; status: string; productModelId?: string | null; productModelName?: string | null } | null;
  operations: ProcessFlowOperation[];
  bom?: BOMContext | null;
  inventoryLocations: InventoryLocation[];
  validations: FlowValidationMessage[];
}

/* ── Mock data for fallback ── */

export const MOCK_PRODUCTION_LINES: any[] = [
  { id: "L001", name: "C2-Cylinder Assembly", code: "L-CYL", status: "active", plantName: "Main Plant", plantId: "1", shiftPattern: "2-shift (Morn/Aftn)", isConstraint: true, createdAt: "2024-01-15T08:00:00Z", updatedAt: "2025-03-10T14:30:00Z" },
  { id: "L002", name: "Line B (STB Units)", code: "L-B", status: "active", plantName: "Main Plant", plantId: "1", shiftPattern: "2-shift (Morn/Aftn)", isConstraint: false, createdAt: "2024-01-20T09:00:00Z", updatedAt: "2025-02-15T10:00:00Z" },
  { id: "L003", name: "Line C (Pipes)", code: "L-C", status: "active", plantName: "Main Plant", plantId: "1", shiftPattern: "1-shift (Morning)", isConstraint: false, createdAt: "2024-02-01T10:00:00Z", updatedAt: "2025-01-20T12:00:00Z" },
  { id: "L004", name: "Line A", code: "L-A", status: "active", plantName: "Main Plant", plantId: "1", shiftPattern: "2-shift (Morn/Aftn)", isConstraint: false, createdAt: "2024-02-15T08:00:00Z", updatedAt: "2025-03-01T09:00:00Z" },
  { id: "L005", name: "Line B (Shared)", code: "L-B2", status: "active", plantName: "Secondary Plant", plantId: "2", shiftPattern: "1-shift (Afternoon)", isConstraint: false, createdAt: "2024-03-01T11:00:00Z", updatedAt: "2025-02-10T14:00:00Z" },
  { id: "L006", name: "Line C (Quality)", code: "L-CQ", status: "inactive", plantName: "Secondary Plant", plantId: "2", shiftPattern: "1-shift (Morning)", isConstraint: false, createdAt: "2024-03-15T08:00:00Z", updatedAt: "2025-01-05T16:00:00Z" },
  { id: "L007", name: "C2 Units Line", code: "C2-UL", status: "active", plantName: "Main Plant", plantId: "1", shiftPattern: "2-shift (Morn/Aftn)", isConstraint: true, createdAt: "2024-04-01T08:00:00Z", updatedAt: "2025-03-15T10:00:00Z" },
];
