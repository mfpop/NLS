import { ENTITY_CONFIG } from "./config/entityConfig";
import type { EntityConfigItem } from "./config/entityConfig";
import type { LucideIcon } from "lucide-react";

const STORAGE_KEY = "lmd-entity-display";

interface EntityDisplay {
  iconKey: string;
}

function loadAll(): Record<string, EntityDisplay> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, EntityDisplay>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getEntityConfig(
  entityType: string,
  entityId: string,
  storedIconKey?: string | null
): EntityConfigItem {
  if (storedIconKey && ENTITY_CONFIG[storedIconKey]) {
    return ENTITY_CONFIG[storedIconKey];
  }
  const store = loadAll();
  const stored = store[`${entityType}:${entityId}`];
  if (stored?.iconKey && ENTITY_CONFIG[stored.iconKey]) {
    return ENTITY_CONFIG[stored.iconKey];
  }
  return ENTITY_CONFIG[entityType] || ENTITY_CONFIG.resource;
}

export function saveEntityConfig(entityType: string, entityId: string, iconKey: string) {
  const store = loadAll();
  store[`${entityType}:${entityId}`] = { iconKey };
  saveAll(store);
}

export function getEntityIconProps(
  entityType: string,
  entityId: string,
  storedIconKey?: string | null
): { Icon: LucideIcon; textColor: string; bgColor: string } {
  const cfg = getEntityConfig(entityType, entityId, storedIconKey);
  const [textColor, bgColor] = cfg.color.split(" ");
  return { Icon: cfg.icon, textColor, bgColor };
}
