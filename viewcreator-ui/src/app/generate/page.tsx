"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  setImageEditorState, 
  addGenerationToHistory
} from '@/store/slices/image-editor-slice';
import type { Template, GenerationHistoryItem, GenerateParams, GenerateVideoParams, MediaType } from '@/types';
import { getTemplates, generateImages as apiGenerateImages, generateVideo as apiGenerateVideo } from '@/services';
import { Wand2, Video, Image } from 'lucide-react';

import { GenerateForm } from '@/components/generate/generate-form';
import { HistoryPanel } from '@/components/generate/history-panel';

export default function GenerateImagePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const editorState = useAppSelector((state) => state.imageEditor);

  const [mounted, setMounted] = useState(false);

  // Shared params
  const [prompt, setPrompt] = useState(editorState.basePrompt || '');

  // Image-only params
  const [aspectRatio, setAspectRatio] = useState(editorState.aspectRatio || '1:1');
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [imageSize, setImageSize] = useState('1K');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  // Video-only params
  const [duration, setDuration] = useState(6);

  // Media type toggle
  const [mediaType, setMediaType] = useState<MediaType>('image');

  const [imageUrls, setImageUrls] = useState<string[]>(editorState.imageUrls || []);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const { getToken } = useAuth();

  const getSelectedTemplateStyle = () => {
    const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
    return activeTemplate?.config?.stylePreset || 'None';
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
    setMediaType(item.mediaType || 'image');
    if (item.duration) setDuration(item.duration);
    if (item.templateId) {
      setSelectedTemplateId(item.templateId);
    } else {
      setSelectedTemplateId(null);
    }
  };

  const handleSelectImageFromHistory = (item: GenerationHistoryItem, index: number) => {
    if (item.mediaType === 'video') {
      // For video items, navigate to edit with video state
      dispatch(
        setImageEditorState({
          videoUrls: item.videoUrls || [],
          mediaType: 'video',
          basePrompt: item.prompt,
          style: item.style || 'None',
          aspectRatio: item.aspectRatio,
          previewUrl: item.videoUrls?.[0] || null,
          activeHistoryItemId: item.id,
        })
      );
      router.push('/generate/edit');
      return;
    }
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
          thinkingLevel: 'minimal',
          quality: 'Standard',
          mediaType: 'image',
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

  const generateVideo = async (params: GenerateVideoParams) => {
    setIsLoading(true);
    setError(null);
    setVideoUrls([]);

    try {
      const token = await getToken().catch(() => undefined) || undefined;
      const result = await apiGenerateVideo(params, token);
      setVideoUrls(result.videoUrls);

      if (result.videoUrls.length > 0) {
        const historyItem: GenerationHistoryItem = {
          id: `vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          prompt: params.prompt,
          style: params.style,
          aspectRatio: params.aspectRatio,
          numberOfImages: 1,
          imageSize: '1K',
          thinkingLevel: 'minimal',
          quality: params.quality,
          mediaType: 'video',
          imageUrls: [],
          videoUrls: result.videoUrls,
          duration: result.duration,
          templateId: params.templateId
        };
        dispatch(addGenerationToHistory(historyItem));
        toast.success("Video generated successfully!");
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

    if (mediaType === 'video') {
      await generateVideo({
        prompt,
        style: getSelectedTemplateStyle(),
        aspectRatio,
        quality: 'Standard',
        duration,
        templateId: selectedTemplateId
      });
    } else {
      await generateImages({
        prompt,
        style: getSelectedTemplateStyle(),
        aspectRatio,
        numberOfImages,
        imageSize,
        thinkingLevel: 'minimal',
        quality: 'Standard',
        referenceImages,
        templateId: selectedTemplateId
      });
    }
  };

  const handleRegenerate = async (item: GenerationHistoryItem) => {
    handleLoadSettings(item);
    if (item.mediaType === 'video') {
      await generateVideo({
        prompt: item.prompt,
        style: item.style || 'None',
        aspectRatio: item.aspectRatio,
        quality: item.quality,
        duration: item.duration || 6,
        templateId: item.templateId || null
      });
    } else {
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
    }
  };

  const handleEnhancePrompt = () => {
    if (!prompt.includes("highly detailed")) {
      setPrompt(prev => prev.trim() + ", highly detailed, cinematic lighting, 8k resolution, photorealistic.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* ── Sticky Header ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50 shrink-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Wand2 className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">AI Studio</h1>
              <p className="text-xs text-muted-foreground truncate">Generate marketing visuals and videos</p>
            </div>

            {/* Media type toggle */}
            <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-0.5 border border-border/50 ml-auto shrink-0">
              <button
                type="button"
                onClick={() => setMediaType('image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all duration-200 ${
                  mediaType === 'image'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Image className="size-3.5" />
                Image
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all duration-200 ${
                  mediaType === 'video'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Video className="size-3.5" />
                Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid lg:grid-cols-[400px_1fr] gap-6 h-full">
            <div className="self-start">
            <GenerateForm
              prompt={prompt}
              setPrompt={setPrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              numberOfImages={numberOfImages}
              setNumberOfImages={setNumberOfImages}
              imageSize={imageSize}
              setImageSize={setImageSize}
              referenceImages={referenceImages}
              setReferenceImages={setReferenceImages}
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              setSelectedTemplateId={setSelectedTemplateId}
              isLoadingTemplates={isLoadingTemplates}
              isLoading={isLoading}
              mounted={mounted}
              error={error}
              handleGenerate={handleGenerate}
              handleEnhancePrompt={handleEnhancePrompt}
              mediaType={mediaType}
              duration={duration}
              setDuration={setDuration}
            />
            </div>

            <HistoryPanel
              isLoading={isLoading}
              loadingParams={{
                prompt,
                aspectRatio,
                imageSize,
                numberOfImages,
                mediaType
              }}
              handleLoadSettings={handleLoadSettings}
              handleRegenerate={handleRegenerate}
              handleSelectImageFromHistory={handleSelectImageFromHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
