'use client';

import React, { useState, useEffect } from "react";
import { Stock } from "@/entities/Stock";
import { Watchlist } from "@/entities/Watchlist";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WatchlistButton from "@/components/WatchlistButton";
import { 
  DollarSign, 
  Award, 
  Target, 
  ArrowRight,
  Loader2,
  Info,
  CheckCircle,
  Crown,
  History,
  Search,
  PieChart,
  Star,
  ChevronRight,
  Clock,
  StarOff,
} from "lucide-react";

// Data freshness helper
const getDataFreshness = (lastUpdated) => {
  if (!lastUpdated) {
    return { label: 'No data', color: 'text-red-400', isStale: true };
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
  
  if (diffHours < 1) {
    return { label, color: 'text-green-400', isStale: false };
  } else if (diffHours < 24) {
    return { label, color: 'text-yellow-400', isStale: false };
  } else {
    return { label, color: 'text-red-400', isStale: true };
  }
};
import Link from "next/link";
import { createPageUrl } from "@/utils";
import FilterSelectComponent from "../components/FilterSelectComponent";
import MarketCapDisplay from "../components/MarketCapDisplay";
import { LoadingState } from "@/components/layout";
import { getMetricHealth, healthBadgeClasses } from "@/config/metricHealthConfig";

export default function SuggestedStocks() {
  const [allStocks, setAllStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); 
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          setCurrentUserEmail("");
          setAllStocks([]);
          setIsLoading(false);
          return;
        }

        setCurrentUserEmail(session.user.email);

        const watchlistTickers = await Watchlist.listTickers();
        if (watchlistTickers.length === 0) {
          setAllStocks([]);
          setIsLoading(false);
          return;
        }

        const fetchedStocks = await Stock.listByTickers(watchlistTickers);

        const seenTickers = new Set();
        const uniqueStocks = fetchedStocks
          .sort((a, b) => {
            const dateA = a.last_updated ? new Date(a.last_updated) : (a.updated_date ? new Date(a.updated_date) : new Date(0));
            const dateB = b.last_updated ? new Date(b.last_updated) : (b.updated_date ? new Date(b.updated_date) : new Date(0));
            return dateB - dateA;
          })
          .filter(stock => {
            const key = stock.ticker?.toUpperCase();
            if (!key || seenTickers.has(key)) return false;
            seenTickers.add(key);
            return true;
          });

        setAllStocks(uniqueStocks);
      } catch (error) {
        console.error("Error loading stocks:", error);
        setCurrentUserEmail("");
        setAllStocks([]);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const dividendStocks = allStocks.filter(stock => 
    stock.dividend_yield && 
    parseFloat(stock.dividend_yield) > 0
  );

  const goodROEStocks = dividendStocks.filter(stock => 
    stock.roe && parseFloat(stock.roe) >= 15
  );

  const goodChowderStocks = dividendStocks.filter(stock => {
    if (!stock.dividend_yield || !stock.avg_div_growth_5y) return false;
    const chowder = parseFloat(stock.dividend_yield) + parseFloat(stock.avg_div_growth_5y);
    return chowder > 10.5;
  });

  const premiumStocks = dividendStocks.filter(stock => {
    const hasGoodROE = stock.roe && parseFloat(stock.roe) >= 15;
    const hasGoodChowder = stock.dividend_yield && stock.avg_div_growth_5y && 
      (parseFloat(stock.dividend_yield) + parseFloat(stock.avg_div_growth_5y)) > 10.5;
    return hasGoodROE && hasGoodChowder;
  });
  
  const filterOptions = [
    { value: "all", label: "All Dividend", count: dividendStocks.length, icon: DollarSign, description: "All dividend-paying stocks in your watchlist.", data: dividendStocks, emptyMessage: "No dividend-paying stocks found in your watchlist." },
    { value: "roe", label: "Good ROE", count: goodROEStocks.length, icon: Target, description: "ROE ≥ 15%", data: goodROEStocks, emptyMessage: "No dividend stocks with ROE ≥ 15% found in your watchlist." },
    { value: "chowder", label: "Good Chowder", count: goodChowderStocks.length, icon: Award, description: "Chowder Number > 10.5", data: goodChowderStocks, emptyMessage: "No stocks with Chowder Number > 10.5 found in your watchlist." },
    { value: "premium", label: "Premium", count: premiumStocks.length, icon: Crown, description: "ROE ≥ 15% AND Chowder > 10.5", data: premiumStocks, emptyMessage: "No stocks meeting premium criteria found in your watchlist." },
  ];

  const handleRemoveFromWatchlist = (ticker) => {
    setAllStocks(prev => prev.filter(s => s.ticker?.toUpperCase() !== ticker?.toUpperCase()));
  };

  const StockCard = ({ stock, isPremium = false }) => {
    const dividendYield = stock.dividend_yield ? parseFloat(stock.dividend_yield) : null;
    const roe = stock.roe ? parseFloat(stock.roe) : null;
    const chowderNumber = stock.dividend_yield && stock.avg_div_growth_5y ? 
      parseFloat(stock.dividend_yield) + parseFloat(stock.avg_div_growth_5y) : null;

    const yieldHealth = getMetricHealth("dividend_yield", dividendYield);
    const roeHealth = getMetricHealth("roe", roe);
    const chowderHealth = getMetricHealth("chowder", chowderNumber);

    return (
      <Card className={`bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200 hover:shadow-lg transition-shadow duration-300 flex flex-col ${isPremium ? "ring-1 ring-amber-400" : ""}`}>
        <CardContent className="p-3 md:p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="flex-grow min-w-0 mr-2">
              <div className="flex items-center gap-1">
                <h3 className="text-base md:text-lg font-semibold text-slate-100 leading-tight truncate">
                  {stock.ticker?.toUpperCase()}
                </h3>
                <WatchlistButton 
                  ticker={stock.ticker} 
                  size="sm" 
                  initialIsInWatchlist={true}
                  onToggle={(result) => !result.added && handleRemoveFromWatchlist(result.ticker)}
                />
                {isPremium && <Crown className="h-4 md:h-5 w-4 md:w-5 text-yellow-500 flex-shrink-0" />}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 truncate">
                {stock.name || "No name available"}
              </p>
              {/* Data freshness indicator */}
              {(() => {
                const freshness = getDataFreshness(stock.last_updated || stock.updated_at);
                return (
                  <div className={`flex items-center gap-1 mt-0.5 text-[10px] ${freshness.color}`}>
                    <Clock className="h-2.5 w-2.5" />
                    <span>{freshness.label}</span>
                  </div>
                );
              })()}
            </div>
            {stock.price && (
              <div className="text-sm md:text-base lg:text-lg font-semibold text-green-400 whitespace-nowrap flex-shrink-0"> {/* Price text color */}
                ${parseFloat(stock.price).toFixed(2)}
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-xs sm:text-sm mb-3 md:mb-4 flex-grow">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Yield:</span>
              <Badge variant={yieldHealth?.status === "good" ? "default" : "outline"} className={`${yieldHealth ? healthBadgeClasses(yieldHealth.color) : "bg-slate-700 text-slate-400 border-slate-600"} px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}>
                {dividendYield ? `${dividendYield.toFixed(2)}%` : "N/A"}
                {yieldHealth?.status === "good" && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">ROE:</span>
              <Badge variant={roeHealth?.status === "good" ? "default" : "outline"} className={`${roeHealth ? healthBadgeClasses(roeHealth.color) : "bg-slate-700 text-slate-400 border-slate-600"} px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}>
                {roe ? `${roe.toFixed(1)}%` : "N/A"}
                {roeHealth?.status === "good" && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Chowder:</span>
              <Badge variant={chowderHealth?.status === "good" ? "default" : "outline"} className={`${chowderHealth ? healthBadgeClasses(chowderHealth.color) : "bg-slate-700 text-slate-400 border-slate-600"} px-1.5 py-0.5 text-[10px] md:text-xs font-normal`}>
                {chowderNumber ? chowderNumber.toFixed(1) : "N/A"}
                {chowderHealth?.status === "good" && <CheckCircle className="h-2.5 md:h-3 w-2.5 md:w-3 inline ml-0.5" />}
              </Badge>
            </div>
            {stock.sector && (
              <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">Sector:</span>
                  <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] md:text-xs font-normal text-slate-300 bg-slate-700 border-slate-600 truncate max-w-[90px] sm:max-w-[120px] md:max-w-[150px]">
                    {stock.sector}
                  </Badge>
              </div>
            )}
            {stock.market_cap && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">Market Cap:</span>
                <MarketCapDisplay 
                  value={stock.market_cap ? stock.market_cap * 1_000_000 : null}
                  showTooltip={true}
                  className="text-xs font-medium text-green-400"
                  label="Market Cap"
                />
              </div>
            )}
            {stock.ebt && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">EBT:</span>
                <MarketCapDisplay
                  value={stock.ebt ? stock.ebt * 1_000_000 : null}
                  showTooltip={true}
                  className="text-xs font-medium text-green-400"
                  label="Earnings Before Tax (EBT)"
                />
              </div>
            )}
          </div>

          <Link href={`${createPageUrl("Dashboard")}?ticker=${stock.ticker}&tab=analysis`} className="mt-auto">
            <Button size="sm" className="w-full bg-[#3FB923] hover:bg-green-600 text-white text-xs sm:text-sm h-8 md:h-9 py-1.5 md:py-2">
              View Analysis <ArrowRight className="h-3 md:h-4 w-3 md:w-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  };

  // StockGrid no longer renders title/description/icon
  const StockGrid = ({ stocks, emptyMessage, premiumStocks: passedPremiumStocks }) => (
    <div className="space-y-3 sm:space-y-4">
      {stocks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {stocks.map((stockItem) => (
            <StockCard 
              key={`${stockItem.id}-${stockItem.last_updated || ''}`} 
              stock={stockItem} 
              isPremium={passedPremiumStocks.some(ps => ps.id === stockItem.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="mt-4 p-4 sm:p-6 text-center border-dashed bg-slate-800 border-slate-700">
          <Info className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-slate-400">{emptyMessage}</p>
        </Card>
      )}
    </div>
  );

  if (isLoading || currentUserEmail === null) { 
    return <LoadingState message="Loading watchlist..." />;
  }
  
  const selectedFilterOption = filterOptions.find(opt => opt.value === activeTab) || filterOptions[0];
  const CurrentFilterIcon = selectedFilterOption.icon;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 pb-4">
      <div className="max-w-7xl mx-auto">
        {!isLoading && currentUserEmail === "" && allStocks.length === 0 ? ( 
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4">
             <Card className="max-w-md mx-auto shadow-lg bg-slate-800 border-slate-700">
               <CardContent className="p-6 sm:p-8 text-center">
                 <Info className="h-12 w-12 sm:h-16 sm:w-16 text-green-400 mx-auto mb-4 sm:mb-6" /> {/* Icon color */}
                 <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-slate-100">Unable to Load Watchlist</h3>
                 <p className="text-xs sm:text-sm text-slate-300 mb-4 sm:mb-6">
                   Please log in to view your watchlist. If you are logged in, there might have been an issue fetching your data.
                 </p>
               </CardContent>
             </Card>
           </div>
        ) : (!isLoading && currentUserEmail !== "" && allStocks.length === 0 ? ( 
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4">
            <Card className="max-w-lg mx-auto shadow-lg bg-slate-800 border-slate-700">
              <CardContent className="p-6 sm:p-8">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-700 flex items-center justify-center">
                    <StarOff className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                  </div>
                </div>
                
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-slate-100 text-center">
                  Your Watchlist is Empty
                </h3>
                
                <p className="text-xs sm:text-sm text-slate-400 text-center mb-6 px-2">
                  Add stocks to your watchlist by clicking the <Star className="h-4 w-4 inline text-yellow-400" /> star icon when viewing any stock.
                </p>
                
                <div className="flex justify-center">
                  <Link href={createPageUrl("Dashboard")}>
                    <Button className="bg-[#3FB923] hover:bg-green-600 text-white px-5 py-2.5 text-sm sm:text-base">
                      <Search className="mr-2 h-4 w-4" />
                      Search for Stocks
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="w-full">
            <div className="sticky top-16 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-700 py-3 px-3 sm:px-4">
              {/* Desktop: Title & Description in Sticky Bar */}
              <div className="hidden sm:flex sm:items-center sm:gap-2.5">
                {CurrentFilterIcon && <CurrentFilterIcon className="h-5 w-5 text-green-400 flex-shrink-0" />} {/* Icon color */}
                <div>
                  <h2 className="text-md sm:text-lg font-semibold text-slate-100">{selectedFilterOption.label}</h2>
                  {selectedFilterOption.description && <p className="text-2xs sm:text-xs text-slate-300">{selectedFilterOption.description}</p>}
                </div>
              </div>

              {/* Mobile: Filter Dropdown in Sticky Bar */}
              <div className="block sm:hidden max-w-xs mx-auto sm:max-w-sm">
                <FilterSelectComponent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  filterOptions={filterOptions}
                />
              </div>
            </div>
            
            <div className="px-3 sm:px-4 pt-4 sm:pt-6">
              {/* Desktop: Filter Dropdown in Main Content */}
              <div className="hidden sm:block max-w-xs mb-6 sm:max-w-sm">
                <FilterSelectComponent
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  filterOptions={filterOptions}
                />
              </div>
              {/* Stock Grid (no longer has title/desc internally) */}
               <StockGrid
                  stocks={selectedFilterOption.data}
                  emptyMessage={selectedFilterOption.emptyMessage}
                  premiumStocks={premiumStocks} // Pass premiumStocks here
                />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
