'use client';

import dynamic from 'next/dynamic';

const Portfolio = dynamic(() => import('@/views/Portfolio'), { ssr: false });

export default function PortfolioPage() {
  return <Portfolio />;
}
