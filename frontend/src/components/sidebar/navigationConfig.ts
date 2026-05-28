import type { LucideIcon } from "lucide-react";
import {
  Activity, BookOpen, CircleAlert, Cog,
  Footprints, GitBranch, Layers, LayoutDashboard, ListChecks, Monitor, PanelTop,
  Settings, ShieldCheck, Sparkles, TrendingUp, Play, ClipboardList,
  FileText, BarChart3, Workflow, ScrollText, Search, ClipboardCheck,
  Lightbulb, FileSpreadsheet, RefreshCw,
  Package, Clock, GanttChartSquare, FileCheck,
  Users, Scale, AlertTriangle, PieChart, BookText, Upload, Warehouse, Database, Briefcase, Grid3x3, Factory, SlidersHorizontal, LibraryBig,
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
  id: "myworkspace" | "plan" | "execute" | "check" | "improve" | "standardize" | "system" | "docs";
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
          { type: "item", label: "Workload Distribution", to: "/plan/capacity/workload-distribution", icon: Grid3x3 },
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
    type: "section", id: "standardize", label: "Standardize", icon: ClipboardCheck,
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
        type: "group", label: "Production Structure", icon: Factory,
        items: [
          { type: "item", label: "Flow", to: "/system/production-structure/flow", icon: GitBranch },
          { type: "item", label: "Components", to: "/system/production-structure/components", icon: Layers },
          { type: "item", label: "Warehouses", to: "/system/warehouses", icon: Warehouse },
          { type: "item", label: "Material Bins", to: "/system/material-bins", icon: Package },
          { type: "item", label: "Product Master", to: "/system/product-master", icon: Database },
        ],
      },
      { type: "item", label: "Reference Tables", to: "/system/reference-tables", icon: FileSpreadsheet },
      {
        type: "group", label: "ERP Data", icon: Database,
        items: [
          { type: "item", label: "ERP Patterns", to: "/system/erp-data/erp-patterns", icon: Briefcase },
          { type: "item", label: "ERP Import", to: "/system/erp-data/import", icon: Upload },
        ],
      },
      {
        type: "group", label: "Application", icon: SlidersHorizontal,
        items: [
          { type: "item", label: "Diagnostics", to: "/system/application/diagnostics", icon: Activity },
          { type: "item", label: "Settings", to: "/system/application/settings", icon: Cog },
        ],
      },
    ],
  },
  {
    type: "section", id: "docs", label: "Documentation", icon: LibraryBig,
    items: [
      { type: "item", label: "User Manual", to: "/docs/user-manual", icon: BookOpen },
      { type: "item", label: "Admin Guide", to: "/docs/admin-guide", icon: ShieldCheck },
      { type: "item", label: "Training Materials", to: "/docs/training-materials", icon: Sparkles },
      { type: "item", label: "Release Notes", to: "/docs/release-notes", icon: FileText },
      { type: "item", label: "Technical Docs", to: "/docs/technical-docs", icon: BookText },
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
  if (path.startsWith("/system/")) return "system";
  if (path.startsWith("/docs/")) return "docs";
  return null;
}

export function isPathActive(path: string, target: string): boolean {
  if (target === "/") return path === "/";
  return path === target || path.startsWith(target + "/");
}

export function isRouteItemActive(path: string, target: string): boolean {
  if (target === "/") return path === "/";
  if (target === "/system/production-structure/flow") {
    return path === target || path.startsWith(target + "/");
  }
  if (target === "/system/production-structure/components") {
    return path === target || path.startsWith(target + "/");
  }
  if (target === "/system/erp-data") {
    return path === target || path.startsWith(target + "/");
  }
  return path === target;
}
