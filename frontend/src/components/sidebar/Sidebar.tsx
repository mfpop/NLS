import { SidebarBrand } from "./SidebarBrand";
import { ActiveLineSelector } from "./ActiveLineSelector";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooterUser } from "./SidebarFooterUser";
import { theme } from "@/styles/themeTokens";

export function Sidebar() {
  return (
    <aside className={`flex flex-col h-screen overflow-hidden ${theme.page} border-r border-border w-64`} aria-label="Application sidebar">
      <SidebarBrand />
      <ActiveLineSelector />
      <SidebarNav />
      <SidebarFooterUser />
    </aside>
  );
}
