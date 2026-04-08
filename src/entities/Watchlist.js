import { getSupabaseBrowserClient, getSessionUserId } from '@/lib/supabaseClient';

const supabase = getSupabaseBrowserClient();

const getUserId = getSessionUserId;

export const Watchlist = {
  async list() {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async add(ticker) {
    if (!ticker) return null;

    const normalizedTicker = ticker.toUpperCase().trim();
    const userId = await getUserId();

    const { data: existing } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', normalizedTicker)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
      .from('watchlist')
      .insert({ user_id: userId, ticker: normalizedTicker })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async remove(ticker) {
    if (!ticker) return false;

    const normalizedTicker = ticker.toUpperCase().trim();
    const userId = await getUserId();

    const { error, count } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('ticker', normalizedTicker);

    if (error) throw error;
    return true;
  },

  async isInWatchlist(ticker) {
    if (!ticker) return false;

    const normalizedTicker = ticker.toUpperCase().trim();
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', userId)
      .eq('ticker', normalizedTicker)
      .maybeSingle();

    return !!data && !error;
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
    const userId = await getUserId();
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  async count() {
    const items = await this.list();
    return items.length;
  }
};
