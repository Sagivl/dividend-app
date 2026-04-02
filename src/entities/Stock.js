const STORAGE_KEY = 'dividend_app_stocks';
const SAMPLE_VERSION_KEY = 'dividend_app_sample_version';
const CURRENT_SAMPLE_VERSION = '2'; // Increment this to force re-seed

const getStoredStocks = () => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveStocks = (stocks) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
};

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

  async list(sortBy = '-last_updated') {
    let stocks = getStoredStocks();
    
    // De-duplicate by ticker, keeping the most recently updated version
    const stocksByTicker = new Map();
    stocks.forEach(stock => {
      if (!stock.ticker) return;
      const ticker = stock.ticker.toUpperCase();
      const existing = stocksByTicker.get(ticker);
      if (!existing) {
        stocksByTicker.set(ticker, stock);
      } else {
        // Keep the one with the most recent last_updated timestamp
        const existingDate = new Date(existing.last_updated || 0);
        const newDate = new Date(stock.last_updated || 0);
        if (newDate > existingDate) {
          stocksByTicker.set(ticker, stock);
        }
      }
    });
    
    // If duplicates were found, save the cleaned data back to localStorage
    const uniqueStocks = Array.from(stocksByTicker.values());
    if (uniqueStocks.length < stocks.length) {
      console.log(`Cleaned up ${stocks.length - uniqueStocks.length} duplicate stock entries`);
      saveStocks(uniqueStocks);
    }
    stocks = uniqueStocks;
    
    if (sortBy.startsWith('-')) {
      const field = sortBy.slice(1);
      stocks.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        return bVal.localeCompare?.(aVal) || (bVal - aVal);
      });
    }
    return stocks;
  },

  async filter(criteria) {
    const stocks = getStoredStocks();
    return stocks.filter(stock => {
      return Object.entries(criteria).every(([key, value]) => {
        if (typeof value === 'string') {
          return stock[key]?.toLowerCase() === value.toLowerCase();
        }
        return stock[key] === value;
      });
    });
  },

  async create(data) {
    const stocks = getStoredStocks();
    const newStock = {
      ...data,
      id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };
    stocks.unshift(newStock);
    saveStocks(stocks);
    return newStock;
  },

  async update(id, data) {
    const stocks = getStoredStocks();
    const index = stocks.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Stock not found');
    }
    const updatedStock = {
      ...stocks[index],
      ...data,
      last_updated: new Date().toISOString(),
    };
    stocks[index] = updatedStock;
    saveStocks(stocks);
    return updatedStock;
  },

  async delete(id) {
    const stocks = getStoredStocks();
    const filtered = stocks.filter(s => s.id !== id);
    saveStocks(filtered);
    return true;
  },

  async get(id) {
    const stocks = getStoredStocks();
    return stocks.find(s => s.id === id) || null;
  },

  async seedSampleStocks() {
    const existing = getStoredStocks();
    const storedVersion = typeof window !== 'undefined' ? localStorage.getItem(SAMPLE_VERSION_KEY) : null;
    const needsReseed = existing.length === 0 || storedVersion !== CURRENT_SAMPLE_VERSION;
    
    if (needsReseed) {
      try {
        // Clear existing sample stocks if upgrading version
        if (storedVersion !== CURRENT_SAMPLE_VERSION && existing.length > 0) {
          const nonSampleStocks = existing.filter(s => !s.is_sample);
          saveStocks(nonSampleStocks);
          console.log(`Cleared old sample stocks, keeping ${nonSampleStocks.length} user stocks`);
        }
        
        const sampleStocksModule = await import('@/data/sampleStocks');
        const sampleStocks = sampleStocksModule.default;
        
        for (const stock of sampleStocks) {
          await this.create({ ...stock, is_sample: true });
        }
        
        // Save the current version
        if (typeof window !== 'undefined') {
          localStorage.setItem(SAMPLE_VERSION_KEY, CURRENT_SAMPLE_VERSION);
        }
        
        console.log(`Seeded ${sampleStocks.length} sample stocks (version ${CURRENT_SAMPLE_VERSION})`);
        return true;
      } catch (error) {
        console.error('Error seeding sample stocks:', error);
        return false;
      }
    }
    return false;
  },

  async clearSampleStocks() {
    const stocks = getStoredStocks();
    const filtered = stocks.filter(s => !s.is_sample);
    saveStocks(filtered);
    return true;
  },

  async hasSampleStocks() {
    const stocks = getStoredStocks();
    return stocks.some(s => s.is_sample === true);
  }
};
