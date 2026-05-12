export function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 h-14 px-3 shrink-0 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
        <img src="/favicon.svg" alt="LeanSynk" className="h-8 w-8" />
      </div>
      <div className="leading-snug">
        <div className="text-[25px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-[1]">LeanSynk</div>
        <div className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-[0.09em] leading-[1.05]">LEAN MANUFACTURING</div>
      </div>
    </div>
  );
}
