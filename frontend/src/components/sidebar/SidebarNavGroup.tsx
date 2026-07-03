import { ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SidebarNavItem } from "./SidebarNavItem";
import type { NavEntry } from "./navigationConfig";
import { sidebarIndent, sidebarNavTokens, sidebarState, sectionColors } from "./sidebarStyles";

export function SidebarNavGroup({ id, sectionId, label, icon: Icon, items, pathname, openSection, openNestedGroup, onToggle, onNestedToggle, onNavigate }: {
  id: string; sectionId?: string; label: string; icon: LucideIcon; items: NavEntry[]; pathname: string;
  openSection: string | null; openNestedGroup: string | null;
  onToggle: (id: string) => void; onNestedToggle: (label: string | null) => void; onNavigate?: () => void;
}) {
  const isOpen = openSection === id;
  const moduleColor = sectionColors[sectionId ?? "control"] ?? sectionColors.control;

  return (
    <div>
      <button type="button" onClick={() => onToggle(id)}
        className={`${sidebarNavTokens.row} ${sidebarNavTokens.inactive} ${sidebarState.item}`}
        style={{ paddingLeft: sidebarIndent(0) }}
      >
        <Icon className={`${sidebarNavTokens.icon} ${moduleColor}`} />
        <span className={`${sidebarNavTokens.label} text-sidebar-foreground font-medium`}>{label}</span>
        <ChevronDown className={`${sidebarNavTokens.chevronActive} ${isOpen ? sidebarState.chevronEm : sidebarState.chevron} ${isOpen ? "rotate-0" : "-rotate-90"}`} />
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
  const isErpGroup = entry.type === "group" && entry.label === "ERP Data";
  const isReferenceGroup = entry.type === "group" && entry.label === "Reference Tables";
  const isAuditTemplatesGroup = entry.type === "group" && entry.label === "Audit Templates";
  const isUsersRolesGroup = entry.type === "group" && entry.label === "Users & Access";
  const isSystemHealthGroup = entry.type === "group" && entry.label === "System Health";
  const isAuditLogsGroup = entry.type === "group" && entry.label === "Audit Logs";
  const isIntegrationsGroup = entry.type === "group" && entry.label === "Integrations";
  const groupId = isProductionGroup ? "production" : isErpGroup ? "erpData" : isReferenceGroup ? "reference" : isAuditTemplatesGroup ? "auditTemplates" : isUsersRolesGroup ? "usersRoles" : isSystemHealthGroup ? "systemHealth" : isAuditLogsGroup ? "auditLogs" : isIntegrationsGroup ? "integrations" : undefined;
  const moduleColor = sectionColors[groupId ?? "control"] ?? sectionColors.control;

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
        className={`${sidebarNavTokens.row} ${sidebarNavTokens.inactive} ${sidebarState.item}`}
        style={{ paddingLeft: sidebarIndent(depth) }}
      >
        <ChevronRight className={`${sidebarNavTokens.chevronActive} ${isOpen ? sidebarState.chevronEm : sidebarState.chevron} ${isOpen ? "rotate-90" : ""}`} />
        <entry.icon className={`${sidebarNavTokens.icon} ${moduleColor}`} />
        <span className={`${sidebarNavTokens.label} text-sidebar-foreground font-medium`}>{entry.label}</span>
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
    case "Company":
      return "company";
    case "Plants":
      return "plants";
    case "Production Lines":
      return "productionLines";
    case "Departments":
      return "departments";
    case "Resource Groups":
      return "resourceGroups";
    case "Resources":
      return "resources";
    case "Statuses":
      return "statuses";
    case "Categories":
      return "categories";
    case "Types":
      return "types";
    case "Priorities":
      return "priorities";
    case "Units of Measure":
      return "uom";
    case "Reason Codes":
      return "reasonCodes";
    case "Import Patterns":
      return "importPatterns";
    case "Source Files":
      return "sourceFiles";
    case "Validation Results":
      return "validationResults";
    case "Import Logs":
      return "importLogs";
    case "ERP Reference Data":
      return "erpReferenceData";
    case "Production Control Templates":
    case "Quality Management Templates":
    case "Safety Templates":
    case "Material Control Templates":
      return "auditTemplates";
    case "Users":
    case "Roles & Permissions":
    case "Access Groups":
      return "usersRoles";
    case "App Settings":
      return "appSettings";
    case "Health Summary":
      return "healthSummary";
    case "Services":
      return "services";
    case "Database":
      return "database";
    case "Deployment Info":
      return "deploymentInfo";
    case "Recent Errors":
      return "recentErrors";
    case "User Activity":
      return "userActivity";
    case "Data Changes":
      return "dataChanges";
    case "Login / Access Events":
      return "loginEvents";
    case "System Events":
      return "systemEvents";
    case "ERP Connections":
      return "erpConnections";
    case "Email / SMTP":
      return "email";
    case "API Keys":
      return "apiKeys";
    case "Webhooks":
      return "webhooks";
    case "File Storage":
      return "fileStorage";
    default:
      return undefined;
  }
}
