'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info } from 'lucide-react';
import { PageContainer, PageHeader, LoadingState } from "@/components/layout";

export default function InstrumentPage() {
    const searchParams = useSearchParams();
    const [instrumentId, setInstrumentId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = searchParams?.get('id');
        setInstrumentId(id);
        setLoading(false);
    }, [searchParams]);

    if (loading) {
        return <LoadingState message="Loading instrument..." />;
    }

    return (
        <PageContainer maxWidth="4xl">
            <PageHeader
                title="eToro Instrument Details"
                icon={Info}
            />
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6">
                    {instrumentId ? (
                        <p className="text-slate-300">
                            Displaying data for Instrument ID: <span className="font-bold text-green-400">{instrumentId}</span>
                        </p>
                    ) : (
                        <p className="text-red-400">No Instrument ID provided in the URL.</p>
                    )}
                    <div className="text-center text-slate-500 mt-10">
                        <p>Additional details and components for this instrument will be implemented here.</p>
                    </div>
                </CardContent>
            </Card>
        </PageContainer>
    );
}