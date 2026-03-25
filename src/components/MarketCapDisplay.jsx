import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

const MarketCapDisplay = ({ 
  value, 
  currency = "USD", 
  className = "", 
  showTooltip = true,
  showCurrency = true,
  label = "Market Cap" // Add label prop with a default
}) => {
  // Handle null/undefined/zero values
  if (value === null || value === undefined || value === 0 || value === "") {
    return <span className={className}>N/A</span>;
  }

  // Convert to number if string
  let num;
  if (typeof value === 'string') {
    num = parseFloat(value.replace(/,/g, ''));
  } else {
    num = parseFloat(value);
  }

  if (isNaN(num)) {
    return <span className={className}>N/A</span>;
  }

  // Now we expect the input to always be the full market cap value
  // No more guessing - the caller is responsible for converting millions to full value
  const absValue = Math.abs(num);
  const isNegative = num < 0;
  
  let formattedValue;
  let suffix;
  
  if (absValue >= 1e12) { // Trillions
    formattedValue = (absValue / 1e12).toFixed(2);
    suffix = "T";
  } else if (absValue >= 1e9) { // Billions
    formattedValue = (absValue / 1e9).toFixed(1);
    suffix = "B";
  } else if (absValue >= 1e6) { // Millions
    formattedValue = (absValue / 1e6).toFixed(1);
    suffix = "M";
  } else if (absValue >= 1e3) { // Thousands
    formattedValue = (absValue / 1e3).toFixed(1);
    suffix = "K";
  } else {
    formattedValue = absValue.toFixed(0);
    suffix = "";
  }

  // Remove unnecessary trailing zeros
  formattedValue = parseFloat(formattedValue).toString();
  
  // Currency symbol mapping
  const currencySymbols = {
    USD: "$",
    EUR: "€", 
    GBP: "£",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$"
  };

  const currencySymbol = showCurrency ? (currencySymbols[currency] || currency) : "";
  const sign = isNegative ? "-" : "";
  const displayValue = `${sign}${currencySymbol}${formattedValue}${suffix}`;
  
  // Full number for tooltip
  const fullNumber = num.toLocaleString();
  const tooltipText = `${label}: ${sign}${currencySymbol}${fullNumber}`; // Use the label prop

  const content = <span className={className}>{displayValue}</span>;

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button 
              type="button"
              className="cursor-help inline-flex items-center p-0.5 rounded hover:bg-slate-600/30 transition-colors"
              onTouchStart={(e) => e.stopPropagation()}
            >
              {content}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="max-w-xs text-sm p-2.5 bg-slate-700 border border-slate-600 shadow-md rounded-md z-50 text-slate-200"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export default MarketCapDisplay;