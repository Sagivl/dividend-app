'use client';

import React from "react";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Search, ArrowRight, TrendingUp } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-50 flex flex-col items-center justify-center p-6">
      <header className="text-center mb-12">
        <div className="inline-flex items-center justify-center bg-white p-4 rounded-full shadow-lg mb-6">
          <TrendingUp className="h-16 w-16 text-blue-600" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-4">
          Welcome to Dividend Analyzer
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your comprehensive tool for discovering, analyzing, and tracking dividend-paying stocks. Make informed investment decisions with powerful data insights.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center mb-3">
              <Award className="h-8 w-8 text-yellow-500 mr-3" />
              <CardTitle className="text-2xl font-semibold text-gray-800">Suggested Stocks</CardTitle>
            </div>
            <CardDescription className="text-gray-600">
              Explore a curated list of dividend-paying stocks based on key financial metrics like ROE and Chowder Number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={createPageUrl("SuggestedStocks")}>
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white text-base py-3">
                View Dividend Picks
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center mb-3">
              <Search className="h-8 w-8 text-indigo-500 mr-3" />
              <CardTitle className="text-2xl font-semibold text-gray-800">Analyze & Search</CardTitle>
            </div>
            <CardDescription className="text-gray-600">
              Dive deep into specific stocks. Search by ticker or company name and let our AI fetch comprehensive financial data for analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={createPageUrl("Dashboard")}>
              <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-base py-3">
                Search Stocks
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Dividend Analyzer. All data is for informational purposes only.</p>
      </footer>
    </div>
  );
}