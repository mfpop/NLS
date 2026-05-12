export function BrandHeader() {
  return (
    <div className="brand-header">
      <div className="brand-header__inner" style={{ gap: "0.75rem" }}>
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
          <img src="/favicon.svg" alt="LeanSynk" className="h-8 w-8" />
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: "25px", fontWeight: 700, letterSpacing: 0, color: "#0f172a" }}>LeanSynk</div>
          <div style={{ marginTop: "4px", fontSize: "10px", fontWeight: 500, letterSpacing: "0.09em", color: "#64748b" }}>LEAN MANUFACTURING</div>
        </div>
      </div>
    </div>
  );
}