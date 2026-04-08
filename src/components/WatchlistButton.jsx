'use client';

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Watchlist } from '@/entities/Watchlist';
import { toast } from '@/components/ui/use-toast';

export default function WatchlistButton({ 
  ticker, 
  size = 'md',
  className = '',
  showLabel = false,
  onToggle = null,
  initialIsInWatchlist = undefined
}) {
  const skipInitialCheck = initialIsInWatchlist !== undefined;
  const [isInWatchlist, setIsInWatchlist] = useState(skipInitialCheck ? initialIsInWatchlist : false);
  const [isLoading, setIsLoading] = useState(!skipInitialCheck);

  useEffect(() => {
    if (skipInitialCheck) return;

    const checkWatchlist = async () => {
      if (!ticker) {
        setIsLoading(false);
        return;
      }
      
      try {
        const inWatchlist = await Watchlist.isInWatchlist(ticker);
        setIsInWatchlist(inWatchlist);
      } catch (error) {
        console.error('Error checking watchlist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkWatchlist();
  }, [ticker, skipInitialCheck]);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!ticker || isLoading) return;

    try {
      const result = await Watchlist.toggle(ticker);
      setIsInWatchlist(result.added);
      
      toast({
        title: result.added ? 'Added to Watchlist' : 'Removed from Watchlist',
        description: `${result.ticker} has been ${result.added ? 'added to' : 'removed from'} your watchlist.`,
        duration: 2000,
      });

      if (onToggle) {
        onToggle(result);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update watchlist. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  if (!ticker) return null;

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (showLabel) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          ${isInWatchlist 
            ? 'text-yellow-400 hover:text-yellow-300' 
            : 'text-slate-400 hover:text-yellow-400'
          }
          hover:bg-slate-700/50
          ${className}
        `}
      >
        <Star 
          className={`${iconSizes[size]} mr-1.5 transition-colors`}
          fill={isInWatchlist ? 'currentColor' : 'none'}
        />
        {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isLoading}
      title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
      className={`
        ${sizeClasses[size]}
        ${isInWatchlist 
          ? 'text-yellow-400 hover:text-yellow-300' 
          : 'text-slate-400 hover:text-yellow-400'
        }
        hover:bg-slate-700/50
        transition-colors
        ${className}
      `}
    >
      <Star 
        className={`${iconSizes[size]} transition-colors`}
        fill={isInWatchlist ? 'currentColor' : 'none'}
      />
    </Button>
  );
}
