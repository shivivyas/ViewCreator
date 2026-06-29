"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  setImageEditorState, 
  addGenerationToHistory, 
  deleteGenerationFromHistory, 
  clearHistory
} from '@/store/slices/image-editor-slice';
import type { Template, GenerationHistoryItem, GenerateParams } from '@/types';
import { getTemplates, generateImages as apiGenerateImages } from '@/services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ImageIcon, 
  Wand2, 
  Download, 
  Settings2, 
  Sparkles, 
  Loader2, 
  Upload, 
  X,
  History,
  Trash2,
  Copy,
  Clock,
  RefreshCw
} from 'lucide-react';

const ASPECT_RATIO_DESCRIPTIONS: Record<string, string> = {
  '1:1': 'Square format (1:1) - Best for feed posts on Instagram, LinkedIn, Threads, Twitter, and Reddit.',
  '4:5': 'Vertical Portrait (4:5) - Perfect for Instagram, Threads, and LinkedIn feed posts.',
  '9:16': 'Full Mobile Story (9:16) - Optimized for vertical video/story platforms like TikTok, Instagram Reels, and YouTube Shorts.',
  '16:9': 'Wide Landscape (16:9) - Standard for Twitter, LinkedIn, YouTube, and Reddit posts.',
  '2:3': 'Pinterest Pin (2:3) - Optimized specifically for Pinterest pins and tall vertical visual content.'
};

export default function GenerateImagePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const editorState = useAppSelector((state) => state.imageEditor);

  const [mounted, setMounted] = useState(false);

  const [prompt, setPrompt] = useState(editorState.basePrompt || '');
  const [aspectRatio, setAspectRatio] = useState(editorState.aspectRatio || '1:1');
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [isPremium, setIsPremium] = useState(false);
  const [imageSize, setImageSize] = useState('1K');
  const [thinkingLevel, setThinkingLevel] = useState('minimal');
  
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrls, setImageUrls] = useState<string[]>(editorState.imageUrls || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const { getToken } = useAuth();

  // Get active template's style preset or fallback to 'None'
  const getSelectedTemplateStyle = () => {
    const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
    return activeTemplate?.config?.stylePreset || 'None';
  };

  // Set mounted state asynchronously to avoid SSR and React state update warnings
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch templates from PostgreSQL database backend
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const token = await getToken().catch(() => undefined) || undefined;
        const loadedTemplates = await getTemplates(token);
        setTemplates(loadedTemplates);
        if (loadedTemplates.length > 0) {
          setSelectedTemplateId(loadedTemplates[0].id);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [getToken]);

  // Sync state to redux when fetching new images
  useEffect(() => {
    if (imageUrls.length > 0) {
      const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
      const activeStyle = activeTemplate?.config?.stylePreset || 'None';
      dispatch(setImageEditorState({ imageUrls, basePrompt: prompt, style: activeStyle, aspectRatio }));
    }
  }, [imageUrls, prompt, selectedTemplateId, aspectRatio, dispatch, templates]);

  const handleLoadSettings = (item: GenerationHistoryItem) => {
    setPrompt(item.prompt);
    setAspectRatio(item.aspectRatio);
    setNumberOfImages(item.numberOfImages);
    setImageSize(item.imageSize);
    setThinkingLevel(item.thinkingLevel);
    setIsPremium(item.quality === 'Premium');
    if (item.templateId) {
      setSelectedTemplateId(item.templateId);
    } else {
      setSelectedTemplateId(null);
    }
  };

  const handleSelectImageFromHistory = (item: GenerationHistoryItem, index: number) => {
    dispatch(
      setImageEditorState({
        imageUrls: item.imageUrls,
        selectedIndex: index,
        basePrompt: item.prompt,
        style: item.style || 'None',
        aspectRatio: item.aspectRatio,
        previewUrl: item.imageUrls[index],
        activeHistoryItemId: item.id,
      })
    );
    router.push('/generate/edit');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file, index) => {
        // Limit to 3 reference images
        if (referenceImages.length + index < 3) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setReferenceImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const clearReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateImages = async (params: GenerateParams) => {
    setIsLoading(true);
    setError(null);
    setImageUrls([]);

    try {
      const token = await getToken().catch(() => undefined) || undefined;
      const generatedUrls = await apiGenerateImages(params, token);
      setImageUrls(generatedUrls);

      if (generatedUrls.length > 0) {
        const historyItem: GenerationHistoryItem = {
          id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          prompt: params.prompt,
          style: params.style,
          aspectRatio: params.aspectRatio,
          numberOfImages: params.numberOfImages,
          imageSize: params.imageSize,
          thinkingLevel: params.thinkingLevel,
          quality: params.quality,
          imageUrls: generatedUrls,
          referenceImages: params.referenceImages.length > 0 ? [...params.referenceImages] : undefined,
          templateId: params.templateId
        };
        dispatch(addGenerationToHistory(historyItem));
        toast.success(`Successfully generated ${generatedUrls.length} image(s)!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    await generateImages({
      prompt,
      style: getSelectedTemplateStyle(),
      aspectRatio,
      numberOfImages,
      imageSize,
      thinkingLevel,
      quality: isPremium ? 'Premium' : 'Standard',
      referenceImages,
      templateId: selectedTemplateId
    });
  };

  const handleRegenerate = async (item: GenerationHistoryItem) => {
    handleLoadSettings(item);
    await generateImages({
      prompt: item.prompt,
      style: item.style || 'None',
      aspectRatio: item.aspectRatio,
      numberOfImages: item.numberOfImages,
      imageSize: item.imageSize,
      thinkingLevel: item.thinkingLevel,
      quality: item.quality,
      referenceImages: item.referenceImages || [],
      templateId: item.templateId || null
    });
  };

  const handleDownload = (url: string, index: number, prefix = 'generated') => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}-${Date.now()}-${index}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Image download started!");
    } catch {
      toast.error("Failed to download image.");
    }
  };

  const handleEnhancePrompt = () => {
    // Basic auto-enhancement for MVP
    if (!prompt.includes("highly detailed")) {
      setPrompt(prev => prev.trim() + ", highly detailed, cinematic lighting, 8k resolution, photorealistic.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
      <div className="container mx-auto px-4 py-4 shrink-0">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            AI Studio
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate stunning marketing visuals using Nano Banana.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-6 flex-1 min-h-0 overflow-hidden">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 h-full">
        {/* Left Sidebar - Controls */}
        <Card className="h-full min-h-0 flex flex-col shadow-sm border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-3 shrink-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="w-4 h-4" />
              Parameters
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 min-h-0">
            <form id="generate-form" onSubmit={handleGenerate} className="flex flex-col gap-5 p-4">
              
              {/* 1. Viral Templates */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Select Viral Template</span>
                  {isLoadingTemplates && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </Label>
                {templates.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          // Also set aspect ratio if defined in config
                          if (tpl.config?.aspectRatio) {
                            setAspectRatio(tpl.config.aspectRatio);
                          }
                        }}
                        className={`cursor-pointer rounded-lg border p-2 flex items-center gap-3 transition-all ${
                          selectedTemplateId === tpl.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={tpl.s3_link}
                            alt={tpl.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold truncate">{tpl.title}</h4>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                            {tpl.description}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Recommended prompts selector for the active template */}
                    {(() => {
                      const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
                      const recommendedPrompts = activeTemplate?.config?.recommendedPrompts;
                      if (!recommendedPrompts) return null;
                      return (
                        <div className="pt-1.5 space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground">Suggested Prompts:</span>
                          <div className="flex flex-col gap-1">
                            {recommendedPrompts.map((p: string, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPrompt(p)}
                                className="text-[10px] text-left text-primary hover:underline bg-muted/30 p-1.5 rounded border border-dashed hover:bg-muted/50 truncate"
                                title={p}
                              >
                                &quot;{p}&quot;
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-xs p-3 text-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                    {!isLoadingTemplates ? "No templates found. Database or API offline." : "Loading viral templates..."}
                  </div>
                )}
              </div>

              {/* 2. Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt" className="text-xs font-semibold">
                    Prompt <span className="text-destructive">*</span>
                  </Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleEnhancePrompt} className="h-6 text-xs text-primary px-1">
                    <Sparkles className="w-3 h-3 mr-0.5" /> Enhance
                  </Button>
                </div>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Create a premium LinkedIn ad for my AI SaaS dashboard..."
                  className="min-h-[90px] resize-none shadow-sm focus-visible:ring-primary/50 text-xs"
                  disabled={isLoading}
                />
              </div>

              {/* 3. Reference Images */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">References ({referenceImages.length}/3)</Label>
                  {referenceImages.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setReferenceImages([])} className="h-6 text-xs text-destructive px-1">
                      Clear all
                    </Button>
                  )}
                </div>
                {referenceImages.length < 3 ? (
                  <div 
                    className="border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <p className="text-xs font-medium">Add reference (up to 3)</p>
                  </div>
                ) : null}
                {referenceImages.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {referenceImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg border bg-muted/20 p-0.5 overflow-hidden flex items-center justify-center h-16 w-16">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Ref ${idx+1}`} className="max-h-full object-contain rounded" />
                        <Button 
                          type="button"
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5"
                          onClick={() => clearReferenceImage(idx)}
                        >
                          <X className="w-2 h-2" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload} 
                />
              </div>

              {/* 3. Aspect Ratio */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Aspect Ratio</Label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(ASPECT_RATIO_DESCRIPTIONS).map((ratio) => (
                    <div key={ratio} className="relative group">
                      <Button 
                        type="button" 
                        variant={aspectRatio === ratio ? "default" : "outline"} 
                        onClick={() => setAspectRatio(ratio)} 
                        className="flex items-center gap-0.5 text-xs px-2 h-8" 
                        size="sm"
                        title={ASPECT_RATIO_DESCRIPTIONS[ratio]}
                      >
                        <span className="text-[10px]">{ratio}</span>
                      </Button>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                        {ASPECT_RATIO_DESCRIPTIONS[ratio]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Number of Images & 6. Quality */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Images</Label>
                  <div className="flex gap-1">
                    {[1, 2, 4].map(num => (
                      <Button key={num} type="button" variant={numberOfImages === num ? "default" : "outline"} onClick={() => setNumberOfImages(num)} className="flex-1 h-8 text-xs" size="sm">
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Quality</Label>
                  <div className="flex items-center justify-between rounded-lg border p-1.5 bg-muted/20 h-8">
                    <span className={`text-[10px] font-medium ${!isPremium ? 'text-foreground' : 'text-muted-foreground'}`}>Std</span>
                    <Switch
                      checked={isPremium}
                      onCheckedChange={setIsPremium}
                      disabled={isLoading}
                    />
                    <span className={`text-[10px] font-medium ${isPremium ? 'text-primary' : 'text-muted-foreground'}`}>Prm</span>
                  </div>
                </div>
              </div>

              {/* 7. Image Size */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Resolution</Label>
                <div className="flex gap-1">
                  {['512', '1K', '2K', '4K'].map(size => (
                    <Button 
                      key={size}
                      type="button" 
                      variant={imageSize === size ? "default" : "outline"} 
                      onClick={() => setImageSize(size)}
                      className="flex-1 h-8 text-xs"
                      size="sm"
                      title={size === '512' ? '0.5K - Fast, compact' : size === '1K' ? '1K - Balanced (default)' : size === '2K' ? '2K - High quality' : '4K - Maximum quality'}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 8. Thinking Level */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Thinking</Label>
                <div className="flex items-center justify-between rounded-lg border p-1.5 bg-muted/20 h-8">
                  <span className={`text-[10px] font-medium ${thinkingLevel === 'minimal' ? 'text-foreground' : 'text-muted-foreground'}`}>Fast</span>
                  <Switch
                    checked={thinkingLevel === 'high'}
                    onCheckedChange={(checked) => setThinkingLevel(checked ? 'high' : 'minimal')}
                    disabled={isLoading}
                  />
                  <span className={`text-[10px] font-medium ${thinkingLevel === 'high' ? 'text-primary' : 'text-muted-foreground'}`}>Deep</span>
                </div>
              </div>

              {error && (
                <div className="p-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md font-medium flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </form>
          </ScrollArea>
          <div className="p-3 border-t bg-background shrink-0">
            <Button 
              type="submit" 
              form="generate-form"
              className="w-full h-10 text-sm font-bold shadow-md hover:shadow-lg transition-all" 
              disabled={!mounted || isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Right Area - Results & History */}
        <div className="flex flex-col h-full min-h-0 gap-4 overflow-hidden">
          <Card className="flex-1 min-h-0 overflow-hidden flex flex-col shadow-md">
            <CardHeader className="border-b bg-muted/30 pb-2 pt-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Generation History
                </CardTitle>
                {(editorState.history && editorState.history.length > 0) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => dispatch(clearHistory())}
                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Clear History
                  </Button>
                )}
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 min-h-0">
              <CardContent className="p-4 relative min-h-[400px]">
                {/* Background grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
                
                <div className="relative z-10 w-full flex flex-col gap-6">
                  
                  {/* Active Loading State */}
                  {isLoading && (
                    <div className="border border-primary/20 rounded-xl bg-primary/5 p-4 animate-pulse space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-xs font-bold text-primary">Generating images...</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border">
                          Nano Banana 3.1
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="bg-muted/50 border border-muted/80 p-2.5 rounded text-xs italic text-muted-foreground line-clamp-2">
                          &quot;{prompt}&quot;
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Ratio: {aspectRatio}</Badge>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Size: {imageSize}</Badge>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{isPremium ? 'Premium' : 'Standard'}</Badge>
                          {thinkingLevel === 'high' && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-primary bg-primary/10 border-primary/20">Deep Thinking</Badge>}
                        </div>
                      </div>
                      
                      {/* Placeholder skeletons matching requested quantity */}
                      <div className={`grid gap-3 ${numberOfImages === 1 ? 'grid-cols-1 max-w-sm mx-auto' : numberOfImages === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                        {Array.from({ length: numberOfImages }).map((_, i) => (
                          <div key={i} className="aspect-square bg-muted/40 rounded-lg border border-dashed flex flex-col items-center justify-center text-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground/30 animate-bounce mb-1" />
                            <span className="text-[10px] text-muted-foreground/40 font-medium">Variation {i + 1}...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* History List */}
                  {editorState.history && editorState.history.length > 0 ? (
                    <div className="space-y-6">
                      {editorState.history.map((item) => (
                        <div 
                          key={item.id} 
                          className="border border-muted rounded-xl bg-background shadow-sm hover:shadow transition-all overflow-hidden"
                        >
                          {/* Item Header */}
                          <div className="bg-muted/10 border-b p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3 text-muted-foreground/60" />
                                {item.timestamp}
                              </span>
                              <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0">
                                {item.aspectRatio}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0">
                                {item.imageSize}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] font-medium px-1.5 py-0 ${
                                  item.quality === 'Premium' 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                                    : ''
                                }`}
                              >
                                {item.quality}
                              </Badge>
                              {item.thinkingLevel === 'high' && (
                                <Badge variant="outline" className="text-[9px] font-medium border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 px-1.5 py-0">
                                  Deep Think
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1 sm:self-auto self-end shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLoadSettings(item)}
                                className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Load these parameters into form"
                              >
                                <Copy className="w-3 h-3 mr-1 text-muted-foreground/75" />
                                Use settings
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRegenerate(item)}
                                disabled={isLoading}
                                className="h-7 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/5"
                                title="Regenerate these images"
                              >
                                <RefreshCw className="w-3 h-3 mr-1 text-primary/75" />
                                Regenerate
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => dispatch(deleteGenerationFromHistory(item.id))}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Remove from history"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Item Details */}
                          <div className="p-3.5 space-y-3">
                            {/* Prompt text box */}
                            <div className="text-xs bg-muted/30 border border-muted/50 p-2.5 rounded-lg text-foreground font-normal leading-relaxed break-words whitespace-pre-wrap select-all">
                              {item.prompt}
                            </div>

                            {/* Reference Images if available */}
                            {item.referenceImages && item.referenceImages.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Composition References:</span>
                                <div className="flex gap-1">
                                  {item.referenceImages.map((refImg, rIdx) => (
                                    <div key={rIdx} className="w-6 h-6 rounded border bg-muted overflow-hidden flex items-center justify-center">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={refImg} alt={`Reference ${rIdx+1}`} className="max-h-full object-contain" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Image Grid */}
                            <div className={`grid gap-3 ${
                              item.imageUrls.length === 1 
                                ? 'grid-cols-1 max-w-md' 
                                : item.imageUrls.length === 2 
                                ? 'grid-cols-2' 
                                : 'grid-cols-2 lg:grid-cols-4'
                            }`}>
                              {item.imageUrls.map((url, i) => (
                                <div 
                                  key={i} 
                                  className="group relative rounded-lg overflow-hidden border shadow-sm bg-muted/20 flex items-center justify-center aspect-square transition-all duration-300 hover:border-primary/30"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img 
                                    src={url} 
                                    alt={`Generated variation ${i+1}`} 
                                    onClick={() => handleSelectImageFromHistory(item, i)}
                                    className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                                  />
                                  
                                  {/* Variation tag */}
                                  <span className="absolute top-1.5 left-1.5 bg-black/75 text-[9px] text-white font-semibold rounded px-1.5 py-0.5 pointer-events-none select-none">
                                    #{i + 1}
                                  </span>

                                  {/* Hover Overlay */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      onClick={() => handleDownload(url, i, `history-${item.id}`)} 
                                      className="text-[10px] h-7 w-full max-w-[110px]"
                                    >
                                      <Download className="w-3 h-3 mr-1" /> Download
                                    </Button>
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      onClick={() => handleSelectImageFromHistory(item, i)} 
                                      className="text-[10px] h-7 w-full max-w-[110px]"
                                    >
                                      <Settings2 className="w-3 h-3 mr-1" /> Edit Image
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isLoading && (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground/60 py-16 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-1">
                          <ImageIcon className="w-8 h-8 opacity-50" />
                        </div>
                        <h3 className="text-sm font-medium text-foreground">Awaiting Instructions</h3>
                        <p className="text-xs max-w-xs">Configure parameters and click Generate to see your marketing assets come to life. Past generations will be preserved here during your session.</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
