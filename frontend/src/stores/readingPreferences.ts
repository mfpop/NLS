import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReadingTheme = "light" | "sepia" | "dark";

export type FontSize = "sm" | "base" | "lg" | "xl";

export interface ReadingPreferencesState {
  /** The background/ink theme for the reader pane */
  readingTheme: ReadingTheme;
  setReadingTheme: (theme: ReadingTheme) => void;

  /** Font size preset */
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

export const useReadingPreferences = create<ReadingPreferencesState>()(
  persist(
    (set) => ({
      readingTheme: "light",
      setReadingTheme: (readingTheme) => set({ readingTheme }),
      fontSize: "base",
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: "lmd-reading-prefs",
    }
  )
);

/** Map font size preset to Tailwind `text-*` class and prose-scale overrides */
export const FONT_SIZE_CONFIG: Record<FontSize, {
  label: string;
  textClass: string;
  proseScale: string;
  paragraphSize: string;
}> = {
  sm: {
    label: "Small",
    textClass: "text-sm",
    proseScale: "prose-sm",
    paragraphSize: "text-[13px] leading-6",
  },
  base: {
    label: "Medium",
    textClass: "text-base",
    proseScale: "prose-base",
    paragraphSize: "text-[15px] leading-7",
  },
  lg: {
    label: "Large",
    textClass: "text-lg",
    proseScale: "prose-lg",
    paragraphSize: "text-[17px] leading-8",
  },
  xl: {
    label: "X-Large",
    textClass: "text-xl",
    proseScale: "prose-xl",
    paragraphSize: "text-[19px] leading-9",
  },
};

/** Background colours for each reading theme */
export const READING_THEME_STYLES: Record<ReadingTheme, {
  bg: string;
  text: string;
  proseBg: string;
  navBg: string;
  border: string;
  accent: string;
  muted: string;
}> = {
  light: {
    bg: "bg-background",
    text: "text-gray-900",
    proseBg: "bg-background",
    navBg: "bg-gray-50",
    border: "border-gray-200",
    accent: "text-primary",
    muted: "text-gray-500",
  },
  sepia: {
    bg: "bg-[#fbf0d9]",
    text: "text-[#5f4b32]",
    proseBg: "bg-[#fbf0d9]",
    navBg: "bg-[#f5e6c8]",
    border: "border-[#e8d5a8]",
    accent: "text-[#8b6914]",
    muted: "text-[#8b7d6b]",
  },
  dark: {
    bg: "bg-[#0f1118]",
    text: "text-[#e8e8e8]",
    proseBg: "bg-[#0f1118]",
    navBg: "bg-[#1a1c26]",
    border: "border-[#2a2c38]",
    accent: "text-[#5ea6f0]",
    muted: "text-[#8b8f9e]",
  },
};
