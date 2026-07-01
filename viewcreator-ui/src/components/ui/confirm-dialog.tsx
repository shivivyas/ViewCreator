import type { ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  destructive = true,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border/50 p-6">
        <div
          className={cn(
            "size-10 rounded-xl flex items-center justify-center mb-4",
            destructive
              ? "bg-destructive/10"
              : "bg-muted"
          )}
        >
          {icon ?? <Trash2 className={cn("size-5", destructive ? "text-destructive" : "text-muted-foreground")} />}
        </div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
