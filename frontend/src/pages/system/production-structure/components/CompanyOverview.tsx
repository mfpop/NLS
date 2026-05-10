export interface CompanyOverviewData {
  name: string;
  code?: string;
  defaultTimezone?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  logoUrl?: string;
}

export function CompanyOverview({ company }: { company: CompanyOverviewData | null }) {
  if (!company) return null;
  return (
    <div className="flex items-center gap-4 min-w-0 flex-1">
      <div className="flex h-7 w-12 shrink-0 items-center justify-center rounded bg-white dark:bg-slate-800 overflow-hidden">
        {company.logoUrl ? (
          <img src={company.logoUrl} alt={company.name} className="h-full w-full object-contain" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <svg className="h-4 w-4 stroke-current" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </span>
        )}
      </div>
      <div className="min-w-0 flex items-center gap-3 flex-wrap">
        <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">{company.name}</span>
        {company.code && (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{company.code}</span>
        )}
      </div>
    </div>
  );
}
