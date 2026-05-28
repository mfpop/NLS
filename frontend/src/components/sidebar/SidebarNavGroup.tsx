import { ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SidebarNavItem } from "./SidebarNavItem";
import type { NavEntry } from "./navigationConfig";
import { sidebarIndent, sidebarNavTokens, sectionColors } from "./sidebarStyles";

export function SidebarNavGroup({ id, sectionId, label, icon: Icon, items, pathname, openSection, openNestedGroup, onToggle, onNestedToggle, onNavigate }: {
  id: string; sectionId?: string; label: string; icon: LucideIcon; items: NavEntry[]; pathname: string;
  openSection: string | null; openNestedGroup: string | null;
  onToggle: (id: string) => void; onNestedToggle: (label: string | null) => void; onNavigate?: () => void;
}) {
  const isOpen = openSection === id;
  const colors = sectionColors[sectionId ?? "control"] ?? sectionColors.control;

  return (
    <div>
      <button type="button" onClick={() => onToggle(id)}
        className={`${sidebarNavTokens.row} ${sidebarNavTokens.inactive} ${colors.icon} ${colors.hoverBg}`}
        style={{ paddingLeft: sidebarIndent(0) }}
      >
        <Icon className={`${sidebarNavTokens.icon} ${colors.icon}`} />
        <span className={`${sidebarNavTokens.label} ${colors.icon} font-medium`}>{label}</span>
        <ChevronDown className={`${sidebarNavTokens.chevron} ${colors.chevron} ${isOpen ? "rotate-0" : "-rotate-90"}`} />
      </button>
      <div className={`${sidebarNavTokens.submenu} ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className={sidebarNavTokens.submenuInner}>
          {items.map((item, i) => (
            <NavEntryRow key={i} entry={item} depth={1} pathname={pathname} openNestedGroup={openNestedGroup} onNestedToggle={onNestedToggle} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavEntryRow({ entry, depth = 0, pathname, openNestedGroup, onNestedToggle, onNavigate }: {
  entry: NavEntry; depth?: number; pathname: string;
  openNestedGroup: string | null; onNestedToggle: (label: string | null) => void; onNavigate?: () => void;
}) {
  const isProductionGroup = entry.type === "group" && entry.label === "Production Structure";
  const isApplicationGroup = entry.type === "group" && entry.label === "Application";
  const isErpGroup = entry.type === "group" && entry.label === "ERP Data";
  const groupId = isProductionGroup ? "production" : isApplicationGroup ? "settings" : isErpGroup ? "erpData" : undefined;
  const colors = sectionColors[groupId ?? "control"] ?? sectionColors.control;

  if (entry.type === "item") {
    const itemSectionId = sidebarItemCategory(entry.label);
    return <SidebarNavItem to={entry.to} icon={entry.icon} label={entry.label} depth={depth} sectionId={itemSectionId || groupId} onNavigate={onNavigate} />;
  }

  const isOpen = openNestedGroup === entry.label;

  return (
    <div>
      <button type="button" onClick={() => {
        onNestedToggle(openNestedGroup === entry.label ? null : entry.label);
      }}
        className={`${sidebarNavTokens.row} ${sidebarNavTokens.inactive} ${colors.icon} ${colors.hoverBg}`}
        style={{ paddingLeft: sidebarIndent(depth) }}
      >
        <ChevronRight className={`${sidebarNavTokens.chevron} ${colors.chevron} ${isOpen ? "rotate-90" : ""}`} />
        <entry.icon className={`${sidebarNavTokens.icon} ${colors.icon}`} />
        <span className={`${sidebarNavTokens.label} ${colors.icon} font-medium`}>{entry.label}</span>
      </button>
      <div className={`${sidebarNavTokens.submenu} ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className={`${sidebarNavTokens.submenuInner}${entry.label === "ERP Data" ? " space-y-[5px]" : ""}`}>
          {entry.items.map((child, i) => (
            <NavEntryRow key={i} entry={child} depth={depth + 1} pathname={pathname} openNestedGroup={openNestedGroup} onNestedToggle={onNestedToggle} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

function sidebarItemCategory(label: string): string | undefined {
  switch (label) {
    case "Flow":
      return "flow";
    case "Components":
      return "components";
    case "Warehouses":
      return "warehouses";
    case "Product Master Data":
      return "product";
    case "Reference Tables":
      return "reference";
    case "Diagnostics":
    case "Settings":
      return "settings";
    case "Import Sources":
      return "importSources";
    case "Import Jobs":
      return "importJobs";
    case "File History":
      return "fileHistory";
    case "Mapping Rules":
      return "mappingRules";
    case "Validation Errors":
      return "validationErrors";
    case "Integration Status":
      return "integrationStatus";
    default:
      return undefined;
  }
}
