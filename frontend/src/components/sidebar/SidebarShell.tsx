import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BrandHeader } from "@/components/BrandHeader";
import { useSidebarStore } from "@/stores/sidebar";
import { sidebarEntries, productionLines } from "./config";
import { ChevronDown, MoreVertical, User, LogOut, Settings } from "./icons";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SidebarShell() {
  const { pathname } = useLocation();
  const openSection = useSidebarStore((state) => state.openSection);
  const setOpenSection = useSidebarStore((state) => state.setOpenSection);
  const [isLineOpen, setIsLineOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(productionLines[0]);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/execution/")) setOpenSection("execution");
    if (pathname.startsWith("/check/")) setOpenSection("check");
    if (pathname.startsWith("/improve/")) setOpenSection("improve");
    if (pathname.startsWith("/system/")) setOpenSection("system");
  }, [pathname, setOpenSection]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node;
      if (lineRef.current && !lineRef.current.contains(target)) {
        setIsLineOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const selectedLineLabel = useMemo(() => {
    return selectedLine.length > 18 ? selectedLine.slice(0, 18) + "..." : selectedLine;
  }, [selectedLine]);

  return (
    <aside className="sidebar" aria-label="Application sidebar">
      <BrandHeader />

      <div className="sidebar__content">
        <div className="sidebar__main">
          <div className="sidebar__line-block" ref={lineRef}>
            <button
              type="button"
              className={"sidebar__line-trigger " + (isLineOpen ? "sidebar__line-trigger--open" : "")}
              onClick={(event) => {
                event.stopPropagation();
                setIsLineOpen((current) => !current);
              }}
              aria-expanded={isLineOpen}
            >
              <div className="sidebar__line-copy">
                <div className="sidebar__line-label">Production Line</div>
                <div className="sidebar__line-value">{selectedLineLabel}</div>
              </div>
              <ChevronDown className={"sidebar__chevron " + (isLineOpen ? "sidebar__chevron--rotated" : "")} />
            </button>

            <div className={"sidebar__line-dropdown-wrap " + (isLineOpen ? "sidebar__line-dropdown-wrap--open" : "sidebar__line-dropdown-wrap--closed")}>
              <div className="sidebar__line-dropdown">
                <div className="sidebar__line-list">
                  {productionLines.map((line) => {
                    const isSelected = line === selectedLine;
                    return (
                      <button
                        key={line}
                        type="button"
                        className={"sidebar__line-item " + (isSelected ? "sidebar__line-item--selected" : "")}
                        onClick={() => {
                          setSelectedLine(line);
                          setIsLineOpen(false);
                        }}
                      >
                        <span className="sidebar__line-item-dot" />
                        <span className="sidebar__line-item-text">{line}</span>
                        {isSelected ? <span className="sidebar__line-item-check">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="sidebar__line-fade" aria-hidden="true" />
              </div>
            </div>
          </div>

          <nav className="sidebar__nav" aria-label="Main navigation">
            {sidebarEntries.map((entry) => {
              if (entry.type === "item") {
                const Icon = entry.icon;
                return (
                  <NavLink
                    key={entry.to}
                    to={entry.to}
                    end={entry.to === "/"}
                    className={({ isActive }) =>
                      "sidebar-row sidebar-row--nav sidebar-row--primary" +
                      (isActive ? " sidebar-row--active sidebar-row--primary-active" : "")
                    }
                  >
                    <Icon className="sidebar-icon" />
                    <span>{entry.label}</span>
                  </NavLink>
                );
              }

              const SectionIcon = entry.icon;
              const isOpen = openSection === entry.id;

              return (
                <div key={entry.id} className="sidebar__section-group">
                  <button
                    type="button"
                    className="sidebar-row sidebar-row--section"
                    onClick={() => setOpenSection(isOpen ? null : entry.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="sidebar__section-main">
                      <SectionIcon className="sidebar-icon" />
                      <span>{entry.label}</span>
                    </span>
                    <ChevronDown className={"sidebar__section-chevron " + (isOpen ? "sidebar__section-chevron--open" : "")} />
                  </button>

                  <div className={"sidebar__submenu " + (isOpen ? "sidebar__submenu--open" : "sidebar__submenu--closed")}>
                    {entry.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) => "sidebar-row sidebar-row--nav" + (isActive ? " sidebar-row--active" : "")}
                        >
                          <ItemIcon className="sidebar-icon" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="sidebar__bottom" ref={profileRef}>
          <div className={"sidebar__profile-actions " + (isProfileOpen ? "sidebar__profile-actions--open" : "sidebar__profile-actions--closed")}>
            <NavLink to="/system/profile" className="sidebar-row sidebar-row--nav" onClick={() => setIsProfileOpen(false)}>
              <User className="sidebar-icon" />
              <span>Profile</span>
            </NavLink>
            <NavLink to="/system/preferences" className="sidebar-row sidebar-row--nav" onClick={() => setIsProfileOpen(false)}>
              <Settings className="sidebar-icon" />
              <span>Settings</span>
            </NavLink>
            <NavLink to="/system/sign-out" className="sidebar-row sidebar-row--nav sidebar-row--danger" onClick={() => setIsProfileOpen(false)}>
              <LogOut className="sidebar-icon" />
              <span>Sign out</span>
            </NavLink>
          </div>

          <button
            type="button"
            className="sidebar-row sidebar-row--user"
            onClick={(event) => {
              event.stopPropagation();
              setIsProfileOpen((current) => !current);
            }}
          >
            <span className="sidebar__avatar">{initialsFromName("Mihai Pop")}</span>
            <span className="sidebar__user-copy">
              <span className="sidebar__user-name">Mihai Pop</span>
              <span className="sidebar__user-role">Plant Manager</span>
            </span>
            <MoreVertical className="sidebar-icon" />
          </button>
        </div>
      </div>
    </aside>
  );
}
