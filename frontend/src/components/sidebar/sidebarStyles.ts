export const sidebarNavTokens = {
  nav: "flex-1 overflow-y-auto py-1 space-y-[3px] px-2",
  row: "group flex h-8 w-full items-center gap-2.5 border-l-2 border-l-transparent pr-3 text-[13px] font-medium leading-5 tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-120",
  label: "min-w-0 flex-1 truncate text-left text-[13px] leading-5 tracking-normal",
  labelActive: "min-w-0 flex-1 truncate text-left text-[13px] font-semibold leading-5 tracking-normal",
  icon: "h-4 w-4 shrink-0 stroke-current",
  chevron: "h-4 w-4 shrink-0 stroke-current transition-transform duration-120",
  active: "font-semibold",
  inactive: "font-medium",
  activeBranch: "font-medium",
  submenu: "overflow-hidden transition-all duration-120 ease-out",
  submenuInner: "space-y-[3px] py-0.5",
};

export const sectionColors: Record<string, {
  activeBg: string;
  hoverBg: string;
  icon: string;
  iconActive: string;
  textActive: string;
  chevron: string;
}> = {
  control: {
    activeBg: "bg-sidebar-control/15",
    hoverBg: "hover:bg-sidebar-control/10 hover:text-sidebar-control",
    icon: "text-sidebar-control/85 group-hover:text-sidebar-control",
    iconActive: "text-sidebar-control",
    textActive: "text-sidebar-control",
    chevron: "text-sidebar-control/75",
  },
  myworkspace: {
    activeBg: "bg-sidebar-workspace/15",
    hoverBg: "hover:bg-sidebar-workspace/10 hover:text-sidebar-workspace",
    icon: "text-sidebar-workspace/85 group-hover:text-sidebar-workspace",
    iconActive: "text-sidebar-workspace",
    textActive: "text-sidebar-workspace",
    chevron: "text-sidebar-workspace/75",
  },
  plan: {
    activeBg: "bg-sidebar-plan/15",
    hoverBg: "hover:bg-sidebar-plan/10 hover:text-sidebar-plan",
    icon: "text-sidebar-plan/85 group-hover:text-sidebar-plan",
    iconActive: "text-sidebar-plan",
    textActive: "text-sidebar-plan",
    chevron: "text-sidebar-plan/75",
  },
  execute: {
    activeBg: "bg-sidebar-execute/15",
    hoverBg: "hover:bg-sidebar-execute/10 hover:text-sidebar-execute",
    icon: "text-sidebar-execute/85 group-hover:text-sidebar-execute",
    iconActive: "text-sidebar-execute",
    textActive: "text-sidebar-execute",
    chevron: "text-sidebar-execute/75",
  },
  check: {
    activeBg: "bg-sidebar-check/15",
    hoverBg: "hover:bg-sidebar-check/10 hover:text-sidebar-check",
    icon: "text-sidebar-check/85 group-hover:text-sidebar-check",
    iconActive: "text-sidebar-check",
    textActive: "text-sidebar-check",
    chevron: "text-sidebar-check/75",
  },
  improve: {
    activeBg: "bg-sidebar-improve/15",
    hoverBg: "hover:bg-sidebar-improve/10 hover:text-sidebar-improve",
    icon: "text-sidebar-improve/85 group-hover:text-sidebar-improve",
    iconActive: "text-sidebar-improve",
    textActive: "text-sidebar-improve",
    chevron: "text-sidebar-improve/75",
  },
  standardize: {
    activeBg: "bg-sidebar-standardize/15",
    hoverBg: "hover:bg-sidebar-standardize/10 hover:text-sidebar-standardize",
    icon: "text-sidebar-standardize/85 group-hover:text-sidebar-standardize",
    iconActive: "text-sidebar-standardize",
    textActive: "text-sidebar-standardize",
    chevron: "text-sidebar-standardize/75",
  },
  system: {
    activeBg: "bg-sidebar-system/15",
    hoverBg: "hover:bg-sidebar-system/10 hover:text-sidebar-system",
    icon: "text-sidebar-system/85 group-hover:text-sidebar-system",
    iconActive: "text-sidebar-system",
    textActive: "text-sidebar-system",
    chevron: "text-sidebar-system/75",
  },
  manufacturing: {
    activeBg: "bg-sidebar-manufacturing/15",
    hoverBg: "hover:bg-sidebar-manufacturing/10 hover:text-sidebar-manufacturing",
    icon: "text-sidebar-manufacturing/85 group-hover:text-sidebar-manufacturing",
    iconActive: "text-sidebar-manufacturing",
    textActive: "text-sidebar-manufacturing",
    chevron: "text-sidebar-manufacturing/75",
  },
  flow: {
    activeBg: "bg-sidebar-flow/15",
    hoverBg: "hover:bg-sidebar-flow/10 hover:text-sidebar-flow",
    icon: "text-sidebar-flow/85 group-hover:text-sidebar-flow",
    iconActive: "text-sidebar-flow",
    textActive: "text-sidebar-flow",
    chevron: "text-sidebar-flow/75",
  },
  components: {
    activeBg: "bg-sidebar-components/15",
    hoverBg: "hover:bg-sidebar-components/10 hover:text-sidebar-components",
    icon: "text-sidebar-components/85 group-hover:text-sidebar-components",
    iconActive: "text-sidebar-components",
    textActive: "text-sidebar-components",
    chevron: "text-sidebar-components/75",
  },
  product: {
    activeBg: "bg-sidebar-product/15",
    hoverBg: "hover:bg-sidebar-product/10 hover:text-sidebar-product",
    icon: "text-sidebar-product/85 group-hover:text-sidebar-product",
    iconActive: "text-sidebar-product",
    textActive: "text-sidebar-product",
    chevron: "text-sidebar-product/75",
  },
  reference: {
    activeBg: "bg-sidebar-reference/15",
    hoverBg: "hover:bg-sidebar-reference/10 hover:text-sidebar-reference",
    icon: "text-sidebar-reference/85 group-hover:text-sidebar-reference",
    iconActive: "text-sidebar-reference",
    textActive: "text-sidebar-reference",
    chevron: "text-sidebar-reference/75",
  },
  settings: {
    activeBg: "bg-sidebar-settings/15",
    hoverBg: "hover:bg-sidebar-settings/10 hover:text-sidebar-settings",
    icon: "text-sidebar-settings/85 group-hover:text-sidebar-settings",
    iconActive: "text-sidebar-settings",
    textActive: "text-sidebar-settings",
    chevron: "text-sidebar-settings/75",
  },
  docs: {
    activeBg: "bg-sidebar-docs/15",
    hoverBg: "hover:bg-sidebar-docs/10 hover:text-sidebar-docs",
    icon: "text-sidebar-docs/85 group-hover:text-sidebar-docs",
    iconActive: "text-sidebar-docs",
    textActive: "text-sidebar-docs",
    chevron: "text-sidebar-docs/75",
  },
};

export const masterListTokens = {
  columnBorder: "border-r border-border",
  containerPad: "pl-2",
  rail: "border-l-[2px]",
  contentPad: "px-3",
  selected: "border-l-selection-border bg-table-selected",
  unselected: "border-l-transparent hover:bg-muted hover:bg-muted",
};

export function sidebarIndent(depth: number): number {
  return depth === 0 ? 12 : 28 + depth * 12;
}
