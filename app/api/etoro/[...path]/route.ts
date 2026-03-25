import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const ETORO_API_KEY = process.env.ETORO_API_KEY;
const ETORO_USER_KEY = process.env.ETORO_USER_KEY;
const ETORO_PUBLIC_API = 'https://public-api.etoro.com';
const ETORO_SAPI = 'https://www.etoro.com/sapi';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const endpoint = '/' + path.join('/');
    
    // Get query params from the request URL
    const { searchParams } = new URL(request.url);
    
    // Determine which base URL to use
    // SAPI endpoints start with /sapi/
    const isSapi = endpoint.startsWith('/sapi/');
    const baseUrl = isSapi ? ETORO_SAPI : ETORO_PUBLIC_API;
    const actualEndpoint = isSapi ? endpoint.replace('/sapi', '') : endpoint;
    
    // Build the eToro URL
    const etoroUrl = new URL(`${baseUrl}${actualEndpoint}`);
    
    // Copy all query params
    searchParams.forEach((value, key) => {
      etoroUrl.searchParams.set(key, value);
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-request-id': randomUUID(),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // Add API keys if available (for public API)
    if (!isSapi) {
      if (ETORO_API_KEY) {
        headers['x-api-key'] = ETORO_API_KEY;
      }
      if (ETORO_USER_KEY) {
        headers['x-user-key'] = ETORO_USER_KEY;
      }
    }

    // Log request
    console.log(`[eToro API Route] Request to ${endpoint} (${isSapi ? 'SAPI' : 'Public'}), API key present: ${!!ETORO_API_KEY}, User key present: ${!!ETORO_USER_KEY}`);

    const response = await fetch(etoroUrl.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`[eToro API Route] Error: ${response.status} for ${endpoint}`);
      return NextResponse.json(
        { error: `eToro API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log first item to debug field availability
    if (data.items?.[0] && endpoint.includes('search')) {
      console.log(`[eToro API Route] First result keys: ${Object.keys(data.items[0]).join(', ')}`);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[eToro API Route] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const endpoint = '/' + path.join('/');
    
    const body = await request.json().catch(() => null);
    
    // Build the eToro URL
    const etoroUrl = new URL(`${ETORO_BASE_URL}${endpoint}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-request-id': randomUUID(),
    };

    if (ETORO_API_KEY) {
      headers['x-api-key'] = ETORO_API_KEY;
    }
    if (ETORO_USER_KEY) {
      headers['x-user-key'] = ETORO_USER_KEY;
    }

    const response = await fetch(etoroUrl.toString(), {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `eToro API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[eToro API Route] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
