import { User } from './User';
import { Portfolio } from './Portfolio';

const STORAGE_KEY = 'dividend_app_user_settings';

const getStoredSettings = () => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveAllSettings = (items) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const UserSettings = {
  async get() {
    const items = getStoredSettings();
    const user = await User.me();
    return items.find(item => item.created_by === user.email) || null;
  },

  async save(data) {
    const items = getStoredSettings();
    const user = await User.me();
    const index = items.findIndex(item => item.created_by === user.email);

    const entry = {
      ...(index >= 0 ? items[index] : {}),
      ...data,
      created_by: user.email,
      updated_at: new Date().toISOString(),
    };

    if (index >= 0) {
      items[index] = entry;
    } else {
      entry.created_at = new Date().toISOString();
      items.push(entry);
    }

    saveAllSettings(items);
    return entry;
  },

  async getEtoroUserKey() {
    const settings = await this.get();
    return settings?.etoroUserKey || null;
  },

  async getEtoroApiKey() {
    const settings = await this.get();
    return settings?.etoroApiKey || null;
  },

  async getEtoroKeys() {
    const settings = await this.get();
    return {
      apiKey: settings?.etoroApiKey || null,
      userKey: settings?.etoroUserKey || null,
    };
  },

  async setEtoroKeys(apiKey, userKey) {
    Portfolio.clearEtoroCache();
    return this.save({ etoroApiKey: apiKey, etoroUserKey: userKey });
  },

  async setEtoroUserKey(key) {
    Portfolio.clearEtoroCache();
    return this.save({ etoroUserKey: key });
  },

  async clearEtoroKeys() {
    Portfolio.clearEtoroCache();
    return this.save({ etoroApiKey: null, etoroUserKey: null });
  },

  async clearEtoroUserKey() {
    Portfolio.clearEtoroCache();
    return this.save({ etoroUserKey: null });
  },

  async isEtoroConnected() {
    const keys = await this.getEtoroKeys();
    return !!keys.apiKey && !!keys.userKey;
  },
};
