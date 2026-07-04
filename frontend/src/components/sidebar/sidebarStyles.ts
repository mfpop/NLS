// ── Layout background tokens (unified surface system) ──
// Sidebar uses darker bg (--sidebar: 93% lightness) for contrast against page surface (bg-muted: 95% lightness).
// Active line selector / list panels use bg-background for content readability.
export const layoutBg = {
  sidebar: "bg-sidebar",
  panelSurface: "bg-background",
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
  control: "text-primary",
  myworkspace: "text-violet-600",
  plan: "text-warning",
  execute: "text-success",
  maintenance: "text-primary",
  check: "text-accent-foreground",
  safety: "text-danger",
  improve: "text-success",
  standardize: "text-muted-foreground",
  system: "text-muted-foreground",
  docs: "text-success",
  // Sub-modules — neutral slate
  manufacturing: "text-muted-foreground",
  materialBins: "text-muted-foreground",
  warehouses: "text-muted-foreground",
  flow: "text-muted-foreground",
  components: "text-muted-foreground",
  product: "text-muted-foreground",
  reference: "text-muted-foreground",
  settings: "text-muted-foreground",
  erpData: "text-muted-foreground",
  erp: "text-muted-foreground",
  importSources: "text-muted-foreground",
  importJobs: "text-muted-foreground",
  fileHistory: "text-muted-foreground",
  mappingRules: "text-muted-foreground",
  validationErrors: "text-muted-foreground",
  filePreview: "text-muted-foreground",
  compareResults: "text-muted-foreground",
  integrationStatus: "text-muted-foreground",
  // New sub-modules
  company: "text-muted-foreground",
  plants: "text-muted-foreground",
  productionLines: "text-muted-foreground",
  departments: "text-muted-foreground",
  resourceGroups: "text-muted-foreground",
  resources: "text-muted-foreground",
  statuses: "text-muted-foreground",
  categories: "text-muted-foreground",
  types: "text-muted-foreground",
  priorities: "text-muted-foreground",
  uom: "text-muted-foreground",
  reasonCodes: "text-muted-foreground",
  importPatterns: "text-muted-foreground",
  sourceFiles: "text-muted-foreground",
  validationResults: "text-muted-foreground",
  importLogs: "text-muted-foreground",
  erpReferenceData: "text-muted-foreground",
  auditTemplates: "text-muted-foreground",
  usersRoles: "text-muted-foreground",
  appSettings: "text-muted-foreground",
  notifications: "text-muted-foreground",
  numberingCodes: "text-muted-foreground",
  featureFlags: "text-muted-foreground",
  themeDefaults: "text-muted-foreground",
  healthSummary: "text-muted-foreground",
  services: "text-muted-foreground",
  database: "text-muted-foreground",
  deploymentInfo: "text-muted-foreground",
  recentErrors: "text-muted-foreground",
  userActivity: "text-muted-foreground",
  dataChanges: "text-muted-foreground",
  loginEvents: "text-muted-foreground",
  systemEvents: "text-muted-foreground",
  erpConnections: "text-muted-foreground",
  email: "text-muted-foreground",
  apiKeys: "text-muted-foreground",
  webhooks: "text-muted-foreground",
  fileStorage: "text-muted-foreground",
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
