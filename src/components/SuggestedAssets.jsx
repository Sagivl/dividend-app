
import React, { useState, useEffect, useMemo, useRef } from "react";
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
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Shield,
  List,
  ChevronDown,
  Clock
} from "lucide-react";
import { fetchHybridStockData } from "@/functions/hybridDataFetcher";
import { Stock } from "@/entities/Stock";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPageUrl } from "@/utils";
import ConfigurationDialog, { defaultConfig } from "./configure/ConfigurationDialog";
import EmptyState from "./EmptyState";
import { User } from "@/entities/User";
import { getPersonalizedTickers, filterStocks, isPersonalizedStock } from "@/config/personalizedStocks";
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
import WatchlistButton from "./WatchlistButton";

// Data freshness helper - returns { label, color, isStale }
const getDataFreshness = (lastUpdated) => {
  if (!lastUpdated) {
    return { label: 'No data', color: 'text-red-400', bgColor: 'bg-red-900/30', isStale: true };
  }
  
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const diffMs = now - updated;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  let label;
  if (diffMins < 1) {
    label = 'Just now';
  } else if (diffMins < 60) {
    label = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    label = `${diffHours}h ago`;
  } else if (diffDays === 1) {
    label = 'Yesterday';
  } else if (diffDays < 7) {
    label = `${diffDays}d ago`;
  } else {
    label = `${Math.floor(diffDays / 7)}w ago`;
  }
  
  // Color coding: green < 1 hour, yellow 1-24 hours, red > 24 hours
  if (diffHours < 1) {
    return { label, color: 'text-green-400', bgColor: 'bg-green-900/30', isStale: false };
  } else if (diffHours < 24) {
    return { label, color: 'text-yellow-400', bgColor: 'bg-yellow-900/30', isStale: false };
  } else {
    return { label, color: 'text-red-400', bgColor: 'bg-red-900/30', isStale: true };
  }
};

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

// Filter options for the suggestion tabs
const FILTER_OPTIONS = [
  { value: 'forYou', label: 'For You', icon: Sparkles, description: 'Based on your investment goals' },
  { value: 'highYield', label: 'High Yield', icon: DollarSign, description: 'Dividend yield ≥ 4%' },
  { value: 'growth', label: 'Growth', icon: TrendingUp, description: 'Strong dividend growth (5Y avg ≥ 5%)' },
  { value: 'lowRisk', label: 'Low Risk', icon: Shield, description: 'Low volatility (Beta ≤ 0.8)' },
  { value: 'all', label: 'All Matches', icon: List, description: 'All dividend stocks' },
];

export default function SuggestedAssets({ stocks = [], onRefresh }) {
  const [suggestedStocks, setSuggestedStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0 });
  const [lastLiveRefresh, setLastLiveRefresh] = useState(null);
  const hasAutoRefreshed = useRef(false);
  
  // Keep a ref to the latest stocks to avoid stale closure issues
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;
  const [activeFilter, setActiveFilter] = useState(() => {
    if (typeof window === 'undefined') return 'forYou';
    try {
      const saved = localStorage.getItem("suggestedAssetsFilter");
      return saved || 'forYou';
    } catch {
      return 'forYou';
    }
  });
  const [userPreferences, setUserPreferences] = useState({
    investment_goal: null,
    risk_tolerance: null
  });
  const [personalizedTickers, setPersonalizedTickers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const user = await User.me();
        setUserPreferences({
          investment_goal: user.investment_goal,
          risk_tolerance: user.risk_tolerance
        });
        const tickers = getPersonalizedTickers(user.investment_goal, user.risk_tolerance);
        setPersonalizedTickers(tickers);
      } catch (error) {
        console.error("Error loading user preferences:", error);
      }
    };
    loadUserPreferences();
  }, []);

  // Save filter preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("suggestedAssetsFilter", activeFilter);
    }
  }, [activeFilter]);

  const stocksDataKey = useMemo(() => {
    return stocks
      .map(s => `${s.ticker}-${s.last_updated || s.updated_date || ''}-${s.price || ''}`)
      .sort()
      .join('|');
  }, [stocks]);

  const fetchSuggestedAssets = async (configOverride = null, shouldRefreshData = false, filterOverride = null) => {
    const currentConfig = configOverride || assetConfig;
    const currentFilter = filterOverride || activeFilter;
    setIsLoading(true);
    setError(null);
    
    try {
      // If refresh is requested and onRefresh callback is provided, call it
      if (shouldRefreshData && onRefresh) {
        console.log("Refreshing stocks data from database...");
        await onRefresh();
        return; // The useEffect will re-run fetchSuggestedAssets when stocks prop updates
      }
      
      // Always use stocksRef.current to get the latest stocks (avoids stale closure)
      const allStocks = stocksRef.current || [];

      // Filter and evaluate stocks based on configuration
      let evaluatedStocks = allStocks
        .filter(stock => {
          // Basic validation - must have dividend data
          return stock.ticker && 
                 stock.price && parseFloat(stock.price) > 0 && 
                 stock.dividend_yield && parseFloat(stock.dividend_yield) > 0;
        })
        .map(stock => {
          const evaluated = evaluateStock(stock, currentConfig);
          evaluated.isPersonalized = isPersonalizedStock(stock.ticker, personalizedTickers);
          return evaluated;
        });
      
      // Note: We show ALL dividend-paying stocks, not just those meeting criteria
      // The scoring system ranks them, with higher scores for stocks meeting more criteria

      // Apply filter-specific criteria
      if (currentFilter === 'forYou') {
        // Only show personalized stocks for "For You" tab
        evaluatedStocks = evaluatedStocks.filter(stock => stock.isPersonalized);
      } else if (currentFilter === 'highYield') {
        evaluatedStocks = evaluatedStocks.filter(stock => 
          stock.dividend_yield !== null && stock.dividend_yield >= 4
        );
      } else if (currentFilter === 'growth') {
        evaluatedStocks = evaluatedStocks.filter(stock => 
          stock.avg_div_growth_5y !== null && stock.avg_div_growth_5y >= 5
        );
      } else if (currentFilter === 'lowRisk') {
        evaluatedStocks = evaluatedStocks.filter(stock => 
          stock.beta !== null && stock.beta <= 0.8
        );
      }

      // Sorting helper function
      const sortByScoreAndYield = (a, b) => {
        // Exact matches first
        if (a.isExactMatch && !b.isExactMatch) return -1;
        if (!a.isExactMatch && b.isExactMatch) return 1;
        // Then by score (criteria met)
        if (a.score !== b.score) return b.score - a.score;
        // Then by dividend yield
        return (b.dividend_yield || 0) - (a.dividend_yield || 0);
      };

      // Sort all stocks by score and yield
      evaluatedStocks.sort(sortByScoreAndYield);

      // Remove duplicates by ticker - keep the most recently updated version
      const stocksByTicker = new Map();
      evaluatedStocks.forEach(stock => {
        const ticker = stock.ticker.toUpperCase();
        const existing = stocksByTicker.get(ticker);
        if (!existing) {
          stocksByTicker.set(ticker, stock);
        } else {
          // Keep the one with the most recent last_updated timestamp
          const existingDate = new Date(existing.last_updated || 0);
          const newDate = new Date(stock.last_updated || 0);
          if (newDate > existingDate) {
            stocksByTicker.set(ticker, stock);
          }
        }
      });
      
      // Convert back to array and re-sort (since we want to maintain score order)
      const uniqueStocks = Array.from(stocksByTicker.values());
      uniqueStocks.sort(sortByScoreAndYield);

      // Store all matching stocks (display is limited based on isExpanded state)
      setSuggestedStocks(uniqueStocks);

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
    // Uses stocksRef.current internally to always get latest stocks
    if (stocks.length > 0) {
      fetchSuggestedAssets();
    }
  }, [stocksDataKey, stocks.length, activeFilter, personalizedTickers]); // Re-run when filter or personalization changes

  // Refresh stocks with live data from eToro API
  const refreshLiveData = async (stocksToRefresh = null) => {
    // Rate limit: max 1 bulk refresh per 5 minutes
    const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes
    if (lastLiveRefresh && Date.now() - lastLiveRefresh < REFRESH_COOLDOWN) {
      const remainingTime = Math.ceil((REFRESH_COOLDOWN - (Date.now() - lastLiveRefresh)) / 1000 / 60);
      toast({
        title: "Please wait",
        description: `You can refresh again in ${remainingTime} minute${remainingTime > 1 ? 's' : ''}.`,
        variant: "default",
        duration: 3000,
      });
      return;
    }

    setIsRefreshingLive(true);
    setError(null);
    
    try {
      // Get the stocks to refresh (either passed in or the currently displayed ones)
      const targetStocks = stocksToRefresh || suggestedStocks.slice(0, 12); // Limit to 12 stocks
      setRefreshProgress({ current: 0, total: targetStocks.length });
      
      let successCount = 0;
      let failCount = 0;
      
      // Fetch data for each stock sequentially to avoid rate limits
      for (let i = 0; i < targetStocks.length; i++) {
        const stock = targetStocks[i];
        setRefreshProgress({ current: i + 1, total: targetStocks.length });
        
        try {
          const result = await fetchHybridStockData(stock.ticker, stock);
          
          if (result.success && result.data) {
            // Update the stock in the database
            if (stock.id) {
              await Stock.update(stock.id, result.data);
            }
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Failed to refresh ${stock.ticker}:`, err);
          failCount++;
        }
        
        // Small delay between requests to avoid rate limiting
        if (i < targetStocks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      setLastLiveRefresh(Date.now());
      
      // Reload stocks from database to get updated data
      if (onRefresh) {
        await onRefresh();
      }
      
      toast({
        title: "Refresh complete",
        description: `Updated ${successCount} of ${targetStocks.length} stocks with live data.`,
        variant: successCount > 0 ? "success" : "default",
        duration: 3000,
      });
      
    } catch (err) {
      console.error("Error refreshing live data:", err);
      setError("Failed to refresh live data. Please try again.");
      toast({
        title: "Refresh failed",
        description: "Could not fetch live data. Please try again later.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsRefreshingLive(false);
      setRefreshProgress({ current: 0, total: 0 });
    }
  };

  // Auto-refresh stale stocks on initial load (only once)
  useEffect(() => {
    if (hasLoaded && suggestedStocks.length > 0 && !hasAutoRefreshed.current) {
      // Check if most displayed stocks are stale (> 24 hours old)
      const staleStocks = suggestedStocks.slice(0, 12).filter(stock => {
        const freshness = getDataFreshness(stock.last_updated || stock.updated_at);
        return freshness.isStale;
      });
      
      // If more than 50% of displayed stocks are stale, auto-refresh
      if (staleStocks.length > 6) {
        hasAutoRefreshed.current = true;
        console.log(`Auto-refreshing ${staleStocks.length} stale stocks...`);
        refreshLiveData(staleStocks);
      }
    }
  }, [hasLoaded, suggestedStocks]);

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
    setIsExpanded(false); // Reset expansion when filter changes
    // fetchSuggestedAssets will be triggered by the useEffect above
  };

  // Get label for expand/collapse CTA
  const getExpandLabel = () => {
    const filterOption = FILTER_OPTIONS.find(f => f.value === activeFilter);
    if (isExpanded) return 'Show Less';
    if (!filterOption || activeFilter === 'forYou') return 'See All Stocks';
    return `See All ${filterOption.label} Stocks`;
  };

  // Toggle expanded view
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

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
    return `Stocks are filtered and scored based on your criteria:
• Min. Market Cap: $${assetConfig.marketCapMin / 1000}B
• Min. Chowder Number: ${assetConfig.chowderMin}
• Max. Payout Ratio: ${assetConfig.payoutRatioMax}%
• Min. ROE: ${assetConfig.roeMin}%
• Max. Beta: ${assetConfig.betaMax}
• Min. Dividend Yield: ${assetConfig.dividendYieldMin}%

Exact matches (meeting all criteria) are shown first, followed by partial matches sorted by relevance.

Click "Refresh" to fetch live market data from eToro.`;
  };

  const SuggestedStockCard = ({ stock }) => {
    const chowderNumber = stock.calculatedChowder;

    return (
      <Card className={`bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200 hover:shadow-lg transition-all duration-300 flex flex-col ${stock.isExactMatch ? "ring-1 ring-green-500" : ""} ${stock.isPersonalized ? "ring-1 ring-yellow-500/50" : ""}`}>
        <CardContent className="p-3 md:p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="flex flex-col flex-grow min-w-0 mr-2">
              <div className="flex items-center gap-1">
                <h3 className="text-base md:text-lg font-semibold text-slate-100 leading-tight truncate">
                  {stock.ticker}
                </h3>
                <WatchlistButton ticker={stock.ticker} size="sm" />
                {stock.isExactMatch && <Crown className="h-4 md:h-5 w-4 md:w-5 text-yellow-500 flex-shrink-0" />}
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
              {/* Data freshness indicator */}
              {(() => {
                const freshness = getDataFreshness(stock.last_updated || stock.updated_at);
                return (
                  <div className={`flex items-center gap-1 mt-1 text-[10px] ${freshness.color}`}>
                    <Clock className="h-2.5 w-2.5" />
                    <span>{freshness.label}</span>
                  </div>
                );
              })()}
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

  // Limit displayed stocks based on expansion state
  const displayLimit = 20;
  const displayedStocks = isExpanded ? suggestedStocks : suggestedStocks.slice(0, displayLimit);
  const hasMoreStocks = suggestedStocks.length > displayLimit;
  const hiddenCount = suggestedStocks.length - displayLimit;

  // Categorize stocks for display
  const exactMatches = displayedStocks.filter(stock => stock.isExactMatch);
  const partialMatches = displayedStocks.filter(stock => !stock.isExactMatch && stock.metCriteriaCount > 0);
  const otherStocks = displayedStocks.filter(stock => stock.metCriteriaCount === 0);

  return (
    <div className="mb-6 sm:mb-8 px-2 sm:px-0">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center">
          <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
          <h2 className="text-lg sm:text-xl font-semibold text-slate-100">
            Suggested Assets
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
            Criteria
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshLiveData()}
            disabled={isLoading || isUpdatingConfig || isRefreshingLive}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          >
            {isRefreshingLive ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                {refreshProgress.total > 0 && (
                  <span className="text-xs">{refreshProgress.current}/{refreshProgress.total}</span>
                )}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Refresh
              </>
            )}
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
              Criteria
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => refreshLiveData()}
              disabled={isLoading || isUpdatingConfig || isRefreshingLive}
              className="text-sm cursor-pointer focus:bg-slate-700 focus:text-green-300 hover:bg-slate-700"
            >
              {isRefreshingLive ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {refreshProgress.total > 0 && `${refreshProgress.current}/${refreshProgress.total}`}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Live Data
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4">
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {FILTER_OPTIONS.map((filter) => {
              const FilterIcon = filter.icon;
              const isActive = activeFilter === filter.value;
              return (
                <Button
                  key={filter.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(filter.value)}
                  disabled={isLoading || isUpdatingConfig}
                  className={`
                    flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap transition-colors
                    ${isActive 
                      ? 'bg-[#3FB923] hover:bg-green-600 text-white border-[#3FB923]' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-200 border-slate-600 hover:border-slate-500'
                    }
                  `}
                >
                  <FilterIcon className="h-3.5 w-3.5" />
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>
        {/* Active filter description - outside scrollable area */}
        <p className="text-xs text-slate-400 mt-2">
          {FILTER_OPTIONS.find(f => f.value === activeFilter)?.description}
          {activeFilter === 'forYou' && userPreferences.investment_goal && (
            <span className="ml-1 text-green-400">
              ({userPreferences.investment_goal}, {userPreferences.risk_tolerance || 'moderate'})
            </span>
          )}
        </p>
      </div>

      {/* Stale data warning */}
      {hasLoaded && !isRefreshingLive && suggestedStocks.length > 0 && (() => {
        const staleCount = suggestedStocks.slice(0, 12).filter(s => 
          getDataFreshness(s.last_updated || s.updated_at).isStale
        ).length;
        const displayedCount = Math.min(suggestedStocks.length, 12);
        if (staleCount > displayedCount / 2) {
          return (
            <div className="mb-4 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-xs sm:text-sm text-yellow-300">
                  {staleCount} of {displayedCount} stocks have outdated data (24h+)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshLiveData()}
                disabled={isRefreshingLive}
                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Update Now
              </Button>
            </div>
          );
        }
        return null;
      })()}

      {/* Live refresh progress indicator */}
      {isRefreshingLive && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-green-400 animate-spin" />
            <div className="flex-1">
              <p className="text-sm text-green-300">
                Fetching live data... {refreshProgress.current}/{refreshProgress.total}
              </p>
              <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: refreshProgress.total > 0 ? `${(refreshProgress.current / refreshProgress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <SuggestedStockCard key={`exact-${stock.ticker}-${stock.last_updated || index}`} stock={stock} />
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
                  <SuggestedStockCard key={`partial-${stock.ticker}-${stock.last_updated || index}`} stock={stock} />
                ))}
              </div>
            </div>
          )}

          {otherStocks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">
                Other Dividend Stocks ({otherStocks.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {otherStocks.map((stock, index) => (
                  <SuggestedStockCard key={`other-${stock.ticker}-${stock.last_updated || index}`} stock={stock} />
                ))}
              </div>
            </div>
          )}
          
          <div className="text-center text-xs text-slate-500 mt-4">
            {`Showing ${displayedStocks.length}${!isExpanded && hasMoreStocks ? ` of ${suggestedStocks.length}` : ''} dividend stocks`}
            {exactMatches.length > 0 && ` • ${exactMatches.length} perfect`}
            {partialMatches.length > 0 && ` • ${partialMatches.length} partial`}
          </div>
          
          {/* Expand/Collapse CTA */}
          {hasMoreStocks && (
            <div className="text-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleExpand}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-green-500"
              >
                {getExpandLabel()}
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
              {!isExpanded && (
                <p className="text-[10px] text-slate-500 mt-1">
                  {hiddenCount} more stocks available
                </p>
              )}
            </div>
          )}
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
