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

export async function etoroFetch(url, options = {}) {
  const keys = await getKeys();
  const headers = { ...options.headers };

  if (keys.apiKey) {
    headers['x-etoro-api-key'] = keys.apiKey;
  }
  if (keys.userKey) {
    headers['x-etoro-user-key'] = keys.userKey;
  }

  return fetch(url, { ...options, headers });
}
