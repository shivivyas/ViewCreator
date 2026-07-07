"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Editor page error:", error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Editor couldn&apos;t load</h2>
        <p className="text-sm text-muted-foreground">
          The image editor encountered an error. Please try again.
        </p>
        <Button onClick={reset} variant="default" className="gap-2">
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
