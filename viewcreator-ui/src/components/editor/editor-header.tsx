import React from "react";
import { ArrowLeft, Undo2, Redo2, Check, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EditorHeaderProps {
  handleBack: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleSave: () => void;
  handleReset: () => void;
  handleExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaved: boolean;
  hasPreviewImage: boolean;
}

export function EditorHeader({
  handleBack,
  handleUndo,
  handleRedo,
  handleSave,
  handleReset,
  handleExport,
  canUndo,
  canRedo,
  isSaved,
  hasPreviewImage,
}: EditorHeaderProps) {
  return (
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
          disabled={isSaved || !hasPreviewImage}
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
  );
}
