
import React, { useState, useEffect, useRef } from "react";
import { Search, Clock, XCircle, Loader2, PlusCircle, Building2 } from "lucide-react";

// Data freshness helper
const getDataFreshness = (lastUpdated) => {
  if (!lastUpdated) return { label: '', color: 'text-slate-500' };
  
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const diffMs = now - updated;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  let label;
  if (diffMins < 1) {
    label = 'now';
  } else if (diffMins < 60) {
    label = `${diffMins}m`;
  } else if (diffHours < 24) {
    label = `${diffHours}h`;
  } else {
    label = `${Math.floor(diffHours / 24)}d`;
  }
  
  if (diffHours < 1) {
    return { label, color: 'text-green-400' };
  } else if (diffHours < 24) {
    return { label, color: 'text-yellow-400' };
  } else {
    return { label, color: 'text-red-400' };
  }
};
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";
import { Card } from "@/components/ui/card";
import { searchInstruments } from "@/functions/searchInstruments";
import HighlightMatch from "./HighlightMatch";

const StockSearch = ({ onSearch, isLoading, setIsLoading, stocks }) => {
  const [query, setQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [liveResults, setLiveResults] = useState([]);
  const [etoroResults, setEtoroResults] = useState([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [isEtoroSearching, setIsEtoroSearching] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadSearchHistory();

    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowHistory(false);
        setLiveResults([]);
        setEtoroResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 1) {
      setLiveResults([]);
      setEtoroResults([]);
      if (document.activeElement === inputRef.current && searchHistory.length > 0) {
        setShowHistory(true);
      }
      return;
    }

    if (showHistory) {
      setShowHistory(false);
    }

    const searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, stocks, searchHistory.length]);

  const performSearch = async () => {
    setIsLiveSearching(true);
    setIsEtoroSearching(true);
    
    const normalizedQuery = query.toLowerCase();
    const allSavedTickers = new Set((stocks || []).map(s => s.ticker?.toUpperCase()));
    
    // Search saved stocks
    let savedResults = [];
    if (stocks && Array.isArray(stocks)) {
      const filteredStocks = stocks.filter(s =>
        s.ticker &&
        !s.ticker.toUpperCase().includes('.EXT') &&
        ((s.ticker && s.ticker.toLowerCase().includes(normalizedQuery)) ||
        (s.name && s.name.toLowerCase().includes(normalizedQuery)))
      );

      savedResults = filteredStocks.reduce((acc, current) => {
        if (!acc.some(item => item.ticker.toUpperCase() === current.ticker.toUpperCase())) {
          acc.push(current);
        }
        return acc;
      }, []).slice(0, 6);
    }
    
    setLiveResults(savedResults);
    setIsLiveSearching(false);

    // Search eToro for additional instruments
    if (query.length >= 2) {
      try {
        const response = await searchInstruments({
          searchText: query,
          pageSize: 5,
          fields: 'instrumentId,internalInstrumentDisplayName,internalSymbolFull,currentRate,logo50x50,internalAssetClassName'
        });

        if (response?.data?.items && Array.isArray(response.data.items)) {
          // Filter out stocks that are already in the user's saved list
          const newResults = response.data.items
            .filter(item => item.internalSymbolFull && !allSavedTickers.has(item.internalSymbolFull.toUpperCase()))
            .map(item => ({
              instrumentId: item.instrumentId,
              ticker: item.internalSymbolFull,
              name: item.internalInstrumentDisplayName,
              price: item.currentRate,
              logo: item.logo50x50,
              assetClass: item.internalAssetClassName,
              isEtoro: true
            }))
            .slice(0, 5);
          
          setEtoroResults(newResults);
        } else {
          // Clear stale results if response format is unexpected
          setEtoroResults([]);
        }
      } catch (error) {
        console.error("Error fetching eToro suggestions:", error);
        setEtoroResults([]);
      } finally {
        setIsEtoroSearching(false);
      }
    } else {
      setEtoroResults([]);
      setIsEtoroSearching(false);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const user = await User.me();
      if (user && Array.isArray(user.stock_search_history)) {
        setSearchHistory(user.stock_search_history);
      } else {
        setSearchHistory([]);
      }
    } catch (error) {
      console.error("Error loading search history:", error);
      setSearchHistory([]);
    }
  };

  const clearHistory = async () => {
    try {
      await User.updateMyUserData({ stock_search_history: [] });
      setSearchHistory([]);
      setShowHistory(false);
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  };

  const saveToHistory = async (searchTerm) => {
    try {
      const user = await User.me();
      let history = Array.isArray(user?.stock_search_history) ? [...user.stock_search_history] : [];
      history = history.filter(item => item && item.query && item.query.toLowerCase() !== searchTerm.toLowerCase());
      history.unshift({ query: searchTerm, timestamp: new Date().toISOString() });
      history = history.slice(0, 5);
      await User.updateMyUserData({ stock_search_history: history });
      setSearchHistory(history);
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  };
  
  const executeSearch = (searchTerm) => {
    const term = (searchTerm || query).trim();
    if (!term || isLoading) return;
    
    // Try to find a matching result to get the actual ticker
    let tickerToSearch = term;
    const termLower = term.toLowerCase();
    
    // Check live results first (saved stocks)
    const matchedLive = liveResults.find(s => 
      s.ticker?.toLowerCase() === termLower ||
      s.name?.toLowerCase().includes(termLower)
    );
    
    // Check eToro results  
    const matchedEtoro = etoroResults.find(s => 
      s.ticker?.toLowerCase() === termLower ||
      s.name?.toLowerCase().includes(termLower)
    );
    
    // Prefer the matched ticker over the raw search term
    if (matchedLive?.ticker) {
      tickerToSearch = matchedLive.ticker;
    } else if (matchedEtoro?.ticker) {
      tickerToSearch = matchedEtoro.ticker;
    }
    
    setIsLoading(true);
    setQuery("");
    setLiveResults([]);
    setEtoroResults([]);
    setShowHistory(false);
    
    // Blur the input field
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // Save to history asynchronously
    saveToHistory(tickerToSearch);
    
    // Call search immediately without waiting
    onSearch(tickerToSearch);
  };
  
  const handleHistoryClick = (historyItem) => {
    if (!historyItem?.query || isLoading) return;
    
    const ticker = historyItem.query.trim();
    
    // Clear the search UI immediately
    setQuery("");
    setLiveResults([]);
    setEtoroResults([]);
    setShowHistory(false);
    
    // Blur the input field
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // Set loading and directly call the search handler
    setIsLoading(true);
    
    // Save to history asynchronously (moves item to top)
    saveToHistory(ticker);
    
    // Call search immediately without waiting
    onSearch(ticker);
  };

  const handleResultClick = (stock) => {
    if (isLoading) return;
    
    const ticker = stock.ticker || stock.symbol;
    if (!ticker) return;
    
    // Clear the search UI immediately
    setQuery("");
    setLiveResults([]);
    setEtoroResults([]);
    setShowHistory(false);
    
    // Blur the input field
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // Set loading and directly call the search handler
    setIsLoading(true);
    
    // Save to history asynchronously
    saveToHistory(ticker);
    
    // Call search immediately without waiting
    onSearch(ticker);
  };
  
  const handleAddNewClick = () => {
    if (isLoading || !query.trim()) return;
    
    // Use executeSearch to get proper ticker resolution
    executeSearch(query.trim());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleFocus = () => {
    if (query.trim() === '' && searchHistory && searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleClearInput = () => {
    setQuery("");
    setLiveResults([]);
    setEtoroResults([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
    if (searchHistory && searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const showLiveResults = query.length > 0 && !showHistory && (liveResults.length > 0 || etoroResults.length > 0 || isLiveSearching || isEtoroSearching);
  const isExistingTicker = liveResults.some(r => r.ticker?.toLowerCase() === query.toLowerCase()) || 
                          etoroResults.some(r => r.ticker?.toLowerCase() === query.toLowerCase());

  return (
    <div className="w-full relative" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isLoading || isLiveSearching || isEtoroSearching ? (
              <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder="Search ticker or company name..."
            className="w-full pl-12 pr-10 py-3 h-12 bg-slate-800 border border-slate-700 placeholder-slate-400 text-slate-100 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-md transition-all duration-300 ease-in-out"
            disabled={isLoading}
            autoComplete="off"
          />
          {query.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={handleClearInput}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none"
              aria-label="Clear search"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}

          {/* Combined Dropdown Logic */}
          <div className="absolute top-full left-0 right-0 mt-2 z-20">
            {(showHistory || showLiveResults) && (
              <Card className="bg-slate-800 rounded-lg border border-slate-700 shadow-lg max-h-80 overflow-y-auto">
                <div className="p-2">
                  {/* Show History */}
                  {showHistory && (
                    <>
                      <div className="flex items-center justify-between mb-2 px-2">
                        <span className="text-sm text-slate-300">Recent Searches</span>
                        <Button variant="ghost" size="sm" onClick={clearHistory} className="h-7 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700">
                          <XCircle className="h-3 w-3 mr-1" /> Clear
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {searchHistory.map((item, index) => (
                          <button key={index} type="button" onClick={() => handleHistoryClick(item)} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-700 transition-colors text-slate-200">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="flex-1 text-left truncate">{item.query}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Show Live Results */}
                  {showLiveResults && (
                    <div className="space-y-1">
                      {/* Saved Stocks Section */}
                      {liveResults.length > 0 && (
                        <>
                          <div className="px-2 py-1">
                            <span className="text-xs text-slate-400 font-medium">Your Saved Stocks</span>
                          </div>
                          {liveResults.map(stock => {
                            const freshness = getDataFreshness(stock.last_updated || stock.updated_at);
                            return (
                              <div key={`${stock.id}-${stock.last_updated || ''}`} onClick={() => handleResultClick(stock)} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-700 rounded-md">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-100 truncate">
                                    <HighlightMatch text={stock.ticker} highlight={query} />
                                  </p>
                                  <p className="text-sm text-slate-400 truncate">
                                    <HighlightMatch text={stock.name} highlight={query} />
                                  </p>
                                </div>
                                <div className="ml-auto text-right flex-shrink-0">
                                  {stock.price !== null && stock.price !== undefined ? (
                                      <p className="font-medium text-green-400">${parseFloat(stock.price).toFixed(2)}</p>
                                  ) : (
                                      <p className="text-xs text-slate-500">N/A</p>
                                  )}
                                  {freshness.label && (
                                    <p className={`text-[10px] ${freshness.color}`}>{freshness.label}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* eToro Results Section */}
                      {etoroResults.length > 0 && (
                        <>
                          {liveResults.length > 0 && <div className="border-t border-slate-700 my-2"></div>}
                          <div className="px-2 py-1">
                            <span className="text-xs text-slate-400 font-medium">eToro Instruments</span>
                          </div>
                          {etoroResults.map((stock, index) => (
                            <div key={`etoro-${stock.ticker}-${index}`} onClick={() => handleResultClick(stock)} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-700 rounded-md">
                              {stock.logo ? (
                                <img src={stock.logo} alt={stock.name} className="h-8 w-8 rounded-full" />
                              ) : (
                                <Building2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-100 truncate">
                                  <HighlightMatch text={stock.ticker} highlight={query} />
                                </p>
                                <p className="text-sm text-slate-400 truncate">
                                  <HighlightMatch text={stock.name} highlight={query} />
                                </p>
                              </div>
                              <div className="ml-auto text-right flex-shrink-0">
                                {stock.price !== null && stock.price !== undefined ? (
                                    <p className="font-medium text-green-400">${parseFloat(stock.price).toFixed(2)}</p>
                                ) : (
                                    <p className="text-xs text-slate-500">N/A</p>
                                )}
                                {stock.assetClass && (
                                  <p className="text-xs text-slate-500">{stock.assetClass}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Add Custom Ticker Option */}
                      {!isExistingTicker && query.length > 0 && (
                         <div onClick={handleAddNewClick} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-700 rounded-md text-green-400">
                           <PlusCircle className="h-5 w-5" />
                           <div className="flex-1 min-w-0">
                             <p className="font-medium">Add and analyze new ticker: <span className="font-bold">{query.toUpperCase()}</span></p>
                           </div>
                         </div>
                      )}

                      {/* No Results */}
                      {liveResults.length === 0 && etoroResults.length === 0 && !isLiveSearching && !isEtoroSearching && !isExistingTicker && (
                        <div className="p-4 text-center text-slate-400">
                          {query.length < 2 ? "Type at least 2 characters to search..." : 
                           "No stocks found. Try a different search term."}
                        </div>
                      )}

                      {/* Loading State */}
                      {(isLiveSearching || isEtoroSearching) && (
                        <div className="p-4 text-center text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          <span className="text-xs">Searching eToro...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default StockSearch;
