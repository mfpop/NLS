import { useCallback } from "react";
import { ENTITY_CONFIG } from "../pages/system/production-structure/config/entityConfig";
import type { EntityConfigItem } from "../pages/system/production-structure/config/entityConfig";

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

export function useEntityDisplay() {
  const getConfig = useCallback((entityType: string, entityId: string, storedIconKey?: string | null): EntityConfigItem => {
    if (storedIconKey && ENTITY_CONFIG[storedIconKey]) {
      return ENTITY_CONFIG[storedIconKey];
    }
    const store = loadAll();
    const stored = store[`${entityType}:${entityId}`];
    if (stored?.iconKey && ENTITY_CONFIG[stored.iconKey]) {
      return ENTITY_CONFIG[stored.iconKey];
    }
    return ENTITY_CONFIG[entityType] || ENTITY_CONFIG.resource;
  }, []);

  const setConfig = useCallback((entityType: string, entityId: string, iconKey: string) => {
    const store = loadAll();
    store[`${entityType}:${entityId}`] = { iconKey };
    saveAll(store);
  }, []);

  return { getConfig, setConfig };
}
