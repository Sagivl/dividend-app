'use client';

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function EditPositionDialog({ 
  open, 
  onOpenChange, 
  position,
  onSubmit 
}) {
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
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Failed to update position");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit {position?.ticker} Position</DialogTitle>
          <DialogDescription>
            Update the details of your position.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-shares">Number of Shares</Label>
            <Input
              id="edit-shares"
              type="number"
              step="any"
              min="0.0001"
              value={shares}
              onChange={(e) => {
                setShares(e.target.value);
                setError("");
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-costBasis">Total Cost Basis ($)</Label>
            <Input
              id="edit-costBasis"
              type="number"
              step="0.01"
              min="0"
              placeholder="Optional"
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

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
