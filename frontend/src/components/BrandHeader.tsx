export function BrandHeader() {
  return (
    <div className="brand-header">
      <div className="brand-header__inner gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
          <img src="/logo/icon-128.png" alt="LeanSynk" className="h-8 w-8 object-contain" />
        </div>
        <div className="leading-none">
          <div className="text-[25px] font-bold tracking-normal text-foreground">LeanSynk</div>
          <div className="mt-1 text-[10px] font-medium tracking-[0.09em] text-muted-foreground">LEAN MANUFACTURING</div>
        </div>
      </div>
    </div>
  );
}