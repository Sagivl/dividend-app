'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Clock, XCircle, Loader2, PlusCircle, Building2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User } from '@/entities/User';
import { Stock } from '@/entities/Stock';
import { searchInstruments } from '@/functions/searchInstruments';
import HighlightMatch from './HighlightMatch';

const getDataFreshness = (lastUpdated) => {
  if (!lastUpdated) return { label: '', color: 'text-slate-500' };
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const diffMs = now - updated;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  let label;
  if (diffMins < 1) label = 'now';
  else if (diffMins < 60) label = `${diffMins}m`;
  else if (diffHours < 24) label = `${diffHours}h`;
  else label = `${Math.floor(diffHours / 24)}d`;

  if (diffHours < 1) return { label, color: 'text-green-400' };
  if (diffHours < 24) return { label, color: 'text-yellow-400' };
  return { label, color: 'text-red-400' };
};

export default function GlobalSearchDialog({ open, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [stocks, setStocks] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [etoroResults, setEtoroResults] = useState([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [isEtoroSearching, setIsEtoroSearching] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!open) return;

    setQuery('');
    setLiveResults([]);
    setEtoroResults([]);
    setIsNavigating(false);

    const loadData = async () => {
      try {
        const [user, fetchedStocks] = await Promise.all([
          User.me().catch(() => null),
          Stock.list('-last_updated').catch(() => []),
        ]);
        if (user && Array.isArray(user.stock_search_history)) {
          setSearchHistory(user.stock_search_history);
        }
        setStocks(fetchedStocks || []);
      } catch (e) {
        console.error('GlobalSearch: init error', e);
      }
    };
    loadData();

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [open]);

  useEffect(() => {
    if (!open || query.length < 1) {
      setLiveResults([]);
      setEtoroResults([]);
      return;
    }
    const timeout = setTimeout(() => performSearch(), 300);
    return () => clearTimeout(timeout);
  }, [query, stocks, open]);

  const performSearch = async () => {
    setIsLiveSearching(true);
    setIsEtoroSearching(true);

    const normalizedQuery = query.toLowerCase();
    const allSavedTickers = new Set((stocks || []).map(s => s.ticker?.toUpperCase()));

    let savedResults = [];
    if (stocks && Array.isArray(stocks)) {
      const filtered = stocks.filter(s =>
        s.ticker &&
        !s.ticker.toUpperCase().includes('.EXT') &&
        ((s.ticker && s.ticker.toLowerCase().includes(normalizedQuery)) ||
         (s.name && s.name.toLowerCase().includes(normalizedQuery)))
      );
      savedResults = filtered
        .reduce((acc, cur) => {
          if (!acc.some(item => item.ticker.toUpperCase() === cur.ticker.toUpperCase())) acc.push(cur);
          return acc;
        }, [])
        .slice(0, 6);
    }
    setLiveResults(savedResults);
    setIsLiveSearching(false);

    if (query.length >= 2) {
      try {
        const response = await searchInstruments({
          searchText: query,
          pageSize: 5,
          fields: 'instrumentId,internalInstrumentDisplayName,internalSymbolFull,currentRate,logo50x50,internalAssetClassName',
        });

        if (response?.data?.items && Array.isArray(response.data.items)) {
          const newResults = response.data.items
            .filter(item => item.internalSymbolFull && !allSavedTickers.has(item.internalSymbolFull.toUpperCase()))
            .map(item => ({
              instrumentId: item.instrumentId,
              ticker: item.internalSymbolFull,
              name: item.internalInstrumentDisplayName,
              price: item.currentRate,
              logo: item.logo50x50,
              assetClass: item.internalAssetClassName,
              isEtoro: true,
            }))
            .slice(0, 5);
          setEtoroResults(newResults);
        } else {
          setEtoroResults([]);
        }
      } catch {
        setEtoroResults([]);
      } finally {
        setIsEtoroSearching(false);
      }
    } else {
      setEtoroResults([]);
      setIsEtoroSearching(false);
    }
  };

  const navigateToTicker = useCallback((ticker) => {
    if (!ticker || isNavigating) return;
    setIsNavigating(true);

    const saveToHistory = async (term) => {
      try {
        const user = await User.me();
        let history = Array.isArray(user?.stock_search_history) ? [...user.stock_search_history] : [];
        history = history.filter(item => item?.query?.toLowerCase() !== term.toLowerCase());
        history.unshift({ query: term, timestamp: new Date().toISOString() });
        history = history.slice(0, 5);
        await User.updateMyUserData({ stock_search_history: history });
      } catch {}
    };

    saveToHistory(ticker);
    onClose();

    const isDashboard = pathname === '/' || pathname === '/Dashboard';
    const target = `/?ticker=${encodeURIComponent(ticker)}&tab=analysis`;

    if (isDashboard) {
      router.replace(target);
    } else {
      router.push(target);
    }
  }, [isNavigating, onClose, pathname, router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;

    let tickerToSearch = term;
    const termLower = term.toLowerCase();
    const matchedLive = liveResults.find(s =>
      s.ticker?.toLowerCase() === termLower || s.name?.toLowerCase().includes(termLower)
    );
    const matchedEtoro = etoroResults.find(s =>
      s.ticker?.toLowerCase() === termLower || s.name?.toLowerCase().includes(termLower)
    );
    if (matchedLive?.ticker) tickerToSearch = matchedLive.ticker;
    else if (matchedEtoro?.ticker) tickerToSearch = matchedEtoro.ticker;

    navigateToTicker(tickerToSearch);
  };

  const showHistory = query.length === 0 && searchHistory.length > 0;
  const showLiveResults = query.length > 0 && (liveResults.length > 0 || etoroResults.length > 0 || isLiveSearching || isEtoroSearching);
  const isExistingTicker = liveResults.some(r => r.ticker?.toLowerCase() === query.toLowerCase()) ||
                           etoroResults.some(r => r.ticker?.toLowerCase() === query.toLowerCase());

  const clearHistory = async () => {
    try {
      await User.updateMyUserData({ stock_search_history: [] });
      setSearchHistory([]);
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-auto mt-[60px] sm:mt-20 px-4 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              {isLiveSearching || isEtoroSearching ? (
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker or company name..."
              className="w-full pl-12 pr-20 py-3 h-14 bg-transparent border-0 border-b border-slate-700 placeholder-slate-400 text-slate-100 rounded-none focus:ring-0 focus:border-green-500 text-base"
              disabled={isNavigating}
              autoComplete="off"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-200"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Results area */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Empty state */}
            {!showHistory && !showLiveResults && query.length === 0 && (
              <div className="p-6 text-center text-slate-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Search for any stock by ticker or company name</p>
                <p className="text-xs text-slate-500 mt-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-mono">⌘K</kbd> to open anytime
                </p>
              </div>
            )}

            {/* History */}
            {showHistory && (
              <div className="p-2">
                <div className="flex items-center justify-between mb-1 px-2">
                  <span className="text-xs text-slate-400 font-medium">Recent</span>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="h-6 text-[10px] text-slate-500 hover:text-slate-200 hover:bg-slate-700 px-2">
                    Clear
                  </Button>
                </div>
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => navigateToTicker(item.query)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-700 transition-colors text-slate-200"
                  >
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="flex-1 text-left truncate">{item.query}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Live results */}
            {showLiveResults && (
              <div className="p-2 space-y-1">
                {/* Saved Stocks */}
                {liveResults.length > 0 && (
                  <>
                    <div className="px-2 py-1">
                      <span className="text-xs text-slate-400 font-medium">Your Saved Stocks</span>
                    </div>
                    {liveResults.map(stock => {
                      const freshness = getDataFreshness(stock.last_updated || stock.updated_at);
                      return (
                        <div
                          key={`${stock.id}-${stock.last_updated || ''}`}
                          onClick={() => navigateToTicker(stock.ticker)}
                          className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-700 rounded-md"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-100 truncate">
                              <HighlightMatch text={stock.ticker} highlight={query} />
                            </p>
                            <p className="text-sm text-slate-400 truncate">
                              <HighlightMatch text={stock.name} highlight={query} />
                            </p>
                          </div>
                          <div className="ml-auto text-right flex-shrink-0">
                            {stock.price != null ? (
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

                {/* eToro results */}
                {etoroResults.length > 0 && (
                  <>
                    {liveResults.length > 0 && <div className="border-t border-slate-700 my-1" />}
                    <div className="px-2 py-1">
                      <span className="text-xs text-slate-400 font-medium">eToro Instruments</span>
                    </div>
                    {etoroResults.map((stock, index) => (
                      <div
                        key={`etoro-${stock.ticker}-${index}`}
                        onClick={() => navigateToTicker(stock.ticker)}
                        className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-700 rounded-md"
                      >
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
                          {stock.price != null ? (
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

                {/* Add new ticker */}
                {!isExistingTicker && query.length > 0 && (
                  <div
                    onClick={() => navigateToTicker(query.trim())}
                    className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-700 rounded-md text-green-400"
                  >
                    <PlusCircle className="h-5 w-5" />
                    <p className="font-medium">
                      Analyze <span className="font-bold">{query.toUpperCase()}</span>
                    </p>
                  </div>
                )}

                {/* No results */}
                {liveResults.length === 0 && etoroResults.length === 0 && !isLiveSearching && !isEtoroSearching && !isExistingTicker && (
                  <div className="p-4 text-center text-slate-400 text-sm">
                    {query.length < 2 ? 'Type at least 2 characters...' : 'No stocks found.'}
                  </div>
                )}

                {/* Loading */}
                {(isLiveSearching || isEtoroSearching) && liveResults.length === 0 && etoroResults.length === 0 && (
                  <div className="p-4 text-center text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    <span className="text-xs">Searching...</span>
                  </div>
                )}
              </div>
            )}

            {/* No results for typed query */}
            {query.length > 0 && !showLiveResults && !isLiveSearching && !isEtoroSearching && (
              <div className="p-4 text-center text-slate-400 text-sm">
                {query.length < 2 ? 'Type at least 2 characters...' : 'Searching...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
