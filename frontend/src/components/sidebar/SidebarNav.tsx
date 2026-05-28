import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarNavGroup } from "./SidebarNavGroup";
import { sidebarNav, sectionFromPath } from "./navigationConfig";
import type { TopLevelEntry } from "./navigationConfig";
import { sidebarNavTokens } from "./sidebarStyles";
import { useSidebarStore } from "@/stores/sidebar";
import type { SidebarSectionId } from "@/stores/sidebar";

function nestedGroupForRoute(pathname: string): string | null {
  if (pathname.startsWith("/system/production-structure") || pathname.startsWith("/system/warehouses") || pathname.startsWith("/system/product-master-data") || pathname.startsWith("/system/material-bins")) return "Production Structure";
  if (pathname.startsWith("/system/erp-data")) return "ERP Data";
  if (pathname.startsWith("/system/diagnostics") || pathname.startsWith("/system/application-settings")) return "Application";
  return null;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const openSection = useSidebarStore((s) => s.openSection);
  const openNestedGroup = useSidebarStore((s) => s.openNestedGroup);
  const setOpenSection = useSidebarStore((s) => s.setOpenSection);
  const setOpenNestedGroup = useSidebarStore((s) => s.setOpenNestedGroup);
  const consumeSuppressRouteOpen = useSidebarStore((s) => s.consumeSuppressRouteOpen);
  const routeSection = sectionFromPath(pathname);

  useEffect(() => {
    if (consumeSuppressRouteOpen()) {
      return;
    }
    if (pathname === "/") {
      setOpenSection(null);
      setOpenNestedGroup(null);
      return;
    }
    if (routeSection) setOpenSection(routeSection as SidebarSectionId);
    const routeNested = nestedGroupForRoute(pathname);
    setOpenNestedGroup(routeNested);
  }, [pathname, routeSection, setOpenSection, setOpenNestedGroup, consumeSuppressRouteOpen]);

  return (
    <nav className={sidebarNavTokens.nav} aria-label="Main navigation">
      {sidebarNav.map((entry: TopLevelEntry) => {
        if (entry.type === "item") {
          return <SidebarNavItem key={entry.to} to={entry.to} icon={entry.icon} label={entry.label} sectionId="control" onNavigate={onNavigate} />;
        }
        return (
          <SidebarNavGroup key={entry.id}
            id={entry.id}
            sectionId={entry.id}
            label={entry.label}
            icon={entry.icon}
            items={entry.items}
            pathname={pathname}
            openSection={openSection}
            openNestedGroup={openNestedGroup}
            onToggle={(id) => {
              setOpenSection(openSection === id ? null : id as SidebarSectionId);
              setOpenNestedGroup(null);
            }}
            onNestedToggle={setOpenNestedGroup}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}
