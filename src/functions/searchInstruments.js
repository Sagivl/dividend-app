const DEMO_INSTRUMENTS = [
  { instrumentId: 1001, internalInstrumentDisplayName: 'Apple', internalSymbolFull: 'AAPL', internalAssetClassName: 'Stocks', currentRate: 178.50, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1001/50x50.png', dailyPriceChange: 1.25, isOpen: true },
  { instrumentId: 1002, internalInstrumentDisplayName: 'Microsoft Corporation', internalSymbolFull: 'MSFT', internalAssetClassName: 'Stocks', currentRate: 425.30, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1002/50x50.png', dailyPriceChange: -0.45, isOpen: true },
  { instrumentId: 1155, internalInstrumentDisplayName: 'Tesla', internalSymbolFull: 'TSLA', internalAssetClassName: 'Stocks', currentRate: 245.80, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1155/50x50.png', dailyPriceChange: 2.15, isOpen: true },
  { instrumentId: 1004, internalInstrumentDisplayName: 'Amazon', internalSymbolFull: 'AMZN', internalAssetClassName: 'Stocks', currentRate: 185.60, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1004/50x50.png', dailyPriceChange: 0.85, isOpen: true },
  { instrumentId: 1066, internalInstrumentDisplayName: 'NVIDIA', internalSymbolFull: 'NVDA', internalAssetClassName: 'Stocks', currentRate: 875.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1066/50x50.png', dailyPriceChange: 3.20, isOpen: true },
  { instrumentId: 1006, internalInstrumentDisplayName: 'Alphabet', internalSymbolFull: 'GOOGL', internalAssetClassName: 'Stocks', currentRate: 165.20, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1006/50x50.png', dailyPriceChange: -0.30, isOpen: true },
  { instrumentId: 10616, internalInstrumentDisplayName: 'Meta Platforms', internalSymbolFull: 'META', internalAssetClassName: 'Stocks', currentRate: 520.75, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/10616/50x50.png', dailyPriceChange: 1.80, isOpen: true },
  { instrumentId: 100000, internalInstrumentDisplayName: 'Bitcoin', internalSymbolFull: 'BTC', internalAssetClassName: 'Crypto', currentRate: 67500.00, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/100000/50x50.png', dailyPriceChange: 2.50, isOpen: true },
  { instrumentId: 100001, internalInstrumentDisplayName: 'Ethereum', internalSymbolFull: 'ETH', internalAssetClassName: 'Crypto', currentRate: 3450.00, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/100001/50x50.png', dailyPriceChange: 1.90, isOpen: true },
  { instrumentId: 5022, internalInstrumentDisplayName: 'SPDR S&P 500 ETF', internalSymbolFull: 'SPY', internalAssetClassName: 'ETF', currentRate: 512.30, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/5022/50x50.png', dailyPriceChange: 0.65, isOpen: true },
];

export async function searchInstruments(params) {
  const query = params.searchText || params.internalInstrumentDisplayName || params.internalSymbolFull || '';
  const pageSize = params.pageSize || 20;
  const fields = params.fields || 'instrumentId,internalInstrumentDisplayName,internalSymbolFull,internalAssetClassName,currentRate,logo50x50,dailyPriceChange,isOpen';

  try {
    // Search by both name and symbol in parallel
    // Note: fields parameter must NOT be URL-encoded (commas must be literal)
    const nameUrl = `/etoro-api/api/v1/market-data/search?internalInstrumentDisplayName=${encodeURIComponent(query)}&pageSize=${Math.ceil(pageSize / 2)}&fields=${fields}`;
    const symbolUrl = `/etoro-api/api/v1/market-data/search?internalSymbolFull=${encodeURIComponent(query)}&pageSize=${Math.ceil(pageSize / 2)}&fields=${fields}`;

    console.log('[searchInstruments] Searching for:', query);
    console.log('[searchInstruments] Symbol URL:', symbolUrl);
    
    const [nameResponse, symbolResponse] = await Promise.all([
      fetch(nameUrl),
      fetch(symbolUrl)
    ]);

    console.log('[searchInstruments] Name response status:', nameResponse.status);
    console.log('[searchInstruments] Symbol response status:', symbolResponse.status);

    if (!nameResponse.ok && !symbolResponse.ok) {
      const errorText = await nameResponse.text();
      console.error('[searchInstruments] Both requests failed:', errorText);
      throw new Error('API requests failed');
    }

    const nameData = nameResponse.ok ? await nameResponse.json() : { items: [] };
    const symbolData = symbolResponse.ok ? await symbolResponse.json() : { items: [] };
    
    console.log('[searchInstruments] Name results:', nameData.items?.length || 0);
    console.log('[searchInstruments] Symbol results:', symbolData.items?.length || 0);
    console.log('[searchInstruments] Name data:', JSON.stringify(nameData.items?.[0]));
    console.log('[searchInstruments] Symbol data:', JSON.stringify(symbolData.items?.[0]));

    // Combine and deduplicate results
    const allItems = [...(nameData.items || []), ...(symbolData.items || [])];
    const uniqueItems = allItems
      .filter(item => item && item.instrumentId && item.instrumentId > 0)
      .filter((item, index, self) => 
        index === self.findIndex(t => t.instrumentId === item.instrumentId)
      )
      .slice(0, pageSize);

    return {
      data: {
        items: uniqueItems,
        totalItems: uniqueItems.length,
        page: 1,
        pageSize: pageSize
      }
    };
  } catch (error) {
    console.warn('[searchInstruments] API error, using demo data:', error.message);
    
    const queryLower = query.toLowerCase();
    const filteredItems = DEMO_INSTRUMENTS.filter(item => 
      item.internalInstrumentDisplayName.toLowerCase().includes(queryLower) ||
      item.internalSymbolFull.toLowerCase().includes(queryLower)
    ).slice(0, pageSize);

    return {
      data: {
        items: filteredItems,
        totalItems: filteredItems.length,
        page: 1,
        pageSize: pageSize
      },
      isDemo: true
    };
  }
}

export async function getInstrument(instrumentId) {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('instrumentId', instrumentId);
    queryParams.append('fields', 'instrumentId,internalInstrumentDisplayName,internalSymbolFull,internalAssetClassName,currentRate,logo50x50,logo150x150,dailyPriceChange,weeklyPriceChange,monthlyPriceChange,oneYearPriceChange,isOpen,isCurrentlyTradable');

    const response = await fetch(`/etoro-api/api/v1/market-data/search?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch instrument');
    }

    const data = await response.json();
    const item = data.items?.find(i => i.instrumentId > 0);
    return { data: item || null };
  } catch (error) {
    console.warn('[getInstrument] Using demo data. Error:', error.message);
    const demoItem = DEMO_INSTRUMENTS.find(i => i.instrumentId === parseInt(instrumentId));
    return { data: demoItem || null, isDemo: true };
  }
}

export async function getRates(instrumentIds) {
  try {
    const ids = Array.isArray(instrumentIds) ? instrumentIds.join(',') : instrumentIds;
    const response = await fetch(`/etoro-api/api/v1/market-data/rates?instrumentIds=${ids}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch rates');
    }

    return await response.json();
  } catch (error) {
    console.warn('[getRates] Error:', error.message);
    return { data: null, error: error.message };
  }
}
