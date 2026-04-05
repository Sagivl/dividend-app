'use client';

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function PortfolioSummary({ totals, portfolioYield, positionCount, availableCash, onFilterChange }) {
  const { totalValue, totalIncome, totalCost, totalPnL } = totals;
  const hasCostData = totalCost > 0;
  const pnlPercent = hasCostData ? (totalPnL / totalCost) * 100 : 0;
  const isPnlPositive = totalPnL >= 0;

  const metrics = [
    availableCash !== null && availableCash !== undefined && {
      label: "Available Cash",
      value: formatCurrency(availableCash),
      icon: Wallet,
      description: "eToro balance",
      filterTarget: 'etoro',
    },
    {
      label: "Total Value",
      value: formatCurrency(totalValue),
      icon: DollarSign,
      description: `${positionCount} position${positionCount !== 1 ? 's' : ''}`,
      filterTarget: 'all',
    },
    {
      label: "Annual Income",
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      description: `${formatCurrency(totalIncome / 12)}/mo`,
      highlight: true,
      filterTarget: 'dividend',
    },
    {
      label: "Yield",
      value: formatPercent(portfolioYield),
      icon: Percent,
      description: "Portfolio avg",
      filterTarget: 'high-yield',
    },
  ].filter(Boolean);

  const handleCardClick = (filterTarget) => {
    if (onFilterChange && filterTarget) {
      onFilterChange(filterTarget);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
      <div className={`grid gap-2 sm:gap-4 ${
        metrics.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
      }`}>
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className={cn(
              "bg-card/50 transition-all",
              onFilterChange && metric.filterTarget && "cursor-pointer hover:bg-card/70 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
            )}
            onClick={() => handleCardClick(metric.filterTarget)}
          >
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

      {hasCostData && (
        <Card
          className={cn(
            `bg-card/50 border-l-4 ${isPnlPositive ? 'border-l-green-500' : 'border-l-red-500'}`,
            onFilterChange && "cursor-pointer hover:bg-card/70 hover:shadow-md active:scale-[0.995] transition-all"
          )}
          onClick={() => handleCardClick(isPnlPositive ? 'gainers' : 'losers')}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-0.5">Unrealized P/L</p>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className={`text-sm sm:text-xl font-bold ${isPnlPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPnlPositive ? '+' : ''}{formatCompactCurrency(totalPnL)}
                  </p>
                  <span className={`text-xs sm:text-sm font-medium px-1.5 py-0.5 rounded ${
                    isPnlPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {isPnlPositive ? '+' : ''}{pnlPercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  Cost basis: {formatCompactCurrency(totalCost)}
                </p>
              </div>
              <div className={`hidden sm:flex items-center justify-center w-10 h-10 rounded-full ${
                isPnlPositive ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {isPnlPositive ? (
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
