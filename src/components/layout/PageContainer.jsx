'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageContainer - Consistent page wrapper for all views
 * Provides standardized background, padding, and max-width
 */
export default function PageContainer({ 
  children, 
  className,
  maxWidth = '7xl', // '4xl' | '5xl' | '6xl' | '7xl'
  noPadding = false,
  bottomPadding = false, // Extra bottom padding for pages with sticky bottom bars
}) {
  const maxWidthClasses = {
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  return (
    <div 
      className={cn(
        "flex-1 bg-slate-900 text-slate-200",
        bottomPadding && "pb-20 sm:pb-6",
        className
      )}
    >
      <div 
        className={cn(
          "mx-auto",
          maxWidthClasses[maxWidth] || 'max-w-7xl',
          !noPadding && "p-3 sm:p-6"
        )}
      >
        {children}
      </div>
    </div>
  );
}
