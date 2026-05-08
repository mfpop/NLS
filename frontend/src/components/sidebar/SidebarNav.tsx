import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarNavGroup } from "./SidebarNavGroup";
import { sidebarNav, sectionFromPath } from "./navigationConfig";
import type { TopLevelEntry } from "./navigationConfig";
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
    <nav className="flex-1 overflow-y-auto py-1 space-y-0.5 px-2" aria-label="Main navigation">
      {sidebarNav.map((entry: TopLevelEntry) => {
        if (entry.type === "item") {
          return <SidebarNavItem key={entry.to} to={entry.to} icon={entry.icon} label={entry.label} onNavigate={onNavigate} />;
        }
        return (
          <SidebarNavGroup key={entry.id}
            id={entry.id}
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
