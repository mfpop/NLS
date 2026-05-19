import { useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "@/components/sidebar/SidebarNavItem";
import { useNavigationStore, type SystemSection } from "@/stores/navigationStore";
import { systemNav, sectionForRoute } from "@/config/navigation";
import { sidebarIndent, sidebarNavTokens, sectionColors } from "@/components/sidebar/sidebarStyles";

const erpColorKeyByPath: Record<string, keyof typeof sectionColors> = {
  "/system/erp-data/import-sources": "importSources",
  "/system/erp-data/import-jobs": "importJobs",
  "/system/erp-data/file-history": "fileHistory",
  "/system/erp-data/mapping-rules": "mappingRules",
  "/system/erp-data/validation-errors": "validationErrors",
  "/system/erp-data/integration-status": "integrationStatus",
  "/system/erp-data/file-preview": "filePreview",
  "/system/erp-data/compare-results": "compareResults",
};

export function SystemMenu() {
  const { pathname } = useLocation();
  const openSection = useNavigationStore((s) => s.openSection);
  const setOpenSection = useNavigationStore((s) => s.setOpenSection);
  const collapseForUserNavigation = useNavigationStore((s) => s.collapseForUserNavigation);
  const consumeSuppressRouteOpen = useNavigationStore((s) => s.consumeSuppressRouteOpen);

  const routeSection = sectionForRoute(pathname);
  const effectiveOpen = openSection;

  useEffect(() => {
    if (consumeSuppressRouteOpen()) {
      return;
    }
    if (routeSection) {
      setOpenSection(routeSection as SystemSection);
    }
  }, [pathname, routeSection, setOpenSection, consumeSuppressRouteOpen]);

  const handleToggle = (id: SystemSection) => {
    if (openSection === id) {
      collapseForUserNavigation();
      return;
    }
    setOpenSection(id);
  };

  return (
    <div>
      {systemNav.map((entry, i) => {
        if ("items" in entry) {
          const sectionId = sectionForRoute(entry.items[0]?.to ?? "") as SystemSection;
          const colorKey = sectionId === "erp-data" ? "erpData" : (sectionId ?? "system");
          const isOpen = effectiveOpen === sectionId;
          const colors = sectionColors[colorKey] ?? sectionColors.system;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => handleToggle(sectionId)}
                className={`${sidebarNavTokens.row} ${sidebarNavTokens.inactive} ${colors.hoverBg} ${colors.icon}`}
                style={{ paddingLeft: sidebarIndent(0) }}
              >
                <entry.icon className={`${sidebarNavTokens.icon} ${colors.icon}`} />
                <span className={`${sidebarNavTokens.label} ${colors.icon} font-medium`}>{entry.label}</span>
                <ChevronDown className={`${sidebarNavTokens.chevron} ${colors.chevron} ${isOpen ? "rotate-0" : "-rotate-90"}`} />
              </button>
              <div className={`${sidebarNavTokens.submenu} ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className={sidebarNavTokens.submenuInner}>
                  {entry.items.map((item, j) => (
                    <SidebarNavItem
                      key={j}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      depth={1}
                      sectionId={sectionId === "erp-data" ? (erpColorKeyByPath[item.to] ?? "erpData") : (sectionId ?? "system")}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        }
        return (
          <SidebarNavItem key={entry.to} to={entry.to} icon={entry.icon} label={entry.label} depth={0} sectionId="reference" />
        );
      })}
    </div>
  );
}
