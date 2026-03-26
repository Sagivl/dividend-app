/**
 * Hybrid Data Fetcher
 * Uses eToro API as the primary and only data source
 */

import { fetchEtoroData, isEtoroAvailable } from './etoroApi';

/**
 * Process eToro data into the expected format
 */
function processData(etoroData, existingData = {}) {
  const result = { ...existingData };
  
  const setIfBetter = (key, value, source) => {
    if (value !== null && value !== undefined && value !== '') {
      if (result[key] === null || result[key] === undefined || result[key] === '') {
        result[key] = value;
        result[`${key}_source`] = source;
      }
    }
  };

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
    
    // Dividend data
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
    
    // Valuation ratios
    setIfBetter('pe_ratio', etoroData.pe_ratio, 'etoro');
    setIfBetter('peg_ratio', etoroData.peg_ratio, 'etoro');
    setIfBetter('price_to_book', etoroData.price_to_book, 'etoro');
    setIfBetter('price_to_sales', etoroData.price_to_sales, 'etoro');
    setIfBetter('price_to_cash_flow', etoroData.price_to_cash_flow, 'etoro');
    
    // Profitability
    setIfBetter('roe', etoroData.roe, 'etoro');
    setIfBetter('roa', etoroData.roa, 'etoro');
    
    // Risk
    setIfBetter('beta', etoroData.beta, 'etoro');
    
    // Earnings
    setIfBetter('eps', etoroData.eps, 'etoro');
    setIfBetter('eps_diluted', etoroData.eps_diluted, 'etoro');
    
    // Financials
    setIfBetter('ebitda', etoroData.ebitda, 'etoro');
    setIfBetter('ebt', etoroData.ebt, 'etoro');
    setIfBetter('net_income', etoroData.net_income, 'etoro');
    setIfBetter('total_debt', etoroData.total_debt, 'etoro');
    setIfBetter('shareholder_equity', etoroData.shareholder_equity, 'etoro');
    setIfBetter('basic_shares', etoroData.basic_shares, 'etoro');
    setIfBetter('diluted_shares', etoroData.diluted_shares, 'etoro');
    
    // Margins
    setIfBetter('gross_margin', etoroData.gross_margin, 'etoro');
    setIfBetter('operating_margin', etoroData.operating_margin, 'etoro');
    setIfBetter('net_margin', etoroData.net_margin, 'etoro');
    setIfBetter('ebitda_margin', etoroData.ebitda_margin, 'etoro');
    
    // Growth rates
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
    
    // Analyst data
    setIfBetter('analyst_consensus', etoroData.analyst_consensus, 'etoro');
    setIfBetter('analyst_count', etoroData.analyst_count, 'etoro');
    setIfBetter('analyst_target_price', etoroData.analyst_target_price, 'etoro');
    setIfBetter('analyst_target_upside', etoroData.analyst_target_upside, 'etoro');
    
    // ESG scores
    setIfBetter('esg_total', etoroData.esg_total, 'etoro');
    setIfBetter('esg_environment', etoroData.esg_environment, 'etoro');
    setIfBetter('esg_social', etoroData.esg_social, 'etoro');
    setIfBetter('esg_governance', etoroData.esg_governance, 'etoro');
    
    // Liquidity ratios
    setIfBetter('current_ratio', etoroData.current_ratio, 'etoro');
    setIfBetter('quick_ratio', etoroData.quick_ratio, 'etoro');
    
    // Additional metrics
    setIfBetter('free_cash_flow', etoroData.free_cash_flow, 'etoro');
    setIfBetter('enterprise_value', etoroData.enterprise_value, 'etoro');
    setIfBetter('institutional_holding_pct', etoroData.institutional_holding_pct, 'etoro');
    setIfBetter('insider_holding_pct', etoroData.insider_holding_pct, 'etoro');
    setIfBetter('next_earnings_date', etoroData.next_earnings_date, 'etoro');
    setIfBetter('next_dividend_ex_date', etoroData.next_dividend_ex_date, 'etoro');
    setIfBetter('number_of_employees', etoroData.number_of_employees, 'etoro');
    setIfBetter('company_description', etoroData.company_description, 'etoro');
  }

  // Calculate Chowder number if we have both values
  if (result.dividend_yield && result.avg_div_growth_5y) {
    result.chowder = parseFloat(result.dividend_yield) + parseFloat(result.avg_div_growth_5y);
  }

  return result;
}

/**
 * Fetch comprehensive stock data from eToro
 */
export async function fetchHybridStockData(symbol, existingData = {}) {
  console.log(`[Data] Fetching data for ${symbol} from eToro`);
  
  const sources = {
    etoro: { available: false, data: null }
  };

  try {
    sources.etoro.available = await isEtoroAvailable();
  } catch {
    sources.etoro.available = false;
  }

  if (!sources.etoro.available) {
    console.warn('[Data] eToro API not available');
    return {
      success: false,
      data: existingData,
      sources: { etoro: 'unavailable' }
    };
  }

  try {
    sources.etoro.data = await fetchEtoroData(symbol);
  } catch (err) {
    console.warn('[Data] eToro fetch failed:', err);
  }

  const result = processData(sources.etoro.data, existingData);
  
  result.ticker = result.ticker || symbol.toUpperCase();
  result.last_updated = new Date().toISOString();
  
  result._dataSources = {
    etoro: sources.etoro.data?.hasData ? 'success' : 'no_data'
  };

  const hasAnyData = sources.etoro.data?.hasData;
  
  console.log(`[Data] Fetch complete. Source: eToro=${result._dataSources.etoro}`);
  
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
    etoro: { available: false, configured: true }
  };
  
  try {
    status.etoro.available = await isEtoroAvailable();
  } catch {
    status.etoro.available = false;
  }
  
  return status;
}

/**
 * Get information about what data the source provides
 */
export function getDataSourceCapabilities() {
  return {
    etoro: {
      name: 'eToro',
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
        // Dividend data
        'Dividend Yield & History',
        'Payout Ratio',
        '5-Year Dividend Growth Rate',
        'Ex-Dividend & Pay Dates',
        'Dividend Frequency',
        // Valuation
        'P/E Ratio',
        'PEG Ratio',
        'Price to Book',
        'Price to Sales',
        'Price to Cash Flow',
        // Earnings
        'EPS (Basic & Diluted)',
        'EBITDA',
        'Net Income',
        'Pre-tax Income',
        // Balance Sheet
        'Total Debt',
        'Shareholder Equity',
        'Shares Outstanding',
        // Profitability
        'ROE, ROA',
        'Beta',
        'Gross/Operating/Net Margins',
        // Growth
        'Revenue Growth (1Y, 3Y, 5Y)',
        'Income Growth (3Y, 5Y)',
        'Earnings Growth',
        'EPS Growth (1Y, 5Y)',
        // Additional
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
    }
  };
}
