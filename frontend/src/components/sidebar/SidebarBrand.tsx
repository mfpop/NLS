import { theme } from "@/styles/themeTokens";

export function SidebarBrand() {
  return (
    <div className={`flex items-center gap-3 h-16 px-3 shrink-0 ${theme.sectionDivider} ${theme.page}`}>
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
        <img src="/favicon.svg" alt="LeanSynk" className="h-8 w-8" />
      </div>
      <div className="leading-snug min-w-0">
        <div className={`truncate text-[24px] font-bold ${theme.textPrimary} tracking-tight leading-none`}>LeanSynk</div>
        <div className={`mt-1 truncate text-[10px] font-semibold ${theme.textSecondary} tracking-[0.08em] leading-none`}>LEAN MANUFACTURING</div>
      </div>
    </div>
  );
}
