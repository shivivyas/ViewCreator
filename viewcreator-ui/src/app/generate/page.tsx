"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { setImageEditorState } from '@/store/slices/image-editor-slice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ImageIcon, 
  Wand2, 
  Download, 
  Settings2, 
  Sparkles, 
  Loader2, 
  Upload, 
  X
} from 'lucide-react';

const STYLE_DESCRIPTIONS: Record<string, string> = {
  'Product Photo': 'Perfect for SaaS dashboards, software interfaces, and tech product marketing. Emphasizes clean, professional product shots with clear UI elements.',
  'Corporate': 'Formal business imagery for corporate communications, annual reports, and professional services. Conveys trust, stability, and professionalism.',
  'Minimal': 'Clean, simple compositions with lots of negative space. Ideal for modern startups, tech companies, and minimalist brands.',
  'Modern': 'Contemporary, trendy visual style with bold colors and dynamic compositions. Great for Gen-Z brands and forward-thinking companies.',
  'Luxury': 'High-end, elegant aesthetics with premium feel. Perfect for luxury brands, high-ticket services, and upscale marketing.',
  'Dark': 'Sophisticated dark-themed visuals. Ideal for gaming, fintech, SaaS dark mode UIs, and modern tech brands.'
};

const ASPECT_RATIO_DESCRIPTIONS: Record<string, string> = {
  '1:1': 'Square format - Perfect for social media feed posts (Instagram, LinkedIn, Facebook), product thumbnails, and profile images.',
  '4:5': 'Vertical portrait - Ideal for mobile ads, Instagram Stories (slightly wider), and mobile app marketing.',
  '9:16': 'Full mobile story - Optimized for vertical video platforms (TikTok, Instagram Reels, YouTube Shorts) and mobile-first content.',
  '16:9': 'Wide landscape - Standard for desktop web, YouTube thumbnails, presentation slides, and web banner ads.',
  '2:3': 'Pinterest-style - Optimized specifically for Pinterest pins and tall vertical designs. Pinterest favors this ratio.',
  '3:2': 'Classic landscape - Horizontal orientation, slightly wider than 16:9. Good for presentations and print.',
  '4:3': 'Standard screen - Traditional aspect ratio for older displays and some professional work.',
  '3:4': 'Portrait variant - Taller vertical format, similar to 9:16 but slightly wider.',
  '5:4': 'Classic monitor - Historical standard monitor ratio, useful for certain layouts.',
  '1:4': 'Ultra-tall - Extreme vertical for tall banners and narrow columns.',
  '4:1': 'Ultra-wide - Extreme horizontal for panoramic and wide banners.'
};

export default function GenerateImagePage() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Product Photo');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [isPremium, setIsPremium] = useState(false);
  const [imageSize, setImageSize] = useState('1K');
  const [thinkingLevel, setThinkingLevel] = useState('minimal');
  
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleSelectImage = (index: number) => {
    dispatch(
      setImageEditorState({
        imageUrls,
        selectedIndex: index,
        basePrompt: prompt,
        style,
        aspectRatio,
        previewUrl: imageUrls[index],
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setImageUrls([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          style,
          aspectRatio,
          numberOfImages,
          imageSize,
          thinkingLevel,
          quality: isPremium ? 'Premium' : 'Standard',
          referenceImages
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setImageUrls(data.imageUrls || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-${Date.now()}-${index}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleEnhancePrompt = () => {
    // Basic auto-enhancement for MVP
    if (!prompt.includes("highly detailed")) {
      setPrompt(prev => prev.trim() + ", highly detailed, cinematic lighting, 8k resolution, photorealistic.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-6 shrink-0">
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
        <Card className="h-full flex flex-col shadow-sm border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-3 shrink-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="w-4 h-4" />
              Parameters
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <form id="generate-form" onSubmit={handleGenerate} className="flex flex-col gap-5 p-4">
              
              {/* 1. Prompt */}
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

              {/* 2. Reference Images */}
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

              {/* 3. Style */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Style</Label>
                <RadioGroup value={style} onValueChange={setStyle} className="grid grid-cols-3 gap-2">
                  {Object.keys(STYLE_DESCRIPTIONS).map((styleId) => (
                    <div key={styleId} className="relative group">
                      <Label
                        className={`cursor-pointer rounded-md border-2 p-2 text-center transition-all block h-full ${
                          style === styleId ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
                        }`}
                        title={STYLE_DESCRIPTIONS[styleId]}
                      >
                        <RadioGroupItem value={styleId} className="sr-only" />
                        <span className="text-[10px] font-medium leading-tight">{styleId}</span>
                      </Label>
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 max-w-xs">
                        {STYLE_DESCRIPTIONS[styleId]}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
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
              disabled={isLoading || !prompt.trim()}
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

        {/* Right Area - Results */}
        <div className="flex flex-col h-full gap-4 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col shadow-md">
            <CardHeader className="border-b bg-muted/30 pb-2 pt-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Results
                </CardTitle>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              <CardContent className="p-4 relative min-h-[400px]">
                {/* Background grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
                
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center min-h-[350px]">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <p className="text-xs font-medium animate-pulse">
                        Painting your imagination...
                      </p>
                    </div>
                  ) : imageUrls.length > 0 ? (
                    <div className={`w-full grid gap-3 ${imageUrls.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                      {imageUrls.map((url, i) => (
                        <div key={i} className="group relative rounded-lg overflow-hidden border shadow-sm bg-muted/20 flex items-center justify-center aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={url} 
                            alt={`${prompt} - variation ${i+1}`} 
                            onClick={() => handleSelectImage(i)}
                            className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                          />
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleDownload(url, i)} className="text-xs h-8">
                              <Download className="w-3 h-3 mr-1" /> Download
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handleSelectImage(i)} className="text-xs h-8">
                              <Settings2 className="w-3 h-3 mr-1" /> Edit image
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-8 bg-transparent text-white border-white/50 hover:bg-white/20 hover:text-white" onClick={handleGenerate}>
                              <Wand2 className="w-3 h-3 mr-1" /> Regenerate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground/60 p-6 text-center">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-1">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                      </div>
                      <h3 className="text-sm font-medium text-foreground">Awaiting Instructions</h3>
                      <p className="text-xs max-w-xs">Configure parameters and click Generate to see your marketing assets come to life.</p>
                    </div>
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
