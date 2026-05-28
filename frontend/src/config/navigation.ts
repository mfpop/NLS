import type { LucideIcon } from "lucide-react";
import {
  Activity as Pulse,
  GitBranch, Layers, Warehouse, Package,
  FileSpreadsheet, HardDrive, Upload, Clock, Route, AlertTriangle,
  Cog, BookMarked,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const systemNav: NavEntry[] = [
  {
    label: "Production Structure",
    icon: GitBranch,
    items: [
      { label: "Flow", to: "/system/production-structure/flow", icon: GitBranch },
      { label: "Components", to: "/system/manufacturing-structure/components", icon: Layers },
      { label: "Warehouses", to: "/system/warehouses", icon: Warehouse },
      { label: "Material Bins", to: "/system/material-bins", icon: Package },
      { label: "Product Master Data", to: "/system/manufacturing-structure/product-master-data", icon: Package },
    ],
  },
  { label: "Reference Tables", to: "/system/reference-tables", icon: FileSpreadsheet },
  {
    label: "ERP Data",
    icon: HardDrive,
    items: [
      { label: "Import Sources", to: "/system/erp-data/import-sources", icon: HardDrive },
      { label: "Import Jobs", to: "/system/erp-data/import-jobs", icon: Upload },
      { label: "File History", to: "/system/erp-data/file-history", icon: Clock },
      { label: "Mapping Rules", to: "/system/erp-data/mapping-rules", icon: Route },
      { label: "Validation Errors", to: "/system/erp-data/validation-errors", icon: AlertTriangle },
      { label: "Integration Status", to: "/system/erp-data/integration-status", icon: Pulse },
    ],
  },
  {
    label: "Application",
    icon: Cog,
    items: [
      { label: "Diagnostics", to: "/system/application/diagnostics", icon: Pulse },
      { label: "Settings", to: "/system/application/settings", icon: Cog },
      { label: "Documentation Center", to: "/system/application/documentation", icon: BookMarked },
    ],
  },
];

export function sectionForRoute(path: string): string | null {
  if (path.startsWith("/system/manufacturing-structure") || path.startsWith("/system/warehouses") || path.startsWith("/system/material-bins") || path.startsWith("/system/product-master-data")) return "manufacturing";
  if (path.startsWith("/system/reference-tables")) return "reference";
  if (path.startsWith("/system/erp-data")) return "erp-data";
  if (path.startsWith("/system/application") || path.startsWith("/system/diagnostics") || path.startsWith("/system/application-settings") || path.startsWith("/docs/")) return "application";
  return null;
}
