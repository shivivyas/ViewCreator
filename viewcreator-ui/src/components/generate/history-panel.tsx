import React, { useState } from "react";
import JSZip from "jszip";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearHistory,
  deleteGenerationFromHistory,
} from "@/store/slices/image-editor-slice";
import type { GenerationHistoryItem, MediaType } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ImageIcon,
  Loader2,
  X,
  Clock,
  RefreshCw,
  Video,
  Trash2,
  Sparkles,
  Copy,
  Download,
} from "lucide-react";

export interface HistoryPanelProps {
  isLoading: boolean;
  loadingParams: {
    prompt: string;
    aspectRatio: string;
    imageSize: string;
    numberOfImages: number;
    mediaType?: MediaType;
  };
  handleLoadSettings: (item: GenerationHistoryItem) => void;
  handleRegenerate: (item: GenerationHistoryItem) => void;
  handleSelectImageFromHistory: (item: GenerationHistoryItem, index: number) => void;
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton({
  params,
}: {
  params: HistoryPanelProps["loadingParams"];
}) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="size-4 animate-spin text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {params.mediaType === "video"
                ? "Generating video..."
                : "Generating images..."}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {params.mediaType === "video"
                ? "Gemini 3.1 Flash"
                : "Gemini 3.1 Flash"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground italic leading-relaxed line-clamp-2">
        &ldquo;{params.prompt}&rdquo;
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
          {params.aspectRatio}
        </span>
        {params.mediaType !== "video" && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
            {params.imageSize}
          </span>
        )}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
          Standard
        </span>
      </div>

      <div
        className={`grid gap-3 ${
          params.mediaType === "video"
            ? "grid-cols-1"
            : params.numberOfImages === 1
            ? "grid-cols-1 max-w-sm"
            : params.numberOfImages === 2
            ? "grid-cols-2"
            : "grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {Array.from({ length: params.numberOfImages }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-muted/40 border border-dashed border-border/50 flex flex-col items-center justify-center gap-1.5 animate-pulse"
          >
            <ImageIcon className="size-6 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/40 font-medium">
              {params.mediaType === "video"
                ? "Rendering..."
                : `Variation ${i + 1}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Sparkles className="size-7 text-muted-foreground" />
      </div>
      <p className="text-base font-medium text-foreground">No generations yet</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Configure your parameters and hit Generate. Your creations will appear
        here.
      </p>
    </div>
  );
}

// ─── History item ──────────────────────────────────────────────────────────

function HistoryItem({
  item,
  isLoading,
  onLoadSettings,
  onRegenerate,
  onSelectImage,
}: {
  item: GenerationHistoryItem;
  isLoading: boolean;
  onLoadSettings: (item: GenerationHistoryItem) => void;
  onRegenerate: (item: GenerationHistoryItem) => void;
  onSelectImage: (item: GenerationHistoryItem, index: number) => void;
}) {
  const dispatch = useAppDispatch();

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
            <Clock className="size-3 text-muted-foreground/60" />
            {item.timestamp}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-muted text-muted-foreground shrink-0">
            {item.aspectRatio}
          </span>
          {item.mediaType === "video" ? (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-medium bg-muted text-muted-foreground shrink-0">
              <Video className="size-2.5" />
              {item.duration}s
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-muted text-muted-foreground shrink-0">
              {item.imageSize}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onLoadSettings(item)}
            className="h-7 px-2 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            title="Load these settings"
          >
            <Copy className="size-3" />
            <span className="hidden sm:inline">Load</span>
          </button>
          <button
            onClick={() => onRegenerate(item)}
            disabled={isLoading}
            className="h-7 px-2 rounded-lg text-[10px] text-primary hover:text-primary hover:bg-primary/5 transition-colors flex items-center gap-1"
            title="Regenerate"
          >
            <RefreshCw className="size-3" />
            <span className="hidden sm:inline">Retry</span>
          </button>
          <button
            onClick={() => dispatch(deleteGenerationFromHistory(item.id))}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center"
            title="Remove"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Prompt */}
        <div className="text-xs text-muted-foreground bg-muted/30 border border-border/30 rounded-xl px-3 py-2.5 leading-relaxed select-all break-words">
          {item.prompt}
        </div>

        {/* References */}
        {item.referenceImages && item.referenceImages.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium">
              References:
            </span>
            <div className="flex gap-1">
              {item.referenceImages.map((ref, i) => (
                <div
                  key={i}
                  className="size-6 rounded-md border border-border/50 bg-muted overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ref}
                    alt={`Ref ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video or Image grid */}
        {item.mediaType === "video" && item.videoUrls?.length ? (
          <div className="grid gap-3 max-w-lg">
            {item.videoUrls.map((url, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden border border-border/50 bg-black"
              >
                <video
                  src={url}
                  controls
                  className="w-full max-h-[300px] object-contain"
                  playsInline
                />
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/75 text-white text-[9px] font-semibold rounded-lg px-2 py-1 pointer-events-none">
                  <Video className="size-3" />
                  Video
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-3 ${
              item.imageUrls.length === 1
                ? "grid-cols-1 max-w-sm"
                : item.imageUrls.length === 2
                ? "grid-cols-2"
                : "grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {item.imageUrls.map((url, i) => (
              <div
                key={i}
                className="group relative rounded-xl overflow-hidden border border-border/50 bg-muted/20 aspect-square cursor-pointer transition-all duration-300 hover:border-border hover:shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Variation ${i + 1}`}
                  onClick={() => onSelectImage(item, i)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <span className="absolute top-1.5 left-1.5 bg-black/75 text-white text-[9px] font-semibold rounded-lg px-2 py-0.5 pointer-events-none select-none">
                  #{i + 1}
                </span>

                <div
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                  onClick={() => onSelectImage(item, i)}
                >
                  <span className="text-xs text-white font-medium flex items-center gap-1.5">
                    <ImageIcon className="size-4" />
                    Edit
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History panel ─────────────────────────────────────────────────────────

export function HistoryPanel({
  isLoading,
  loadingParams,
  handleLoadSettings,
  handleRegenerate,
  handleSelectImageFromHistory,
}: HistoryPanelProps) {
  const dispatch = useAppDispatch();
  const editorState = useAppSelector((state) => state.imageEditor);
  const hasHistory =
    editorState.history && editorState.history.length > 0;
  const [showClearModal, setShowClearModal] = useState(false);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Compact header bar */}
      <div className="flex items-center justify-between shrink-0 h-9">
        <h2 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          Output
          {hasHistory && (
            <span className="font-normal">
              {editorState.history.length}
            </span>
          )}
        </h2>
        {hasHistory && (
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                const zip = new JSZip();
                let count = 0;

                for (const [hi, item] of editorState.history.entries()) {
                  const urls =
                    item.mediaType === "video"
                      ? item.videoUrls ?? []
                      : item.imageUrls;

                  for (const [ai, url] of urls.entries()) {
                    const prefix =
                      item.mediaType === "video" ? "video" : "image";
                    const ext =
                      item.mediaType === "video" ? ".mp4" : ".png";
                    const name = `viewcreator-${prefix}-${hi + 1}-${ai + 1}${ext}`;

                    if (url.startsWith("data:")) {
                      const comma = url.indexOf(",");
                      const meta = url.slice(0, comma);
                      const raw = atob(url.slice(comma + 1));
                      const buf = new Uint8Array(raw.length);
                      for (let i = 0; i < raw.length; i++)
                        buf[i] = raw.charCodeAt(i);
                      zip.file(name, buf);
                    } else {
                      try {
                        const resp = await fetch(url);
                        const blob = await resp.blob();
                        zip.file(name, blob);
                      } catch {
                        console.warn("Failed to fetch", url);
                      }
                    }
                    count++;
                  }
                }

                if (count === 0) return;

                const blob = await zip.generateAsync({ type: "blob" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `viewcreator-assets-${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
                toast.success(`Downloaded ${count} asset(s) as zip`);
              }}
              className="h-6 px-2 rounded-md text-[10px] text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
              title="Download all assets as zip"
            >
              <Download className="size-3" />
              Download all
            </button>
            <button
              onClick={() => setShowClearModal(true)}
              className="h-6 px-2 rounded-md text-[10px] text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"
            >
              <Trash2 className="size-3" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Clear Confirmation Modal ──────────────────────── */}
      {showClearModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border/50 p-6">
            <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Clear all history?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will permanently remove all {editorState.history.length} generation(s)
              from this session. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowClearModal(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  dispatch(clearHistory());
                  setShowClearModal(false);
                }}
                className="rounded-xl"
              >
                Clear all
              </Button>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 pr-2">
          {/* Loading skeleton */}
          {isLoading && <LoadingSkeleton params={loadingParams} />}

          {/* History items */}
          {hasHistory ? (
            editorState.history.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                isLoading={isLoading}
                onLoadSettings={handleLoadSettings}
                onRegenerate={handleRegenerate}
                onSelectImage={handleSelectImageFromHistory}
              />
            ))
          ) : !isLoading ? (
            <EmptyState />
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
