export function SidebarBrand({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden">
        <img src="/logo/icon-128.png" alt="LeanSynk" className="h-7 w-7 object-contain" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden">
        <img src="/logo/icon-128.png" alt="LeanSynk" className="h-7 w-7 object-contain" />
      </div>
      <div className="leading-snug min-w-0">
        <div className="truncate text-xl font-bold text-sidebar-foreground tracking-tight leading-none">LeanSynk</div>
        <div className="mt-0 truncate text-[9px] font-semibold text-sidebar-muted tracking-[0.08em] leading-none">LEAN MANUFACTURING</div>
      </div>
    </div>
  );
}
