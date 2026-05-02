import { ContentTransition } from "@/components/sidebar/ContentTransition";
import { SidebarShell } from "@/components/sidebar/SidebarShell";

export function AppShell() {
  return (
    <div className="app-shell">
      <SidebarShell />
      <main className="app-main">
        <ContentTransition />
      </main>
    </div>
  );
}
