'use client';

import dynamic from 'next/dynamic';

const CompareStocks = dynamic(() => import('@/views/CompareStocks'), { ssr: false });

export default function CompareStocksPage() {
  return <CompareStocks />;
}
