import type { LucideIcon } from "lucide-react";
import {
  Activity, BookMarked, BookOpen, CircleAlert, Cog, Database,
  Footprints, GitBranch, Layers, LayoutDashboard, ListChecks, Monitor, PanelTop,
  Settings, ShieldCheck, Sparkles, TrendingUp, Play, ClipboardList,
  FileText, BarChart3, Workflow, ScrollText, Search, ClipboardCheck,
  Lightbulb, Award, Ruler, FileSpreadsheet, RefreshCw,
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

export const PLANTS_FALLBACK = [
  { name: "Main Plant", lines: ["C2-Cylinder Assembly", "STB Units Line", "C2 Units Line"] },
  { name: "Secondary Plant", lines: ["Harnesses Line", "Pipes Line"] },
  { name: "Warehouse Plant", lines: ["Kitting Line", "Steps Assembly"] },
];

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
      { type: "item", label: "Capacity Planning", to: "/plan/capacity", icon: BarChart3 },
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
      { type: "item", label: "Standard Work", to: "/standardize/standard-work", icon: BookOpen },
      { type: "item", label: "Procedures", to: "/standardize/procedures", icon: ScrollText },
      { type: "item", label: "Templates", to: "/standardize/templates", icon: FileSpreadsheet },
      { type: "item", label: "Best Practices", to: "/standardize/best-practices", icon: Award },
    ],
  },
  {
    type: "section", id: "system", label: "System", icon: Settings,
    items: [
      {
        type: "group", label: "Production Structure", icon: Database,
        items: [
          { type: "item", label: "Flow", to: "/system/production-structure/flow", icon: GitBranch },
          { type: "item", label: "Components", to: "/system/production-structure/components", icon: Layers },
        ],
      },
      { type: "item", label: "Reference Tables", to: "/system/reference-tables", icon: FileSpreadsheet },
      { type: "item", label: "Application Settings", to: "/system/application-settings", icon: Cog },
      {
        type: "group", label: "Documentation Center", icon: BookMarked,
        items: [
          { type: "item", label: "Setup Reference", to: "/docs/setup", icon: BookOpen },
          {
            type: "group", label: "Core Documentation", icon: BookMarked,
            items: [
              { type: "item", label: "Architecture", to: "/docs/core/architecture", icon: BookOpen },
              { type: "item", label: "Domain Spec", to: "/docs/core/domain-spec", icon: BookOpen },
              { type: "item", label: "Domain Constitution", to: "/docs/core/domain-constitution", icon: BookOpen },
              { type: "item", label: "Diagrams", to: "/docs/core/diagrams", icon: BookOpen },
            ],
          },
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
