"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  UploadCloud,
  X,
  Loader2,
  Wand2,
  Search,
  ThumbsUp,
  Heart,
  Trash2,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getTemplates, deleteTemplate, voteTemplate, saveTemplate, getCategories } from "@/services/api/template-service";
import type { Template } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch } from "@/store";
import { setImageEditorState } from "@/store/slices/image-editor-slice";
import { safeToken, cycleIndex } from "@/lib/helpers";
import { UploadTemplateModal } from "@/components/templates/upload-template-modal";

// ─── Constants ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "recent", label: "Newest" },
  { value: "popular", label: "Most Upvoted" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

// ─── Template Card ─────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template;
  index: number;
  userId: string | null | undefined;
  onUse: (id: string) => void;
  onVote: (e: React.MouseEvent, id: string) => void;
  onDelete: (e: React.MouseEvent, t: Template) => void;
  onSave: (e: React.MouseEvent, id: string) => void;
}

const TemplateCard = React.memo(function TemplateCard({
  template,
  index,
  userId,
  onUse,
  onVote,
  onDelete,
  onSave,
}: TemplateCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardImageIdx, setCardImageIdx] = useState(0);

  // Collect all image URLs for carousel templates
  const allImages = useMemo(() => {
    if (template.media_type === "video") return [];
    return [template.s3_link, ...(template.config?.asset_urls || [])];
  }, [template]);

  const hasCarousel = allImages.length > 1;

  useEffect(() => {
    const el = cardRef.current;
    const vid = videoRef.current;
    if (!el || !vid || template.media_type !== "video") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) vid.play().catch(() => {});
        else vid.pause();
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [template.media_type]);

  const isFirstVisible = index < 4;

  const goToPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCardImageIdx((p) => cycleIndex(p, allImages.length, -1));
  }, [allImages.length]);

  const goToNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCardImageIdx((p) => cycleIndex(p, allImages.length, 1));
  }, [allImages.length]);

  return (
    <div
      ref={cardRef}
      className="group relative cursor-pointer rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
      onClick={(e) => {
        // Don't navigate when clicking buttons inside the card (arrows, dots, save, delete, use template)
        if ((e.target as HTMLElement).closest('button')) return;
        router.push(`/templates/${template.id}`);
      }}
    >
      {/* Image / Carousel area */}
      <div className="relative aspect-[4/5] bg-muted overflow-hidden">
        {template.media_type === "video" ? (
          <video
            ref={videoRef}
            src={template.s3_link}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            loop
            playsInline
            preload={isFirstVisible ? "auto" : "none"}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={allImages[cardImageIdx]}
            alt={template.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading={isFirstVisible ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={isFirstVisible ? "high" : undefined}
          />
        )}

        {/* Carousel arrows (always visible, small) */}
        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              className="absolute left-1 top-1/2 -translate-y-1/2 size-6 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center shadow-xs hover:bg-background/90 transition-all z-30"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-1 top-1/2 -translate-y-1/2 size-6 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center shadow-xs hover:bg-background/90 transition-all z-30"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </>
        )}

        {/* Top-right actions (visible on hover) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 flex gap-1.5 z-20">
          {userId && template.user_id === userId && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-md hover:bg-background shadow-xs"
              onClick={(e) => onDelete(e, template)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Video badge */}
        {template.media_type === "video" && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-background/80 backdrop-blur-md text-foreground">
              Video
            </span>
          </div>
        )}

        {/* Carousel dots (bottom of image area) */}
        {hasCarousel && (
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 pb-2 z-30">
            {allImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCardImageIdx(i); }}
                className={`rounded-full transition-all duration-200 ${
                  i === cardImageIdx
                    ? "bg-white size-1.5"
                    : "bg-white/40 size-1 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}

        {/* Bottom overlay — always visible */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 pt-12">
          <h3 className="text-sm font-semibold text-white line-clamp-1 drop-shadow-sm">
            {template.title}
          </h3>
          {template.description && (
            <p className="text-xs text-white/70 line-clamp-1 mt-0.5 drop-shadow-sm">
              {template.description}
            </p>
          )}
        </div>

        {/* Use button — appears on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/30 z-20 pointer-events-none group-hover:pointer-events-auto">
          <Button
            variant="secondary"
            size="sm"
            className="shadow-lg backdrop-blur-md bg-white/90 text-black hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              onUse(template.id);
            }}
          >
            <Wand2 className="size-3.5 mr-1.5" />
            Use Template
          </Button>
        </div>
      </div>

      {/* Footer: save + upvote + tags */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Save button */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 gap-1 px-2 text-xs rounded-full ${
              template.is_saved
                ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/15"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={(e) => onSave(e, template.id)}
          >
            <Heart
              className={`size-3 ${template.is_saved ? "fill-current" : ""}`}
            />
          </Button>
          {/* Upvote button */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 gap-1 px-2 text-xs rounded-full ${
              template.user_upvoted
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={(e) => onVote(e, template.id)}
          >
            <ThumbsUp
              className={`size-3 ${template.user_upvoted ? "fill-current" : ""}`}
            />
            <span className="tabular-nums font-medium">
              {template.upvotes || 0}
            </span>
          </Button>
        </div>
        {template.config?.tags && template.config.tags.length > 0 && (
          <div className="flex gap-1 min-w-0 shrink-0">
            {template.config.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full truncate max-w-16"
              >
                {tag}
              </span>
            ))}
            {template.config.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{template.config.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState({
  searchQuery,
  onClear,
}: {
  searchQuery: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Grid3X3 className="size-7 text-muted-foreground" />
      </div>
      <p className="text-base font-medium text-foreground">
        {searchQuery
          ? "No templates match your search"
          : "No templates yet"}
      </p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {searchQuery
          ? "Try a different search term or browse all templates."
          : "Upload your first template to get started."}
      </p>
      {searchQuery && (
        <Button variant="link" size="sm" onClick={onClear} className="mt-2">
          Clear search
        </Button>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { isSignedIn } = useUser();
  const { openSignUp } = useClerk();
  const dispatch = useAppDispatch();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortValue>("recent");
  const [savedOnly, setSavedOnly] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);

  const cacheRef = useRef<{ key: string; data: Template[]; expiry: number } | null>(null);
  const CACHE_TTL = 30_000;

  const fetchTemplates = useCallback(
    async (force = false) => {
      const token = await safeToken(getToken);
      const cacheKey = `${token || "anonymous"}-saved=${savedOnly}`;

      if (
        !force &&
        cacheRef.current &&
        cacheRef.current.key === cacheKey &&
        Date.now() < cacheRef.current.expiry
      ) {
        setTemplates(cacheRef.current.data);
        return;
      }

      setLoading(true);
      try {
        // When force=true, add a cache-busting query param
        const loaded = await (force
          ? getTemplates(token, `_t=${Date.now()}`, savedOnly)
          : getTemplates(token, undefined, savedOnly));
        cacheRef.current = { key: cacheKey, data: loaded, expiry: Date.now() + CACHE_TTL };
        setTemplates(loaded);
      } catch (err) {
        console.error("Failed to load templates:", err);
        toast.error("Failed to fetch templates from the server.");
      } finally {
        setLoading(false);
      }
    },
    [getToken, savedOnly]
  );

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Fetch categories from API (respects visibility: guests see public-only)
  useEffect(() => {
    const load = async () => {
      const token = await safeToken(getToken);
      const cats = await getCategories(token);
      setCategories(cats);
    };
    load();
  }, [getToken]);

  const filteredTemplates = useMemo(() => {
    let result =
      activeCategory === "All"
        ? templates
        : templates.filter((t) => {
            if (t.config?.tags && t.config.tags.length > 0)
              return t.config.tags.includes(activeCategory);
            return (t.config?.category || "Uncategorized") === activeCategory;
          });

    // If savedOnly is active, the API already filtered. But also handle client-side
    // filtering when toggling category within saved results.
    if (savedOnly) {
      result = result.filter((t) => t.is_saved);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.config?.tags && t.config.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case "recent":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "popular":
          return (b.upvotes || 0) - (a.upvotes || 0);
        case "name-asc":
          return a.title.localeCompare(b.title);
        case "name-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [templates, activeCategory, searchQuery, sortOption, savedOnly]);

  const handleUseTemplate = (templateId: string) => {
    dispatch(setImageEditorState({ previewUrl: null }));
    router.push(`/generate?templateId=${templateId}`);
  };

  const handleSave = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    const token = await safeToken(getToken);
    if (!token) return;
    try {
      const { template } = await saveTemplate(templateId, token);
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, is_saved: template.is_saved } : t)));
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      const token = await safeToken(getToken);
      await deleteTemplate(templateToDelete.id, token);
      toast.success("Template deleted successfully!");
      setShowDeleteModal(false);
      setTemplateToDelete(null);
      cacheRef.current = null;
      await fetchTemplates(true);
    } catch (err) {
      console.error("Delete failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete template.");
    } finally {
      setDeleting(false);
    }
  };

  const promptDeleteTemplate = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  const handleVote = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    try {
      const token = await safeToken(getToken);
      const updated = await voteTemplate(templateId, token);
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? updated : t)));
    } catch (err) {
      console.error("Upvote failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to upvote.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Grid3X3 className="size-4 text-primary" />
              </div>
              <h1 className="text-lg font-semibold truncate">Templates</h1>
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative hidden sm:block w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/40 border-border/50 focus-visible:bg-background rounded-xl"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>

            {/* Sort */}
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortValue)}>
              <SelectTrigger className="w-36 h-9 text-sm rounded-xl bg-muted/40 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Upload */}
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-xl"
              onClick={() => setShowUploadModal(true)}
            >
              <UploadCloud className="size-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Category Pills ──────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => { setActiveCategory("All"); setSavedOnly(false); }}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              activeCategory === "All" && !savedOnly
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            All
          </button>
          {userId && (
            <button
              onClick={() => { setActiveCategory("All"); setSavedOnly(true); }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                savedOnly
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Heart className={`size-3 inline mr-1 ${savedOnly ? "fill-current" : ""}`} />
              My Saves
            </button>
          )}
          {categories.map((tag) => (
            <button
              key={tag}
              onClick={() => { setActiveCategory(tag); setSavedOnly(false); }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                activeCategory === tag && !savedOnly
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState searchQuery={searchQuery} onClear={() => setSearchQuery("")} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-2">
            {filteredTemplates.map((template, i) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={i}
                userId={userId}
                onUse={handleUseTemplate}
                onVote={handleVote}
                onDelete={promptDeleteTemplate}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>

      <UploadTemplateModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={() => {
          cacheRef.current = null;
          fetchTemplates(true);
        }}
        getToken={getToken}
        isSignedIn={!!isSignedIn}
        onSignUp={openSignUp}
      />

      <ConfirmDialog
        open={showDeleteModal && !!templateToDelete}
        title="Delete template?"
        description={
          <>
            Are you sure you want to delete{" "}
            <strong className="text-foreground">&ldquo;{templateToDelete?.title}&rdquo;</strong>?
            This action cannot be undone.
          </>
        }
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={handleDeleteTemplate}
        onCancel={() => {
          setShowDeleteModal(false);
          setTemplateToDelete(null);
        }}
      />
    </div>
  );
}
