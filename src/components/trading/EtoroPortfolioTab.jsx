'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  DollarSign,
  Loader2,
  AlertCircle,
  Wallet,
  Clock,
  XCircle,
} from 'lucide-react';
import { cancelOpenOrder } from '@/functions/etoroTradingApi';
import { cn } from '@/lib/utils';
import { Portfolio } from '@/entities/Portfolio';
import TradeDialog from './TradeDialog';
import { etoroFetch } from '@/functions/etoroFetch';
import { toast } from '@/components/ui/use-toast';

function formatCurrency(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value, decimals = 4) {
  if (value == null) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const INSTRUMENT_CACHE_KEY = 'etoro_instrument_symbols';

function getInstrumentCache() {
  try {
    return JSON.parse(localStorage.getItem(INSTRUMENT_CACHE_KEY) || '{}');
  } catch { return {}; }
}

function setInstrumentCache(cache) {
  localStorage.setItem(INSTRUMENT_CACHE_KEY, JSON.stringify(cache));
}

export default function EtoroPortfolioTab({ stocksMap = {} }) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tradeDialog, setTradeDialog] = useState(null);
  const [resolvedSymbols, setResolvedSymbols] = useState(getInstrumentCache);

  // Build a reverse lookup: instrumentId -> stock data
  const instrumentMap = React.useMemo(() => {
    const map = {};
    Object.values(stocksMap).forEach(stock => {
      if (stock.instrumentId) {
        map[stock.instrumentId] = stock;
      }
    });
    return map;
  }, [stocksMap]);

  const loadPortfolio = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      Portfolio.clearEtoroCache();
      const data = await Portfolio.fetchEtoroPortfolio();
      setPortfolio(data);
    } catch (err) {
      console.error('Failed to load eToro portfolio:', err);
      setError(err.message || 'Failed to load eToro portfolio');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Resolve instrument IDs to symbols for positions/orders not in stocksMap
  useEffect(() => {
    const allIds = [
      ...(portfolio?.positions || []).map(p => p.instrumentId),
      ...(portfolio?.orders || []).map(o => o.instrumentId),
    ];
    if (allIds.length === 0) return;

    const unknownIds = allIds.filter(id => id && !instrumentMap[id] && !resolvedSymbols[id]);

    if (unknownIds.length === 0) return;

    const uniqueIds = [...new Set(unknownIds)];
    let cancelled = false;

    const resolveSymbols = async () => {
      const cache = { ...resolvedSymbols };
      let changed = false;
      for (const id of uniqueIds) {
        if (cancelled) break;
        try {
          const res = await etoroFetch(`/api/etoro/api/v1/market-data/search?instrumentId=${id}`);
          if (res.ok) {
            const data = await res.json();
            const item = data.items?.[0];
            if (item) {
              cache[id] = item.internalSymbolFull || item.symbolFull || `ID:${id}`;
              changed = true;
            } else if (!cache[id]) {
              cache[id] = `ID:${id}`;
              changed = true;
            }
          } else if (!cache[id]) {
            cache[id] = `ID:${id}`;
            changed = true;
          }
        } catch {
          if (!cache[id]) {
            cache[id] = `ID:${id}`;
            changed = true;
          }
        }
      }
      if (!cancelled && changed) {
        setResolvedSymbols(cache);
        setInstrumentCache(cache);
      }
    };
    resolveSymbols();

    return () => { cancelled = true; };
  }, [portfolio, instrumentMap, resolvedSymbols]);

  const getStockForPosition = (position) => {
    return instrumentMap[position.instrumentId] || stocksMap[position.ticker] || null;
  };

  const getTickerForPosition = (position) => {
    const stock = getStockForPosition(position);
    if (stock?.ticker) return stock.ticker;
    if (resolvedSymbols[position.instrumentId]) return resolvedSymbols[position.instrumentId];
    return position.ticker || null;
  };

  const handleBuy = (position) => {
    const stock = getStockForPosition(position);
    const ticker = getTickerForPosition(position);
    setTradeDialog({
      mode: 'buy',
      instrumentId: position.instrumentId,
      ticker: ticker || `ID:${position.instrumentId}`,
      name: stock?.name || '',
      currentPrice: position.currentRate || stock?.price || null,
      logo: stock?.logo50x50 || null,
      isOpen: stock?.isCurrentlyTradable !== false,
    });
  };

  const handleSell = (position) => {
    const stock = getStockForPosition(position);
    const ticker = getTickerForPosition(position);
    setTradeDialog({
      mode: 'sell',
      instrumentId: position.instrumentId,
      ticker: ticker || `ID:${position.instrumentId}`,
      name: stock?.name || '',
      currentPrice: position.currentRate || stock?.price || null,
      logo: stock?.logo50x50 || null,
      isOpen: true,
      positionId: position.positionId,
      positionUnits: position.shares,
    });
  };

  const handleTradeClose = () => {
    setTradeDialog(null);
    loadPortfolio(true);
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await cancelOpenOrder(orderId);
      toast({ title: "Order cancelled", variant: "success", duration: 3000 });
      loadPortfolio(true);
    } catch (err) {
      toast({ title: err.message || "Failed to cancel order", variant: "destructive", duration: 3000 });
    }
  };

  const getSymbolForInstrumentId = (instId) => {
    const stock = instrumentMap[instId];
    if (stock?.ticker) return stock.ticker;
    if (resolvedSymbols[instId]) return resolvedSymbols[instId];
    return `ID:${instId}`;
  };

  if (loading) {
    return (
      <Card className="bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading eToro portfolio...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-red-500/10 p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Cannot Load eToro Portfolio</h3>
          <p className="text-muted-foreground text-center mb-4 max-w-md text-sm">
            {error}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => loadPortfolio()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const positions = portfolio?.positions || [];
  const pendingOrders = portfolio?.orders || [];
  const hasPositions = positions.length > 0;
  const hasPendingOrders = pendingOrders.length > 0;

  const totalValue = positions.reduce(
    (sum, p) => sum + (p.currentRate || 0) * (p.shares || 0),
    0
  );
  const totalPnL = positions.reduce((sum, p) => sum + (p.netProfit || 0), 0);
  const totalInvested = positions.reduce(
    (sum, p) => sum + (p.amount || (p.cost_basis || 0) * (p.shares || 0)),
    0
  );
  const availableCredit = portfolio?.credit ?? null;

  return (
    <div>
      {/* Summary Cards */}
      {(hasPositions || availableCredit !== null) && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {availableCredit !== null && (
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">Available Cash</div>
                <div className="text-xl font-bold">{formatCurrency(availableCredit)}</div>
              </CardContent>
            </Card>
          )}
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Positions</div>
              <div className="text-xl font-bold">{positions.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Value</div>
              <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Invested</div>
              <div className="text-xl font-bold">{formatCurrency(totalInvested)}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">P&L</div>
              <div
                className={cn(
                  'text-xl font-bold',
                  totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {totalPnL >= 0 ? '+' : ''}
                {formatCurrency(totalPnL)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-card/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">eToro Positions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadPortfolio(true)}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn('h-4 w-4', refreshing && 'animate-spin')}
            />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {!hasPositions ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No Open Positions
              </h3>
              <p className="text-muted-foreground text-center mb-4 max-w-sm text-sm">
                Your eToro account has no open positions. Search for a stock and use the Buy button to start trading.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile view */}
              <div className="space-y-3 md:hidden">
                {positions.map((pos) => {
                  const stock = getStockForPosition(pos);
                  const ticker = getTickerForPosition(pos);
                  const value = (pos.currentRate || 0) * (pos.shares || 0);
                  const invested = pos.amount || ((pos.cost_basis || 0) * (pos.shares || 0));
                  const pnl = pos.netProfit || (value - invested);
                  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

                  return (
                    <Card key={pos.id} className="bg-card/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {stock?.logo50x50 && (
                              <img
                                src={stock.logo50x50}
                                alt={ticker}
                                className="w-10 h-10 rounded"
                              />
                            )}
                            <div>
                              <div className="font-semibold text-base">
                                {ticker || `ID:${pos.instrumentId}`}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                                {stock?.name || ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleBuy(pos)}
                              className="bg-[#3FB923] hover:bg-green-600 text-white font-semibold px-3 shadow-sm"
                            >
                              Buy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSell(pos)}
                              className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 font-semibold px-3"
                            >
                              Sell
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Units</div>
                            <div className="font-medium">{formatNumber(pos.shares)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Value</div>
                            <div className="font-medium">{formatCurrency(value)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Open Rate</div>
                            <div className="font-medium">{formatCurrency(pos.cost_basis)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">P&L</div>
                            <div
                              className={cn(
                                'font-medium',
                                pnl >= 0 ? 'text-green-500' : 'text-red-500'
                              )}
                            >
                              {pnl >= 0 ? '+' : ''}
                              {formatCurrency(pnl)}
                              <span className="text-xs ml-1">
                                ({pnlPct >= 0 ? '+' : ''}
                                {pnlPct.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop view */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instrument</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Open Rate</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead className="text-right w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((pos) => {
                      const stock = getStockForPosition(pos);
                      const ticker = getTickerForPosition(pos);
                      const value = (pos.currentRate || 0) * (pos.shares || 0);
                      const invested = pos.amount || ((pos.cost_basis || 0) * (pos.shares || 0));
                      const pnl = pos.netProfit || (value - invested);
                      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

                      return (
                        <TableRow key={pos.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {stock?.logo50x50 && (
                                <img
                                  src={stock.logo50x50}
                                  alt={ticker}
                                  className="w-6 h-6 rounded"
                                />
                              )}
                              <div>
                                <div className="font-medium">
                                  {ticker || `ID:${pos.instrumentId}`}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {stock?.name || ''}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(pos.shares)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(pos.cost_basis)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(pos.currentRate)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(value)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span
                                className={cn(
                                  'font-medium',
                                  pnl >= 0 ? 'text-green-500' : 'text-red-500'
                                )}
                              >
                                {pnl >= 0 ? '+' : ''}
                                {formatCurrency(pnl)}
                              </span>
                              <span
                                className={cn(
                                  'text-xs',
                                  pnlPct >= 0
                                    ? 'text-green-500/80'
                                    : 'text-red-500/80'
                                )}
                              >
                                {pnlPct >= 0 ? '+' : ''}
                                {pnlPct.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleBuy(pos)}
                                className="h-8 bg-[#3FB923] hover:bg-green-600 text-white font-semibold px-3 shadow-sm"
                              >
                                Buy
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSell(pos)}
                                className="h-8 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 font-semibold px-3"
                              >
                                Sell
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {hasPendingOrders && (
        <Card className="bg-card/50 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Pending Orders
              <Badge variant="outline" className="text-amber-400 border-amber-400/30 ml-1">
                {pendingOrders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile view */}
            <div className="space-y-3 md:hidden">
              {pendingOrders.map((order) => {
                const symbol = getSymbolForInstrumentId(order.instrumentId);
                const stock = instrumentMap[order.instrumentId];
                return (
                  <Card key={order.orderId} className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {stock?.logo50x50 && (
                            <img src={stock.logo50x50} alt={symbol} className="w-10 h-10 rounded" />
                          )}
                          <div>
                            <div className="font-semibold text-base">{symbol}</div>
                            <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs mt-0.5">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelOrder(order.orderId)}
                          className="gap-1 text-red-400 border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Amount</div>
                          <div className="font-medium">{formatCurrency(order.amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Units</div>
                          <div className="font-medium">{formatNumber(order.amountInUnits)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Direction</div>
                          <div className={cn('font-medium', order.isBuy ? 'text-green-500' : 'text-red-500')}>
                            {order.isBuy ? 'Buy' : 'Sell'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Created</div>
                          <div className="font-medium text-sm">
                            {new Date(order.openDateTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop view */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instrument</TableHead>
                    <TableHead className="text-right">Direction</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => {
                    const symbol = getSymbolForInstrumentId(order.instrumentId);
                    const stock = instrumentMap[order.instrumentId];
                    return (
                      <TableRow key={order.orderId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {stock?.logo50x50 && (
                              <img src={stock.logo50x50} alt={symbol} className="w-6 h-6 rounded" />
                            )}
                            <span className="font-medium">{symbol}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            order.isBuy
                              ? 'text-green-500 border-green-500/30'
                              : 'text-red-400 border-red-400/30'
                          )}>
                            {order.isBuy ? 'Buy' : 'Sell'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(order.amountInUnits)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(order.openDateTime).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelOrder(order.orderId)}
                            className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {tradeDialog && (
        <TradeDialog
          open={!!tradeDialog}
          onOpenChange={(open) => {
            if (!open) handleTradeClose();
          }}
          {...tradeDialog}
        />
      )}
    </div>
  );
}
