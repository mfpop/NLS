import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { BrandHeader } from "@/components/BrandHeader";
import { useSidebarStore } from "@/stores/sidebar";
import { useAuth } from "@/auth/AuthContext";
import type { SidebarSectionItem } from "./config";
import { sidebarEntries, plants as fallbackPlants } from "./config";
import { ChevronDown, MoreVertical, User, LogOut, Settings, ChevronRight } from "./icons";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { PRODUCTION_LINES_QUERY } from "@/graphql/productionLineQueries";
import type { Plant } from "@/types/plant";
import type { ProductionLine } from "@/types/productionLine";

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
  const { user } = useAuth();
  const openSection = useSidebarStore((state) => state.openSection);
  const setOpenSection = useSidebarStore((state) => state.setOpenSection);
  const [isLineOpen, setIsLineOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [openNestedGroups, setOpenNestedGroups] = useState<Record<string, boolean>>({});
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedLine, setSelectedLine] = useState("All Lines");
  const [selectedPlantExpanded, setSelectedPlantExpanded] = useState(false);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const { data: plantsData } = useQuery<{ plants: Plant[] }>(PLANTS_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });
  const { data: linesData } = useQuery<{ productionLines: { items: ProductionLine[] } }>(PRODUCTION_LINES_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });

  const sidebarPlants = useMemo(() => {
    const dbPlants = plantsData?.plants;
    const dbLines = linesData?.productionLines?.items;
    if (dbPlants && dbPlants.length > 0 && dbLines) {
      return dbPlants.map(p => ({ name: p.name, lines: dbLines.filter(l => l.plantId === p.id).map(l => l.name) }));
    }
    return fallbackPlants;
  }, [plantsData, linesData]);

        useEffect(() => {
    if (pathname.startsWith("/execution/")) setOpenSection("execute");
    if (pathname.startsWith("/check/")) setOpenSection("check");
    if (pathname.startsWith("/improve/")) setOpenSection("improve");
    if (pathname.startsWith("/plan/")) setOpenSection("plan");
    if (pathname.startsWith("/myworkspace/")) setOpenSection("myworkspace");
    if (pathname.startsWith("/standardize/")) setOpenSection("standardize");
    if (pathname.startsWith("/system/")) setOpenSection("system");
    if (pathname.startsWith("/docs/")) setOpenSection("system");
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
    const plant = sidebarPlants.find((p) => p.name === selectedPlant);
    const plantPrefix = plant ? plant.name.slice(0, 12) + (plant.name.length > 12 ? "…" : "") : "";
    const lineTrimmed = selectedLine.length > 14 ? selectedLine.slice(0, 14) + "…" : selectedLine;
    return plant ? `${plantPrefix} / ${lineTrimmed}` : lineTrimmed;
  }, [selectedPlant, selectedLine, sidebarPlants]);

  const hasActivePath = (item: SidebarSectionItem): boolean => {
    if (item.type === "item") {
      return pathname === item.to || pathname.startsWith(item.to + "/");
    }

    return item.items.some((child) => hasActivePath(child));
  };

  const renderSectionItem = (item: SidebarSectionItem, keyPath: string, depth = 0): ReactNode => {
    if (item.type === "item") {
      const ItemIcon = item.icon;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            "sidebar-row sidebar-row--nav sidebar-row--submenu-item" + (isActive ? " sidebar-row--active" : "")
          }
          style={{ paddingLeft: `${0.75 + depth * 0.7}rem` }}
        >
          <ItemIcon className="sidebar-icon" />
          <span>{item.label}</span>
        </NavLink>
      );
    }

    const GroupIcon = item.icon;

    const isActiveBranch = hasActivePath(item);
    const isOpen = openNestedGroups[keyPath] ?? isActiveBranch;

    return (
      <div key={keyPath} className="sidebar__submenu-group">
        <button
          type="button"
          className="sidebar-row sidebar-row--submenu-label sidebar-row--submenu-group-btn"
          style={{ paddingLeft: `${0.75 + depth * 0.7}rem` }}
          aria-expanded={isOpen}
          onClick={() =>
            setOpenNestedGroups((previous) => ({
              ...previous,
              [keyPath]: !isOpen,
            }))
          }
        >
          <span className="sidebar__section-main">
            <GroupIcon className="sidebar-icon" />
            <span>{item.label}</span>
          </span>
          <ChevronDown className={"sidebar__section-chevron " + (isOpen ? "sidebar__section-chevron--open" : "")} />
        </button>

        <div className={"sidebar__submenu-group-children " + (isOpen ? "sidebar__submenu-group-children--open" : "sidebar__submenu-group-children--closed")}>
          <div className="sidebar__submenu-group-items">
            {item.items.map((childItem, index) => renderSectionItem(childItem, `${keyPath}.${index}`, depth + 1))}
          </div>
        </div>
      </div>
    );
  };

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
              title="Filters all reference data to this line."
            >
              <div className="sidebar__line-copy">
                <div className="sidebar__line-label">Plant / Line</div>
                <div className="sidebar__line-value">{selectedLineLabel}</div>
              </div>
              <span className="sidebar__chevron-wrap">
                <ChevronDown className={"sidebar__chevron " + (isLineOpen ? "sidebar__chevron--rotated" : "")} />
              </span>
            </button>

            <div className={"sidebar__line-dropdown-wrap " + (isLineOpen ? "sidebar__line-dropdown-wrap--open" : "sidebar__line-dropdown-wrap--closed")}>
              <div className="sidebar__line-dropdown">
                <div className="sidebar__line-list">
                  {sidebarPlants.map((plant) => {
                    const isPlantExpanded = selectedPlantExpanded && selectedPlant === plant.name;
                    const isPlantSelected = selectedPlant === plant.name;
                    return (
                      <div key={plant.name}>
                        <button
                          type="button"
                          className={"sidebar__line-item sidebar__line-item--plant " + (isPlantSelected ? "sidebar__line-item--selected" : "")}
                          onClick={() => {
                            setSelectedPlant(plant.name);
                            setSelectedLine(plant.lines[0]);
                            setSelectedPlantExpanded(false);
                            setIsLineOpen(false);
                          }}
                        >
                          <span className="sidebar__line-item-dot" />
                          <span className="sidebar__line-item-text">{plant.name}</span>
                          {isPlantSelected ? <span className="sidebar__line-item-check">✓</span> : null}
                        </button>
                        <button
                          type="button"
                          className="sidebar__line-item sidebar__line-item--expand-toggle"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlant(plant.name);
                            setSelectedPlantExpanded(!isPlantExpanded);
                          }}
                        >
                          <ChevronRight className={"sidebar__chevron sidebar__chevron--small " + (isPlantExpanded ? "sidebar__chevron--rotated" : "")} />
                          <span className="sidebar__line-item-text sidebar__line-item-text--muted">Lines</span>
                        </button>
                        {isPlantExpanded && plant.lines.map((line) => {
                          const isLineSelected = selectedPlant === plant.name && selectedLine === line;
                          return (
                            <button
                              key={line}
                              type="button"
                              className={"sidebar__line-item sidebar__line-item--child " + (isLineSelected ? "sidebar__line-item--selected" : "")}
                              onClick={() => {
                                setSelectedPlant(plant.name);
                                setSelectedLine(line);
                                setIsLineOpen(false);
                                setSelectedPlantExpanded(false);
                              }}
                            >
                              <span className="sidebar__line-item-text sidebar__line-item-text--indent">{line}</span>
                              {isLineSelected ? <span className="sidebar__line-item-check">✓</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  <div className="sidebar__line-divider" />
                  <button
                    type="button"
                    className={"sidebar__line-item " + (selectedLine === "All Lines" ? "sidebar__line-item--selected" : "")}
                    onClick={() => {
                      setSelectedPlant("");
                      setSelectedLine("All Lines");
                      setIsLineOpen(false);
                      setSelectedPlantExpanded(false);
                    }}
                  >
                    <span className="sidebar__line-item-text">All Lines</span>
                    {selectedLine === "All Lines" ? <span className="sidebar__line-item-check">✓</span> : null}
                  </button>
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
                    {entry.items.map((item, index) => renderSectionItem(item, `${entry.id}.${index}`))}
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
            <span className="sidebar__avatar">{initialsFromName(user?.username ?? "User")}</span>
            <span className="sidebar__user-copy">
              <span className="sidebar__user-name">{user?.username ?? "User"}</span>
              <span className="sidebar__user-role">{user?.role?.replace("_", " ") ?? ""}</span>
            </span>
            <MoreVertical className="sidebar-icon" />
          </button>
        </div>
      </div>
    </aside>
  );
}
