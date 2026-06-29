"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { 
  UploadCloud, 
  Grid, 
  Plus, 
  X, 
  Loader2,
  Wand2
} from "lucide-react";

import { getTemplates, uploadTemplate } from "@/services/api/template-service";
import type { Template } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppDispatch } from "@/store";
import { setImageEditorState } from "@/store/slices/image-editor-slice";

export default function TemplatesPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const dispatch = useAppDispatch();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  
  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken().catch(() => undefined) || undefined;
      const loaded = await getTemplates(token);
      setTemplates(loaded);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTemplates();
  }, [fetchTemplates]);

  // Derive categories dynamically from database
  const categories = ["All", ...Array.from(new Set(templates.map(t => t.config?.category || "Uncategorized")))];
  
  const filteredTemplates = activeCategory === "All" 
    ? templates 
    : templates.filter(t => (t.config?.category || "Uncategorized") === activeCategory);

  const handleUseTemplate = (templateId: string) => {
    // Jump straight to generator with this template active
    dispatch(setImageEditorState({ previewUrl: null })); // Reset active preview
    router.push(`/generate?templateId=${templateId}`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewImage || !uploadTitle) return;

    setUploading(true);
    try {
      const token = await getToken().catch(() => undefined) || undefined;
      await uploadTemplate({
        base64Image: previewImage,
        title: uploadTitle,
        description: uploadDescription,
        category: "My Uploads",
      }, token);

      setShowUploadModal(false);
      setUploadTitle("");
      setUploadDescription("");
      setPreviewImage(null);
      await fetchTemplates(); // Refresh view
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload template.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background pt-16">
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
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</h4>
            {categories.map(category => (
              <Button
                key={category}
                variant={activeCategory === category ? "secondary" : "ghost"}
                className="w-full justify-start font-normal"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <Grid className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Templates Library</h1>
        </header>

        <ScrollArea className="flex-1 p-6">
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
                <Card key={template.id} className="overflow-hidden flex flex-col group">
                  <div className="relative aspect-square bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={template.s3_link} 
                      alt={template.title}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
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
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-md rounded-xl shadow-lg border overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold">Upload Private Template</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUploadModal(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              
              <div className="space-y-2">
                <Label>Template Image</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center overflow-hidden bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50 ${previewImage ? 'aspect-square' : 'h-32'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Plus className="size-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to select image</span>
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
    </div>
  );
}
