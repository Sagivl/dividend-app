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

function estimatePaymentDates(stock, year) {
  const dates = [];
  
  if (stock.dividend_pay_date) {
    try {
      const payDate = parseISO(stock.dividend_pay_date);
      if (isValid(payDate)) {
        dates.push({ date: payDate, type: 'payment' });
      }
    } catch (e) {}
  }
  
  if (stock.ex_date) {
    try {
      const exDate = parseISO(stock.ex_date);
      if (isValid(exDate)) {
        dates.push({ date: exDate, type: 'ex-dividend' });
      }
    } catch (e) {}
  }

  if (dates.length === 0) {
    const frequency = getPaymentFrequency(stock.div_distribution_sequence);
    const startMonths = frequency === 12 
      ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : frequency === 4 
        ? [2, 5, 8, 11]
        : frequency === 2
          ? [5, 11]
          : [11];

    startMonths.forEach(month => {
      dates.push({
        date: new Date(year, month, 15),
        type: 'estimated'
      });
    });
  }

  return dates;
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

      const paymentDates = estimatePaymentDates(stock, year);
      const frequency = getPaymentFrequency(stock.div_distribution_sequence);
      const paymentAmount = (position.annualIncome || 0) / frequency;

      paymentDates.forEach(({ date, type }) => {
        events.push({
          date,
          ticker: position.ticker,
          type,
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
                          <PopoverContent className="w-64" align="start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {event.stock?.logo50x50 && (
                                  <img 
                                    src={event.stock.logo50x50}
                                    alt={event.ticker}
                                    className="w-8 h-8 rounded"
                                  />
                                )}
                                <div>
                                  <div className="font-semibold">{event.ticker}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {event.stock?.name}
                                  </div>
                                </div>
                              </div>
                              <div className="border-t pt-2 space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Date:</span>
                                  <span>{format(event.date, "MMM d, yyyy")}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Type:</span>
                                  <Badge variant={event.type === 'ex-dividend' ? 'secondary' : 'default'}>
                                    {event.type === 'ex-dividend' ? 'Ex-Dividend' : 
                                     event.type === 'estimated' ? 'Estimated' : 'Payment'}
                                  </Badge>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="font-semibold text-green-500">
                                    {formatCurrency(event.amount)}
                                  </span>
                                </div>
                              </div>
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
                        <span className="text-sm text-muted-foreground">
                          {format(event.date, "EEEE, MMM d")}
                        </span>
                        <Badge 
                          variant={event.type === 'ex-dividend' ? 'secondary' : 'outline'} 
                          className="text-xs"
                        >
                          {event.type === 'ex-dividend' ? 'Ex-Div' : 
                           event.type === 'estimated' ? 'Est.' : 'Pay'}
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
