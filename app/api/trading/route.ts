import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const ETORO_API_KEY = process.env.ETORO_API_KEY;
const ETORO_USER_KEY = process.env.ETORO_USER_KEY;
const ETORO_TRADING_ENV = process.env.ETORO_TRADING_ENV || 'demo';
const ETORO_PUBLIC_API = 'https://public-api.etoro.com';

function getHeaders(perUserKey?: string): Record<string, string> {
  const resolvedUserKey = perUserKey || ETORO_USER_KEY;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': randomUUID(),
    'Accept': 'application/json',
  };

  if (ETORO_API_KEY) {
    headers['x-api-key'] = ETORO_API_KEY;
  }
  if (resolvedUserKey) {
    headers['x-user-key'] = resolvedUserKey;
  }

  return headers;
}

function isDemo(): boolean {
  return ETORO_TRADING_ENV !== 'real';
}

function tradingBasePath(): string {
  return isDemo()
    ? '/api/v1/trading/execution/demo'
    : '/api/v1/trading/execution';
}

function portfolioBasePath(): string {
  return isDemo()
    ? '/api/v1/trading/info/demo'
    : '/api/v1/trading/info/real';
}

const ALLOWED_ACTIONS = [
  'open-by-amount',
  'open-by-units',
  'close-position',
  'cancel-open-order',
  'cancel-close-order',
  'portfolio',
  'aggregate',
  'history',
  'order',
  'env',
] as const;

type TradingAction = (typeof ALLOWED_ACTIONS)[number];

function isAllowedAction(action: string): action is TradingAction {
  return ALLOWED_ACTIONS.includes(action as TradingAction);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const perUserKey = request.headers.get('x-etoro-user-key') || undefined;

    if (!action || !isAllowedAction(action)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${ALLOWED_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (action === 'env') {
      return NextResponse.json({
        environment: isDemo() ? 'demo' : 'real',
        hasApiKey: !!ETORO_API_KEY,
        hasUserKey: !!(perUserKey || ETORO_USER_KEY),
      });
    }

    const resolvedUserKey = perUserKey || ETORO_USER_KEY;
    if (!ETORO_API_KEY || !resolvedUserKey) {
      return NextResponse.json(
        { error: 'eToro API keys not configured. Please connect your eToro account in Settings.' },
        { status: 401 }
      );
    }

    let etoroPath: string;

    switch (action) {
      case 'portfolio':
        etoroPath = `${portfolioBasePath()}/pnl`;
        break;
      case 'aggregate':
        etoroPath = `${portfolioBasePath()}/pnl`;
        break;
      case 'history':
        etoroPath = `${portfolioBasePath()}/history`;
        break;
      case 'order': {
        const orderId = searchParams.get('orderId');
        if (!orderId) {
          return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
        }
        etoroPath = `${portfolioBasePath()}/orders/${orderId}`;
        break;
      }
      default:
        return NextResponse.json({ error: 'Action not supported for GET' }, { status: 400 });
    }

    const etoroUrl = `${ETORO_PUBLIC_API}${etoroPath}`;
    console.log(`[Trading API] GET ${action} -> ${etoroUrl} (${isDemo() ? 'DEMO' : 'REAL'})`);

    const response = await fetch(etoroUrl, {
      method: 'GET',
      headers: getHeaders(perUserKey),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Trading API] Error ${response.status}: ${errorBody}`);
      return NextResponse.json(
        { error: `eToro API error: ${response.status}`, details: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Trading API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const perUserKey = request.headers.get('x-etoro-user-key') || undefined;

    if (!action || !isAllowedAction(action)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${ALLOWED_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const resolvedUserKey = perUserKey || ETORO_USER_KEY;
    if (!ETORO_API_KEY || !resolvedUserKey) {
      return NextResponse.json(
        { error: 'eToro API keys not configured. Please connect your eToro account in Settings.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    let etoroPath: string;
    let method = 'POST';

    switch (action) {
      case 'open-by-amount': {
        if (!body?.InstrumentId || !body?.Amount) {
          return NextResponse.json(
            { error: 'InstrumentId and Amount are required' },
            { status: 400 }
          );
        }
        if (body.Amount <= 0) {
          return NextResponse.json(
            { error: 'Amount must be positive' },
            { status: 400 }
          );
        }
        etoroPath = `${tradingBasePath()}/market-open-orders/by-amount`;
        break;
      }
      case 'open-by-units': {
        if (!body?.InstrumentId || !body?.Units) {
          return NextResponse.json(
            { error: 'InstrumentId and Units are required' },
            { status: 400 }
          );
        }
        if (body.Units <= 0) {
          return NextResponse.json(
            { error: 'Units must be positive' },
            { status: 400 }
          );
        }
        etoroPath = `${tradingBasePath()}/market-open-orders/by-units`;
        break;
      }
      case 'close-position': {
        const positionId = body?.positionId;
        if (!positionId) {
          return NextResponse.json(
            { error: 'positionId is required' },
            { status: 400 }
          );
        }
        etoroPath = `${tradingBasePath()}/market-close-orders/positions/${positionId}`;
        break;
      }
      case 'cancel-open-order': {
        const orderId = body?.orderId;
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId is required' },
            { status: 400 }
          );
        }
        etoroPath = `${tradingBasePath()}/market-open-orders/${orderId}`;
        method = 'DELETE';
        break;
      }
      case 'cancel-close-order': {
        const orderId = body?.orderId;
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId is required' },
            { status: 400 }
          );
        }
        etoroPath = `${tradingBasePath()}/market-close-orders/${orderId}`;
        method = 'DELETE';
        break;
      }
      default:
        return NextResponse.json({ error: 'Action not supported for POST' }, { status: 400 });
    }

    const etoroUrl = `${ETORO_PUBLIC_API}${etoroPath}`;
    const orderBody = { ...body };
    delete orderBody.positionId;
    delete orderBody.orderId;

    console.log(`[Trading API] ${method} ${action} -> ${etoroUrl} (${isDemo() ? 'DEMO' : 'REAL'})`, orderBody);

    const response = await fetch(etoroUrl, {
      method,
      headers: getHeaders(perUserKey),
      body: method !== 'DELETE' ? JSON.stringify(orderBody) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Trading API] Error ${response.status}: ${errorBody}`);

      let userMessage = `Trade failed (${response.status})`;
      if (response.status === 403) userMessage = 'Trading not authorized. Check your User Key permissions.';
      else if (response.status === 400) userMessage = `Invalid order: ${errorBody}`;
      else if (response.status === 429) userMessage = 'Rate limit exceeded. Please wait before placing another order.';

      return NextResponse.json(
        { error: userMessage, details: errorBody, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Trading API] ${action} successful:`, JSON.stringify(data).slice(0, 200));
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Trading API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
