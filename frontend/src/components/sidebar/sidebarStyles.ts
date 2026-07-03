// ── Layout background tokens (unified surface system) ──
// Sidebar uses darker bg (--sidebar: 93% lightness) for contrast against page surface (bg-muted: 95% lightness).
// Active line selector / list panels use bg-white for content readability.
export const layoutBg = {
  sidebar: "bg-sidebar",
  panelSurface: "bg-white",
  separator: "border-border-major",
  horizontalSeparator: "border-border-major",
  strongSeparator: "border-border-major",
  depth: "shadow-[2px_0_6px_-3px_hsl(var(--shadow-color)/0.35)]",
};

// ── Structural tokens (layout, dimensions, typography) ──
export const sidebarNavTokens = {
  nav: "flex-1 overflow-y-auto py-1.5 space-y-0.5 px-2",
  row: "group flex h-8 w-full items-center gap-2.5 rounded-md pr-3 text-[13px] font-medium leading-5 tracking-normal outline-none focus-visible:ring-1 focus-visible:ring-sidebar-control transition-colors duration-120",
  label: "min-w-0 flex-1 truncate text-left text-[13px] leading-5 tracking-normal",
  labelActive: "min-w-0 flex-1 truncate text-left text-[13px] font-semibold leading-5 tracking-normal",
  icon: "h-4 w-4 shrink-0 stroke-current",
  chevronActive: "h-4 w-4 shrink-0 -mt-px stroke-current transition-transform duration-120",
  active: "font-semibold",
  inactive: "font-medium",
  activeBranch: "font-medium",
  submenu: "overflow-hidden transition-all duration-120 ease-out",
  submenuInner: "space-y-0.5 py-0.5",
};

// ── Color state tokens (shared across all modules) ──
export const sidebarState = {
  // Default menu item
  item: "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground",
  // Active selected item — left border accent only, no heavy background
  itemActive: "text-sidebar-active-fg border-l-2 border-sidebar-control rounded-none hover:bg-sidebar-hover",
  // Expanded parent item
  expanded: "bg-sidebar-hover text-sidebar-foreground",
  // Child item default
  child: "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
  // Child item active — left border accent only, no heavy background
  childActive: "text-sidebar-active-fg border-l-2 border-sidebar-control rounded-none hover:bg-sidebar-hover",
  // Chevron default
  chevron: "text-sidebar-muted",
  // Chevron active/expanded
  chevronEm: "text-sidebar-control",
};

// ── Module icon colors (module identity via icon only) ──
export const sectionColors: Record<string, string> = {
  control: "text-blue-600",
  myworkspace: "text-violet-600",
  plan: "text-amber-700",
  execute: "text-emerald-700",
  maintenance: "text-blue-700",
  check: "text-sky-700",
  safety: "text-red-600",
  improve: "text-green-700",
  standardize: "text-slate-600",
  system: "text-slate-600",
  docs: "text-emerald-800",
  // Sub-modules — neutral slate
  manufacturing: "text-slate-600",
  materialBins: "text-slate-600",
  warehouses: "text-slate-600",
  flow: "text-slate-600",
  components: "text-slate-600",
  product: "text-slate-600",
  reference: "text-slate-600",
  settings: "text-slate-600",
  erpData: "text-slate-600",
  erp: "text-slate-600",
  importSources: "text-slate-600",
  importJobs: "text-slate-600",
  fileHistory: "text-slate-600",
  mappingRules: "text-slate-600",
  validationErrors: "text-slate-600",
  filePreview: "text-slate-600",
  compareResults: "text-slate-600",
  integrationStatus: "text-slate-600",
  // New sub-modules
  company: "text-slate-600",
  plants: "text-slate-600",
  productionLines: "text-slate-600",
  departments: "text-slate-600",
  resourceGroups: "text-slate-600",
  resources: "text-slate-600",
  statuses: "text-slate-600",
  categories: "text-slate-600",
  types: "text-slate-600",
  priorities: "text-slate-600",
  uom: "text-slate-600",
  reasonCodes: "text-slate-600",
  importPatterns: "text-slate-600",
  sourceFiles: "text-slate-600",
  validationResults: "text-slate-600",
  importLogs: "text-slate-600",
  erpReferenceData: "text-slate-600",
  auditTemplates: "text-slate-600",
  usersRoles: "text-slate-600",
  appSettings: "text-slate-600",
  notifications: "text-slate-600",
  numberingCodes: "text-slate-600",
  featureFlags: "text-slate-600",
  themeDefaults: "text-slate-600",
  healthSummary: "text-slate-600",
  services: "text-slate-600",
  database: "text-slate-600",
  deploymentInfo: "text-slate-600",
  recentErrors: "text-slate-600",
  userActivity: "text-slate-600",
  dataChanges: "text-slate-600",
  loginEvents: "text-slate-600",
  systemEvents: "text-slate-600",
  erpConnections: "text-slate-600",
  email: "text-slate-600",
  apiKeys: "text-slate-600",
  webhooks: "text-slate-600",
  fileStorage: "text-slate-600",
};

export const masterListTokens = {
  columnBorder: "border-r border-border-major",
  containerPad: "pl-2",
  rail: "border-l-[2px]",
  contentPad: "px-3",
  selected: "border-l-sidebar-control bg-sidebar-active-bg",
  unselected: "border-l-transparent hover:bg-sidebar-hover",
};

export function sidebarIndent(depth: number): number {
  return depth === 0 ? 12 : 22 + depth * 10;
}
