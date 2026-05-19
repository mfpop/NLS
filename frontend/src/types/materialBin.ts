export interface MaterialBin {
  id: string;
  plantId: string;
  plantName: string;
  productionLineId?: string | null;
  productionLineName?: string | null;
  resourceGroupId?: string | null;
  resourceGroupName?: string | null;
  code: string;
  name: string;
  description: string;
  binType: string;
  materialId?: string | null;
  materialCode?: string | null;
  materialName?: string | null;
  materialGroup: string;
  capacity: number;
  uomId?: string | null;
  uomName?: string | null;
  replenishmentMode?: string | null;
  fifoEnabled: boolean;
  supermarketEnabled: boolean;
  locationCode: string;
  locationReference: string;
  warehouseCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialBinInput {
  plantId?: string | null;
  productionLineId?: string | null;
  resourceGroupId?: string | null;
  code: string;
  name: string;
  description?: string;
  binType: string;
  materialId?: string | null;
  materialGroup?: string;
  capacity?: number;
  uomId?: string | null;
  replenishmentMode?: string | null;
  fifoEnabled?: boolean;
  supermarketEnabled?: boolean;
  locationCode?: string;
  locationReference?: string;
  warehouseCode?: string;
  isActive?: boolean;
}

export interface MaterialBinPayload {
  ok: boolean;
  materialBin?: MaterialBin | null;
  errors?: Array<{ field?: string | null; code: string; message: string }>;
}

export interface MaterialBinsQueryData {
  materialBins: MaterialBin[];
}

export interface MaterialBinQueryData {
  materialBin: MaterialBin;
}

export interface MaterialBinsByPlantData {
  materialBinsByPlant: MaterialBin[];
}

export interface MaterialBinsByWarehouseData {
  materialBinsByWarehouse: MaterialBin[];
}

export interface MaterialBinsByResourceGroupData {
  materialBinsByResourceGroup: MaterialBin[];
}

export const BIN_TYPE_OPTIONS = [
  { value: "RM", label: "Raw Material" },
  { value: "INPUT", label: "Input" },
  { value: "OUTPUT", label: "Output" },
  { value: "WIP", label: "WIP" },
  { value: "FIFO", label: "FIFO" },
  { value: "SUPERMARKET", label: "Supermarket" },
  { value: "FG", label: "Finished Goods" },
  { value: "SCRAP", label: "Scrap" },
  { value: "QUARANTINE", label: "Quarantine" },
  { value: "SPARES", label: "Spares" },
  { value: "LINE_SIDE", label: "Line Side" },
];

export const REPLENISHMENT_OPTIONS = [
  { value: "MANUAL", label: "Manual" },
  { value: "KANBAN", label: "Kanban" },
  { value: "CONWIP", label: "Conwip" },
  { value: "PULL", label: "Pull" },
  { value: "PUSH", label: "Push" },
  { value: "REORDER_POINT", label: "Reorder Point" },
  { value: "MIN_MAX", label: "Min/Max" },
];
