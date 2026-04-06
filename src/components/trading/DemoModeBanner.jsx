'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTradingEnvironment } from '@/functions/etoroTradingApi';
import { UserSettings } from '@/entities/UserSettings';

export default function DemoModeBanner({ className }) {
  const [env, setEnv] = useState(null);
  const [hasLocalKey, setHasLocalKey] = useState(false);

  useEffect(() => {
    const init = async () => {
      const connected = await UserSettings.isEtoroConnected();
      setHasLocalKey(connected);
    };
    init();
    getTradingEnvironment()
      .then(setEnv)
      .catch(() => {});
  }, []);

  const hasKey = hasLocalKey || (env?.hasUserKey);
  if (!env || !env.hasApiKey || !hasKey) return null;

  const isDemo = env.environment === 'demo';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium',
        isDemo
          ? 'bg-blue-500/8 text-blue-400/90 border border-blue-500/15'
          : 'bg-amber-500/8 text-amber-400/90 border border-amber-500/15',
        className
      )}
    >
      {isDemo ? (
        <>
          <Shield className="h-3 w-3 shrink-0" />
          <span>Demo mode</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Real mode</span>
        </>
      )}
    </div>
  );
}
