export type ImportSourceType = "EXCEL" | "CSV" | "ERP_EXPORT";

export type ImportDomain =
  | "PLANT_STRUCTURE"
  | "MATERIALS"
  | "BOM"
  | "ROUTING"
  | "SCHEDULES"
  | "INVENTORY";

export interface ImportSourceConfig {
  id: string;
  name: string;
  sourceType: ImportSourceType;
  domain: ImportDomain;
  path: string;
  filePattern: string;
  archivePath?: string | null;
  errorPath?: string | null;
  isActive: boolean;
  isArchived: boolean;
  lastCheckedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportSourceConfigInput {
  name: string;
  sourceType: ImportSourceType;
  domain: ImportDomain;
  path: string;
  filePattern: string;
  archivePath?: string | null;
  errorPath?: string | null;
  isActive?: boolean;
}
