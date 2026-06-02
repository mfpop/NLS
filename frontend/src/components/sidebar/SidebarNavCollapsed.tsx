import { useState, useCallback, useRef } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { sidebarNav, sectionFromPath } from "./navigationConfig";
import type { NavEntry, NavGroupItem, NavSection } from "./navigationConfig";
import { sectionColors } from "./sidebarStyles";

function firstRoute(items: NavEntry[]): string {
  const first = items[0];
  if (first.type === "item") return first.to;
  return firstRoute(first.items);
}

function PopupItem({ to, icon: Icon, label, colors, isActive, depth = 0, onClick }: {
  to: string; icon: React.ComponentType<{ className?: string }>; label: string;
  colors: { activeBg: string; textActive: string; icon: string; hoverBg: string };
  isActive: boolean; depth?: number; onClick: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={`flex items-center gap-2.5 h-8 px-3 text-xs rounded-md transition-colors ${
        isActive
          ? `${colors.activeBg} ${colors.textActive} font-semibold`
          : `${colors.hoverBg} ${colors.icon}`
      }`}
      style={{ paddingLeft: 12 + depth * 16 }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 stroke-current" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function PopupContent({ entry, pathname, onItemClick }: {
  entry: NavSection; pathname: string; onItemClick: () => void;
}) {
  const colors = sectionColors[entry.id] ?? sectionColors.control;

  return (
    <div className="py-1">
      {entry.items.map((item) => {
        if (item.type === "item") {
          return (
            <PopupItem key={item.to} to={item.to} icon={item.icon} label={item.label}
              colors={colors} isActive={pathname === item.to} depth={0} onClick={onItemClick} />
          );
        }
        return (
          <div key={item.label}>
            <div className="flex items-center gap-2.5 h-7 px-3 text-[11px] font-medium text-muted-foreground">
              <item.icon className="h-3 w-3 shrink-0 stroke-current" />
              <span className="truncate">{item.label}</span>
            </div>
            {(item as NavGroupItem).items.map((child) => {
              if (child.type === "item") {
                return (
                  <PopupItem key={child.to} to={child.to} icon={child.icon} label={child.label}
                    colors={colors} isActive={pathname === child.to} depth={1} onClick={onItemClick} />
                );
              }
              return null;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function SidebarNavCollapsed() {
  const { pathname } = useLocation();
  const routeSection = sectionFromPath(pathname);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [popupRect, setPopupRect] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const openPopup = useCallback((key: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setHoveredKey(key);
      const el = iconRefs.current.get(key);
      if (el) {
        const rect = el.getBoundingClientRect();
        setPopupRect({ top: rect.top, left: rect.left + rect.width + 8 });
      }
    }, 200);
  }, []);

  const closePopup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setHoveredKey(null);
      setPopupRect(null);
    }, 150);
  }, []);

  const closeImmediate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHoveredKey(null);
    setPopupRect(null);
  }, []);

  const currentEntry: (typeof sidebarNav)[number] | null = hoveredKey
    ? sidebarNav.find((e) => (e.type === "item" ? e.to : e.id) === hoveredKey) ?? null
    : null;

  return (
    <div className="flex-1 flex flex-col relative">
      <nav className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto" aria-label="Main navigation">
        {sidebarNav.map((entry) => {
          const key = entry.type === "item" ? entry.to : entry.id;

          if (entry.type === "item") {
            const colors = sectionColors.control;
            const isActive = pathname === entry.to;
            return (
          <div key={key} ref={(el) => { iconRefs.current.set(key, el); }}
            onMouseEnter={() => openPopup(key)}
            onMouseLeave={closePopup}
          >
            <NavLink
              to={entry.to}
                  end={entry.to === "/"}
                  className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
                    isActive
                      ? `${colors.activeBg} ${colors.textActive}`
                      : `${colors.hoverBg} ${colors.icon}`
                  }`}
                >
                  <entry.icon className={`h-4 w-4 stroke-current ${isActive ? "stroke-[2.5]" : ""}`} />
                </NavLink>
              </div>
            );
          }

          const section = entry as NavSection;
          const to = firstRoute(section.items);
          const colors = sectionColors[section.id] ?? sectionColors.control;
          const isActive = routeSection === section.id;

          return (
            <div key={key} ref={(el) => { iconRefs.current.set(key, el); }}
              onMouseEnter={() => openPopup(key)}
              onMouseLeave={closePopup}
            >
              <NavLink
                to={to}
                className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
                  isActive
                    ? `${colors.activeBg} ${colors.textActive}`
                    : `${colors.hoverBg} ${colors.icon}`
                }`}
              >
                <section.icon className={`h-4 w-4 stroke-current ${isActive ? "stroke-[2.5]" : ""}`} />
              </NavLink>
            </div>
          );
        })}
      </nav>

      {currentEntry && popupRect && currentEntry.type === "item" && (
        <div className="fixed z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-lg py-1.5 px-3 whitespace-nowrap text-xs font-medium"
          style={{ top: popupRect.top, left: popupRect.left }}
          onMouseEnter={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setHoveredKey(currentEntry.to);
          }}
          onMouseLeave={closePopup}
        >
          {currentEntry.label}
        </div>
      )}

      {currentEntry && popupRect && currentEntry.type === "section" && (
        <div className="fixed z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-lg min-w-[180px]"
          style={{ top: popupRect.top, left: popupRect.left }}
          onMouseEnter={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setHoveredKey(currentEntry.id);
          }}
          onMouseLeave={closePopup}
        >
          <div className="px-3 py-1.5 text-xs font-semibold border-b border-border">
            {currentEntry.label}
          </div>
          <PopupContent entry={currentEntry} pathname={pathname} onItemClick={closeImmediate} />
        </div>
      )}
    </div>
  );
}
