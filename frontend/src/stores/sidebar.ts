import { create } from "zustand";

export type SidebarSectionId = "execution" | "check" | "improve" | "system" | null;

interface SidebarState {
  openSection: SidebarSectionId;
  setOpenSection: (section: SidebarSectionId) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  openSection: "execution",
  setOpenSection: (section) => set({ openSection: section }),
}));
