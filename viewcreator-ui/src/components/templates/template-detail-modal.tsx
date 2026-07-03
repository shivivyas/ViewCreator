import React from "react";
import { X, Wand2, Trash2 } from "lucide-react";
import type { Template } from "@/types";
import { Button } from "@/components/ui/button";

interface TemplateDetailModalProps {
  template: Template | null;
  onClose: () => void;
  onUse: (id: string) => void;
  onDelete: (e: React.MouseEvent, template: Template) => void;
  userId: string | null | undefined;
}

export function TemplateDetailModal({
  template,
  onClose,
  onUse,
  onDelete,
  userId,
}: TemplateDetailModalProps) {
  if (!template) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:w-[55%] bg-muted/30 flex items-center justify-center p-5 border-b md:border-b-0 md:border-r border-border/50">
          {template.media_type === "video" ? (
            <video
              src={template.s3_link}
              className="max-w-full max-h-[50vh] md:max-h-[70vh] object-contain rounded-xl"
              autoPlay
              muted
              loop
              playsInline
              controls
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={template.s3_link}
              alt={template.title}
              className="max-w-full max-h-[50vh] md:max-h-[70vh] object-contain rounded-xl"
            />
          )}
        </div>
        <div className="md:w-[45%] p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {template.media_type === "video" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-muted text-muted-foreground">
                  Video
                </span>
              )}
              {(template.config?.tags?.length
                ? template.config.tags
                : [template.config?.category || "Uncategorized"]
              ).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>

          <h2 className="text-xl font-bold mb-2">{template.title}</h2>
          <p className="text-sm text-muted-foreground flex-1 leading-relaxed whitespace-pre-wrap">
            {template.description || "No description provided."}
          </p>

          <div className="mt-auto pt-5 border-t border-border/50 space-y-3">
            <Button
              size="lg"
              className="w-full font-semibold rounded-xl shadow-sm"
              onClick={() => onUse(template.id)}
            >
              <Wand2 className="size-4 mr-2" />
              Use This Template
            </Button>

            {userId && template.user_id === userId && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10 rounded-xl border-border/50"
                onClick={(e) => onDelete(e, template)}
              >
                <Trash2 className="size-4 mr-2" />
                Delete Template
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
