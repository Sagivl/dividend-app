import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      // Avoid navigator.locks contention in dev (multiple tabs / Strict Mode)
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        return await fn();
      },
    },
  });
  return browserClient;
}

export function getSupabaseServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

let _cachedUserId: string | null = null;
let _userIdPromise: Promise<string> | null = null;

export async function getSessionUserId(): Promise<string> {
  if (_cachedUserId) return _cachedUserId;
  if (_userIdPromise) return _userIdPromise;

  _userIdPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      _cachedUserId = session.user.id;
      return session.user.id;
    }
    throw new Error('Not authenticated');
  })();

  try {
    return await _userIdPromise;
  } finally {
    _userIdPromise = null;
  }
}

export function clearSessionCache() {
  _cachedUserId = null;
  _userIdPromise = null;
}
