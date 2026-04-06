import { getSupabaseBrowserClient, getSessionUserId, clearSessionCache } from '@/lib/supabaseClient';

const supabase = getSupabaseBrowserClient();

let _profileCache = null;
let _profileCacheTime = 0;
const PROFILE_CACHE_TTL = 10_000;

export const User = {
  async me() {
    if (_profileCache && Date.now() - _profileCacheTime < PROFILE_CACHE_TTL) {
      return _profileCache;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    let result;
    if (profileError || !profile) {
      result = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: 'user',
        stock_search_history: [],
        onboarding_completed: false,
        onboarding_step: 0,
        investment_goal: null,
        risk_tolerance: null,
        is_new_user: true,
        created_at: user.created_at,
      };
    } else {
      result = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        stock_search_history: profile.stock_search_history || [],
        onboarding_completed: profile.onboarding_completed,
        onboarding_step: profile.onboarding_step,
        investment_goal: profile.investment_goal,
        risk_tolerance: profile.risk_tolerance,
        is_new_user: !profile.onboarding_completed,
        created_at: profile.created_at,
      };
    }

    _profileCache = result;
    _profileCacheTime = Date.now();
    return result;
  },

  async updateMyUserData(data) {
    const userId = await getSessionUserId();

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    _profileCache = null;
    return updated;
  },

  async logout() {
    _profileCache = null;
    clearSessionCache();
    await supabase.auth.signOut();
    return true;
  },

  async markOnboardingComplete(preferences = {}) {
    return this.updateMyUserData({
      onboarding_completed: true,
      ...preferences,
    });
  },

  async isNewUser() {
    const user = await this.me();
    return user?.is_new_user === true || !user?.onboarding_completed;
  }
};
