'use client';

import React from "react";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Search, ArrowRight, TrendingUp, Wallet, BarChart2 } from "lucide-react";
import { PageContainer } from "@/components/layout";

export default function HomePage() {
  return (
    <PageContainer className="flex flex-col items-center justify-center">
      <header className="text-center mb-8 sm:mb-12 pt-6">
        <div className="inline-flex items-center justify-center bg-slate-800 p-4 rounded-full border border-slate-700 shadow-lg mb-6">
          <TrendingUp className="h-12 w-12 sm:h-16 sm:w-16 text-green-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
          Welcome to Dividend Analyzer
        </h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto px-4">
          Your comprehensive tool for discovering, analyzing, and tracking dividend-paying stocks. Make informed investment decisions with powerful data insights.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl w-full px-2">
        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center mb-3">
              <div className="bg-slate-700 p-2 rounded-lg mr-3">
                <Search className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-100">Analyze Stocks</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Search and analyze any dividend stock. Get AI-powered insights, key metrics, and comprehensive financial data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={createPageUrl("Dashboard")}>
              <Button className="w-full bg-[#3FB923] hover:bg-green-600 text-white text-base py-3">
                Search Stocks
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center mb-3">
              <div className="bg-slate-700 p-2 rounded-lg mr-3">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-100">Watchlist</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              View your curated watchlist of dividend stocks filtered by ROE, Chowder Number, and other key metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={createPageUrl("SuggestedStocks")}>
              <Button className="w-full bg-[#3FB923] hover:bg-green-600 text-white text-base py-3">
                View Watchlist
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center mb-3">
              <div className="bg-slate-700 p-2 rounded-lg mr-3">
                <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-100">Portfolio</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Track your holdings, view dividend income projections, and monitor your portfolio performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={createPageUrl("Portfolio")}>
              <Button className="w-full bg-[#3FB923] hover:bg-green-600 text-white text-base py-3">
                View Portfolio
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center mb-3">
              <div className="bg-slate-700 p-2 rounded-lg mr-3">
                <BarChart2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-100">Compare</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Compare multiple dividend stocks side-by-side with AI-powered analysis and recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={createPageUrl("CompareStocks")}>
              <Button className="w-full bg-[#3FB923] hover:bg-green-600 text-white text-base py-3">
                Compare Stocks
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-12 sm:mt-16 text-center text-slate-500 text-sm pb-6">
        <p>&copy; {new Date().getFullYear()} Dividend Analyzer. All Rights Reserved.</p>
        <p className="mt-1">
          <Link href={createPageUrl("Dashboard")} className="hover:text-green-400 transition-colors">Dashboard</Link> | 
          Data provided for informational purposes only.
        </p>
      </footer>
    </PageContainer>
  );
}
