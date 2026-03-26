import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Calendar, Info, Sparkles, Loader2, AlertCircle as LucideAlertCircle, Database } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isValid, parse } from "date-fns";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { fetchHybridStockData, getDataSourcesStatus } from "@/functions/hybridDataFetcher";
import { Stock } from "@/entities/Stock";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const initialStockDataState = {
    ticker: "", exchange: "", name: "", sector: "", price: "", min_52w: "", max_52w: "",
    target_1y: "", market_cap: "", pe_ratio: "", sector_pe: "", sp500_pe: "",
    eps: "", dividend_yield: "", ex_date: "", dividend_pay_date: "", dividend_years: "",
    avg_div_growth_5y: "", avg_div_growth_20y: "", div_distribution_sequence: "",
    payout_ratio: "", chowder: "", beta: "", roe: "", credit_rating: "",
    diluted_shares: "", basic_shares: "", ebit: "", ebitda: "", net_income: "",
    net_income_prev: "", net_income_prev2: "", net_income_minus_buyback: "",
    total_debt: "", shareholder_equity: "", ebt: "",
    five_year_total_return: "", // Added
    dividend_stability_score: "", // Added
    revenue_history: [], eps_history: [], price_history: [], dividend_history: [],
    eps_surprise_history: [],
    news_sentiment: null,
    analyst_recommendation: null
};

const StockDataInput = ({ stock, onSave, isLoading }) => {
  const [data, setData] = useState({...initialStockDataState});
  const [exDate, setExDate] = useState(null);
  const [payDate, setPayDate] = useState(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [dataSources, setDataSources] = useState(null);
  
  // Add ref to prevent duplicate requests
  const fetchRequestInProgress = useRef(false);

  const parseFlexibleDate = useCallback((dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;
    const trimmedDateString = dateString.trim();
    if (trimmedDateString.toLowerCase() === "n/a" || trimmedDateString === "") return null;

    let parsedDate = parseISO(trimmedDateString);
    if (isValid(parsedDate)) return parsedDate;

    const formatsToTry = [
        "MM/dd/yyyy", "M/d/yy", "yyyy-MM-dd", "MM-dd-yyyy",
        "dd/MM/yyyy", "d/M/yy", "dd-MM-yyyy",
        "MMM d, yyyy", "MMMM d, yyyy"
    ];
    for (const fmt of formatsToTry) {
        parsedDate = parse(trimmedDateString, fmt, new Date());
        if (isValid(parsedDate)) return parsedDate;
    }

    parsedDate = new Date(trimmedDateString);
    return isValid(parsedDate) ? parsedDate : null;
  }, []);

  const populateFormWithStockData = useCallback((stockToLoad) => {
    if (!stockToLoad) {
      setData({...initialStockDataState});
      setExDate(null);
      setPayDate(null);
      return;
    }

    const formData = {...initialStockDataState};
    Object.keys(formData).forEach(key => {
      if (stockToLoad[key] !== undefined && stockToLoad[key] !== null) {
        if (Array.isArray(stockToLoad[key])) {
          formData[key] = [...stockToLoad[key]];
        } else if (typeof stockToLoad[key] === 'number') {
          formData[key] = stockToLoad[key].toString();
        } else {
          formData[key] = stockToLoad[key];
        }
      } else if (['dividend_history', 'eps_surprise_history', 'revenue_history', 'eps_history', 'price_history'].includes(key)) {
        formData[key] = [];
      } else if (['news_sentiment', 'analyst_recommendation'].includes(key)) {
        formData[key] = null;
      }
    });

    if (stockToLoad.news_sentiment !== undefined && stockToLoad.news_sentiment !== null) {
      formData.news_sentiment = stockToLoad.news_sentiment;
    }
    if (stockToLoad.analyst_recommendation !== undefined && stockToLoad.analyst_recommendation !== null) {
      formData.analyst_recommendation = stockToLoad.analyst_recommendation;
    }

    setExDate(stockToLoad.ex_date ? parseFlexibleDate(stockToLoad.ex_date) : null);
    setPayDate(stockToLoad.dividend_pay_date ? parseFlexibleDate(stockToLoad.dividend_pay_date) : null);

    setData(formData);
  }, [parseFlexibleDate]);

  // Update form when stock prop changes
  useEffect(() => {
    populateFormWithStockData(stock);
  }, [stock, populateFormWithStockData]);

  // Helper function to format and save stock data
  const saveStockData = useCallback(async (stockDataToSave) => {
    const formattedData = { ...stockDataToSave };

    // List of keys that are expected to be in millions (M$)
    const fieldsExpectedInMillions = [
      'market_cap', 'ebit', 'ebitda', 'net_income', 'net_income_prev', 
      'net_income_prev2', 'net_income_minus_buyback', 'total_debt', 
      'shareholder_equity', 'ebt'
    ];

    Object.keys(formattedData).forEach(key => {
      if (initialStockDataState.hasOwnProperty(key)) {
        const schemaDef = Stock.schema().properties[key] || {};
        if (typeof formattedData[key] === 'string' && formattedData[key].trim() !== '') {
          if (schemaDef.type === 'number' || (schemaDef.type === 'integer')) {
            let numValue = parseFloat(formattedData[key].replace(/,/g, ''));
            
            // Enhanced conversion logic for market cap and other financial fields
            if (!isNaN(numValue) && fieldsExpectedInMillions.includes(key)) {
              if (key === 'market_cap') {
                // Special handling for market cap - if it's a reasonable number but seems too small
                // for a public company (< 10,000 millions = < $10B), it's likely in billions
                if (numValue > 1 && numValue < 10000) {
                  // This is likely in billions, convert to millions
                  numValue = numValue * 1000;
                } else if (numValue > 5_000_000) {
                  // This is likely the full dollar amount, convert to millions
                  numValue = numValue / 1_000_000;
                }
              } else {
                // For other fields, use the original logic
                if (numValue > 5_000_000) {
                  numValue = numValue / 1_000_000;
                }
              }
            }

            formattedData[key] = isNaN(numValue) ? null : numValue;
          }
        } else if (formattedData[key] === '' || formattedData[key] === undefined || formattedData[key] === null) {
          if (['dividend_history', 'revenue_history', 'eps_history', 'price_history', 'eps_surprise_history'].includes(key)) {
            formattedData[key] = [];
          } else if (schemaDef.type === 'number' || schemaDef.type === 'integer') {
            formattedData[key] = null;
          } else {
             formattedData[key] = null;
          }
        }
      }
    });

    if (formattedData.news_sentiment === undefined) formattedData.news_sentiment = null;
    if (formattedData.analyst_recommendation === undefined) formattedData.analyst_recommendation = null;

    // Use state values if available, otherwise preserve incoming data (handles async state updates)
    if (exDate && isValid(exDate)) {
      formattedData.ex_date = format(exDate, 'yyyy-MM-dd');
    } else if (!formattedData.ex_date) {
      formattedData.ex_date = null;
    }
    
    if (payDate && isValid(payDate)) {
      formattedData.dividend_pay_date = format(payDate, 'yyyy-MM-dd');
    } else if (!formattedData.dividend_pay_date) {
      formattedData.dividend_pay_date = null;
    }

    ['revenue_history', 'eps_history', 'price_history', 'dividend_history', 'eps_surprise_history'].forEach(field => {
      if (!Array.isArray(formattedData[field])) {
        formattedData[field] = [];
      }
    });

    // Clean and validate eps_surprise_history data
    if (Array.isArray(formattedData.eps_surprise_history)) {
      formattedData.eps_surprise_history = formattedData.eps_surprise_history
        .map(item => {
          if (!item || typeof item !== 'object') return null;
          
          const actualEps = parseFloat(item.actual_eps);
          const expectedEps = parseFloat(item.expected_eps);
          
          // Only include entries where both values are valid numbers
          if (!isNaN(actualEps) && !isNaN(expectedEps) && item.period_label) {
            return {
              period_label: item.period_label.toString(),
              actual_eps: actualEps,
              expected_eps: expectedEps
            };
          }
          return null;
        })
        .filter(item => item !== null); // Remove invalid entries
    }

    // Clean and validate other historical data arrays
    if (Array.isArray(formattedData.eps_history)) {
      formattedData.eps_history = formattedData.eps_history
        .map(item => {
          if (!item || typeof item !== 'object') return null;
          const year = parseInt(item.year);
          const eps = parseFloat(item.eps);
          if (!isNaN(year) && !isNaN(eps)) {
            return { year, eps };
          }
          return null;
        })
        .filter(item => item !== null);
    }

    if (Array.isArray(formattedData.revenue_history)) {
      formattedData.revenue_history = formattedData.revenue_history
        .map(item => {
          if (!item || typeof item !== 'object') return null;
          const year = parseInt(item.year);
          const revenue = parseFloat(item.revenue);
          if (!isNaN(year) && !isNaN(revenue)) {
            return { year, revenue };
          }
          return null;
        })
        .filter(item => item !== null);
    }

    if (Array.isArray(formattedData.dividend_history)) {
      formattedData.dividend_history = formattedData.dividend_history
        .map(item => {
          if (!item || typeof item !== 'object') return null;
          const dividendAmount = parseFloat(item.dividend_amount);
          if (!isNaN(dividendAmount) && item.period_label) {
            return {
              period_label: item.period_label.toString(),
              dividend_amount: dividendAmount
            };
          }
          return null;
        })
        .filter(item => item !== null);
    }

    if (Array.isArray(formattedData.price_history)) {
      formattedData.price_history = formattedData.price_history
        .map(item => {
          if (!item || typeof item !== 'object') return null;
          const price = parseFloat(item.price);
          if (!isNaN(price) && item.date) {
            return {
              date: item.date.toString(),
              price: price
            };
          }
          return null;
        })
        .filter(item => item !== null)
        .slice(-100); // Limit to last 100 entries to prevent payload size issues
    }

    if (formattedData.news_sentiment && !Array.isArray(formattedData.news_sentiment.articles)) {
        formattedData.news_sentiment.articles = [];
    }

    formattedData.last_updated = new Date().toISOString();
    
    // Call the parent's onSave function
    await onSave(formattedData);
  }, [exDate, payDate, onSave]);

  const fetchStockData = useCallback(async (tickerToFetch) => {
    if (!tickerToFetch) {
      console.warn("fetchStockData called without a ticker.");
      return false;
    }

    if (fetchRequestInProgress.current) {
      console.log("Fetch request already in progress, skipping duplicate");
      return false;
    }

    fetchRequestInProgress.current = true;
    setIsFetchingData(true);
    setFetchError(null);
    setDataSources(null);
    let success = false;

    try {
      console.log(`Fetching data for: ${tickerToFetch} from eToro`);

      const result = await fetchHybridStockData(tickerToFetch, stock || data);

      if (result.success) {
        const fetchedData = result.data;
        
        const processedData = { ...fetchedData };
        
        Object.keys(processedData).forEach(key => {
          const value = processedData[key];
          if (value !== undefined && value !== null && !Array.isArray(value) && typeof value === 'number') {
            processedData[key] = value.toString();
          }
        });

        if (!processedData.ticker) {
          processedData.ticker = tickerToFetch.toUpperCase();
        }

        console.log("Processed data for form:", processedData);
        console.log("Data sources:", result.sources);

        setData(processedData);
        setDataSources(result.sources);

        if (processedData.ex_date) {
          setExDate(parseFlexibleDate(processedData.ex_date));
        }
        if (processedData.dividend_pay_date) {
          setPayDate(parseFlexibleDate(processedData.dividend_pay_date));
        }

        console.log("Auto-saving fetched data...");
        await saveStockData(processedData);

        success = true;
      } else {
        setFetchError("💡 No data found. Please enter it manually.");
        success = false;
      }

    } catch (error) {
      console.error(`Error fetching data for ${tickerToFetch}:`, error);
      setFetchError("💡 Could not fetch data. Please enter it manually.");
      success = false;
    } finally {
      setIsFetchingData(false);
      fetchRequestInProgress.current = false;
    }
    return success;
  }, [data, stock, saveStockData, parseFlexibleDate]);

  const handleDataFetchLogic = async () => {
    const tickerToFetch = data.ticker || (stock && stock.ticker);

    if (!tickerToFetch) {
      alert("Please enter a stock ticker first.");
      return;
    }
    
    if (fetchRequestInProgress.current) {
      console.log("Fetch request already in progress");
      return;
    }
    
    setFetchError(null);
    await fetchStockData(tickerToFetch);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prevData => ({
        ...prevData,
        [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveStockData(data);
  };

  const MobileTooltip = ({ text }) => {
    const [open, setOpen] = useState(false);

    const handleOpenChange = (newOpen) => {
      // Only use Radix's open/close for hover-capable devices (desktop)
      // On touch devices, we control state via onClick only to avoid double-toggle
      if (window.matchMedia('(hover: hover)').matches) {
        setOpen(newOpen);
      }
    };
    
    return (
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
            <p>{text}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderTooltip = (text) => <MobileTooltip text={text} />;

  const renderField = (id, label, description = null, type = "text") => (
    <div className="space-y-1 sm:space-y-2">
      <div className="flex items-center">
        <Label htmlFor={id} className="text-xs sm:text-sm font-medium text-slate-300">{label}</Label>
        {description && renderTooltip(description)}
      </div>
      <Input
        id={id}
        name={id}
        value={data[id] === null || data[id] === undefined ? "" : data[id]}
        onChange={handleChange}
        className="h-8 sm:h-9 text-xs sm:text-sm bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 focus:ring-green-500 focus:border-green-500"
        type={type}
        disabled={formFieldsDisabled}
        autoComplete="off"
        step={type === "number" ? "any" : undefined}
      />
    </div>
  );

  const formFieldsDisabled = isLoading || isFetchingData;

  return (
    <Card className="w-full mx-auto mt-4 sm:mt-6 bg-slate-800 border border-slate-700">
      <CardHeader className="pb-2 sm:pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg sm:text-xl font-bold text-slate-100 mb-2 sm:mb-0">
          Stock Stats {(data.ticker || (stock && stock.ticker)) &&
                     `for ${(data.ticker || (stock && stock.ticker)).toUpperCase()}`}
        </CardTitle>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleDataFetchLogic}
            disabled={!(data.ticker || (stock && stock.ticker)) || formFieldsDisabled}
            size="sm"
            className="text-xs sm:text-sm sm:ml-auto shrink-0 bg-[#3FB923] hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingData ? (
              <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            )}
            {isFetchingData ? 'Fetching & Saving...' : 'Fetch Data (eToro)'}
          </Button>
          {dataSources && (
            <div className="text-xs p-2 rounded border max-w-xs sm:max-w-sm text-center bg-green-900/20 border-green-700/50 text-green-300">
              <div>Source: eToro ({dataSources.etoro})</div>
            </div>
          )}
          {fetchError && (
            <div className="text-xs p-2 rounded border max-w-xs sm:max-w-sm text-center bg-amber-900/20 border-amber-700/50 text-amber-300">
              {fetchError}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-2 sm:py-4">
        {fetchError && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <div className="text-sm text-blue-300">
              <strong>💡 Manual Data Entry:</strong> You can manually enter stock data below. 
              Try searching for "{data.ticker || (stock && stock.ticker) || 'your stock'}" on financial websites like Yahoo Finance or Google Finance.
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {renderField("ticker", "Ticker Symbol", "Stock exchange code (e.g., AAPL)", "text")}
            {renderField("exchange", "Exchange", "Stock exchange (e.g., NYSE, NASDAQ)", "text")}
            {renderField("name", "Company Name", "Full legal name of the company", "text")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {renderField("sector", "Sector", "Industry sector classification", "text")}
            {renderField("price", "Current Price ($)", "Current market price per share", "number")}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {renderField("dividend_yield", "Dividend Yield (%)", "Annual dividend as percentage of share price", "number")}

            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center">
                <Label htmlFor="pay_date_button" className="text-xs sm:text-sm font-medium text-slate-300">Dividend Pay Date</Label>
                {renderTooltip("Date when dividend is paid to shareholders")}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="pay_date_button" variant="outline" className="w-full justify-start text-left font-normal h-8 sm:h-9 text-xs sm:text-sm overflow-hidden bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 focus:ring-green-500" disabled={formFieldsDisabled}>
                    <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">{payDate && isValid(payDate) ? format(payDate, "MMM d, yyyy") : "Select date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700"><CalendarPicker mode="single" selected={payDate} onSelect={setPayDate} initialFocus disabled={formFieldsDisabled} className="text-slate-200"/></PopoverContent>
              </Popover>
            </div>
            {renderField("dividend_years", "Dividend Years", "Number of consecutive years paying dividends", "number")}
            {renderField("pe_ratio", "P/E Ratio", "Price to Earnings ratio", "number")}
            {renderField("sector_pe", "Sector P/E", "Average P/E for the sector", "number")}
            {renderField("sp500_pe", "S&P 500 P/E", "Average P/E for the S&P 500 index", "number")}
            {renderField("eps", "EPS ($)", "Earnings Per Share", "number")}
            {renderField("avg_div_growth_5y", "5-Yr Div Growth (%)", "Average annual dividend growth over 5 years", "number")}
            {renderField("avg_div_growth_20y", "20-Yr Div Growth (%)", "Average annual dividend growth over 20 years", "number")}
            {renderField("div_distribution_sequence", "Distribution Seq.", "Pattern of payouts (e.g., 'Quarterly: Mar, Jun, Sep, Dec')")}
            {renderField("payout_ratio", "Payout Ratio (%)", "Percentage of earnings paid as dividends", "number")}
            {renderField("chowder", "Chowder Number", "Dividend yield + 5-year dividend growth rate", "number")}
            {renderField("min_52w", "52-Week Low ($)", "Lowest price in the past 52 weeks", "number")}
            {renderField("max_52w", "52-Week High ($)", "Highest price in the past 52 weeks", "number")}
            {renderField("target_1y", "1-Year Target ($)", "Analysts' average 1-year price target", "number")}
            {renderField("market_cap", "Market Cap (M$)", "Total market value in millions (e.g., 150000 for $150B, 2000000 for $2T)", "number")}
            {renderField("beta", "Beta", "Stock volatility compared to the market", "number")}
            {renderField("roe", "ROE (%)", "Return on Equity percentage", "number")}
            {renderField("credit_rating", "Credit Rating", "Company's credit quality rating (e.g., AAA, BBB+)")}
            {renderField("five_year_total_return", "5-Year Total Return (%)", "Total return over the past 5 years, including price appreciation and dividends.", "number")}
            {renderField("dividend_stability_score", "Dividend Stability Score", "A score indicating the historical stability of dividend payments (e.g., 0-100).", "number")}
            {renderField("diluted_shares", "Diluted Shares (M)", "Average diluted shares outstanding in millions", "number")}
            {renderField("basic_shares", "Basic Shares (M)", "Average basic shares outstanding in millions", "number")}
            {renderField("ebit", "EBIT (M$)", "Earnings Before Interest and Taxes in millions", "number")}
            {renderField("ebitda", "EBITDA (M$)", "EBITDA in millions", "number")}
            {renderField("net_income", "Net Income (M$)", "Current year net income in millions", "number")}
            {renderField("net_income_prev", "Last Year Net Inc. (M$)", "Previous year net income in millions", "number")}
            {renderField("net_income_prev2", "2 Yrs Ago Net Inc. (M$)", "Net income from two years ago in millions", "number")}
            {renderField("net_income_minus_buyback", "Net - Buybacks (M$)", "Net income minus share buybacks in millions", "number")}
            {renderField("total_debt", "Total Debt (M$)", "Total company debt in millions USD", "number")}
            {renderField("shareholder_equity", "Shareholder Equity (M$)", "Total shareholder equity in millions USD", "number")}
            {renderField("ebt", "EBT (M$)", "Earnings Before Tax in millions USD", "number")}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              Historical data fields (Revenue, EPS, Price History, Dividend History) are typically populated by AI and displayed in the 'Trends' and 'Analysis' tabs.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={formFieldsDisabled || !(data.ticker || (stock && stock.ticker)) || !data.name || !data.price}
              className="bg-[#3FB923] hover:bg-green-600 text-white min-w-[120px] sm:min-w-[150px]"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span className="hidden sm:inline">Saving Data...</span><span className="sm:hidden">Saving...</span></>
              ) : isFetchingData ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span className="hidden sm:inline">Fetching & Saving...</span><span className="sm:hidden">Fetching...</span></>
              ) : (
                <><Save className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Save Stock Data</span><span className="sm:hidden">Save</span></>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default StockDataInput;