"use client";

import React from "react";
import { History, Sparkles, Crop, Undo2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * A single entry in the edit timeline.
 */
export interface EditTimelineEntry {
  /** The image URL at this point in the edit history */
  url: string;
  /** The type of edit that produced this entry */
  type: "original" | "ai-edit" | "crop" | "reset" | "adjustment";
  /** Human-readable description of what happened */
  description: string;
  /** Timestamp when the edit was applied (ms since epoch) */
  timestamp: number;
}

export interface EditorTimelineProps {
  /** Full edit history, from oldest (index 0) to newest (last) */
  entries: EditTimelineEntry[];
  /** The current position in the history (index into entries) */
  currentIndex: number;
  /** The index of the last saved entry (-1 if nothing saved yet) */
  savedIndex: number;
  /** Called when the user clicks a specific history entry to jump to it */
  onJumpToEntry: (index: number) => void;
}

/** Icon and colour mapping for each edit type */
const TYPE_STYLES: Record<
  EditTimelineEntry["type"],
  { icon: React.ReactNode; dotColor: string; label: string }
> = {
  original: {
    icon: <History className="size-3.5" />,
    dotColor: "bg-primary",
    label: "Original",
  },
  "ai-edit": {
    icon: <Sparkles className="size-3.5 text-purple-400" />,
    dotColor: "bg-purple-500",
    label: "AI Edit",
  },
  crop: {
    icon: <Crop className="size-3.5 text-emerald-400" />,
    dotColor: "bg-emerald-500",
    label: "Crop",
  },
  reset: {
    icon: <RotateCcw className="size-3.5 text-amber-400" />,
    dotColor: "bg-amber-500",
    label: "Reset",
  },
  adjustment: {
    icon: <Undo2 className="size-3.5 text-blue-400" />,
    dotColor: "bg-blue-500",
    label: "Adjustment",
  },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function EditorTimeline({
  entries,
  currentIndex,
  savedIndex,
  onJumpToEntry,
}: EditorTimelineProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  if (entries.length === 0) return null;

  return (
    <aside className="w-72 border-l bg-card/40 backdrop-blur-md flex flex-col shrink-0 z-20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            History
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/50">
            {currentIndex + 1}/{entries.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Save state badge */}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
              currentIndex <= savedIndex
                ? "text-emerald-500"
                : "text-amber-500"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                currentIndex <= savedIndex
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
            />
            {currentIndex <= savedIndex ? "Saved" : "Unsaved"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-0">
            {entries.map((entry, index) => {
              const style = TYPE_STYLES[entry.type];
              const isCurrent = index === currentIndex;
              const isPast = index < currentIndex;
              const isFuture = index > currentIndex;

              return (
                <button
                  key={index}
                  onClick={() => onJumpToEntry(index)}
                  className={`
                    relative w-full flex items-start gap-3 px-2 py-2.5 rounded-lg text-left
                    transition-all duration-150 group
                    ${isCurrent
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : "hover:bg-muted/50"
                    }
                    ${isFuture ? "opacity-40" : ""}
                  `}
                >
                  {/* Timeline connection line */}
                  {index < entries.length - 1 && (
                    <div
                      className={`absolute left-[17px] top-7 w-px h-[calc(100%)] ${
                        isPast ? "bg-primary/30" : "bg-border"
                      }`}
                      style={{ height: "calc(100% - 8px)" }}
                    />
                  )}

                  {/* Dot */}
                  <div
                    className={`
                      relative z-10 size-3.5 rounded-full border-2 shrink-0 mt-0.5
                      transition-all duration-200
                      ${isCurrent
                        ? `${style.dotColor} border-primary-foreground shadow-sm shadow-primary/30 scale-110`
                        : "bg-muted border-border group-hover:border-muted-foreground/30"
                      }
                      ${isPast ? `${style.dotColor} border-transparent` : ""}
                    `}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="shrink-0">{style.icon}</span>
                      <span
                        className={`text-xs font-semibold ${
                          isCurrent ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {style.label}
                      </span>

                      {/* Current indicator */}
                      {isCurrent && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-primary ml-auto">
                          Current
                        </span>
                      )}

                      {/* Save state indicator per entry */}
                      {index <= savedIndex && !isCurrent && (
                        <span className="text-[9px] text-emerald-500/70 font-medium ml-auto">
                          Saved
                        </span>
                      )}
                      {index > savedIndex && (
                        <span className="text-[9px] text-amber-500/60 font-medium ml-auto">
                          New
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground/70 leading-tight line-clamp-2">
                      {entry.description}
                    </p>

                    <p className="text-[10px] text-muted-foreground/40 mt-0.5 font-mono">
                      {formatTime(entry.timestamp)}
                    </p>
                  </div>

                  {/* Mini thumbnail */}
                  <div className="shrink-0 size-10 rounded-md overflow-hidden border border-border/50 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.url}
                      alt={`Step ${index + 1}`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}
