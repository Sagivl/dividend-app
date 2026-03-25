/**
 * Hybrid Data Fetcher
 * Combines eToro API (PRIMARY) + Financial Modeling Prep (FALLBACK)
 * 
 * Data Source Priority (eToro is now PRIMARY for most fields):
 * - eToro (Primary): Price, price history, logos, sector, 52-week range, price changes,
 *   dividends, P/E ratio, EPS, ROE, beta, financials, debt/equity, analyst data, ESG
 * - FMP (Fallback): Only used when eToro data is not available
 * 
 * This reduces FMP API usage (250 calls/day limit) significantly
 */

import { fetchEtoroData, isEtoroAvailable } from './etoroApi';
import { fetchComprehensiveFundamentals, hasFmpApiKey, getApiCallCount } from './fmpApi';

export { getApiCallCount };

/**
 * Merge data from multiple sources
 * eToro is now PRIMARY, FMP is FALLBACK
 */
function mergeData(etoroData, fmpData, existingData = {}) {
  const result = { ...existingData };
  
  const setIfBetter = (key, value, source) => {
    if (value !== null && value !== undefined && value !== '') {
      if (result[key] === null || result[key] === undefined || result[key] === '') {
        result[key] = value;
        result[`${key}_source`] = source;
      }
    }
  };

  // eToro is PRIMARY - apply all eToro data first
  if (etoroData?.hasData) {
    // Basic info
    setIfBetter('name', etoroData.name, 'etoro');
    setIfBetter('ticker', etoroData.ticker, 'etoro');
    setIfBetter('sector', etoroData.sector, 'etoro');
    setIfBetter('exchange', etoroData.exchange, 'etoro');
    setIfBetter('price', etoroData.price, 'etoro');
    setIfBetter('min_52w', etoroData.min_52w, 'etoro');
    setIfBetter('max_52w', etoroData.max_52w, 'etoro');
    setIfBetter('market_cap', etoroData.market_cap, 'etoro');
    setIfBetter('five_year_total_return', etoroData.five_year_total_return, 'etoro');
    
    // Price history
    if (etoroData.price_history?.length > 0) {
      result.price_history = etoroData.price_history;
    }
    
    // Direct assignments (always from eToro)
    result.logo50x50 = etoroData.logo50x50;
    result.logo150x150 = etoroData.logo150x150;
    result.instrumentId = etoroData.instrumentId;
    result.isin = etoroData.isin;
    result.cusip = etoroData.cusip;
    result.isOpen = etoroData.isOpen;
    result.isCurrentlyTradable = etoroData.isCurrentlyTradable;
    
    // Price changes
    result.dailyPriceChange = etoroData.dailyPriceChange;
    result.weeklyPriceChange = etoroData.weeklyPriceChange;
    result.monthlyPriceChange = etoroData.monthlyPriceChange;
    result.threeMonthPriceChange = etoroData.threeMonthPriceChange;
    result.sixMonthPriceChange = etoroData.sixMonthPriceChange;
    result.oneYearPriceChange = etoroData.oneYearPriceChange;
    result.twoYearPriceChange = etoroData.twoYearPriceChange;
    
    // === NEW: Dividend data from eToro (previously FMP-only) ===
    setIfBetter('dividend_yield', etoroData.dividend_yield, 'etoro');
    setIfBetter('payout_ratio', etoroData.payout_ratio, 'etoro');
    setIfBetter('avg_div_growth_5y', etoroData.avg_div_growth_5y, 'etoro');
    setIfBetter('dividend_years', etoroData.dividend_years, 'etoro');
    setIfBetter('ex_date', etoroData.ex_date, 'etoro');
    setIfBetter('dividend_pay_date', etoroData.dividend_pay_date, 'etoro');
    setIfBetter('div_distribution_sequence', etoroData.div_distribution_sequence, 'etoro');
    
    if (etoroData.dividend_history?.length > 0) {
      result.dividend_history = etoroData.dividend_history;
      result.dividend_history_source = 'etoro';
    }
    
    // === NEW: Valuation ratios from eToro (previously FMP-only) ===
    setIfBetter('pe_ratio', etoroData.pe_ratio, 'etoro');
    setIfBetter('peg_ratio', etoroData.peg_ratio, 'etoro');
    setIfBetter('price_to_book', etoroData.price_to_book, 'etoro');
    setIfBetter('price_to_sales', etoroData.price_to_sales, 'etoro');
    setIfBetter('price_to_cash_flow', etoroData.price_to_cash_flow, 'etoro');
    
    // === NEW: Profitability from eToro (previously FMP-only) ===
    setIfBetter('roe', etoroData.roe, 'etoro');
    setIfBetter('roa', etoroData.roa, 'etoro');
    
    // === NEW: Risk from eToro (previously FMP-only) ===
    setIfBetter('beta', etoroData.beta, 'etoro');
    
    // === NEW: Earnings from eToro (previously FMP-only) ===
    setIfBetter('eps', etoroData.eps, 'etoro');
    setIfBetter('eps_diluted', etoroData.eps_diluted, 'etoro');
    
    // === NEW: Financials from eToro (previously FMP-only) ===
    setIfBetter('ebitda', etoroData.ebitda, 'etoro');
    setIfBetter('ebt', etoroData.ebt, 'etoro');
    setIfBetter('net_income', etoroData.net_income, 'etoro');
    setIfBetter('total_debt', etoroData.total_debt, 'etoro');
    setIfBetter('shareholder_equity', etoroData.shareholder_equity, 'etoro');
    setIfBetter('basic_shares', etoroData.basic_shares, 'etoro');
    setIfBetter('diluted_shares', etoroData.diluted_shares, 'etoro');
    
    // === NEW: Margins from eToro ===
    setIfBetter('gross_margin', etoroData.gross_margin, 'etoro');
    setIfBetter('operating_margin', etoroData.operating_margin, 'etoro');
    setIfBetter('net_margin', etoroData.net_margin, 'etoro');
    setIfBetter('ebitda_margin', etoroData.ebitda_margin, 'etoro');
    
    // === NEW: Growth rates from eToro ===
    setIfBetter('revenue_growth_1y', etoroData.revenue_growth_1y, 'etoro');
    setIfBetter('revenue_growth_3y', etoroData.revenue_growth_3y, 'etoro');
    setIfBetter('revenue_growth_5y', etoroData.revenue_growth_5y, 'etoro');
    setIfBetter('income_growth_3y', etoroData.income_growth_3y, 'etoro');
    setIfBetter('income_growth_5y', etoroData.income_growth_5y, 'etoro');
    setIfBetter('earnings_growth', etoroData.earnings_growth, 'etoro');
    setIfBetter('eps_growth_1y', etoroData.eps_growth_1y, 'etoro');
    setIfBetter('eps_growth_5y', etoroData.eps_growth_5y, 'etoro');
    setIfBetter('quarterly_eps_estimate', etoroData.quarterly_eps_estimate, 'etoro');
    setIfBetter('next_earning_estimate', etoroData.next_earning_estimate, 'etoro');
    setIfBetter('last_earning_estimate', etoroData.last_earning_estimate, 'etoro');
    
    // === NEW: Analyst data from eToro ===
    setIfBetter('analyst_consensus', etoroData.analyst_consensus, 'etoro');
    setIfBetter('analyst_count', etoroData.analyst_count, 'etoro');
    setIfBetter('analyst_target_price', etoroData.analyst_target_price, 'etoro');
    setIfBetter('analyst_target_upside', etoroData.analyst_target_upside, 'etoro');
    
    // === NEW: ESG scores from eToro ===
    setIfBetter('esg_total', etoroData.esg_total, 'etoro');
    setIfBetter('esg_environment', etoroData.esg_environment, 'etoro');
    setIfBetter('esg_social', etoroData.esg_social, 'etoro');
    setIfBetter('esg_governance', etoroData.esg_governance, 'etoro');
    
    // === NEW: Liquidity ratios from eToro ===
    setIfBetter('current_ratio', etoroData.current_ratio, 'etoro');
    setIfBetter('quick_ratio', etoroData.quick_ratio, 'etoro');
    
    // === NEW: Additional metrics from eToro ===
    setIfBetter('free_cash_flow', etoroData.free_cash_flow, 'etoro');
    setIfBetter('enterprise_value', etoroData.enterprise_value, 'etoro');
    setIfBetter('institutional_holding_pct', etoroData.institutional_holding_pct, 'etoro');
    setIfBetter('insider_holding_pct', etoroData.insider_holding_pct, 'etoro');
    setIfBetter('next_earnings_date', etoroData.next_earnings_date, 'etoro');
    setIfBetter('next_dividend_ex_date', etoroData.next_dividend_ex_date, 'etoro');
    setIfBetter('number_of_employees', etoroData.number_of_employees, 'etoro');
    setIfBetter('company_description', etoroData.company_description, 'etoro');
  }

  // FMP is FALLBACK - only fills in missing values
  if (fmpData?.hasData) {
    setIfBetter('name', fmpData.name, 'fmp');
    setIfBetter('sector', fmpData.sector, 'fmp');
    setIfBetter('exchange', fmpData.exchange, 'fmp');
    setIfBetter('price', fmpData.price, 'fmp');
    setIfBetter('market_cap', fmpData.market_cap, 'fmp');
    setIfBetter('beta', fmpData.beta, 'fmp');
    setIfBetter('min_52w', fmpData.min_52w, 'fmp');
    setIfBetter('max_52w', fmpData.max_52w, 'fmp');
    
    // Dividend data fallback
    setIfBetter('dividend_yield', fmpData.dividend_yield, 'fmp');
    setIfBetter('payout_ratio', fmpData.payout_ratio, 'fmp');
    setIfBetter('avg_div_growth_5y', fmpData.avg_div_growth_5y, 'fmp');
    setIfBetter('dividend_years', fmpData.dividend_years, 'fmp');
    setIfBetter('ex_date', fmpData.ex_date, 'fmp');
    setIfBetter('dividend_pay_date', fmpData.dividend_pay_date, 'fmp');
    setIfBetter('div_distribution_sequence', fmpData.div_distribution_sequence, 'fmp');
    
    // Valuation fallback
    setIfBetter('pe_ratio', fmpData.pe_ratio, 'fmp');
    setIfBetter('eps', fmpData.eps, 'fmp');
    setIfBetter('roe', fmpData.roe, 'fmp');
    
    // Financials fallback
    setIfBetter('total_debt', fmpData.total_debt, 'fmp');
    setIfBetter('shareholder_equity', fmpData.shareholder_equity, 'fmp');
    setIfBetter('ebitda', fmpData.ebitda, 'fmp');
    setIfBetter('ebt', fmpData.ebt, 'fmp');
    setIfBetter('net_income', fmpData.net_income, 'fmp');
    setIfBetter('net_income_prev', fmpData.net_income_prev, 'fmp');
    setIfBetter('net_income_prev2', fmpData.net_income_prev2, 'fmp');
    setIfBetter('diluted_shares', fmpData.diluted_shares, 'fmp');
    setIfBetter('basic_shares', fmpData.basic_shares, 'fmp');
    
    // History arrays fallback
    if (!result.eps_history && fmpData.eps_history?.length > 0) {
      result.eps_history = fmpData.eps_history;
      result.eps_history_source = 'fmp';
    }
    if (fmpData.eps_surprise_history?.length > 0) {
      result.eps_surprise_history = fmpData.eps_surprise_history;
    }
    if (!result.dividend_history && fmpData.dividend_history?.length > 0) {
      result.dividend_history = fmpData.dividend_history;
      result.dividend_history_source = 'fmp';
    }
  }

  // Calculate Chowder number if we have both values
  if (result.dividend_yield && result.avg_div_growth_5y) {
    result.chowder = parseFloat(result.dividend_yield) + parseFloat(result.avg_div_growth_5y);
  }

  return result;
}

/**
 * Fetch comprehensive stock data from all available sources
 */
export async function fetchHybridStockData(symbol, existingData = {}) {
  console.log(`[Hybrid] Fetching data for ${symbol} from all sources`);
  
  const sources = {
    etoro: { available: false, data: null },
    fmp: { available: hasFmpApiKey(), data: null }
  };

  try {
    sources.etoro.available = await isEtoroAvailable();
  } catch {
    sources.etoro.available = false;
  }

  const fetchPromises = [];
  
  if (sources.etoro.available) {
    fetchPromises.push(
      fetchEtoroData(symbol)
        .then(data => { sources.etoro.data = data; })
        .catch(err => { console.warn('[Hybrid] eToro fetch failed:', err); })
    );
  }
  
  if (sources.fmp.available) {
    fetchPromises.push(
      fetchComprehensiveFundamentals(symbol)
        .then(data => { sources.fmp.data = data; })
        .catch(err => { console.warn('[Hybrid] FMP fetch failed:', err); })
    );
  }

  await Promise.all(fetchPromises);

  const result = mergeData(sources.etoro.data, sources.fmp.data, existingData);
  
  result.ticker = result.ticker || symbol.toUpperCase();
  result.last_updated = new Date().toISOString();
  
  result._dataSources = {
    etoro: sources.etoro.data?.hasData ? 'success' : (sources.etoro.available ? 'no_data' : 'unavailable'),
    fmp: sources.fmp.data?.hasData ? 'success' : (sources.fmp.available ? 'no_data' : 'unavailable')
  };

  const hasAnyData = sources.etoro.data?.hasData || sources.fmp.data?.hasData;
  
  console.log(`[Hybrid] Data fetch complete. Sources: eToro=${result._dataSources.etoro}, FMP=${result._dataSources.fmp}`);
  
  return {
    success: hasAnyData,
    data: result,
    sources: result._dataSources
  };
}

/**
 * Get status of available data sources
 */
export async function getDataSourcesStatus() {
  const status = {
    etoro: { available: false, configured: true },
    fmp: { available: hasFmpApiKey(), configured: hasFmpApiKey() }
  };
  
  try {
    status.etoro.available = await isEtoroAvailable();
  } catch {
    status.etoro.available = false;
  }
  
  return status;
}

/**
 * Get information about what data each source provides
 */
export function getDataSourceCapabilities() {
  return {
    etoro: {
      name: 'eToro (PRIMARY)',
      priority: 'primary',
      provides: [
        // Market data
        'Current Price',
        'Price History (OHLCV)',
        '52-Week High/Low',
        'Price Changes (daily, weekly, monthly, yearly)',
        'Company Logo',
        'Sector/Industry',
        'Trading Status',
        'ISIN/CUSIP',
        // Dividend data (NEW)
        'Dividend Yield & History',
        'Payout Ratio',
        '5-Year Dividend Growth Rate',
        'Ex-Dividend & Pay Dates',
        'Dividend Frequency',
        // Valuation (NEW)
        'P/E Ratio',
        'PEG Ratio',
        'Price to Book',
        'Price to Sales',
        'Price to Cash Flow',
        // Earnings (NEW)
        'EPS (Basic & Diluted)',
        'EBITDA',
        'Net Income',
        'Pre-tax Income',
        // Balance Sheet (NEW)
        'Total Debt',
        'Shareholder Equity',
        'Shares Outstanding',
        // Profitability (NEW)
        'ROE, ROA',
        'Beta',
        'Gross/Operating/Net Margins',
        // Growth (NEW)
        'Revenue Growth (1Y, 3Y, 5Y)',
        'Income Growth (3Y, 5Y)',
        'Earnings Growth',
        'EPS Growth (1Y, 5Y)',
        // Additional (NEW)
        'Analyst Ratings & Price Targets',
        'ESG Scores',
        'Liquidity Ratios',
        'Free Cash Flow',
        'Enterprise Value',
        'Institutional/Insider Holdings',
        'Next Earnings Date',
        'Number of Employees'
      ],
      requires: 'eToro API proxy configured'
    },
    fmp: {
      name: 'Financial Modeling Prep (FALLBACK)',
      priority: 'fallback',
      provides: [
        'EPS History (year-by-year)',
        'Earnings Surprises',
        'Net Income History (prev years)',
        'Any field not available from eToro'
      ],
      requires: 'FMP API key in .env (free: 250 calls/day)',
      note: 'Now used as fallback only - eToro provides most data'
    }
  };
}
