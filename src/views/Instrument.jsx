'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

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
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-green-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 p-3 sm:p-6">
            <div className="max-w-4xl mx-auto">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-2xl text-slate-100">eToro Instrument Details</CardTitle>
                    </CardHeader>
                    <CardContent>
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
            </div>
        </div>
    );
}