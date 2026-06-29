"use client";

import { useRef, useState, useEffect, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Crop, 
  Sparkles, 
  RotateCcw, 
  Download, 
  Loader2, 
  Check, 
  X,
  Undo2,
  Redo2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setImageEditorState } from "@/store/slices/image-editor-slice";
import { generateImages } from "@/services";

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

    // Replace the item at selectedIndex with the saved previewImageUrl
    const updatedImageUrls = [...imageUrls];
    updatedImageUrls[selectedIndex] = previewImageUrl;

    updateState({ 
      previewUrl: previewImageUrl, 
      editInstruction: instruction,
      imageUrls: updatedImageUrls
    });
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

  const updateState = (payload: Partial<typeof editorState>) => {
    dispatch(setImageEditorState(payload));
  };

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

  // -------------------------------------------------------------
  // AI EDIT IMPLEMENTATION
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // CROP INTERACTIVE BOX LOGIC (POINTER EVENTS)
  // -------------------------------------------------------------
  const handleBoxPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // If clicking directly on a handle, let the handle pointer down deal with it
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

    const minSize = 10; // min 10% size limit
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

  // -------------------------------------------------------------
  // CANVAS CROPPING IMPLEMENTATION
  // -------------------------------------------------------------
  const executeCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use natural image dimensions to calculate crop box pixels
    const sx = (crop.x / 100) * img.naturalWidth;
    const sy = (crop.y / 100) * img.naturalHeight;
    const sWidth = (crop.width / 100) * img.naturalWidth;
    const sHeight = (crop.height / 100) * img.naturalHeight;

    canvas.width = sWidth;
    canvas.height = sHeight;

    // Load into clean image to extract cross-origin data safely
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
    if (selectedImage) {
      setPreviewImageUrl(selectedImage);
      setCrop({ x: 10, y: 10, width: 80, height: 80 });
      setIsCropMode(false);
      setError(null);
      setIsSaved(selectedImage === lastSavedUrl);
      pushToHistory(selectedImage);
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
      
      {/* Header bar */}
      <header className="h-16 border-b bg-card/60 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2 transition-colors duration-200 hover:bg-muted"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold text-base tracking-tight">AI Editor</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleUndo}
            disabled={!canUndo}
            className="h-9 px-3 text-xs font-semibold"
          >
            <Undo2 className="w-4 h-4 mr-1.5" />
            <span>Undo</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleRedo}
            disabled={!canRedo}
            className="h-9 px-3 text-xs font-semibold"
          >
            <Redo2 className="w-4 h-4 mr-1.5" />
            <span>Redo</span>
          </Button>

          <Button
            variant={isSaved ? "outline" : "default"}
            onClick={handleSave}
            disabled={isSaved || !previewImageUrl}
            className={`h-9 px-4 text-xs font-bold rounded-full transition-all active:scale-95 ${
              !isSaved 
                ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
                : "text-muted-foreground border-muted bg-transparent"
            }`}
          >
            <Check className="w-4 h-4 mr-1.5" />
            <span>{isSaved ? "Saved" : "Save Changes"}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleReset}
            className="h-9 px-3 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            <span>Revert Original</span>
          </Button>
          
          <Button
            onClick={handleExport}
            className="h-9 px-6 rounded-full font-bold shadow-sm transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export</span>
          </Button>
        </div>
      </header>

      {/* Workspace Area */}
      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Left Hand Actions & Options Panel */}
        <aside className="w-80 border-r bg-card/40 backdrop-blur-md p-6 flex flex-col gap-6 shrink-0 z-20 overflow-y-auto">
          
          {/* Section: Interactive Crop tool */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Canvas Crop Tool</h3>
            
            {!isCropMode ? (
              <Button
                variant="outline"
                onClick={() => setIsCropMode(true)}
                className="w-full py-3 px-4 flex items-center justify-between text-xs font-semibold group h-auto"
              >
                <div className="flex items-center gap-2">
                  <Crop className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                  <span>Activate Crop Overlay</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">C</span>
              </Button>
            ) : (
              <div className="space-y-2 p-3 bg-muted/50 rounded-xl border">
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-[10px] font-bold text-primary uppercase">Crop Mode Active</span>
                  <span className="text-[9px] font-mono opacity-50 text-muted-foreground">{Math.round(crop.width)}% x {Math.round(crop.height)}%</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={executeCrop}
                    className="text-[11px] font-bold h-8"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Apply Crop
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsCropMode(false)}
                    className="text-[11px] font-semibold h-8"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          {/* Section: Gemini AI Canvas Edit */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gemini AI Prompt Editor</h3>
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>

            <p className="text-xs text-[#cbc3d7] leading-relaxed">
              Describe any modification (e.g., replacement of subjects, background change, lighting modifications, addition of objects) and Gemini AI will intelligently redraw it.
            </p>

            <div className="flex-1 flex flex-col gap-2 min-h-[120px]">
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="What changes would you like to see? (e.g. Turn the background into a clean aesthetic sand dune backdrop with soft shadows)"
                className="flex-1 min-h-[120px] bg-[#060e20]/60 border border-white/10 rounded-xl p-3.5 text-xs text-[#dae2fd] placeholder:text-[#cbc3d7]/30 focus-visible:ring-1 focus-visible:ring-[#d0bcff] focus-visible:border-[#d0bcff] outline-none transition-all resize-none leading-relaxed"
                disabled={loading}
              />
              
              <Button
                onClick={handleApplyAIPrompt}
                disabled={loading || !instruction.trim()}
                className="w-full py-2.5 bg-[#d0bcff] hover:bg-[#d0bcff]/90 text-[#3c0091] text-xs font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 h-10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Gemini Edit...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Apply AI Changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl leading-relaxed shrink-0">
              {error}
            </div>
          )}
        </aside>

        {/* Central full-screen, full-aspect ratio image stage */}
        <section className="flex-1 bg-[#060b16] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] flex items-center justify-center p-8 overflow-auto relative select-none">
          
          {/* Centered Image Frame preserving natural aspect ratio */}
          <div className="relative inline-block max-h-[80vh] max-w-full select-none overflow-visible shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)] rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={previewImageUrl ?? selectedImage}
            alt="Editor View Canvas"
            className="max-h-[80vh] max-w-full h-auto w-auto object-contain pointer-events-none select-none rounded-xl"
          />

            {/* Custom Interactive Pointer-Based Crop Overlay box */}
            {isCropMode && (
              <div 
                ref={cropContainerRef}
                className="absolute inset-0 bg-black/60 rounded-xl select-none cursor-crosshair overflow-hidden touch-none"
              >
                <div
                  style={{
                    position: "absolute",
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
                  }}
                  className="border-2 border-[#d0bcff] cursor-move select-none touch-none"
                  onPointerDown={handleBoxPointerDown}
                  onPointerMove={handleBoxPointerMove}
                  onPointerUp={handleBoxPointerUp}
                >
                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-dashed border-white" />
                    <div className="border-r border-dashed border-white" />
                    <div className="border-b border-dashed border-white col-span-3" />
                    <div className="border-b border-dashed border-white col-span-3" />
                  </div>

                  {/* Corner resizing handles */}
                  {/* Top-Left */}
                  <div 
                    className="crop-handle absolute top-0 left-0 w-3.5 h-3.5 bg-white border-2 border-[#d0bcff] -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-full shadow-lg pointer-events-auto touch-none"
                    onPointerDown={(e) => handleHandlePointerDown(e, "tl")}
                    onPointerMove={handleHandlePointerMove}
                    onPointerUp={handleHandlePointerUp}
                  />
                  {/* Top-Right */}
                  <div 
                    className="crop-handle absolute top-0 right-0 w-3.5 h-3.5 bg-white border-2 border-[#d0bcff] translate-x-1/2 -translate-y-1/2 cursor-nesw-resize rounded-full shadow-lg pointer-events-auto touch-none"
                    onPointerDown={(e) => handleHandlePointerDown(e, "tr")}
                    onPointerMove={handleHandlePointerMove}
                    onPointerUp={handleHandlePointerUp}
                  />
                  {/* Bottom-Left */}
                  <div 
                    className="crop-handle absolute bottom-0 left-0 w-3.5 h-3.5 bg-white border-2 border-[#d0bcff] -translate-x-1/2 translate-y-1/2 cursor-nesw-resize rounded-full shadow-lg pointer-events-auto touch-none"
                    onPointerDown={(e) => handleHandlePointerDown(e, "bl")}
                    onPointerMove={handleHandlePointerMove}
                    onPointerUp={handleHandlePointerUp}
                  />
                  {/* Bottom-Right */}
                  <div 
                    className="crop-handle absolute bottom-0 right-0 w-3.5 h-3.5 bg-white border-2 border-[#d0bcff] translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-full shadow-lg pointer-events-auto touch-none"
                    onPointerDown={(e) => handleHandlePointerDown(e, "br")}
                    onPointerMove={handleHandlePointerMove}
                    onPointerUp={handleHandlePointerUp}
                  />
                </div>
              </div>
            )}
          </div>

        </section>
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

