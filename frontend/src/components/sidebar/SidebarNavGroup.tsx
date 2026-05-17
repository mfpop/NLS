import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SidebarNavItem } from "./SidebarNavItem";
import type { NavEntry } from "./navigationConfig";
import { isRouteItemActive } from "./navigationConfig";
import { sidebarIndent, sidebarNavTokens, sectionColors } from "./sidebarStyles";

export function SidebarNavGroup({ id, sectionId, label, icon: Icon, items, pathname, openSection, onToggle, onNavigate }: {
  id: string; sectionId?: string; label: string; icon: LucideIcon; items: NavEntry[]; pathname: string;
  openSection: string | null; onToggle: (id: string) => void; onNavigate?: () => void;
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
        <span className={`${sidebarNavTokens.label} font-medium`}>{label}</span>
        <ChevronDown className={`${sidebarNavTokens.chevron} ${colors.chevron} ${isOpen ? "rotate-0" : "-rotate-90"}`} />
      </button>
      <div className={`${sidebarNavTokens.submenu} ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className={sidebarNavTokens.submenuInner}>
          {items.map((item, i) => (
            <NavEntryRow key={i} entry={item} depth={1} pathname={pathname} sectionId={sectionId} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavEntryRow({ entry, depth = 0, pathname, sectionId, onNavigate }: {
  entry: NavEntry; depth?: number; pathname: string; sectionId?: string; onNavigate?: () => void;
}) {
  const hasActive = entry.type === "group" && entry.items.some((c) => c.type === "item" && isRouteItemActive(pathname, c.to));
  const [userOpen, setUserOpen] = useState(false);
  const isOpen = userOpen || hasActive;
  const isManufacturingGroup = entry.type === "group" && entry.label === "Manufacturing Structure";
  const isDocsGroup = entry.type === "group" && entry.label === "Documentation Center";
  const effectiveGroupId = isManufacturingGroup ? "manufacturing" : isDocsGroup ? "docs" : sectionId;
  const colors = sectionColors[effectiveGroupId ?? "control"] ?? sectionColors.control;

  if (entry.type === "item") {
    const itemSectionId = sidebarItemCategory(entry.label, sectionId);
    return <SidebarNavItem to={entry.to} icon={entry.icon} label={entry.label} depth={depth} sectionId={itemSectionId} onNavigate={onNavigate} />;
  }

  return (
    <div>
      <button type="button" onClick={() => setUserOpen(!userOpen)}
        className={`${sidebarNavTokens.row} ${sidebarNavTokens.inactive} ${colors.icon} ${colors.hoverBg}`}
        style={{ paddingLeft: sidebarIndent(depth) }}
      >
        <ChevronRight className={`${sidebarNavTokens.chevron} ${colors.chevron} ${isOpen ? "rotate-90" : ""}`} />
        <span className={`${sidebarNavTokens.label} font-medium`}>{entry.label}</span>
      </button>
      <div className={`${sidebarNavTokens.submenu} ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className={sidebarNavTokens.submenuInner}>
          {entry.items.map((child, i) => (
            <NavEntryRow key={i} entry={child} depth={depth + 1} pathname={pathname} sectionId={effectiveGroupId} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

function sidebarItemCategory(label: string, fallback?: string): string | undefined {
  switch (label) {
    case "Flow":
      return "flow";
    case "Components":
      return "components";
    case "Product Master Data":
      return "product";
    case "Reference Tables":
      return "reference";
    case "Diagnostics":
      return "settings";
    case "Application Settings":
      return "settings";
    case "Setup Reference":
    case "Architecture":
    case "Domain Spec":
    case "Domain Constitution":
    case "Diagrams":
      return "docs";
    default:
      return fallback;
  }
}
