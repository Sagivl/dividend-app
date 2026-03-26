
import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";

// Chart info tooltip component - supports both hover (desktop) and click (mobile)
const ChartInfoTooltip = ({ title, explanation }) => {
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (newOpen) => {
    // Only use Radix's open/close for hover-capable devices (desktop)
    // On touch devices, we control state via onClick only to avoid double-toggle
    if (window.matchMedia('(hover: hover)').matches) {
      setOpen(newOpen);
    }
  };

  return (
    <div className="flex items-center">
      <span className="truncate">{title}</span>
      <TooltipProvider>
        <Tooltip delayDuration={100} open={open} onOpenChange={handleOpenChange}>
          <TooltipTrigger asChild>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen((prev) => !prev);
              }}
              className="inline-flex items-center justify-center ml-2 p-0.5 rounded-full hover:bg-slate-600/50 transition-colors touch-manipulation"
              style={{ minWidth: '24px', minHeight: '24px' }}
            >
              <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 cursor-help" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="max-w-xs text-sm p-3 bg-slate-700 border border-slate-600 shadow-md rounded-md z-50 text-slate-200"
            onPointerDownOutside={() => setOpen(false)}
            sideOffset={5}
            collisionPadding={10}
          >
            <p>{explanation}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const FinancialCharts = ({ stock, chartType = "all" }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  // Check if stock has EPS history data
  const hasEPSHistory = useMemo(() => {
    return stock && Array.isArray(stock.eps_history) && stock.eps_history.length > 0;
  }, [stock?.eps_history]);

  // Check if stock has EPS surprise data
  const hasEPSSurpriseHistory = useMemo(() => {
    return stock && Array.isArray(stock.eps_surprise_history) && stock.eps_surprise_history.length > 0;
  }, [stock?.eps_surprise_history]);

  // Prepare EPS history data for line chart (last 7 quarters)
  const epsData = useMemo(() => {
    if (!hasEPSHistory) return [];
    
    return stock.eps_history
      .sort((a, b) => {
        // Sort by year first, then by quarter
        if (a.year !== b.year) return a.year - b.year;
        return (a.quarter || 0) - (b.quarter || 0);
      })
      .slice(-7) // Show only last 7 quarters
      .map(item => ({
        period: item.period || item.year.toString(),
        eps: parseFloat(item.eps) || 0
      }));
  }, [stock?.eps_history, hasEPSHistory]);

  // Prepare EPS surprise data for scatter chart
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
      .slice(-7) // Show only last 7 quarters like the reference image
      .map((item, index) => {
        const actual = parseFloat(item.actual_eps) || 0;
        const expected = parseFloat(item.expected_eps) || 0;
        const surprise = actual - expected;
        const beat = actual >= expected;
        const surprisePercent = expected !== 0 ? ((actual - expected) / Math.abs(expected)) * 100 : 0;
        
        // Convert period format to match reference (Q2 2024 -> Q2 FY24)
        const [quarter, year] = item.period_label.split(' ');
        const fyYear = year ? `FY${year.slice(-2)}` : '';
        const formattedPeriod = `${quarter} ${fyYear}`;
        
        return {
          index: index,
          period: item.period_label,
          displayPeriod: formattedPeriod,
          actual: actual,
          expected: expected,
          surprise: surprise,
          surprisePercent: surprisePercent,
          beat: beat,
          shortPeriod: item.period_label.replace(/\s+/g, '\n')
        };
      });
  }, [stock?.eps_surprise_history, hasEPSSurpriseHistory]);

  // Get latest values for the legend
  const latestData = useMemo(() => {
    if (epsSurpriseData.length === 0) return { estimated: null, actual: null };
    const latest = epsSurpriseData[epsSurpriseData.length - 1];
    return {
      estimated: latest.expected,
      actual: latest.actual,
      beat: latest.beat,
      surprise: latest.surprise,
      surprisePercent: latest.surprisePercent
    };
  }, [epsSurpriseData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      
      return (
        <div className="bg-slate-700 border border-slate-500 rounded-lg p-4 shadow-xl z-50 min-w-[200px]">
          <p className="text-slate-100 font-semibold text-base mb-3">{data?.period || label}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-300/70"></div>
                <span className="text-slate-200 text-sm">Estimated:</span>
              </div>
              <span className="font-medium text-slate-100">${data?.expected?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-slate-200 text-sm">Actual:</span>
              </div>
              <span className="font-medium text-slate-100">${data?.actual?.toFixed(2)}</span>
            </div>
          </div>
          {data && typeof data.surprise === 'number' && (
            <div className="mt-3 pt-3 border-t border-slate-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data.beat ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-sm font-bold ${data.beat ? 'text-green-400' : 'text-red-400'}`}>
                    {data.beat ? 'Beat' : 'Missed'}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${data.beat ? 'text-green-400' : 'text-red-400'}`}>
                    {data.beat ? '+' : '-'}${Math.abs(data.surprise).toFixed(2)}
                  </span>
                  <span className={`text-xs ml-1 ${data.beat ? 'text-green-400/70' : 'text-red-400/70'}`}>
                    ({data.beat ? '+' : ''}{data.surprisePercent?.toFixed(1)}%)
                  </span>
                </div>
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

    if (!dataPoint) return null;
    const [quarter, year] = dataPoint.period.split(' ');
    const fyYear = year ? `FY${year.slice(-2)}` : '';

    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill="#64748B" 
          fontSize={isMobile ? 10 : 12} 
          fontWeight="500"
        >
          {quarter}
        </text>
        <text 
          x={0} 
          y={14} 
          dy={16} 
          textAnchor="middle" 
          fill="#64748B" 
          fontSize={isMobile ? 10 : 12}
        >
          {fyYear}
        </text>
      </g>
    );
  };

  // Custom Legend Component
  const CustomLegend = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4 sm:gap-8 mt-4 px-2">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-300/80"></div>
        <div>
          <span className="text-slate-400 text-sm font-medium">Estimated</span>
          {latestData.estimated !== null && (
            <span className="text-slate-300 text-sm ml-2">${latestData.estimated?.toFixed(2)} per share</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
        <div>
          <span className="text-slate-400 text-sm font-medium">Actual</span>
          {latestData.actual !== null && (
            <span className="text-slate-300 text-sm ml-2">${latestData.actual?.toFixed(2)} per share</span>
          )}
        </div>
      </div>
    </div>
  );

  // EPS Surprise Chart Component
  const EPSSurpriseChart = () => (
    <Card className="bg-slate-800 border border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl font-bold text-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <ChartInfoTooltip 
            title={`${stock?.ticker || stock?.name || 'Stock'} Earnings`}
            explanation="This chart shows quarterly earnings per share (EPS) performance comparing actual reported earnings against analyst expectations. Green indicates the company beat expectations, while red indicates a miss."
          />
          {hasEPSSurpriseHistory && (
            <div className="flex gap-2 text-xs sm:text-sm">
              <Badge variant="outline" className="bg-green-900/20 text-green-300 border-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Beat: {epsSurpriseData.filter(d => d.beat).length}
              </Badge>
              <Badge variant="outline" className="bg-red-900/20 text-red-300 border-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Missed: {epsSurpriseData.filter(d => !d.beat).length}
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {hasEPSSurpriseHistory ? (
          <>
            <div className="h-[18rem] sm:h-[20rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={epsSurpriseData} 
                  margin={{ 
                    top: 20, 
                    right: 30, 
                    left: 10, 
                    bottom: isMobile ? 50 : 60 
                  }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#374151" 
                    opacity={0.2} 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="period" 
                    tick={<CustomizedAxisTick />}
                    axisLine={false}
                    tickLine={false}
                    height={50}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: '#64748B', fontSize: isMobile ? 11 : 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    domain={['auto', 'auto']}
                    width={55}
                  />
                  <RechartsTooltip 
                    content={<CustomTooltip />} 
                    cursor={{ stroke: '#475569', strokeDasharray: '3 3' }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Line 
                    type="linear"
                    dataKey="expected" 
                    name="Estimated"
                    stroke="#86EFAC"
                    strokeWidth={0}
                    dot={{ fill: '#86EFAC', r: isMobile ? 8 : 10, strokeWidth: 0, fillOpacity: 0.7 }}
                    activeDot={{ r: isMobile ? 10 : 12, fill: '#86EFAC', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={true}
                  />
                  <Line 
                    type="linear"
                    dataKey="actual" 
                    name="Actual"
                    stroke="#22C55E"
                    strokeWidth={0}
                    dot={{ fill: '#22C55E', r: isMobile ? 8 : 10, strokeWidth: 0 }}
                    activeDot={{ r: isMobile ? 10 : 12, fill: '#22C55E', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <CustomLegend />
            
            {/* Beat/Miss Summary Table */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {epsSurpriseData.map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-2 rounded-lg text-center ${
                    item.beat 
                      ? 'bg-green-900/20 border border-green-700/30' 
                      : 'bg-red-900/20 border border-red-700/30'
                  }`}
                >
                  <div className="text-[10px] sm:text-xs text-slate-400 mb-1">{item.displayPeriod}</div>
                  <div className="flex items-center justify-center gap-1">
                    {item.beat ? (
                      <CheckCircle className="h-3 w-3 text-green-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs font-semibold ${item.beat ? 'text-green-400' : 'text-red-400'}`}>
                      {item.beat ? 'Beat' : 'Miss'}
                    </span>
                  </div>
                  <div className={`text-[10px] ${item.beat ? 'text-green-400/70' : 'text-red-400/70'}`}>
                    {item.beat ? '+' : ''}{item.surprisePercent?.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </>
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

  // Get latest EPS for legend
  const latestEps = useMemo(() => {
    if (epsData.length === 0) return null;
    return epsData[epsData.length - 1];
  }, [epsData]);

  // Check if we have eToro EPS data (current values, not history)
  const hasEtoroEPS = stock?.eps !== null && stock?.eps !== undefined;

  // EPS Summary Card Component (when no history available but has current EPS)
  const EPSSummaryCard = () => {
    const eps = stock?.eps;
    const epsDiluted = stock?.eps_diluted;
    const epsGrowth1Y = stock?.eps_growth_1y;
    const epsGrowth5Y = stock?.eps_growth_5y;
    const quarterlyEstimate = stock?.quarterly_eps_estimate;
    const nextEarningEstimate = stock?.next_earning_estimate;
    const earningsGrowth = stock?.earnings_growth;
    const nextEarningsDate = stock?.next_earnings_date;

    return (
      <Card className="bg-slate-800 border border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl font-bold text-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <ChartInfoTooltip 
              title={`${stock?.ticker || stock?.name || 'Stock'} Earnings`}
              explanation="Earnings Per Share (EPS) indicates company profitability per outstanding share. Higher EPS suggests stronger profitability."
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Current EPS */}
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-slate-400 text-xs sm:text-sm mb-1">EPS (TTM)</div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
                ${typeof eps === 'number' ? eps.toFixed(2) : (parseFloat(eps) ? parseFloat(eps).toFixed(2) : 'N/A')}
              </div>
              <div className="text-slate-500 text-xs mt-1">per share</div>
            </div>

            {/* Diluted EPS */}
            {epsDiluted && (
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-xs sm:text-sm mb-1">EPS Diluted</div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-300">
                  ${typeof epsDiluted === 'number' ? epsDiluted.toFixed(2) : parseFloat(epsDiluted).toFixed(2)}
                </div>
                <div className="text-slate-500 text-xs mt-1">per share</div>
              </div>
            )}

            {/* EPS Growth 1Y */}
            {epsGrowth1Y !== null && epsGrowth1Y !== undefined && (
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-xs sm:text-sm mb-1">EPS Growth (1Y)</div>
                <div className={`text-2xl sm:text-3xl font-bold ${parseFloat(epsGrowth1Y) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(epsGrowth1Y) >= 0 ? '+' : ''}{parseFloat(epsGrowth1Y).toFixed(1)}%
                </div>
              </div>
            )}

            {/* EPS Growth 5Y */}
            {epsGrowth5Y !== null && epsGrowth5Y !== undefined && (
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-xs sm:text-sm mb-1">EPS Growth (5Y)</div>
                <div className={`text-2xl sm:text-3xl font-bold ${parseFloat(epsGrowth5Y) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(epsGrowth5Y) >= 0 ? '+' : ''}{parseFloat(epsGrowth5Y).toFixed(1)}%
                </div>
              </div>
            )}

            {/* Earnings Growth */}
            {earningsGrowth !== null && earningsGrowth !== undefined && !epsGrowth1Y && (
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-xs sm:text-sm mb-1">Earnings Growth</div>
                <div className={`text-2xl sm:text-3xl font-bold ${parseFloat(earningsGrowth) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(earningsGrowth) >= 0 ? '+' : ''}{parseFloat(earningsGrowth).toFixed(1)}%
                </div>
              </div>
            )}

            {/* Next Quarter Estimate */}
            {nextEarningEstimate && (
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-xs sm:text-sm mb-1">Next Q Estimate</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-400">
                  ${parseFloat(nextEarningEstimate).toFixed(2)}
                </div>
                <div className="text-slate-500 text-xs mt-1">consensus</div>
              </div>
            )}

            {/* Quarterly Estimate */}
            {quarterlyEstimate && !nextEarningEstimate && (
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-xs sm:text-sm mb-1">Q Estimate</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-400">
                  ${parseFloat(quarterlyEstimate).toFixed(2)}
                </div>
              </div>
            )}

            {/* Next Earnings Date */}
            {nextEarningsDate && (
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-xs sm:text-sm mb-1">Next Earnings</div>
                <div className="text-lg sm:text-xl font-bold text-slate-200">
                  {new Date(nextEarningsDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  {new Date(nextEarningsDate).getFullYear()}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 p-3 bg-slate-700/30 rounded-lg">
            <p className="text-slate-400 text-xs sm:text-sm text-center">
              Historical EPS chart requires data not available for this stock.
              Try 'Fetch with AI' on the Stats tab for more detailed earnings data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Quarterly EPS Trend Chart Component
  const EPSLineChart = () => (
    <Card className="bg-slate-800 border border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl font-bold text-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <ChartInfoTooltip 
            title={`${stock?.ticker || stock?.name || 'Stock'} Earnings`}
            explanation="This chart shows quarterly earnings per share (EPS) trend. EPS indicates company profitability per outstanding share. Rising EPS suggests improving profitability."
          />
          {latestEps && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Latest: <span className="text-emerald-400 font-semibold">${latestEps.eps?.toFixed(2)}</span> ({latestEps.period})</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {hasEPSHistory ? (
          <>
            <div className="h-[18rem] sm:h-[20rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={epsData} margin={{ top: 20, right: 30, left: 10, bottom: isMobile ? 50 : 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fill: '#64748B', fontSize: isMobile ? 10 : 12 }}
                    axisLine={false}
                    tickLine={false}
                    height={50}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: '#64748B', fontSize: isMobile ? 11 : 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    width={55}
                  />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload;
                        return (
                          <div className="bg-slate-700 border border-slate-500 rounded-lg p-3 shadow-xl">
                            <p className="text-slate-100 font-semibold mb-2">{data?.period}</p>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                              <span className="text-slate-200 text-sm">EPS:</span>
                              <span className="font-medium text-emerald-400">${data?.eps?.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ stroke: '#475569', strokeDasharray: '3 3' }}
                  />
                  <Line 
                    type="linear"
                    dataKey="eps" 
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={{ fill: '#22C55E', r: isMobile ? 8 : 10, strokeWidth: 0 }}
                    activeDot={{ r: isMobile ? 10 : 12, fill: '#22C55E', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-3 mt-4 px-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-400 text-sm">Actual EPS per share</span>
            </div>
          </>
        ) : (
          <div className="h-[18rem] sm:h-[20rem] flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl sm:text-6xl text-slate-600 mb-4">📊</div>
              <p className="text-slate-400 text-sm sm:text-base mb-2">No EPS data available.</p>
              <p className="text-slate-500 text-xs sm:text-sm">
                EPS data may not be available for non-US stocks on the free plan.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Render based on chartType prop and data availability
  if (chartType === "eps_only") {
    // Prioritize surprise data if available, then history, then summary card
    if (hasEPSSurpriseHistory) {
      return <EPSSurpriseChart />;
    } else if (hasEPSHistory) {
      return <EPSLineChart />;
    } else if (hasEtoroEPS) {
      return <EPSSummaryCard />;
    } else {
      return <EPSLineChart />; // Will show "no data" message
    }
  }

  // For "all" chart type, show available charts
  return (
    <div className="space-y-6">
      {hasEPSSurpriseHistory && <EPSSurpriseChart />}
      {hasEPSHistory && !hasEPSSurpriseHistory && <EPSLineChart />}
      {!hasEPSSurpriseHistory && !hasEPSHistory && hasEtoroEPS && <EPSSummaryCard />}
      {!hasEPSSurpriseHistory && !hasEPSHistory && !hasEtoroEPS && <EPSLineChart />}
    </div>
  );
};

export default FinancialCharts;
