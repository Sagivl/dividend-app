'use client';

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Check, ChevronsUpDown, CalendarIcon, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function AddPositionDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  existingStocks = [],
  existingPositions = []
}) {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(null);
  const [showOptional, setShowOptional] = useState(false);
  const [tickerOpen, setTickerOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const existingTickers = useMemo(() => 
    new Set(existingPositions.map(p => p.ticker.toUpperCase())),
    [existingPositions]
  );

  const availableStocks = useMemo(() => 
    existingStocks.filter(s => s.ticker && !existingTickers.has(s.ticker.toUpperCase())),
    [existingStocks, existingTickers]
  );

  const resetForm = () => {
    setTicker("");
    setShares("");
    setCostBasis("");
    setPurchaseDate(null);
    setShowOptional(false);
    setError("");
    setIsSubmitting(false);
  };

  const handleOpenChange = (open) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

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
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to add position");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTicker = (value) => {
    setTicker(value);
    setTickerOpen(false);
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Stock Position</DialogTitle>
          <DialogDescription>
            Add a stock to track in your portfolio. Enter the ticker and number of shares you own.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticker">Stock Ticker</Label>
            <Popover open={tickerOpen} onOpenChange={setTickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {ticker || "Search or enter ticker..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[375px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search stocks..." 
                    value={ticker}
                    onValueChange={(value) => {
                      setTicker(value.toUpperCase());
                      setError("");
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {ticker ? (
                        <button
                          type="button"
                          className="w-full p-2 text-left hover:bg-accent"
                          onClick={() => handleSelectTicker(ticker)}
                        >
                          Use "{ticker.toUpperCase()}" (will fetch data)
                        </button>
                      ) : (
                        "Type a ticker symbol..."
                      )}
                    </CommandEmpty>
                    {availableStocks.length > 0 && (
                      <CommandGroup heading="Your Analyzed Stocks">
                        {availableStocks.slice(0, 10).map((stock) => (
                          <CommandItem
                            key={stock.id}
                            value={stock.ticker}
                            onSelect={handleSelectTicker}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                ticker.toUpperCase() === stock.ticker.toUpperCase() 
                                  ? "opacity-100" 
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-2">
                              {stock.logo50x50 && (
                                <img 
                                  src={stock.logo50x50} 
                                  alt={stock.ticker}
                                  className="w-5 h-5 rounded"
                                />
                              )}
                              <span className="font-medium">{stock.ticker}</span>
                              <span className="text-muted-foreground text-sm truncate max-w-[200px]">
                                {stock.name}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shares">Number of Shares</Label>
            <Input
              id="shares"
              type="number"
              step="any"
              min="0.0001"
              placeholder="e.g., 50"
              value={shares}
              onChange={(e) => {
                setShares(e.target.value);
                setError("");
              }}
            />
          </div>

          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" type="button" className="w-full justify-between px-0">
                <span className="text-sm text-muted-foreground">Optional: Cost & Date</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  showOptional && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="costBasis">Total Cost Basis ($)</Label>
                <Input
                  id="costBasis"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 2500"
                  value={costBasis}
                  onChange={(e) => setCostBasis(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used to calculate yield on cost
                </p>
              </div>

              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !purchaseDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {purchaseDate ? format(purchaseDate, "PPP") : "Select date"}
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
            </CollapsibleContent>
          </Collapsible>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Position"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
