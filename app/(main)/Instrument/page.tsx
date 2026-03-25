'use client';

import dynamic from 'next/dynamic';

const Instrument = dynamic(() => import('@/views/Instrument'), { ssr: false });

export default function InstrumentPage() {
  return <Instrument />;
}
