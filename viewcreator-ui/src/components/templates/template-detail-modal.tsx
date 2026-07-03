import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  X,
  Wand2,
  Trash2,
  Sparkles,
  Download,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Check,
  Columns2,
  Grid3X3,
} from "lucide-react";
import type { Template } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateImages } from "@/services/api/generation-service";

// ─── Types ─────────────────────────────────────────────────────────────────

interface TemplateDetailModalProps {
  template: Template | null;
  onClose: () => void;
  onOpenWorkspace: (
    templateId: string,
    prompt: string,
    imageUrl: string,
    allUrls: string[],
    style: string,
    aspectRatio: string
  ) => void;
  onDelete: (e: React.MouseEvent, template: Template) => void;
  userId: string | null | undefined;
}

type ModalState = "idle" | "generating" | "results" | "error";

// ─── Constants ─────────────────────────────────────────────────────────────

const ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9"] as const;
const IMAGE_COUNTS = [2, 4] as const;

const PROMPT_CHIPS = [
  { label: "Discount Offer", append: "special discount offer, sale banner" },
  { label: "Luxury Brand", append: "luxury brand, premium, elegant" },
  { label: "Minimal Style", append: "minimalist, clean, simple" },
  { label: "Modern Design", append: "modern, contemporary, sleek" },
  { label: "Dark Theme", append: "dark theme, moody, dramatic" },
  { label: "Instagram Ready", append: "Instagram post, social media, engaging" },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function TemplateDetailModal({
  template,
  onClose,
  onOpenWorkspace,
  onDelete,
  userId,
}: TemplateDetailModalProps) {
  const { getToken } = useAuth();

  const [modalState, setModalState] = useState<ModalState>("idle");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<string>(
    template?.config?.aspectRatio || "1:1"
  );
  const [numberOfImages, setNumberOfImages] = useState<number>(4);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  if (!template) return null;

  const stylePreset = template.config?.stylePreset || "None";
  const tags = template.config?.tags?.length
    ? template.config.tags
    : [template.config?.category || "Uncategorized"];

  // ── Handlers ───────────────────────────────────────────

  const appendChip = (chip: (typeof PROMPT_CHIPS)[number]) => {
    setPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip.append;
      if (trimmed.endsWith(",")) return `${trimmed} ${chip.append}`;
      return `${trimmed}, ${chip.append}`;
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setModalState("generating");
    setErrorMessage(null);
    setGeneratedUrls([]);
    setSelectedVariation(null);

    try {
      const token = (await getToken().catch(() => undefined)) || undefined;
      const urls = await generateImages(
        {
          prompt: prompt.trim(),
          style: stylePreset,
          aspectRatio,
          numberOfImages,
          imageSize: "1K",
          thinkingLevel: "minimal",
          quality: "Standard",
          referenceImages: [],
          templateId: template.id,
        },
        token
      );

      if (urls.length === 0) {
        setErrorMessage("No images were generated. Try a different prompt.");
        setModalState("error");
      } else {
        setGeneratedUrls(urls);
        setModalState("results");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed. Please try again.";
      setErrorMessage(msg);
      setModalState("error");
    }
  };

  const handleRetry = () => setModalState("idle");

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `viewcreator-${template.title.replace(/\s+/g, "-").toLowerCase()}-v${index + 1}.png`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleContinueToWorkspace = () => {
    const idx = selectedVariation ?? 0;
    onOpenWorkspace(
      template.id,
      prompt.trim(),
      generatedUrls[idx],
      generatedUrls,
      stylePreset,
      aspectRatio
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // ── Left Panel: Preview + Metadata ────────────────────

  const renderMedia = () => {
    if (template.media_type === "video") {
      return (
        <video
          src={template.s3_link}
          className="w-full h-full object-cover rounded-xl"
          autoPlay
          muted
          loop
          playsInline
          controls
        />
      );
    }
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={template.s3_link}
        alt={template.title}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  };

  const renderLeftPanel = () => (
    <div className="md:w-[42%] bg-muted/30 flex flex-col border-b md:border-b-0 md:border-r border-border/50">
      <div className="relative aspect-[4/5] bg-muted flex items-center justify-center p-4">
        {renderMedia()}
        {template.media_type === "video" && (
          <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-background/80 backdrop-blur-md text-foreground">
            Video
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
            >
              {tag}
            </span>
          ))}
        </div>

        <h2 className="text-lg font-bold mb-1">{template.title}</h2>
        {template.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {template.description}
          </p>
        )}

        {template.config?.recommendedPrompts && template.config.recommendedPrompts.length > 0 && (
          <div className="mt-auto pt-4">
            <p className="text-[11px] font-medium text-muted-foreground mb-2">
              Example prompts
            </p>
            <div className="flex flex-col gap-1">
              {template.config.recommendedPrompts.slice(0, 3).map((rp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(rp)}
                  className="text-[11px] text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-2.5 py-1.5 transition-colors truncate"
                >
                  &ldquo;{rp}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Right Panel Sections ───────────────────────────────

  const renderPromptSection = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Describe what you want to create
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (modalState === "error") setModalState("idle");
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Craft beer launch, Pizza Friday offer, Summer skincare campaign..."
          className="min-h-[80px] resize-none rounded-xl text-sm leading-relaxed focus-visible:ring-primary/30"
          disabled={modalState === "generating"}
          autoFocus
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PROMPT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => appendChip(chip)}
            disabled={modalState === "generating"}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30 transition-colors disabled:opacity-40"
          >
            <Sparkles className="size-2.5 mr-1" />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderControls = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground">
            Aspect Ratio
          </label>
          <div className="flex gap-1">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                disabled={modalState === "generating"}
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

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground">
            Variations
          </label>
          <div className="flex gap-1">
            {IMAGE_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumberOfImages(n)}
                disabled={modalState === "generating"}
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
      </div>
    </div>
  );

  const renderGenerateButton = () => {
    const isGenerating = modalState === "generating";
    return (
      <Button
        type="button"
        size="lg"
        className="w-full h-11 font-semibold rounded-xl shadow-sm gap-2"
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="size-4" />
            Generate
          </>
        )}
      </Button>
    );
  };

  const renderGeneratingState = () => (
    <div className="flex flex-col items-center justify-center py-10 space-y-4">
      <div className="size-16 rounded-2xl bg-primary/5 flex items-center justify-center">
        <RefreshCw className="size-7 text-primary animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Creating variations</p>
        <p className="text-xs text-muted-foreground">
          Applying {template.title} style with your prompt...
        </p>
      </div>
      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
      </div>
    </div>
  );

  const renderResultsGrid = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">
          {generatedUrls.length} Variations
        </p>
        <button
          type="button"
          onClick={() => setShowComparison(!showComparison)}
          className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
            showComparison
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {showComparison ? (
            <>
              <Grid3X3 className="size-3" /> Grid
            </>
          ) : (
            <>
              <Columns2 className="size-3" /> Compare
            </>
          )}
        </button>
      </div>

      {showComparison && selectedVariation !== null ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground text-center">
              Original Template
            </p>
            <div className="rounded-xl overflow-hidden border border-border/50 bg-muted">
              <div className="aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={template.s3_link}
                  alt="Original template"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-primary text-center">
              Your Variation
            </p>
            <div className="rounded-xl overflow-hidden border-2 border-primary shadow-sm">
              <div className="aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedUrls[selectedVariation]}
                  alt={`Variation ${selectedVariation + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {generatedUrls.map((url, i) => {
            const isSelected = selectedVariation === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedVariation(i)}
                className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-primary ring-1 ring-primary shadow-md"
                    : "border-border/50 hover:border-muted-foreground/30"
                }`}
              >
                <div className="aspect-[4/5] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Variation ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 size-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
                    <Check className="size-3.5 text-primary-foreground" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-medium text-white">
                    Variation {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(url, i);
                    }}
                    className="size-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                    title="Download"
                  >
                    <Download className="size-3 text-black" />
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-9 rounded-xl text-xs gap-1.5 border-border/50"
          onClick={handleRetry}
        >
          <RefreshCw className="size-3" />
          Regenerate
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 h-9 rounded-xl text-xs gap-1.5 font-semibold shadow-sm"
          onClick={handleContinueToWorkspace}
        >
          Continue to Workspace
          <ArrowRight className="size-3" />
        </Button>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-3">
      <div className="size-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Generation failed</p>
        <p className="text-xs text-muted-foreground max-w-xs">{errorMessage}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl text-xs gap-1.5"
        onClick={handleRetry}
      >
        <RefreshCw className="size-3" />
        Try Again
      </Button>
    </div>
  );

  const renderRightPanelContent = () => {
    if (modalState === "generating") {
      return (
        <>
          {renderPromptSection()}
          <div className="flex-1 flex items-center justify-center">
            {renderGeneratingState()}
          </div>
        </>
      );
    }

    return (
      <>
        {renderPromptSection()}
        {renderControls()}
        {modalState === "idle" && renderGenerateButton()}
        {modalState === "error" && (
          <>
            {renderErrorState()}
            {prompt.trim() && renderGenerateButton()}
          </>
        )}
        {modalState === "results" && renderResultsGrid()}
      </>
    );
  };

  // ── Main Render ────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {renderLeftPanel()}

        <div className="md:w-[58%] flex flex-col min-h-0">
          <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Wand2 className="size-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                Quick Create
              </span>
            </div>
            <div className="flex items-center gap-1">
              {userId && template.user_id === userId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                  onClick={(e) => onDelete(e, template)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 rounded-full"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {renderRightPanelContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
