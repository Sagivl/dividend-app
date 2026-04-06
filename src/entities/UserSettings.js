import { getSupabaseBrowserClient, getSessionUserId } from '@/lib/supabaseClient';
import { Portfolio } from './Portfolio';

const supabase = getSupabaseBrowserClient();

const getUserId = getSessionUserId;

export const UserSettings = {
  async get() {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async save(updates) {
    const userId = await getUserId();
    const existing = await this.get();

    if (existing) {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({ user_id: userId, ...updates })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async getEtoroUserKey() {
    const settings = await this.get();
    return settings?.etoro_user_key || null;
  },

  async getEtoroApiKey() {
    const settings = await this.get();
    return settings?.etoro_api_key || null;
  },

  async getEtoroKeys() {
    try {
      const settings = await this.get();
      return {
        apiKey: settings?.etoro_api_key || null,
        userKey: settings?.etoro_user_key || null,
      };
    } catch (err) {
      // etoroFetch must not throw when logged out — the API route can use server env keys.
      if (err?.message === 'Not authenticated') {
        return { apiKey: null, userKey: null };
      }
      throw err;
    }
  },

  async setEtoroKeys(apiKey, userKey) {
    Portfolio.clearEtoroCache();
    return this.save({ etoro_api_key: apiKey, etoro_user_key: userKey });
  },

  async setEtoroUserKey(key) {
    Portfolio.clearEtoroCache();
    return this.save({ etoro_user_key: key });
  },

  async clearEtoroKeys() {
    Portfolio.clearEtoroCache();
    return this.save({ etoro_api_key: null, etoro_user_key: null });
  },

  async clearEtoroUserKey() {
    Portfolio.clearEtoroCache();
    return this.save({ etoro_user_key: null });
  },

  async isEtoroConnected() {
    const keys = await this.getEtoroKeys();
    return !!keys.apiKey && !!keys.userKey;
  },
};
