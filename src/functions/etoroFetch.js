import { UserSettings } from '@/entities/UserSettings';

let _cachedKeys = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 30_000;

async function getKeys() {
  const now = Date.now();
  if (_cachedKeys && now - _cacheTimestamp < CACHE_TTL) {
    return _cachedKeys;
  }
  _cachedKeys = await UserSettings.getEtoroKeys();
  _cacheTimestamp = now;
  return _cachedKeys;
}

export function clearKeysCache() {
  _cachedKeys = null;
  _cacheTimestamp = 0;
}

const ETORO_FETCH_TIMEOUT_MS = 25_000;

function etoroTimeoutSignal() {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ETORO_FETCH_TIMEOUT_MS);
  }
  return null;
}

export async function etoroFetch(url, options = {}) {
  const keys = await getKeys();
  const headers = { ...options.headers };

  if (keys.apiKey) {
    headers['x-etoro-api-key'] = keys.apiKey;
  }
  if (keys.userKey) {
    headers['x-etoro-user-key'] = keys.userKey;
  }

  const { signal: callerSignal, ...rest } = options;
  const timeoutSig = etoroTimeoutSignal();
  let signal = callerSignal;
  if (timeoutSig) {
    signal =
      callerSignal && typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([callerSignal, timeoutSig])
        : timeoutSig;
  }

  return fetch(url, { ...rest, headers, ...(signal ? { signal } : {}) });
}
