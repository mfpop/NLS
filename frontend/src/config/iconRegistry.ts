import {
  Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell,
  Building2, GitBranch, Cpu, Wrench, Cog, Boxes, Route, Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_REGISTRY: Record<string, LucideIcon> = {
  landmark: Landmark,
  building: Building2,
  factory: Factory,
  "trending-up-down": TrendingUpDown,
  "git-branch": GitBranch,
  layers: Layers,
  component: Component,
  cpu: Cpu,
  dumbbell: Dumbbell,
  wrench: Wrench,
  cog: Cog,
  boxes: Boxes,
  route: Route,
  network: Network,
};

export const ALLOWED_ICON_KEYS = Object.keys(ICON_REGISTRY);

export function getIconByKey(key: string): LucideIcon {
  return ICON_REGISTRY[key] || Layers;
}

export function getIconLabel(key: string): string {
  const labels: Record<string, string> = {
    landmark: "Landmark",
    building: "Building",
    factory: "Factory",
    "trending-up-down": "Trending Up/Down",
    "git-branch": "Git Branch",
    layers: "Layers",
    component: "Component",
    cpu: "CPU",
    dumbbell: "Dumbbell",
    wrench: "Wrench",
    cog: "Cog",
    boxes: "Boxes",
    route: "Route",
    network: "Network",
  };
  return labels[key] || key;
}

export default ICON_REGISTRY;
