export function LinePerformanceSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="grid grid-cols-7 divide-x divide-border border-b border-border">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center px-3 py-3">
            <div className="h-8 w-full rounded bg-muted/80" />
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-rows-[48%_52%] divide-y divide-border">
        <div className="grid grid-cols-2 divide-x divide-border">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="h-5 w-24 rounded bg-muted/80 mb-3" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 rounded bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3">
              <div className="h-5 w-20 rounded bg-muted/80 mb-2" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-7 rounded bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
