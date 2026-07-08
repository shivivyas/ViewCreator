"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Loader2, UploadCloud } from "lucide-react";
import { uploadTemplate, type UploadTemplateParams } from "@/services/api/template-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { safeToken } from "@/lib/helpers";
import type { MediaType } from "@/types";

interface UploadTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  getToken: () => Promise<string | null>;
  isSignedIn: boolean;
  onSignUp: () => void;
}

export function UploadTemplateModal({
  open,
  onClose,
  onUploadComplete,
  getToken,
  isSignedIn,
  onSignUp,
}: UploadTemplateModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTagsInput, setUploadTagsInput] = useState("");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [uploadFileType, setUploadFileType] = useState<MediaType>("image");
  const [isPublic, setIsPublic] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  const getFileType = (files: FileList): MediaType => {
    for (const f of files) {
      if (f.type.startsWith("video/")) return "video";
    }
    return "image";
  };

  const processFiles = (files?: FileList) => {
    if (!files || files.length === 0) return;
    const fileType = getFileType(files);
    setUploadFileType(fileType);

    if (fileType === "video") {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImages([reader.result as string]);
      reader.readAsDataURL(files[0]);
    } else {
      const readers = Array.from(files).map((f) => {
        return new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.readAsDataURL(f);
        });
      });
      Promise.all(readers).then((newImages) => {
        setPreviewImages((prev) => [...prev, ...newImages]);
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files ?? undefined);
    e.target.value = "";
  };

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
    processFiles(e.dataTransfer.files ?? undefined);
  };

  const resetForm = () => {
    setUploadTitle("");
    setUploadDescription("");
    setUploadTagsInput("");
    setPreviewImages([]);
    setUploadFileType("image");
    setIsPublic(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewImages.length === 0 || !uploadTitle) return;

    if (!isSignedIn) {
      onSignUp();
      return;
    }

    setUploading(true);
    try {
      const token = await safeToken(getToken);
      const tags = uploadTagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const params: UploadTemplateParams = {
        mediaType: uploadFileType,
        title: uploadTitle,
        description: uploadDescription,
        tags: isPublic ? tags : ["My Uploads"],
        isPublic,
      };

      if (uploadFileType === "video") {
        params.base64Video = previewImages[0];
      } else if (previewImages.length === 1) {
        params.base64Image = previewImages[0];
      } else {
        params.base64Images = previewImages;
      }

      await uploadTemplate(params, token);

      handleClose();
      toast.success("Template uploaded successfully!");
      window.dispatchEvent(new CustomEvent("payment-updated"));
      onUploadComplete();
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload template.");
    } finally {
      setUploading(false);
    }
  };

  return (
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
            onClick={handleClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="size-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
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
              <Label htmlFor="tags" className="text-sm">Tags</Label>
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
            <Label className="text-sm">
              {uploadFileType === "video" ? "Video" : `Images (${previewImages.length})`}
            </Label>
            <div
              className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
                previewImages.length > 0 ? "p-2" : "p-6"
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
              {previewImages.length > 0 ? (
                <div className="relative">
                  {uploadFileType === "video" ? (
                    <div className="relative group">
                      <video
                        src={previewImages[0]}
                        className="w-full aspect-video object-cover rounded-lg"
                        controls
                        muted
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImages([]);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {previewImages.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImages((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 size-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors z-10"
                          >
                            <X className="size-3 text-white" />
                          </button>
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-medium text-white">{idx + 1}</span>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="aspect-square rounded-lg border-2 border-dashed border-border/60 hover:border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="size-4" />
                        <span className="text-[10px] font-medium">Add</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <UploadCloud className="size-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Choose images or a video</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Select multiple images for carousel, or one video
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Title</Label>
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
            disabled={previewImages.length === 0 || !uploadTitle || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Template"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
