import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DensityMode = "comfortable" | "compact";
export type SidebarMode = "expanded" | "collapsed";
export type UnitsSystem = "metric" | "imperial";
export type TimeFormatPref = "12h" | "24h";

type PreferencesData = {
  density: DensityMode;
  sidebarDefault: SidebarMode;
  defaultPlant: string;
  defaultLine: string;
  rememberLastLine: boolean;
  inAppNotifications: boolean;
  emailNotifications: boolean;
  notifyFindings: boolean;
  notifyTasks: boolean;
  notifyApprovals: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: TimeFormatPref;
  defaultPageSize: number;
  showArchivedRecords: boolean;
  measurementUnits: UnitsSystem;
  autoLockTimeout: number;
};

type PreferencesActions = {
  setDensity: (density: DensityMode) => void;
  setSidebarDefault: (mode: SidebarMode) => void;
  setDefaultPlant: (plant: string) => void;
  setDefaultLine: (line: string) => void;
  setRememberLastLine: (remember: boolean) => void;
  setInAppNotifications: (enabled: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setNotifyFindings: (enabled: boolean) => void;
  setNotifyTasks: (enabled: boolean) => void;
  setNotifyApprovals: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
  setTimezone: (tz: string) => void;
  setDateFormat: (fmt: string) => void;
  setTimeFormat: (fmt: TimeFormatPref) => void;
  setDefaultPageSize: (size: number) => void;
  setShowArchivedRecords: (show: boolean) => void;
  setMeasurementUnits: (units: UnitsSystem) => void;
  setAutoLockTimeout: (minutes: number) => void;
  resetAll: () => void;
};

export type PreferencesState = PreferencesData & PreferencesActions;

const DEFAULTS: PreferencesData = {
  density: "comfortable",
  sidebarDefault: "expanded",
  defaultPlant: "",
  defaultLine: "",
  rememberLastLine: true,
  inAppNotifications: true,
  emailNotifications: false,
  notifyFindings: true,
  notifyTasks: true,
  notifyApprovals: true,
  language: "en-US",
  timezone: "UTC",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24h",
  defaultPageSize: 25,
  showArchivedRecords: false,
  measurementUnits: "metric",
  autoLockTimeout: 30,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setDensity: (density) => set({ density }),
      setSidebarDefault: (sidebarDefault) => set({ sidebarDefault }),
      setDefaultPlant: (defaultPlant) => set({ defaultPlant }),
      setDefaultLine: (defaultLine) => set({ defaultLine }),
      setRememberLastLine: (rememberLastLine) => set({ rememberLastLine }),
      setInAppNotifications: (inAppNotifications) => set({ inAppNotifications }),
      setEmailNotifications: (emailNotifications) => set({ emailNotifications }),
      setNotifyFindings: (notifyFindings) => set({ notifyFindings }),
      setNotifyTasks: (notifyTasks) => set({ notifyTasks }),
      setNotifyApprovals: (notifyApprovals) => set({ notifyApprovals }),
      setLanguage: (language) => set({ language }),
      setTimezone: (timezone) => set({ timezone }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setDefaultPageSize: (defaultPageSize) => set({ defaultPageSize }),
      setShowArchivedRecords: (showArchivedRecords) => set({ showArchivedRecords }),
      setMeasurementUnits: (measurementUnits) => set({ measurementUnits }),
      setAutoLockTimeout: (autoLockTimeout) => set({ autoLockTimeout }),
      resetAll: () => set(DEFAULTS),
    }),
    {
      name: "lmd-user-preferences",
    },
  ),
);
