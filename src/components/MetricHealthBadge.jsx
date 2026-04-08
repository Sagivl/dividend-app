"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMetricHealth, healthDotClass, healthBadgeClasses } from "@/config/metricHealthConfig";

/**
 * Colored health indicator badge for a dividend metric.
 *
 * @param {object}  props
 * @param {string}  props.metricKey   Key from metricHealthConfig (e.g. "dividend_yield")
 * @param {number|string|null} props.value  The raw metric value
 * @param {"sm"|"md"} [props.size="md"]  Badge size
 * @param {boolean} [props.showLabel=true]  Whether to render the label text next to the dot
 */
export default function MetricHealthBadge({ metricKey, value, size = "md", showLabel = true }) {
  const [open, setOpen] = React.useState(false);

  const health = getMetricHealth(metricKey, value);
  if (!health) return null;

  const handleOpenChange = (newOpen) => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      setOpen(newOpen);
    }
  };

  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100} open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 border cursor-help transition-colors touch-manipulation ${healthBadgeClasses(health.color)}`}
          >
            <span className={`${dotSize} rounded-full flex-shrink-0 ${healthDotClass(health.color)}`} />
            {showLabel && (
              <span className={`${textSize} leading-tight whitespace-nowrap`}>
                {health.label}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs text-sm p-2.5 bg-slate-700 border border-slate-600 shadow-md rounded-md z-50 text-slate-200"
          onPointerDownOutside={() => setOpen(false)}
          sideOffset={5}
          collisionPadding={10}
        >
          <p>{health.explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
