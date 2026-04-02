'use client';

import React, { useState, useEffect } from "react";
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
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { 
  Hash,
  DollarSign,
  CalendarIcon, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

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

function EditPositionForm({ position, onSubmit, onCancel, isDrawer = false }) {
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (position) {
      setShares(position.shares?.toString() || "");
      setCostBasis(position.cost_basis?.toString() || "");
      setPurchaseDate(position.purchase_date ? parseISO(position.purchase_date) : null);
      setError("");
    }
  }, [position]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!shares || Number(shares) <= 0) {
      setError("Please enter a valid number of shares");
      return;
    }

    if (costBasis && Number(costBasis) < 0) {
      setError("Cost basis cannot be negative");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        shares: Number(shares),
        cost_basis: costBasis ? Number(costBasis) : null,
        purchase_date: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : null
      });
    } catch (err) {
      setError(err.message || "Failed to update position");
      setIsSubmitting(false);
    }
  };

  const stock = position?.stock;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Stock Info */}
      {stock && (
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center gap-3">
            {stock.logo50x50 ? (
              <img src={stock.logo50x50} alt={position.ticker} className="w-10 h-10 rounded" />
            ) : (
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {position.ticker?.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{position.ticker}</div>
              <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
            </div>
            {stock.price > 0 && (
              <div className="text-right">
                <div className="font-medium">${stock.price.toFixed(2)}</div>
                {stock.dividend_yield > 0 && (
                  <div className="text-xs text-green-500">{stock.dividend_yield.toFixed(2)}% yield</div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

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
          value={shares}
          onChange={(e) => {
            setShares(e.target.value);
            setError("");
          }}
          className="text-base h-12"
        />
        {stock?.price && shares && Number(shares) > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>Current value</span>
            <span className="font-medium text-foreground">
              ${(Number(shares) * stock.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          disabled={isSubmitting || !shares}
          className={cn("gap-2", isDrawer && "order-1")}
          size={isDrawer ? "lg" : "default"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
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

export default function EditPositionDialog({ 
  open, 
  onOpenChange, 
  position,
  onSubmit 
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
            <DialogTitle className="text-xl">Edit Position</DialogTitle>
            <DialogDescription>
              Update your {position?.ticker} holdings
            </DialogDescription>
          </DialogHeader>
          <EditPositionForm
            position={position}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-xl">Edit Position</DrawerTitle>
          <DrawerDescription>
            Update your {position?.ticker} holdings
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <EditPositionForm
            position={position}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isDrawer
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
