import { User } from './User';

const STORAGE_KEY = 'dividend_app_portfolio';

const getStoredPortfolio = () => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const savePortfolio = (items) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const Portfolio = {
  schema() {
    return {
      properties: {
        id: { type: 'string' },
        ticker: { type: 'string' },
        shares: { type: 'number' },
        cost_basis: { type: 'number' },
        purchase_date: { type: 'string' },
        created_at: { type: 'string' },
        created_by: { type: 'string' }
      }
    };
  },

  async list() {
    const items = getStoredPortfolio();
    const user = await User.me();
    return items.filter(item => item.created_by === user.email);
  },

  async create(data) {
    if (!data.ticker || !data.shares) {
      throw new Error('Ticker and shares are required');
    }

    const normalizedTicker = data.ticker.toUpperCase().trim();
    const items = getStoredPortfolio();
    const user = await User.me();

    const exists = items.some(
      item => item.ticker === normalizedTicker && item.created_by === user.email
    );

    if (exists) {
      throw new Error(`Position for ${normalizedTicker} already exists. Use update instead.`);
    }

    const newItem = {
      id: `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ticker: normalizedTicker,
      shares: Number(data.shares),
      cost_basis: data.cost_basis ? Number(data.cost_basis) : null,
      purchase_date: data.purchase_date || null,
      created_at: new Date().toISOString(),
      created_by: user.email
    };

    items.unshift(newItem);
    savePortfolio(items);
    return newItem;
  },

  async update(id, data) {
    const items = getStoredPortfolio();
    const user = await User.me();
    
    const index = items.findIndex(
      item => item.id === id && item.created_by === user.email
    );

    if (index === -1) {
      throw new Error('Position not found');
    }

    const updatedItem = {
      ...items[index],
      ...(data.shares !== undefined && { shares: Number(data.shares) }),
      ...(data.cost_basis !== undefined && { cost_basis: data.cost_basis ? Number(data.cost_basis) : null }),
      ...(data.purchase_date !== undefined && { purchase_date: data.purchase_date }),
      updated_at: new Date().toISOString()
    };

    items[index] = updatedItem;
    savePortfolio(items);
    return updatedItem;
  },

  async delete(id) {
    const items = getStoredPortfolio();
    const user = await User.me();

    const filtered = items.filter(
      item => !(item.id === id && item.created_by === user.email)
    );

    if (filtered.length !== items.length) {
      savePortfolio(filtered);
      return true;
    }

    return false;
  },

  async get(id) {
    const items = getStoredPortfolio();
    const user = await User.me();
    return items.find(item => item.id === id && item.created_by === user.email) || null;
  },

  async getByTicker(ticker) {
    if (!ticker) return null;
    
    const normalizedTicker = ticker.toUpperCase().trim();
    const items = getStoredPortfolio();
    const user = await User.me();

    return items.find(
      item => item.ticker === normalizedTicker && item.created_by === user.email
    ) || null;
  },

  async hasTicker(ticker) {
    const position = await this.getByTicker(ticker);
    return position !== null;
  },

  async getTotalValue(stocksMap) {
    const positions = await this.list();
    return positions.reduce((total, pos) => {
      const stock = stocksMap[pos.ticker];
      if (stock?.price) {
        return total + (pos.shares * stock.price);
      }
      return total;
    }, 0);
  },

  async getTotalAnnualIncome(stocksMap) {
    const positions = await this.list();
    return positions.reduce((total, pos) => {
      const stock = stocksMap[pos.ticker];
      if (stock?.price && stock?.dividend_yield) {
        const annualDividend = stock.price * (stock.dividend_yield / 100);
        return total + (pos.shares * annualDividend);
      }
      return total;
    }, 0);
  },

  async count() {
    const items = await this.list();
    return items.length;
  },

  async clear() {
    const items = getStoredPortfolio();
    const user = await User.me();
    
    const filtered = items.filter(item => item.created_by !== user.email);
    savePortfolio(filtered);
    return true;
  }
};
