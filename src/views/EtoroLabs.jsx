'use client';

import React, { useState, useEffect } from 'react';
import GlobalSearchBar from '../components/etoro/GlobalSearchBar';
import EtoroAPITester from '../components/etoro/EtoroAPITester';
import { User } from '@/entities/User';
import { ShieldAlert, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer, PageHeader, LoadingState } from "@/components/layout";

const AccessDenied = () => (
  <PageContainer>
    <div className="flex items-center justify-center min-h-[50vh]">
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
  </PageContainer>
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
    return <LoadingState message="Checking access..." />;
  }

  if (accessState === 'denied') {
    return <AccessDenied />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="eToro Labs"
        description="Admin tools and API testing"
        icon={FlaskConical}
      />
      
      <div className="space-y-8">
        {/* Search Section */}
        <div className="max-w-xl mx-auto">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-4 text-center">Instrument Search</h2>
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
    </PageContainer>
  );
}