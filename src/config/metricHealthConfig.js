/**
 * Centralized threshold configuration for dividend metric health indicators.
 *
 * Each metric defines ordered `ranges` evaluated top-to-bottom (first match wins).
 * `getMetricHealth(key, value)` returns { status, label, color, explanation } or null.
 */

export const metricHealthConfig = {
  dividend_yield: {
    label: "Dividend Yield",
    ranges: [
      { min: 2, max: 6, status: "good", label: "Healthy yield", color: "green" },
      { min: 6, max: 8, status: "caution", label: "High — check sustainability", color: "amber" },
      { min: 8, max: Infinity, status: "warning", label: "Very high — may be unsustainable", color: "red" },
      { min: 0, max: 2, status: "low", label: "Low yield", color: "amber" },
    ],
    explanation: "Annual dividend income as a % of stock price. 2–6% is typical for quality dividend stocks.",
  },

  payout_ratio: {
    label: "Payout Ratio",
    ranges: [
      { min: 0, max: 60, status: "good", label: "Sustainable", color: "green" },
      { min: 60, max: 80, status: "caution", label: "Moderate — room tightening", color: "amber" },
      { min: 80, max: Infinity, status: "warning", label: "High — dividend may be at risk", color: "red" },
    ],
    explanation: "% of earnings paid as dividends. Under 60% leaves room for growth and safety.",
  },

  chowder: {
    label: "Chowder Number",
    ranges: [
      { min: 12, max: Infinity, status: "good", label: "Strong", color: "green" },
      { min: 8, max: 12, status: "caution", label: "Moderate", color: "amber" },
      { min: -Infinity, max: 8, status: "warning", label: "Weak", color: "red" },
    ],
    explanation: "Yield + 5-year dividend growth. Above 12 is strong for dividend growth investors.",
  },

  roe: {
    label: "ROE",
    ranges: [
      { min: 20, max: Infinity, status: "good", label: "Excellent profitability", color: "green" },
      { min: 15, max: 20, status: "good", label: "Good profitability", color: "green" },
      { min: 10, max: 15, status: "caution", label: "Moderate profitability", color: "amber" },
      { min: -Infinity, max: 10, status: "warning", label: "Low profitability", color: "red" },
    ],
    explanation: "Return on Equity — how efficiently the company uses shareholders' capital. 15%+ is generally good.",
  },

  dividend_years: {
    label: "Dividend Years",
    ranges: [
      { min: 25, max: Infinity, status: "good", label: "Dividend Aristocrat", color: "green" },
      { min: 10, max: 25, status: "caution", label: "Established payer", color: "amber" },
      { min: 0, max: 10, status: "warning", label: "Shorter track record", color: "red" },
    ],
    explanation: "Consecutive years of dividend increases. 25+ qualifies as a Dividend Aristocrat.",
  },

  avg_div_growth_5y: {
    label: "5Y Div Growth",
    ranges: [
      { min: 10, max: Infinity, status: "good", label: "Strong growth", color: "green" },
      { min: 5, max: 10, status: "caution", label: "Moderate growth", color: "amber" },
      { min: 0, max: 5, status: "warning", label: "Slow growth", color: "red" },
      { min: -Infinity, max: 0, status: "warning", label: "Declining", color: "red" },
    ],
    explanation: "Average annual dividend growth over 5 years. 10%+ is strong; under 5% may lag inflation.",
  },

  debt_to_equity: {
    label: "Debt/Equity",
    ranges: [
      { min: 0, max: 0.5, status: "good", label: "Low leverage", color: "green" },
      { min: 0.5, max: 1, status: "caution", label: "Moderate leverage", color: "amber" },
      { min: 1, max: 2, status: "caution", label: "Elevated leverage", color: "amber" },
      { min: 2, max: Infinity, status: "warning", label: "High leverage", color: "red" },
    ],
    explanation: "Total debt divided by equity. Under 0.5 is conservative; above 2 can signal risk.",
  },

  pe_ratio: {
    label: "P/E Ratio",
    ranges: [
      { min: 0, max: 15, status: "good", label: "Undervalued", color: "green" },
      { min: 15, max: 25, status: "caution", label: "Fairly valued", color: "amber" },
      { min: 25, max: Infinity, status: "warning", label: "Expensive", color: "red" },
    ],
    explanation: "Price relative to earnings. Under 15 may be undervalued; above 25 is pricey.",
  },

  beta: {
    label: "Beta",
    ranges: [
      { min: 0, max: 0.8, status: "good", label: "Low volatility", color: "green" },
      { min: 0.8, max: 1.2, status: "caution", label: "Market-like volatility", color: "amber" },
      { min: 1.2, max: Infinity, status: "warning", label: "High volatility", color: "red" },
    ],
    explanation: "Volatility vs. the market. Under 0.8 is defensive; above 1.2 swings more than the S&P 500.",
  },

  five_year_total_return: {
    label: "5Y Total Return",
    ranges: [
      { min: 50, max: Infinity, status: "good", label: "Strong returns", color: "green" },
      { min: 20, max: 50, status: "caution", label: "Moderate returns", color: "amber" },
      { min: -Infinity, max: 20, status: "warning", label: "Weak returns", color: "red" },
    ],
    explanation: "Total return (price + dividends) over 5 years. Above 50% is strong performance.",
  },

  dividend_stability_score: {
    label: "Stability Score",
    ranges: [
      { min: 80, max: Infinity, status: "good", label: "Very stable", color: "green" },
      { min: 50, max: 80, status: "caution", label: "Moderately stable", color: "amber" },
      { min: -Infinity, max: 50, status: "warning", label: "Unstable", color: "red" },
    ],
    explanation: "Historical consistency of dividend payments. Higher = more predictable income.",
  },
};

/**
 * Evaluate a metric value against its health thresholds.
 *
 * @param {string} metricKey  Key from metricHealthConfig (e.g. "dividend_yield")
 * @param {number|string|null|undefined} rawValue  The metric value
 * @returns {{ status: string, label: string, color: string, explanation: string } | null}
 */
export function getMetricHealth(metricKey, rawValue) {
  const config = metricHealthConfig[metricKey];
  if (!config) return null;

  if (rawValue === null || rawValue === undefined || rawValue === "") return null;

  const value = typeof rawValue === "string" ? parseFloat(rawValue) : rawValue;
  if (isNaN(value)) return null;

  for (const range of config.ranges) {
    const min = range.min ?? -Infinity;
    const max = range.max ?? Infinity;
    if (value >= min && value < max) {
      return {
        status: range.status,
        label: range.label,
        color: range.color,
        explanation: config.explanation,
      };
    }
  }

  return null;
}

/**
 * Canonical metric glossary — single source of truth for every metric
 * explanation shown in the app (analysis, compare, forms, charts).
 *
 * `short` — one-liner for compact UI (compare table, badges).
 * `long`  — full explanation for detail views (stock analysis cards).
 */
export const metricGlossary = {
  // --- Dividend metrics ---
  dividend_yield: {
    short: "Annual dividend / stock price. Higher is generally better.",
    long: "Annual dividend per share divided by the stock's current price, expressed as a percentage. Indicates the return from dividends relative to price.",
  },
  payout_ratio: {
    short: "% of earnings paid as dividends. Under 70% is usually sustainable.",
    long: "The percentage of a company's earnings paid out as dividends. A lower ratio (e.g., below 60-70%) may indicate more sustainable dividends and room for growth.",
  },
  avg_div_growth_5y: {
    short: "Average annual dividend growth over the last 5 years.",
    long: "The average annual growth rate of the company's dividend payments over the past 5 years.",
  },
  chowder: {
    short: "Yield + 5Y dividend growth. Above 10.5-12 is attractive.",
    long: "Calculated as Dividend Yield + 5-Year Dividend Growth Rate. A score above 10.5 is often considered good for dividend growth investors.",
  },
  dividend_years: {
    short: "Consecutive years of dividend increases. Longer = more reliable.",
    long: "The number of consecutive years the company has paid/increased a dividend. A long history indicates reliability. 25+ qualifies as a Dividend Aristocrat.",
  },
  dividend_stability_score: {
    short: "Historical stability of dividend payments. Higher is better.",
    long: "A score indicating the historical consistency of dividend payments. Higher values mean more predictable income.",
  },
  dividend_payout_history: {
    short: "Dividend payment consistency and growth history.",
    long: "Information about the company's dividend payment consistency and growth.",
  },
  ex_date: {
    short: "Buy before this date to receive the next dividend.",
    long: "The date when the stock begins trading without the dividend. You must own shares before this date to receive the upcoming dividend.",
  },
  dividend_pay_date: {
    short: "Date the dividend is paid to eligible shareholders.",
    long: "The date when the dividend is actually paid to shareholders who owned the stock before the ex-dividend date.",
  },

  // --- Price metrics ---
  price: {
    short: "Most recent trading price.",
    long: "The most recent trading price of the stock.",
  },
  min_52w: {
    short: "Lowest price in the past 52 weeks.",
    long: "The lowest price the stock has traded at over the past 52 weeks.",
  },
  max_52w: {
    short: "Highest price in the past 52 weeks.",
    long: "The highest price the stock has traded at over the past 52 weeks.",
  },

  // --- Valuation metrics ---
  pe_ratio: {
    short: "Price / Earnings. Under 15 may be undervalued; above 25 is pricey.",
    long: "Price-to-Earnings ratio (Current Share Price / Earnings Per Share). Indicates how much investors are willing to pay per dollar of earnings.",
  },
  sector_pe: {
    short: "Average P/E for companies in the same sector.",
    long: "The average P/E ratio for companies in the same industry sector.",
  },
  sp500_pe: {
    short: "Average P/E of the S&P 500 index.",
    long: "The average P/E ratio of the S&P 500 index.",
  },
  eps: {
    short: "Net Income per share. Higher EPS = stronger profitability.",
    long: "Earnings Per Share (Net Income - Preferred Dividends / Average Outstanding Shares).",
  },

  // --- Financial strength ---
  roe: {
    short: "How efficiently the company uses shareholders' capital. 15%+ is good.",
    long: "Return on Equity. Measures a company's profitability by revealing how much profit a company generates with the money shareholders have invested (Net Income / Shareholder's Equity). A value of 15% or higher is generally considered good.",
  },
  beta: {
    short: "Volatility vs. the market. < 1 = less volatile; > 1 = more.",
    long: "A measure of a stock's volatility in relation to the overall market (usually S&P 500). Beta < 1 means less volatile than market; Beta > 1 means more volatile.",
  },
  credit_rating: {
    short: "Creditworthiness rating from agencies like S&P or Moody's.",
    long: "An assessment of a company's creditworthiness by rating agencies (e.g., S&P, Moody's). Higher ratings (e.g., AAA, AA) indicate lower risk of default.",
  },
  market_cap: {
    short: "Total value of outstanding shares. Larger = more stable.",
    long: "Total market value of a company's outstanding shares (Current Share Price x Total Shares Outstanding). Indicates company size.",
  },
  debt_to_equity: {
    short: "Debt / Equity. Lower is safer; above 2 can signal risk.",
    long: "Total Debt / Shareholder Equity. A measure of financial leverage. Lower is generally better. Acceptable levels vary by industry.",
  },
  ebt: {
    short: "Profit before corporate income tax.",
    long: "Earnings Before Tax. Represents a company's profit before deducting corporate income tax expenses.",
  },

  // --- Returns ---
  five_year_total_return: {
    short: "Price + dividends over 5 years. Above 50% is strong.",
    long: "The total return of the stock over the past 5 years, including price appreciation and dividends. Higher is better.",
  },

  // --- Charts ---
  eps_surprise: {
    short: "Actual vs expected quarterly EPS.",
    long: "This chart shows quarterly earnings per share (EPS) performance comparing actual reported earnings against analyst expectations. Green indicates the company beat expectations, while red indicates a miss.",
  },
  eps_trend: {
    short: "Quarterly EPS trend over time.",
    long: "Earnings Per Share (EPS) indicates company profitability per outstanding share. Higher EPS suggests stronger profitability.",
  },
};

/** Tailwind text-color class for a health color token. */
export function healthTextClass(color) {
  switch (color) {
    case "green": return "text-green-400";
    case "amber": return "text-amber-400";
    case "red":   return "text-red-400";
    default:      return "text-slate-400";
  }
}

/** Tailwind bg-dot class for a health color token. */
export function healthDotClass(color) {
  switch (color) {
    case "green": return "bg-green-400";
    case "amber": return "bg-amber-400";
    case "red":   return "bg-red-400";
    default:      return "bg-slate-400";
  }
}

/** Badge styling classes for a health color token. */
export function healthBadgeClasses(color) {
  switch (color) {
    case "green": return "bg-green-900/50 text-green-300 border-green-700";
    case "amber": return "bg-amber-900/50 text-amber-300 border-amber-700";
    case "red":   return "bg-red-900/50 text-red-300 border-red-700";
    default:      return "bg-slate-700 text-slate-400 border-slate-600";
  }
}
