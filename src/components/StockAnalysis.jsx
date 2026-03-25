import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle, CheckCircle, Info, AlertCircle as LucideAlertCircle,
  TrendingUp, Clock, Scale
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import NewsSentiment from "./NewsSentiment";
import AnalystRecommendations from "./AnalystRecommendations";
import FinancialCharts from "./FinancialCharts";

// InfoTooltip component (reusable) - supports both hover (desktop) and click (mobile)
const InfoTooltip = ({ explanation }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100} open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            className="inline-flex items-center justify-center ml-1.5 p-1 rounded-full hover:bg-slate-600/50 transition-colors touch-manipulation"
            style={{ minWidth: '24px', minHeight: '24px' }}
          >
            <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 cursor-help" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs text-sm p-2.5 bg-slate-700 border border-slate-600 shadow-md rounded-md z-50 text-slate-200"
          onPointerDownOutside={() => setOpen(false)}
          sideOffset={5}
          collisionPadding={10}
        >
          <p>{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// New MarketCapDisplay component for consistent formatting and tooltip inclusion
const MarketCapDisplay = ({ value, className, currency = "USD", showTooltip = false }) => {
  if (value === null || value === undefined || value === "" || value === 0) {
    return (
      <span className={className}>
        N/A
        {showTooltip && (
          <InfoTooltip explanation="Total market value of a company's outstanding shares (Current Share Price x Total Shares Outstanding). Indicates company size." />
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
          <InfoTooltip explanation="Total market value of a company's outstanding shares (Current Share Price x Total Shares Outstanding). Indicates company size." />
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
    // Less than a million
    formattedValue = num.toLocaleString();
  }

  return (
    <span className={`inline-flex items-center ${className}`}>
      {currency === "USD" ? `$${formattedValue}` : formattedValue}
      {showTooltip && (
        <InfoTooltip explanation="Total market value of a company's outstanding shares (Current Share Price x Total Shares Outstanding). Indicates company size." />
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

// Placeholder for individual analysis cards if data is missing
const AnalysisCardPlaceholder = ({ cardTitle, missingFields }) => (
  <Card className="bg-slate-800 border border-slate-700">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg sm:text-xl font-bold text-slate-100">{cardTitle}</CardTitle>
    </CardHeader>
    <CardContent className="pt-2 sm:pt-4 text-center">
      <Info className="h-8 w-8 text-green-400 mx-auto mb-3" />
      <h4 className="text-md font-semibold mb-1 text-slate-200">Missing Data for {cardTitle}</h4>
      <p className="text-xs text-slate-400">
        Please provide the following on the "Stats" tab:
      </p>
      <ul className="text-xs text-slate-400 list-disc list-inside inline-block text-left mt-1">
        {missingFields.map(field => <li key={field}>{field}</li>)}
      </ul>
       <p className="text-2xs text-slate-500 mt-2">
        Use "Fetch with AI" on the "Stats" tab to try and populate these fields.
      </p>
    </CardContent>
  </Card>
);

const StockAnalysis = ({ stock }) => {
  // Helper function to check if a field has a valid value
  const hasValue = (field) => {
    if (!stock) return false;
    const value = stock[field];
    return value !== undefined && value !== null && value.toString().trim() !== "" && value.toString() !== "0";
  };

  // Clean the dividend growth data for display and calculations
  const cleanedDivGrowth5y = useMemo(() => {
    if (!stock) return null;
    const cleaned = cleanDividendGrowthData(stock.avg_div_growth_5y);
    return cleaned;
  }, [stock?.avg_div_growth_5y]);

  // Check what data we have for Price Analysis
  const hasPriceAnalysisData = useMemo(() => {
    if (!stock) return false;
    const hasPrice = hasValue('price');
    const hasMin = hasValue('min_52w');
    const hasMax = hasValue('max_52w');
    return hasPrice && hasMin && hasMax;
  }, [stock?.price, stock?.min_52w, stock?.max_52w]);

  // Check what data we have for Dividend Analysis
  const hasDividendAnalysisData = useMemo(() => {
    if (!stock) return false;
    const hasYield = hasValue('dividend_yield');
    const hasGrowth = cleanedDivGrowth5y !== null;
    const hasPayout = hasValue('payout_ratio');
    return hasYield && hasGrowth && hasPayout;
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

  const isGoodChowder = useMemo(() => chowderNumber !== null ? chowderNumber > 10.5 : null, [chowderNumber]);
  const getChowderColorClass = useMemo(() => isGoodChowder === null ? "text-amber-400" : (isGoodChowder ? "text-green-400" : "text-red-400"), [isGoodChowder]);

  const isGoodROE = useMemo(() => {
    if (!stock) return null;
    return hasValue('roe') ? parseFloat(stock.roe) >= 15 : null;
  }, [stock?.roe]);
  
  const getROEColorClass = useMemo(() => isGoodROE === null ? "text-amber-400" : (isGoodROE ? "text-green-400" : "text-red-400"), [isGoodROE]);

  const debtToEquityRatio = useMemo(() => {
    if (!stock) return null;
    if (hasValue('total_debt') && hasValue('shareholder_equity')) {
      const totalDebt = parseFloat(stock.total_debt);
      const shareholderEquity = parseFloat(stock.shareholder_equity);

      if (isNaN(totalDebt) || isNaN(shareholderEquity)) {
        return null;
      }

      if (shareholderEquity <= 0) {
        return "N/A";
      }

      const ratio = totalDebt / shareholderEquity;

      if (ratio > 999) {
        return "999+";
      }

      return ratio.toFixed(2);
    }
    return null;
  }, [stock?.total_debt, stock?.shareholder_equity]);

  const getDebtToEquityColorClass = useMemo(() => {
    if (debtToEquityRatio === null || debtToEquityRatio === "N/A" || debtToEquityRatio === "999+") {
      return "text-amber-400";
    }

    const ratio = parseFloat(debtToEquityRatio);
    if (isNaN(ratio)) return "text-amber-400";

    if (ratio < 0.5) return "text-green-400";
    if (ratio < 1) return "text-lime-400";
    if (ratio < 2) return "text-yellow-400";
    return "text-red-400";
  }, [debtToEquityRatio]);

  // Check for new data availability
  const hasNewsSentimentData = useMemo(() => {
    return stock && stock.news_sentiment && typeof stock.news_sentiment === 'object' &&
           (stock.news_sentiment.overall_label || stock.news_sentiment.summary || (Array.isArray(stock.news_sentiment.articles) && stock.news_sentiment.articles.length > 0));
  }, [stock?.news_sentiment]);

  const hasAnalystRecommendationData = useMemo(() => {
    return stock && stock.analyst_recommendation && typeof stock.analyst_recommendation === 'object' &&
           (stock.analyst_recommendation.overall_rating || typeof stock.analyst_recommendation.target_price_average === 'number' || typeof stock.analyst_recommendation.number_of_analysts === 'number' || stock.analyst_recommendation.recommendation_summary);
  }, [stock?.analyst_recommendation]);

  // Ensure stock is provided and has a ticker for unique identification
  if (!stock || !stock.ticker || stock.ticker.trim() === "") {
     return (
      <Card className="mt-4 sm:mt-6 bg-slate-800 border border-slate-700">
        <CardContent className="p-4 sm:p-8 text-center">
          <Info className="h-12 w-12 sm:h-16 sm:w-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-slate-100">No Stock Selected</h3>
          <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto">
            Please search for a stock to view its analysis.
            {stock && (!stock.ticker || stock.ticker.trim() === "") && (
              <span className="block mt-2 text-red-300">Invalid stock entry: Ticker information is missing or incomplete for proper identification.</span>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-4 sm:mt-6 lg:grid-cols-2">
        {/* First column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Price Analysis Card */}
          {hasPriceAnalysisData ? (
            <Card className="bg-slate-800 border border-slate-700">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-100">Price Analysis</CardTitle>
                {hasValue('ticker') && (
                  <div className="text-xs sm:text-sm text-slate-300 flex flex-col sm:flex-row sm:items-center mt-1 sm:mt-2 space-y-1 sm:space-y-0">
                    <div className="flex items-center">
                      <span className="font-semibold text-slate-100">{stock.ticker.toUpperCase()}</span>
                      {hasValue('exchange') && (
                        <span className="ml-1 text-slate-400">({stock.exchange})</span>
                      )}
                    </div>
                    {hasValue('name') && (
                      <span className="sm:ml-2 text-slate-300 font-normal line-clamp-1 break-words">
                        {stock.name}
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-2 sm:pt-4">
                <div className="bg-slate-700/50 p-3 sm:p-4 rounded-lg">
                  <div className="flex justify-between items-end mb-3 sm:mb-4">
                    <div className="text-left flex-1">
                      <div className="text-xs text-slate-400 flex items-center mb-1">
                        52-Wk Low
                        <InfoTooltip explanation="The lowest price the stock has traded at over the past 52 weeks." />
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-slate-200">
                        {stock.min_52w ? `$${parseFloat(stock.min_52w).toFixed(2)}` : "N/A"}
                      </div>
                    </div>
                    <div className="text-center flex-1 px-2">
                      <div className="text-xs sm:text-sm text-slate-300 flex items-center justify-center mb-1">
                        Current Price
                        <InfoTooltip explanation="The most recent trading price of the stock." />
                      </div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">
                        {stock.price ? `$${parseFloat(stock.price).toFixed(2)}` : "N/A"}
                      </div>
                    </div>
                    <div className="text-right flex-1">
                      <div className="text-xs text-slate-400 flex items-center justify-end mb-1">
                        52-Wk High
                        <InfoTooltip explanation="The highest price the stock has traded at over the past 52 weeks." />
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-slate-200">
                        {stock.max_52w ? `$${parseFloat(stock.max_52w).toFixed(2)}` : "N/A"}
                      </div>
                    </div>
                  </div>
                  {stock.price && stock.min_52w && stock.max_52w &&
                   !isNaN(parseFloat(stock.price)) && !isNaN(parseFloat(stock.min_52w)) && !isNaN(parseFloat(stock.max_52w)) &&
                   (parseFloat(stock.max_52w) - parseFloat(stock.min_52w)) > 0 && (
                    (() => {
                      const currentPrice = parseFloat(stock.price);
                      const fiftyTwoWkLow = parseFloat(stock.min_52w);
                      const fiftyTwoWkHigh = parseFloat(stock.max_52w);

                      let effectiveMin = fiftyTwoWkLow;
                      let effectiveMax = fiftyTwoWkHigh;

                      if (currentPrice < effectiveMin) {
                        effectiveMin = currentPrice;
                      }
                      if (currentPrice > effectiveMax) {
                        effectiveMax = currentPrice;
                      }

                      const range = effectiveMax - effectiveMin;
                      const positionPercentage = (range > 0) ? ((currentPrice - effectiveMin) / range) * 100 : 0;

                      return (
                        <div className="mt-3 relative">
                          <div className="h-2 sm:h-3 bg-slate-600 rounded-full">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.max(0, Math.min(100, positionPercentage))}%`
                              }}
                            />
                          </div>
                          <div
                            className="absolute top-1/2 h-3 w-3 sm:h-4 sm:w-4 bg-green-500 rounded-full border-2 border-slate-800 shadow-md transform -translate-y-1/2 transition-all duration-300"
                            style={{
                              left: `${Math.max(0, Math.min(100, positionPercentage))}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          />
                        </div>
                      );
                    })()
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <AnalysisCardPlaceholder
              cardTitle="Price Analysis"
              missingFields={["Current Price", "52-Wk Low", "52-Wk High"]}
            />
          )}

          {/* Dividend Analysis Card */}
          {hasDividendAnalysisData ? (
            <Card className="bg-slate-800 border border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-100">Dividend Analysis</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 sm:pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-slate-300 flex items-center">
                      Dividend Yield <InfoTooltip explanation="Annual dividend per share divided by the stock's current price, expressed as a percentage. Indicates the return from dividends relative to price." />
                    </div>
                    <div className="text-xl font-bold text-green-400 mt-1">
                      {stock.dividend_yield ? `${parseFloat(stock.dividend_yield).toFixed(2)}%` : "N/A"}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-slate-300 flex items-center">
                      5Y Growth Rate <InfoTooltip explanation="The average annual growth rate of the company's dividend payments over the past 5 years." />
                    </div>
                    <div className="text-xl font-bold text-green-400 mt-1">
                      {cleanedDivGrowth5y !== null ? `${cleanedDivGrowth5y.toFixed(1)}%` : "N/A"}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-slate-300 flex items-center">
                      Chowder Number <InfoTooltip explanation="Calculated as Dividend Yield + 5-Year Dividend Growth Rate. A score above 10.5 is often considered good for dividend growth investors." />
                    </div>
                    <div className="flex flex-col">
                      <div className={`text-xl font-bold ${getChowderColorClass} flex items-center mt-1`}>
                        {chowderNumber ? chowderNumber.toFixed(1) : "N/A"}
                        {isGoodChowder !== null && <span className="ml-2">{isGoodChowder ? <CheckCircle className="h-5 w-5 text-green-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}</span>}
                      </div>
                      {isGoodChowder !== null && (
                        <Badge variant="outline" className={`mt-1 ${isGoodChowder ? "bg-green-900/50 text-green-300 border-green-700" : "bg-red-900/50 text-red-300 border-red-700"} inline-flex w-fit`}>
                          {isGoodChowder ? "Good" : "Below Target"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-slate-300 flex items-center">
                      Payout Ratio <InfoTooltip explanation="The percentage of a company's earnings paid out as dividends. A lower ratio (e.g., below 60-70%) may indicate more sustainable dividends and room for growth." />
                    </div>
                    <div className="text-xl font-bold text-purple-400 mt-1">
                      {stock.payout_ratio ? `${parseFloat(stock.payout_ratio).toFixed(1)}%` : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-700">
                  <h4 className="text-md font-semibold text-slate-100 mb-3 flex items-center">
                    Dividend Payout History
                    <InfoTooltip explanation="Information about the company's dividend payment consistency and growth." />
                  </h4>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="mb-3">
                      <div className="flex items-center text-sm font-medium text-slate-200 mb-1.5">
                        <Clock className="h-4 w-4 mr-1.5 text-green-400" />
                        <span className="font-semibold">Dividend frequency:</span>
                      </div>
                      <p className="text-sm text-slate-300 ml-6">
                        {hasValue('div_distribution_sequence') ?
                          `${stock.div_distribution_sequence}` :
                          "Distribution pattern not available."}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center text-sm font-medium text-slate-200 mb-1.5">
                        <TrendingUp className="h-4 w-4 mr-1.5 text-green-400" />
                        <span className="font-semibold">Dividend growth:</span>
                      </div>
                      <p className="text-sm text-slate-300 ml-6">
                        {hasValue('dividend_years') ?
                          `${stock.dividend_years} consecutive years of dividend increases` +
                          (cleanedDivGrowth5y !== null ? ` with ~${cleanedDivGrowth5y.toFixed(1)}% average annual growth (5yr).` : ".") :
                          "Growth history not available."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AnalysisCardPlaceholder
              cardTitle="Dividend Analysis"
              missingFields={["Dividend Yield", "5Y Growth Rate", "Payout Ratio"]}
            />
          )}

          {/* News Sentiment */}
          {hasNewsSentimentData && <NewsSentiment stock={stock} />}
        </div>

        {/* Second column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Financial Strength Card */}
          <Card className="bg-slate-800 border border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-100">Financial Strength</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    ROE 
                    <InfoTooltip explanation="Return on Equity. Measures a company's profitability by revealing how much profit a company generates with the money shareholders have invested (Net Income / Shareholder's Equity). A value of 15% or higher is generally considered good." />
                  </div>
                  <div className="flex flex-col">
                    <div className={`text-xl font-bold ${getROEColorClass} flex items-center mt-1`}>
                      {hasValue('roe') ? `${parseFloat(stock.roe).toFixed(1)}%` : "N/A"}
                      {hasValue('roe') && isGoodROE !== null && <span className="ml-2">{isGoodROE ? <CheckCircle className="h-5 w-5 text-green-400" /> : <LucideAlertCircle className="h-5 w-5 text-red-400" />}</span>}
                    </div>
                    {hasValue('roe') && isGoodROE !== null && (
                      <Badge variant="outline" className={`mt-1 ${isGoodROE ? "bg-green-900/50 text-green-300 border-green-700" : "bg-red-900/50 text-red-300 border-red-700"} inline-flex w-fit`}>
                        {isGoodROE ? "Good" : "Below Target"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    Beta 
                    <InfoTooltip explanation="A measure of a stock's volatility in relation to the overall market (usually S&P 500). Beta < 1 means less volatile than market; Beta > 1 means more volatile." />
                  </div>
                  <div className="text-xl font-bold text-slate-200 mt-1">
                    {hasValue('beta') ? parseFloat(stock.beta).toFixed(2) : "N/A"}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    Credit Rating <InfoTooltip explanation="An assessment of a company's creditworthiness by rating agencies (e.g., S&P, Moody's). Higher ratings (e.g., AAA, AA) indicate lower risk of default." />
                  </div>
                  <div className="text-xl font-bold text-slate-200 mt-1 break-words">
                    {hasValue('credit_rating') ? stock.credit_rating : "N/A"}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    Market Cap
                    <InfoTooltip explanation="Total market value of a company's outstanding shares (Current Share Price x Total Shares Outstanding). Indicates company size." />
                  </div>
                  <div className="text-xl font-bold text-green-400 mt-1">
                    <MarketCapDisplay
                      value={stock.market_cap ? stock.market_cap * 1_000_000 : null}
                      className="text-xl font-bold text-green-400"
                      currency="USD"
                      showTooltip={false}
                    />
                  </div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    Debt/Equity <Scale className="h-4 w-4 text-slate-400 ml-1 mr-0.5"/> Ratio
                    <InfoTooltip explanation="Total Debt / Shareholder Equity. A measure of financial leverage. Lower is generally better. Acceptable levels vary by industry." />
                  </div>
                  <div className={`text-xl font-bold ${getDebtToEquityColorClass} mt-1 flex items-center`}>
                    {debtToEquityRatio !== null ? debtToEquityRatio : "N/A"}
                    {debtToEquityRatio !== null && debtToEquityRatio !== "N/A" && debtToEquityRatio !== "999+" && parseFloat(debtToEquityRatio) < 0.5 && <CheckCircle className="h-5 w-5 text-green-400 ml-2" />}
                    {debtToEquityRatio !== null && debtToEquityRatio !== "N/A" && debtToEquityRatio !== "999+" && parseFloat(debtToEquityRatio) >= 2 && <AlertTriangle className="h-5 w-5 text-red-400 ml-2" />}
                    {debtToEquityRatio === "N/A" && <AlertTriangle className="h-5 w-5 text-amber-400 ml-2" />}
                  </div>
                  {debtToEquityRatio === "N/A" && (
                    <div className="text-xs text-amber-400 mt-1">
                      Invalid equity value
                    </div>
                  )}
                  {debtToEquityRatio === "999+" && (
                    <div className="text-xs text-red-400 mt-1">
                      Extremely high leverage
                    </div>
                  )}
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    EBT
                    <InfoTooltip explanation="Earnings Before Tax. Represents a company's profit before deducting corporate income tax expenses." />
                  </div>
                  <div className="text-xl font-bold text-green-400 mt-1">
                    <MarketCapDisplay
                        value={stock.ebt ? parseFloat(stock.ebt) * 1000000 : null}
                        className="text-xl font-bold text-green-400"
                        showTooltip={false}
                    />
                  </div>
                </div>
              </div>
              {missingFinancialStrengthFields.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-slate-400">
                  <p>
                    <LucideAlertCircle className="h-3.5 w-3.5 inline-block mr-1 text-amber-500 align-text-bottom" />
                    For a complete Financial Strength assessment, please provide: {missingFinancialStrengthFields.join(', ')} on the "Stats" tab.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* P/E Analysis Card */}
          <Card className="bg-slate-800 border border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-100">P/E Analysis</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    P/E Ratio 
                    <InfoTooltip explanation="Price-to-Earnings ratio (Current Share Price / Earnings Per Share). Indicates how much investors are willing to pay per dollar of earnings." />
                  </div>
                  <div className="text-xl font-bold text-green-400 mt-1">
                    {hasValue('pe_ratio') ? parseFloat(stock.pe_ratio).toFixed(2) : "N/A"}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-slate-300">
                      {hasValue('sector') && stock.sector ? `${stock.sector} Sector P/E` : "Sector P/E"}
                    </span>
                    <InfoTooltip explanation="The average P/E ratio for companies in the same industry sector." />
                  </div>
                  <div className="text-xl font-bold text-slate-200 mt-1">
                    {hasValue('sector_pe') ? parseFloat(stock.sector_pe).toFixed(2) : "N/A"}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-slate-300 flex items-center">
                    EPS 
                    <InfoTooltip explanation="Earnings Per Share (Net Income - Preferred Dividends / Average Outstanding Shares)." />
                  </div>
                  <div className="text-xl font-bold text-green-400 mt-1">
                    {hasValue('eps') ? `$${parseFloat(stock.eps).toFixed(2)}` : "N/A"}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                   <div className="text-sm font-medium text-slate-300 flex items-center">
                    S&P 500 P/E <InfoTooltip explanation="The average P/E ratio of the S&P 500 index." />
                  </div>
                  <div className="text-xl font-bold text-slate-200 mt-1">
                    {hasValue('sp500_pe') ? parseFloat(stock.sp500_pe).toFixed(2) : "N/A"}
                  </div>
                </div>
              </div>
              {missingPEFields.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-slate-400">
                  <p>
                    <LucideAlertCircle className="h-3.5 w-3.5 inline-block mr-1 text-amber-500 align-text-bottom" />
                    For a complete P/E Analysis, please provide: {missingPEFields.join(', ')} on the "Stats" tab.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analyst Recommendations */}
          {hasAnalystRecommendationData && <AnalystRecommendations stock={stock} />}
        </div>
      </div>

      {/* EPS Trend Chart - Full Width Below Main Grid */}
      <FinancialCharts stock={stock} chartType="eps_only" />
    </div>
  );
};

export default StockAnalysis;