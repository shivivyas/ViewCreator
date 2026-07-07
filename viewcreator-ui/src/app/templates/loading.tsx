export default function TemplatesLoading() {
  return (
    <div className="flex-1 bg-background">
      {/* Header skeleton */}
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-5 w-72 bg-muted rounded animate-pulse" />
          <div className="flex gap-3">
            <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-lg animate-pulse ml-auto" />
          </div>
        </div>
      </section>

      {/* Grid skeleton */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
