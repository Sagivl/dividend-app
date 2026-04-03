'use client';

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatCompactCurrency(value) {
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: 'compact'
    }).format(value);
  }
  return formatCurrency(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

export default function PortfolioSummary({ totals, portfolioYield, positionCount }) {
  const gainLoss = totals.totalCost > 0 ? totals.totalValue - totals.totalCost : 0;
  const gainLossPercent = totals.totalCost > 0 ? (gainLoss / totals.totalCost) * 100 : 0;
  const isPositive = gainLoss >= 0;

  const primaryMetrics = [
    {
      label: "Total Value",
      value: formatCurrency(totals.totalValue),
      icon: DollarSign,
      description: `${positionCount} position${positionCount !== 1 ? 's' : ''}`,
      highlight: false
    },
    {
      label: "Annual Income",
      value: formatCurrency(totals.totalIncome),
      icon: TrendingUp,
      description: `${formatCurrency(totals.totalIncome / 12)}/mo`,
      highlight: true
    },
    {
      label: "Yield",
      value: formatPercent(portfolioYield),
      icon: Percent,
      description: "Portfolio avg",
      highlight: false
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
      {/* Primary Metrics Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {primaryMetrics.map((metric) => (
          <Card key={metric.label} className="bg-card/50">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 truncate">{metric.label}</p>
                  <p className={`text-base sm:text-2xl font-bold truncate ${metric.highlight ? 'text-green-500' : ''}`}>
                    {metric.value}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{metric.description}</p>
                </div>
                <div className="hidden sm:block p-2 rounded-lg bg-primary/10 ml-2 shrink-0">
                  <metric.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gain/Loss Card - Only shown when cost basis exists */}
      {totals.totalCost > 0 && (
        <Card className={`bg-card/50 border-l-4 ${isPositive ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-0.5">Unrealized P/L</p>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className={`text-sm sm:text-xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{formatCompactCurrency(gainLoss)}
                  </p>
                  <span className={`text-xs sm:text-sm font-medium px-1.5 py-0.5 rounded ${
                    isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  Cost basis: {formatCompactCurrency(totals.totalCost)}
                </p>
              </div>
              <div className={`hidden sm:flex items-center justify-center w-10 h-10 rounded-full ${
                isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {isPositive ? (
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
