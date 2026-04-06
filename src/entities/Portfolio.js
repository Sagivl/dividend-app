import { getSupabaseBrowserClient, getSessionUserId } from '@/lib/supabaseClient';
import { getPortfolio as getEtoroPortfolio, getAccountBalance } from '../functions/etoroTradingApi';

const supabase = getSupabaseBrowserClient();

let _etoroCache = null;
let _etoroCacheTime = 0;
const ETORO_CACHE_TTL = 30_000;

const getUserId = getSessionUserId;

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
        user_id: { type: 'string' }
      }
    };
  },

  async list() {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
      ...row,
      created_by: row.user_id,
    }));
  },

  async create(data) {
    if (!data.ticker || !data.shares) {
      throw new Error('Ticker and shares are required');
    }

    const normalizedTicker = data.ticker.toUpperCase().trim();
    const userId = await getUserId();

    const { data: existing } = await supabase
      .from('portfolio_positions')
      .select('id')
      .eq('user_id', userId)
      .eq('ticker', normalizedTicker)
      .single();

    if (existing) {
      throw new Error(`Position for ${normalizedTicker} already exists. Use update instead.`);
    }

    const { data: newItem, error } = await supabase
      .from('portfolio_positions')
      .insert({
        user_id: userId,
        ticker: normalizedTicker,
        shares: Number(data.shares),
        cost_basis: data.cost_basis ? Number(data.cost_basis) : null,
        purchase_date: data.purchase_date || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...newItem, created_by: newItem.user_id };
  },

  async update(id, data) {
    const userId = await getUserId();
    const updates = {};

    if (data.shares !== undefined) updates.shares = Number(data.shares);
    if (data.cost_basis !== undefined) updates.cost_basis = data.cost_basis ? Number(data.cost_basis) : null;
    if (data.purchase_date !== undefined) updates.purchase_date = data.purchase_date;

    const { data: updated, error } = await supabase
      .from('portfolio_positions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return { ...updated, created_by: updated.user_id };
  },

  async delete(id) {
    const userId = await getUserId();
    const { error } = await supabase
      .from('portfolio_positions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  async get(id) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? { ...data, created_by: data.user_id } : null;
  },

  async getByTicker(ticker) {
    if (!ticker) return null;

    const normalizedTicker = ticker.toUpperCase().trim();
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', normalizedTicker)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? { ...data, created_by: data.user_id } : null;
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
    const userId = await getUserId();
    const { error } = await supabase
      .from('portfolio_positions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  async fetchEtoroPortfolio() {
    try {
      if (_etoroCache && Date.now() - _etoroCacheTime < ETORO_CACHE_TTL) {
        return _etoroCache;
      }

      const rawData = await getEtoroPortfolio();
      const pnlData = rawData?.clientPortfolio || rawData;

      const positions = (pnlData?.positions || []).map(pos => ({
        id: `etoro_${pos.positionID}`,
        positionId: pos.positionID,
        instrumentId: pos.instrumentID,
        shares: pos.units || 0,
        cost_basis: pos.openRate || null,
        purchase_date: pos.openDateTime?.split('T')[0] || null,
        currentRate: pos.unrealizedPnL?.closeRate || null,
        leverage: pos.leverage || 1,
        isBuy: pos.isBuy !== false,
        stopLossRate: pos.stopLossRate || null,
        takeProfitRate: pos.takeProfitRate || null,
        netProfit: pos.unrealizedPnL?.pnL || 0,
        amount: pos.amount || 0,
        source: 'etoro',
      }));

      const orders = (pnlData?.ordersForOpen || []).map(order => ({
        orderId: order.orderID || order.orderId,
        instrumentId: order.instrumentID || order.instrumentId,
        amount: order.amount || 0,
        amountInUnits: order.amountInUnits || order.units || 0,
        isBuy: order.isBuy !== false,
        openDateTime: order.openDateTime || null,
        leverage: order.leverage || 1,
        stopLossRate: order.stopLossRate || null,
        takeProfitRate: order.takeProfitRate || null,
        orderType: order.orderType,
        statusId: order.statusId,
      }));

      const pendingLimitOrders = (pnlData?.orders || []).map(order => ({
        orderId: order.orderID || order.orderId,
        instrumentId: order.instrumentID || order.instrumentId,
        amount: order.amount || 0,
        amountInUnits: order.units || 0,
        isBuy: order.isBuy !== false,
        openDateTime: order.openDateTime || null,
        leverage: order.leverage || 1,
        rate: order.rate,
        isLimitOrder: true,
      }));

      const result = {
        positions,
        orders,
        pendingOrders: pendingLimitOrders,
        credit: pnlData?.credit ?? null,
        mirrors: pnlData?.mirrors || [],
        raw: rawData,
      };

      _etoroCache = result;
      _etoroCacheTime = Date.now();

      return result;
    } catch (error) {
      console.error('[Portfolio] Error fetching eToro portfolio:', error);
      throw error;
    }
  },

  async fetchEtoroBalance() {
    try {
      return await getAccountBalance();
    } catch (error) {
      console.error('[Portfolio] Error fetching eToro balance:', error);
      throw error;
    }
  },

  clearEtoroCache() {
    _etoroCache = null;
    _etoroCacheTime = 0;
  },
};
