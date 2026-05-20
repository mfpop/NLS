import type { LucideIcon } from "lucide-react";
import {
  Activity, BookMarked, BookOpen, CircleAlert, Cog,
  Footprints, GitBranch, Layers, LayoutDashboard, ListChecks, Monitor, PanelTop,
  Settings, ShieldCheck, Sparkles, TrendingUp, Play, ClipboardList,
  FileText, BarChart3, Workflow, ScrollText, Search, ClipboardCheck,
  Lightbulb, Ruler, FileSpreadsheet, RefreshCw,
  Package, Clock, GanttChartSquare, FileCheck,
  Users, Scale, AlertTriangle, PieChart, BookText, HardDrive, Upload, Route, Warehouse, Database,
} from "lucide-react";

export interface NavLeafItem {
  type: "item";
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroupItem {
  type: "group";
  label: string;
  icon: LucideIcon;
  items: NavEntry[];
}

export type NavEntry = NavLeafItem | NavGroupItem;

export interface NavSection {
  type: "section";
  id: "myworkspace" | "plan" | "execute" | "check" | "improve" | "standardize" | "system";
  label: string;
  icon: LucideIcon;
  items: NavEntry[];
}

export type TopLevelEntry = NavLeafItem | NavSection;

export const sidebarNav: TopLevelEntry[] = [
  { type: "item", label: "Control Tower", to: "/", icon: Monitor },
  {
    type: "section", id: "myworkspace", label: "My Workspace", icon: LayoutDashboard,
    items: [
      { type: "item", label: "Personal Dashboard", to: "/myworkspace/dashboard", icon: LayoutDashboard },
      { type: "item", label: "My Tasks", to: "/myworkspace/tasks", icon: ListChecks },
    ],
  },
  {
    type: "section", id: "plan", label: "Plan", icon: ClipboardList,
    items: [
      { type: "item", label: "Production Plan", to: "/plan/production-plan", icon: FileText },
      {
        type: "group", label: "Capacity Planning", icon: BarChart3,
        items: [
          { type: "item", label: "Overview", to: "/plan/capacity", icon: BarChart3 },
          { type: "item", label: "Yamazumi", to: "/plan/capacity/yamazumi", icon: GanttChartSquare },
          { type: "item", label: "Line Balancing", to: "/plan/capacity/line-balancing", icon: Scale },
          { type: "item", label: "Bottleneck Analysis", to: "/plan/capacity/bottleneck-analysis", icon: AlertTriangle },
          { type: "item", label: "Operator Allocation", to: "/plan/capacity/operator-allocation", icon: Users },
          { type: "item", label: "Takt vs Cycle", to: "/plan/capacity/takt-vs-cycle", icon: Clock },
          { type: "item", label: "Capacity Loss", to: "/plan/capacity/capacity-loss", icon: PieChart },
          { type: "item", label: "Workload Distribution", to: "/plan/capacity/workload-distribution", icon: BarChart3 },
        ],
      },
    ],
  },
  {
    type: "section", id: "execute", label: "Execute", icon: Play,
    items: [
      { type: "item", label: "Line Performance", to: "/execution/line-performance", icon: Activity },
      { type: "item", label: "Live Shopfloor", to: "/execution/live-shopfloor", icon: PanelTop },
      { type: "item", label: "Value Stream Map", to: "/execution/vsm", icon: Workflow },
      { type: "item", label: "Daily Gemba Walk", to: "/execution/daily-gemba-walk", icon: Footprints },
    ],
  },
  {
    type: "section", id: "check", label: "Check", icon: Search,
    items: [
      { type: "item", label: "Problems", to: "/check/problems", icon: CircleAlert },
      { type: "item", label: "Actions", to: "/check/actions", icon: ListChecks },
      { type: "item", label: "Audits", to: "/check/audits", icon: ClipboardCheck },
      { type: "item", label: "Quality Control", to: "/check/quality", icon: ShieldCheck },
    ],
  },
  {
    type: "section", id: "improve", label: "Improve", icon: TrendingUp,
    items: [
      { type: "item", label: "Kaizen", to: "/improve/kaizen", icon: Sparkles },
      { type: "item", label: "Continuous Improvement", to: "/improve/continuous-improvement", icon: RefreshCw },
      { type: "item", label: "Suggestions", to: "/improve/suggestions", icon: Lightbulb },
    ],
  },
  {
    type: "section", id: "standardize", label: "Standardize", icon: Ruler,
    items: [
      { type: "item", label: "Work Instructions", to: "/standardize/work-instructions", icon: BookText },
      { type: "item", label: "Standard Work", to: "/standardize/standard-work", icon: BookOpen },
      { type: "item", label: "Material Flow Standards", to: "/standardize/material-flow-standards", icon: Package },
      { type: "item", label: "Procedures", to: "/standardize/procedures", icon: ScrollText },
      { type: "item", label: "Document Control", to: "/standardize/document-control", icon: FileCheck },
    ],
  },
  {
    type: "section", id: "system", label: "System", icon: Settings,
    items: [
      {
        type: "group", label: "Manufacturing Structure", icon: GitBranch,
        items: [
          { type: "item", label: "Flow", to: "/system/production-structure/flow", icon: GitBranch },
          { type: "item", label: "Components", to: "/system/manufacturing-structure/components", icon: Layers },
          { type: "item", label: "Warehouses", to: "/system/warehouses", icon: Warehouse },
          { type: "item", label: "Material Bins", to: "/system/material-bins", icon: Package },
          { type: "item", label: "Product Master Data", to: "/system/manufacturing-structure/product-master-data", icon: Package },
        ],
      },
      { type: "item", label: "Reference Tables", to: "/system/reference-tables", icon: FileSpreadsheet },
      {
        type: "group", label: "ERP Data", icon: HardDrive,
        items: [
          {
            type: "group", label: "Old", icon: Clock,
            items: [
              { type: "item", label: "Import Sources", to: "/system/erp-data/import-sources", icon: HardDrive },
              { type: "item", label: "Import Jobs", to: "/system/erp-data/import-jobs", icon: Upload },
              { type: "item", label: "File History", to: "/system/erp-data/file-history", icon: Clock },
              { type: "item", label: "Mapping Rules", to: "/system/erp-data/mapping-rules", icon: Route },
              { type: "item", label: "Validation Errors", to: "/system/erp-data/validation-errors", icon: AlertTriangle },
              { type: "item", label: "Integration Status", to: "/system/erp-data/integration-status", icon: Activity },
            ],
          },
          { type: "item", label: "Import/Update", to: "/system/erp-data/import", icon: Database },
          { type: "item", label: "Lineage & Relationships", to: "/system/erp-data/lineage", icon: GitBranch },
        ],
      },
      {
        type: "group", label: "Application", icon: Cog,
        items: [
          { type: "item", label: "Diagnostics", to: "/system/application/diagnostics", icon: Activity },
          { type: "item", label: "Application Settings", to: "/system/application/settings", icon: Cog },
          { type: "item", label: "Documentation Center", to: "/system/application/documentation", icon: BookMarked },
        ],
      },
    ],
  },
];

export const navSectionIds = sidebarNav.filter((e) => e.type === "section").map((e) => (e as NavSection).id);

export function sectionFromPath(path: string): string | null {
  if (path.startsWith("/execution/")) return "execute";
  if (path.startsWith("/check/")) return "check";
  if (path.startsWith("/improve/")) return "improve";
  if (path.startsWith("/plan/")) return "plan";
  if (path.startsWith("/myworkspace/")) return "myworkspace";
  if (path.startsWith("/standardize/")) return "standardize";
  if (path.startsWith("/system/") || path.startsWith("/docs/")) return "system";
  return null;
}

export function isPathActive(path: string, target: string): boolean {
  if (target === "/") return path === "/";
  return path === target || path.startsWith(target + "/");
}

export function isRouteItemActive(path: string, target: string): boolean {
  if (target === "/") return path === "/";
  if (target === "/system/manufacturing-structure/flow") {
    return path === target || path.startsWith(target + "/");
  }
  if (target === "/system/manufacturing-structure/components") {
    return path === target || path.startsWith(target + "/");
  }
  if (target === "/system/application/documentation") {
    return path === target || path.startsWith("/docs/");
  }
  if (target === "/system/erp-data") {
    return path === target || path.startsWith(target + "/");
  }
  return path === target;
}
