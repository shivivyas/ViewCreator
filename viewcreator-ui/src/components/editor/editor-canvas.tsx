import React, { type PointerEvent, type RefObject } from "react";

export interface EditorCanvasProps {
  previewImageUrl: string | null;
  selectedImage: string | null;
  imageRef: RefObject<HTMLImageElement | null>;
  isCropMode: boolean;
  cropContainerRef: RefObject<HTMLDivElement | null>;
  crop: { x: number; y: number; width: number; height: number };
  handleBoxPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  handleBoxPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  handleBoxPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  handleHandlePointerDown: (e: PointerEvent<HTMLDivElement>, handle: "tl" | "tr" | "bl" | "br") => void;
  handleHandlePointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  handleHandlePointerUp: (e: PointerEvent<HTMLDivElement>) => void;
}

export function EditorCanvas({
  previewImageUrl,
  selectedImage,
  imageRef,
  isCropMode,
  cropContainerRef,
  crop,
  handleBoxPointerDown,
  handleBoxPointerMove,
  handleBoxPointerUp,
  handleHandlePointerDown,
  handleHandlePointerMove,
  handleHandlePointerUp,
}: EditorCanvasProps) {
  return (
    <section className="flex-1 bg-[#060b16] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] flex items-center justify-center p-8 overflow-auto relative select-none">
      
      {/* Centered Image Frame preserving natural aspect ratio */}
      <div className="relative inline-block max-h-[80vh] max-w-full select-none overflow-visible shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)] rounded-xl border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={previewImageUrl ?? selectedImage ?? undefined}
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
              <div 
                className="crop-handle absolute top-0 left-0 w-3.5 h-3.5 bg-white border-2 border-[#d0bcff] -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-full shadow-lg pointer-events-auto touch-none"
                onPointerDown={(e) => handleHandlePointerDown(e, "tl")}
                onPointerMove={handleHandlePointerMove}
                onPointerUp={handleHandlePointerUp}
              />
              <div 
                className="crop-handle absolute top-0 right-0 w-3.5 h-3.5 bg-white border-2 border-[#d0bcff] translate-x-1/2 -translate-y-1/2 cursor-nesw-resize rounded-full shadow-lg pointer-events-auto touch-none"
                onPointerDown={(e) => handleHandlePointerDown(e, "tr")}
                onPointerMove={handleHandlePointerMove}
                onPointerUp={handleHandlePointerUp}
              />
              <div 
                className="crop-handle absolute bottom-0 left-0 w-3.5 h-3.5 bg-white border-2 border-[#d0bcff] -translate-x-1/2 translate-y-1/2 cursor-nesw-resize rounded-full shadow-lg pointer-events-auto touch-none"
                onPointerDown={(e) => handleHandlePointerDown(e, "bl")}
                onPointerMove={handleHandlePointerMove}
                onPointerUp={handleHandlePointerUp}
              />
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
  );
}
