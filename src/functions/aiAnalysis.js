/**
 * AI Analysis Engine
 * Uses OpenAI API via secure server route, falls back to rule-based analysis
 */

let _openAIAvailable = null;

/**
 * Check if OpenAI API is configured (checks server-side availability)
 */
export function hasOpenAIKey() {
  // We assume it's available and let the API route handle errors
  // This is checked once per session via the first call
  return _openAIAvailable !== false;
}

/**
 * Call OpenAI API via secure server route
 */
async function callOpenAI(prompt, responseSchema) {
  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst specializing in dividend investing. Provide analysis in the exact JSON format requested.'
        },
        {
          role: 'user',
          content: prompt + '\n\nRespond with valid JSON matching this schema: ' + JSON.stringify(responseSchema)
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 500 && error.error?.includes('not configured')) {
      _openAIAvailable = false;
    }
    throw new Error(error.error || `OpenAI API error: ${response.status}`);
  }

  _openAIAvailable = true;
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Rule-based stock scoring for dividend investing
 */
function scoreStock(stock) {
  let score = 50; // Base score
  const strengths = [];
  const weaknesses = [];

  // Dividend Yield (0-15 points)
  const dividendYield = parseFloat(stock.dividend_yield) || 0;
  if (dividendYield >= 4) {
    score += 15;
    strengths.push(`High dividend yield of ${dividendYield.toFixed(2)}%`);
  } else if (dividendYield >= 2.5) {
    score += 10;
    strengths.push(`Solid dividend yield of ${dividendYield.toFixed(2)}%`);
  } else if (dividendYield >= 1) {
    score += 5;
  } else if (dividendYield < 1 && dividendYield > 0) {
    weaknesses.push(`Low dividend yield of ${dividendYield.toFixed(2)}%`);
  }

  // Dividend Years (0-20 points)
  const dividendYears = parseInt(stock.dividend_years) || 0;
  if (dividendYears >= 25) {
    score += 20;
    strengths.push(`Dividend Aristocrat with ${dividendYears} years of consecutive increases`);
  } else if (dividendYears >= 10) {
    score += 15;
    strengths.push(`Strong dividend history of ${dividendYears} consecutive years`);
  } else if (dividendYears >= 5) {
    score += 10;
    strengths.push(`Established dividend track record of ${dividendYears} years`);
  } else if (dividendYears < 5 && dividendYears > 0) {
    weaknesses.push(`Limited dividend history (${dividendYears} years)`);
  }

  // Dividend Growth (0-15 points)
  const divGrowth = parseFloat(stock.avg_div_growth_5y) || 0;
  if (divGrowth >= 10) {
    score += 15;
    strengths.push(`Excellent dividend growth rate of ${divGrowth.toFixed(1)}%`);
  } else if (divGrowth >= 5) {
    score += 10;
    strengths.push(`Healthy dividend growth of ${divGrowth.toFixed(1)}% annually`);
  } else if (divGrowth >= 2) {
    score += 5;
  } else if (divGrowth < 2) {
    weaknesses.push(`Slow dividend growth (${divGrowth.toFixed(1)}%)`);
  }

  // Payout Ratio (0-15 points)
  const payoutRatio = parseFloat(stock.payout_ratio) || 0;
  if (payoutRatio > 0 && payoutRatio <= 50) {
    score += 15;
    strengths.push(`Conservative payout ratio of ${payoutRatio.toFixed(0)}% leaves room for growth`);
  } else if (payoutRatio <= 70) {
    score += 10;
    strengths.push(`Sustainable payout ratio of ${payoutRatio.toFixed(0)}%`);
  } else if (payoutRatio <= 85) {
    score += 5;
  } else if (payoutRatio > 85) {
    score -= 5;
    weaknesses.push(`High payout ratio of ${payoutRatio.toFixed(0)}% may limit dividend growth`);
  }

  // ROE (0-10 points)
  const roe = parseFloat(stock.roe) || 0;
  if (roe >= 20) {
    score += 10;
    strengths.push(`Strong return on equity of ${roe.toFixed(1)}%`);
  } else if (roe >= 15) {
    score += 7;
  } else if (roe >= 10) {
    score += 3;
  } else if (roe < 10 && roe > 0) {
    weaknesses.push(`Below-average ROE of ${roe.toFixed(1)}%`);
  }

  // P/E Ratio evaluation
  const peRatio = parseFloat(stock.pe_ratio) || 0;
  if (peRatio > 0 && peRatio <= 15) {
    score += 10;
    strengths.push(`Attractive valuation with P/E of ${peRatio.toFixed(1)}`);
  } else if (peRatio <= 25) {
    score += 5;
  } else if (peRatio > 30) {
    score -= 5;
    weaknesses.push(`High valuation with P/E of ${peRatio.toFixed(1)}`);
  }

  // Debt to Equity
  const totalDebt = parseFloat(stock.total_debt) || 0;
  const equity = parseFloat(stock.shareholder_equity) || 1;
  const debtToEquity = equity > 0 ? totalDebt / equity : 0;
  if (debtToEquity < 0.5) {
    score += 10;
    strengths.push(`Low debt-to-equity ratio of ${debtToEquity.toFixed(2)}`);
  } else if (debtToEquity < 1) {
    score += 5;
  } else if (debtToEquity > 2) {
    score -= 10;
    weaknesses.push(`High debt-to-equity ratio of ${debtToEquity.toFixed(2)}`);
  }

  // Beta (stability)
  const beta = parseFloat(stock.beta) || 1;
  if (beta < 0.8) {
    score += 5;
    strengths.push(`Low volatility stock (Beta: ${beta.toFixed(2)})`);
  } else if (beta > 1.5) {
    score -= 5;
    weaknesses.push(`High volatility (Beta: ${beta.toFixed(2)})`);
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine risk level
  let riskLevel = 'Medium';
  if (dividendYears >= 20 && payoutRatio <= 60 && beta < 1 && debtToEquity < 1) {
    riskLevel = 'Low';
  } else if (dividendYears < 5 || payoutRatio > 80 || beta > 1.5 || debtToEquity > 2) {
    riskLevel = 'High';
  }

  return { score, strengths, weaknesses, riskLevel };
}

/**
 * Generate rule-based comparison analysis
 */
function generateRuleBasedAnalysis(stocks) {
  const stockAnalyses = stocks.map(stock => {
    const { score, strengths, weaknesses, riskLevel } = scoreStock(stock);
    return {
      ticker: stock.ticker,
      score,
      strengths: strengths.length > 0 ? strengths : ['Data analysis in progress'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Insufficient data for complete assessment'],
      risk_level: riskLevel
    };
  });

  // Sort by score descending
  stockAnalyses.sort((a, b) => b.score - a.score);

  // Assign ranks
  const ranking = stockAnalyses.map((analysis, index) => ({
    ...analysis,
    rank: index + 1
  }));

  const topPick = ranking[0];
  
  // Generate key factors
  const keyFactors = [];
  if (topPick.strengths.length > 0) {
    keyFactors.push(topPick.strengths[0]);
  }
  keyFactors.push('Dividend sustainability and growth potential');
  keyFactors.push('Financial strength and debt management');
  keyFactors.push('Valuation relative to earnings');

  // Generate recommendation reasoning
  const reasoning = `${topPick.ticker} emerges as the top pick with a score of ${topPick.score}/100. ` +
    `Key strengths include ${topPick.strengths.slice(0, 2).join(' and ').toLowerCase()}. ` +
    `The stock demonstrates ${topPick.risk_level.toLowerCase()} risk characteristics, ` +
    `making it ${topPick.risk_level === 'Low' ? 'an excellent' : topPick.risk_level === 'Medium' ? 'a solid' : 'a higher-risk'} choice for dividend investors.`;

  // Generate summary
  const summary = `Analysis of ${stocks.length} dividend stocks completed. ` +
    `${topPick.ticker} ranks #1 with the strongest overall profile for dividend investing. ` +
    ranking.slice(1).map(s => `${s.ticker} ranks #${s.rank}`).join(', ') + '. ' +
    `All rankings consider dividend yield, growth history, payout sustainability, and financial strength.`;

  return {
    ranking,
    recommendation: {
      top_pick: topPick.ticker,
      reasoning,
      key_factors: keyFactors
    },
    summary
  };
}

/**
 * Main AI Analysis function - replaces InvokeLLM
 */
export async function generateStockComparison(stocks, prompt, responseSchema) {
  console.log('[AI Analysis] Starting comparison for', stocks.map(s => s.ticker).join(', '));

  // Try OpenAI if API key is available
  if (hasOpenAIKey()) {
    try {
      console.log('[AI Analysis] Using OpenAI API');
      const result = await callOpenAI(prompt, responseSchema);
      console.log('[AI Analysis] OpenAI response received');
      return result;
    } catch (error) {
      console.warn('[AI Analysis] OpenAI failed, falling back to rule-based:', error.message);
    }
  } else {
    console.log('[AI Analysis] No OpenAI key, using rule-based analysis');
  }

  // Fallback to rule-based analysis
  return generateRuleBasedAnalysis(stocks);
}

/**
 * Single stock analysis for StockDataInput
 */
export async function generateSingleStockAnalysis(stock) {
  const { score, strengths, weaknesses, riskLevel } = scoreStock(stock);
  
  return {
    overall_score: score,
    risk_level: riskLevel,
    strengths,
    weaknesses,
    investment_thesis: strengths.length > 0 
      ? `${stock.ticker} shows ${riskLevel.toLowerCase()} risk with ${strengths[0].toLowerCase()}.`
      : `${stock.ticker} requires more data for a complete analysis.`
  };
}
