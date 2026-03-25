'use client';

import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/views/Dashboard'), { ssr: false });

export default function HomePage() {
  return <Dashboard />;
}
