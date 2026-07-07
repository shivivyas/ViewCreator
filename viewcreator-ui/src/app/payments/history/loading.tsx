import { Loader2 } from "lucide-react";

export default function PaymentHistoryLoading() {
  return (
    <div className="flex-1">
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-6 rounded bg-muted animate-pulse" />
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </section>
    </div>
  );
}
