import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const ETORO_SAPI = 'https://www.etoro.com/sapi';
const ETORO_PUBLIC_API = 'https://public-api.etoro.com';
const ETORO_API_KEY = process.env.ETORO_API_KEY;
const ETORO_USER_KEY = process.env.ETORO_USER_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'AAPL';

  try {
    // Step 1: Search for instrument to get instrumentId
    const searchUrl = `${ETORO_PUBLIC_API}/api/v1/market-data/search?internalSymbolFull=${encodeURIComponent(symbol)}&pageSize=1&fields=instrumentId,internalSymbolFull`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': randomUUID(),
        'x-api-key': ETORO_API_KEY || '',
        'x-user-key': ETORO_USER_KEY || '',
      },
    });

    if (!searchResponse.ok) {
      return NextResponse.json({ error: `Search failed: ${searchResponse.status}` }, { status: 500 });
    }

    const searchData = await searchResponse.json();
    const instrument = searchData?.items?.[0];

    if (!instrument?.instrumentId) {
      return NextResponse.json({ error: `Instrument not found for ${symbol}` }, { status: 404 });
    }

    // Step 2: Fetch SAPI detailed info
    const sapiUrl = `${ETORO_SAPI}/instrumentsinfo/instruments/?instrumentId=${instrument.instrumentId}`;
    
    const sapiResponse = await fetch(sapiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!sapiResponse.ok) {
      return NextResponse.json({ error: `SAPI failed: ${sapiResponse.status}` }, { status: 500 });
    }

    const sapiData = await sapiResponse.json();
    const detailedInfo = sapiData?.items?.[0];

    if (!detailedInfo) {
      return NextResponse.json({ error: 'No detailed info available' }, { status: 404 });
    }

    // Analyze all fields
    const allKeys = Object.keys(detailedInfo).sort();
    
    const categories = {
      revenue: allKeys.filter(k => k.toLowerCase().includes('revenue')),
      eps: allKeys.filter(k => k.toLowerCase().includes('eps') || (k.toLowerCase().includes('earning') && !k.toLowerCase().includes('growth'))),
      earningsGrowth: allKeys.filter(k => k.toLowerCase().includes('earning') && k.toLowerCase().includes('growth')),
      surprise: allKeys.filter(k => k.toLowerCase().includes('surprise') || k.toLowerCase().includes('actual') || k.toLowerCase().includes('estimate')),
      quarterly: allKeys.filter(k => /quarter|q[1-4]/i.test(k)),
      dividend: allKeys.filter(k => k.toLowerCase().includes('dividend')),
      sector: allKeys.filter(k => k.toLowerCase().includes('sector') || k.toLowerCase().includes('industry')),
      credit: allKeys.filter(k => k.toLowerCase().includes('credit') || k.toLowerCase().includes('rating')),
      tipranks: allKeys.filter(k => k.toLowerCase().includes('tiprank')),
      sentiment: allKeys.filter(k => k.toLowerCase().includes('sentiment') || k.toLowerCase().includes('news')),
      pe: allKeys.filter(k => k.toLowerCase().includes('pe') || k.toLowerCase().includes('p/e')),
      sp500: allKeys.filter(k => k.toLowerCase().includes('sp500') || k.toLowerCase().includes('s&p') || k.toLowerCase().includes('benchmark')),
      ttm: allKeys.filter(k => k.includes('-TTM')),
      annual: allKeys.filter(k => k.includes('-Annual')),
    };

    // Get sample values for interesting fields
    const interestingFields = [
      // Revenue
      'totalRevenue-TTM', 'totalRevenue-Annual', 'revenue-TTM', 'grossRevenue-TTM',
      'revenuePerShare-TTM', 'revenuePerShare-Annual',
      // EPS & Earnings
      'epS-TTM', 'epS-Annual', 'epsFullyDiluted-TTM', 'quarterlyEPSValue', 'annualEPSValue',
      'actualEPS', 'expectedEPS', 'epsSurprise', 'earningsSurprise',
      'nextEarningEstimateAverage', 'lastEarningEstimateAverage',
      'earningsGrowth-TTM', 'epsGrowth1Year', 'epsGrowth5Years',
      // Sector/Industry PE
      'sectorPE', 'industryPE', 'sectorPeRatio', 'industryPeRatio',
      'sp500PE', 'benchmarkPE', 'marketPE',
      // TipRanks
      'tipranksConsensus', 'tipranksTotalAnalysts', 'tipranksTargetPrice', 
      'tipranksTargetPriceUpside', 'tipranksBestAnalystConsensus',
      // Credit
      'creditRating', 'debtRating', 'bondRating', 'creditScore',
      // Sentiment
      'newsSentiment', 'socialSentiment', 'marketSentiment',
      // Other
      'historicDividends', 'dividendHistory',
    ];

    const sampleValues: Record<string, unknown> = {};
    interestingFields.forEach(field => {
      if (detailedInfo[field] !== undefined) {
        const value = detailedInfo[field];
        // Truncate arrays for readability
        if (Array.isArray(value)) {
          sampleValues[field] = `[Array with ${value.length} items]`;
        } else {
          sampleValues[field] = value;
        }
      }
    });

    // Find fields we're NOT currently using that might be useful
    const currentlyUsedFields = [
      'dividendYieldDaily-TTM', '5YearAnnualDividendGrowthRate-Annual', 'companyName-Annual',
      'sectorName-Annual', 'lowPriceLast52Weeks-TTM', 'highPriceLast52Weeks-TTM',
      'marketCapitalization-TTM', 'dividendPayoutRatio-Annual', 'peRatio-TTM',
      'peRatioFiscal-TTM', 'pegRatio-TTM', 'priceToBook-Annual', 'priceToBook-TTM',
      'priceToSales-Annual', 'priceToSales-TTM', 'priceToCashFlow-Annual', 'priceToCashFlow-TTM',
      'returnOnCommonEquity-Annual', 'returnOnAverageTotalEquity-TTM', 'returnOnAssets-Annual',
      'returnOnAssets-TTM', 'beta-TTM', 'beta-Annual', 'epS-TTM', 'epS-Annual',
      'epsFullyDiluted-TTM', 'epsFullyDiluted-Annual', 'earningsGrowth-TTM',
      'ebitdA-TTM', 'ebitdA-Annual', 'pretaxIncome-TTM', 'pretaxIncome-Annual',
      'netIncomeTotalOperations-TTM', 'netIncomeTotalOperations-Annual',
      'totalDebt-TTM', 'totalDebt-Annual', 'totalShareholdersEquity-TTM',
      'totalShareholdersEquity-Annual', 'sharesOutstanding-Annual',
      'commonSharesUsedToCalculateEPSFullyDiluted-Annual', 'grossIncomeMargin-TTM',
      'grossIncomeMargin-Annual', 'operatingMargin-TTM', 'operatingMargin-Annual',
      'netMargin-TTM', 'netMargin-Annual', 'ebitdaMargin-TTM', 'ebitdaMargin-Annual',
      '1YearAnnualRevenueGrowthRate-Annual', '1YearAnnualRevenueGrowthRate-TTM',
      '3YearAnnualRevenueGrowthRate-Annual', '3YearAnnualRevenueGrowthRate-TTM',
      '5YearAnnualRevenueGrowthRate-Annual', '5YearAnnualRevenueGrowthRate-TTM',
      '3YearAnnualIncomeGrowthRate-Annual', '3YearAnnualIncomeGrowthRate-TTM',
      '5YearAnnualIncomeGrowthRate-Annual', '5YearAnnualIncomeGrowthRate-TTM',
      'tipranksConsensus', 'tipranksTotalAnalysts', 'tipranksTargetPrice',
      'tipranksTargetPriceUpside', 'arabesqueESGTotal', 'arabesqueESGEnvironment',
      'arabesqueESGSocial', 'arabesqueESGGovernance', 'currentRatio-TTM',
      'currentRatio-Annual', 'quickRatio-TTM', 'quickRatio-Annual',
      'freeCashFlow-TTM', 'freeCashFlow-Annual', 'totalEnterpriseValue-TTM',
      'totalEnterpriseValue-Annual', 'institutionalHoldingPct',
      'percentOfSharesOutstandingHeldByInsiders-TTM', 'numberOfEmployees-TTM',
      'numberOfEmployees-Annual', 'shortBio-en-us', 'businessDescription-TTM',
      'historicDividends', 'currentRate', 'nextEarningDate', 'dividendExDate',
      'epsGrowth1Year', 'epsGrowth5Years', 'quarterlyEPSValue', 'annualEPSValue',
      'nextEarningEstimateAverage', 'lastEarningEstimateAverage',
    ];

    const unusedFields = allKeys.filter(k => !currentlyUsedFields.includes(k));

    return NextResponse.json({
      symbol,
      instrumentId: instrument.instrumentId,
      totalFields: allKeys.length,
      categories,
      sampleValues,
      unusedFieldsCount: unusedFields.length,
      unusedFields: unusedFields.slice(0, 100), // Limit to first 100
      allFieldsSorted: allKeys,
    });

  } catch (error) {
    console.error('[Test SAPI] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
