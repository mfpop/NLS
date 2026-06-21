import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarNavGroup } from "./SidebarNavGroup";
import { navigationGroups } from "./navigationConfig";
import type { TopLevelEntry } from "./navigationConfig";
import { sidebarNavTokens } from "./sidebarStyles";
import { useSidebarStore } from "@/stores/sidebar";
import type { SidebarSectionId } from "@/stores/sidebar";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const openSection = useSidebarStore((s) => s.openSection);
  const openNestedGroup = useSidebarStore((s) => s.openNestedGroup);
  const setOpenSection = useSidebarStore((s) => s.setOpenSection);
  const setOpenNestedGroup = useSidebarStore((s) => s.setOpenNestedGroup);

  // Track last processed pathname to prevent unnecessary state resets
  const lastPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (pathname === "/") {
      setOpenSection(null);
      setOpenNestedGroup(null);
      lastPathRef.current = null;
    }
    lastPathRef.current = pathname;
  }, [pathname, setOpenSection, setOpenNestedGroup]);

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
