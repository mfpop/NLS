import { ENTITY_CONFIG } from "./entityConfig";
import type { EntityConfigItem } from "./entityConfig";

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

export function getEntityDisplay(entityType: string, entityId: string, fallbackKey?: string): EntityConfigItem {
  const store = loadAll();
  const key = `${entityType}:${entityId}`;
  const stored = store[key];
  const configKey = stored?.iconKey || fallbackKey || entityType;
  return ENTITY_CONFIG[configKey] || ENTITY_CONFIG[entityType] || ENTITY_CONFIG.resource;
}

export function setEntityDisplay(entityType: string, entityId: string, iconKey: string) {
  const store = loadAll();
  store[`${entityType}:${entityId}`] = { iconKey };
  saveAll(store);
}
