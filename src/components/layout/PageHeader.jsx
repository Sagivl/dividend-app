'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader - Consistent page header component
 * Provides standardized title, description, icon, and optional action button
 */
export default function PageHeader({ 
  title,
  description,
  icon: Icon,
  action,
  className,
  compact = false, // For mobile-friendly compact version
}) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2.5 mb-4 sm:mb-6", className)}>
        {Icon && (
          <div className="bg-slate-800 p-2 sm:p-2.5 rounded-lg border border-slate-700 flex-shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-100 truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-400 truncate">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between mb-4 sm:mb-6", className)}>
      <div className="flex items-center gap-2 sm:gap-3">
        {Icon && (
          <div className="bg-slate-800 p-2.5 sm:p-3 rounded-lg border border-slate-700 flex-shrink-0">
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-green-400" />
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
