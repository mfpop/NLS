import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "lmd.activeProductionLineId";
const PLANT_KEY = "lmd.selectedPlantId";

type ActiveLineSnapshot = {
  productionLineId: string | null;
  selectedPlantId: string | null;
};

let snapshot: ActiveLineSnapshot = {
  productionLineId: typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY),
  selectedPlantId: typeof window === "undefined" ? null : window.localStorage.getItem(PLANT_KEY),
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getActiveLineId(): string | null {
  return snapshot.productionLineId;
}

export function setActiveLineId(productionLineId: string | null) {
  snapshot = { ...snapshot, productionLineId };
  if (typeof window !== "undefined") {
    if (productionLineId) {
      window.localStorage.setItem(STORAGE_KEY, productionLineId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  emit();
}

export function setSelectedPlantId(plantId: string | null) {
  snapshot = { ...snapshot, selectedPlantId: plantId };
  if (typeof window !== "undefined") {
    if (plantId) {
      window.localStorage.setItem(PLANT_KEY, plantId);
    } else {
      window.localStorage.removeItem(PLANT_KEY);
    }
  }
  emit();
}

export function resetActiveLineState() {
  setActiveLineId(null);
  setSelectedPlantId(null);
}

export function useActiveLineId(): [string | null, (productionLineId: string | null) => void] {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => ({ productionLineId: null, selectedPlantId: null })
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === PLANT_KEY) {
        snapshot = {
          productionLineId: window.localStorage.getItem(STORAGE_KEY),
          selectedPlantId: window.localStorage.getItem(PLANT_KEY),
        };
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const set = useCallback((productionLineId: string | null) => setActiveLineId(productionLineId), []);
  return [state.productionLineId, set];
}

export function useSelectedPlantId(): [string | null, (plantId: string | null) => void] {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => ({ productionLineId: null, selectedPlantId: null })
  );

  const set = useCallback((plantId: string | null) => setSelectedPlantId(plantId), []);
  return [state.selectedPlantId, set];
}
