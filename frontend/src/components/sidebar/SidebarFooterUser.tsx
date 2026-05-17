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
    <div ref={ref} className="relative shrink-0 border-t border-border bg-muted bg-card">
      <div className={`absolute bottom-full left-0 right-0 overflow-hidden transition-all duration-120 ease-out ${isOpen ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-card border-b border-border py-0.5">
          <NavLink to="/system/profile" onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 h-8 px-3 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          >
            <User className="h-4 w-4 stroke-current" />
            Profile
          </NavLink>
          <NavLink to="/system/preferences" onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 h-8 px-3 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          >
            <Settings className="h-4 w-4 stroke-current" />
            Settings
          </NavLink>
          <NavLink to="/system/sign-out" onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 h-8 px-3 text-[13px] font-medium text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="h-4 w-4 stroke-current" />
            Sign out
          </NavLink>
        </div>
      </div>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 w-full h-14 px-3 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-hover text-[13px] font-semibold text-sidebar-foreground shrink-0">
          {initials(user?.username ?? "User")}
        </span>
        <span className="flex flex-col flex-1 min-w-0 text-left leading-snug">
          <span className="truncate text-[13px] font-semibold text-sidebar-foreground">{user?.username ?? "User"}</span>
          <span className="truncate text-[11px] font-medium text-sidebar-foreground/60">{user?.role?.replace("_", " ") ?? ""}</span>
        </span>
        <MoreVertical className="h-4 w-4 stroke-current shrink-0 text-sidebar-foreground/50" />
      </button>
    </div>
  );
}
