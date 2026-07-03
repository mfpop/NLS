import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarNavGroup } from "./SidebarNavGroup";
import { navigationGroups, sectionFromPath, sidebarNav, isRouteItemActive } from "./navigationConfig";
import type { TopLevelEntry, NavSection } from "./navigationConfig";
import { sidebarNavTokens } from "./sidebarStyles";
import { useSidebarStore } from "@/stores/sidebar";
import type { SidebarSectionId } from "@/stores/sidebar";

/** Find which nested group label (if any) contains an item matching the given path. */
function findNestedGroupForPath(path: string): string | null {
  for (const entry of sidebarNav) {
    if (entry.type !== "section") continue;
    const section = entry as NavSection;
    for (const item of section.items) {
      if (item.type !== "group") continue;
      for (const child of item.items) {
        if (child.type === "item" && isRouteItemActive(path, child.to)) return item.label;
      }
    }
  }
  return null;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const openSection = useSidebarStore((s) => s.openSection);
  const openNestedGroup = useSidebarStore((s) => s.openNestedGroup);
  const setOpenSection = useSidebarStore((s) => s.setOpenSection);
  const setOpenNestedGroup = useSidebarStore((s) => s.setOpenNestedGroup);
  const consumeSuppressRouteOpen = useSidebarStore((s) => s.consumeSuppressRouteOpen);

  // Auto-open section and nested group based on current URL pathname
  useEffect(() => {
    if (pathname === "/") {
      setOpenSection(null);
      setOpenNestedGroup(null);
      return;
    }

    // Check if we're in a user-initiated navigation (don't override)
    const suppressed = consumeSuppressRouteOpen();
    if (suppressed) return;

    const section = sectionFromPath(pathname) as SidebarSectionId | null;
    if (section && section !== openSection) {
      setOpenSection(section);
    }

    const nested = findNestedGroupForPath(pathname);
    if (nested && nested !== openNestedGroup) {
      setOpenNestedGroup(nested);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className={sidebarNavTokens.nav} aria-label="Main navigation">
      {navigationGroups.map((group, gi) => (
        <div key={gi} className={gi > 0 ? "mt-6" : ""}>
          {group.map((entry: TopLevelEntry) => {
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
        </div>
      ))}
    </nav>
  );
}
