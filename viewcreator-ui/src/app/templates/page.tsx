"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { 
  UploadCloud, 
  Grid, 
  Plus, 
  X, 
  Loader2,
  Wand2
} from "lucide-react";

import { getTemplates, uploadTemplate, deleteTemplate } from "@/services/api/template-service";
import type { Template } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useAppDispatch } from "@/store";
import { setImageEditorState } from "@/store/slices/image-editor-slice";
import { Trash2 } from "lucide-react";

export default function TemplatesPage() {
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const dispatch = useAppDispatch();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  
  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTagsInput, setUploadTagsInput] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  // View modal state
  const [viewTemplate, setViewTemplate] = useState<Template | null>(null);
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken().catch(() => undefined) || undefined;
      const loaded = await getTemplates(token);
      setTemplates(loaded);
    } catch (err) {
      console.error("Failed to load templates:", err);
      toast.error("Failed to fetch templates from the server.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTemplates();
  }, [fetchTemplates]);

  // Derive tags dynamically from database
  // Support both new config.tags[] and legacy config.category string
  const allTags = Array.from(new Set(
    templates.flatMap(t => {
      if (t.config?.tags && t.config.tags.length > 0) return t.config.tags;
      if (t.config?.category) return [t.config.category];
      return ['Uncategorized'];
    })
  ));
  const globalTags = allTags.filter(t => t !== "My Uploads");
  const hasMyUploads = allTags.includes("My Uploads");
  
  const filteredTemplates = activeCategory === "All" 
    ? templates 
    : templates.filter(t => {
        // Check new tags array format
        if (t.config?.tags && t.config.tags.length > 0) {
          return t.config.tags.includes(activeCategory);
        }
        // Fall back to legacy category string
        return (t.config?.category || "Uncategorized") === activeCategory;
      });

  const handleUseTemplate = (templateId: string) => {
    // Jump straight to generator with this template active
    dispatch(setImageEditorState({ previewUrl: null })); // Reset active preview
    router.push(`/generate?templateId=${templateId}`);
  };

  const processFile = (file?: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewImage || !uploadTitle) return;

    setUploading(true);
    try {
      const token = await getToken().catch(() => undefined) || undefined;
      const tags = uploadTagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      await uploadTemplate({
        base64Image: previewImage,
        title: uploadTitle,
        description: uploadDescription,
        tags: isPublic ? tags : ['My Uploads'],
        isPublic,
      }, token);

      setShowUploadModal(false);
      setUploadTitle("");
      setUploadDescription("");
      setUploadTagsInput("");
      setPreviewImage(null);
      setIsPublic(true);
      toast.success("Template uploaded successfully!");
      await fetchTemplates(); // Refresh view
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload template.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      const token = await getToken().catch(() => undefined) || undefined;
      await deleteTemplate(templateToDelete.id, token);
      
      toast.success("Template deleted successfully!");
      setShowDeleteModal(false);
      setTemplateToDelete(null);
      if (viewTemplate?.id === templateToDelete.id) {
        setViewTemplate(null);
      }
      await fetchTemplates();
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

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
      {/* Sidebar Categories */}
      <div className="w-64 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <Button 
            className="w-full gap-2" 
            onClick={() => setShowUploadModal(true)}
          >
            <UploadCloud className="size-4" />
            Upload Template
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Library</h4>
            <Button
              variant={activeCategory === "All" ? "secondary" : "ghost"}
              className="w-full justify-start font-normal"
              onClick={() => setActiveCategory("All")}
            >
              All Templates
            </Button>
            
            {hasMyUploads && (
              <Button
                variant={activeCategory === "My Uploads" ? "secondary" : "ghost"}
                className="w-full justify-start font-normal"
                onClick={() => setActiveCategory("My Uploads")}
              >
                My Uploads
              </Button>
            )}

            {globalTags.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3 px-2">Tags</h4>
                {globalTags.map(tag => (
                  <Button
                    key={tag}
                    variant={activeCategory === tag ? "secondary" : "ghost"}
                    className="w-full justify-start font-normal"
                    onClick={() => setActiveCategory(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </>
            )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <Grid className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Templates Library</h1>
        </header>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col h-64 items-center justify-center text-muted-foreground">
                <Wand2 className="size-12 mb-4 opacity-20" />
                <p>No templates found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="overflow-hidden flex flex-col group cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setViewTemplate(template)}
                  >
                    <div className="relative aspect-square bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={template.s3_link} 
                        alt={template.title}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                      {userId && template.user_id === userId && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-8 w-8 rounded-full shadow-sm"
                            onClick={(e) => promptDeleteTemplate(e, template)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-4 flex-1">
                      <CardTitle className="text-base line-clamp-1">{template.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">
                        {template.description || "No description provided."}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="p-4 pt-0">
                      <Button 
                        className="w-full" 
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(template.id);
                        }}
                      >
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-md rounded-xl shadow-lg border overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold">Upload Template</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadTitle("");
                  setUploadDescription("");
                  setUploadTagsInput("");
                  setPreviewImage(null);
                  setIsPublic(true);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              
              {/* Public / Private Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium cursor-pointer">Public Template</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {isPublic ? "Visible to all users of the platform" : "Only visible to you"}
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {isPublic && (
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input 
                    id="tags" 
                    placeholder="e.g. Hero Banners, Social Media, Minimalist (comma-separated)" 
                    value={uploadTagsInput}
                    onChange={(e) => setUploadTagsInput(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Separate tags with commas. These help other users discover your template.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Template Image</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${previewImage ? 'aspect-square p-1.5' : 'h-32'} ${isDragging ? 'bg-primary/10 border-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {previewImage ? (
                    <div className="relative w-full h-full group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover rounded-md" />
                      <Button 
                        type="button"
                        variant="destructive" 
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full p-0 flex items-center justify-center shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Plus className="size-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click or drag image to select</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Minimalist UI Mockup" 
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description (Optional)</Label>
                <Input 
                  id="desc" 
                  placeholder="Brief context..." 
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={!previewImage || !uploadTitle || uploading}>
                {uploading ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Uploading to S3...</>
                ) : (
                  "Save Template"
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* View Template Modal */}
      {viewTemplate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" 
          onClick={() => setViewTemplate(null)}
        >
          <div 
            className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:w-3/5 bg-muted/30 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={viewTemplate.s3_link} 
                alt={viewTemplate.title} 
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm" 
              />
            </div>
            <div className="md:w-2/5 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4 gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(viewTemplate.config?.tags && viewTemplate.config.tags.length > 0
                    ? viewTemplate.config.tags
                    : [viewTemplate.config?.category || "Uncategorized"]
                  ).map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
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
              
              <h2 className="text-2xl font-bold mb-2">{viewTemplate.title}</h2>
              <p className="text-muted-foreground text-sm flex-1 mb-6 whitespace-pre-wrap">
                {viewTemplate.description || "No description provided."}
              </p>
              
              <div className="mt-auto pt-6 border-t space-y-4 shrink-0">
                 <Button 
                   size="lg" 
                   className="w-full font-bold shadow-md" 
                   onClick={() => handleUseTemplate(viewTemplate.id)}
                 >
                   <Wand2 className="size-4 mr-2" />
                   Use This Template
                 </Button>
                 
                 {userId && viewTemplate.user_id === userId && (
                   <Button 
                     variant="outline"
                     className="w-full text-destructive hover:bg-destructive/10" 
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-xl border overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Delete Template?
            </h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>&quot;{templateToDelete.title}&quot;</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setTemplateToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteTemplate}
                disabled={deleting}
              >
                {deleting ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Deleting...</>
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
