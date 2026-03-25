'use client';

import dynamic from 'next/dynamic';

const HomePage = dynamic(() => import('@/views/HomePage'), { ssr: false });

export default function HomePageRoute() {
  return <HomePage />;
}
