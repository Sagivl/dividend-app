'use client';

import React, { useState, useEffect } from 'react';
import GlobalSearchBar from '../components/etoro/GlobalSearchBar';
import EtoroAPITester from '../components/etoro/EtoroAPITester';
import { User } from '@/entities/User';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AccessDenied = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
    <Card className="max-w-md w-full bg-slate-800 border-red-700/50">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center">
          <ShieldAlert className="h-6 w-6 mr-3" />
          Access Denied
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-300">
          You do not have permission to view this page. This section is for administrators only.
        </p>
      </CardContent>
    </Card>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
    <Loader2 className="h-10 w-10 text-green-400 animate-spin" />
  </div>
);

export default function EtoroLabs() {
  const [accessState, setAccessState] = useState('loading'); // 'loading', 'allowed', 'denied'

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const currentUser = await User.me();
        if (currentUser && currentUser.role === 'admin') {
          setAccessState('allowed');
        } else {
          setAccessState('denied');
        }
      } catch (error) {
        setAccessState('denied');
      }
    };

    checkAdminAccess();
  }, []);

  if (accessState === 'loading') {
    return <LoadingSpinner />;
  }

  if (accessState === 'denied') {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 text-slate-200 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Search Section */}
        <div className="mb-6 sm:mb-8 max-w-xl mx-auto px-2 sm:px-0">
           <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4 text-center">eToro Instrument Search</h1>
           <GlobalSearchBar />
        </div>
        
        {/* API Tester Section */}
        <div className="border-t border-slate-700 pt-8">
          <EtoroAPITester />
        </div>
        
        {/* Placeholder for future components */}
        <div className="text-center text-slate-500 mt-10 border-t border-slate-700 pt-8">
            <p>Additional eToro components and tools will be added here in the future.</p>
        </div>
      </div>
    </div>
  );
}