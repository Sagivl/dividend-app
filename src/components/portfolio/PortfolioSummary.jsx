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
      description: `${positionCount} position${positionCount !== 1 ? 's' : ''}`
    },
    {
      label: "Annual Income",
      value: formatCurrency(totals.totalIncome),
      icon: TrendingUp,
      description: `${formatCurrency(totals.totalIncome / 12)}/month`
    },
    {
      label: "Portfolio Yield",
      value: formatPercent(portfolioYield),
      icon: Percent,
      description: "Weighted average"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <metric.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
