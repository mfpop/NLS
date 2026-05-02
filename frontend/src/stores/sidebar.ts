import { create } from "zustand";

export type SidebarSectionId = "myworkspace" | "plan" | "execute" | "check" | "improve" | "standardize" | "system" | null;

interface SidebarState {
  openSection: SidebarSectionId;
  setOpenSection: (section: SidebarSectionId) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  openSection: null,
  setOpenSection: (section) => set({ openSection: section }),
}));

