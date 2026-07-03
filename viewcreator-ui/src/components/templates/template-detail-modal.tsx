import React, { useState, useEffect, useRef } from "react";
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
  Info,
  Palette,
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

const ASPECT_RATIOS = [
  { value: "1:1", label: "Post" },
  { value: "4:5", label: "Portrait" },
  { value: "9:16", label: "Story" },
  { value: "16:9", label: "Landscape" },
] as const;
const IMAGE_COUNTS = [
  { value: 2, label: "2 ideas" },
  { value: 4, label: "4 ideas" },
] as const;

const GENERATION_STEPS = [
  "Understanding template style...",
  "Preserving layout & typography...",
  "Generating adaptive concepts...",
  "Optimizing for your format...",
];

const VARIATION_LABELS = ["Premium", "Minimal", "Bold", "Luxury"];

const PROMPT_CHIPS = [
  { label: "Discount Offer", append: "limited-time discount offer, sale banner, promotional pricing" },
  { label: "Luxury Brand", append: "premium luxury aesthetic, elegant and sophisticated" },
  { label: "Minimal Style", append: "minimalist clean design, simple and uncluttered" },
  { label: "Modern Design", append: "modern contemporary sleek visual style" },
  { label: "Dark Theme", append: "dark moody dramatic atmosphere" },
  { label: "Social Ready", append: "optimized for Instagram social media post, engaging" },
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
  const [generationStep, setGenerationStep] = useState(0);
  const generationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (modalState !== "generating") {
      const raf = requestAnimationFrame(() => setGenerationStep(0));
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      return () => cancelAnimationFrame(raf);
    }
    const raf = requestAnimationFrame(() => setGenerationStep(1));
    let step = 1;
    generationTimerRef.current = setInterval(() => {
      step++;
      if (step <= GENERATION_STEPS.length) {
        requestAnimationFrame(() => setGenerationStep(step));
      } else {
        if (generationTimerRef.current) clearInterval(generationTimerRef.current);
      }
    }, 1800);
    return () => {
      cancelAnimationFrame(raf);
      if (generationTimerRef.current) clearInterval(generationTimerRef.current);
    };
  }, [modalState]);

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

        <h2 className="text-lg font-bold mb-3">{template.title}</h2>

        {/* Works well for */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Works well for
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {["Restaurants", "Product launches", "Seasonal offers", "Ecommerce", "Promotions", "Social media"].map((use) => (
              <span key={use} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-green-400 shrink-0" />
                {use}
              </span>
            ))}
          </div>
        </div>

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

  const renderPreservedInfo = () => (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-base">{template.media_type === "video" ? "🎬" : "🎨"}</span>
        <p className="text-xs font-semibold text-foreground">
          You&apos;re creating from: <span className="text-primary">{template.title}</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div>
          <p className="font-medium text-emerald-600 mb-1 flex items-center gap-1">
            <Info className="size-3" /> The AI will preserve
          </p>
          <p className="text-muted-foreground pl-4">✓ Layout</p>
          <p className="text-muted-foreground pl-4">✓ Typography style</p>
          <p className="text-muted-foreground pl-4">✓ Overall aesthetic</p>
        </div>
        <div>
          <p className="font-medium text-primary mb-1 flex items-center gap-1">
            <Palette className="size-3" /> The AI will customize
          </p>
          <p className="text-muted-foreground pl-4">✓ Product / content</p>
          <p className="text-muted-foreground pl-4">✓ Text & copy</p>
          <p className="text-muted-foreground pl-4">✓ Colors & branding</p>
        </div>
      </div>
    </div>
  );

  const renderPromptSection = () => (
    <div className="space-y-3">
      {modalState === "idle" && renderPreservedInfo()}

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
          placeholder={`Promote our new craft IPA beer with a\nlimited-time 20% discount.\nTarget young professionals.\nKeep the premium vibe.`}
          className="min-h-[100px] resize-none rounded-xl text-sm leading-relaxed focus-visible:ring-primary/30 placeholder:text-muted-foreground/60"
          disabled={modalState === "generating"}
          autoFocus
        />
        <p className="text-[10px] text-muted-foreground">
          <span className="font-medium">⌘↵</span> to generate
        </p>
      </div>

      {/* AI Suggestion Chips */}
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

      {/* Example prompts below */}
      {modalState === "idle" && template.config?.recommendedPrompts && template.config.recommendedPrompts.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="size-3" /> Example prompts
          </p>
          <div className="flex flex-col gap-1">
            {template.config.recommendedPrompts.slice(0, 3).map((rp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(rp)}
                className="text-[11px] text-left text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded-lg px-2.5 py-1.5 transition-colors"
              >
                &ldquo;{rp}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderControls = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground">
            Format
          </label>
          <div className="flex gap-1">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setAspectRatio(r.value)}
                disabled={modalState === "generating"}
                className={`flex-1 h-7 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                  aspectRatio === r.value
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
                title={r.value}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground">
            Generate
          </label>
          <div className="flex gap-1">
            {IMAGE_COUNTS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setNumberOfImages(c.value)}
                disabled={modalState === "generating"}
                className={`flex-1 h-7 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                  numberOfImages === c.value
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {c.label}
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
            Generate Concepts
          </>
        )}
      </Button>
    );
  };

  const renderGeneratingState = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-5">
      <div className="size-16 rounded-2xl bg-primary/5 flex items-center justify-center">
        <RefreshCw className="size-7 text-primary animate-spin" />
      </div>
      <div className="space-y-2 w-full max-w-xs">
        {GENERATION_STEPS.map((step, i) => {
          const isComplete = generationStep > i + 1;
          const isActive = generationStep === i + 1;
          return (
            <div key={i} className="flex items-center gap-2.5">
              <div
                className={`size-4 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  isComplete
                    ? "bg-emerald-500"
                    : isActive
                    ? "bg-primary animate-pulse"
                    : "bg-muted"
                }`}
              >
                {isComplete ? (
                  <Check className="size-2.5 text-white" />
                ) : (
                  <span
                    className={`text-[8px] font-bold ${
                      isActive ? "text-white" : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                className={`text-xs transition-colors duration-300 ${
                  isComplete
                    ? "text-emerald-600 font-medium"
                    : isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderResultsGrid = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">
          {generatedUrls.length} concepts generated
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
                    {VARIATION_LABELS[i] || `#${i + 1}`}
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

      <div className="space-y-2 pt-1">
        <p className="text-[10px] font-semibold text-muted-foreground">
          What next?
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 h-9 rounded-xl text-xs gap-1.5 border-border/50"
            onClick={() => {
              const idx = selectedVariation ?? 0;
              handleDownload(generatedUrls[idx], idx);
            }}
          >
            <Download className="size-3" />
            Download
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-[2] h-9 rounded-xl text-xs gap-1.5 font-semibold shadow-sm"
            onClick={handleContinueToWorkspace}
          >
            Continue to Workspace
            <ArrowRight className="size-3" />
          </Button>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <RefreshCw className="size-3 inline mr-1" />
          Try again with different settings
        </button>
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
