import { create } from "zustand";

export type SidebarSectionId = "myworkspace" | "plan" | "execute" | "check" | "improve" | "standardize" | "system" | "docs" | null;

interface SidebarState {
  openSection: SidebarSectionId;
  openNestedGroup: string | null;
  suppressRouteOpen: boolean;
  setOpenSection: (section: SidebarSectionId) => void;
  setOpenNestedGroup: (label: string | null) => void;
  collapseForUserNavigation: () => void;
  consumeSuppressRouteOpen: () => boolean;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  openSection: null,
  openNestedGroup: null,
  suppressRouteOpen: false,
  setOpenSection: (section) => set({ openSection: section }),
  setOpenNestedGroup: (label) => set({ openNestedGroup: label }),
  collapseForUserNavigation: () => set({ openSection: null, openNestedGroup: null, suppressRouteOpen: true }),
  consumeSuppressRouteOpen: () => {
    let suppressed = false;
    set((state) => {
      suppressed = state.suppressRouteOpen;
      return state.suppressRouteOpen ? { suppressRouteOpen: false } : state;
    });
    return suppressed;
  },
}));

