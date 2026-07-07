import { Loader2 } from "lucide-react";

export default function EditLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading editor...</p>
      </div>
    </div>
  );
}
