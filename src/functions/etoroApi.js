/**
 * eToro API Integration
 * Provides: Price data, price history, logos, sector, trading status,
 * dividends, fundamentals, financial ratios, and more
 * 
 * API Documentation: https://api-portal.etoro.com/
 * 
 * NOTE: This is now the PRIMARY data source for most fields,
 * reducing dependency on FMP API (which has 250 calls/day limit)
 */

const ETORO_PROXY = '/etoro-api';
const ETORO_SAPI_PROXY = '/etoro-api/sapi';

/**
 * Search for an instrument by ticker symbol (basic search to get instrumentId)
 */
export async function searchBySymbol(symbol) {
  const fields = [
    'instrumentId',
    'internalInstrumentDisplayName',
    'internalSymbolFull',
    'internalAssetClassName',
    'internalStockIndustryName',
    'currentRate',
    'logo50x50',
    'logo150x150',
    'dailyPriceChange',
    'weeklyPriceChange',
    'monthlyPriceChange',
    'threeMonthPriceChange',
    'sixMonthPriceChange',
    'oneYearPriceChange',
    'lastTwoYearsPriceChange',
    'isOpen',
    'isCurrentlyTradable',
    'isBuyEnabled',
    'marketCapInUSD',
    'isin',
    'cusip',
    // EPS and earnings fields
    'epS-TTM',
    'epS-Annual',
    'epsFullyDiluted-TTM',
    'epsGrowth1Year',
    'epsGrowth5Years',
    'quarterlyEPSValue',
    'annualEPSValue',
    'nextEarningEstimateAverage',
    'lastEarningEstimateAverage',
    'earningsGrowth-TTM',
    'nextEarningDate',
    'daysTillNextEarningReport'
  ].join(',');

  try {
    const url = `${ETORO_PROXY}/api/v1/market-data/search?internalSymbolFull=${encodeURIComponent(symbol)}&pageSize=5&fields=${fields}`;
    console.log('[eToro] Searching for symbol:', symbol);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`eToro API error: ${response.status}`);
    }
    
    const data = await response.json();
    const items = data?.items || [];
    
    const exactMatch = items.find(
      item => item.internalSymbolFull?.toUpperCase() === symbol.toUpperCase()
    );
    
    return exactMatch || items[0] || null;
  } catch (error) {
    console.error('[eToro] Error searching by symbol:', error);
    return null;
  }
}

/**
 * Fetch detailed instrument info including fundamentals, dividends, and financial ratios
 * This uses the SAPI endpoint (routed through proxy) which provides much more data than the market-data API
 */
export async function getDetailedInstrumentInfo(instrumentId) {
  try {
    const url = `${ETORO_SAPI_PROXY}/instrumentsinfo/instruments/?instrumentId=${instrumentId}`;
    console.log('[eToro] Fetching detailed instrument info for:', instrumentId);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[eToro] SAPI error: ${response.status} - falling back to basic data`);
      return null;
    }
    
    const data = await response.json();
    const items = data?.items || [];
    
    return items[0] || null;
  } catch (error) {
    console.error('[eToro] Error fetching detailed instrument info:', error);
    return null;
  }
}

/**
 * Process historic dividends from eToro into our format
 */
function processHistoricDividends(historicDividends) {
  if (!historicDividends || !Array.isArray(historicDividends) || historicDividends.length === 0) {
    return {
      dividend_history: [],
      ex_date: null,
      dividend_pay_date: null,
      div_distribution_sequence: null,
      dividend_years: 0
    };
  }

  const sortedDividends = [...historicDividends].sort(
    (a, b) => new Date(b.ExDate) - new Date(a.ExDate)
  );

  const dividend_history = sortedDividends.slice(0, 20).map(d => ({
    period_label: d.ExDate,
    dividend_amount: d.DividendAmount,
    pay_date: d.PayDate,
    record_date: d.RecordDate,
    declared_date: d.DeclaredDate,
    frequency: d.PaymentFrequency,
    type: d.Type
  }));

  const latestDividend = sortedDividends[0];
  
  const years = new Set();
  sortedDividends.forEach(d => {
    const year = new Date(d.ExDate).getFullYear();
    years.add(year);
  });
  const sortedYears = Array.from(years).sort((a, b) => b - a);
  let consecutiveYears = 0;
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < sortedYears.length; i++) {
    if (sortedYears[i] === currentYear - i || sortedYears[i] === currentYear - i - 1) {
      consecutiveYears++;
    } else {
      break;
    }
  }

  return {
    dividend_history,
    ex_date: latestDividend?.ExDate || null,
    dividend_pay_date: latestDividend?.PayDate || null,
    div_distribution_sequence: latestDividend?.PaymentFrequency || null,
    dividend_years: consecutiveYears
  };
}

/**
 * Calculate dividend yield from dividend history and current price
 */
function calculateDividendYield(historicDividends, currentPrice) {
  if (!historicDividends || historicDividends.length === 0 || !currentPrice || currentPrice === 0) {
    return null;
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const recentDividends = historicDividends.filter(d => new Date(d.ExDate) >= oneYearAgo);
  const annualDividend = recentDividends.reduce((sum, d) => sum + (d.DividendAmount || 0), 0);

  if (annualDividend === 0) return null;
  
  const yieldPct = (annualDividend / currentPrice) * 100;
  return isFinite(yieldPct) ? yieldPct : null;
}

/**
 * Calculate dividend growth rate from history
 */
function calculateDividendGrowthFromHistory(historicDividends, years = 5) {
  if (!historicDividends || historicDividends.length < 2) return null;

  const now = new Date();
  const yearsAgo = new Date(now.setFullYear(now.getFullYear() - years));

  const sortedDividends = [...historicDividends].sort(
    (a, b) => new Date(a.ExDate) - new Date(b.ExDate)
  );

  const recentDividends = sortedDividends.filter(d => new Date(d.ExDate) >= yearsAgo);
  if (recentDividends.length < 2) return null;

  const oldestDividend = recentDividends[0]?.DividendAmount;
  const newestDividend = recentDividends[recentDividends.length - 1]?.DividendAmount;

  if (!oldestDividend || oldestDividend === 0) return null;

  const growthRate = ((newestDividend / oldestDividend) ** (1 / years) - 1) * 100;
  return isFinite(growthRate) ? growthRate : null;
}

/**
 * Get historical price candles for an instrument
 */
export async function getPriceHistory(instrumentId, interval = 'OneDay', count = 365) {
  try {
    const url = `${ETORO_PROXY}/api/v1/market-data/instruments/${instrumentId}/history/candles/desc/${interval}/${count}`;
    console.log('[eToro] Fetching price history for instrument:', instrumentId);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`eToro API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data?.candles?.[0]?.candles || [];
  } catch (error) {
    console.error('[eToro] Error fetching price history:', error);
    return [];
  }
}

/**
 * Calculate 52-week high/low from price history
 */
function calculate52WeekRange(candles) {
  if (!candles || candles.length === 0) return { min: null, max: null };
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const yearCandles = candles.filter(c => new Date(c.fromDate) >= oneYearAgo);
  
  if (yearCandles.length === 0) return { min: null, max: null };
  
  const highs = yearCandles.map(c => c.high).filter(h => h != null);
  const lows = yearCandles.map(c => c.low).filter(l => l != null);
  
  return {
    min: lows.length > 0 ? Math.min(...lows) : null,
    max: highs.length > 0 ? Math.max(...highs) : null
  };
}

/**
 * Format price history for storage
 */
function formatPriceHistory(candles, limit = 100) {
  if (!candles || candles.length === 0) return [];
  
  return candles.slice(0, limit).map(c => ({
    date: c.fromDate?.split('T')[0] || c.fromDate,
    price: c.close
  })).filter(p => p.date && p.price != null);
}

/**
 * Calculate 5-year total return from price history
 */
function calculateFiveYearReturn(candles) {
  if (!candles || candles.length === 0) return null;
  
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  
  const sortedCandles = [...candles].sort((a, b) => 
    new Date(a.fromDate) - new Date(b.fromDate)
  );
  
  const oldestCandle = sortedCandles.find(c => new Date(c.fromDate) >= fiveYearsAgo);
  const newestCandle = sortedCandles[sortedCandles.length - 1];
  
  if (!oldestCandle || !newestCandle || !oldestCandle.close || oldestCandle.close === 0) {
    return null;
  }
  
  const returnPct = ((newestCandle.close - oldestCandle.close) / oldestCandle.close) * 100;
  return isFinite(returnPct) ? returnPct : null;
}

/**
 * Comprehensive fetch of eToro data for a stock
 * Now includes fundamentals, dividends, and financial ratios from SAPI endpoint
 */
export async function fetchEtoroData(symbol) {
  console.log(`[eToro] Fetching comprehensive data for ${symbol}`);
  
  try {
    const instrument = await searchBySymbol(symbol);
    
    if (!instrument || !instrument.instrumentId) {
      console.warn(`[eToro] Instrument not found for ${symbol}`);
      return { hasData: false, reason: 'not_found' };
    }
    
    const [candles, detailedInfo] = await Promise.all([
      getPriceHistory(instrument.instrumentId, 'OneDay', 1000),
      getDetailedInstrumentInfo(instrument.instrumentId)
    ]);
    
    const range52w = calculate52WeekRange(candles);
    const priceHistory = formatPriceHistory(candles);
    const fiveYearReturn = calculateFiveYearReturn(candles);
    
    const dividendData = processHistoricDividends(detailedInfo?.historicDividends);
    
    const currentPrice = instrument.currentRate || detailedInfo?.currentRate;
    
    let dividendYield = detailedInfo?.['dividendYieldDaily-TTM'] 
      ? detailedInfo['dividendYieldDaily-TTM'] * 100 
      : null;
    
    if (!dividendYield && detailedInfo?.historicDividends) {
      dividendYield = calculateDividendYield(detailedInfo.historicDividends, currentPrice);
    }

    let avgDivGrowth5y = detailedInfo?.['5YearAnnualDividendGrowthRate-Annual'] || null;
    if (!avgDivGrowth5y && detailedInfo?.historicDividends) {
      avgDivGrowth5y = calculateDividendGrowthFromHistory(detailedInfo.historicDividends, 5);
    }

    const result = {
      hasData: true,
      source: 'etoro',
      instrumentId: instrument.instrumentId,
      
      // Basic info
      name: instrument.internalInstrumentDisplayName || detailedInfo?.['companyName-Annual'] || null,
      ticker: instrument.internalSymbolFull || symbol.toUpperCase(),
      sector: instrument.internalStockIndustryName || instrument.internalAssetClassName || detailedInfo?.['sectorName-Annual'] || null,
      exchange: detailedInfo?.internalExchangeName || null,
      
      // Price data
      price: currentPrice || null,
      
      // Logos
      logo50x50: instrument.logo50x50 || detailedInfo?.logo50x50 || null,
      logo150x150: instrument.logo150x150 || detailedInfo?.logo150x150 || null,
      
      // Price changes
      dailyPriceChange: instrument.dailyPriceChange || null,
      weeklyPriceChange: instrument.weeklyPriceChange || null,
      monthlyPriceChange: instrument.monthlyPriceChange || null,
      threeMonthPriceChange: instrument.threeMonthPriceChange || null,
      sixMonthPriceChange: instrument.sixMonthPriceChange || null,
      oneYearPriceChange: instrument.oneYearPriceChange || null,
      twoYearPriceChange: instrument.lastTwoYearsPriceChange || null,
      
      // 52-week range (prefer direct API values, fallback to calculated)
      min_52w: detailedInfo?.['lowPriceLast52Weeks-TTM'] || range52w.min,
      max_52w: detailedInfo?.['highPriceLast52Weeks-TTM'] || range52w.max,
      
      five_year_total_return: fiveYearReturn,
      
      // Trading status
      isOpen: instrument.isOpen || detailedInfo?.isExchangeOpen || false,
      isCurrentlyTradable: instrument.isCurrentlyTradable || detailedInfo?.isCurrentlyTradable || false,
      
      // Market cap
      market_cap: instrument.marketCapInUSD 
        ? instrument.marketCapInUSD / 1_000_000 
        : (detailedInfo?.['marketCapitalization-TTM'] ? detailedInfo['marketCapitalization-TTM'] / 1_000_000 : null),
      
      // Identifiers
      isin: instrument.isin || detailedInfo?.isin || null,
      cusip: instrument.cusip || detailedInfo?.cusip || null,
      
      // Price history
      price_history: priceHistory,
      
      // === NEW FIELDS FROM ETORO (previously from FMP) ===
      
      // Dividend data
      dividend_yield: dividendYield,
      payout_ratio: detailedInfo?.['dividendPayoutRatio-Annual'] || null,
      avg_div_growth_5y: avgDivGrowth5y,
      dividend_years: dividendData.dividend_years,
      ex_date: dividendData.ex_date || detailedInfo?.lastXDividendDate || null,
      dividend_pay_date: dividendData.dividend_pay_date || detailedInfo?.dividendPayDate || null,
      div_distribution_sequence: dividendData.div_distribution_sequence || detailedInfo?.dividendFrequency || null,
      dividend_history: dividendData.dividend_history,
      
      // Valuation ratios
      pe_ratio: detailedInfo?.['peRatio-TTM'] || detailedInfo?.['peRatioFiscal-TTM'] || null,
      peg_ratio: detailedInfo?.['pegRatio-TTM'] || null,
      price_to_book: detailedInfo?.['priceToBook-Annual'] || detailedInfo?.['priceToBook-TTM'] || null,
      price_to_sales: detailedInfo?.['priceToSales-Annual'] || detailedInfo?.['priceToSales-TTM'] || null,
      price_to_cash_flow: detailedInfo?.['priceToCashFlow-Annual'] || detailedInfo?.['priceToCashFlow-TTM'] || null,
      
      // Profitability
      roe: detailedInfo?.['returnOnCommonEquity-Annual'] || detailedInfo?.['returnOnAverageTotalEquity-TTM'] || null,
      roa: detailedInfo?.['returnOnAssets-Annual'] || detailedInfo?.['returnOnAssets-TTM'] || null,
      
      // Risk
      beta: detailedInfo?.['beta-TTM'] || detailedInfo?.['beta-Annual'] || null,
      
      // Earnings
      eps: instrument?.['epS-TTM'] || detailedInfo?.['epS-TTM'] || detailedInfo?.['epS-Annual'] || null,
      eps_diluted: instrument?.['epsFullyDiluted-TTM'] || detailedInfo?.['epsFullyDiluted-TTM'] || detailedInfo?.['epsFullyDiluted-Annual'] || null,
      eps_growth_1y: instrument?.epsGrowth1Year || detailedInfo?.epsGrowth1Year || null,
      eps_growth_5y: instrument?.epsGrowth5Years || detailedInfo?.epsGrowth5Years || null,
      quarterly_eps_estimate: instrument?.quarterlyEPSValue || detailedInfo?.quarterlyEPSValue || null,
      next_earning_estimate: instrument?.nextEarningEstimateAverage || detailedInfo?.nextEarningEstimateAverage || null,
      last_earning_estimate: instrument?.lastEarningEstimateAverage || detailedInfo?.lastEarningEstimateAverage || null,
      earnings_growth: instrument?.['earningsGrowth-TTM'] || detailedInfo?.['earningsGrowth-TTM'] || null,
      
      // Profitability metrics
      ebitda: detailedInfo?.['ebitdA-TTM'] 
        ? detailedInfo['ebitdA-TTM'] / 1_000_000 
        : (detailedInfo?.['ebitdA-Annual'] ? detailedInfo['ebitdA-Annual'] / 1_000_000 : null),
      ebt: detailedInfo?.['pretaxIncome-TTM'] 
        ? detailedInfo['pretaxIncome-TTM'] / 1_000_000 
        : (detailedInfo?.['pretaxIncome-Annual'] ? detailedInfo['pretaxIncome-Annual'] / 1_000_000 : null),
      net_income: detailedInfo?.['netIncomeTotalOperations-TTM'] 
        ? detailedInfo['netIncomeTotalOperations-TTM'] / 1_000_000 
        : (detailedInfo?.['netIncomeTotalOperations-Annual'] ? detailedInfo['netIncomeTotalOperations-Annual'] / 1_000_000 : null),
      
      // Balance sheet
      total_debt: detailedInfo?.['totalDebt-TTM'] 
        ? detailedInfo['totalDebt-TTM'] / 1_000_000 
        : (detailedInfo?.['totalDebt-Annual'] ? detailedInfo['totalDebt-Annual'] / 1_000_000 : null),
      shareholder_equity: detailedInfo?.['totalShareholdersEquity-TTM'] 
        ? detailedInfo['totalShareholdersEquity-TTM'] / 1_000_000 
        : (detailedInfo?.['totalShareholdersEquity-Annual'] ? detailedInfo['totalShareholdersEquity-Annual'] / 1_000_000 : null),
      
      // Shares
      basic_shares: detailedInfo?.['sharesOutstanding-Annual'] 
        ? detailedInfo['sharesOutstanding-Annual'] / 1_000_000 
        : null,
      diluted_shares: detailedInfo?.['commonSharesUsedToCalculateEPSFullyDiluted-Annual'] 
        ? detailedInfo['commonSharesUsedToCalculateEPSFullyDiluted-Annual'] / 1_000_000 
        : null,
      
      // Margins
      gross_margin: detailedInfo?.['grossIncomeMargin-TTM'] || detailedInfo?.['grossIncomeMargin-Annual'] || null,
      operating_margin: detailedInfo?.['operatingMargin-TTM'] || detailedInfo?.['operatingMargin-Annual'] || null,
      net_margin: detailedInfo?.['netMargin-TTM'] || detailedInfo?.['netMargin-Annual'] || null,
      ebitda_margin: detailedInfo?.['ebitdaMargin-TTM'] || detailedInfo?.['ebitdaMargin-Annual'] || null,
      
      // Growth rates
      revenue_growth_1y: detailedInfo?.['1YearAnnualRevenueGrowthRate-Annual'] || detailedInfo?.['1YearAnnualRevenueGrowthRate-TTM'] || null,
      revenue_growth_3y: detailedInfo?.['3YearAnnualRevenueGrowthRate-Annual'] || detailedInfo?.['3YearAnnualRevenueGrowthRate-TTM'] || null,
      revenue_growth_5y: detailedInfo?.['5YearAnnualRevenueGrowthRate-Annual'] || detailedInfo?.['5YearAnnualRevenueGrowthRate-TTM'] || null,
      income_growth_3y: detailedInfo?.['3YearAnnualIncomeGrowthRate-Annual'] || detailedInfo?.['3YearAnnualIncomeGrowthRate-TTM'] || null,
      income_growth_5y: detailedInfo?.['5YearAnnualIncomeGrowthRate-Annual'] || detailedInfo?.['5YearAnnualIncomeGrowthRate-TTM'] || null,
      earnings_growth: detailedInfo?.['earningsGrowth-TTM'] || null,
      eps_growth_1y: detailedInfo?.epsGrowth1Year || null,
      eps_growth_5y: detailedInfo?.epsGrowth5Years || null,
      
      // Analyst data
      analyst_consensus: detailedInfo?.tipranksConsensus || null,
      analyst_count: detailedInfo?.tipranksTotalAnalysts || null,
      analyst_target_price: detailedInfo?.tipranksTargetPrice || null,
      analyst_target_upside: detailedInfo?.tipranksTargetPriceUpside || null,
      
      // ESG scores
      esg_total: detailedInfo?.arabesqueESGTotal || null,
      esg_environment: detailedInfo?.arabesqueESGEnvironment || null,
      esg_social: detailedInfo?.arabesqueESGSocial || null,
      esg_governance: detailedInfo?.arabesqueESGGovernance || null,
      
      // Liquidity ratios
      current_ratio: detailedInfo?.['currentRatio-TTM'] || detailedInfo?.['currentRatio-Annual'] || null,
      quick_ratio: detailedInfo?.['quickRatio-TTM'] || detailedInfo?.['quickRatio-Annual'] || null,
      
      // Free cash flow
      free_cash_flow: detailedInfo?.['freeCashFlow-TTM'] 
        ? detailedInfo['freeCashFlow-TTM'] / 1_000_000 
        : (detailedInfo?.['freeCashFlow-Annual'] ? detailedInfo['freeCashFlow-Annual'] / 1_000_000 : null),
      
      // Enterprise value
      enterprise_value: detailedInfo?.['totalEnterpriseValue-TTM'] 
        ? detailedInfo['totalEnterpriseValue-TTM'] / 1_000_000 
        : (detailedInfo?.['totalEnterpriseValue-Annual'] ? detailedInfo['totalEnterpriseValue-Annual'] / 1_000_000 : null),
      
      // Institutional holdings
      institutional_holding_pct: detailedInfo?.institutionalHoldingPct || null,
      insider_holding_pct: detailedInfo?.['percentOfSharesOutstandingHeldByInsiders-TTM'] || null,
      
      // Upcoming events
      next_earnings_date: instrument?.nextEarningDate || detailedInfo?.nextEarningDate || null,
      next_dividend_ex_date: detailedInfo?.dividendExDate || null,
      
      // Additional info
      number_of_employees: detailedInfo?.['numberOfEmployees-TTM'] || detailedInfo?.['numberOfEmployees-Annual'] || null,
      company_description: detailedInfo?.['shortBio-en-us'] || detailedInfo?.['businessDescription-TTM'] || null,
    };
    
    console.log('[eToro] Successfully fetched comprehensive market data with fundamentals');
    return result;
    
  } catch (error) {
    console.error('[eToro] Error fetching comprehensive data:', error);
    return { hasData: false, reason: 'error', error: error.message };
  }
}

/**
 * Check if eToro API is available (proxy configured)
 */
export async function isEtoroAvailable() {
  try {
    const response = await fetch(`${ETORO_PROXY}/api/v1/market-data/search?internalSymbolFull=AAPL&pageSize=1&fields=instrumentId`);
    return response.ok;
  } catch {
    return false;
  }
}
