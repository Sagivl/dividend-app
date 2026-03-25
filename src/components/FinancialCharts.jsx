
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip, // Renamed to avoid conflict with ui/tooltip
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

const FinancialCharts = ({ stock, chartType = "all" }) => {
  // Check if stock has EPS history data
  const hasEPSHistory = useMemo(() => {
    return stock && Array.isArray(stock.eps_history) && stock.eps_history.length > 0;
  }, [stock?.eps_history]);

  // Check if stock has EPS surprise data
  const hasEPSSurpriseHistory = useMemo(() => {
    return stock && Array.isArray(stock.eps_surprise_history) && stock.eps_surprise_history.length > 0;
  }, [stock?.eps_surprise_history]);

  // Prepare EPS history data for line chart
  const epsData = useMemo(() => {
    if (!hasEPSHistory) return [];
    
    return stock.eps_history
      .sort((a, b) => a.year - b.year)
      .map(item => ({
        year: item.year.toString(),
        eps: parseFloat(item.eps) || 0
      }));
  }, [stock?.eps_history, hasEPSHistory]);

  // Prepare EPS surprise data for bar chart
  const epsSurpriseData = useMemo(() => {
    if (!hasEPSSurpriseHistory) return [];
    
    return stock.eps_surprise_history
      .sort((a, b) => {
        // Sort by period (Q1 2023, Q2 2023, etc.)
        const aYear = parseInt(a.period_label.split(' ')[1]);
        const bYear = parseInt(b.period_label.split(' ')[1]);
        const aQuarter = parseInt(a.period_label.split('Q')[1]);
        const bQuarter = parseInt(b.period_label.split('Q')[1]);
        
        if (aYear !== bYear) return aYear - bYear;
        return aQuarter - bQuarter;
      })
      .map(item => {
        const actual = parseFloat(item.actual_eps) || 0;
        const expected = parseFloat(item.expected_eps) || 0;
        const surprise = actual - expected;
        const beat = actual > expected;
        
        return {
          period: item.period_label,
          actual: actual,
          expected: expected,
          surprise: surprise,
          beat: beat,
          shortPeriod: item.period_label.replace(/\s+/g, '\n') // For mobile display
        };
      });
  }, [stock?.eps_surprise_history, hasEPSSurpriseHistory]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      
      return (
        <div className="bg-slate-700 border border-slate-500 rounded-lg p-4 shadow-xl z-50 min-w-[180px]">
          <p className="text-slate-100 font-semibold text-base mb-3">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm mb-1 flex justify-between">
              <span className="text-slate-200">
                {entry.dataKey === 'expected' ? 'Expected EPS:' : 'Actual EPS:'}
              </span>
              <span className="font-medium text-slate-100 ml-2">
                ${entry.value.toFixed(2)}
              </span>
            </p>
          ))}
          {data && typeof data.surprise === 'number' && (
            <div className="mt-3 pt-2 border-t border-slate-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data.beat ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-sm font-semibold ${data.beat ? 'text-green-400' : 'text-red-400'}`}>
                    {data.beat ? 'Beat' : 'Missed'}
                  </span>
                </div>
                <span className={`text-sm font-bold ${data.beat ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.abs(data.surprise).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomizedAxisTick = ({ x, y, payload }) => {
    const dataPoint = epsSurpriseData.find(d => d.period === payload.value);
    const isMobile = window.innerWidth < 640;

    if (!dataPoint) return null;
    const [quarter, year] = dataPoint.period.split(' ');

    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill="#E2E8F0" 
          fontSize={isMobile ? 12 : 14} 
          fontWeight="500"
        >
          {quarter}
        </text>
        <text 
          x={0} 
          y={18} 
          dy={16} 
          textAnchor="middle" 
          fill="#94A3B8" 
          fontSize={isMobile ? 10 : 12}
        >
          {year}
        </text>
        <foreignObject 
          x={isMobile ? -22 : -28} 
          y={45} 
          width={isMobile ? 44 : 56} 
          height={24}
        >
          <div xmlns="http://www.w3.org/1999/xhtml" className="flex justify-center">
              <span className={`px-1.5 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${
                  dataPoint.beat
                    ? 'bg-green-900/50 text-green-300 border border-green-700/80'
                    : 'bg-red-900/50 text-red-300 border border-red-700/80'
                }`}
              >
                {dataPoint.beat ? 'Beat' : 'Miss'}
              </span>
          </div>
        </foreignObject>
      </g>
    );
  };

  // EPS Surprise Chart Component
  const EPSSurpriseChart = () => (
    <Card className="bg-slate-800 border border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl font-bold text-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center">
            <span className="truncate">{stock?.name || 'Stock'} Earnings</span>
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center ml-2 p-0.5 rounded-full hover:bg-slate-600/50 transition-colors"
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="max-w-xs text-sm p-3 bg-slate-700 border border-slate-600 shadow-md rounded-md z-50 text-slate-200"
                  sideOffset={5}
                  collisionPadding={10}
                >
                  <p>
                    This chart shows quarterly earnings per share (EPS) performance comparing actual reported earnings against analyst expectations. 
                    Green "Beat" indicates the company exceeded expectations, while red "Missed" shows underperformance.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {hasEPSSurpriseHistory && (
            <div className="flex gap-2 text-xs sm:text-sm">
              <Badge variant="outline" className="bg-green-900/20 text-green-300 border-green-600">
                Beat: {epsSurpriseData.filter(d => d.beat).length}
              </Badge>
              <Badge variant="outline" className="bg-red-900/20 text-red-300 border-red-600">
                Missed: {epsSurpriseData.filter(d => !d.beat).length}
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {hasEPSSurpriseHistory ? (
          <div className="h-[20rem] sm:h-[22rem] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={epsSurpriseData} 
                margin={{ 
                  top: 20, 
                  right: 20, 
                  left: 10, 
                  bottom: window.innerWidth < 640 ? 70 : 80 
                }}
                barCategoryGap={epsSurpriseData.length <= 3 ? "40%" : (window.innerWidth < 640 ? "20%" : "30%")}
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="period" 
                  tick={<CustomizedAxisTick />}
                  axisLine={false}
                  tickLine={false}
                  height={80}
                />
                <YAxis 
                  tick={{ fill: '#94A3B8', fontSize: window.innerWidth < 640 ? 11 : 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <RechartsTooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'transparent' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px', 
                    fontSize: window.innerWidth < 640 ? '12px' : '14px' 
                  }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="expected" 
                  name="Expected EPS"
                  fill="#64748B"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={epsSurpriseData.length <= 3 ? 60 : (window.innerWidth < 640 ? 25 : 35)}
                />
                <Bar 
                  dataKey="actual" 
                  name="Actual EPS"
                  fill="#22C55E"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={epsSurpriseData.length <= 3 ? 60 : (window.innerWidth < 640 ? 25 : 35)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[20rem] sm:h-[22rem] flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl sm:text-6xl text-slate-600 mb-4">📊</div>
              <p className="text-slate-400 text-sm sm:text-base mb-2">No EPS surprise data available.</p>
              <p className="text-slate-500 text-xs sm:text-sm">
                Use 'Fetch with AI' on the Stats tab to try and populate this data.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Annual EPS Trend Chart Component
  const EPSLineChart = () => (
    <Card className="bg-slate-800 border border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-slate-100 flex items-center">
          Annual EPS Trend
          <Info className="h-4 w-4 text-slate-400 ml-2" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {hasEPSHistory ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={epsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <RechartsTooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="eps" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="text-6xl text-slate-600 mb-3">$</div>
            <p className="text-sm text-slate-400">
              No annual EPS history data available. Use 'Fetch with AI' on the Stats tab to try and populate this data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Render based on chartType prop and data availability
  if (chartType === "eps_only") {
    // Prioritize quarterly data if available, otherwise show annual
    if (hasEPSSurpriseHistory) {
      return <EPSSurpriseChart />;
    } else if (hasEPSHistory) {
      return <EPSLineChart />;
    } else {
      return <EPSSurpriseChart />; // Will show "no data" message
    }
  }

  // For "all" chart type, show both charts if data is available
  return (
    <div className="space-y-6">
      {hasEPSSurpriseHistory && <EPSSurpriseChart />}
      {hasEPSHistory && <EPSLineChart />}
      {!hasEPSSurpriseHistory && !hasEPSHistory && <EPSSurpriseChart />}
    </div>
  );
};

export default FinancialCharts;
