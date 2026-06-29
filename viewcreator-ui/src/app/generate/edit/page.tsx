"use client";

import { useRef, useState, useEffect, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setImageEditorState, updateHistoryItemImages } from "@/store/slices/image-editor-slice";
import { generateImages } from "@/services";

import { EditorHeader } from "@/components/editor/editor-header";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorCanvas } from "@/components/editor/editor-canvas";

export default function EditImagePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const editorState = useAppSelector((state) => state.imageEditor);
  const {
    imageUrls,
    selectedIndex,
    basePrompt,
    style,
    aspectRatio,
    previewUrl,
  } = editorState;

  const selectedImage = typeof selectedIndex === "number" ? imageUrls[selectedIndex] : null;

  // Local state initialized with fallback from redux store
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
    () => previewUrl || selectedImage || null
  );
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save / Unsaved change state
  const [lastSavedUrl, setLastSavedUrl] = useState<string | null>(previewUrl || selectedImage || null);
  const [isSaved, setIsSaved] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Undo/Redo Edit Session History Stack
  const [history, setHistory] = useState<string[]>(() => {
    const initialImg = previewUrl || selectedImage;
    return initialImg ? [initialImg] : [];
  });
  const [historyIndex, setHistoryIndex] = useState(() => {
    const initialImg = previewUrl || selectedImage;
    return initialImg ? 0 : -1;
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isSaved) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaved]);

  const pushToHistory = (newUrl: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newUrl]);
    setHistoryIndex(newHistory.length);
    setIsSaved(newUrl === lastSavedUrl);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const url = history[prevIndex];
      setHistoryIndex(prevIndex);
      setPreviewImageUrl(url);
      setIsSaved(url === lastSavedUrl);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const url = history[nextIndex];
      setHistoryIndex(nextIndex);
      setPreviewImageUrl(url);
      setIsSaved(url === lastSavedUrl);
    }
  };

  const handleSave = () => {
    if (!previewImageUrl || typeof selectedIndex !== "number") return;

    const updatedImageUrls = [...imageUrls];
    updatedImageUrls[selectedIndex] = previewImageUrl;

    dispatch(setImageEditorState({ 
      previewUrl: previewImageUrl, 
      editInstruction: instruction,
      imageUrls: updatedImageUrls
    }));

    if (editorState.activeHistoryItemId) {
      dispatch(updateHistoryItemImages({ 
        id: editorState.activeHistoryItemId, 
        imageUrls: updatedImageUrls 
      }));
    }

    setLastSavedUrl(previewImageUrl);
    setIsSaved(true);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Crop Mode States
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });

  // Refs for tracking elements and resizing
  const imageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Dragging / Resizing states
  const [dragStart, setDragStart] = useState<{ x: number; y: number; cropX: number; cropY: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    handle: 'tl' | 'tr' | 'bl' | 'br';
    startX: number;
    startY: number;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
  } | null>(null);

  const { getToken } = useAuth();

  const handleBack = () => {
    if (!isSaved) {
      setShowConfirmModal(true);
      return;
    }
    router.push("/generate");
  };

  const handleDiscardAndLeave = () => {
    setShowConfirmModal(false);
    router.push("/generate");
  };

  const handleSaveAndLeave = () => {
    handleSave();
    setShowConfirmModal(false);
    router.push("/generate");
  };

  const handleApplyAIPrompt = async () => {
    const currentImage = previewImageUrl || selectedImage;
    if (!currentImage || !instruction.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      const token = await getToken().catch(() => undefined) || undefined;
      const imageUrlsResult = await generateImages({
        prompt: `${basePrompt}. ${instruction}`,
        style,
        aspectRatio,
        numberOfImages: 1,
        imageSize: "1K",
        thinkingLevel: "high",
        quality: "Premium",
        referenceImages: [currentImage],
        templateId: null
      }, token);

      const updatedUrl = imageUrlsResult?.[0] ?? currentImage;
      setPreviewImageUrl(updatedUrl);
      setInstruction("");
      pushToHistory(updatedUrl);
      toast.success("AI edits applied successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong applying your edits.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBoxPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.crop-handle')) {
      return;
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX: crop.x,
      cropY: crop.y
    });
  };

  const handleBoxPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragStart || !cropContainerRef.current) return;
    e.stopPropagation();
    
    const rect = cropContainerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

    const nextX = Math.max(0, Math.min(100 - crop.width, dragStart.cropX + deltaXPercent));
    const nextY = Math.max(0, Math.min(100 - crop.height, dragStart.cropY + deltaYPercent));

    setCrop(prev => ({
      ...prev,
      x: nextX,
      y: nextY
    }));
  };

  const handleBoxPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragStart(null);
  };

  const handleHandlePointerDown = (e: PointerEvent<HTMLDivElement>, handle: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizeStart({
      handle,
      startX: e.clientX,
      startY: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height
    });
  };

  const handleHandlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!resizeStart || !cropContainerRef.current) return;
    e.stopPropagation();

    const rect = cropContainerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - resizeStart.startX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - resizeStart.startY) / rect.height) * 100;

    const minSize = 10;
    let nextCrop = { ...crop };

    if (resizeStart.handle === 'tl') {
      const nextX = Math.max(0, Math.min(resizeStart.cropX + resizeStart.cropW - minSize, resizeStart.cropX + deltaXPercent));
      const nextWidth = resizeStart.cropW - (nextX - resizeStart.cropX);
      const nextY = Math.max(0, Math.min(resizeStart.cropY + resizeStart.cropH - minSize, resizeStart.cropY + deltaYPercent));
      const nextHeight = resizeStart.cropH - (nextY - resizeStart.cropY);
      nextCrop = { x: nextX, y: nextY, width: nextWidth, height: nextHeight };
    } 
    else if (resizeStart.handle === 'tr') {
      const nextY = Math.max(0, Math.min(resizeStart.cropY + resizeStart.cropH - minSize, resizeStart.cropY + deltaYPercent));
      const nextHeight = resizeStart.cropH - (nextY - resizeStart.cropY);
      const nextWidth = Math.max(minSize, Math.min(100 - resizeStart.cropX, resizeStart.cropW + deltaXPercent));
      nextCrop = { x: resizeStart.cropX, y: nextY, width: nextWidth, height: nextHeight };
    } 
    else if (resizeStart.handle === 'bl') {
      const nextX = Math.max(0, Math.min(resizeStart.cropX + resizeStart.cropW - minSize, resizeStart.cropX + deltaXPercent));
      const nextWidth = resizeStart.cropW - (nextX - resizeStart.cropX);
      const nextHeight = Math.max(minSize, Math.min(100 - resizeStart.cropY, resizeStart.cropH + deltaYPercent));
      nextCrop = { x: nextX, y: resizeStart.cropY, width: nextWidth, height: nextHeight };
    } 
    else if (resizeStart.handle === 'br') {
      const nextWidth = Math.max(minSize, Math.min(100 - resizeStart.cropX, resizeStart.cropW + deltaXPercent));
      const nextHeight = Math.max(minSize, Math.min(100 - resizeStart.cropY, resizeStart.cropH + deltaYPercent));
      nextCrop = { x: resizeStart.cropX, y: resizeStart.cropY, width: nextWidth, height: nextHeight };
    }

    setCrop(nextCrop);
  };

  const handleHandlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setResizeStart(null);
  };

  const executeCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sx = (crop.x / 100) * img.naturalWidth;
    const sy = (crop.y / 100) * img.naturalHeight;
    const sWidth = (crop.width / 100) * img.naturalWidth;
    const sHeight = (crop.height / 100) * img.naturalHeight;

    canvas.width = sWidth;
    canvas.height = sHeight;

    const tempImg = new Image();
    tempImg.crossOrigin = "anonymous";
    tempImg.src = img.src;

    tempImg.onload = () => {
      ctx.drawImage(tempImg, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      try {
        const croppedDataUrl = canvas.toDataURL("image/png");
        setPreviewImageUrl(croppedDataUrl);
        setIsCropMode(false);
        pushToHistory(croppedDataUrl);
      } catch (e) {
        console.error("Canvas export failed:", e);
        setError("Cross-origin security block: Try running backend in local proxy mode.");
      }
    };

    tempImg.onerror = () => {
      setError("Failed to load source image into crop editor.");
    };
  };

  const handleReset = () => {
    const originalImage = history[0];
    if (originalImage && previewImageUrl !== originalImage) {
      setPreviewImageUrl(originalImage);
      setCrop({ x: 10, y: 10, width: 80, height: 80 });
      setIsCropMode(false);
      setError(null);
      pushToHistory(originalImage);
    }
  };

  const handleExport = () => {
    const currentUrl = previewImageUrl || selectedImage;
    if (!currentUrl) return;
    
    const link = document.createElement("a");
    link.href = currentUrl;
    link.download = `lumina-editor-export-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!selectedImage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border text-card-foreground p-8 rounded-2xl text-center shadow-sm space-y-6">
          <h2 className="text-xl font-bold">No image loaded</h2>
          <p className="text-sm text-muted-foreground">
            Please return to the studio and click on any generated image to open the editor.
          </p>
          <Button onClick={handleBack} className="w-full py-2.5 rounded-full">
            Return to Studio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden relative select-none">
      <EditorHeader
        handleBack={handleBack}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        handleSave={handleSave}
        handleReset={handleReset}
        handleExport={handleExport}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaved={isSaved}
        hasPreviewImage={!!previewImageUrl}
      />

      {/* Workspace Area */}
      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        <EditorSidebar
          isCropMode={isCropMode}
          setIsCropMode={setIsCropMode}
          cropWidth={crop.width}
          cropHeight={crop.height}
          executeCrop={executeCrop}
          instruction={instruction}
          setInstruction={setInstruction}
          loading={loading}
          error={error}
          handleApplyAIPrompt={handleApplyAIPrompt}
        />

        <EditorCanvas
          previewImageUrl={previewImageUrl}
          selectedImage={selectedImage}
          imageRef={imageRef}
          isCropMode={isCropMode}
          cropContainerRef={cropContainerRef}
          crop={crop}
          handleBoxPointerDown={handleBoxPointerDown}
          handleBoxPointerMove={handleBoxPointerMove}
          handleBoxPointerUp={handleBoxPointerUp}
          handleHandlePointerDown={handleHandlePointerDown}
          handleHandlePointerMove={handleHandlePointerMove}
          handleHandlePointerUp={handleHandlePointerUp}
        />
      </main>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-card border border-white/10 p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Close editor without saving?</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              You have unsaved changes. If you close without saving, all your edits will be lost.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setShowConfirmModal(false)} className="w-full sm:w-auto order-first sm:order-none">
                Cancel
              </Button>
              <Button variant="outline" onClick={handleDiscardAndLeave} className="w-full sm:w-auto">
                Close without Saving
              </Button>
              <Button onClick={handleSaveAndLeave} className="w-full sm:w-auto">
                Save and Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
