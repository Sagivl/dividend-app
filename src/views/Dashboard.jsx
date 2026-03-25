'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Stock } from "@/entities/Stock";
import { User } from "@/entities/User";
import StockSearch from "../components/StockSearch";
import StockDataInput from "../components/StockDataInput";
import StockAnalysis from "../components/StockAnalysis";
import SuggestedAssets from "../components/SuggestedAssets";
import OnboardingModal from "../components/OnboardingModal";
import { getPersonalizedConfig } from "../components/configure/ConfigurationDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, PieChart, Loader2, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("input");
  const [currentUser, setCurrentUser] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isInitialStocksLoading, setIsInitialStocksLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Simple ref to prevent duplicate requests
  const isLoadingStocks = useRef(false);
  const lastProcessedSearch = useRef(""); // Track last processed search params

  useEffect(() => {
    const init = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        
        // For new users: seed sample stocks and show onboarding
        if (user.is_new_user && !user.onboarding_completed) {
          await Stock.seedSampleStocks();
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
      loadAllStocks();
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

  const handleSearch = useCallback((query, targetTab = "analysis") => {
    console.log("Searching for:", query);
    
    setIsLoading(true);
    
    try {
      const normalizedQuery = query.toLowerCase().trim();
      
      // Update URL using Next.js router
      const urlParams = new URLSearchParams(searchParams?.toString() || '');
      const currentTicker = urlParams.get('ticker')?.toUpperCase();
      const newTicker = query.toUpperCase();
      
      if (newTicker !== currentTicker) {
        urlParams.set("ticker", newTicker);
        if (targetTab) {
          urlParams.set("tab", targetTab);
        }
        // Use replace to avoid creating history entries for each search
        router.replace(`${pathname}?${urlParams.toString()}`);
      }
      
      let foundStock = null;
      
      // Find stock in already loaded data
      if (stocks.length > 0) {
        // First try exact ticker match
        foundStock = stocks.find(
          s => s.ticker && 
              s.ticker.toUpperCase() === normalizedQuery.toUpperCase()
        );
        
        // If no ticker match, try name search
        if (!foundStock) {
          foundStock = stocks.find(
            s => s.name && 
                s.name.toLowerCase().includes(normalizedQuery)
          );
        }
      }
      
      if (foundStock) {
        console.log("Found existing stock:", foundStock.ticker);
        setSelectedStock(foundStock);
        
        // Navigate to appropriate tab
        if (targetTab && isDataSufficientForTab(targetTab, foundStock)) {
          setActiveTab(targetTab);
        } else if (isDataSufficientForTab("analysis", foundStock)) {
          setActiveTab("analysis");
        } else {
          setActiveTab("input");
        }
      } else {
        console.log("Stock not found, creating new entry");
        const trimmedQuery = query.trim();
        const isLikelyTicker = trimmedQuery.toUpperCase() === trimmedQuery && !trimmedQuery.includes(' ');

        setSelectedStock({ 
          ticker: isLikelyTicker ? trimmedQuery.toUpperCase() : "",
          name: isLikelyTicker ? "" : trimmedQuery
        });
        setActiveTab("input");
      }
    } catch (error) {
      console.error("Error in search:", error);
      setSelectedStock(null);
    } finally {
      setIsLoading(false);
    }
  }, [stocks, searchParams, pathname, router]); // `stocks` is a dependency as `handleSearch` uses it

  // Process URL params when searchParams changes (handles Link navigation)
  useEffect(() => {
    if (isInitialStocksLoading) return;
    
    const tickerFromUrl = searchParams?.get("ticker");
    const tabFromUrl = searchParams?.get("tab");
    const currentSearchKey = `${tickerFromUrl || ""}-${tabFromUrl || ""}`;
    
    // Only process if the search params have actually changed
    if (currentSearchKey !== lastProcessedSearch.current) {
      lastProcessedSearch.current = currentSearchKey;
      
      if (tickerFromUrl) {
        console.log("Processing URL ticker:", tickerFromUrl, "tab:", tabFromUrl);
        handleSearch(tickerFromUrl, tabFromUrl || "analysis");
      }
    }
  }, [isInitialStocksLoading, searchParams, handleSearch]);

  // Handle case when URL has no ticker (e.g., navigating back to empty Dashboard)
  useEffect(() => {
    if (isInitialStocksLoading) return;
    
    const tickerFromUrl = searchParams?.get("ticker");
    
    if (!tickerFromUrl && selectedStock) {
      setSelectedStock(null);
      setActiveTab("input");
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
      if (!user?.email) {
        alert("Error: You must be logged in to save stock data.");
        setIsLoading(false); // Make sure loading state is reset
        return;
      }

      console.log(`Saving stock: ${stockData.ticker}`);
      let savedStock;
      
      // Check if stock already exists for THIS USER (by ticker and created_by)
      const existingStocks = await Stock.filter({ 
        ticker: stockData.ticker.toUpperCase(),
        created_by: user.email
      });
      
      if (existingStocks.length > 0) {
        // Update existing stock owned by this user
        const stockToUpdate = existingStocks[0];
        console.log(`Updating existing stock ID: ${stockToUpdate.id}`);
        savedStock = await Stock.update(stockToUpdate.id, stockData);
      } else {
        // Create new stock for this user with created_by field for history tracking
        console.log(`Creating new stock: ${stockData.ticker}`);
        const { id, ...dataForCreate } = stockData;
        savedStock = await Stock.create({ ...dataForCreate, created_by: user.email });
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

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

    } catch (error) {
      console.error("Error saving stock:", error);
      // Added a more specific error message for 429
      if (error.response && error.response.status === 429) {
        alert("Too many requests. Please wait a moment and try again.");
      } else {
        alert("Error saving stock data. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-3 sm:p-6">
      {/* Onboarding Modal */}
      <OnboardingModal
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Stock data saved successfully!</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="mb-6 sm:mb-8 max-w-3xl mx-auto px-2 sm:px-0">
          <StockSearch 
            onSearch={handleSearch}
            isLoading={isLoading || isInitialStocksLoading}
            setIsLoading={setIsLoading}
            stocks={stocks}
          />
        </div>

        {/* Suggested Assets - Only when no stock selected */}
        {!selectedStock && !isLoading && !isInitialStocksLoading && (
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            <SuggestedAssets stocks={stocks} onRefresh={loadAllStocks} />
          </div>
        )}
        
        {/* Loading State */}
        {(isLoading || isInitialStocksLoading) && !selectedStock && (
          <div className="text-center mt-8 sm:mt-12">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-400 animate-spin mx-auto" />
            <p className="mt-3 text-slate-400">
              {isInitialStocksLoading ? "Loading your stocks..." : "Searching..."}
            </p>
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
              // Use Next.js router with replace for proper location sync
              router.replace(`${pathname}?${urlParams.toString()}`);
              window.scrollTo(0, 0);
            }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <TabsList className="bg-slate-800 rounded-lg flex w-full sm:w-auto border border-slate-700">
                <TabsTrigger 
                  value="input" 
                  className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3FB923] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 data-[state=active]:bg-[#3FB923] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-slate-700 data-[state=inactive]:hover:text-slate-200"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Stats</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="analysis" 
                  className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3FB923] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 data-[state=active]:bg-[#3FB923] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-slate-700 data-[state=inactive]:hover:text-slate-200"
                >
                  <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Analysis</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="input">
              <StockDataInput 
                stock={selectedStock} 
                onSave={handleSaveStock}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="analysis" className="focus:outline-none">
              <StockAnalysis stock={selectedStock} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
