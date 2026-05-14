export function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 h-16 px-3 shrink-0 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
        <img src="/favicon.svg" alt="LeanSynk" className="h-8 w-8" />
      </div>
      <div className="leading-snug min-w-0">
        <div className="truncate text-[24px] font-bold text-slate-950 dark:text-slate-50 tracking-tight leading-none">LeanSynk</div>
        <div className="mt-1 truncate text-[10px] font-semibold text-slate-600 dark:text-slate-300 tracking-[0.08em] leading-none">LEAN MANUFACTURING</div>
      </div>
    </div>
  );
}
