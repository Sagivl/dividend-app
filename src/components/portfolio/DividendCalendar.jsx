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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign } from "lucide-react";
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
        dates.push({
          date: payDate,
          type: 'payment'
        });
      }
    } catch (e) {}
  }
  
  if (stock.ex_date) {
    try {
      const exDate = parseISO(stock.ex_date);
      if (isValid(exDate)) {
        dates.push({
          date: exDate,
          type: 'ex-dividend'
        });
      }
    } catch (e) {}
  }

  if (dates.length === 0) {
    const frequency = getPaymentFrequency(stock.div_distribution_sequence);
    const monthsPerPayment = 12 / frequency;
    
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
      const stock = position.stock || stocksMap[position.ticker];
      if (!stock) return;

      const paymentDates = estimatePaymentDates(stock, year);
      const frequency = getPaymentFrequency(stock.div_distribution_sequence);
      const paymentAmount = position.annualIncome / frequency;

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

  const monthTotal = monthEvents.reduce((sum, event) => sum + event.amount, 0);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                    isToday && "bg-primary/5"
                  )}
                >
                  <span className={cn(
                    "text-sm",
                    isToday && "font-bold text-primary"
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
                              <div className="border-t pt-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Type:</span>
                                  <Badge variant={event.type === 'ex-dividend' ? 'secondary' : 'default'}>
                                    {event.type === 'ex-dividend' ? 'Ex-Dividend' : 
                                     event.type === 'estimated' ? 'Estimated' : 'Payment'}
                                  </Badge>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                  <span className="text-muted-foreground">Expected:</span>
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

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {format(currentMonth, "MMMM")} Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500 mb-4">
              {formatCurrency(monthTotal)}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Expected dividend income
            </div>
            
            {monthEvents.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(
                  monthEvents.reduce((acc, event) => {
                    if (!acc[event.ticker]) {
                      acc[event.ticker] = { 
                        amount: 0, 
                        color: event.color,
                        events: []
                      };
                    }
                    acc[event.ticker].amount += event.amount;
                    acc[event.ticker].events.push(event);
                    return acc;
                  }, {})
                ).map(([ticker, data]) => (
                  <div key={ticker} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", data.color)} />
                      <span className="text-sm font-medium">{ticker}</span>
                    </div>
                    <span className="text-sm text-green-500">
                      {formatCurrency(data.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No dividend payments expected this month.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {positions.map(pos => (
                <div key={pos.ticker} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded", tickerColorMap[pos.ticker])} />
                  <span className="text-sm">{pos.ticker}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
