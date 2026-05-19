export interface Warehouse {
  id: string;
  plantId: string;
  plantName: string;
  code: string;
  name: string;
  warehouseType: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInput {
  plantId: string;
  code: string;
  name: string;
  warehouseType?: string;
  location?: string;
  isActive?: boolean;
}

export interface WarehousePayload {
  ok: boolean;
  warehouse?: Warehouse | null;
  errors?: Array<{ field?: string | null; code: string; message: string }>;
}

export interface WarehousesQueryData {
  warehouses: Warehouse[];
}

export interface WarehouseQueryData {
  warehouse: Warehouse;
}

export const WAREHOUSE_TYPE_OPTIONS = [
  { value: "RM", label: "Raw Material" },
  { value: "WIP", label: "WIP" },
  { value: "FG", label: "Finished Goods" },
  { value: "SCRAP", label: "Scrap" },
  { value: "QUARANTINE", label: "Quarantine" },
  { value: "SPARES", label: "Spares" },
  { value: "GENERAL", label: "General" },
];
