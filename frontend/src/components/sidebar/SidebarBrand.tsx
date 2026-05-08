export function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 h-14 px-3 shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-base">
        N
      </div>
      <div className="leading-snug">
        <div className="text-[17px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">LeanSynk</div>
        <div className="text-[12px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest">BY NEXUS</div>
      </div>
    </div>
  );
}
