"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Wand2,
  RefreshCw,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Template, TemplateAnalysis, GenerationHistoryItem } from "@/types";
import type { GenerateImagesResponse, GenerateParams } from "@/types";
import { Button } from "@/components/ui/button";
import { generateImages } from "@/services/api/generation-service";
import { useAppDispatch } from "@/store";
import { setImageEditorState, addGenerationToHistory } from "@/store/slices/image-editor-slice";
import { safeToken } from "@/lib/helpers";
import { useAuth } from "@clerk/nextjs";

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

interface TemplateGenerationPanelProps {
  template: Template;
  isSignedIn: boolean;
  onSignUp: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function TemplateGenerationPanel({
  template,
  isSignedIn,
  onSignUp,
}: TemplateGenerationPanelProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();

  // ── Shared form state ───────────────────────────────────
  const [prompt, setPrompt] = useState(
    template.config?.recommendedPrompts?.[0]
    ?? `Create a ${template.title.toLowerCase()} inspired visual. Maintain the layout structure, typography style, and overall aesthetic. Adapt the content for my brand.`
  );
  const [aspectRatio, setAspectRatio] = useState(template.config?.aspectRatio ?? "1:1");
  const [numberOfImages, setNumberOfImages] = useState(4);

  // ── Generation modal state ──────────────────────────────
  const [modalState, setModalState] = useState<"idle" | "generating" | "results" | "error">("idle");
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [generatedS3Urls, setGeneratedS3Urls] = useState<string[]>([]);
  const [generationCreationId, setGenerationCreationId] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const generationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── Handlers ─────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    if (!isSignedIn) {
      onSignUp();
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

  const tags = template.config?.tags?.length
    ? template.config.tags
    : [template.config?.category || "Uncategorized"];

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-5">
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
                  {numberOfImages} {numberOfImages === 1 ? "image" : "images"} &bull;{" "}
                  {ASPECT_RATIOS.find((r) => r.value === aspectRatio)?.label || aspectRatio}
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
  );
}
