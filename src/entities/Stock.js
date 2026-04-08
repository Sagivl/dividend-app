import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const supabase = getSupabaseBrowserClient();

/** Column names that actually exist in the `stocks` Supabase table.
 *  Only these keys are sent to Postgres on create / update. */
const DB_COLUMNS = new Set([
  'ticker', 'exchange', 'name', 'sector', 'price',
  'min_52w', 'max_52w', 'target_1y', 'market_cap',
  'pe_ratio', 'sector_pe', 'sp500_pe', 'eps',
  'dividend_yield', 'ex_date', 'dividend_pay_date',
  'dividend_years', 'avg_div_growth_5y', 'avg_div_growth_20y',
  'div_distribution_sequence', 'payout_ratio', 'chowder',
  'beta', 'roe', 'credit_rating',
  'diluted_shares', 'basic_shares',
  'ebit', 'ebitda', 'net_income',
  'net_income_prev', 'net_income_prev2', 'net_income_minus_buyback',
  'total_debt', 'shareholder_equity', 'ebt',
  'five_year_total_return', 'dividend_stability_score',
  'revenue_history', 'eps_history', 'price_history',
  'dividend_history', 'eps_surprise_history',
  'news_sentiment', 'analyst_recommendation',
  'logo50x50', 'logo150x150',
  'last_updated', 'is_sample',
]);

/** Columns stored as `bigint` or `integer` in Postgres — must be whole numbers. */
const INTEGER_COLUMNS = new Set([
  'diluted_shares', 'basic_shares', 'dividend_years',
]);

function sanitizeForPersistence(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (!DB_COLUMNS.has(k)) continue;
    if (v === undefined) continue;
    if (INTEGER_COLUMNS.has(k) && typeof v === 'number') {
      out[k] = Math.round(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Merge a row returned from Supabase with the object we just fetched from eToro
 * so the Analysis tab always reflects the latest API values (even if the DB
 * response omits columns or lags).
 */
export function mergeFetchedStockForDisplay(dbRow, fetchedRow) {
  if (!dbRow && !fetchedRow) return null;
  if (!fetchedRow) return dbRow;
  if (!dbRow) return { ...fetchedRow };
  const merged = { ...dbRow };
  for (const [key, val] of Object.entries(fetchedRow)) {
    if (key.startsWith('_')) continue;
    if (val === null || val === undefined) continue;
    if (val === '' && merged[key] !== undefined) continue;
    merged[key] = val;
  }
  merged.id = dbRow.id;
  if (dbRow.ticker) merged.ticker = dbRow.ticker;
  return merged;
}

export const Stock = {
  schema() {
    return {
      properties: {
        ticker: { type: 'string' },
        exchange: { type: 'string' },
        name: { type: 'string' },
        sector: { type: 'string' },
        price: { type: 'number' },
        min_52w: { type: 'number' },
        max_52w: { type: 'number' },
        target_1y: { type: 'number' },
        market_cap: { type: 'number' },
        pe_ratio: { type: 'number' },
        sector_pe: { type: 'number' },
        sp500_pe: { type: 'number' },
        eps: { type: 'number' },
        dividend_yield: { type: 'number' },
        ex_date: { type: 'string' },
        dividend_pay_date: { type: 'string' },
        dividend_years: { type: 'number' },
        avg_div_growth_5y: { type: 'number' },
        avg_div_growth_20y: { type: 'number' },
        div_distribution_sequence: { type: 'string' },
        payout_ratio: { type: 'number' },
        chowder: { type: 'number' },
        beta: { type: 'number' },
        roe: { type: 'number' },
        credit_rating: { type: 'string' },
        diluted_shares: { type: 'number' },
        basic_shares: { type: 'number' },
        ebit: { type: 'number' },
        ebitda: { type: 'number' },
        net_income: { type: 'number' },
        net_income_prev: { type: 'number' },
        net_income_prev2: { type: 'number' },
        net_income_minus_buyback: { type: 'number' },
        total_debt: { type: 'number' },
        shareholder_equity: { type: 'number' },
        ebt: { type: 'number' },
        five_year_total_return: { type: 'number' },
        dividend_stability_score: { type: 'number' },
        revenue_history: { type: 'array' },
        eps_history: { type: 'array' },
        price_history: { type: 'array' },
        dividend_history: { type: 'array' },
        eps_surprise_history: { type: 'array' },
        news_sentiment: { type: 'object' },
        analyst_recommendation: { type: 'object' },
        logo50x50: { type: 'string' },
        logo150x150: { type: 'string' }
      }
    };
  },

  /** Columns needed for listing / card display (excludes heavy JSON arrays). */
  LIST_COLUMNS: [
    'id', 'ticker', 'exchange', 'name', 'sector', 'price',
    'min_52w', 'max_52w', 'target_1y', 'market_cap',
    'pe_ratio', 'sector_pe', 'sp500_pe', 'eps',
    'dividend_yield', 'ex_date', 'dividend_pay_date',
    'dividend_years', 'avg_div_growth_5y', 'avg_div_growth_20y',
    'div_distribution_sequence', 'payout_ratio', 'chowder',
    'beta', 'roe', 'credit_rating',
    'diluted_shares', 'basic_shares',
    'ebit', 'ebitda', 'net_income',
    'net_income_prev', 'net_income_prev2', 'net_income_minus_buyback',
    'total_debt', 'shareholder_equity', 'ebt',
    'five_year_total_return', 'dividend_stability_score',
    'news_sentiment', 'analyst_recommendation',
    'logo50x50', 'logo150x150',
    'last_updated', 'is_sample', 'created_at',
  ].join(','),

  async list(sortBy = '-last_updated') {
    let query = supabase.from('stocks').select(this.LIST_COLUMNS);

    if (sortBy.startsWith('-')) {
      const field = sortBy.slice(1);
      query = query.order(field, { ascending: false });
    } else {
      query = query.order(sortBy, { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async listByTickers(tickers) {
    if (!tickers || tickers.length === 0) return [];
    const { data, error } = await supabase
      .from('stocks')
      .select(this.LIST_COLUMNS)
      .in('ticker', tickers);
    if (error) throw error;
    return data || [];
  },

  async filter(criteria, { fullColumns = false } = {}) {
    let query = supabase.from('stocks').select(fullColumns ? '*' : this.LIST_COLUMNS);

    for (const [key, value] of Object.entries(criteria)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(data) {
    const clean = sanitizeForPersistence(data);
    const ticker = clean.ticker?.toUpperCase?.()?.trim?.();
    const row = ticker ? { ...clean, ticker } : clean;

    const { data: stock, error } = await supabase
      .from('stocks')
      .upsert(row, { onConflict: 'ticker', ignoreDuplicates: false })
      .select()
      .single();

    if (error) throw error;
    return stock;
  },

  async update(id, data) {
    const clean = sanitizeForPersistence(data);
    const { data: updated, error } = await supabase
      .from('stocks')
      .update(clean)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  async delete(id) {
    const { error } = await supabase
      .from('stocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async get(id) {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async seedSampleStocks() {
    const { data: existing } = await supabase
      .from('stocks')
      .select('id')
      .eq('is_sample', true)
      .limit(1);

    if (existing && existing.length > 0) {
      return false;
    }

    try {
      const sampleStocksModule = await import('@/data/sampleStocks');
      const sampleStocks = sampleStocksModule.default;

      const rows = sampleStocks.map(stock => {
        const clean = sanitizeForPersistence({ ...stock, is_sample: true });
        if (clean.ticker) clean.ticker = clean.ticker.toUpperCase().trim();
        return clean;
      });

      const { error } = await supabase
        .from('stocks')
        .upsert(rows, { onConflict: 'ticker', ignoreDuplicates: true });

      if (error) throw error;

      console.log(`Seeded ${rows.length} sample stocks (batch)`);
      return true;
    } catch (error) {
      console.error('Error seeding sample stocks:', error);
      return false;
    }
  },

  async clearSampleStocks() {
    const { error } = await supabase
      .from('stocks')
      .delete()
      .eq('is_sample', true);

    if (error) throw error;
    return true;
  },

  async hasSampleStocks() {
    const { data } = await supabase
      .from('stocks')
      .select('id')
      .eq('is_sample', true)
      .limit(1);

    return data && data.length > 0;
  }
};
