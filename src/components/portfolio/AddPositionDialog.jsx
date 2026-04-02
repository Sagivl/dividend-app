'use client';

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Hash,
  DollarSign,
  CalendarIcon, 
  ChevronRight,
  Loader2,
  TrendingUp,
  AlertCircle,
  X,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

function AddPositionForm({ 
  onSubmit, 
  onCancel,
  existingStocks = [],
  existingPositions = [],
  isDrawer = false
}) {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const existingTickers = useMemo(() => 
    new Set(existingPositions.map(p => p.ticker.toUpperCase())),
    [existingPositions]
  );

  const selectedStock = useMemo(() => 
    existingStocks.find(s => s.ticker?.toUpperCase() === ticker.toUpperCase()),
    [existingStocks, ticker]
  );

  const filteredStocks = useMemo(() => {
    if (!ticker) return existingStocks.filter(s => s.ticker && !existingTickers.has(s.ticker.toUpperCase())).slice(0, 5);
    return existingStocks.filter(s => 
      s.ticker && 
      !existingTickers.has(s.ticker.toUpperCase()) &&
      (s.ticker.toUpperCase().includes(ticker.toUpperCase()) ||
       s.name?.toLowerCase().includes(ticker.toLowerCase()))
    ).slice(0, 5);
  }, [existingStocks, existingTickers, ticker]);

  const validate = () => {
    if (!ticker.trim()) {
      setError("Please enter a stock ticker");
      return false;
    }
    if (!shares || Number(shares) <= 0) {
      setError("Please enter a valid number of shares");
      return false;
    }
    if (existingTickers.has(ticker.toUpperCase().trim())) {
      setError(`You already have a position in ${ticker.toUpperCase()}`);
      return false;
    }
    if (costBasis && Number(costBasis) < 0) {
      setError("Cost basis cannot be negative");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ticker: ticker.toUpperCase().trim(),
        shares: Number(shares),
        cost_basis: costBasis ? Number(costBasis) : null,
        purchase_date: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : null
      });
    } catch (err) {
      setError(err.message || "Failed to add position");
      setIsSubmitting(false);
    }
  };

  const handleSelectStock = (stock) => {
    setTicker(stock.ticker);
    setShowSuggestions(false);
    setError("");
  };

  const clearTicker = () => {
    setTicker("");
    setError("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Ticker Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          Stock Ticker
        </Label>
        <div className="relative">
          <Input
            type="text"
            placeholder="Enter ticker (e.g., AAPL)"
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value.toUpperCase());
              setShowSuggestions(true);
              setError("");
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pr-10 text-base h-12"
          />
          {ticker && (
            <button
              type="button"
              onClick={clearTicker}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Stock Suggestions */}
        {showSuggestions && filteredStocks.length > 0 && !selectedStock && (
          <Card className="p-1 mt-1 max-h-[200px] overflow-y-auto">
            {filteredStocks.map((stock) => (
              <button
                key={stock.id}
                type="button"
                onClick={() => handleSelectStock(stock)}
                className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-accent text-left transition-colors"
              >
                {stock.logo50x50 ? (
                  <img src={stock.logo50x50} alt={stock.ticker} className="w-8 h-8 rounded" />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                    {stock.ticker?.slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{stock.ticker}</div>
                  <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
                </div>
                {stock.dividend_yield > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {stock.dividend_yield.toFixed(1)}%
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </Card>
        )}

        {/* Selected Stock Preview */}
        {selectedStock && (
          <Card className="p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              {selectedStock.logo50x50 ? (
                <img src={selectedStock.logo50x50} alt={selectedStock.ticker} className="w-10 h-10 rounded" />
              ) : (
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {selectedStock.ticker?.slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{selectedStock.ticker}</div>
                <div className="text-sm text-muted-foreground truncate">{selectedStock.name}</div>
              </div>
              <div className="text-right">
                {selectedStock.dividend_yield > 0 && (
                  <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                    <Percent className="h-3 w-3" />
                    {selectedStock.dividend_yield.toFixed(2)}%
                  </div>
                )}
                {selectedStock.price > 0 && (
                  <div className="text-xs text-muted-foreground">
                    ${selectedStock.price.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Shares Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          Number of Shares
        </Label>
        <Input
          type="number"
          step="any"
          min="0.0001"
          placeholder="0"
          value={shares}
          onChange={(e) => {
            setShares(e.target.value);
            setError("");
          }}
          className="text-base h-12"
        />
        {selectedStock && shares && Number(shares) > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>Estimated value</span>
            <span className="font-medium text-foreground">
              ${(Number(shares) * (selectedStock.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Optional Fields */}
      <div className="space-y-4 pt-2 border-t border-dashed">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Optional</div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Cost Basis */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Cost Basis
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Total cost"
              value={costBasis}
              onChange={(e) => setCostBasis(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Purchase Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Purchase Date
            </Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11",
                    !purchaseDate && "text-muted-foreground"
                  )}
                >
                  {purchaseDate ? format(purchaseDate, "MMM d, yyyy") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={(date) => {
                    setPurchaseDate(date);
                    setDateOpen(false);
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {costBasis && shares && selectedStock?.dividend_yield > 0 && (
          <div className="flex items-center justify-between text-sm bg-green-500/10 text-green-600 dark:text-green-400 p-2.5 rounded-lg">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Yield on Cost
            </span>
            <span className="font-semibold">
              {(((Number(shares) * (selectedStock.price || 0) * (selectedStock.dividend_yield / 100)) / Number(costBasis)) * 100).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className={cn(
        "flex gap-3 pt-2",
        isDrawer ? "flex-col" : "justify-end"
      )}>
        <Button 
          type="submit" 
          disabled={isSubmitting || !ticker || !shares}
          className={cn("gap-2", isDrawer && "order-1")}
          size={isDrawer ? "lg" : "default"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add to Portfolio"
          )}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
          className={isDrawer ? "order-2" : ""}
          size={isDrawer ? "lg" : "default"}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AddPositionDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  existingStocks = [],
  existingPositions = []
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const handleSubmit = async (data) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[440px] p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">Add Stock Position</DialogTitle>
            <DialogDescription>
              Track a stock in your dividend portfolio
            </DialogDescription>
          </DialogHeader>
          <AddPositionForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            existingStocks={existingStocks}
            existingPositions={existingPositions}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-xl">Add Stock Position</DrawerTitle>
          <DrawerDescription>
            Track a stock in your dividend portfolio
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <AddPositionForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            existingStocks={existingStocks}
            existingPositions={existingPositions}
            isDrawer
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
