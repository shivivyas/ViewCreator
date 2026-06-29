import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Settings2, Sparkles, Upload, X } from 'lucide-react';
import type { Template } from '@/types';

const ASPECT_RATIO_DESCRIPTIONS: Record<string, string> = {
  '1:1': 'Square format (1:1) - Best for feed posts on Instagram, LinkedIn, Threads, Twitter, and Reddit.',
  '4:5': 'Vertical Portrait (4:5) - Perfect for Instagram, Threads, and LinkedIn feed posts.',
  '9:16': 'Full Mobile Story (9:16) - Optimized for vertical video/story platforms like TikTok, Instagram Reels, and YouTube Shorts.',
  '16:9': 'Wide Landscape (16:9) - Standard for Twitter, LinkedIn, YouTube, and Reddit posts.',
  '2:3': 'Pinterest Pin (2:3) - Optimized specifically for Pinterest pins and tall vertical visual content.'
};

export interface GenerateFormProps {
  prompt: string;
  setPrompt: (val: string | ((prev: string) => string)) => void;
  aspectRatio: string;
  setAspectRatio: (val: string) => void;
  numberOfImages: number;
  setNumberOfImages: (val: number) => void;
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;
  imageSize: string;
  setImageSize: (val: string) => void;
  thinkingLevel: string;
  setThinkingLevel: (val: string) => void;
  referenceImages: string[];
  setReferenceImages: React.Dispatch<React.SetStateAction<string[]>>;
  templates: Template[];
  selectedTemplateId: string | null;
  setSelectedTemplateId: (val: string | null) => void;
  isLoadingTemplates: boolean;
  isLoading: boolean;
  mounted: boolean;
  error: string | null;
  handleGenerate: (e: React.FormEvent) => void;
  handleEnhancePrompt: () => void;
}

export function GenerateForm({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  numberOfImages,
  setNumberOfImages,
  isPremium,
  setIsPremium,
  imageSize,
  setImageSize,
  thinkingLevel,
  setThinkingLevel,
  referenceImages,
  setReferenceImages,
  templates,
  selectedTemplateId,
  setSelectedTemplateId,
  isLoadingTemplates,
  isLoading,
  mounted,
  error,
  handleGenerate,
  handleEnhancePrompt
}: GenerateFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file, index) => {
      if (referenceImages.length + index < 3 && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReferenceImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
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
    processFiles(e.dataTransfer.files);
  };

  const clearReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
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
                className={`border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragging ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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

          {/* 4. Aspect Ratio */}
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
  );
}
