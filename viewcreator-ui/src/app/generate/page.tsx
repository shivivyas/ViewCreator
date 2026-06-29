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
import type { Template, GenerationHistoryItem, GenerateParams } from '@/types';
import { getTemplates, generateImages as apiGenerateImages } from '@/services';
import { Wand2 } from 'lucide-react';

import { GenerateForm } from '@/components/generate/generate-form';
import { HistoryPanel } from '@/components/generate/history-panel';

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

  const [imageUrls, setImageUrls] = useState<string[]>(editorState.imageUrls || []);
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

  const handleEnhancePrompt = () => {
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
          <GenerateForm
            prompt={prompt}
            setPrompt={setPrompt}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            numberOfImages={numberOfImages}
            setNumberOfImages={setNumberOfImages}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            imageSize={imageSize}
            setImageSize={setImageSize}
            thinkingLevel={thinkingLevel}
            setThinkingLevel={setThinkingLevel}
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
          />

          <HistoryPanel
            isLoading={isLoading}
            loadingParams={{
              prompt,
              aspectRatio,
              imageSize,
              isPremium,
              thinkingLevel,
              numberOfImages
            }}
            handleLoadSettings={handleLoadSettings}
            handleRegenerate={handleRegenerate}
            handleSelectImageFromHistory={handleSelectImageFromHistory}
          />
        </div>
      </div>
    </div>
  );
}
