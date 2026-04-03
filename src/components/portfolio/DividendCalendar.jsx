'use client';

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  DollarSign,
  TrendingUp
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  parseISO,
  isValid
} from "date-fns";
import { cn } from "@/lib/utils";

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

const COLORS = [
  "bg-blue-500",
  "bg-green-500", 
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-yellow-500",
  "bg-red-500",
];

function getColorForTicker(ticker, index) {
  return COLORS[index % COLORS.length];
}

function getPaymentFrequency(distributionSequence) {
  if (!distributionSequence) return 4;
  const seq = distributionSequence.toLowerCase();
  if (seq.includes('monthly')) return 12;
  if (seq.includes('semi') || seq.includes('bi-annual')) return 2;
  if (seq.includes('annual') && !seq.includes('semi')) return 1;
  return 4;
}

function projectDateToYear(originalDate, targetYear, frequency) {
  const originalMonth = originalDate.getMonth();
  const originalDay = originalDate.getDate();
  
  // For quarterly/semi-annual/annual, project to same month in target year
  // For monthly, use the same day each month
  return new Date(targetYear, originalMonth, originalDay);
}

function getAllDividendEventsForYear(stock, year) {
  const frequency = getPaymentFrequency(stock.div_distribution_sequence);
  const events = [];
  
  // Parse the stored dates to get the typical payment day of month
  let basePayDate = null;
  let baseExDate = null;
  let typicalPayDay = 15; // Default to 15th if no date available
  let typicalExDay = 1;
  
  if (stock.dividend_pay_date) {
    try {
      const parsed = parseISO(stock.dividend_pay_date);
      if (isValid(parsed)) {
        basePayDate = parsed;
        typicalPayDay = parsed.getDate();
      }
    } catch (e) {}
  }
  
  if (stock.ex_date) {
    try {
      const parsed = parseISO(stock.ex_date);
      if (isValid(parsed)) {
        baseExDate = parsed;
        typicalExDay = parsed.getDate();
      }
    } catch (e) {}
  }
  
  // Determine which months dividends are paid based on frequency and distribution sequence
  let paymentMonths = [];
  const distSeq = (stock.div_distribution_sequence || '').toLowerCase();
  
  if (frequency === 12) {
    // Monthly - all months
    paymentMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  } else if (frequency === 4) {
    // Quarterly - try to parse from distribution sequence
    if (distSeq.includes('jan') || distSeq.includes('apr') || distSeq.includes('jul') || distSeq.includes('oct')) {
      paymentMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
    } else if (distSeq.includes('feb') || distSeq.includes('may') || distSeq.includes('aug') || distSeq.includes('nov')) {
      paymentMonths = [1, 4, 7, 10]; // Feb, May, Aug, Nov
    } else if (distSeq.includes('mar') || distSeq.includes('jun') || distSeq.includes('sep') || distSeq.includes('dec')) {
      paymentMonths = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec
    } else if (basePayDate) {
      // Use the base date month as reference
      const baseMonth = basePayDate.getMonth();
      paymentMonths = [baseMonth, (baseMonth + 3) % 12, (baseMonth + 6) % 12, (baseMonth + 9) % 12].sort((a, b) => a - b);
    } else {
      paymentMonths = [2, 5, 8, 11]; // Default to Mar, Jun, Sep, Dec
    }
  } else if (frequency === 2) {
    // Semi-annual
    if (basePayDate) {
      const baseMonth = basePayDate.getMonth();
      paymentMonths = [baseMonth, (baseMonth + 6) % 12].sort((a, b) => a - b);
    } else {
      paymentMonths = [5, 11]; // Jun, Dec
    }
  } else {
    // Annual
    if (basePayDate) {
      paymentMonths = [basePayDate.getMonth()];
    } else {
      paymentMonths = [11]; // December
    }
  }
  
  // Generate events for each payment month in the year
  for (const month of paymentMonths) {
    const payDate = new Date(year, month, typicalPayDay);
    // Ex-date is typically 2-3 weeks before pay date
    const exDate = new Date(year, month, Math.max(1, typicalExDay));
    
    events.push({
      date: payDate,
      type: basePayDate ? 'payment' : 'estimated',
      exDate: exDate
    });
  }
  
  return events;
}

function getDividendEvent(stock, year) {
  // Get all dividend events for this stock in the given year
  const allEvents = getAllDividendEventsForYear(stock, year);
  
  // Return just the first event (for backwards compatibility)
  // The calendar will call getAllDividendEventsForYear directly for the full year view
  if (allEvents.length > 0) {
    return allEvents[0];
  }
  
  // Fallback if no events could be generated
  return {
    date: new Date(year, 11, 15),
    type: 'estimated',
    exDate: null
  };
}

export default function DividendCalendar({ positions, stocksMap }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const tickerColorMap = useMemo(() => {
    const map = {};
    positions.forEach((pos, idx) => {
      map[pos.ticker] = getColorForTicker(pos.ticker, idx);
    });
    return map;
  }, [positions]);

  const dividendEvents = useMemo(() => {
    const events = [];
    const year = currentMonth.getFullYear();

    positions.forEach(position => {
      const stock = position.stock || stocksMap?.[position.ticker];
      if (!stock) return;

      // Get all dividend events for this stock in the year
      const stockEvents = getAllDividendEventsForYear(stock, year);
      const frequency = getPaymentFrequency(stock.div_distribution_sequence);
      const paymentAmount = (position.annualIncome || 0) / frequency;

      stockEvents.forEach(event => {
        events.push({
          date: event.date,
          ticker: position.ticker,
          type: event.type,
          exDate: event.exDate,
          amount: paymentAmount,
          color: tickerColorMap[position.ticker],
          stock
        });
      });
    });

    return events;
  }, [positions, stocksMap, currentMonth, tickerColorMap]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const paddingDays = Array(startPadding).fill(null);

  const getEventsForDay = (day) => {
    return dividendEvents.filter(event => 
      isSameDay(event.date, day) && isSameMonth(event.date, currentMonth)
    );
  };

  const monthEvents = dividendEvents.filter(event => 
    isSameMonth(event.date, currentMonth)
  );

  const sortedMonthEvents = [...monthEvents].sort((a, b) => a.date - b.date);
  const monthTotal = monthEvents.reduce((sum, event) => sum + event.amount, 0);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Empty state
  if (positions.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <CalendarIcon className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Dividend Calendar Yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Add stocks to your portfolio to see expected dividend payment dates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Navigation & Summary Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <button 
                onClick={goToToday}
                className="text-xs text-primary hover:underline"
              >
                Go to today
              </button>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Monthly Total */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Expected Income</span>
            </div>
            <span className="text-xl font-bold text-green-500">
              {formatCurrency(monthTotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Calendar Grid */}
      <Card className="hidden md:block">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div 
                key={day} 
                className="bg-muted/50 p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
            
            {paddingDays.map((_, idx) => (
              <div key={`pad-${idx}`} className="bg-background p-2 min-h-[80px]" />
            ))}
            
            {daysInMonth.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "bg-background p-2 min-h-[80px] relative",
                    isToday && "bg-primary/5 ring-1 ring-primary/20"
                  )}
                >
                  <span className={cn(
                    "text-sm inline-flex items-center justify-center w-6 h-6 rounded-full",
                    isToday && "bg-primary text-primary-foreground font-bold"
                  )}>
                    {format(day, "d")}
                  </span>
                  
                  {dayEvents.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((event, idx) => (
                        <Popover key={`${event.ticker}-${idx}`}>
                          <PopoverTrigger asChild>
                            <button className="w-full text-left">
                              <div className={cn(
                                "text-xs px-1.5 py-0.5 rounded text-white truncate",
                                event.color
                              )}>
                                {event.ticker}
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" align="start">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                {event.stock?.logo50x50 && (
                                  <img 
                                    src={event.stock.logo50x50}
                                    alt={event.ticker}
                                    className="w-10 h-10 rounded"
                                  />
                                )}
                                <div>
                                  <div className="font-semibold">{event.ticker}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {event.stock?.name}
                                  </div>
                                </div>
                              </div>
                              <div className="border-t pt-3 space-y-2">
                                {event.type === 'payment' && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Pay Date:</span>
                                    <span className="font-medium">{format(event.date, "MMM d, yyyy")}</span>
                                  </div>
                                )}
                                {event.exDate && event.type === 'payment' && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ex-Div Date:</span>
                                    <span>{format(event.exDate, "MMM d, yyyy")}</span>
                                  </div>
                                )}
                                {event.type === 'ex-dividend' && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ex-Div Date:</span>
                                    <span className="font-medium">{format(event.date, "MMM d, yyyy")}</span>
                                  </div>
                                )}
                                {event.type === 'estimated' && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Est. Date:</span>
                                    <span className="font-medium">{format(event.date, "MMM d, yyyy")}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm pt-1 border-t">
                                  <span className="text-muted-foreground">Expected:</span>
                                  <span className="font-bold text-green-500 text-base">
                                    {formatCurrency(event.amount)}
                                  </span>
                                </div>
                              </div>
                              {event.type === 'estimated' && (
                                <p className="text-xs text-muted-foreground">
                                  * Date estimated based on typical quarterly schedule
                                </p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mobile List View */}
      <div className="md:hidden space-y-3">
        {sortedMonthEvents.length > 0 ? (
          <>
            <h3 className="text-sm font-medium text-muted-foreground">
              {sortedMonthEvents.length} dividend{sortedMonthEvents.length !== 1 ? 's' : ''} this month
            </h3>
            {sortedMonthEvents.map((event, idx) => (
              <Card key={`${event.ticker}-${idx}`} className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0",
                      event.color
                    )}>
                      {event.ticker.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{event.ticker}</span>
                        <span className="font-bold text-green-500">
                          {formatCurrency(event.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-sm text-muted-foreground">
                          {event.type === 'payment' ? (
                            <span>Pay: {format(event.date, "MMM d")}</span>
                          ) : event.type === 'ex-dividend' ? (
                            <span>Ex-Div: {format(event.date, "MMM d")}</span>
                          ) : (
                            <span>Est: {format(event.date, "MMM d")}</span>
                          )}
                          {event.exDate && event.type === 'payment' && (
                            <span className="ml-2 text-xs">
                              (Ex: {format(event.exDate, "MMM d")})
                            </span>
                          )}
                        </div>
                        <Badge 
                          variant={event.type === 'payment' ? 'default' : event.type === 'ex-dividend' ? 'secondary' : 'outline'} 
                          className="text-xs shrink-0"
                        >
                          {event.type === 'ex-dividend' ? 'Ex-Div' : 
                           event.type === 'estimated' ? 'Est.' : 'Pay Day'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <Card className="bg-card/50">
            <CardContent className="py-12 text-center">
              <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No dividend payments expected in {format(currentMonth, "MMMM")}.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try navigating to a different month.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stock Legend */}
      {positions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Stocks</h3>
            <div className="flex flex-wrap gap-3">
              {positions.map(pos => (
                <div key={pos.ticker} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded", tickerColorMap[pos.ticker])} />
                  <span className="text-sm font-medium">{pos.ticker}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
