import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, User, Settings, LogOut, MoreVertical } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useSidebarStore } from "@/stores/sidebar";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function avatarUrl(user: { email?: string; username?: string } | null) {
  const seed = user?.email || user?.username || "user";
  return `https://i.pravatar.cc/80?u=${encodeURIComponent(seed)}`;
}

export function SidebarFooterUser() {
  const { user } = useAuth();
  const collapseForUserNavigation = useSidebarStore((s) => s.collapseForUserNavigation);
  const [isOpen, setIsOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function closeDropdownAndMenus() {
    setIsOpen(false);
    collapseForUserNavigation();
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0 border-t border-border bg-muted">
      <div className={`absolute bottom-full left-0 right-0 overflow-hidden transition-all duration-120 ease-out ${isOpen ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-card border-b border-border px-0 pt-0.5 pb-0">
          <NavLink to="/system/profile" onClick={closeDropdownAndMenus}
            className="flex items-center gap-2.5 h-[22px] px-3 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          >
            <User className="h-4 w-4 stroke-current" />
            Profile
          </NavLink>
          <NavLink to="/system/preferences" onClick={closeDropdownAndMenus}
            className="flex items-center gap-2.5 h-[22px] px-3 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          >
            <Settings className="h-4 w-4 stroke-current" />
            Settings
          </NavLink>
          <NavLink to="/docs/setup" onClick={closeDropdownAndMenus}
            className="flex items-center gap-2.5 h-[22px] px-3 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          >
            <BookOpen className="h-4 w-4 stroke-current" />
            User Manual
          </NavLink>
          <NavLink to="/system/sign-out" onClick={closeDropdownAndMenus}
            className="flex items-center gap-2.5 h-[22px] px-3 text-[13px] font-medium text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="h-4 w-4 stroke-current" />
            Sign out
          </NavLink>
        </div>
      </div>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 w-full h-10 px-3 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-hover transition-colors outline-none focus-visible:ring-1 focus-visible:ring-border"
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-sidebar-hover text-[11px] font-semibold text-sidebar-foreground shrink-0">
          {avatarFailed ? (
            initials(user?.username ?? "User")
          ) : (
            <img
              src={avatarUrl(user)}
              alt={user?.username ?? "User"}
              className="h-full w-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          )}
        </span>
        <span className="flex flex-col flex-1 min-w-0 text-left leading-snug">
          <span className="truncate text-[12px] font-semibold text-sidebar-foreground">{user?.username ?? "User"}</span>
          <span className="truncate text-[10px] font-medium text-sidebar-foreground/60">{user?.role?.replace("_", " ") ?? ""}</span>
        </span>
        <MoreVertical className="h-3.5 w-3.5 stroke-current shrink-0 text-sidebar-foreground/50" />
      </button>
    </div>
  );
}
