/**
 * eToro Trading API Client
 * 
 * Wraps the /api/trading proxy route for executing trades,
 * fetching portfolio data, and managing orders.
 * 
 * Rate limits: 20 write requests/min, 60 read requests/min
 */

import { UserSettings } from '@/entities/UserSettings';

const TRADING_API = '/api/trading';

let lastTradeTimestamps = [];
const MAX_TRADES_PER_MINUTE = 18; // buffer below the 20/min limit

function checkRateLimit() {
  const now = Date.now();
  lastTradeTimestamps = lastTradeTimestamps.filter(ts => now - ts < 60_000);
  if (lastTradeTimestamps.length >= MAX_TRADES_PER_MINUTE) {
    const oldestInWindow = lastTradeTimestamps[0];
    const waitMs = 60_000 - (now - oldestInWindow);
    throw new Error(`Rate limit: please wait ${Math.ceil(waitMs / 1000)}s before placing another order.`);
  }
}

function recordTrade() {
  lastTradeTimestamps.push(Date.now());
}

async function tradingFetch(action, options = {}) {
  const { method = 'GET', body } = options;
  const url = `${TRADING_API}?action=${action}`;

  const keys = await UserSettings.getEtoroKeys();
  const headers = { 'Content-Type': 'application/json' };
  if (keys.apiKey) {
    headers['x-etoro-api-key'] = keys.apiKey;
  }
  if (keys.userKey) {
    headers['x-etoro-user-key'] = keys.userKey;
  }

  const fetchOptions = { method, headers };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error || `Trading API error: ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.details = data.details;
    throw error;
  }

  return data;
}

/**
 * Get the current trading environment configuration
 */
export async function getTradingEnvironment() {
  return tradingFetch('env');
}

/**
 * Fetch eToro portfolio with positions, orders, and account info
 */
export async function getPortfolio() {
  return tradingFetch('portfolio');
}

/**
 * Fetch account balance and aggregate data
 */
export async function getAccountBalance() {
  return tradingFetch('aggregate');
}

/**
 * Fetch trading history
 */
export async function getTradingHistory() {
  return tradingFetch('history');
}

/**
 * Get details for a specific order
 */
export async function getOrderInfo(orderId) {
  return tradingFetch(`order&orderId=${orderId}`);
}

/**
 * Open a position by specifying the cash amount to invest
 * 
 * @param {number} instrumentId - eToro instrument ID
 * @param {number} amount - Cash amount in USD
 * @param {object} options - Optional: Leverage, StopLossRate, TakeProfitRate, IsBuy
 */
export async function openPositionByAmount(instrumentId, amount, options = {}) {
  checkRateLimit();

  const body = {
    InstrumentId: instrumentId,
    Amount: amount,
    IsBuy: options.IsBuy !== undefined ? options.IsBuy : true,
    Leverage: options.Leverage || 1,
  };

  if (options.StopLossRate) body.StopLossRate = options.StopLossRate;
  if (options.TakeProfitRate) body.TakeProfitRate = options.TakeProfitRate;

  const result = await tradingFetch('open-by-amount', { method: 'POST', body });
  recordTrade();
  return result;
}

/**
 * Open a position by specifying the number of units (shares)
 * 
 * @param {number} instrumentId - eToro instrument ID
 * @param {number} units - Number of units/shares
 * @param {object} options - Optional: Leverage, StopLossRate, TakeProfitRate, IsBuy
 */
export async function openPositionByUnits(instrumentId, units, options = {}) {
  checkRateLimit();

  const body = {
    InstrumentId: instrumentId,
    Units: units,
    IsBuy: options.IsBuy !== undefined ? options.IsBuy : true,
    Leverage: options.Leverage || 1,
  };

  if (options.StopLossRate) body.StopLossRate = options.StopLossRate;
  if (options.TakeProfitRate) body.TakeProfitRate = options.TakeProfitRate;

  const result = await tradingFetch('open-by-units', { method: 'POST', body });
  recordTrade();
  return result;
}

/**
 * Close a position (fully or partially)
 * 
 * @param {string|number} positionId - The position ID to close
 * @param {number|null} unitsToDeduct - Units to sell (null = close entire position)
 */
export async function closePosition(positionId, unitsToDeduct = null) {
  checkRateLimit();

  const body = {
    positionId: String(positionId),
    UnitsToDeduct: unitsToDeduct,
  };

  const result = await tradingFetch('close-position', { method: 'POST', body });
  recordTrade();
  return result;
}

/**
 * Cancel a pending open order before execution
 */
export async function cancelOpenOrder(orderId) {
  checkRateLimit();
  const result = await tradingFetch('cancel-open-order', {
    method: 'POST',
    body: { orderId: String(orderId) },
  });
  recordTrade();
  return result;
}

/**
 * Cancel a pending close order
 */
export async function cancelCloseOrder(orderId) {
  checkRateLimit();
  const result = await tradingFetch('cancel-close-order', {
    method: 'POST',
    body: { orderId: String(orderId) },
  });
  recordTrade();
  return result;
}
