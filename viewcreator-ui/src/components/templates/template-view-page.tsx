"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Wand2,
  RefreshCw,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Template, TemplateAnalysis } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getTemplate, deleteTemplate, getTemplates } from "@/services/api/template-service";
import { analyzeTemplate } from "@/services/api/analysis-service";
import { generateImages } from "@/services/api/generation-service";
import { useAppDispatch } from "@/store";
import { setImageEditorState, addGenerationToHistory } from "@/store/slices/image-editor-slice";
import type { GenerationHistoryItem } from "@/types";
import { safeToken, cycleIndex } from "@/lib/helpers";

// ─── Constants ─────────────────────────────────────────────────────────────

const ASPECT_RATIOS = [
  { value: "1:1", label: "Post" },
  { value: "4:5", label: "Portrait" },
  { value: "9:16", label: "Story" },
  { value: "16:9", label: "Landscape" },
] as const;

const GENERATION_STEPS = [
  "Understanding template style...",
  "Preserving layout & typography...",
  "Generating adaptive concepts...",
  "Optimizing for your format...",
];

// ─── Props ────────────────────────────────────────────────────────────────

interface TemplateViewPageProps {
  templateId: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function TemplateViewPage({ templateId }: TemplateViewPageProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { getToken, userId } = useAuth();
  const { isSignedIn } = useUser();
  const { openSignUp } = useClerk();

  // ── Data state ──────────────────────────────────────────
  const [template, setTemplate] = useState<Template | null>(null);
  const [relatedTemplates, setRelatedTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Analysis state ──────────────────────────────────────
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // ── Carousel state ───────────────────────────────────────
  const [carouselIndex, setCarouselIndex] = useState(0);

  // ── Generation state ────────────────────────────────────
  const [prompt, setPrompt] = useState("");
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [modalState, setModalState] = useState<"idle" | "generating" | "results" | "error">("idle");
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [generatedS3Urls, setGeneratedS3Urls] = useState<string[]>([]);
  const [generationCreationId, setGenerationCreationId] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const generationTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch template ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const token = await safeToken(getToken);
        const [tmpl, allTemplates] = await Promise.all([
          getTemplate(templateId, token),
          getTemplates(token),
        ]);
        if (cancelled) return;
        setTemplate(tmpl);
        if (tmpl.config?.aspectRatio) setAspectRatio(tmpl.config.aspectRatio);

        // Find related templates sharing any tag with the current template
        const tmplTags = tmpl.config?.tags || (tmpl.config?.category ? [tmpl.config.category] : []);
        const related = allTemplates.filter((t) => {
          if (t.id === tmpl.id) return false;
          const tTags = t.config?.tags || (t.config?.category ? [t.config.category] : []);
          return tmplTags.some((tag) => tTags.includes(tag));
        });
        setRelatedTemplates(related.slice(0, 3));
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load template");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [templateId, getToken]);

  // ── Set initial prompt from recommended or generate default ──
  useEffect(() => {
    if (!template) return;
    // Use recommended prompts if available
    if (template.config?.recommendedPrompts?.length) {
      setPrompt(template.config.recommendedPrompts[0]);
      return;
    }
    // Generate a sensible default based on the template
    const defaultPrompt = `Create a ${template.title.toLowerCase()} inspired visual. Maintain the layout structure, typography style, and overall aesthetic. Adapt the content for my brand.`;
    setPrompt(defaultPrompt);
  }, [template]);

  // ── Fetch AI analysis ────────────────────────────────────
  useEffect(() => {
    if (!template) return;
    if (template.config?.aiAnalysis) {
      setAnalysis(template.config.aiAnalysis);
      setAnalysisLoading(false);
      return;
    }

    let cancelled = false;
    setAnalysisLoading(true);
    (async () => {
      try {
        const token = await safeToken(getToken);
        const result = await analyzeTemplate(template.id, token);
        if (!cancelled) {
          setAnalysis(result.analysis);
          setAnalysisLoading(false);
        }
      } catch {
        if (!cancelled) setAnalysisLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [template, getToken]);

  // ── Generation step timer ────────────────────────────────
  useEffect(() => {
    if (modalState !== "generating") {
      setGenerationStep(0);
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      return;
    }
    setGenerationStep(1);
    let step = 1;
    generationTimerRef.current = setInterval(() => {
      step++;
      if (step <= GENERATION_STEPS.length) {
        setGenerationStep(step);
      } else if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
      }
    }, 1800);
    return () => {
      if (generationTimerRef.current) clearInterval(generationTimerRef.current);
    };
  }, [modalState]);

  // ── Carousel assets (own template images + related fallback) ──
  const carouselAssets = useMemo(() => {
    if (!template) return [];
    const assets: { src: string; alt: string; isVideo: boolean }[] = [];

    if (template.media_type === "video") {
      assets.push({ src: template.s3_link, alt: template.title, isVideo: true });
    } else {
      // Own images from config.asset_urls + s3_link
      const ownUrls = [template.s3_link, ...(template.config?.asset_urls || [])];
      ownUrls.forEach((url) => {
        assets.push({ src: url, alt: template.title, isVideo: false });
      });

      // Fall back to related templates if we have fewer than 2 own images
      if (assets.length < 2) {
        relatedTemplates.forEach((t) => {
          if (t.media_type !== "video") {
            assets.push({ src: t.s3_link, alt: t.title, isVideo: false });
          }
        });
      }
    }

    return assets;
  }, [template, relatedTemplates]);

  // ── Handlers ─────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!template) return;
    try {
      const token = await safeToken(getToken);
      await deleteTemplate(template.id, token);
      toast.success("Template deleted");
      router.push("/templates");
    } catch {
      toast.error("Failed to delete template");
    }
  }, [template, getToken, router]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !template) return;

    // ── Guest Gate ─────────────────────────────────────────
    if (!isSignedIn) {
      openSignUp();
      return;
    }

    setModalState("generating");
    setErrorMessage(null);
    setGeneratedUrls([]);
    setSelectedVariation(null);

    try {
      const token = await safeToken(getToken);
      const style = template.config?.stylePreset || "None";
      const result = await generateImages(
        {
          prompt: prompt.trim(),
          style,
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

      const urls = result.imageUrls || [];
      if (urls.length === 0) {
        setErrorMessage("No images were generated. Try a different prompt.");
        setModalState("error");
      } else {
        setGeneratedUrls(urls);
        setGeneratedS3Urls(result.s3Urls || []);
        setGenerationCreationId(result.creationId || null);
        setModalState("results");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed.";
      setErrorMessage(msg);
      setModalState("error");
    }
  };

  const handleContinueToWorkspace = () => {
    const idx = selectedVariation ?? 0;
    if (!template) return;
    const historyItem: GenerationHistoryItem = {
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      prompt: prompt.trim(),
      style: template.config?.stylePreset || "None",
      aspectRatio,
      numberOfImages: generatedUrls.length,
      imageSize: "1K",
      thinkingLevel: "minimal",
      quality: "Standard",
      mediaType: "image",
      imageUrls: generatedUrls,
      templateId: template.id,
      s3Urls: generatedS3Urls,
      creationId: generationCreationId || undefined,
    };
    dispatch(addGenerationToHistory(historyItem));
    dispatch(
      setImageEditorState({
        imageUrls: generatedUrls,
        selectedIndex: idx,
        basePrompt: prompt.trim(),
        style: template.config?.stylePreset || "None",
        aspectRatio,
        previewUrl: generatedUrls[idx],
        activeHistoryItemId: historyItem.id,
      })
    );
    router.push("/generate/edit");
  };

  const handleRetry = () => setModalState("idle");

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `viewcreator-${template?.title?.replace(/\s+/g, "-").toLowerCase() || "image"}-v${index + 1}.png`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Loading / Error states ───────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="size-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">Failed to load template</p>
          <p className="text-xs text-muted-foreground">{error || "Template not found"}</p>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => router.push("/templates")}>
            ← Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  const tags = template.config?.tags?.length
    ? template.config.tags
    : [template.config?.category || "Uncategorized"];

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ════════════ Sticky Header ════════════ */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50 shrink-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shrink-0"
              onClick={() => router.push("/templates")}
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-semibold truncate">{template.title}</h1>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {userId && template.user_id === userId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════════════ Main Content ════════════ */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-4 min-h-0">
        <div className="flex gap-6 lg:gap-8 h-full min-h-0">
          {/* ── Left Panel: Reference Images + Prompt ── */}
          <div className="w-[55%] flex flex-col gap-4 min-h-0">
            {/* Carousel — fills available height, Instagram-style */}
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-black/5 border border-border/50 shadow-sm group">
              {/* Click-to-navigate zones (only for multi-asset carousels) */}
              {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
                <div className="absolute inset-0 flex z-10">
                  <button
                    type="button"
                    onClick={() =>
                      setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, -1))
                    }
                    className="w-1/2 h-full cursor-pointer"
                    aria-label="Previous image"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, 1))
                    }
                    className="w-1/2 h-full cursor-pointer"
                    aria-label="Next image"
                  />
                </div>
              )}

              {/* Asset display */}
              {carouselAssets.length > 0 ? (
                <>
                  {carouselAssets[carouselIndex].isVideo ? (
                    <video
                      src={carouselAssets[carouselIndex].src}
                      className="absolute inset-0 w-full h-full object-contain p-4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={carouselAssets[carouselIndex].src}
                      alt={carouselAssets[carouselIndex].alt}
                      className="absolute inset-0 w-full h-full object-contain p-4"
                    />
                  )}

                  {/* Prev arrow */}
                  {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
                    <button
                      type="button"
                      onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, -1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background transition-all opacity-0 group-hover:opacity-100 group-hover:scale-105 z-20"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  )}

                  {/* Next arrow */}
                  {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
                    <button
                      type="button"
                      onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background transition-all opacity-0 group-hover:opacity-100 group-hover:scale-105 z-20"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  )}

                  {/* Badge */}
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/70 backdrop-blur-sm text-[11px] font-medium text-foreground shadow-xs z-20">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {carouselAssets[carouselIndex].isVideo ? "Video" : `${carouselIndex + 1}/${carouselAssets.length}`}
                  </div>

                  {/* Dots */}
                  {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                      {carouselAssets.map((asset, i) => (
                        !asset.isVideo && (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCarouselIndex(i)}
                            className={`rounded-full transition-all duration-300 ${
                              i === carouselIndex
                                ? "bg-foreground size-2"
                                : "bg-foreground/30 size-1.5 hover:bg-foreground/50"
                            }`}
                          />
                        )
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No assets</p>
                </div>
              )}
            </div>

            {/* ── AI Prompt Section ── */}
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  Suggested Content Direction
                  {analysisLoading && (
                    <span className="size-2 rounded-full bg-muted-foreground/30 animate-pulse" />
                  )}
                </p>
                <div className="flex items-center gap-1">
                  {isEditingPrompt ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrompt(false)}
                      className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrompt(true)}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {isEditingPrompt ? (
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[80px] resize-none rounded-xl text-sm leading-relaxed focus-visible:ring-primary/30"
                  autoFocus
                  onBlur={() => setIsEditingPrompt(false)}
                />
              ) : (
                <div
                  onClick={() => prompt && setIsEditingPrompt(true)}
                  className={`cursor-pointer transition-colors ${
                    prompt ? "hover:bg-muted/50 -mx-2 px-2 py-1 rounded-lg" : ""
                  }`}
                >
                  {analysisLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-full" />
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                    </div>
                  ) : prompt ? (
                    <p className="text-sm text-foreground/90 leading-relaxed selection:bg-primary/20">
                      {prompt}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No prompt available. Click to add one.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: Generate Controls ── */}
          <div className="w-[45%]">
            <div className="sticky top-20 space-y-5">
              {/* Template info */}
              <div className="space-y-2">
                <h2 className="text-lg font-bold">{template.title}</h2>
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* Generation section */}
              <div className="space-y-4">
                {/* Generation state */}
                {modalState === "generating" && (
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center">
                        <RefreshCw className="size-5 text-primary animate-spin" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Generating concepts...</p>
                        <p className="text-xs text-muted-foreground">
                          {numberOfImages} {numberOfImages === 1 ? "image" : "images"} • {ASPECT_RATIOS.find((r) => r.value === aspectRatio)?.label || aspectRatio}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
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
                                <span className={`text-[8px] font-bold ${isActive ? "text-white" : "text-muted-foreground"}`}>
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
                )}

                {/* Error state */}
                {modalState === "error" && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 text-destructive shrink-0" />
                      <p className="text-xs font-medium text-foreground">Generation failed</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{errorMessage || "Something went wrong."}</p>
                    <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={handleRetry}>
                      <RefreshCw className="size-3 mr-1" />
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Results */}
                {modalState === "results" && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground">
                      {generatedUrls.length} {generatedUrls.length === 1 ? "concept" : "concepts"} generated
                    </p>
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
                            <div className="aspect-[4/5] bg-muted relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Variation ${i + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 size-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
                                <Check className="size-3.5 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 rounded-xl text-xs gap-1.5 border-border/50"
                        onClick={() => {
                          const idx = selectedVariation ?? 0;
                          handleDownload(generatedUrls[idx], idx);
                        }}
                      >
                        Download
                      </Button>
                      <Button
                        size="sm"
                        className="flex-[2] h-9 rounded-xl text-xs gap-1.5 font-semibold shadow-sm"
                        onClick={handleContinueToWorkspace}
                      >
                        Continue to Workspace
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
                )}

                {/* Idle state — show controls */}
                {modalState === "idle" && (
                  <>
                    {/* Number of images */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Number of images
                      </p>
                      <div className="flex gap-1.5">
                        {[2, 4].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setNumberOfImages(n)}
                            className={`flex-1 h-9 rounded-xl text-xs font-medium transition-all duration-200 ${
                              numberOfImages === n
                                ? "bg-foreground text-background shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            }`}
                          >
                            {n} {n === 1 ? "image" : "images"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect ratio */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Aspect ratio
                      </p>
                      <div className="flex gap-1.5">
                        {ASPECT_RATIOS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setAspectRatio(r.value)}
                            className={`flex-1 h-9 rounded-xl text-xs font-medium transition-all duration-200 ${
                              aspectRatio === r.value
                                ? "bg-foreground text-background shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Generate button */}
                    <Button
                      type="button"
                      size="lg"
                      className="w-full h-12 font-semibold rounded-xl shadow-sm gap-2 mt-2"
                      onClick={handleGenerate}
                      disabled={!prompt.trim()}
                    >
                      <Wand2 className="size-4" />
                      Generate Content
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ════════════ Footer ════════════ */}
      <footer className="border-t border-border/50 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Wand2 className="size-3.5 text-primary" />
              <span className="text-xs font-semibold">ViewCreator</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} ViewCreator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
