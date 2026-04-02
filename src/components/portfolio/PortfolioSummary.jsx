'use client';

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Percent } from "lucide-react";

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

export default function PortfolioSummary({ totals, portfolioYield, positionCount }) {
  const metrics = [
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
      description: "Avg",
      highlight: false
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
      {metrics.map((metric) => (
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
  );
}
