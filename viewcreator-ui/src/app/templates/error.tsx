"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TemplatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Templates page error:", error);
  }, [error]);

  return (
    <div className="flex-1 bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Templates unavailable</h2>
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load the template marketplace. Please try again.
        </p>
        <Button onClick={reset} variant="default" className="gap-2">
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
