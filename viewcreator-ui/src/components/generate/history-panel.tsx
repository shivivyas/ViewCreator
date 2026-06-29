import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearHistory, deleteGenerationFromHistory } from '@/store/slices/image-editor-slice';
import type { GenerationHistoryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ImageIcon, 
  Download, 
  Loader2, 
  X, 
  History, 
  Copy, 
  Clock, 
  RefreshCw 
} from 'lucide-react';

export interface HistoryPanelProps {
  isLoading: boolean;
  loadingParams: {
    prompt: string;
    aspectRatio: string;
    imageSize: string;
    isPremium: boolean;
    thinkingLevel: string;
    numberOfImages: number;
  };
  handleLoadSettings: (item: GenerationHistoryItem) => void;
  handleRegenerate: (item: GenerationHistoryItem) => void;
  handleSelectImageFromHistory: (item: GenerationHistoryItem, index: number) => void;
}

export function HistoryPanel({
  isLoading,
  loadingParams,
  handleLoadSettings,
  handleRegenerate,
  handleSelectImageFromHistory
}: HistoryPanelProps) {
  const dispatch = useAppDispatch();
  const editorState = useAppSelector((state) => state.imageEditor);

  const handleDownload = (url: string, index: number, prefix = 'generated') => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}-${Date.now()}-${index}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Image download started!");
    } catch {
      toast.error("Failed to download image.");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 overflow-hidden">
      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col shadow-md">
        <CardHeader className="border-b bg-muted/30 pb-2 pt-3 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Generation History
            </CardTitle>
            {(editorState.history && editorState.history.length > 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => dispatch(clearHistory())}
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2Icon />
                Clear History
              </Button>
            )}
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 min-h-0">
          <CardContent className="p-4 relative min-h-[400px]">
            {/* Background grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
            
            <div className="relative z-10 w-full flex flex-col gap-6">
              
              {/* Active Loading State */}
              {isLoading && (
                <div className="border border-primary/20 rounded-xl bg-primary/5 p-4 animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs font-bold text-primary">Generating images...</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border">
                      Nano Banana 3.1
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="bg-muted/50 border border-muted/80 p-2.5 rounded text-xs italic text-muted-foreground line-clamp-2">
                      &quot;{loadingParams.prompt}&quot;
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Ratio: {loadingParams.aspectRatio}</Badge>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Size: {loadingParams.imageSize}</Badge>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{loadingParams.isPremium ? 'Premium' : 'Standard'}</Badge>
                      {loadingParams.thinkingLevel === 'high' && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-primary bg-primary/10 border-primary/20">Deep Thinking</Badge>}
                    </div>
                  </div>
                  
                  {/* Placeholder skeletons matching requested quantity */}
                  <div className={`grid gap-3 ${loadingParams.numberOfImages === 1 ? 'grid-cols-1 max-w-sm mx-auto' : loadingParams.numberOfImages === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                    {Array.from({ length: loadingParams.numberOfImages }).map((_, i) => (
                      <div key={i} className="aspect-square bg-muted/40 rounded-lg border border-dashed flex flex-col items-center justify-center text-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/30 animate-bounce mb-1" />
                        <span className="text-[10px] text-muted-foreground/40 font-medium">Variation {i + 1}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History List */}
              {editorState.history && editorState.history.length > 0 ? (
                <div className="space-y-6">
                  {editorState.history.map((item) => (
                    <div 
                      key={item.id} 
                      className="border border-muted rounded-xl bg-background shadow-sm hover:shadow transition-all overflow-hidden"
                    >
                      {/* Item Header */}
                      <div className="bg-muted/10 border-b p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-muted-foreground/60" />
                            {item.timestamp}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0">
                            {item.aspectRatio}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0">
                            {item.imageSize}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-[9px] font-medium px-1.5 py-0 ${
                              item.quality === 'Premium' 
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                                : ''
                            }`}
                          >
                            {item.quality}
                          </Badge>
                          {item.thinkingLevel === 'high' && (
                            <Badge variant="outline" className="text-[9px] font-medium border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 px-1.5 py-0">
                              Deep Think
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1 sm:self-auto self-end shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoadSettings(item)}
                            className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Load these parameters into form"
                          >
                            <Copy className="w-3 h-3 mr-1 text-muted-foreground/75" />
                            Use settings
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRegenerate(item)}
                            disabled={isLoading}
                            className="h-7 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/5"
                            title="Regenerate these images"
                          >
                            <RefreshCw className="w-3 h-3 mr-1 text-primary/75" />
                            Regenerate
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => dispatch(deleteGenerationFromHistory(item.id))}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove from history"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Item Details */}
                      <div className="p-3.5 space-y-3">
                        {/* Prompt text box */}
                        <div className="text-xs bg-muted/30 border border-muted/50 p-2.5 rounded-lg text-foreground font-normal leading-relaxed break-words whitespace-pre-wrap select-all">
                          {item.prompt}
                        </div>

                        {/* Reference Images if available */}
                        {item.referenceImages && item.referenceImages.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Composition References:</span>
                            <div className="flex gap-1">
                              {item.referenceImages.map((refImg, rIdx) => (
                                <div key={rIdx} className="w-6 h-6 rounded border bg-muted overflow-hidden flex items-center justify-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={refImg} alt={`Reference ${rIdx+1}`} className="max-h-full object-contain" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Image Grid */}
                        <div className={`grid gap-3 ${
                          item.imageUrls.length === 1 
                            ? 'grid-cols-1 max-w-md' 
                            : item.imageUrls.length === 2 
                            ? 'grid-cols-2' 
                            : 'grid-cols-2 lg:grid-cols-4'
                        }`}>
                          {item.imageUrls.map((url, i) => (
                            <div 
                              key={i} 
                              className="group relative rounded-lg overflow-hidden border shadow-sm bg-muted/20 flex items-center justify-center aspect-square transition-all duration-300 hover:border-primary/30"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={url} 
                                alt={`Generated variation ${i+1}`} 
                                onClick={() => handleSelectImageFromHistory(item, i)}
                                className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                              />
                              
                              {/* Variation tag */}
                              <span className="absolute top-1.5 left-1.5 bg-black/75 text-[9px] text-white font-semibold rounded px-1.5 py-0.5 pointer-events-none select-none">
                                #{i + 1}
                              </span>

                              {/* Hover Overlay */}
                              <div 
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 p-2 text-center cursor-pointer"
                                onClick={() => handleSelectImageFromHistory(item, i)}
                              >
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(url, i, `history-${item.id}`);
                                  }} 
                                  className="text-[10px] h-7 w-full max-w-[110px]"
                                >
                                  <Download className="w-3 h-3 mr-1" /> Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isLoading && (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/60 py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-1">
                      <ImageIcon className="w-8 h-8 opacity-50" />
                    </div>
                    <h3 className="text-sm font-medium text-foreground">Awaiting Instructions</h3>
                    <p className="text-xs max-w-xs">Configure parameters and click Generate to see your marketing assets come to life. Past generations will be preserved here during your session.</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}

function Trash2Icon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-1"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
