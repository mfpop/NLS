import { Clock, Search, Filter, Download, RefreshCw } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition-colors`;

export function FileHistoryPage() {
  return (
    <AppPageLayout
      title="File History"
      subtitle="Audit log of all imported files, including timestamps, source details, processing status, and error records."
      icon={<Clock />}
      iconClass="text-slate-500"
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex h-9 items-center gap-2 border-b border-border/35 bg-muted px-3 select-none">
          <div className="relative w-72">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" placeholder="Search file history..." className={inputClass} />
          </div>
          <div className="flex-1" />
          <button type="button" className={buttonClass}><Filter className="h-4 w-4 stroke-current" /><span>Filter</span></button>
          <button type="button" className={buttonClass}><Download className="h-4 w-4 stroke-current" /><span>Export</span></button>
          <button type="button" className={buttonClass}><RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span></button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto text-slate-500/30 stroke-current" />
            <p className="mt-3 text-sm text-muted-foreground">No file import history available.</p>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
