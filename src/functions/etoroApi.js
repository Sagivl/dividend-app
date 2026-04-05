/**
 * eToro API Integration
 * Provides: Price data, price history, logos, sector, trading status,
 * dividends, fundamentals, financial ratios, and more
 * 
 * API Documentation: https://api-portal.etoro.com/
 */

const ETORO_PROXY = '/etoro-api';
const ETORO_SAPI_PROXY = '/etoro-api/sapi';

/**
 * Search for an instrument by ticker symbol (basic search to get instrumentId)
 */
export async function searchBySymbol(symbol) {
  // NOTE: Do NOT include &fields= parameter in the search URL
  // The eToro API has a bug where including fields causes it to only return instrumentId
  // Without fields, we get all the data we need including internalSymbolFull for matching
  
  try {
    const url = `${ETORO_PROXY}/api/v1/market-data/search?internalSymbolFull=${encodeURIComponent(symbol)}&pageSize=15`;
    console.log('[eToro] Searching for symbol:', symbol);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`eToro API error: ${response.status}`);
    }
    
    const data = await response.json();
    const items = data?.items || [];
    
    // Priority 1: Exact symbol match (case-insensitive)
    const exactMatch = items.find(
      item => item.internalSymbolFull?.toUpperCase() === symbol.toUpperCase()
    );
    
    if (exactMatch) {
      console.log('[eToro] Found exact match for:', symbol, '- instrumentId:', exactMatch.instrumentId);
      return exactMatch;
    }
    
    // Priority 2: Prefer stocks over futures/options/indices
    // Filter to only include stocks (not VIX futures, options, etc.)
    const stockItems = items.filter(item => {
      const assetClass = item.internalAssetClassName?.toLowerCase() || '';
      const displayName = item.internalInstrumentDisplayName?.toLowerCase() || '';
      const symbolFull = item.internalSymbolFull?.toLowerCase() || '';
      
      // Exclude futures, options, indices, and volatility products
      const isFuture = assetClass.includes('future') || displayName.includes('future');
      const isOption = assetClass.includes('option') || displayName.includes('option');
      const isIndex = assetClass.includes('index') || symbolFull.includes('vix');
      const isVolatility = displayName.includes('volatility') || displayName.includes('vix');
      
      return !isFuture && !isOption && !isIndex && !isVolatility;
    });
    
    // Find exact match within filtered stocks
    const stockExactMatch = stockItems.find(
      item => item.internalSymbolFull?.toUpperCase() === symbol.toUpperCase()
    );
    
    if (stockExactMatch) {
      console.log('[eToro] Found exact stock match for:', symbol, '- instrumentId:', stockExactMatch.instrumentId);
      return stockExactMatch;
    }
    
    // Fallback to first stock item, or first item overall
    const result = stockItems[0] || items[0] || null;
    if (result) {
      console.log('[eToro] Using fallback match for:', symbol, '- found:', result.internalSymbolFull, '- instrumentId:', result.instrumentId);
    } else {
      console.warn('[eToro] No instruments found for symbol:', symbol);
    }
    
    return result;
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
 * Debug function to discover all available fields from SAPI for a given instrument
 * Call this to see what fields are available but not yet extracted
 */
export async function discoverSapiFields(symbol) {
  console.log(`[eToro Debug] Discovering all SAPI fields for ${symbol}...`);
  
  const instrument = await searchBySymbol(symbol);
  if (!instrument?.instrumentId) {
    console.error('[eToro Debug] Instrument not found');
    return null;
  }
  
  const detailedInfo = await getDetailedInstrumentInfo(instrument.instrumentId);
  if (!detailedInfo) {
    console.error('[eToro Debug] No detailed info available');
    return null;
  }
  
  // Get all keys and categorize them
  const allKeys = Object.keys(detailedInfo);
  const categories = {
    revenue: allKeys.filter(k => k.toLowerCase().includes('revenue')),
    eps: allKeys.filter(k => k.toLowerCase().includes('eps') || k.toLowerCase().includes('earning')),
    surprise: allKeys.filter(k => k.toLowerCase().includes('surprise') || k.toLowerCase().includes('actual') || k.toLowerCase().includes('estimate')),
    quarterly: allKeys.filter(k => k.toLowerCase().includes('quarter') || k.toLowerCase().includes('q1') || k.toLowerCase().includes('q2') || k.toLowerCase().includes('q3') || k.toLowerCase().includes('q4')),
    annual: allKeys.filter(k => k.includes('-Annual')),
    ttm: allKeys.filter(k => k.includes('-TTM')),
    sector: allKeys.filter(k => k.toLowerCase().includes('sector') || k.toLowerCase().includes('industry')),
    credit: allKeys.filter(k => k.toLowerCase().includes('credit') || k.toLowerCase().includes('rating') || k.toLowerCase().includes('debt')),
    tipranks: allKeys.filter(k => k.toLowerCase().includes('tiprank')),
    sentiment: allKeys.filter(k => k.toLowerCase().includes('sentiment') || k.toLowerCase().includes('news')),
  };
  
  console.log('[eToro Debug] === SAPI Field Discovery Results ===');
  console.log(`[eToro Debug] Total fields available: ${allKeys.length}`);
  console.log('[eToro Debug] --- Revenue-related fields ---', categories.revenue);
  console.log('[eToro Debug] --- EPS/Earnings fields ---', categories.eps);
  console.log('[eToro Debug] --- Surprise/Estimate fields ---', categories.surprise);
  console.log('[eToro Debug] --- Quarterly fields ---', categories.quarterly);
  console.log('[eToro Debug] --- TipRanks fields ---', categories.tipranks);
  console.log('[eToro Debug] --- Sector/Industry fields ---', categories.sector);
  console.log('[eToro Debug] --- Credit/Debt fields ---', categories.credit);
  console.log('[eToro Debug] --- Sentiment/News fields ---', categories.sentiment);
  console.log('[eToro Debug] --- All TTM fields ---', categories.ttm);
  console.log('[eToro Debug] === Sample values for key fields ===');
  
  // Log sample values for potentially useful fields
  const potentialFields = [
    'totalRevenue-TTM', 'totalRevenue-Annual',
    'grossRevenue-TTM', 'revenue-TTM', 'revenuePerShare-TTM',
    'actualEPS', 'expectedEPS', 'epsSurprise',
    'lastQuarterEPS', 'quarterlyEarnings',
    'sectorPE', 'industryPE', 'sp500PE',
    'creditRating', 'debtRating',
    'newsSentiment', 'socialSentiment'
  ];
  
  potentialFields.forEach(field => {
    if (detailedInfo[field] !== undefined) {
      console.log(`[eToro Debug] ${field}:`, detailedInfo[field]);
    }
  });
  
  return {
    totalFields: allKeys.length,
    allKeys,
    categories,
    rawData: detailedInfo
  };
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
      
      // Market cap - ALWAYS prefer calculated from shares × price
      market_cap: (() => {
        const sharesOutstanding = detailedInfo?.['sharesOutstanding-Annual'] || 
                                   detailedInfo?.['commonSharesUsedToCalculateEPSFullyDiluted-Annual'];
        const price = currentPrice;
        
        // BEST: Calculate from shares × price (most reliable)
        if (sharesOutstanding && price && sharesOutstanding > 0 && price > 0) {
          const calculatedMarketCap = (sharesOutstanding * price) / 1_000_000; // Convert to millions
          console.log(`[eToro] Market cap for ${symbol}: $${calculatedMarketCap.toFixed(0)}M (calculated: ${sharesOutstanding.toLocaleString()} shares × $${price})`);
          return calculatedMarketCap;
        }
        
        // FALLBACK: Use API value with unit detection
        const rawFromSearch = instrument.marketCapInUSD;
        const rawFromSapi = detailedInfo?.['marketCapitalization-TTM'];
        const rawMarketCap = rawFromSearch || rawFromSapi;
        const source = rawFromSearch ? 'marketCapInUSD' : 'marketCapitalization-TTM';
        
        if (!rawMarketCap) {
          console.log(`[eToro] No market cap data available for ${symbol}`);
          return null;
        }
        
        console.log(`[eToro] Raw market cap for ${symbol}: ${rawMarketCap} (source: ${source})`);
        
        let marketCapInMillions;
        
        if (source === 'marketCapInUSD') {
          // marketCapInUSD is in full dollars, convert to millions
          marketCapInMillions = rawMarketCap / 1_000_000;
        } else {
          // marketCapitalization-TTM: could be in thousands or full dollars
          // If value > 10 trillion, it's definitely in full dollars or wrong
          // Most companies are < $5T market cap, so raw values > 5T suggest full dollars
          if (rawMarketCap > 5_000_000_000_000) {
            marketCapInMillions = rawMarketCap / 1_000_000;
            console.log(`[eToro] marketCapitalization-TTM in full dollars for ${symbol}`);
          } else if (rawMarketCap > 1_000_000) {
            // Likely in thousands (e.g., 3185121 = $3.185B)
            marketCapInMillions = rawMarketCap / 1_000;
            console.log(`[eToro] marketCapitalization-TTM appears to be in thousands for ${symbol}`);
          } else {
            // Small value, likely in millions already or billions
            marketCapInMillions = rawMarketCap > 100 ? rawMarketCap : rawMarketCap * 1000;
          }
        }
        
        console.log(`[eToro] Final market cap for ${symbol}: $${marketCapInMillions?.toFixed(0)}M`);
        return marketCapInMillions;
      })(),
      
      // Identifiers
      isin: instrument.isin || detailedInfo?.isin || null,
      cusip: instrument.cusip || detailedInfo?.cusip || null,
      
      // Price history
      price_history: priceHistory,
      
      // Financial data from eToro
      
      // Dividend data
      dividend_yield: dividendYield,
      payout_ratio: detailedInfo?.['dividendPayoutRatio-Annual'] || null,
      avg_div_growth_5y: avgDivGrowth5y,
      dividend_years: dividendData.dividend_years,
      ex_date: detailedInfo?.lastXDividendDate?.split('T')[0] || dividendData.ex_date || null,
      dividend_pay_date: detailedInfo?.dividendPayDate?.split('T')[0] || dividendData.dividend_pay_date || null,
      div_distribution_sequence: dividendData.div_distribution_sequence || detailedInfo?.dividendFrequency || null,
      dividend_history: dividendData.dividend_history,
      
      // Valuation ratios
      pe_ratio: detailedInfo?.['peRatio-TTM'] || detailedInfo?.['peRatioFiscal-TTM'] || null,
      peg_ratio: detailedInfo?.['pegRatio-TTM'] || null,
      price_to_book: detailedInfo?.['priceToBook-Annual'] || detailedInfo?.['priceToBook-TTM'] || null,
      price_to_sales: detailedInfo?.['priceToSales-Annual'] || detailedInfo?.['priceToSales-TTM'] || null,
      price_to_cash_flow: detailedInfo?.['priceToCashFlow-Annual'] || detailedInfo?.['priceToCashFlow-TTM'] || null,
      
      // Profitability (API returns values scaled by 100, so divide to get actual percentage)
      // Values beyond +/- 500% are capped as they typically indicate equity near zero (unreliable)
      roe: (() => {
        const rawRoe = detailedInfo?.['returnOnCommonEquity-Annual'] || detailedInfo?.['returnOnAverageTotalEquity-TTM'];
        if (rawRoe == null) return null;
        const roe = rawRoe / 100;
        // Cap extreme values - ROE beyond +/-500% indicates minimal/negative equity
        if (Math.abs(roe) > 500) {
          console.log(`[eToro] ROE value ${roe.toFixed(1)}% is extreme, capping at ${roe > 0 ? 500 : -500}%`);
          return roe > 0 ? 500 : -500;
        }
        return roe;
      })(),
      roa: (() => {
        const rawRoa = detailedInfo?.['returnOnAssets-Annual'] || detailedInfo?.['returnOnAssets-TTM'];
        if (rawRoa == null) return null;
        const roa = rawRoa / 100;
        // Cap extreme values
        if (Math.abs(roa) > 100) {
          return roa > 0 ? 100 : -100;
        }
        return roa;
      })(),
      
      // Risk
      beta: detailedInfo?.['beta-TTM'] || detailedInfo?.['beta-Annual'] || null,
      
      // Earnings
      eps: instrument?.['epS-TTM'] || detailedInfo?.['epS-TTM'] || detailedInfo?.['epS-Annual'] || null,
      eps_diluted: instrument?.['epsFullyDiluted-TTM'] || detailedInfo?.['epsFullyDiluted-TTM'] || detailedInfo?.['epsFullyDiluted-Annual'] || null,
      eps_growth_1y: instrument?.epsGrowth1Year || detailedInfo?.epsGrowth1Year || null,
      // eToro's epsGrowth5Years is NOT split-adjusted — it compares post-split EPS to
      // pre-split EPS, producing wildly wrong values for stocks that split (e.g. NVDA 10:1).
      // Cross-check against income growth: if they have opposite signs AND diverge by >50pp,
      // the EPS number is likely corrupted by a split → use income growth instead.
      eps_growth_5y: (() => {
        const rawEpsG5 = instrument?.epsGrowth5Years ?? detailedInfo?.epsGrowth5Years ?? null;
        if (rawEpsG5 == null) return null;
        const incomeG5 = detailedInfo?.['5YearAnnualIncomeGrowthRate-Annual']
          ?? detailedInfo?.['5YearAnnualIncomeGrowthRate-TTM']
          ?? null;
        if (incomeG5 != null) {
          const signsDiffer = (rawEpsG5 >= 0) !== (incomeG5 >= 0);
          const gap = Math.abs(rawEpsG5 - incomeG5);
          if (signsDiffer && gap > 50) {
            console.log(`[eToro] eps_growth_5y (${rawEpsG5.toFixed(1)}%) looks split-corrupted vs income_growth_5y (${incomeG5.toFixed(1)}%) — using income growth`);
            return incomeG5;
          }
        }
        return rawEpsG5;
      })(),
      eps_growth_5y_source: (() => {
        const rawEpsG5 = instrument?.epsGrowth5Years ?? detailedInfo?.epsGrowth5Years ?? null;
        if (rawEpsG5 == null) return null;
        const incomeG5 = detailedInfo?.['5YearAnnualIncomeGrowthRate-Annual']
          ?? detailedInfo?.['5YearAnnualIncomeGrowthRate-TTM']
          ?? null;
        if (incomeG5 != null) {
          const signsDiffer = (rawEpsG5 >= 0) !== (incomeG5 >= 0);
          const gap = Math.abs(rawEpsG5 - incomeG5);
          if (signsDiffer && gap > 50) return 'income';
        }
        return 'eps';
      })(),
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
