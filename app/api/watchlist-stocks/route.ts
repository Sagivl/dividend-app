import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const CARD_COLUMNS = 'id,ticker,name,sector,price,dividend_yield,avg_div_growth_5y,roe,market_cap,ebt,last_updated';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = Buffer.from(raw, 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const claims = decodeJwtPayload(token);
    const userId = claims?.sub as string | undefined;
    const email = claims?.email as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: watchlist, error: wlError } = await supabase
      .from('watchlist')
      .select('ticker')
      .eq('user_id', userId);

    if (wlError) {
      return NextResponse.json({ error: `watchlist: ${wlError.message}` }, { status: 500 });
    }

    const tickers = (watchlist || []).map((r: { ticker: string }) => r.ticker.toUpperCase());
    if (tickers.length === 0) {
      return NextResponse.json({ stocks: [], email });
    }

    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select(CARD_COLUMNS)
      .in('ticker', tickers);

    if (stocksError) {
      return NextResponse.json({ error: `stocks: ${stocksError.message}` }, { status: 500 });
    }

    return NextResponse.json({ stocks: stocks || [], email });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `server: ${message}` }, { status: 500 });
  }
}
