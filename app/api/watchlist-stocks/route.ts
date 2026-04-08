import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const CARD_COLUMNS = 'id,ticker,name,sector,price,dividend_yield,avg_div_growth_5y,roe,market_cap,ebt,last_updated,updated_date';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
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
  });

  const { data: watchlist, error: wlError } = await supabase
    .from('watchlist')
    .select('ticker')
    .eq('user_id', userId);

  if (wlError) {
    return NextResponse.json({ error: wlError.message }, { status: 500 });
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
    return NextResponse.json({ error: stocksError.message }, { status: 500 });
  }

  return NextResponse.json({ stocks: stocks || [], email });
}
