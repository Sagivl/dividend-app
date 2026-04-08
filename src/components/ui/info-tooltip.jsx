"use client";

import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Unified info-tooltip with hover (desktop) + click-toggle (mobile) support.
 *
 * @param {string}  props.explanation  Tooltip body text
 * @param {React.ReactNode} [props.children]  Optional custom trigger content.
 *   When provided, the info icon is appended after the children (useful for
 *   chart headings that pair a title with an info button).
 *   When omitted, a standalone info-circle icon is rendered.
 */
export function InfoTooltip({ explanation, children }) {
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (newOpen) => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      setOpen(newOpen);
    }
  };

  const trigger = (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }}
      className="inline-flex items-center justify-center ml-1.5 p-1 rounded-full hover:bg-slate-600/50 transition-colors touch-manipulation"
      style={{ minWidth: "24px", minHeight: "24px" }}
    >
      <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 cursor-help" />
    </button>
  );

  if (children) {
    return (
      <div className="flex items-center">
        <span className="truncate">{children}</span>
        <TooltipProvider>
          <Tooltip delayDuration={100} open={open} onOpenChange={handleOpenChange}>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              className="max-w-xs text-sm p-2.5 bg-slate-700 border border-slate-600 shadow-md rounded-md z-50 text-slate-200"
              onPointerDownOutside={() => setOpen(false)}
              sideOffset={5}
              collisionPadding={10}
            >
              <p>{explanation}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100} open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs text-sm p-2.5 bg-slate-700 border border-slate-600 shadow-md rounded-md z-50 text-slate-200"
          onPointerDownOutside={() => setOpen(false)}
          sideOffset={5}
          collisionPadding={10}
        >
          <p>{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
