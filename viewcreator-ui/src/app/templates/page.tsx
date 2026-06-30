"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  UploadCloud,
  Plus,
  X,
  Loader2,
  Wand2,
  Search,
  ThumbsUp,
  Trash2,
  ChevronDown,
  Grid3X3,
} from "lucide-react";

import { getTemplates, uploadTemplate, deleteTemplate, voteTemplate } from "@/services/api/template-service";
import type { Template, MediaType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch } from "@/store";
import { setImageEditorState } from "@/store/slices/image-editor-slice";

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
  onView: (t: Template) => void;
  onVote: (e: React.MouseEvent, id: string) => void;
  onDelete: (e: React.MouseEvent, t: Template) => void;
}

const TemplateCard = React.memo(function TemplateCard({
  template,
  index,
  userId,
  onUse,
  onView,
  onVote,
  onDelete,
}: TemplateCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={cardRef}
      className="group relative cursor-pointer rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
      onClick={() => onView(template)}
    >
      {/* Image */}
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
            src={template.s3_link}
            alt={template.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading={isFirstVisible ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={isFirstVisible ? "high" : undefined}
          />
        )}

        {/* Top-right actions (visible on hover) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 flex gap-1.5">
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
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/30">
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

      {/* Footer: upvote + tags */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
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
  const dispatch = useAppDispatch();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortValue>("recent");

  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTagsInput, setUploadTagsInput] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadFileType, setUploadFileType] = useState<MediaType>("image");
  const [isPublic, setIsPublic] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Detail modal state
  const [viewTemplate, setViewTemplate] = useState<Template | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<{ key: string; data: Template[]; expiry: number } | null>(null);
  const CACHE_TTL = 30_000;

  const fetchTemplates = useCallback(
    async (force = false) => {
      const token = (await getToken().catch(() => undefined)) || undefined;
      const cacheKey = token || "anonymous";

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
        const loaded = await getTemplates(token);
        cacheRef.current = { key: cacheKey, data: loaded, expiry: Date.now() + CACHE_TTL };
        setTemplates(loaded);
      } catch (err) {
        console.error("Failed to load templates:", err);
        toast.error("Failed to fetch templates from the server.");
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const { categories } = useMemo(() => {
    const tags = Array.from(
      new Set(
        templates.flatMap((t) => {
          if (t.config?.tags && t.config.tags.length > 0) return t.config.tags;
          if (t.config?.category) return [t.config.category];
          return ["Uncategorized"];
        })
      )
    );
    return { categories: tags };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let result =
      activeCategory === "All"
        ? templates
        : templates.filter((t) => {
            if (t.config?.tags && t.config.tags.length > 0)
              return t.config.tags.includes(activeCategory);
            return (t.config?.category || "Uncategorized") === activeCategory;
          });

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
  }, [templates, activeCategory, searchQuery, sortOption]);

  const handleUseTemplate = (templateId: string) => {
    dispatch(setImageEditorState({ previewUrl: null }));
    router.push(`/generate?templateId=${templateId}`);
  };

  const getFileType = (file: File): MediaType | null => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return null;
  };

  const processFile = (file?: File) => {
    const fileType = file ? getFileType(file) : null;
    if (file && fileType) {
      setUploadFileType(fileType);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
    processFile(e.target.files?.[0]);

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
    processFile(e.dataTransfer.files?.[0]);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewImage || !uploadTitle) return;

    setUploading(true);
    try {
      const token = (await getToken().catch(() => undefined)) || undefined;
      const tags = uploadTagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await uploadTemplate(
        {
          base64Image: uploadFileType === "image" ? previewImage : undefined,
          base64Video: uploadFileType === "video" ? previewImage : undefined,
          mediaType: uploadFileType,
          title: uploadTitle,
          description: uploadDescription,
          tags: isPublic ? tags : ["My Uploads"],
          isPublic,
        },
        token
      );

      setShowUploadModal(false);
      resetUploadForm();
      toast.success("Template uploaded successfully!");
      cacheRef.current = null;
      await fetchTemplates(true);
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload template.");
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDescription("");
    setUploadTagsInput("");
    setPreviewImage(null);
    setUploadFileType("image");
    setIsPublic(true);
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      const token = (await getToken().catch(() => undefined)) || undefined;
      await deleteTemplate(templateToDelete.id, token);
      toast.success("Template deleted successfully!");
      setShowDeleteModal(false);
      setTemplateToDelete(null);
      if (viewTemplate?.id === templateToDelete.id) setViewTemplate(null);
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
      const token = (await getToken().catch(() => undefined)) || undefined;
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
            onClick={() => setActiveCategory("All")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              activeCategory === "All"
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveCategory(tag)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                activeCategory === tag
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
                onView={setViewTemplate}
                onVote={handleVote}
                onDelete={promptDeleteTemplate}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Upload Modal ────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <div>
                <h2 className="font-semibold text-base">Upload Template</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Share a template with the community
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="h-8 w-8 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-5">
              {/* Public toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border/50 p-3.5">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium cursor-pointer">Public template</Label>
                  <p className="text-xs text-muted-foreground">
                    {isPublic
                      ? "Visible to everyone on the platform"
                      : "Only visible to you"}
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {isPublic && (
                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-sm">
                    Tags
                  </Label>
                  <Input
                    id="tags"
                    placeholder="e.g. Social Media, Minimalist, Hero Banners"
                    value={uploadTagsInput}
                    onChange={(e) => setUploadTagsInput(e.target.value)}
                    className="rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Comma-separated tags help others discover your template.
                  </p>
                </div>
              )}

              {/* File dropzone */}
              <div className="space-y-2">
                <Label className="text-sm">File</Label>
                <div
                  className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
                    previewImage ? "p-1" : "p-6"
                  } ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-border bg-muted/20"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {previewImage ? (
                    <div className="relative group">
                      {uploadFileType === "video" ? (
                        <video
                          src={previewImage}
                          className="w-full aspect-video object-cover rounded-lg"
                          controls
                          muted
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="w-full aspect-video object-cover rounded-lg"
                        />
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <div className="size-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                        <Plus className="size-5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        Choose an image or video
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Drag & drop or click to browse
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm">
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Minimalist UI Mockup"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-sm">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="desc"
                  placeholder="Brief context about this template..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 rounded-xl"
                disabled={!previewImage || !uploadTitle || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Save Template"
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────── */}
      {viewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setViewTemplate(null)}
        >
          <div
            className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:w-[55%] bg-muted/30 flex items-center justify-center p-5 border-b md:border-b-0 md:border-r border-border/50">
              {viewTemplate.media_type === "video" ? (
                <video
                  src={viewTemplate.s3_link}
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
                  src={viewTemplate.s3_link}
                  alt={viewTemplate.title}
                  className="max-w-full max-h-[50vh] md:max-h-[70vh] object-contain rounded-xl"
                />
              )}
            </div>
            <div className="md:w-[45%] p-6 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex flex-wrap gap-1.5">
                  {viewTemplate.media_type === "video" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-muted text-muted-foreground">
                      Video
                    </span>
                  )}
                  {(viewTemplate.config?.tags?.length
                    ? viewTemplate.config.tags
                    : [viewTemplate.config?.category || "Uncategorized"]
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
                  onClick={() => setViewTemplate(null)}
                  className="h-8 w-8 rounded-full shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <h2 className="text-xl font-bold mb-2">{viewTemplate.title}</h2>
              <p className="text-sm text-muted-foreground flex-1 leading-relaxed whitespace-pre-wrap">
                {viewTemplate.description || "No description provided."}
              </p>

              <div className="mt-auto pt-5 border-t border-border/50 space-y-3">
                <Button
                  size="lg"
                  className="w-full font-semibold rounded-xl shadow-sm"
                  onClick={() => handleUseTemplate(viewTemplate.id)}
                >
                  <Wand2 className="size-4 mr-2" />
                  Use This Template
                </Button>

                {userId && viewTemplate.user_id === userId && (
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:bg-destructive/10 rounded-xl border-border/50"
                    onClick={(e) => promptDeleteTemplate(e, viewTemplate)}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete Template
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ─────────────────────────────── */}
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border/50 p-6">
            <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Delete template?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">&ldquo;{templateToDelete.title}&rdquo;</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTemplateToDelete(null);
                }}
                disabled={deleting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteTemplate}
                disabled={deleting}
                className="rounded-xl"
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
