'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TradeDialog from './TradeDialog';

export default function BuyButton({ stock, size = 'sm', className }) {
  const [open, setOpen] = useState(false);

  if (!stock?.ticker || !stock?.instrumentId) return null;

  const buttonSize = size === 'md' ? 'sm' : 'sm';

  return (
    <>
      <Button
        size={buttonSize}
        onClick={() => setOpen(true)}
        className={cn(
          'bg-[#3FB923] hover:bg-green-600 text-white font-semibold px-4 shadow-sm',
          className
        )}
      >
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
