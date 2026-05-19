import { AlertTriangle, Search, Filter, Download, RefreshCw } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors`;

export function ValidationErrorsPage() {
  return (
    <AppPageLayout
      title="Validation Errors"
      subtitle="Review and resolve import validation issues, including data format errors, missing fields, and constraint violations."
      icon={<AlertTriangle />}
      iconClass="text-amber-600"
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex h-9 items-center gap-2 border-b border-border/35 bg-muted px-3 select-none">
          <div className="relative w-72">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" placeholder="Search validation errors..." className={inputClass} />
          </div>
          <div className="flex-1" />
          <button type="button" className={buttonClass}><Filter className="h-4 w-4 stroke-current" /><span>Filter by Domain</span></button>
          <button type="button" className={buttonClass}><Download className="h-4 w-4 stroke-current" /><span>Export Report</span></button>
          <button type="button" className={buttonClass}><RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span></button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-600/30 stroke-current" />
            <p className="mt-3 text-sm text-muted-foreground">No validation errors found.</p>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
