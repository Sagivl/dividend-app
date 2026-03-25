export function getExchangeMarketHours(exchange) {
    const exchangeHours = {
        'NYSE': { open: 9.5, close: 16, timezone: 'America/New_York' },
        'NASDAQ': { open: 9.5, close: 16, timezone: 'America/New_York' },
        'AMEX': { open: 9.5, close: 16, timezone: 'America/New_York' },
        'LSE': { open: 8, close: 16.5, timezone: 'Europe/London' },
        'TSE': { open: 9, close: 15, timezone: 'Asia/Tokyo' },
        'ASX': { open: 10, close: 16, timezone: 'Australia/Sydney' },
        'TSX': { open: 9.5, close: 16, timezone: 'America/Toronto' },
        'FRA': { open: 9, close: 17.5, timezone: 'Europe/Berlin' },
        'HKG': { open: 9.5, close: 16, timezone: 'Asia/Hong_Kong' }
    };
    return exchangeHours[exchange?.toUpperCase()] || exchangeHours['NYSE'];
}

export function isMarketOpen(exchange = 'NYSE') {
    try {
        const marketHours = getExchangeMarketHours(exchange);
        const now = new Date();
        const marketTime = new Date(now.toLocaleString('en-US', { timeZone: marketHours.timezone }));
        const dayOfWeek = marketTime.getDay();
        
        // Weekend check
        if (dayOfWeek === 0 || dayOfWeek === 6) return false;
        
        const currentHour = marketTime.getHours() + marketTime.getMinutes() / 60;
        return currentHour >= marketHours.open && currentHour < marketHours.close;
    } catch (e) {
        console.error("Error checking market open status:", e);
        return true; // Default to true to allow updates if time zone logic fails
    }
}

export function getMarketCloseTimestamp(exchange = 'NYSE') {
    try {
        const marketHours = getExchangeMarketHours(exchange);
        const now = new Date();
        const marketTimeString = now.toLocaleString('en-US', { timeZone: marketHours.timezone });
        const marketCloseDate = new Date(marketTimeString);
        
        if (isNaN(marketCloseDate.getTime())) {
            const fallbackDate = new Date();
            fallbackDate.setHours(16, 0, 0, 0);
            return fallbackDate.getTime();
        }
        
        const closeHour = Math.floor(marketHours.close);
        const closeMinute = Math.round((marketHours.close - closeHour) * 60);
        marketCloseDate.setHours(closeHour, closeMinute, 0, 0);
        return marketCloseDate.getTime();
    } catch (e) {
        console.error("Error getting market close timestamp:", e);
        const fallbackDate = new Date();
        fallbackDate.setHours(16, 0, 0, 0);
        return fallbackDate.getTime();
    }
}

export function shouldUpdateData(stock, exchange = 'NYSE') {
    if (!stock) return true;
    
    const lastUpdateString = stock.last_updated || stock.updated_date;
    if (!lastUpdateString) return true;
    
    const lastUpdate = new Date(lastUpdateString);
    const now = new Date();
    const timeDiffMinutes = (now - lastUpdate) / (1000 * 60);

    console.log(`Market update check for ${stock.ticker || 'unknown'} (${exchange}):`, {
        lastUpdate: lastUpdateString,
        timeDiffMinutes: Math.round(timeDiffMinutes),
        isMarketOpen: isMarketOpen(exchange)
    });

    if (isMarketOpen(exchange)) {
        // Market is open: update if data is older than 5 minutes
        if (timeDiffMinutes > 5) {
            console.log(`Market is open, data is ${Math.round(timeDiffMinutes)} minutes old - updating`);
            return true;
        }
    } else {
        // Market is closed: update if we don't have data from after today's close
        const marketCloseTime = getMarketCloseTimestamp(exchange);
        const todayCloseTime = new Date(marketCloseTime);
        
        // If last update was before today's market close and we're now past market close
        if (lastUpdate.getTime() < todayCloseTime.getTime() && now.getTime() > todayCloseTime.getTime()) {
            console.log(`Market is closed, but data is from before today's close - updating`);
            return true;
        }
    }
    
    // Also update if data is very old (more than 24 hours), regardless of market status
    if (timeDiffMinutes > 60 * 24) {
        console.log(`Data is very old (${Math.round(timeDiffMinutes / 60)} hours) - updating`);
        return true;
    }

    console.log(`Data is current, no update needed`);
    return false;
}