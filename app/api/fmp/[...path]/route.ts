import { NextRequest, NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { error: 'FMP API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { path } = await params;
    const endpoint = path.join('/');
    
    // Get query params from the request URL
    const { searchParams } = new URL(request.url);
    
    // Build the FMP URL with the API key
    const fmpUrl = new URL(`${FMP_BASE_URL}/${endpoint}`);
    
    // Copy all query params except apikey (we'll add our own)
    searchParams.forEach((value, key) => {
      if (key !== 'apikey') {
        fmpUrl.searchParams.set(key, value);
      }
    });
    
    // Add the API key server-side
    fmpUrl.searchParams.set('apikey', FMP_API_KEY);

    const response = await fetch(fmpUrl.toString());

    if (!response.ok) {
      return NextResponse.json(
        { error: `FMP API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[FMP API Route] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
