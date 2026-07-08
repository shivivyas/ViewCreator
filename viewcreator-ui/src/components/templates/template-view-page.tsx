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
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Template, TemplateAnalysis } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getTemplate, deleteTemplate, getTemplates } from "@/services/api/template-service";
import { analyzeTemplate } from "@/services/api/analysis-service";
import { useAppDispatch } from "@/store";
import { safeToken, cycleIndex } from "@/lib/helpers";
import { TemplateGenerationPanel } from "./template-generation-panel";

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

  // ── AI prompt state (shared with generation panel) ──────
  const [prompt, setPrompt] = useState("");
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

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
    if (template.config?.recommendedPrompts?.length) {
      setPrompt(template.config.recommendedPrompts[0]);
      return;
    }
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

  // ── Carousel assets (own template images + related fallback) ──
  const carouselAssets = useMemo(() => {
    if (!template) return [];
    const assets: { src: string; alt: string; isVideo: boolean }[] = [];

    if (template.media_type === "video") {
      assets.push({ src: template.s3_link, alt: template.title, isVideo: true });
    } else {
      const ownUrls = [template.s3_link, ...(template.config?.asset_urls || [])];
      ownUrls.forEach((url) => {
        assets.push({ src: url, alt: template.title, isVideo: false });
      });

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
            {/* Carousel */}
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-black/5 border border-border/50 shadow-sm group">
              {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
                <div className="absolute inset-0 flex z-10">
                  <button
                    type="button"
                    onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, -1))}
                    className="w-1/2 h-full cursor-pointer"
                    aria-label="Previous image"
                  />
                  <button
                    type="button"
                    onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, 1))}
                    className="w-1/2 h-full cursor-pointer"
                    aria-label="Next image"
                  />
                </div>
              )}

              {carouselAssets.length > 0 ? (
                <>
                  {carouselAssets[carouselIndex].isVideo ? (
                    <video
                      src={carouselAssets[carouselIndex].src}
                      className="absolute inset-0 w-full h-full object-contain p-4"
                      autoPlay muted loop playsInline controls
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={carouselAssets[carouselIndex].src}
                      alt={carouselAssets[carouselIndex].alt}
                      className="absolute inset-0 w-full h-full object-contain p-4"
                    />
                  )}

                  {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, -1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background transition-all opacity-0 group-hover:opacity-100 group-hover:scale-105 z-20"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background transition-all opacity-0 group-hover:opacity-100 group-hover:scale-105 z-20"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </>
                  )}

                  <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/70 backdrop-blur-sm text-[11px] font-medium text-foreground shadow-xs z-20">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {carouselAssets[carouselIndex].isVideo ? "Video" : `${carouselIndex + 1}/${carouselAssets.length}`}
                  </div>

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

          {/* ── Right Panel: Generation Controls ── */}
          <div className="w-[45%]">
            <div className="sticky top-20">
              <TemplateGenerationPanel
                template={template}
                isSignedIn={!!isSignedIn}
                onSignUp={openSignUp}
              />
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
              &copy; {new Date().getFullYear()} ViewCreator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
