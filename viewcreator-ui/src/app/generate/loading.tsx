import { Loader2 } from "lucide-react";

export default function GenerateLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50 shrink-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <div className="size-8 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-36 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 w-full">
        <div className="grid lg:grid-cols-[400px_1fr] gap-6">
          {/* Form skeleton */}
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded-lg animate-pulse" />
            <div className="h-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 bg-muted rounded-lg animate-pulse" />
          </div>

          {/* History panel skeleton */}
          <div className="space-y-3">
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
