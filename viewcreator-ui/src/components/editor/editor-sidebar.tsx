import React from "react";
import { Crop, Check, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface EditorSidebarProps {
  isCropMode: boolean;
  setIsCropMode: (val: boolean) => void;
  cropWidth: number;
  cropHeight: number;
  executeCrop: () => void;
  instruction: string;
  setInstruction: (val: string) => void;
  loading: boolean;
  error: string | null;
  handleApplyAIPrompt: () => void;
}

export function EditorSidebar({
  isCropMode,
  setIsCropMode,
  cropWidth,
  cropHeight,
  executeCrop,
  instruction,
  setInstruction,
  loading,
  error,
  handleApplyAIPrompt
}: EditorSidebarProps) {
  return (
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
              <span className="text-[9px] font-mono opacity-50 text-muted-foreground">{Math.round(cropWidth)}% x {Math.round(cropHeight)}%</span>
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
  );
}
