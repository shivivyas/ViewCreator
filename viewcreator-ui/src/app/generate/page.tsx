"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  setImageEditorState, 
  addGenerationToHistory
} from '@/store/slices/image-editor-slice';
import type { Template, GenerationHistoryItem, GenerateParams, GenerateVideoParams, GenerateImagesResponse, GenerateVideoResponse, MediaType } from '@/types';
import { getTemplates, generateImages as apiGenerateImages, generateVideo as apiGenerateVideo, getUserCreations } from '@/services';
import { Wand2, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { calculateGenerationCost, calculateVideoCost } from 'viewcreator-shared';
import { Button } from '@/components/ui/button';
import { CreditGateModal, type CreditPack } from '@/components/shared/credit-gate-modal';
import { useCreditGate } from '@/hooks/use-credit-gate';
import { usePostPurchaseResume, type PendingGenerate } from '@/hooks/use-post-purchase-resume';
import { safeToken } from '@/lib/helpers';

import { GenerateForm, type GenerateFormData } from '@/components/generate/generate-form';
import { HistoryPanel } from '@/components/generate/history-panel';

/** Credit packs shown in the credit-gate modal. */
const CREDIT_PACKS: CreditPack[] = [
  { credits: 100, price: "$9",   id: "pdt_0NiWo2CjaeJBzhplGXxWT" },
  { credits: 5,   price: "$0.05", id: "pdt_0NiZQ6jp5QSl7ZLZVlZ77" },
];

/** Generate a unique history item ID. */
function historyId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** Build a GenerationHistoryItem from generation params and API result. */
function buildHistoryItem(
  params: GenerateParams | GenerateVideoParams,
  result: GenerateImagesResponse | GenerateVideoResponse,
  mediaType: 'image' | 'video'
): GenerationHistoryItem {
  const isVideo = mediaType === 'video';
  const videoResult = isVideo ? (result as GenerateVideoResponse) : null;
  const imageResult = isVideo ? null : (result as GenerateImagesResponse);
  const p = params as any;

  return {
    id: historyId(isVideo ? 'vid' : 'gen'),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    prompt: p.prompt,
    style: p.style,
    aspectRatio: p.aspectRatio,
    numberOfImages: isVideo ? 1 : (p.numberOfImages ?? 1),
    imageSize: isVideo ? '1K' : p.imageSize,
    thinkingLevel: 'minimal',
    quality: isVideo ? p.quality : 'Standard',
    mediaType,
    imageUrls: isVideo ? [] : (imageResult?.imageUrls ?? []),
    videoUrls: isVideo ? (videoResult?.videoUrls ?? []) : undefined,
    duration: isVideo ? videoResult!.duration : undefined,
    templateId: p.templateId ?? null,
    creationId: result.creationId ?? undefined,
    s3Urls: result.s3Urls,
    referenceImages: !isVideo && p.referenceImages?.length ? [...p.referenceImages] : undefined,
  };
}

function GenerateImagePageContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorState = useAppSelector((state) => state.imageEditor);
  const { isSignedIn } = useUser();
  const { openSignUp } = useClerk();

  const [mounted, setMounted] = useState(false);

  const { getToken } = useAuth();

  // ── Credit Gate Hook ────────────────────────────────────────
  const credit = useCreditGate(getToken);

  // ── Post-Purchase Resume ──────────────────────────────────
  const onGenerate = useCallback(async (pg: PendingGenerate) => {
    setIsLoading(true);
    if (pg.type === 'image') {
      const ip = pg.params as GenerateParams;
      setPrompt(ip.prompt);
      setAspectRatio(ip.aspectRatio);
      setNumberOfImages(ip.numberOfImages);
      setImageSize(ip.imageSize);
      setReferenceImages(ip.referenceImages || []);
      if (ip.templateId) setSelectedTemplateId(ip.templateId);
      setMediaType('image');
    } else {
      const vp = pg.params as GenerateVideoParams;
      setPrompt(vp.prompt);
      setAspectRatio(vp.aspectRatio);
      setDuration(vp.duration);
      if (vp.templateId) setSelectedTemplateId(vp.templateId);
      setMediaType('video');
    }

    try {
      const token = await getToken();
      if (pg.type === 'video') {
        const vp = pg.params as GenerateVideoParams;
        const result = await apiGenerateVideo(vp, token || undefined);
        if (result.videoUrls.length > 0) {
          dispatch(addGenerationToHistory(buildHistoryItem(vp, result, 'video')));
          setVideoUrls(result.videoUrls);
          toast.success('Video generated successfully!');
        }
      } else {
        const ip = pg.params as GenerateParams;
        const result = await apiGenerateImages(ip, token || undefined);
        const urls = result.imageUrls;
        if (urls.length > 0) {
          dispatch(addGenerationToHistory(buildHistoryItem(ip, result, 'image')));
          setImageUrls(urls);
          toast.success(`Successfully generated ${urls.length} image(s)!`);
        }
      }
    } catch {
      // Error already surfaced by the generation functions
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, getToken]);

  usePostPurchaseResume({ getToken, credit, onGenerate });

  // Page-level state (needed for header toggle + editor state effect)
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [prompt, setPrompt] = useState(editorState.basePrompt || '');
  const [aspectRatio, setAspectRatio] = useState(editorState.aspectRatio || '1:1');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Form state sync (load settings from history / URL params into the form)
  const [loadKey, setLoadKey] = useState(0);
  const [loadValues, setLoadValues] = useState<Partial<GenerateFormData> | undefined>();

  const [imageUrls, setImageUrls] = useState<string[]>(editorState.imageUrls || []);
  const [, setVideoUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const initialSelectionDone = useRef(false);

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
        const token = await safeToken(getToken);
        const loadedTemplates = await getTemplates(token);
        setTemplates(loadedTemplates);
      } catch (err) {
        console.error('Error fetching templates:', err);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [getToken]);

  // Fetch persisted creations on mount and populate Redux history
  useEffect(() => {
    const fetchCreations = async () => {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) return;
        const creations = await getUserCreations(token);
        if (creations.length === 0) return;

        // Build history items from persisted creations
        const historyItems: GenerationHistoryItem[] = creations.map((c) => {
          const isVideo = c.mediaType === 'video';
          return {
            id: `persisted-${c.id}`,
            creationId: c.id,
            timestamp: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            prompt: c.prompt,
            style: c.style,
            aspectRatio: c.aspectRatio,
            numberOfImages: c.numberOfImages,
            imageSize: c.imageSize,
            thinkingLevel: c.thinkingLevel,
            quality: c.quality as 'Standard',
            mediaType: c.mediaType,
            imageUrls: isVideo ? [] : c.s3Urls,
            videoUrls: isVideo ? c.s3Urls : undefined,
            duration: c.duration ?? undefined,
            templateId: c.templateId,
            referenceImages: c.referenceImages.length > 0 ? c.referenceImages : undefined,
            s3Urls: c.s3Urls,
          };
        });

        // Merge: only add items that don't already exist in history (by creationId)
        dispatch((thunkDispatch, getState) => {
          const existing = getState().imageEditor.history;
          const existingIds = new Set(
            existing.map((h) => h.creationId).filter(Boolean)
          );
          const newItems = historyItems.filter((h) => !existingIds.has(h.creationId));
          if (newItems.length > 0) {
            // API returns newest-first. Since addGenerationToHistory prepends,
            // iterate in reverse (oldest → newest) so prepend produces correct
            // newest-first order matching freshly-generated items.
            for (let i = newItems.length - 1; i >= 0; i--) {
              thunkDispatch(addGenerationToHistory(newItems[i]));
            }
          }
        });
      } catch (err) {
        console.error('Error fetching persisted creations:', err);
      }
    };
    fetchCreations();
  }, [isSignedIn, getToken, dispatch]);

  // ── URL template param: set initial form values ──────
  useEffect(() => {
    if (templates.length === 0) return;
    const urlTemplateId = searchParams.get('templateId');
    if (!urlTemplateId) {
      // Default to first template
      const firstId = templates[0].id;
      setSelectedTemplateId(firstId);
      setLoadValues({ selectedTemplateId: firstId });
      setLoadKey(1);
      return;
    }
    const target = templates.find((t) => t.id === urlTemplateId);
    if (target) {
      setSelectedTemplateId(target.id);
      if (target.media_type) setMediaType(target.media_type);
      const vals: Partial<GenerateFormData> = { selectedTemplateId: target.id };
      if (target.config?.aspectRatio) {
        vals.aspectRatio = target.config.aspectRatio;
        setAspectRatio(target.config.aspectRatio);
      }
      if (target.config?.recommendedPrompts?.length) {
        vals.prompt = target.config.recommendedPrompts[0];
        setPrompt(target.config.recommendedPrompts[0]);
      }
      setLoadValues(vals);
      setLoadKey(1);
    } else {
      setSelectedTemplateId(templates[0].id);
      setLoadValues({ selectedTemplateId: templates[0].id });
      setLoadKey(1);
    }
  // Only run once on mount when templates first load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length === 0]);

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
    setMediaType(item.mediaType || 'image');
    setSelectedTemplateId(item.templateId ?? null);
    setLoadValues({
      prompt: item.prompt,
      aspectRatio: item.aspectRatio,
      numberOfImages: item.numberOfImages,
      imageSize: item.imageSize,
      selectedTemplateId: item.templateId,
      duration: item.duration,
    });
    setLoadKey((k) => k + 1);
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
      const token = await safeToken(getToken);
      const result = await apiGenerateImages(params, token);
      const generatedUrls = result.imageUrls;
      setImageUrls(generatedUrls);

      if (generatedUrls.length > 0) {
        dispatch(addGenerationToHistory(buildHistoryItem(params, result, 'image')));
        toast.success(`Successfully generated ${generatedUrls.length} image(s)!`);
        window.dispatchEvent(new CustomEvent('payment-updated'));
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
      const token = await safeToken(getToken);
      const result = await apiGenerateVideo(params, token);
      setVideoUrls(result.videoUrls);

      if (result.videoUrls.length > 0) {
        dispatch(addGenerationToHistory(buildHistoryItem(params, result, 'video')));
        toast.success("Video generated successfully!");
        window.dispatchEvent(new CustomEvent('payment-updated'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (data: GenerateFormData) => {
    const {
      prompt,
      aspectRatio,
      numberOfImages,
      imageSize,
      referenceImages,
      selectedTemplateId,
      mediaType: mt,
      duration,
    } = data;

    // Sync page-level state from form submission
    setPrompt(prompt);
    setAspectRatio(aspectRatio);
    setSelectedTemplateId(selectedTemplateId);

    if (!prompt.trim()) return;

    // ── Guest Gate ─────────────────────────────────────────
    if (!isSignedIn) {
      openSignUp();
      return;
    }

    // ── Credit Check ───────────────────────────────────────
    if (mt === 'image') {
      const { total: cost } = calculateGenerationCost(numberOfImages);
      const hasCredits = await credit.checkCredits(cost);
      if (!hasCredits) {
        const pending = {
          type: 'image' as const,
          params: {
            prompt,
            style: getSelectedTemplateStyle(),
            aspectRatio,
            numberOfImages,
            imageSize,
            thinkingLevel: 'minimal',
            quality: 'Standard' as const,
            referenceImages,
            templateId: selectedTemplateId,
          },
        };
        credit.setPendingGenerate(pending);
        sessionStorage.setItem('pending_generate', JSON.stringify(pending));
        return;
      }
    } else {
      const { total: cost } = calculateVideoCost();
      const hasCredits = await credit.checkCredits(cost);
      if (!hasCredits) {
        const pending = {
          type: 'video' as const,
          params: {
            prompt,
            style: getSelectedTemplateStyle(),
            aspectRatio,
            quality: 'Standard' as const,
            duration,
            templateId: selectedTemplateId,
          },
        };
        credit.setPendingGenerate(pending);
        sessionStorage.setItem('pending_generate', JSON.stringify(pending));
        return;
      }
    }

    // ── Proceed with generation ────────────────────────────
    if (mt === 'video') {
      await generateVideo({
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

  // handleEnhancePrompt moved into GenerateForm (form now owns its prompt state)

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
                <ImageIcon className="size-3.5" />
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
              templates={templates}
              isLoadingTemplates={isLoadingTemplates}
              isLoading={isLoading}
              mounted={mounted}
              isSignedIn={!!isSignedIn}
              error={error}
              mediaType={mediaType}
              onSubmit={handleGenerate}
              loadKey={loadKey}
              loadValues={loadValues}
              onPromptChange={setPrompt}
              onAspectRatioChange={setAspectRatio}
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

      {/* ── Credit Gate Modal ────────────────────────────────── */}
      <CreditGateModal
        open={credit.showCreditModal}
        loading={credit.creditModalLoading}
        userBalance={credit.userBalance}
        requiredCredits={credit.requiredCredits}
        creditPacks={CREDIT_PACKS}
        onBuy={credit.buyCredits}
        onClose={credit.dismissCreditGate}
      />
    </div>
  );
}
export default function GenerateImagePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    }>
      <GenerateImagePageContent />
    </Suspense>
  );
}