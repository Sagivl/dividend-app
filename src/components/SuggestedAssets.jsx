
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Loader2,
  CheckCircle,
  Crown,
  Sparkles,
  RefreshCw,
  Filter,
  Info as InfoIcon,
  MoreVertical,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPageUrl } from "@/utils";
import ConfigurationDialog, { defaultConfig } from "./configure/ConfigurationDialog";
import EmptyState from "./EmptyState";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";

// Data validation and cleaning helper
const cleanDividendGrowthData = (rawGrowth) => {
  if (!rawGrowth && rawGrowth !== 0) return null;
  
  let growth = parseFloat(rawGrowth);
  if (isNaN(growth)) return null;
  
  // If it's stored as basis points or whole number instead of percentage
  if (growth > 100) {
    growth = growth / 100;
  }
  
  return growth;
};

// ENHANCED CHOWDER CALCULATION WITH DATA VALIDATION
const calculateCorrectChowder = (dividendYield, divGrowth5y) => {
  const dy = parseFloat(dividendYield);
  const cleanedGrowth = cleanDividendGrowthData(divGrowth5y);
  
  if (isNaN(dy) || cleanedGrowth === null) return null;
  
  return dy + cleanedGrowth;
};

// Stock scoring and filtering based on configuration
const evaluateStock = (stock, config) => {
  const marketCap = stock.market_cap ? parseFloat(stock.market_cap) : null;
  const chowder = calculateCorrectChowder(stock.dividend_yield, stock.avg_div_growth_5y);
  const payoutRatio = stock.payout_ratio ? parseFloat(stock.payout_ratio) : null;
  const roe = stock.roe ? parseFloat(stock.roe) : null;
  const beta = stock.beta ? parseFloat(stock.beta) : null;
  const dividendYield = stock.dividend_yield ? parseFloat(stock.dividend_yield) : null;

  const criteria = {
    marketCap: marketCap !== null && marketCap >= config.marketCapMin,
    chowder: chowder !== null && chowder >= config.chowderMin,
    payoutRatio: payoutRatio !== null && payoutRatio <= config.payoutRatioMax,
    roe: roe !== null && roe >= config.roeMin,
    beta: beta !== null && beta <= config.betaMax,
    dividendYield: dividendYield !== null && dividendYield >= config.dividendYieldMin
  };

  const metCriteriaCount = Object.values(criteria).filter(Boolean).length;
  const totalCriteria = Object.keys(criteria).length;
  const isExactMatch = metCriteriaCount === totalCriteria;

  return {
    ...stock,
    // Cleaned values
    market_cap: marketCap, // This value is expected to be in millions (e.g., 1000 for 1 Billion)
    calculatedChowder: chowder,
    payout_ratio: payoutRatio,
    roe: roe,
    beta: beta,
    dividend_yield: dividendYield,
    avg_div_growth_5y: cleanDividendGrowthData(stock.avg_div_growth_5y),
    
    // Scoring
    criteria,
    metCriteriaCount,
    isExactMatch,
    score: metCriteriaCount // Higher score = more criteria met
  };
};

/**
 * MarketCapDisplay component for consistent formatting and display of market capitalization.
 * Expects the 'value' prop to be the actual market capitalization in dollars (e.g., 1,234,567,890).
 */
const MarketCapDisplay = ({ value, showTooltip = true, className = "" }) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen) => {
    // Only use Radix's open/close for hover-capable devices (desktop)
    // On touch devices, we control state via onClick only to avoid double-toggle
    if (window.matchMedia('(hover: hover)').matches) {
      setOpen(newOpen);
    }
  };

  if (value === null || value === undefined || value === 0 || isNaN(value)) {
    return <span className={className}>N/A</span>;
  }

  const actualValue = parseFloat(value); // Ensure it's a number

  let formattedValue;
  if (Math.abs(actualValue) >= 1.0e+12) { // Trillions
    formattedValue = `$${(actualValue / 1.0e+12).toFixed(2)}T`;
  } else if (Math.abs(actualValue) >= 1.0e+9) { // Billions
    formattedValue = `$${(actualValue / 1.0e+9).toFixed(1)}B`;
  } else if (Math.abs(actualValue) >= 1.0e+6) { // Millions
    formattedValue = `$${(actualValue / 1.0e+6).toFixed(0)}M`;
  } else {
    // Less than a million
    formattedValue = `$${actualValue.toLocaleString()}`;
  }

  if (showTooltip) {
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
              className={`${className} cursor-help touch-manipulation`}
            >
              {formattedValue}
            </button>
          </TooltipTrigger>
          <TooltipContent 
            className="text-xs bg-slate-700 text-slate-200 border-slate-600"
            onPointerDownOutside={() => setOpen(false)}
          >
            {`Market Cap: $${actualValue.toLocaleString()}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className={className}>{formattedValue}</span>;
};

export default function SuggestedAssets({ stocks = [], onRefresh }) {
  const [suggestedStocks, setSuggestedStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  const router = useRouter();
  
  const handleQuickAddStock = (ticker) => {
    router.push(`${createPageUrl("Dashboard")}?ticker=${ticker}&tab=analysis`);
  };
  
  const [assetConfig, setAssetConfig] = useState(() => {
    if (typeof window === 'undefined') return defaultConfig;
    try {
      const saved = localStorage.getItem("dividendAssetConfig");
      return saved ? JSON.parse(saved) : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const stocksDataKey = useMemo(() => {
    return stocks
      .map(s => `${s.ticker}-${s.last_updated || s.updated_date || ''}-${s.price || ''}`)
      .sort()
      .join('|');
  }, [stocks]);

  const fetchSuggestedAssets = async (configOverride = null, shouldRefreshData = false) => {
    const currentConfig = configOverride || assetConfig;
    setIsLoading(true);
    setError(null);
    
    try {
      // If refresh is requested and onRefresh callback is provided, call it
      if (shouldRefreshData && onRefresh) {
        console.log("Refreshing stocks data from database...");
        await onRefresh();
        return; // The useEffect will re-run fetchSuggestedAssets when stocks prop updates
      }
      
      // Use the stocks prop instead of making a new API call
      console.log("Using provided stocks data for suggestions instead of making new API call");
      const allStocks = stocks || [];

      // Filter and evaluate stocks based on configuration
      const evaluatedStocks = allStocks
        .filter(stock => {
          // Basic validation - must have dividend data
          return stock.ticker && 
                 stock.price && parseFloat(stock.price) > 0 && 
                 stock.dividend_yield && parseFloat(stock.dividend_yield) > 0;
        })
        .map(stock => evaluateStock(stock, currentConfig))
        .filter(stock => stock.metCriteriaCount > 0) // Only show stocks that meet at least 1 criterion
        .sort((a, b) => {
          // Sort by exact matches first, then by score
          if (a.isExactMatch && !b.isExactMatch) return -1;
          if (!a.isExactMatch && b.isExactMatch) return 1;
          
          // If both are exact matches or both are partial, sort by score
          if (a.score !== b.score) return b.score - a.score;
          
          // If same score, sort by dividend yield
          return (b.dividend_yield || 0) - (a.dividend_yield || 0);
        });

      // Remove duplicates by ticker
      const uniqueStocks = [];
      const seenTickers = new Set();
      
      evaluatedStocks.forEach(stock => {
        if (!seenTickers.has(stock.ticker.toUpperCase())) {
          seenTickers.add(stock.ticker.toUpperCase());
          uniqueStocks.push(stock);
        }
      });

      setSuggestedStocks(uniqueStocks.slice(0, 20));

    } catch (error) {
      console.error("Error in fetchSuggestedAssets:", error);
      setError("Failed to load suggestions. Please try refreshing.");
      setSuggestedStocks([]);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    // Only run fetchSuggestedAssets if there are stocks provided
    // This handles the initial load and updates when 'stocks' prop changes
    if (stocks.length > 0) {
      fetchSuggestedAssets();
    }
  }, [stocksDataKey, stocks.length]); // Added stocks.length for clarity, though stocksDataKey should cover it

  const handleConfigSave = async (newConfig) => {
    setIsUpdatingConfig(true);
    try {
      setAssetConfig(newConfig);
      if (typeof window !== 'undefined') {
        localStorage.setItem("dividendAssetConfig", JSON.stringify(newConfig));
      }
      setConfigOpen(false);
      await fetchSuggestedAssets(newConfig);
      
      toast({
        title: "Filters saved",
        description: "Your suggestion criteria have been updated and applied.",
        variant: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error updating config:", error);
      setError("Failed to update configuration");
      toast({
        title: "Error",
        description: "Failed to save filter configuration. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  // Generate dynamic tooltip text based on current configuration
  const getConfigurationTooltipText = () => {
    return `Filtering stocks based on your criteria:
• Min. Market Cap: $${assetConfig.marketCapMin / 1000}B
• Min. Chowder Number: ${assetConfig.chowderMin}
• Max. Payout Ratio: ${assetConfig.payoutRatioMax}%
• Min. ROE: ${assetConfig.roeMin}%
• Max. Beta: ${assetConfig.betaMax}
• Min. Dividend Yield: ${assetConfig.dividendYieldMin}%

Exact matches (meeting all criteria) are shown first, followed by partial matches sorted by relevance.`;
  };

  const SuggestedStockCard = ({ stock }) => {
    const chowderNumber = stock.calculatedChowder;

    return (
      <Card className={`bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200 hover:shadow-lg transition-all duration-300 flex flex-col ${stock.isExactMatch ? "ring-1 ring-green-500" : ""}`}>
        <CardContent className="p-3 md:p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="flex flex-col flex-grow min-w-0 mr-2">
              <div className="flex items-center">
                <h3 className="text-base md:text-lg font-semibold text-slate-100 leading-tight truncate">
                  {stock.ticker}
                  {stock.isExactMatch && <Crown className="h-4 md:h-5 w-4 md:w-5 text-yellow-500 inline ml-1" />}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 truncate mt-1">
                {stock.name}
              </p>
              {stock.sector && (
                <p className="text-[10px] text-slate-500 truncate">
                  {stock.sector}
                </p>
              )}
              <div className="text-[10px] text-slate-500 mt-1 hidden sm:block">
                {stock.isExactMatch ? "Perfect Match" : `${stock.metCriteriaCount}/6 criteria met`}
              </div>
            </div>
            {stock.price && (
              <div className="text-sm md:text-base lg:text-lg font-semibold text-green-400 whitespace-nowrap flex-shrink-0">
                ${stock.price.toFixed(2)}
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-xs sm:text-sm mb-3 md:mb-4 flex-grow">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Yield:</span>
              <Badge 
                variant={stock.criteria.dividendYield ? "default" : "outline"} 
                className={`${
                  stock.criteria.dividendYield 
                    ? 'bg-green-700/20 text-green-300 border-green-600' 
                    : 'bg-slate-700 text-slate-400 border-slate-600'
                } px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}
              >
                {stock.dividend_yield !== null ? `${stock.dividend_yield.toFixed(2)}%` : "N/A"}
                {stock.criteria.dividendYield && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">ROE:</span>
              <Badge 
                variant={stock.criteria.roe ? "default" : "outline"} 
                className={`${
                  stock.criteria.roe 
                    ? 'bg-green-700/20 text-green-300 border-green-600' 
                    : 'bg-slate-700 text-slate-400 border-slate-600'
                } px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}
              >
                {stock.roe !== null ? `${stock.roe.toFixed(1)}%` : "N/A"}
                {stock.criteria.roe && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Chowder:</span>
              <Badge 
                variant={stock.criteria.chowder ? "default" : "outline"} 
                className={`${
                  stock.criteria.chowder 
                    ? 'bg-green-700/20 text-green-300 border-green-600' 
                    : 'bg-slate-700 text-slate-400 border-slate-600'
                } px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}
              >
                {chowderNumber !== null ? chowderNumber.toFixed(1) : "N/A"}
                {stock.criteria.chowder && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Market Cap:</span>
              <Badge 
                variant={stock.criteria.marketCap ? "default" : "outline"} 
                className={`${
                  stock.criteria.marketCap 
                    ? 'bg-green-700/20 text-green-300 border-green-600' 
                    : 'bg-slate-700 text-slate-400 border-slate-600'
                } px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}
              >
                <MarketCapDisplay 
                  value={stock.market_cap ? stock.market_cap * 1_000_000 : null} // value is in millions, convert to full value for display
                  showTooltip={false}
                  className=""
                />
                {stock.criteria.marketCap && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
              </Badge>
            </div>

            {stock.beta !== null && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Beta:</span>
                <Badge 
                  variant={stock.criteria.beta ? "default" : "outline"} 
                  className={`${
                    stock.criteria.beta 
                      ? 'bg-green-700/20 text-green-300 border-green-600' 
                      : 'bg-slate-700 text-slate-400 border-slate-600'
                  } px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}
                >
                  {stock.beta.toFixed(2)}
                  {stock.criteria.beta && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
                </Badge>
              </div>
            )}

            {stock.payout_ratio !== null && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payout:</span>
                <Badge 
                  variant={stock.criteria.payoutRatio ? "default" : "outline"} 
                  className={`${
                    stock.criteria.payoutRatio 
                      ? 'bg-green-700/20 text-green-300 border-green-600' 
                      : 'bg-slate-700 text-slate-400 border-slate-600'
                  } px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}
                >
                  {stock.payout_ratio.toFixed(1)}%
                  {stock.criteria.payoutRatio && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
                </Badge>
              </div>
            )}
          </div>

          <Link href={`${createPageUrl("Dashboard")}?ticker=${stock.ticker}&tab=analysis`} className="mt-auto">
            <Button
              size="sm"
              className="w-full bg-[#3FB923] hover:bg-green-600 text-white text-xs sm:text-sm h-8 md:h-9 py-1.5 md:py-2"
            >
              View Analysis <ArrowRight className="h-3 md:h-4 w-3 md:w-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  };

  if (!hasLoaded && !isLoading) {
    // If stocks are not yet loaded and we haven't processed them,
    // and there are no stocks provided yet, we might want to return null initially.
    // However, since `stocks` is a prop, it could be empty initially.
    // The `useEffect` handles processing when stocks arrive.
    // Let's refine this to show loader if stocks are expected but not here,
    // or nothing if it's the very first render before any data comes.
    // For now, if stocks are empty and not loading, we can assume it's just the initial state.
    // The conditional rendering below will show "No stocks found" if `suggestedStocks` is empty.
  }

  const exactMatches = suggestedStocks.filter(stock => stock.isExactMatch);
  const partialMatches = suggestedStocks.filter(stock => !stock.isExactMatch);

  return (
    <div className="mb-6 sm:mb-8 px-2 sm:px-0">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-yellow-500 mr-2" />
          <h2 className="text-lg sm:text-xl font-semibold text-slate-100">
            AI Suggested Assets
          </h2>
          {isUpdatingConfig && (
            <div className="flex items-center ml-3">
              <Loader2 className="h-4 w-4 text-green-400 animate-spin mr-2" />
              <span className="text-xs text-slate-400">Updating...</span>
            </div>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 ml-1 p-1"
              >
                <InfoIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="bottom" 
              align="center" 
              className="max-w-xs text-xs bg-slate-800 text-slate-200 p-3 rounded-md shadow-lg z-50 border-slate-600"
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <div className="whitespace-pre-line">
                {getConfigurationTooltipText()}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Desktop: Show action buttons directly */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfigOpen(true)}
            disabled={isLoading || isUpdatingConfig}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchSuggestedAssets(null, true)}
            disabled={isLoading || isUpdatingConfig}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Refresh
          </Button>
        </div>

        {/* Mobile: Keep dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 md:hidden">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-slate-200">
            <DropdownMenuItem
              onClick={() => setConfigOpen(true)}
              disabled={isLoading || isUpdatingConfig}
              className="text-sm cursor-pointer focus:bg-slate-700 focus:text-green-300 hover:bg-slate-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => fetchSuggestedAssets(null, true)}
              disabled={isLoading || isUpdatingConfig}
              className="text-sm cursor-pointer focus:bg-slate-700 focus:text-green-300 hover:bg-slate-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading && (!hasLoaded || stocks.length === 0) ? ( // Check if still loading or waiting for initial stocks data
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-green-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300">Finding dividend stocks...</p>
        </div>
      ) : isUpdatingConfig ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-green-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300">Updating suggestions...</p>
        </div>
      ) : error ? (
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <Button
              onClick={() => fetchSuggestedAssets(null, true)}
              variant="outline"
              size="sm"
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : suggestedStocks.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {exactMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center">
                <Crown className="h-4 w-4 mr-1" />
                Perfect Matches ({exactMatches.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
                {exactMatches.map((stock, index) => (
                  <SuggestedStockCard key={`exact-${stock.ticker}-${index}`} stock={stock} />
                ))}
              </div>
            </div>
          )}
          
          {partialMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">
                Partial Matches ({partialMatches.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {partialMatches.map((stock, index) => (
                  <SuggestedStockCard key={`partial-${stock.ticker}-${index}`} stock={stock} />
                ))}
              </div>
            </div>
          )}
          
          <div className="text-center text-xs text-slate-500 mt-4">
            {exactMatches.length > 0 && partialMatches.length > 0
              ? `${exactMatches.length} perfect matches, ${partialMatches.length} partial matches`
              : `Showing ${suggestedStocks.length} dividend stocks matching your criteria`
            }
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No Stocks Match Your Criteria"
          subtitle="Try adjusting your filters or search for more dividend stocks to add to your collection."
          quickAddTickers={["JNJ", "KO", "O", "PG", "ABBV"]}
          onQuickAdd={handleQuickAddStock}
          showQuickAdd={stocks.length === 0}
          actionLabel="Adjust Filters"
          onAction={() => setConfigOpen(true)}
        />
      )}

      <ConfigurationDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        currentConfig={assetConfig}
        onSaveConfig={handleConfigSave}
      />
    </div>
  );
}
