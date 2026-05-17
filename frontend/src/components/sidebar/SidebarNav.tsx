import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarNavGroup } from "./SidebarNavGroup";
import { sidebarNav, sectionFromPath } from "./navigationConfig";
import type { TopLevelEntry } from "./navigationConfig";
import { sidebarNavTokens } from "./sidebarStyles";
import { useSidebarStore } from "@/stores/sidebar";
import type { SidebarSectionId } from "@/stores/sidebar";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const openSection = useSidebarStore((s) => s.openSection);
  const setOpenSection = useSidebarStore((s) => s.setOpenSection);

  useEffect(() => {
    const s = sectionFromPath(pathname);
    if (s) setOpenSection(s as SidebarSectionId);
  }, [pathname, setOpenSection]);

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
            onToggle={(id) => setOpenSection(openSection === id ? null : id as SidebarSectionId)}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}
