const USER_STORAGE_KEY = 'dividend_app_user_v2';

const ADMIN_EMAILS = [
  'sagivle@etoro.com',
];

const isAdminEmail = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(USER_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const saveUser = (user) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

const defaultUser = {
  id: 'local_user_1',
  email: 'local@user.com',
  name: 'Local User',
  role: 'user',
  stock_search_history: [],
  created_at: new Date().toISOString(),
  onboarding_completed: false,
  onboarding_step: 0,
  investment_goal: null,
  risk_tolerance: null,
  is_new_user: true,
};

export const User = {
  async me() {
    let user = getStoredUser();
    if (!user) {
      user = { ...defaultUser };
      saveUser(user);
    } else {
      let needsSave = false;
      if (user.onboarding_completed === undefined) {
        user.onboarding_completed = true;
        user.is_new_user = false;
        needsSave = true;
      }
      if (needsSave) {
        saveUser(user);
      }
    }
    
    // Determine role based on email allowlist
    user.role = isAdminEmail(user.email) ? 'admin' : 'user';
    
    return user;
  },

  async updateMyUserData(data) {
    let user = getStoredUser() || { ...defaultUser };
    user = { ...user, ...data };
    saveUser(user);
    return user;
  },

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    return true;
  },

  async markOnboardingComplete(preferences = {}) {
    return this.updateMyUserData({
      onboarding_completed: true,
      is_new_user: false,
      ...preferences,
    });
  },

  async isNewUser() {
    const user = await this.me();
    return user.is_new_user === true || !user.onboarding_completed;
  }
};
