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
  { instrumentId: 1005, internalInstrumentDisplayName: 'Johnson & Johnson', internalSymbolFull: 'JNJ', internalAssetClassName: 'Stocks', currentRate: 155.20, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1005/50x50.png', dailyPriceChange: 0.35, isOpen: true },
  { instrumentId: 1007, internalInstrumentDisplayName: 'Procter & Gamble', internalSymbolFull: 'PG', internalAssetClassName: 'Stocks', currentRate: 162.80, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1007/50x50.png', dailyPriceChange: 0.45, isOpen: true },
  { instrumentId: 1008, internalInstrumentDisplayName: 'Coca-Cola', internalSymbolFull: 'KO', internalAssetClassName: 'Stocks', currentRate: 62.45, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1008/50x50.png', dailyPriceChange: 0.25, isOpen: true },
  { instrumentId: 1009, internalInstrumentDisplayName: 'PepsiCo', internalSymbolFull: 'PEP', internalAssetClassName: 'Stocks', currentRate: 178.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1009/50x50.png', dailyPriceChange: 0.55, isOpen: true },
  { instrumentId: 1010, internalInstrumentDisplayName: 'Walmart', internalSymbolFull: 'WMT', internalAssetClassName: 'Stocks', currentRate: 165.30, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1010/50x50.png', dailyPriceChange: 0.75, isOpen: true },
  { instrumentId: 1011, internalInstrumentDisplayName: 'JPMorgan Chase', internalSymbolFull: 'JPM', internalAssetClassName: 'Stocks', currentRate: 198.50, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1011/50x50.png', dailyPriceChange: 1.20, isOpen: true },
  { instrumentId: 1012, internalInstrumentDisplayName: 'Bank of America', internalSymbolFull: 'BAC', internalAssetClassName: 'Stocks', currentRate: 38.75, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1012/50x50.png', dailyPriceChange: 0.45, isOpen: true },
  { instrumentId: 1013, internalInstrumentDisplayName: 'Verizon', internalSymbolFull: 'VZ', internalAssetClassName: 'Stocks', currentRate: 42.30, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1013/50x50.png', dailyPriceChange: 0.15, isOpen: true },
  { instrumentId: 1014, internalInstrumentDisplayName: 'AT&T', internalSymbolFull: 'T', internalAssetClassName: 'Stocks', currentRate: 18.50, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1014/50x50.png', dailyPriceChange: -0.10, isOpen: true },
  { instrumentId: 1015, internalInstrumentDisplayName: 'Pfizer', internalSymbolFull: 'PFE', internalAssetClassName: 'Stocks', currentRate: 28.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1015/50x50.png', dailyPriceChange: 0.30, isOpen: true },
  { instrumentId: 1016, internalInstrumentDisplayName: 'ExxonMobil', internalSymbolFull: 'XOM', internalAssetClassName: 'Stocks', currentRate: 115.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1016/50x50.png', dailyPriceChange: 0.85, isOpen: true },
  { instrumentId: 1017, internalInstrumentDisplayName: 'Chevron', internalSymbolFull: 'CVX', internalAssetClassName: 'Stocks', currentRate: 158.20, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1017/50x50.png', dailyPriceChange: 0.95, isOpen: true },
  { instrumentId: 1018, internalInstrumentDisplayName: 'Intel', internalSymbolFull: 'INTC', internalAssetClassName: 'Stocks', currentRate: 32.45, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1018/50x50.png', dailyPriceChange: -0.35, isOpen: true },
  { instrumentId: 1019, internalInstrumentDisplayName: 'AMD', internalSymbolFull: 'AMD', internalAssetClassName: 'Stocks', currentRate: 165.80, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1019/50x50.png', dailyPriceChange: 2.45, isOpen: true },
  { instrumentId: 1020, internalInstrumentDisplayName: 'Disney', internalSymbolFull: 'DIS', internalAssetClassName: 'Stocks', currentRate: 112.30, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1020/50x50.png', dailyPriceChange: 0.65, isOpen: true },
  { instrumentId: 1021, internalInstrumentDisplayName: 'Netflix', internalSymbolFull: 'NFLX', internalAssetClassName: 'Stocks', currentRate: 628.50, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1021/50x50.png', dailyPriceChange: 3.80, isOpen: true },
  { instrumentId: 1022, internalInstrumentDisplayName: 'Adobe', internalSymbolFull: 'ADBE', internalAssetClassName: 'Stocks', currentRate: 545.20, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1022/50x50.png', dailyPriceChange: 2.15, isOpen: true },
  { instrumentId: 1023, internalInstrumentDisplayName: 'Salesforce', internalSymbolFull: 'CRM', internalAssetClassName: 'Stocks', currentRate: 275.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1023/50x50.png', dailyPriceChange: 1.85, isOpen: true },
  { instrumentId: 1024, internalInstrumentDisplayName: 'Cisco', internalSymbolFull: 'CSCO', internalAssetClassName: 'Stocks', currentRate: 52.80, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1024/50x50.png', dailyPriceChange: 0.35, isOpen: true },
  { instrumentId: 1025, internalInstrumentDisplayName: 'Oracle', internalSymbolFull: 'ORCL', internalAssetClassName: 'Stocks', currentRate: 125.60, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1025/50x50.png', dailyPriceChange: 1.10, isOpen: true },
  { instrumentId: 1026, internalInstrumentDisplayName: 'IBM', internalSymbolFull: 'IBM', internalAssetClassName: 'Stocks', currentRate: 185.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1026/50x50.png', dailyPriceChange: 0.75, isOpen: true },
  { instrumentId: 1027, internalInstrumentDisplayName: 'Visa', internalSymbolFull: 'V', internalAssetClassName: 'Stocks', currentRate: 278.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1027/50x50.png', dailyPriceChange: 1.45, isOpen: true },
  { instrumentId: 1028, internalInstrumentDisplayName: 'Mastercard', internalSymbolFull: 'MA', internalAssetClassName: 'Stocks', currentRate: 458.20, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1028/50x50.png', dailyPriceChange: 2.25, isOpen: true },
  { instrumentId: 1029, internalInstrumentDisplayName: 'PayPal', internalSymbolFull: 'PYPL', internalAssetClassName: 'Stocks', currentRate: 68.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1029/50x50.png', dailyPriceChange: 0.55, isOpen: true },
  { instrumentId: 1030, internalInstrumentDisplayName: 'Realty Income', internalSymbolFull: 'O', internalAssetClassName: 'Stocks', currentRate: 58.45, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1030/50x50.png', dailyPriceChange: 0.25, isOpen: true },
  { instrumentId: 1031, internalInstrumentDisplayName: 'Rio Tinto', internalSymbolFull: 'RIO', internalAssetClassName: 'Stocks', currentRate: 65.80, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1031/50x50.png', dailyPriceChange: 0.45, isOpen: true },
  { instrumentId: 1032, internalInstrumentDisplayName: 'BHP Group', internalSymbolFull: 'BHP', internalAssetClassName: 'Stocks', currentRate: 58.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1032/50x50.png', dailyPriceChange: 0.35, isOpen: true },
  { instrumentId: 1033, internalInstrumentDisplayName: 'AbbVie', internalSymbolFull: 'ABBV', internalAssetClassName: 'Stocks', currentRate: 178.50, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1033/50x50.png', dailyPriceChange: 0.85, isOpen: true },
  { instrumentId: 1034, internalInstrumentDisplayName: 'Altria Group', internalSymbolFull: 'MO', internalAssetClassName: 'Stocks', currentRate: 45.20, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1034/50x50.png', dailyPriceChange: 0.15, isOpen: true },
  { instrumentId: 1035, internalInstrumentDisplayName: 'Philip Morris', internalSymbolFull: 'PM', internalAssetClassName: 'Stocks', currentRate: 98.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1035/50x50.png', dailyPriceChange: 0.55, isOpen: true },
  { instrumentId: 1036, internalInstrumentDisplayName: '3M Company', internalSymbolFull: 'MMM', internalAssetClassName: 'Stocks', currentRate: 102.30, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1036/50x50.png', dailyPriceChange: 0.25, isOpen: true },
  { instrumentId: 1037, internalInstrumentDisplayName: 'Target', internalSymbolFull: 'TGT', internalAssetClassName: 'Stocks', currentRate: 145.60, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1037/50x50.png', dailyPriceChange: 0.75, isOpen: true },
  { instrumentId: 1038, internalInstrumentDisplayName: 'Home Depot', internalSymbolFull: 'HD', internalAssetClassName: 'Stocks', currentRate: 345.80, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1038/50x50.png', dailyPriceChange: 1.25, isOpen: true },
  { instrumentId: 1039, internalInstrumentDisplayName: 'Costco', internalSymbolFull: 'COST', internalAssetClassName: 'Stocks', currentRate: 725.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1039/50x50.png', dailyPriceChange: 2.50, isOpen: true },
  { instrumentId: 1040, internalInstrumentDisplayName: 'McDonalds', internalSymbolFull: 'MCD', internalAssetClassName: 'Stocks', currentRate: 285.60, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1040/50x50.png', dailyPriceChange: 0.95, isOpen: true },
  { instrumentId: 1041, internalInstrumentDisplayName: 'Starbucks', internalSymbolFull: 'SBUX', internalAssetClassName: 'Stocks', currentRate: 98.70, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1041/50x50.png', dailyPriceChange: 0.45, isOpen: true },
  { instrumentId: 1042, internalInstrumentDisplayName: 'Nike', internalSymbolFull: 'NKE', internalAssetClassName: 'Stocks', currentRate: 108.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1042/50x50.png', dailyPriceChange: 0.65, isOpen: true },
  { instrumentId: 1043, internalInstrumentDisplayName: 'Colgate-Palmolive', internalSymbolFull: 'CL', internalAssetClassName: 'Stocks', currentRate: 92.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1043/50x50.png', dailyPriceChange: 0.25, isOpen: true },
  { instrumentId: 1044, internalInstrumentDisplayName: 'Kimberly-Clark', internalSymbolFull: 'KMB', internalAssetClassName: 'Stocks', currentRate: 138.20, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1044/50x50.png', dailyPriceChange: 0.35, isOpen: true },
  { instrumentId: 1045, internalInstrumentDisplayName: 'Duke Energy', internalSymbolFull: 'DUK', internalAssetClassName: 'Stocks', currentRate: 102.80, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1045/50x50.png', dailyPriceChange: 0.20, isOpen: true },
  { instrumentId: 1046, internalInstrumentDisplayName: 'Southern Company', internalSymbolFull: 'SO', internalAssetClassName: 'Stocks', currentRate: 78.50, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1046/50x50.png', dailyPriceChange: 0.15, isOpen: true },
  { instrumentId: 1047, internalInstrumentDisplayName: 'NextEra Energy', internalSymbolFull: 'NEE', internalAssetClassName: 'Stocks', currentRate: 72.30, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1047/50x50.png', dailyPriceChange: 0.35, isOpen: true },
  { instrumentId: 1048, internalInstrumentDisplayName: 'Simon Property Group', internalSymbolFull: 'SPG', internalAssetClassName: 'Stocks', currentRate: 152.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1048/50x50.png', dailyPriceChange: 0.65, isOpen: true },
  { instrumentId: 1049, internalInstrumentDisplayName: 'Digital Realty', internalSymbolFull: 'DLR', internalAssetClassName: 'Stocks', currentRate: 145.80, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1049/50x50.png', dailyPriceChange: 0.55, isOpen: true },
  { instrumentId: 1050, internalInstrumentDisplayName: 'Crown Castle', internalSymbolFull: 'CCI', internalAssetClassName: 'Stocks', currentRate: 112.60, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1050/50x50.png', dailyPriceChange: 0.35, isOpen: true },
  { instrumentId: 1051, internalInstrumentDisplayName: 'Broadcom', internalSymbolFull: 'AVGO', internalAssetClassName: 'Stocks', currentRate: 168.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1051/50x50.png', dailyPriceChange: 1.85, isOpen: true },
  { instrumentId: 1052, internalInstrumentDisplayName: 'Texas Instruments', internalSymbolFull: 'TXN', internalAssetClassName: 'Stocks', currentRate: 178.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1052/50x50.png', dailyPriceChange: 0.95, isOpen: true },
  { instrumentId: 1053, internalInstrumentDisplayName: 'Qualcomm', internalSymbolFull: 'QCOM', internalAssetClassName: 'Stocks', currentRate: 165.20, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1053/50x50.png', dailyPriceChange: 1.15, isOpen: true },
  { instrumentId: 1054, internalInstrumentDisplayName: 'United Parcel Service', internalSymbolFull: 'UPS', internalAssetClassName: 'Stocks', currentRate: 142.30, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1054/50x50.png', dailyPriceChange: 0.55, isOpen: true },
  { instrumentId: 1055, internalInstrumentDisplayName: 'FedEx', internalSymbolFull: 'FDX', internalAssetClassName: 'Stocks', currentRate: 258.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1055/50x50.png', dailyPriceChange: 1.25, isOpen: true },
  { instrumentId: 1056, internalInstrumentDisplayName: 'Lockheed Martin', internalSymbolFull: 'LMT', internalAssetClassName: 'Stocks', currentRate: 485.60, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1056/50x50.png', dailyPriceChange: 2.15, isOpen: true },
  { instrumentId: 1057, internalInstrumentDisplayName: 'Raytheon', internalSymbolFull: 'RTX', internalAssetClassName: 'Stocks', currentRate: 102.40, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1057/50x50.png', dailyPriceChange: 0.45, isOpen: true },
  { instrumentId: 1058, internalInstrumentDisplayName: 'General Dynamics', internalSymbolFull: 'GD', internalAssetClassName: 'Stocks', currentRate: 278.90, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1058/50x50.png', dailyPriceChange: 1.05, isOpen: true },
  { instrumentId: 1059, internalInstrumentDisplayName: 'Caterpillar', internalSymbolFull: 'CAT', internalAssetClassName: 'Stocks', currentRate: 312.50, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1059/50x50.png', dailyPriceChange: 1.45, isOpen: true },
  { instrumentId: 1060, internalInstrumentDisplayName: 'Deere & Company', internalSymbolFull: 'DE', internalAssetClassName: 'Stocks', currentRate: 398.70, logo50x50: 'https://etoro-cdn.etorostatic.com/market-avatars/1060/50x50.png', dailyPriceChange: 1.85, isOpen: true },
];

export async function searchInstruments(params) {
  const query = params.searchText || params.internalInstrumentDisplayName || params.internalSymbolFull || '';
  const pageSize = params.pageSize || 20;
  // Use field names as per eToro API documentation schema
  const fields = 'instrumentId,displayname,symbol,instrumentType,currentRate,logo50x50,dailyPriceChange,isOpen,internalInstrumentDisplayName,internalSymbolFull,internalAssetClassName';

  try {
    // Use searchText parameter as per eToro API documentation
    const searchUrl = `/etoro-api/api/v1/market-data/search?searchText=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=${fields}`;

    console.log('[searchInstruments] Searching for:', query);
    console.log('[searchInstruments] URL:', searchUrl);
    
    const response = await fetch(searchUrl);

    console.log('[searchInstruments] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[searchInstruments] Request failed:', errorText);
      throw new Error('API request failed');
    }

    const data = await response.json();
    
    console.log('[searchInstruments] Results:', data.items?.length || 0);
    console.log('[searchInstruments] First item:', JSON.stringify(data.items?.[0]));

    // Map API response fields to expected format
    const mappedItems = (data.items || [])
      .filter(item => item && item.instrumentId && item.instrumentId > 0)
      .map(item => ({
        instrumentId: item.instrumentId,
        internalInstrumentDisplayName: item.internalInstrumentDisplayName || item.displayname || '',
        internalSymbolFull: item.internalSymbolFull || item.symbol || '',
        internalAssetClassName: item.internalAssetClassName || item.instrumentType || '',
        currentRate: item.currentRate,
        logo50x50: item.logo50x50,
        dailyPriceChange: item.dailyPriceChange,
        isOpen: item.isOpen
      }))
      .slice(0, pageSize);

    // Check if API returned incomplete data (only instrumentId, missing names/symbols)
    // This happens when API auth headers are not properly sent
    const hasCompleteData = mappedItems.length > 0 && 
      mappedItems.some(item => item.internalSymbolFull || item.internalInstrumentDisplayName);
    
    if (!hasCompleteData && mappedItems.length > 0) {
      console.warn('[searchInstruments] API returned incomplete data (missing names/symbols), using demo data');
      throw new Error('API returned incomplete data');
    }

    return {
      data: {
        items: mappedItems,
        totalItems: mappedItems.length,
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
