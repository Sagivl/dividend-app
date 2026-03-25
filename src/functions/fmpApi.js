/**
 * Financial Modeling Prep (FMP) API Integration
 * Provides fundamental data: dividends, P/E ratio, EPS, financials, etc.
 * 
 * FREE TIER LIMIT: 250 API calls/day
 * API KEY IS STORED SERVER-SIDE for security
 * 
 * Optimization strategies:
 * 1. In-memory cache with TTL (avoids repeated calls in same session)
 * 2. LocalStorage cache for persistence (data valid for 24 hours for fundamentals)
 * 3. API call tracking with warnings
 * 4. Reduced endpoint calls (skip redundant data sources)
 */

const FMP_API_ROUTE = '/api/fmp';

// Cache configuration
const CACHE_TTL = {
  quote: 5 * 60 * 1000,           // 5 minutes for price data
  fundamentals: 24 * 60 * 60 * 1000, // 24 hours for fundamentals (rarely changes)
  dividends: 24 * 60 * 60 * 1000,    // 24 hours for dividend history
};

// In-memory cache
const memoryCache = new Map();

// API call tracking
const API_CALL_KEY = 'fmp_api_calls';
const API_CALL_DATE_KEY = 'fmp_api_call_date';
const DAILY_LIMIT = 250;
const WARNING_THRESHOLD = 200;

let _fmpAvailable = null;

// Safe localStorage access helpers
const isClient = typeof window !== 'undefined';
const safeGetItem = (key) => isClient ? localStorage.getItem(key) : null;
const safeSetItem = (key, value) => { if (isClient) localStorage.setItem(key, value); };
const safeRemoveItem = (key) => { if (isClient) localStorage.removeItem(key); };
const safeLocalStorageLength = () => isClient ? localStorage.length : 0;
const safeLocalStorageKey = (i) => isClient ? localStorage.key(i) : null;

function hasFmpApiKey() {
  // Assume available until proven otherwise by server response
  return _fmpAvailable !== false;
}

/**
 * Track API calls and warn when approaching limit
 */
function trackApiCall() {
  if (!isClient) return 0;
  
  const today = new Date().toDateString();
  const storedDate = safeGetItem(API_CALL_DATE_KEY);
  
  let callCount = 0;
  if (storedDate === today) {
    callCount = parseInt(safeGetItem(API_CALL_KEY) || '0', 10);
  } else {
    safeSetItem(API_CALL_DATE_KEY, today);
  }
  
  callCount++;
  safeSetItem(API_CALL_KEY, callCount.toString());
  
  if (callCount === WARNING_THRESHOLD) {
    console.warn(`[FMP] WARNING: ${callCount}/${DAILY_LIMIT} API calls used today. ${DAILY_LIMIT - callCount} remaining.`);
  } else if (callCount >= DAILY_LIMIT) {
    console.error(`[FMP] LIMIT REACHED: ${callCount}/${DAILY_LIMIT} API calls. Further calls may fail.`);
  }
  
  return callCount;
}

/**
 * Get current API call count
 */
export function getApiCallCount() {
  if (!isClient) return { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT };
  
  const today = new Date().toDateString();
  const storedDate = safeGetItem(API_CALL_DATE_KEY);
  
  if (storedDate !== today) {
    return { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT };
  }
  
  const used = parseInt(safeGetItem(API_CALL_KEY) || '0', 10);
  return { used, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - used };
}

/**
 * Get from cache (memory first, then localStorage)
 */
function getFromCache(key, ttl) {
  // Check memory cache first
  const memCached = memoryCache.get(key);
  if (memCached && Date.now() - memCached.timestamp < ttl) {
    console.log(`[FMP Cache] Memory hit: ${key}`);
    return memCached.data;
  }
  
  if (!isClient) return null;
  
  // Check localStorage
  try {
    const stored = safeGetItem(`fmp_cache_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < ttl) {
        console.log(`[FMP Cache] Storage hit: ${key}`);
        // Refresh memory cache
        memoryCache.set(key, parsed);
        return parsed.data;
      } else {
        // Expired, remove it
        safeRemoveItem(`fmp_cache_${key}`);
      }
    }
  } catch (e) {
    console.warn('[FMP Cache] Error reading from storage:', e);
  }
  
  return null;
}

/**
 * Save to cache (both memory and localStorage)
 */
function saveToCache(key, data) {
  const cacheEntry = { data, timestamp: Date.now() };
  
  // Save to memory
  memoryCache.set(key, cacheEntry);
  
  if (!isClient) return;
  
  // Save to localStorage (with error handling for quota)
  try {
    safeSetItem(`fmp_cache_${key}`, JSON.stringify(cacheEntry));
  } catch (e) {
    console.warn('[FMP Cache] Storage full, clearing old cache');
    clearOldCache();
    try {
      safeSetItem(`fmp_cache_${key}`, JSON.stringify(cacheEntry));
    } catch (e2) {
      console.warn('[FMP Cache] Could not save to storage');
    }
  }
}

/**
 * Clear old cache entries
 */
function clearOldCache() {
  if (!isClient) return;
  
  const keysToRemove = [];
  for (let i = 0; i < safeLocalStorageLength(); i++) {
    const key = safeLocalStorageKey(i);
    if (key?.startsWith('fmp_cache_')) {
      try {
        const item = JSON.parse(safeGetItem(key));
        if (Date.now() - item.timestamp > CACHE_TTL.fundamentals) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(key => safeRemoveItem(key));
}

/**
 * Cached fetch wrapper - routes through secure server API
 */
async function cachedFetch(endpoint, symbol, cacheKey, ttl) {
  const fullCacheKey = `${cacheKey}_${symbol}`;
  
  // Check cache first
  const cached = getFromCache(fullCacheKey, ttl);
  if (cached !== null) {
    return cached;
  }
  
  // Skip if we know FMP is not available
  if (_fmpAvailable === false) {
    console.warn('[FMP] API not available');
    return null;
  }
  
  try {
    // Route through secure server API (removes apikey from client)
    const url = `${FMP_API_ROUTE}/${endpoint.replace(/[?&]apikey=[^&]*/g, '')}`;
    trackApiCall();
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 500) {
        const error = await response.json();
        if (error.error?.includes('not configured')) {
          _fmpAvailable = false;
        }
      }
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    _fmpAvailable = true;
    const data = await response.json();
    const result = Array.isArray(data) ? (data[0] || null) : data;
    
    // Cache the result
    saveToCache(fullCacheKey, result);
    
    return result;
  } catch (error) {
    console.error(`[FMP] Error fetching ${endpoint}:`, error);
    return null;
  }
}

/**
 * Fetch company profile
 */
export async function getCompanyProfile(symbol) {
  return cachedFetch(
    `profile?symbol=${symbol}`,
    symbol,
    'profile',
    CACHE_TTL.fundamentals
  );
}

/**
 * Fetch key metrics
 */
export async function getKeyMetrics(symbol) {
  return cachedFetch(
    `key-metrics?symbol=${symbol}&period=annual&limit=1`,
    symbol,
    'keymetrics',
    CACHE_TTL.fundamentals
  );
}

/**
 * Fetch financial ratios
 */
export async function getFinancialRatios(symbol) {
  return cachedFetch(
    `ratios?symbol=${symbol}&period=annual&limit=1`,
    symbol,
    'ratios',
    CACHE_TTL.fundamentals
  );
}

/**
 * Fetch dividend history (returns array)
 */
export async function getDividendHistory(symbol) {
  const fullCacheKey = `dividends_${symbol}`;
  
  const cached = getFromCache(fullCacheKey, CACHE_TTL.dividends);
  if (cached !== null) {
    return cached;
  }
  
  if (_fmpAvailable === false) return [];
  
  try {
    trackApiCall();
    const response = await fetch(`${FMP_API_ROUTE}/dividends?symbol=${symbol}`);
    if (!response.ok) throw new Error(`FMP API error: ${response.status}`);
    
    _fmpAvailable = true;
    const data = await response.json();
    const result = Array.isArray(data) ? data : (data?.historical || []);
    
    saveToCache(fullCacheKey, result);
    return result;
  } catch (error) {
    console.error('[FMP] Error fetching dividend history:', error);
    return [];
  }
}

/**
 * Fetch income statement (returns array)
 */
export async function getIncomeStatement(symbol, period = 'annual', limit = 5) {
  const fullCacheKey = `income_${symbol}_${period}_${limit}`;
  
  const cached = getFromCache(fullCacheKey, CACHE_TTL.fundamentals);
  if (cached !== null) {
    return cached;
  }
  
  if (_fmpAvailable === false) return [];
  
  try {
    trackApiCall();
    const response = await fetch(
      `${FMP_API_ROUTE}/income-statement?symbol=${symbol}&period=${period}&limit=${limit}`
    );
    if (!response.ok) throw new Error(`FMP API error: ${response.status}`);
    
    _fmpAvailable = true;
    const data = await response.json();
    saveToCache(fullCacheKey, data);
    return data;
  } catch (error) {
    console.error('[FMP] Error fetching income statement:', error);
    return [];
  }
}

/**
 * Fetch balance sheet
 */
export async function getBalanceSheet(symbol) {
  return cachedFetch(
    `balance-sheet-statement?symbol=${symbol}&period=annual&limit=1`,
    symbol,
    'balancesheet',
    CACHE_TTL.fundamentals
  );
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch earnings surprises (returns array)
 */
export async function getEarningsSurprises(symbol) {
  const fullCacheKey = `earnings_surprises_${symbol}`;
  
  const cached = getFromCache(fullCacheKey, CACHE_TTL.fundamentals);
  if (cached !== null) {
    return cached;
  }
  
  if (_fmpAvailable === false) return [];
  
  try {
    trackApiCall();
    const response = await fetchWithTimeout(`${FMP_API_ROUTE}/earnings-surprises?symbol=${symbol}`, 15000);
    if (!response.ok) throw new Error(`FMP API error: ${response.status}`);
    
    _fmpAvailable = true;
    const data = await response.json();
    const result = Array.isArray(data) ? data : [];
    
    saveToCache(fullCacheKey, result);
    return result;
  } catch (error) {
    console.error('[FMP] Error fetching earnings surprises:', error);
    return [];
  }
}

/**
 * Fetch stock quote (shorter cache for price data)
 */
export async function getStockQuote(symbol) {
  return cachedFetch(
    `quote?symbol=${symbol}`,
    symbol,
    'quote',
    CACHE_TTL.quote
  );
}

/**
 * Calculate dividend growth rate from history
 */
function calculateDividendGrowth(dividendHistory, years = 5) {
  if (!dividendHistory || dividendHistory.length < 2) return null;
  
  const now = new Date();
  const yearsAgo = new Date(now.setFullYear(now.getFullYear() - years));
  
  const recentDividends = dividendHistory.filter(d => new Date(d.date) >= yearsAgo);
  if (recentDividends.length < 2) return null;
  
  const oldestDividend = recentDividends[recentDividends.length - 1]?.dividend;
  const newestDividend = recentDividends[0]?.dividend;
  
  if (!oldestDividend || oldestDividend === 0) return null;
  
  const growthRate = ((newestDividend / oldestDividend) ** (1 / years) - 1) * 100;
  return isFinite(growthRate) ? growthRate : null;
}

/**
 * Calculate and validate payout ratio
 * Handles edge cases where API returns unreasonable values
 */
function calculatePayoutRatio(ratios, incomeStatements, dividendHistory) {
  // First, try the API value
  let payoutFromApi = ratios?.dividendPayoutRatio;
  
  if (payoutFromApi !== null && payoutFromApi !== undefined) {
    // FMP returns as decimal (0.5 = 50%), convert to percentage
    let payoutPercent = payoutFromApi * 100;
    
    // If the value seems reasonable (0-200%), use it
    if (payoutPercent >= 0 && payoutPercent <= 200) {
      return payoutPercent;
    }
  }
  
  // If API value is unreasonable, try to calculate from EPS and annual dividends
  const eps = incomeStatements?.[0]?.eps;
  if (eps && eps > 0 && dividendHistory?.length > 0) {
    // Calculate annual dividend from recent history
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const recentDividends = dividendHistory.filter(d => new Date(d.date) >= oneYearAgo);
    const annualDividend = recentDividends.reduce((sum, d) => sum + (d.dividend || 0), 0);
    
    if (annualDividend > 0) {
      const calculatedPayout = (annualDividend / eps) * 100;
      // Cap at 200% to handle edge cases
      if (calculatedPayout >= 0 && calculatedPayout <= 200) {
        return calculatedPayout;
      }
    }
  }
  
  // If we have an API value that's positive but high, cap it at 200%
  if (payoutFromApi !== null && payoutFromApi !== undefined) {
    let payoutPercent = payoutFromApi * 100;
    if (payoutPercent > 0) {
      return Math.min(payoutPercent, 200);
    }
  }
  
  return null;
}

/**
 * Calculate consecutive dividend years
 */
function calculateDividendYears(dividendHistory) {
  if (!dividendHistory || dividendHistory.length === 0) return 0;
  
  const years = new Set();
  dividendHistory.forEach(d => {
    const year = new Date(d.date).getFullYear();
    years.add(year);
  });
  
  const sortedYears = Array.from(years).sort((a, b) => b - a);
  let consecutive = 0;
  const currentYear = new Date().getFullYear();
  
  for (let i = 0; i < sortedYears.length; i++) {
    if (sortedYears[i] === currentYear - i || sortedYears[i] === currentYear - i - 1) {
      consecutive++;
    } else {
      break;
    }
  }
  
  return consecutive;
}

/**
 * OPTIMIZED: Comprehensive fetch with minimal API calls
 * Uses only essential endpoints and relies on cache
 * 
 * 5 calls per stock (when cache is empty):
 * - profile (company info, beta, market cap)
 * - ratios (P/E, dividend yield, payout ratio, ROE)
 * - dividends (dividend history)
 * - income-statement (EPS, net income, EBITDA) - limited to 5 records on free plan
 * - balance-sheet (debt, equity)
 * 
 * Skipped:
 * - key-metrics (data available in ratios)
 * - quote (price from profile, or use eToro)
 * - earnings-surprises (requires legacy subscription, not available on free plan)
 */
export async function fetchComprehensiveFundamentals(symbol) {
  if (!hasFmpApiKey()) {
    console.warn('[FMP] No API key - skipping fundamentals fetch');
    return { hasData: false, reason: 'no_api_key' };
  }

  const apiStatus = getApiCallCount();
  console.log(`[FMP] Fetching data for ${symbol} (API calls today: ${apiStatus.used}/${apiStatus.limit})`);
  
  if (apiStatus.remaining < 5) {
    console.error('[FMP] Insufficient API calls remaining. Using cached data only.');
    // Try to return cached data
    const cachedProfile = getFromCache(`profile_${symbol}`, CACHE_TTL.fundamentals * 7); // Extended TTL
    if (cachedProfile) {
      return { hasData: true, source: 'fmp_cache', ...cachedProfile };
    }
    return { hasData: false, reason: 'api_limit_reached' };
  }

  try {
    // Fetch essential endpoints (5 calls max, often fewer due to cache)
    // Note: Free plan limits income statements to 5 records
    const [
      profile,
      ratios,
      dividendHistory,
      incomeStatements,
      balanceSheet
    ] = await Promise.all([
      getCompanyProfile(symbol),
      getFinancialRatios(symbol),
      getDividendHistory(symbol),
      getIncomeStatement(symbol, 'quarter', 5), // Free plan limit is 5
      getBalanceSheet(symbol)
    ]);

    if (!profile) {
      console.warn(`[FMP] No data found for ${symbol}`);
      return { hasData: false, reason: 'not_found' };
    }

    const dividendGrowth5y = calculateDividendGrowth(dividendHistory, 5);
    const dividendYears = calculateDividendYears(dividendHistory);
    
    const nextExDate = dividendHistory?.[0]?.date || null;
    const nextPayDate = dividendHistory?.[0]?.paymentDate || null;

    const epsHistory = incomeStatements?.map(stmt => {
      const date = new Date(stmt.date);
      const year = date.getFullYear();
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      return {
        year: year,
        quarter: quarter,
        period: `Q${quarter} ${year}`,
        eps: stmt.eps
      };
    }).filter(e => e.eps !== null) || [];

    const dividendHistoryFormatted = dividendHistory?.slice(0, 20).map(d => ({
      period_label: d.date,
      dividend_amount: d.dividend
    })) || [];

    const result = {
      hasData: true,
      source: 'fmp',
      
      // From profile
      name: profile?.companyName || null,
      sector: profile?.sector || null,
      exchange: profile?.exchangeShortName || null,
      price: profile?.price || null,
      market_cap: profile?.mktCap ? profile.mktCap / 1_000_000 : null,
      beta: profile?.beta || null,
      
      // From ratios (most dividend metrics here)
      dividend_yield: ratios?.dividendYieldPercentage || (profile?.lastDiv && profile?.price ? (profile.lastDiv / profile.price) * 100 : null),
      payout_ratio: calculatePayoutRatio(ratios, incomeStatements, dividendHistory),
      pe_ratio: ratios?.priceToEarningsRatio || null,
      roe: ratios?.returnOnEquity ? ratios.returnOnEquity * 100 : null,
      
      // Calculated from dividend history
      avg_div_growth_5y: dividendGrowth5y,
      dividend_years: dividendYears,
      ex_date: nextExDate,
      dividend_pay_date: nextPayDate,
      div_distribution_sequence: dividendHistory?.[0]?.frequency || null,
      
      // From income statement
      eps: incomeStatements?.[0]?.eps || null,
      ebitda: incomeStatements?.[0]?.ebitda ? incomeStatements[0].ebitda / 1_000_000 : null,
      ebt: incomeStatements?.[0]?.incomeBeforeTax ? incomeStatements[0].incomeBeforeTax / 1_000_000 : null,
      net_income: incomeStatements?.[0]?.netIncome ? incomeStatements[0].netIncome / 1_000_000 : null,
      net_income_prev: incomeStatements?.[1]?.netIncome ? incomeStatements[1].netIncome / 1_000_000 : null,
      net_income_prev2: incomeStatements?.[2]?.netIncome ? incomeStatements[2].netIncome / 1_000_000 : null,
      diluted_shares: incomeStatements?.[0]?.weightedAverageShsOutDil ? incomeStatements[0].weightedAverageShsOutDil / 1_000_000 : null,
      basic_shares: incomeStatements?.[0]?.weightedAverageShsOut ? incomeStatements[0].weightedAverageShsOut / 1_000_000 : null,
      
      // From balance sheet
      total_debt: balanceSheet?.totalDebt ? balanceSheet.totalDebt / 1_000_000 : null,
      shareholder_equity: balanceSheet?.totalStockholdersEquity ? balanceSheet.totalStockholdersEquity / 1_000_000 : null,
      
      // History arrays
      eps_history: epsHistory,
      dividend_history: dividendHistoryFormatted,
    };

    const finalStatus = getApiCallCount();
    console.log(`[FMP] Successfully fetched data. API calls remaining: ${finalStatus.remaining}`);
    return result;
    
  } catch (error) {
    console.error('[FMP] Error fetching comprehensive fundamentals:', error);
    return { hasData: false, reason: 'error', error: error.message };
  }
}

/**
 * Force refresh cache for a symbol (use sparingly)
 */
export function invalidateCache(symbol) {
  const keysToRemove = [];
  
  // Clear memory cache
  for (const key of memoryCache.keys()) {
    if (key.includes(symbol)) {
      memoryCache.delete(key);
    }
  }
  
  // Clear localStorage cache
  if (isClient) {
    for (let i = 0; i < safeLocalStorageLength(); i++) {
      const key = safeLocalStorageKey(i);
      if (key?.startsWith('fmp_cache_') && key.includes(symbol)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => safeRemoveItem(key));
  }
  
  console.log(`[FMP] Cache invalidated for ${symbol}`);
}

/**
 * Clear all FMP cache
 */
export function clearAllCache() {
  memoryCache.clear();
  
  if (!isClient) return;
  
  const keysToRemove = [];
  for (let i = 0; i < safeLocalStorageLength(); i++) {
    const key = safeLocalStorageKey(i);
    if (key?.startsWith('fmp_cache_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => safeRemoveItem(key));
  
  console.log('[FMP] All cache cleared');
}

export { hasFmpApiKey };
