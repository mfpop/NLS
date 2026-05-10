import { SidebarBrand } from "./SidebarBrand";
import { ActiveLineSelector } from "./ActiveLineSelector";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooterUser } from "./SidebarFooterUser";

export function Sidebar() {
  return (
    <aside className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 w-64" aria-label="Application sidebar">
      <SidebarBrand />
      <ActiveLineSelector />
      <SidebarNav />
      <SidebarFooterUser />
    </aside>
  );
}
