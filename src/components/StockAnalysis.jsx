import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Info, ChevronDown, CalendarClock, TrendingUp, Repeat, CalendarCheck,
} from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import NewsSentiment from "./NewsSentiment";
import AnalystRecommendations from "./AnalystRecommendations";
import FinancialCharts from "./FinancialCharts";
import { getMetricHealth, healthTextClass, metricGlossary } from "@/config/metricHealthConfig";

const formatDividendDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const cleanDate = dateStr.split('T')[0];
    const date = new Date(cleanDate + 'T12:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const parseDividendDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const cleanDate = dateStr.split('T')[0];
    const date = new Date(cleanDate + 'T12:00:00');
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const getFrequencyMonths = (sequence) => {
  if (!sequence) return null;
  const s = sequence.toLowerCase();
  if (s.includes('month')) return 1;
  if (s.includes('quarter')) return 3;
  if (s.includes('semi')) return 6;
  if (s.includes('annual') || s.includes('year')) return 12;
  return null;
};

const getNextDividendDates = (exDateStr, payDateStr, sequence) => {
  const payDate = parseDividendDate(payDateStr);
  const exDate = parseDividendDate(exDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!payDate || payDate >= today) {
    return { exDate: exDateStr, payDate: payDateStr, isEstimated: false };
  }

  const months = getFrequencyMonths(sequence);
  if (!months) {
    return { exDate: exDateStr, payDate: payDateStr, isEstimated: false };
  }

  let nextPay = new Date(payDate);
  let nextEx = exDate ? new Date(exDate) : null;
  while (nextPay < today) {
    nextPay.setMonth(nextPay.getMonth() + months);
    if (nextEx) nextEx.setMonth(nextEx.getMonth() + months);
  }

  const toIso = (d) => d.toISOString().split('T')[0];
  return {
    exDate: nextEx ? toIso(nextEx) : exDateStr,
    payDate: toIso(nextPay),
    isEstimated: true,
  };
};

// MarketCapDisplay component for consistent formatting and tooltip inclusion
const MarketCapDisplay = ({ value, className, currency = "USD", showTooltip = false }) => {
  if (value === null || value === undefined || value === "" || value === 0) {
    return (
      <span className={className}>
        N/A
        {showTooltip && (
          <InfoTooltip explanation={metricGlossary.market_cap.long} />
        )}
      </span>
    );
  }

  let num;
  if (typeof value === 'string') {
    num = parseFloat(value.replace(/,/g, ''));
  } else {
    num = parseFloat(value);
  }

  if (isNaN(num)) {
    return (
      <span className={className}>
        N/A
        {showTooltip && (
          <InfoTooltip explanation={metricGlossary.market_cap.long} />
        )}
      </span>
    );
  }

  let formattedValue;
  if (Math.abs(num) >= 1.0e+12) { // Trillions
    formattedValue = `${(num / 1.0e+12).toFixed(2)}T`;
  } else if (Math.abs(num) >= 1.0e+9) { // Billions
    formattedValue = `${(num / 1.0e+9).toFixed(1)}B`;
  } else if (Math.abs(num) >= 1.0e+6) { // Millions
    formattedValue = `${(num / 1.0e+6).toFixed(0)}M`;
  } else {
    formattedValue = num.toLocaleString();
  }

  return (
    <span className={`inline-flex items-center ${className}`}>
      {currency === "USD" ? `$${formattedValue}` : formattedValue}
      {showTooltip && (
        <InfoTooltip explanation={metricGlossary.market_cap.long} />
      )}
    </span>
  );
};

// Data cleaning helper for dividend growth
const cleanDividendGrowthData = (rawGrowth) => {
  if (rawGrowth === undefined || rawGrowth === null || rawGrowth.toString().trim() === "") return null;

  let growth = parseFloat(rawGrowth);
  if (isNaN(growth)) return null;

  // If it's stored as basis points or whole number instead of percentage
  if (growth > 100) {
    growth = growth / 100;
  }

  return growth;
};

// Enhanced Chowder calculation with data cleaning
const calculateCorrectChowder = (dividendYield, divGrowth5y) => {
  const dy = parseFloat(dividendYield);
  const cleanedGrowth = cleanDividendGrowthData(divGrowth5y);

  if (isNaN(dy) || cleanedGrowth === null) return null;

  return dy + cleanedGrowth;
};

const AnalysisCardPlaceholder = ({ cardTitle }) => (
  <Card className="bg-slate-800/60 border border-slate-700/50">
    <CardContent className="py-6 text-center">
      <Info className="h-6 w-6 text-slate-500 mx-auto mb-2" />
      <p className="text-sm text-slate-400">
        {cardTitle} data unavailable — add it on the <span className="text-green-400">Stats</span> tab.
      </p>
    </CardContent>
  </Card>
);

const CollapsibleCard = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card className="bg-slate-800/60 border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/20 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-100">{title}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <CardContent className="pt-0 pb-3 px-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
};

const StockAnalysis = ({ stock }) => {

  const hasValue = (field) => {
    if (!stock) return false;
    const value = stock[field];
    if (value === undefined || value === null) return false;
    const s = String(value).trim();
    return s !== '' && s !== '0';
  };

  // Clean the dividend growth data for display and calculations
  const cleanedDivGrowth5y = useMemo(() => {
    if (!stock) return null;
    const cleaned = cleanDividendGrowthData(stock.avg_div_growth_5y);
    return cleaned;
  }, [stock?.avg_div_growth_5y]);

  // Show price card whenever we have a price; 52w range can be N/A (eToro sometimes omits it).
  const hasPriceAnalysisData = useMemo(() => {
    if (!stock) return false;
    return hasValue('price');
  }, [stock?.price]);

  // Show dividend card if any core dividend metric exists (do not require all three).
  const hasDividendAnalysisData = useMemo(() => {
    if (!stock) return false;
    return (
      hasValue('dividend_yield') ||
      cleanedDivGrowth5y !== null ||
      hasValue('payout_ratio')
    );
  }, [stock?.dividend_yield, stock?.payout_ratio, cleanedDivGrowth5y]);

  const missingFinancialStrengthFields = useMemo(() => {
    if (!stock) return [];
    const missing = [];
    if (!hasValue('roe')) missing.push('ROE');
    if (!hasValue('beta')) missing.push('Beta');
    if (!hasValue('market_cap')) missing.push('Market Cap');
    if (!hasValue('total_debt')) missing.push('Total Debt');
    if (!hasValue('shareholder_equity')) missing.push('Shareholder Equity');
    if (!hasValue('ebt')) missing.push('EBT');
    return missing;
  }, [stock?.roe, stock?.beta, stock?.market_cap, stock?.total_debt, stock?.shareholder_equity, stock?.ebt]);

  const missingPEFields = useMemo(() => {
    if (!stock) return [];
    const missing = [];
    if (!hasValue('pe_ratio')) missing.push('P/E Ratio');
    if (!hasValue('eps')) missing.push('EPS');
    if (!hasValue('sector_pe')) missing.push('Sector P/E');
    if (!hasValue('sp500_pe')) missing.push('S&P 500 P/E');
    return missing;
  }, [stock?.pe_ratio, stock?.eps, stock?.sector_pe, stock?.sp500_pe]);

  const chowderNumber = useMemo(() => {
    if (!stock) return null;
    const chowder = calculateCorrectChowder(stock.dividend_yield, stock.avg_div_growth_5y);
    return chowder;
  }, [stock?.dividend_yield, stock?.avg_div_growth_5y, cleanedDivGrowth5y]);

  const payoutRatioValue = useMemo(() => stock?.payout_ratio ? parseFloat(stock.payout_ratio) : null, [stock?.payout_ratio]);

  const debtToEquityRatio = useMemo(() => {
    if (!stock) return null;
    if (hasValue('total_debt') && hasValue('shareholder_equity')) {
      const totalDebt = parseFloat(stock.total_debt);
      const shareholderEquity = parseFloat(stock.shareholder_equity);

      if (isNaN(totalDebt) || isNaN(shareholderEquity)) return null;
      if (shareholderEquity <= 0) return "N/A";

      const ratio = totalDebt / shareholderEquity;
      if (ratio > 999) return "999+";

      return ratio.toFixed(2);
    }
    return null;
  }, [stock?.total_debt, stock?.shareholder_equity]);

  const chowderHealth = useMemo(() => getMetricHealth("chowder", chowderNumber), [chowderNumber]);
  const payoutHealth = useMemo(() => getMetricHealth("payout_ratio", payoutRatioValue), [payoutRatioValue]);
  const roeHealth = useMemo(() => getMetricHealth("roe", stock?.roe), [stock?.roe]);
  const debtHealth = useMemo(() => {
    if (debtToEquityRatio === null || debtToEquityRatio === "N/A" || debtToEquityRatio === "999+") return null;
    return getMetricHealth("debt_to_equity", debtToEquityRatio);
  }, [debtToEquityRatio]);
  const yieldHealth = useMemo(() => getMetricHealth("dividend_yield", stock?.dividend_yield), [stock?.dividend_yield]);
  const growthHealth = useMemo(() => getMetricHealth("avg_div_growth_5y", cleanedDivGrowth5y), [cleanedDivGrowth5y]);
  const peHealth = useMemo(() => getMetricHealth("pe_ratio", stock?.pe_ratio), [stock?.pe_ratio]);
  const betaHealth = useMemo(() => getMetricHealth("beta", stock?.beta), [stock?.beta]);

  // Check for new data availability
  const hasNewsSentimentData = useMemo(() => {
    return stock && stock.news_sentiment && typeof stock.news_sentiment === 'object' &&
           (stock.news_sentiment.overall_label || stock.news_sentiment.summary || (Array.isArray(stock.news_sentiment.articles) && stock.news_sentiment.articles.length > 0));
  }, [stock?.news_sentiment]);

  const hasAnalystRecommendationData = useMemo(() => {
    return stock && stock.analyst_recommendation && typeof stock.analyst_recommendation === 'object' &&
           (stock.analyst_recommendation.overall_rating || typeof stock.analyst_recommendation.target_price_average === 'number' || typeof stock.analyst_recommendation.number_of_analysts === 'number' || stock.analyst_recommendation.recommendation_summary);
  }, [stock?.analyst_recommendation]);

  if (!stock || !stock.ticker || String(stock.ticker).trim() === "") {
     return (
      <Card className="mt-4 bg-slate-800/60 border border-slate-700/50">
        <CardContent className="py-8 text-center">
          <Info className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1 text-slate-100">No Stock Selected</h3>
          <p className="text-sm text-slate-400">Search for a stock to view its analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* 52-Week Range — compact, progress-bar focused */}
      {hasPriceAnalysisData ? (
        <Card className="bg-slate-800/60 border border-slate-700/50">
          <CardContent className="py-3 px-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">52-Week Range</h3>
            {stock.price && stock.min_52w && stock.max_52w &&
             !isNaN(parseFloat(stock.price)) && !isNaN(parseFloat(stock.min_52w)) && !isNaN(parseFloat(stock.max_52w)) &&
             (parseFloat(stock.max_52w) - parseFloat(stock.min_52w)) > 0 ? (
              (() => {
                const currentPrice = parseFloat(stock.price);
                const low = parseFloat(stock.min_52w);
                const high = parseFloat(stock.max_52w);
                const effectiveMin = Math.min(low, currentPrice);
                const effectiveMax = Math.max(high, currentPrice);
                const range = effectiveMax - effectiveMin;
                const pct = range > 0 ? ((currentPrice - effectiveMin) / range) * 100 : 0;

                return (
                  <div>
                    <div className="relative mb-1.5">
                      <div className="h-2 bg-slate-700 rounded-full">
                        <div
                          className="h-full bg-green-500/80 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <div
                        className="absolute top-1/2 h-3.5 w-3.5 bg-green-400 rounded-full border-2 border-slate-800 shadow-sm transition-all duration-300"
                        style={{
                          left: `${Math.max(0, Math.min(100, pct))}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>${low.toFixed(2)}</span>
                      <span className="text-green-400 font-medium text-xs">${currentPrice.toFixed(2)}</span>
                      <span>${high.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Low: {stock.min_52w ? `$${parseFloat(stock.min_52w).toFixed(2)}` : "N/A"}</span>
                <span className="text-green-400 font-medium">${parseFloat(stock.price).toFixed(2)}</span>
                <span>High: {stock.max_52w ? `$${parseFloat(stock.max_52w).toFixed(2)}` : "N/A"}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <AnalysisCardPlaceholder cardTitle="Price" />
      )}

      {/* Dividend Analysis — metric grid without health badges */}
      {hasDividendAnalysisData ? (
        <Card className="bg-slate-800/60 border border-slate-700/50">
          <CardContent className="py-3 px-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Dividend Analysis</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
                <div className="text-[11px] text-slate-400">
                  Yield <InfoTooltip explanation={metricGlossary.dividend_yield.long} />
                </div>
                <div className={`text-lg font-bold ${yieldHealth ? healthTextClass(yieldHealth.color) : "text-slate-400"}`}>
                  {stock.dividend_yield ? `${parseFloat(stock.dividend_yield).toFixed(2)}%` : "N/A"}
                </div>
              </div>
              <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
                <div className="text-[11px] text-slate-400">
                  5Y Growth <InfoTooltip explanation={metricGlossary.avg_div_growth_5y.long} />
                </div>
                <div className={`text-lg font-bold ${growthHealth ? healthTextClass(growthHealth.color) : "text-slate-400"}`}>
                  {cleanedDivGrowth5y !== null ? `${cleanedDivGrowth5y.toFixed(1)}%` : "N/A"}
                </div>
              </div>
              <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
                <div className="text-[11px] text-slate-400">
                  Chowder <InfoTooltip explanation={metricGlossary.chowder.long} />
                </div>
                <div className={`text-lg font-bold ${chowderHealth ? healthTextClass(chowderHealth.color) : "text-amber-400"}`}>
                  {chowderNumber ? chowderNumber.toFixed(1) : "N/A"}
                </div>
              </div>
              <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
                <div className="text-[11px] text-slate-400">
                  Payout <InfoTooltip explanation={metricGlossary.payout_ratio.long} />
                </div>
                <div className={`text-lg font-bold ${payoutHealth ? healthTextClass(payoutHealth.color) : "text-slate-400"}`}>
                  {payoutRatioValue !== null ? `${payoutRatioValue.toFixed(1)}%` : "N/A"}
                </div>
              </div>
            </div>

            {/* Dividend schedule */}
            {(() => {
              const next = getNextDividendDates(stock.ex_date, stock.dividend_pay_date, stock.div_distribution_sequence);
              const hasAnyScheduleData = hasValue('div_distribution_sequence') || hasValue('dividend_years') || hasValue('ex_date') || hasValue('dividend_pay_date');
              if (!hasAnyScheduleData) return null;

              const items = [];
              if (hasValue('div_distribution_sequence')) {
                items.push({ icon: Repeat, label: "Frequency", value: stock.div_distribution_sequence });
              }
              if (hasValue('dividend_years')) {
                items.push({ icon: TrendingUp, label: "Streak", value: `${stock.dividend_years} yrs` });
              }
              if (hasValue('ex_date')) {
                items.push({
                  icon: CalendarClock,
                  label: "Ex-Date",
                  value: formatDividendDate(next.exDate),
                  estimated: next.isEstimated,
                });
              }
              if (hasValue('dividend_pay_date')) {
                items.push({
                  icon: CalendarCheck,
                  label: "Pay Date",
                  value: formatDividendDate(next.payDate),
                  estimated: next.isEstimated,
                });
              }

              return (
                <div className="mt-3 pt-3 border-t border-slate-700/40">
                  <div className={`grid gap-2 ${items.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                    {items.map(({ icon: Icon, label, value, estimated }) => (
                      <div key={label} className="flex items-center gap-2.5 bg-slate-700/25 rounded-lg px-3 py-2">
                        <div className="h-7 w-7 rounded-md bg-green-500/10 flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-500 leading-tight">{label}</div>
                          <div className="text-xs font-medium text-slate-200 truncate">
                            {value}
                            {estimated && <span className="text-amber-400 ml-0.5 font-normal">*</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {items.some(i => i.estimated) && (
                    <p className="text-[10px] text-slate-500 mt-1.5 text-right">* estimated</p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      ) : (
        <AnalysisCardPlaceholder cardTitle="Dividend" />
      )}

      {/* News Sentiment */}
      {hasNewsSentimentData && <NewsSentiment stock={stock} />}

      {/* Analyst Recommendations */}
      {hasAnalystRecommendationData && <AnalystRecommendations stock={stock} />}

      {/* Financial Strength — collapsible */}
      <CollapsibleCard title="Financial Strength">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">
              ROE <InfoTooltip explanation={metricGlossary.roe.long} />
            </div>
            <div className={`text-lg font-bold ${roeHealth ? healthTextClass(roeHealth.color) : "text-slate-400"}`}>
              {hasValue('roe') ? `${parseFloat(stock.roe).toFixed(1)}%` : "N/A"}
            </div>
          </div>
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">
              Beta <InfoTooltip explanation={metricGlossary.beta.long} />
            </div>
            <div className={`text-lg font-bold ${betaHealth ? healthTextClass(betaHealth.color) : "text-slate-200"}`}>
              {hasValue('beta') ? parseFloat(stock.beta).toFixed(2) : "N/A"}
            </div>
          </div>
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">Credit Rating</div>
            <div className="text-lg font-bold text-slate-200">
              {hasValue('credit_rating') ? stock.credit_rating : "N/A"}
            </div>
          </div>
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">Market Cap</div>
            <div className="text-lg font-bold text-green-400">
              <MarketCapDisplay
                value={stock.market_cap ? stock.market_cap * 1_000_000 : null}
                className="text-lg font-bold text-green-400"
                currency="USD"
                showTooltip={false}
              />
            </div>
          </div>
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">
              D/E Ratio <InfoTooltip explanation={metricGlossary.debt_to_equity.long} />
            </div>
            <div className={`text-lg font-bold ${debtHealth ? healthTextClass(debtHealth.color) : "text-amber-400"}`}>
              {debtToEquityRatio !== null ? debtToEquityRatio : "N/A"}
            </div>
          </div>
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">
              EBT <InfoTooltip explanation={metricGlossary.ebt.long} />
            </div>
            <div className="text-lg font-bold text-green-400">
              <MarketCapDisplay
                value={stock.ebt ? parseFloat(stock.ebt) * 1000000 : null}
                className="text-lg font-bold text-green-400"
                showTooltip={false}
              />
            </div>
          </div>
        </div>
        {missingFinancialStrengthFields.length > 0 && (
          <p className="mt-2 text-[11px] text-slate-500">
            Some data unavailable — add on <span className="text-green-400">Stats</span> tab
          </p>
        )}
      </CollapsibleCard>

      {/* P/E Analysis — collapsible */}
      <CollapsibleCard title="P/E Analysis">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">
              P/E Ratio <InfoTooltip explanation={metricGlossary.pe_ratio.long} />
            </div>
            <div className={`text-lg font-bold ${peHealth ? healthTextClass(peHealth.color) : "text-slate-400"}`}>
              {hasValue('pe_ratio') ? parseFloat(stock.pe_ratio).toFixed(2) : "N/A"}
            </div>
          </div>
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">
              {hasValue('sector') && stock.sector ? `${stock.sector} P/E` : "Sector P/E"}
            </div>
            <div className="text-lg font-bold text-slate-200">
              {hasValue('sector_pe') ? parseFloat(stock.sector_pe).toFixed(2) : "N/A"}
            </div>
          </div>
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">EPS</div>
            <div className="text-lg font-bold text-green-400">
              {hasValue('eps') ? `$${parseFloat(stock.eps).toFixed(2)}` : "N/A"}
            </div>
          </div>
          <div className="bg-slate-700/30 px-3 py-2 rounded-lg">
            <div className="text-[11px] text-slate-400">S&P 500 P/E</div>
            <div className="text-lg font-bold text-slate-200">
              {hasValue('sp500_pe') ? parseFloat(stock.sp500_pe).toFixed(2) : "N/A"}
            </div>
          </div>
        </div>
        {missingPEFields.length > 0 && (
          <p className="mt-2 text-[11px] text-slate-500">
            Some data unavailable — add on <span className="text-green-400">Stats</span> tab
          </p>
        )}
      </CollapsibleCard>

      {/* EPS Trend Chart */}
      <FinancialCharts stock={stock} chartType="eps_only" />
    </div>
  );
};

export default StockAnalysis;