// Elegant StockHouse Watermark - subtle, behind all content
function StockHouseWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="text-foreground/[0.04] font-bold tracking-tighter whitespace-nowrap"
        style={{
          fontSize: 'clamp(8rem, 18vw, 20rem)',
          transform: 'rotate(-12deg)',
          letterSpacing: '-0.05em',
        }}
      >
        StockHouse
      </div>
    </div>
  );
}
