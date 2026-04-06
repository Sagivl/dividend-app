'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ShoppingCart,
  TrendingDown,
  DollarSign,
  Hash,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  openPositionByAmount,
  openPositionByUnits,
  closePosition,
  getTradingEnvironment,
} from '@/functions/etoroTradingApi';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}

function TradeForm({
  mode,
  instrumentId,
  ticker,
  name,
  currentPrice,
  logo,
  isOpen: marketIsOpen,
  positionId,
  positionUnits,
  onClose,
  onSellSuccess,
  isDrawer = false,
}) {
  const [orderType, setOrderType] = useState('amount');
  const [amount, setAmount] = useState('');
  const [units, setUnits] = useState('');
  const [partialClose, setPartialClose] = useState(false);
  const [closeUnits, setCloseUnits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [tradingEnv, setTradingEnv] = useState(null);

  useEffect(() => {
    getTradingEnvironment()
      .then(setTradingEnv)
      .catch(() => setTradingEnv({ environment: 'unknown' }));
  }, []);

  const isBuy = mode === 'buy';
  const isSell = mode === 'sell';

  const estimatedUnits =
    orderType === 'amount' && amount && currentPrice
      ? (Number(amount) / currentPrice).toFixed(4)
      : null;

  const estimatedCost =
    orderType === 'units' && units && currentPrice
      ? (Number(units) * currentPrice).toFixed(2)
      : null;

  const validate = () => {
    if (isBuy) {
      if (orderType === 'amount') {
        if (!amount || Number(amount) <= 0) {
          setError('Please enter a valid amount');
          return false;
        }
      } else {
        if (!units || Number(units) <= 0) {
          setError('Please enter a valid number of units');
          return false;
        }
      }
    }
    if (isSell && partialClose) {
      if (!closeUnits || Number(closeUnits) <= 0) {
        setError('Please enter units to sell');
        return false;
      }
      if (positionUnits && Number(closeUnits) > positionUnits) {
        setError(`Cannot sell more than ${positionUnits} units`);
        return false;
      }
    }
    return true;
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    if (tradingEnv?.environment === 'real') {
      setShowConfirm(true);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setError('');

    try {
      let response;
      if (isBuy) {
        if (orderType === 'amount') {
          response = await openPositionByAmount(instrumentId, Number(amount));
        } else {
          response = await openPositionByUnits(instrumentId, Number(units));
        }
      } else {
        const unitsToDeduct = partialClose ? Number(closeUnits) : null;
        response = await closePosition(positionId, unitsToDeduct, instrumentId);
      }

      setResult({ success: true, data: response });
      if (isSell && onSellSuccess) {
        onSellSuccess({
          positionId,
          isPartial: partialClose,
          unitsDeducted: partialClose ? Number(closeUnits) : null,
        });
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4 py-4">
        <div className="flex flex-col items-center text-center gap-3">
          {result.success ? (
            <>
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Order Placed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your {isBuy ? 'buy' : 'sell'} order for {ticker} has been submitted
                  {tradingEnv?.environment === 'demo' && ' (demo account)'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Order Failed</h3>
                <p className="text-sm text-red-400 mt-1">{result.error}</p>
              </div>
            </>
          )}
        </div>
        <Button
          onClick={onClose}
          className={cn('w-full', isDrawer && 'h-12')}
          variant={result.success ? 'default' : 'outline'}
        >
          {result.success ? 'Done' : 'Close'}
        </Button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handlePreSubmit} className="space-y-5">
        {/* Environment banner */}
        {tradingEnv && (
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              tradingEnv.environment === 'demo'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            )}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {tradingEnv.environment === 'demo'
              ? 'Demo account - no real money at risk'
              : 'Real account - real money will be used'}
          </div>
        )}

        {/* Instrument info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          {logo ? (
            <img src={logo} alt={ticker} className="w-10 h-10 rounded" />
          ) : (
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {ticker?.slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{ticker}</div>
            <div className="text-sm text-muted-foreground truncate">{name}</div>
          </div>
          <div className="text-right">
            {currentPrice && (
              <div className="font-semibold">${currentPrice.toFixed(2)}</div>
            )}
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                marketIsOpen
                  ? 'text-green-500 border-green-500/30'
                  : 'text-red-400 border-red-400/30'
              )}
            >
              {marketIsOpen ? 'Open' : 'Closed'}
            </Badge>
          </div>
        </div>

        {!marketIsOpen && (
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Market is currently closed. Your order will be queued.
          </div>
        )}

        {/* Buy form */}
        {isBuy && (
          <>
            {/* Order type toggle */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={orderType === 'amount' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('amount')}
                className={cn(
                  'flex-1 gap-1.5',
                  orderType === 'amount' && 'bg-[#3FB923] hover:bg-green-600'
                )}
              >
                <DollarSign className="h-4 w-4" />
                By Amount
              </Button>
              <Button
                type="button"
                variant={orderType === 'units' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('units')}
                className={cn(
                  'flex-1 gap-1.5',
                  orderType === 'units' && 'bg-[#3FB923] hover:bg-green-600'
                )}
              >
                <Hash className="h-4 w-4" />
                By Units
              </Button>
            </div>

            {orderType === 'amount' ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Investment Amount (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    className="pl-9 h-12 text-base"
                    autoFocus
                  />
                </div>
                {estimatedUnits && (
                  <p className="text-sm text-muted-foreground">
                    ≈ {estimatedUnits} units at current price
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Number of Units</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="10"
                  value={units}
                  onChange={(e) => {
                    setUnits(e.target.value);
                    setError('');
                  }}
                  className="h-12 text-base"
                  autoFocus
                />
                {estimatedCost && (
                  <p className="text-sm text-muted-foreground">
                    ≈ ${Number(estimatedCost).toLocaleString()} estimated cost
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Sell form */}
        {isSell && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Partial Close</Label>
              <Switch
                checked={partialClose}
                onCheckedChange={setPartialClose}
              />
            </div>
            {partialClose ? (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Units to sell (of {positionUnits?.toFixed(4) || '?'})
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max={positionUnits || undefined}
                  placeholder="0"
                  value={closeUnits}
                  onChange={(e) => {
                    setCloseUnits(e.target.value);
                    setError('');
                  }}
                  className="h-12 text-base"
                  autoFocus
                />
                {closeUnits && currentPrice && (
                  <p className="text-sm text-muted-foreground">
                    ≈ ${(Number(closeUnits) * currentPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    at current price
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                <p className="text-red-400">
                  This will close your entire position
                  {positionUnits
                    ? ` (${positionUnits.toFixed(4)} units)`
                    : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          className={cn(
            'flex gap-3 pt-2',
            isDrawer ? 'flex-col' : 'justify-end'
          )}
        >
          <Button
            type="submit"
            disabled={isSubmitting}
            size={isDrawer ? 'lg' : 'default'}
            className={cn(
              'gap-2',
              isDrawer && 'order-1',
              isBuy
                ? 'bg-[#3FB923] hover:bg-green-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isBuy ? (
              <>
                <ShoppingCart className="h-4 w-4" />
                Buy {ticker}
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4" />
                Sell {ticker}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            size={isDrawer ? 'lg' : 'default'}
            className={isDrawer ? 'order-2' : ''}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Real money confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Real Trade
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {isBuy ? 'buy' : 'sell'} {ticker} on your{' '}
              <strong>real eToro account</strong>. This will use real money.
              {isBuy &&
                orderType === 'amount' &&
                ` You will invest $${Number(amount).toLocaleString()}.`}
              {isBuy &&
                orderType === 'units' &&
                ` You will buy ${units} units (~$${estimatedCost}).`}
              {isSell &&
                !partialClose &&
                ' Your entire position will be closed.'}
              {isSell &&
                partialClose &&
                ` You will sell ${closeUnits} units.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              className={
                isBuy
                  ? 'bg-[#3FB923] hover:bg-green-600'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              Confirm {isBuy ? 'Buy' : 'Sell'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function TradeDialog({
  open,
  onOpenChange,
  mode = 'buy',
  instrumentId,
  ticker,
  name,
  currentPrice,
  logo,
  isOpen: marketIsOpen,
  positionId,
  positionUnits,
  onSellSuccess,
}) {
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const title = mode === 'buy' ? `Buy ${ticker || ''}` : `Sell ${ticker || ''}`;
  const description =
    mode === 'buy'
      ? 'Open a new position on eToro'
      : 'Close or reduce your position';

  const formProps = {
    mode,
    instrumentId,
    ticker,
    name,
    currentPrice,
    logo,
    isOpen: marketIsOpen,
    positionId,
    positionUnits,
    onClose: handleClose,
    onSellSuccess,
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[440px] p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <TradeForm {...formProps} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-xl">{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <TradeForm {...formProps} isDrawer />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
