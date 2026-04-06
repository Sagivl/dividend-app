'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Portfolio } from "@/entities/Portfolio";
import { Stock } from "@/entities/Stock";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Wallet, Calendar, Plus } from "lucide-react";
import HoldingsTab from "../components/portfolio/HoldingsTab";
import DividendCalendar from "../components/portfolio/DividendCalendar";
import AddPositionDialog from "../components/portfolio/AddPositionDialog";
import DemoModeBanner from "../components/trading/DemoModeBanner";
import { fetchHybridStockData } from "../functions/hybridDataFetcher";
import { cancelOpenOrder, cancelLimitOrder, getTradingEnvironment } from "@/functions/etoroTradingApi";
import { UserSettings } from "@/entities/UserSettings";
import { etoroFetch } from "@/functions/etoroFetch";
import { toast } from "react-hot-toast";
import { PageContainer, LoadingState } from "@/components/layout";
import { Link2, ArrowRight } from "lucide-react";
import Link from "next/link";

const INSTRUMENT_CACHE_KEY = 'etoro_instrument_symbols';
const ASSET_CLASS_CACHE_KEY = 'etoro_instrument_asset_classes';
const INSTRUMENT_META_CACHE_KEY = 'etoro_instrument_meta_v2';

function getInstrumentCache() {
  try {
    return JSON.parse(localStorage.getItem(INSTRUMENT_CACHE_KEY) || '{}');
  } catch { return {}; }
}

function setInstrumentCache(cache) {
  localStorage.setItem(INSTRUMENT_CACHE_KEY, JSON.stringify(cache));
}

function getAssetClassCache() {
  try {
    return JSON.parse(localStorage.getItem(ASSET_CLASS_CACHE_KEY) || '{}');
  } catch { return {}; }
}

function setAssetClassCache(cache) {
  localStorage.setItem(ASSET_CLASS_CACHE_KEY, JSON.stringify(cache));
}

function getInstrumentMetaCache() {
  try {
    return JSON.parse(localStorage.getItem(INSTRUMENT_META_CACHE_KEY) || '{}');
  } catch { return {}; }
}

function setInstrumentMetaCache(cache) {
  localStorage.setItem(INSTRUMENT_META_CACHE_KEY, JSON.stringify(cache));
}

export default function PortfolioView() {
  const [positions, setPositions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [stocksMap, setStocksMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("portfolio");

  const [etoroConnected, setEtoroConnected] = useState(false);
  const [etoroConnectedLoading, setEtoroConnectedLoading] = useState(true);
  const [etoroPortfolio, setEtoroPortfolio] = useState(null);
  const [etoroLoading, setEtoroLoading] = useState(true);
  const [etoroError, setEtoroError] = useState(null);
  const [etoroRefreshing, setEtoroRefreshing] = useState(false);
  const [resolvedSymbols, setResolvedSymbols] = useState(getInstrumentCache);
  const [instrumentAssetClasses, setInstrumentAssetClasses] = useState(getAssetClassCache);
  const [instrumentMeta, setInstrumentMeta] = useState(getInstrumentMetaCache);
  const [etoroLastSynced, setEtoroLastSynced] = useState(null);
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const etoroLoadGenRef = useRef(0);
  const soldPositionsRef = useRef(new Map());
  const sellRefreshTimerRef = useRef(null);
  const SOLD_GRACE_MS = 30_000;

  const instrumentMap = useMemo(() => {
    const map = {};
    Object.values(stocksMap).forEach(stock => {
      if (stock.instrumentId) {
        map[stock.instrumentId] = stock;
      }
    });
    return map;
  }, [stocksMap]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [portfolioData, stocksData] = await Promise.all([
        Portfolio.list(),
        Stock.list()
      ]);

      setPositions(portfolioData);
      setStocks(stocksData);

      const map = {};
      stocksData.forEach(stock => {
        if (stock.ticker) {
          map[stock.ticker.toUpperCase()] = stock;
        }
      });
      setStocksMap(map);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
      toast.error("Failed to load portfolio");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyGraceFilter = useCallback((positions) => {
    const now = Date.now();
    for (const [id, entry] of soldPositionsRef.current) {
      if (now - entry.timestamp > SOLD_GRACE_MS) soldPositionsRef.current.delete(id);
    }
    if (soldPositionsRef.current.size === 0) return positions;

    return positions
      .filter(p => {
        const entry = soldPositionsRef.current.get(String(p.positionId));
        if (!entry) return true;
        if (entry.isPartial) return true;
        return false;
      })
      .map(p => {
        const entry = soldPositionsRef.current.get(String(p.positionId));
        if (!entry || !entry.isPartial) return p;
        const newShares = Math.max(0, (p.shares || 0) - entry.unitsDeducted);
        return { ...p, shares: newShares, units: newShares };
      });
  }, []);

  const loadEtoroPortfolio = useCallback(async (showRefreshing = false) => {
    const loadId = ++etoroLoadGenRef.current;
    try {
      if (showRefreshing) setEtoroRefreshing(true);
      else setEtoroLoading(true);
      setEtoroError(null);

      Portfolio.clearEtoroCache();
      const data = await Portfolio.fetchEtoroPortfolio();
      if (loadId !== etoroLoadGenRef.current) return;
      const filtered = {
        ...data,
        positions: applyGraceFilter(data.positions || []),
      };
      setEtoroPortfolio(filtered);
      setEtoroLastSynced(new Date());
    } catch (err) {
      console.error('Failed to load eToro portfolio:', err);
      if (loadId !== etoroLoadGenRef.current) return;
      setEtoroError(err.message || 'Failed to load eToro portfolio');
    } finally {
      if (loadId === etoroLoadGenRef.current) {
        setEtoroLoading(false);
        setEtoroRefreshing(false);
      }
    }
  }, [applyGraceFilter]);

  useEffect(() => {
    const init = async () => {
      const localConnected = await UserSettings.isEtoroConnected();
      if (localConnected) {
        setEtoroConnected(true);
        setEtoroConnectedLoading(false);
        return;
      }
      try {
        const env = await getTradingEnvironment();
        if (env?.hasApiKey && env?.hasUserKey) {
          setEtoroConnected(true);
          setEtoroConnectedLoading(false);
          return;
        }
      } catch { /* server check failed, fall through */ }
      setEtoroConnected(false);
      setEtoroConnectedLoading(false);
      setEtoroLoading(false);
    };
    init();
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (etoroConnected) {
      loadEtoroPortfolio();
    }
  }, [etoroConnected, loadEtoroPortfolio]);

  useEffect(() => {
    const toKey = (id) => String(id);
    const rawIds = [
      ...(etoroPortfolio?.positions || []).map((p) => p.instrumentId),
      ...(etoroPortfolio?.orders || []).map((o) => o.instrumentId),
      ...(etoroPortfolio?.pendingOrders || []).map((o) => o.instrumentId),
    ].filter((id) => id != null && id !== '');
    const allIds = [...new Set(rawIds)];
    if (allIds.length === 0) return;

    const unknownIds = allIds.filter((rawId) => {
      const k = toKey(rawId);
      if (instrumentMap[rawId]) return false;
      if (instrumentMeta[k]?.resolutionFailed) return false;
      return (
        !resolvedSymbols[k] ||
        !(k in instrumentAssetClasses) ||
        !instrumentMeta[k]?.hasDividendData
      );
    });
    if (unknownIds.length === 0) return;

    let cancelled = false;

    const resolveSymbols = async () => {
      const cache = { ...resolvedSymbols };
      const assetClasses = { ...instrumentAssetClasses };
      const meta = { ...instrumentMeta };
      let changed = false;

      const markFailed = (rawInstrumentId) => {
        const k = toKey(rawInstrumentId);
        if (meta[k]?.resolutionFailed) return;
        cache[k] = cache[k] || `ID:${rawInstrumentId}`;
        assetClasses[k] = assetClasses[k] ?? 'Unknown';
        meta[k] = {
          ...(meta[k] || {}),
          hasDividendData: false,
          resolutionFailed: true,
        };
        changed = true;
      };

      for (const rawId of unknownIds) {
        if (cancelled) break;
        const k = toKey(rawId);
        try {
          const res = await etoroFetch(`/api/etoro/api/v1/market-data/search?instrumentId=${rawId}`);
          if (res.ok) {
            const data = await res.json();
            const item = data.items?.[0];
            if (item) {
              cache[k] = item.internalSymbolFull || item.symbolFull || `ID:${rawId}`;
              assetClasses[k] = item.internalAssetClassName || 'Unknown';
              const divRate = parseFloat(item['dividendRate-TTM']) || parseFloat(item['dividendRate-Annual']) || 0;
              const currentPrice = parseFloat(item.currentRate) || 0;
              const divYield = currentPrice > 0 ? (divRate / currentPrice) * 100 : 0;
              meta[k] = {
                logo50x50: item.logo50x50 || null,
                name: item.internalInstrumentDisplayName || null,
                dividendYield: divYield,
                dividendRate: divRate,
                hasDividendData: true,
                resolutionFailed: false,
              };
              changed = true;
            } else {
              markFailed(rawId);
            }
          } else {
            markFailed(rawId);
          }
        } catch {
          markFailed(rawId);
        }
      }
      if (!cancelled && changed) {
        setResolvedSymbols(cache);
        setInstrumentCache(cache);
        setInstrumentAssetClasses(assetClasses);
        setAssetClassCache(assetClasses);
        setInstrumentMeta(meta);
        setInstrumentMetaCache(meta);
      }
    };
    resolveSymbols();

    return () => { cancelled = true; };
  }, [etoroPortfolio, instrumentMap, resolvedSymbols, instrumentAssetClasses, instrumentMeta]);

  const getTickerForEtoroPosition = useCallback((position) => {
    const stock = instrumentMap[position.instrumentId];
    if (stock?.ticker) return stock.ticker;
    if (resolvedSymbols[position.instrumentId]) return resolvedSymbols[position.instrumentId];
    return position.ticker || null;
  }, [instrumentMap, resolvedSymbols]);

  const enrichedManualPositions = useMemo(() => {
    return positions.map(position => {
      const stock = stocksMap[position.ticker];
      const currentPrice = stock?.price || 0;
      const dividendYield = stock?.dividend_yield || 0;
      const annualDividendPerShare = currentPrice * (dividendYield / 100);
      const annualIncome = position.shares * annualDividendPerShare;
      const marketValue = position.shares * currentPrice;
      const totalCostBasis = position.cost_basis
        ? position.cost_basis * position.shares
        : null;
      const yieldOnCost = totalCostBasis
        ? (annualIncome / totalCostBasis) * 100
        : null;
      const pnl = totalCostBasis ? marketValue - totalCostBasis : null;
      const pnlPercent = totalCostBasis ? (pnl / totalCostBasis) * 100 : null;

      return {
        ...position,
        source: 'manual',
        stock,
        currentPrice,
        dividendYield,
        annualDividendPerShare,
        annualIncome,
        marketValue,
        totalCostBasis,
        yieldOnCost,
        pnl,
        pnlPercent,
        instrumentId: stock?.instrumentId || null,
      };
    });
  }, [positions, stocksMap]);

  const enrichedEtoroPositions = useMemo(() => {
    if (!etoroPortfolio?.positions) return [];

    const individual = etoroPortfolio.positions.map(pos => {
      const dbStock = instrumentMap[pos.instrumentId] || null;
      const meta = instrumentMeta[pos.instrumentId];
      const stock = dbStock || (meta ? { logo50x50: meta.logo50x50, name: meta.name } : null);
      const ticker = getTickerForEtoroPosition(pos);
      const currentPrice = pos.currentRate || dbStock?.price || 0;
      const shares = pos.shares || 0;
      const marketValue = currentPrice * shares;
      const invested = pos.amount || ((pos.cost_basis || 0) * shares);
      const pnl = pos.netProfit || (marketValue - invested);
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      const dividendYield = dbStock?.dividend_yield || meta?.dividendYield || 0;
      const annualDivPerShareFromRate = meta?.dividendRate || 0;
      const annualDividendPerShare = dbStock?.dividend_yield
        ? currentPrice * (dbStock.dividend_yield / 100)
        : annualDivPerShareFromRate;
      const annualIncome = shares * annualDividendPerShare;
      const hasDividendData = !!(dbStock?.dividend_yield !== undefined || meta?.hasDividendData);

      return {
        ...pos,
        ticker: ticker || `ID:${pos.instrumentId}`,
        source: 'etoro',
        stock,
        currentPrice,
        dividendYield,
        annualDividendPerShare,
        annualIncome,
        marketValue,
        totalCostBasis: invested,
        yieldOnCost: invested > 0 ? (annualIncome / invested) * 100 : null,
        pnl,
        pnlPercent,
        hasDividendData,
      };
    });

    const byTicker = {};
    individual.forEach(pos => {
      const key = pos.ticker;
      if (!byTicker[key]) byTicker[key] = [];
      byTicker[key].push(pos);
    });

    return Object.values(byTicker).map(group => {
      if (group.length === 1) return group[0];

      const first = group[0];
      const totalShares = group.reduce((s, p) => s + (p.shares || 0), 0);
      const totalValue = group.reduce((s, p) => s + (p.marketValue || 0), 0);
      const totalInvested = group.reduce((s, p) => s + (p.totalCostBasis || 0), 0);
      const totalPnl = group.reduce((s, p) => s + (p.pnl || 0), 0);
      const totalIncome = group.reduce((s, p) => s + (p.annualIncome || 0), 0);

      return {
        ...first,
        id: `etoro_consolidated_${first.instrumentId}`,
        shares: totalShares,
        marketValue: totalValue,
        totalCostBasis: totalInvested,
        cost_basis: totalShares > 0 ? totalInvested / totalShares : null,
        pnl: totalPnl,
        pnlPercent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
        annualIncome: totalIncome,
        yieldOnCost: totalInvested > 0 ? (totalIncome / totalInvested) * 100 : null,
        subPositions: group,
      };
    });
  }, [etoroPortfolio, instrumentMap, instrumentMeta, getTickerForEtoroPosition]);

  const allPositions = useMemo(() => {
    const combined = [...enrichedManualPositions, ...enrichedEtoroPositions];

    const isNonEquity = (pos) => {
      const sector = (pos.stock?.sector || '').toLowerCase();
      const assetClass = (instrumentAssetClasses[pos.instrumentId] || '').toLowerCase();
      if (sector.includes('crypto') || assetClass.includes('crypto')) return true;
      if (assetClass && !assetClass.includes('stock') && !assetClass.includes('etf') && assetClass !== 'unknown') return true;
      return false;
    };

    let filtered = combined.filter(pos => !isNonEquity(pos));

    if (!showAllHoldings) {
      filtered = filtered.filter(pos => {
        if ((pos.dividendYield || 0) > 0) return true;
        // Keep positions where we haven't resolved dividend data yet
        if (pos.source === 'etoro' && !pos.hasDividendData) return true;
        return false;
      });
    }

    const tickerSources = {};
    filtered.forEach(pos => {
      const t = pos.ticker?.toUpperCase();
      if (t) {
        if (!tickerSources[t]) tickerSources[t] = [];
        tickerSources[t].push(pos.id);
      }
    });

    return filtered.map(pos => {
      const t = pos.ticker?.toUpperCase();
      const siblings = tickerSources[t] || [];
      const hasDuplicate = siblings.length > 1;
      const linkedPositionId = hasDuplicate
        ? siblings.find(id => id !== pos.id) || null
        : null;
      return { ...pos, hasDuplicate, linkedPositionId };
    });
  }, [enrichedManualPositions, enrichedEtoroPositions, instrumentAssetClasses, showAllHoldings]);

  const unifiedTotals = useMemo(() => {
    return allPositions.reduce((acc, pos) => ({
      totalValue: acc.totalValue + (pos.marketValue || 0),
      totalIncome: acc.totalIncome + (pos.annualIncome || 0),
      totalCost: acc.totalCost + (pos.totalCostBasis || 0),
      totalPnL: acc.totalPnL + (pos.pnl || 0),
    }), { totalValue: 0, totalIncome: 0, totalCost: 0, totalPnL: 0 });
  }, [allPositions]);

  const portfolioYield = unifiedTotals.totalValue > 0
    ? (unifiedTotals.totalIncome / unifiedTotals.totalValue) * 100
    : 0;

  const handleAddPosition = async (data) => {
    try {
      let stockData = stocksMap[data.ticker.toUpperCase()];

      if (!stockData) {
        toast.loading(`Fetching data for ${data.ticker}...`, { id: 'fetch-stock' });
        const result = await fetchHybridStockData(data.ticker);
        toast.dismiss('fetch-stock');

        if (result.success) {
          const newStock = await Stock.create(result.data);
          stockData = newStock;
        }
      }

      await Portfolio.create(data);

      const [updatedPositions, updatedStocks] = await Promise.all([
        Portfolio.list(),
        Stock.list(),
      ]);
      setPositions(updatedPositions);
      setStocks(updatedStocks);
      const map = {};
      updatedStocks.forEach(s => {
        if (s.ticker) map[s.ticker.toUpperCase()] = s;
      });
      setStocksMap(map);

      setIsAddDialogOpen(false);
      toast.success(`Added ${data.shares} shares of ${data.ticker.toUpperCase()}`);
    } catch (error) {
      console.error("Error adding position:", error);
      toast.error(error.message || "Failed to add position");
      throw error;
    }
  };

  const handleUpdatePosition = async (id, data) => {
    try {
      const updated = await Portfolio.update(id, data);
      setPositions(prev => prev.map(p => p.id === id ? updated : p));
      toast.success("Position updated");
    } catch (error) {
      console.error("Error updating position:", error);
      toast.error("Failed to update position");
    }
  };

  const handleDeletePosition = async (id) => {
    try {
      await Portfolio.delete(id);
      setPositions(prev => prev.filter(p => p.id !== id));
      toast.success("Position removed");
    } catch (error) {
      console.error("Error deleting position:", error);
      toast.error("Failed to remove position");
    }
  };

  const handleSellSuccess = useCallback(({ positionId, isPartial, unitsDeducted }) => {
    soldPositionsRef.current.set(String(positionId), {
      timestamp: Date.now(),
      isPartial: !!isPartial,
      unitsDeducted: unitsDeducted ?? 0,
    });

    setEtoroPortfolio(prev => {
      if (!prev) return prev;
      return { ...prev, positions: applyGraceFilter(prev.positions) };
    });

    if (sellRefreshTimerRef.current) clearTimeout(sellRefreshTimerRef.current);
    sellRefreshTimerRef.current = setTimeout(() => {
      loadEtoroPortfolio(true);
    }, 5000);
  }, [loadEtoroPortfolio, applyGraceFilter]);

  useEffect(() => {
    return () => {
      if (sellRefreshTimerRef.current) clearTimeout(sellRefreshTimerRef.current);
    };
  }, []);

  const handleCancelOrder = async (orderId, isLimitOrder = false) => {
    try {
      if (isLimitOrder) {
        await cancelLimitOrder(orderId);
      } else {
        await cancelOpenOrder(orderId);
      }
      toast.success('Order cancelled');
      loadEtoroPortfolio(true);
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
    }
  };

  const dividendPositions = useMemo(() => {
    return allPositions.filter(pos => (pos.dividendYield || 0) > 0);
  }, [allPositions]);

  if (isLoading) {
    return <LoadingState message="Loading portfolio..." />;
  }

  return (
    <PageContainer maxWidth="6xl" bottomPadding>
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl font-semibold text-slate-100">Portfolio</h1>
          <DemoModeBanner />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="gap-1.5 bg-[#3FB923] hover:bg-green-600 text-white">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Stock</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {!etoroConnectedLoading && !etoroConnected && (
        <div className="mb-3 sm:mb-4 flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
          <div className="flex items-center gap-2 text-blue-400/80">
            <Link2 className="h-4 w-4 shrink-0" />
            <p className="text-xs font-medium">Connect eToro to sync your portfolio</p>
          </div>
          <Link
            href="/Settings"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[11px] font-medium transition-colors shrink-0"
          >
            Settings
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <TabsList className="bg-slate-800/60 border border-slate-700/50 rounded-lg h-9">
            <TabsTrigger
              value="portfolio"
              className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-[#3FB923] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-200"
            >
              <Wallet className="h-3.5 w-3.5" />
              Holdings
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors data-[state=active]:bg-[#3FB923] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-200"
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">All holdings</span>
            <Switch
              checked={showAllHoldings}
              onCheckedChange={setShowAllHoldings}
              className="data-[state=checked]:bg-[#3FB923]"
            />
          </label>
        </div>

        <TabsContent value="portfolio">
          <HoldingsTab
            positions={allPositions}
            totals={unifiedTotals}
            portfolioYield={portfolioYield}
            onUpdate={handleUpdatePosition}
            onDelete={handleDeletePosition}
            onAddClick={() => setIsAddDialogOpen(true)}
            pendingOrders={etoroPortfolio?.orders || []}
            availableCash={etoroPortfolio?.credit ?? null}
            instrumentMap={instrumentMap}
            resolvedSymbols={resolvedSymbols}
            onCancelOrder={handleCancelOrder}
            onRefreshEtoro={() => loadEtoroPortfolio(true)}
            onSellSuccess={handleSellSuccess}
            etoroRefreshing={etoroRefreshing}
            etoroLoading={etoroLoading}
            etoroError={etoroError}
            etoroLastSynced={etoroLastSynced}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <DividendCalendar
            positions={dividendPositions}
            stocksMap={stocksMap}
          />
        </TabsContent>
      </Tabs>

      <AddPositionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddPosition}
        existingStocks={stocks}
        existingPositions={positions}
      />
    </PageContainer>
  );
}
