export default function PricingLoading() {
  return (
    <div className="flex-1 bg-background">
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-12 space-y-6">
          <div className="text-center space-y-3">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mx-auto" />
            <div className="h-5 w-96 bg-muted rounded animate-pulse mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/50 p-6 space-y-4">
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 w-full bg-muted rounded animate-pulse" />
                  ))}
                </div>
                <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
