import { ContentTransition } from "@/components/sidebar/ContentTransition";
import { Sidebar } from "@/components/sidebar/Sidebar";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
        <ContentTransition />
      </main>
    </div>
  );
}
