import type { LucideIcon } from "lucide-react";
import {
  Activity, BookOpen, Cog,
  Footprints, GitBranch, Layers, LayoutDashboard, ListChecks, Monitor, PanelTop,
  Settings, ShieldCheck, Sparkles, TrendingUp, Play, ClipboardList,
  FileText, BarChart3, Workflow, ScrollText, Search, ClipboardCheck,
  Lightbulb, FileSpreadsheet,
  Package, Clock, CalendarClock, GanttChartSquare, FileCheck,
  Users, Scale, AlertTriangle, PieChart, BookText, Upload, Warehouse, Database, Briefcase, Grid3x3, Factory, SlidersHorizontal, LibraryBig, Wrench,
  Siren, Radar, TriangleAlert, BriefcaseMedical, HeartPulse, Leaf, CircleCheckBig,
  MessageSquare, User, Tag, Hash, Ruler, Shield, KeyRound, Bell, Palette, Server, Terminal, History, Mail, Webhook, HardDrive, Flag, Book,
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
  id: "myworkspace" | "plan" | "execute" | "maintenance" | "check" | "improve" | "standardize" | "system" | "docs" | "safety";
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
      { type: "item", label: "Dashboard", to: "/myworkspace/dashboard", icon: LayoutDashboard },
      { type: "item", label: "My Tasks", to: "/myworkspace/tasks", icon: ListChecks },
      { type: "item", label: "Activity Feed", to: "/myworkspace/activity-feed", icon: Activity },
      { type: "item", label: "Chat", to: "/myworkspace/chat", icon: MessageSquare },
      { type: "item", label: "Profile", to: "/myworkspace/profile", icon: User },
      { type: "item", label: "Preferences", to: "/myworkspace/preferences", icon: Settings },
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
      { type: "item", label: "MER", to: "/plan/mer", icon: Wrench },
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
      { type: "item", label: "Production Control", to: "/check/production-control", icon: Activity },
      { type: "item", label: "Quality Management", to: "/check/quality-control", icon: ShieldCheck },
      { type: "item", label: "Material Control", to: "/check/material-control", icon: Package },
      { type: "item", label: "Safety Audits", to: "/check/safety-audits", icon: ClipboardCheck },
    ],
  },

  {
    type: "section", id: "improve", label: "Improve", icon: TrendingUp,
    items: [
      { type: "item", label: "Suggestions", to: "/improve/suggestions", icon: Lightbulb },
      { type: "item", label: "Kaizen", to: "/improve/kaizen", icon: Sparkles },
      { type: "item", label: "A3 / PDCA", to: "/improve/a3-pdca", icon: ClipboardList },
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
    type: "section", id: "maintenance", label: "Maintenance", icon: Wrench,
    items: [
      { type: "item", label: "Dashboard", to: "/maintenance/dashboard", icon: LayoutDashboard },
      { type: "item", label: "Work Orders", to: "/maintenance/work-orders", icon: ClipboardList },
      { type: "item", label: "Preventive Maintenance", to: "/maintenance/preventive", icon: CalendarClock },
      { type: "item", label: "Breakdowns", to: "/maintenance/breakdowns", icon: AlertTriangle },
      { type: "item", label: "Spare Parts", to: "/maintenance/spare-parts", icon: Package },
    ],
  },
  {
    type: "section", id: "safety", label: "Safety", icon: ShieldCheck,
    items: [
      { type: "item", label: "Dashboard", to: "/safety/dashboard", icon: LayoutDashboard },
      { type: "item", label: "Incidents / Accidents", to: "/safety/incidents", icon: Siren },
      { type: "item", label: "Near Misses", to: "/safety/near-misses", icon: Radar },
      { type: "item", label: "Hazards / Observations", to: "/safety/hazards", icon: TriangleAlert },
      {
        type: "group", label: "Compliance", icon: ClipboardCheck,
        items: [
          { type: "item", label: "Injury Claims", to: "/safety/compliance/injury-claims", icon: BriefcaseMedical },
          { type: "item", label: "Medical Cases", to: "/safety/compliance/medical-cases", icon: HeartPulse },
          { type: "item", label: "Environmental Reports", to: "/safety/compliance/environmental-reports", icon: Leaf },
          { type: "item", label: "CAPA", to: "/safety/compliance/capa", icon: CircleCheckBig },
        ],
      },
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
      {
        type: "group", label: "Reference Tables", icon: FileSpreadsheet,
        items: [
          { type: "item", label: "Statuses", to: "/system/reference-tables/statuses", icon: CircleCheckBig },
          { type: "item", label: "Categories", to: "/system/reference-tables/categories", icon: Book },
          { type: "item", label: "Types", to: "/system/reference-tables/types", icon: Tag },
          { type: "item", label: "Priorities", to: "/system/reference-tables/priorities", icon: Hash },
          { type: "item", label: "Units of Measure", to: "/system/reference-tables/uom", icon: Ruler },
          { type: "item", label: "Reason Codes", to: "/system/reference-tables/reason-codes", icon: FileSpreadsheet },
        ],
      },
      {
        type: "group", label: "ERP Data", icon: Database,
        items: [
          { type: "item", label: "Import Patterns", to: "/system/erp-data/erp-patterns", icon: Briefcase },
          { type: "item", label: "Source Files", to: "/system/erp-data/import", icon: Upload },
          { type: "item", label: "Validation Results", to: "/system/erp-data", icon: FileCheck },
          { type: "item", label: "Import Logs", to: "/system/erp-data", icon: ClipboardList },
          { type: "item", label: "ERP Reference Data", to: "/system/erp-data", icon: Database },
        ],
      },
      {
        type: "group", label: "Audit Templates", icon: ClipboardCheck,
        items: [
          { type: "item", label: "Production Control Templates", to: "/system/audit-templates/production-control", icon: Activity },
          { type: "item", label: "Quality Management Templates", to: "/system/audit-templates/quality", icon: ShieldCheck },
          { type: "item", label: "Safety Templates", to: "/system/audit-templates/safety", icon: Shield },
          { type: "item", label: "Material Control Templates", to: "/system/audit-templates/material", icon: Package },
        ],
      },
      {
        type: "group", label: "Users & Roles", icon: Users,
        items: [
          { type: "item", label: "Users", to: "/system/users-and-roles", icon: Users },
          { type: "item", label: "Roles", to: "/system/users-and-roles/roles", icon: ShieldCheck },
          { type: "item", label: "Permissions", to: "/system/users-and-roles/permissions", icon: KeyRound },
          { type: "item", label: "Access Groups", to: "/system/users-and-roles/access-groups", icon: Users },
        ],
      },
      {
        type: "group", label: "Application", icon: SlidersHorizontal,
        items: [
          { type: "item", label: "App Settings", to: "/system/application-settings", icon: Cog },
          { type: "item", label: "Notifications", to: "/system/notifications", icon: Bell },
          { type: "item", label: "Numbering / Codes", to: "/system/numbering-codes", icon: Hash },
          { type: "item", label: "Feature Flags", to: "/system/feature-flags", icon: Flag },
          { type: "item", label: "Theme Defaults", to: "/system/theme-defaults", icon: Palette },
        ],
      },
      {
        type: "group", label: "System Health", icon: Monitor,
        items: [
          { type: "item", label: "Health Summary", to: "/system/health", icon: Monitor },
          { type: "item", label: "Services", to: "/system/health/services", icon: Server },
          { type: "item", label: "Database", to: "/system/health/database", icon: Database },
          { type: "item", label: "Deployment Info", to: "/system/health/deployment", icon: Terminal },
          { type: "item", label: "Recent Errors", to: "/system/health/errors", icon: AlertTriangle },
        ],
      },
      {
        type: "group", label: "Audit Logs", icon: History,
        items: [
          { type: "item", label: "User Activity", to: "/system/audit-logs/user-activity", icon: Activity },
          { type: "item", label: "Data Changes", to: "/system/audit-logs/data-changes", icon: FileText },
          { type: "item", label: "Login / Access Events", to: "/system/audit-logs/login-events", icon: KeyRound },
          { type: "item", label: "System Events", to: "/system/audit-logs/system-events", icon: History },
        ],
      },
      {
        type: "group", label: "Integrations", icon: Webhook,
        items: [
          { type: "item", label: "ERP Connections", to: "/system/integrations/erp", icon: Database },
          { type: "item", label: "Email / SMTP", to: "/system/integrations/email", icon: Mail },
          { type: "item", label: "API Keys", to: "/system/integrations/api-keys", icon: KeyRound },
          { type: "item", label: "Webhooks", to: "/system/integrations/webhooks", icon: Webhook },
          { type: "item", label: "File Storage", to: "/system/integrations/file-storage", icon: HardDrive },
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

export const navigationGroups: TopLevelEntry[][] = [
  [sidebarNav[0]],
  [sidebarNav[1]],
  [sidebarNav[2], sidebarNav[3], sidebarNav[4]],
  [sidebarNav[5], sidebarNav[6]],
  [sidebarNav[7], sidebarNav[8]],
  [sidebarNav[9], sidebarNav[10]],
];

export const navSectionIds = sidebarNav.filter((e) => e.type === "section").map((e) => (e as NavSection).id);

export function sectionFromPath(path: string): string | null {
  if (path.startsWith("/maintenance/")) return "maintenance";
  if (path.startsWith("/execution/")) return "execute";
  if (path.startsWith("/check/")) return "check";
  if (path.startsWith("/improve/")) return "improve";
  if (path.startsWith("/plan/")) return "plan";
  if (path.startsWith("/safety/")) return "safety";
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
  // Prefix matching for routes with sub-pages
  if (
    target === "/system/production-structure/components/company" ||
    target === "/system/production-structure/plants" ||
    target === "/system/production-structure/components/line" ||
    target === "/system/production-structure/departments" ||
    target === "/system/production-structure/resource-groups" ||
    target === "/system/production-structure/resources" ||
    target === "/system/reference-tables" ||
    target === "/system/erp-data" ||
    target === "/system/audit-templates" ||
    target === "/system/users-and-roles" ||
    target === "/system/health" ||
    target === "/system/audit-logs" ||
    target === "/system/integrations"
  ) {
    return path === target || path.startsWith(target + "/");
  }
  return path === target;
}
