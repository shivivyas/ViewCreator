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
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);

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

  // ── Reset natural aspect ratio when carousel index changes ──
  useEffect(() => {
    setNaturalAspectRatio(null);
  }, [carouselIndex]);

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
    <div className="flex-1 bg-black overflow-hidden relative">
      {/* ════════════ Side-by-side: image | panel ════════════ */}
      <div className="flex h-full">
        {/* ── Left: Image area ── */}
        <div className="flex-1 relative min-w-0 group">
          {/* Image backdrop */}
          <div className="absolute inset-0 flex items-center justify-center">
            {carouselAssets.length > 0 ? (
              <>
                {carouselAssets[carouselIndex].isVideo ? (
                  <video
                    src={carouselAssets[carouselIndex].src}
                    className="w-full h-full object-contain"
                    autoPlay muted loop playsInline controls
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={carouselAssets[carouselIndex].src}
                    alt={carouselAssets[carouselIndex].alt}
                    className="w-full h-full object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const ratio = img.naturalHeight / img.naturalWidth;
                      setNaturalAspectRatio(ratio);
                    }}
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No assets</p>
              </div>
            )}
          </div>

          {/* ── Floating controls (over image only) ── */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Carousel hit zones */}
            {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
              <>
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, -1))}
                  className="absolute left-0 top-0 w-1/3 h-full cursor-pointer z-10 pointer-events-auto"
                  aria-label="Previous image"
                />
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, 1))}
                  className="absolute right-0 top-0 w-1/3 h-full cursor-pointer z-10 pointer-events-auto"
                  aria-label="Next image"
                />
              </>
            )}

            {/* Carousel arrow buttons (visible on hover) */}
            {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
              <>
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, -1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-black/60 transition-all z-20 text-white opacity-0 group-hover:opacity-100 pointer-events-auto"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => cycleIndex(prev, carouselAssets.length, 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-black/60 transition-all z-20 text-white opacity-0 group-hover:opacity-100 pointer-events-auto"
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            )}

            {/* Carousel counter & dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20 pointer-events-auto">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-[11px] font-medium text-white/80 shadow-xs">
                <span className="size-1.5 rounded-full bg-white" />
                {carouselAssets[carouselIndex]?.isVideo ? "Video" : `${carouselIndex + 1}/${carouselAssets.length}`}
              </div>
              {carouselAssets.length > 1 && !carouselAssets[carouselIndex]?.isVideo && (
                <div className="flex items-center gap-1.5">
                  {carouselAssets.map((asset, i) => (
                    !asset.isVideo && (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCarouselIndex(i)}
                        className={`rounded-full transition-all duration-300 ${
                          i === carouselIndex
                            ? "bg-white size-2"
                            : "bg-white/40 size-1.5 hover:bg-white/60"
                        }`}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="w-80 shrink-0 border-l border-white/10 overflow-y-auto bg-black/80 flex flex-col"
          style={{
            '--foreground': 'oklch(0.985 0 0)',
            '--card': 'oklch(0.205 0 0)',
            '--card-foreground': 'oklch(0.985 0 0)',
            '--muted': 'oklch(0.269 0 0)',
            '--muted-foreground': 'oklch(0.708 0 0)',
            '--border': 'oklch(1 0 0 / 10%)',
            '--primary': 'oklch(0.922 0 0)',
            '--primary-foreground': 'oklch(0.205 0 0)',
            '--accent': 'oklch(0.269 0 0)',
            '--accent-foreground': 'oklch(0.985 0 0)',
            '--destructive': 'oklch(0.704 0.191 22.216)',
            '--background': 'oklch(0.145 0 0)',
          } as React.CSSProperties}
        >
          {/* ── Sidebar header: back + title + actions ── */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push("/templates")}
              className="size-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white/70 hover:text-white shrink-0"
            >
              <ArrowLeft className="size-3.5" />
            </button>
            <h1 className="text-sm font-semibold text-white truncate flex-1">{template.title}</h1>
            {userId && template.user_id === userId && (
              <button
                type="button"
                onClick={handleDelete}
                className="size-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-400/20 transition-all text-white/50 hover:text-red-400 shrink-0"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          {/* ── Prompt section ── */}
          <div className="px-4 pb-3 shrink-0">
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  Content Direction
                  {analysisLoading && (
                    <span className="size-2 rounded-full bg-white/20 animate-pulse" />
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                  className="text-[10px] font-medium text-white/40 hover:text-white/70 transition-colors"
                >
                  {isEditingPrompt ? "Done" : "Edit"}
                </button>
              </div>

              {isEditingPrompt ? (
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[72px] resize-none rounded-xl text-sm leading-relaxed bg-black/20 border-white/[0.06] text-white/80 placeholder:text-white/20 focus-visible:ring-white/10"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => prompt && setIsEditingPrompt(true)}
                  className="cursor-pointer"
                >
                  {analysisLoading ? (
                    <div className="space-y-2">
                      <div className="h-3 bg-white/[0.06] rounded animate-pulse w-full" />
                      <div className="h-3 bg-white/[0.06] rounded animate-pulse w-3/4" />
                    </div>
                  ) : prompt ? (
                    <p className="text-xs text-white/60 leading-relaxed line-clamp-3">
                      {prompt}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 italic">
                      No prompt available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-white/[0.06] mx-4" />

          {/* ── Generation panel ── */}
          <div className="flex-1 px-4 py-3 overflow-y-auto">
            <TemplateGenerationPanel
              template={template}
              isSignedIn={!!isSignedIn}
              onSignUp={openSignUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
