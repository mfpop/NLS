import { ContentTransition } from "@/components/sidebar/ContentTransition";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { theme } from "@/styles/themeTokens";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ${theme.page}`}>
        <ContentTransition />
      </main>
    </div>
  );
}
