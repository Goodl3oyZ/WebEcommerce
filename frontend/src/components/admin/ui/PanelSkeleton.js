export function PanelSkeleton({ cards = 0, rows = 6, charts = 0 }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      {cards > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <div
              key={`card-${i}`}
              className="h-32 rounded-2xl border border-border bg-surface-muted"
            />
          ))}
        </div>
      )}
      {charts > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: charts }).map((_, i) => (
            <div
              key={`chart-${i}`}
              className="h-64 rounded-2xl border border-border bg-surface-muted"
            />
          ))}
        </div>
      )}
      {rows > 0 && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={`row-${i}`}
              className="h-10 rounded-lg bg-surface-muted"
            />
          ))}
        </div>
      )}
      <span className="sr-only">กำลังโหลดข้อมูล</span>
    </div>
  );
}
