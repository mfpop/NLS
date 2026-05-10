import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export function SidebarNavItem({ to, icon: Icon, label, depth = 0, onNavigate }: {
  to: string; icon: LucideIcon; label: string; depth?: number; onNavigate?: () => void;
}) {
  return (
    <NavLink to={to} end={to === "/"} onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2.5 h-8 text-xs font-medium transition-colors pr-3 outline-none focus:outline-none ${
          isActive
            ? "bg-slate-200/70 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 border-l-[3px] border-emerald-500 dark:border-emerald-400"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-[3px] border-transparent"
        }`
      }
      style={{ paddingLeft: depth === 0 ? 12 : 28 + depth * 12 }}
    >
      <Icon className="h-[18px] w-[18px] stroke-current shrink-0" />
      <span className="truncate text-[15px]">{label}</span>
    </NavLink>
  );
}
