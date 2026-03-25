'use client';

import React, { useState, useEffect } from "react";
import { Stock } from "@/entities/Stock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, BarChart2, Loader2, Info as InfoIcon, Check, ArrowLeft } from "lucide-react";
import { generateStockComparison, hasOpenAIKey } from "@/functions/aiAnalysis";
import StockSearch from "../components/StockSearch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MarketCapDisplay from "../components/MarketCapDisplay"; // New import for MarketCapDisplay

// MetricTooltip component definition (remains unchanged)
const MetricTooltip = ({ explanation }) => (
  <TooltipProvider>
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center ml-1.5 p-1 rounded-full hover:bg-slate-600/50 transition-colors touch-manipulation"
          style={{ minWidth: '24px', minHeight: '24px' }}
        >
          <InfoIcon className="h-4 w-4 text-slate-400 hover:text-slate-300" />
        </button>
      </TooltipTrigger>
      <TooltipContent 
        className="max-w-xs text-sm p-2.5 bg-slate-700 border border-slate-600 shadow-md rounded-md z-50 text-slate-200"
        sideOffset={5}
        collisionPadding={10}
      >
        <p>{explanation}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const metricExplanations = {
  dividend_yield: "Annual dividend per share divided by the stock's current price. Higher is generally better.",
  payout_ratio: "The percentage of earnings paid out as dividends. A lower ratio (e.g., < 70%) can indicate a more sustainable dividend. Values outside 0-100% may be warning signs.",
  avg_div_growth_5y: "The average annual growth rate of the dividend over the last 5 years. Higher is better for dividend growth investors.",
  chowder: "Dividend Yield + 5-Year Dividend Growth. A score above 10.5-12 is often considered attractive.",
  dividend_years: "The number of consecutive years the company has paid a dividend. A long history indicates reliability.",
  debt_to_equity: "Total Debt / Shareholder Equity. Measures a company's financial leverage. A lower ratio is generally safer.",
  five_year_total_return: "The total return of the stock over the past 5 years, including price appreciation and dividends. Higher is better.",
  dividend_stability_score: "A score indicating the historical stability of the dividend payments. Higher is better.",
  market_cap: "The total value of a company's outstanding shares. Generally, larger market caps indicate more stable, less volatile companies."
};

const metricsToDisplay = [
  { key: 'dividend_yield', label: 'Dividend Yield', format: 'percentage', preference: 'high' },
  { key: 'payout_ratio', label: 'Payout Ratio', format: 'percentage', preference: 'low' },
  { key: 'avg_div_growth_5y', label: '5-Year Dividend Growth', format: 'percentage', preference: 'high' },
  { key: 'chowder', label: 'Chowder Number', format: 'number', preference: 'high' },
  { key: 'dividend_years', label: 'Consecutive Dividend Years', format: 'years', preference: 'high' },
  { key: 'debt_to_equity', label: 'Debt-to-Equity Ratio', format: 'number', preference: 'low' },
  { key: 'five_year_total_return', label: '5-Year Total Return', format: 'percentage', preference: 'high' },
  { key: 'dividend_stability_score', label: 'Dividend Stability Score', format: 'number', preference: 'high' },
  // market_cap removed from this list as it will be a separate row
];

export default function CompareStocks() {
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [isGeneratingComparison, setIsGeneratingComparison] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to top when component mounts
    loadAvailableStocks();
  }, []);

  const loadAvailableStocks = async () => {
    try {
      const stocks = await Stock.list("-last_updated");
      // Remove duplicates by ticker and filter for dividend stocks
      const uniqueStocks = stocks.reduce((acc, stock) => {
        if (stock.dividend_yield && parseFloat(stock.dividend_yield) > 0) {
          const existingStock = acc.find(s => s.ticker?.toLowerCase() === stock.ticker?.toLowerCase());
          if (!existingStock) {
            acc.push(stock);
          }
        }
        return acc;
      }, []);
      setSearchResults(uniqueStocks);
    } catch (error) {
      console.error("Error loading stocks:", error);
    }
  };

  const addStock = (stock) => {
    if (selectedStocks.length >= 4) {
      alert("You can compare up to 4 stocks maximum.");
      return;
    }
    
    // Check for duplicates by ticker (case-insensitive)
    if (selectedStocks.find(s => s.ticker?.toLowerCase() === stock.ticker?.toLowerCase())) {
      alert("This stock is already selected.");
      return;
    }
    
    setSelectedStocks([...selectedStocks, stock]);
  };

  const removeStock = (stockId) => {
    setSelectedStocks(selectedStocks.filter(s => s.id !== stockId));
    setComparison(null); // Clear comparison when stocks change
  };

  const toggleStockSelection = (stock) => {
    const isSelected = isStockSelected(stock);
    
    if (isSelected) {
      // Remove from selected stocks
      setSelectedStocks(selectedStocks.filter(s => s.ticker?.toLowerCase() !== stock.ticker?.toLowerCase()));
      setComparison(null); // Clear comparison when stocks change
    } else {
      // Add to selected stocks
      addStock(stock);
    }
  };

  const isStockSelected = (stock) => {
    return selectedStocks.some(s => s.ticker?.toLowerCase() === stock.ticker?.toLowerCase());
  };

  const handleStockSearchSelection = async (ticker) => {
    // Find the stock in our search results or create a basic stock object
    let stockToAdd = searchResults.find(s => s.ticker?.toLowerCase() === ticker.toLowerCase());
    
    if (!stockToAdd) {
      // If not found in search results, try to find it in all stocks
      try {
        setIsLoading(true);
        const allStocks = await Stock.list();
        stockToAdd = allStocks.find(s => s.ticker?.toLowerCase() === ticker.toLowerCase());
      } catch (error) {
        console.error("Error finding stock:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Ensure the stock is a dividend stock before adding
    if (stockToAdd && stockToAdd.dividend_yield && parseFloat(stockToAdd.dividend_yield) > 0) {
      addStock(stockToAdd);
    } else {
      alert("Stock not found or is not a dividend stock (yield > 0%). Please select a dividend stock from your analyzed stocks or analyze it first in the Dashboard.");
    }
  };

  const calculateDebtToEquity = (stock) => {
    if (!stock.total_debt || !stock.shareholder_equity || stock.shareholder_equity === 0) {
      return null;
    }
    return (stock.total_debt / stock.shareholder_equity).toFixed(2);
  };

  const calculateChowder = (stock) => {
    if (stock.dividend_yield === null || stock.dividend_yield === undefined ||
        stock.avg_div_growth_5y === null || stock.avg_div_growth_5y === undefined) {
      return null;
    }
    const yieldNum = parseFloat(stock.dividend_yield);
    const growthNum = parseFloat(stock.avg_div_growth_5y);
    if (isNaN(yieldNum) || isNaN(growthNum)) {
        return null;
    }
    return (yieldNum + growthNum).toFixed(1);
  };

  const generateComparison = async () => {
    if (selectedStocks.length < 2) {
      alert("Please select at least 2 stocks to compare.");
      return;
    }

    setIsGeneratingComparison(true);
    try {
      const stockData = selectedStocks.map(stock => {
        const debtToEquity = calculateDebtToEquity(stock);
        const chowder = calculateChowder(stock);
        
        return {
          ticker: stock.ticker,
          name: stock.name || stock.ticker,
          dividend_yield: stock.dividend_yield,
          payout_ratio: stock.payout_ratio,
          avg_div_growth_5y: stock.avg_div_growth_5y,
          dividend_years: stock.dividend_years,
          debt_to_equity: debtToEquity,
          chowder: chowder,
          five_year_total_return: stock.five_year_total_return,
          dividend_stability_score: stock.dividend_stability_score,
          sector: stock.sector,
          price: stock.price,
          market_cap: stock.market_cap,
          pe_ratio: stock.pe_ratio,
          roe: stock.roe,
          beta: stock.beta
        };
      });

      console.log("Generating comparison for stocks:", stockData.map(s => s.ticker));

      const prompt = `Analyze and compare these ${selectedStocks.length} dividend stocks for investment attractiveness:

${stockData.map(stock => `
Stock: ${stock.ticker} (${stock.name})
- Dividend Yield: ${stock.dividend_yield ? stock.dividend_yield + '%' : 'N/A'}
- Payout Ratio: ${stock.payout_ratio ? stock.payout_ratio + '%' : 'N/A'}
- 5-Year Dividend Growth: ${stock.avg_div_growth_5y ? stock.avg_div_growth_5y + '%' : 'N/A'}
- Chowder Number: ${stock.chowder || 'N/A'}
- Consecutive Dividend Years: ${stock.dividend_years || 'N/A'}
- Debt-to-Equity Ratio: ${stock.debt_to_equity || 'N/A'}
- 5-Year Total Return: ${stock.five_year_total_return ? stock.five_year_total_return + '%' : 'N/A'}
- P/E Ratio: ${stock.pe_ratio || 'N/A'}
- ROE: ${stock.roe ? stock.roe + '%' : 'N/A'}
- Beta: ${stock.beta || 'N/A'}
- Dividend Stability Score: ${stock.dividend_stability_score || 'N/A'}
- Sector: ${stock.sector || 'N/A'}
- Current Price: ${stock.price ? '$' + stock.price : 'N/A'}
- Market Cap: ${stock.market_cap ? stock.market_cap + 'M' : 'N/A'}
`).join('\n')}

Please provide a comprehensive comparison analysis with:

1. Overall ranking from best to worst for dividend investing (rank 1 = best)
2. For each stock, provide specific strengths and weaknesses 
3. Risk assessment for each stock (Low, Medium, or High risk)
4. Your top recommendation with detailed reasoning
5. Key decision factors that influenced your ranking

Focus on dividend sustainability, growth potential, financial strength, and overall investment quality for dividend investors.`;

      console.log("Sending to AI Analysis:", prompt.substring(0, 500) + "...");

      const responseSchema = {
        type: "object",
        properties: {
          ranking: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ticker: { type: "string" },
                rank: { type: "number" },
                score: { type: "number" },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                risk_level: { type: "string", enum: ["Low", "Medium", "High"] }
              },
              required: ["ticker", "rank", "strengths", "weaknesses", "risk_level"]
            }
          },
          recommendation: {
            type: "object",
            properties: {
              top_pick: { type: "string" },
              reasoning: { type: "string" },
              key_factors: { type: "array", items: { type: "string" } }
            },
            required: ["top_pick", "reasoning"]
          },
          summary: { type: "string" }
        },
        required: ["ranking", "recommendation", "summary"]
      };

      const response = await generateStockComparison(selectedStocks, prompt, responseSchema);

      console.log("AI Analysis response received:", response);
      setComparison(response);
      
    } catch (error) {
      console.error("Error generating comparison:", error);
      
      let errorMessage = "Error generating comparison. Please try again.";
      
      if (error.message?.includes('quota') || error.message?.includes('RateLimitError')) {
        errorMessage = "Could not generate comparison. You may have exceeded your API quota. Please check your plan and billing details.";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please try again with fewer stocks or simpler analysis.";
      } else if (error.message?.includes('500')) {
        errorMessage = "AI service temporarily unavailable. Please try again in a few moments.";
      } else if (error.response?.status === 429) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      }
      
      alert(errorMessage);
    } finally {
      setIsGeneratingComparison(false);
    }
  };

  const formatValue = (value, type = 'number') => {
    if (value === null || value === undefined || value === '') return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${parseFloat(value).toFixed(2)}%`;
      case 'currency':
        return `$${parseFloat(value).toFixed(2)}`;
      case 'years':
        return `${value} years`;
      default:
        return value;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'bg-green-100 text-green-800 border-green-300';
      case 2: return 'bg-blue-100 text-blue-800 border-blue-300';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 4: return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const goBackToSelection = () => {
    setShowComparison(false);
    setComparison(null);
  };

  const handleProceedToComparisonView = () => {
    if (selectedStocks.length < 2) {
      alert("Please select at least 2 stocks to compare.");
      return;
    }
    setComparison(null); // Clear any previous comparison data
    setShowComparison(true);
  };

  const findBestMetric = (metricKey, preference = 'high') => {
    let bestValue = preference === 'high' ? -Infinity : Infinity;
    let winners = [];

    const getValue = (stock) => {
      let val;
      if (metricKey === 'chowder') val = calculateChowder(stock);
      else if (metricKey === 'debt_to_equity') val = calculateDebtToEquity(stock);
      // market_cap handling removed here as it's no longer part of metricsToDisplay
      else val = stock[metricKey];
      
      if (val === null || val === undefined || val === '') return null;
      return parseFloat(val);
    };

    // Special case for Payout Ratio to find the best sustainable value
    if (metricKey === 'payout_ratio') {
        let bestPayout = Infinity;
        selectedStocks.forEach(stock => {
            const value = getValue(stock);
            if (value !== null && value >= 0 && value <= 100) { // Only consider sensible payout ratios
                 if (value < bestPayout) {
                    bestPayout = value;
                    winners = [stock.ticker];
                 } else if (value === bestPayout) {
                    winners.push(stock.ticker);
                 }
            }
        });
        return winners;
    }

    // Standard logic for other metrics
    selectedStocks.forEach(stock => {
      const value = getValue(stock);
      if (value !== null) {
        if (preference === 'high') {
          if (value > bestValue) {
            bestValue = value;
            winners = [stock.ticker];
          } else if (value === bestValue) {
            winners.push(stock.ticker);
          }
        } else { // preference is 'low'
          if (value < bestValue) {
            bestValue = value;
            winners = [stock.ticker];
          } else if (value === bestValue) {
            winners.push(stock.ticker);
          }
        }
      }
    });

    return winners;
  };

  // If showing comparison, render the comparison page
  if (showComparison) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              onClick={goBackToSelection}
              variant="outline"
              className="w-auto bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Selection</span>
            </Button>
          </div>

          {/* Comparison Table */}
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-slate-100 text-xl">Stock Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-300 min-w-[120px]">Metrics</th>
                      {selectedStocks.map(stock => (
                        <th key={stock.id} className="text-center p-3 text-slate-300 min-w-[120px]">
                          <div className="font-medium text-sm">{stock.ticker}</div>
                          <div className="text-xs text-slate-400 font-normal truncate max-w-[100px]">{stock.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricsToDisplay.map(({ key, label, format, preference }) => {
                      const winners = findBestMetric(key, preference);
                      return (
                        <tr key={key} className="border-b border-slate-700">
                          <td className="p-3 font-medium text-slate-300 min-w-[120px]">
                            <div className="flex items-start">
                              <span className="text-sm leading-tight">{label}</span>
                              <MetricTooltip explanation={metricExplanations[key]} />
                            </div>
                          </td>
                          {selectedStocks.map(stock => {
                            const isWinner = winners.includes(stock.ticker);
                            let value;

                            // Removed market_cap special handling here as it's now a separate row
                            if (key === 'chowder') value = calculateChowder(stock);
                            else if (key === 'debt_to_equity') value = calculateDebtToEquity(stock);
                            else value = stock[key];

                            return (
                              <td key={`${stock.id}-${key}`} className={`p-3 text-center transition-colors min-w-[120px] ${isWinner ? 'bg-green-900/40 text-green-300 font-semibold' : 'text-slate-200'}`}>
                                <span className="text-sm">{formatValue(value, format)}</span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* Market Cap Row */}
                    <tr className="border-t border-slate-700">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-slate-300">
                        Market Cap
                      </td>
                      {selectedStocks.map((stock, index) => (
                        <td key={`market-cap-${index}`} className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center">
                          <MarketCapDisplay 
                            value={stock.market_cap ? stock.market_cap * 1_000_000 : null}
                            showTooltip={false}
                            className="font-medium text-green-400"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Generate AI Analysis Button */}
          <div className="mb-6 text-center">
            <Button
              onClick={generateComparison}
              disabled={isGeneratingComparison || selectedStocks.length < 2}
              className="bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed px-8 py-3 text-lg"
            >
              {isGeneratingComparison ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating AI Analysis...
                </>
              ) : (
                <>
                  <BarChart2 className="mr-2 h-5 w-5" />
                  Generate AI Analysis
                </>
              )}
            </Button>
          </div>

          {/* AI Analysis Results */}
          {comparison && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">AI Analysis & Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                  <h3 className="font-semibold text-slate-100 mb-2">Summary</h3>
                  <p className="text-slate-300">{comparison.summary}</p>
                </div>

                {/* Ranking */}
                {comparison.ranking && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-100 mb-4">Stock Rankings</h3>
                    <div className="grid gap-4">
                      {comparison.ranking.map((stock, index) => (
                        <div key={stock.ticker} className="p-4 bg-slate-700 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge className={getRankColor(stock.rank)}>
                                #{stock.rank}
                              </Badge>
                              <h4 className="font-semibold text-slate-100">{stock.ticker}</h4>
                              {stock.score && (
                                <span className="text-sm text-slate-400">Score: {stock.score}/100</span>
                              )}
                            </div>
                            {stock.risk_level && (
                              <Badge variant="outline" className="text-slate-300 border-slate-500">
                                {stock.risk_level} Risk
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-sm font-medium text-green-400 mb-2">Strengths</h5>
                              <ul className="text-sm text-slate-300 space-y-1">
                                {stock.strengths?.map((strength, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <Check className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-red-400 mb-2">Weaknesses</h5>
                              <ul className="text-sm text-slate-300 space-y-1">
                                {stock.weaknesses?.map((weakness, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <X className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                                    {weakness}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final Recommendation */}
                {comparison.recommendation && (
                  <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <h3 className="font-semibold text-green-300 mb-2">
                      <Check className="inline h-4 w-4 mr-2" />
                      Top Recommendation: {comparison.recommendation.top_pick}
                    </h3>
                    <p className="text-slate-300 mb-3">{comparison.recommendation.reasoning}</p>
                    
                    {comparison.recommendation.key_factors && (
                      <div>
                        <h4 className="text-sm font-medium text-green-400 mb-2">Key Decision Factors:</h4>
                        <ul className="text-sm text-slate-300 space-y-1">
                          {comparison.recommendation.key_factors.map((factor, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <InfoIcon className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Main selection page
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-3 sm:p-6 pb-28 sm:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Desktop Header - Hidden on Mobile */}
        <div className="hidden sm:flex items-center gap-4 mb-8">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex-shrink-0">
                <BarChart2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Compare Dividend Stocks</h1>
                <p className="text-sm text-slate-400 mt-1">Select 2 to 4 stocks for a side-by-side AI-powered analysis.</p>
            </div>
        </div>

        {/* Mobile Sticky Header - Only on Mobile */}
        <div className="sticky top-16 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-700 py-3 px-3 mb-6 sm:hidden">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Compare Dividend Stocks</h2>
              <p className="text-sm text-slate-300">Select 2 to 4 stocks for a side-by-side AI-powered analysis.</p>
            </div>
          </div>
        </div>

        {/* Stock Selection */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="mb-6">
              <StockSearch 
                onSearch={handleStockSearchSelection}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                stocks={searchResults}
              />
            </div>

            {/* Selected Stocks */}
            {selectedStocks.length > 0 && (
              <div className="mb-8">
                <h3 className="text-base font-medium text-slate-300 mb-4">Selected Stocks ({selectedStocks.length}/4):</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedStocks.map(stock => (
                    <Badge key={stock.id} variant="secondary" className="bg-slate-700 text-slate-200 border-slate-600 px-4 py-2 text-sm hover:bg-slate-600 transition-colors">
                      {stock.ticker} - {stock.name}
                      <X 
                        className="ml-3 h-4 w-4 cursor-pointer hover:text-red-400 transition-colors" 
                        onClick={() => removeStock(stock.id)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Stocks */}
            {searchResults.length > 0 && (
              <div>
                <h3 className="text-base font-medium text-slate-300 mb-4">Available Dividend Stocks:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {searchResults.slice(0, 20).map(stock => {
                    const isSelected = isStockSelected(stock);
                    return (
                      <div 
                        key={stock.id} 
                        onClick={() => toggleStockSelection(stock)}
                        className={`p-4 rounded-lg transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-green-800/30 border-2 border-green-600 shadow-lg' 
                            : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-lg ${isSelected ? 'text-green-300' : 'text-slate-100'}`}>
                              {stock.ticker}
                              {isSelected && <Check className="inline ml-2 h-5 w-5 text-green-400" />}
                            </h4>
                            <p className={`text-sm mb-2 truncate ${isSelected ? 'text-green-400' : 'text-slate-400'}`}>
                              {stock.name}
                            </p>
                            <p className="text-base font-medium text-green-400">
                              Yield: {stock.dividend_yield ? `${parseFloat(stock.dividend_yield).toFixed(2)}%` : 'N/A'}
                            </p>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            {!isSelected && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the card click
                                  addStock(stock);
                                }}
                                disabled={selectedStocks.length >= 4}
                                className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 h-10 w-10 p-0"
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            )}
                            {isSelected && (
                              <div className="px-3 py-2 bg-green-600 text-white text-sm rounded font-medium">
                                Added
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Sticky Compare Button - Above mobile nav */}
      {selectedStocks.length > 0 && (
        <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.3)] z-40">
            <div className="max-w-7xl mx-auto flex justify-center">
                <Button
                    onClick={handleProceedToComparisonView}
                    disabled={selectedStocks.length < 2}
                    className="bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed px-8 py-3 text-lg w-full sm:w-auto"
                >
                    <BarChart2 className="mr-2 h-5 w-5" />
                    {selectedStocks.length < 2 
                        ? "Select at least 2 stocks" 
                        : `Compare ${selectedStocks.length} Stocks`}
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
