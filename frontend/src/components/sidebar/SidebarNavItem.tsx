import { useCallback, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { prefetchRoute } from "@/routes/routePrefetch";
import { theme } from "@/styles/themeTokens";

const HOVER_PREFETCH_DELAY_MS = 120;

export function SidebarNavItem({ to, icon: Icon, label, depth = 0, onNavigate }: {
  to: string; icon: LucideIcon; label: string; depth?: number; onNavigate?: () => void;
}) {
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

  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      onMouseEnter={handleHoverPrefetch}
      onMouseLeave={clearHoverTimer}
      onBlur={clearHoverTimer}
      onFocus={handleFocusPrefetch}
      onTouchStart={handleTouchPrefetch}
      className={({ isActive }) =>
        `flex items-center gap-2.5 h-8 text-xs transition-colors pr-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 ${
isActive
          ? `${theme.textPrimary} bg-blue-50/80 font-bold dark:bg-blue-500/15 border-l-[3px] border-blue-500 dark:border-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]`
          : `${depth > 0 ? "text-slate-500 dark:text-slate-300/90" : theme.navInactive} font-semibold ${theme.interactiveRowStrong} border-l-[3px] border-transparent`
        }`
      }
      style={{ paddingLeft: depth === 0 ? 12 : 28 + depth * 12 }}
    >
      <Icon className="h-[17px] w-[17px] stroke-current shrink-0" />
      <span className="truncate text-[14px] leading-5">{label}</span>
    </NavLink>
  );
}
