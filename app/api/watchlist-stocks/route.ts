import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const CARD_COLUMNS = 'id,ticker,name,sector,price,dividend_yield,avg_div_growth_5y,roe,market_cap,ebt,last_updated,updated_date';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const t0 = Date.now();

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

  const t1 = Date.now();

  const { data: watchlist, error: wlError } = await supabase
    .from('watchlist')
    .select('ticker')
    .eq('user_id', userId);

  const t2 = Date.now();

  if (wlError) {
    return NextResponse.json({ error: wlError.message }, { status: 500 });
  }

  const tickers = (watchlist || []).map((r: { ticker: string }) => r.ticker.toUpperCase());
  if (tickers.length === 0) {
    return NextResponse.json({ stocks: [], email }, {
      headers: { 'Server-Timing': `setup;dur=${t1 - t0}, watchlist;dur=${t2 - t1}` },
    });
  }

  const { data: stocks, error: stocksError } = await supabase
    .from('stocks')
    .select(CARD_COLUMNS)
    .in('ticker', tickers);

  const t3 = Date.now();

  if (stocksError) {
    return NextResponse.json({ error: stocksError.message }, { status: 500 });
  }

  return NextResponse.json({ stocks: stocks || [], email }, {
    headers: {
      'Server-Timing': `setup;dur=${t1 - t0}, watchlist;dur=${t2 - t1}, stocks;dur=${t3 - t2}, total;dur=${t3 - t0}`,
      'Cache-Control': 'private, max-age=0',
    },
  });
}
