'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import TradeDialog from './TradeDialog';

export default function BuyButton({ stock, size = 'sm', className }) {
  const [open, setOpen] = useState(false);

  if (!stock?.ticker || !stock?.instrumentId) return null;

  const buttonSize = size === 'md' ? 'sm' : 'sm';

  return (
    <>
      <Button
        variant="outline"
        size={buttonSize}
        onClick={() => setOpen(true)}
        className={cn(
          'gap-1.5 text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-300',
          className
        )}
      >
        <ShoppingCart className={cn(size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
        Buy
      </Button>

      <TradeDialog
        open={open}
        onOpenChange={setOpen}
        mode="buy"
        instrumentId={stock.instrumentId}
        ticker={stock.ticker}
        name={stock.name || ''}
        currentPrice={stock.price || null}
        logo={stock.logo50x50 || null}
        isOpen={stock.isCurrentlyTradable !== false}
      />
    </>
  );
}
