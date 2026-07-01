import React, { useRef } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Upload, X, LayoutGrid } from "lucide-react";
import type { Template, MediaType } from "@/types";

const ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9", "2:3"] as const;

export interface GenerateFormProps {
  prompt: string;
  setPrompt: (val: string | ((prev: string) => string)) => void;
  aspectRatio: string;
  setAspectRatio: (val: string) => void;
  numberOfImages: number;
  setNumberOfImages: (val: number) => void;
  imageSize: string;
  setImageSize: (val: string) => void;
  referenceImages: string[];
  setReferenceImages: React.Dispatch<React.SetStateAction<string[]>>;
  templates: Template[];
  selectedTemplateId: string | null;
  setSelectedTemplateId: (val: string | null) => void;
  isLoadingTemplates: boolean;
  isLoading: boolean;
  mounted: boolean;
  error: string | null;
  handleGenerate: (e: React.FormEvent) => void;
  handleEnhancePrompt: () => void;
  mediaType: MediaType;
  duration: number;
  setDuration: (val: number) => void;
}

export function GenerateForm({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  numberOfImages,
  setNumberOfImages,
  imageSize,
  setImageSize,
  referenceImages,
  setReferenceImages,
  templates,
  selectedTemplateId,
  setSelectedTemplateId,
  isLoadingTemplates,
  isLoading,
  mounted,
  error,
  handleGenerate,
  handleEnhancePrompt,
  mediaType,
  duration,
  setDuration,
}: GenerateFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
  const recommendedPrompts = activeTemplate?.config?.recommendedPrompts;

  const filteredTemplates = templates.filter(
    (tpl) =>
      mediaType === "video"
        ? tpl.media_type === "video" || !tpl.media_type
        : true
  );

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file, i) => {
      if (referenceImages.length + i < 3 && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () =>
          setReferenceImages((prev) => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    processFiles(e.target.files);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-y-auto">
      <form
        id="generate-form"
        onSubmit={handleGenerate}
        className="flex flex-col gap-4 p-5"
      >
        {/* ── Prompt ──────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt" className="text-xs font-semibold">
              Prompt
            </Label>
            <button
              type="button"
              onClick={handleEnhancePrompt}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Sparkles className="size-3" />
              Enhance
            </button>
          </div>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the marketing visual you want to create..."
            className="min-h-[80px] resize-none rounded-xl text-sm leading-relaxed focus-visible:ring-primary/30"
            disabled={isLoading}
          />
        </div>

        {/* ── Template thumbnails ──────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Template
              {selectedTemplateId && activeTemplate && (
                <span className="font-normal text-muted-foreground ml-1">
                  — {activeTemplate.title}
                </span>
              )}
            </Label>
            <Link
              href="/templates"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <LayoutGrid className="size-3" />
              Browse all
            </Link>
          </div>

          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length > 0 ? (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedTemplateId(null)}
                  className={`shrink-0 w-[90px] rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    !selectedTemplateId
                      ? "border-foreground ring-1 ring-foreground"
                      : "border-border/50 hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="aspect-[4/5] bg-muted flex items-center justify-center">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      None
                    </span>
                  </div>
                </button>
                {filteredTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      if (tpl.config?.aspectRatio)
                        setAspectRatio(tpl.config.aspectRatio);
                    }}
                    className={`shrink-0 w-[90px] rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                      selectedTemplateId === tpl.id
                        ? "border-foreground ring-1 ring-foreground"
                        : "border-border/50 hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="aspect-[4/5] bg-muted relative">
                      {tpl.media_type === "video" ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Vid
                          </span>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={tpl.s3_link}
                          alt={tpl.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {recommendedPrompts && recommendedPrompts.length > 0 && (
                <div className="pt-0.5 space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    Suggested prompts
                  </p>
                  <div className="flex flex-col gap-1">
                    {recommendedPrompts.map((p: string, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPrompt(p)}
                        className="text-[11px] text-left text-primary/80 hover:text-primary bg-primary/5 hover:bg-primary/10 rounded-lg px-2.5 py-1.5 border border-primary/10 transition-colors truncate"
                      >
                        &ldquo;{p}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border/50 rounded-xl">
              No templates available
            </div>
          )}
        </div>

        <div className="border-t border-border/50" />

        {/* ── Aspect Ratio + Count ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ratio</Label>
            <div className="flex gap-1">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 h-7 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                    aspectRatio === ratio
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
          {mediaType === "image" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Count</Label>
              <div className="flex gap-1">
                {[1, 2, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumberOfImages(n)}
                    className={`flex-1 h-7 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                      numberOfImages === n
                        ? "bg-foreground text-background shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Resolution (image) / Duration (video) ────────── */}
        {mediaType === "image" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Resolution</Label>
            <div className="flex gap-1">
              {["512", "1K", "2K", "4K"].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setImageSize(size)}
                  className={`flex-1 h-7 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                    imageSize === size
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {mediaType === "video" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Duration</Label>
            <div className="flex gap-1">
              {[3, 6, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDuration(sec)}
                  className={`flex-1 h-7 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                    duration === sec
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Reference Images ────────────────────────────── */}
        {mediaType === "image" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                References ({referenceImages.length}/3)
              </Label>
              {referenceImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReferenceImages([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {referenceImages.length < 3 && (
              <div
                className={`rounded-xl border-2 border-dashed py-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border bg-muted/20"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="size-4 text-muted-foreground mb-1" />
                <p className="text-[11px] font-medium text-foreground">
                  Add reference
                </p>
              </div>
            )}

            {referenceImages.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {referenceImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-border/50 overflow-hidden size-[60px] bg-muted/20"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Ref ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setReferenceImages((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="size-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
          </div>
        )}

        {/* ── Error ───────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs text-destructive font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* ── Generate Button (inline, always visible) ─────── */}
        <Button
          type="submit"
          size="lg"
          className="w-full h-11 rounded-xl font-semibold shadow-sm transition-all mt-1"
          disabled={!mounted || isLoading || !prompt.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
