import { ContentTransition } from "@/components/sidebar/ContentTransition";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { theme } from "@/styles/themeTokens";
import { useSidebarStore } from "@/stores/sidebar";

export function AppShell() {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className={`shrink-0 transition-all duration-200 ${collapsed ? "w-12" : "w-64"}`}>
        <Sidebar />
      </div>
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ${theme.page}`}>
        <ContentTransition />
      </main>
    </div>
  );
}
