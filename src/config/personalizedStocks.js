/**
 * Personalized Stock Lists Configuration
 * 
 * These curated lists are used to prioritize stocks based on the user's
 * onboarding choices (investment goal + risk tolerance).
 * 
 * The stocks are well-known dividend aristocrats categorized by their characteristics.
 */

// Stocks optimized for each investment goal
const goalStocks = {
  // High-yield, stable dividend payers for income-focused investors
  income: [
    'VZ',      // Verizon - High yield telecom
    'T',       // AT&T - High yield telecom
    'MO',      // Altria - High yield tobacco
    'PM',      // Philip Morris - High yield tobacco
    'O',       // Realty Income - Monthly dividend REIT
    'ABBV',    // AbbVie - High yield pharma
    'XOM',     // Exxon Mobil - Energy dividend
    'CVX',     // Chevron - Energy dividend
    'IBM',     // IBM - Tech with high yield
    'KMI',     // Kinder Morgan - Midstream energy
    'EPD',     // Enterprise Products - MLP high yield
    'MMM',     // 3M - Industrial dividend
    'WBA',     // Walgreens - Retail pharmacy
    'DOW',     // Dow Inc - Materials
    'LYB',     // LyondellBasell - Chemicals
  ],

  // Companies with strong dividend growth potential
  growth: [
    'AAPL',    // Apple - Tech growth + dividend
    'MSFT',    // Microsoft - Tech growth + dividend
    'V',       // Visa - Payment growth
    'MA',      // Mastercard - Payment growth
    'HD',      // Home Depot - Retail growth
    'COST',    // Costco - Retail growth
    'UNH',     // UnitedHealth - Healthcare growth
    'AVGO',    // Broadcom - Semiconductor
    'LMT',     // Lockheed Martin - Defense
    'TXN',     // Texas Instruments - Semiconductor
    'ACN',     // Accenture - Consulting
    'LOW',     // Lowe's - Home improvement
    'CAT',     // Caterpillar - Industrial
    'DE',      // Deere - Agriculture
    'SPGI',    // S&P Global - Financial data
  ],

  // Mix of yield and growth - balanced approach
  balanced: [
    'JNJ',     // Johnson & Johnson - Healthcare stalwart
    'PG',      // Procter & Gamble - Consumer staples
    'KO',      // Coca-Cola - Beverage king
    'PEP',     // PepsiCo - Beverage/snacks
    'JPM',     // JPMorgan - Banking leader
    'WMT',     // Walmart - Retail giant
    'MRK',     // Merck - Pharma
    'LLY',     // Eli Lilly - Pharma growth
    'AMGN',    // Amgen - Biotech
    'NEE',     // NextEra Energy - Utility
    'DUK',     // Duke Energy - Utility
    'MCD',     // McDonald's - Fast food
    'CL',      // Colgate-Palmolive - Consumer
    'ITW',     // Illinois Tool Works - Industrial
    'ADP',     // ADP - Business services
  ],
};

// Risk-based adjustments - these can override or supplement goal stocks
const riskStocks = {
  // Ultra-stable, low volatility companies
  conservative: [
    'JNJ',     // Johnson & Johnson - Defensive healthcare
    'PG',      // Procter & Gamble - Consumer staples king
    'KO',      // Coca-Cola - Iconic brand
    'WMT',     // Walmart - Recession resistant
    'MCD',     // McDonald's - Consistent performer
    'CL',      // Colgate-Palmolive - Stable consumer
    'CLX',     // Clorox - Defensive consumer
    'GIS',     // General Mills - Food staple
    'K',       // Kellogg - Food staple
    'HRL',     // Hormel Foods - Food
    'KMB',     // Kimberly-Clark - Consumer essentials
    'ED',      // Consolidated Edison - Utility
    'SO',      // Southern Company - Utility
    'WEC',     // WEC Energy - Utility
    'AEP',     // American Electric Power - Utility
  ],

  // Standard selection - no overrides
  moderate: [],

  // Higher growth potential, accepts more volatility
  aggressive: [
    'NVDA',    // NVIDIA - AI/GPU leader
    'AMD',     // AMD - Semiconductor
    'QCOM',    // Qualcomm - Mobile chips
    'AMAT',    // Applied Materials - Semiconductor equipment
    'LRCX',    // Lam Research - Semiconductor equipment
    'KLAC',    // KLA Corp - Semiconductor equipment
    'MRVL',    // Marvell Technology - Semiconductor
    'NXPI',    // NXP Semiconductors - Auto chips
    'ON',      // ON Semiconductor - Power chips
    'STX',     // Seagate - Storage
    'WDC',     // Western Digital - Storage
    'HPQ',     // HP Inc - Tech hardware
    'DELL',    // Dell Technologies - Tech
    'STM',     // STMicroelectronics - European semi
    'ADI',     // Analog Devices - Analog chips
  ],
};

// Filter-specific stock recommendations
export const filterStocks = {
  // High yield focus (dividend yield >= 4%)
  highYield: [
    'VZ', 'T', 'MO', 'PM', 'O', 'ABBV', 'XOM', 'CVX', 'IBM', 'KMI',
    'EPD', 'MMM', 'WBA', 'DOW', 'LYB', 'BTI', 'AGNC', 'NLY', 'ARCC', 'MAIN'
  ],

  // Growth focus (high dividend growth rate)
  growth: [
    'AAPL', 'MSFT', 'V', 'MA', 'HD', 'COST', 'UNH', 'AVGO', 'LMT', 'TXN',
    'ACN', 'LOW', 'CAT', 'DE', 'SPGI', 'BLK', 'ICE', 'CME', 'TROW', 'AME'
  ],

  // Low risk focus (beta <= 0.8)
  lowRisk: [
    'JNJ', 'PG', 'KO', 'WMT', 'MCD', 'CL', 'CLX', 'GIS', 'K', 'HRL',
    'KMB', 'ED', 'SO', 'WEC', 'AEP', 'DUK', 'NEE', 'XEL', 'AWK', 'SJW'
  ],
};

/**
 * Get personalized ticker list based on user's investment preferences
 * @param {string} investmentGoal - 'income' | 'growth' | 'balanced' | null
 * @param {string} riskTolerance - 'conservative' | 'moderate' | 'aggressive' | null
 * @returns {string[]} Array of ticker symbols prioritized for the user
 */
export const getPersonalizedTickers = (investmentGoal, riskTolerance) => {
  // Start with goal-based stocks
  const baseStocks = goalStocks[investmentGoal] || goalStocks.balanced;
  
  // Get risk-based adjustments
  const riskAdjustments = riskStocks[riskTolerance] || [];
  
  // If conservative or aggressive, prioritize risk-based stocks
  // For moderate, just use goal-based stocks
  if (riskTolerance === 'conservative') {
    // Conservative: Risk stocks first, then goal stocks
    const combined = [...new Set([...riskAdjustments, ...baseStocks])];
    return combined;
  } else if (riskTolerance === 'aggressive') {
    // Aggressive: Mix of goal stocks and aggressive options
    const combined = [...new Set([...baseStocks, ...riskAdjustments])];
    return combined;
  }
  
  // Moderate: Just goal-based stocks
  return baseStocks;
};

/**
 * Get stocks for a specific filter category
 * @param {string} filterType - 'highYield' | 'growth' | 'lowRisk'
 * @returns {string[]} Array of ticker symbols for the filter
 */
export const getFilterTickers = (filterType) => {
  return filterStocks[filterType] || [];
};

/**
 * Check if a ticker is in the personalized list
 * @param {string} ticker - Stock ticker symbol
 * @param {string[]} personalizedList - Array of personalized tickers
 * @returns {boolean}
 */
export const isPersonalizedStock = (ticker, personalizedList) => {
  if (!ticker || !personalizedList) return false;
  return personalizedList.includes(ticker.toUpperCase());
};

export default {
  goalStocks,
  riskStocks,
  filterStocks,
  getPersonalizedTickers,
  getFilterTickers,
  isPersonalizedStock,
};
