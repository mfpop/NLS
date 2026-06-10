export function LinePerformanceSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 p-4 animate-pulse">
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
