import { create } from "zustand";

export type SystemSection = "manufacturing" | "reference" | "erp-data" | "application" | null;

interface NavigationState {
  openSection: SystemSection;
  activeRoute: string | null;
  suppressRouteOpen: boolean;
  setOpenSection: (section: SystemSection) => void;
  setActiveRoute: (route: string | null) => void;
  collapseForUserNavigation: () => void;
  consumeSuppressRouteOpen: () => boolean;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  openSection: null,
  activeRoute: null,
  suppressRouteOpen: false,
  setOpenSection: (section) =>
    set((state) => ({
      openSection: state.openSection === section ? null : section,
    })),
  setActiveRoute: (route) => set({ activeRoute: route }),
  collapseForUserNavigation: () => set({ openSection: null, suppressRouteOpen: true }),
  consumeSuppressRouteOpen: () => {
    let suppressed = false;
    set((state) => {
      suppressed = state.suppressRouteOpen;
      return state.suppressRouteOpen ? { suppressRouteOpen: false } : state;
    });
    return suppressed;
  },
}));
