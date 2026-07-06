"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  setImageEditorState, 
  addGenerationToHistory
} from '@/store/slices/image-editor-slice';
import type { Template, GenerationHistoryItem, GenerateParams, GenerateVideoParams, MediaType } from '@/types';
import { getTemplates, generateImages as apiGenerateImages, generateVideo as apiGenerateVideo, getUserCreations } from '@/services';
import { Wand2, Video, Image as ImageIcon, Loader2, Zap, X } from 'lucide-react';
import { getBalance, createCheckoutSession, getPlans } from '@/services/api/payment-service';
import { Button } from '@/components/ui/button';

import { GenerateForm } from '@/components/generate/generate-form';
import { HistoryPanel } from '@/components/generate/history-panel';

/**
 * Call the confirm-purchase endpoint to grant credits immediately.
 * Uses a unique idempotency key per purchase flow to prevent double-grant
 * on page refresh while still allowing repeat purchases of the same plan.
 */
async function grantPurchaseCredits(planId: string, token: string, idempotencyKey?: string) {
  const body: Record<string, any> = { plan_id: planId };
  if (idempotencyKey) body.idempotency_key = idempotencyKey;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/payments/confirm-purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log('[Purchase Confirm]', data);
  if (!res.ok) console.error('[Purchase Confirm] Failed:', data);
}

function GenerateImagePageContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorState = useAppSelector((state) => state.imageEditor);
  const { isSignedIn } = useUser();
  const { openSignUp } = useClerk();

  const [mounted, setMounted] = useState(false);

  // ── Credit Gate State ───────────────────────────────────────
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditModalLoading, setCreditModalLoading] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState<{
    type: 'image';
    params: GenerateParams;
  } | {
    type: 'video';
    params: GenerateVideoParams;
  } | null>(null);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [requiredCredits, setRequiredCredits] = useState(0);

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
  const [, setVideoUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const initialSelectionDone = useRef(false);
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

  // Check for post-purchase redirect (checkout=success param)
  useEffect(() => {
    const checkout = searchParams.get('checkout');

    if (checkout === 'success') {
      // Remove query params from URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      url.searchParams.delete('plan');
      url.searchParams.delete('status');
      url.searchParams.delete('subscription_id');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());

      toast.success('Purchase successful! Confirming credits...');

      // Refresh balance in header
      window.dispatchEvent(new CustomEvent('payment-updated'));

      console.log('[Purchase Flow] checkout=success detected, grantCredits starting', {
        pendingPlanId: sessionStorage.getItem('pending_plan_id'),
        pendingKey: sessionStorage.getItem('pending_idempotency_key'),
        pendingGenerate: sessionStorage.getItem('pending_generate') ? 'present' : 'absent',
      });

      // Step 1: Always grant credits (whether or not there's a pending generation)
      const grantCredits = async () => {
        const token = await getToken();
        if (!token) return;
        const storedPlanId = sessionStorage.getItem('pending_plan_id');
        const storedKey = sessionStorage.getItem('pending_idempotency_key') || undefined;
        console.log('[Purchase Flow] grantCredits executing', { storedPlanId, storedKey });
        if (storedPlanId) {
          try {
            await grantPurchaseCredits(storedPlanId, token, storedKey);
            console.log('[Purchase Flow] grantCredits completed successfully');
          } catch (e) { console.error('[Purchase Flow] grantCredits failed', e); }
          sessionStorage.removeItem('pending_plan_id');
          sessionStorage.removeItem('pending_idempotency_key');
          console.log('[Purchase Flow] sessionStorage cleared after grantCredits');
        } else {
          console.log('[Purchase Flow] grantCredits: no pending_plan_id found, skipping');
        }
      };
      grantCredits();

      // Restore pending generation from sessionStorage (survives Dodo redirect)
      const stored = sessionStorage.getItem('pending_generate');
      const savedPending: {
        type: 'image' | 'video';
        params: GenerateParams | GenerateVideoParams;
      } | null = stored ? JSON.parse(stored) : null;

      if (savedPending) {
        const pg = savedPending;
        console.log('[Purchase Flow] savedPending found, resumeGeneration will start', {
          type: pg.type,
          prompt: (pg.params as any).prompt?.substring(0, 50),
        });

        const resumeGeneration = async () => {
          console.log('[Purchase Flow] resumeGeneration executing');
          try {
            const token = await getToken();
            if (!token) return;

            // Step 1: Check balance (credits were already granted by grantCredits() above)
            const status = await getBalance(token);
            const balance = status.credits?.balance ?? 0;
            setUserBalance(balance);

            // Restore form fields from saved pending generation so the UI
            // shows the prompt/settings and HistoryPanel shows loading skeleton.
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

            const cost = pg.type === 'video' ? 5
              : 1 * Math.min(Math.max(1, (pg.params as GenerateParams).numberOfImages), 4);

            if (balance >= cost) {
              toast.success('Credits confirmed. Starting generation...');
              if (pg.type === 'video') {
                const vp = pg.params as GenerateVideoParams;
                const result = await apiGenerateVideo(vp, await getToken() || undefined);
                if (result.videoUrls.length > 0) {
                  const historyItem: GenerationHistoryItem = {
                    id: `vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    prompt: vp.prompt,
                    style: vp.style,
                    aspectRatio: vp.aspectRatio,
                    numberOfImages: 1,
                    imageSize: '1K',
                    thinkingLevel: 'minimal',
                    quality: vp.quality,
                    mediaType: 'video',
                    imageUrls: [],
                    videoUrls: result.videoUrls,
                    duration: result.duration,
                    templateId: vp.templateId,
                    creationId: result.creationId ?? undefined,
                    s3Urls: result.s3Urls,
                  };
                  dispatch(addGenerationToHistory(historyItem));
                  setVideoUrls(result.videoUrls);
                  toast.success('Video generated successfully!');
                }
                setIsLoading(false);
              } else {
                const ip = pg.params as GenerateParams;
                const result = await apiGenerateImages(ip, await getToken() || undefined);
                const urls = result.imageUrls;
                if (urls.length > 0) {
                  const historyItem: GenerationHistoryItem = {
                    id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    prompt: ip.prompt,
                    style: ip.style,
                    aspectRatio: ip.aspectRatio,
                    numberOfImages: ip.numberOfImages,
                    imageSize: ip.imageSize,
                    thinkingLevel: 'minimal',
                    quality: 'Standard',
                    mediaType: 'image',
                    imageUrls: urls,
                    referenceImages: ip.referenceImages.length > 0 ? [...ip.referenceImages] : undefined,
                    templateId: ip.templateId,
                    creationId: result.creationId ?? undefined,
                    s3Urls: result.s3Urls,
                  };
                  dispatch(addGenerationToHistory(historyItem));
                  setImageUrls(urls);
                  toast.success(`Successfully generated ${urls.length} image(s)!`);
                }
                setIsLoading(false);
              }
              setPendingGenerate(null);
              sessionStorage.removeItem('pending_generate');
              setShowCreditModal(false);
            } else {
              // Poll a few more times as fallback (webhook race)
              toast.info('Waiting for credit confirmation...');
              let retries = 0;
              const poll = async () => {
                if (retries >= 10) {
                  setRequiredCredits(cost);
                  setShowCreditModal(true);
                  setIsLoading(false);
                  return;
                }
                retries++;
                const recheck = await getBalance(token);
                if ((recheck.credits?.balance ?? 0) >= cost) {
                  setUserBalance(recheck.credits?.balance ?? 0);
                  setShowCreditModal(false);
                  setPendingGenerate(null);
                  setIsLoading(false);
                  sessionStorage.removeItem('pending_generate');
                  toast.success('Credits confirmed! Try generating again.');
                } else {
                  setTimeout(poll, 2000);
                }
              };
              poll();
            }
          } catch {
            // Silently fail — modal will show again
            setIsLoading(false);
          }
        };

        resumeGeneration();
      }
    }
  }, [searchParams, pendingGenerate, getToken, dispatch]);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const token = await getToken().catch(() => undefined) || undefined;
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
            quality: c.quality as 'Standard' | 'Premium',
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
            // Add them to the end (newest first from API, oldest creations at bottom)
            newItems.forEach((item) => {
              thunkDispatch(addGenerationToHistory(item));
            });
          }
        });
      } catch (err) {
        console.error('Error fetching persisted creations:', err);
      }
    };
    fetchCreations();
  }, [isSignedIn, getToken, dispatch]);

  useEffect(() => {
    if (templates.length === 0 || initialSelectionDone.current) return;
    const rafId = requestAnimationFrame(() => {
      const urlTemplateId = searchParams.get('templateId');

      if (urlTemplateId) {
        const target = templates.find((t) => t.id === urlTemplateId);
        if (target) {
          setSelectedTemplateId(target.id);
          if (target.media_type) setMediaType(target.media_type);
          if (target.config?.aspectRatio) setAspectRatio(target.config.aspectRatio);
          if (target.config?.recommendedPrompts?.length && !prompt.trim()) {
            setPrompt(target.config.recommendedPrompts[0]);
          }
          initialSelectionDone.current = true;
          return;
        }
      }

      // No matching templateId in URL, default to first
      setSelectedTemplateId(templates[0].id);
      initialSelectionDone.current = true;
    });
    return () => cancelAnimationFrame(rafId);
  }, [templates, searchParams, prompt]);

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
      const result = await apiGenerateImages(params, token);
      const generatedUrls = result.imageUrls;
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
          templateId: params.templateId,
          creationId: result.creationId ?? undefined,
          s3Urls: result.s3Urls,
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
          templateId: params.templateId,
          creationId: result.creationId ?? undefined,
          s3Urls: result.s3Urls,
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

  /**
   * Check credit balance before generation.
   * Returns true if the user has enough credits (or is subscribed — legacy).
   */
  const checkCreditsBeforeGenerate = useCallback(async (cost: number): Promise<boolean> => {
    try {
      const token = await getToken();
      if (!token) return false;
      const status = await getBalance(token);
      const balance = status.credits?.balance ?? 0;
      setUserBalance(balance);

      if (balance < cost) {
        setRequiredCredits(cost);
        setShowCreditModal(true);
        return false;
      }

      return true;
    } catch {
      // If balance check fails, allow generation to proceed
      return true;
    }
  }, [getToken]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // ── Guest Gate ─────────────────────────────────────────
    if (!isSignedIn) {
      openSignUp();
      return;
    }

    // ── Credit Check ───────────────────────────────────────
    if (mediaType === 'image') {
      const cost = 1 * Math.min(Math.max(1, numberOfImages), 4); // 1 credit per standard image
      const hasCredits = await checkCreditsBeforeGenerate(cost);
      if (!hasCredits) {
        // Save form state for resume after purchase
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
        setPendingGenerate(pending);
        sessionStorage.setItem('pending_generate', JSON.stringify(pending));
        return;
      }
    } else {
      const hasCredits = await checkCreditsBeforeGenerate(5); // 5 credits per video
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
        setPendingGenerate(pending);
        sessionStorage.setItem('pending_generate', JSON.stringify(pending));
        return;
      }
    }

    // ── Proceed with generation ────────────────────────────
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
              prompt={prompt}
              setPrompt={setPrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              numberOfImages={numberOfImages}
              setNumberOfImages={setNumberOfImages}
              imageSize={imageSize}
              setImageSize={setImageSize}
              referenceImages={referenceImages}
              isSignedIn={!!isSignedIn}
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

      {/* ── Credit Gate Modal ────────────────────────────────── */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-xl mx-4">
            {/* Close */}
            <button
              onClick={() => {
                setShowCreditModal(false);
                setPendingGenerate(null);
                sessionStorage.removeItem('pending_generate');
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            {/* Icon */}
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950">
              <Zap className="size-6 text-amber-500" />
            </div>

            {/* Title */}
            <h3 className="text-center text-lg font-semibold">
              Buy Credits
            </h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {userBalance !== null && userBalance > 0 ? (
                <>You have <strong>{userBalance.toLocaleString()}</strong> credits but need <strong>{requiredCredits}</strong> for this generation.</>
              ) : (
                <>You don&apos;t have enough credits to generate content.</>
              )}
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Purchase credits to start creating.
            </p>

            {/* CTA — show all available credit packs */}
            <div className="mt-6 space-y-3">
              {(() => {
                const [first, second] = [
                  { credits: 100, price: "$9", id: "pdt_0NiWo2CjaeJBzhplGXxWT" },
                  { credits: 5, price: "$0.05", id: "pdt_0NiZQ6jp5QSl7ZLZVlZ77" },
                ];
                return [first, second].map((pack) => (
                  <Button
                    key={pack.id}
                    size="lg"
                    className="w-full rounded-xl text-base"
                    disabled={creditModalLoading}
                    onClick={async () => {
                      setCreditModalLoading(true);
                      try {
                        const token = await getToken();
                        if (!token) throw new Error('Not authenticated');

                        const plans = await getPlans();
                        const creditPlan = plans.creditPacks.find(p => p.dodo_product_id === pack.id);
                        if (!creditPlan) throw new Error('No credit plan available');

                        sessionStorage.setItem('pending_plan_id', creditPlan.id);
                        const successUrl = `${window.location.origin}/generate?checkout=success`;
                        const { checkout_url } = await createCheckoutSession(creditPlan.id, token, successUrl);
                        window.location.href = checkout_url;
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
                        setCreditModalLoading(false);
                      }
                    }}
                  >
                    {creditModalLoading ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Opening checkout...</>
                    ) : (
                      `Buy ${pack.credits} Credits — ${pack.price}`
                    )}
                  </Button>
                ));
              })()}
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => {
                  setShowCreditModal(false);
                  setPendingGenerate(null);
                  sessionStorage.removeItem('pending_generate');
                }}
              >
                Cancel
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              After purchase, your generation will start automatically.
            </p>
          </div>
        </div>
      )}
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