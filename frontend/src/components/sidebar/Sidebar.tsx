import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarBrand } from "./SidebarBrand";
import { ActiveLineSelector } from "./ActiveLineSelector";
import { SidebarNav } from "./SidebarNav";
import { SidebarNavCollapsed } from "./SidebarNavCollapsed";
import { SidebarFooterUser } from "./SidebarFooterUser";
import { useSidebarStore } from "@/stores/sidebar";

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const toggleSurface = collapsed
    ? "bg-card border-r border-border"
    : "bg-muted border-l border-border";

  return (
    <aside className={`relative flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-border ${collapsed ? "w-12" : "w-64"}`} aria-label="Application sidebar">
      <div className={`relative flex items-center shrink-0 h-16 ${collapsed ? "justify-center" : "pl-4"} border-b border-border bg-card`}>
        <SidebarBrand collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground hover:text-foreground transition-colors z-50 ${toggleSurface} ${collapsed ? "hover:bg-muted" : "hover:bg-muted/95"}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5 stroke-current" /> : <ChevronLeft className="h-3.5 w-3.5 stroke-current" />}
        </button>
      </div>
      {collapsed ? (
        <SidebarNavCollapsed />
      ) : (
        <>
          <ActiveLineSelector />
          <SidebarNav />
        </>
      )}
      <SidebarFooterUser />
    </aside>
  );
}
