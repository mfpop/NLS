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
  // Active selected item (emerald branding)
  itemActive: "bg-sidebar-active-bg text-sidebar-active-fg border-l-2 border-sidebar-control",
  // Expanded parent item
  expanded: "bg-sidebar-hover text-sidebar-foreground",
  // Child item default
  child: "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
  // Child item active
  childActive: "bg-sidebar-active-bg text-sidebar-active-fg border-l-2 border-sidebar-control",
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
};

export const masterListTokens = {
  columnBorder: "border-r border-border",
  containerPad: "pl-2",
  rail: "border-l-[2px]",
  contentPad: "px-3",
  selected: "border-l-sidebar-control bg-sidebar-active-bg",
  unselected: "border-l-transparent hover:bg-sidebar-hover",
};

export function sidebarIndent(depth: number): number {
  return depth === 0 ? 12 : 22 + depth * 10;
}
