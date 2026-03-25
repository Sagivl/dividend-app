'use client';

import dynamic from 'next/dynamic';

const EtoroLabs = dynamic(() => import('@/views/EtoroLabs'), { ssr: false });

export default function EtoroLabsPage() {
  return <EtoroLabs />;
}
