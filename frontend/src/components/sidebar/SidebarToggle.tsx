import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar";

export function SidebarToggle() {
  const isMini = useSidebarStore((s) => s.sidebarMode === "mini");
  const toggleSidebarMode = useSidebarStore((s) => s.toggleSidebarMode);

  return (
    <button
      type="button"
      onClick={toggleSidebarMode}
      aria-label={isMini ? "Expand sidebar" : "Collapse sidebar"}
      title={isMini ? "Expand sidebar" : "Collapse sidebar"}
      className={`
        flex items-center justify-center
        self-stretch w-[18px] shrink-0 z-100
        transition-all duration-200
        outline-none
        focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sidebar-border
        ${isMini
          ? "bg-sidebar-header-bg text-sidebar-icon hover:text-sidebar-foreground hover:bg-sidebar-hover-bg border-r border-sidebar-border rounded-r-[50px]"
          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted rounded-l-[50px] -ml-4"
        }
      `}
    >
      {isMini
        ? <ChevronRight className="h-4 w-4 stroke-current" />
        : <ChevronLeft className="h-4 w-4 stroke-current" />
      }
    </button>
  );
}
