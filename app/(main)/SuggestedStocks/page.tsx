'use client';

import dynamic from 'next/dynamic';

const SuggestedStocks = dynamic(() => import('@/views/SuggestedStocks'), { ssr: false });

export default function SuggestedStocksPage() {
  return <SuggestedStocks />;
}
