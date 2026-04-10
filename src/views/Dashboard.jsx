'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Stock, mergeFetchedStockForDisplay } from "@/entities/Stock";
import { User } from "@/entities/User";
import StockDataInput from "../components/StockDataInput";
import StockAnalysis from "../components/StockAnalysis";
import SuggestedAssets from "../components/SuggestedAssets";
import OnboardingModal from "../components/OnboardingModal";
import WatchlistButton from "../components/WatchlistButton";
import BuyButton from "../components/trading/BuyButton";
import StockLogo from "../components/StockLogo";
import { getPersonalizedConfig } from "../components/configure/ConfigurationDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, PieChart, Sparkles, Loader2, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchHybridStockData } from "../functions/hybridDataFetcher";
import { generateStockExplanation } from "../functions/aiAnalysis";
import { PageContainer, LoadingState } from "@/components/layout";
import { toast } from "@/components/ui/use-toast";

const verdictConfig = {
  Buy:   { color: "bg-green-900/50 text-green-300 border-green-700" },
  Hold:  { color: "bg-amber-900/50 text-amber-300 border-amber-700" },
  Watch: { color: "bg-blue-900/50 text-blue-300 border-blue-700" },
};

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400 bg-green-400/10 border-green-500/30";
  if (score >= 60) return "text-amber-400 bg-amber-400/10 border-amber-500/30";
  return "text-red-400 bg-red-400/10 border-red-500/30";
};

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("input");
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitialStocksLoading, setIsInitialStocksLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [aiExplanation, setAiExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Simple ref to prevent duplicate requests
  const isLoadingStocks = useRef(false);
  const lastProcessedSearch = useRef(""); // Track last processed search params

  useEffect(() => {
    const init = async () => {
      // Run user fetch and stock loading in parallel — don't gate stocks on user/seeding
      const userPromise = User.me().catch(err => {
        console.error("Error fetching current user:", err);
        return null;
      });

      // Start loading stocks immediately (don't wait for seeding)
      loadAllStocks();

      const user = await userPromise;
      if (user) {
        setCurrentUser(user);
        if (user.is_new_user && !user.onboarding_completed) {
          setShowOnboarding(true);
        }
      }

      // Seed in background — next load will pick them up
      Stock.seedSampleStocks().catch(() => {});
    };
    init();
  }, []);

  const handleOnboardingComplete = async (preferences) => {
    try {
      // Save user preferences
      await User.markOnboardingComplete(preferences);
      
      // Apply personalized config based on preferences
      const personalizedConfig = getPersonalizedConfig(
        preferences.investment_goal,
        preferences.risk_tolerance
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem("dividendAssetConfig", JSON.stringify(personalizedConfig));
      }
      
      // Update current user state
      const updatedUser = await User.me();
      setCurrentUser(updatedUser);
      
      // Close onboarding modal
      setShowOnboarding(false);
      
      // Reload stocks to trigger re-evaluation with new config
      loadAllStocks();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setShowOnboarding(false);
    }
  };

  // Simple function to load all stocks once
  const loadAllStocks = async () => {
    if (isLoadingStocks.current) return;
    
    isLoadingStocks.current = true;
    setIsInitialStocksLoading(true);
    
    try {
      console.log("Loading all stocks from database");
      const fetchedStocks = await Stock.list("-last_updated");
      setStocks(fetchedStocks || []);
      console.log(`Loaded ${(fetchedStocks || []).length} stocks`);
    } catch (error) {
      console.error("Error loading stocks:", error);
      setStocks([]);
    } finally {
      setIsInitialStocksLoading(false);
      isLoadingStocks.current = false;
    }
  };

  const isDataSufficientForTab = (tab, stockData) => {
    if (!stockData) return false;
    if (tab === "analysis") return !!stockData.price;
    return true;
  };

  const isDataStale = (stock) => {
    if (!stock?.last_updated && !stock?.updated_at) return true;
    const lastUpdate = stock.last_updated || stock.updated_at;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return new Date(lastUpdate).getTime() < oneHourAgo;
  };

  const handleSearch = useCallback(async (query, targetTab = "analysis") => {
    console.log("Searching for:", query);
    
    setIsLoading(true);
    
    try {
      const ticker = query.toUpperCase().trim();
      
      // Update the last processed search to prevent duplicate processing
      lastProcessedSearch.current = ticker;
      const normalizedQuery = query.toLowerCase().trim();
      
      // Update URL using Next.js router
      const urlParams = new URLSearchParams(searchParams?.toString() || '');
      const currentTicker = urlParams.get('ticker')?.toUpperCase();
      
      if (ticker !== currentTicker) {
        urlParams.set("ticker", ticker);
        urlParams.set("tab", "analysis");
        router.replace(`${pathname}?${urlParams.toString()}`);
      }
      
      // Find existing stock in already loaded data
      let existingStock = null;
      if (stocks.length > 0) {
        existingStock = stocks.find(
          s => s.ticker && s.ticker.toUpperCase() === ticker
        );
        
        if (!existingStock) {
          existingStock = stocks.find(
            s => s.name && s.name.toLowerCase().includes(normalizedQuery)
          );
        }
      }
      
      // Always fetch fresh data for analysis view to ensure up-to-date prices
      // This ensures consistency between the analysis page and suggestion cards
      console.log("Fetching fresh data for:", ticker);
      
      const result = await fetchHybridStockData(ticker, existingStock || { ticker });
      
      if (result.success && result.data) {
        let savedStock;
        
        if (existingStock?.id) {
          console.log("Updating existing stock:", existingStock.id);
          savedStock = await Stock.update(existingStock.id, result.data);
        } else {
          console.log("Creating new stock:", ticker);
          savedStock = await Stock.create({ 
            ...result.data, 
            ticker,
          });
        }

        const displayStock = mergeFetchedStockForDisplay(savedStock, result.data);
        
        // Update local state efficiently
        setStocks(prevStocks => {
          const index = prevStocks.findIndex(s => s.id === savedStock.id);
          if (index > -1) {
            const newStocks = [...prevStocks];
            newStocks[index] = displayStock;
            return newStocks;
          } else {
            return [displayStock, ...prevStocks];
          }
        });
        
        setSelectedStock(displayStock);
        setActiveTab("analysis");
      } else {
        console.log("Fetch failed, using existing data or fallback");
        if (existingStock) {
          setSelectedStock(existingStock);
          setActiveTab(existingStock.price ? "analysis" : "input");
        } else {
          setSelectedStock({ ticker });
          setActiveTab("input");
        }
      }
    } catch (error) {
      console.error("Error in search:", error?.message || error?.code || JSON.stringify(error));
      const ticker = query.toUpperCase().trim();
      setSelectedStock({ ticker });
      setActiveTab("input");
    } finally {
      setIsLoading(false);
    }
  }, [stocks, searchParams, pathname, router]);

  // Process URL params when searchParams changes (handles Link navigation)
  useEffect(() => {
    if (isInitialStocksLoading) return;

    const tickerFromUrl = searchParams?.get("ticker");
    const tabFromUrl = searchParams?.get("tab");

    if (!tickerFromUrl) return;

    const upper = tickerFromUrl.toUpperCase();
    const selectedUpper = selectedStock?.ticker?.toUpperCase();
    const urlTickerIsNew = upper !== lastProcessedSearch.current;
    const selectionMismatch = selectedUpper !== upper;

    // New ticker in URL → always load + fetch fresh market data for analysis
    if (urlTickerIsNew) {
      lastProcessedSearch.current = upper;
      console.log("Processing URL ticker:", tickerFromUrl, "tab:", tabFromUrl);
      handleSearch(tickerFromUrl, tabFromUrl || "analysis");
      return;
    }

    // Same URL ticker but state lost (e.g. ref reset, race) — run fetch without changing dedupe
    if (selectionMismatch && !isLoading) {
      console.log("Resyncing from URL ticker:", tickerFromUrl);
      handleSearch(tickerFromUrl, tabFromUrl || "analysis");
    }
  }, [
    isInitialStocksLoading,
    searchParams,
    handleSearch,
    selectedStock?.ticker,
    isLoading,
  ]);

  // When the URL has no ticker, clear selection and reset the URL dedupe ref.
  // Otherwise lastProcessedSearch stays on the old symbol and reopening the same
  // asset (e.g. Dashboard → suggestions → same ticker) never runs handleSearch,
  // so analysis never gets a fresh eToro fetch.
  useEffect(() => {
    if (isInitialStocksLoading) return;

    const tickerFromUrl = searchParams?.get("ticker");

    if (!tickerFromUrl) {
      lastProcessedSearch.current = "";
      if (selectedStock) {
        setSelectedStock(null);
        setActiveTab("input");
        setTimeout(async () => {
          console.log("Reloading stocks after leaving asset URL");
          const freshStocks = await Stock.list("-last_updated");
          setStocks(freshStocks || []);
        }, 50);
      }
    }
  }, [searchParams, isInitialStocksLoading, selectedStock]);

  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      if (selectedStock && !isLoading) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (!selectedStock && activeTab === 'input' && !isLoading) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
    
    return () => clearTimeout(scrollTimer);
  }, [activeTab, selectedStock?.id, isLoading]);
  
  const handleSaveStock = async (stockData) => {
    setIsLoading(true);
    const targetTab = new URLSearchParams(window.location.search).get("tab") || "analysis";
    
    try {
      const user = await User.me();
      if (!user?.id) {
        toast({ title: "You must be logged in to save stock data.", variant: "destructive", duration: 3000 });
        setIsLoading(false);
        return;
      }

      console.log(`Saving stock: ${stockData.ticker}`);
      let savedStock;
      
      const existingStocks = await Stock.filter({ 
        ticker: stockData.ticker.toUpperCase(),
      });
      
      if (existingStocks.length > 0) {
        const stockToUpdate = existingStocks[0];
        console.log(`Updating existing stock ID: ${stockToUpdate.id}`);
        savedStock = await Stock.update(stockToUpdate.id, stockData);
      } else {
        console.log(`Creating new stock: ${stockData.ticker}`);
        const { id, ...dataForCreate } = stockData;
        savedStock = await Stock.create(dataForCreate);
      }
      
      // Update local state directly instead of making multiple API calls
      // This is much more efficient and avoids rate limits.
      setStocks(prevStocks => {
        const index = prevStocks.findIndex(s => s.id === savedStock.id);
        if (index > -1) {
          // Item exists, so we update it in the list
          const newStocks = [...prevStocks];
          newStocks[index] = savedStock;
          return newStocks;
        } else {
          // It's a new item, add it to the beginning of the list
          return [savedStock, ...prevStocks];
        }
      });
      
      setSelectedStock(savedStock);

      // Navigate to appropriate tab
      if (targetTab && isDataSufficientForTab(targetTab, savedStock)) {
        setActiveTab(targetTab);
      } else if (isDataSufficientForTab("analysis", savedStock)) {
        setActiveTab("analysis");
      } else {
        setActiveTab("input");
      }

      toast({ title: "Stock data saved successfully!", variant: "success", duration: 3000 });

    } catch (error) {
      console.error("Error saving stock:", error);
      // Added a more specific error message for 429
      if (error.response && error.response.status === 429) {
        toast({ title: "Too many requests", description: "Please wait a moment and try again.", variant: "destructive", duration: 4000 });
      } else {
        toast({ title: "Error saving stock data", description: "Please try again.", variant: "destructive", duration: 3000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainStock = useCallback(async () => {
    if (aiExplanation) {
      setShowExplanation((v) => !v);
      return;
    }
    setIsExplaining(true);
    setShowExplanation(true);
    try {
      const result = await generateStockExplanation(selectedStock);
      setAiExplanation(result);
    } catch (err) {
      console.error("[Explain] failed:", err);
    } finally {
      setIsExplaining(false);
    }
  }, [selectedStock, aiExplanation]);

  // Reset explain state when selected stock changes
  useEffect(() => {
    setAiExplanation(null);
    setIsExplaining(false);
    setShowExplanation(false);
  }, [selectedStock?.ticker]);

  return (
    <PageContainer noPadding={!!selectedStock}>
      {/* Onboarding Modal */}
      <OnboardingModal
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      <div>
        {/* Suggested Assets - Only when no stock selected */}
        {!selectedStock && !isLoading && !isInitialStocksLoading && (
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            <SuggestedAssets 
              key={`suggestions-${stocks.length}-${stocks.slice(0, 5).map(s => s.last_updated || '').join('-')}`}
              stocks={stocks} 
              onRefresh={loadAllStocks} 
            />
          </div>
        )}
        
        {/* Loading State */}
        {(isLoading || isInitialStocksLoading) && !selectedStock && (
          <div className="mt-8 sm:mt-12">
            <LoadingState 
              fullPage={false} 
              message={isInitialStocksLoading ? "Loading your stocks..." : "Searching..."} 
            />
          </div>
        )}

        {/* Stock Analysis Tabs */}
        {selectedStock && (
          <Tabs 
            value={activeTab} 
            onValueChange={(newTab) => {
              setActiveTab(newTab);
              
              const urlParams = new URLSearchParams(searchParams?.toString() || '');
              if (selectedStock?.ticker) {
                urlParams.set("ticker", selectedStock.ticker);
              }
              urlParams.set("tab", newTab);
              router.replace(`${pathname}?${urlParams.toString()}`);
              window.scrollTo(0, 0);
            }}
            className="-mt-1"
          >
            {/* Sticky Stock Header + Tabs */}
            <div className="sticky top-12 sm:top-16 z-30 bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 pb-3 pt-2 border-b border-slate-700/50">
              {selectedStock.ticker && (
                <div className="flex items-center gap-3 mb-3">
                  <StockLogo stock={selectedStock} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">
                        {selectedStock.ticker.toUpperCase()}
                      </h2>
                      {selectedStock.exchange && (
                        <span className="text-xs text-slate-400">({selectedStock.exchange})</span>
                      )}
                      <WatchlistButton ticker={selectedStock.ticker} size="sm" />
                    </div>
                    {selectedStock.name && (
                      <p className="text-xs sm:text-sm text-slate-400 truncate">{selectedStock.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {selectedStock.price && (
                      <span className="text-lg sm:text-xl font-bold text-green-400">
                        ${parseFloat(selectedStock.price).toFixed(2)}
                      </span>
                    )}
                    {activeTab === "analysis" && (
                      <Button
                        onClick={handleExplainStock}
                        disabled={isExplaining}
                        variant="outline"
                        size="sm"
                        className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white transition-colors text-xs"
                      >
                        {isExplaining ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                        )}
                        <span className="hidden sm:inline">Explain</span>
                        {aiExplanation && (
                          showExplanation
                            ? <ChevronUp className="ml-1 h-3.5 w-3.5" />
                            : <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    <BuyButton stock={selectedStock} size="md" />
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <TabsList className="bg-slate-800 rounded-lg flex w-full sm:w-auto border border-slate-700">
                  <TabsTrigger 
                    value="input" 
                    className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3FB923] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 data-[state=active]:bg-[#3FB923] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:bg-green-600 data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-300 data-[state=inactive]:hover:bg-slate-700 data-[state=inactive]:hover:text-slate-200"
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Stats</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analysis" 
                    className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3FB923] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 data-[state=active]:bg-[#3FB923] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:bg-green-600 data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-300 data-[state=inactive]:hover:bg-slate-700 data-[state=inactive]:hover:text-slate-200"
                  >
                    <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Analysis</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {showExplanation && activeTab === "analysis" && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 max-h-[40vh] overflow-y-auto">
                  {isExplaining ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                      <span className="text-sm text-slate-400">Analyzing {selectedStock.ticker}...</span>
                    </div>
                  ) : aiExplanation ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          {aiExplanation.score != null && (
                            <div className={`text-lg font-bold px-2.5 py-1 rounded-lg border ${getScoreColor(aiExplanation.score)}`}>
                              {aiExplanation.score}<span className="text-xs font-normal opacity-70">/100</span>
                            </div>
                          )}
                          <Badge className={`text-sm px-3 py-1 border ${verdictConfig[aiExplanation.verdict]?.color || "bg-slate-700 text-slate-300 border-slate-600"}`}>
                            {aiExplanation.verdict}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{aiExplanation.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <h5 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1.5">Strengths</h5>
                          <ul className="space-y-1">
                            {aiExplanation.key_strengths?.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <Check className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1.5">Risks</h5>
                          <ul className="space-y-1">
                            {aiExplanation.key_risks?.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <X className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {aiExplanation.dividend_outlook && (
                        <div className="pt-2 border-t border-slate-700/30">
                          <h5 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">Dividend Outlook</h5>
                          <p className="text-sm text-slate-300">{aiExplanation.dividend_outlook}</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            
            <TabsContent value="input" className="mt-3 px-3 sm:px-6">
              <StockDataInput 
                stock={selectedStock} 
                onSave={handleSaveStock}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="analysis" className="focus:outline-none mt-3 px-3 sm:px-6">
              <StockAnalysis stock={selectedStock} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageContainer>
  );
}
