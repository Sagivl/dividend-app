'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_TIMEOUT_MS = 15000;

export default function LoadingState({ 
  message,
  fullPage = true,
  className,
  size = 'default',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onTimeout,
}) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!timeoutMs) return;
    const id = setTimeout(() => {
      setTimedOut(true);
      onTimeout?.();
    }, timeoutMs);
    return () => clearTimeout(id);
  }, [timeoutMs, onTimeout]);

  const sizeClasses = {
    sm: 'h-6 w-6',
    default: 'h-8 w-8 sm:h-10 sm:w-10',
    lg: 'h-10 w-10 sm:h-12 sm:w-12',
  };

  const spinner = (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <Loader2 
        className={cn(
          "text-green-400 animate-spin",
          sizeClasses[size] || sizeClasses.default
        )} 
      />
      {timedOut ? (
        <p className="mt-3 text-amber-400 text-sm">
          Taking longer than expected. Try refreshing the page.
        </p>
      ) : message ? (
        <p className="mt-3 text-slate-400 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
