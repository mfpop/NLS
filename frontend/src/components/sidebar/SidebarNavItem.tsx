import { useCallback, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { prefetchRoute } from "@/routes/routePrefetch";
import { isRouteItemActive } from "./navigationConfig";
import { sidebarIndent, sidebarNavTokens, sidebarState, sectionColors } from "./sidebarStyles";

const HOVER_PREFETCH_DELAY_MS = 120;

export function SidebarNavItem({ to, icon: Icon, label, depth = 0, sectionId, onNavigate }: {
  to: string; icon: LucideIcon; label: string; depth?: number; sectionId?: string; onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const hoverTimerRef = useRef<number | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearHoverTimer();
    };
  }, [clearHoverTimer]);

  const handleFocusPrefetch = useCallback(() => {
    clearHoverTimer();
    prefetchRoute(to);
  }, [clearHoverTimer, to]);

  const handleHoverPrefetch = useCallback(() => {
    const isFinePointer = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) {
      return;
    }

    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => {
      prefetchRoute(to);
      hoverTimerRef.current = null;
    }, HOVER_PREFETCH_DELAY_MS);
  }, [clearHoverTimer, to]);

  const handleTouchPrefetch = useCallback(() => {
    clearHoverTimer();
    prefetchRoute(to);
  }, [clearHoverTimer, to]);

  const moduleColor = sectionColors[sectionId ?? "control"] ?? sectionColors.control;
  const isActive = isRouteItemActive(pathname, to);
  const stateClass = isActive ? sidebarState.itemActive : sidebarState.item;
  const isChildItem = depth > 0;
  const childStateClass = isActive ? sidebarState.childActive : sidebarState.child;
  // Use child state for items with depth, item state for top-level
  const finalState = isChildItem ? childStateClass : stateClass;

  return (
    <NavLink
      to={to}
      end={true}
      onClick={onNavigate}
      onMouseEnter={handleHoverPrefetch}
      onMouseLeave={clearHoverTimer}
      onBlur={clearHoverTimer}
      onFocus={handleFocusPrefetch}
      onTouchStart={handleTouchPrefetch}
      className={`${sidebarNavTokens.row} ${isActive ? sidebarNavTokens.active : sidebarNavTokens.inactive} ${finalState}`}
      style={{ paddingLeft: sidebarIndent(depth) }}
    >
      <Icon className={`${sidebarNavTokens.icon} ${moduleColor} ${isActive ? "stroke-[2.6]" : ""}`} />
      <span className={`${sidebarNavTokens.label} ${isActive ? (isChildItem ? "text-sidebar-active-fg" : "text-sidebar-active-fg") : "text-sidebar-foreground"}`}>{label}</span>
    </NavLink>
  );
}
