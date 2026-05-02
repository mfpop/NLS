import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookMarked,
  BookOpen,
  CircleAlert,
  Cog,
  Database,
  Footprints,
  GitBranch,
  ListChecks,
  Monitor,
  PanelTop,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Play,
} from "./icons";

export interface SidebarLeafItem {
  type: "item";
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface SidebarSection {
  type: "section";
  id: "execution" | "check" | "improve" | "system";
  label: string;
  icon: LucideIcon;
  items: SidebarLeafItem[];
}

export type SidebarEntry = SidebarLeafItem | SidebarSection;

export const productionLines = [
  "C2-Cylinder Assembly",
  "STB Units Line",
  "C2 Units Line",
  "Harnesses Line",
  "Pipes Line",
  "Kitting Line",
  "Steps Assembly",
];

export const sidebarEntries: SidebarEntry[] = [
  {
    type: "item",
    label: "Control Tower",
    to: "/",
    icon: Monitor,
  },
  {
    type: "section",
    id: "execution",
    label: "Execution",
    icon: Play,
    items: [
      { type: "item", label: "Line Performance", to: "/execution/line-performance", icon: Activity },
      { type: "item", label: "Live Shopfloor", to: "/execution/live-shopfloor", icon: PanelTop },
      { type: "item", label: "VSM", to: "/execution/vsm", icon: GitBranch },
      { type: "item", label: "Daily Gemba Walk", to: "/execution/daily-gemba-walk", icon: Footprints },
    ],
  },
  {
    type: "section",
    id: "check",
    label: "Check",
    icon: ShieldCheck,
    items: [
      { type: "item", label: "Problems", to: "/check/problems", icon: CircleAlert },
      { type: "item", label: "Actions", to: "/check/actions", icon: ListChecks },
    ],
  },
  {
    type: "section",
    id: "improve",
    label: "Improve",
    icon: TrendingUp,
    items: [
      { type: "item", label: "Kaizen", to: "/improve/kaizen", icon: Sparkles },
      { type: "item", label: "Standard Work", to: "/improve/standard-work", icon: BookOpen },
    ],
  },
  {
    type: "section",
    id: "system",
    label: "System",
    icon: Settings,
    items: [
      { type: "item", label: "Data Management", to: "/system/data-management", icon: Database },
      { type: "item", label: "Application Settings", to: "/system/application-settings", icon: Cog },
      { type: "item", label: "Documentation Center", to: "/docs", icon: BookMarked },
    ],
  },
];