import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "lmd.activeProductionLineId";

type ActiveLineSnapshot = {
  productionLineId: string | null;
};

let snapshot: ActiveLineSnapshot = {
  productionLineId: typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY),
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getActiveLineId(): string | null {
  return snapshot.productionLineId;
}

export function setActiveLineId(productionLineId: string | null) {
  snapshot = { productionLineId };
  if (typeof window !== "undefined") {
    if (productionLineId) {
      window.localStorage.setItem(STORAGE_KEY, productionLineId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  emit();
}

export function resetActiveLineState() {
  setActiveLineId(null);
}

export function useActiveLineId(): [string | null, (productionLineId: string | null) => void] {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => ({ productionLineId: null })
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        snapshot = { productionLineId: event.newValue };
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const set = useCallback((productionLineId: string | null) => setActiveLineId(productionLineId), []);
  return [state.productionLineId, set];
}
