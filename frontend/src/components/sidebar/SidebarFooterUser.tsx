import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { User, Settings, LogOut, MoreVertical } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function SidebarFooterUser() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className={`absolute bottom-full left-0 right-0 overflow-hidden transition-all duration-150 ${isOpen ? "max-h-[200px]" : "max-h-0"}`}>
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 py-1">
          <NavLink to="/system/profile" onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 h-9 px-3 text-[15px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <User className="h-[18px] w-[18px] stroke-current" />
            Profile
          </NavLink>
          <NavLink to="/system/preferences" onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 h-9 px-3 text-[15px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <Settings className="h-[18px] w-[18px] stroke-current" />
            Settings
          </NavLink>
          <NavLink to="/system/sign-out" onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 h-9 px-3 text-[15px] font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px] stroke-current" />
            Sign out
          </NavLink>
        </div>
      </div>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 w-full h-12 px-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
          {initials(user?.username ?? "User")}
        </span>
        <span className="flex flex-col flex-1 min-w-0 text-left leading-snug">
          <span className="truncate text-[15px] font-semibold text-slate-700 dark:text-slate-300">{user?.username ?? "User"}</span>
          <span className="truncate text-[12px] text-slate-400 dark:text-slate-500">{user?.role?.replace("_", " ") ?? ""}</span>
        </span>
        <MoreVertical className="h-4 w-4 stroke-current shrink-0 text-slate-400" />
      </button>
    </div>
  );
}
