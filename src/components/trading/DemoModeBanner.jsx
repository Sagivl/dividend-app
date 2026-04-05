'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTradingEnvironment } from '@/functions/etoroTradingApi';

export default function DemoModeBanner({ className }) {
  const [env, setEnv] = useState(null);

  useEffect(() => {
    getTradingEnvironment()
      .then(setEnv)
      .catch(() => {});
  }, []);

  if (!env || !env.hasApiKey || !env.hasUserKey) return null;

  const isDemo = env.environment === 'demo';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium',
        isDemo
          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        className
      )}
    >
      {isDemo ? (
        <>
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>You are connected to eToro in <strong>Demo</strong> mode — trades won't affect your real account.</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>You are connected to eToro in <strong>Real</strong> mode — trades will use real funds.</span>
        </>
      )}
    </div>
  );
}
