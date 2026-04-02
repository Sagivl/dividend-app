import { User } from './User';

const STORAGE_KEY = 'dividend_app_watchlist';

const getStoredWatchlist = () => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveWatchlist = (items) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const Watchlist = {
  async list() {
    const items = getStoredWatchlist();
    const user = await User.me();
    return items.filter(item => item.created_by === user.email);
  },

  async add(ticker) {
    if (!ticker) return null;
    
    const normalizedTicker = ticker.toUpperCase().trim();
    const items = getStoredWatchlist();
    const user = await User.me();
    
    const exists = items.some(
      item => item.ticker === normalizedTicker && item.created_by === user.email
    );
    
    if (exists) {
      return items.find(
        item => item.ticker === normalizedTicker && item.created_by === user.email
      );
    }
    
    const newItem = {
      id: `watchlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ticker: normalizedTicker,
      created_at: new Date().toISOString(),
      created_by: user.email
    };
    
    items.unshift(newItem);
    saveWatchlist(items);
    return newItem;
  },

  async remove(ticker) {
    if (!ticker) return false;
    
    const normalizedTicker = ticker.toUpperCase().trim();
    const items = getStoredWatchlist();
    const user = await User.me();
    
    const filtered = items.filter(
      item => !(item.ticker === normalizedTicker && item.created_by === user.email)
    );
    
    if (filtered.length !== items.length) {
      saveWatchlist(filtered);
      return true;
    }
    
    return false;
  },

  async isInWatchlist(ticker) {
    if (!ticker) return false;
    
    const normalizedTicker = ticker.toUpperCase().trim();
    const items = getStoredWatchlist();
    const user = await User.me();
    
    return items.some(
      item => item.ticker === normalizedTicker && item.created_by === user.email
    );
  },

  async toggle(ticker) {
    const isIn = await this.isInWatchlist(ticker);
    
    if (isIn) {
      await this.remove(ticker);
      return { added: false, ticker: ticker.toUpperCase().trim() };
    } else {
      await this.add(ticker);
      return { added: true, ticker: ticker.toUpperCase().trim() };
    }
  },

  async clear() {
    const items = getStoredWatchlist();
    const user = await User.me();
    
    const filtered = items.filter(item => item.created_by !== user.email);
    saveWatchlist(filtered);
    return true;
  },

  async count() {
    const items = await this.list();
    return items.length;
  }
};
