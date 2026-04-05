'use client';

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const COLORS = [
  '#3FB923', // Primary green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

export default function PortfolioAllocation({ positions, totalValue, onSelectPosition }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const chartData = useMemo(() => {
    if (!positions || positions.length === 0) return [];
    
    const byTicker = {};
    positions.forEach((pos) => {
      const key = pos.ticker;
      if (!byTicker[key]) {
        byTicker[key] = {
          ids: [pos.id],
          ticker: pos.ticker,
          name: pos.stock?.name || pos.ticker,
          value: pos.marketValue || 0,
          logo: pos.stock?.logo50x50,
        };
      } else {
        byTicker[key].value += pos.marketValue || 0;
        byTicker[key].ids.push(pos.id);
        if (!byTicker[key].logo && pos.stock?.logo50x50) {
          byTicker[key].logo = pos.stock.logo50x50;
        }
      }
    });

    return Object.values(byTicker)
      .map((item, index) => ({
        ...item,
        id: item.ids[0],
        percent: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions, totalValue]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[150px]">
          <div className="flex items-center gap-2 mb-2">
            {data.logo && (
              <img src={data.logo} alt={data.ticker} className="w-6 h-6 rounded" />
            )}
            <div>
              <div className="font-semibold">{data.ticker}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[120px]">{data.name}</div>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Value:</span>
              <span className="font-medium">{formatCurrency(data.value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allocation:</span>
              <span className="font-medium">{formatPercent(data.percent)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!positions || positions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">Portfolio Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Donut Chart */}
          <div className="w-full md:w-1/2 h-[200px] md:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(data) => onSelectPosition?.(data.id)}
                  style={{ cursor: onSelectPosition ? 'pointer' : 'default' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke={activeIndex === index ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{
                        filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="w-full md:w-1/2">
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {chartData.map((item, index) => (
                <button
                  key={item.id}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left",
                    activeIndex === index ? "bg-muted" : "hover:bg-muted/50",
                    onSelectPosition && "cursor-pointer"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => onSelectPosition?.(item.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-sm shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    {item.logo && (
                      <img src={item.logo} alt={item.ticker} className="w-5 h-5 rounded shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="font-medium text-sm">{item.ticker}</span>
                      <span className="text-xs text-muted-foreground ml-1.5 hidden sm:inline truncate">
                        {item.name.length > 15 ? item.name.slice(0, 15) + '...' : item.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-medium">{formatPercent(item.percent)}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(item.value)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
