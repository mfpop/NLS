export interface ProductionLine {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  plantName: string;
  plantId: string | null;
  modelsProduced: string[];
  shiftPattern: string;
  isConstraint: boolean;
  departmentCount: number;
  groupCount: number;
  resourceCount: number;
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
  productionLines: ProductionLinePage;
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

/* ── Mock data for fallback ── */

export const MOCK_PRODUCTION_LINES: ProductionLine[] = [
  {
    id: "L001", name: "C2-Cylinder Assembly", code: "L-CYL", status: "active",
    plantName: "Main Plant", plantId: "1",
    modelsProduced: ["C2 Cylinder", "STB Valve Body", "Flange Ring"],
    shiftPattern: "2-shift (Morn/Aftn)", isConstraint: true,
    departmentCount: 4, groupCount: 8, resourceCount: 18,
    createdAt: "2024-01-15T08:00:00Z", updatedAt: "2025-03-10T14:30:00Z",
  },
  {
    id: "L002", name: "Line B (STB Units)", code: "L-B", status: "active",
    plantName: "Main Plant", plantId: "1",
    modelsProduced: ["STB Unit Type A", "STB Unit Type B"],
    shiftPattern: "2-shift (Morn/Aftn)", isConstraint: false,
    departmentCount: 3, groupCount: 5, resourceCount: 12,
    createdAt: "2024-01-20T09:00:00Z", updatedAt: "2025-02-15T10:00:00Z",
  },
  {
    id: "L003", name: "Line C (Pipes)", code: "L-C", status: "active",
    plantName: "Main Plant", plantId: "1",
    modelsProduced: ["Pipe Assembly DN40", "Pipe Assembly DN80"],
    shiftPattern: "1-shift (Morning)", isConstraint: false,
    departmentCount: 2, groupCount: 4, resourceCount: 8,
    createdAt: "2024-02-01T10:00:00Z", updatedAt: "2025-01-20T12:00:00Z",
  },
  {
    id: "L004", name: "Line A", code: "L-A", status: "active",
    plantName: "Main Plant", plantId: "1",
    modelsProduced: ["Assembly Base Unit"],
    shiftPattern: "2-shift (Morn/Aftn)", isConstraint: false,
    departmentCount: 2, groupCount: 3, resourceCount: 6,
    createdAt: "2024-02-15T08:00:00Z", updatedAt: "2025-03-01T09:00:00Z",
  },
  {
    id: "L005", name: "Line B (Shared)", code: "L-B2", status: "active",
    plantName: "Secondary Plant", plantId: "2",
    modelsProduced: ["Forklift Attachment", "Pallet Adapter"],
    shiftPattern: "1-shift (Afternoon)", isConstraint: false,
    departmentCount: 2, groupCount: 3, resourceCount: 6,
    createdAt: "2024-03-01T11:00:00Z", updatedAt: "2025-02-10T14:00:00Z",
  },
  {
    id: "L006", name: "Line C (Quality)", code: "L-CQ", status: "inactive",
    plantName: "Secondary Plant", plantId: "2",
    modelsProduced: ["QC Test Specimen"],
    shiftPattern: "1-shift (Morning)", isConstraint: false,
    departmentCount: 1, groupCount: 2, resourceCount: 4,
    createdAt: "2024-03-15T08:00:00Z", updatedAt: "2025-01-05T16:00:00Z",
  },
  {
    id: "L007", name: "C2 Units Line", code: "C2-UL", status: "active",
    plantName: "Main Plant", plantId: "1",
    modelsProduced: ["C2 Unit Type A", "C2 Unit Type B", "C2 Unit Type C"],
    shiftPattern: "2-shift (Morn/Aftn)", isConstraint: true,
    departmentCount: 6, groupCount: 7, resourceCount: 18,
    createdAt: "2024-04-01T08:00:00Z", updatedAt: "2025-03-15T10:00:00Z",
  },
];
